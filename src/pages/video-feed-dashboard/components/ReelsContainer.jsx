// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ✅ DISEÑO LIMPIO: Sin controles duplicados (eliminados botones circulares superiores)
// ✅ Controles laterales únicos y funcionales
// ✅ Sistema de comentarios implementado
// ✅ Sistema de puntos integrado en todas las acciones

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { addFreePoints } from '../../../services/pointsService';

const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null,
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [dislikedVideos, setDislikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followedCreators, setFollowedCreators] = useState(new Set());
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [enableTransition, setEnableTransition] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // ID del comentario al que se está respondiendo
  const [showReplies, setShowReplies] = useState({}); // Controlar qué respuestas mostrar
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const isInitialMount = useRef(true);
  const hasPlayedInitial = useRef(false);

  console.log('🎬 ReelsContainer render:', {
    videosCount: videos.length,
    firstVideo: videos[0],
    currentIndex,
    selectedReelId
  });

  // ===============================
  // CARGAR LIKES Y DATOS DEL USUARIO
  // ===============================
  useEffect(() => {
    loadUserInteractions();
  }, []);

  const loadUserInteractions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar likes
      const { data: likesData } = await supabase
        .from('video_likes')
        .select('video_id')
        .eq('user_id', user.id);
      
      if (likesData) {
        setLikedVideos(new Set(likesData.map(l => l.video_id)));
      }

      // Cargar guardados
      const { data: savedData } = await supabase
        .from('saved_videos')
        .select('video_id')
        .eq('user_id', user.id);
      
      if (savedData) {
        setSavedVideos(new Set(savedData.map(s => s.video_id)));
      }

      // Cargar seguidos
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (followData) {
        setFollowedCreators(new Set(followData.map(f => f.following_id)));
      }
    } catch (error) {
      console.error('Error cargando interacciones:', error);
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
    console.log('🔍 Búsqueda de video por ID:', {
      id: selectedReelId,
      index: index,
      video: index >= 0 ? videos[index]?.title : 'No encontrado'
    });
    
    return index >= 0 ? index : 0;
  }, [selectedReelId, videos]);

  // ===============================
  // SINCRONIZACIÓN INICIAL
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    
    const correctIndex = getInitialReelIndex();
    console.log('🎯 Sincronizando estado inicial:', {
      selectedReelId,
      correctIndex,
      isInitialMount: isInitialMount.current
    });
    
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
  // REPRODUCCIÓN AUTOMÁTICA INICIAL
  // ===============================
  useEffect(() => {
    if (hasPlayedInitial.current || videos.length === 0) return;

    console.log('🎬 Intentando reproducir video inicial:', currentIndex);
    
    const attemptPlay = () => {
      const currentVideo = videoRefs.current[currentIndex];
      
      if (!currentVideo) {
        console.log('⏳ Video no disponible, reintentando...');
        setTimeout(attemptPlay, 100);
        return;
      }

      console.log('🎮 Video encontrado, reproduciendo');

      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
        }
      });

      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video inicial reproduciendo');
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
              .catch(e => console.error('❌ Error crítico:', e));
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
  // AUTOPLAY Y GESTIÓN DE VIDEOS
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    
    const initialIndex = getInitialReelIndex();
    if (!hasPlayedInitial.current && currentIndex === initialIndex) {
      console.log('⏭️ Skipping autoplay - manejado por useEffect dedicado');
      return;
    }

    const currentVideo = videoRefs.current[currentIndex];

    if (currentVideo && isAutoPlaying) {
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
        }
      });

      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => console.log('✅ Video reproduciendo (autoplay)'))
          .catch(err => {
            console.error('❌ Error autoplay:', err);
            currentVideo.muted = true;
            currentVideo.play()
              .then(() => console.log('✅ Video reproduciendo (muted)'))
              .catch(e => console.error('❌ Error crítico autoplay:', e));
          });
      }
    }
  }, [currentIndex, videos, isAutoPlaying, mutedVideos, getInitialReelIndex]);

  // Precargar videos adyacentes
  useEffect(() => {
    if (videos.length === 0) return;

    if (currentIndex < videos.length - 1) {
      const nextVideo = videoRefs.current[currentIndex + 1];
      if (nextVideo && nextVideo.readyState < 2) {
        nextVideo.load();
      }
    }

    if (currentIndex >= videos.length - 3 && hasMore && !loading) {
      onLoadMore && onLoadMore();
    }
  }, [currentIndex, videos.length, hasMore, loading, onLoadMore]);

  // ===============================
  // NAVEGACIÓN POR TOUCH (MOBILE)
  // ===============================
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    
    const container = containerRef.current;
    if (container && Math.abs(diff) > 50) {
      container.style.transform = `translateY(${-diff * 0.1}px)`;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    const currentY = e.changedTouches[0].clientY;
    const diff = startY - currentY;
    const container = containerRef.current;

    if (container) {
      container.style.transform = 'translateY(0)';
    }

    if (Math.abs(diff) > 100) {
      if (diff > 0 && currentIndex < videos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  // Navegación con teclas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  // ===============================
  // HANDLERS DE INTERACCIÓN
  // ===============================
  const handlePlayPause = () => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    if (currentVideo.paused) {
      currentVideo.play();
      setIsAutoPlaying(true);
    } else {
      currentVideo.pause();
      setIsAutoPlaying(false);
    }
  };

  const handleMuteToggle = (videoId) => {
    const newMutedVideos = new Set(mutedVideos);
    if (newMutedVideos.has(videoId)) {
      newMutedVideos.delete(videoId);
    } else {
      newMutedVideos.add(videoId);
    }
    setMutedVideos(newMutedVideos);

    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.muted = newMutedVideos.has(videoId);
    }
  };

  const handleLike = async (videoId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newLikedVideos = new Set(likedVideos);
      const newDislikedVideos = new Set(dislikedVideos);
      
      if (newLikedVideos.has(videoId)) {
        // Quitar like
        newLikedVideos.delete(videoId);
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      } else {
        // Agregar like
        newLikedVideos.add(videoId);
        newDislikedVideos.delete(videoId);
        
        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        // Actualizar contador en videos
        await supabase.rpc('increment_video_likes', { video_id: videoId });

        // Otorgar puntos usando el servicio de puntos
        try {
          await addFreePoints(5, 'Like en video', 'video', videoId);
          onPointsEarned && onPointsEarned(5);
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      }
      
      setLikedVideos(newLikedVideos);
      setDislikedVideos(newDislikedVideos);
    } catch (error) {
      console.error('Error en like:', error);
    }
  };

  const handleDislike = async (videoId) => {
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
        newLikedVideos.delete(videoId);

        // Remover like si existe
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      }
      
      setDislikedVideos(newDislikedVideos);
      setLikedVideos(newLikedVideos);
    } catch (error) {
      console.error('Error en dislike:', error);
    }
  };

  const handleSave = async (videoId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newSavedVideos = new Set(savedVideos);
      
      if (newSavedVideos.has(videoId)) {
        // Quitar de guardados
        newSavedVideos.delete(videoId);
        await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
      } else {
        // Agregar a guardados
        newSavedVideos.add(videoId);
        await supabase
          .from('saved_videos')
          .insert({ video_id: videoId, user_id: user.id });

        // Otorgar puntos usando el servicio de puntos
        try {
          await addFreePoints(2, 'Video guardado', 'video', videoId);
          onPointsEarned && onPointsEarned(2);
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      }
      
      setSavedVideos(newSavedVideos);
    } catch (error) {
      console.error('Error en guardar:', error);
    }
  };

  const handleFollow = async (creatorId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newFollowed = new Set(followedCreators);
      
      if (newFollowed.has(creatorId)) {
        // Dejar de seguir
        newFollowed.delete(creatorId);
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creatorId);
      } else {
        // Seguir
        newFollowed.add(creatorId);
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: creatorId });

        // Otorgar puntos usando el servicio de puntos
        try {
          await addFreePoints(10, 'Seguir creador', 'user', creatorId);
          onPointsEarned && onPointsEarned(10);
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      }
      
      setFollowedCreators(newFollowed);
    } catch (error) {
      console.error('Error en seguir:', error);
    }
  };

  const handleShare = async (video) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Mira este reel de ${video.creator.name}`,
          url: `${window.location.origin}/reel/${video.id}`
        });
        
        // Otorgar puntos usando el servicio de puntos
        try {
          await addFreePoints(3, 'Compartir video', 'video', video.id);
          onPointsEarned && onPointsEarned(3);
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/reel/${video.id}`);
        alert('Enlace copiado al portapapeles');
        
        // Otorgar puntos usando el servicio de puntos
        try {
          await addFreePoints(3, 'Compartir video', 'video', video.id);
          onPointsEarned && onPointsEarned(3);
        } catch (pointsError) {
          console.error('Error al otorgar puntos:', pointsError);
        }
      } catch (error) {
        console.log('Error copying:', error);
      }
    }
  };

  // ===============================
  // SISTEMA DE COMENTARIOS CON RESPUESTAS
  // ===============================
  const loadComments = async (videoId) => {
    try {
      // Cargar todos los comentarios del video (incluyendo respuestas)
      let { data, error } = await supabase
        .from('video_comments')
        .select(`
          id,
          video_id,
          user_id,
          content,
          parent_comment_id,
          created_at,
          updated_at
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Si hay comentarios, cargar los datos de los usuarios por separado
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(comment => comment.user_id))];
        
        // Cargar usuarios desde user_profiles
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, name, avatar, username')
          .in('id', userIds);

        if (!usersError && usersData) {
          // Crear un mapa de usuarios
          const usersMap = {};
          usersData.forEach(user => {
            usersMap[user.id] = user;
          });

          // Agregar datos de usuario a cada comentario
          data = data.map(comment => ({
            ...comment,
            user: usersMap[comment.user_id] || {
              id: comment.user_id,
              name: 'Usuario',
              avatar: null,
              username: null
            },
            replies: [] // Inicializar array de respuestas
          }));

          // Organizar comentarios y respuestas
          const topLevelComments = [];
          const repliesMap = {};

          data.forEach(comment => {
            if (comment.parent_comment_id) {
              // Es una respuesta
              if (!repliesMap[comment.parent_comment_id]) {
                repliesMap[comment.parent_comment_id] = [];
              }
              repliesMap[comment.parent_comment_id].push(comment);
            } else {
              // Es un comentario principal
              topLevelComments.push(comment);
            }
          });

          // Agregar respuestas a sus comentarios padres
          topLevelComments.forEach(comment => {
            comment.replies = repliesMap[comment.id] || [];
            comment.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Respuestas más antiguas primero
          });

          data = topLevelComments;
        } else {
          // Si falla, usar datos por defecto
          data = data.filter(c => !c.parent_comment_id).map(comment => ({
            ...comment,
            user: {
              id: comment.user_id,
              name: 'Usuario',
              avatar: null,
              username: null
            },
            replies: []
          }));
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

  const handleOpenComments = async (videoId) => {
    setShowCommentsModal(true);
    setReplyingTo(null);
    setNewComment('');
    await loadComments(videoId);
  };

  const handleAddComment = async (videoId) => {
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: replyingTo // null si es comentario principal, ID si es respuesta
        });

      if (error) throw error;

      // Actualizar contador solo si es comentario principal
      if (!replyingTo) {
        await supabase.rpc('increment_video_comments', { video_id: videoId });
      }

      // Otorgar puntos usando el servicio de puntos
      try {
        await addFreePoints(3, replyingTo ? 'Responder comentario' : 'Comentar video', 'video', videoId);
        onPointsEarned && onPointsEarned(3);
      } catch (pointsError) {
        console.error('Error al otorgar puntos:', pointsError);
      }

      setNewComment('');
      setReplyingTo(null);
      await loadComments(videoId);
    } catch (error) {
      console.error('Error agregando comentario:', error);
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

  // ===============================
  // NAVEGACIÓN CON BOTONES
  // ===============================
  const navigateNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const navigatePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // ===============================
  // FORMATEAR NÚMEROS
  // ===============================
  const formatCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count || 0;
  };

  // ===============================
  // COMPONENTE INDIVIDUAL DE REEL
  // ===============================
  const ReelItem = ({ video, index, isActive }) => {
    const videoUrl = video.videoUrl || video.video_url;
    const isLiked = likedVideos.has(video.id);
    const isDisliked = dislikedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isMuted = mutedVideos.has(video.id);
    const isFollowing = followedCreators.has(video.creator?.id);

    return (
      <div 
        key={video.id}
        className="relative flex-shrink-0 bg-black h-screen"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* VIDEO */}
        <video
          ref={el => videoRefs.current[index] = el}
          src={videoUrl}
          className="w-full h-full object-contain"
          loop
          playsInline
          preload={Math.abs(index - currentIndex) <= 1 ? "auto" : "none"}
          onClick={handlePlayPause}
          autoPlay={isActive}
        />

        {/* CONTROLES LATERALES DERECHOS - SOLO MOBILE */}
        {!isDesktop && (
          <div className="absolute bottom-20 right-4 flex flex-col items-center space-y-5 z-10">
            
            {/* Avatar del Creador + Follow Button */}
            <div className="relative">
              <Link 
                to={`/profile/${video.creator?.id}`}
                className="block"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                  {video.creator?.avatar ? (
                    <img 
                      src={video.creator.avatar} 
                      alt={video.creator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {video.creator?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              
              {/* Botón de Seguir */}
              {!isFollowing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(video.creator?.id);
                  }}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Icon name="Plus" size={16} color="white" />
                </button>
              )}
            </div>

            {/* Like */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
                ${isLiked ? 'text-red-500' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="ThumbsUp" 
                  size={26} 
                  className={isLiked ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-semibold text-xs text-white">
                {formatCount(video.likes || 0)}
              </span>
            </button>

            {/* Dislike */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDislike(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
                ${isDisliked ? 'text-gray-400' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="ThumbsDown" 
                  size={26} 
                  className={isDisliked ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-semibold text-xs text-white">
                {isDisliked ? 'Quitado' : ''}
              </span>
            </button>

            {/* Comentarios */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenComments(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="MessageCircle" size={26} />
              </div>
              <span className="font-semibold text-xs text-white">
                {formatCount(video.comments || 0)}
              </span>
            </button>

            {/* Guardar/Favorito */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
                ${isSaved ? 'text-yellow-400' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="Bookmark" 
                  size={26} 
                  className={isSaved ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-semibold text-xs text-white">
                {formatCount(video.saves || 0)}
              </span>
            </button>

            {/* Compartir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare(video);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="Share2" size={26} />
              </div>
              <span className="font-semibold text-xs text-white">
                Compartir
              </span>
            </button>

            {/* Volumen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMuteToggle(video.id);
              }}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon 
                  name={isMuted ? 'VolumeX' : 'Volume2'} 
                  size={26} 
                />
              </div>
            </button>

            {/* Icono de Audio/Música (decorativo) */}
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center mt-2"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                  <Icon name="Music" size={18} color="white" />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* INFORMACIÓN DEL VIDEO (Abajo Izquierda) */}
        <div className="absolute bottom-8 left-4 right-24 text-white">
          
          {/* Nombre del creador */}
          <div className="flex items-center space-x-2 mb-3">
            <Link 
              to={`/profile/${video.creator?.id}`}
              className="font-bold hover:underline text-base"
            >
              @{video.creator?.username || video.creator?.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}
            </Link>
            <span className="text-gray-300 text-sm">•</span>
            <span className="text-gray-300 text-sm">
              {video.timeAgo || 'Reciente'}
            </span>
          </div>

          {/* Descripción */}
          <div className="mb-3">
            <p className="text-sm leading-relaxed line-clamp-3">
              {video.description || video.title}
            </p>
          </div>

          {/* Hashtags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {video.tags.slice(0, 3).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="text-sm font-semibold text-white"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Información de Audio */}
          <div className="flex items-center space-x-2 text-sm">
            <Icon name="Music" size={14} color="white" />
            <span className="truncate">
              {video.audioTitle || `Sonido original - ${video.creator?.name || 'Creador'}`}
            </span>
          </div>
        </div>

        {/* INDICADOR DE PLAY/PAUSE (Centro) */}
        {!isAutoPlaying && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Icon name="Play" size={32} color="white" />
            </div>
          </div>
        )}

        {/* BARRA DE PROGRESO */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
          <div 
            className="h-full bg-red-500 transition-all"
            style={{ 
              width: isActive ? '100%' : '0%',
              transitionDuration: isActive ? `${video.duration || 30}s` : '0s',
              transitionTimingFunction: 'linear'
            }}
          />
        </div>
      </div>
    );
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  if (videos.length === 0) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Cargando reels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50 flex items-center justify-center">
      
      {/* CONTENEDOR PRINCIPAL CON REEL Y CONTROLES */}
      <div className="relative flex items-center justify-center h-full w-full">
        
        {/* CONTENEDOR DE REELS (CENTRADO) */}
        <div
          ref={containerRef}
          className={`flex flex-col h-full ease-out ${enableTransition ? 'transition-transform duration-500' : ''}`}
          style={{
            transform: `translateY(-${currentIndex * 100}vh)`,
            maxWidth: isDesktop ? '500px' : '100%',
            margin: '0'
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

        {/* CONTROLES LATERALES EXTERNOS (SOLO DESKTOP) - FUERA DEL REEL */}
        {isDesktop && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-6 z-50">
            
            {/* Avatar del Creador + Follow Button */}
            <div className="relative">
              <Link 
                to={`/profile/${videos[currentIndex]?.creator?.id}`}
                className="block"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform">
                  {videos[currentIndex]?.creator?.avatar ? (
                    <img 
                      src={videos[currentIndex].creator.avatar} 
                      alt={videos[currentIndex].creator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {videos[currentIndex]?.creator?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              
              {/* Botón de Seguir */}
              {!followedCreators.has(videos[currentIndex]?.creator?.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(videos[currentIndex]?.creator?.id);
                  }}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110"
                >
                  <Icon name="Plus" size={18} color="white" />
                </button>
              )}
            </div>

            {/* Like */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                ${likedVideos.has(videos[currentIndex]?.id)
                  ? 'bg-red-500 text-white scale-110' 
                  : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-red-50'
                }
              `}>
                <Icon 
                  name="ThumbsUp" 
                  size={28} 
                  className={likedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                {formatCount(videos[currentIndex]?.likes || 0)}
              </span>
            </button>

            {/* Dislike */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDislike(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                ${dislikedVideos.has(videos[currentIndex]?.id)
                  ? 'bg-gray-500 text-white scale-110' 
                  : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-gray-50'
                }
              `}>
                <Icon 
                  name="ThumbsDown" 
                  size={28} 
                  className={dislikedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-semibold text-xs text-gray-800">
                {dislikedVideos.has(videos[currentIndex]?.id) ? 'Quitado' : 'No me...'}
              </span>
            </button>

            {/* Comentarios */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenComments(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-blue-50">
                <Icon name="MessageCircle" size={28} />
              </div>
              <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                {formatCount(videos[currentIndex]?.comments || 0)}
              </span>
            </button>

            {/* Guardar/Favorito */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                ${savedVideos.has(videos[currentIndex]?.id)
                  ? 'bg-yellow-500 text-white scale-110' 
                  : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-yellow-50'
                }
              `}>
                <Icon 
                  name="Bookmark" 
                  size={28} 
                  className={savedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                {formatCount(videos[currentIndex]?.saves || 0)}
              </span>
            </button>

            {/* Compartir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare(videos[currentIndex]);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-green-50">
                <Icon name="Share2" size={28} />
              </div>
              <span className="font-semibold text-xs text-gray-800">
                Compartir
              </span>
            </button>

            {/* Volumen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMuteToggle(videos[currentIndex]?.id);
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-purple-50">
                <Icon 
                  name={mutedVideos.has(videos[currentIndex]?.id) ? 'VolumeX' : 'Volume2'} 
                  size={28} 
                />
              </div>
            </button>

            {/* Icono de Audio/Música (decorativo) */}
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center mt-2"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                  <Icon name="Music" size={20} color="white" />
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* FLECHAS DE NAVEGACIÓN (DESKTOP) - COMENTADAS/ELIMINADAS */}
      {/* Las flechas han sido eliminadas según requerimiento del usuario */}

      {/* MODAL DE COMENTARIOS CON RESPUESTAS */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl h-[75vh] md:h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-xl">
                Comentarios {comments[videos[currentIndex]?.id]?.length > 0 && 
                  `(${comments[videos[currentIndex]?.id]?.length})`}
              </h3>
              <button
                onClick={() => {
                  setShowCommentsModal(false);
                  setReplyingTo(null);
                  setNewComment('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon name="X" size={24} />
              </button>
            </div>

            {/* Lista de comentarios con scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments[videos[currentIndex]?.id]?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Icon name="MessageCircle" size={48} className="mb-2" />
                  <p className="text-lg">No hay comentarios aún</p>
                  <p className="text-sm">Sé el primero en comentar</p>
                </div>
              ) : (
                comments[videos[currentIndex]?.id]?.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    {/* Comentario Principal */}
                    <div className="flex space-x-3">
                      {/* Avatar */}
                      <Link 
                        to={`/profile/${comment.user?.id}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          {comment.user?.avatar ? (
                            <img 
                              src={comment.user.avatar} 
                              alt={comment.user.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                              {comment.user?.name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Contenido del comentario */}
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-2xl px-4 py-2">
                          <Link 
                            to={`/profile/${comment.user?.id}`}
                            className="font-semibold text-sm hover:underline"
                          >
                            {comment.user?.name}
                          </Link>
                          <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                        </div>
                        
                        {/* Acciones del comentario */}
                        <div className="flex items-center space-x-4 mt-1 px-2">
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString('es', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </span>
                          <button
                            onClick={() => handleReply(comment.id, comment.user?.name)}
                            className="text-xs font-semibold text-gray-600 hover:text-purple-600 transition-colors"
                          >
                            Responder
                          </button>
                          {comment.replies?.length > 0 && (
                            <button
                              onClick={() => toggleReplies(comment.id)}
                              className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors flex items-center space-x-1"
                            >
                              <Icon 
                                name={showReplies[comment.id] ? "ChevronUp" : "ChevronDown"} 
                                size={14} 
                              />
                              <span>
                                {showReplies[comment.id] ? 'Ocultar' : 'Ver'} {comment.replies.length} {comment.replies.length === 1 ? 'respuesta' : 'respuestas'}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Respuestas */}
                        {showReplies[comment.id] && comment.replies?.length > 0 && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex space-x-2">
                                {/* Avatar de respuesta */}
                                <Link 
                                  to={`/profile/${reply.user?.id}`}
                                  className="flex-shrink-0"
                                >
                                  <div className="w-8 h-8 rounded-full overflow-hidden">
                                    {reply.user?.avatar ? (
                                      <img 
                                        src={reply.user.avatar} 
                                        alt={reply.user.name} 
                                        className="w-full h-full object-cover" 
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                        {reply.user?.name?.charAt(0) || 'U'}
                                      </div>
                                    )}
                                  </div>
                                </Link>

                                {/* Contenido de la respuesta */}
                                <div className="flex-1">
                                  <div className="bg-gray-50 rounded-2xl px-3 py-2">
                                    <Link 
                                      to={`/profile/${reply.user?.id}`}
                                      className="font-semibold text-sm hover:underline"
                                    >
                                      {reply.user?.name}
                                    </Link>
                                    <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
                                  </div>
                                  <span className="text-xs text-gray-500 px-2 mt-1 inline-block">
                                    {new Date(reply.created_at).toLocaleDateString('es', { 
                                      day: 'numeric', 
                                      month: 'short' 
                                    })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input de comentario */}
            <div className="p-4 border-t bg-white">
              {/* Indicador de respuesta */}
              {replyingTo && (
                <div className="mb-2 px-3 py-2 bg-purple-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon name="CornerDownRight" size={16} className="text-purple-600" />
                    <span className="text-sm text-purple-700">
                      Respondiendo a comentario
                    </span>
                  </div>
                  <button
                    onClick={handleCancelReply}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <Icon name="X" size={18} />
                  </button>
                </div>
              )}

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyingTo ? "Escribe tu respuesta..." : "Agrega un comentario..."}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment(videos[currentIndex]?.id)}
                />
                <button
                  onClick={() => handleAddComment(videos[currentIndex]?.id)}
                  disabled={!newComment.trim()}
                  className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                >
                  <Icon name={replyingTo ? "CornerDownRight" : "Send"} size={18} />
                  <span>{replyingTo ? 'Responder' : 'Enviar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INDICADOR DE CARGA */}
      {loading && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="text-gray-800 flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Cargando más reels...</span>
          </div>
        </div>
      )}

      {/* INSTRUCCIONES INICIALES (Solo primer video) */}
      {currentIndex === 0 && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none animate-fade-out">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-6 py-3 text-center shadow-lg">
            <p className="text-gray-800 text-base mb-1 font-medium">
              {isDesktop ? '↑↓ Flechas o rueda del mouse para navegar' : 'Desliza ↑↓ para navegar'}
            </p>
            <p className="text-gray-600 text-sm">
              Toca el video para pausar • Espacio para reproducir/pausar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Añadir animación CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-out {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
  
  .animate-fade-out {
    animation: fade-out 5s ease-in-out forwards;
  }
  
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .animate-spin-slow {
    animation: spin-slow 3s linear infinite;
  }
`;
document.head.appendChild(style);

export default ReelsContainer;
