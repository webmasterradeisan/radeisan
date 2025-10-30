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
const FloatingPointsNotification = ({ points, message, show, onHide, isMobile, isAlreadyEarned }) => {
  useEffect(() => {
    if (show) {
      console.log('🎉 Mostrando notificación de puntos:', points, message, 'Ya ganado:', isAlreadyEarned);
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onHide, points, message, isAlreadyEarned]);

  if (!show) return null;

  return (
    <div 
  className={`fixed pointer-events-none z-[99999] ${
    isMobile 
      ? 'bottom-[280px] right-[80px]'  // Cerca del botón like en móvil
      : 'top-[35%] right-[120px]'      // Cerca del botón like en desktop
  }`}
  style={{ 
    animation: 'bounce 0.5s ease-in-out 3'
  }}
>
      <div className={`${
        isAlreadyEarned 
          ? 'bg-gradient-to-r from-gray-500 to-gray-600' 
          : 'bg-gradient-to-r from-purple-500 to-pink-500'
        } text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 transform transition-all duration-300`}>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <Icon name={isAlreadyEarned ? "Info" : "Star"} size={20} className={isAlreadyEarned ? "text-gray-300" : "text-yellow-300"} />
        </div>
        <div>
          {isAlreadyEarned ? (
            <>
              <p className="font-bold text-lg">Ya ganaste puntos</p>
              <p className="text-sm text-gray-100 whitespace-nowrap">con este reel</p>
            </>
          ) : (
            <>
              <p className="font-bold text-lg">+{points} puntos</p>
              {message && <p className="text-sm text-purple-100 whitespace-nowrap">{message}</p>}
            </>
          )}
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
  
  // Estados de contadores en tiempo real (optimistic updates)
  const [videoCounters, setVideoCounters] = useState({});
  
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
    message: '',
    isAlreadyEarned: false
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
  // INICIALIZAR CONTADORES DE VIDEOS
  // ===============================
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

  // ===============================
  // FUNCIÓN PARA MOSTRAR NOTIFICACIÓN DE PUNTOS
  // ===============================
  const showPointsEarned = useCallback((points, message = '', isAlreadyEarned = false) => {
    console.log('🎉 Mostrando notificación de puntos:', points, message, 'Ya ganado:', isAlreadyEarned);
    setPointsNotification({ show: true, points, message, isAlreadyEarned });
    if (onPointsEarned && !isAlreadyEarned) {
      onPointsEarned(points);
    }
  }, [onPointsEarned]);

  const hidePointsNotification = useCallback(() => {
    setPointsNotification({ show: false, points: 0, message: '', isAlreadyEarned: false });
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
  // AUTOPLAY Y GESTIÓN DE VIDEOS
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
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
        }
      });

      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
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
        console.log('⏸️ Video pausado por usuario en:', currentVideo.currentTime);
        currentVideo.pause();
      }
    }
  }, [currentIndex, isAutoPlaying, videos, mutedVideos, getInitialReelIndex]);

  // ===============================
  // TRACKING DE VISUALIZACIÓN Y VISTAS
  // ===============================
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

        try {
          const { error } = await supabase.rpc('increment_video_views', { 
            video_id: currentVideoData.id 
          });
          
          if (error) {
            console.error('Error incrementando vistas:', error);
          } else {
            console.log('✅ Vista registrada para video:', currentVideoData.id);
          }
        } catch (err) {
          console.error('Error al incrementar vistas:', err);
        }
      }
      
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
  // PLAY/PAUSE
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
      const isCurrentlyLiked = newLikedVideos.has(videoId);
      
      console.log('👍 Estado del like:', {
        videoId,
        wasAlreadyLiked,
        isCurrentlyLiked,
        actionsPerformed: Array.from(actionsPerformed.likes)
      });
      
      if (isCurrentlyLiked) {
        // Quitar like (NO modificar actionsPerformed aquí)
        newLikedVideos.delete(videoId);
        
        setVideoCounters(prev => ({
          ...prev,
          [videoId]: {
            ...prev[videoId],
            likes: Math.max(0, (prev[videoId]?.likes || 0) - 1)
          }
        }));
        
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_video_likes', { video_id: videoId });
        
        console.log('✅ Like removido');
      } else {
        // Dar like
        newLikedVideos.add(videoId);
        newDislikedVideos.delete(videoId);

        setVideoCounters(prev => ({
          ...prev,
          [videoId]: {
            ...prev[videoId],
            likes: (prev[videoId]?.likes || 0) + 1
          }
        }));

        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_likes', { video_id: videoId });

        // Verificar si ya había ganado puntos ANTES
        if (wasAlreadyLiked) {
          // Ya ganó puntos con este reel antes
          console.log('⚠️ Usuario ya ganó puntos con este reel');
          showPointsEarned(0, '', true);
        } else {
          // Primera vez que da like a este reel, gana puntos
          console.log('🎉 Primera vez dando like, ganando puntos');
          try {
            await addFreePoints(5, 'Like en video', 'video', videoId);
            const missionResult = await missionsService.trackGiveLike('video', videoId);
            if (missionResult.completed) {
              showPointsEarned(missionResult.reward.points, missionResult.message, false);
            } else {
              showPointsEarned(5, 'Like en video', false);
            }
            
            // Marcar que ya ganó puntos con este video (SOLO la primera vez)
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

      const newFollowedCreators = new Set(followedCreators);
      const isCurrentlyFollowing = newFollowedCreators.has(creatorId);

      if (isCurrentlyFollowing) {
        newFollowedCreators.delete(creatorId);
        
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creatorId);
        
        console.log('✅ Dejaste de seguir al creador:', creatorId);
      } else {
        newFollowedCreators.add(creatorId);
        
        await supabase
          .from('follows')
          .insert({ 
            follower_id: user.id, 
            following_id: creatorId 
          });

        const wasAlreadyFollowed = actionsPerformed.follows.has(creatorId);
        
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
      }
      
      setFollowedCreators(newFollowedCreators);
    } catch (error) {
      console.error('Error siguiendo/dejando de seguir creador:', error);
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

      if (!replyingTo) {
        setVideoCounters(prev => ({
          ...prev,
          [videoId]: {
            ...prev[videoId],
            comments: (prev[videoId]?.comments || 0) + 1
          }
        }));
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

  const getVideoCounter = (videoId, type) => {
    return videoCounters[videoId]?.[type] || 0;
  };

  // ===============================
  // RENDERIZADO
  // ===============================
  
  const currentVideo = videos[currentIndex];

  if (videos.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-900 text-white">
        <Icon name="Video" size={48} className="text-pink-500 mb-4" />
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
    <>
      <FloatingPointsNotification
        points={pointsNotification.points}
        message={pointsNotification.message}
        show={pointsNotification.show}
        onHide={hidePointsNotification}
        isMobile={isMobile}
        isAlreadyEarned={pointsNotification.isAlreadyEarned}
      />
      
      <div className="relative w-full h-full bg-white overflow-hidden">
        <div className="flex h-full w-full items-center justify-center">
          <div 
            className={`
              relative overflow-hidden flex-shrink-0
              ${isDesktop 
                ? showCommentsModal 
                  ? 'w-[55%]' 
                  : 'w-full max-w-[500px]'
                : 'w-full'
              }
              ${isDesktop ? 'h-[80vh] rounded-xl shadow-2xl' : 'h-full'}
            `}
          >
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
                <div 
                  key={video.id} 
                  className="w-full h-full flex-shrink-0 relative bg-black snap-start"
                  style={{ height: '100%' }}
                >
                  <video
                    ref={el => videoRefs.current[index] = el}
                    className="absolute w-full h-full object-cover"
                    src={video.video_url || video.videoUrl}
                    loop
                    playsInline
                    preload="auto"
                    onLoadedData={() => setLoadingVideo(false)}
                    onError={(e) => console.error('Error de video:', e)}
                  />

                  {loadingVideo && index === currentIndex && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                      <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  {isMobile && (
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
                          
                          {currentUser?.id !== video.creator?.id && (
                            <button
                              onClick={(e) => handleFollow(video.creator?.id, e)}
                              className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                                followedCreators.has(video.creator?.id)
                                  ? 'bg-white/20 text-white border border-white/30'
                                  : 'bg-pink-600 text-white hover:bg-pink-700'
                              }`}
                            >
                              {followedCreators.has(video.creator?.id) ? 'Siguiendo' : 'Seguir'}
                            </button>
                          )}
                          
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
                  )}

                  {isDesktop && (
                    <div 
                      className="absolute bottom-4 left-4 right-4 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center space-x-2 mb-2">
                          <Link 
                            to={`/profile/${video.creator?.id}`} 
                            className="font-bold hover:underline text-base text-white drop-shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{video.creator?.username || video.creator?.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}
                          </Link>
                          
                          {currentUser?.id !== video.creator?.id && (
                            <button
                              onClick={(e) => handleFollow(video.creator?.id, e)}
                              className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                                followedCreators.has(video.creator?.id)
                                  ? 'bg-white/20 text-white border border-white/30'
                                  : 'bg-pink-600 text-white hover:bg-pink-700'
                              }`}
                            >
                              {followedCreators.has(video.creator?.id) ? 'Siguiendo' : 'Seguir'}
                            </button>
                          )}
                          
                          <span className="text-gray-200 text-sm">•</span>
                          <span className="text-gray-200 text-sm">{video.timeAgo || 'Reciente'}</span>
                        </div>

                        <div className="mb-2">
                          <p className="text-sm leading-relaxed line-clamp-2 text-white drop-shadow-lg">
                            {video.description || video.title}
                          </p>
                        </div>

                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {video.tags.slice(0, 3).map((tag, tagIndex) => (
                              <span key={tagIndex} className="text-xs font-semibold text-white drop-shadow-lg">
                                #{tag}
                              </span>
                            ))}
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
                    <div 
                      className="h-full bg-red-500 transition-all"
                      style={{ 
                        width: index === currentIndex ? '100%' : '0%',
                        transitionDuration: index === currentIndex ? `${video.duration || 30}s` : '0s',
                        transitionTimingFunction: 'linear'
                      }}
                    />
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

          {currentVideo && (
            <>
              {isMobile && (
                <div 
                  className="absolute bottom-20 right-4 flex flex-col items-center space-y-5 z-10"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="relative">
                    <Link 
                      to={`/profile/${currentVideo.creator?.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                        {currentVideo.creator?.avatar ? (
                          <img src={currentVideo.creator.avatar} alt={currentVideo.creator.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {currentVideo.creator?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                    
                    {!followedCreators.has(currentVideo.creator?.id) && (
                      <button
                        onClick={(e) => handleFollow(currentVideo.creator?.id, e)}
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <Icon name="Plus" size={16} color="white" />
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={(e) => handleLike(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1"
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${likedVideos.has(currentVideo.id) ? 'text-red-500' : 'text-white hover:scale-110'}`}>
                      <Icon name="ThumbsUp" size={26} className={likedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                    </div>
                    <span className="font-semibold text-xs text-white">{formatCount(getVideoCounter(currentVideo.id, 'likes'))}</span>
                  </button>

                  <button 
                    onClick={(e) => handleDislike(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1"
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${dislikedVideos.has(currentVideo.id) ? 'text-gray-400' : 'text-white hover:scale-110'}`}>
                      <Icon name="ThumbsDown" size={26} className={dislikedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                    </div>
                  </button>

                  <button 
                    onClick={(e) => handleOpenComments(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1"
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                      <Icon name="MessageCircle" size={26} />
                    </div>
                    <span className="font-semibold text-xs text-white">{formatCount(getVideoCounter(currentVideo.id, 'comments'))}</span>
                  </button>

                  <button 
                    onClick={(e) => handleSave(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1"
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${savedVideos.has(currentVideo.id) ? 'text-yellow-400' : 'text-white hover:scale-110'}`}>
                      <Icon name="Bookmark" size={26} className={savedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                    </div>
                  </button>

                  <button 
                    onClick={(e) => handleShare(currentVideo, e)} 
                    className="flex flex-col items-center space-y-1"
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                      <Icon name="Share2" size={26} />
                    </div>
                  </button>

                  <button 
                    onClick={(e) => handleMuteToggle(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1"
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                      <Icon name={mutedVideos.has(currentVideo.id) ? 'VolumeX' : 'Volume2'} size={26} />
                    </div>
                  </button>

                  <button 
                    className="flex flex-col items-center mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                        <Icon name="Music" size={18} color="white" />
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {isDesktop && (
                <div 
                  className="flex flex-col items-center space-y-6 ml-6 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative">
                    <Link 
                      to={`/profile/${currentVideo.creator?.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-300 shadow-lg hover:scale-110 transition-transform bg-white">
                        {currentVideo.creator?.avatar ? (
                          <img 
                            src={currentVideo.creator.avatar} 
                            alt={currentVideo.creator.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">
                              {currentVideo.creator?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                    
                    {!followedCreators.has(currentVideo.creator?.id) && (
                      <button
                        onClick={(e) => handleFollow(currentVideo.creator?.id, e)}
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110"
                      >
                        <Icon name="Plus" size={18} color="white" />
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={(e) => handleLike(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${likedVideos.has(currentVideo.id) ? 'bg-red-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-red-50'}`}>
                      <Icon name="ThumbsUp" size={28} className={likedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                    </div>
                    <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                      {formatCount(getVideoCounter(currentVideo.id, 'likes'))}
                    </span>
                  </button>

                  <button 
                    onClick={(e) => handleDislike(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${dislikedVideos.has(currentVideo.id) ? 'bg-gray-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-gray-50'}`}>
                      <Icon name="ThumbsDown" size={28} className={dislikedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                    </div>
                  </button>

                  <button 
                    onClick={(e) => handleOpenComments(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-blue-50">
                      <Icon name="MessageCircle" size={28} />
                    </div>
                    <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                      {formatCount(getVideoCounter(currentVideo.id, 'comments'))}
                    </span>
                  </button>

                  <button 
                    onClick={(e) => handleSave(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${savedVideos.has(currentVideo.id) ? 'bg-yellow-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-yellow-50'}`}>
                      <Icon name="Bookmark" size={28} className={savedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                    </div>
                  </button>

                  <button 
                    onClick={(e) => handleShare(currentVideo, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-green-50">
                      <Icon name="Share2" size={28} />
                    </div>
                  </button>

                  <button 
                    onClick={(e) => handleMuteToggle(currentVideo.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-purple-50">
                      <Icon name={mutedVideos.has(currentVideo.id) ? 'VolumeX' : 'Volume2'} size={28} />
                    </div>
                  </button>

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
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ReelsContainer;
