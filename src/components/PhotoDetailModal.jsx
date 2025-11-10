// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; 
import Button from './ui/Button'; 
import { supabase } from '../lib/supabase'; 
// 🚨 INTEGRACIÓN DE PUNTOS
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
    
    const isOwner = user?.id === photoData?.user_id;

    // ===================================
    // LÓGICA DE SINCRONIZACIÓN DE INTERACCIONES (FETCH)
    // ===================================
    
    const fetchInteractions = useCallback(async () => {
        if (!photoData?.id || !user?.id) {
            setLikeCount(photoData?.likes_count || 0);
            setComments([]);
            setUserHasLiked(false);
            return;
        }

        try {
            // 1. OBTENER CONTEO DE LIKES (Prueba C)
            const { count: realLikeCount } = await supabase
                .from('photo_likes') 
                .select('*', { count: 'exact' })
                .eq('photo_id', photoData.id);

            // 2. VERIFICAR SI EL USUARIO DIO LIKE (Prueba B)
            const { data: userLike } = await supabase
                .from('photo_likes') 
                .select('id')
                .eq('photo_id', photoData.id)
                .eq('user_id', user.id)
                .maybeSingle(); 

            // 3. OBTENER COMENTARIOS (Prueba A - Solución a la invisibilidad)
            const { data: fetchedComments, error: commentsError } = await supabase
                .from('photo_comments') 
                .select(`
                    id, 
                    content, 
                    created_at, 
                    user_id!inner(full_name, username) 
                `)
                .eq('photo_id', photoData.id)
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (commentsError) {
                console.error("Error RLS/DB al cargar comentarios:", commentsError);
                throw commentsError; 
            }

            setLikeCount(realLikeCount || 0); 
            setUserHasLiked(!!userLike); 
            
            // ⭐️ CORRECCIÓN A: Mapeo de comentarios
            setComments(fetchedComments?.map(c => ({
                ...c,
                // c.user_id ahora es el objeto de perfil, según el join
                user: c.user_id?.full_name || `@${c.user_id?.username || 'Usuario'}`
            })) || []);

        } catch (error) {
            console.error("Error fetching photo interactions:", error);
            setLikeCount(photoData?.likes_count || 0);
            setUserHasLiked(false);
            setComments([]);
        }
    }, [photoData, user]);

    useEffect(() => {
        fetchInteractions();
        setCommentText(''); 
    }, [fetchInteractions]);


    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
            
            if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                 if (event.key === 'ArrowRight') {
                    onNavigate('next');
                } else if (event.key === 'ArrowLeft') {
                    onNavigate('prev');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onNavigate, onClose]);
    

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Like (Con corrección de UX y lógica)
    // ===================================

    const handleLikeToggle = useCallback(async () => {
        if (!user?.id || isLiking) return;

        setIsLiking(true);
        const photoId = photoData.id;

        try {
            if (userHasLiked) { 
                // UNLIKE
                const { error: deleteError } = await supabase
                    .from('photo_likes') 
                    .delete()
                    .eq('user_id', user.id)
                    .eq('photo_id', photoId);

                if (deleteError) throw deleteError;
                
                // Actualizar UI localmente (Mejor UX)
                setUserHasLiked(false);
                setLikeCount(prevCount => Math.max(0, prevCount - 1));

            } else { 
                // LIKE (Solución al "no funciona")
                const { error: insertError } = await supabase
                    .from('photo_likes') 
                    .insert({ user_id: user.id, photo_id: photoId });
                
                if (insertError) {
                    if (insertError.code === '23505') {
                        console.warn('Like ya existe (409). Se asume like exitoso anterior.');
                        setUserHasLiked(true); 
                    } else {
                        throw insertError;
                    }
                } else {
                    // Inserción limpia: actualiza UI localmente
                    setUserHasLiked(true);
                    setLikeCount(prevCount => prevCount + 1);
                }
                
                // Lógica de tracking de puntos (Solo si NO es el dueño)
                if (!isOwner && (!insertError || insertError.code === '23505')) {
                    if (MISSION_TYPES?.GIVE_LIKE) {
                        const trackingResult = await trackGiveLike('photo', photoId); 
                        if (trackingResult.result === 'success') {
                            console.log(`✅ Puntos ganados por like: ${trackingResult.points_earned}`);
                        }
                    }
                }
            }

            await fetchInteractions();
            refreshParentData(); 

        } catch (error) {
            console.error('💥 Error al dar like:', error);
            alert(`Error de interacción: ${error.message}`);
            await fetchInteractions(); // Resincronizar
        } finally {
            setIsLiking(false);
        }
    }, [photoData, isLiking, userHasLiked, refreshParentData, user, fetchInteractions, isOwner]);

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Comentario
    // ===================================
    const handleCommentSubmit = useCallback(async (e) => {
        e?.preventDefault(); 
        
        const comment = commentText.trim();
        if (comment === '' || !user?.id) return;
        
        try {
            const { error: insertError } = await supabase
                .from('photo_comments') 
                .insert({ user_id: user.id, photo_id: photoData.id, content: comment });

            if (insertError) throw insertError;
            
            setCommentText(''); 
            await fetchInteractions(); // Refrescar para ver el nuevo comentario

            if (!isOwner) {
                if (MISSION_TYPES?.COMMENT) {
                    const trackingResult = await trackComment('photo', photoData.id); 
                    if (trackingResult.result === 'success') {
                        console.log(`✅ Puntos ganados por comentario: ${trackingResult.points_earned}`);
                        refreshParentData(); 
                    }
                }
            }
        } catch (error) {
            console.error('💥 Error al insertar o trackear comentario:', error);
            alert(`Error al comentar: ${error.message}`);
        }
    }, [commentText, photoData, refreshParentData, user, fetchInteractions, isOwner]);

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Compartir (Mejorado)
    // ===================================
    const handleShare = useCallback(async () => {
        // La URL debe ser la URL canónica de la foto
        const shareUrl = `${window.location.origin}/photo/${photoData.id}`; 
        const shareTitle = photoData.caption || "Mira esta foto!";
        
        // Función auxiliar para llamar al tracking
        const callTracking = async (platform) => {
             if (!isOwner) {
                if (MISSION_TYPES?.SHARE_CONTENT) {
                    const trackingResult = await trackShareContent('photo', photoData.id, platform); 
                    if (trackingResult.result === 'success') {
                        alert(`¡Compartido y puntos ganados! +${trackingResult.points_earned} puntos.`);
                        refreshParentData(); 
                    } else if (trackingResult.result === 'already_paid') {
                        alert("Ya ganaste puntos por compartir este contenido hoy.");
                    }
                }
            } else {
                alert("Compartiendo foto... (No ganas puntos por compartir tu propio contenido)");
            }
        };

        if (navigator.share) {
            // Intentar Web Share API
            try {
                await navigator.share({
                    title: shareTitle,
                    url: shareUrl,
                });
                await callTracking('web_share_api'); 

            } catch (error) {
                // Si el usuario cancela (AbortError) o falla, hacemos el fallback
                if (error.name !== 'AbortError') { 
                     console.error('Web Share API falló:', error);
                     // Continuar al fallback de portapapeles
                } else {
                    console.log("Compartir cancelado por el usuario.");
                }
            }
        } else {
            // Fallback para desktop/navegadores sin soporte: Copiar al portapapeles
            try {
                await navigator.clipboard.writeText(shareUrl);
                await callTracking('clipboard_share');
                
            } catch (error) {
                console.error('Error al copiar al portapapeles:', error);
                alert("Error al copiar el enlace.");
            }
        }
    }, [photoData, refreshParentData, isOwner]);


    // Asignamos datos para la UI usando photoData real
    const photoUrl = photoData?.image_url || photoData?.thumbnail_url; 
    const photoCaption = photoData?.caption || 'Foto sin descripción';
    const photoDescription = photoData?.description; 
    
    const userDisplayName = user?.user_metadata?.full_name || `@${user?.email?.split('@')[0] || 'UsuarioDetalle'}`;
    const photoDate = new Date(photoData?.created_at).toLocaleDateString();

    const isFirstPhoto = currentPhotoIndex === 0;
    const isLastPhoto = currentPhotoIndex === totalPhotos - 1;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-0 sm:p-4">
            
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
                
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 left-0 m-4 text-white hover:bg-white/20 z-50"
                    onClick={onClose}
                >
                    <Icon name="X" size={24} />
                </Button>

                <div className="flex-1 flex items-center justify-center relative bg-black">
                    <img 
                        src={photoUrl}
                        alt={`Foto de ${userDisplayName}`}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
                
                <div className="w-96 flex flex-col border-l border-border bg-background flex-shrink-0">
                    
                    <div className="p-4 border-b border-border flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" /> 
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{userDisplayName}</h4>
                            <p className="text-xs text-muted-foreground">{photoDate}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        {photoCaption && (
                            <p className="font-semibold text-sm text-foreground">{photoCaption}</p> 
                        )}
                        
                        {photoDescription && photoDescription !== photoCaption && (
                            <p className="text-sm text-foreground mt-1">{photoDescription}</p>
                        )}
                        
                        <div className="text-sm text-muted-foreground border-t border-border pt-4 mt-4">
                            <p className="font-semibold mb-2 text-foreground">Comentarios:</p>
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
                    
                    <div className="p-4 border-t border-border">
                        <div className="flex justify-between items-center mb-4">
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
                                        e.preventDefault(); 
                                        handleCommentSubmit(e);
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
