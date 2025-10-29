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
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  if (!show) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-bounce-in">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 transform transition-all duration-300 hover:scale-105">
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

  console.log('🎬 ReelsContainer render:', {
    videosCount: videos.length,
    currentIndex,
    selectedReelId,
    enableTransition,
    hasPlayedInitial: hasPlayedInitial.current,
    isMobile,
    isDesktop
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
          // Cargar perfil
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, name, avatar, username')
            .eq('id', user.id)
            .single();
          
          setCurrentUser(profile || { 
            id: user.id, 
            name: 'Usuario', 
            avatar: null, 
            username: user.email?.split('@')[0] || 'usuario'
          });

          // Cargar likes previos
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

          // Cargar videos guardados previos
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

          // Cargar follows previos
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

      // Pausar todos los otros videos
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
        }
      });

      // Configurar y reproducir el video actual
      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video inicial reproduciendo correctamente');
            hasPlayedInitial.current = true;
          })
          .catch(err => {
            console.error('❌ Error autoplay inicial:', err);
            currentVideo.muted = true;
            currentVideo.play()
              .then(() => {
                console.log('✅ Video inicial reproduciendo (muted)');
                hasPlayedInitial.current = true;
              })
              .catch(e => console.error('❌ Error crítico:', e));
          });
      }
    };

    setTimeout(attemptPlay, 250);
  }, [videos, currentIndex, mutedVideos]);

  // ===============================
  // RESPONSIVE DETECTION
  // ===============================
  useEffect(() => {
    const handleResize = () => {
      // Forzar re-render cuando cambia el tamaño
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    if (currentVideo && isAutoPlaying) {
      // Pausar todos los otros videos
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
        }
      });

      // Reproducir video actual
      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      currentVideo.currentTime = 0; // Reiniciar desde el inicio
      
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video reproduciendo (autoplay)');
          })
          .catch(err => {
            console.log('Autoplay bloqueado:', err);
            currentVideo.muted = true;
            currentVideo.play().catch(e => console.log('Error:', e));
          });
      }
    } else if (currentVideo && !isAutoPlaying) {
      currentVideo.pause();
    }
  }, [currentIndex, isAutoPlaying, videos, mutedVideos, getInitialReelIndex]);

  // ===============================
  // TRACKING DE VISUALIZACIÓN
  // ===============================
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentVideoData = videos[currentIndex];
    
    if (!currentVideo || !currentVideoData) return;

    // Handlers para el estado de carga
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
  // PLAY/PAUSE (MANTIENE POSICIÓN)
  // ===============================
  const handlePlayPause = (e) => {
    if (e.target.tagName === 'VIDEO') {
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
  };

  // ===============================
  // NAVEGACIÓN
  // ===============================
  const navigateNext = () => {
    if (currentIndex < videos.length - 1) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev + 1);
      setIsAutoPlaying(true); // Asegurar que se reproduzca automáticamente
    }
  };

  const navigatePrevious = () => {
    if (currentIndex > 0) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev - 1);
      setIsAutoPlaying(true); // Asegurar que se reproduzca automáticamente
    }
  };

  // Touch para mobile
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

  // Navegación con teclado
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  // ===============================
  // ACCIONES
  // ===============================
  
  const handleLike = async (videoId) => {
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
        // Quitar like
        newLikedVideos.delete(videoId);
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_video_likes', { video_id: videoId });
      } else {
        // Agregar like
        newLikedVideos.add(videoId);
        newDislikedVideos.delete(videoId);

        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_likes', { video_id: videoId });

        // Solo dar puntos si es la primera vez que da like a este video
        if (!wasAlreadyLiked) {
          try {
            await addFreePoints(5, 'Like en video', 'video', videoId);
            const missionResult = await missionsService.trackGiveLike('video', videoId);
            if (missionResult.completed) {
              showPointsEarned(missionResult.reward.points, missionResult.message);
            } else {
              showPointsEarned(5, 'Like en video');
            }
            
            // Marcar como acción realizada
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

  const handleDislike = async (videoId) => {
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
        
        // Si tenía like, quitarlo
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

  const handleSave = async (videoId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newSavedVideos = new Set(savedVideos);
      const wasAlreadySaved = actionsPerformed.saves.has(videoId);
      
      if (newSavedVideos.has(videoId)) {
        // Quitar guardado
        newSavedVideos.delete(videoId);
        await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      } else {
        // Agregar guardado
        newSavedVideos.add(videoId);
        await supabase
          .from('saved_videos')
          .insert({ video_id: videoId, user_id: user.id });

        // Solo dar puntos si es la primera vez que guarda este video
        if (!wasAlreadySaved) {
          try {
            await addFreePoints(2, 'Guardar video', 'video', videoId);
            showPointsEarned(2, 'Video guardado');
            
            // Marcar como acción realizada
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

  const handleFollow = async (creatorId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      if (followedCreators.has(creatorId)) {
        // Ya sigue al creador, no hacer nada
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

      // Solo dar puntos si es la primera vez que sigue a este creador
      if (!wasAlreadyFollowed) {
        try {
          await addFreePoints(10, 'Seguir creador', 'follow', creatorId);
          const missionResult = await missionsService.trackFollowUser(creatorId);
          if (missionResult.completed) {
            showPointsEarned(missionResult.reward.points, missionResult.message);
          } else {
            showPointsEarned(10, 'Seguiste a un creador');
          }
          
          // Marcar como acción realizada
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

  const handleShare = async (video) => {
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

      // Solo dar puntos si es la primera vez que comparte este video
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
            
            // Marcar como acción realizada
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

  const handleMuteToggle = (videoId) => {
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

          data = data.map(comment => ({
            ...comment,
            user: usersMap[comment.user_id] || {
              id: comment.user_id,
              name: 'Usuario',
              avatar: null,
              username: 'usuario'
            },
            replies: []
          }));

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

  const handleOpenComments = async (videoId) => {
    console.log('🗨️ Abriendo modal de comentarios para video:', videoId);
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
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: replyingTo
        });

      if (error) throw error;

      if (!replyingTo) {
        await supabase.rpc('increment_video_comments', { video_id: videoId });
      }

      const wasAlreadyCommented = actionsPerformed.comments.has(videoId);

      // Solo dar puntos si es la primera vez que comenta en este video
      if (!wasAlreadyCommented) {
        try {
          await addFreePoints(3, replyingTo ? 'Responder comentario' : 'Comentar video', 'video', videoId);
          const missionResult = await missionsService.trackComment('video', videoId);
          if (missionResult.completed) {
            showPointsEarned(missionResult.reward.points, missionResult.message);
          } else {
            showPointsEarned(3, replyingTo ? 'Respuesta agregada' : 'Comentario agregado');
          }
          
          // Marcar como acción realizada
          setActionsPerformed(prev => ({
            ...prev,
            comments: new Set([...prev.comments, videoId])
          }));
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      }

      setNewComment('');
      setReplyingTo(null);
      await loadComments(videoId);
    } catch (error) {
      console.error('Error agregando comentario:', error);
      alert('Error al agregar comentario.');
    }
  };

  const handleReply = (commentId, username) => {
    setReplyingTo(commentId);
    setNewComment(`@${username} `);
    setTimeout(() => {
      const input = document.querySelector('textarea[placeholder*="comentario"]');
      if (input) input.focus();
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
  // COMPONENTE DE REEL INDIVIDUAL
  // ===============================
  const ReelItem = ({ video, index, isActive }) => {
    const videoUrl = video.videoUrl || video.video_url;
    const isLiked = likedVideos.has(video.id);
    const isDisliked = dislikedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isMuted = mutedVideos.has(video.id);
    const isFollowing = followedCreators.has(video.creator?.id);

    return (
      <div 
        className="relative flex-shrink-0 bg-black w-full"
        style={{ height: isDesktop ? '80vh' : '100vh' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* VIDEO */}
        <video
          ref={el => videoRefs.current[index] = el}
          src={videoUrl}
          className="w-full h-full object-contain"
          loop
          playsInline
          preload={index === currentIndex ? "auto" : Math.abs(index - currentIndex) === 1 ? "metadata" : "none"}
          onClick={handlePlayPause}
        />

        {/* INDICADOR DE CARGA */}
        {isActive && loadingVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <p className="text-white text-sm">Cargando video...</p>
            </div>
          </div>
        )}

        {/* CONTROLES - SOLO MOBILE */}
        {!isDesktop && (
          <div className="absolute bottom-20 right-4 flex flex-col items-center space-y-5 z-10">
            
            {/* Avatar + Follow */}
            <div className="relative">
              <Link to={`/profile/${video.creator?.id}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                  {video.creator?.avatar ? (
                    <img src={video.creator.avatar} alt={video.creator.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {video.creator?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              
              {!isFollowing && (
                <button
                  onClick={() => handleFollow(video.creator?.id)}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Icon name="Plus" size={16} color="white" />
                </button>
              )}
            </div>

            {/* Like */}
            <button onClick={() => handleLike(video.id)} className="flex flex-col items-center space-y-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isLiked ? 'text-red-500' : 'text-white hover:scale-110'}`}>
                <Icon name="ThumbsUp" size={26} className={isLiked ? 'fill-current' : ''} />
              </div>
              <span className="font-semibold text-xs text-white">{formatCount(video.likes || 0)}</span>
            </button>

            {/* Dislike */}
            <button onClick={() => handleDislike(video.id)} className="flex flex-col items-center space-y-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isDisliked ? 'text-gray-400' : 'text-white hover:scale-110'}`}>
                <Icon name="ThumbsDown" size={26} className={isDisliked ? 'fill-current' : ''} />
              </div>
            </button>

            {/* Comentarios */}
            <button onClick={() => handleOpenComments(video.id)} className="flex flex-col items-center space-y-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="MessageCircle" size={26} />
              </div>
              <span className="font-semibold text-xs text-white">{formatCount(video.comments || 0)}</span>
            </button>

            {/* Guardar */}
            <button onClick={() => handleSave(video.id)} className="flex flex-col items-center space-y-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isSaved ? 'text-yellow-400' : 'text-white hover:scale-110'}`}>
                <Icon name="Bookmark" size={26} className={isSaved ? 'fill-current' : ''} />
              </div>
            </button>

            {/* Compartir */}
            <button onClick={() => handleShare(video)} className="flex flex-col items-center space-y-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="Share2" size={26} />
              </div>
            </button>

            {/* Volumen */}
            <button onClick={() => handleMuteToggle(video.id)} className="flex flex-col items-center space-y-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name={isMuted ? 'VolumeX' : 'Volume2'} size={26} />
              </div>
            </button>

            {/* Música */}
            <button className="flex flex-col items-center mt-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                  <Icon name="Music" size={18} color="white" />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* INFORMACIÓN DEL VIDEO */}
        <div className="absolute bottom-8 left-4 right-24 z-10">
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
            <div className="flex items-center space-x-2 mb-3">
              <Link to={`/profile/${video.creator?.id}`} className="font-bold hover:underline text-base text-white drop-shadow-lg">
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
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  if (videos.length === 0) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <Icon name="VideoOff" size={48} className="mx-auto mb-4" />
          <p>No hay videos disponibles</p>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];

  return (
    <div className={`
      relative overflow-hidden bg-black
      ${isDesktop 
        ? 'max-w-[500px] mx-auto rounded-lg shadow-2xl h-[80vh]' 
        : 'w-full h-full'
      }
    `}>
      
      {/* NOTIFICACIÓN FLOTANTE DE PUNTOS */}
      <FloatingPointsNotification
        points={pointsNotification.points}
        message={pointsNotification.message}
        show={pointsNotification.show}
        onHide={hidePointsNotification}
      />
      
      {/* CONTENEDOR DE REELS */}
      <div
        ref={containerRef}
        className={`flex flex-col h-full ease-out ${enableTransition ? 'transition-transform duration-500' : ''}`}
        style={{
          transform: `translateY(-${currentIndex * (isDesktop ? 80 : 100)}vh)`
        }}
      >
        {videos.map((video, index) => (
          <ReelItem
            key={video.id}
            video={video}
            index={index}
            isActive={index === currentIndex}
          />
        ))}
      </div>

      {/* CONTROLES LATERALES - DESKTOP */}
      {isDesktop && currentVideo && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-6 z-50">
          
          {/* Avatar */}
          <div className="relative">
            <Link to={`/profile/${currentVideo?.creator?.id}`}>
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform">
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
                onClick={() => handleFollow(currentVideo?.creator?.id)}
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110"
              >
                <Icon name="Plus" size={18} color="white" />
              </button>
            )}
          </div>

          {/* Like */}
          <button onClick={() => handleLike(currentVideo?.id)} className="flex flex-col items-center space-y-1 group">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${likedVideos.has(currentVideo?.id) ? 'bg-red-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-red-50'}`}>
              <Icon name="ThumbsUp" size={28} className={likedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
            </div>
            <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
              {formatCount(currentVideo?.likes || 0)}
            </span>
          </button>

          {/* Dislike */}
          <button onClick={() => handleDislike(currentVideo?.id)} className="flex flex-col items-center space-y-1 group">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${dislikedVideos.has(currentVideo?.id) ? 'bg-gray-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-gray-50'}`}>
              <Icon name="ThumbsDown" size={28} className={dislikedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
            </div>
          </button>

          {/* Comentarios */}
          <button onClick={() => handleOpenComments(currentVideo?.id)} className="flex flex-col items-center space-y-1 group">
            <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-blue-50">
              <Icon name="MessageCircle" size={28} />
            </div>
            <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
              {formatCount(currentVideo?.comments || 0)}
            </span>
          </button>

          {/* Guardar */}
          <button onClick={() => handleSave(currentVideo?.id)} className="flex flex-col items-center space-y-1 group">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${savedVideos.has(currentVideo?.id) ? 'bg-yellow-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-yellow-50'}`}>
              <Icon name="Bookmark" size={28} className={savedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
            </div>
          </button>

          {/* Compartir */}
          <button onClick={() => handleShare(currentVideo)} className="flex flex-col items-center space-y-1 group">
            <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-green-50">
              <Icon name="Share2" size={28} />
            </div>
          </button>

          {/* Volumen */}
          <button onClick={() => handleMuteToggle(currentVideo?.id)} className="flex flex-col items-center space-y-1 group">
            <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-purple-50">
              <Icon name={mutedVideos.has(currentVideo?.id) ? 'VolumeX' : 'Volume2'} size={28} />
            </div>
          </button>

          {/* Música */}
          <button className="flex flex-col items-center mt-2">
            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform">
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                <Icon name="Music" size={20} color="white" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* FLECHAS DE NAVEGACIÓN DESKTOP */}
      {isDesktop && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
          <button
            onClick={navigatePrevious}
            disabled={currentIndex === 0}
            className={`
              absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto
              w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full 
              flex items-center justify-center transition-all
              hover:bg-black/70 hover:scale-110
              ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'}
            `}
          >
            <Icon name="ChevronUp" size={24} color="white" />
          </button>

          <button
            onClick={navigateNext}
            disabled={currentIndex === videos.length - 1}
            className={`
              absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto
              w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full 
              flex items-center justify-center transition-all
              hover:bg-black/70 hover:scale-110
              ${currentIndex === videos.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'}
            `}
          >
            <Icon name="ChevronDown" size={24} color="white" />
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

      {/* MODAL DE COMENTARIOS */}
      {showCommentsModal && currentVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseComments();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCloseComments} />
          
          {/* Modal */}
          <div className={`
            relative bg-white rounded-t-3xl md:rounded-2xl shadow-2xl
            w-full md:w-[480px] md:max-w-[90vw]
            ${isDesktop ? 'h-[600px]' : 'h-[75vh]'}
            flex flex-col
            animate-slide-up
          `}>
            {/* Header */}
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

            {/* Lista de comentarios */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments[currentVideo.id]?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Icon name="MessageCircle" size={48} className="mb-2" />
                  <p>No hay comentarios aún</p>
                  <p className="text-sm">Sé el primero en comentar</p>
                </div>
              ) : (
                comments[currentVideo.id]?.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    {/* Comentario principal */}
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
                            {comment.user?.username || comment.user?.name || 'Usuario'}
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

                        {/* Respuestas */}
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
                                          {reply.user?.username || reply.user?.name || 'Usuario'}
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

            {/* Input de comentario */}
            <div className="border-t border-gray-200 p-4">
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
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Agrega un comentario..."
                    rows={1}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(currentVideo.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleAddComment(currentVideo.id)}
                    disabled={!newComment.trim()}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      newComment.trim() 
                        ? 'bg-purple-500 hover:bg-purple-600 text-white' 
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
  );
};

export default ReelsContainer;
