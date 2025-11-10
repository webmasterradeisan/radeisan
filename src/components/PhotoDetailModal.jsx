// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; 
import Button from './ui/Button'; 
import { supabase } from '../lib/supabase'; 
import { trackGiveLike, trackComment, trackShareContent, MISSION_TYPES } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; 

// El componente ahora recibe el array de fotos completo y el índice actual.
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
    
    // ===================================
    // ESTADOS DE INTERACCIÓN
    // ===================================
    const [likeCount, setLikeCount] = useState(0); 
    const [isLiking, setIsLiking] = useState(false);
    const [userHasLiked, setUserHasLiked] = useState(false);
    const [commentText, setCommentText] = useState('');
    // 🚨 COMENTARIOS: Nuevo estado para la lista de comentarios
    const [comments, setComments] = useState([]);
    const [isLoadingComments, setIsLoadingComments] = useState(true);

    // 🚨 COMPARTIR/TOAST: Estado para la notificación tipo Sweet Alert
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const isFirstPhoto = currentPhotoIndex === 0;
    const isLastPhoto = currentPhotoIndex === totalPhotos - 1;

    // ===================================
    // LÓGICA DE SINCRONIZACIÓN DE INTERACCIONES
    // ===================================

    const showTemporaryToast = useCallback((message) => {
        setToastMessage(message);
        setShowToast(true);
        // Ocultar después de 3 segundos
        setTimeout(() => {
            setShowToast(false);
            setToastMessage('');
        }, 3000);
    }, []);

    const fetchInitialInteractions = useCallback(async (photoId) => {
        if (!photoId || !user?.id) return;

        setIsLiking(true); // Bloquea la acción de like durante la carga
        setIsLoadingComments(true);

        try {
            // --- 1. Cargar Likes (Conteo y estado del usuario)
            const { count: totalLikes, error: countError } = await supabase
                .from('photo_likes')
                .select('*', { count: 'exact', head: true })
                .eq('photo_id', photoId);

            if (countError) throw countError;
            setLikeCount(totalLikes || 0);

            // Verificar si el usuario actual ha dado like
            const { data: userLikeData, error: userLikeError } = await supabase
                .from('photo_likes')
                .select('id')
                .eq('photo_id', photoId)
                .eq('user_id', user.id)
                .single();
            
            // PGRST116: No rows found, que es el caso esperado si no ha dado like
            if (userLikeError && userLikeError.code !== 'PGRST116') throw userLikeError; 
            setUserHasLiked(!!userLikeData);

            // --- 2. Cargar Comentarios
            const { data: commentsData, error: commentsError } = await supabase
                .from('photo_comments')
                .select(`
                    id, 
                    content, 
                    created_at, 
                    user_id,
                    profiles (username) 
                `)
                .eq('photo_id', photoId)
                .order('created_at', { ascending: false }); 

            if (commentsError) throw commentsError;
            setComments(commentsData || []);

        } catch (error) {
            console.error('Error al cargar interacciones:', error);
            // No hacemos reset de estados, se mantienen en 0 o vacíos
        } finally {
            setIsLiking(false);
            setIsLoadingComments(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (photoData?.id) {
            fetchInitialInteractions(photoData.id);
        }
    }, [photoData?.id, fetchInitialInteractions]);


    // ===================================
    // MANEJADORES DE ACCIONES
    // ===================================

    // 🚨 "LIKE" NO FUNCIONA (FIX)
    const handleLike = useCallback(async () => {
        if (!user?.id || isLiking) return;

        const newLikedState = !userHasLiked;
        const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1;
        const previousLikedState = userHasLiked;
        const previousLikeCount = likeCount;

        // 1. Optimistic UI Update
        setUserHasLiked(newLikedState);
        setLikeCount(newLikeCount);
        setIsLiking(true);

        try {
            if (newLikedState) {
                // Agregar Like
                const { error } = await supabase
                    .from('photo_likes')
                    .insert([{ user_id: user.id, photo_id: photoData.id }]);

                if (error) throw error;
                // 3. Mission Tracking
                await trackGiveLike(user.id, photoData.id);

            } else {
                // Quitar Like
                const { error } = await supabase
                    .from('photo_likes')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('photo_id', photoData.id);
                
                if (error) throw error;
            }

        } catch (error) {
            console.error('Error al manejar el like:', error);
            // 4. Revert UI on error
            setUserHasLiked(previousLikedState);
            setLikeCount(previousLikeCount);
            showTemporaryToast('Error: No se pudo registrar el Like.');
            
        } finally {
            setIsLiking(false);
        }
    }, [user?.id, photoData?.id, userHasLiked, likeCount, isLiking, showTemporaryToast]);

    // 🚨 COMENTARIOS NO SE VEN (FIX: Lógica de envío)
    const handleCommentSubmit = useCallback(async () => {
        const content = commentText.trim();
        if (!user?.id || !photoData?.id || content === '') return;

        const temporaryText = commentText;
        setCommentText(''); // Clear input optimistically

        try {
            // 1. Insertar en la BD
            const { data, error } = await supabase
                .from('photo_comments')
                .insert([
                    { user_id: user.id, photo_id: photoData.id, content: content }
                ])
                .select(`
                    id, 
                    content, 
                    created_at, 
                    user_id,
                    profiles (username)
                `)
                .single();

            if (error) throw error;

            // 2. Mission Tracking
            await trackComment(user.id, photoData.id);

            // 3. Prepend el nuevo comentario al estado local
            setComments(prevComments => [data, ...prevComments]);

        } catch (error) {
            console.error('Error al enviar el comentario:', error);
            setCommentText(temporaryText); // Revertir el texto
            showTemporaryToast('Error al enviar el comentario.');
        }
    }, [user?.id, photoData?.id, commentText, showTemporaryToast]);


    // 🚨 AVISO DE COMPARTIR (FIX: Notificación tipo Sweet Alert)
    const handleShare = useCallback(async () => {
        if (!user?.id || !photoData?.id) return;
        
        const shareUrl = `${window.location.origin}/photo/${photoData.id}`;
        
        try {
            if (navigator.share) {
                // Usar la API nativa de Web Share si está disponible
                await navigator.share({
                    title: `Mira esta foto de ${photoData.profile_username}`,
                    url: shareUrl,
                });
                showTemporaryToast('¡Enlace de la foto compartido!');
            } else {
                // Fallback: Copiar al portapapeles
                await navigator.clipboard.writeText(shareUrl);
                showTemporaryToast('¡Enlace de la foto copiado! (Comparte)');
            }
            
            // Mission Tracking
            await trackShareContent(user.id, photoData.id);

        } catch (error) {
            // Manejar si el usuario cancela (AbortError) o si hay otro error
            if (error.name !== 'AbortError') { 
                console.error('Error al compartir/copiar:', error);
                showTemporaryToast('Error al compartir el contenido.');
            }
        }
    }, [user?.id, photoData?.id, showTemporaryToast]);


    // ===================================
    // RENDERIZADO
    // ===================================

    // ... (rest of the component structure)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95">
            {/* ... Flecha Izquierda (Existente) ... */}
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

            {/* Contenedor principal del modal (Flex para foto y sidebar) */}
            <div className="flex max-w-[90vw] max-h-[90vh] w-full h-full bg-background md:rounded-lg overflow-hidden">
                {/* 1. Área de la Foto (Izquierda) */}
                <div className="relative flex-1 flex items-center justify-center bg-black min-w-[50%]">
                    <img 
                        src={photoData.url} 
                        alt={photoData.caption || 'Detalle de la foto'}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>

                {/* 2. Sidebar de Interacciones (Derecha) */}
                <div className="w-[380px] flex flex-col bg-background border-l border-border/50">
                    {/* Header: Info del usuario y Toolbar */}
                    <div className="p-4 border-b border-border/50 flex flex-col">
                        <div className="flex items-center justify-between">
                            {/* Info de Usuario */}
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-primary/70">
                                    {/* Avatar del usuario (Placeholder) */}
                                </div>
                                <span className="text-white font-semibold">{photoData.profile_username}</span>
                            </div>
                            
                            {/* Toolbar de Acciones */}
                            <div className="flex items-center space-x-1">
                                {/* Botón de Like (FIX) */}
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className={userHasLiked ? "text-red-500 hover:text-red-600" : "text-white hover:bg-white/20"}
                                    onClick={handleLike} 
                                    disabled={isLiking || !user?.id}
                                >
                                    <Icon name="Heart" fill={userHasLiked ? "currentColor" : "none"} size={20} />
                                </Button>
                                <span className="text-sm font-medium text-white/90 mr-2">{likeCount}</span>
                                
                                {/* Botón de Comentarios */}
                                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                                    <Icon name="MessageCircle" size={20} />
                                </Button>
                                
                                {/* Botón de Compartir (FIX: llama a handleShare) */}
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="text-white hover:bg-white/20"
                                    onClick={handleShare}
                                >
                                    <Icon name="Share2" size={20} />
                                </Button>

                                {/* Botón de Cerrar */}
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="text-white hover:bg-white/20" 
                                    onClick={onClose}
                                >
                                    <Icon name="X" size={20} />
                                </Button>
                            </div>
                        </div>
                        {/* Pie de foto */}
                        {photoData.caption && (
                            <p className="text-sm text-white/90 mt-2">{photoData.caption}</p>
                        )}
                    </div>
                    
                    {/* Área de Comentarios (FIX: Mapeo para que se vean) */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {isLoadingComments ? (
                            <p className="text-center text-sm text-muted-foreground">Cargando comentarios...</p>
                        ) : comments.length > 0 ? (
                            comments.map((comment, index) => (
                                <div key={comment.id || index} className="flex items-start space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0">
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white/90">
                                            {comment.profiles?.username || 'Usuario Desconocido'}
                                            <span className="text-xs font-normal text-muted-foreground ml-2">
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </span>
                                        </p>
                                        <p className="text-sm text-white/80 break-words">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-muted-foreground">Sé el primero en comentar.</p>
                        )}
                    </div>

                    {/* Footer: Input de Comentarios */}
                    <div className="p-4 border-t border-border/50">
                        <div className="flex items-center space-x-2">
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

            {/* Botones de Navegación (Existentes) */}
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
            
            {/* 🚨 TOAST/SWEET ALERT para COMPARTIR (FIX: Notificación) */}
            {showToast && (
                <div 
                    className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[100] p-3 rounded-lg bg-primary text-primary-foreground shadow-xl transition-all duration-500"
                    style={{ animation: 'slideUp 0.3s forwards' }}
                >
                    <p className="text-sm font-medium">{toastMessage}</p>
                </div>
            )}
        </div>
    );
};

export default PhotoDetailModal;
