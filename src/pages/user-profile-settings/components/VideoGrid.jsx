import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const VideoGrid = ({ videos, loading = false }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs?.toString()?.padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000)?.toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000)?.toFixed(1)}K`;
    }
    return views?.toString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 sm:p-6">
        {Array.from({ length: 8 })?.map((_, index) => (
          <div key={index} className="aspect-[9/16] bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!videos || videos?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon name="Video" size={24} color="var(--color-muted-foreground)" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No hay videos</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Los videos que subas aparecerán aquí. ¡Comienza a crear contenido!
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {videos?.map((video) => (
          <div
            key={video?.id}
            className="group cursor-pointer"
            onClick={() => setSelectedVideo(video)}
          >
            <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden">
              <Image
                src={video?.thumbnail}
                alt={video?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Video Duration */}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(video?.duration)}
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="Play" size={20} color="var(--color-foreground)" />
                </div>
              </div>

              {/* Video Type Badge */}
              {video?.type === 'short' && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  Short
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="mt-2">
              <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                {video?.title}
              </h4>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Icon name="Eye" size={12} />
                  <span>{formatViews(video?.views)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="Heart" size={12} />
                  <span>{formatViews(video?.likes)}</span>
                </div>
                <span>•</span>
                <span>{video?.uploadedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Load More Button */}
      <div className="flex justify-center mt-8">
        <button className="px-6 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
          Cargar más videos
        </button>
      </div>
    </div>
  );
};

export default VideoGrid;