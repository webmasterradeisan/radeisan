// src/pages/video-feed-dashboard/components/VideoFeedGrid.jsx
// Grid de videos actualizado con lógica móvil para reels

import React, { useState, useEffect, useCallback } from 'react';
import VideoCard from './VideoCard';
import ReelsContainer from './ReelsContainer';
import ReelsGridMobile from './ReelsGridMobile'; // ← NUEVO IMPORT
import HorizontalVideoGrid from './HorizontalVideoGrid';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VideoFeedGrid = ({ 
  videos = [], 
  layout = 'grid', 
  orientation = 'all',
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const [displayVideos, setDisplayVideos] = useState(videos);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setDisplayVideos(videos);
  }, [videos]);

  // ===============================
  // DETECCIÓN DE DISPOSITIVO MÓVIL
  // ===============================

  const isMobile = useCallback(() => {
    // Detectar móvil por ancho de pantalla y user agent
    const isMobileWidth = window.innerWidth <= 768;
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileWidth || (isMobileUserAgent && isTouchDevice);
  }, []);

  // ===============================
  // SCROLL HANDLING
  // ===============================

  const handleScroll = useCallback(() => {
    // Solo manejar scroll si NO estamos en modo reels (el ReelsContainer maneja su propio scroll)
    if (layout === 'reels') return;

    if (
      window.innerHeight + document.documentElement?.scrollTop
      >= document.documentElement?.offsetHeight - 1000
      && hasMore && !isLoadingMore && !loading
    ) {
      setIsLoadingMore(true);
      onLoadMore && onLoadMore();
    }
  }, [hasMore, isLoadingMore, loading, onLoadMore, layout]);

  useEffect(() => {
    // Solo agregar event listener si NO estamos en modo reels
    if (layout === 'reels') return;

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll, layout]);

  useEffect(() => {
    if (!loading) {
      setIsLoadingMore(false);
    }
  }, [loading]);

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleVideoLike = (videoId, isLiked) => {
    setDisplayVideos(prev => 
      prev?.map(video => 
        video?.id === videoId 
          ? { ...video, isLiked, likes: video?.likes + (isLiked ? 1 : -1) }
          : video
      )
    );
  };

  const handleVideoSave = (videoId, isSaved) => {
    setDisplayVideos(prev => 
      prev?.map(video => 
        video?.id === videoId 
          ? { ...video, isSaved }
          : video
      )
    );
  };

  const handleVideoShare = (video) => {
    const shareUrl = layout === 'reels' 
      ? `${window.location?.origin}/reel/${video?.id}`
      : `${window.location?.origin}/video/${video?.id}`;

    if (navigator.share) {
      navigator.share({
        title: video?.title,
        text: `Mira este ${layout === 'reels' ? 'reel' : 'video'} de ${video?.creator?.name}`,
        url: shareUrl
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard?.writeText(shareUrl);
    }
  };

  // ===============================
  // GRID CLASSES HELPER
  // ===============================

  const getGridClasses = () => {
    switch (layout) {
      case 'list':
        return 'space-y-4';
      case 'grid':
      default:
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6';
    }
  };

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading && displayVideos?.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Cargando {layout === 'reels' ? 'reels' : 'videos'}...
          </p>
        </div>
      </div>
    );
  }

  // ===============================
  // EMPTY STATE
  // ===============================
  if (displayVideos?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon 
            name={layout === 'reels' ? 'Smartphone' : 'Video'} 
            size={24} 
            color="var(--color-muted-foreground)" 
          />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No hay {layout === 'reels' ? 'reels' : 'videos'} disponibles
        </h3>
        <p className="text-muted-foreground mb-4">
          {layout === 'reels' 
            ? 'Sé el primero en crear contenido vertical para la comunidad'
            : 'Prueba cambiando los filtros o vuelve más tarde'
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => window.location.href = '/upload'}
            className="px-6"
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Crear {layout === 'reels' ? 'Reel' : 'Video'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location?.reload()}
            className="px-6"
          >
            <Icon name="RefreshCw" size={16} className="mr-2" />
            Actualizar
          </Button>
        </div>
      </div>
    );
  }

  // ===============================
  // RENDER REELS - LÓGICA ACTUALIZADA CON MÓVIL
  // ===============================
  if (layout === 'reels') {
    // 🔥 NUEVA LÓGICA: Grid móvil vs Fullscreen desktop
    if (isMobile()) {
      return (
        <ReelsGridMobile
          videos={displayVideos}
          onLoadMore={onLoadMore}
          onPointsEarned={onPointsEarned}
          hasMore={hasMore}
          loading={loading}
        />
      );
    } else {
      // Desktop: Mantener ReelsContainer fullscreen existente
      return (
        <ReelsContainer
          videos={displayVideos}
          onLoadMore={onLoadMore}
          onPointsEarned={onPointsEarned}
          hasMore={hasMore}
          loading={loading}
        />
      );
    }
  }

  // ===============================
  // RENDER HORIZONTAL VIDEO GRID
  // ===============================
  if (orientation === 'horizontal' && layout !== 'list') {
    return (
      <HorizontalVideoGrid
        videos={displayVideos}
        onLoadMore={onLoadMore}
        onPointsEarned={onPointsEarned}
        hasMore={hasMore}
        loading={loading}
      />
    );
  }

  // ===============================
  // RENDER TRADITIONAL GRID/LIST
  // ===============================
  return (
    <div className="space-y-6">
      <div className={getGridClasses()}>
        {displayVideos?.map((video) => (
          <VideoCard
            key={video?.id}
            video={video}
            layout={layout}
            onLike={handleVideoLike}
            onSave={handleVideoSave}
            onShare={handleVideoShare}
            onPointsEarned={onPointsEarned}
          />
        ))}
      </div>

      {/* Loading More Indicator - Solo para grid/list */}
      {(isLoadingMore || loading) && hasMore && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando más videos...</span>
          </div>
        </div>
      )}

      {/* End of Feed Indicator */}
      {!hasMore && displayVideos?.length > 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground">
            <Icon name="CheckCircle" size={16} />
            <span className="text-sm font-medium">
              Has visto todos los {layout === 'reels' ? 'reels' : 'videos'} disponibles
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoFeedGrid;
