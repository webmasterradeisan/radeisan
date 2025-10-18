import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const VideoCard = ({ 
  video, 
  onLike, 
  onSave, 
  onShare, 
  onPointsEarned,
  layout = 'grid' 
}) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(video?.isLiked || false);
  const [isSaved, setIsSaved] = useState(video?.isSaved || false);

  // ===============================
  // NAVEGACIÓN AL VIDEO
  // ===============================
  
  const handleVideoClick = (e) => {
    // Si el click fue en un botón de acción, no navegar
    if (e.target.closest('button')) {
      return;
    }
    // Navegar a la página del video
    navigate(`/video/${video?.id}`);
  };

  // ===============================
  // INTERACCIONES
  // ===============================

  const handleLike = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsLiked(!isLiked);
    onLike && onLike(video?.id, !isLiked);
    if (!isLiked) {
      onPointsEarned && onPointsEarned(2);
    }
  };

  const handleSave = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsSaved(!isSaved);
    onSave && onSave(video?.id, !isSaved);
  };

  const handleShare = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    onShare && onShare(video);
    onPointsEarned && onPointsEarned(3);
  };

  // ===============================
  // FORMATEO
  // ===============================

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs?.toString()?.padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000)?.toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000)?.toFixed(1)}K`;
    }
    return views?.toString() || '0';
  };

  // ===============================
  // RENDER
  // ===============================

  return (
    <div 
      className={`bg-card rounded-lg shadow-elevation-1 overflow-hidden transition-all duration-300 hover:shadow-elevation-2 cursor-pointer ${
        layout === 'list' ? 'flex' : 'flex flex-col'
      }`}
      onClick={handleVideoClick}
    >
      {/* Video Thumbnail */}
      <div 
        className={`relative bg-muted group ${
          layout === 'list' ? 'w-48 flex-shrink-0' : 'w-full aspect-video'
        }`}
      >
        <Image
          src={video?.thumbnail}
          alt={video?.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
            <Icon name="Play" size={20} color="var(--color-foreground)" className="ml-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
          {formatDuration(video?.duration)}
        </div>

        {/* Points Indicator */}
        {video?.pointsReward && (
          <div className="absolute top-2 right-2 bg-accent/90 text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center space-x-1">
            <Icon name="Star" size={12} />
            <span>+{video?.pointsReward}</span>
          </div>
        )}

        {/* Category Badge (opcional) */}
        {video?.category && (
          <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full capitalize">
            {video?.category}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className={`p-4 flex-1 ${layout === 'list' ? 'flex flex-col justify-between' : ''}`}>
        <div className="flex-1">
          {/* Title */}
          <h3 className="font-medium text-foreground line-clamp-2 mb-2 hover:text-primary transition-colors">
            {video?.title}
          </h3>
          
          {/* Creator Info */}
          <Link 
            to={`/profile/${video?.creator?.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center space-x-2 mb-3 group/creator"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-muted">
              {video?.creator?.avatar ? (
                <Image
                  src={video?.creator?.avatar}
                  alt={video?.creator?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                  {video?.creator?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover/creator:text-primary transition-colors truncate">
                {video?.creator?.name || 'Usuario Anónimo'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatViews(video?.views)} visualizaciones • {video?.timeAgo}
              </p>
            </div>
          </Link>

          {/* Description (solo en layout list) */}
          {layout === 'list' && video?.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {video?.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center space-x-4">
            {/* Like Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`p-2 ${isLiked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon name={isLiked ? "Heart" : "Heart"} size={16} className={isLiked ? 'fill-current' : ''} />
              <span className="ml-1 text-xs">{formatViews((video?.likes || 0) + (isLiked ? 1 : 0))}</span>
            </Button>

            {/* Comments Button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Icon name="MessageCircle" size={16} />
              <span className="ml-1 text-xs">{formatViews(video?.comments || 0)}</span>
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Save Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className={`p-2 ${isSaved ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              title={isSaved ? 'Guardado' : 'Guardar'}
            >
              <Icon name={isSaved ? "Bookmark" : "Bookmark"} size={16} className={isSaved ? 'fill-current' : ''} />
            </Button>

            {/* Share Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="p-2 text-muted-foreground hover:text-foreground"
              title="Compartir"
            >
              <Icon name="Share2" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
