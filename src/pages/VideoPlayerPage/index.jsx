// src/pages/VideoPlayerPage/index.jsx
// 
// ============================================================================
// 🎬 VIDEO PLAYER PAGE - VERSIÓN FINAL CON MEJORAS Y CORRECCIÓN DE BUILD
// ============================================================================
//
// Componente principal para la reproducción de videos que incluye la 
// lógica para el reproductor principal, el mini-reproductor (PIP), 
// carga de datos, interacciones, sistema de puntos/misiones y comentarios.
//
// MEJORAS APLICADAS:
// ✅ Video principal 100% PAUSADO cuando está minimizado.
// ✅ Drag & drop funcionando para el mini-player.
// ✅ Controles de teclado funcionales.
// ✅ Descripción del video con función "Ver más / Ver menos".
// ✅ Reproducción automática del siguiente video al finalizar el actual.
//
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
  // Hooks y utilidades
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPoints } = usePoints();
  const isMobile = useIsMobile();
  
  // Constante para la longitud máxima de la descripción antes de 'Ver más'
  const MAX_DESCRIPTION_LENGTH = 150;

  // --- ESTADOS DE DATOS Y PERFIL ---
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  // Estado para la descripción: true si debe mostrarse completa
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false); 

  // --- ESTADOS DE INTERACCIÓN (Likes, Guardado, Seguir, Contadores) ---
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

  // --- ESTADOS DE VIDEO PLAYER PRINCIPAL ---
  const [isPlaying, setIsPlaying] = useState(false); 
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // --- ESTADOS DE COMENTARIOS ---
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReplies, setShowReplies] = useState({});

  // --- ESTADOS DE TRACKING DE PUNTOS ---
  const [hasEarnedViewPoints, setHasEarnedViewPoints] = useState(false);
  const [hasEarnedLikePoints, setHasEarnedLikePoints] = useState(false);
  const [hasEarnedCommentPoints, setHasEarnedCommentPoints] = useState(false);
  const [hasEarnedSharePoints, setHasEarnedSharePoints] = useState(false);

  // --- ESTADOS DE MODAL COMPARTIR Y NOTIFICACIONES ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [pointsNotification, setPointsNotification] = useState({
    show: false,
    message: ''
  });

  // ===============================
  // 🧭 ESTADOS Y REFS PARA MINI-PLAYER (Picture-in-Picture)
  // ===============================
  const [isMinimized, setIsMinimized] = useState(false); 
  const [miniPlayerPosition, setMiniPlayerPosition] = useState({ 
    x: window.innerWidth - 420,
    y: window.innerHeight - 300
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Refs - DOS REFS SEPARADOS para el video principal y el mini-player
  const videoRef = useRef(null); 
  const miniVideoRef = useRef(null); 
  const containerRef = useRef(null); 
  const controlsTimeoutRef = useRef(null); 
  const miniPlayerRef = useRef(null); 

  // ===============================
  // ⌨️ CONTROLES DE TECLADO
  // ===============================
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignorar si el foco está en un campo de texto
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Determinar qué reproductor está activo
      const currentVideo = isMinimized ? miniVideoRef.current : videoRef.current;
      if (!currentVideo) return;

      switch (e.key) {
        case ' ':
        case 'k': // Toggle Play/Pause
          e.preventDefault();
          if (isMinimized) {
            // Manejo directo de play/pause para el mini-player
            if (currentVideo.paused) {
              currentVideo.play();
              setIsPlaying(true);
            } else {
              currentVideo.pause();
              setIsPlaying(false);
            }
          } else {
            // Usar la función principal para el video normal
            togglePlayPause();
          }
          break;
        case 'f': // Toggle Fullscreen (solo en modo normal)
          e.preventDefault();
          if (!isMinimized) toggleFullscreen();
          break;
        case 'm': // Toggle Mute
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft': // Retroceder 5 segundos
          e.preventDefault();
          currentVideo.currentTime = Math.max(0, currentVideo.currentTime - 5);
          break;
        case 'ArrowRight': // Avanzar 5 segundos
          e.preventDefault();
          currentVideo.currentTime = Math.min(currentVideo.duration, currentVideo.currentTime + 5);
          break;
        case 'ArrowUp': // Subir volumen 10%
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.min(1, volume + 0.1) } });
          break;
        case 'ArrowDown': // Bajar volumen 10%
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
  // 👆 FUNCIONES DE DRAG & DROP para MINI-PLAYER
  // ===============================

  /** Inicia el arrastre al presionar el botón del ratón/tocar la pantalla */
  const handleMouseDown = (e) => {
    // Evitar arrastrar si se hace click en un botón o el propio video
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'VIDEO') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Calcular el offset para un arrastre suave
    setDragOffset({
      x: clientX - miniPlayerPosition.x,
      y: clientY - miniPlayerPosition.y
    });
  };

  /** Mueve el mini-player mientras se arrastra (optimizado con useCallback) */
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    e.preventDefault(); 

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;

    // Lógica para mantener el mini-player dentro de los límites de la ventana
    const miniWidth = isMobile ? 250 : 400;
    const miniHeight = isMobile ? 180 : 250;
    const maxX = window.innerWidth - miniWidth - 20; 
    const maxY = window.innerHeight - miniHeight - 20; 

    const boundedX = Math.max(10, Math.min(newX, maxX)); 
    const boundedY = Math.max(10, Math.min(newY, maxY)); 

    setMiniPlayerPosition({ x: boundedX, y: boundedY });
  }, [isDragging, dragOffset, isMobile]);

  /** Finaliza el arrastre */
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  /** Hook para añadir/remover listeners de eventos de movimiento y soltar */
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
  // 🔄 FUNCIÓN MINIMIZAR/MAXIMIZAR (Sincronización de videos)
  // ===============================
  
  /** Minimiza el reproductor, pausando el principal y activando/sincronizando el mini-player. */
  const handleMinimize = () => {
    const mainVideo = videoRef.current;
    if (!mainVideo) return;

    // 1. Guardar estado del principal
    const currentTime = mainVideo.currentTime;
    const wasPlaying = !mainVideo.paused;

    // 2. PAUSAR el video principal
    mainVideo.pause();
    setIsPlaying(false);

    // 3. Activar mini-player
    setIsMinimized(true);

    // 4. Sincronizar y potencialmente reproducir mini-player
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

  /** Maximiza el reproductor, pausando el mini-player y activando/sincronizando el principal. */
  const handleMaximize = () => {
    const mainVideo = videoRef.current;
    const miniVideo = miniVideoRef.current;

    let currentTime = 0;
    let wasPlaying = false;

    if (miniVideo) {
      // 1. Guardar estado del mini-player
      currentTime = miniVideo.currentTime;
      wasPlaying = !miniVideo.paused;

      // 2. PAUSAR el mini-player
      miniVideo.pause();
      setIsPlaying(false);
    }

    // 3. Desactivar mini-player
    setIsMinimized(false);

    // 4. Sincronizar y potencialmente reproducir video principal
    setTimeout(() => {
      if (mainVideo) {
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
  // 💾 FUNCIONES DE CARGA DE DATOS (Perfil, Video, Relacionados, Comentarios)
  // ===============================

  const fetchUserProfile = useCallback(async () => {
    // ... (Lógica de fetchUserProfile)
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
    // ... (Lógica de fetchVideoData)
    if (!videoId) return;
    try {
      setLoading(true);
      setError(null);
      const { data: videoData, error: videoError } = await supabase
        .from('videos').select('*').eq('id', videoId).eq('is_published', true).single();
      if (videoError) throw videoError;

      // Cargar datos del creador
      if (videoData?.user_id) {
        const { data: creatorData, error: creatorError } = await supabase
          .from('user_profiles').select('id, full_name, username, avatar_url, is_verified')
          .eq('id', videoData.user_id).single();
        if (!creatorError && creatorData) {
          videoData.creator = { id: creatorData.id, name: creatorData.full_name, username: creatorData.username, profile_image_url: creatorData.avatar_url, is_verified: creatorData.is_verified };
        }
      }
      setVideo(videoData);

      // Incrementar vistas
      await supabase.rpc('increment_video_views', { video_id: videoId });

      // Cargar contadores
      const { data: countersData } = await supabase.from('videos').select('likes_count, dislikes_count, views_count, comments_count').eq('id', videoId).single();
      if (countersData) {
        setVideoCounters({
          likes: countersData.likes_count || 0, dislikes: countersData.dislikes_count || 0,
          views: countersData.views_count || 0, comments: countersData.comments_count || 0
        });
      }

      // Cargar estado de interacciones del usuario
      if (user) {
        // Likes, Dislikes, Guardado, Seguir, Puntos ganados
        const [likeData, dislikeData, savedData, followData, pointsData] = await Promise.all([
          supabase.from('video_likes').select('*').eq('video_id', videoId).eq('user_id', user.id).maybeSingle(),
          supabase.from('video_dislikes').select('*').eq('video_id', videoId).eq('user_id', user.id).maybeSingle(),
          supabase.from('saved_videos').select('*').eq('video_id', videoId).eq('user_id', user.id).maybeSingle(),
          videoData.user_id ? supabase.from('user_follows').select('*').eq('follower_id', user.id).eq('following_id', videoData.user_id).maybeSingle() : Promise.resolve({ data: null }),
          supabase.from('user_video_points').select('action_type').eq('user_id', user.id).eq('video_id', videoId)
        ]);

        setLiked(!!likeData.data);
        setDisliked(!!dislikeData.data);
        setSaved(!!savedData.data);
        setFollowing(!!followData.data);

        if (pointsData.data) {
          const actions = pointsData.data.map(p => p.action_type);
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
    // ... (Lógica de loadRelatedVideos)
    try {
      const { data, error } = await supabase
        .from('videos').select('id, title, description, thumbnail_url, duration_seconds, views_count, likes_count, category, created_at, user_id, orientation')
        .neq('id', videoId).eq('is_published', true).limit(50);
      if (error) throw error;

      const horizontalVideos = data.filter(v => !v.orientation || v.orientation === 'horizontal');
      if (horizontalVideos && horizontalVideos.length > 0) {
        const userIds = [...new Set(horizontalVideos.map(v => v.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: creatorsData } = await supabase
            .from('user_profiles').select('id, full_name, username, avatar_url, is_verified').in('id', userIds);
          
          if (creatorsData) {
            const creatorsMap = {};
            creatorsData.forEach(creator => { creatorsMap[creator.id] = creator; });
            
            const transformed = horizontalVideos.map(video => ({
              id: video.id, title: video.title, thumbnail: video.thumbnail_url, duration: video.duration_seconds,
              views: video.views_count, views_count: video.views_count, likes: video.likes_count,
              category: video.category, created_at: video.created_at, orientation: video.orientation,
              creator: creatorsMap[video.user_id] ? {
                id: creatorsMap[video.user_id].id, name: creatorsMap[video.user_id].full_name,
                username: creatorsMap[video.user_id].username, profile_image_url: creatorsMap[video.user_id].avatar_url,
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
    // ... (Lógica de loadComments)
    if (!videoId) return;

    try {
      setLoadingComments(true);

      // Cargar comentarios principales
      const { data: commentsData, error } = await supabase
        .from('video_comments').select('*').eq('video_id', videoId)
        .is('parent_comment_id', null).order('created_at', { ascending: false });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const commentIds = commentsData.map(c => c.id);
        // Cargar respuestas
        const { data: repliesData } = await supabase
          .from('video_comments').select('*').in('parent_comment_id', commentIds);

        const allComments = [...commentsData, ...(repliesData || [])];
        const userIds = [...new Set(allComments.map(c => c.user_id).filter(Boolean))];
        
        // Cargar perfiles de usuario
        let usersMap = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('user_profiles').select('id, full_name, username, avatar_url, is_verified').in('id', userIds);
          
          if (usersData) {
            usersData.forEach(userProfile => {
              usersMap[userProfile.id] = { id: userProfile.id, name: userProfile.full_name, username: userProfile.username, profile_image_url: userProfile.avatar_url, is_verified: userProfile.is_verified };
            });
          }
        }

        // Asignar usuarios y respuestas a los comentarios principales
        commentsData.forEach(comment => {
          if (comment.user_id && usersMap[comment.user_id]) { comment.user = usersMap[comment.user_id]; }
          
          comment.replies = (repliesData || [])
            .filter(reply => reply.parent_comment_id === comment.id)
            .map(reply => {
              if (reply.user_id && usersMap[reply.user_id]) { reply.user = usersMap[reply.user_id]; }
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
  // 🔗 FUNCIONES DE INTERACCIÓN (Likes, Share, Comments, Follow, Puntos)
  // ===============================

  const showPointsNotification = (message) => { /* ... */
    setPointsNotification({ show: true, message });
    setTimeout(() => { setPointsNotification({ show: false, message: '' }); }, 3000);
  };

  const trackPointsEarned = async (actionType, pointsAmount) => { /* ... */
    if (!user) return;
    try {
      await supabase.from('user_video_points').insert({ user_id: user.id, video_id: videoId, action_type: actionType, points_earned: pointsAmount });
    } catch (err) {
      console.error('Error al registrar puntos:', err);
    }
  };

  const handleLike = async () => { /* ... */
    if (!user) { navigate('/login'); return; }
    try {
      if (liked) {
        setLiked(false);
        setVideoCounters(prev => ({ ...prev, likes: Math.max(0, prev.likes - 1) }));
        await supabase.from('video_likes').delete().eq('video_id', videoId).eq('user_id', user.id);
        await supabase.rpc('decrement_video_likes', { video_id: videoId });
      } else {
        if (disliked) { await handleDislike(); }
        setLiked(true);
        setVideoCounters(prev => ({ ...prev, likes: prev.likes + 1 }));
        await supabase.from('video_likes').insert({ video_id: videoId, user_id: user.id });
        await supabase.rpc('increment_video_likes', { video_id: videoId });
        if (!hasEarnedLikePoints) {
          const pointsAmount = 5; await addPoints(pointsAmount, 'Like en video', 'free');
          await trackPointsEarned('like', pointsAmount); setHasEarnedLikePoints(true);
          showPointsNotification(`+${pointsAmount} puntos por dar like 🎉`); missionsService.trackAction('like');
        }
      }
    } catch (err) { console.error('Error en like:', err); }
  };

  const handleDislike = async () => { /* ... */
    if (!user) { navigate('/login'); return; }
    try {
      if (disliked) {
        setDisliked(false);
        setVideoCounters(prev => ({ ...prev, dislikes: Math.max(0, prev.dislikes - 1) }));
        await supabase.from('video_dislikes').delete().eq('video_id', videoId).eq('user_id', user.id);
        await supabase.rpc('decrement_video_dislikes', { video_id: videoId });
      } else {
        if (liked) {
          setLiked(false);
          setVideoCounters(prev => ({ ...prev, likes: Math.max(0, prev.likes - 1) }));
          await supabase.from('video_likes').delete().eq('video_id', videoId).eq('user_id', user.id);
          await supabase.rpc('decrement_video_likes', { video_id: videoId });
        }
        setDisliked(true);
        setVideoCounters(prev => ({ ...prev, dislikes: prev.dislikes + 1 }));
        await supabase.from('video_dislikes').insert({ video_id: videoId, user_id: user.id });
        await supabase.rpc('increment_video_dislikes', { video_id: videoId });
      }
    } catch (err) { console.error('Error en dislike:', err); }
  };

  const handleSave = async () => { /* ... */
    if (!user) { navigate('/login'); return; }
    try {
      if (saved) {
        setSaved(false);
        await supabase.from('saved_videos').delete().eq('video_id', videoId).eq('user_id', user.id);
      } else {
        setSaved(true);
        await supabase.from('saved_videos').insert({ video_id: videoId, user_id: user.id });
        missionsService.trackAction('save');
        showPointsNotification('Video guardado en favoritos');
      }
    } catch (err) { console.error('Error al guardar:', err); }
  };

  const handleShare = async () => { /* ... */
    const url = `${window.location.origin}/video/${videoId}`;
    setShareLink(url);
    setShowShareModal(true);
    if (user && !hasEarnedSharePoints) {
      const pointsAmount = 3; await addPoints(pointsAmount, 'Compartir video', 'free');
      await trackPointsEarned('share', pointsAmount); setHasEarnedSharePoints(true);
      showPointsNotification(`+${pointsAmount} puntos por compartir 🎉`); missionsService.trackAction('share');
    }
  };

  const handleCopyLink = () => { /* ... */
    navigator.clipboard.writeText(shareLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleFollow = async () => { /* ... */
    if (!user) { navigate('/login'); return; }
    if (!video?.user_id) return;
    try {
      if (following) {
        setFollowing(false);
        await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', video.user_id);
      } else {
        setFollowing(true);
        await supabase.from('user_follows').insert({ follower_id: user.id, following_id: video.user_id });
        missionsService.trackAction('follow');
        showPointsNotification('Ahora sigues a este creador');
      }
    } catch (err) { console.error('Error al seguir:', err); }
  };

  const handleSubmitComment = async (e) => { /* ... */
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!newComment.trim()) return;
    try {
      const commentData = { video_id: videoId, user_id: user.id, content: newComment.trim(), parent_comment_id: replyingTo };
      const { data, error } = await supabase.from('video_comments').insert(commentData).select('*').single();
      if (error) throw error;

      // Cargar info de usuario para el nuevo comentario
      const { data: userData } = await supabase.from('user_profiles').select('id, full_name, username, avatar_url, is_verified').eq('id', user.id).single();
      if (userData) { data.user = { id: userData.id, name: userData.full_name, username: userData.username, profile_image_url: userData.avatar_url, is_verified: userData.is_verified }; }

      await supabase.rpc('increment_video_comments', { video_id: videoId });
      setVideoCounters(prev => ({ ...prev, comments: prev.comments + 1 }));

      if (!hasEarnedCommentPoints) {
        const pointsAmount = 10; await addPoints(pointsAmount, 'Comentar video', 'free');
        await trackPointsEarned('comment', pointsAmount); setHasEarnedCommentPoints(true);
        showPointsNotification(`+${pointsAmount} puntos por comentar 🎉`); missionsService.trackAction('comment');
      }

      // Actualizar la lista de comentarios
      if (replyingTo) {
        setComments(prev => prev.map(comment => {
          if (comment.id === replyingTo) { return { ...comment, replies: [...(comment.replies || []), data] }; }
          return comment;
        }));
      } else {
        setComments(prev => [data, ...prev]);
      }
      setNewComment('');
      setReplyingTo(null);
    } catch (err) { console.error('Error al publicar comentario:', err); }
  };

  const handleDeleteComment = async (commentId) => { /* ... */
    if (!user) return;
    try {
      await supabase.from('video_comments').delete().eq('id', commentId).eq('user_id', user.id);
      await supabase.rpc('decrement_video_comments', { video_id: videoId });
      setVideoCounters(prev => ({ ...prev, comments: Math.max(0, prev.comments - 1) }));
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) { console.error('Error al eliminar comentario:', err); }
  };

  // ===============================
  // ⏯️ FUNCIONES DEL VIDEO PLAYER
  // ===============================

  /** Alterna el estado de play/pause del video principal. */
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

  /** Maneja el cambio de volumen en ambos reproductores. */
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
    if (miniVideoRef.current) miniVideoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  /** Alterna el mute/unmute en ambos reproductores. */
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

  /** * Actualiza el progreso y trackea la obtención de puntos por vista (a los 30 segundos).
   * @param {React.SyntheticEvent} e - Evento de tiempo del video.
   */
  const handleTimeUpdate = (e) => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    setProgress((currentVideo.currentTime / currentVideo.duration) * 100);
    const currentTime = currentVideo.currentTime;

    // Lógica para puntos por vista (a los 30 segundos)
    if (currentTime >= 30 && !hasEarnedViewPoints && user) {
      const pointsAmount = 2;
      addPoints(pointsAmount, 'Ver video', 'free');
      trackPointsEarned('view', pointsAmount);
      setHasEarnedViewPoints(true);
      showPointsNotification(`+${pointsAmount} puntos por ver video 🎉`);
      missionsService.trackAction('watch');
    }
  };
  
  /** * Maneja el fin de la reproducción para iniciar el siguiente video.
   * @param {React.SyntheticEvent} e - Evento de fin de video.
   */
  const handleVideoEnd = () => {
    setIsPlaying(false);

    // Lógica para reproducir el siguiente video
    if (relatedVideos.length > 0) {
      // Encontrar el índice del video actual en la lista de relacionados
      const currentIndex = relatedVideos.findIndex(v => v.id === videoId);
      const nextVideo = relatedVideos[currentIndex + 1];

      if (nextVideo) {
        // Navegar al siguiente video
        navigate(`/video/${nextVideo.id}`);
        window.scrollTo(0, 0); // Desplazar al inicio de la página del nuevo video
      } else {
        // Si no hay más videos, se puede optar por repetir, o no hacer nada
        console.log('No hay más videos relacionados para reproducción automática.');
      }
    }
  };

  /** Busca una posición específica en el video al hacer click en la barra de progreso. */
  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  /** Alterna el modo de pantalla completa. */
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        if (isMobile && screen.orientation && screen.orientation.lock) {
          try { await screen.orientation.lock('landscape'); } catch (err) { console.log('No se pudo bloquear orientación:', err); }
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        if (isMobile && screen.orientation && screen.orientation.unlock) { screen.orientation.unlock(); }
      }
    } catch (err) { console.error('Fullscreen error:', err); }
  };

  /** Muestra los controles al mover el ratón y los oculta después de 3 segundos si está reproduciendo. */
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
  // 💡 EFECTOS Y UTILIDADES
  // ===============================

  /** Carga los datos al montar o al cambiar el videoId/user. */
  useEffect(() => {
    fetchVideoData();
    fetchUserProfile();
  }, [fetchVideoData, fetchUserProfile]);

  /** Carga los comentarios al montar o al cambiar el videoId. */
  useEffect(() => {
    if (videoId) {
      loadComments();
    }
  }, [videoId, loadComments]);

  /** Limpia el timeout de los controles al desmontar. */
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
    if (num >= 1000000) { return (num / 1000000).toFixed(1) + 'M'; }
    if (num >= 1000) { return (num / 1000).toFixed(1) + 'K'; }
    return num?.toString() || '0';
  };
  
  // Lógica para la descripción corta y el botón "Ver más"
  const displayDescription = video?.description
    ? (isDescriptionExpanded || video.description.length <= MAX_DESCRIPTION_LENGTH)
      ? video.description
      : video.description.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
    : 'No hay descripción disponible.';
  const needsExpansion = video?.description && video.description.length > MAX_DESCRIPTION_LENGTH;

  // ===============================
  // 🎨 RENDERIZADO
  // ===============================

  if (loading) {
    // ... (Render de carga)
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
    // ... (Render de error)
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
              {/* VIDEO PLAYER PRINCIPAL */}
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
                  onEnded={handleVideoEnd} // ✅ Función de Autoplay Siguiente
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  // Evita que el video se pueda pausar/reproducir si está minimizado
                  onClick={!isMinimized ? togglePlayPause : undefined} 
                />

                {/* Overlay de minimizado */}
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

                {/* Controles del reproductor (solo visibles en modo normal) */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 pointer-events-none ${
                    showControls && !isMinimized ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {/* Botón de Play/Pause central */}
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

                  {/* Barra de Progreso y Controles Inferiores */}
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
                        {/* Play/Pause */}
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                          className="hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors"
                        >
                          <Icon name={isPlaying ? 'Pause' : 'Play'} size={isMobile ? 18 : 20} />
                        </button>

                        {/* Control de Volumen */}
                        <div className="flex items-center gap-2 group/volume">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
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

                        {/* Tiempo de reproducción */}
                        <span className="text-xs md:text-sm font-medium">
                          {formatTime(videoRef.current?.currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 md:gap-2">
                        {/* Botón Minimizar */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
                          className="hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors"
                          title="Minimizar"
                        >
                          <Icon name="Minimize2" size={isMobile ? 18 : 20} />
                        </button>

                        {/* Botón Fullscreen */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                          className="hover:bg-white/20 p-1.5 md:p-2 rounded-full transition-colors"
                        >
                          <Icon name={isFullscreen ? 'Minimize' : 'Maximize'} size={isMobile ? 18 : 20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información del video y Botones de Interacción */}
              <div className="mt-4 space-y-4">
                <h1 className="text-lg md:text-xl font-bold text-foreground">
                  {video.title}
                </h1>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Info del Creador y Botón Seguir */}
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
                          className="font-semibold text-foreground hover:text-primary text-sm md:text-base"
                        >
                          {video.creator?.name || 'Usuario'}
                        </Link>
                        {video.creator?.is_verified && (
                          <Icon name="BadgeCheck" size={16} className="text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {formatNumber(videoCounters.views)} visualizaciones
                      </p>
                    </div>
                    {user?.id !== video.user_id && (
                      <Button
                        onClick={handleFollow}
                        variant={following ? 'outline' : 'default'}
                        size="sm"
                        className="ml-auto md:ml-4"
                      >
                        {following ? 'Siguiendo' : 'Seguir'}
                      </Button>
                    )}
                  </div>

                  {/* Botones de Interacción (Likes, Dislikes, Share, Save) */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <div className="flex items-center bg-muted rounded-full overflow-hidden">
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
                    </div>

                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-muted rounded-full hover:bg-muted-foreground/10 transition-colors whitespace-nowrap"
                    >
                      <Icon name="Share2" size={18} />
                      <span className="font-medium text-sm">Compartir</span>
                    </button>

                    <button
                      onClick={handleSave}
                      className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-muted rounded-full hover:bg-muted-foreground/10 transition-colors whitespace-nowrap ${
                        saved ? 'text-primary' : ''
                      }`}
                    >
                      <Icon name="Bookmark" size={18} className={saved ? 'fill-current' : ''} />
                      <span className="font-medium text-sm">{saved ? 'Guardado' : 'Guardar'}</span>
                    </button>
                  </div>
                </div>

                {/* ✅ DESCRIPCIÓN DEL VIDEO CON "VER MÁS / VER MENOS" */}
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {displayDescription}
                    {needsExpansion && (
                      <button
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="text-primary font-medium ml-2 hover:underline"
                      >
                        {isDescriptionExpanded ? 'Ver menos' : 'Ver más'}
                      </button>
                    )}
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

                {/* ✅ SECCIÓN DE COMENTARIOS */}
                <div className="border-t pt-6">
                  <h3 className="text-base md:text-lg font-bold mb-4">
                    {formatNumber(videoCounters.comments)} comentarios
                  </h3>

                  {/* Formulario de comentario/respuesta */}
                  {user ? (
                    <form onSubmit={handleSubmitComment} className="mb-6">
                      <div className="flex gap-3">
                        <img
                          src={userProfile?.avatar_url || '/default-avatar.png'}
                          alt="Tu avatar"
                          className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={replyingTo ? 'Escribe una respuesta...' : 'Añade un comentario...'}
                            className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-primary outline-none text-foreground placeholder:text-muted-foreground text-sm md:text-base"
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
                      <p className="text-muted-foreground mb-2 text-sm">
                        Inicia sesión para comentar
                      </p>
                      <Button onClick={() => navigate('/login')} size="sm">
                        Iniciar sesión
                      </Button>
                    </div>
                  )}

                  {/* Lista de comentarios y respuestas */}
                  <div className="space-y-4">
                    {loadingComments ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No hay comentarios aún. ¡Sé el primero en comentar!
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="space-y-3">
                          <div className="flex gap-2 md:gap-3">
                            <Link to={`/profile/${comment.user?.username || 'unknown'}`}>
                              <img
                                src={comment.user?.profile_image_url || '/default-avatar.png'}
                                alt={comment.user?.name || 'Usuario'}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0"
                              />
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  to={`/profile/${comment.user?.username || 'unknown'}`}
                                  className="font-semibold text-xs md:text-sm hover:text-primary"
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
                              <p className="text-xs md:text-sm text-foreground mt-1">
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

                              {/* Respuestas anidadas */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-4 space-y-3">
                                  {!showReplies[comment.id] ? (
                                    <button
                                      onClick={() => setShowReplies(prev => ({ ...prev, [comment.id]: true }))}
                                      className="text-xs md:text-sm font-medium text-primary hover:underline flex items-center gap-2"
                                    >
                                      <Icon name="CornerDownRight" size={14} />
                                      Ver {comment.replies.length} respuesta{comment.replies.length !== 1 ? 's' : ''}
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setShowReplies(prev => ({ ...prev, [comment.id]: false }))}
                                        className="text-xs md:text-sm font-medium text-primary hover:underline flex items-center gap-2"
                                      >
                                        <Icon name="CornerDownRight" size={14} />
                                        Ocultar respuestas
                                      </button>
                                      {comment.replies.map((reply) => (
                                        <div key={reply.id} className="flex gap-2 md:gap-3 ml-4 md:ml-6">
                                          <Link to={`/profile/${reply.user?.username || 'unknown'}`}>
                                            <img
                                              src={reply.user?.profile_image_url || '/default-avatar.png'}
                                              alt={reply.user?.name || 'Usuario'}
                                              className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
                                            />
                                          </Link>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <Link
                                                to={`/profile/${reply.user?.username || 'unknown'}`}
                                                className="font-semibold text-xs md:text-sm hover:text-primary"
                                              >
                                                {reply.user?.name || 'Usuario'}
                                              </Link>
                                              {reply.user?.is_verified && (
                                                <Icon name="BadgeCheck" size={12} className="text-blue-500" />
                                              )}
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(reply.created_at).toLocaleDateString('es-ES')}
                                              </span>
                                            </div>
                                            <p className="text-xs md:text-sm text-foreground mt-1">
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

            {/* BARRA LATERAL DE VIDEOS RELACIONADOS */}
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

      {/* MINI-PLAYER FLOTANTE */}
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
          {/* Video en mini-player - Sincronizado con el principal */}
          <div className="relative aspect-video bg-black">
            <video
              ref={miniVideoRef}
              src={video.video_url}
              className="w-full h-full object-contain"
              muted={isMuted}
              volume={volume}
              onTimeUpdate={(e) => {
                // Sincronizar el progreso del principal con el mini-player
                if (videoRef.current) {
                  videoRef.current.currentTime = e.target.currentTime;
                }
                setProgress((e.target.currentTime / e.target.duration) * 100);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnd} // ✅ Función de Autoplay Siguiente
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

          {/* Controles y Metadata del Mini-Player */}
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
                  onClick={(e) => { e.stopPropagation(); handleMaximize(); }}
                  className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Maximizar"
                >
                  <Icon name="Maximize2" size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
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

      {/* Modal de compartir (Share Modal) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-bold">Compartir video</h3>
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
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Facebook" size={20} className="text-white" />
                </div>
                <span className="font-medium text-sm">Compartir en Facebook</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(video.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Twitter" size={20} className="text-white" />
                </div>
                <span className="font-medium text-sm">Compartir en Twitter</span>
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(video.title + ' ' + shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="MessageCircle" size={20} className="text-white" />
                </div>
                <span className="font-medium text-sm">Compartir en WhatsApp</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs md:text-sm"
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
