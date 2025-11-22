// src/components/PhotoDetailModal.jsx
// ============================================================================
// PHOTO DETAIL MODAL - VERSIÓN FINAL BLINDADA Y SINCRONIZADA
// ✅ CORREGIDO: Lógica para asegurar la visualización del nombre de usuario del autor.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; 
import Button from './ui/Button'; 
import { supabase } from '../lib/supabase'; 
import { trackGiveLike, trackComment, trackShareContent } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; 
import { usePoints } from '../contexts/PointsContext';
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
        updateLocalBalance, 
        notifyMissionComplete, 
        refreshPoints 
    } = usePoints();
    
    const [likeCount, setLikeCount] = useState(0); 
    const [isLiking, setIsLiking] = useState(false);
    const [userHasLiked, setUserHasLiked] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    const [authorProfile, setAuthorProfile] = useState(null); // ⬅️ ESTADO PARA EL AUTOR
    
    // ✅ NUEVO ESTADO: Anti-Farming (Recordar fotos pagadas en esta sesión)
    const [pointsRewardedIds, setPointsRewardedIds] = useState(new Set());
    
    // NOTIFICACIÓN (TOAST)
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Estado del Modal de Regalo
    const [showGiftModal, setShowGiftModal] = useState(false);

    const currentUserId = user?.id;

    // ===================================
    // FUNCIÓN DE NOTIFICACIÓN TOAST
    // ===================================
    const showTemporaryToast = useCallback((message, type = 'success', duration = 4000) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
            setToastMessage('');
        }, duration);
    }, []);

    // ===================================
    // LÓGICA DE SINCRONIZACIÓN (FETCH)
    // ===================================
    const fetchInteractions = useCallback(async () => {
        if (!photoData?.id) {
            setComments([]);
            setUserHasLiked(false);
            return;
        }

        try {
            // 1. OBTENER PERFIL DEL AUTOR (CORRECCIÓN)
            if (photoData.user_id) {
                const { data: authorData, error: authorError } = await supabase
                    .from('user_profiles')
                    .select('full_name, username')
                    .eq('id', photoData.user_id)
                    .maybeSingle();

                if (authorError) throw authorError;
                setAuthorProfile(authorData);
            }
            // ----------------------------------------------------

            const { count: realLikeCount } = await supabase
                .from('photo_likes') 
                .select('*', { count: 'exact', head: true })
                .eq('photo_id', photoData.id);

            // 2. Comprobar si el usuario actual dio like
            const { data: userLike } = await supabase
                .from('photo_likes') 
                .select('id')
                .eq('photo_id', photoData.id)
                .eq('user_id', user?.id)
                .maybeSingle(); 
            
            // 3. Obtener comentarios
            const { data: rawCommentsData, error: commentsError } = await supabase
                .from('photo_comments') 
                .select(`id, content, created_at, user_id`) 
                .eq('photo_id', photoData.id)
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (commentsError) throw commentsError;
            
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

            const finalComments = rawCommentsData.map(c => ({
                id: c.id,
                content: c.content,
                created_at: c.created_at,
                user_id: c.user_id,
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
    // CONTROLES DE TECLADO
    // ===================================
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
    // MANEJADORES DE ACCIONES
    // ===================================

    const handleDeleteComment = useCallback(async (commentId, authorId) => {
        if (!currentUserId || currentUserId !== authorId) {
            showTemporaryToast("No tienes permiso para eliminar este comentario.", 'error');
            return;
        }
        // ✅ CORRECCIÓN DE SEGURIDAD: Comprobación de ventana de confirmación
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
            showTemporaryToast("Comentario eliminado", 'success');
        } catch (error) {
            showTemporaryToast("Error al eliminar comentario", 'error');
        }
    }, [currentUserId, showTemporaryToast]);

    // ===================================
    // ✅ FUNCIÓN BLINDADA: handleLikeToggle
    // ===================================
    const handleLikeToggle = useCallback(async () => {
        if (!user) {
            showTemporaryToast('Debes iniciar sesión para dar like', 'error', 3000);
            return;
        }

        // 🛑 1. BLOQUEO DE AUTO-LIKE
        if (user.id === photoData?.user_id) {
            showTemporaryToast('No puedes dar like a tus propias fotos', 'error', 3000);
            return;
        }

        if (isLiking) return;

        // 💾 Guardar snapshot para rollback
        const snapshot = { userHasLiked, likeCount };

        try {
            setIsLiking(true);

            if (userHasLiked) {
                // ==============================
                // QUITAR LIKE (Unlike)
                // ==============================
                setUserHasLiked(false);
                setLikeCount(Math.max(0, likeCount - 1));

                const { error: deleteError } = await supabase
                    .from('photo_likes')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('photo_id', photoData.id);

                if (deleteError) throw deleteError;
                showTemporaryToast('Like removido', 'info', 2000);

            } else {
                // ==============================
                // DAR LIKE
                // ==============================
                setUserHasLiked(true);
                // setLikeCount(likeCount + 1); // ❌ El incremento es después de la confirmación de la DB

                // Insertar Like en BD (Acción Social)
                const { error: insertError } = await supabase
                    .from('photo_likes')
                    .insert({ user_id: user.id, photo_id: photoData.id });

                if (insertError) {
                    if (insertError.code === '23505') {
                        setUserHasLiked(snapshot.userHasLiked);
                        setLikeCount(snapshot.likeCount);
                        showTemporaryToast('Ya diste like a esta foto', 'info', 3000);
                        return;
                    }
                    throw insertError;
                }
                
                // ✅ ÚNICO INCREMENTO (POST-DB CONFIRMACIÓN)
                setLikeCount(prev => prev + 1);


                // ================================================================
                // 🛑 2. ANTI-FARMING & GESTIÓN DE PUNTOS
                // ================================================================
                const alreadyRewarded = pointsRewardedIds.has(photoData.id);

                if (alreadyRewarded) {
                    // ⚠️ CASO RE-LIKE: Informativo
                    console.log('ℹ️ Re-like detectado: Sin puntos extra');
                    showTemporaryToast('Like restaurado (Sin puntos extra)', 'info', 2500);
                } else {
                    // ✅ CASO NUEVO LIKE
                    
                    // 1. Marcar como recompensado INMEDIATAMENTE
                    setPointsRewardedIds(prev => new Set(prev).add(photoData.id));

                    // 2. Actualización Optimista (Misión)
                    const missionsSnapshot = [...missions];
                    updateMissionOptimistic('give_like', 1);

                    // 3. Llamar al backend
                    try {
                        const missionResult = await trackGiveLike('photo', photoData.id);
                        
                        if (missionResult.result === 'success' && missionResult.points_earned > 0) {
                            // ✅ USAMOS updateLocalBalance y notifyMissionComplete (Header y Modal)
                            updateLocalBalance(missionResult.points_earned); 
                            notifyMissionComplete(missionResult.points_earned);
                            showTemporaryToast(`🎉 Misión Completa: +${missionResult.points_earned} puntos`, 'success', 3000);

                        } else if (missionResult.result === 'already_completed') {
                            showTemporaryToast('Like registrado (Misión diaria completa)', 'info', 2500);
                            rollbackMission(missionsSnapshot);
                        } else if (missionResult.points_earned > 0) {
                            // Caso: Puntos ganados pero no misión completa (ej. acción individual)
                            updateLocalBalance(missionResult.points_earned);
                            showTemporaryToast(`✓ Like registrado. +${missionResult.points_earned} puntos`, 'success', 2000);
                        } else {
                            // Caso: Solo registro de progreso
                            showTemporaryToast('✓ Like registrado', 'info', 2000);
                        }

                    } catch (missionError) {
                        console.error('❌ Error misión:', missionError);
                        rollbackMission(missionsSnapshot);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error general:', error);
            // Rollback completo en error crítico
            setUserHasLiked(snapshot.userHasLiked);
            setLikeCount(snapshot.likeCount);
            showTemporaryToast(`Error: ${error.message}`, 'error', 2500);
        } finally {
            setIsLiking(false);
        }
    }, [
        user, userHasLiked, likeCount, photoData, isLiking, missions, 
        updateMissionOptimistic, rollbackMission, updateLocalBalance, notifyMissionComplete,
        showTemporaryToast, pointsRewardedIds
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
                .insert({ photo_id: photoData.id, user_id: user.id, content: commentText })
                .select().single();

            if (error) throw error;

            setComments(prev => prev.map(c => c.id === optimisticComment.id ? { ...data, user: optimisticComment.user } : c));

            // Trackear misión de comentario
            try {
                const result = await trackComment('photo', photoData.id, commentText);
                if (result.points_earned > 0) {
                    updateLocalBalance(result.points_earned); // ✅ Update local para Header
                    showTemporaryToast(`✓ Comentario enviado. +${result.points_earned} puntos`, 'success', 3000);
                } else {
                    showTemporaryToast(result.message || '✓ Comentario enviado', 'success', 2500);
                }
            } catch (trackError) { 
                console.error('Error tracking comment:', trackError);
                showTemporaryToast('✓ Comentario enviado', 'success', 2500);
            }

        } catch (error) {
            console.error("Error posting comment:", error);
            setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
            showTemporaryToast(`Error al enviar comentario`, 'error', 3000);
        }
    }, [user, commentText, photoData, updateLocalBalance, showTemporaryToast]);

    // FUNCIÓN PARA COMPARTIR
    const handleShare = useCallback(async () => {
        if (!user) {
            showTemporaryToast('Debes iniciar sesión para compartir', 'error', 3000);
            return;
        }

        try {
            const shareUrl = `${window.location.origin}/photo/${photoData.id}`;
            const shareData = {
                title: photoData.caption || 'Foto en Radeisan',
                text: photoData.description || 'Mira esta foto',
                url: shareUrl
            };
            
            const method = navigator.share ? 'native' : 'clipboard';

            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showTemporaryToast('Enlace copiado al portapapeles', 'success', 2000);
            }

            // Trackear misión de compartir
            try {
                const result = await trackShareContent('photo', photoData.id, 1, { platform: method });
                if (result.points_earned > 0) {
                    updateLocalBalance(result.points_earned); // ✅ Update local para Header
                    showTemporaryToast(`✓ Compartido. +${result.points_earned} puntos`, 'success', 3000);
                }
            } catch (trackError) { console.error('Error tracking share:', trackError); }

        } catch (error) {
            if (error.name !== 'AbortError') {
                showTemporaryToast('Error al compartir', 'error', 2000);
            }
        }
    }, [user, photoData, updateLocalBalance, showTemporaryToast]);

    const handleGift = useCallback(() => {
        // Bloqueo auto-regalo
        if (user?.id === photoData?.user_id) {
            showTemporaryToast('No puedes darte regalos a ti mismo', 'error', 3000);
            return;
        }
        setShowGiftModal(true);
    }, [user, photoData, showTemporaryToast]);

    const handleGiftSuccess = useCallback((message) => {
        showTemporaryToast(message, 'success', 3000);
        setShowGiftModal(false);
    }, [showTemporaryToast]);

    if (!photoData) return null;

    // ✅ CORRECCIÓN DE IMAGEN: Usamos image_url si es necesario
    const photoUrl = photoData.image_url || photoData.url; 
    // ✅ CORRECCIÓN DEL NOMBRE DEL AUTOR: Usamos el estado recuperado o el nombre del perfil
    const authorUsername = authorProfile?.username || `@${photoData.user?.username || 'Usuario'}`;
    const photoDate = new Date(photoData.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const photoCaption = photoData.caption;
    const photoDescription = photoData.description;
    
    const isFirstPhoto = currentPhotoIndex === 0;
    const isLastPhoto = currentPhotoIndex === totalPhotos - 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            {!isFirstPhoto && (
                <Button variant="ghost" size="icon" className="absolute left-0 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 ml-4" onClick={() => onNavigate('prev')}>
                    <Icon name="ChevronLeft" size={32} />
                </Button>
            )}
            
            <div className="relative flex w-full max-w-7xl h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden">
                <Button variant="ghost" size="icon" className="absolute top-0 left-0 m-4 text-white hover:bg-white/20 z-50" onClick={onClose}>
                    <Icon name="X" size={24} />
                </Button>

                <div className="flex-1 flex items-center justify-center relative bg-black">
                    {/* ✅ REPARACIÓN DE LA IMAGEN: Usamos object-contain para asegurar que se vea completa */}
                    <img src={photoUrl} alt={`Foto de ${authorUsername}`} className="max-h-full max-w-full object-contain" />
                </div>
                
                <div className="w-96 flex flex-col border-l border-border bg-background flex-shrink-0">
                    <div className="p-4 border-b border-border flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" /> 
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{authorUsername}</h4>
                            <p className="text-xs text-muted-foreground">{photoDate}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {photoCaption && <p className="font-semibold text-sm text-foreground">{photoCaption}</p>}
                        {photoDescription && photoDescription !== photoCaption && <p className="text-sm text-foreground mt-1">{photoDescription}</p>}
                        
                        <div className="text-sm text-muted-foreground border-t border-border pt-4 mt-4">
                            <p className="font-semibold mb-2 text-foreground">Comentarios:</p>
                            <div className="space-y-3">
                                {comments.length === 0 ? ( <p className="text-xs italic text-muted-foreground">Sé el primero en comentar.</p> ) : (
                                    comments.map((c) => (
                                        <div key={c.id} className="flex items-start space-x-2 w-full">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`font-semibold text-sm ${c.isOptimistic ? 'text-primary' : 'text-foreground'}`}>{c.user || 'Usuario'}</span>
                                                    {currentUserId === c.user_id && (
                                                        <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteComment(c.id, c.user_id)} title="Eliminar comentario">
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
                                className={`${userHasLiked ? 'text-red-500 hover:bg-red-500/10' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'} ${isLiking ? 'opacity-50' : ''}`}
                                onClick={handleLikeToggle}
                                disabled={isLiking}
                            >
                                <Icon name={userHasLiked ? "Heart" : "Heart"} fill={userHasLiked ? "currentColor" : "none"} size={18} className="mr-2" />
                                Me Gusta ({likeCount})
                            </Button>
                            
                            {currentUserId && photoData?.user_id && currentUserId !== photoData.user_id && (
                                <Button variant="ghost" size="sm" className="text-yellow-600 hover:bg-yellow-600/10 transition-colors" onClick={handleGift}>
                                    <span className="text-lg font-extrabold mr-0.5 leading-none">R</span>
                                    <Icon name="Gift" size={18} className="fill-current" />
                                </Button>
                            )}

                            <Button variant="ghost" size="sm" onClick={handleShare}>
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
                                onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim() !== '') { e.stopPropagation(); e.preventDefault(); handleCommentSubmit(e); } }}
                            />
                            <Button size="sm" variant="ghost" onClick={handleCommentSubmit} disabled={commentText.trim() === ''}>
                                <Icon name="Send" size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

             {!isLastPhoto && (
                <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 mr-4" onClick={() => onNavigate('next')}>
                    <Icon name="ChevronRight" size={32} />
                </Button>
            )}
            
            {showToast && (
                <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] p-3 rounded-lg shadow-xl transition-all duration-500 opacity-100 ${toastMessage.includes("Puntos") || toastMessage.includes("Completa") || toastMessage.includes("Misión") ? 'bg-green-600 text-white' : (toastMessage.includes("Error") || toastMessage.includes("propia") ? 'bg-red-600 text-white' : 'bg-blue-500 text-white')}`} style={{ animation: 'slideUp 0.3s forwards' }}>
                    <p className="text-sm font-medium">{toastMessage}</p>
                </div>
            )}
            
            <GiftPointsModal isOpen={showGiftModal} onClose={() => setShowGiftModal(false)} receiverId={photoData?.user_id} receiverUsername={authorUsername} contentId={photoData?.id} contentType="photo" onSuccess={handleGiftSuccess} />
        </div>
    );
};

export default PhotoDetailModal;
