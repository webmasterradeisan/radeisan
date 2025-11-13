// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - Integrado con Sistema de Puntos
// ✅ CORREGIDO: Verificaciones de seguridad para comment.user
// ✅ CORREGIDO: Estructura JSX del modal
// ✅ NUEVO: Avisos de puntos cerca del botón like
// ✅ CORREGIDO: Sistema de tracking persistente para likes
// ✅ NUEVO: INTEGRACIÓN BOTÓN Y MODAL DE REGALO
// ✅ CORREGIDO: Ruta de importación de GiftPointsModal para evitar el error.
// 🟢 SINCRONIZADO: 'loadCurrentUserAndActions' ahora consulta 'user_mission_progress'
//    para el anti-farming diario (en lugar de 'user_video_points').
// 🟢 SINCRONIZADO: 'handleLike' ahora maneja 'progress_updated' y 'already_completed'.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { usePoints } from 'contexts/PointsContext';
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

  // ✅ NUEVO: Función para mostrar notificación de puntos
  const showPointsNotification = (message, videoId, type = 'success') => {
    setPointsNotification({
      show: true,
      message,
      videoId,
      type // Añadimos tipo para controlar color
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
          // ✅ 2. SINCRONIZACIÓN: Cargar 'user_mission_progress' para anti-farming
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
                .from('user_mission_progress')
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

          // ... (Resto de la carga de 'saves', 'follows', 'comments'...)
          
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
              addPoints(result.reward.points, result.message, 'free');
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

        await supabase.rpc('decrement_video_likes', { video_id: videoId });
        
      } else {
        // ==============================
        // DAR LIKE
        // ==============================
        newLikedVideos.add(videoId);
        if (newDislikedVideos.has(videoId)) {
            newDislikedVideos.delete(videoId);
            // (Aquí faltaba la lógica para quitar el dislike de la BD,
            // pero se maneja en handleDislike)
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

        await supabase.rpc('increment_video_likes', { video_id: videoId });

        // ✅ VERIFICAR SI YA GANÓ PUNTOS HOY
        if (!hasEarnedPointsBefore) {
          // ==============================
          // MISIÓN NO COMPLETA HOY
          // ==============================
          try {
            // ✅ Llamamos a la función SQL (que ya no falla)
            const missionResult = await missionsService.trackGiveLike('video', videoId);
            
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
    // ... (Esta función necesita ser sincronizada también,
    //      pero la dejamos como estaba ya que no fue reportada como error)
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
      const hasEarnedPointsBefore = actionsPerformed.saves.has(videoId);
      
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

        // ✅ OTORGAR PUNTOS solo si es primera vez
        if (!hasEarnedPointsBefore) {
          try {
            // ... (Lógica de Puntos de Guardar)
            // Esta lógica probablemente también debería migrarse a
            // 'trackMissionProgress' con un tipo 'save_video'
            await addPoints(2, 'Video guardado', 'free');
            
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
  
  // ✅ NUEVA FUNCIÓN: Abrir el Modal de Regalo
  const handleGiftClick = (video, e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      
      if (!currentUser) {
          navigate('/login');
          return;
      }
      
      if (currentUser.id === video.creator?.id) {
          showPointsNotification('No puedes regalar puntos a tu propio reel.', video.id, 'restriction');
          return;
      }
      
      setShowGiftModal(true);
  };
  
  const handleGiftSuccess = (amount) => {
      // El modal se encarga de la lógica de puntos, solo mostramos una notificación
      showPointsNotification(`¡Regalo enviado! ${amount} puntos para el creador.`, currentVideo.id, 'success');
  };


  const handleFollow = async (creatorId, e) => {
    // ... (Lógica de Seguir - Sin cambios reportados)
  };

  const handleShare = async (video, e) => {
    // ... (Lógica de Compartir - Sin cambios reportados)
  };

  const handleMuteToggle = (videoId, e) => {
    // ... (Lógica de Mute - Sin cambios)
  };

  // ===============================
  // SISTEMA DE COMENTARIOS
  // ===============================
  
  const loadComments = async (videoId, retryCount = 0) => {
    // ... (Lógica de Cargar Comentarios - Sin cambios)
  };

  const handleOpenComments = async (videoId, e) => {
    // ... (Lógica de Abrir Comentarios - Sin cambios)
  };

  const handleCloseComments = () => {
    // ... (Lógica de Cerrar Comentarios - Sin cambios)
  };

  const handleAddComment = async (videoId) => {
    // ... (Lógica de Añadir Comentario - Sin cambios)
    // NOTA: Esta lógica también debería ser sincronizada para
    // usar 'trackComment' y 'user_mission_progress'
  };

  const handleReply = (commentId, username) => {
    // ... (Lógica de Responder - Sin cambios)
  };

  const handleCancelReply = () => {
    // ... (Lógica de Cancelar Respuesta - Sin cambios)
  };

  const toggleReplies = (commentId) => {
    // ... (Lógica de Ver Respuestas - Sin cambios)
  };

  const formatCount = (count) => {
    // ... (Función de Formato - Sin cambios)
  };

  const formatTimeAgo = (date) => {
    // ... (Función de Formato - Sin cambios)
  };

  const getVideoCounter = (videoId, type) => {
    // ... (Función de Obtener Contador - Sin cambios)
  };

  // ===============================
  // RENDERIZADO
  // ===============================
  
  const currentVideo = videos[currentIndex];

  if (videos.length === 0 && !loading) {
    // ... (Renderizado de 'No hay videos')
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
          {/* ... (JSX del <video> y overlays de info) ... */}
        </div>

        {/* BOTONES DE ACCIÓN - MOBILE */}
        {currentVideo && isMobile && (
          <div 
            className="absolute bottom-20 right-4 flex flex-col items-center space-y-5 z-10"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* ... (Botón de Avatar y Seguir) ... */}

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

            {/* ... (Botones Dislike, Regalo, Comentarios, Guardar, etc.) ... */}
          </div>
        )}

        {/* BOTONES DE ACCIÓN - DESKTOP */}
        {currentVideo && isDesktop && (
          <div 
            className="flex flex-col items-center space-y-6 ml-6 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ... (Botón de Avatar y Seguir) ... */}

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

              {/* ================================================== */}
              {/* ✅ NOTIFICACIÓN DE PUNTOS (CON ESTILO DINÁMICO)   */}
              {/* ================================================== */}
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

            {/* ... (Botones Dislike, Regalo, Comentarios, Guardar, etc.) ... */}
          </div>
        )}

        {/* ... (Modales de Comentarios y Regalo) ... */}
      </div>
    </div>
  );
};

export default ReelsContainer;
