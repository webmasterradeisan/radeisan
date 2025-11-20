// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - VERSION FINAL BLINDADA
// ✅ CORREGIDO: Anti-farming "Optimista" (Bloqueo inmediato al primer click)
// ✅ FUNCIONAL: Navegación (Teclado, Rueda, Touch)
// ✅ FUNCIONAL: Bloqueo de Auto-Like
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

// ===============================
// COMPONENTE PRINCIPAL: REELS CONTAINER
// ===============================
const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null,
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  // ✅ INTEGRACIÓN CON SISTEMA DE PUNTOS
  const { addPoints, missions, updateMissionOptimistic, rollbackMission, refreshPoints } = usePoints();
  
  // ✅ SISTEMA DE NOTIFICACIONES GLOBALES
  const { success, error, warning, info } = useNotification();

  // Estados principales
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [dislikedVideos, setDislikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followedCreators, setFollowedCreators] = useState(new Set());
  const [enableTransition, setEnableTransition] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  
  // Estados de contadores en tiempo real (optimistic updates)
  const [videoCounters, setVideoCounters] = useState({});
  
  // Estados de comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  
  // Estado para el Modal de Regalo
  const [showGiftModal, setShowGiftModal] = useState(false); 

  // Estados de tracking de misiones y acciones realizadas
  const [videoWatchedIds, setVideoWatchedIds] = useState(new Set());
  // ✅ ANTI-FARMING: Set para recordar qué videos ya procesaron puntos en esta sesión
  const [pointsRewardedIds, setPointsRewardedIds] = useState(new Set());
  const [actionsPerformed, setActionsPerformed] = useState({
    saves: new Set(),
    follows: new Set(),
    comments: new Set(),
    shares: new Set()
  });

  // Refs
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isInitialMount = useRef(true);
  const hasPlayedInitial = useRef(false);
  const lastNavigationIndex = useRef(-1);

  // ✅ SISTEMA GLOBAL: Función para mostrar notificaciones
  const showPointsNotification = (message, videoId, type = 'success') => {
    console.log('🔔 [NOTIFICACIÓN GLOBAL]:', { message, videoId, type });
    if (type === 'success') {
      success(message, { duration: 2500 });
    } else if (type === 'error' || type === 'restriction') {
      warning(message, { duration: 2500 });
    } else if (type === 'info') {
      info(message, { duration: 2500 });
    }
  };

  // ===============================
  // 1. DEFINICIÓN DE FUNCIONES DE NAVEGACIÓN
  // ===============================
  
  const navigateNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev + 1);
      setIsAutoPlaying(true);
    }
  }, [currentIndex, videos.length]);

  const navigatePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev - 1);
      setIsAutoPlaying(true);
    }
  }, [currentIndex]);

  const handlePlayPause = useCallback((e) => {
    if (e && e.target.tagName !== 'VIDEO') return;
    
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      if (currentVideo.paused) {
        currentVideo.play();
        setIsAutoPlaying(true);
      } else {
        currentVideo.pause();
        setIsAutoPlaying(false);
      }
    }
  }, [currentIndex]);

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => { touchEndY.current = e.touches[0].clientY; };
  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) navigateNext();
      else navigatePrevious();
    }
  };

  // ===============================
  // 2. EVENT LISTENERS (Scroll, Teclado)
  // ===============================

  // Mouse Wheel Navigation (Desktop)
  useEffect(() => {
    if (!isDesktop) return;

    const handleWheel = (e) => {
      e.preventDefault();
      clearTimeout(handleWheel.timeout);
      handleWheel.timeout = setTimeout(() => {
        if (e.deltaY > 0 && currentIndex < videos.length - 1) {
          setEnableTransition(true);
          setCurrentIndex(prev => prev + 1);
          setIsAutoPlaying(true);
        } else if (e.deltaY < 0 && currentIndex > 0) {
          setEnableTransition(true);
          setCurrentIndex(prev => prev - 1);
          setIsAutoPlaying(true);
        }
      }, 150);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [isDesktop, currentIndex, videos.length]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowDown') navigateNext();
      if (e.key === 'ArrowUp') navigatePrevious();
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      }
      if (e.key === 'Escape' && showCommentsModal) {
        handleCloseComments();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrevious, handlePlayPause, showCommentsModal]);

  // ===============================
  // 3. LÓGICA DE INICIALIZACIÓN Y DATOS
  // ===============================

  const getInitialReelIndex = useCallback(() => {
    if (!selectedReelId) return 0;
    const index = videos.findIndex(video => video.id === selectedReelId);
    if (index < 0) return 0;
    return index;
  }, [selectedReelId, videos]);

  useEffect(() => {
    if (videos.length === 0) return;
    const correctIndex = getInitialReelIndex();
    if (isInitialMount.current) {
      setCurrentIndex(correctIndex);
      setEnableTransition(false);
      setTimeout(() => {
        setEnableTransition(true);
        isInitialMount.current = false;
      }, 100);
    } else {
      setCurrentIndex(correctIndex);
    }
  }, [selectedReelId, videos, getInitialReelIndex]);

  useEffect(() => {
    const loadCurrentUserAndActions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, full_name, avatar_url, username')
            .eq('id', user.id)
            .single();
          
          setCurrentUser(profile || { id: user.id, name: 'Usuario', avatar: null, username: 'usuario' });

          const { data: likesData } = await supabase.from('video_likes').select('video_id').eq('user_id', user.id);
          if (likesData) setLikedVideos(new Set(likesData.map(l => l.video_id)));

          const { data: savedData } = await supabase.from('saved_videos').select('video_id').eq('user_id', user.id);
          if (savedData) setSavedVideos(new Set(savedData.map(s => s.video_id)));

          const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
          if (followsData) setFollowedCreators(new Set(followsData.map(f => f.following_id)));
        }
      } catch (error) {
        console.error('Error cargando usuario:', error);
      }
    };
    loadCurrentUserAndActions();
  }, [videos]);

  useEffect(() => {
    const initialCounters = {};
    videos.forEach(video => {
      initialCounters[video.id] = {
        likes: video.likes || video.likes_count || 0,
        comments: video.comments || video.comments_count || 0,
        views: video.views || video.views_count || 0
      };
    });
    setVideoCounters(initialCounters);
  }, [videos]);

  useEffect(() => {
    const loadRealTimeCounters = async () => {
      if (videos.length === 0) return;
      const currentVideo = videos[currentIndex];
      if (!currentVideo) return;

      try {
        const { count: likesCount } = await supabase.from('video_likes').select('*', { count: 'exact', head: true }).eq('video_id', currentVideo.id);
        const { count: commentsCount } = await supabase.from('video_comments').select('*', { count: 'exact', head: true }).eq('video_id', currentVideo.id);

        setVideoCounters(prev => ({
          ...prev,
          [currentVideo.id]: {
            ...prev[currentVideo.id],
            likes: likesCount || 0,
            comments: commentsCount || 0
          }
        }));
      } catch (error) { console.error('Error contadores:', error); }
    };
    loadRealTimeCounters();
  }, [currentIndex, videos]);

  // ===============================
  // 4. LÓGICA DE REPRODUCCIÓN Y TRACKING
  // ===============================

  useEffect(() => {
    if (hasPlayedInitial.current || videos.length === 0) return;

    const attemptPlay = () => {
      const currentVideo = videoRefs.current[currentIndex];
      if (!currentVideo) { setTimeout(attemptPlay, 100); return; }
      
      videoRefs.current.forEach((video, index) => { if (video && index !== currentIndex) video.pause(); });
      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
            hasPlayedInitial.current = true;
            lastNavigationIndex.current = currentIndex;
        }).catch(() => {
            currentVideo.muted = true;
            currentVideo.play().then(() => {
                hasPlayedInitial.current = true;
                lastNavigationIndex.current = currentIndex;
            });
        });
      }
    };
    setTimeout(attemptPlay, 250);
  }, [videos, currentIndex, mutedVideos]);

  useEffect(() => {
    if (videos.length === 0) return;
    const initialIndex = getInitialReelIndex();
    if (!hasPlayedInitial.current && currentIndex === initialIndex) return;

    const currentVideo = videoRefs.current[currentIndex];
    const isNavigationChange = lastNavigationIndex.current !== currentIndex;

    if (currentVideo) {
      videoRefs.current.forEach((video, index) => { if (video && index !== currentIndex) video.pause(); });
      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      if (isNavigationChange) {
        currentVideo.currentTime = 0;
        lastNavigationIndex.current = currentIndex;
        currentVideo.play().then(() => setIsAutoPlaying(true)).catch(() => {
            currentVideo.muted = true;
            currentVideo.play();
        });
      } else if (isAutoPlaying) {
        currentVideo.play().catch(() => {});
      } else {
        currentVideo.pause();
      }
    }
  }, [currentIndex, isAutoPlaying, videos, mutedVideos, getInitialReelIndex]);

  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentVideoData = videos[currentIndex];
    if (!currentVideo || !currentVideoData) return;

    const handleLoadStart = () => setLoadingVideo(true);
    const handleCanPlay = () => setLoadingVideo(false);
    const handleLoadedData = () => setLoadingVideo(false);
    let viewCounted = false;

    const handleTimeUpdate = async () => {
      const watchedPercent = (currentVideo.currentTime / currentVideo.duration) * 100;
      
      if (watchedPercent > 30 && !viewCounted && !videoWatchedIds.has(currentVideoData.id)) {
        viewCounted = true;
        setVideoCounters(prev => ({
          ...prev,
          [currentVideoData.id]: {
            ...prev[currentVideoData.id],
            views: (prev[currentVideoData.id]?.views || 0) + 1
          }
        }));
      }
      
      if (watchedPercent > 80 && !videoWatchedIds.has(currentVideoData.id)) {
        setVideoWatchedIds(prev => new Set([...prev, currentVideoData.id]));
        missionsService.trackWatchVideo('reel', currentVideoData.id, currentVideo.currentTime)
          .then(result => {
            if (result.result === 'success' && result.points_earned > 0) {
              addPoints(result.points_earned, result.message, 'free');
              showPointsNotification(`+${result.points_earned} PUNTOS por ver reel 🎉`, currentVideoData.id, 'success');
            } else if (result.result === 'already_completed') {
              showPointsNotification('Ya completaste la misión de ver reels hoy.', currentVideoData.id, 'restriction');
            }
          })
          .catch(console.error);
      }
    };

    currentVideo.addEventListener('loadstart', handleLoadStart);
    currentVideo.addEventListener('canplay', handleCanPlay);
    currentVideo.addEventListener('loadeddata', handleLoadedData);
    currentVideo.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      currentVideo.removeEventListener('loadstart', handleLoadStart);
      currentVideo.removeEventListener('canplay', handleCanPlay);
      currentVideo.removeEventListener('loadeddata', handleLoadedData);
      currentVideo.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [currentIndex, videos, videoWatchedIds, addPoints]);

  // ===============================
  // 5. MANEJADORES DE ACCIONES (Likes, Follows, etc.)
  // ===============================
  const handleLike = async (videoId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      // 🛑 BLOQUEO DE AUTO-LIKE
      const targetVideo = videos.find(v => v.id === videoId);
      if (targetVideo && targetVideo.creator?.id === user.id) {
          showPointsNotification('No puedes dar like a tus propios videos', videoId, 'restriction');
          return;
      }

      const newLikedVideos = new Set(likedVideos);
      const newDislikedVideos = new Set(dislikedVideos);
      const isCurrentlyLiked = newLikedVideos.has(videoId);
      
      if (isCurrentlyLiked) {
        // ==============================
        // QUITAR LIKE (Unlike)
        // ==============================
        newLikedVideos.delete(videoId);
        setVideoCounters(prev => ({
          ...prev,
          [videoId]: { ...prev[videoId], likes: Math.max(0, (prev[videoId]?.likes || 0) - 1) }
        }));
        
        await supabase.from('video_likes').delete().eq('video_id', videoId).eq('user_id', user.id);
        showPointsNotification('Like removido', videoId, 'info');
      } else {
        // ==============================
        // DAR LIKE
        // ==============================
        newLikedVideos.add(videoId);
        if (newDislikedVideos.has(videoId)) newDislikedVideos.delete(videoId);
        
        setVideoCounters(prev => ({
          ...prev,
          [videoId]: { ...prev[videoId], likes: (prev[videoId]?.likes || 0) + 1 }
        }));

        // Insertar Like en BD
        const { error: likeError } = await supabase.from('video_likes').insert({ video_id: videoId, user_id: user.id });
        
        if (likeError && likeError.code !== '23505') {
            showPointsNotification('Error al dar like', videoId, 'error');
            setVideoCounters(prev => ({ ...prev, [videoId]: { ...prev[videoId], likes: Math.max(0, (prev[videoId]?.likes || 0) - 1) } }));
            return;
        }

        // 🛑🛑🛑 ANTI-FARMING BLINDADO (Lógica corregida) 🛑🛑🛑
        // Verificar si YA fue recompensado en esta sesión
        const alreadyRewarded = pointsRewardedIds.has(videoId);

        if (!alreadyRewarded && !likeError) {
            // 1. Marcamos INMEDIATAMENTE (antes de la API) para evitar doble click/farming
            setPointsRewardedIds(prev => new Set([...prev, videoId]));

            const missionSnapshot = [...missions];
            updateMissionOptimistic('give_like', 1);
            
            try {
              const missionResult = await missionsService.trackGiveLike('reel', videoId);
              
              // Si el resultado es exitoso, mostramos los puntos
              if (missionResult.result === 'success' && missionResult.points_earned > 0) { 
                await addPoints(missionResult.points_earned, missionResult.message, 'free'); 
                await refreshPoints();
                showPointsNotification(`🎉 Misión Completa: +${missionResult.points_earned} puntos`, videoId, 'success');
              } else if (missionResult.result === 'already_completed') {
                showPointsNotification('✓ Like registrado (Misión ya completada hoy)', videoId, 'info');
                rollbackMission(missionSnapshot);
              } else {
                showPointsNotification('✓ Like registrado', videoId, 'info');
                await refreshPoints();
              }
            } catch (pointsError) {
              console.error('❌ Error puntos:', pointsError);
              rollbackMission(missionSnapshot);
              // NOTA: No quitamos el ID del Set. Si falló, falló. Evitamos reintentos infinitos en la misma sesión.
            }
        }
      }
      setLikedVideos(newLikedVideos);
      setDislikedVideos(newDislikedVideos);
    } catch (error) {
      console.error('❌ Error like:', error);
    }
  };

  const handleDislike = async (videoId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const newDislikedVideos = new Set(dislikedVideos);
      const newLikedVideos = new Set(likedVideos);
      
      if (newDislikedVideos.has(videoId)) {
        newDislikedVideos.delete(videoId);
      } else {
        newDislikedVideos.add(videoId);
        if (newLikedVideos.has(videoId)) await handleLike(videoId, e);
      }
      setDislikedVideos(newDislikedVideos);
    } catch (error) { console.error('Error dislike:', error); }
  };

  const handleSave = async (videoId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const newSavedVideos = new Set(savedVideos);
      if (newSavedVideos.has(videoId)) {
        newSavedVideos.delete(videoId);
        await supabase.from('saved_videos').delete().eq('video_id', videoId).eq('user_id', user.id);
      } else {
        newSavedVideos.add(videoId);
        await supabase.from('saved_videos').insert({ video_id: videoId, user_id: user.id });
      }
      setSavedVideos(newSavedVideos);
    } catch (error) { console.error('Error saving:', error); }
  };
  
  const handleGiftClick = (video, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      if (!currentUser) { navigate('/login'); return; }
      if (currentUser.id === video.creator?.id) {
          showPointsNotification('No puedes regalar puntos a tu propio reel.', video.id, 'restriction');
          return;
      }
      setShowGiftModal(true);
  };
  
  const handleGiftSuccess = (amount) => {
      const currentVideo = videos[currentIndex];
      showPointsNotification(`¡Regalo enviado! ${amount} puntos para el creador.`, currentVideo.id, 'success');
  };

  const handleFollow = async (creatorId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      if (user.id === creatorId) return;

      const newFollowedCreators = new Set(followedCreators);
      const videoId = videos[currentIndex]?.id;

      if (newFollowedCreators.has(creatorId)) {
        newFollowedCreators.delete(creatorId);
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', creatorId);
        showPointsNotification('Dejaste de seguir a este creador', videoId, 'info');
      } else {
        newFollowedCreators.add(creatorId);
        await supabase.from('follows').insert({ follower_id: user.id, following_id: creatorId });
        try {
          const result = await missionsService.trackFollowUser(creatorId);
          if (result.result === 'success' && result.points_earned > 0) {
            await addPoints(result.points_earned, result.message, 'free');
            showPointsNotification(`🎉 +${result.points_earned} puntos por seguir`, videoId, 'success');
          } else {
            showPointsNotification('✓ Ahora sigues a este creador', videoId, 'info');
          }
        } catch (pointsError) { console.error('Error puntos follow:', pointsError); }
      }
      setFollowedCreators(newFollowedCreators);
    } catch (error) {
      showPointsNotification('Error al seguir/dejar de seguir', videos[currentIndex]?.id, 'error');
    }
  };

  const handleShare = async (video, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const videoId = video.id;
      const shareMethod = navigator.share ? 'native' : 'clipboard';
      const hasSharedBefore = actionsPerformed.shares.has(videoId);

      if (navigator.share) {
        await navigator.share({ title: video.title || 'Reel', text: video.description || '', url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showPointsNotification('📋 Enlace copiado', videoId, 'info');
      }

      try {
        const result = await missionsService.trackShareContent('reel', videoId, 1, { platform: shareMethod });
        if (result.result === 'success' && result.points_earned > 0) {
          await addPoints(result.points_earned, result.message, 'free');
          showPointsNotification(`🎉 +${result.points_earned} puntos por compartir`, videoId, 'success');
        } else if (!hasSharedBefore) {
          showPointsNotification('✓ Video compartido', videoId, 'info');
        }
        setActionsPerformed(prev => ({ ...prev, shares: new Set([...prev.shares, videoId]) }));
      } catch (pointsError) { console.error('Error share points:', pointsError); }
    } catch (error) { console.error('Error share:', error); }
  };

  const handleMuteToggle = (videoId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      const newMutedVideos = new Set(mutedVideos);
      if (newMutedVideos.has(videoId)) {
        newMutedVideos.delete(videoId);
        currentVideo.muted = false;
      } else {
        newMutedVideos.add(videoId);
        currentVideo.muted = true;
      }
      setMutedVideos(newMutedVideos);
    }
  };

  // ===============================
  // 6. SISTEMA DE COMENTARIOS
  // ===============================
  const loadComments = async (videoId, retryCount = 0) => {
    try {
      let { data, error } = await supabase
        .from('video_comments')
        .select('id, video_id, user_id, content, parent_comment_id, created_at, updated_at')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) {
        if (retryCount < 2) { await new Promise(resolve => setTimeout(resolve, 1000)); return loadComments(videoId, retryCount + 1); }
        throw error;
      }

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(comment => comment.user_id))];
        const { data: usersData } = await supabase.from('user_profiles').select('id, full_name, avatar_url, username').in('id', userIds);

        if (usersData) {
          const usersMap = {};
          usersData.forEach(user => { usersMap[user.id] = user; });
          data = data.map(comment => {
            const userProfile = usersMap[comment.user_id];
            return {
              ...comment,
              user: userProfile ? {
                id: userProfile.id,
                name: userProfile.full_name || userProfile.username || 'Usuario',
                avatar: userProfile.avatar_url,
                username: userProfile.username || userProfile.full_name || 'usuario'
              } : { id: comment.user_id, name: 'Usuario', avatar: null, username: 'usuario' },
              replies: []
            };
          });

          const topLevelComments = [];
          const repliesMap = {};
          data.forEach(comment => {
            if (comment.parent_comment_id) {
              if (!repliesMap[comment.parent_comment_id]) repliesMap[comment.parent_comment_id] = [];
              repliesMap[comment.parent_comment_id].push(comment);
            } else {
              topLevelComments.push(comment);
            }
          });
          topLevelComments.forEach(comment => {
            comment.replies = repliesMap[comment.id] || [];
            comment.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
          data = topLevelComments;
        }
      }
      setComments(prev => ({ ...prev, [videoId]: data || [] }));
    } catch (error) { setComments(prev => ({ ...prev, [videoId]: [] })); }
  };

  const handleOpenComments = async (videoId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setShowCommentsModal(true);
    setReplyingTo(null);
    setNewComment('');
    await loadComments(videoId);
  };

  const handleCloseComments = () => {
    setShowCommentsModal(false);
    setReplyingTo(null);
    setNewComment('');
  };

  const handleAddComment = async (videoId) => {
    if (!newComment.trim()) { showPointsNotification('⚠️ Escribe algo antes de comentar', videoId, 'warning'); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const commentData = { video_id: videoId, user_id: user.id, content: newComment.trim(), parent_comment_id: replyingTo };
      const { error } = await supabase.from('video_comments').insert(commentData).single();
      if (error) throw error;

      if (!replyingTo) {
        try {
          const result = await missionsService.trackComment('reel', videoId);
          if (result.result === 'success' && result.points_earned > 0) {
            await addPoints(result.points_earned, result.message, 'free');
            showPointsNotification(`🎉 +${result.points_earned} puntos por comentar`, videoId, 'success');
          } else {
            showPointsNotification('✓ Comentario agregado', videoId, 'info');
          }
          setVideoCounters(prev => ({ ...prev, [videoId]: { ...prev[videoId], comments: (prev[videoId]?.comments || 0) + 1 } }));
        } catch (err) { console.error(err); }
      } else {
        showPointsNotification('✓ Respuesta agregada', videoId, 'info');
      }

      setNewComment('');
      setReplyingTo(null);
      await loadComments(videoId);
    } catch (error) { showPointsNotification('Error al comentar', videoId, 'error'); }
  };

  const handleReply = (commentId, username) => {
    setReplyingTo(commentId);
    setNewComment(`@${username || 'Usuario'} `);
    setTimeout(() => {
      const input = document.querySelector('textarea[placeholder*="comentario"]');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    }, 100);
  };

  const handleCancelReply = () => { setReplyingTo(null); setNewComment(''); };
  const toggleReplies = (commentId) => { setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] })); };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now - commentDate) / 1000);
    if (diffInSeconds < 60) return 'Ahora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}sem`;
  };

  const getVideoCounter = (videoId, type) => videoCounters[videoId]?.[type] || 0;

  // ===============================
  // 7. RENDERIZADO (JSX)
  // ===============================
  const currentVideo = videos[currentIndex];

  if (videos.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-900 text-white">
        <Icon name="Video" size={48} className="text-pink-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">No hay videos disponibles</h2>
        <button onClick={onLoadMore} className="mt-4 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded transition duration-300">Recargar</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      <div className="flex h-full w-full items-center justify-center">
        <div className={`relative overflow-hidden flex-shrink-0 ${isDesktop ? showCommentsModal ? 'w-[55%]' : 'w-full max-w-[500px]' : 'w-full'} ${isDesktop ? 'h-[80vh] rounded-xl shadow-2xl' : 'h-full'}`}>
          <div
            ref={containerRef}
            className={`w-full h-full relative transition-transform duration-500`}
            style={{ 
              transform: `translateY(${-currentIndex * 100}%)`,
              transition: enableTransition ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
            }}
            onClick={handlePlayPause}
            onTouchStart={isMobile ? handleTouchStart : undefined}
            onTouchMove={isMobile ? handleTouchMove : undefined}
            onTouchEnd={isMobile ? handleTouchEnd : undefined}
          >
            {videos.map((video, index) => (
              <div key={video.id} className="w-full h-full flex-shrink-0 relative bg-black snap-start" style={{ height: '100%' }}>
                <video
                  ref={el => videoRefs.current[index] = el}
                  className="absolute w-full h-full object-cover"
                  src={video.video_url || video.videoUrl}
                  loop playsInline preload="auto"
                  onLoadedData={() => setLoadingVideo(false)}
                  onError={(e) => console.error('Error de video:', e)}
                />
                {loadingVideo && index === currentIndex && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {isMobile && (
                  <div className="absolute bottom-8 left-4 right-24 z-10" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                      <div className="flex items-center space-x-2 mb-3">
                        <Link to={`/profile/${video.creator?.id}`} className="font-bold hover:underline text-base text-white drop-shadow-lg" onClick={(e) => e.stopPropagation()}>
                          @{video.creator?.username || video.creator?.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}
                        </Link>
                        {currentUser?.id !== video.creator?.id && (
                          <button
                            onClick={(e) => handleFollow(video.creator?.id, e)}
                            className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${followedCreators.has(video.creator?.id) ? 'bg-white/20 text-white border border-white/30' : 'bg-pink-600 text-white hover:bg-pink-700'}`}
                          >
                            {followedCreators.has(video.creator?.id) ? 'Siguiendo' : 'Seguir'}
                          </button>
                        )}
                        <span className="text-gray-200 text-sm">•</span>
                        <span className="text-gray-200 text-sm">{video.timeAgo || 'Reciente'}</span>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm leading-relaxed line-clamp-3 text-white drop-shadow-lg">{video.description || video.title}</p>
                      </div>
                      {video.tags && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {video.tags.slice(0, 3).map((tag, i) => <span key={i} className="text-sm font-semibold text-white drop-shadow-lg">#{tag}</span>)}
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-sm">
                        <Icon name="Music" size={14} color="white" />
                        <span className="truncate text-white drop-shadow-lg">{video.audioTitle || `Sonido original - ${video.creator?.name || 'Creador'}`}</span>
                      </div>
                    </div>
                  </div>
                )}
                {isDesktop && (
                  <div className="absolute bottom-4 left-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <Link to={`/profile/${video.creator?.id}`} className="font-bold hover:underline text-base text-white drop-shadow-lg" onClick={(e) => e.stopPropagation()}>
                          @{video.creator?.username || video.creator?.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}
                        </Link>
                        {currentUser?.id !== video.creator?.id && (
                          <button
                            onClick={(e) => handleFollow(video.creator?.id, e)}
                            className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${followedCreators.has(video.creator?.id) ? 'bg-white/20 text-white border border-white/30' : 'bg-pink-600 text-white hover:bg-pink-700'}`}
                          >
                            {followedCreators.has(video.creator?.id) ? 'Siguiendo' : 'Seguir'}
                          </button>
                        )}
                        <span className="text-gray-200 text-sm">•</span>
                        <span className="text-gray-200 text-sm">{video.timeAgo || 'Reciente'}</span>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm leading-relaxed line-clamp-2 text-white drop-shadow-lg">{video.description || video.title}</p>
                      </div>
                      {video.tags && (
                        <div className="flex flex-wrap gap-2">
                          {video.tags.slice(0, 3).map((tag, i) => <span key={i} className="text-xs font-semibold text-white drop-shadow-lg">#{tag}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!isAutoPlaying && index === currentIndex && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Icon name="Play" size={32} color="white" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                  <div className="h-full bg-red-500 transition-all" style={{ width: index === currentIndex ? '100%' : '0%', transitionDuration: index === currentIndex ? `${video.duration || 30}s` : '0s', transitionTimingFunction: 'linear' }} />
                </div>
              </div>
            ))}
            {(loading || (currentIndex >= videos.length - 2 && hasMore)) && (
              <div className="w-full h-full flex-shrink-0 relative bg-black/80 flex flex-col items-center justify-center text-white p-8">
                <Icon name="Loader" size={48} className="animate-spin text-pink-500 mb-4" />
                <p className="text-lg font-semibold">Cargando más videos...</p>
              </div>
            )}
          </div>
        </div>

        {/* BOTONES DE ACCIÓN - MOBILE */}
        {currentVideo && isMobile && (
          <div className="absolute bottom-20 right-4 flex flex-col items-center space-y-5 z-10" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div className="relative">
              <Link to={`/profile/${currentVideo.creator?.id}`} onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                  {currentVideo.creator?.avatar ? <img src={currentVideo.creator.avatar} alt={currentVideo.creator.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><span className="text-white font-bold text-lg">{currentVideo.creator?.name?.charAt(0) || 'U'}</span></div>}
                </div>
              </Link>
              {!followedCreators.has(currentVideo.creator?.id) && currentUser?.id !== currentVideo.creator?.id && (
                <button onClick={(e) => handleFollow(currentVideo.creator?.id, e)} className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg">
                  <Icon name="Plus" size={16} color="white" />
                </button>
              )}
            </div>

            <div className="relative flex flex-col items-center space-y-1">
              <button onClick={(e) => handleLike(currentVideo.id, e)} className="flex flex-col items-center space-y-1">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${likedVideos.has(currentVideo.id) ? 'text-red-500' : 'text-white hover:scale-110'}`}>
                  <Icon name="ThumbsUp" size={26} className={likedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                </div>
                <span className="font-semibold text-xs text-white">{formatCount(getVideoCounter(currentVideo.id, 'likes'))}</span>
              </button>
            </div>

            <button onClick={(e) => handleDislike(currentVideo.id, e)} className="flex flex-col items-center space-y-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${dislikedVideos.has(currentVideo.id) ? 'text-gray-400' : 'text-white hover:scale-110'}`}>
                <Icon name="ThumbsDown" size={26} className={dislikedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
              </div>
            </button>
            
            {currentUser && currentUser.id !== currentVideo.creator?.id && (
                <button onClick={(e) => handleGiftClick(currentVideo, e)} className="flex flex-col items-center space-y-1">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-yellow-500 bg-white/20">
                        <span className="text-xl font-extrabold mr-0.5 leading-none">R</span>
                        <Icon name="Gift" size={20} className="fill-current" />
                    </div>
                </button>
            )}

            <button onClick={(e) => handleOpenComments(currentVideo.id, e)} className="flex flex-col items-center space-y-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="MessageCircle" size={26} />
              </div>
              <span className="font-semibold text-xs text-white">{formatCount(getVideoCounter(currentVideo.id, 'comments'))}</span>
            </button>

            <button onClick={(e) => handleSave(currentVideo.id, e)} className="flex flex-col items-center space-y-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${savedVideos.has(currentVideo.id) ? 'text-yellow-400' : 'text-white hover:scale-110'}`}>
                <Icon name="Bookmark" size={26} className={savedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
              </div>
            </button>

            <button onClick={(e) => handleShare(currentVideo, e)} className="flex flex-col items-center space-y-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="Share2" size={26} />
              </div>
            </button>

            <button onClick={(e) => handleMuteToggle(currentVideo.id, e)} className="flex flex-col items-center space-y-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name={mutedVideos.has(currentVideo.id) ? 'VolumeX' : 'Volume2'} size={26} />
              </div>
            </button>

            <button className="flex flex-col items-center mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                  <Icon name="Music" size={18} color="white" />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* BOTONES DE ACCIÓN - DESKTOP */}
        {currentVideo && isDesktop && (
          <div className="flex flex-col items-center space-y-6 ml-6 z-50" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Link to={`/profile/${currentVideo.creator?.id}`} onClick={(e) => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-300 shadow-lg hover:scale-110 transition-transform bg-white">
                  {currentVideo.creator?.avatar ? <img src={currentVideo.creator.avatar} alt={currentVideo.creator.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><span className="text-white font-bold text-xl">{currentVideo.creator?.name?.charAt(0) || 'U'}</span></div>}
                </div>
              </Link>
              {!followedCreators.has(currentVideo.creator?.id) && currentUser?.id !== currentVideo.creator?.id && (
                <button onClick={(e) => handleFollow(currentVideo.creator?.id, e)} className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110">
                  <Icon name="Plus" size={18} color="white" />
                </button>
              )}
            </div>

            <div className="relative flex flex-col items-center space-y-1">
              <button onClick={(e) => handleLike(currentVideo.id, e)} className="flex flex-col items-center space-y-1 group">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${likedVideos.has(currentVideo.id) ? 'bg-red-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-red-50'}`}>
                  <Icon name="ThumbsUp" size={28} className={likedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                </div>
                <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">{formatCount(getVideoCounter(currentVideo.id, 'likes'))}</span>
              </button>
            </div>

            <button onClick={(e) => handleDislike(currentVideo.id, e)} className="flex flex-col items-center space-y-1 group">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${dislikedVideos.has(currentVideo.id) ? 'bg-gray-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-gray-50'}`}>
                <Icon name="ThumbsDown" size={28} className={dislikedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
              </div>
            </button>
            
            {currentUser && currentUser.id !== currentVideo.creator?.id && (
                <button onClick={(e) => handleGiftClick(currentVideo, e)} className="flex flex-col items-center space-y-1 group" title="Regalar Puntos">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-yellow-600 group-hover:bg-yellow-50">
                        <span className="text-2xl font-extrabold mr-0.5 leading-none">R</span>
                        <Icon name="Gift" size={24} className="fill-current" />
                    </div>
                </button>
            )}

            <button onClick={(e) => handleOpenComments(currentVideo.id, e)} className="flex flex-col items-center space-y-1 group">
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-blue-50">
                <Icon name="MessageCircle" size={28} />
              </div>
              <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">{formatCount(getVideoCounter(currentVideo.id, 'comments'))}</span>
            </button>

            <button onClick={(e) => handleSave(currentVideo.id, e)} className="flex flex-col items-center space-y-1 group">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${savedVideos.has(currentVideo.id) ? 'bg-yellow-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-yellow-50'}`}>
                <Icon name="Bookmark" size={28} className={savedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
              </div>
            </button>

            <button onClick={(e) => handleShare(currentVideo, e)} className="flex flex-col items-center space-y-1 group">
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-green-50">
                <Icon name="Share2" size={28} />
              </div>
            </button>

            <button onClick={(e) => handleMuteToggle(currentVideo.id, e)} className="flex flex-col items-center space-y-1 group">
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-purple-50">
                <Icon name={mutedVideos.has(currentVideo.id) ? 'VolumeX' : 'Volume2'} size={28} />
              </div>
            </button>

            <button className="flex flex-col items-center mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg hover:scale-110 transition-transform">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                  <Icon name="Music" size={20} color="white" />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* PANEL DE COMENTARIOS - DESKTOP */}
        {showCommentsModal && currentVideo && isDesktop && (
          <div className="w-[45%] h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col ml-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comentarios</h3>
              <button onClick={handleCloseComments} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments[currentVideo.id]?.length > 0 ? (
                comments[currentVideo.id].map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                        {comment.user?.avatar ? <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><span className="text-white text-xs font-bold">{comment.user?.name?.charAt(0)}</span></div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2"><span className="font-semibold text-sm">{comment.user?.name}</span><span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span></div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <button onClick={() => handleReply(comment.id, comment.user?.username)} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Responder</button>
                        {comment.replies?.length > 0 && (
                          <div className="mt-2">
                            <button onClick={() => toggleReplies(comment.id)} className="text-xs text-blue-600 hover:text-blue-700">
                              {showReplies[comment.id] ? 'Ocultar respuestas' : `Ver ${comment.replies.length} respuesta${comment.replies.length > 1 ? 's' : ''}`}
                            </button>
                            {showReplies[comment.id] && (
                              <div className="space-y-2 pl-4 border-l-2 border-gray-200 mt-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                      {reply.user?.avatar ? <img src={reply.user.avatar} alt={reply.user.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center"><span className="text-white text-[10px] font-bold">{reply.user?.name?.charAt(0)}</span></div>}
                                    </div>
                                    <div className="flex-1"><div className="flex items-center space-x-2"><span className="font-semibold text-xs">{reply.user?.name}</span><span className="text-[10px] text-gray-500">{formatTimeAgo(reply.created_at)}</span></div><p className="text-xs mt-0.5">{reply.content}</p></div>
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
                <div className="text-center py-8 text-gray-500"><Icon name="MessageCircle" size={48} className="mx-auto mb-2 text-gray-300" /><p>No hay comentarios aún</p></div>
              )}
            </div>
            <div className="p-4 border-t">
              {replyingTo && (<div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded"><span className="text-sm text-blue-700">Respondiendo...</span><button onClick={handleCancelReply} className="text-blue-600 hover:text-blue-700"><Icon name="X" size={16} /></button></div>)}
              <div className="flex space-x-2">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
                <button onClick={() => handleAddComment(currentVideo.id)} disabled={!newComment.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"><Icon name="Send" size={20} /></button>
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
              <h3 className="text-lg font-semibold">Comentarios</h3>
              <button onClick={handleCloseComments} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Icon name="X" size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments[currentVideo.id]?.length > 0 ? (
                comments[currentVideo.id].map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                        {comment.user?.avatar ? <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><span className="text-white text-xs font-bold">{comment.user?.name?.charAt(0)}</span></div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2"><span className="font-semibold text-sm">{comment.user?.name}</span><span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span></div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <button onClick={() => handleReply(comment.id, comment.user?.username)} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Responder</button>
                        {comment.replies?.length > 0 && (
                          <div className="mt-2">
                            <button onClick={() => toggleReplies(comment.id)} className="text-xs text-blue-600 hover:text-blue-700">
                              {showReplies[comment.id] ? 'Ocultar respuestas' : `Ver ${comment.replies.length} respuesta${comment.replies.length > 1 ? 's' : ''}`}
                            </button>
                            {showReplies[comment.id] && (
                              <div className="space-y-2 pl-4 border-l-2 border-gray-200 mt-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                      {reply.user?.avatar ? <img src={reply.user.avatar} alt={reply.user.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center"><span className="text-white text-[10px] font-bold">{reply.user?.name?.charAt(0)}</span></div>}
                                    </div>
                                    <div className="flex-1"><div className="flex items-center space-x-2"><span className="font-semibold text-xs">{reply.user?.name}</span><span className="text-[10px] text-gray-500">{formatTimeAgo(reply.created_at)}</span></div><p className="text-xs mt-0.5">{reply.content}</p></div>
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
                <div className="text-center py-8 text-gray-500"><Icon name="MessageCircle" size={48} className="mx-auto mb-2 text-gray-300" /><p>No hay comentarios aún</p></div>
              )}
            </div>
            <div className="p-4 border-t">
              {replyingTo && (<div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded"><span className="text-sm text-blue-700">Respondiendo...</span><button onClick={handleCancelReply} className="text-blue-600 hover:text-blue-700"><Icon name="X" size={16} /></button></div>)}
              <div className="flex space-x-2">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
                <button onClick={() => handleAddComment(currentVideo.id)} disabled={!newComment.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"><Icon name="Send" size={20} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL DE REGALO DE PUNTOS */}
      {showGiftModal && currentVideo && currentUser && (
        <GiftPointsModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          receiverId={currentVideo.creator?.id}
          receiverUsername={currentVideo.creator?.username || currentVideo.creator?.name}
          contentId={currentVideo.id}
          contentType="reel"
          onSuccess={handleGiftSuccess}
        />
      )}
    </div>
  );
};

export default ReelsContainer;
