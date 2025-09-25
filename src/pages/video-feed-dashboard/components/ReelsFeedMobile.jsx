// src/pages/video-feed-dashboard/components/ReelsFeedMobile.jsx
// Feed vertical scrollable para MÓVIL - Estilo YouTube/TikTok mobile

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ReelsFeedMobile = ({ 
  videos = [], 
  onLoadMore, 
  onPointsEarned,
  onLike,
  onSave,
  onShare,
  hasMore = true,
  loading = false 
}) => {
  const [visibleVideoId, setVisibleVideoId] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const observerRef = useRef(null);

  // ===============================
  // INTERSECTION OBSERVER PARA AUTOPLAY
  // ===============================
  useEffect(() => {
    if (!containerRef.current) return;

    // Configurar intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoId = entry.target.dataset.videoId;
          const video = videoRefs.current[videoId];
          
          if (!video) return;

          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            // Video visible > 70% - reproducir
            setVisibleVideoId(videoId);
            video.muted = mutedVideos.has(videoId);
            video.play().catch(err => console.log('Autoplay error:', err));
          } else {
            // Video no visible - pausar
            video.pause();
            if (visibleVideoId === videoId) {
              setVisibleVideoId(null);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0, 0.7, 1.0]
      }
    );

    // Observar todos los videos
    const videoElements = containerRef.current.querySelectorAll('[data-video-id]');
    videoElements.forEach(el => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [videos, mutedVideos, visibleVideoId]);

  // ===============================
  // SCROLL INFINITO
  // ===============================
  const handleScroll = useCallback(() => {
    if (!containerRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = scrollHeight - clientHeight - 800;

    if (scrollTop > threshold) {
      onLoadMore && onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ===============================
  // HANDLERS DE INTERACCIÓN
  // ===============================
  const handleVideoTap = (video) => {
    // Navegar a player fullscreen individual
    navigate(`/reel/${video.id}`, { 
      state: { 
        videos,
        currentIndex: videos.findIndex(v => v.id === video.id)
      }
    });
  };

  const handleLikeClick = (e, videoId) => {
    e.stopPropagation();
    const newLikedVideos = new Set(likedVideos);
    const isLiked = newLikedVideos.has(videoId);
    
    if (isLiked) {
      newLikedVideos.delete(videoId);
    } else {
      newLikedVideos.add(videoId);
      onPointsEarned && onPointsEarned(5);
    }
    
    setLikedVideos(newLikedVideos);
    onLike && onLike(videoId, !isLiked);
  };

  const handleSaveClick = (e, videoId) => {
    e.stopPropagation();
    const newSavedVideos = new Set(savedVideos);
    const isSaved = newSavedVideos.has(videoId);
    
    if (isSaved) {
      newSavedVideos.delete(videoId);
    } else {
      newSavedVideos.add(videoId);
      onPointsEarned && onPointsEarned(2);
    }
    
    setSavedVideos(newSavedVideos);
    onSave && onSave(videoId, !isSaved);
  };

  const handleShareClick = async (e, video) => {
    e.stopPropagation();
    onShare && onShare(video);
    onPointsEarned && onPointsEarned(3);
  };

  const handleMuteToggle = (e, videoId) => {
    e.stopPropagation();
    const newMutedVideos = new Set(mutedVideos);
    
    if (newMutedVideos.has(videoId)) {
      newMutedVideos.delete(videoId);
    } else {
      newMutedVideos.add(videoId);
    }
    
    setMutedVideos(newMutedVideos);
    
    // Aplicar mute/unmute al video actual
    const video = videoRefs.current[videoId];
    if (video) {
      video.muted = newMutedVideos.has(videoId);
    }
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
  if (videos.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="Smartphone" size={32} color="var(--color-primary)" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3">
            No hay reels disponibles
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Sé el primero en crear contenido vertical para la comunidad
          </p>
          <Button onClick={() => navigate('/upload')}>
            <Icon name="Plus" size={16} className="mr-2" />
            Crear Reel
          </Button>
        </div>
      </div>
    );
  }

  // ===============================
  // COMPONENTE REEL CARD
  // ===============================
  const ReelCard = ({ video }) => {
    const isLiked = likedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isMuted = mutedVideos.has(video.id);
    const isPlaying = visibleVideoId === video.id;

    return (
      <div 
        className="relative w-full flex-shrink-0 bg-black rounded-lg overflow-hidden cursor-pointer mb-4"
        style={{ height: '75vh' }}
        data-video-id={video.id}
        onClick={() => handleVideoTap(video)}
      >
        {/* VIDEO PLAYER */}
        <video
          ref={ref => {
            if (ref) videoRefs.current[video.id] = ref;
          }}
          src={video.videoUrl}
          className="w-full h-full object-cover"
          loop
          playsInline
          muted={isMuted}
          preload="metadata"
        />

        {/* OVERLAY GRADIENTE */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

        {/* PLAY OVERLAY CUANDO NO ESTÁ REPRODUCIÉNDOSE */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Icon name="Play" size={24} color="white" className="ml-1" />
            </div>
          </div>
        )}

        {/* CONTROLES LATERALES */}
        <div className="absolute right-3 bottom-16 flex flex-col items-center space-y-4">
          
          {/* Avatar del creador */}
          <div className="relative">
            <Link 
              to={`/profile/${video.creator.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block"
            >
              <img
                src={video.creator.avatar}
                alt={video.creator.name}
                className="w-12 h-12 rounded-full border-2 border-white object-cover"
              />
            </Link>
          </div>

          {/* Like */}
          <button
            onClick={(e) => handleLikeClick(e, video.id)}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
              ${isLiked 
                ? 'bg-red-500/20 text-red-500' 
                : 'bg-black/40 text-white hover:bg-white/20'
              }
            `}>
              <Icon 
                name="Heart" 
                size={22} 
                className={isLiked ? 'fill-current' : ''} 
              />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(video.likes + (isLiked ? 1 : 0))}
            </span>
          </button>

          {/* Comentarios */}
          <button 
            className="flex flex-col items-center space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <Icon name="MessageCircle" size={22} color="white" />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(video.comments)}
            </span>
          </button>

          {/* Guardar */}
          <button
            onClick={(e) => handleSaveClick(e, video.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
              ${isSaved 
                ? 'bg-yellow-500/20 text-yellow-500' 
                : 'bg-black/40 text-white hover:bg-white/20'
              }
            `}>
              <Icon 
                name="Bookmark" 
                size={20} 
                className={isSaved ? 'fill-current' : ''} 
              />
            </div>
          </button>

          {/* Compartir */}
          <button
            onClick={(e) => handleShareClick(e, video)}
            className="flex flex-col items-center space-y-1"
          >
            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <Icon name="Share" size={20} color="white" />
            </div>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={(e) => handleMuteToggle(e, video.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <Icon 
                name={isMuted ? 'VolumeX' : 'Volume2'} 
                size={20} 
                color="white" 
              />
            </div>
          </button>
        </div>

        {/* INFORMACIÓN DEL VIDEO */}
        <div className="absolute bottom-4 left-4 right-20 text-white">
          
          {/* Información del creador */}
          <div className="flex items-center space-x-2 mb-2">
            <Link 
              to={`/profile/${video.creator.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-base hover:underline"
            >
              {video.creator.name}
            </Link>
            <span className="text-gray-300 text-sm">•</span>
            <span className="text-gray-300 text-sm">{video.timeAgo}</span>
          </div>

          {/* Título */}
          <h3 className="font-medium text-base mb-1 line-clamp-2">
            {video.title}
          </h3>

          {/* Descripción corta */}
          <p className="text-gray-200 text-sm line-clamp-1 opacity-90 mb-2">
            {video.description}
          </p>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.tags.slice(0, 2).map((tag, tagIndex) => (
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

        {/* INDICADOR DE PROGRESO (solo cuando está reproduciéndose) */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-white transition-all duration-1000"
              style={{ 
                width: '100%',
                transitionDuration: `${video.duration || 30}s`
              }}
            />
          </div>
        )}

        {/* TEXTO DE AYUDA EN PRIMER VIDEO */}
        {video.id === videos[0]?.id && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-sm font-medium">Toca para ver en pantalla completa</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-auto bg-background"
      style={{
        // Optimización de scroll para móvil
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {/* HEADER STICKY */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Reels</h1>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/upload')}
            >
              <Icon name="Plus" size={16} className="mr-1" />
              Crear
            </Button>
          </div>
        </div>
      </div>

      {/* LISTA DE REELS */}
      <div className="px-4 py-2">
        {videos.map((video) => (
          <ReelCard key={video.id} video={video} />
        ))}

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Cargando más reels...</span>
            </div>
          </div>
        )}

        {/* END OF FEED */}
        {!hasMore && videos.length > 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon name="Check" size={20} color="var(--color-success)" />
            </div>
            <p className="text-muted-foreground text-sm">
              ¡Has visto todos los reels disponibles!
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Vuelve más tarde para ver contenido nuevo
            </p>
          </div>
        )}

        {/* ESPACIO INFERIOR PARA NAVEGACIÓN */}
        <div className="h-20"></div>
      </div>

      {/* ESTILOS INLINE PARA OCULTAR SCROLLBAR */}
      <style jsx>{`
        .h-screen::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ReelsFeedMobile;
