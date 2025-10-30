import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { addFreePoints } from 'services/pointsService';
import * as missionsService from 'services/missionsService';
import Icon from 'components/AppIcon';
import useIsMobile from 'hooks/useIsMobile';

// ===============================
// COMPONENTE DE NOTIFICACIÓN FLOTANTE DE PUNTOS (MODIFICADO)
// ===============================
// Acepta la posición dinámica (top, left)
const FloatingPointsNotification = ({ points, message, show, onHide, position }) => {
  useEffect(() => {
    if (show) {
      console.log('🎉 Mostrando notificación de puntos:', points, message);
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  // Si no se muestra o no hay posición, no renderizar
  if (!show || !position) return null;

  return (
    // CAMBIO CLAVE: Usamos 'absolute' en lugar de 'fixed' y usamos la posición dinámica
    <div 
      className="absolute pointer-events-none" // 'absolute' para ser relativo al contenedor principal
      style={{ 
        zIndex: 99999,
        top: position.top, // Coordenada Y del botón de Like
        left: position.left, // Coordenada X del botón de Like
        // Trasladar para posicionar la notificación justo encima/al lado del icono
        transform: 'translate(-50%, -120%)', // Mueve 50% a la izquierda (centrando) y 120% hacia arriba (encima del botón)
        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out'
      }}
    >
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 transform transition-all duration-300 animate-fade-in-up">
        <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <Icon name="Star" size={14} className="text-yellow-300" />
        </div>
        <div>
          <p className="font-bold text-sm whitespace-nowrap">+{points} puntos</p>
          {/* Opcionalmente mostrar un mensaje más corto si hay espacio */}
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

  // Estados de notificación de puntos (MODIFICADO)
  const [pointsNotification, setPointsNotification] = useState({
    show: false,
    points: 0,
    message: '',
    position: null, // NUEVO: Posición { top: 'Ypx', left: 'Xpx' }
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
  // NUEVO: Ref para el botón de Like
  const likeButtonRef = useRef(null);

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
    console.log('    🆔 ID buscado:', selectedReelId);
    console.log('    📍 Índice encontrado:', index);
    console.log('    📹 Video:', index >= 0 ? videos[index]?.title : 'No encontrado');
    
    if (index < 0) {
      console.warn('⚠️ Video con ID', selectedReelId, 'no encontrado');
      return 0;
    }
    
    return index;
  }, [selectedReelId, videos]);

  // ===============================
  // ... (Sincronización inicial y carga de usuario)
  // ===============================

  useEffect(() => {
    if (videos.length === 0) return;
    
    const correctIndex = getInitialReelIndex();
    
    console.log('🎯 Sincronizando estado inicial');
    console.log('    🆔 selectedReelId:', selectedReelId);
    console.log('    🎯 Índice calculado:', correctIndex);
    console.log('    📹 Video a reproducir:', videos[correctIndex]?.title || 'No existe');
    
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
  // FUNCIÓN PARA MOSTRAR NOTIFICACIÓN DE PUNTOS (MODIFICADO)
  // ===============================
  const showPointsEarned = useCallback((points, message = '', position = null) => {
    console.log('🎉 Mostrando notificación de puntos:', points, message, position);
    // Guardar la posición en el estado
    setPointsNotification({ show: true, points, message, position });
    if (onPointsEarned) {
      onPointsEarned(points);
    }
  }, [onPointsEarned]);

  const hidePointsNotification = useCallback(() => {
    // Reiniciar la posición al ocultar
    setPointsNotification({ show: false, points: 0, message: '', position: null }); 
  }, []);

  // ===============================
  // ... (Lógica de Autoplay, Navegación, Vistas)
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
      
      // Contar vista al 30% de reproducción (solo una vez por video)
      if (watchedPercent > 30 && !viewCounted && !videoWatchedIds.has(currentVideoData.id)) {
        viewCounted = true;
        
        // Incrementar contador local inmediatamente (optimistic update)
        setVideoCounters(prev => ({
          ...prev,
          [currentVideoData.id]: {
            ...prev[currentVideoData.id],
            views: (prev[currentVideoData.id]?.views || 0) + 1
          }
        }));

        // Actualizar en base de datos
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
      
      // Tracking de misión al 80%
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
  // ACCIONES (MODIFICADO)
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
      
      if (isCurrentlyLiked) {
        // Quitar like
        newLikedVideos.delete(videoId);
        
        // Actualizar contador local inmediatamente (optimistic update)
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
      } else {
        // Dar like
        newLikedVideos.add(videoId);
        newDislikedVideos.delete(videoId);

        // Actualizar contador local inmediatamente (optimistic update)
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

        // Mostrar notificación de puntos solo si es la primera vez
        if (!wasAlreadyLiked) {
          // --- NUEVO CÓDIGO PARA CALCULAR LA POSICIÓN ---
          let position = null;
          if (likeButtonRef.current && containerRef.current) {
            // Obtener la posición absoluta del botón y el contenedor
            const buttonRect = likeButtonRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();

            // Calcular la posición relativa al contenedor principal
            position = {
              // Restar la posición del contenedor para obtener la coordenada relativa
              top: `${buttonRect.top - containerRect.top}px`, 
              // Usamos el centro del botón como referencia X
              left: `${buttonRect.left - containerRect.left + buttonRect.width / 2}px` 
            };
            console.log('Calculando posición del like:', position);
          }
          // ---------------------------------------------
          
          try {
            await addFreePoints(5, 'Like en video', 'video', videoId);
            const missionResult = await missionsService.trackGiveLike('video', videoId);
            if (missionResult.completed) {
              // Pasar la posición calculada
              showPointsEarned(missionResult.reward.points, missionResult.message, position);
            } else {
              // Pasar la posición calculada
              showPointsEarned(5, 'Like en video', position);
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

      const newFollowedCreators = new Set(followedCreators);
      const isCurrentlyFollowing = newFollowedCreators.has(creatorId);

      if (isCurrentlyFollowing) {
        // Dejar de seguir
        newFollowedCreators.delete(creatorId);
        
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creatorId);
        
        console.log('✅ Dejaste de seguir al creador:', creatorId);
      } else {
        // Seguir
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
  // ... (Sistema de comentarios)
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
    // ... (El resto del código de comentarios, que fue cortado en el prompt, iría aquí)
  };

  // Suponiendo que el resto del código maneja el sistema de comentarios, 
  // la parte crucial es el `return` donde se renderizan los reels.

  // ===============================
  // RENDERIZADO (MODIFICADO)
  // ===============================
  const currentVideo = videos[currentIndex];

  if (videos.length === 0 && loading) {
    return <div className="flex items-center justify-center w-full h-screen bg-black text-white text-lg">Cargando...</div>;
  }

  if (videos.length === 0) {
    return <div className="flex items-center justify-center w-full h-screen bg-black text-white text-lg">No hay videos disponibles.</div>;
  }

  return (
    <div
      ref={containerRef}
      // CAMBIO CLAVE: El contenedor principal DEBE tener position: relative
      className={`reels-container relative w-full h-screen overflow-hidden bg-black ${isDesktop ? 'max-w-md mx-auto' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handlePlayPause}
    >
      {/* ============================================================= */}
      {/* 1. NOTIFICACIÓN FLOTANTE (DEBE ESTAR DENTRO DEL CONTENEDOR RELATIVO) */}
      {/* ============================================================= */}
      <FloatingPointsNotification
        points={pointsNotification.points}
        message={pointsNotification.message}
        show={pointsNotification.show}
        onHide={hidePointsNotification}
        // Se pasa la posición calculada
        position={pointsNotification.position} 
      />
      
      {/* Contenedor de los videos con la transformación de scroll/swipe */}
      <div 
        className={`w-full h-full transform translate-y-[-${currentIndex * 100}vh] ${enableTransition ? 'transition-transform duration-500 ease-in-out' : ''}`}
        style={{ height: `${videos.length * 100}vh` }}
      >
        {videos.map((video, index) => {
          const isCurrent = index === currentIndex;
          const isLiked = likedVideos.has(video.id);
          const isSaved = savedVideos.has(video.id);
          const isFollowed = followedCreators.has(video.creator_id);
          const counters = videoCounters[video.id] || { likes: 0, comments: 0, views: 0 };
          
          return (
            <div 
              key={video.id} 
              className="reel-item w-full h-screen flex-shrink-0 relative bg-black"
            >
              <video
                ref={el => videoRefs.current[index] = el}
                className="w-full h-full object-cover"
                src={video.video_url}
                loop
                playsInline
                preload="metadata"
                onLoadedData={() => setLoadingVideo(false)}
              />

              {loadingVideo && isCurrent && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Icon name="Loader" size={40} className="text-white animate-spin" />
                </div>
              )}

              {/* Controles y Metadata */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 text-white pointer-events-none">
                <div className="flex justify-between items-end pointer-events-auto">
                  {/* Metadata del Creador y Descripción */}
                  <div className="space-y-2">
                    {/* ... (Creator profile info/link) */}
                    <div className="flex items-center space-x-2">
                        {/* Avatar */}
                        <Link to={`/user/${video.creator_username}`} onClick={(e) => e.stopPropagation()}>
                            <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center overflow-hidden">
                                {video.creator_avatar ? (
                                    <img src={video.creator_avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <Icon name="User" size={18} className="text-white" />
                                )}
                            </div>
                        </Link>
                        {/* Username */}
                        <Link to={`/user/${video.creator_username}`} onClick={(e) => e.stopPropagation()} className="font-bold text-lg">
                            @{video.creator_username || 'usuario'}
                        </Link>
                        {/* Botón Seguir */}
                        {currentUser?.id !== video.creator_id && (
                            <button 
                                onClick={(e) => handleFollow(video.creator_id, e)}
                                className={`ml-2 px-3 py-1 text-sm font-semibold rounded-full ${isFollowed ? 'bg-white text-black' : 'bg-pink-500 text-white'}`}
                            >
                                {isFollowed ? 'Siguiendo' : 'Seguir'}
                            </button>
                        )}
                    </div>
                    {/* Descripción */}
                    <p className="text-sm">{video.description}</p>
                  </div>
                  
                  {/* Barra de Acciones (Derecha) */}
                  <div className="flex flex-col space-y-6 text-center pointer-events-auto">
                    
                    {/* 2. BOTÓN DE LIKE CON LA REF ASIGNADA */}
                    <button 
                      ref={isCurrent ? likeButtonRef : null} // **ASIGNACIÓN CLAVE DE LA REF**
                      onClick={(e) => handleLike(video.id, e)}
                      className="flex flex-col items-center focus:outline-none"
                    >
                      <Icon 
                        name="Heart" 
                        size={30} 
                        className={isLiked ? 'text-red-500 transform scale-110' : 'text-white/90'} 
                        fill={isLiked ? 'currentColor' : 'none'}
                        strokeWidth={1.5}
                      />
                      <span className="text-xs font-semibold mt-1">{counters.likes}</span>
                    </button>
                    
                    {/* Botón de Comentarios */}
                    <button 
                      onClick={(e) => handleOpenComments(video.id, e)}
                      className="flex flex-col items-center focus:outline-none"
                    >
                      <Icon name="MessageCircle" size={30} className="text-white/90" strokeWidth={1.5} />
                      <span className="text-xs font-semibold mt-1">{counters.comments}</span>
                    </button>

                    {/* Botón de Guardar */}
                    <button 
                      onClick={(e) => handleSave(video.id, e)}
                      className="flex flex-col items-center focus:outline-none"
                    >
                      <Icon 
                        name="Bookmark" 
                        size={30} 
                        className={isSaved ? 'text-yellow-400' : 'text-white/90'} 
                        fill={isSaved ? 'currentColor' : 'none'}
                        strokeWidth={1.5}
                      />
                      <span className="text-xs font-semibold mt-1">Guardar</span>
                    </button>

                    {/* Botón de Compartir */}
                    <button 
                      onClick={(e) => handleShare(video, e)}
                      className="flex flex-col items-center focus:outline-none"
                    >
                      <Icon name="Share2" size={30} className="text-white/90" strokeWidth={1.5} />
                      <span className="text-xs font-semibold mt-1">Compartir</span>
                    </button>

                  </div>
                </div>
              </div>

              {/* Icono de Mute/Unmute */}
              <button 
                onClick={(e) => handleMuteToggle(video.id, e)}
                className="absolute bottom-4 left-4 p-2 rounded-full bg-black/30 pointer-events-auto z-20"
              >
                <Icon 
                  name={mutedVideos.has(video.id) ? 'VolumeX' : 'Volume2'} 
                  size={20} 
                  className="text-white"
                />
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Indicador de carga adicional/final de la lista */}
      {currentIndex === videos.length - 1 && hasMore && (
        <div className="absolute bottom-0 w-full text-center p-4 bg-black/50 text-white">
          <Icon name="Loader" size={20} className="inline-block animate-spin mr-2" /> Cargando más videos...
        </div>
      )}
      
      {!hasMore && currentIndex === videos.length - 1 && (
        <div className="absolute bottom-0 w-full text-center p-4 bg-black/50 text-white">
          Has llegado al final.
        </div>
      )}

      {/* Modal de Comentarios (Si existe) */}
      {showCommentsModal && (
        // Se asume un componente CommentsModal
        // <CommentsModal ... /> 
        <div className="fixed inset-0 bg-black/70 z-[100000] flex justify-end">
            <div className="w-full max-w-sm bg-white h-full overflow-y-auto">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">Comentarios</h3>
                    <button onClick={() => setShowCommentsModal(false)}>
                        <Icon name="X" size={24} />
                    </button>
                </div>
                {/* Aquí iría la lógica y UI de comentarios */}
                <div className="p-4 text-gray-500">
                    Función de comentarios no implementada en este fragmento.
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReelsContainer;
