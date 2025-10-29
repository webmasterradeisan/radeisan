import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { addFreePoints } from 'services/pointsService';
import * as missionsService from 'services/missionsService';
import Icon from 'components/AppIcon';
import useIsMobile from 'hooks/useIsMobile';

// ===============================
// COMPONENTE DE NOTIFICACIÓN FLOTANTE DE PUNTOS
// ===============================
const FloatingPointsNotification = ({ points, message, show, onHide }) => {
  useEffect(() => {
    if (show) {
      console.log('🎉 Mostrando notificación de puntos:', points, message);
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  if (!show) return null;

  return (
    <div 
      className="fixed top-20 right-4 animate-bounce pointer-events-none"
      style={{ 
        zIndex: 99999,
        position: 'fixed',
        top: '80px',
        right: '16px'
      }}
    >
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 transform transition-all duration-300">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <Icon name="Star" size={20} className="text-yellow-300" />
        </div>
        <div>
          <p className="font-bold text-lg">+{points} puntos</p>
          {message && <p className="text-xs text-purple-100">{message}</p>}
        </div>
      </div>
    </div>
  );
};

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
  
  // Estados de comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  // Estados de notificación de puntos
  const [pointsNotification, setPointsNotification] = useState({
    show: false,
    points: 0,
    message: ''
  });

  // Estados de tracking de misiones y acciones realizadas
  const [videoWatchedIds, setVideoWatchedIds] = useState(new Set());
  const [actionsPerformed, setActionsPerformed] = useState({
    likes: new Set(),
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

  console.log('🎬 ReelsContainer render:', {
    videosCount: videos.length,
    currentIndex,
    selectedReelId,
    enableTransition,
    hasPlayedInitial: hasPlayedInitial.current,
    isMobile,
    isDesktop,
    showCommentsModal
  });

  // ===============================
  // FUNCIÓN: Convertir ID del video a índice
  // ===============================
  const getInitialReelIndex = useCallback(() => {
    if (!selectedReelId) {
      console.log('🔍 No hay ID seleccionado, iniciando en índice 0');
      return 0;
    }
    
    const index = videos.findIndex(video => video.id === selectedReelId);
    
    console.log('🔍 Búsqueda de video por ID');
    console.log('   🆔 ID buscado:', selectedReelId);
    console.log('   📍 Índice encontrado:', index);
    console.log('   📹 Video:', index >= 0 ? videos[index]?.title : 'No encontrado');
    
    if (index < 0) {
      console.warn('⚠️ Video con ID', selectedReelId, 'no encontrado');
      return 0;
    }
    
    return index;
  }, [selectedReelId, videos]);

  // ===============================
  // SINCRONIZACIÓN INICIAL
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    
    const correctIndex = getInitialReelIndex();
    
    console.log('🎯 Sincronizando estado inicial');
    console.log('   🆔 selectedReelId:', selectedReelId);
    console.log('   🎯 Índice calculado:', correctIndex);
    console.log('   📹 Video a reproducir:', videos[correctIndex]?.title || 'No existe');
    
    if (isInitialMount.current) {
      setCurrentIndex(correctIndex);
      setEnableTransition(false);
      
      setTimeout(() => {
        setEnableTransition(true);
        isInitialMount.current = false;
        console.log('✅ Transiciones habilitadas');
      }, 100);
    } else {
      setCurrentIndex(correctIndex);
    }
  }, [selectedReelId, videos, getInitialReelIndex]);

  // ===============================
  // CARGAR USUARIO ACTUAL Y ACCIONES PREVIAS
  // ===============================
  useEffect(() => {
    const loadCurrentUserAndActions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, name, avatar, username')
            .eq('id', user.id)
            .single();
          
          const userProfile = profile || { 
            id: user.id, 
            name: user.email?.split('@')[0] || 'Usuario', 
            avatar: null, 
            username: user.email?.split('@')[0] || 'usuario'
          };

          console.log('👤 Usuario actual cargado:', userProfile);
          setCurrentUser(userProfile);

          const { data: likesData } = await supabase
            .from('video_likes')
            .select('video_id')
            .eq('user_id', user.id);
          
          if (likesData) {
            const likedIds = new Set(likesData.map(l => l.video_id));
            setLikedVideos(likedIds);
            setActionsPerformed(prev => ({
              ...prev,
              likes: likedIds
            }));
          }

          const { data: savedData } = await supabase
            .from('saved_videos')
            .select('video_id')
            .eq('user_id', user.id);
          
          if (savedData) {
            const savedIds = new Set(savedData.map(s => s.video_id));
            setSavedVideos(savedIds);
            setActionsPerformed(prev => ({
              ...prev,
              saves: savedIds
            }));
          }

          const { data: followsData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
          
          if (followsData) {
            const followedIds = new Set(followsData.map(f => f.following_id));
            setFollowedCreators(followedIds);
            setActionsPerformed(prev => ({
              ...prev,
              follows: followedIds
            }));
          }
        }
      } catch (error) {
        console.error('Error cargando usuario y acciones:', error);
      }
    };
    
    loadCurrentUserAndActions();
  }, []);

  // ===============================
  // FUNCIÓN PARA MOSTRAR NOTIFICACIÓN DE PUNTOS
  // ===============================
  const showPointsEarned = useCallback((points, message = '') => {
    console.log('🎉 Mostrando notificación de puntos:', points, message);
    setPointsNotification({ show: true, points, message });
    if (onPointsEarned) {
      onPointsEarned(points);
    }
  }, [onPointsEarned]);

  const hidePointsNotification = useCallback(() => {
    setPointsNotification({ show: false, points: 0, message: '' });
  }, []);

  // ===============================
  // FORZAR REPRODUCCIÓN DEL VIDEO INICIAL
  // ===============================
  useEffect(() => {
    if (hasPlayedInitial.current || videos.length === 0) return;

    console.log('🎬 Intentando reproducir video inicial:', currentIndex);
    
    const attemptPlay = () => {
      const currentVideo = videoRefs.current[currentIndex];
      
      if (!currentVideo) {
        console.log('⏳ Video no disponible aún, reintentando...');
        setTimeout(attemptPlay, 100);
        return;
      }

      console.log('🎮 Video encontrado, reproduciendo');

      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
        }
      });

      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video inicial reproduciendo correctamente');
            hasPlayedInitial.current = true;
            lastNavigationIndex.current = currentIndex;
          })
          .catch(err => {
            console.error('❌ Error autoplay inicial:', err);
            currentVideo.muted = true;
            currentVideo.play()
              .then(() => {
                console.log('✅ Video inicial reproduciendo (muted)');
                hasPlayedInitial.current = true;
                lastNavigationIndex.current = currentIndex;
              })
              .catch(e => console.error('❌ Error crítico:', e));
          });
      }
    };

    setTimeout(attemptPlay, 250);
  }, [videos, currentIndex, mutedVideos]);

  // ===============================
  // MOUSE WHEEL NAVIGATION (DESKTOP)
  // ===============================
  useEffect(() => {
    if (!isDesktop) return;

    const handleWheel = (e) => {
      e.preventDefault();
      
      clearTimeout(handleWheel.timeout);
      handleWheel.timeout = setTimeout(() => {
        if (e.deltaY > 0 && currentIndex < videos.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else if (e.deltaY < 0 && currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      }, 150);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [isDesktop, currentIndex, videos.length]);

  // ===============================
  // AUTOPLAY Y GESTIÓN DE VIDEOS (MANTIENE POSICIÓN AL PAUSAR)
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    
    const initialIndex = getInitialReelIndex();
    if (!hasPlayedInitial.current && currentIndex === initialIndex) {
      console.log('⏭️ Skipping autoplay - será manejado por useEffect dedicado');
      return;
    }

    const currentVideo = videoRefs.current[currentIndex];
    const isNavigationChange = lastNavigationIndex.current !== currentIndex;

    if (currentVideo) {
      // Pausar todos los otros videos
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
        }
      });

      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      // Si es cambio de navegación, SIEMPRE reproducir automáticamente
      if (isNavigationChange) {
        console.log('🔄 Cambio de navegación detectado, auto-reproduciendo video');
        currentVideo.currentTime = 0;
        lastNavigationIndex.current = currentIndex;
        
        const playPromise = currentVideo.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Video auto-reproduciendo desde el inicio');
              setIsAutoPlaying(true);
            })
            .catch(err => {
              console.log('Autoplay bloqueado:', err);
              currentVideo.muted = true;
              currentVideo.play()
                .then(() => setIsAutoPlaying(true))
                .catch(e => console.log('Error:', e));
            });
        }
      } else if (isAutoPlaying) {
        // No es navegación, pero debe estar reproduciéndose (usuario no pausó)
        console.log('⚡ Play/Pause - continúa desde:', currentVideo.currentTime);
        
        const playPromise = currentVideo.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Video reproduciendo desde:', currentVideo.currentTime);
            })
            .catch(err => {
              console.log('Autoplay bloqueado:', err);
              currentVideo.muted = true;
              currentVideo.play().catch(e => console.log('Error:', e));
            });
        }
      } else {
        // Usuario pausó manualmente
        console.log('⏸️ Video pausado por usuario en:', currentVideo.currentTime);
        currentVideo.pause();
      }
    }
  }, [currentIndex, isAutoPlaying, videos, mutedVideos, getInitialReelIndex]);

  // ===============================
  // TRACKING DE VISUALIZACIÓN
  // ===============================
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentVideoData = videos[currentIndex];
    
    if (!currentVideo || !currentVideoData) return;

    const handleLoadStart = () => setLoadingVideo(true);
    const handleCanPlay = () => setLoadingVideo(false);
    const handleLoadedData = () => setLoadingVideo(false);

    const handleTimeUpdate = () => {
      const watchedPercent = (currentVideo.currentTime / currentVideo.duration) * 100;
      
      if (watchedPercent > 80 && !videoWatchedIds.has(currentVideoData.id)) {
        setVideoWatchedIds(prev => new Set([...prev, currentVideoData.id]));
        
        missionsService.trackWatchVideo(currentVideoData.id, currentVideo.currentTime)
          .then(result => {
            if (result.completed) {
              showPointsEarned(result.reward.points, result.message);
            }
          })
          .catch(error => console.error('Error tracking video:', error));
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
  }, [currentIndex, videos, videoWatchedIds, showPointsEarned]);

  // ===============================
  // PLAY/PAUSE (MANTIENE POSICIÓN - NO REINICIA)
  // ===============================
  const handlePlayPause = (e) => {
    if (e.target.tagName === 'VIDEO') {
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo) {
        if (currentVideo.paused) {
          console.log('▶️ Reproduciendo desde:', currentVideo.currentTime);
          currentVideo.play();
          setIsAutoPlaying(true);
        } else {
          console.log('⏸️ Pausando en:', currentVideo.currentTime);
          currentVideo.pause();
          setIsAutoPlaying(false);
        }
      }
    }
  };

  // ===============================
  // NAVEGACIÓN
  // ===============================
  const navigateNext = () => {
    if (currentIndex < videos.length - 1) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev + 1);
      setIsAutoPlaying(true);
    }
  };

  const navigatePrevious = () => {
    if (currentIndex > 0) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev - 1);
      setIsAutoPlaying(true);
    }
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) navigateNext();
      else navigatePrevious();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowDown') navigateNext();
      if (e.key === 'ArrowUp') navigatePrevious();
      if (e.key === ' ') {
        e.preventDefault();
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
      }
      if (e.key === 'Escape' && showCommentsModal) {
        handleCloseComments();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length, showCommentsModal]);

  // ===============================
  // ACCIONES
  // ===============================
  
  const handleLike = async (videoId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newLikedVideos = new Set(likedVideos);
      const newDislikedVideos = new Set(dislikedVideos);
      const wasAlreadyLiked = actionsPerformed.likes.has(videoId);
      
      if (newLikedVideos.has(videoId)) {
        newLikedVideos.delete(videoId);
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_video_likes', { video_id: videoId });
      } else {
        newLikedVideos.add(videoId);
        newDislikedVideos.delete(videoId);

        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_likes', { video_id: videoId });

        if (!wasAlreadyLiked) {
          try {
            await addFreePoints(5, 'Like en video', 'video', videoId);
            const missionResult = await missionsService.trackGiveLike('video', videoId);
            if (missionResult.completed) {
              showPointsEarned(missionResult.reward.points, missionResult.message);
            } else {
              showPointsEarned(5, 'Like en video');
            }
            
            setActionsPerformed(prev => ({
              ...prev,
              likes: new Set([...prev.likes, videoId])
            }));
          } catch (pointsError) {
            console.error('Error al otorgar puntos:', pointsError);
          }
        }
      }
      
      setLikedVideos(newLikedVideos);
      setDislikedVideos(newDislikedVideos);
    } catch (error) {
      console.error('Error en like:', error);
    }
  };

  const handleDislike = async (videoId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newDislikedVideos = new Set(dislikedVideos);
      const newLikedVideos = new Set(likedVideos);
      
      if (newDislikedVideos.has(videoId)) {
        newDislikedVideos.delete(videoId);
      } else {
        newDislikedVideos.add(videoId);
        
        if (newLikedVideos.has(videoId)) {
          newLikedVideos.delete(videoId);
          await supabase
            .from('video_likes')
            .delete()
            .eq('video_id', videoId)
            .eq('user_id', user.id);
          
          await supabase.rpc('decrement_video_likes', { video_id: videoId });
        }
      }
      
      setDislikedVideos(newDislikedVideos);
      setLikedVideos(newLikedVideos);
    } catch (error) {
      console.error('Error en dislike:', error);
    }
  };

  const handleSave = async (videoId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newSavedVideos = new Set(savedVideos);
      const wasAlreadySaved = actionsPerformed.saves.has(videoId);
      
      if (newSavedVideos.has(videoId)) {
        newSavedVideos.delete(videoId);
        await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      } else {
        newSavedVideos.add(videoId);
        await supabase
          .from('saved_videos')
          .insert({ video_id: videoId, user_id: user.id });

        if (!wasAlreadySaved) {
          try {
            await addFreePoints(2, 'Guardar video', 'video', videoId);
            showPointsEarned(2, 'Video guardado');
            
            setActionsPerformed(prev => ({
              ...prev,
              saves: new Set([...prev.saves, videoId])
            }));
          } catch (pointsError) {
            console.error('Error al otorgar puntos:', pointsError);
          }
        }
      }
      
      setSavedVideos(newSavedVideos);
    } catch (error) {
      console.error('Error guardando video:', error);
    }
  };

  const handleFollow = async (creatorId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      if (followedCreators.has(creatorId)) {
        return;
      }

      const wasAlreadyFollowed = actionsPerformed.follows.has(creatorId);

      const newFollowedCreators = new Set(followedCreators);
      newFollowedCreators.add(creatorId);
      setFollowedCreators(newFollowedCreators);

      await supabase
        .from('follows')
        .insert({ 
          follower_id: user.id, 
          following_id: creatorId 
        });

      if (!wasAlreadyFollowed) {
        try {
          await addFreePoints(10, 'Seguir creador', 'follow', creatorId);
          const missionResult = await missionsService.trackFollowUser(creatorId);
          if (missionResult.completed) {
            showPointsEarned(missionResult.reward.points, missionResult.message);
          } else {
            showPointsEarned(10, 'Seguiste a un creador');
          }
          
          setActionsPerformed(prev => ({
            ...prev,
            follows: new Set([...prev.follows, creatorId])
          }));
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      }
    } catch (error) {
      console.error('Error siguiendo creador:', error);
    }
  };

  const handleShare = async (video, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const wasAlreadyShared = actionsPerformed.shares.has(video.id);

      if (navigator.share) {
        await navigator.share({
          title: video.title || 'Video',
          text: video.description || '',
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Enlace copiado al portapapeles');
      }

      if (!wasAlreadyShared) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await addFreePoints(3, 'Compartir video', 'video', video.id);
            const missionResult = await missionsService.trackShareContent(
              'video', 
              video.id, 
              navigator.share ? 'native' : 'clipboard'
            );
            
            if (missionResult.completed) {
              showPointsEarned(missionResult.reward.points, missionResult.message);
            } else {
              showPointsEarned(3, 'Video compartido');
            }
            
            setActionsPerformed(prev => ({
              ...prev,
              shares: new Set([...prev.shares, video.id])
            }));
          }
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      }
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  const handleMuteToggle = (videoId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
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
  // SISTEMA DE COMENTARIOS
  // ===============================
  
  const loadComments = async (videoId, retryCount = 0) => {
    try {
      let { data, error } = await supabase
        .from('video_comments')
        .select('id, video_id, user_id, content, parent_comment_id, created_at, updated_at')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) {
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadComments(videoId, retryCount + 1);
        }
        throw error;
      }

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(comment => comment.user_id))];
        
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, name, avatar, username')
          .in('id', userIds);

        if (!usersError && usersData) {
          const usersMap = {};
          usersData.forEach(user => {
            usersMap[user.id] = user;
          });

          data = data.map(comment => {
            const userProfile = usersMap[comment.user_id];
            return {
              ...comment,
              user: userProfile ? {
                id: userProfile.id,
                name: userProfile.name || userProfile.username || 'Usuario',
                avatar: userProfile.avatar,
                username: userProfile.username || userProfile.name || 'usuario'
              } : {
                id: comment.user_id,
                name: 'Usuario',
                avatar: null,
                username: 'usuario'
              },
              replies: []
            };
          });

          const topLevelComments = [];
          const repliesMap = {};

          data.forEach(comment => {
            if (comment.parent_comment_id) {
              if (!repliesMap[comment.parent_comment_id]) {
                repliesMap[comment.parent_comment_id] = [];
              }
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

      setComments(prev => ({
        ...prev,
        [videoId]: data || []
      }));
    } catch (error) {
      console.error('Error cargando comentarios:', error);
      setComments(prev => ({
        ...prev,
        [videoId]: []
      }));
    }
  };

  const handleOpenComments = async (videoId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    console.log('🗨️ Abriendo modal de comentarios para video:', videoId);
    console.log('📹 Video debe SEGUIR reproduciéndose');
    setShowCommentsModal(true);
    setReplyingTo(null);
    setNewComment('');
    await loadComments(videoId);
  };

  const handleCloseComments = () => {
    console.log('❌ Cerrando modal de comentarios');
    setShowCommentsModal(false);
    setReplyingTo(null);
    setNewComment('');
  };

  const handleAddComment = async (videoId) => {
    if (!newComment.trim()) {
      console.log('❌ Comentario vacío');
      return;
    }

    console.log('📝 ===== INICIANDO ENVÍO DE COMENTARIO =====');
    console.log('📝 VideoId:', videoId);
    console.log('📝 Contenido:', newComment.trim());
    console.log('📝 Respondiendo a:', replyingTo);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Usuario no autenticado');
        navigate('/login');
        return;
      }

      console.log('👤 Usuario autenticado:', user.id);

      const commentData = {
        video_id: videoId,
        user_id: user.id,
        content: newComment.trim(),
        parent_comment_id: replyingTo
      };

      console.log('📤 Enviando a Supabase:', commentData);

      const { data: insertedComment, error } = await supabase
        .from('video_comments')
        .insert(commentData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error de Supabase:', error);
        console.error('❌ Código:', error.code);
        console.error('❌ Mensaje:', error.message);
        console.error('❌ Detalles:', error.details);
        alert(`Error al comentar: ${error.message}`);
        throw error;
      }

      console.log('✅ Comentario insertado exitosamente:', insertedComment);

      if (!replyingTo) {
        console.log('📊 Incrementando contador de comentarios...');
        const { error: rpcError } = await supabase.rpc('increment_video_comments', { video_id: videoId });
        if (rpcError) {
          console.error('⚠️ Error al incrementar contador:', rpcError);
        } else {
          console.log('✅ Contador incrementado');
        }
      }

      const wasAlreadyCommented = actionsPerformed.comments.has(videoId);

      if (!wasAlreadyCommented) {
        try {
          console.log('🎁 Otorgando puntos...');
          await addFreePoints(3, replyingTo ? 'Responder comentario' : 'Comentar video', 'video', videoId);
          const missionResult = await missionsService.trackComment('video', videoId);
          if (missionResult.completed) {
            showPointsEarned(missionResult.reward.points, missionResult.message);
          } else {
            showPointsEarned(3, replyingTo ? 'Respuesta agregada' : 'Comentario agregado');
          }
          
          setActionsPerformed(prev => ({
            ...prev,
            comments: new Set([...prev.comments, videoId])
          }));
          console.log('✅ Puntos otorgados');
        } catch (pointsError) {
          console.error('⚠️ Error al otorgar puntos:', pointsError);
        }
      }

      setNewComment('');
      setReplyingTo(null);
      
      console.log('🔄 Recargando comentarios...');
      await loadComments(videoId);
      console.log('✅ ===== COMENTARIO COMPLETADO =====');
    } catch (error) {
      console.error('❌ ===== ERROR GENERAL AL COMENTAR =====');
      console.error('❌ Error:', error);
      console.error('❌ Stack:', error.stack);
      alert('Error al agregar comentario. Revisa la consola para más detalles.');
    }
  };

  const handleReply = (commentId, username) => {
    console.log('💬 Respondiendo a comentario:', { commentId, username });
    setReplyingTo(commentId);
    const displayName = username || 'Usuario';
    setNewComment(`@${displayName} `);
    
    setTimeout(() => {
      const input = document.querySelector('textarea[placeholder*="comentario"]');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

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

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  if (videos.length === 0) {
    return (
      <div className="w-full h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-center">
          <Icon name="VideoOff" size={48} className="mx-auto mb-4" />
          <p>No hay videos disponibles</p>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];

  return (
    <>
      {/* NOTIFICACIÓN FLOTANTE DE PUNTOS */}
      <FloatingPointsNotification
        points={pointsNotification.points}
        message={pointsNotification.message}
        show={pointsNotification.show}
        onHide={hidePointsNotification}
      />
      
      <div 
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden ${isDesktop ? 'max-w-xl mx-auto' : ''}`}
        style={{
          height: isMobile ? '100dvh' : 'calc(100vh - 80px)',
          maxHeight: isMobile ? '100dvh' : 'calc(100vh - 80px)',
        }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        {/* CONTENEDOR PRINCIPAL */}
        <div className="flex h-full w-full items-center justify-center">
        
          {/* CONTENEDOR DEL REEL */}
          <div 
            className={`
              relative overflow-hidden flex-shrink-0
              ${isDesktop 
                ? showCommentsModal 
                  ? 'w-[55%]' 
                  : 'w-full'
                : 'w-full'
              }
              h-full
            `}
          >
            
            {/* CONTENEDOR DE REELS */}
            <div
              ref={containerRef}
              className={`flex flex-col h-full ease-out ${enableTransition ? 'transition-transform duration-500' : ''}`}
              style={{
                transform: `translateY(-${currentIndex * (isDesktop ? 80 : 100)}vh)`
              }}
              onTouchStart={isMobile ? handleTouchStart : undefined}
              onTouchMove={isMobile ? handleTouchMove : undefined}
              onTouchEnd={isMobile ? handleTouchEnd : undefined}
            >
              {videos.map((video, index) => {
                const videoUrl = video.videoUrl || video.video_url;
                const isActive = index === currentIndex;

                return (
                  <div 
                    key={video.id}
                    className="relative flex-shrink-0 w-full"
                    style={{ height: isDesktop ? '80vh' : '100vh' }}
                  >
                    {/* VIDEO */}
                    <video
                      ref={el => videoRefs.current[index] = el}
                      src={videoUrl}
                      className="w-full h-full object-contain bg-gray-100"
                      loop
                      playsInline
                      preload={index === currentIndex ? "auto" : Math.abs(index - currentIndex) === 1 ? "metadata" : "none"}
                      onClick={handlePlayPause}
                    />

                    {/* INDICADOR DE CARGA */}
                    {isActive && loadingVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-700 text-sm">Cargando video...</p>
                        </div>
                      </div>
                    )}

                    {/* INFORMACIÓN DEL VIDEO */}
                    <div 
                      className="absolute bottom-8 left-4 right-24 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center space-x-2 mb-3">
                          <Link 
                            to={`/profile/${video.creator?.id}`} 
                            className="font-bold hover:underline text-base text-white drop-shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{video.creator?.username || video.creator?.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}
                          </Link>
                          <span className="text-gray-200 text-sm">•</span>
                          <span className="text-gray-200 text-sm">{video.timeAgo || 'Reciente'}</span>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm leading-relaxed line-clamp-3 text-white drop-shadow-lg">
                            {video.description || video.title}
                          </p>
                        </div>

                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {video.tags.slice(0, 3).map((tag, tagIndex) => (
                              <span key={tagIndex} className="text-sm font-semibold text-white drop-shadow-lg">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center space-x-2 text-sm">
                          <Icon name="Music" size={14} color="white" />
                          <span className="truncate text-white drop-shadow-lg">
                            {video.audioTitle || `Sonido original - ${video.creator?.name || 'Creador'}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* INDICADOR DE PLAY/PAUSE */}
                    {!isAutoPlaying && isActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Icon name="Play" size={32} color="white" />
                        </div>
                      </div>
                    )}

                    {/* BARRA DE PROGRESO */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                      <div 
                        className="h-full bg-red-500 transition-all"
                        style={{ 
                          width: isActive ? '100%' : '0%',
                          transitionDuration: isActive ? `${video.duration || 30}s` : '0s',
                          transitionTimingFunction: 'linear'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FLECHAS DE NAVEGACIÓN DESKTOP */}
            {isDesktop && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
                <button
                  onClick={navigatePrevious}
                  disabled={currentIndex === 0}
                  className={`
                    absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto
                    w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full 
                    flex items-center justify-center transition-all shadow-lg
                    hover:bg-white hover:scale-110
                    ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'}
                  `}
                >
                  <Icon name="ChevronUp" size={24} className="text-gray-800" />
                </button>

                <button
                  onClick={navigateNext}
                  disabled={currentIndex === videos.length - 1}
                  className={`
                    absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto
                    w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full 
                    flex items-center justify-center transition-all shadow-lg
                    hover:bg-white hover:scale-110
                    ${currentIndex === videos.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'}
                  `}
                >
                  <Icon name="ChevronDown" size={24} className="text-gray-800" />
                </button>
              </div>
            )}

            {/* INSTRUCCIONES */}
            {currentIndex === 0 && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-none z-40">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className={isDesktop ? 'text-base' : 'text-sm'}>
                    {isDesktop ? 'Usa flechas ↑↓ o rueda del mouse' : 'Desliza ↑↓ para navegar'}
                  </p>
                  <p className={`opacity-75 ${isDesktop ? 'text-sm' : 'text-xs'}`}>
                    Toca para pausar
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CONTROLES LATERALES - SOLO DESKTOP */}
          {isDesktop && currentVideo && (
            <div 
              className="flex flex-col items-center space-y-6 ml-6 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Avatar + Follow */}
              <div className="relative">
                <Link 
                  to={`/profile/${currentVideo?.creator?.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-300 shadow-lg hover:scale-110 transition-transform bg-white">
                    {currentVideo?.creator?.avatar ? (
                      <img 
                        src={currentVideo.creator.avatar} 
                        alt={currentVideo.creator.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {currentVideo?.creator?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                
                {!followedCreators.has(currentVideo?.creator?.id) && (
                  <button
                    onClick={(e) => handleFollow(currentVideo?.creator?.id, e)}
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110"
                  >
                    <Icon name="Plus" size={18} color="white" />
                  </button>
                )}
              </div>

              {/* Like */}
              <button 
                onClick={(e) => handleLike(currentVideo?.id, e)} 
                className="flex flex-col items-center space-y-1 group"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${likedVideos.has(currentVideo?.id) ? 'bg-red-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-red-50'}`}>
                  <Icon name="ThumbsUp" size={28} className={likedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
                </div>
                <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                  {formatCount(currentVideo?.likes || 0)}
                </span>
              </button>

              {/* Dislike */}
              <button 
                onClick={(e) => handleDislike(currentVideo?.id, e)} 
                className="flex flex-col items-center space-y-1 group"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${dislikedVideos.has(currentVideo?.id) ? 'bg-gray-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-gray-50'}`}>
                  <Icon name="ThumbsDown" size={28} className={dislikedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
                </div>
              </button>

              {/* Comentarios */}
              <button 
                onClick={(e) => handleOpenComments(currentVideo?.id, e)} 
                className="flex flex-col items-center space-y-1 group"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-blue-50">
                  <Icon name="MessageCircle" size={28} />
                </div>
                <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                  {formatCount(currentVideo?.comments || 0)}
                </span>
              </button>

              {/* Guardar */}
              <button 
                onClick={(e) => handleSave(currentVideo?.id, e)} 
                className="flex flex-col items-center space-y-1 group"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${savedVideos.has(currentVideo?.id) ? 'bg-yellow-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-yellow-50'}`}>
                  <Icon name="Bookmark" size={28} className={savedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
                </div>
              </button>

              {/* Compartir */}
              <button 
                onClick={(e) => handleShare(currentVideo, e)} 
                className="flex flex-col items-center space-y-1 group"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-green-50">
                  <Icon name="Share2" size={28} />
                </div>
              </button>

              {/* Volumen */}
              <button 
                onClick={(e) => handleMuteToggle(currentVideo?.id, e)} 
                className="flex flex-col items-center space-y-1 group"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-purple-50">
                  <Icon name={mutedVideos.has(currentVideo?.id) ? 'VolumeX' : 'Volume2'} size={28} />
                </div>
              </button>

              {/* Música */}
              <button 
                className="flex flex-col items-center mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg hover:scale-110 transition-transform">
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                    <Icon name="Music" size={20} color="white" />
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* PANEL DE COMENTARIOS - DESKTOP */}
          {isDesktop && showCommentsModal && currentVideo && (
            <div className="w-[40%] h-[80vh] bg-white flex flex-col shadow-2xl rounded-r-xl ml-4 flex-shrink-0 z-20">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Icon name="MessageCircle" size={20} />
                  {formatCount(currentVideo.comments || 0)} comentarios
                </h3>
                <button 
                  onClick={handleCloseComments}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <Icon name="X" size={20} className="text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!comments[currentVideo.id] || comments[currentVideo.id]?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Icon name="MessageCircle" size={48} className="mb-2" />
                    <p>No hay comentarios aún</p>
                    <p className="text-sm">Sé el primero en comentar</p>
                  </div>
                ) : (
                  comments[currentVideo.id]?.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400">
                            {comment.user?.avatar ? (
                              <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                {comment.user?.name?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-gray-800">
                              {comment.user?.name || 'Usuario'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 mt-1 break-words">
                            {comment.content}
                          </p>
                          
                          <button
                            onClick={() => handleReply(comment.id, comment.user?.username || comment.user?.name)}
                            className="text-xs text-gray-500 hover:text-gray-700 mt-2 font-medium"
                          >
                            Responder
                          </button>

                          {comment.replies?.length > 0 && (
                            <div className="mt-3">
                              <button
                                onClick={() => toggleReplies(comment.id)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                              >
                                <Icon name={showReplies[comment.id] ? "ChevronUp" : "ChevronDown"} size={14} />
                                {showReplies[comment.id] 
                                  ? 'Ocultar respuestas' 
                                  : `Ver ${comment.replies.length} respuesta${comment.replies.length > 1 ? 's' : ''}`
                                }
                              </button>
                              
                              {showReplies[comment.id] && (
                                <div className="mt-3 space-y-3 ml-4 border-l-2 border-gray-200 pl-4">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="flex space-x-2">
                                      <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-400">
                                          {reply.user?.avatar ? (
                                            <img src={reply.user.avatar} alt={reply.user.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                              {reply.user?.name?.charAt(0) || 'U'}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-semibold text-xs text-gray-800">
                                            {reply.user?.name || 'Usuario'}
                                          </span>
                                          <span className="text-xs text-gray-400">
                                            {formatTimeAgo(reply.created_at)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-700 mt-1 break-words">
                                          {reply.content}
                                        </p>
                                      </div>
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
                )}
              </div>

              <div 
                className="border-t border-gray-200 p-4 bg-gray-50"
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
              >
                {replyingTo && (
                  <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded-lg">
                    <span className="text-xs text-blue-700 flex items-center gap-1">
                      <Icon name="CornerDownRight" size={14} />
                      Respondiendo a comentario
                    </span>
                    <button 
                      onClick={handleCancelReply}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-end space-x-2">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => {
                        e.stopPropagation();
                        setNewComment(e.target.value);
                      }}
                      placeholder="Agrega un comentario..."
                      rows={2}
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onInput={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(currentVideo.id);
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleAddComment(currentVideo.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      disabled={!newComment.trim()}
                      className={`absolute right-2 bottom-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        newComment.trim() 
                          ? 'bg-purple-500 hover:bg-purple-600 text-white cursor-pointer' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Icon name="Send" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL DE COMENTARIOS - MOBILE */}
        {isMobile && showCommentsModal && currentVideo && (
          <div 
            className="fixed inset-0 z-[100] flex items-end"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseComments();
            }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCloseComments} />
            
            <div className="relative bg-white rounded-t-3xl shadow-2xl w-full h-[75vh] flex flex-col animate-slide-up z-[101]">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">
                  {formatCount(currentVideo.comments || 0)} comentarios
                </h3>
                <button 
                  onClick={handleCloseComments}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <Icon name="X" size={20} className="text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!comments[currentVideo.id] || comments[currentVideo.id]?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Icon name="MessageCircle" size={48} className="mb-2" />
                    <p>No hay comentarios aún</p>
                    <p className="text-sm">Sé el primero en comentar</p>
                  </div>
                ) : (
                  comments[currentVideo.id]?.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400">
                            {comment.user?.avatar ? (
                              <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                {comment.user?.name?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-gray-800">
                              {comment.user?.name || 'Usuario'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 mt-1 break-words">
                            {comment.content}
                          </p>
                          
                          <button
                            onClick={() => handleReply(comment.id, comment.user?.username || comment.user?.name)}
                            className="text-xs text-gray-500 hover:text-gray-700 mt-2 font-medium"
                          >
                            Responder
                          </button>

                          {comment.replies?.length > 0 && (
                            <div className="mt-3">
                              <button
                                onClick={() => toggleReplies(comment.id)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {showReplies[comment.id] 
                                  ? 'Ocultar respuestas' 
                                  : `Ver ${comment.replies.length} respuesta${comment.replies.length > 1 ? 's' : ''}`
                                }
                              </button>
                              
                              {showReplies[comment.id] && (
                                <div className="mt-3 space-y-3 ml-4 border-l-2 border-gray-200 pl-4">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="flex space-x-2">
                                      <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-400">
                                          {reply.user?.avatar ? (
                                            <img src={reply.user.avatar} alt={reply.user.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                              {reply.user?.name?.charAt(0) || 'U'}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-semibold text-xs text-gray-800">
                                            {reply.user?.name || 'Usuario'}
                                          </span>
                                          <span className="text-xs text-gray-400">
                                            {formatTimeAgo(reply.created_at)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-700 mt-1 break-words">
                                          {reply.content}
                                        </p>
                                      </div>
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
                )}
              </div>

              <div 
                className="border-t border-gray-200 p-4"
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {replyingTo && (
                  <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded-lg">
                    <span className="text-xs text-blue-700">
                      Respondiendo a comentario
                    </span>
                    <button 
                      onClick={handleCancelReply}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-end space-x-2">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => {
                        e.stopPropagation();
                        setNewComment(e.target.value);
                      }}
                      placeholder="Agrega un comentario..."
                      rows={1}
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onInput={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(currentVideo.id);
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleAddComment(currentVideo.id);
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      disabled={!newComment.trim()}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        newComment.trim() 
                          ? 'bg-purple-500 hover:bg-purple-600 text-white cursor-pointer' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Icon name="Send" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReelsContainer;
