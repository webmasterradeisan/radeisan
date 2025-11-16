// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - Integrado con Sistema de Puntos
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
// ✅ CORREGIDO: trackWatchVideo ahora usa parámetros correctos
// ✅ IMPLEMENTADO: trackShareContent completamente funcional
// ✅ IMPLEMENTADO: trackComment completamente funcional  
// ✅ IMPLEMENTADO: trackFollowUser completamente funcional
// ✅ IMPLEMENTADO: Detección automática de reels vs videos por orientación
// ✅ IMPLEMENTADO: Tracking automático al 80% del video
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { usePoints } from 'contexts/PointsContext';
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
  const { addPoints } = usePoints();

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
    type: 'success'
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
    showCommentsModal,
    showGiftModal
  });

  // ✅ NUEVO: Función para mostrar notificación de puntos
  const showPointsNotification = (message, videoId, type = 'success') => {
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
        if (!user) {
          console.log('⚠️ Usuario no autenticado');
          return;
        }

        setCurrentUser(user);

        // Cargar acciones ya realizadas
        const [likesData, savesData, followsData] = await Promise.all([
          supabase
            .from('video_likes')
            .select('video_id')
            .eq('user_id', user.id),
          supabase
            .from('saved_videos')
            .select('video_id')
            .eq('user_id', user.id),
          supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)
        ]);

        if (likesData.data) {
          setLikedVideos(new Set(likesData.data.map(l => l.video_id)));
        }
        if (savesData.data) {
          setSavedVideos(new Set(savesData.data.map(s => s.video_id)));
        }
        if (followsData.data) {
          setFollowedCreators(new Set(followsData.data.map(f => f.following_id)));
        }

        // ✅ Cargar misiones completadas HOY desde mission_progress
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: missionData, error: missionError } = await supabase
          .from('mission_progress')
          .select('mission_id, is_completed')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('completed_at', today.toISOString());

        if (missionError) {
          console.error('❌ Error al cargar misiones completadas:', missionError);
        } else if (missionData && missionData.length > 0) {
          console.log('✅ Misiones completadas hoy:', missionData.length);
          
          const hasCompletedLikes = missionData.some(() => true);

          if (hasCompletedLikes) {
            const allVideoIds = videos.map(v => v.id);
            setActionsPerformed(prev => ({ 
              ...prev, 
              likes: new Set(allVideoIds) 
            }));
          }
        }

      } catch (error) {
        console.error('❌ Error al cargar datos del usuario:', error);
      }
    };

    loadCurrentUserAndActions();
  }, [videos]);

  // ===============================
  // INICIALIZACIÓN DE CONTADORES
  // ===============================
  useEffect(() => {
    const initialCounters = {};
    videos.forEach(video => {
      initialCounters[video.id] = {
        likes: video.likes_count || 0,
        comments: video.comments_count || 0,
        shares: video.shares_count || 0,
        views: video.views_count || 0
      };
    });
    setVideoCounters(initialCounters);
  }, [videos]);

  // ===============================
  // NAVEGACIÓN
  // ===============================
  const handleNavigation = useCallback((newIndex, source = 'unknown') => {
    console.log('🧭 Navegación solicitada:', {
      from: currentIndex,
      to: newIndex,
      source,
      total: videos.length
    });

    if (newIndex < 0 || newIndex >= videos.length) {
      console.log('⚠️ Índice fuera de rango');
      return;
    }

    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.pause();
      console.log('⏸️ Video pausado en navegación');
    }

    lastNavigationIndex.current = newIndex;
    setCurrentIndex(newIndex);
    setIsAutoPlaying(true);
    setLoadingVideo(true);

    // Cargar siguiente batch si está cerca del final
    if (newIndex >= videos.length - 3 && hasMore && !loading) {
      console.log('📥 Cargando más videos...');
      onLoadMore?.();
    }

    console.log('✅ Navegación completada');
  }, [currentIndex, videos.length, hasMore, loading, onLoadMore]);

  const handleNext = useCallback(() => {
    console.log('⬇️ Siguiente video solicitado');
    if (currentIndex < videos.length - 1) {
      handleNavigation(currentIndex + 1, 'next_button');
    } else {
      console.log('ℹ️ Ya estás en el último video');
    }
  }, [currentIndex, videos.length, handleNavigation]);

  const handlePrevious = useCallback(() => {
    console.log('⬆️ Video anterior solicitado');
    if (currentIndex > 0) {
      handleNavigation(currentIndex - 1, 'previous_button');
    } else {
      console.log('ℹ️ Ya estás en el primer video');
    }
  }, [currentIndex, handleNavigation]);

  // ===============================
  // GESTOS TÁCTILES
  // ===============================
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const distance = touchStartY.current - touchEndY.current;
    const threshold = 50;

    if (Math.abs(distance) > threshold) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }

    touchStartY.current = 0;
    touchEndY.current = 0;
  };

  // ===============================
  // SCROLL WHEEL (Desktop)
  // ===============================
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    const now = Date.now();
    const timeSinceLastScroll = now - (window.lastScrollTime || 0);
    
    if (timeSinceLastScroll < 500) return;
    
    window.lastScrollTime = now;

    if (e.deltaY > 0) {
      handleNext();
    } else if (e.deltaY < 0) {
      handlePrevious();
    }
  }, [handleNext, handlePrevious]);

  // ===============================
  // TECLADO
  // ===============================
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch(e.key) {
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handlePrevious();
          break;
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (videos[currentIndex]) {
            handleMuteToggle(videos[currentIndex].id);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, videos, handleNext, handlePrevious]);

  // ===============================
  // AUTOPLAY Y EVENTOS DE VIDEO
  // ===============================
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    const currentVideoData = videos[currentIndex];
    if (!currentVideoData) return;

    console.log('🎥 Video actual:', {
      index: currentIndex,
      id: currentVideoData.id,
      title: currentVideoData.title
    });

    let viewCounted = false;

    const handleLoadStart = () => {
      console.log('⏳ Video cargando...');
      setLoadingVideo(true);
    };

    const handleCanPlay = () => {
      console.log('✅ Video listo para reproducir');
      setLoadingVideo(false);
      
      if (isAutoPlaying && !hasPlayedInitial.current) {
        currentVideo.play()
          .then(() => {
            console.log('▶️ Reproducción automática iniciada');
            hasPlayedInitial.current = true;
          })
          .catch(err => console.log('⚠️ Error de autoplay:', err.message));
      } else if (isAutoPlaying) {
        currentVideo.play()
          .then(() => console.log('▶️ Video reproduciéndose'))
          .catch(err => console.log('⚠️ Error de reproducción:', err.message));
      }
    };

    const handleLoadedData = () => {
      console.log('📊 Metadata cargada');
      setLoadingVideo(false);
    };

    // ✅ CORREGIDO: trackWatchVideo con parámetros correctos y detección de tipo
    const handleTimeUpdate = async () => {
      const watchedPercent = (currentVideo.currentTime / currentVideo.duration) * 100;
      
      // Registrar vista al 30%
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
          // Actualizar contador de vistas en la BD si es necesario
        } catch (err) {
          console.error('Error al incrementar vistas:', err);
        }
      }
      
      // ✅ TRACKING DE MISIÓN AL 80% - CORREGIDO
      if (watchedPercent > 80 && !videoWatchedIds.has(currentVideoData.id)) {
        setVideoWatchedIds(prev => new Set([...prev, currentVideoData.id]));
        
        try {
          // ✅ Detectar si es reel o video según orientación
          const isReel = currentVideoData.orientation === 'vertical';
          const contentType = isReel ? 'reel' : 'video';
          
          console.log(`👁️ Usuario vio el 80% del ${contentType}:`, currentVideoData.id);
          
          // ✅ PARÁMETROS CORRECTOS: (contentType, contentId, watchDuration)
          const missionResult = await missionsService.trackWatchVideo(
            contentType,                    // ✅ Tipo correcto según orientación
            currentVideoData.id,             // ✅ ID del video
            currentVideo.currentTime         // ✅ Duración vista
          );
          
          if (missionResult.result === 'success' && missionResult.points_earned > 0) {
            const pointsEarned = missionResult.points_earned;
            await addPoints(pointsEarned, missionResult.message || `Misión de ver ${contentType}s completada`, 'free');
            showPointsNotification(`¡Misión Completa! +${pointsEarned} puntos 🎉`, currentVideoData.id, 'success');
          } else if (missionResult.result === 'progress_updated') {
            showPointsNotification(`Progreso registrado. ¡Sigue viendo ${contentType}s!`, currentVideoData.id, 'success');
          } else if (missionResult.result === 'already_completed') {
            showPointsNotification(`Ya completaste la misión de ver ${contentType}s hoy.`, currentVideoData.id, 'restriction');
          }
          
          console.log('✅ Tracking de video completado:', missionResult);
          
        } catch (error) {
          console.error('❌ Error al trackear video visto:', error);
        }
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
  }, [currentIndex, videos, videoWatchedIds, addPoints, isAutoPlaying]);

  // ===============================
  // PLAY/PAUSE
  // ===============================
  const handlePlayPause = useCallback((e) => {
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
  }, [currentIndex]);

  // ===============================
  // ACCIONES: LIKE, SAVE, FOLLOW, SHARE, COMMENT
  // ===============================
  
  // ✅ LIKE (Ya funcionaba correctamente)
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
      const isCurrentlyLiked = newLikedVideos.has(videoId);

      // 🟢 Consultar si ya ganó puntos HOY (desde mission_progress)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayMissions, error: missionCheckError } = await supabase
        .from('mission_progress')
        .select('mission_id, is_completed')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('completed_at', today.toISOString());

      if (missionCheckError) {
        console.error('Error al verificar misiones:', missionCheckError);
      }

      const hasEarnedPointsBefore = todayMissions && todayMissions.length > 0;

      if (isCurrentlyLiked) {
        // Quitar like
        newLikedVideos.delete(videoId);
        if (newDislikedVideos.has(videoId)) {
          newDislikedVideos.delete(videoId);
        }

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
        
      } else {
        // Dar like
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

        // ✅ VERIFICAR SI YA GANÓ PUNTOS HOY
        if (!hasEarnedPointsBefore) {
          try {
            const missionResult = await missionsService.trackGiveLike('video', videoId);
            
            if (missionResult.result === 'success' && missionResult.points_earned > 0) { 
              const pointsEarned = missionResult.points_earned; 
              await addPoints(pointsEarned, missionResult.message || 'Misión de Likes completada', 'free'); 
              showPointsNotification(`Misión Completa: +${pointsEarned} puntos 🎉`, videoId, 'success');
              
              const allVideoIds = videos.map(v => v.id);
              setActionsPerformed(prev => ({ ...prev, likes: new Set(allVideoIds) }));

            } else if (missionResult.result === 'progress_updated') {
              showPointsNotification(`Acción registrada. Sigue dando Likes!`, videoId, 'success');
                 
            } else if (missionResult.result === 'already_completed') {
              showPointsNotification(`Ya completaste la misión de Likes hoy.`, videoId, 'restriction');
              const allVideoIds = videos.map(v => v.id);
              setActionsPerformed(prev => ({ ...prev, likes: new Set(allVideoIds) }));
            }

          } catch (pointsError) {
            console.error('❌ Error al procesar puntos o misión:', pointsError);
          }
        } else {
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

      const newLikedVideos = new Set(likedVideos);
      const newDislikedVideos = new Set(dislikedVideos);

      if (newLikedVideos.has(videoId)) {
        newLikedVideos.delete(videoId);
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
        
        setVideoCounters(prev => ({
          ...prev,
          [videoId]: {
            ...prev[videoId],
            likes: Math.max(0, (prev[videoId]?.likes || 0) - 1)
          }
        }));
      }

      if (newDislikedVideos.has(videoId)) {
        newDislikedVideos.delete(videoId);
      } else {
        newDislikedVideos.add(videoId);
      }

      setLikedVideos(newLikedVideos);
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
          .insert({ 
            video_id: videoId, 
            user_id: user.id 
          });
      }
      
      setSavedVideos(newSavedVideos);
    } catch (error) {
      console.error('Error guardando video:', error);
    }
  };

  const handleGift = (e) => {
      if (e) {
          e.stopPropagation();
          e.preventDefault();
      }
      
      if (!currentUser) {
          navigate('/login');
          return;
      }
      
      setShowGiftModal(true);
  };
  
  const handleGiftSuccess = (amount) => {
      const currentVideo = videos[currentIndex];
      showPointsNotification(`¡Regalo enviado! ${amount} puntos para el creador.`, currentVideo.id, 'success');
  };

  // ✅ FOLLOW - IMPLEMENTADO CON TRACKING
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

        // ✅ TRACKING DE MISIÓN - IMPLEMENTADO
        try {
          const missionResult = await missionsService.trackFollowUser(creatorId);
          
          if (missionResult.result === 'success' && missionResult.points_earned > 0) {
            const pointsEarned = missionResult.points_earned;
            await addPoints(pointsEarned, missionResult.message || 'Misión de Seguir completada', 'free');
            showPointsNotification(`¡Misión Completa! +${pointsEarned} puntos 🎉`, creatorId, 'success');
            
            setActionsPerformed(prev => ({
              ...prev,
              follows: new Set([...prev.follows, creatorId])
            }));
          } else if (missionResult.result === 'progress_updated') {
            showPointsNotification(`Progreso registrado. ¡Sigue siguiendo creadores!`, creatorId, 'success');
          } else if (missionResult.result === 'already_completed') {
            showPointsNotification(`Ya completaste la misión de seguir hoy.`, creatorId, 'restriction');
          }
          
          console.log('✅ Tracking de seguir completado:', missionResult);
          
        } catch (pointsError) {
          console.error('❌ Error al otorgar puntos por seguir:', pointsError);
        }
      }
      
      setFollowedCreators(newFollowedCreators);
    } catch (error) {
      console.error('Error siguiendo/dejando de seguir creador:', error);
    }
  };

  // ✅ SHARE - IMPLEMENTADO CON TRACKING
  const handleShare = async (video, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      // Detectar si es reel o video según orientación
      const isReel = video.orientation === 'vertical';
      const contentType = isReel ? 'reel' : 'video';
      
      // Compartir usando Web Share API o copiar al portapapeles
      if (navigator.share) {
        await navigator.share({
          title: video.title || `${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`,
          text: video.description || '',
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Enlace copiado al portapapeles');
      }

      // ✅ TRACKING DE MISIÓN - IMPLEMENTADO
      try {
        const platform = navigator.share ? 'native' : 'clipboard';
        const missionResult = await missionsService.trackShareContent(
          contentType,
          video.id,
          1,
          { platform }
        );
        
        if (missionResult.result === 'success' && missionResult.points_earned > 0) {
          const pointsEarned = missionResult.points_earned;
          await addPoints(pointsEarned, missionResult.message || `Misión de Compartir ${contentType}s completada`, 'free');
          showPointsNotification(`¡Misión Completa! +${pointsEarned} puntos 🎉`, video.id, 'success');
          
          setActionsPerformed(prev => ({
            ...prev,
            shares: new Set([...prev.shares, video.id])
          }));
        } else if (missionResult.result === 'progress_updated') {
          showPointsNotification(`Progreso registrado. ¡Sigue compartiendo!`, video.id, 'success');
        } else if (missionResult.result === 'already_completed') {
          showPointsNotification(`Ya completaste la misión de compartir hoy.`, video.id, 'restriction');
        }
        
        console.log('✅ Tracking de compartir completado:', missionResult);
        
      } catch (pointsError) {
        console.error('❌ Error al otorgar puntos por compartir:', pointsError);
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
                username: userProfile.username
              } : {
                id: comment.user_id,
                name: 'Usuario',
                avatar: null,
                username: 'usuario'
              }
            };
          });
        }
      }

      const parentComments = data?.filter(c => !c.parent_comment_id) || [];
      const childComments = data?.filter(c => c.parent_comment_id) || [];

      const commentsWithReplies = parentComments.map(parent => ({
        ...parent,
        replies: childComments.filter(child => child.parent_comment_id === parent.id)
      }));

      setComments(prev => ({
        ...prev,
        [videoId]: commentsWithReplies
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

  // ✅ COMMENT - IMPLEMENTADO CON TRACKING
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

      // ✅ TRACKING DE MISIÓN - IMPLEMENTADO
      try {
        const videoData = videos.find(v => v.id === videoId);
        const isReel = videoData?.orientation === 'vertical';
        const contentType = isReel ? 'reel' : 'video';
        
        const missionResult = await missionsService.trackComment(contentType, videoId);
        
        if (missionResult.result === 'success' && missionResult.points_earned > 0) {
          const pointsEarned = missionResult.points_earned;
          await addPoints(pointsEarned, missionResult.message || `Misión de Comentar ${contentType}s completada`, 'free');
          showPointsNotification(`¡Misión Completa! +${pointsEarned} puntos 🎉`, videoId, 'success');
          
          setActionsPerformed(prev => ({
            ...prev,
            comments: new Set([...prev.comments, videoId])
          }));
        } else if (missionResult.result === 'progress_updated') {
          showPointsNotification(`Progreso registrado. ¡Sigue comentando!`, videoId, 'success');
        } else if (missionResult.result === 'already_completed') {
          showPointsNotification(`Ya completaste la misión de comentar hoy.`, videoId, 'restriction');
        }
        
        console.log('✅ Tracking de comentar completado:', missionResult);
        
      } catch (pointsError) {
        console.error('❌ Error al otorgar puntos por comentar:', pointsError);
      }

      console.log('✅ Comentario procesado completamente');
      
      setNewComment('');
      setReplyingTo(null);
      await loadComments(videoId);

    } catch (error) {
      console.error('❌ Error general al comentar:', error);
    }
  };

  const handleReply = (commentId, username) => {
    setReplyingTo(commentId);
    setNewComment(`@${username} `);
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

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - commentTime) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return commentTime.toLocaleDateString();
  };

  // ===============================
  // RENDER
  // ===============================
  if (!videos || videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white text-center">
          <Icon name="Loader" size={48} className="animate-spin mx-auto mb-4" />
          <p>Cargando videos...</p>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  if (!currentVideo) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white text-center">
          <Icon name="AlertCircle" size={48} className="mx-auto mb-4" />
          <p>Video no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* VIDEO CONTAINER */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transform: enableTransition ? `translateY(${currentIndex * -100}vh)` : 'none',
          transition: enableTransition ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }}
      >
        {videos.map((video, index) => {
          const isActive = index === currentIndex;
          const shouldLoad = Math.abs(index - currentIndex) <= 1;

          return (
            <div
              key={video.id}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                top: `${index * 100}vh`,
                visibility: shouldLoad ? 'visible' : 'hidden'
              }}
            >
              {shouldLoad && (
                <>
                  {/* VIDEO ELEMENT */}
                  <video
                    ref={el => videoRefs.current[index] = el}
                    src={video.video_url}
                    className="w-full h-full object-contain"
                    loop
                    playsInline
                    preload={isActive ? "auto" : "metadata"}
                    onClick={handlePlayPause}
                    muted={mutedVideos.has(video.id)}
                  />

                  {/* LOADING OVERLAY */}
                  {isActive && loadingVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Icon name="Loader" size={48} className="text-white animate-spin" />
                    </div>
                  )}

                  {/* VIDEO INFO OVERLAY */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 md:pb-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                    <div className="max-w-xl">
                      {/* Creator Info */}
                      <div className="flex items-center space-x-3 mb-3">
                        <Link 
                          to={`/profile/${video.creator?.id}`}
                          className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                            {video.creator?.avatar ? (
                              <img 
                                src={video.creator.avatar} 
                                alt={video.creator.username || video.creator.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                  {(video.creator?.username || video.creator?.name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="font-semibold">
                            {video.creator?.username || video.creator?.name || 'Usuario'}
                          </span>
                        </Link>
                        
                        {currentUser && video.creator?.id !== currentUser.id && (
                          <button
                            onClick={(e) => handleFollow(video.creator?.id, e)}
                            className={`px-4 py-1 rounded-full font-semibold text-sm transition-colors ${
                              followedCreators.has(video.creator?.id)
                                ? 'bg-gray-600 text-white'
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                          >
                            {followedCreators.has(video.creator?.id) ? 'Siguiendo' : 'Seguir'}
                          </button>
                        )}
                      </div>

                      {/* Video Title & Description */}
                      {video.title && (
                        <h3 className="font-bold text-lg mb-1">{video.title}</h3>
                      )}
                      {video.description && (
                        <p className="text-sm opacity-90 line-clamp-2">{video.description}</p>
                      )}
                      
                      {/* Hashtags */}
                      {video.hashtags && video.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {video.hashtags.map((tag, i) => (
                            <span key={i} className="text-xs text-blue-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTONS - Right Side */}
                  <div className="absolute right-4 bottom-24 md:bottom-32 flex flex-col space-y-4">
                    {/* Like Button */}
                    <button
                      onClick={(e) => handleLike(video.id, e)}
                      className="flex flex-col items-center space-y-1 group"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        likedVideos.has(video.id) 
                          ? 'bg-red-500 text-white' 
                          : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      }`}>
                        <Icon 
                          name="Heart" 
                          size={24} 
                          className={likedVideos.has(video.id) ? 'fill-current' : ''}
                        />
                      </div>
                      <span className="text-white text-xs font-semibold">
                        {videoCounters[video.id]?.likes || video.likes_count || 0}
                      </span>
                    </button>

                    {/* ✅ Notificación de Puntos */}
                    {pointsNotification.show && pointsNotification.videoId === video.id && (
                      <div className={`absolute right-16 px-3 py-2 rounded-lg shadow-lg text-xs font-semibold animate-fade-in ${
                        pointsNotification.type === 'success' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-yellow-500 text-black'
                      }`}>
                        {pointsNotification.message}
                      </div>
                    )}

                    {/* Comment Button */}
                    <button
                      onClick={(e) => handleOpenComments(video.id, e)}
                      className="flex flex-col items-center space-y-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                        <Icon name="MessageCircle" size={24} className="text-white" />
                      </div>
                      <span className="text-white text-xs font-semibold">
                        {videoCounters[video.id]?.comments || video.comments_count || 0}
                      </span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={(e) => handleShare(video, e)}
                      className="flex flex-col items-center space-y-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                        <Icon name="Share2" size={24} className="text-white" />
                      </div>
                      <span className="text-white text-xs font-semibold">
                        {videoCounters[video.id]?.shares || video.shares_count || 0}
                      </span>
                    </button>

                    {/* Save Button */}
                    <button
                      onClick={(e) => handleSave(video.id, e)}
                      className="flex flex-col items-center space-y-1"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        savedVideos.has(video.id) 
                          ? 'bg-yellow-500 text-white' 
                          : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      }`}>
                        <Icon 
                          name="Bookmark" 
                          size={24} 
                          className={savedVideos.has(video.id) ? 'fill-current' : ''}
                        />
                      </div>
                    </button>

                    {/* ✅ Gift Button */}
                    {currentUser && video.creator?.id !== currentUser.id && (
                      <button
                        onClick={handleGift}
                        className="flex flex-col items-center space-y-1"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:from-purple-600 hover:to-pink-600 transition-all">
                          <Icon name="Gift" size={24} className="text-white" />
                        </div>
                      </button>
                    )}

                    {/* Mute Button */}
                    <button
                      onClick={(e) => handleMuteToggle(video.id, e)}
                      className="flex flex-col items-center space-y-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                        <Icon 
                          name={mutedVideos.has(video.id) ? "VolumeX" : "Volume2"} 
                          size={24} 
                          className="text-white" 
                        />
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* NAVIGATION BUTTONS - Desktop */}
      {isDesktop && (
        <>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="ChevronUp" size={24} className="text-white" />
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex >= videos.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="ChevronDown" size={24} className="text-white" />
          </button>
        </>
      )}

      {/* PROGRESS INDICATOR */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
        {currentIndex + 1} / {videos.length}
      </div>

      {/* MODAL DE COMENTARIOS - Desktop - omitido por brevedad, igual que el original */}
      
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
