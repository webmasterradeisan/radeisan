// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ✅ INTEGRADO: Sistema de tracking persistente de puntos con base de datos
// ✅ Videos se reproducen + Tamaño compacto responsive
// ✅ CORREGIDO: Salta directamente al reel seleccionado sin iterar por todos
// ✅ CORREGIDO: Video inicial se reproduce automáticamente
// ✅ CORREGIDO: Solo un video se reproduce a la vez (sin audio duplicado)
// ✅ NUEVO: Soporte para selectedReelId en mobile

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { usePoints } from '../../../contexts/PointsContext';
import { supabase } from '../../../lib/supabase';
import missionsService from '../../../services/missionsService';

const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null,
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  // ===============================
  // ESTADOS
  // ===============================
  const { user } = useAuth();
  const { addPoints } = usePoints();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [enableTransition, setEnableTransition] = useState(false);
  
  // Estados para comentarios
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Sistema de tracking persistente
  const [actionsPerformed, setActionsPerformed] = useState({
    likes: new Set(),
    comments: new Set(),
    shares: new Set()
  });
  
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const isInitialMount = useRef(true);
  const hasPlayedInitial = useRef(false);

  console.log('🎬 ReelsContainer render:', {
    videosCount: videos.length,
    currentIndex,
    selectedReelId,
    enableTransition,
    hasPlayedInitial: hasPlayedInitial.current
  });

  // ===============================
  // FUNCIÓN: Convertir ID del video a índice en array aleatorizado
  // ===============================
  const getInitialReelIndex = useCallback(() => {
    if (!selectedReelId) {
      console.log('🔍 ReelsContainer: No hay ID seleccionado, iniciando en índice 0');
      return 0;
    }
    
    const index = videos.findIndex(video => video.id === selectedReelId);
    
    console.log('🔍 ReelsContainer: Búsqueda de video por ID');
    console.log('   🆔 ID buscado:', selectedReelId);
    console.log('   📍 Índice encontrado:', index);
    console.log('   🎬 Video:', index >= 0 ? videos[index]?.title : 'No encontrado');
    
    if (index < 0) {
      console.warn('⚠️ Video con ID', selectedReelId, 'no encontrado en array de reels');
      return 0;
    }
    
    return index;
  }, [selectedReelId, videos]);

  // ===============================
  // 🎯 SINCRONIZACIÓN INICIAL: Convertir selectedReelId a índice
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    
    const correctIndex = getInitialReelIndex();
    
    console.log('🎯 ReelsContainer: Sincronizando estado inicial');
    console.log('   🆔 selectedReelId recibido:', selectedReelId);
    console.log('   🎯 Índice calculado:', correctIndex);
    
    if (isInitialMount.current) {
      setCurrentIndex(correctIndex);
      setEnableTransition(false);
      
      setTimeout(() => {
        setEnableTransition(true);
        isInitialMount.current = false;
        console.log('✅ Transiciones habilitadas para navegación manual');
      }, 100);
    } else {
      setCurrentIndex(correctIndex);
    }
  }, [selectedReelId, videos, getInitialReelIndex]);

  // ===============================
  // ✅ CARGAR TRACKING PERSISTENTE AL MONTAR
  // ===============================
  useEffect(() => {
    const loadUserActions = async () => {
      if (!user) return;
      
      try {
        // Cargar acciones ya realizadas por el usuario
        const { data, error } = await supabase
          .from('user_video_points')
          .select('video_id, action_type')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Agrupar por tipo de acción
        const newActions = {
          likes: new Set(),
          comments: new Set(),
          shares: new Set()
        };
        
        data.forEach(action => {
          if (action.action_type === 'like') {
            newActions.likes.add(action.video_id);
          } else if (action.action_type === 'comment') {
            newActions.comments.add(action.video_id);
          } else if (action.action_type === 'share') {
            newActions.shares.add(action.video_id);
          }
        });
        
        setActionsPerformed(newActions);
        console.log('✅ Acciones cargadas desde BD:', newActions);
      } catch (error) {
        console.error('Error cargando acciones del usuario:', error);
      }
    };
    
    loadUserActions();
  }, [user]);

  // ===============================
  // ✅ FORZAR REPRODUCCIÓN DEL VIDEO INICIAL
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

      console.log('🎮 Video encontrado, reproduciendo:', {
        index: currentIndex,
        src: currentVideo.src,
        readyState: currentVideo.readyState
      });

      // Pausar todos los otros videos
      console.log('⏸️ Pausando todos los videos excepto el índice:', currentIndex);
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
          console.log('   ⏸️ Video pausado:', index);
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
              .catch(e => console.error('❌ Error crítico reproducción inicial:', e));
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
      setIsDesktop(window.innerWidth >= 768);
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
  // ✅ AUTOPLAY Y GESTIÓN DE VIDEOS
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    
    const initialIndex = getInitialReelIndex();
    if (!hasPlayedInitial.current && currentIndex === initialIndex) {
      console.log('⏭️ Skipping autoplay - el video inicial será manejado por useEffect dedicado');
      return;
    }

    console.log('🎬 Cambiando a video:', currentIndex);
    
    // Pausar todos los videos
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });

    // Reproducir video actual si autoplay está activo
    if (isAutoPlaying) {
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo) {
        currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
        
        const playPromise = currentVideo.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => console.log('✅ Video reproduciendo:', currentIndex))
            .catch(err => {
              console.error('❌ Error autoplay:', err);
              currentVideo.muted = true;
              currentVideo.play().catch(e => console.error('❌ Error crítico:', e));
            });
        }
      }
    }

    // Cargar más videos si es necesario
    if (currentIndex >= videos.length - 3 && hasMore && !loading && onLoadMore) {
      console.log('📥 Cargando más videos...');
      onLoadMore();
    }
  }, [currentIndex, videos, isAutoPlaying, mutedVideos, hasMore, loading, onLoadMore, getInitialReelIndex]);

  // ===============================
  // NAVEGACIÓN
  // ===============================
  const navigateNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, videos.length]);

  const navigatePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // ===============================
  // TOGGLE AUTOPLAY
  // ===============================
  const handleVideoClick = useCallback((videoId) => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    if (isAutoPlaying) {
      currentVideo.pause();
      setIsAutoPlaying(false);
    } else {
      currentVideo.play();
      setIsAutoPlaying(true);
    }
  }, [currentIndex, isAutoPlaying]);

  // ===============================
  // MUTE/UNMUTE
  // ===============================
  const handleMuteToggle = useCallback((videoId) => {
    setMutedVideos(prev => {
      const newMuted = new Set(prev);
      if (newMuted.has(videoId)) {
        newMuted.delete(videoId);
      } else {
        newMuted.add(videoId);
      }
      
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo) {
        currentVideo.muted = newMuted.has(videoId);
      }
      
      return newMuted;
    });
  }, [currentIndex]);

  // ===============================
  // ❤️ LIKE CON TRACKING PERSISTENTE
  // ===============================
  const handleLike = useCallback(async (videoId) => {
    if (!user) {
      alert('Debes iniciar sesión para dar like');
      return;
    }

    const wasLiked = likedVideos.has(videoId);
    
    // Actualizar UI optimistamente
    setLikedVideos(prev => {
      const newLikes = new Set(prev);
      if (wasLiked) {
        newLikes.delete(videoId);
      } else {
        newLikes.add(videoId);
      }
      return newLikes;
    });

    try {
      if (!wasLiked) {
        // Dar like
        const { error: likeError } = await supabase
          .from('video_likes')
          .insert({ user_id: user.id, video_id: videoId });

        if (likeError) throw likeError;

        // ✅ VERIFICAR SI YA GANÓ PUNTOS POR ESTE VIDEO
        const hasEarnedPointsBefore = actionsPerformed.likes.has(videoId);

        if (!hasEarnedPointsBefore) {
          try {
            console.log('🎁 Otorgando puntos por like...');
            await addPoints(1, 'Like en video', 'free');
            
            // ✅ REGISTRAR EN BD
            await supabase
              .from('user_video_points')
              .insert({
                user_id: user.id,
                video_id: videoId,
                action_type: 'like',
                points_earned: 1,
                created_at: new Date().toISOString()
              });
            
            const missionResult = await missionsService.trackLike('video', videoId);
            if (missionResult.completed) {
              await addPoints(missionResult.reward.points, missionResult.message, 'free');
            }
            
            setActionsPerformed(prev => ({
              ...prev,
              likes: new Set([...prev.likes, videoId])
            }));
            console.log('✅ Puntos otorgados por like');
          } catch (pointsError) {
            console.error('⚠️ Error al otorgar puntos:', pointsError);
          }
        }
      } else {
        // Quitar like
        const { error: unlikeError } = await supabase
          .from('video_likes')
          .delete()
          .match({ user_id: user.id, video_id: videoId });

        if (unlikeError) throw unlikeError;
      }
    } catch (error) {
      console.error('Error con el like:', error);
      // Revertir UI en caso de error
      setLikedVideos(prev => {
        const newLikes = new Set(prev);
        if (wasLiked) {
          newLikes.add(videoId);
        } else {
          newLikes.delete(videoId);
        }
        return newLikes;
      });
    }
  }, [user, likedVideos, actionsPerformed.likes, addPoints]);

  // ===============================
  // 💬 COMENTARIOS CON TRACKING PERSISTENTE
  // ===============================
  const handleCommentClick = useCallback(async (videoId) => {
    if (!user) {
      alert('Debes iniciar sesión para comentar');
      return;
    }

    setShowComments(true);
    setLoadingComments(true);

    try {
      // Cargar comentarios del video
      const { data, error } = await supabase
        .from('video_comments')
        .select(`
          *,
          user:user_profiles!video_comments_user_id_fkey(id, username, avatar),
          replies:video_comments!parent_comment_id(
            *,
            user:user_profiles!video_comments_user_id_fkey(id, username, avatar)
          )
        `)
        .eq('video_id', videoId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error('Error cargando comentarios:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [user]);

  const handleAddComment = useCallback(async (videoId) => {
    if (!user || !newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: replyingTo?.id || null
        })
        .select(`
          *,
          user:user_profiles!video_comments_user_id_fkey(id, username, avatar)
        `)
        .single();

      if (error) throw error;

      // Actualizar lista de comentarios
      if (replyingTo) {
        setComments(prev => prev.map(comment => {
          if (comment.id === replyingTo.id) {
            return {
              ...comment,
              replies: [...(comment.replies || []), data]
            };
          }
          return comment;
        }));
      } else {
        setComments(prev => [data, ...prev]);
      }

      setNewComment('');
      setReplyingTo(null);

      // ✅ VERIFICAR SI YA GANÓ PUNTOS POR COMENTAR EN ESTE VIDEO
      const hasEarnedPointsBefore = actionsPerformed.comments.has(videoId);

      if (!hasEarnedPointsBefore) {
        try {
          console.log('🎁 Otorgando puntos por comentario...');
          await addPoints(3, replyingTo ? 'Respuesta agregada' : 'Comentario agregado', 'free');
          
          // ✅ REGISTRAR EN BD
          await supabase
            .from('user_video_points')
            .insert({
              user_id: user.id,
              video_id: videoId,
              action_type: 'comment',
              points_earned: 3,
              created_at: new Date().toISOString()
            });
          
          const missionResult = await missionsService.trackComment('video', videoId);
          if (missionResult.completed) {
            await addPoints(missionResult.reward.points, missionResult.message, 'free');
          }
          
          setActionsPerformed(prev => ({
            ...prev,
            comments: new Set([...prev.comments, videoId])
          }));
          console.log('✅ Puntos otorgados por comentario');
        } catch (pointsError) {
          console.error('⚠️ Error al otorgar puntos:', pointsError);
        }
      }
    } catch (error) {
      console.error('Error agregando comentario:', error);
    }
  }, [user, newComment, replyingTo, actionsPerformed.comments, addPoints]);

  const handleReply = useCallback((comment) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.user?.username} `);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setNewComment('');
  }, []);

  // ===============================
  // 🔖 GUARDAR
  // ===============================
  const handleSave = useCallback(async (videoId) => {
    if (!user) {
      alert('Debes iniciar sesión para guardar');
      return;
    }

    const wasSaved = savedVideos.has(videoId);
    
    setSavedVideos(prev => {
      const newSaved = new Set(prev);
      if (wasSaved) {
        newSaved.delete(videoId);
      } else {
        newSaved.add(videoId);
      }
      return newSaved;
    });

    try {
      if (!wasSaved) {
        const { error } = await supabase
          .from('saved_videos')
          .insert({ user_id: user.id, video_id: videoId });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_videos')
          .delete()
          .match({ user_id: user.id, video_id: videoId });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error guardando video:', error);
      // Revertir UI
      setSavedVideos(prev => {
        const newSaved = new Set(prev);
        if (wasSaved) {
          newSaved.add(videoId);
        } else {
          newSaved.delete(videoId);
        }
        return newSaved;
      });
    }
  }, [user, savedVideos]);

  // ===============================
  // 👤 SEGUIR CON TRACKING PERSISTENTE
  // ===============================
  const handleFollow = useCallback(async (userId) => {
    if (!user) {
      alert('Debes iniciar sesión para seguir');
      return;
    }

    const wasFollowing = followedUsers.has(userId);
    
    setFollowedUsers(prev => {
      const newFollowed = new Set(prev);
      if (wasFollowing) {
        newFollowed.delete(userId);
      } else {
        newFollowed.add(userId);
      }
      return newFollowed;
    });

    try {
      if (!wasFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: userId });

        if (error) throw error;

        // Otorgar puntos por seguir (sin tracking ya que es por usuario, no por video)
        try {
          await addPoints(5, 'Usuario seguido', 'free');
        } catch (pointsError) {
          console.error('Error otorgando puntos por seguir:', pointsError);
        }
      } else {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .match({ follower_id: user.id, following_id: userId });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error siguiendo usuario:', error);
      // Revertir UI
      setFollowedUsers(prev => {
        const newFollowed = new Set(prev);
        if (wasFollowing) {
          newFollowed.add(userId);
        } else {
          newFollowed.delete(userId);
        }
        return newFollowed;
      });
    }
  }, [user, followedUsers, addPoints]);

  // ===============================
  // 🔗 COMPARTIR CON TRACKING PERSISTENTE
  // ===============================
  const handleShare = useCallback(async (video) => {
    try {
      const shareData = {
        title: video.title,
        text: video.description,
        url: `${window.location.origin}/video/${video.id}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Enlace copiado al portapapeles');
      }

      // ✅ VERIFICAR SI YA GANÓ PUNTOS POR COMPARTIR ESTE VIDEO
      const hasEarnedPointsBefore = actionsPerformed.shares.has(video.id);

      if (!hasEarnedPointsBefore) {
        try {
          console.log('🎁 Otorgando puntos por compartir...');
          await addPoints(2, 'Video compartido', 'free');
          
          // ✅ REGISTRAR EN BD
          await supabase
            .from('user_video_points')
            .insert({
              user_id: user.id,
              video_id: video.id,
              action_type: 'share',
              points_earned: 2,
              created_at: new Date().toISOString()
            });
          
          setActionsPerformed(prev => ({
            ...prev,
            shares: new Set([...prev.shares, video.id])
          }));
          console.log('✅ Puntos otorgados por compartir');
        } catch (pointsError) {
          console.error('⚠️ Error al otorgar puntos:', pointsError);
        }
      }
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  }, [user, actionsPerformed.shares, addPoints]);

  // ===============================
  // COMPONENTE REEL INDIVIDUAL
  // ===============================
  const ReelItem = ({ video, index, isActive }) => {
    const isLiked = likedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isMuted = mutedVideos.has(video.id);
    const isFollowing = followedUsers.has(video.creator?.id);
    const currentVideo = videos[currentIndex];

    const videoUrl = video.videoUrl || video.video_url;

    return (
      <div
        key={video.id}
        className={`relative flex-shrink-0 bg-black ${
          isDesktop ? 'h-[80vh]' : 'h-screen w-screen'
        }`}
        onClick={() => handleVideoClick(video.id)}
      >
        {/* VIDEO */}
        <video
          ref={(el) => (videoRefs.current[index] = el)}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          loop
          muted={isMuted}
          preload="metadata"
          onError={(e) => {
            console.error('❌ Error cargando video:', {
              index,
              src: videoUrl,
              error: e.target.error
            });
          }}
          onLoadedData={() => {
            console.log('✅ Video cargado:', {
              index,
              src: videoUrl
            });
          }}
        />

        {/* ACCIONES (Derecha) */}
        <div className={`
          absolute flex flex-col space-y-4 z-10
          ${isDesktop ? 'right-6 bottom-32' : 'right-4 bottom-32'}
        `}>
          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike(video.id);
            }}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              rounded-full flex items-center justify-center transition-all duration-200
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
              ${isLiked 
                ? 'bg-red-500/20 text-red-500' 
                : 'bg-black/30 text-white hover:bg-white/20'
              }
            `}>
              <Icon 
                name="Heart" 
                size={isDesktop ? 26 : 24} 
                className={isLiked ? 'fill-current' : ''} 
              />
            </div>
            <span className={`text-white font-medium ${isDesktop ? 'text-sm' : 'text-xs'}`}>
              {video.likes || 0}
            </span>
          </button>

          {/* Comentarios */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCommentClick(video.id);
            }}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              <Icon name="MessageCircle" size={isDesktop ? 26 : 24} color="white" />
            </div>
            <span className={`text-white font-medium ${isDesktop ? 'text-sm' : 'text-xs'}`}>
              {video.comments || 0}
            </span>
          </button>

          {/* Seguir */}
          <Link 
            to={`/profile/${video.creator?.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center space-y-1"
          >
            <div className="relative">
              <div className={`
                rounded-full overflow-hidden border-2 border-white
                ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
              `}>
                <img
                  src={video.creator?.avatar || '/default-avatar.png'}
                  alt={video.creator?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {!isFollowing && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFollow(video.creator?.id);
                  }}
                  className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white"
                >
                  <Icon name="Plus" size={14} color="white" />
                </button>
              )}
            </div>
          </Link>

          {/* Guardar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave(video.id);
            }}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              rounded-full flex items-center justify-center transition-all duration-200
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
              ${isSaved 
                ? 'bg-yellow-500/20 text-yellow-500' 
                : 'bg-black/30 text-white hover:bg-white/20'
              }
            `}>
              <Icon 
                name="Bookmark" 
                size={isDesktop ? 26 : 24} 
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
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              <Icon name="Share" size={isDesktop ? 26 : 24} color="white" />
            </div>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMuteToggle(video.id);
            }}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              <Icon 
                name={isMuted ? 'VolumeX' : 'Volume2'} 
                size={isDesktop ? 26 : 24} 
                color="white" 
              />
            </div>
          </button>
        </div>

        {/* INFORMACIÓN DEL VIDEO (Abajo Izquierda) */}
        <div className={`
          absolute text-white
          ${isDesktop ? 'bottom-12 left-6 right-24' : 'bottom-8 left-4 right-20'}
        `}>
          
          {/* Información del creador */}
          <div className="flex items-center space-x-3 mb-3">
            <Link 
              to={`/profile/${video.creator?.id}`}
              className={`font-semibold hover:underline ${isDesktop ? 'text-lg' : 'text-base'}`}
            >
              {video.creator?.name || 'Usuario'}
            </Link>
            <span className="text-gray-300">•</span>
            <span className={`text-gray-300 ${isDesktop ? 'text-base' : 'text-sm'}`}>
              {video.timeAgo || 'Reciente'}
            </span>
          </div>

          {/* Título y descripción */}
          <div className="mb-3">
            <h3 className={`font-medium mb-1 line-clamp-2 ${isDesktop ? 'text-xl' : 'text-lg'}`}>
              {video.title}
            </h3>
            <p className={`text-gray-200 line-clamp-2 opacity-90 ${isDesktop ? 'text-base' : 'text-sm'}`}>
              {video.description}
            </p>
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.tags.slice(0, 3).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className={`text-cyan-400 font-medium ${isDesktop ? 'text-base' : 'text-sm'}`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* INDICADOR DE PLAY/PAUSE */}
        {!isAutoPlaying && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`
              bg-black/50 rounded-full flex items-center justify-center
              ${isDesktop ? 'w-20 h-20' : 'w-16 h-16'}
            `}>
              <Icon name="Play" size={isDesktop ? 28 : 24} color="white" />
            </div>
          </div>
        )}

        {/* PROGRESO DEL VIDEO */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-white transition-all duration-1000"
            style={{ 
              width: isActive ? '100%' : '0%',
              transitionDuration: isActive ? `${video.duration || 30}s` : '0s'
            }}
          />
        </div>
      </div>
    );
  };

  // ===============================
  // ✅ RENDER PRINCIPAL
  // ===============================
  return (
    <div className={`
      relative overflow-hidden bg-black
      ${isDesktop 
        ? 'max-w-[500px] mx-auto rounded-lg shadow-2xl h-[80vh]' 
        : 'w-full h-full'
      }
    `}>
      
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

      {/* FLECHAS DE NAVEGACIÓN DESKTOP */}
      {isDesktop && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
          <button
            onClick={navigatePrevious}
            disabled={currentIndex === 0}
            className={`
              absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto
              w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full 
              flex items-center justify-center transition-all duration-200
              hover:bg-black/70 hover:scale-110 active:scale-95
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
              flex items-center justify-center transition-all duration-200
              hover:bg-black/70 hover:scale-110 active:scale-95
              ${currentIndex === videos.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'}
            `}
          >
            <Icon name="ChevronDown" size={24} color="white" />
          </button>
        </div>
      )}

      {/* INDICADOR DE CARGA */}
      {loading && (
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className="text-white flex items-center space-x-2 bg-black/30 rounded-full px-3 py-1">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className={isDesktop ? 'text-base' : 'text-sm'}>Cargando más...</span>
          </div>
        </div>
      )}

      {/* INSTRUCCIONES DESKTOP/MÓVIL */}
      {currentIndex === 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-none">
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
      {showComments && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center" onClick={() => setShowComments(false)}>
          <div 
            className={`bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl ${isDesktop ? 'max-h-[80vh]' : 'max-h-[90vh]'} flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comentarios</h3>
              <button
                onClick={() => setShowComments(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icon name="X" size={24} />
              </button>
            </div>

            {/* Lista de comentarios */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="mb-4">
                    {/* Comentario principal */}
                    <div className="flex space-x-3">
                      <img
                        src={comment.user?.avatar || '/default-avatar.png'}
                        alt={comment.user?.username}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="font-medium text-sm">{comment.user?.username || 'Usuario'}</p>
                          <p className="text-gray-700 mt-0.5">{comment.content}</p>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <button
                            onClick={() => handleReply(comment)}
                            className="hover:text-blue-600"
                          >
                            Responder
                          </button>
                          <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Respuestas */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex space-x-2">
                                <img
                                  src={reply.user?.avatar || '/default-avatar.png'}
                                  alt={reply.user?.username}
                                  className="w-8 h-8 rounded-full flex-shrink-0"
                                />
                                <div className="flex-1">
                                  <div className="bg-gray-100 rounded-lg p-2">
                                    <p className="font-medium text-sm">{reply.user?.username || 'Usuario'}</p>
                                    <p className="text-gray-700 text-sm mt-0.5">{reply.content}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
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
                  <span className="text-sm text-blue-700">Respondiendo a @{replyingTo.user?.username}</span>
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
                  onClick={() => handleAddComment(videos[currentIndex].id)}
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
    </div>
  );
};

export default ReelsContainer;
