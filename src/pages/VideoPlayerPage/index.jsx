// src/pages/VideoPlayerPage/index.jsx
// ============================================================================
// VIDEO PLAYER PAGE - Estilo YouTube con Sistema de Puntos Completo
// ============================================================================
// ✅ Sistema de comentarios completo
// ✅ Likes y Dislikes
// ✅ Favoritos/Guardados
// ✅ Compartir
// ✅ Control de volumen
// ✅ Sincronización con puntos gratis y premium
// ✅ Diseño similar a YouTube
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from 'lib/supabase';
import { useAuth } from 'contexts/AuthContext';
import { usePoints } from 'contexts/PointsContext';
import * as missionsService from 'services/missionsService';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import RelatedVideosSidebar from 'components/video/RelatedVideosSidebar';
import useIsMobile from 'hooks/useIsMobile';

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const VideoPlayerPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPoints, points } = usePoints();
  const isMobile = useIsMobile();

  // Estados del video
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);

  // Estados de interacción
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [videoCounters, setVideoCounters] = useState({
    likes: 0,
    dislikes: 0,
    views: 0,
    comments: 0
  });

  // Estados de video player
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Estados de comentarios
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReplies, setShowReplies] = useState({});

  // Estados de tracking de puntos
  const [hasEarnedViewPoints, setHasEarnedViewPoints] = useState(false);
  const [hasEarnedLikePoints, setHasEarnedLikePoints] = useState(false);
  const [hasEarnedCommentPoints, setHasEarnedCommentPoints] = useState(false);
  const [hasEarnedSharePoints, setHasEarnedSharePoints] = useState(false);
  const [viewWatchTime, setViewWatchTime] = useState(0);

  // Estados de modal compartir
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Estados de notificaciones
  const [pointsNotification, setPointsNotification] = useState({
    show: false,
    message: ''
  });

  // Refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const viewTrackingRef = useRef(null);

  // ===============================
  // FUNCIONES DE CARGA DE DATOS
  // ===============================

  // Cargar datos del video
  const fetchVideoData = useCallback(async () => {
    if (!videoId) return;

    try {
      setLoading(true);
      setError(null);

      // Obtener datos del video con información del creador
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select(`
          *,
          creator:user_profiles!videos_user_id_fkey (
            id,
            name,
            username,
            profile_image_url,
            is_verified
          )
        `)
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;

      setVideo(videoData);

      // Incrementar contador de vistas
      await supabase.rpc('increment_video_views', { video_id: videoId });

      // Obtener contadores actualizados
      const { data: countersData } = await supabase
        .from('videos')
        .select('likes_count, dislikes_count, views_count, comments_count')
        .eq('id', videoId)
        .single();

      if (countersData) {
        setVideoCounters({
          likes: countersData.likes_count || 0,
          dislikes: countersData.dislikes_count || 0,
          views: countersData.views_count || 0,
          comments: countersData.comments_count || 0
        });
      }

      // Si hay usuario logueado, verificar estados de interacción
      if (user) {
        // Verificar like
        const { data: likeData } = await supabase
          .from('video_likes')
          .select('*')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();

        setLiked(!!likeData);

        // Verificar dislike
        const { data: dislikeData } = await supabase
          .from('video_dislikes')
          .select('*')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();

        setDisliked(!!dislikeData);

        // Verificar guardado
        const { data: savedData } = await supabase
          .from('saved_videos')
          .select('*')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();

        setSaved(!!savedData);

        // Verificar si sigue al creador
        const { data: followData } = await supabase
          .from('user_follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', videoData.creator.id)
          .maybeSingle();

        setFollowing(!!followData);

        // Verificar puntos ya ganados
        const { data: pointsData } = await supabase
          .from('user_video_points')
          .select('action_type')
          .eq('user_id', user.id)
          .eq('video_id', videoId);

        if (pointsData) {
          const actions = pointsData.map(p => p.action_type);
          setHasEarnedLikePoints(actions.includes('like'));
          setHasEarnedCommentPoints(actions.includes('comment'));
          setHasEarnedSharePoints(actions.includes('share'));
          setHasEarnedViewPoints(actions.includes('view'));
        }
      }

      // Cargar videos relacionados
      loadRelatedVideos(videoData.category_id);

    } catch (err) {
      console.error('Error al cargar video:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [videoId, user]);

  // Cargar videos relacionados
  const loadRelatedVideos = async (categoryId) => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          creator:user_profiles!videos_user_id_fkey (
            id,
            name,
            username,
            profile_image_url,
            is_verified
          )
        `)
        .eq('category_id', categoryId)
        .neq('id', videoId)
        .eq('status', 'published')
        .order('views_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRelatedVideos(data || []);
    } catch (err) {
      console.error('Error al cargar videos relacionados:', err);
    }
  };

  // Cargar comentarios
  const loadComments = useCallback(async () => {
    if (!videoId) return;

    try {
      setLoadingComments(true);

      const { data, error } = await supabase
        .from('video_comments')
        .select(`
          *,
          user:user_profiles!video_comments_user_id_fkey (
            id,
            name,
            username,
            profile_image_url,
            is_verified
          ),
          replies:video_comments!parent_comment_id (
            *,
            user:user_profiles!video_comments_user_id_fkey (
              id,
              name,
              username,
              profile_image_url,
              is_verified
            )
          )
        `)
        .eq('video_id', videoId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error al cargar comentarios:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [videoId]);

  // ===============================
  // FUNCIONES DE INTERACCIÓN
  // ===============================

  // Mostrar notificación de puntos
  const showPointsNotification = (message) => {
    setPointsNotification({ show: true, message });
    setTimeout(() => {
      setPointsNotification({ show: false, message: '' });
    }, 3000);
  };

  // Registrar puntos ganados
  const trackPointsEarned = async (actionType, pointsAmount) => {
    if (!user) return;

    try {
      await supabase
        .from('user_video_points')
        .insert({
          user_id: user.id,
          video_id: videoId,
          action_type: actionType,
          points_earned: pointsAmount
        });
    } catch (err) {
      console.error('Error al registrar puntos:', err);
    }
  };

  // Handle Like
  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (liked) {
        // Quitar like
        setLiked(false);
        setVideoCounters(prev => ({
          ...prev,
          likes: Math.max(0, prev.likes - 1)
        }));

        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_video_likes', { video_id: videoId });

      } else {
        // Dar like
        setLiked(true);
        setVideoCounters(prev => ({
          ...prev,
          likes: prev.likes + 1
        }));

        // Si tiene dislike, quitarlo
        if (disliked) {
          setDisliked(false);
          setVideoCounters(prev => ({
            ...prev,
            dislikes: Math.max(0, prev.dislikes - 1)
          }));

          await supabase
            .from('video_dislikes')
            .delete()
            .eq('video_id', videoId)
            .eq('user_id', user.id);

          await supabase.rpc('decrement_video_dislikes', { video_id: videoId });
        }

        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_likes', { video_id: videoId });

        // Otorgar puntos si es la primera vez
        if (!hasEarnedLikePoints) {
          const pointsAmount = 5;
          await addPoints(pointsAmount, 'Like en video', 'free');
          await trackPointsEarned('like', pointsAmount);
          setHasEarnedLikePoints(true);
          showPointsNotification(`+${pointsAmount} puntos por dar like 🎉`);

          // Tracking de misión
          missionsService.trackAction('like');
        }
      }
    } catch (err) {
      console.error('Error en like:', err);
    }
  };

  // Handle Dislike
  const handleDislike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (disliked) {
        // Quitar dislike
        setDisliked(false);
        setVideoCounters(prev => ({
          ...prev,
          dislikes: Math.max(0, prev.dislikes - 1)
        }));

        await supabase
          .from('video_dislikes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_video_dislikes', { video_id: videoId });

      } else {
        // Dar dislike
        setDisliked(true);
        setVideoCounters(prev => ({
          ...prev,
          dislikes: prev.dislikes + 1
        }));

        // Si tiene like, quitarlo
        if (liked) {
          setLiked(false);
          setVideoCounters(prev => ({
            ...prev,
            likes: Math.max(0, prev.likes - 1)
          }));

          await supabase
            .from('video_likes')
            .delete()
            .eq('video_id', videoId)
            .eq('user_id', user.id);

          await supabase.rpc('decrement_video_likes', { video_id: videoId });
        }

        await supabase
          .from('video_dislikes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_dislikes', { video_id: videoId });
      }
    } catch (err) {
      console.error('Error en dislike:', err);
    }
  };

  // Handle Guardar/Favorito
  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (saved) {
        // Quitar de guardados
        setSaved(false);

        await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

      } else {
        // Guardar
        setSaved(true);

        await supabase
          .from('saved_videos')
          .insert({ video_id: videoId, user_id: user.id });

        // Tracking de misión
        missionsService.trackAction('save');

        showPointsNotification('Video guardado en favoritos');
      }
    } catch (err) {
      console.error('Error al guardar:', err);
    }
  };

  // Handle Compartir
  const handleShare = async () => {
    const url = `${window.location.origin}/video/${videoId}`;
    setShareLink(url);
    setShowShareModal(true);

    // Otorgar puntos si es la primera vez
    if (user && !hasEarnedSharePoints) {
      const pointsAmount = 3;
      await addPoints(pointsAmount, 'Compartir video', 'free');
      await trackPointsEarned('share', pointsAmount);
      setHasEarnedSharePoints(true);
      showPointsNotification(`+${pointsAmount} puntos por compartir 🎉`);

      // Tracking de misión
      missionsService.trackAction('share');
    }
  };

  // Copiar link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Handle Seguir
  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (following) {
        // Dejar de seguir
        setFollowing(false);

        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', video.creator.id);

      } else {
        // Seguir
        setFollowing(true);

        await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: video.creator.id
          });

        // Tracking de misión
        missionsService.trackAction('follow');

        showPointsNotification('Ahora sigues a este creador');
      }
    } catch (err) {
      console.error('Error al seguir:', err);
    }
  };

  // ===============================
  // FUNCIONES DE COMENTARIOS
  // ===============================

  // Publicar comentario
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!newComment.trim()) return;

    try {
      const commentData = {
        video_id: videoId,
        user_id: user.id,
        content: newComment.trim(),
        parent_comment_id: replyingTo
      };

      const { data, error } = await supabase
        .from('video_comments')
        .insert(commentData)
        .select(`
          *,
          user:user_profiles!video_comments_user_id_fkey (
            id,
            name,
            username,
            profile_image_url,
            is_verified
          )
        `)
        .single();

      if (error) throw error;

      // Actualizar contador de comentarios
      await supabase.rpc('increment_video_comments', { video_id: videoId });

      setVideoCounters(prev => ({
        ...prev,
        comments: prev.comments + 1
      }));

      // Otorgar puntos si es la primera vez
      if (!hasEarnedCommentPoints) {
        const pointsAmount = 10;
        await addPoints(pointsAmount, 'Comentar video', 'free');
        await trackPointsEarned('comment', pointsAmount);
        setHasEarnedCommentPoints(true);
        showPointsNotification(`+${pointsAmount} puntos por comentar 🎉`);

        // Tracking de misión
        missionsService.trackAction('comment');
      }

      // Actualizar lista de comentarios
      if (replyingTo) {
        // Es una respuesta
        setComments(prev => prev.map(comment => {
          if (comment.id === replyingTo) {
            return {
              ...comment,
              replies: [...(comment.replies || []), data]
            };
          }
          return comment;
        }));
      } else {
        // Es un comentario nuevo
        setComments(prev => [data, ...prev]);
      }

      setNewComment('');
      setReplyingTo(null);

    } catch (err) {
      console.error('Error al publicar comentario:', err);
    }
  };

  // Eliminar comentario
  const handleDeleteComment = async (commentId) => {
    if (!user) return;

    try {
      await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      // Actualizar contador
      await supabase.rpc('decrement_video_comments', { video_id: videoId });

      setVideoCounters(prev => ({
        ...prev,
        comments: Math.max(0, prev.comments - 1)
      }));

      // Actualizar lista
      setComments(prev => prev.filter(c => c.id !== commentId));

    } catch (err) {
      console.error('Error al eliminar comentario:', err);
    }
  };

  // ===============================
  // FUNCIONES DEL VIDEO PLAYER
  // ===============================

  // Play/Pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Control de volumen
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  // Toggle Mute
  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) {
        setVolume(0);
      } else {
        setVolume(videoRef.current.volume);
      }
    }
  };

  // Actualizar progreso
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      
      // Tracking de tiempo de visualización para puntos
      const currentTime = videoRef.current.currentTime;
      setViewWatchTime(currentTime);

      // Otorgar puntos por ver (mínimo 30 segundos)
      if (currentTime >= 30 && !hasEarnedViewPoints && user) {
        const pointsAmount = 2;
        addPoints(pointsAmount, 'Ver video', 'free');
        trackPointsEarned('view', pointsAmount);
        setHasEarnedViewPoints(true);
        showPointsNotification(`+${pointsAmount} puntos por ver video 🎉`);

        // Tracking de misión
        missionsService.trackAction('watch');
      }
    }
  };

  // Saltar a posición
  const handleSeek = (e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Mostrar/ocultar controles
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // ===============================
  // EFECTOS
  // ===============================

  // Cargar datos iniciales
  useEffect(() => {
    fetchVideoData();
  }, [fetchVideoData]);

  // Cargar comentarios
  useEffect(() => {
    if (videoId) {
      loadComments();
    }
  }, [videoId, loadComments]);

  // Limpiar timeout de controles
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Formatear duración
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatear número
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  // ===============================
  // RENDER
  // ===============================

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="aspect-video bg-muted rounded-lg"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !video) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            <Icon name="AlertCircle" className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Video no encontrado</h2>
            <p className="text-muted-foreground mb-4">
              El video que buscas no existe o fue eliminado.
            </p>
            <Button onClick={() => navigate('/')}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{video.title} - Radeisan</title>
        <meta name="description" content={video.description} />
      </Helmet>

      <Header />

      {/* Notificación de puntos */}
      {pointsNotification.show && (
        <div className="fixed top-20 right-4 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-top">
          {pointsNotification.message}
        </div>
      )}

      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Columna principal - Video y detalles */}
            <div className="flex-1">
              {/* Video Player */}
              <div
                ref={containerRef}
                className="relative bg-black rounded-lg overflow-hidden shadow-2xl group"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
              >
                <video
                  ref={videoRef}
                  src={video.video_url}
                  className="w-full aspect-video object-contain"
                  onLoadedMetadata={(e) => setDuration(e.target.duration)}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onClick={togglePlayPause}
                />

                {/* Overlay de controles */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${
                    showControls ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {/* Botón play central */}
                  {!isPlaying && (
                    <button
                      onClick={togglePlayPause}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Icon name="Play" className="w-10 h-10 text-white ml-1" />
                      </div>
                    </button>
                  )}

                  {/* Controles inferiores */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                    {/* Barra de progreso */}
                    <div
                      className="h-1 bg-white/30 rounded-full cursor-pointer group/progress"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-red-600 rounded-full relative group-hover/progress:h-1.5 transition-all"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
                      </div>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button
                          onClick={togglePlayPause}
                          className="hover:bg-white/20 p-2 rounded-full transition-colors"
                        >
                          <Icon name={isPlaying ? 'Pause' : 'Play'} size={20} />
                        </button>

                        {/* Volumen */}
                        <div className="flex items-center gap-2 group/volume">
                          <button
                            onClick={toggleMute}
                            className="hover:bg-white/20 p-2 rounded-full transition-colors"
                          >
                            <Icon
                              name={isMuted ? 'VolumeX' : volume > 0.5 ? 'Volume2' : 'Volume1'}
                              size={20}
                            />
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-0 group-hover/volume:w-20 transition-all"
                          />
                        </div>

                        {/* Tiempo */}
                        <span className="text-sm font-medium">
                          {formatTime(videoRef.current?.currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Fullscreen */}
                        <button
                          onClick={toggleFullscreen}
                          className="hover:bg-white/20 p-2 rounded-full transition-colors"
                        >
                          <Icon name={isFullscreen ? 'Minimize' : 'Maximize'} size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información del video */}
              <div className="mt-4 space-y-4">
                {/* Título */}
                <h1 className="text-xl font-bold text-foreground">
                  {video.title}
                </h1>

                {/* Botones de interacción */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {/* Info del creador */}
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${video.creator.username}`}>
                      <img
                        src={video.creator.profile_image_url || '/default-avatar.png'}
                        alt={video.creator.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${video.creator.username}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {video.creator.name}
                        </Link>
                        {video.creator.is_verified && (
                          <Icon name="BadgeCheck" size={16} className="text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(videoCounters.views)} visualizaciones
                      </p>
                    </div>
                    {user?.id !== video.creator.id && (
                      <Button
                        onClick={handleFollow}
                        variant={following ? 'outline' : 'default'}
                        size="sm"
                        className="ml-4"
                      >
                        {following ? 'Siguiendo' : 'Seguir'}
                      </Button>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center gap-2">
                    {/* Like/Dislike */}
                    <div className="flex items-center bg-muted rounded-full overflow-hidden">
                      <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 px-4 py-2 hover:bg-muted-foreground/10 transition-colors ${
                          liked ? 'text-primary' : ''
                        }`}
                      >
                        <Icon name="ThumbsUp" size={20} className={liked ? 'fill-current' : ''} />
                        <span className="font-medium">{formatNumber(videoCounters.likes)}</span>
                      </button>
                      <div className="w-px h-6 bg-border"></div>
                      <button
                        onClick={handleDislike}
                        className={`flex items-center gap-2 px-4 py-2 hover:bg-muted-foreground/10 transition-colors ${
                          disliked ? 'text-destructive' : ''
                        }`}
                      >
                        <Icon name="ThumbsDown" size={20} className={disliked ? 'fill-current' : ''} />
                      </button>
                    </div>

                    {/* Compartir */}
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full hover:bg-muted-foreground/10 transition-colors"
                    >
                      <Icon name="Share2" size={20} />
                      <span className="font-medium">Compartir</span>
                    </button>

                    {/* Guardar */}
                    <button
                      onClick={handleSave}
                      className={`flex items-center gap-2 px-4 py-2 bg-muted rounded-full hover:bg-muted-foreground/10 transition-colors ${
                        saved ? 'text-primary' : ''
                      }`}
                    >
                      <Icon name="Bookmark" size={20} className={saved ? 'fill-current' : ''} />
                      <span className="font-medium">{saved ? 'Guardado' : 'Guardar'}</span>
                    </button>
                  </div>
                </div>

                {/* Descripción */}
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {video.description}
                  </p>
                  {video.created_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Publicado el {new Date(video.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>

                {/* Sección de comentarios */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold mb-4">
                    {formatNumber(videoCounters.comments)} comentarios
                  </h3>

                  {/* Formulario de comentario */}
                  {user ? (
                    <form onSubmit={handleSubmitComment} className="mb-6">
                      <div className="flex gap-3">
                        <img
                          src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                          alt="Tu avatar"
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={replyingTo ? 'Escribe una respuesta...' : 'Añade un comentario...'}
                            className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-primary outline-none text-foreground placeholder:text-muted-foreground"
                          />
                          <div className="flex items-center justify-end gap-2 mt-2">
                            {replyingTo && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                              >
                                Cancelar
                              </Button>
                            )}
                            <Button
                              type="submit"
                              size="sm"
                              disabled={!newComment.trim()}
                            >
                              Comentar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-muted rounded-lg p-4 text-center mb-6">
                      <p className="text-muted-foreground mb-2">
                        Inicia sesión para comentar
                      </p>
                      <Button onClick={() => navigate('/login')} size="sm">
                        Iniciar sesión
                      </Button>
                    </div>
                  )}

                  {/* Lista de comentarios */}
                  <div className="space-y-4">
                    {loadingComments ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No hay comentarios aún. ¡Sé el primero en comentar!
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="space-y-3">
                          {/* Comentario principal */}
                          <div className="flex gap-3">
                            <Link to={`/profile/${comment.user.username}`}>
                              <img
                                src={comment.user.profile_image_url || '/default-avatar.png'}
                                alt={comment.user.name}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/profile/${comment.user.username}`}
                                  className="font-semibold text-sm hover:text-primary"
                                >
                                  {comment.user.name}
                                </Link>
                                {comment.user.is_verified && (
                                  <Icon name="BadgeCheck" size={14} className="text-blue-500" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.created_at).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                              <p className="text-sm text-foreground mt-1">
                                {comment.content}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <button
                                  onClick={() => setReplyingTo(comment.id)}
                                  className="text-xs font-medium text-muted-foreground hover:text-primary"
                                >
                                  Responder
                                </button>
                                {user?.id === comment.user_id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-xs font-medium text-destructive hover:text-destructive/80"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>

                              {/* Respuestas */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-4 space-y-3">
                                  {!showReplies[comment.id] ? (
                                    <button
                                      onClick={() => setShowReplies(prev => ({ ...prev, [comment.id]: true }))}
                                      className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
                                    >
                                      <Icon name="CornerDownRight" size={16} />
                                      Ver {comment.replies.length} respuesta{comment.replies.length !== 1 ? 's' : ''}
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setShowReplies(prev => ({ ...prev, [comment.id]: false }))}
                                        className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
                                      >
                                        <Icon name="CornerDownRight" size={16} />
                                        Ocultar respuestas
                                      </button>
                                      {comment.replies.map((reply) => (
                                        <div key={reply.id} className="flex gap-3 ml-6">
                                          <Link to={`/profile/${reply.user.username}`}>
                                            <img
                                              src={reply.user.profile_image_url || '/default-avatar.png'}
                                              alt={reply.user.name}
                                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                            />
                                          </Link>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <Link
                                                to={`/profile/${reply.user.username}`}
                                                className="font-semibold text-sm hover:text-primary"
                                              >
                                                {reply.user.name}
                                              </Link>
                                              {reply.user.is_verified && (
                                                <Icon name="BadgeCheck" size={14} className="text-blue-500" />
                                              )}
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(reply.created_at).toLocaleDateString('es-ES')}
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground mt-1">
                                              {reply.content}
                                            </p>
                                            {user?.id === reply.user_id && (
                                              <button
                                                onClick={() => handleDeleteComment(reply.id)}
                                                className="text-xs font-medium text-destructive hover:text-destructive/80 mt-2"
                                              >
                                                Eliminar
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Videos relacionados */}
            {!isMobile && (
              <div className="lg:w-[400px] flex-shrink-0">
                <RelatedVideosSidebar
                  videos={relatedVideos}
                  currentVideoId={videoId}
                  onVideoSelect={(selectedVideo) => {
                    navigate(`/video/${selectedVideo.id}`);
                    window.scrollTo(0, 0);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de compartir */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Compartir video</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            {/* Opciones de compartir */}
            <div className="space-y-3 mb-4">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Icon name="Facebook" size={20} className="text-white" />
                </div>
                <span className="font-medium">Compartir en Facebook</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(video.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
                  <Icon name="Twitter" size={20} className="text-white" />
                </div>
                <span className="font-medium">Compartir en Twitter</span>
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(video.title + ' ' + shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Icon name="MessageCircle" size={20} className="text-white" />
                </div>
                <span className="font-medium">Compartir en WhatsApp</span>
              </a>
            </div>

            {/* Copiar link */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm"
              />
              <Button onClick={handleCopyLink} size="sm">
                {copySuccess ? (
                  <>
                    <Icon name="Check" size={16} className="mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Icon name="Copy" size={16} className="mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoPlayerPage;
