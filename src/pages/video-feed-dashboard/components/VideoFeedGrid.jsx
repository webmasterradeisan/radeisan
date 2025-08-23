import React, { useState, useEffect, useCallback } from 'react';
import VideoCard from './VideoCard';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VideoFeedGrid = ({ 
  videos = [], 
  layout = 'grid', 
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

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement?.scrollTop
      >= document.documentElement?.offsetHeight - 1000
      && hasMore && !isLoadingMore && !loading
    ) {
      setIsLoadingMore(true);
      onLoadMore && onLoadMore();
    }
  }, [hasMore, isLoadingMore, loading, onLoadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
    if (navigator.share) {
      navigator.share({
        title: video?.title,
        text: `Mira este video de ${video?.creator?.name}`,
        url: `${window.location?.origin}/video/${video?.id}`
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard?.writeText(`${window.location?.origin}/video/${video?.id}`);
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

  if (loading && displayVideos?.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando videos...</p>
        </div>
      </div>
    );
  }

  if (displayVideos?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon name="Video" size={24} color="var(--color-muted-foreground)" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No hay videos disponibles
        </h3>
        <p className="text-muted-foreground mb-4">
          Prueba cambiando los filtros o vuelve más tarde
        </p>
        <Button variant="outline" onClick={() => window.location?.reload()}>
          <Icon name="RefreshCw" size={16} className="mr-2" />
          Actualizar
        </Button>
      </div>
    );
  }

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
      {/* Loading More Indicator */}
      {(isLoadingMore || loading) && hasMore && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando más videos...</span>
          </div>
        </div>
      )}
      {/* Load More Button (fallback for devices without infinite scroll) */}
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
      {/* End of Feed Message */}
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