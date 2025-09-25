// src/pages/video-feed-dashboard/components/ReelsPlayerMobile.jsx
// Player fullscreen individual para MÓVIL - Navegación aislada sin conflictos

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ReelsPlayerMobile = ({ 
  videos = [], 
  initialIndex = 0,
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const gestureRef = useRef({
    startY: 0,
    startTime: 0,
    isDragging: false,
    lastMoveY: 0,
    velocity: 0
  });

  // ===============================
  // BODY SCROLL LOCK AL MONTAR
  // ===============================
  useEffect(() => {
    // Lock body scroll cuando entra al player
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      // Restore body scroll al salir
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  // ===============================
  // AUTOPLAY Y GESTIÓN DE VIDEOS
  // ===============================
  useEffect(() => {
    if (videos.length === 0 || isTransitioning) return;

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
      const videoId = videos[currentIndex]?.id;
      currentVideo.muted = mutedVideos.has(videoId);
      currentVideo.play().catch(err => {
        console.log('Error autoplay:', err);
      });
    }
  }, [currentIndex, videos, isAutoPlaying, mutedVideos, isTransitioning]);

  // Precargar videos adyacentes
  useEffect(() => {
    if (videos.length === 0) return;

    // Precargar video siguiente y anterior
    [-1, 1].forEach(offset => {
      const index = currentIndex + offset;
      if (index >= 0 && index < videos.length) {
        const video = videoRefs.current[index];
        if (video && video.readyState < 2) {
          video.load();
        }
      }
    });

    // Cargar más videos si estamos cerca del final
    if (currentIndex >= videos.length - 2 && hasMore && !loading) {
      onLoadMore && onLoadMore();
    }
  }, [currentIndex, videos.length, hasMore, loading, onLoadMore]);

  // ===============================
  // TOUCH GESTURES CON ISOLATION
  // ===============================
  const handleTouchStart = useCallback((e) => {
    e.stopPropagation();
    
    const touch = e.touches[0];
    gestureRef.current = {
      startY: touch.clientY,
      startTime: Date.now(),
      isDragging: true,
      lastMoveY: touch.clientY,
      velocity: 0
    };

    // Prevenir cualquier scroll del contenedor padre
    if (containerRef.current) {
      containerRef.current.style.touchAction = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!gestureRef.current.isDragging) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - gestureRef.current.startY;
    const timeDelta = Date.now() - gestureRef.current.startTime;
    
    // Calcular velocidad
    gestureRef.current.velocity = (currentY - gestureRef.current.lastMoveY) / timeDelta;
    gestureRef.current.lastMoveY = currentY;

    // Visual feedback solo si el gesto es significativo
    if (Math.abs(deltaY) > 20) {
      const container = containerRef.current;
      if (container) {
        const progress = Math.min(Math.abs(deltaY) / 100, 1);
        const translateY = deltaY * 0.3; // Damping effect
        
        container.style.transform = `translateY(${translateY}px)`;
        container.style.opacity = `${1 - progress * 0.3}`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    e.stopPropagation();
    
    if (!gestureRef.current.isDragging) return;
    
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - gestureRef.current.startY;
    const timeDelta = Date.now() - gestureRef.current.startTime;
    const velocity = Math.abs(gestureRef.current.velocity);
    
    gestureRef.current.isDragging = false;

    // Restaurar estilos
    const container = containerRef.current;
    if (container) {
      container.style.transform = '';
      container.style.opacity = '';
      container.style.touchAction = '';
    }

    // Determinar acción basada en gesto
    const threshold = 80;
    const velocityThreshold = 0.5;
    
    if (Math.abs(deltaY) > threshold || velocity > velocityThreshold) {
      setIsTransitioning(true);
      
      if (deltaY < -threshold || (deltaY < 0 && velocity > velocityThreshold)) {
        // Swipe up - siguiente video
        navigateNext();
      } else if (deltaY > threshold || (deltaY > 0 && velocity > velocityThreshold)) {
        // Swipe down - anterior video o salir
        if (currentIndex === 0) {
          // Si es el primer video, salir del player
          handleExit();
        } else {
          navigatePrevious();
        }
      }
      
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex]);

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

  const handleExit = useCallback(() => {
    // Navegar de vuelta al feed con historia
    if (location.state?.fromFeed) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }, [navigate, location.state]);

  // ===============================
  // HANDLERS DE INTERACCIÓN
  // ===============================
  const handlePlayPause = useCallback((e) => {
    e?.stopPropagation();
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    if (currentVideo.paused) {
      currentVideo.play();
      setIsAutoPlaying(true);
    } else {
      currentVideo.pause();
      setIsAutoPlaying(false);
    }
  }, [currentIndex]);

  const handleMuteToggle = useCallback((videoId, e) => {
    e?.stopPropagation();
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
  }, [mutedVideos, currentIndex]);

  const handleLike = useCallback((videoId, e) => {
    e?.stopPropagation();
    const newLikedVideos = new Set(likedVideos);
    if (newLikedVideos.has(videoId)) {
      newLikedVideos.delete(videoId);
    } else {
      newLikedVideos.add(videoId);
      onPointsEarned && onPointsEarned(5);
    }
    setLikedVideos(newLikedVideos);
  }, [likedVideos, onPointsEarned]);

  const handleSave = useCallback((videoId, e) => {
    e?.stopPropagation();
    const newSavedVideos = new Set(savedVideos);
    if (newSavedVideos.has(videoId)) {
      newSavedVideos.delete(videoId);
    } else {
      newSavedVideos.add(videoId);
      onPointsEarned && onPointsEarned(2);
    }
    setSavedVideos(newSavedVideos);
  }, [savedVideos, onPointsEarned]);

  const handleShare = useCallback(async (video, e) => {
    e?.stopPropagation();
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
      navigator.clipboard?.writeText(`${window.location.origin}/reel/${video.id}`);
      onPointsEarned && onPointsEarned(3);
    }
  }, [onPointsEarned]);

  const handleFollow = useCallback((creatorId, e) => {
    e?.stopPropagation();
    console.log('Following creator:', creatorId);
    onPointsEarned && onPointsEarned(10);
  }, [onPointsEarned]);

  // ===============================
  // KEYBOARD NAVIGATION
  // ===============================
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigatePrevious();
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateNext();
          break;
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'Escape':
          e.preventDefault();
          handleExit();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrevious, handlePlayPause, handleExit]);

  // ===============================
  // FORMATEO DE NÚMEROS
  // ===============================
  const formatCount = useCallback((count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  // ===============================
  // EMPTY STATE
  // ===============================
  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="Smartphone" size={32} color="var(--color-primary)" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            Video no encontrado
          </h3>
          <p className="text-gray-300 mb-6 max-w-sm">
            Este reel podría haber sido eliminado o no estar disponible
          </p>
          <Button onClick={handleExit} variant="outline">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  if (!currentVideo) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  const isLiked = likedVideos.has(currentVideo.id);
  const isSaved = savedVideos.has(currentVideo.id);
  const isMuted = mutedVideos.has(currentVideo.id);

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      
      {/* CONTAINER PRINCIPAL */}
      <div
        ref={containerRef}
        className="relative w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          // Prevenir zoom y selection en iOS
          touchAction: 'pan-y pinch-zoom',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      >
        
        {/* VIDEO PLAYER */}
        <video
          ref={ref => {
            if (ref) videoRefs.current[currentIndex] = ref;
          }}
          src={currentVideo.videoUrl}
          className="w-full h-full object-cover"
          loop
          playsInline
          preload="auto"
          muted={isMuted}
          onClick={handlePlayPause}
        />

        {/* OVERLAY GRADIENTE */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

        {/* HEADER */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-12">
          <div className="flex items-center justify-between">
            <button
              onClick={handleExit}
              className="w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <Icon name="ArrowLeft" size={20} color="white" />
            </button>
            
            <div className="text-white text-center">
              <div className="text-sm opacity-80">
                {currentIndex + 1} / {videos.length}
              </div>
            </div>

            <button
              onClick={(e) => handleShare(currentVideo, e)}
              className="w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <Icon name="MoreVertical" size={20} color="white" />
            </button>
          </div>
        </div>

        {/* CONTROLES LATERALES */}
        <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-6">
          
          {/* Avatar del creador */}
          <div className="relative">
            <Link 
              to={`/profile/${currentVideo.creator.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block"
            >
              <img
                src={currentVideo.creator.avatar}
                alt={currentVideo.creator.name}
                className="w-14 h-14 rounded-full border-3 border-white object-cover"
              />
            </Link>
            <button
              onClick={(e) => handleFollow(currentVideo.creator.id, e)}
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-base hover:bg-red-600 transition-colors"
            >
              +
            </button>
          </div>

          {/* Like */}
          <button
            onClick={(e) => handleLike(currentVideo.id, e)}
            className="flex flex-col items-center space-y-2 group"
          >
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm
              ${isLiked 
                ? 'bg-red-500/30 text-red-400' 
                : 'bg-black/40 text-white hover:bg-white/20'
              }
            `}>
              <Icon 
                name="Heart" 
                size={26} 
                className={isLiked ? 'fill-current' : ''} 
              />
            </div>
            <span className="text-white text-sm font-medium">
              {formatCount(currentVideo.likes + (isLiked ? 1 : 0))}
            </span>
          </button>

          {/* Comentarios */}
          <button 
            className="flex flex-col items-center space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <Icon name="MessageCircle" size={26} color="white" />
            </div>
            <span className="text-white text-sm font-medium">
              {formatCount(currentVideo.comments)}
            </span>
          </button>

          {/* Guardar */}
          <button
            onClick={(e) => handleSave(currentVideo.id, e)}
            className="flex flex-col items-center space-y-2"
          >
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm
              ${isSaved 
                ? 'bg-yellow-500/30 text-yellow-400' 
                : 'bg-black/40 text-white hover:bg-white/20'
              }
            `}>
              <Icon 
                name="Bookmark" 
                size={24} 
                className={isSaved ? 'fill-current' : ''} 
              />
            </div>
          </button>

          {/* Compartir */}
          <button
            onClick={(e) => handleShare(currentVideo, e)}
            className="flex flex-col items-center space-y-2"
          >
            <div className="w-14 h-14 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <Icon name="Share" size={24} color="white" />
            </div>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={(e) => handleMuteToggle(currentVideo.id, e)}
            className="flex flex-col items-center space-y-2"
          >
            <div className="w-14 h-14 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <Icon 
                name={isMuted ? 'VolumeX' : 'Volume2'} 
                size={24} 
                color="white" 
              />
            </div>
          </button>
        </div>

        {/* INFORMACIÓN DEL VIDEO */}
        <div className="absolute bottom-8 left-4 right-24 text-white">
          
          {/* Información del creador */}
          <div className="flex items-center space-x-3 mb-3">
            <Link 
              to={`/profile/${currentVideo.creator.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-lg hover:underline"
            >
              {currentVideo.creator.name}
            </Link>
            <span className="text-gray-300">•</span>
            <span className="text-gray-300">{currentVideo.timeAgo}</span>
          </div>

          {/* Título y descripción */}
          <div className="mb-4">
            <h3 className="font-medium text-xl mb-2 line-clamp-2">
              {currentVideo.title}
            </h3>
            <p className="text-gray-200 text-base line-clamp-3 opacity-90">
              {currentVideo.description}
            </p>
          </div>

          {/* Tags */}
          {currentVideo.tags && currentVideo.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentVideo.tags.slice(0, 3).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="text-cyan-400 text-base font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* INDICADOR DE PLAY/PAUSE */}
        {!isAutoPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Icon name="Play" size={32} color="white" className="ml-1" />
            </div>
          </div>
        )}

        {/* INDICADORES DE NAVEGACIÓN */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`
                w-1 rounded-full transition-all duration-200
                ${index === currentIndex 
                  ? 'bg-white h-8' 
                  : 'bg-white/40 hover:bg-white/60 h-6'
                }
              `}
            />
          ))}
        </div>

        {/* PROGRESO DEL VIDEO */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-white transition-all duration-1000"
            style={{ 
              width: isAutoPlaying ? '100%' : '0%',
              transitionDuration: isAutoPlaying ? `${currentVideo.duration || 30}s` : '0s'
            }}
          />
        </div>

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="absolute top-20 right-4 text-white flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Cargando...</span>
          </div>
        )}

        {/* INSTRUCCIONES DE NAVEGACIÓN */}
        {currentIndex === 0 && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3">
              <p className="text-sm font-medium mb-1">Desliza ↑↓ para navegar</p>
              <p className="text-xs opacity-75">Desliza ↓ desde el inicio para salir</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReelsPlayerMobile;
