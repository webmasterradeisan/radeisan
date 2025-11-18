// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; 
import Button from './ui/Button'; 
import { supabase } from '../lib/supabase'; 
import { trackGiveLike, trackComment, trackShareContent, MISSION_TYPES } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; 
// ✅ IMPORTACIÓN NECESARIA PARA PUNTOS Y MISIONES
import { usePoints } from '../contexts/PointsContext';
// ✅ NUEVA IMPORTACIÓN
import GiftPointsModal from './GiftPointsModal'; 

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
    
    // ✅ HOOK DE PUNTOS Y MISIONES
    const { 
        missions, 
        updateMissionOptimistic, 
        rollbackMission, 
        addPoints, 
        refreshPoints 
    } = usePoints();
    
    const [likeCount, setLikeCount] = useState(0); 
    const [isLiking, setIsLiking] = useState(false);
    const [userHasLiked, setUserHasLiked] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    
    // NOTIFICACIÓN (TOAST)
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // ✅ NUEVO ESTADO: Control del Modal de Regalo
    const [showGiftModal, setShowGiftModal] = useState(false);

    const isOwner = user?.id === photoData?.user_id;

    // Obtener el ID del usuario logueado para verificar permisos de eliminación
    const currentUserId = user?.id;

    // ===================================
    // FUNCIÓN DE NOTIFICACIÓN TOAST (5 segundos)
    // ===================================

    const showTemporaryToast = useCallback((message, type = 'success', duration = 5000, callback = null) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
            setToastMessage('');
            if (callback) {
                callback();
            }
        }, duration);
    }, []);


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
            // 1. OBTENER CONTEO DE LIKES
            const { count: realLikeCount } = await supabase
                .from('photo_likes') 
                .select('*', { count: 'exact', head: true })
                .eq('photo_id', photoData.id);

            // 2. VERIFICAR SI EL USUARIO DIO LIKE
            const { data: userLike } = await supabase
                .from('photo_likes') 
                .select('id')
                .eq('photo_id', photoData.id)
                .eq('user_id', user.id)
                .maybeSingle(); 
            
            // 3. OBTENER COMENTARIOS (JOIN MANUAL EN MEMORIA)
            const { data: rawCommentsData, error: commentsError } = await supabase
                .from('photo_comments') 
                .select(`id, content, created_at, user_id`) 
                .eq('photo_id', photoData.id)
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (commentsError) throw commentsError;
            
            // 4. Obtener perfiles de todos los comentadores (JOIN EN MEMORIA)
            const userIds = [...new Set(rawCommentsData.map(c => c.user_id).filter(Boolean))];
            let usersMap = {};

            if (userIds.length > 0) {
                const { data: usersData, error: usersError } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, username')
                    .in('id', userIds);
                
                if (usersError) throw usersError;

                usersData.forEach(p => {
                    usersMap[p.id] = { name: p.full_name, username: p.username };
                });
            }

            // 5. Mapear y ensamblar los comentarios
            const finalComments = rawCommentsData.map(c => ({
                id: c.id,
                content: c.content,
                created_at: c.created_at,
                user_id: c.user_id, // Necesario para la eliminación
                // Unir datos de perfil
                user: usersMap[c.user_id]?.name || `@${usersMap[c.user_id]?.username || 'Usuario'}`
            }));


            setLikeCount(realLikeCount || 0); 
            setUserHasLiked(!!userLike); 
            setComments(finalComments); 

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


    // ===================================
    // CORRECCIÓN CRÍTICA: TECLA ENTER (Mantener la corrección de listeners)
    // ===================================
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
            
            // Permitir navegación solo con flechas y solo si no estamos escribiendo
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
    // MANEJADORES DE ACCIONES
    // ===================================

    // FUNCIÓN PARA ELIMINAR COMENTARIO
    const handleDeleteComment = useCallback(async (commentId, authorId) => {
        if (!currentUserId || currentUserId !== authorId) {
            showTemporaryToast("No tienes permiso para eliminar este comentario.", 'error');
            return;
        }

        if (!window.confirm("¿Estás seguro de que deseas eliminar este comentario?")) {
            return;
        }

        try {
            const { error } = await supabase
                .from('photo_comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', currentUserId);

            if (error) throw error;

            setComments(prev => prev.filter(c => c.id !== commentId));
            showTemporaryToast("Comentario eliminado correctamente", 'success');
        } catch (error) {
            console.error("Error deleting comment:", error);
            showTemporaryToast("Error al eliminar el comentario", 'error');
        }
    }, [currentUserId, showTemporaryToast]);

    // ===================================
    // ✅ FUNCIÓN ACTUALIZADA: handleLikeToggle
    // ===================================
    const handleLikeToggle = useCallback(async () => {
        if (!user) {
            showTemporaryToast('Debes iniciar sesión para dar like', 'error', 3000);
            return;
        }

        if (isLiking) return;

        // 💾 Guardar snapshot para rollback
        const snapshot = {
            userHasLiked,
            likeCount
        };

        try {
            setIsLiking(true);

            if (userHasLiked) {
                // ==============================
                // QUITAR LIKE
                // ==============================
                // Actualización optimista
                setUserHasLiked(false);
                setLikeCount(Math.max(0, likeCount - 1));

                const { error: deleteError } = await supabase
                    .from('photo_likes')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('photo_id', photoData.id);

                if (deleteError) throw deleteError;

                // Mostrar notificación
                showTemporaryToast('Like removido', 'info', 2000);

            } else {
                // ==============================
                // DAR LIKE
                // ==============================
                // Actualización optimista
                setUserHasLiked(true);
                setLikeCount(likeCount + 1);

                const { error: insertError } = await supabase
                    .from('photo_likes')
                    .insert({ user_id: user.id, photo_id: photoData.id });

                // 🔥 MANEJO EXPLÍCITO DE ERROR 23505 (duplicado)
                if (insertError) {
                    if (insertError.code === '23505') {
                        // Rollback de actualización optimista
                        setUserHasLiked(snapshot.userHasLiked);
                        setLikeCount(snapshot.likeCount);

                        showTemporaryToast('Ya diste like a esta foto', 'info', 3000);
                        return;
                    }
                    throw insertError;
                }

                // ================================================================
                // ✅ TRACKEAR MISIÓN (Backend maneja anti-farming ahora)
                // ================================================================
                
                // 1. Guardar snapshot del estado actual (para rollback si falla)
                const missionsSnapshot = [...missions];
                
                console.log('💾 [PhotoLike] Snapshot guardado');
                
                // 2. ACTUALIZACIÓN OPTIMISTA
                updateMissionOptimistic('give_like', 1);
                
                console.log('⚡ [PhotoLike] Actualización optimista aplicada');

                // 3. Llamar al backend
                try {
                    console.log('🚀 [PhotoLike] Llamando a trackGiveLike...');
                    
                    const missionResult = await trackGiveLike('photo', photoData.id);
                    
                    console.log('🎯 [PhotoLike] Resultado:', missionResult);
                    
                    // ================================================================
                    // MANEJO DE CASOS
                    // ================================================================
                    
                    if (missionResult.result === 'success' && missionResult.points_earned > 0) {
                        // ========================================
                        // CASO 1: MISIÓN COMPLETADA (10/10)
                        // ========================================
                        const pointsEarned = missionResult.points_earned;
                        
                        console.log('🎉 [PhotoLike] ¡MISIÓN COMPLETADA!');
                        
                        // ✅ NO HACER ROLLBACK (mantener 10/10)
                        
                        // Agregar puntos
                        await addPoints(pointsEarned, missionResult.message || 'Misión completada', 'free');
                        
                        // Confirmar desde backend
                        await refreshPoints();
                        
                        showTemporaryToast(`🎉 Misión Completa: +${pointsEarned} puntos`, 'success', 3000);

                    } else if (missionResult.result === 'progress_updated' || missionResult.result === 'registered') {
                        // ========================================
                        // CASO 2: PROGRESO REGISTRADO
                        // ========================================
                        console.log('📊 [PhotoLike] Progreso actualizado');
                        
                        showTemporaryToast(
                            missionResult.message || '✓ Progreso registrado',
                            'success',
                            2500
                        );
                        
                        // Confirmar desde backend
                        await refreshPoints();

                    } else if (missionResult.result === 'already_completed') {
                        // ========================================
                        // CASO 3: MISIÓN YA COMPLETADA
                        // ========================================
                        console.log('⚠️ [PhotoLike] Misión ya completada hoy');
                        
                        showTemporaryToast('Ya completaste la misión de Likes hoy', 'info', 2500);
                        
                        // Rollback
                        rollbackMission(missionsSnapshot);

                    } else if (missionResult.result === 'already_tracked') {
                        // ========================================
                        // CASO 4: ESTE CONTENIDO YA CONTÓ HOY (ANTI-FARMING)
                        // ========================================
                        console.log('⚠️ [PhotoLike] Esta foto ya contó para la misión hoy');
                        
                        showTemporaryToast('Ya recibiste progreso por esta foto hoy', 'info', 2500);
                        
                        // Rollback
                        rollbackMission(missionsSnapshot);

                    } else {
                        // ========================================
                        // CASO 5: CUALQUIER OTRO
                        // ========================================
                        console.log('ℹ️ [PhotoLike] Caso no específico:', missionResult);
                        
                        showTemporaryToast(
                            missionResult.message || '✓ Like registrado',
                            'info',
                            2000
                        );
                        
                        await refreshPoints();
                    }

                } catch (missionError) {
                    // ================================================================
                    // ERROR EN BACKEND - ROLLBACK
                    // ================================================================
                    console.error('❌ [PhotoLike] Error al procesar misión:', missionError);
                    
                    // Rollback
                    rollbackMission(missionsSnapshot);
                    
                    showTemporaryToast('Error al procesar la acción', 'error', 2500);
                }
            }

        } catch (error) {
            // ================================================================
            // ERROR GENERAL - ROLLBACK COMPLETO
            // ================================================================
            console.error('❌ [PhotoLike] Error general:', error);
            
            // Rollback UI
            setUserHasLiked(snapshot.userHasLiked);
            setLikeCount(snapshot.likeCount);
            
            showTemporaryToast(`Error: ${error.message}`, 'error', 2500);
            
            // Refrescar desde backend
            fetchInteractions();
        } finally {
            setIsLiking(false);
        }
    }, [
        user, 
        userHasLiked, 
        likeCount, 
        photoData,
        isLiking,
        missions,
        updateMissionOptimistic,
        rollbackMission,
        addPoints,
        refreshPoints,
        showTemporaryToast,
        fetchInteractions
    ]);

    // FUNCIÓN PARA COMENTAR
    const handleCommentSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!user) {
            showTemporaryToast('Debes iniciar sesión para comentar', 'error', 3000);
            return;
        }
        if (commentText.trim() === '') return;

        const optimisticComment = {
            id: `temp-${Date.now()}`,
            content: commentText,
            created_at: new Date().toISOString(),
            user_id: user.id,
            user: user.full_name || `@${user.username || 'Usuario'}`,
            isOptimistic: true
        };

        setComments(prev => [optimisticComment, ...prev]);
        setCommentText('');

        try {
            const { data, error } = await supabase
                .from('photo_comments')
                .insert({ 
                    photo_id: photoData.id, 
                    user_id: user.id, 
                    content: commentText 
                })
                .select()
                .single();

            if (error) throw error;

            setComments(prev => prev.map(c => 
                c.id === optimisticComment.id 
                    ? { ...data, user: optimisticComment.user }
                    : c
            ));

            // Trackear misión de comentario
            try {
                const result = await trackComment('photo', photoData.id, commentText);
                console.log('Resultado misión comentario:', result);
                
                if (result.points_earned > 0) {
                    await addPoints(result.points_earned, result.message, 'free');
                    showTemporaryToast(`✓ Comentario enviado. +${result.points_earned} puntos`, 'success', 3000);
                } else {
                    showTemporaryToast(result.message || '✓ Comentario enviado', 'success', 2500);
                }
            } catch (trackError) {
                console.error('Error tracking comment mission:', trackError);
                showTemporaryToast('✓ Comentario enviado', 'success', 2500);
            }

        } catch (error) {
            console.error("Error posting comment:", error);
            setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
            showTemporaryToast(`Error al enviar comentario: ${error.message}`, 'error', 3000);
        }
    }, [user, commentText, photoData, addPoints, showTemporaryToast]);

    // FUNCIÓN PARA COMPARTIR
    const handleShare = useCallback(async () => {
        if (!user) {
            showTemporaryToast('Debes iniciar sesión para compartir', 'error', 3000);
            return;
        }

        try {
            const shareUrl = `${window.location.origin}/photo/${photoData.id}`;
            
            if (navigator.share) {
                await navigator.share({
                    title: photoData.caption || 'Foto en Radeisan',
                    text: photoData.description || 'Mira esta foto',
                    url: shareUrl
                });
                
                // Trackear misión de compartir
                try {
                    const result = await trackShareContent('photo', photoData.id);
                    console.log('Resultado misión compartir:', result);
                    
                    if (result.points_earned > 0) {
                        await addPoints(result.points_earned, result.message, 'free');
                        showTemporaryToast(`✓ Contenido compartido. +${result.points_earned} puntos`, 'success', 3000);
                    }
                } catch (trackError) {
                    console.error('Error tracking share mission:', trackError);
                }
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showTemporaryToast('Enlace copiado al portapapeles', 'success', 2000);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                showTemporaryToast('Error al compartir', 'error', 2000);
            }
        }
    }, [user, photoData, addPoints, showTemporaryToast]);

    // ✅ FUNCIÓN PARA ABRIR MODAL DE REGALO
    const handleGift = useCallback(() => {
        setShowGiftModal(true);
    }, []);

    // ✅ FUNCIÓN PARA MANEJAR ÉXITO DEL REGALO
    const handleGiftSuccess = useCallback((message) => {
        showTemporaryToast(message, 'success', 3000);
        setShowGiftModal(false);
    }, [showTemporaryToast]);

    if (!photoData) {
        return null;
    }

    const photoUrl = photoData.url;
    const userDisplayName = photoData.user?.full_name || `@${photoData.user?.username || 'Usuario'}`;
    const photoDate = new Date(photoData.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const photoCaption = photoData.caption;
    const photoDescription = photoData.description;
    
    const photoId = photoData.id;
    const isFirstPhoto = currentPhotoIndex === 0;
    const isLastPhoto = currentPhotoIndex === totalPhotos - 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
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
            
            <div className="relative flex w-full max-w-7xl h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden">
                
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
                                    <p className="text-xs italic text-muted-foreground">Sé el primero en comentar.</p>
                                ) : (
                                    comments.map((c) => (
                                        <div key={c.id} className="flex items-start space-x-2 w-full">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`font-semibold text-sm ${c.isOptimistic ? 'text-primary' : 'text-foreground'}`}>{c.user || 'Usuario'}</span>
                                                    {/* BOTÓN DE ELIMINAR (Solo si el usuario actual es el autor) */}
                                                    {currentUserId === c.user_id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-6 h-6 text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteComment(c.id, c.user_id)}
                                                            title="Eliminar comentario"
                                                        >
                                                            <Icon name="Trash2" size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{c.content}</p>
                                            </div>
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
                                <Icon name={userHasLiked ? "Heart" : "Heart"} fill={userHasLiked ? "currentColor" : "none"} size={18} className="mr-2" />
                                Me Gusta ({likeCount})
                            </Button>
                            
                            {/* ✅ NUEVO BOTÓN: Regalar Puntos */}
                            {currentUserId && photoData?.user_id && currentUserId !== photoData.user_id && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-yellow-600 hover:bg-yellow-600/10 transition-colors"
                                    onClick={handleGift}
                                >
                                    <span className="text-lg font-extrabold mr-0.5 leading-none">R</span>
                                    <Icon name="Gift" size={18} className="fill-current" />
                                </Button>
                            )}

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
                                        e.stopPropagation(); 
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
            
            {/* 🚨 TOAST NOTIFICATION COMPONENT */}
            {showToast && (
                <div 
                    className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] p-3 rounded-lg shadow-xl transition-all duration-500 opacity-100 
                        ${toastMessage.includes("Puntos") || toastMessage.includes("Completa") || toastMessage.includes("Misión") ? 'bg-green-600 text-white' : 
                          (toastMessage.includes("Error") ? 'bg-red-600 text-white' : 'bg-blue-500 text-white')}`
                    }
                    style={{ animation: 'slideUp 0.3s forwards' }}
                >
                    <p className="text-sm font-medium">{toastMessage}</p>
                </div>
            )}
            
            {/* ✅ NUEVO: MODAL DE REGALO DE PUNTOS */}
            <GiftPointsModal
                isOpen={showGiftModal}
                onClose={() => setShowGiftModal(false)}
                receiverId={photoData?.user_id}
                receiverUsername={userDisplayName}
                contentId={photoData?.id}
                contentType="photo"
                onSuccess={handleGiftSuccess}
            />
        </div>
    );
};

export default PhotoDetailModal;
