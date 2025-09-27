import React, { useState, useEffect, useCallback, useMemo } from 'react';
import VideoCard from './VideoCard';
import ReelsContainer from './ReelsContainer';
import HorizontalVideoGrid from './HorizontalVideoGrid';
// COMPONENTE MÓVIL INTEGRADO
import ReelsGridMobile from './ReelsGridMobile';
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

  // HELPER: Detectar dispositivo móvil
  const isMobile = useCallback(() => {
    return window.innerWidth < 768;
  }, []);

  // FILTRAR VIDEOS VERTICALES PARA EL CAROUSEL MÓVIL
  const reelsVideos = useMemo(() => {
    return displayVideos?.filter(video => {
      // Filtrar videos verticales (aspect ratio <= 1)
      const aspectRatio = video?.width && video?.height ? video.width / video.height : 1;
      return aspectRatio <= 1 || video?.orientation === 'vertical' || video?.type === 'reel';
    }).slice(0, 12) || []; // Limitar a 12 reels para performance
  }, [displayVideos]);

  // FILTRAR VIDEOS PARA EL FEED PRINCIPAL (excluyendo los ya mostrados en carousel)
  const feedVideos = useMemo(() => {
    if (!isMobile() || layout !== 'grid') {
      return displayVideos;
    }
    
    // En móvil, excluir los primeros reels del feed principal para evitar duplicados
    const reelsIds = new Set(reelsVideos.map(v => v.id));
    return displayVideos?.filter(video => !reelsIds.has(video.id)) || [];
  }, [displayVideos, reelsVideos, layout, isMobile]);

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
  // RENDER REELS FULLSCREEN - ARQUITECTURA SEPARADA MÓVIL/DESKTOP
  // ===============================
  if (layout === 'reels') {
    // USAR REELSCONTAINER PARA TODOS LOS DISPOSITIVOS
    // (La página de reels fullscreen mantiene el comportamiento actual)
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
  // RENDER DASHBOARD MÓVIL CON CAROUSEL + FEED
  // ===============================
  if (layout === 'grid' && isMobile() && reelsVideos.length > 0) {
    return (
      <div className="space-y-6">
        
        {/* CAROUSEL HORIZONTAL DE REELS - SOLO MÓVIL */}
        <div className="bg-background border-b border-border">
          <ReelsGridMobile
            videos={reelsVideos}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            loading={loading}
          />
        </div>

        {/* FEED PRINCIPAL - SIN REELS DUPLICADOS */}
        {feedVideos.length > 0 && (
          <>
            <div className="px-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Más videos para ti
              </h2>
            </div>
            
            <div className="px-4">
              <div className={getGridClasses()}>
                {feedVideos?.map((video) => (
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
            </div>
          </>
        )}

        {/* LOADING MORE INDICATOR */}
        {(isLoadingMore || loading) && hasMore && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Cargando más videos...</span>
            </div>
          </div>
        )}

        {/* LOAD MORE BUTTON */}
        {!isLoadingMore && !loading && hasMore && feedVideos?.length > 0 && (
          <div className="flex justify-center py-6 px-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsLoadingMore(true);
                onLoadMore && onLoadMore();
              }}
              className="px-8 w-full max-w-sm"
            >
              <Icon name="ChevronDown" size={16} className="mr-2" />
              Cargar más videos
            </Button>
          </div>
        )}

        {/* END OF FEED MESSAGE */}
        {!hasMore && feedVideos?.length > 0 && (
          <div className="text-center py-8 px-4">
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
      </div>
    );
  }

  // ===============================
  // RENDER TRADITIONAL GRID/LIST - DESKTOP Y OTROS LAYOUTS
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

      {/* Load More Button - Solo para grid/list */}
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

      {/* End of Feed Message - Solo para grid/list */}
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
    </div>
  );
};

export default VideoFeedGrid;
