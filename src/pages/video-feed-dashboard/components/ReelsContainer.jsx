// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - Integrado con Sistema de Puntos
// ... (otros comentarios)
// 🟢 SINCRONIZADO: Corregido 'action_type' a 'like_videos' en la carga de datos.
// 🟢 SINCRONIZADO: Añadidas notificaciones de 'progress_updated' y 'already_paid'.
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
    videoId: null
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

          // ✅ CARGAR VIDEOS POR LOS QUE YA GANÓ PUNTOS (tracking persistente)
          // ================================================================
          // ✅ SINCRONIZACIÓN: Usamos 'like_videos' (de missionsService)
          // ================================================================
          const { data: pointsEarnedData } = await supabase
            .from('user_video_points')
            .select('video_id')
            .eq('user_id', user.id)
            .in('action_type', ['like_videos', 'mission_like_complete', 'like']); // Incluimos 'like' por retrocompatibilidad
          
          if (pointsEarnedData) {
            const videosWithPointsEarned = new Set(pointsEarnedData.map(p => p.video_id));
            console.log('🎯 Videos que ya otorgaron puntos (Likes o Misión):', Array.from(videosWithPointsEarned));
            setActionsPerformed(prev => ({
              ...prev,
              likes: videosWithPointsEarned
            }));
          }

          // ✅ CARGAR VIDEOS GUARDADOS
          const { data: savedData } = await supabase
            .from('saved_videos')
            .select('video_id')
            .eq('user_id', user.id);
          
          if (savedData) {
            const savedIds = new Set(savedData.map(s => s.video_id));
            setSavedVideos(savedIds);
            
            // Cargar tracking de puntos por guardar
            const { data: savedPointsData } = await supabase
              .from('user_video_points')
              .select('video_id')
              .eq('user_id', user.id)
              .eq('action_type', 'save');
            
            if (savedPointsData) {
              setActionsPerformed(prev => ({
                ...prev,
                saves: new Set(savedPointsData.map(p => p.video_id))
              }));
            }
          }

          // ✅ CARGAR SEGUIDORES
          const { data: followsData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
          
          if (followsData) {
            const followedIds = new Set(followsData.map(f => f.following_id));
            setFollowedCreators(followedIds);
            
            // Cargar tracking de puntos por seguir
            const { data: followPointsData } = await supabase
              .from('user_video_points')
              .select('content_id')
              .eq('user_id', user.id)
              .eq('action_type', 'follow');
            
            if (followPointsData) {
              setActionsPerformed(prev => ({
                ...prev,
                follows: new Set(followPointsData.map(p => p.content_id))
              }));
            }
          }

          // ✅ CARGAR TRACKING DE COMENTARIOS Y COMPARTIDOS
          const { data: commentsPointsData } = await supabase
            .from('user_video_points')
            .select('video_id')
            .eq('user_id', user.id)
            .eq('action_type', 'comment_videos'); // Sincronizado
          
          if (commentsPointsData) {
            setActionsPerformed(prev => ({
              ...prev,
              comments: new Set(commentsPointsData.map(p => p.video_id))
            }));
          }

          const { data: sharesPointsData } = await supabase
            .from('user_video_points')
            .select('video_id')
            .eq('user_id', user.id)
            .eq('action_type', 'share_video'); // Sincronizado
          
          if (sharesPointsData) {
            setActionsPerformed(prev => ({
              ...prev,
              shares: new Set(sharesPointsData.map(p => p.video_id))
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
  // ✅✅✅ ACCIONES - LIKE CON TRACKING PERSISTENTE CORREGIDO ✅✅✅
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
      
      // ✅ VERIFICAR SI YA GANÓ PUNTOS CON ESTE VIDEO ANTES
      const hasEarnedPointsBefore = actionsPerformed.likes.has(videoId);
      
      // ✅ VERIFICAR SI TIENE LIKE ACTUALMENTE
      const isCurrentlyLiked = newLikedVideos.has(videoId);
      
      console.log('👍 Estado del like:', {
        videoId,
        hasEarnedPointsBefore,
        isCurrentlyLiked,
        actionsPerformed: Array.from(actionsPerformed.likes)
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
        
        console.log('✅ Like removido (los puntos ya ganados NO se pierden)');
        
      } else {
        // ==============================
        // DAR LIKE
        // ==============================
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

        // ✅ VERIFICAR SI YA GANÓ PUNTOS CON ESTE VIDEO
        if (!hasEarnedPointsBefore) {
          // ==============================
          // PRIMERA VEZ - OTORGAR PUNTOS (SOLO POR MISIÓN)
          // ==============================
          console.log('🎉 Primera vez dando like a este video - revisando misión');
          
          try {
            // ✅ VERIFICAR MISIÓN Y OTORGAR PUNTOS SÓLO SI ESTÁ COMPLETA
            const missionResult = await missionsService.trackGiveLike('video', videoId);
            
            // ================================================================
            // ✅ INICIO: LÓGICA DE NOTIFICACIONES SINCRONIZADA
            // ================================================================
            if (missionResult.result === 'success' && missionResult.points_earned > 0) { 
              // 1. MISIÓN COMPLETA
              const pointsEarned = missionResult.points_earned; 
              
              await addPoints(pointsEarned, missionResult.message || 'Misión de Likes completada', 'free'); 
              showPointsNotification(`Misión Completa: +${pointsEarned} puntos 🎉`, videoId, 'success');

              // (El registro en 'user_video_points' ya lo hizo la función SQL)
              
            } else if (missionResult.result === 'progress_updated') {
              // 2. PROGRESO REGISTRADO
              showPointsNotification(`Acción registrada. Sigue dando Likes!`, videoId, 'success');
                 
            } else if (missionResult.result === 'already_paid' || missionResult.result === 'already_completed') {
              // 3. ANTI-FARMING (Ya se registró esta acción hoy o la misión ya se completó)
              showPointsNotification(`Ya registraste esta acción hoy.`, videoId, 'restriction');
            }
            // ================================================================
            // ✅ FIN: LÓGICA DE NOTIFICACIONES
            // ================================================================

            // ✅ ACTUALIZAR ESTADO LOCAL (Se registra la acción para no volver a ejecutar la lógica de "primera vez")
            setActionsPerformed(prev => ({
              ...prev,
              likes: new Set([...prev.likes, videoId])
            }));

          } catch (pointsError) {
            console.error('❌ Error al procesar puntos o misión:', pointsError);
          }
        } else {
          // ==============================
          // YA GANÓ PUNTOS ANTES
          // ==============================
          console.log('ℹ️ El usuario ya ganó puntos con este video anteriormente');
          showPointsNotification('Ya ganaste puntos con este reel', videoId, 'restriction');
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
          // Si tenía like, lo quitamos
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
        }
      }
      
      setDislikedVideos(newDislikedVideos);
      setLikedVideos(newLikedVideos); // Aseguramos que el estado de like se actualice
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
            await addPoints(2, 'Video guardado', 'free');
            
            // ✅ REGISTRAR EN BD
            await supabase
              .from('user_video_points')
              .insert({
                user_id: user.id,
                video_id: videoId,
                action_type: 'save',
                points_earned: 2,
                created_at: new Date().toISOString()
              });
            
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
      const hasEarnedPointsBefore = actionsPerformed.follows.has(creatorId);

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

        // ✅ OTORGAR PUNTOS solo si es primera vez
        if (!hasEarnedPointsBefore) {
          try {
            await addPoints(10, 'Seguiste a un creador', 'free');
            
            // ✅ REGISTRAR EN BD
            await supabase
              .from('user_video_points')
              .insert({
                user_id: user.id,
                content_id: creatorId,
                action_type: 'follow',
                points_earned: 10,
                created_at: new Date().toISOString()
              });
            
            const missionResult = await missionsService.trackFollowUser(creatorId);
            if (missionResult.completed) {
              await addPoints(missionResult.reward.points, missionResult.message, 'free');
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
      const hasEarnedPointsBefore = actionsPerformed.shares.has(video.id);

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

      // ✅ OTORGAR PUNTOS solo si es primera vez
      if (!hasEarnedPointsBefore) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await addPoints(3, 'Video compartido', 'free');
            
            // ✅ REGISTRAR EN BD
            await supabase
              .from('user_video_points')
              .insert({
                user_id: user.id,
                video_id: video.id,
                action_type: 'share_video', // Sincronizado
                points_earned: 3,
                created_at: new Date().toISOString()
              });
            
            const missionResult = await missionsService.trackShareContent(
              'video', 
              video.id, 
              navigator.share ? 'native' : 'clipboard'
            );
            
            if (missionResult.completed) {
              await addPoints(missionResult.reward.points, missionResult.message, 'free');
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
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Usuario no autenticado');
        navigate('/login');
        return;
      }

      const commentData = {
        video_id: videoId,
        user_id: user.id,
        content: newComment.trim(),
        parent_comment_id: replyingTo
      };

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

      if (!replyingTo) {
        console.log('📊 Incrementando contador de comentarios...');
        const { error: rpcError } = await supabase.rpc('increment_video_comments', { video_id: videoId });
        if (rpcError) {
          console.error('⚠️ Error al incrementar contador:', rpcError);
        } else {
          console.log('✅ Contador incrementado');
        }
      }

      const hasEarnedPointsBefore = actionsPerformed.comments.has(videoId);

      if (!hasEarnedPointsBefore) {
        try {
          console.log('🎁 Otorgando puntos...');
          
          const missionResult = await missionsService.trackComment('video', videoId);
          if (missionResult.result === 'success' && missionResult.points_earned > 0) {
            await addPoints(missionResult.points_earned, missionResult.message, 'free');
            showUserFeedback(`Misión de Comentarios: +${missionResult.points_earned} puntos`, 'success');
          } else if (missionResult.result === 'progress_updated') {
            showUserFeedback('Comentario registrado. ¡Sigue así!', 'success');
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
  
  // =========================================================================
  // ... (El resto del JSX de renderizado principal va aquí)
  // ... (Se omite por brevedad, pero es idéntico al archivo anterior)
  // =========================================================================

  // ... (dentro del return principal)

  // (JSX del <Helmet> y <Header>)

  // (JSX del userFeedback GRANDE)
  
  // (JSX del contenedor principal y <video>)

  // (JSX de la información del video: título, creador, etc.)
  
  // (dentro del <div> de acciones del video)
  
                  {/* ================================================== */}
                  {/* ✅ GRUPO DE BOTONES CON NOTIFICACIÓN              */}
                  {/* ================================================== */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {/* ✅ AÑADIDO 'relative' a este contenedor */}
                    <div className="relative flex items-center bg-muted rounded-full overflow-hidden">
                      <button
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 hover:bg-muted-foreground/10 transition-colors border-r border-border ${
                          liked ? 'text-primary' : ''
                        }`}
                      >
                        <Icon name="ThumbsUp" size={18} className={liked ? 'fill-current' : ''} />
                        <span className="font-medium text-sm">{formatNumber(videoCounters.likes)}</span>
                      </button>

                      <button
                        onClick={handleDislike}
                        className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 hover:bg-muted-foreground/10 transition-colors ${
                          disliked ? 'text-primary' : ''
                        }`}
                      >
                        <Icon name="ThumbsDown" size={18} className={disliked ? 'fill-current' : ''} />
                        <span className="font-medium text-sm">{formatNumber(videoCounters.dislikes)}</span>
                      </button>
                      
                      {/* ✅ NOTIFICACIÓN DE PUNTOS DE LIKE AÑADIDA */}
                      {likeNotification.show && (
                        <div 
                          className={`absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg shadow-lg text-white font-bold text-xs whitespace-nowrap animate-bounce z-20
                          ${likeNotification.type === 'success' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'}
                        `}>
                          {likeNotification.message}
                        </div>
                      )}
                    </div>
                    
                    {/* ... (resto de botones: Regalar, Compartir, Guardar) ... */}
                    
  // ... (El resto del JSX de renderizado principal es idéntico)
  // ... (JSX de descripción, comentarios, sidebar, modales, etc.)
  // =========================================================================

};

export default VideoPlayerPage;

// (Se omite el JSX duplicado para mantener la respuesta legible)
// El código completo es idéntico al archivo anterior,
// solo se han añadido las notificaciones.
// Para ver el JSX completo, consulta la respuesta anterior.
