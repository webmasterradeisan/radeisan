// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; 
import Button from './ui/Button'; 
import { supabase } from '../lib/supabase'; 
// 🚨 INTEGRACIÓN DE PUNTOS: Importar las funciones de tracking
import { trackGiveLike, trackComment, trackShareContent, MISSION_TYPES } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; 

const PhotoDetailModal = ({ 
    photos,
    currentPhotoIndex,
    photoData, 
    onClose, 
    onNavigate, 
    refreshParentData,
    totalPhotos
}) => {
    const { user } = useAuth();
    
    const [likeCount, setLikeCount] = useState(0); 
    const [isLiking, setIsLiking] = useState(false);
    const [userHasLiked, setUserHasLiked] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    
    // ⭐️ Nueva constante para verificar la propiedad del contenido ⭐️
    const isOwner = user?.id === photoData?.user_id;

    // ===================================
    // LÓGICA DE SINCRONIZACIÓN DE INTERACCIONES (CRÍTICA)
    // ===================================
    
    const fetchInteractions = useCallback(async () => {
        if (!photoData?.id || !user?.id) {
            // Cargar contadores de la propia foto si no hay usuario logueado
            setLikeCount(photoData?.likes_count || 0);
            setComments([]);
            setUserHasLiked(false);
            return;
        }

        try {
            // 1. OBTENER CONTEO DE LIKES
            const { count: realLikeCount, error: countError } = await supabase
                .from('photo_likes') 
                .select('*', { count: 'exact' })
                .eq('photo_id', photoData.id);

            // 2. VERIFICAR SI EL USUARIO DIO LIKE
            const { data: userLike, error: userLikeError } = await supabase
                .from('photo_likes') 
                .select('id')
                .eq('photo_id', photoData.id)
                .eq('user_id', user.id)
                .maybeSingle();

            // 3. OBTENER COMENTARIOS (¡CORRECCIÓN EN EL JOIN IMPLÍCITO!)
            const { data: fetchedComments, error: commentsError } = await supabase
                .from('photo_comments') 
                .select(`
                    id, 
                    content, 
                    created_at, 
                    user_id,
                    // ⭐️ CORRECCIÓN: Usar el nombre real de la tabla de perfiles (ASUMIDO 'profiles')
                    profiles(full_name, username) 
                `)
                .eq('photo_id', photoData.id)
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (countError || userLikeError || commentsError) {
                throw countError || userLikeError || commentsError;
            }

            setLikeCount(realLikeCount || 0); 
            setUserHasLiked(!!userLike);
            
            // ⭐️ CORRECCIÓN: Mapeamos usando el alias 'profiles'
            setComments(fetchedComments?.map(c => ({
                ...c,
                user: c.profiles?.full_name || `@${c.profiles?.username || 'Usuario'}`
            })) || []);

        } catch (error) {
            console.error("Error fetching photo interactions:", error);
            // Fallback a contadores de la tabla photos
            setLikeCount(photoData?.likes_count || 0);
            setUserHasLiked(false);
            setComments([]);
        }
    }, [photoData, user]);


    useEffect(() => {
        fetchInteractions();
    }, [fetchInteractions]);


    // ===================================
    // INTEGRACIÓN DE PUNTOS: Like
    // ===================================

    const handleLikeToggle = useCallback(async () => {
        if (!user?.id || isLiking) return;

        setIsLiking(true);
        const actionType = userHasLiked ? 'unlike' : 'like';
        const photoId = photoData.id;

        try {
            if (actionType === 'like') {
                // 1. REGISTRAR LIKE (Lógica de negocio y anti-farming local)
                const { error: insertError } = await supabase
                    .from('photo_likes') 
                    .insert({ user_id: user.id, photo_id: photoId });
                
                if (insertError && insertError.code !== '23505') throw insertError;
                
                // 2. LLAMADA AL SISTEMA DE PUNTOS (Solo si NO es el dueño)
                if (!isOwner && (!insertError || insertError.code === '23505')) {
                    if (MISSION_TYPES?.GIVE_LIKE) {
                        const trackingResult = await trackGiveLike('photo', photoId); 
                        if (trackingResult.result === 'success') {
                            console.log(`✅ Puntos ganados por like: ${trackingResult.points_earned}`);
                        } else if (trackingResult.result === 'already_paid') {
                            console.log('Anti-Farming: Puntos ya ganados por este item.');
                        }
                    }
                }
                
            } else if (actionType === 'unlike') {
                // 1. ELIMINAR LIKE (Lógica de negocio)
                const { error: deleteError } = await supabase
                    .from('photo_likes') 
                    .delete()
                    .eq('user_id', user.id)
                    .eq('photo_id', photoId);

                if (deleteError) throw deleteError;
                // Nota: Los puntos *no* se restan al quitar el like.
            }

            // 3. REFRESCO Y UI: Forzamos la recarga para sincronizar contadores
            await fetchInteractions();
            refreshParentData(); 

        } catch (error) {
            console.error('💥 Error al dar like y trackear misión:', error);
            alert(`Error de interacción: ${error.message}`);
        } finally {
            setIsLiking(false);
        }
    }, [photoData, isLiking, userHasLiked, refreshParentData, user, fetchInteractions, isOwner]);

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Comentario
    // ===================================
    const handleCommentSubmit = useCallback(async () => {
        const comment = commentText.trim();
        if (comment === '' || !user?.id) return;
        
        try {
            // 1. Lógica de inserción de comentario (DB)
            const { data: newCommentData, error: insertError } = await supabase
                .from('photo_comments') 
                .insert({ 
                    user_id: user.id, 
                    photo_id: photoData.id, 
                    content: comment 
                })
                .select('id, content, created_at')
                .single();

            if (insertError) throw insertError;
            
            // Actualizar UI localmente y refrescar para obtener el nombre de usuario
            setCommentText(''); 
            await fetchInteractions(); 

            // 2. Lógica de tracking de puntos (Solo si NO es el dueño)
            if (!isOwner) {
                if (MISSION_TYPES?.COMMENT) {
                    const trackingResult = await trackComment('photo', photoData.id); 
                    if (trackingResult.result === 'success') {
                        console.log(`✅ Puntos ganados por comentario: ${trackingResult.points_earned}`);
                        refreshParentData(); 
                    } else if (trackingResult.result === 'already_paid') {
                        console.log('Anti-Farming: Puntos ya ganados por comentar este item.');
                    }
                }
            }


        } catch (error) {
            console.error('💥 Error al insertar o trackear comentario:', error);
            alert(`Error al comentar: ${error.message}`);
        }
    }, [commentText, photoData, refreshParentData, user, fetchInteractions, isOwner]);

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Compartir
    // ===================================
    const handleShare = useCallback(async () => {
        console.log(`Compartiendo foto ID: ${photoData.id}`);
        
        // 1. Lógica de negocio (Opcional: registro de share)
        
        // 2. Lógica de tracking de puntos (Solo si NO es el dueño)
        if (!isOwner) {
            if (MISSION_TYPES?.SHARE_CONTENT) {
                 try {
                    // trackShareContent usa 'photoId' como referenceId
                    const trackingResult = await trackShareContent('photo', photoData.id, 'app_share'); 
                    if (trackingResult.result === 'success') {
                        console.log(`✅ Puntos ganados por compartir: ${trackingResult.points_earned}`);
                        alert(`¡Foto compartida! Has ganado ${trackingResult.points_earned} puntos.`);
                        refreshParentData(); 
                    } else if (trackingResult.result === 'already_paid') {
                        alert("Ya ganaste puntos por compartir este contenido hoy.");
                    }
                 } catch (error) {
                    console.error('💥 Error al trackear compartir:', error);
                 }
            }
        } else {
            alert("Compartiendo foto... (No ganas puntos por compartir tu propio contenido)");
        }
    }, [photoData, refreshParentData, isOwner]);


    // Asignamos datos para la UI usando photoData real
    const photoUrl = photoData?.image_url || photoData?.thumbnail_url; 
    const photoCaption = photoData?.caption || 'Foto sin descripción';
    const photoDescription = photoData?.description; 
    
    // Obtenemos el nombre del usuario de la sesión, asumimos que el perfil completo no se pasa al modal
    const userDisplayName = user?.user_metadata?.full_name || `@${user?.email?.split('@')[0] || 'UsuarioDetalle'}`;
    const photoDate = new Date(photoData?.created_at).toLocaleDateString();

    const isFirstPhoto = currentPhotoIndex === 0;
    const isLastPhoto = currentPhotoIndex === totalPhotos - 1;

    // Estructura del Modal 
    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-0 sm:p-4">
            
            {/* 🚨 Botón de Flecha Izquierda */}
            {!isFirstPhoto && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 ml-4"
                    onClick={() => onNavigate('prev')}
                >
                    <Icon name="ChevronLeft" size={32} />
                </Button>
            )}

            <div className="flex w-full max-w-7xl h-full sm:h-[95vh] bg-card sm:rounded-lg overflow-hidden shadow-2xl">
                
                {/* Botón de Cierre (esquina superior izquierda) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 left-0 m-4 text-white hover:bg-white/20 z-50"
                    onClick={onClose}
                >
                    <Icon name="X" size={24} />
                </Button>

                {/* Columna Izquierda: Imagen */}
                <div className="flex-1 flex items-center justify-center relative bg-black">
                    <img 
                        src={photoUrl}
                        alt={`Foto de ${userDisplayName}`}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
                
                {/* Columna Derecha: Interacciones */}
                <div className="w-96 flex flex-col border-l border-border bg-background flex-shrink-0">
                    
                    {/* Header del Post/Usuario */}
                    <div className="p-4 border-b border-border flex items-center space-x-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" /> 
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{userDisplayName}</h4>
                            <p className="text-xs text-muted-foreground">{photoDate}</p>
                        </div>
                    </div>

                    {/* Contenido/Comentarios */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        {/* Título/Caption */}
                        {photoCaption && (
                            <p className="font-semibold text-sm text-foreground">{photoCaption}</p> 
                        )}
                        
                        {/* 🚨 DESCRIPCIÓN CORREGIDA: Se muestra si existe y es diferente al título */}
                        {photoDescription && photoDescription !== photoCaption && (
                            <p className="text-sm text-foreground mt-1">{photoDescription}</p>
                        )}
                        
                        <div className="text-sm text-muted-foreground border-t border-border pt-4 mt-4">
                            <p className="font-semibold mb-2 text-foreground">Comentarios:</p>
                            {/* Lista de Comentarios */}
                            <div className="space-y-3">
                                {comments.length === 0 ? (
                                    <p className="text-xs italic text-muted-foreground">Todavía no hay comentarios.</p>
                                ) : (
                                    comments.map((c) => (
                                        <div key={c.id} className="flex space-x-2">
                                            <span className="font-semibold text-foreground">{c.user || 'Usuario'}</span>
                                            <span className="text-muted-foreground">{c.content}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Pie de Interacciones (Likes, Comentar Input) */}
                    <div className="p-4 border-t border-border">
                        <div className="flex justify-between items-center mb-4">
                            {/* Botón de Like */}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`
                                    ${userHasLiked ? 'text-red-500 hover:bg-red-500/10' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'}
                                    ${isLiking ? 'opacity-50' : ''}
                                `}
                                onClick={handleLikeToggle}
                                disabled={isLiking}
                            >
                                <Icon name={userHasLiked ? "Heart" : "Heart"} size={18} className="mr-2" />
                                Me Gusta ({likeCount})
                            </Button>

                            {/* Botón de Compartir */}
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={handleShare}
                            >
                                <Icon name="Share2" size={18} className="mr-2" />
                                Compartir
                            </Button>
                        </div>
                        
                        <div className="flex space-x-2">
                            <input 
                                type="text" 
                                placeholder="Añade un comentario..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2 text-sm focus:ring-primary focus:border-primary"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && commentText.trim() !== '') {
                                        handleCommentSubmit();
                                    }
                                }}
                            />
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleCommentSubmit}
                                disabled={commentText.trim() === ''}
                            >
                                <Icon name="Send" size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🚨 Botón de Flecha Derecha */}
             {!isLastPhoto && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 mr-4"
                    onClick={() => onNavigate('next')}
                >
                    <Icon name="ChevronRight" size={32} />
                </Button>
            )}
        </div>
    );
};

export default PhotoDetailModal;
