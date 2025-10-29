import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
const ReelsContainer = ({ videos = [], onPointsEarned, initialVideoId = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  // ===============================
  // ESTADOS
  // ===============================
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [dislikedVideos, setDislikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [followedCreators, setFollowedCreators] = useState(new Set());
  const [enableTransition, setEnableTransition] = useState(true);
  
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

  // Estados de tracking de misiones
  const [videoWatchedIds, setVideoWatchedIds] = useState(new Set());

  // ===============================
  // REFS
  // ===============================
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const videoWatchTimeRef = useRef({});

  // ===============================
  // CARGAR VIDEO INICIAL (PROBLEMA 4 - RESUELTO)
  // ===============================
  useEffect(() => {
    if (initialVideoId && videos.length > 0) {
      const foundIndex = videos.findIndex(v => v.id === initialVideoId);
      if (foundIndex !== -1 && foundIndex !== currentIndex) {
        setEnableTransition(false);
        setCurrentIndex(foundIndex);
        setTimeout(() => setEnableTransition(true), 50);
      }
    }
  }, [initialVideoId, videos]);

  // ===============================
  // CARGAR USUARIO ACTUAL
  // ===============================
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Cargar perfil del usuario
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
        }
      } catch (error) {
        console.error('Error cargando usuario:', error);
      }
    };
    
    loadCurrentUser();
  }, []);

  // ===============================
  // FUNCIÓN PARA MOSTRAR NOTIFICACIÓN DE PUNTOS
  // ===============================
  const showPointsEarned = (points, message = '') => {
    setPointsNotification({ show: true, points, message });
    if (onPointsEarned) {
      onPointsEarned(points);
    }
  };

  const hidePointsNotification = () => {
    setPointsNotification({ show: false, points: 0, message: '' });
  };

  // ===============================
  // MANEJO DE VIDEO (PROBLEMA 2 & 6 - RESUELTO)
  // ===============================
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo && isAutoPlaying) {
      // Intentar reproducir
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Autoplay bloqueado, intentando con muted:', error);
          currentVideo.muted = true;
          currentVideo.play().catch(err => console.log('Error en reproducción:', err));
        });
      }
    }

    // Pausar otros videos SIN RESETEAR el tiempo (PROBLEMA 2 & 6 RESUELTO)
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
        // ❌ REMOVIDO: video.currentTime = 0; 
        // Ahora el video mantiene su posición al pausar
      }
    });
  }, [currentIndex, isAutoPlaying]);

  // ===============================
  // TRACKING DE VISUALIZACIÓN COMPLETA DE VIDEO (MISIONES)
  // ===============================
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentVideoData = videos[currentIndex];
    
    if (!currentVideo || !currentVideoData) return;

    const handleTimeUpdate = () => {
      const watchedPercent = (currentVideo.currentTime / currentVideo.duration) * 100;
      
      // Si vio más del 80% del video y no se ha registrado antes
      if (watchedPercent > 80 && !videoWatchedIds.has(currentVideoData.id)) {
        setVideoWatchedIds(prev => new Set([...prev, currentVideoData.id]));
        
        // Track misión de ver video
        missionsService.trackWatchVideo(currentVideoData.id, currentVideo.currentTime)
          .then(result => {
            if (result.completed) {
              showPointsEarned(result.reward.points, result.message);
            }
          })
          .catch(error => console.error('Error tracking video watch:', error));
      }
    };

    currentVideo.addEventListener('timeupdate', handleTimeUpdate);
    return () => currentVideo.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentIndex, videos, videoWatchedIds]);

  // ===============================
  // PLAY/PAUSE (PROBLEMA 2 & 6 - RESUELTO)
  // ===============================
  const handlePlayPause = (e) => {
    // Solo pausar/reproducir si se hace clic directamente en el video (PROBLEMA 7 - RESUELTO)
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
        // El video mantiene su currentTime, no se resetea
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
    }
  };

  const navigatePrevious = () => {
    if (currentIndex > 0) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
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

  // Touch/swipe para mobile
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        navigateNext();
      } else {
        navigatePrevious();
      }
    }
  };

  // Scroll para desktop
  useEffect(() => {
    if (!isDesktop) return;

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        navigateNext();
      } else if (e.deltaY < 0) {
        navigatePrevious();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [currentIndex, videos.length, isDesktop]);

  // ===============================
  // ACCIONES CON TRACKING DE MISIONES (PROBLEMA 3 - MEJORADO)
  // ===============================
  
  /**
   * LIKE - Con tracking de misión
   */
  const handleLike = async (videoId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newLikedVideos = new Set(likedVideos);
      const newDislikedVideos = new Set(dislikedVideos);
      
      if (newLikedVideos.has(videoId)) {
        // Quitar like
        newLikedVideos.delete(videoId);
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      } else {
        // Dar like
        newLikedVideos.add(videoId);
        newDislikedVideos.delete(videoId);

        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_likes', { video_id: videoId });

        // Otorgar puntos por like
        try {
          await addFreePoints(5, 'Like en video', 'video', videoId);
          
          // Track misión de dar likes
          const missionResult = await missionsService.trackGiveLike('video', videoId);
          if (missionResult.completed) {
            showPointsEarned(missionResult.reward.points, missionResult.message);
          } else {
            showPointsEarned(5, 'Like en video');
          }
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
          showPointsEarned(5, 'Like en video');
        }
      }
      
      setLikedVideos(newLikedVideos);
      setDislikedVideos(newDislikedVideos);
    } catch (error) {
      console.error('Error en like:', error);
      alert('Error al dar like. Por favor intenta de nuevo.');
    }
  };

  /**
   * DISLIKE
   */
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
        newLikedVideos.delete(videoId);

        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      }
      
      setDislikedVideos(newDislikedVideos);
      setLikedVideos(newLikedVideos);
    } catch (error) {
      console.error('Error en dislike:', error);
      alert('Error al dar dislike. Por favor intenta de nuevo.');
    }
  };

  /**
   * GUARDAR - Con tracking de misión
   */
  const handleSave = async (videoId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newSavedVideos = new Set(savedVideos);
      
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

        try {
          await addFreePoints(2, 'Guardar video', 'video', videoId);
          showPointsEarned(2, 'Video guardado');
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      }
      
      setSavedVideos(newSavedVideos);
    } catch (error) {
      console.error('Error guardando video:', error);
      alert('Error al guardar video. Por favor intenta de nuevo.');
    }
  };

  /**
   * SEGUIR - Con tracking de misión
   */
  const handleFollow = async (creatorId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newFollowedCreators = new Set(followedCreators);
      newFollowedCreators.add(creatorId);
      setFollowedCreators(newFollowedCreators);

      // Registrar follow en BD
      await supabase
        .from('follows')
        .insert({ 
          follower_id: user.id, 
          following_id: creatorId 
        });

      try {
        await addFreePoints(10, 'Seguir creador', 'follow', creatorId);
        
        // Track misión de seguir
        const missionResult = await missionsService.trackFollowUser(creatorId);
        if (missionResult.completed) {
          showPointsEarned(missionResult.reward.points, missionResult.message);
        } else {
          showPointsEarned(10, 'Seguiste a un creador');
        }
      } catch (pointsError) {
        console.error('Error al otorgar puntos:', pointsError);
      }
    } catch (error) {
      console.error('Error siguiendo creador:', error);
      alert('Error al seguir creador. Por favor intenta de nuevo.');
    }
  };

  /**
   * COMPARTIR - Con tracking de misión
   */
  const handleShare = async (video) => {
    try {
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

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await addFreePoints(3, 'Compartir video', 'video', video.id);
          
          // Track misión de compartir
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
        }
      } catch (pointsError) {
        console.error('Error al otorgar puntos:', pointsError);
      }
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  /**
   * TOGGLE MUTE
   */
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
  // SISTEMA DE COMENTARIOS (PROBLEMA 1 - MEJORADO)
  // ===============================
  
  /**
   * Cargar comentarios con retry logic mejorado
   */
  const loadComments = async (videoId, retryCount = 0) => {
    try {
      let { data, error } = await supabase
        .from('video_comments')
        .select('id, video_id, user_id, content, parent_comment_id, created_at, updated_at')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) {
        if (retryCount < 2) {
          console.log(`Retry ${retryCount + 1} cargando comentarios...`);
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
        } else {
          console.warn('Error cargando perfiles de usuarios:', usersError);
          data = data.filter(c => !c.parent_comment_id).map(comment => ({
            ...comment,
            user: {
              id: comment.user_id,
              name: 'Usuario',
              avatar: null,
              username: 'usuario'
            },
            replies: []
          }));
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

  /**
   * Abrir modal de comentarios
   */
  const handleOpenComments = async (videoId) => {
    setShowCommentsModal(true);
    setReplyingTo(null);
    setNewComment('');
    await loadComments(videoId);
  };

  /**
   * Agregar comentario o respuesta - Con tracking de misión
   */
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

      try {
        await addFreePoints(3, replyingTo ? 'Responder comentario' : 'Comentar video', 'video', videoId);
        
        // Track misión de comentar
        const missionResult = await missionsService.trackComment('video', videoId);
        if (missionResult.completed) {
          showPointsEarned(missionResult.reward.points, missionResult.message);
        } else {
          showPointsEarned(3, replyingTo ? 'Respuesta agregada' : 'Comentario agregado');
        }
      } catch (pointsError) {
        console.error('Error al otorgar puntos:', pointsError);
      }

      setNewComment('');
      setReplyingTo(null);
      await loadComments(videoId);
    } catch (error) {
      console.error('Error agregando comentario:', error);
      alert('Error al agregar comentario. Por favor intenta de nuevo.');
    }
  };

  /**
   * Activar modo respuesta (PROBLEMA 1 - RESUELTO)
   */
  const handleReply = (commentId, username) => {
    setReplyingTo(commentId);
    setNewComment(`@${username} `);
    // Dar foco al input
    setTimeout(() => {
      const input = document.querySelector('input[type="text"][placeholder*="comentario"]');
      if (input) input.focus();
    }, 100);
  };

  /**
   * Cancelar respuesta
   */
  const handleCancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  /**
   * Toggle mostrar/ocultar respuestas
   */
  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  /**
   * Formatear contador
   */
  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
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
        key={video.id}
        className="relative flex-shrink-0 bg-black w-full h-screen"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* VIDEO (PROBLEMA 5 - RESUELTO: h-full w-full sin espacios) */}
        <video
          ref={el => videoRefs.current[index] = el}
          src={videoUrl}
          className="w-full h-full object-contain"
          loop
          playsInline
          preload={Math.abs(index - currentIndex) <= 1 ? "auto" : "none"}
          onClick={handlePlayPause}
          autoPlay={isActive}
        />

        {/* CONTROLES LATERALES DERECHOS - SOLO MOBILE (PROBLEMA 7 - RESUELTO) */}
        {!isDesktop && (
          <div 
            className="absolute bottom-20 right-4 flex flex-col items-center space-y-5 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Avatar del Creador + Follow Button */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Link 
                to={`/profile/${video.creator?.id}`}
                className="block"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                  {video.creator?.avatar ? (
                    <img 
                      src={video.creator.avatar} 
                      alt={video.creator.name}
                      className="w-full h-full object-cover"
                    />
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(video.creator?.id);
                  }}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Icon name="Plus" size={16} color="white" />
                </button>
              )}
            </div>

            {/* Like */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
                ${isLiked ? 'text-red-500' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="ThumbsUp" 
                  size={26} 
                  className={isLiked ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-semibold text-xs text-white">
                {formatCount(video.likes || 0)}
              </span>
            </button>

            {/* Dislike */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDislike(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
                ${isDisliked ? 'text-gray-400' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="ThumbsDown" 
                  size={26} 
                  className={isDisliked ? 'fill-current' : ''} 
                />
              </div>
            </button>

            {/* Comentarios */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenComments(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="MessageCircle" size={26} />
              </div>
              <span className="font-semibold text-xs text-white">
                {formatCount(video.comments || 0)}
              </span>
            </button>

            {/* Guardar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
                ${isSaved ? 'text-yellow-400' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="Bookmark" 
                  size={26} 
                  className={isSaved ? 'fill-current' : ''} 
                />
              </div>
            </button>

            {/* Compartir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare(video);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="Share2" size={26} />
              </div>
            </button>

            {/* Volumen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMuteToggle(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon 
                  name={isMuted ? 'VolumeX' : 'Volume2'} 
                  size={26} 
                />
              </div>
            </button>

            {/* Música */}
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center mt-2"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                  <Icon name="Music" size={18} color="white" />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* INFORMACIÓN DEL VIDEO */}
        <div className="absolute bottom-8 left-4 right-24 text-white">
          <div className="flex items-center space-x-2 mb-3">
            <Link 
              to={`/profile/${video.creator?.id}`}
              className="font-bold hover:underline text-base"
              onClick={(e) => e.stopPropagation()}
            >
              @{video.creator?.username || video.creator?.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}
            </Link>
            <span className="text-gray-300 text-sm">•</span>
            <span className="text-gray-300 text-sm">
              {video.timeAgo || 'Reciente'}
            </span>
          </div>

          <div className="mb-3">
            <p className="text-sm leading-relaxed line-clamp-3">
              {video.description || video.title}
            </p>
          </div>

          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {video.tags.slice(0, 3).map((tag, tagIndex) => (
                <span key={tagIndex} className="text-sm font-semibold text-white">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-2 text-sm">
            <Icon name="Music" size={14} color="white" />
            <span className="truncate">
              {video.audioTitle || `Sonido original - ${video.creator?.name || 'Creador'}`}
            </span>
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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex">
      
      {/* NOTIFICACIÓN FLOTANTE DE PUNTOS */}
      <FloatingPointsNotification
        points={pointsNotification.points}
        message={pointsNotification.message}
        show={pointsNotification.show}
        onHide={hidePointsNotification}
      />
      
      {/* CONTENEDOR DE REELS (PROBLEMA 5 - RESUELTO: sin espacios, h-screen exacto) */}
      <div 
        className={`
          h-screen transition-all duration-300
          ${showCommentsModal && isDesktop ? 'w-[60%]' : 'w-full'}
        `}
      >
        <div
          ref={containerRef}
          className={`flex flex-col h-screen ${enableTransition ? 'transition-transform duration-500 ease-out' : ''}`}
          style={{
            transform: `translateY(-${currentIndex * 100}vh)`,
            width: '100%'
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

        {/* CONTROLES LATERALES EXTERNOS - SOLO DESKTOP CUANDO NO HAY MODAL (PROBLEMA 7 - RESUELTO) */}
        {isDesktop && !showCommentsModal && (
          <div 
            className="absolute right-8 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-6 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Avatar */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Link 
                to={`/profile/${videos[currentIndex]?.creator?.id}`}
                className="block"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform">
                  {videos[currentIndex]?.creator?.avatar ? (
                    <img 
                      src={videos[currentIndex].creator.avatar} 
                      alt={videos[currentIndex].creator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {videos[currentIndex]?.creator?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              
              {!followedCreators.has(videos[currentIndex]?.creator?.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(videos[currentIndex]?.creator?.id);
                  }}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110"
                >
                  <Icon name="Plus" size={18} color="white" />
                </button>
              )}
            </div>

            {/* Like */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                ${likedVideos.has(videos[currentIndex]?.id)
                  ? 'bg-red-500 text-white scale-110' 
                  : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-red-50'
                }
              `}>
                <Icon 
                  name="ThumbsUp" 
                  size={28} 
                  className={likedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                {formatCount(videos[currentIndex]?.likes || 0)}
              </span>
            </button>

            {/* Dislike */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDislike(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                ${dislikedVideos.has(videos[currentIndex]?.id)
                  ? 'bg-gray-500 text-white scale-110' 
                  : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-gray-50'
                }
              `}>
                <Icon 
                  name="ThumbsDown" 
                  size={28} 
                  className={dislikedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
                />
              </div>
            </button>

            {/* Comentarios */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenComments(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-blue-50">
                <Icon name="MessageCircle" size={28} />
              </div>
              <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                {formatCount(videos[currentIndex]?.comments || 0)}
              </span>
            </button>

            {/* Guardar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                ${savedVideos.has(videos[currentIndex]?.id)
                  ? 'bg-yellow-500 text-white scale-110' 
                  : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-yellow-50'
                }
              `}>
                <Icon 
                  name="Bookmark" 
                  size={28} 
                  className={savedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
                />
              </div>
            </button>

            {/* Compartir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare(videos[currentIndex]);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-green-50">
                <Icon name="Share2" size={28} />
              </div>
            </button>

            {/* Volumen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMuteToggle(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-purple-50">
                <Icon 
                  name={mutedVideos.has(videos[currentIndex]?.id) ? 'VolumeX' : 'Volume2'} 
                  size={28} 
                />
              </div>
            </button>

            {/* Música */}
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center mt-2"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                  <Icon name="Music" size={20} color="white" />
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* PANEL DE COMENTARIOS - ESTILO YOUTUBE SHORTS */}
      {showCommentsModal && (
        <>
          {/* MOBILE: Modal Fullscreen desde abajo */}
          {!isDesktop && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
              <div className="bg-white rounded-t-3xl w-full h-[75vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-bold text-xl">
                    Comentarios {comments[videos[currentIndex]?.id]?.length > 0 && 
                      `(${comments[videos[currentIndex]?.id]?.length})`}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCommentsModal(false);
                      setReplyingTo(null);
                      setNewComment('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Icon name="X" size={24} />
                  </button>
                </div>

                {/* Lista de comentarios */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {comments[videos[currentIndex]?.id]?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Icon name="MessageCircle" size={48} className="mb-2" />
                      <p className="text-lg">No hay comentarios aún</p>
                      <p className="text-sm">Sé el primero en comentar</p>
                    </div>
                  ) : (
                    comments[videos[currentIndex]?.id]?.map((comment) => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment}
                        onReply={handleReply}
                        onToggleReplies={toggleReplies}
                        showReplies={showReplies}
                      />
                    ))
                  )}
                </div>

                {/* Input de comentario */}
                <CommentInput
                  currentUser={currentUser}
                  newComment={newComment}
                  setNewComment={setNewComment}
                  replyingTo={replyingTo}
                  onCancelReply={handleCancelReply}
                  onSubmit={() => handleAddComment(videos[currentIndex]?.id)}
                />
              </div>
            </div>
          )}

          {/* DESKTOP: Panel lateral derecho estilo YouTube */}
          {isDesktop && (
            <div className="w-[40%] h-screen bg-white flex flex-col border-l border-gray-200 z-40">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold text-xl">
                  Comentarios {comments[videos[currentIndex]?.id]?.length || 0}
                </h3>
                <button
                  onClick={() => {
                    setShowCommentsModal(false);
                    setReplyingTo(null);
                    setNewComment('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Icon name="ChevronRight" size={24} />
                </button>
              </div>

              {/* Lista de comentarios */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments[videos[currentIndex]?.id]?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Icon name="MessageCircle" size={48} className="mb-2" />
                    <p className="text-lg">No hay comentarios aún</p>
                    <p className="text-sm">Sé el primero en comentar</p>
                  </div>
                ) : (
                  comments[videos[currentIndex]?.id]?.map((comment) => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment}
                      onReply={handleReply}
                      onToggleReplies={toggleReplies}
                      showReplies={showReplies}
                    />
                  ))
                )}
              </div>

              {/* Input de comentario */}
              <CommentInput
                currentUser={currentUser}
                newComment={newComment}
                setNewComment={setNewComment}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
                onSubmit={() => handleAddComment(videos[currentIndex]?.id)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ===============================
// COMPONENTE DE COMENTARIO
// ===============================
const CommentItem = ({ comment, onReply, onToggleReplies, showReplies }) => {
  return (
    <div className="space-y-2">
      {/* Comentario Principal */}
      <div className="flex space-x-3">
        <Link 
          to={`/profile/${comment.user?.id}`}
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {comment.user?.avatar ? (
              <img 
                src={comment.user.avatar} 
                alt={comment.user.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                {comment.user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1">
          <div className="bg-gray-100 rounded-2xl px-4 py-2">
            <Link 
              to={`/profile/${comment.user?.id}`}
              className="font-semibold text-sm hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {comment.user?.name || 'Usuario'}
            </Link>
            <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-1 px-2">
            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('es', { 
                day: 'numeric', 
                month: 'short' 
              })}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(comment.id, comment.user?.name || comment.user?.username || 'Usuario');
              }}
              className="text-xs font-semibold text-gray-600 hover:text-purple-600 transition-colors"
            >
              Responder
            </button>
            {comment.replies?.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleReplies(comment.id);
                }}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors flex items-center space-x-1"
              >
                <Icon 
                  name={showReplies[comment.id] ? "ChevronUp" : "ChevronDown"} 
                  size={14} 
                />
                <span>
                  {showReplies[comment.id] ? 'Ocultar' : 'Ver'} {comment.replies.length} {comment.replies.length === 1 ? 'respuesta' : 'respuestas'}
                </span>
              </button>
            )}
          </div>

          {/* Respuestas */}
          {showReplies[comment.id] && comment.replies?.length > 0 && (
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex space-x-2">
                  <Link 
                    to={`/profile/${reply.user?.id}`}
                    className="flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      {reply.user?.avatar ? (
                        <img 
                          src={reply.user.avatar} 
                          alt={reply.user.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                          {reply.user?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-2xl px-3 py-2">
                      <Link 
                        to={`/profile/${reply.user?.id}`}
                        className="font-semibold text-sm hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {reply.user?.name || 'Usuario'}
                      </Link>
                      <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
                    </div>
                    <span className="text-xs text-gray-500 px-2 mt-1 inline-block">
                      {new Date(reply.created_at).toLocaleDateString('es', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===============================
// COMPONENTE DE INPUT DE COMENTARIO
// ===============================
const CommentInput = ({ currentUser, newComment, setNewComment, replyingTo, onCancelReply, onSubmit }) => {
  return (
    <div className="p-4 border-t bg-white">
      {replyingTo && (
        <div className="mb-2 px-3 py-2 bg-purple-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="CornerDownRight" size={16} className="text-purple-600" />
            <span className="text-sm text-purple-700">
              Respondiendo a comentario
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelReply();
            }}
            className="text-purple-600 hover:text-purple-800"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
      )}

      <div className="flex space-x-2">
        {currentUser && (
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {currentUser.avatar ? (
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                {currentUser.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        )}
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyingTo ? "Escribe tu respuesta..." : "Agrega un comentario..."}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onSubmit();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSubmit();
          }}
          disabled={!newComment.trim()}
          className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
        >
          <Icon name={replyingTo ? "CornerDownRight" : "Send"} size={18} />
        </button>
      </div>
    </div>
  );
};

export default ReelsContainer;
