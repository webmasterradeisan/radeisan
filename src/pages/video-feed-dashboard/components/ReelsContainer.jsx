// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - VERSION FINAL CORREGIDA
// ✅ CORREGIDO: Verificaciones de seguridad para comment.user
// ✅ CORREGIDO: Estructura JSX del modal
// ✅ NUEVO: Avisos de puntos cerca del botón like
// ✅ CORREGIDO: Sistema de tracking persistente para likes
// ✅ NUEVO: INTEGRACIÓN BOTÓN Y MODAL DE REGALO
// ✅ CORREGIDO: Ruta de importación de GiftPointsModal para evitar el error.
// 🟢 SINCRONIZADO: 'loadCurrentUserAndActions' ahora consulta 'mission_progress'
//    para el anti-farming diario (en lugar de 'user_video_points').
// 🟢 SINCRONIZADO: 'handleLike' ya no da 5 puntos directos y usa
//    la lógica de misión, mostrando notificaciones.
// 🟢 CORREGIDO: Solucionado crash 'handlePlayPause is not defined'.
// 🟢 CORREGIDO: Eliminadas llamadas a RPC 'increment_video_likes' que causaban
//    el error 400.
// 🟢 CORREGIDO: Eliminadas todas las referencias a la tabla 'user_video_points'
//    (que no existe) para prevenir errores '42P01'.
// ✅ CORREGIDO: trackWatchVideo ahora usa parámetros correctos (contentType, contentId, duration)
// ✅ IMPLEMENTADO: trackShareContent completamente funcional con notificaciones
// ✅ IMPLEMENTADO: trackComment completamente funcional con notificaciones
// ✅ IMPLEMENTADO: trackFollowUser completamente funcional con notificaciones
// ✅ MANTENIDO: Layout original respetado al 100%
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { usePoints } from 'contexts/PointsContext';
import { useNotification } from 'contexts/NotificationContext'; // ✅ Sistema de notificaciones global
import * as missionsService from 'services/missionsService';
import Icon from 'components/AppIcon';
import useIsMobile from 'hooks/useIsMobile';
// ✅ CORRECCIÓN DE RUTA DE IMPORTACIÓN (usando alias absoluto asumido o ajustando)
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
  const { addPoints } = usePoints();
  
  // ✅ INTEGRACIÓN CON SISTEMA DE NOTIFICACIONES GLOBAL
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
  
  // ✅ NUEVO: Estado para el Modal de Regalo
  const [showGiftModal, setShowGiftModal] = useState(false); 

  // ✅ NUEVO: Estado para notificaciones de puntos
  const [pointsNotification, setPointsNotification] = useState({
    show: false,
    message: '',
    videoId: null,
    type: 'success' // Añadido para controlar el color
  });

  // Estados de tracking de misiones y acciones realizadas
  const [videoWatchedIds, setVideoWatchedIds] = useState(new Set());
  const [actionsPerformed, setActionsPerformed] = useState({
    likes: new Set(), // Esto ahora significa "misión de like completa hoy"
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
    showCommentsModal,
    showGiftModal // ✅ Nuevo estado de debug
  });

  // ✅ SISTEMA HÍBRIDO: Notificación LOCAL (junto al botón) + GLOBAL (esquina)
  const showPointsNotification = (message, videoId, type = 'success') => {
    console.log('🔔 MOSTRANDO NOTIFICACIÓN HÍBRIDA:', { message, videoId, type });
    
    // 1. NOTIFICACIÓN LOCAL (junto al botón de like - feedback inmediato)
    setPointsNotification({
      show: true,
      message,
      videoId,
      type
    });
    
    // Auto ocultar después de 2 segundos
    setTimeout(() => {
      setPointsNotification({
        show: false,
        message: '',
        videoId: null,
        type: 'success'
      });
    }, 2000);
    
    // 2. NOTIFICACIÓN GLOBAL (esquina superior - mensajes importantes)
    // Solo para misiones completadas y mensajes importantes
    if (message.includes('Misión Completa') || message.includes('puntos') || message.includes('completaste')) {
      if (type === 'success') {
        success(message, { duration: 2500 });
      } else if (type === 'error' || type === 'restriction') {
        warning(message, { duration: 2500 });
      }
    }
  };

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
            .select('id, full_name, avatar_url, username')
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

          // ✅ CARGAR LIKES ACTUALES (para UI)
          const { data: likesData } = await supabase
            .from('video_likes')
            .select('video_id')
            .eq('user_id', user.id);
          
          if (likesData) {
            const likedIds = new Set(likesData.map(l => l.video_id));
            setLikedVideos(likedIds);
          }

          // ================================================================
          // ✅ 2. SINCRONIZACIÓN: Cargar 'mission_progress' para anti-farming
          //    Revisamos si la misión 'like_videos' ya se completó HOY.
          // ================================================================
          try {
            const today = new Date().toISOString().split('T')[0];
            
            // 2a. Buscar el ID de la misión 'like_videos'
            const { data: mission } = await supabase
              .from('daily_missions')
              .select('id')
              .eq('mission_type', 'like_videos') //
              .single();

            if (mission) {
              // 2b. Buscar si el usuario ya completó esa misión HOY
              const { data: progressData, error: progressError } = await supabase
                .from('mission_progress') //
                .select('is_completed')
                .eq('user_id', user.id)
                .eq('mission_id', mission.id)
                .eq('date', today)
                .single();

              if (progressError && progressError.code !== 'PGRST116') {
                throw progressError; // Lanzar error si no es "fila no encontrada"
              }

              if (progressData && progressData.is_completed) {
                // Si la misión de "like_videos" está completa HOY,
                // marcamos TODOS los videos como 'hasEarnedPointsBefore'
                const allVideoIds = videos.map(v => v.id);
                setActionsPerformed(prev => ({
                  ...prev,
                  likes: new Set(allVideoIds) // Activamos anti-farming para todos
                }));
              } else {
                // Aún no completa la misión de like hoy
                setActionsPerformed(prev => ({ ...prev, likes: new Set() }));
              }
            } else {
              // No existe la misión 'like_videos', desactivamos anti-farming
              setActionsPerformed(prev => ({ ...prev, likes: new Set() }));
            }
          } catch (err) {
            console.error("Error al verificar progreso de misión 'like_videos':", err);
            setActionsPerformed(prev => ({ ...prev, likes: new Set() })); // Ser permisivo
          }

          // ✅ CARGAR VIDEOS GUARDADOS
          const { data: savedData } = await supabase
            .from('saved_videos')
            .select('video_id')
            .eq('user_id', user.id);
          
          if (savedData) {
            const savedIds = new Set(savedData.map(s => s.video_id));
            setSavedVideos(savedIds);
            
            // 🛑 ELIMINADO: 'user_video_points' no existe
          }

          // ✅ CARGAR SEGUIDORES
          const { data: followsData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
          
          if (followsData) {
            const followedIds = new Set(followsData.map(f => f.following_id));
            setFollowedCreators(followedIds);
            
            // 🛑 ELIMINADO: 'user_video_points' no existe
          }

          // 🛑 ELIMINADO: 'user_video_points' no existe
        }
      } catch (error) {
        console.error('Error cargando usuario y acciones:', error);
      }
    };
    
    loadCurrentUserAndActions();
  }, [videos]); // Dependencia de 'videos' para actualizar el set de 'likes'

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
  // ✅ CARGAR CONTADORES EN TIEMPO REAL DESDE BD
  // ===============================
  useEffect(() => {
    const loadRealTimeCounters = async () => {
      if (videos.length === 0) return;
      
      const currentVideo = videos[currentIndex];
      if (!currentVideo) return;

      try {
        // Cargar likes count
        const { count: likesCount } = await supabase
          .from('video_likes')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', currentVideo.id);

        // Cargar comments count
        const { count: commentsCount } = await supabase
          .from('video_comments')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', currentVideo.id);

        // Actualizar contadores
        setVideoCounters(prev => ({
          ...prev,
          [currentVideo.id]: {
            ...prev[currentVideo.id],
            likes: likesCount || 0,
            comments: commentsCount || 0
          }
        }));
      } catch (error) {
        console.error('Error cargando contadores en tiempo real:', error);
      }
    };

    loadRealTimeCounters();
  }, [currentIndex, videos]);

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
          // ❌ ELIMINADO: RPC 'increment_video_views'
          // const { error } = await supabase.rpc('increment_video_views', { 
          //   video_id: currentVideoData.id 
          // });
        } catch (err) {
          console.error('Error al incrementar vistas:', err);
        }
      }
      
      if (watchedPercent > 80 && !videoWatchedIds.has(currentVideoData.id)) {
        setVideoWatchedIds(prev => new Set([...prev, currentVideoData.id]));
        
        // ✅ CORREGIDO: Parámetros correctos para trackWatchVideo
        missionsService.trackWatchVideo('reel', currentVideoData.id, currentVideo.currentTime)
          .then(result => {
            if (result.result === 'success' && result.points_earned > 0) {
              addPoints(result.points_earned, result.message || 'Misión de Ver Videos completada', 'free');
              showPointsNotification(`+${result.points_earned} PUNTOS por ver reel 🎉`, currentVideoData.id, 'success');
            } else if (result.result === 'progress_updated') {
              showPointsNotification('Progreso registrado. ¡Sigue viendo!', currentVideoData.id, 'success');
            } else if (result.result === 'already_completed') {
              showPointsNotification('Ya completaste la misión de ver reels hoy.', currentVideoData.id, 'restriction');
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
  }, [currentIndex, videos, videoWatchedIds, addPoints]);

  // ===============================
  // PLAY/PAUSE
  // ===============================
  const handlePlayPause = useCallback((e) => { // ✅ CORREGIDO: Envuelto en useCallback
    // Si el evento 'e' existe, es un click en el video.
    // Si 'e' no existe, fue llamado por el atajo de teclado.
    if (e && e.target.tagName !== 'VIDEO') return;
    
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
  }, [currentIndex]); // Dependencia: currentIndex

  // ===============================
  // NAVEGACIÓN
  // ===============================
  const navigateNext = useCallback(() => { // ✅ CORREGIDO: Envuelto en useCallback
    if (currentIndex < videos.length - 1) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev + 1);
      setIsAutoPlaying(true);
    }
  }, [currentIndex, videos.length]); // Dependencias

  const navigatePrevious = useCallback(() => { // ✅ CORREGIDO: Envuelto en useCallback
    if (currentIndex > 0) {
      setEnableTransition(true);
      setCurrentIndex(prev => prev - 1);
      setIsAutoPlaying(true);
    }
  }, [currentIndex]); // Dependencia

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
        handlePlayPause(); // ✅ CORREGIDO: Llama a la función 'handlePlayPause'
      }
      if (e.key === 'Escape' && showCommentsModal) {
        handleCloseComments();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // ✅ CORREGIDO: Añadidas dependencias
  }, [navigateNext, navigatePrevious, handlePlayPause, showCommentsModal]); 

  // ===============================
  // ✅✅✅ ACCIÓN DE LIKE (SINCRONIZADA)
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
      
      // ✅ VERIFICAR SI YA COMPLETÓ LA MISIÓN DE LIKES HOY
      const hasEarnedPointsBefore = actionsPerformed.likes.has(videoId);
      
      // ✅ VERIFICAR SI TIENE LIKE ACTUALMENTE
      const isCurrentlyLiked = newLikedVideos.has(videoId);
      
      console.log('👍 Estado del like:', {
        videoId,
        hasEarnedPointsBefore,
        isCurrentlyLiked
      });
      
      if (isCurrentlyLiked) {
        // ==============================
        // QUITAR LIKE
        // ==============================
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

        // ❌ ELIMINADO: RPC 'decrement_video_likes' que fallaba
        // await supabase.rpc('decrement_video_likes', { video_id: videoId });
        
      } else {
        // ==============================
        // DAR LIKE
        // ==============================
        newLikedVideos.add(videoId);
        if (newDislikedVideos.has(videoId)) {
            newDislikedVideos.delete(videoId);
        }

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

        // ❌ ELIMINADO: RPC 'increment_video_likes' que fallaba
        // await supabase.rpc('increment_video_likes', { video_id: videoId });

        // ✅ VERIFICAR SI YA GANÓ PUNTOS HOY
        if (!hasEarnedPointsBefore) {
          // ==============================
          // MISIÓN NO COMPLETA HOY
          // ==============================
          try {
            // ✅ Llamamos a la función SQL con 'reel' como tipo
            const missionResult = await missionsService.trackGiveLike('reel', videoId);
            
            console.log('🎯 Resultado de trackGiveLike:', missionResult);
            
            // ================================================================
            // ✅ INICIO: LÓGICA DE NOTIFICACIONES SINCRONIZADA
            // ================================================================
            if (missionResult.result === 'success' && missionResult.points_earned > 0) { 
              // 1. MISIÓN COMPLETA
              const pointsEarned = missionResult.points_earned; 
              await addPoints(pointsEarned, missionResult.message || 'Misión de Likes completada', 'free'); 
              showPointsNotification(`Misión Completa: +${pointsEarned} puntos 🎉`, videoId, 'success');
              
              // Marcar TODOS los videos como 'hechos' para hoy
              const allVideoIds = videos.map(v => v.id);
              setActionsPerformed(prev => ({ ...prev, likes: new Set(allVideoIds) }));

            } else if (missionResult.result === 'progress_updated') {
              // 2. PROGRESO REGISTRADO
              showPointsNotification(`Acción registrada. Sigue dando Likes!`, videoId, 'success');
                 
            } else if (missionResult.result === 'already_completed') {
              // 3. ANTI-FARMING (Misión ya completada hoy)
              showPointsNotification(`Ya completaste la misión de Likes hoy.`, videoId, 'restriction');
               // Marcar TODOS los videos como 'hechos' para hoy
              const allVideoIds = videos.map(v => v.id);
              setActionsPerformed(prev => ({ ...prev, likes: new Set(allVideoIds) }));
            }
            // ================================================================
            // ✅ FIN: LÓGICA DE NOTIFICACIONES
            // ================================================================

          } catch (pointsError) {
            console.error('❌ Error al procesar puntos o misión:', pointsError);
          }
        } else {
          // ==============================
          // YA GANÓ PUNTOS HOY
          // ==============================
          console.log('ℹ️ El usuario ya completó la misión de likes hoy.');
          showPointsNotification('Ya completaste esta misión hoy', videoId, 'restriction');
        }
      }
      
      setLikedVideos(newLikedVideos);
      setDislikedVideos(newDislikedVideos);
    } catch (error) {
      console.error('❌ Error en like:', error);
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
          // Si tenía like, llamamos a handleLike para quitarlo
          // (handleLike ya no da puntos, así que es seguro)
          await handleLike(videoId, e);
        }
      }
      
      setDislikedVideos(newDislikedVideos);
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
      // 🛑 Lógica 'hasEarnedPointsBefore' de 'save' deshabilitada
      // const hasEarnedPointsBefore = actionsPerformed.saves.has(videoId);
      
      if (newSavedVideos.has(videoId)) {
        // Quitar de guardados
        newSavedVideos.delete(videoId);
        await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      } else {
        // Guardar video
        newSavedVideos.add(videoId);
        await supabase
          .from('saved_videos')
          .insert({ video_id: videoId, user_id: user.id });

        // ✅ OTORGAR PUNTOS (Lógica antigua mantenida, necesita migración a 'trackMissionProgress')
        // if (!hasEarnedPointsBefore) {
        //   try {
        //     await addPoints(2, 'Video guardado', 'free');
            
        //     // 🛑 ERROR: Esta tabla no existe.
        //     // await supabase
        //     //   .from('user_video_points')
        //     // ...
            
        //     setActionsPerformed(prev => ({
        //       ...prev,
        //       saves: new Set([...prev.saves, videoId])
        //     }));
        //   } catch (pointsError) {
        //     console.error('Error al otorgar puntos:', pointsError);
        //   }
        // }
      }
      
      setSavedVideos(newSavedVideos);
    } catch (error) {
      console.error('Error guardando video:', error);
    }
  };
  
  // ✅ NUEVA FUNCIÓN: Abrir el Modal de Regalo
  const handleGiftClick = (video, e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      
      const currentVideo = videos[currentIndex]; // Asegurarse de tener el video actual
      if (!currentUser) {
          navigate('/login');
          return;
      }
      
      if (currentUser.id === currentVideo.creator?.id) {
          showPointsNotification('No puedes regalar puntos a tu propio reel.', currentVideo.id, 'restriction');
          return;
      }
      
      setShowGiftModal(true);
  };
  
  const handleGiftSuccess = (amount) => {
      const currentVideo = videos[currentIndex]; // Asegurarse de tener el video actual
      // El modal se encarga de la lógica de puntos, solo mostramos una notificación
      showPointsNotification(`¡Regalo enviado! ${amount} puntos para el creador.`, currentVideo.id, 'success');
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
      // 🛑 Lógica 'hasEarnedPointsBefore' de 'follow' deshabilitada
      // const hasEarnedPointsBefore = actionsPerformed.follows.has(creatorId);

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

        // ✅ TRACKING DE MISIÓN - IMPLEMENTADO
        if (!actionsPerformed.follows.has(creatorId)) {
          try {
            const result = await missionsService.trackFollowUser(creatorId);
            
            const videoId = videos[currentIndex]?.id;
            
            if (result.result === 'success' && result.points_earned > 0) {
              await addPoints(result.points_earned, result.message || 'Misión de Seguir completada', 'free');
              showPointsNotification(`+${result.points_earned} PUNTOS por Seguir 👥`, videoId, 'success');
              setActionsPerformed(prev => ({
                ...prev,
                follows: new Set([...prev.follows, creatorId])
              }));
            } else if (result.result === 'progress_updated') {
              showPointsNotification('Progreso registrado. ¡Sigue siguiendo!', videoId, 'success');
            } else if (result.result === 'already_completed') {
              showPointsNotification('Ya completaste la misión de seguir hoy.', videoId, 'restriction');
              setActionsPerformed(prev => ({
                ...prev,
                follows: new Set([...prev.follows, creatorId])
              }));
            }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const videoId = video.id;
      const shareMethod = navigator.share ? 'native' : 'clipboard';

      if (navigator.share) {
        await navigator.share({
          title: video.title || 'Reel',
          text: video.description || '',
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        showPointsNotification('Enlace copiado al portapapeles', videoId, 'success');
      }

      // ✅ TRACKING DE MISIÓN - IMPLEMENTADO
      if (!actionsPerformed.shares.has(videoId)) {
        setActionsPerformed(prev => ({
          ...prev,
          shares: new Set([...prev.shares, videoId])
        }));
        
        try {
          const result = await missionsService.trackShareContent(
            'reel',
            videoId,
            1,
            { platform: shareMethod }
          );
          
          if (result.result === 'success' && result.points_earned > 0) {
            await addPoints(result.points_earned, result.message || 'Misión de Compartir completada', 'free');
            showPointsNotification(`+${result.points_earned} PUNTOS por Compartir 📢`, videoId, 'success');
          } else if (result.result === 'progress_updated') {
            showPointsNotification('Progreso registrado. ¡Sigue compartiendo!', videoId, 'success');
          } else if (result.result === 'already_completed') {
            showPointsNotification('Ya completaste la misión de compartir hoy.', videoId, 'restriction');
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
          .select('id, full_name, avatar_url, username')
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
                name: userProfile.full_name || userProfile.username || 'Usuario',
                avatar: userProfile.avatar_url,
                username: userProfile.username || userProfile.full_name || 'usuario'
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
        alert(`Error al comentar: ${error.message}`);
        throw error;
      }

      console.log('✅ Comentario insertado exitosamente:', insertedComment);

      // ✅ TRACKING DE MISIÓN - IMPLEMENTADO
      if (!replyingTo && !actionsPerformed.comments.has(videoId)) {
        setActionsPerformed(prev => ({
          ...prev,
          comments: new Set([...prev.comments, videoId])
        }));
        
        try {
          const result = await missionsService.trackComment('reel', videoId);
          
          if (result.result === 'success' && result.points_earned > 0) {
            await addPoints(result.points_earned, result.message || 'Misión de Comentar completada', 'free');
            showPointsNotification(`+${result.points_earned} PUNTOS por Comentar 💬`, videoId, 'success');
          } else if (result.result === 'progress_updated') {
            showPointsNotification('Comentario registrado. ¡Sigue así!', videoId, 'success');
          } else if (result.result === 'already_completed') {
            showPointsNotification('Ya completaste la misión de comentar hoy.', videoId, 'restriction');
          }
        } catch (pointsError) {
          console.error('⚠️ Error al otorgar puntos:', pointsError);
        }
      }

      if (!replyingTo) {
        console.log('📊 Incrementando contador de comentarios...');
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

                {/* INFO DEL VIDEO - MOBILE */}
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

                {/* INFO DEL VIDEO - DESKTOP */}
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

        {/* BOTONES DE ACCIÓN - MOBILE */}
        {currentVideo && isMobile && (
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
              
              {!followedCreators.has(currentVideo.creator?.id) && currentUser?.id !== currentVideo.creator?.id && (
                <button
                  onClick={(e) => handleFollow(currentVideo.creator?.id, e)}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Icon name="Plus" size={16} color="white" />
                </button>
              )}
            </div>

            {/* ✅ BOTÓN DE LIKE CON NOTIFICACIÓN */}
            <div className="relative flex flex-col items-center space-y-1">
              <button 
                onClick={(e) => handleLike(currentVideo.id, e)} 
                className="flex flex-col items-center space-y-1"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${likedVideos.has(currentVideo.id) ? 'text-red-500' : 'text-white hover:scale-110'}`}>
                  <Icon name="ThumbsUp" size={26} className={likedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                </div>
                <span className="font-semibold text-xs text-white">{formatCount(getVideoCounter(currentVideo.id, 'likes'))}</span>
              </button>

              {/* ================================================== */}
              {/* ✅ NOTIFICACIÓN DE PUNTOS (CON ESTILO DINÁMICO)   */}
              {/* ================================================== */}
              {pointsNotification.show && pointsNotification.videoId === currentVideo.id && (
                <div className={`absolute -left-32 top-0 px-3 py-2 rounded-lg shadow-xl animate-bounce font-bold text-xs whitespace-nowrap
                  ${pointsNotification.type === 'success' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                  }
                `}>
                  {pointsNotification.message}
                </div>
              )}
            </div>

            <button 
              onClick={(e) => handleDislike(currentVideo.id, e)} 
              className="flex flex-col items-center space-y-1"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${dislikedVideos.has(currentVideo.id) ? 'text-gray-400' : 'text-white hover:scale-110'}`}>
                <Icon name="ThumbsDown" size={26} className={dislikedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
              </div>
            </button>
            
            {/* ✅ NUEVO BOTÓN DE REGALO - MOBILE */}
            {currentUser && currentUser.id !== currentVideo.creator?.id && (
                <button 
                    onClick={(e) => handleGiftClick(currentVideo, e)} 
                    className="flex flex-col items-center space-y-1"
                >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-yellow-500 bg-white/20">
                        <span className="text-xl font-extrabold mr-0.5 leading-none">R</span>
                        <Icon name="Gift" size={20} className="fill-current" />
                    </div>
                </button>
            )}

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

        {/* BOTONES DE ACCIÓN - DESKTOP */}
        {currentVideo && isDesktop && (
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
              
              {!followedCreators.has(currentVideo.creator?.id) && currentUser?.id !== currentVideo.creator?.id && (
                <button
                  onClick={(e) => handleFollow(currentVideo.creator?.id, e)}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110"
                >
                  <Icon name="Plus" size={18} color="white" />
                </button>
              )}
            </div>

            {/* ✅ BOTÓN DE LIKE CON NOTIFICACIÓN - DESKTOP */}
            <div className="relative flex flex-col items-center space-y-1">
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

              {/* ✅ NOTIFICACIÓN DE PUNTOS AL LADO DEL LIKE - DESKTOP */}
              {pointsNotification.show && pointsNotification.videoId === currentVideo.id && (
                <div className={`absolute -left-40 top-2 px-4 py-2 rounded-xl shadow-2xl animate-bounce font-bold text-sm whitespace-nowrap z-50
                  ${pointsNotification.type === 'success' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                  }
                `}>
                  {pointsNotification.message}
                </div>
              )}
            </div>

            <button 
              onClick={(e) => handleDislike(currentVideo.id, e)} 
              className="flex flex-col items-center space-y-1 group"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${dislikedVideos.has(currentVideo.id) ? 'bg-gray-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-gray-50'}`}>
                <Icon name="ThumbsDown" size={28} className={dislikedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
              </div>
            </button>
            
            {/* ✅ NUEVO BOTÓN DE REGALO - DESKTOP */}
            {currentUser && currentUser.id !== currentVideo.creator?.id && (
                <button 
                    onClick={(e) => handleGiftClick(currentVideo, e)} 
                    className="flex flex-col items-center space-y-1 group"
                    title="Regalar Puntos"
                >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-yellow-600 group-hover:bg-yellow-50">
                        <span className="text-2xl font-extrabold mr-0.5 leading-none">R</span>
                        <Icon name="Gift" size={24} className="fill-current" />
                    </div>
                </button>
            )}

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

        {/* PANEL DE COMENTARIOS - DESKTOP */}
        {showCommentsModal && currentVideo && isDesktop && (
          <div className="w-[45%] h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col ml-4">
            {/* Header del panel */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comentarios</h3>
              <button
                onClick={handleCloseComments}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            {/* Lista de comentarios */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments[currentVideo.id]?.length > 0 ? (
                comments[currentVideo.id].map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                        {comment.user?.avatar ? (
                          <img src={comment.user.avatar} alt={comment.user.name || 'Usuario'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {comment.user?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm">{comment.user?.name || 'Usuario'}</span>
                          <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <button
                          onClick={() => handleReply(comment.id, comment.user?.username || comment.user?.name || 'usuario')}
                          className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                        >
                          Responder
                        </button>

                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2">
                            {!showReplies[comment.id] ? (
                              <button
                                onClick={() => toggleReplies(comment.id)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                Ver {comment.replies.length} respuesta{comment.replies.length > 1 ? 's' : ''}
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleReplies(comment.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 mb-2"
                                >
                                  Ocultar respuestas
                                </button>
                                <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="flex space-x-2">
                                      <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                        {reply.user?.avatar ? (
                                          <img src={reply.user.avatar} alt={reply.user.name || 'Usuario'} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold">
                                              {reply.user?.name?.charAt(0) || 'U'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-semibold text-xs">{reply.user?.name || 'Usuario'}</span>
                                          <span className="text-[10px] text-gray-500">{formatTimeAgo(reply.created_at)}</span>
                                        </div>
                                        <p className="text-xs mt-0.5">{reply.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Icon name="MessageCircle" size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No hay comentarios aún</p>
                  <p className="text-sm">¡Sé el primero en comentar!</p>
                </div>
              )}
            </div>

            {/* Input de comentario */}
            <div className="p-4 border-t">
              {replyingTo && (
                <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded">
                  <span className="text-sm text-blue-700">Respondiendo...</span>
                  <button
                    onClick={handleCancelReply}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>
              )}
              <div className="flex space-x-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <button
                  onClick={() => handleAddComment(currentVideo.id)}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon name="Send" size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE COMENTARIOS - MOBILE */}
      {showCommentsModal && currentVideo && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          onClick={handleCloseComments}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comentarios</h3>
              <button
                onClick={handleCloseComments}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            {/* Lista de comentarios */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments[currentVideo.id]?.length > 0 ? (
                comments[currentVideo.id].map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                        {comment.user?.avatar ? (
                          <img src={comment.user.avatar} alt={comment.user.name || 'Usuario'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {comment.user?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm">{comment.user?.name || 'Usuario'}</span>
                          <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <button
                          onClick={() => handleReply(comment.id, comment.user?.username || comment.user?.name || 'usuario')}
                          className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                        >
                          Responder
                        </button>

                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2">
                            {!showReplies[comment.id] ? (
                              <button
                                onClick={() => toggleReplies(comment.id)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                Ver {comment.replies.length} respuesta{comment.replies.length > 1 ? 's' : ''}
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleReplies(comment.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 mb-2"
                                >
                                  Ocultar respuestas
                                </button>
                                <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="flex space-x-2">
                                      <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                        {reply.user?.avatar ? (
                                          <img src={reply.user.avatar} alt={reply.user.name || 'Usuario'} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold">
                                              {reply.user?.name?.charAt(0) || 'U'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-semibold text-xs">{reply.user?.name || 'Usuario'}</span>
                                          <span className="text-[10px] text-gray-500">{formatTimeAgo(reply.created_at)}</span>
                                        </div>
                                        <p className="text-xs mt-0.5">{reply.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Icon name="MessageCircle" size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No hay comentarios aún</p>
                  <p className="text-sm">¡Sé el primero en comentar!</p>
                </div>
              )}
            </div>

            {/* Input de comentario */}
            <div className="p-4 border-t">
              {replyingTo && (
                <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded">
                  <span className="text-sm text-blue-700">Respondiendo...</span>
                  <button
                    onClick={handleCancelReply}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>
              )}
              <div className="flex space-x-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <button
                  onClick={() => handleAddComment(currentVideo.id)}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon name="Send" size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ✅ MODAL DE REGALO DE PUNTOS */}
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
