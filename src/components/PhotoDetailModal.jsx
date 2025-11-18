// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; 
import Button from './ui/Button'; 
import { supabase } from '../lib/supabase'; 
import { trackGiveLike, trackComment, trackShareContent, MISSION_TYPES } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; 
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

        // Optimistic UI Update: Quitar comentario inmediatamente
        setComments(prev => prev.filter(c => c.id !== commentId));
        
        try {
            // 1. Eliminar de la base de datos
            const { error } = await supabase
                .from('photo_comments') 
                .delete()
                .eq('id', commentId)
                .eq('user_id', currentUserId); // Doble chequeo de seguridad en la DB

            if (error) throw error;

            showTemporaryToast("Comentario eliminado exitosamente.", 'success');
            // La UI ya está actualizada, solo refrescamos la lista de la página principal.
            refreshParentData(); 

        } catch (error) {
            console.error('💥 Error al eliminar comentario:', error);
            showTemporaryToast("Error al eliminar el comentario.", 'error');
            // Revertir UI: Forzar un fetch para restaurar el estado real de la DB
            await fetchInteractions();
        }
    }, [currentUserId, fetchInteractions, refreshParentData, showTemporaryToast]);


    const handleLikeToggle = useCallback(async () => {
        if (!user?.id || isLiking) return;

        setIsLiking(true);
        const photoId = photoData.id;
        
        // 💾 Guardar snapshot para rollback
        const snapshot = {
            userHasLiked,
            likeCount
        };

        console.log('👍 [handleLikeToggle] Estado inicial:', {
            photoId: photoId.substring(0, 8),
            userHasLiked,
            likeCount,
            isOwner
        });

        try {
            if (userHasLiked) { 
                // ==============================
                // QUITAR LIKE
                // ==============================
                console.log('⏪ [handleLikeToggle] Quitando like...');
                
                // Actualización optimista (usuario ve cambio inmediato)
                setUserHasLiked(false);
                setLikeCount(Math.max(0, likeCount - 1));

                const { error: deleteError } = await supabase
                    .from('photo_likes') 
                    .delete()
                    .eq('user_id', user.id)
                    .eq('photo_id', photoId);

                if (deleteError) throw deleteError;
                
                console.log('✅ [handleLikeToggle] Like eliminado correctamente');
                showTemporaryToast('Me Gusta removido', 'success', 3000);

            } else { 
                // ==============================
                // DAR LIKE
                // ==============================
                console.log('👍 [handleLikeToggle] Dando like...');
                
                // Verificar si es el dueño
                if (isOwner) {
                    showTemporaryToast('No puedes darle like a tu propio contenido', 'info', 3000);
                    setIsLiking(false);
                    return;
                }

                // Actualización optimista (usuario ve cambio inmediato)
                setUserHasLiked(true);
                setLikeCount(likeCount + 1);

                // Intentar insertar el like
                const { error: insertError } = await supabase
                    .from('photo_likes') 
                    .insert({ user_id: user.id, photo_id: photoId });
                
                // ================================================================
                // 🔥 MANEJO EXPLÍCITO DE ERROR 23505 (LIKE DUPLICADO)
                // ================================================================
                if (insertError) {
                    if (insertError.code === '23505') {
                        // Error UNIQUE: El usuario ya dio like a esta foto antes
                        console.log('⚠️ [handleLikeToggle] Ya diste like a esta foto anteriormente');
                        
                        // Rollback de la actualización optimista
                        setUserHasLiked(snapshot.userHasLiked);
                        setLikeCount(snapshot.likeCount);
                        
                        showTemporaryToast('Ya diste like a esta foto', 'info', 3000);
                        setIsLiking(false);
                        return;
                    } else {
                        // Otro tipo de error
                        throw insertError;
                    }
                }

                // ================================================================
                // ✅ LIKE INSERTADO CORRECTAMENTE - TRACKEAR MISIÓN
                // ================================================================
                console.log('✅ [handleLikeToggle] Like insertado, trackeando misión...');
                
                try {
                    const trackingResult = await trackGiveLike('photo', photoId);
                    console.log('🎯 [handleLikeToggle] Resultado tracking:', trackingResult);
                    
                    if (trackingResult.result === 'success' && trackingResult.points_earned > 0) {
                        // ¡MISIÓN COMPLETADA!
                        console.log('🎉 [handleLikeToggle] ¡Misión completada!', {
                            points: trackingResult.points_earned
                        });
                        
                        showTemporaryToast(
                            `🎉 Misión Completa: +${trackingResult.points_earned} puntos`, 
                            'success', 
                            5000,
                            () => {
                                fetchInteractions();
                                refreshParentData();
                            }
                        );
                        
                    } else if (trackingResult.result === 'progress_updated') {
                        // Progreso actualizado pero no completado
                        console.log('📊 [handleLikeToggle] Progreso actualizado');
                        showTemporaryToast('✓ Progreso registrado. ¡Sigue dando likes!', 'success', 3000);
                        
                    } else if (trackingResult.result === 'already_completed') {
                        // Misión ya completada hoy
                        console.log('ℹ️ [handleLikeToggle] Misión ya completada hoy');
                        showTemporaryToast('Ya completaste la misión de Likes hoy', 'info', 3000);
                        
                    } else {
                        // Otro resultado
                        console.log('ℹ️ [handleLikeToggle] Acción registrada:', trackingResult.result);
                        showTemporaryToast('Like registrado', 'success', 2000);
                    }
                    
                } catch (trackError) {
                    // Error al trackear misión (no crítico)
                    console.error('⚠️ [handleLikeToggle] Error al trackear misión:', trackError);
                    showTemporaryToast('Like registrado', 'success', 2000);
                }
            }

        } catch (error) {
            // ================================================================
            // 💥 ERROR CRÍTICO - ROLLBACK COMPLETO
            // ================================================================
            console.error('❌ [handleLikeToggle] Error crítico:', error);
            
            // Rollback a estado anterior
            setUserHasLiked(snapshot.userHasLiked);
            setLikeCount(snapshot.likeCount);
            
            // Mostrar error al usuario
            showTemporaryToast(
                `Error al procesar like: ${error.message}`, 
                'error', 
                4000
            );
            
            // Refresh para sincronizar con BD
            fetchInteractions();
            
        } finally {
            setIsLiking(false);
        }
    }, [photoData, isLiking, userHasLiked, likeCount, refreshParentData, user, fetchInteractions, isOwner, showTemporaryToast]);


    const handleCommentSubmit = useCallback(async (e) => {
        e?.preventDefault(); 
        
        const comment = commentText.trim();
        if (comment === '' || !user?.id) return;
        
        const tempComment = commentText;

        try {
            // 1. Lógica de inserción
            const { error: insertError } = await supabase
                .from('photo_comments') 
                .insert({ user_id: user.id, photo_id: photoData.id, content: comment });

            if (insertError) throw insertError;
            
            // 2. Actualizar UI localmente y disparar toast
            setCommentText(''); 
            
            // 3. Lógica de tracking de puntos (Solo si NO es el dueño)
            if (!isOwner) {
                if (MISSION_TYPES?.COMMENT) {
                    const trackingResult = await trackComment('photo', photoData.id); 
                    if (trackingResult.result === 'success') {
                         showTemporaryToast(`+${trackingResult.points_earned} Puntos por Comentario!`, 'success', 5000, () => {
                            fetchInteractions();
                            refreshParentData();
                        });
                        return; // Salir sin recargar aquí
                    } else if (trackingResult.result === 'already_paid') {
                        showTemporaryToast("Ya ganaste puntos por este comentario.", 'info', 5000, () => {
                            fetchInteractions();
                        });
                        return;
                    }
                }
            } else {
                 showTemporaryToast("Comentario publicado (No ganas puntos por tu contenido).", 'info', 5000, () => {
                    fetchInteractions();
                });
                return;
            }
            
            // Si no hubo toast, recargar aquí
            fetchInteractions(); 
            refreshParentData(); 


        } catch (error) {
            console.error('💥 Error al insertar o trackear comentario:', error);
            setCommentText(tempComment); // Revertir texto si falla
            showTemporaryToast('Error al enviar el comentario.', 'error');
            // Si falla, recargar para ver el estado real
            fetchInteractions();
        }
    }, [commentText, photoData, refreshParentData, user, fetchInteractions, isOwner, showTemporaryToast]);

    const handleShare = useCallback(async () => {
        const shareUrl = `${window.location.origin}/photo/${photoData.id}`; 
        const shareTitle = photoData.caption || "Mira esta foto!";
        
        const callTracking = async (platform) => {
             if (!isOwner) {
                if (MISSION_TYPES?.SHARE_CONTENT) {
                    const trackingResult = await trackShareContent('photo', photoData.id, platform); 
                    if (trackingResult.result === 'success') {
                         showTemporaryToast(`¡Compartido! +${trackingResult.points_earned} puntos.`, 'success', 5000, () => {
                            refreshParentData();
                        });
                    } else if (trackingResult.result === 'already_paid') {
                        showTemporaryToast("Ya ganaste puntos por compartir este contenido hoy.", 'info', 5000, () => {
                            refreshParentData();
                        });
                    }
                }
            } else {
                showTemporaryToast("Compartiendo foto (No ganas puntos por tu contenido).", 'info', 5000);
            }
        };

        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    url: shareUrl,
                });
                await callTracking('web_share_api'); 

            } catch (error) {
                if (error.name !== 'AbortError') { 
                     console.error('Web Share API falló:', error);
                     showTemporaryToast('Error al abrir el diálogo de compartir.', 'error');
                }
            }
        } else {
            // Fallback: Copiar al portapapeles
            try {
                await navigator.clipboard.writeText(shareUrl);
                await callTracking('clipboard_share');
                
            } catch (error) {
                console.error('Error al copiar al portapapeles:', error);
                showTemporaryToast('Error al copiar el enlace.', 'error');
            }
        }
    }, [photoData, refreshParentData, isOwner, showTemporaryToast]);
    
    // ✅ NUEVA FUNCIÓN: Abrir Modal de Regalo
    const handleGift = useCallback(() => {
        if (!user) {
            showTemporaryToast("Debes iniciar sesión para regalar puntos.", 'error'); 
            return;
        }
        if (isOwner) {
            showTemporaryToast("No puedes regalar puntos a tu propia foto.", 'error');
            return;
        }
        setShowGiftModal(true);
    }, [user, isOwner, showTemporaryToast]);
    
    // ✅ NUEVA FUNCIÓN: Manejar el éxito del regalo
    const handleGiftSuccess = useCallback((amount) => {
        showTemporaryToast(`¡Regalo enviado! ${amount} puntos para el creador.`, 'success', 3000);
    }, [showTemporaryToast]);


    // Asignamos datos para la UI usando photoData real
    const photoUrl = photoData?.image_url || photoData?.thumbnail_url; 
    const photoCaption = photoData?.caption || 'Foto sin descripción';
    const photoDescription = photoData?.description; 
    
    const userDisplayName = photoData?.user_profiles?.username || photoData?.user_profiles?.full_name || `@${user?.email?.split('@')[0] || 'UsuarioDetalle'}`;
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
            
            {/* 🚨 TOAST NOTIFICATION COMPONENT (sin cambios) */}
            {showToast && (
                <div 
                    className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] p-3 rounded-lg shadow-xl transition-all duration-500 opacity-100 
                        ${toastMessage.includes("Puntos") ? 'bg-green-600 text-white' : 
                          (toastMessage.includes("Error") ? 'bg-red-600 text-white' : 'bg-yellow-500 text-gray-800')}`
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
