// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; 
import Button from './ui/Button'; 
import { supabase } from '../lib/supabase'; 
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
    
    // NOTIFICACIÓN (TOAST)
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const isOwner = user?.id === photoData?.user_id;

    // ===================================
    // FUNCIÓN DE NOTIFICACIÓN TOAST (DURACIÓN AUMENTADA A 5 SEGUNDOS)
    // ===================================

    const showTemporaryToast = useCallback((message, type = 'success', duration = 5000) => {
        setToastMessage(message);
        setShowToast(true);
        // 🚨 CAMBIO: Aumento de 3000ms a 5000ms
        setTimeout(() => {
            setShowToast(false);
            setToastMessage('');
        }, duration);
    }, []);


    // ===================================
    // LÓGICA DE SINCRONIZACIÓN DE INTERACCIONES (FETCH - SOLUCIÓN PGRST100)
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
                .select(`id, content, created_at, user_id`) // <-- SIN JOIN AQUÍ
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

    // FIX: LIKE CON ANTI-FARMING Y AVISOS SWEET ALERT
    const handleLikeToggle = useCallback(async () => {
        if (!user?.id || isLiking) return;

        setIsLiking(true);
        const photoId = photoData.id;
        const previousLikedState = userHasLiked;
        const previousLikeCount = likeCount;

        // ⭐️ Determinar el mensaje de advertencia si no gana puntos
        let warningMessage = '';
        if (isOwner) {
            warningMessage = 'No ganas puntos por darle "Me Gusta" a tu propio contenido.';
        }

        try {
            if (userHasLiked) { 
                // UNLIKE
                const { error: deleteError } = await supabase
                    .from('photo_likes') 
                    .delete()
                    .eq('user_id', user.id)
                    .eq('photo_id', photoId);

                if (deleteError) throw deleteError;
                
                // Actualizar UI localmente 
                setUserHasLiked(false);
                setLikeCount(Math.max(0, previousLikeCount - 1));

            } else { 
                // LIKE (INSERT)
                const { error: insertError } = await supabase
                    .from('photo_likes') 
                    .insert({ user_id: user.id, photo_id: photoId });
                
                if (insertError && insertError.code !== '23505') throw insertError;
                
                if (!insertError || insertError.code === '23505') {
                    // Si el like fue exitoso o ya existía, actualizamos el conteo y estado
                    setUserHasLiked(true);
                    setLikeCount(previousLikeCount + 1);

                    // 🛑 LÓGICA DE TRACKING Y AVISO 🛑
                    if (!isOwner) {
                        if (MISSION_TYPES?.GIVE_LIKE) {
                            const trackingResult = await trackGiveLike('photo', photoId); 
                            
                            if (trackingResult.result === 'success') {
                                showTemporaryToast(`+${trackingResult.points_earned} Puntos por Like!`, 'success');
                            } else if (trackingResult.result === 'already_paid') {
                                // ⭐️ AVISO TIPO SWEET ALERT POR ANTI-FARMING ⭐️
                                warningMessage = 'Ya ganaste puntos por darle "Me Gusta" a esta foto anteriormente.';
                            }
                        }
                    }
                }
            }

            // Mostrar el aviso si se generó alguno (por owned content o anti-farming)
            if (warningMessage) {
                showTemporaryToast(warningMessage, 'info');
            }

            // Refrescar para asegurar consistencia
            await fetchInteractions(); 
            refreshParentData(); 

        } catch (error) {
            console.error('💥 Error al dar like:', error);
            alert(`Error de interacción: ${error.message}`);
            // Revertir estado si falla la operación
            setUserHasLiked(previousLikedState);
            setLikeCount(previousLikeCount);
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
            
            // 2. Actualizar UI localmente y refrescar
            setCommentText(''); 
            await fetchInteractions(); // Refrescar para ver el nuevo comentario

            // 3. Lógica de tracking de puntos (Solo si NO es el dueño)
            if (!isOwner) {
                if (MISSION_TYPES?.COMMENT) {
                    const trackingResult = await trackComment('photo', photoData.id); 
                    if (trackingResult.result === 'success') {
                         showTemporaryToast(`+${trackingResult.points_earned} Puntos por Comentario!`, 'success');
                        refreshParentData(); 
                    } else if (trackingResult.result === 'already_paid') {
                        showTemporaryToast("Ya ganaste puntos por este comentario.", 'info');
                    }
                }
            } else {
                 showTemporaryToast("Comentario publicado (No ganas puntos por tu contenido).", 'info');
            }
        } catch (error) {
            console.error('💥 Error al insertar o trackear comentario:', error);
            setCommentText(tempComment); // Revertir texto si falla
            showTemporaryToast('Error al enviar el comentario.', 'error');
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
                         showTemporaryToast(`¡Compartido! +${trackingResult.points_earned} puntos.`, 'success');
                        refreshParentData(); 
                    } else if (trackingResult.result === 'already_paid') {
                        showTemporaryToast("Ya ganaste puntos por compartir este contenido hoy.", 'info');
                    }
                }
            } else {
                showTemporaryToast("Compartiendo foto (No ganas puntos por tu contenido).", 'info');
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
                                    <p className="text-xs italic text-muted-foreground">Sé el primero en comentar.</p>
                                ) : (
                                    comments.map((c) => (
                                        <div key={c.id} className="flex items-start space-x-2">
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
                                <Icon name={userHasLiked ? "Heart" : "Heart"} fill={userHasLiked ? "currentColor" : "none"} size={18} className="mr-2" />
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
            
            {/* 🚨 TOAST NOTIFICATION COMPONENT */}
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
        </div>
    );
};

export default PhotoDetailModal;
