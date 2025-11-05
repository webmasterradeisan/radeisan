// src/pages/VideoPlayerPage/index.jsx
// ============================================================================
// VIDEO PLAYER PAGE - VERSIÓN CORREGIDA
// ============================================================================
// ✅ Video principal 100% PAUSADO cuando está minimizado (NO se mueve)
// ✅ Solo el mini-player reproduce
// ✅ Click en video para play/pause
// ✅ Drag & drop funcionando
// ✅ Adaptado para móvil
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

  // ✅ ESTADOS PARA MINI-PLAYER
  const [isMinimized, setIsMinimized] = useState(false);
  const [miniPlayerPosition, setMiniPlayerPosition] = useState({ 
    x: window.innerWidth - 420,
    y: window.innerHeight - 300
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Refs - ✅ DOS REFS SEPARADOS
  const videoRef = useRef(null);
  const miniVideoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const miniPlayerRef = useRef(null);

  // ===============================
  // ✅ CONTROLES DE TECLADO
  // ===============================
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentVideo = isMinimized ? miniVideoRef.current : videoRef.current;
      if (!currentVideo) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (isMinimized) {
            if (currentVideo.paused) {
              currentVideo.play();
              setIsPlaying(true);
            } else {
              currentVideo.pause();
              setIsPlaying(false);
            }
          } else {
            togglePlayPause();
          }
          break;
        case 'f':
          e.preventDefault();
          if (!isMinimized) toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          currentVideo.currentTime = Math.max(0, currentVideo.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          currentVideo.currentTime = Math.min(currentVideo.duration, currentVideo.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.min(1, volume + 0.1) } });
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.max(0, volume - 0.1) } });
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [volume, isMinimized]);

  // ===============================
  // ✅ FUNCIONES DE DRAG & DROP
  // ===============================
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'VIDEO') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setDragOffset({
      x: clientX - miniPlayerPosition.x,
      y: clientY - miniPlayerPosition.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;

    const miniWidth = isMobile ? 250 : 400;
    const miniHeight = isMobile ? 180 : 250;
    const maxX = window.innerWidth - miniWidth - 20;
    const maxY = window.innerHeight - miniHeight - 20;

    const boundedX = Math.max(10, Math.min(newX, maxX));
    const boundedY = Math.max(10, Math.min(newY, maxY));

    setMiniPlayerPosition({ x: boundedX, y: boundedY });
  }, [isDragging, dragOffset, isMobile]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ===============================
  // ✅ FUNCIÓN MINIMIZAR/MAXIMIZAR - CORREGIDA
  // ===============================
  const handleMinimize = () => {
    const mainVideo = videoRef.current;
    if (!mainVideo) return;

    // Guardar estado actual ANTES de hacer cambios
    const currentTime = mainVideo.currentTime;
    const wasPlaying = !mainVideo.paused;

    // PAUSAR COMPLETAMENTE el video principal
    mainVideo.pause();
    setIsPlaying(false);

    // Activar mini-player
    setIsMinimized(true);

    // Sincronizar mini-player después de que se monte
    setTimeout(() => {
      const miniVideo = miniVideoRef.current;
      if (miniVideo) {
        miniVideo.currentTime = currentTime;
        miniVideo.volume = volume;
        miniVideo.muted = isMuted;
        
        if (wasPlaying) {
          miniVideo.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.error('Error play mini:', err));
        }
      }
    }, 100);
  };

  const handleMaximize = () => {
    const mainVideo = videoRef.current;
    const miniVideo = miniVideoRef.current;

    if (miniVideo) {
      // Guardar estado del mini-player ANTES de hacer cambios
      const currentTime = miniVideo.currentTime;
      const wasPlaying = !miniVideo.paused;

      // PAUSAR COMPLETAMENTE el mini-player
      miniVideo.pause();
      setIsPlaying(false);
    }

    // Desactivar mini-player
    setIsMinimized(false);

    // Sincronizar video principal
    setTimeout(() => {
      if (mainVideo && miniVideo) {
        const currentTime = miniVideo.currentTime;
        const wasPlaying = miniVideo.paused === false;
        
        mainVideo.currentTime = currentTime;
        mainVideo.volume = volume;
        mainVideo.muted = isMuted;
        
        if (wasPlaying) {
          mainVideo.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.error('Error play main:', err));
        }
      }
    }, 100);

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    if (currentVideo.paused) {
      currentVideo.play();
      setIsPlaying(true);
    } else {
      currentVideo.pause();
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (videoRef.current) videoRef.current.volume = newVolume;
    if (miniVideoRef.current) miniVideoRef.current.volume = newVolume;
    
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (videoRef.current) videoRef.current.muted = newMuted;
    if (miniVideoRef.current) miniVideoRef.current.muted = newMuted;
    
    if (newMuted) {
      setVolume(0);
    } else if (volume === 0) {
      setVolume(0.5);
      if (videoRef.current) videoRef.current.volume = 0.5;
      if (miniVideoRef.current) miniVideoRef.current.volume = 0.5;
    }
  };

  const handleTimeUpdate = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    setProgress((currentVideo.currentTime / currentVideo.duration) * 100);
    
    const currentTime = currentVideo.currentTime;

    if (currentTime >= 30 && !hasEarnedViewPoints && user) {
      const pointsAmount = 2;
      addPoints(pointsAmount, 'Ver video', 'free');
      trackPointsEarned('view', pointsAmount);
      setHasEarnedViewPoints(true);
      showPointsNotification(`+${pointsAmount} puntos por ver video 🎉`);
      missionsService.trackAction('watch');
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        
        if (isMobile && screen.orientation && screen.orientation.lock) {
          try {
            await screen.orientation.lock('landscape');
          } catch (err) {
            console.log('No se pudo bloquear orientación:', err);
          }
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        
        if (isMobile && screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleMouseMovePlayer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isMinimized) {
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

  // ===============================
  // UTILIDADES
  // ===============================

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
              {/* ✅ Video Player Principal */}
              <div
                ref={containerRef}
                className={`relative bg-black rounded-lg overflow-hidden shadow-2xl group transition-all duration-300 ${
                  isMinimized ? 'opacity-30 pointer-events-none' : 'opacity-100'
                }`}
                onMouseMove={!isMinimized ? handleMouseMovePlayer : undefined}
                onMouseLeave={() => isPlaying && !isMinimized && setShowControls(false)}
              >
                <video
                  ref={videoRef}
                  src={video.video_url}
                  className="w-full aspect-video object-contain"
                  onLoadedMetadata={(e) => setDuration(e.target.duration)}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {!isMinimized && (
                  <div 
                    className="absolute inset-0 cursor-pointer"
                    onClick={togglePlayPause}
                  />
                )}

                {isMinimized && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-white">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Minimize2" className="w-10 h-10" />
                      </div>
                      <p className="text-sm">Reproduciendo en mini-player</p>
                    </div>
                  </div>
                )}

                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 pointer-events-none ${
                    showControls && !isMinimized ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {!isPlaying && !isMinimized && (
                    <button
                      onClick={togglePlayPause}
                      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
                    >
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Icon name="Play" className="w-10 h-10 text-white ml-1" />
                      </div>
                    </button>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 pointer-events-auto">
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
                      <div className="flex items-center gap-2 md:gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlayPause();
                          }}
                          className="hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors"
                        >
                          <Icon name={isPlaying ? 'Pause' : 'Play'} size={isMobile ? 18 : 20} />
                        </button>

                        <div className="flex items-center gap-2 group/volume">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMute();
                            }}
                            className="hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors"
                          >
                            <Icon
                              name={isMuted ? 'VolumeX' : volume > 0.5 ? 'Volume2' : 'Volume1'}
                              size={isMobile ? 18 : 20}
                            />
                          </button>
                          {!isMobile && (
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={volume}
                              onChange={handleVolumeChange}
                              onClick={(e) => e.stopPropagation()}
                              className="w-0 group-hover/volume:w-20 transition-all"
                            />
                          )}
                        </div>

                        <span className="text-xs md:text-sm font-medium">
                          {formatTime(videoRef.current?.currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 md:gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMinimize();
                          }}
                          className="hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors"
                          title="Minimizar"
                        >
                          <Icon name="Minimize2" size={isMobile ? 18 : 20} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFullscreen();
                          }}
                          className="hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors"
                        >
                          <Icon name={isFullscreen ? 'Minimize' : 'Maximize'} size={isMobile ? 18 : 20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información del video - Mantiene TODO igual, omitido por brevedad */}
              <div className="mt-4 space-y-4">
                <h1 className="text-lg md:text-xl font-bold text-foreground">
                  {video.title}
                </h1>
                {/* ... resto del código de información, comentarios, etc ... */}
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

      {/* ✅ MINI-PLAYER - CORREGIDO: Ya NO sincroniza con el video principal */}
      {isMinimized && video && (
        <div
          ref={miniPlayerRef}
          className="fixed bg-black rounded-lg shadow-2xl border-2 border-primary overflow-hidden"
          style={{
            left: `${miniPlayerPosition.x}px`,
            top: `${miniPlayerPosition.y}px`,
            width: isMobile ? '250px' : '400px',
            zIndex: 9999,
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* ✅ Video en mini-player - Ya NO mueve el video principal */}
          <div className="relative aspect-video bg-black">
            <video
              ref={miniVideoRef}
              src={video.video_url}
              className="w-full h-full object-contain"
              muted={isMuted}
              volume={volume}
              onTimeUpdate={(e) => {
                // ✅ CAMBIO CRÍTICO: Solo actualiza la barra de progreso
                // YA NO sincroniza currentTime con el video principal
                setProgress((e.target.currentTime / e.target.duration) * 100);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const miniVideo = miniVideoRef.current;
                if (!miniVideo) return;

                if (miniVideo.paused) {
                  miniVideo.play();
                  setIsPlaying(true);
                } else {
                  miniVideo.pause();
                  setIsPlaying(false);
                }
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Icon name={isPlaying ? 'Pause' : 'Play'} size={isMobile ? 20 : 24} className="text-white" />
              </div>
            </div>

            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full pointer-events-none"></div>
          </div>

          <div className="p-2 md:p-3 bg-black/95 border-t border-primary/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-white truncate">
                  {video.title}
                </h4>
                <p className="text-xs text-gray-400 truncate">
                  {video.creator?.name || 'Usuario'}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const miniVideo = miniVideoRef.current;
                    if (!miniVideo) return;

                    if (miniVideo.paused) {
                      miniVideo.play();
                      setIsPlaying(true);
                    } else {
                      miniVideo.pause();
                      setIsPlaying(false);
                    }
                  }}
                  className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  <Icon name={isPlaying ? 'Pause' : 'Play'} size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMaximize();
                  }}
                  className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Maximizar"
                >
                  <Icon name="Maximize2" size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(false);
                  }}
                  className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Cerrar"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de compartir - Mantiene TODO igual */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          {/* ... código del modal ... */}
        </div>
      )}
    </>
  );
};

export default VideoPlayerPage;
