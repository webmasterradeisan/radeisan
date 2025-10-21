// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// Feed vertical tipo TikTok/Instagram para videos verticales (9:16)
// ✅ ACTUALIZADO: Soporte para initialIndex para comenzar en reel específico

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ReelsContainer = ({ 
  videos = [], 
  initialIndex = 0, // ✅ NUEVO PARÁMETRO: Índice inicial del reel
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex); // ✅ USAR initialIndex
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const containerRef = useRef(null);
  const videoRefs = useRef([]);

  console.log('🎬 ReelsContainer renderizado:', {
    videosCount: videos.length,
    currentIndex,
    initialIndex,
    isAutoPlaying
  });

  // ===============================
  // ✅ SINCRONIZAR CON initialIndex CUANDO CAMBIA
  // ===============================
  useEffect(() => {
    console.log('🎯 ReelsContainer: Actualizando currentIndex a', initialIndex);
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // ===============================
  // AUTOPLAY Y GESTIÓN DE VIDEOS
  // ===============================

  // Configurar autoplay cuando cambia el índice actual
  useEffect(() => {
    if (videos.length === 0) return;

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
      currentVideo.play().catch(err => {
        console.log('Error autoplay:', err);
      });
    }
  }, [currentIndex, videos, isAutoPlaying, mutedVideos]);

  // Precargar videos adyacentes
  useEffect(() => {
    if (videos.length === 0) return;

    // Precargar video siguiente
    if (currentIndex < videos.length - 1) {
      const nextVideo = videoRefs.current[currentIndex + 1];
      if (nextVideo && nextVideo.readyState < 2) {
        nextVideo.load();
      }
    }

    // Cargar más videos si estamos cerca del final
    if (currentIndex >= videos.length - 3 && hasMore && !loading) {
      onLoadMore && onLoadMore();
    }
  }, [currentIndex, videos.length, hasMore, loading, onLoadMore]);

  // ===============================
  // NAVEGACIÓN POR SCROLL/TOUCH
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
    
    // Visual feedback durante el drag
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

    // Navegar si el swipe es suficientemente grande
    if (Math.abs(diff) > 100) {
      if (diff > 0 && currentIndex < videos.length - 1) {
        // Swipe up - próximo video
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe down - video anterior  
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
    if (newLikedVideos.has(videoId)) {
      newLikedVideos.delete(videoId);
    } else {
      newLikedVideos.add(videoId);
      onPointsEarned && onPointsEarned({ points: 5 });
    }
    setLikedVideos(newLikedVideos);
  };

  const handleSave = (videoId) => {
    const newSavedVideos = new Set(savedVideos);
    if (newSavedVideos.has(videoId)) {
      newSavedVideos.delete(videoId);
    } else {
      newSavedVideos.add(videoId);
      onPointsEarned && onPointsEarned({ points: 2 });
    }
    setSavedVideos(newSavedVideos);
  };

  const handleShare = async (video) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Mira este reel de ${video.creator.name}`,
          url: `${window.location.origin}/reel/${video.id}`
        });
        onPointsEarned && onPointsEarned({ points: 3 });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copiar al clipboard
      navigator.clipboard?.writeText(`${window.location.origin}/reel/${video.id}`);
      onPointsEarned && onPointsEarned({ points: 3 });
    }
  };

  const handleFollow = (creatorId) => {
    console.log('Following creator:', creatorId);
    onPointsEarned && onPointsEarned({ points: 10 });
  };

  // ===============================
  // FORMATEO DE NÚMEROS
  // ===============================

  const formatCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // ===============================
  // EMPTY STATE
  // ===============================

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="Smartphone" size={32} color="var(--color-primary)" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3">
            No hay reels disponibles
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Sé el primero en crear videos verticales para la comunidad
          </p>
          <Button onClick={() => window.location.href = '/upload'}>
            <Icon name="Plus" size={16} className="mr-2" />
            Crear Reel
          </Button>
        </div>
      </div>
    );
  }

  // ===============================
  // COMPONENTE REEL INDIVIDUAL
  // ===============================

  const ReelItem = ({ video, index, isActive }) => {
    const isLiked = likedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isMuted = mutedVideos.has(video.id);

    return (
      <div className={`
        relative w-full h-screen flex-shrink-0 bg-black
        ${isActive ? 'z-10' : 'z-0'}
      `}>
        {/* VIDEO PLAYER */}
        <video
          ref={ref => {
            if (ref) videoRefs.current[index] = ref;
          }}
          src={video.videoUrl || video.video_url}
          className="w-full h-full object-cover"
          loop
          playsInline
          preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'metadata'}
          onClick={handlePlayPause}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* CONTROLES LATERALES (Derecha) */}
        <div className="absolute right-4 bottom-32 flex flex-col space-y-6 z-20">
          
          {/* Avatar + Seguir */}
          <div className="relative">
            <Link to={`/profile/${video.creator.id}`}>
              <img
                src={video.creator.avatar}
                alt={video.creator.name}
                className="w-12 h-12 rounded-full border-2 border-white"
              />
            </Link>
            <button
              onClick={() => handleFollow(video.creator.id)}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-black"
            >
              <Icon name="Plus" size={14} color="white" />
            </button>
          </div>

          {/* Like */}
          <button
            onClick={() => handleLike(video.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${isLiked ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm'}
            `}>
              <Icon 
                name={isLiked ? 'Heart' : 'Heart'} 
                size={24} 
                color={isLiked ? 'white' : 'white'}
                fill={isLiked ? 'white' : 'none'}
              />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(video.likes + (isLiked ? 1 : 0))}
            </span>
          </button>

          {/* Comments */}
          <button
            onClick={() => console.log('Open comments')}
            className="flex flex-col items-center space-y-1"
          >
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Icon name="MessageCircle" size={24} color="white" />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(video.comments)}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={() => handleSave(video.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${isSaved ? 'bg-yellow-500' : 'bg-white/20 backdrop-blur-sm'}
            `}>
              <Icon 
                name="Bookmark" 
                size={24} 
                color="white"
                fill={isSaved ? 'white' : 'none'}
              />
            </div>
            <span className="text-white text-xs font-medium">
              {isSaved ? 'Guardado' : 'Guardar'}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={() => handleShare(video)}
            className="flex flex-col items-center space-y-1"
          >
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Icon name="Share2" size={24} color="white" />
            </div>
            <span className="text-white text-xs font-medium">
              Compartir
            </span>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={() => handleMuteToggle(video.id)}
            className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <Icon 
              name={isMuted ? 'VolumeX' : 'Volume2'} 
              size={24} 
              color="white" 
            />
          </button>
        </div>

        {/* INFORMACIÓN DEL VIDEO (Abajo Izquierda) */}
        <div className="absolute bottom-8 left-4 right-20 text-white z-20">
          
          {/* Información del creador */}
          <div className="flex items-center space-x-3 mb-3">
            <Link 
              to={`/profile/${video.creator.id}`}
              className="font-semibold hover:underline"
            >
              @{video.creator.username || video.creator.name}
            </Link>
            <span className="text-gray-300">•</span>
            <span className="text-gray-300 text-sm">{video.timeAgo || 'Hace poco'}</span>
          </div>

          {/* Título y descripción */}
          <div className="mb-3">
            <h3 className="font-medium text-lg mb-1 line-clamp-2">
              {video.title}
            </h3>
            {video.description && (
              <p className="text-gray-200 text-sm line-clamp-2 opacity-90">
                {video.description}
              </p>
            )}
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.tags.slice(0, 3).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="text-cyan-400 text-sm font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* INDICADOR DE PLAY/PAUSE */}
        {!isAutoPlaying && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
              <Icon name="Play" size={24} color="white" />
            </div>
          </div>
        )}

        {/* PROGRESO DEL VIDEO */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div 
            className="h-full bg-white transition-all duration-1000"
            style={{ 
              width: isActive ? '100%' : '0%',
              transitionDuration: isActive ? `${video.duration}s` : '0s'
            }}
          />
        </div>
      </div>
    );
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      
      {/* CONTENEDOR DE REELS */}
      <div
        ref={containerRef}
        className="flex flex-col h-full transition-transform duration-300"
        style={{
          transform: `translateY(-${currentIndex * 100}vh)`
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

      {/* INDICADORES DE NAVEGACIÓN */}
      <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex flex-col space-y-2 z-30">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`
              w-1 h-6 rounded-full transition-all duration-200
              ${index === currentIndex 
                ? 'bg-white' 
                : 'bg-white/40 hover:bg-white/60'
              }
            `}
          />
        ))}
      </div>

      {/* INDICADORES DE ESTADO */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
        <div className="text-white text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {videos.length}
        </div>
        
        {loading && (
          <div className="text-white text-sm flex items-center space-x-2 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando más...</span>
          </div>
        )}
      </div>

      {/* INSTRUCCIONES DE USO (Solo primera vez) */}
      {currentIndex === 0 && initialIndex === 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-none z-30">
          <div className="bg-black/50 rounded-lg px-4 py-2 backdrop-blur-sm">
            <p className="text-sm">Desliza ↑↓ para navegar</p>
            <p className="text-xs opacity-75">Toca para pausar</p>
          </div>
        </div>
      )}

      {/* 🐛 DEBUG INFO - Solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-xs z-50 border border-white/20">
          <div className="text-green-400 font-bold mb-1">✅ DEBUG ReelsContainer</div>
          <div>📹 videos: {videos.length}</div>
          <div>🎯 currentIndex: {currentIndex}</div>
          <div>🎬 initialIndex: {initialIndex}</div>
          <div>▶️ isAutoPlaying: {isAutoPlaying.toString()}</div>
          <div>🔇 muted: {mutedVideos.size}</div>
          <div>❤️ liked: {likedVideos.size}</div>
          <div>📌 saved: {savedVideos.size}</div>
          <div>🔄 loading: {loading.toString()}</div>
          <div>⚡ hasMore: {hasMore.toString()}</div>
        </div>
      )}
    </div>
  );
};

export default ReelsContainer;
