// src/pages/VideoPlayerPage/index.jsx
// ============================================================================
// VIDEO PLAYER PAGE - Sistema Completo
// ============================================================================
// ✅ Sistema de likes Y dislikes completo
// ✅ Mini-player para DESKTOP y MÓVIL
// ✅ Función maximizar con ajuste de orientación automático
// ✅ Avatar del usuario en comentarios arreglado
// ✅ Sistema de comentarios completo
// ✅ Todas las funcionalidades mantenidas
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
  const { addPoints } = usePoints();
  const isMobile = useIsMobile();

  // Estados del video
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

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

  // Estados de modal compartir
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Estados de notificaciones
  const [pointsNotification, setPointsNotification] = useState({
    show: false,
    message: ''
  });

  // ✅ ESTADOS PARA MINI-PLAYER (DESKTOP Y MÓVIL)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const miniPlayerThreshold = 400;

  // Refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // ===============================
  // ✅ SCROLL DETECTION PARA MINI-PLAYER (DESKTOP Y MÓVIL)
  // ===============================
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      // Activar mini-player al hacer scroll (tanto móvil como desktop)
      if (currentScrollY > miniPlayerThreshold && !showMiniPlayer && !isMinimized) {
        setShowMiniPlayer(true);
      } else if (currentScrollY <= miniPlayerThreshold && showMiniPlayer) {
        setShowMiniPlayer(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showMiniPlayer, isMinimized]);

  // ===============================
  // ✅ FUNCIÓN PARA MINIMIZAR/MAXIMIZAR
  // ===============================
  const handleMinimize = () => {
    setIsMinimized(true);
    setShowMiniPlayer(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
    setShowMiniPlayer(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // ✅ En móvil, forzar orientación horizontal
    if (isMobile && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(err => {
        console.log('No se pudo bloquear orientación:', err);
      });
    }
  };

  // ===============================
  // FUNCIONES DE CARGA DE DATOS
  // ===============================

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, is_verified')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (err) {
      console.error('❌ Error al cargar perfil de usuario:', err);
    }
  }, [user]);

  const fetchVideoData = useCallback(async () => {
    if (!videoId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('is_published', true)
        .single();

      if (videoError) throw videoError;

      if (videoData?.user_id) {
        const { data: creatorData, error: creatorError } = await supabase
          .from('user_profiles')
          .select('id, full_name, username, avatar_url, is_verified')
          .eq('id', videoData.user_id)
          .single();
        
        if (!creatorError && creatorData) {
          videoData.creator = {
            id: creatorData.id,
            name: creatorData.full_name,
            username: creatorData.username,
            profile_image_url: creatorData.avatar_url,
            is_verified: creatorData.is_verified
          };
        }
      }

      setVideo(videoData);

      await supabase.rpc('increment_video_views', { video_id: videoId });

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

      if (user) {
        const { data: likeData } = await supabase
          .from('video_likes')
          .select('*')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();
        setLiked(!!likeData);

        const { data: dislikeData } = await supabase
          .from('video_dislikes')
          .select('*')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();
        setDisliked(!!dislikeData);

        const { data: savedData } = await supabase
          .from('saved_videos')
          .select('*')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();
        setSaved(!!savedData);

        if (videoData.user_id) {
          const { data: followData } = await supabase
            .from('user_follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', videoData.user_id)
            .maybeSingle();
          setFollowing(!!followData);
        }

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

      loadRelatedVideos();

    } catch (err) {
      console.error('❌ Error al cargar video:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [videoId, user]);

  const loadRelatedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, description, thumbnail_url, duration_seconds, views_count, likes_count, category, created_at, user_id, orientation')
        .neq('id', videoId)
        .eq('is_published', true)
        .limit(50);

      if (error) throw error;

      const horizontalVideos = data.filter(v => !v.orientation || v.orientation === 'horizontal');

      if (horizontalVideos && horizontalVideos.length > 0) {
        const userIds = [...new Set(horizontalVideos.map(v => v.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: creatorsData } = await supabase
            .from('user_profiles')
            .select('id, full_name, username, avatar_url, is_verified')
            .in('id', userIds);
          
          if (creatorsData) {
            const creatorsMap = {};
            creatorsData.forEach(creator => {
              creatorsMap[creator.id] = creator;
            });
            
            const transformed = horizontalVideos.map(video => ({
              id: video.id,
              title: video.title,
              thumbnail: video.thumbnail_url,
              duration: video.duration_seconds,
              views: video.views_count,
              views_count: video.views_count,
              likes: video.likes_count,
              category: video.category,
              created_at: video.created_at,
              orientation: video.orientation,
              creator: creatorsMap[video.user_id] ? {
                id: creatorsMap[video.user_id].id,
                name: creatorsMap[video.user_id].full_name,
                username: creatorsMap[video.user_id].username,
                profile_image_url: creatorsMap[video.user_id].avatar_url,
                is_verified: creatorsMap[video.user_id].is_verified
              } : null
            }));

            const shuffled = transformed.sort(() => Math.random() - 0.5);
            setRelatedVideos(shuffled);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error al cargar videos relacionados:', err);
    }
  };

  const loadComments = useCallback(async () => {
    if (!videoId) return;

    try {
      setLoadingComments(true);

      const { data: commentsData, error } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', videoId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const commentIds = commentsData.map(c => c.id);
        const { data: repliesData } = await supabase
          .from('video_comments')
          .select('*')
          .in('parent_comment_id', commentIds);

        const allComments = [...commentsData, ...(repliesData || [])];
        const userIds = [...new Set(allComments.map(c => c.user_id).filter(Boolean))];
        
        let usersMap = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('user_profiles')
            .select('id, full_name, username, avatar_url, is_verified')
            .in('id', userIds);
          
          if (usersData) {
            usersData.forEach(userProfile => {
              usersMap[userProfile.id] = {
                id: userProfile.id,
                name: userProfile.full_name,
                username: userProfile.username,
                profile_image_url: userProfile.avatar_url,
                is_verified: userProfile.is_verified
              };
            });
          }
        }

        commentsData.forEach(comment => {
          if (comment.user_id && usersMap[comment.user_id]) {
            comment.user = usersMap[comment.user_id];
          }
          
          comment.replies = (repliesData || [])
            .filter(reply => reply.parent_comment_id === comment.id)
            .map(reply => {
              if (reply.user_id && usersMap[reply.user_id]) {
                reply.user = usersMap[reply.user_id];
              }
              return reply;
            });
        });
      }

      setComments(commentsData || []);
    } catch (err) {
      console.error('❌ Error al cargar comentarios:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [videoId]);

  // ===============================
  // FUNCIONES DE INTERACCIÓN
  // ===============================

  const showPointsNotification = (message) => {
    setPointsNotification({ show: true, message });
    setTimeout(() => {
      setPointsNotification({ show: false, message: '' });
    }, 3000);
  };

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

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
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

      } else {
        if (disliked) {
          await handleDislike();
        }

        setLiked(true);
        setVideoCounters(prev => ({
          ...prev,
          likes: prev.likes + 1
        }));

        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_likes', { video_id: videoId });

        if (!hasEarnedLikePoints) {
          const pointsAmount = 5;
          await addPoints(pointsAmount, 'Like en video', 'free');
          await trackPointsEarned('like', pointsAmount);
          setHasEarnedLikePoints(true);
          showPointsNotification(`+${pointsAmount} puntos por dar like 🎉`);
          missionsService.trackAction('like');
        }
      }
    } catch (err) {
      console.error('Error en like:', err);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
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

      } else {
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

        setDisliked(true);
        setVideoCounters(prev => ({
          ...prev,
          dislikes: prev.dislikes + 1
        }));

        await supabase
          .from('video_dislikes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_dislikes', { video_id: videoId });
      }
    } catch (err) {
      console.error('Error en dislike:', err);
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (saved) {
        setSaved(false);
        await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      } else {
        setSaved(true);
        await supabase
          .from('saved_videos')
          .insert({ video_id: videoId, user_id: user.id });

        missionsService.trackAction('save');
        showPointsNotification('Video guardado en favoritos');
      }
    } catch (err) {
      console.error('Error al guardar:', err);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/video/${videoId}`;
    setShareLink(url);
    setShowShareModal(true);

    if (user && !hasEarnedSharePoints) {
      const pointsAmount = 3;
      await addPoints(pointsAmount, 'Compartir video', 'free');
      await trackPointsEarned('share', pointsAmount);
      setHasEarnedSharePoints(true);
      showPointsNotification(`+${pointsAmount} puntos por compartir 🎉`);
      missionsService.trackAction('share');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!video?.user_id) return;

    try {
      if (following) {
        setFollowing(false);
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', video.user_id);
      } else {
        setFollowing(true);
        await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: video.user_id
          });

        missionsService.trackAction('follow');
        showPointsNotification('Ahora sigues a este creador');
      }
    } catch (err) {
      console.error('Error al seguir:', err);
    }
  };

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
        .select('*')
        .single();

      if (error) throw error;

      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, is_verified')
        .eq('id', user.id)
        .single();

      if (userData) {
        data.user = {
          id: userData.id,
          name: userData.full_name,
          username: userData.username,
          profile_image_url: userData.avatar_url,
          is_verified: userData.is_verified
        };
      }

      await supabase.rpc('increment_video_comments', { video_id: videoId });
      setVideoCounters(prev => ({
        ...prev,
        comments: prev.comments + 1
      }));

      if (!hasEarnedCommentPoints) {
        const pointsAmount = 10;
        await addPoints(pointsAmount, 'Comentar video', 'free');
        await trackPointsEarned('comment', pointsAmount);
        setHasEarnedCommentPoints(true);
        showPointsNotification(`+${pointsAmount} puntos por comentar 🎉`);
        missionsService.trackAction('comment');
      }

      if (replyingTo) {
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
        setComments(prev => [data, ...prev]);
      }

      setNewComment('');
      setReplyingTo(null);

    } catch (err) {
      console.error('Error al publicar comentario:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user) return;

    try {
      await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      await supabase.rpc('decrement_video_comments', { video_id: videoId });

      setVideoCounters(prev => ({
        ...prev,
        comments: Math.max(0, prev.comments - 1)
      }));

      setComments(prev => prev.filter(c => c.id !== commentId));

    } catch (err) {
      console.error('Error al eliminar comentario:', err);
    }
  };

  // ===============================
  // FUNCIONES DEL VIDEO PLAYER
  // ===============================

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

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      
      const currentTime = videoRef.current.currentTime;

      if (currentTime >= 30 && !hasEarnedViewPoints && user) {
        const pointsAmount = 2;
        addPoints(pointsAmount, 'Ver video', 'free');
        trackPointsEarned('view', pointsAmount);
        setHasEarnedViewPoints(true);
        showPointsNotification(`+${pointsAmount} puntos por ver video 🎉`);
        missionsService.trackAction('watch');
      }
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

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

  useEffect(() => {
    fetchVideoData();
    fetchUserProfile();
  }, [fetchVideoData, fetchUserProfile]);

  useEffect(() => {
    if (videoId) {
      loadComments();
    }
  }, [videoId, loadComments]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      {pointsNotification.show && (
        <div className="fixed top-20 right-4 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-top">
          {pointsNotification.message}
        </div>
      )}

      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              {/* Video Player */}
              {!isMinimized && (
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

                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${
                      showControls ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
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

                    <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
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

                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={togglePlayPause}
                            className="hover:bg-white/20 p-2 rounded-full transition-colors"
                          >
                            <Icon name={isPlaying ? 'Pause' : 'Play'} size={20} />
                          </button>

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

                          <span className="text-sm font-medium">
                            {formatTime(videoRef.current?.currentTime)} / {formatTime(duration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* ✅ Botón Minimizar */}
                          <button
                            onClick={handleMinimize}
                            className="hover:bg-white/20 p-2 rounded-full transition-colors"
                            title="Minimizar"
                          >
                            <Icon name="Minimize2" size={20} />
                          </button>

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
              )}

              {/* Información del video */}
              <div className="mt-4 space-y-4">
                <h1 className="text-xl font-bold text-foreground">
                  {video.title}
                </h1>

                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${video.creator?.username || 'unknown'}`}>
                      <img
                        src={video.creator?.profile_image_url || '/default-avatar.png'}
                        alt={video.creator?.name || 'Usuario'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${video.creator?.username || 'unknown'}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {video.creator?.name || 'Usuario'}
                        </Link>
                        {video.creator?.is_verified && (
                          <Icon name="BadgeCheck" size={16} className="text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(videoCounters.views)} visualizaciones
                      </p>
                    </div>
                    {user?.id !== video.user_id && (
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

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-full overflow-hidden">
                      <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 px-4 py-2 hover:bg-muted-foreground/10 transition-colors border-r border-border ${
                          liked ? 'text-primary' : ''
                        }`}
                      >
                        <Icon name="ThumbsUp" size={20} className={liked ? 'fill-current' : ''} />
                        <span className="font-medium">{formatNumber(videoCounters.likes)}</span>
                      </button>

                      <button
                        onClick={handleDislike}
                        className={`flex items-center gap-2 px-4 py-2 hover:bg-muted-foreground/10 transition-colors ${
                          disliked ? 'text-primary' : ''
                        }`}
                      >
                        <Icon name="ThumbsDown" size={20} className={disliked ? 'fill-current' : ''} />
                        <span className="font-medium">{formatNumber(videoCounters.dislikes)}</span>
                      </button>
                    </div>

                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full hover:bg-muted-foreground/10 transition-colors"
                    >
                      <Icon name="Share2" size={20} />
                      <span className="font-medium">Compartir</span>
                    </button>

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

                  {user ? (
                    <form onSubmit={handleSubmitComment} className="mb-6">
                      <div className="flex gap-3">
                        <img
                          src={userProfile?.avatar_url || '/default-avatar.png'}
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
                          <div className="flex gap-3">
                            <Link to={`/profile/${comment.user?.username || 'unknown'}`}>
                              <img
                                src={comment.user?.profile_image_url || '/default-avatar.png'}
                                alt={comment.user?.name || 'Usuario'}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/profile/${comment.user?.username || 'unknown'}`}
                                  className="font-semibold text-sm hover:text-primary"
                                >
                                  {comment.user?.name || 'Usuario'}
                                </Link>
                                {comment.user?.is_verified && (
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
                                          <Link to={`/profile/${reply.user?.username || 'unknown'}`}>
                                            <img
                                              src={reply.user?.profile_image_url || '/default-avatar.png'}
                                              alt={reply.user?.name || 'Usuario'}
                                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                            />
                                          </Link>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <Link
                                                to={`/profile/${reply.user?.username || 'unknown'}`}
                                                className="font-semibold text-sm hover:text-primary"
                                              >
                                                {reply.user?.name || 'Usuario'}
                                              </Link>
                                              {reply.user?.is_verified && (
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

            {!isMobile && (
              <div className="lg:w-[400px] flex-shrink-0">
                <RelatedVideosSidebar
                  videos={relatedVideos}
                  currentVideoId={videoId}
                  loading={loading}
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

      {/* ✅ MINI-PLAYER FLOTANTE (DESKTOP Y MÓVIL) */}
      {(showMiniPlayer || isMinimized) && video && (
        <div className={`fixed z-50 bg-black shadow-2xl border ${
          isMobile 
            ? 'bottom-0 left-0 right-0 border-t border-border'
            : 'bottom-4 right-4 w-96 rounded-lg border-border'
        }`}>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`${isMobile ? 'w-16' : 'w-24'} aspect-video bg-muted rounded overflow-hidden flex-shrink-0`}>
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-white truncate">
                  {video.title}
                </h4>
                <p className="text-xs text-gray-400 truncate">
                  {video.creator?.name || 'Usuario'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleMaximize}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                title="Maximizar"
              >
                <Icon name="Maximize2" size={20} />
              </button>
              <button
                onClick={() => {
                  setShowMiniPlayer(false);
                  setIsMinimized(false);
                }}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

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
