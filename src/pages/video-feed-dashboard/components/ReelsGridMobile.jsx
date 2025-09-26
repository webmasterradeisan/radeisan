// src/pages/video-feed-dashboard/components/ReelsGridMobile.jsx
// Carousel horizontal para reels en móvil - Patrón YouTube home móvil

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const ReelsGridMobile = ({ 
  videos = [], 
  onLoadMore,
  hasMore = true,
  loading = false 
}) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [loadingThumbnails, setLoadingThumbnails] = useState(new Set());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ===============================
  // DETECCIÓN DE SCROLL HORIZONTAL
  // ===============================

  useEffect(() => {
    const checkScrollability = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    };

    const container = scrollContainerRef.current;
    if (container) {
      checkScrollability();
      container.addEventListener('scroll', checkScrollability);
      return () => container.removeEventListener('scroll', checkScrollability);
    }
  }, [videos]);

  // ===============================
  // FORMATEO DE NÚMEROS
  // ===============================

  const formatCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count?.toString() || '0';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ===============================
  // MANEJADORES DE EVENTOS
  // ===============================

  const handleThumbnailLoad = (videoId) => {
    setLoadingThumbnails(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  const handleThumbnailError = (videoId) => {
    setLoadingThumbnails(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  const handleReelClick = (video, index) => {
    // Navegar a la sección fullscreen de reels
    // Pasamos el índice para que empiece en el video correcto
    navigate(`/reels?start=${index}`, { 
      state: { 
        videos,
        startIndex: index,
        returnTo: '/dashboard'
      }
    });
  };

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // ===============================
  // LOADING STATE - SKELETON
  // ===============================

  if (loading && videos.length === 0) {
    return (
      <div className="w-full">
        {/* Header skeleton */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
        
        {/* Carousel skeleton */}
        <div className="flex space-x-3 px-4 overflow-hidden">
          {[...Array(3)].map((_, index) => (
            <div 
              key={index}
              className="flex-shrink-0 w-[120px] aspect-[9/16] rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // ===============================
  // EMPTY STATE
  // ===============================

  if (videos.length === 0) {
    return (
      <div className="w-full px-4 py-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Smartphone" size={24} color="var(--color-muted-foreground)" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            ¡Crea tu primer reel!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sé parte de la comunidad y comparte tu creatividad
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="
              inline-flex items-center space-x-2 px-4 py-2
              bg-primary text-primary-foreground rounded-lg
              text-sm font-medium hover:bg-primary/90
              transition-colors duration-200
            "
          >
            <Icon name="Plus" size={16} />
            <span>Crear Reel</span>
          </button>
        </div>
      </div>
    );
  }

  // ===============================
  // COMPONENTE REEL CARD
  // ===============================

  const ReelCard = ({ video, index }) => {
    const isLoadingThumbnail = loadingThumbnails.has(video.id);
    
    return (
      <div
        onClick={() => handleReelClick(video, index)}
        className="
          flex-shrink-0 w-[120px] aspect-[9/16] rounded-xl overflow-hidden 
          relative bg-black cursor-pointer transform transition-all duration-200
          hover:scale-[1.02] active:scale-[0.98]
          group
        "
      >
        {/* THUMBNAIL */}
        <div className="absolute inset-0">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onLoad={() => handleThumbnailLoad(video.id)}
              onError={() => handleThumbnailError(video.id)}
            />
          ) : (
            <video
              src={video.videoUrl}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              onLoadedData={() => handleThumbnailLoad(video.id)}
              onError={() => handleThumbnailError(video.id)}
            />
          )}

          {/* Loading overlay */}
          {isLoadingThumbnail && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
              <Icon name="Play" size={20} color="var(--color-muted-foreground)" />
            </div>
          )}
        </div>

        {/* GRADIENT OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* PLAY INDICATOR */}
        <div className="absolute top-2 left-2">
          <div className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Icon name="Play" size={12} color="white" />
          </div>
        </div>

        {/* DURATION */}
        {video.duration && (
          <div className="absolute top-2 right-2">
            <div className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
              {formatDuration(video.duration)}
            </div>
          </div>
        )}

        {/* CONTENT INFO */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          {/* TITLE */}
          <h3 className="text-white text-xs font-medium leading-tight mb-1 line-clamp-2">
            {video.title}
          </h3>

          {/* CREATOR */}
          <div className="flex items-center space-x-1 mb-2">
            <img
              src={video.creator?.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${video.creator?.username}`}
              alt={video.creator?.name}
              className="w-4 h-4 rounded-full border border-white/20"
            />
            <span className="text-white/80 text-xs truncate">
              @{video.creator?.username}
            </span>
          </div>

          {/* STATS */}
          <div className="flex items-center space-x-2 text-white/80">
            <div className="flex items-center space-x-1">
              <Icon name="Heart" size={10} />
              <span className="text-xs">{formatCount(video.likes)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Icon name="Eye" size={10} />
              <span className="text-xs">{formatCount(video.views)}</span>
            </div>
          </div>
        </div>

        {/* HOVER EFFECT */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-200" />
      </div>
    );
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  return (
    <div className="w-full">
      
      {/* HEADER CON TÍTULO Y ACCIÓN */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">Reels</h2>
        <button
          onClick={() => navigate('/reels')}
          className="text-sm text-primary font-medium hover:text-primary/80 transition-colors"
        >
          Ver todos
        </button>
      </div>

      {/* CAROUSEL CONTAINER */}
      <div className="relative">
        
        {/* SCROLL BUTTONS (Solo visible si es necesario) */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="
              absolute left-2 top-1/2 transform -translate-y-1/2 z-10
              w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm
              flex items-center justify-center text-white
              hover:bg-black/80 transition-all duration-200
            "
          >
            <Icon name="ChevronLeft" size={16} />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="
              absolute right-2 top-1/2 transform -translate-y-1/2 z-10
              w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm
              flex items-center justify-center text-white
              hover:bg-black/80 transition-all duration-200
            "
          >
            <Icon name="ChevronRight" size={16} />
          </button>
        )}

        {/* CAROUSEL DE REELS */}
        <div
          ref={scrollContainerRef}
          className="
            flex space-x-3 px-4 overflow-x-auto scrollbar-hide
            snap-x snap-mandatory scroll-smooth
          "
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitScrollbar: { display: 'none' }
          }}
        >
          {videos.map((video, index) => (
            <div key={video.id} className="snap-start">
              <ReelCard video={video} index={index} />
            </div>
          ))}

          {/* LOAD MORE CARD */}
          {hasMore && videos.length >= 6 && (
            <div className="snap-start">
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="
                  flex-shrink-0 w-[120px] aspect-[9/16] rounded-xl
                  border-2 border-dashed border-muted-foreground/30
                  bg-muted/20 hover:bg-muted/40
                  flex flex-col items-center justify-center
                  text-muted-foreground hover:text-foreground
                  transition-all duration-200 disabled:opacity-50
                "
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                ) : (
                  <Icon name="Plus" size={24} className="mb-2" />
                )}
                <span className="text-xs text-center px-2">
                  {loading ? 'Cargando...' : 'Ver más'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* INDICADOR DE SCROLL (Opcional) */}
      {videos.length > 3 && (
        <div className="flex justify-center mt-3">
          <div className="flex space-x-1">
            {[...Array(Math.ceil(videos.length / 3))].map((_, index) => (
              <div
                key={index}
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ===============================
// ESTILOS CSS ADICIONALES
// ===============================

const styles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inyectar estilos si no están disponibles
if (typeof document !== 'undefined' && !document.getElementById('reels-grid-mobile-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'reels-grid-mobile-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ReelsGridMobile;
