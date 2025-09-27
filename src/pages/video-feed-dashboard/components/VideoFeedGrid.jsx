// src/pages/video-feed-dashboard/components/VideoFeedGrid.jsx
import React, { useState, useEffect, useCallback } from 'react';
import VideoCard from './VideoCard';
import ReelsContainer from './ReelsContainer';
import HorizontalVideoGrid from './HorizontalVideoGrid';
import ReelsGridMobile from './ReelsGridMobile';
import useIsMobile from '../../../hooks/useIsMobile';
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
  
  // 📱 DETECCIÓN DE DISPOSITIVO MÓVIL
  const isMobile = useIsMobile();
  
  // 🎯 DEBUG: Console.logs para verificar que los cambios se aplican
  console.log('🚨 VIDEOFEEDGRID CARGADO - NUEVA VERSIÓN CON CAROUSEL MÓVIL');
  console.log('📱 isMobile:', isMobile);
  console.log('🎬 layout:', layout);
  console.log('📐 orientation:', orientation);
  console.log('📹 videos count:', videos.length);
  console.log('🔄 loading:', loading);
  console.log('⚡ hasMore:', hasMore);

  useEffect(() => {
    setDisplayVideos(videos);
    console.log('📺 displayVideos updated:', videos.length);
  }, [videos]);

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
    console.log('🔄 Mostrando loading state inicial');
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
    console.log('📭 Mostrando empty state');
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
  // RENDER REELS CONTAINER (PANTALLA COMPLETA)
  // ===============================
  if (layout === 'reels') {
    console.log('🎬 Renderizando ReelsContainer (pantalla completa)');
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

  // ===============================
  // RENDER HORIZONTAL VIDEO GRID
  // ===============================
  if (orientation === 'horizontal' && layout !== 'list') {
    console.log('🎬 Renderizando HorizontalVideoGrid');
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
  // 📱 RENDER DASHBOARD PRINCIPAL
  // ===============================
  console.log('🎬 Renderizando Dashboard Principal:', { 
    isMobile, 
    layout, 
    videosCount: displayVideos.length,
    showCarousel: isMobile && layout !== 'reels'
  });
  
  return (
    <div className="space-y-6">
      {/* 🚀 CAROUSEL HORIZONTAL DE REELS - SOLO EN MÓVIL */}
      {isMobile && (
        <>
          <div className="block md:hidden">
            <ReelsGridMobile
              videos={displayVideos}
              onLoadMore={onLoadMore}
              hasMore={hasMore}
              loading={loading}
            />
          </div>
          {/* Separador visual */}
          <div className="border-t border-border block md:hidden"></div>
        </>
      )}

      {/* 🎥 GRID PRINCIPAL DE VIDEOS */}
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

      {/* 🔄 Loading More Indicator - Solo para grid/list */}
      {(isLoadingMore || loading) && hasMore && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando más videos...</span>
          </div>
        </div>
      )}

      {/* ⬇️ Load More Button - Solo para grid/list */}
      {!isLoadingMore && !loading && hasMore && displayVideos?.length > 0 && (
        <div className="flex justify-center py-6">
          <Button
            variant="outline"
            onClick={() => {
              setIsLoadingMore(true);
              onLoadMore && onLoadMore();
            }}
            className="px-8"
          >
            <Icon name="ChevronDown" size={16} className="mr-2" />
            Cargar más videos
          </Button>
        </div>
      )}

      {/* ✅ End of Feed Message - Solo para grid/list */}
      {!hasMore && displayVideos?.length > 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="Check" size={20} color="var(--color-success)" />
          </div>
          <p className="text-muted-foreground">
            ¡Has visto todos los videos disponibles!
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Vuelve más tarde para ver contenido nuevo
          </p>
        </div>
      )}

      {/* 🐛 DEBUG INFO - Solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-20 left-4 bg-black text-white p-3 rounded-lg text-xs font-mono max-w-xs z-50">
          <div className="text-green-400 font-bold mb-1">🚨 DEBUG VideoFeedGrid</div>
          <div>📱 isMobile: {isMobile.toString()}</div>
          <div>🎬 layout: {layout}</div>
          <div>📹 videos: {displayVideos.length}</div>
          <div>🔄 loading: {loading.toString()}</div>
          <div>⚡ hasMore: {hasMore.toString()}</div>
          <div>📐 orientation: {orientation}</div>
          <div>🎯 Carousel: {(isMobile && layout !== 'reels').toString()}</div>
        </div>
      )}
    </div>
  );
};

export default VideoFeedGrid;
