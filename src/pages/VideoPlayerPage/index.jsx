// src/pages/VideoPlayerPage/index.jsx
// ============================================================================
// VERSION FINAL ESTABLE
// ✅ 1. (FIX) loadRelatedVideos: Eliminada la selección de 'likes_count' (Arregla el crash/recarga).
// ✅ 2. (VERIFICADO) fetchVideoData: Usa conteo directo (Arregla contadores en cero).
// ✅ 3. (NUEVO) INTEGRACIÓN: Botón y Modal de Regalar Puntos (GiftPointsModal)
// ✅ 4. (CORREGIDO) handleLike: Añadidas las notificaciones de progreso y "ya ganado",
//    igualando la lógica de ReelsContainer.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from 'lib/supabase';
import { useAuth } from 'contexts/AuthContext';
import { usePoints } from 'contexts/PointsContext'; 
import { 
  trackWatchVideo, 
  trackGiveLike, 
  trackShareContent, 
  trackComment, 
  trackFollowUser,
  trackMissionProgress 
} from 'services/missionsService'; 
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import RelatedVideosSidebar from 'components/video/RelatedVideosSidebar';
import useIsMobile from 'hooks/useIsMobile';
// ✅ NUEVA IMPORTACIÓN
import GiftPointsModal from 'components/GiftPointsModal'; 

// Definición de la animación simple para el feedback 
const styleSheet = document.styleSheets[0] || document.createElement('style');
if (!document.styleSheets[0]) {
  document.head.appendChild(styleSheet);
}
try {
  if (![...styleSheet.cssRules].some(rule => rule.cssText.includes('@keyframes pop-in'))) {
    styleSheet.insertRule(`
    @keyframes pop-in {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
    `, styleSheet.cssRules.length);
  }
} catch (e) { /* silent fail */ }


const VideoPlayerPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPoints: updatePointsContext } = usePoints(); 
  const isMobile = useIsMobile();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

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
  
  // ✅ NUEVO ESTADO: Control del Modal de Regalo
  const [showGiftModal, setShowGiftModal] = useState(false); 

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReplies, setShowReplies] = useState({});

  const [hasEarnedViewPoints, setHasEarnedViewPoints] = useState(false);
  const [hasEarnedLikePoints, setHasEarnedLikePoints] = useState(false);
  const [hasEarnedCommentPoints, setHasEarnedCommentPoints] = useState(false);
  const [hasEarnedSharePoints, setHasEarnedSharePoints] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const [userFeedback, setUserFeedback] = useState({
    show: false,
    message: '',
    type: 'success', 
  });

  const [showFullDescription, setShowFullDescription] = useState(false);

  const [isMinimized, setIsMinimized] = useState(false);
  const [miniPlayerPosition, setMiniPlayerPosition] = useState({ 
    x: window.innerWidth - 420,
    y: window.innerHeight - 300
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const videoRef = useRef(null);
  const miniVideoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const miniPlayerRef = useRef(null);

  const DESCRIPTION_MAX_LENGTH = 150;

  // ===============================
  // FUNCIONES DE FEEDBACK (sin cambios)
  // ===============================

  const showUserFeedback = useCallback((message, type = 'success', duration = 2500) => {
    setUserFeedback({ show: true, message, type });
    setTimeout(() => {
      setUserFeedback({ show: false, message: '', type: 'success' });
    }, duration);
  }, []);
  
  // ===============================
  // CONTROLES DE TECLADO (sin cambios)
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
  }, [volume, isMinimized]); // Dependencias simplificadas (togglePlayPause, etc. se definen con useCallback o no cambian)

  // ===============================
  // FUNCIONES DE DRAG & DROP (sin cambios)
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

  const handleMinimize = () => {
    const mainVideo = videoRef.current;
    if (!mainVideo) return;

    const currentTime = mainVideo.currentTime;
    const wasPlaying = !mainVideo.paused;

    mainVideo.pause();
    setIsPlaying(false); 
    setIsMinimized(true);

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
    const miniVideo = miniPlayerRef.current;

    if (!mainVideo || !miniVideo) return;

    const currentTime = miniVideoRef.current?.currentTime || mainVideo.currentTime;
    const wasPlaying = miniVideoRef.current?.paused === false;

    if (miniVideoRef.current) {
        miniVideoRef.current.pause();
    }
    setIsPlaying(false);
    setIsMinimized(false);

    setTimeout(() => {
      mainVideo.currentTime = currentTime;
      mainVideo.volume = volume;
      mainVideo.muted = isMuted;
      
      if (wasPlaying) {
        mainVideo.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error('Error play main:', err));
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
        .select('*, views_count') // Seleccionamos views_count
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

      // RPC para incrementar vistas
      await supabase.rpc('increment_video_views', { video_id: videoId });

      // =========================================================================
      // ✅ IMPLEMENTACIÓN DE CONTEO DIRECTO (SOLUCIÓN AL BUG DEL CONTADOR EN CERO)
      // =========================================================================
      
      const { count: likesCount } = await supabase
        .from('video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);
        
      const { count: dislikesCount } = await supabase
        .from('video_dislikes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);

      const { count: commentsCount } = await supabase
        .from('video_comments')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);

      // Leemos 'views_count' de los datos del video que ya tiene el +1 del RPC
      const { data: updatedVideoData } = await supabase
        .from('videos')
        .select('views_count')
        .eq('id', videoId)
        .single();

      setVideoCounters({
        likes: likesCount || 0,
        dislikes: dislikesCount || 0,
        views: updatedVideoData?.views_count || videoData.views_count || 0,
        comments: commentsCount || 0
      });
      // =========================================================================

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
            .from('user_follows') // 🛑 Asumido: 'user_follows'
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', videoData.user_id)
            .maybeSingle();
          setFollowing(!!followData);
        }

        // ✅ INTEGRACIÓN CORREGIDA:
        // Leer 'user_video_points' para verificar si la acción ya fue registrada
        const { data: pointsData, error: pointsError } = await supabase
          .from('user_video_points') // ✅ Tabla correcta
          .select('action_type')
          .eq('user_id', user.id)
          .eq('video_id', videoId); // ✅ Referencia correcta

        if (pointsError) {
            console.error("Error al verificar puntos ganados: ", pointsError.message);
        }
          
        if (pointsData) {
          const actions = pointsData.map(p => p.action_type);
          // ✅ Verificamos si CUALQUIER acción de like (antigua o misión) existe
          setHasEarnedLikePoints(actions.includes('like') || actions.includes('mission_like_complete'));
          setHasEarnedCommentPoints(actions.includes('comment'));
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

  // ✅ CORRECCIÓN DE VIDEOS RELACIONADOS (CRASH FIX)
  const loadRelatedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        // 🛑 SELECCIÓN CORREGIDA: Eliminadas likes_count, comments_count.
        .select('id, title, description, thumbnail_url, duration_seconds, views_count, category, created_at, user_id, orientation')
        .neq('id', videoId)
        // 🛑 LÍNEA ELIMINADA: .eq('is_published', true) 
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
              // likes: video.likes_count, // 🛑 Eliminado
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
  // FUNCIONES DE INTERACCIÓN Y PUNTOS (CORREGIDAS)
  // ===============================

  const handleEarnViewPoints = async () => {
    if (hasEarnedViewPoints || !user) return;

    try {
      setHasEarnedViewPoints(true);
      const result = await trackWatchVideo('video', videoId);

      if (result.result === 'success' && result.points_earned && result.points_earned > 0) {
        updatePointsContext(result.points_earned);
        showUserFeedback(`+${result.points_earned} PUNTOS por ver 30 segundos 🎉`, 'success');
      }

    } catch (err) {
      console.error('❌ Error al otorgar puntos/misión por vista:', err);
    }
  };


  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const wasLiked = liked;
    const newLikedState = !liked;

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

      } else {
        if (disliked) {
          await handleDislike();
        }

        setLiked(true);
        setVideoCounters(prev => ({
          ...prev,
          likes: (prev.likes || 0) + 1
        }));

        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        // ================================================================
        // ✅ INICIO: LÓGICA DE NOTIFICACIONES DE LIKE CORREGIDA
        // ================================================================
        
        if (!hasEarnedLikePoints) {
          // Es la primera vez que da like (o al menos la primera vez que
          // se registrará para puntos/misión).
          setHasEarnedLikePoints(true); 
          
          try {
            const result = await trackGiveLike('video', videoId); 
            
            console.log('--- RESPUESTA DE TRACK GIVE LIKE (DEBUG) ---', result); 

            // Caso 1: Misión completada, puntos ganados
            if (result.result === 'success' && result.points_earned && result.points_earned > 0) {
              updatePointsContext(result.points_earned);
              showUserFeedback(`+${result.points_earned} PUNTOS. ¡Misión completada! 🎉`, 'success');
            } 
            // Caso 2: Progreso registrado (ej. 2/10 likes)
            else if (result.result === 'progress_updated') {
              showUserFeedback('Acción registrada. ¡Sigue dando Likes!', 'success');
            }
            // Caso 3: Anti-farming (DB bloqueó el 'like' duplicado)
            else if (result.result === 'already_paid') {
              showUserFeedback('PUNTOS YA GANADOS por este Like.', 'restriction'); 
            } 
            // Caso 4: Misión ya completada hoy
            else if (result.result === 'already_completed') {
               showUserFeedback('Misión de Likes ya completada hoy.', 'restriction');
            }
            // Caso 5: Error o 'mission_not_found'
            else if (result.result === 'error') {
               setHasEarnedLikePoints(false); // Permitir reintento
            }
            // (No mostramos nada si es 'mission_not_found' o 'registered' sin progreso)

          } catch (pointsError) {
             console.error('❌ Error al otorgar puntos/misión por Like:', pointsError);
             setHasEarnedLikePoints(false); // Permitir reintento
          }
        } else {
          // El usuario YA ha ganado puntos por esta acción en el pasado.
          showUserFeedback('Ya has ganado puntos por esta acción.', 'restriction');
        }
        // ================================================================
        // ✅ FIN: LÓGICA DE NOTIFICACIONES
        // ================================================================
      }
    } catch (err) {
      console.error('Error en like:', err);
      setLiked(wasLiked); 
      setVideoCounters(prev => ({ 
        ...prev, 
        likes: Math.max(0, prev.likes - (newLikedState ? 1 : -1)) 
      }));
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

      } else {
        if (liked) {
          await handleLike(); 
        }

        setDisliked(true);
        setVideoCounters(prev => ({
          ...prev,
          dislikes: prev.dislikes + 1
        }));

        await supabase
          .from('video_dislikes')
          .insert({ video_id: videoId, user_id: user.id });

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
        
        try {
          // (Asumimos que 'save_video' es el tipo de misión correcto)
          trackMissionProgress('save_video', 'video', videoId); 
        } catch (missionError) {
          console.error('❌ Error al registrar misión de Guardar:', missionError);
        }
        showUserFeedback('Video guardado en favoritos', 'success', 1500);
      }
    } catch (err) {
      console.error('Error al guardar:', err);
    }
  };

  const handleShare = async () => {
    if (!user) {
        navigate('/login');
        return;
    }
    
    const url = `${window.location.origin}/video/${videoId}`;
    setShareLink(url);
    setShowShareModal(true);

    if (!hasEarnedSharePoints) {
      setHasEarnedSharePoints(true); 
      
      try {
        const result = await trackShareContent('video', videoId, 'link'); 

        if (result.result === 'success' && result.points_earned && result.points_earned > 0) {
          updatePointsContext(result.points_earned);
          showUserFeedback(`+${result.points_earned} PUNTOS por Compartir 📢`, 'success');
        } else if (result.result === 'already_paid') {
          showUserFeedback('PUNTOS YA GANADOS por compartir este contenido.', 'restriction');
        } else if (result.result === 'error') {
           setHasEarnedSharePoints(false);
        }
      } catch (pointsError) {
        console.error('❌ Error al otorgar puntos/misión por Compartir:', pointsError);
        setHasEarnedSharePoints(false);
      }
    }
  };
  
  // ✅ NUEVA FUNCIÓN: Abrir Modal de Regalo
  const handleGift = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.id === video.user_id) {
      showUserFeedback('No puedes regalar puntos a tu propio video.', 'restriction');
      return;
    }
    setShowGiftModal(true);
  };
  
  // ✅ NUEVA FUNCIÓN: Manejar el éxito del regalo
  const handleGiftSuccess = (amount) => {
    showUserFeedback(`¡Regalo enviado! ${amount} puntos para el creador.`, 'success');
    // Si necesitas actualizar cualquier contador del video (ej. contador de regalos), hazlo aquí.
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
          .from('user_follows') // 🛑 Asumido: 'user_follows'
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', video.user_id);
      } else {
        setFollowing(true);
        await supabase
          .from('user_follows') // 🛑 Asumido: 'user_follows'
          .insert({
            follower_id: user.id,
            following_id: video.user_id
          });
        
        try {
          trackFollowUser(video.user_id);
        } catch (missionError) {
          console.error('❌ Error al registrar misión de Seguir:', missionError);
        }
        showUserFeedback('Ahora sigues a este creador', 'success', 1500);
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

      setVideoCounters(prev => ({
        ...prev,
        comments: prev.comments + 1
      }));

      // ✅ CORREGIDO: Lógica de notificación de comentarios
      if (!hasEarnedCommentPoints) {
        setHasEarnedCommentPoints(true); 
        
        try {
          const result = await trackComment('video', videoId);
          
          console.log('--- RESPUESTA DE TRACK COMMENT (DEBUG) ---', result); 

          if (result.result === 'success' && result.points_earned && result.points_earned > 0) {
            updatePointsContext(result.points_earned);
            showUserFeedback(`+${result.points_earned} PUNTOS por Comentar 💬`, 'success');
          } else if (result.result === 'progress_updated') {
            showUserFeedback('Comentario registrado. ¡Sigue así!', 'success');
          } else if (result.result === 'already_paid') {
            showUserFeedback('PUNTOS YA GANADOS por Comentar.', 'restriction');
          } else if (result.result === 'already_completed') {
            showUserFeedback('Misión de Comentarios ya completada hoy.', 'restriction');
          } else if (result.result === 'error') {
             setHasEarnedCommentPoints(false); // Permitir reintento
          }
        } catch (pointsError) {
          console.error('❌ Error al otorgar puntos/misión por Comentar:', pointsError);
          setHasEarnedCommentPoints(false);
        }
      } else {
        // Ya ganó puntos, no mostrar nada (evita spam de notificaciones)
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
      setVideoCounters(prev => ({ ...prev, comments: Math.max(0, prev.comments - 1) }));
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

      setVideoCounters(prev => ({
        ...prev,
        comments: Math.max(0, prev.comments - 1)
      }));

      setComments(prev => prev.filter(c => c.id !== commentId));
      
    } catch (err) {
      console.error('Error al eliminar comentario:', err);
    }
  };

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
      handleEarnViewPoints();
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
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  const getDisplayedDescription = () => {
    if (!video.description) return '';
    if (showFullDescription || video.description.length <= DESCRIPTION_MAX_LENGTH) {
      return video.description;
    }
    return video.description.substring(0, DESCRIPTION_MAX_LENGTH) + '...';
  };

  const shouldShowToggleButton = video?.description && video.description.length > DESCRIPTION_MAX_LENGTH;

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

      {/* NUEVO FEEDBACK VISUAL: CENTRADO Y GRANDE */}
      {userFeedback.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4 backdrop-blur-sm bg-black/10">
          <div 
            className={`
              p-8 rounded-2xl text-center shadow-2xl transition-all duration-300 transform 
              ${userFeedback.type === 'success' ? 'bg-green-600/95 border-green-300' : 'bg-red-600/95 border-red-300'} 
              text-white border-4
              animate-pop-in
            `}
            style={{ minWidth: '320px', maxWidth: '90%' }}
          >
            <Icon 
              name={userFeedback.type === 'success' ? 'Zap' : 'AlertTriangle'} 
              className="w-12 h-12 mx-auto mb-3" 
            />
            <h2 className="text-3xl font-extrabold mb-1 uppercase">
              {userFeedback.type === 'success' ? '¡Éxito!' : 'Acción Restringida'}
            </h2>
            <p className="text-xl font-semibold">{userFeedback.message}</p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              {/* Video Player Principal */}
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

              {/* Información del video */}
              <div className="mt-4 space-y-4">
                <h1 className="text-lg md:text-xl font-bold text-foreground">
                  {video.title}
                </h1>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                          className="font-semibold text-sm md:text-base text-foreground hover:text-primary"
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
                    
                    {/* ✅ NUEVO BOTÓN: Regalar Puntos */}
                    {user?.id !== video.user_id && (
                        <button
                            onClick={handleGift}
                            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-muted rounded-full hover:bg-muted-foreground/10 transition-colors whitespace-nowrap"
                            title="Regalar Puntos al Creador"
                        >
                            <span className="text-lg font-extrabold text-yellow-600 mr-0.5 leading-none">R</span>
                            <Icon name="Gift" size={18} className="fill-current text-yellow-600" />
                            <span className="font-medium text-sm hidden sm:inline">Regalar</span>
                        </button>
                    )}

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

                <div className="bg-muted rounded-lg p-4">
                  {/* Lógica de Ver Más/Ver Menos */}
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {getDisplayedDescription()}
                  </p>

                  {shouldShowToggleButton && (
                    <button
                      onClick={() => setShowFullDescription(prev => !prev)}
                      className="text-sm font-medium text-primary hover:text-primary/80 mt-1"
                    >
                      {showFullDescription ? 'Ver menos' : 'Ver más'}
                    </button>
                  )}
                  {/* Fin de Lógica Ver Más/Ver Menos */}

                  {video.created_at && (
                    <p className={`text-xs text-muted-foreground ${shouldShowToggleButton ? 'mt-1' : 'mt-2'}`}>
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
                  <h3 className="text-base md:text-lg font-bold mb-4">
                    {formatNumber(videoCounters.comments)} comentarios
                  </h3>

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
                                            <p className="text-xs md:text-sm text-foreground mt-0.5">
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
      
      {/* MINI-PLAYER FLOTANTE (sin cambios) */}
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
          <div className="relative aspect-video bg-black">
            <video
              ref={miniVideoRef}
              src={video.video_url}
              className="w-full h-full object-contain"
              muted={isMuted}
              volume={volume}
              onTimeUpdate={(e) => {
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

      {/* Modal de compartir (sin cambios) */}
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
      
      {/* ✅ NUEVO: MODAL DE REGALO DE PUNTOS */}
      <GiftPointsModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        receiverId={video.user_id}
        receiverUsername={video.creator?.username || video.creator?.name || 'Creador'}
        contentId={videoId}
        contentType="video"
        onSuccess={handleGiftSuccess}
      />
    </>
  );
};

export default VideoPlayerPage;
