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
    // ✅ NO pausar el video - continúa reproduciéndose
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
      console.error('❌ Detalles:', error); // <-- CORRECCIÓN: Se cerró el console.error con ')'
    } // <-- CORRECCIÓN: Se cerró el bloque 'catch' con '}'
  }; // <-- CORRECCIÓN: Se cerró la función 'handleAddComment' con '}'

  const handleToggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleReplyTo = (commentId) => {
    setReplyingTo(commentId);
    setNewComment('');
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
      commentInput.focus();
    }
  };

  // ===============================
  // RENDERIZADO
  // ===============================
  
  const currentVideo = videos[currentIndex];

  if (videos.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-900 text-white">
        <Icon name="Videotape" size={48} className="text-pink-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">No hay videos disponibles</h2>
        <p className="text-gray-400">Vuelve más tarde o revisa otras secciones.</p>
        <button 
          onClick={onLoadMore} 
          className="mt-4 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          Recargar
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${isDesktop ? 'max-w-xl mx-auto' : ''}`}
      style={{
        height: isMobile ? '100dvh' : 'calc(100vh - 80px)', // Ajuste para mobile/desktop
        maxHeight: isMobile ? '100dvh' : 'calc(100vh - 80px)',
      }}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      
      <FloatingPointsNotification 
        {...pointsNotification} 
        onHide={hidePointsNotification} 
      />

      {/* REELS SCROLL CONTAINER */}
      <div
        className={`w-full h-full relative transition-transform duration-500`}
        style={{ 
          transform: `translateY(${-currentIndex * 100}%)`,
          transition: enableTransition ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
        }}
        onClick={handlePlayPause}
      >
        {videos.map((video, index) => (
          <div 
            key={video.id} 
            className="w-full h-full flex-shrink-0 relative bg-black snap-start"
            style={{ height: '100%' }}
          >
            {/* VIDEO ELEMENT */}
            <video
              ref={el => videoRefs.current[index] = el}
              className="absolute w-full h-full object-cover"
              src={video.video_url}
              loop
              playsInline
              preload="auto"
              onLoadedData={() => setLoadingVideo(false)}
              onError={(e) => console.error('Error de video:', e)}
            />

            {/* LOADER */}
            {loadingVideo && index === currentIndex && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <Icon name="Spinner" size={32} className="animate-spin text-white" />
              </div>
            )}

            {/* INFO Y CONTROLES */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 z-20 transition-opacity duration-300 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}>
              
              {/* Controles de sonido */}
              <button 
                className="absolute top-4 left-4 p-2 bg-black/30 rounded-full text-white hover:bg-black/50 transition-colors"
                onClick={(e) => handleMuteToggle(video.id, e)}
              >
                <Icon name={mutedVideos.has(video.id) ? 'VolumeX' : 'Volume2'} size={24} />
              </button>

              {/* Botón de navegación hacia arriba (Desktop) */}
              {isDesktop && currentIndex > 0 && (
                <button
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full p-3 text-white rounded-full opacity-70 hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); navigatePrevious(); }}
                  aria-label="Video anterior"
                >
                  <Icon name="ChevronUp" size={32} />
                </button>
              )}
              
              {/* Botón de navegación hacia abajo (Desktop) */}
              {isDesktop && currentIndex < videos.length - 1 && (
                <button
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-3 text-white rounded-full opacity-70 hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); navigateNext(); }}
                  aria-label="Siguiente video"
                >
                  <Icon name="ChevronDown" size={32} />
                </button>
              )}

              {/* Contenido Izquierda (Info) */}
              <div className="absolute bottom-0 left-0 p-4 text-white w-full">
                {/* Creador y Seguir */}
                <div className="flex items-center space-x-3 mb-2">
                  <Link to={`/profile/${video.creator.username}`} className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                      {video.creator.avatar ? (
                        <img src={video.creator.avatar} alt={video.creator.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="User" size={20} className="text-white" />
                      )}
                    </div>
                    <p className="font-bold text-lg hover:underline">@{video.creator.username || video.creator.name}</p>
                  </Link>
                  
                  {currentUser?.id !== video.creator.id && !followedCreators.has(video.creator.id) && (
                    <button 
                      className="text-sm px-3 py-1 bg-pink-600 rounded-full font-semibold hover:bg-pink-700 transition-colors"
                      onClick={(e) => handleFollow(video.creator.id, e)}
                    >
                      Seguir
                    </button>
                  )}
                </div>

                {/* Descripción y Título */}
                <h3 className="text-lg font-semibold mb-1">{video.title}</h3>
                <p className="text-sm mb-4 line-clamp-2">{video.description}</p>
              </div>

              {/* Controles Derecha (Acciones) */}
              <div className="absolute bottom-4 right-4 text-white flex flex-col space-y-6">
                
                {/* Like */}
                <button 
                  className="flex flex-col items-center transition-transform hover:scale-110"
                  onClick={(e) => handleLike(video.id, e)}
                  aria-label="Me gusta"
                >
                  <Icon 
                    name="ThumbsUp" 
                    size={30} 
                    className={likedVideos.has(video.id) ? 'text-red-500 fill-current' : 'text-white'}
                  />
                  <span className="text-xs mt-1">{video.likes_count || 0}</span>
                </button>

                {/* Dislike */}
                <button 
                  className="flex flex-col items-center transition-transform hover:scale-110"
                  onClick={(e) => handleDislike(video.id, e)}
                  aria-label="No me gusta"
                >
                  <Icon 
                    name="ThumbsDown" 
                    size={30} 
                    className={dislikedVideos.has(video.id) ? 'text-gray-400 fill-current' : 'text-white'}
                  />
                </button>

                {/* Comentarios */}
                <button 
                  className="flex flex-col items-center transition-transform hover:scale-110"
                  onClick={(e) => handleOpenComments(video.id, e)}
                  aria-label="Comentarios"
                >
                  <Icon name="MessageCircle" size={30} />
                  <span className="text-xs mt-1">{video.comments_count || 0}</span>
                </button>

                {/* Guardar */}
                <button 
                  className="flex flex-col items-center transition-transform hover:scale-110"
                  onClick={(e) => handleSave(video.id, e)}
                  aria-label="Guardar"
                >
                  <Icon 
                    name="Bookmark" 
                    size={30} 
                    className={savedVideos.has(video.id) ? 'text-yellow-400 fill-current' : 'text-white'}
                  />
                  <span className="text-xs mt-1">Guardar</span>
                </button>

                {/* Compartir */}
                <button 
                  className="flex flex-col items-center transition-transform hover:scale-110"
                  onClick={(e) => handleShare(video, e)}
                  aria-label="Compartir"
                >
                  <Icon name="Share2" size={30} />
                  <span className="text-xs mt-1">Compartir</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* LOADER DE CARGA INFINITA */}
        {(loading || (currentIndex >= videos.length - 2 && hasMore)) && (
          <div className="w-full h-full flex-shrink-0 relative bg-black/80 flex flex-col items-center justify-center text-white p-8">
            <Icon name="Loader" size={48} className="animate-spin text-pink-500 mb-4" />
            <p className="text-lg font-semibold">Cargando más videos...</p>
          </div>
        )}
      </div>

      {/* MODAL DE COMENTARIOS - MOBILE */}
      {isMobile && showCommentsModal && currentVideo && (
        <div 
          className="fixed inset-0 top-auto h-3/4 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl z-[100000] flex flex-col transition-transform duration-300"
        >
          {/* HEADER */}
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-bold dark:text-white">Comentarios ({comments[currentVideo.id]?.length || 0})</h3>
            <button onClick={handleCloseComments} className="p-2 dark:text-gray-400 hover:dark:text-white">
              <Icon name="X" size={24} />
            </button>
          </div>

          {/* LISTA DE COMENTARIOS */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {comments[currentVideo.id]?.length > 0 ? (
              comments[currentVideo.id]
                .filter(c => !c.parent_comment_id) // Solo mostrar comentarios de nivel superior aquí
                .map(comment => (
                <div key={comment.id} className="text-sm dark:text-gray-300">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 overflow-hidden">
                      {comment.user.avatar ? (
                        <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="User" size={16} className="text-white" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold dark:text-white">
                        @{comment.user.username || comment.user.name} 
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </p>
                      <p className="mt-1 dark:text-gray-200">{comment.content}</p>
                      <button 
                        onClick={() => handleReplyTo(comment.id)}
                        className="text-xs text-pink-500 mt-1 hover:underline"
                      >
                        Responder
                      </button>
                      
                      {/* RESPUESTAS */}
                      {comment.replies.length > 0 && (
                        <div className="mt-2 pl-4 border-l dark:border-gray-600">
                          <button 
                            onClick={() => handleToggleReplies(comment.id)}
                            className="text-xs text-blue-500 hover:underline mb-1"
                          >
                            {showReplies[comment.id] ? 'Ocultar' : 'Ver'} {comment.replies.length} respuestas
                          </button>
                          {showReplies[comment.id] && (
                            <div className="space-y-2">
                              {comment.replies.map(reply => (
                                <div key={reply.id} className="text-xs dark:text-gray-300 flex items-start space-x-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 overflow-hidden">
                                    {reply.user.avatar ? (
                                      <img src={reply.user.avatar} alt={reply.user.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <Icon name="User" size={12} className="text-white" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold dark:text-white">
                                      @{reply.user.username || reply.user.name} 
                                      <span className="text-xs font-normal text-gray-500 ml-1">
                                        {new Date(reply.created_at).toLocaleDateString()}
                                      </span>
                                    </p>
                                    <p className="mt-1 dark:text-gray-200">{reply.content}</p>
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
            ) : (
              <p className="text-center text-gray-500 pt-8">Sé el primero en comentar este video.</p>
            )}
          </div>

          {/* FORMULARIO DE COMENTARIOS */}
          <div className="p-4 border-t dark:border-gray-700">
            {replyingTo && (
              <div className="mb-2 flex justify-between items-center text-sm dark:text-gray-400">
                <p>Respondiendo a: **{comments[currentVideo.id]?.find(c => c.id === replyingTo)?.user.username}**</p>
                <button onClick={() => setReplyingTo(null)} className="text-red-500 hover:text-red-600">
                  <Icon name="X" size={16} />
                </button>
              </div>
            )}
            <div className="flex space-x-2">
              <input
                id="comment-input"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? 'Escribe tu respuesta...' : 'Agrega un comentario...'}
                className="flex-grow p-3 border dark:border-gray-600 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddComment(currentVideo.id);
                  }
                }}
              />
              <button 
                onClick={() => handleAddComment(currentVideo.id)}
                disabled={!newComment.trim()}
                className="p-3 bg-pink-600 text-white rounded-full disabled:bg-pink-300 hover:bg-pink-700 transition-colors"
              >
                <Icon name="Send" size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMENTARIOS - DESKTOP (No está implementado, usaría un sidebar o modal) */}
      {/* ... (Aquí iría la implementación de escritorio si se desea) */}

    </div>
  );
};

export default ReelsContainer;
