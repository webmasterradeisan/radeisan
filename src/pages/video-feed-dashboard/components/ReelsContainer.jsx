// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - VERSIÓN CORREGIDA COMPLETA ✅
// ============================================================================
// ✅ FIX #1: Prevenir conteo duplicado de likes (flag manuallyLikedIds)
// ✅ FIX #2: Prevenir doble click (flag processingLikes)
// ✅ FIX #3: Integración de Modal de Celebración (notifyMissionComplete)
// ✅ FIX #4: Actualización de balance visual SIEMPRE que haya puntos
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { usePoints } from 'contexts/PointsContext';
import { useNotification } from 'contexts/NotificationContext'; 
import * as missionsService from 'services/missionsService';
import Icon from 'components/AppIcon';
import useIsMobile from 'hooks/useIsMobile';
import GiftPointsModal from 'components/GiftPointsModal'; 
import VideoActionButtons from './VideoActionButtons'; 

// ===============================
// COMPONENTE PRINCIPAL: REELS CONTAINER
// ===============================
const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null,
  onLoadMore,     
  hasMore = true, 
  loading = false 
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  // 1. LLAMADA A HOOKS Y CONTEXTOS
  const { 
    missions, 
    updateMissionOptimistic, 
    rollbackMission, 
    notifyMissionComplete,
    updateLocalBalance 
  } = usePoints();

  const { success, error: notifyError, warning, info } = useNotification();

  // 2. DECLARACIÓN DE ESTADOS
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  
  const [dislikedVideos, setDislikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followedCreators, setFollowedCreators] = useState(new Set());
  
  const [enableTransition, setEnableTransition] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  
  const [videoCounters, setVideoCounters] = useState({});
  
  // Estados de Comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  
  const [showGiftModal, setShowGiftModal] = useState(false); 
  const [videoWatchedIds, setVideoWatchedIds] = useState(new Set());
  const [pointsRewardedIds, setPointsRewardedIds] = useState(new Set());
  
  // 🔥 FIX #1: Estado para prevenir conteo duplicado
  const [manuallyLikedIds, setManuallyLikedIds] = useState(new Set());
  
  // 🔥 FIX #2: Estado para prevenir doble click
  const [processingLikes, setProcessingLikes] = useState(new Set());
  
  // Refs
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isInitialMount = useRef(true);
  const hasPlayedInitial = useRef(false);
  const lastNavigationIndex = useRef(-1);

  // Helper de notificación
  const showPointsNotification = (message, videoId, type = 'success') => {
    if (type === 'success') success(message, { duration: 2500 });
    else if (type === 'error' || type === 'restriction') warning(message, { duration: 2500 });
    else info(message, { duration: 2500 });
  };

  // ===============================
  // 🚀 INFINITE SCROLL TRIGGER
  // ===============================
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return;

    // Si estamos viendo uno de los últimos 2 videos, cargamos más
    if (currentIndex >= videos.length - 2) {
        onLoadMore();
    }
  }, [currentIndex, videos.length, onLoadMore, hasMore, loading]);

  // ===============================
  // LÓGICA DE CARGA Y SINCRONIZACIÓN
  // ===============================
  const getInitialReelIndex = useCallback(() => {
    if (!selectedReelId) return 0;
    const index = videos.findIndex(video => video.id === selectedReelId);
    return index < 0 ? 0 : index;
  }, [selectedReelId, videos]);

  useEffect(() => {
    if (videos.length === 0) return;
    const correctIndex = getInitialReelIndex();
    if (isInitialMount.current) {
      setCurrentIndex(correctIndex);
      setEnableTransition(false);
      setTimeout(() => { setEnableTransition(true); isInitialMount.current = false; }, 100);
    } else { 
      if (videos.length <= 12 && currentIndex === 0) setCurrentIndex(correctIndex);
    }
  }, [selectedReelId, videos, getInitialReelIndex]);

  // Cargar datos del usuario
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: p } = await supabase.from('user_profiles').select('id, full_name, avatar_url, username').eq('id', user.id).single();
            setCurrentUser(p || { id: user.id, name: 'Usuario', avatar: null, username: 'usuario' });
            
            const { data: l } = await supabase.from('video_likes').select('video_id').eq('user_id', user.id);
            if (l) setLikedVideos(new Set(l.map(x => x.video_id)));
            
            const { data: s } = await supabase.from('saved_videos').select('video_id').eq('user_id', user.id);
            if (s) setSavedVideos(new Set(s.map(x => x.video_id)));
            
            const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
            if (f) setFollowedCreators(new Set(f.map(x => x.following_id)));
        }
      } catch (e) { console.error(e); }
    };
    loadData();
  }, [videos.length === 0]);

  // Inicializar contadores
  useEffect(() => {
      setVideoCounters(prev => {
          const newCounters = { ...prev };
          let changed = false;
          videos.forEach(v => {
              if (!newCounters[v.id]) {
                  newCounters[v.id] = { 
                      likes: v.likes || v.likes_count || 0, 
                      comments: v.comments || v.comments_count || 0, 
                      views: v.views || v.views_count || 0 
                  };
                  changed = true;
              }
          });
          return changed ? newCounters : prev;
      });
  }, [videos]);

  // 🔥 FIX #1: Contadores Real-Time con protección contra sobrescritura
  useEffect(() => {
    const loadRealTimeCounters = async () => {
      if (videos.length === 0) return;
      const currentVideo = videos[currentIndex];
      if (!currentVideo) return;

      // 🔥 Si acabamos de dar like manualmente, NO sobrescribir el contador
      if (manuallyLikedIds.has(currentVideo.id)) {
        console.log('⏸️ Contador manual activo, omitiendo actualización desde DB');
        return;
      }

      try {
        const { count: likesCount } = await supabase
          .from('video_likes')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', currentVideo.id);
          
        const { count: commentsCount } = await supabase
          .from('video_comments')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', currentVideo.id);
        
        setVideoCounters(prev => ({
          ...prev,
          [currentVideo.id]: { 
            ...prev[currentVideo.id], 
            likes: likesCount || 0, 
            comments: commentsCount || 0 
          }
        }));
      } catch (error) { 
        console.error('Error counters:', error); 
      }
    };
    
    loadRealTimeCounters();
  }, [currentIndex, videos, manuallyLikedIds]);

  // ===============================
  // LÓGICA DEL REPRODUCTOR
  // ===============================
  useEffect(() => {
    if (hasPlayedInitial.current || videos.length === 0) return;
    const attemptPlay = () => {
      const v = videoRefs.current[currentIndex];
      if (!v) { setTimeout(attemptPlay, 100); return; }
      videoRefs.current.forEach((vid, i) => { if (vid && i !== currentIndex) vid.pause(); });
      v.muted = mutedVideos.has(videos[currentIndex]?.id);
      v.play()
        .then(() => { hasPlayedInitial.current = true; lastNavigationIndex.current = currentIndex; })
        .catch(() => { hasPlayedInitial.current = true; });
    };
    attemptPlay();
  }, [currentIndex, videos.length]);

  useEffect(() => {
      const currentVideo = videoRefs.current[currentIndex];
      if (!currentVideo || currentIndex === lastNavigationIndex.current) return;

      videoRefs.current.forEach((video, index) => {
          if (video && index !== currentIndex) video.pause();
      });

      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      currentVideo.play()
        .then(() => { setIsAutoPlaying(true); lastNavigationIndex.current = currentIndex; })
        .catch(err => { console.error('Error play:', err); setIsAutoPlaying(false); });
  }, [currentIndex, mutedVideos, videos]);

  // Monitorear video cargado
  useEffect(() => {
      const current = videoRefs.current[currentIndex];
      if (!current) return;

      const handleLoaded = () => setLoadingVideo(false);
      const handleLoadStart = () => setLoadingVideo(true);

      current.addEventListener('loadeddata', handleLoaded);
      current.addEventListener('loadstart', handleLoadStart);

      return () => {
          current.removeEventListener('loadeddata', handleLoaded);
          current.removeEventListener('loadstart', handleLoadStart);
      };
  }, [currentIndex]);

  // Sistema de puntos por ver video
  useEffect(() => {
      const v = videoRefs.current[currentIndex];
      if (!v || !videos[currentIndex]) return;
      const d = videos[currentIndex];

      const handleTime = async () => {
          if (v.currentTime >= 3 && !videoWatchedIds.has(d.id)) {
              setVideoWatchedIds(p => new Set([...p, d.id]));
              const res = await missionsService.trackWatchVideo(d.id);
              const earned = res?.points_earned || 0;
              if (earned > 0) {
                  if (updateLocalBalance) updateLocalBalance(earned);
                  if (res.result === 'success') {
                      showPointsNotification(`🎉 +${earned} PUNTOS`, d.id, 'success');
                  } else {
                      showPointsNotification(`+${earned} PUNTOS por ver`, d.id, 'success');
                  }
              }
          }
      };
      v.addEventListener('timeupdate', handleTime);
      return () => v.removeEventListener('timeupdate', handleTime);
  }, [currentIndex, videos, videoWatchedIds, updateLocalBalance]);

  const handlePlayPause = useCallback((e) => {
      if (e && e.target.tagName !== 'VIDEO') return;
      const v = videoRefs.current[currentIndex];
      if (v) { if(v.paused) { v.play(); setIsAutoPlaying(true); } else { v.pause(); setIsAutoPlaying(false); } }
  }, [currentIndex]);
  
  const navigateNext = useCallback(() => { if(currentIndex < videos.length-1) { setEnableTransition(true); setCurrentIndex(p=>p+1); setIsAutoPlaying(true); } }, [currentIndex, videos.length]);
  const navigatePrevious = useCallback(() => { if(currentIndex > 0) { setEnableTransition(true); setCurrentIndex(p=>p-1); setIsAutoPlaying(true); } }, [currentIndex]);
  
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => { touchEndY.current = e.touches[0].clientY; };
  const handleTouchEnd = () => { if(Math.abs(touchStartY.current - touchEndY.current) > 50) touchStartY.current > touchEndY.current ? navigateNext() : navigatePrevious(); };

  useEffect(() => {
      const k = (e) => {
          if(e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
          if(e.key==='ArrowDown') navigateNext(); if(e.key==='ArrowUp') navigatePrevious(); if(e.key===' ') {e.preventDefault(); handlePlayPause();}
          if(e.key==='Escape' && showCommentsModal) handleCloseComments();
      };
      window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [navigateNext, navigatePrevious, handlePlayPause, showCommentsModal]);

  // ==========================================================================
  // MANEJADORES DE ACCIONES (LIKES, FOLLOW, ETC.)
  // ==========================================================================

  // 🔥 FUNCIÓN CORREGIDA: handleLike con todos los fixes
  const handleLike = async (videoId, e) => {
    if (e) { 
      e.stopPropagation(); 
      e.preventDefault(); 
    }
    
    // 🔥 FIX #2: Prevenir doble click
    if (processingLikes.has(videoId)) {
      console.log('⚠️ Like ya está procesándose, ignorando click duplicado');
      return;
    }
    
    const snapshot = missions.map(m => ({ ...m })); 
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        navigate('/login'); 
        return; 
      }
      
      const targetVideo = videos.find(v => v.id === videoId);
      if (targetVideo && targetVideo.creator?.id === user.id) {
        showPointsNotification('No puedes dar like a tus propios videos', videoId, 'restriction');
        return;
      }

      const newLiked = new Set(likedVideos);
      const isLiked = newLiked.has(videoId);

      if (isLiked) {
        // ============= UNLIKE =============
        // 🔥 Marcar como procesando
        setProcessingLikes(prev => new Set([...prev, videoId]));
        
        newLiked.delete(videoId);
        setLikedVideos(newLiked);
        
        // Decrementar contador local
        setVideoCounters(p => ({ 
          ...p, 
          [videoId]: { 
            ...p[videoId], 
            likes: Math.max(0, (p[videoId]?.likes || 0) - 1)
          }
        }));
        
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id); 
        
        showPointsNotification('Like removido', videoId, 'info');
        
        // 🔥 Quitar de la lista de likes manuales
        setManuallyLikedIds(prev => {
          const updated = new Set(prev);
          updated.delete(videoId);
          return updated;
        });
        
        // 🔥 Terminar procesamiento
        setProcessingLikes(prev => {
          const updated = new Set(prev);
          updated.delete(videoId);
          return updated;
        });
        
      } else {
        // ============= LIKE =============
        // 🔥 Marcar como procesando ANTES de cualquier operación
        setProcessingLikes(prev => new Set([...prev, videoId]));
        
        newLiked.add(videoId);
        setLikedVideos(newLiked);
        setDislikedVideos(p => { 
          const n = new Set(p); 
          n.delete(videoId); 
          return n; 
        });
        
        // Intentar insertar en la DB
        const { error: likeInsertError } = await supabase
          .from('video_likes')
          .insert({ 
            video_id: videoId, 
            user_id: user.id 
          });
        
        if (likeInsertError) {
          // ❌ ERROR: Revertir estado
          console.error('❌ Error insertando like:', likeInsertError);
          
          if (likeInsertError.message.includes('duplicate')) {
            showPointsNotification('Ya diste like a este video', videoId, 'warning');
          } else {
            showPointsNotification('Error de conexión', videoId, 'error');
          }
          
          newLiked.delete(videoId);
          setLikedVideos(newLiked);
          
          // 🔥 Terminar procesamiento
          setProcessingLikes(prev => {
            const updated = new Set(prev);
            updated.delete(videoId);
            return updated;
          });
          return;
        }
        
        // ✅ LIKE INSERTADO EXITOSAMENTE
        
        // 🔥 FIX #1: INCREMENTAR CONTADOR LOCAL
        setVideoCounters(p => ({ 
          ...p, 
          [videoId]: { 
            ...p[videoId], 
            likes: (p[videoId]?.likes || 0) + 1
          }
        }));
        
        // 🔥 FIX #1: MARCAR COMO "LIKE MANUAL" para prevenir sobrescritura
        setManuallyLikedIds(prev => new Set([...prev, videoId]));
        
        // 🔥 FIX #1: Después de 3 segundos, quitar la marca (permitir sync con DB)
        setTimeout(() => {
          setManuallyLikedIds(prev => {
            const updated = new Set(prev);
            updated.delete(videoId);
            return updated;
          });
        }, 3000);

        // Verificar si ya se recompensó
        if (pointsRewardedIds.has(videoId)) {
          showPointsNotification('Like registrado', videoId, 'info');
          
          // 🔥 Terminar procesamiento
          setProcessingLikes(prev => {
            const updated = new Set(prev);
            updated.delete(videoId);
            return updated;
          });
        } else {
          // ============= TRACK MISIÓN =============
          const res = await missionsService.trackGiveLike('reel', videoId);
          
          // 🔥 FIX #4: ACTUALIZAR BALANCE VISUAL SIEMPRE QUE HAYA PUNTOS
          if (res.points_earned > 0) {
            const earned = Number(res.points_earned);
            if (updateLocalBalance) {
              updateLocalBalance(earned);
            }
          }

          if (res.result === 'success' && res.points_earned > 0) {
            // ✅ MISIÓN COMPLETADA
            const earned = Number(res.points_earned);
            
            if (notifyMissionComplete) {
              notifyMissionComplete(earned);
            } else {
              showPointsNotification(
                `🎉 ¡Misión Cumplida! +${earned} puntos`, 
                videoId, 
                'success'
              );
            }

            setPointsRewardedIds(p => new Set([...p, videoId]));
            updateMissionOptimistic('give_like', 1); 

          } else if (res.result === 'progress_updated' || res.result === 'registered') {
            // ✅ PROGRESO REGISTRADO
            setPointsRewardedIds(p => new Set([...p, videoId]));
            updateMissionOptimistic('give_like', 1); 
            
            // Mostrar mensaje de progreso si viene del servidor
            if (res.message && res.message.includes('/')) {
              showPointsNotification(`✓ ${res.message}`, videoId, 'info');
            } else {
              showPointsNotification('✓ Like registrado', videoId, 'info');
            }

          } else if (res.result === 'already_paid' || res.result === 'already_completed') {
            rollbackMission(snapshot); 
            showPointsNotification('Ya sumaste puntos por esto hoy', videoId, 'warning'); 
            
          } else {
            rollbackMission(snapshot); 
          }
          
          // 🔥 Terminar procesamiento
          setProcessingLikes(prev => {
            const updated = new Set(prev);
            updated.delete(videoId);
            return updated;
          });
        }
      }
      
    } catch (err) { 
      console.error('❌ Error en handleLike:', err);
      rollbackMission(snapshot); 
      showPointsNotification('Error de conexión', videoId, 'error');
      
      // 🔥 Terminar procesamiento incluso en caso de error
      setProcessingLikes(prev => {
        const updated = new Set(prev);
        updated.delete(videoId);
        return updated;
      });
    }
  };

  const handleDislike = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const newD = new Set(dislikedVideos);
      if (newD.has(videoId)) newD.delete(videoId);
      else { newD.add(videoId); if (likedVideos.has(videoId)) handleLike(videoId, e); }
      setDislikedVideos(newD);
  };

  const handleSave = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const { data: { user } } = await supabase.auth.getUser();
      const newS = new Set(savedVideos);
      if (newS.has(videoId)) { newS.delete(videoId); await supabase.from('saved_videos').delete().eq('video_id', videoId).eq('user_id', user.id); }
      else { newS.add(videoId); await supabase.from('saved_videos').insert({ video_id: videoId, user_id: user.id }); }
      setSavedVideos(newS);
  };

  const handleShare = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const url = `${window.location.origin}/video/${videoId}`;
      try {
          await navigator.clipboard.writeText(url);
          showPointsNotification('Enlace copiado al portapapeles', videoId, 'info');
      } catch {
          showPointsNotification('No se pudo copiar el enlace', videoId, 'error');
      }
  };

  const handleMuteToggle = (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const newM = new Set(mutedVideos);
      if (newM.has(videoId)) newM.delete(videoId);
      else newM.add(videoId);
      setMutedVideos(newM);
      const v = videoRefs.current[currentIndex];
      if (v) v.muted = newM.has(videoId);
  };

  const handleFollow = async (creatorId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const { data: { user } } = await supabase.auth.getUser();
      const newF = new Set(followedCreators);
      if (newF.has(creatorId)) { newF.delete(creatorId); await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', creatorId); }
      else { newF.add(creatorId); await supabase.from('follows').insert({ follower_id: user.id, following_id: creatorId }); }
      setFollowedCreators(newF);
  };

  const handleGiftClick = (e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      setShowGiftModal(true);
  };

  // ===============================
  // MANEJADORES DE COMENTARIOS
  // ===============================
  const handleOpenComments = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      setShowCommentsModal(true);
      
      try {
          const { data } = await supabase
              .from('video_comments')
              .select(`*, user:user_profiles(id, full_name, username, avatar_url)`)
              .eq('video_id', videoId)
              .is('parent_id', null)
              .order('created_at', { ascending: false });

          if (data) {
              const commentsWithReplies = await Promise.all(data.map(async comment => {
                  const { data: replies } = await supabase
                      .from('video_comments')
                      .select(`*, user:user_profiles(id, full_name, username, avatar_url)`)
                      .eq('parent_id', comment.id)
                      .order('created_at', { ascending: true });
                  return { ...comment, user: { name: comment.user?.full_name, username: comment.user?.username, avatar: comment.user?.avatar_url }, replies: replies?.map(r => ({ ...r, user: { name: r.user?.full_name, username: r.user?.username, avatar: r.user?.avatar_url } })) || [] };
              }));
              setComments(p => ({ ...p, [videoId]: commentsWithReplies }));
          }
      } catch (error) { console.error('Error comments:', error); }
  };

  const handleCloseComments = () => { setShowCommentsModal(false); setReplyingTo(null); setNewComment(''); };

  const handleAddComment = async (videoId) => {
      if (!newComment.trim()) return;
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const { data, error } = await supabase
              .from('video_comments')
              .insert({ video_id: videoId, user_id: user.id, content: newComment.trim(), parent_id: replyingTo })
              .select(`*, user:user_profiles(id, full_name, username, avatar_url)`)
              .single();

          if (error) throw error;

          const formattedComment = { ...data, user: { name: data.user?.full_name, username: data.user?.username, avatar: data.user?.avatar_url }, replies: [] };

          if (replyingTo) {
              setComments(p => ({
                  ...p,
                  [videoId]: p[videoId]?.map(c => c.id === replyingTo ? { ...c, replies: [...(c.replies || []), formattedComment] } : c) || []
              }));
          } else {
              setComments(p => ({ ...p, [videoId]: [formattedComment, ...(p[videoId] || [])] }));
          }

          setVideoCounters(p => ({ ...p, [videoId]: { ...p[videoId], comments: (p[videoId]?.comments || 0) + 1 } }));
          setNewComment('');
          setReplyingTo(null);
      } catch (error) { console.error('Error adding comment:', error); }
  };

  const handleReply = (commentId, username) => { setReplyingTo(commentId); };
  const handleCancelReply = () => { setReplyingTo(null); };
  const toggleReplies = (commentId) => { setShowReplies(p => ({ ...p, [commentId]: !p[commentId] })); };

  // ===============================
  // HELPERS
  // ===============================
  const formatCount = (count) => {
      if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
      if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
      return count?.toString() || '0';
  };

  const formatTimeAgo = (date) => {
      const now = new Date();
      const then = new Date(date);
      const diff = Math.floor((now - then) / 1000);
      if (diff < 60) return 'Justo ahora';
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
      return `${Math.floor(diff / 604800)}sem`;
  };

  const currentVideo = videos[currentIndex];

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={containerRef} className={`flex ${isDesktop ? 'flex-row' : 'flex-col'} w-full h-full items-center justify-center`}>
        {/* CONTENEDOR DE VIDEOS */}
        <div className={`relative ${isDesktop ? 'w-[45%] h-[80vh]' : 'w-full h-full'} bg-black flex flex-col`}>
          <div className="relative flex-1 overflow-hidden">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className={`absolute inset-0 transition-opacity ${enableTransition ? 'duration-300' : 'duration-0'} ${
                  index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <video
                  ref={el => videoRefs.current[index] = el}
                  className="w-full h-full object-contain"
                  src={video.video_url}
                  loop
                  playsInline
                  onClick={handlePlayPause}
                />
                
                {/* Overlay info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none">
                  <div className="flex items-center space-x-3 mb-3 pointer-events-auto">
                    <Link to={`/profile/${video.creator?.id}`} className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                        {video.creator?.avatar_url ? (
                          <img src={video.creator.avatar_url} alt={video.creator.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                            {video.creator?.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${video.creator?.id}`} className="font-semibold text-white hover:underline">
                        {video.creator?.full_name || 'Usuario'}
                      </Link>
                      <p className="text-sm text-gray-300">@{video.creator?.username || 'usuario'}</p>
                    </div>
                  </div>
                  {video.description && (
                    <p className="text-white text-sm mb-2 line-clamp-2">{video.description}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Indicador de carga */}
            {loadingVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* Indicador de carga infinita */}
            {loading && (
                <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="text-center">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p>Cargando más reels...</p>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        {currentVideo && (
            <VideoActionButtons 
                video={currentVideo}
                isMobile={isMobile}
                currentUser={currentUser}
                isLiked={likedVideos.has(currentVideo.id)}
                isDisliked={dislikedVideos.has(currentVideo.id)}
                isSaved={savedVideos.has(currentVideo.id)}
                isMuted={mutedVideos.has(currentVideo.id)}
                isFollowed={followedCreators.has(currentVideo.creator?.id)}
                likesCount={formatCount(videoCounters[currentVideo.id]?.likes || 0)}
                commentsCount={formatCount(videoCounters[currentVideo.id]?.comments || 0)}
                onLike={handleLike}
                onDislike={handleDislike}
                onSave={handleSave}
                onShare={handleShare}
                onMute={handleMuteToggle}
                onComment={handleOpenComments}
                onFollow={handleFollow}
                onGift={handleGiftClick}
            />
        )}

        {/* MODAL DE COMENTARIOS - DESKTOP */}
        {showCommentsModal && currentVideo && isDesktop && (
          <div className="w-[45%] h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col ml-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comentarios ({formatCount(videoCounters[currentVideo.id]?.comments)})</h3>
              <button onClick={handleCloseComments} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Icon name="X" size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments[currentVideo.id]?.length > 0 ? (
                comments[currentVideo.id].map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                        {comment.user?.avatar ? <img src={comment.user.avatar} alt="Avatar" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-xs">{comment.user?.name?.charAt(0)}</div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2"><span className="font-semibold text-sm">{comment.user?.name}</span><span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span></div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <button onClick={() => handleReply(comment.id, comment.user?.username)} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Responder</button>
                        
                        {comment.replies?.length > 0 && (
                          <div className="mt-2">
                            <button onClick={() => toggleReplies(comment.id)} className="text-xs text-blue-600 hover:text-blue-700">
                              {showReplies[comment.id] ? 'Ocultar respuestas' : `Ver ${comment.replies.length} respuestas`}
                            </button>
                            {showReplies[comment.id] && (
                              <div className="space-y-2 pl-4 border-l-2 border-gray-200 mt-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                       {reply.user?.avatar ? <img src={reply.user.avatar} alt="Av" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-purple-400 flex items-center justify-center text-white text-[10px]">{reply.user?.name?.charAt(0)}</div>}
                                    </div>
                                    <div className="flex-1"><span className="font-semibold text-xs">{reply.user?.name}</span><p className="text-xs">{reply.content}</p></div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500"><Icon name="MessageCircle" size={48} className="mx-auto mb-2 text-gray-300"/><p>No hay comentarios aún. ¡Sé el primero!</p></div>
              )}
            </div>

            <div className="p-4 border-t">
              {replyingTo && (<div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded"><span className="text-sm text-blue-700">Respondiendo a @{videos.find(v=>v.id===currentVideo.id)?.creator?.username}...</span><button onClick={handleCancelReply} className="text-blue-600"><Icon name="X" size={16} /></button></div>)}
              <div className="flex space-x-2">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500" rows={1} />
                <button onClick={() => handleAddComment(currentVideo.id)} disabled={!newComment.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"><Icon name="Send" size={20} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* MODAL DE COMENTARIOS - MOBILE */}
      {showCommentsModal && currentVideo && isMobile && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={handleCloseComments}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comentarios ({formatCount(videoCounters[currentVideo.id]?.comments)})</h3>
              <button onClick={handleCloseComments} className="p-2 hover:bg-gray-100 rounded-full"><Icon name="X" size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {comments[currentVideo.id]?.length > 0 ? comments[currentVideo.id].map(comment => (
                  <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                             {comment.user?.avatar ? <img src={comment.user.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white text-xs">{comment.user?.name?.charAt(0)}</div>}
                          </div>
                          <div className="flex-1">
                              <div className="flex items-center gap-2"><span className="font-bold text-sm">{comment.user?.name}</span><span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span></div>
                              <p className="text-sm">{comment.content}</p>
                              <button onClick={()=>handleReply(comment.id, comment.user?.username)} className="text-xs text-gray-500 mt-1">Responder</button>
                              
                              {comment.replies?.length > 0 && (
                                <div className="mt-2 pl-4 border-l-2">
                                   <button onClick={()=>toggleReplies(comment.id)} className="text-xs text-blue-500">Ver respuestas</button>
                                   {showReplies[comment.id] && comment.replies.map(r => (
                                       <div key={r.id} className="flex gap-2 mt-2"><span className="font-bold text-xs">{r.user?.name}</span><p className="text-xs">{r.content}</p></div>
                                   ))}
                                </div>
                              )}
                          </div>
                      </div>
                  </div>
               )) : <div className="text-center text-gray-500 py-10">No hay comentarios aún</div>}
            </div>

            <div className="p-4 border-t">
              {replyingTo && <div className="text-xs text-blue-500 mb-1 flex justify-between"><span>Respondiendo...</span><button onClick={handleCancelReply}>X</button></div>}
              <div className="flex gap-2">
                  <input value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Comenta..." className="flex-1 border rounded px-3 py-2"/>
                  <button onClick={()=>handleAddComment(currentVideo.id)} className="bg-blue-600 text-white p-2 rounded"><Icon name="Send" size={18}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Regalo */}
      {showGiftModal && currentVideo && (
        <GiftPointsModal isOpen={showGiftModal} onClose={()=>setShowGiftModal(false)} receiverId={currentVideo.creator?.id} contentId={currentVideo.id} contentType="reel" onSuccess={()=>{}} />
      )}
    </div>
  );
};

export default ReelsContainer;
