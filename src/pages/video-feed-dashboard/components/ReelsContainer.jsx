// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ✅ NUEVO DISEÑO: Estilo YouTube Shorts / TikTok para Desktop
// ✅ Videos verticales full height
// ✅ Controles laterales con avatar y follow button
// ✅ Navegación con flechas arriba/abajo

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null,
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [dislikedVideos, setDislikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followedCreators, setFollowedCreators] = useState(new Set());
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [enableTransition, setEnableTransition] = useState(false);
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

      // Pausar todos los otros videos
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
        }
      });

      // Configurar y reproducir video actual
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
      // Pausar todos los otros videos
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
        }
      });

      // Reproducir video actual
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

  const handleLike = (videoId) => {
    const newLikedVideos = new Set(likedVideos);
    const newDislikedVideos = new Set(dislikedVideos);
    
    if (newLikedVideos.has(videoId)) {
      newLikedVideos.delete(videoId);
    } else {
      newLikedVideos.add(videoId);
      newDislikedVideos.delete(videoId); // Remover dislike si existe
      onPointsEarned && onPointsEarned(5);
    }
    
    setLikedVideos(newLikedVideos);
    setDislikedVideos(newDislikedVideos);
  };

  const handleDislike = (videoId) => {
    const newDislikedVideos = new Set(dislikedVideos);
    const newLikedVideos = new Set(likedVideos);
    
    if (newDislikedVideos.has(videoId)) {
      newDislikedVideos.delete(videoId);
    } else {
      newDislikedVideos.add(videoId);
      newLikedVideos.delete(videoId); // Remover like si existe
    }
    
    setDislikedVideos(newDislikedVideos);
    setLikedVideos(newLikedVideos);
  };

  const handleSave = (videoId) => {
    const newSavedVideos = new Set(savedVideos);
    if (newSavedVideos.has(videoId)) {
      newSavedVideos.delete(videoId);
    } else {
      newSavedVideos.add(videoId);
      onPointsEarned && onPointsEarned(2);
    }
    setSavedVideos(newSavedVideos);
  };

  const handleFollow = (creatorId) => {
    const newFollowed = new Set(followedCreators);
    if (newFollowed.has(creatorId)) {
      newFollowed.delete(creatorId);
    } else {
      newFollowed.add(creatorId);
      onPointsEarned && onPointsEarned(10);
    }
    setFollowedCreators(newFollowed);
  };

  const handleShare = async (video) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Mira este reel de ${video.creator.name}`,
          url: `${window.location.origin}/reel/${video.id}`
        });
        onPointsEarned && onPointsEarned(3);
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/reel/${video.id}`);
        alert('Enlace copiado al portapapeles');
        onPointsEarned && onPointsEarned(3);
      } catch (error) {
        console.log('Error copying:', error);
      }
    }
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
        className={`
          relative flex-shrink-0 bg-black
          ${isDesktop ? 'h-screen' : 'h-screen'}
        `}
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
        />

        {/* CONTROLES SUPERIORES (Solo Desktop) */}
        {isDesktop && (
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
              >
                <Icon 
                  name={isAutoPlaying ? 'Pause' : 'Play'} 
                  size={20} 
                  className="text-gray-800"
                />
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                <Icon name="Settings" size={18} className="text-gray-800" />
              </button>
              
              <button className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                <Icon name="MoreVertical" size={18} className="text-gray-800" />
              </button>
            </div>
          </div>
        )}

        {/* CONTROLES LATERALES DERECHOS - Solo Mobile */}
        {!isDesktop && (
          <div className="absolute bottom-20 right-4 flex flex-col items-center space-y-5">
            
            {/* Avatar del Creador + Follow Button */}
            <div className="relative">
              <Link 
                to={`/profile/${video.creator?.id}`}
                className="block"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white">
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
                  onClick={() => handleFollow(video.creator?.id)}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Icon name="Plus" size={16} color="white" />
                </button>
              )}
            </div>

            {/* Like */}
            <button
              onClick={() => handleLike(video.id)}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                ${isLiked ? 'text-red-500' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="ThumbsUp" 
                  size={24} 
                  className={isLiked ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-semibold text-xs text-white">
                {formatCount(video.likes || 0)}
              </span>
            </button>

            {/* Dislike */}
            <button
              onClick={() => handleDislike(video.id)}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                ${isDisliked ? 'text-gray-400' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="ThumbsDown" 
                  size={24} 
                  className={isDisliked ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-semibold text-xs text-white">
                No me...
              </span>
            </button>

            {/* Comentarios */}
            <Link 
              to={`/reel/${video.id}`}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="MessageCircle" size={24} />
              </div>
              <span className="font-semibold text-xs text-white">
                {formatCount(video.comments || 0)}
              </span>
            </Link>

            {/* Guardar/Favorito */}
            <button
              onClick={() => handleSave(video.id)}
              className="flex flex-col items-center space-y-1"
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                ${isSaved ? 'text-yellow-400' : 'text-white hover:scale-110'}
              `}>
                <Icon 
                  name="Bookmark" 
                  size={24} 
                  className={isSaved ? 'fill-current' : ''} 
                />
              </div>
              <span className="font-semibold text-xs text-white">
                {formatCount(video.saves || 116500)}
              </span>
            </button>

            {/* Compartir */}
            <button
              onClick={() => handleShare(video)}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white">
                <Icon name="Share2" size={24} />
              </div>
              <span className="font-semibold text-xs text-white">
                Compartir
              </span>
            </button>

            {/* Icono de Audio/Música (decorativo) */}
            <button className="flex flex-col items-center mt-2">
              <div className="w-9 h-9 rounded-lg overflow-hidden border-2 border-white">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                  <Icon name="Music" size={18} color="white" />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* INFORMACIÓN DEL VIDEO (Abajo Izquierda) */}
        <div className={`
          absolute text-white
          ${isDesktop ? 'bottom-8 left-6 right-24 max-w-md' : 'bottom-8 left-4 right-24'}
        `}>
          
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
      
      {/* CONTENEDOR DE REELS */}
      <div
        ref={containerRef}
        className={`flex flex-col h-full ease-out ${enableTransition ? 'transition-transform duration-500' : ''}`}
        style={{
          transform: `translateY(-${currentIndex * 100}vh)`,
          maxWidth: isDesktop ? '500px' : '100%',
          margin: isDesktop ? '0 auto' : '0'
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

      {/* CONTROLES LATERALES EXTERNOS (Solo Desktop) */}
      {isDesktop && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-5 z-50">
          
          {/* Botón de Volumen */}
          <button
            onClick={() => handleMuteToggle(videos[currentIndex]?.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 text-gray-800 hover:scale-110 bg-white shadow-lg">
              <Icon 
                name={mutedVideos.has(videos[currentIndex]?.id) ? 'VolumeX' : 'Volume2'} 
                size={26}
                className="text-gray-800"
              />
            </div>
          </button>
          
          {/* Avatar del Creador + Follow Button */}
          <div className="relative">
            <Link 
              to={`/profile/${videos[currentIndex]?.creator?.id}`}
              className="block"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-300 shadow-lg">
                {videos[currentIndex]?.creator?.avatar ? (
                  <img 
                    src={videos[currentIndex].creator.avatar} 
                    alt={videos[currentIndex].creator.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {videos[currentIndex]?.creator?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </div>
            </Link>
            
            {/* Botón de Seguir */}
            {!followedCreators.has(videos[currentIndex]?.creator?.id) && (
              <button
                onClick={() => handleFollow(videos[currentIndex]?.creator?.id)}
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
              >
                <Icon name="Plus" size={16} color="white" />
              </button>
            )}
          </div>

          {/* Like */}
          <button
            onClick={() => handleLike(videos[currentIndex]?.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 bg-white shadow-lg
              ${likedVideos.has(videos[currentIndex]?.id)
                ? 'text-red-500' 
                : 'text-gray-800 hover:scale-110'
              }
            `}>
              <Icon 
                name="ThumbsUp" 
                size={26} 
                className={likedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
              />
            </div>
            <span className="font-semibold text-xs text-gray-800">
              {formatCount(videos[currentIndex]?.likes || 0)}
            </span>
          </button>

          {/* Dislike */}
          <button
            onClick={() => handleDislike(videos[currentIndex]?.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 bg-white shadow-lg
              ${dislikedVideos.has(videos[currentIndex]?.id)
                ? 'text-gray-400' 
                : 'text-gray-800 hover:scale-110'
              }
            `}>
              <Icon 
                name="ThumbsDown" 
                size={26} 
                className={dislikedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
              />
            </div>
            <span className="font-semibold text-xs text-gray-800">
              No me...
            </span>
          </button>

          {/* Comentarios */}
          <Link 
            to={`/reel/${videos[currentIndex]?.id}`}
            className="flex flex-col items-center space-y-1"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800">
              <Icon name="MessageCircle" size={26} />
            </div>
            <span className="font-semibold text-xs text-gray-800">
              {formatCount(videos[currentIndex]?.comments || 0)}
            </span>
          </Link>

          {/* Guardar/Favorito */}
          <button
            onClick={() => handleSave(videos[currentIndex]?.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 bg-white shadow-lg
              ${savedVideos.has(videos[currentIndex]?.id)
                ? 'text-yellow-500' 
                : 'text-gray-800 hover:scale-110'
              }
            `}>
              <Icon 
                name="Bookmark" 
                size={26} 
                className={savedVideos.has(videos[currentIndex]?.id) ? 'fill-current' : ''} 
              />
            </div>
            <span className="font-semibold text-xs text-gray-800">
              {formatCount(videos[currentIndex]?.saves || 116500)}
            </span>
          </button>

          {/* Compartir */}
          <button
            onClick={() => handleShare(videos[currentIndex])}
            className="flex flex-col items-center space-y-1"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800">
              <Icon name="Share2" size={26} />
            </div>
            <span className="font-semibold text-xs text-gray-800">
              Compartir
            </span>
          </button>

          {/* Icono de Audio/Música (decorativo) */}
          <button className="flex flex-col items-center mt-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg">
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                <Icon name="Music" size={18} color="white" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* FLECHAS DE NAVEGACIÓN (DESKTOP) */}
      {isDesktop && (
        <>
          {/* Flecha Arriba */}
          <button
            onClick={navigatePrevious}
            disabled={currentIndex === 0}
            className={`
              fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[260px]
              w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full 
              flex items-center justify-center transition-all duration-200 z-50 shadow-lg
              hover:bg-white hover:scale-110 active:scale-95
              ${currentIndex === 0 ? 'opacity-0 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}
            `}
          >
            <Icon name="ChevronUp" size={28} className="text-gray-800" />
          </button>

          {/* Flecha Abajo */}
          <button
            onClick={navigateNext}
            disabled={currentIndex === videos.length - 1}
            className={`
              fixed bottom-1/2 left-1/2 transform -translate-x-1/2 translate-y-[260px]
              w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full 
              flex items-center justify-center transition-all duration-200 z-50 shadow-lg
              hover:bg-white hover:scale-110 active:scale-95
              ${currentIndex === videos.length - 1 ? 'opacity-0 cursor-not-allowed' : 'opacity-70 hover:opacity-100'}
            `}
          >
            <Icon name="ChevronDown" size={28} className="text-gray-800" />
          </button>
        </>
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

// Añadir animación CSS para las instrucciones
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
