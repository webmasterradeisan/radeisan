// src/pages/video-feed-dashboard/components/VideoCard.jsx
// ✅ ARREGLADO: Click en video navega a /video/:id (igual que YouTube)

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const VideoCard = ({ 
  video, 
  layout = 'grid',
  onLike,
  onSave,
  onShare,
  onPointsEarned
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  // ===============================
  // ✅ CLICK HANDLER - NAVEGA A PÁGINA DE VIDEO
  // ===============================
  
  const handleVideoClick = () => {
    console.log('🔗 Navegando a video:', video.id);
    navigate(`/video/${video.id}`);
    onPointsEarned && onPointsEarned(2);
  };

  // ===============================
  // HANDLERS DE INTERACCIÓN
  // ===============================

  const handleLike = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    onLike && onLike(video.id, !video.isLiked);
    onPointsEarned && onPointsEarned(5);
  };

  const handleSave = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    onSave && onSave(video.id, !video.isSaved);
    onPointsEarned && onPointsEarned(3);
  };

  const handleShare = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    onShare && onShare(video);
    onPointsEarned && onPointsEarned(3);
  };

  // ===============================
  // FORMATEO DE DATOS
  // ===============================

  const formatDuration = (seconds) => {
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

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Reciente';
    
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return past.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Thumbnail */}
      <div 
        className={`relative bg-muted group ${
          layout === 'list' ? 'w-48 flex-shrink-0' : 'w-full aspect-video'
        }`}
      >
        <Image
          src={video?.thumbnail || video?.thumbnail_url}
          alt={video?.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          fallbackSrc="/api/placeholder/320/180"
        />
        
        {/* Play Overlay on Hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 bg-white/95 rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Icon name="Play" size={24} color="var(--color-foreground)" className="ml-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
          {formatDuration(video?.duration || video?.duration_seconds || 0)}
        </div>

        {/* Points Indicator */}
        {video?.pointsReward && (
          <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center space-x-1">
            <Icon name="Star" size={12} />
            <span>+{video.pointsReward}</span>
          </div>
        )}

        {/* Quick Actions - Solo en hover */}
        {isHovered && (
          <div className="absolute top-2 left-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handleLike}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                ${video?.isLiked 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white'
                }
              `}
              title={video?.isLiked ? 'Quitar me gusta' : 'Me gusta'}
            >
              <Icon name="Heart" size={14} className={video?.isLiked ? 'fill-current' : ''} />
            </button>
            
            <button
              onClick={handleSave}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                ${video?.isSaved 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white/90 text-gray-700 hover:bg-yellow-500 hover:text-white'
                }
              `}
              title={video?.isSaved ? 'Guardado' : 'Guardar'}
            >
              <Icon name="Bookmark" size={14} className={video?.isSaved ? 'fill-current' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className={`p-4 flex-1 ${layout === 'list' ? '' : ''}`}>
        <div className="flex items-start space-x-3">
          {/* Creator Avatar */}
          <Link 
            to={`/profile/${video?.creator?.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <img
              src={video?.creator?.avatar}
              alt={video?.creator?.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-border hover:border-primary transition-colors"
            />
          </Link>

          {/* Video Details */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1 hover:text-primary transition-colors">
              {video?.title}
            </h3>

            {/* Creator Name */}
            <Link 
              to={`/profile/${video?.creator?.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {video?.creator?.name || 'Usuario'}
            </Link>

            {/* Stats */}
            <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Icon name="Eye" size={12} />
                <span>{formatViews(video?.views || video?.views_count || 0)}</span>
              </div>
              <span>•</span>
              <span>{formatTimeAgo(video?.created_at || video?.timeAgo)}</span>
            </div>

            {/* Category Badge */}
            {video?.category && (
              <div className="mt-2">
                <span className="inline-block text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  {video.category}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Layout List */}
        {layout === 'list' && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLike}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center space-x-1
                  ${video?.isLiked 
                    ? 'bg-red-500 text-white' 
                    : 'bg-muted text-muted-foreground hover:bg-red-500 hover:text-white'
                  }
                `}
              >
                <Icon name="Heart" size={14} className={video?.isLiked ? 'fill-current' : ''} />
                <span>{formatViews((video?.likes || video?.likes_count || 0) + (video?.isLiked ? 1 : 0))}</span>
              </button>

              <button
                onClick={handleSave}
                className={`
                  p-1.5 rounded-lg transition-all duration-200
                  ${video?.isSaved 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-muted text-muted-foreground hover:bg-yellow-500 hover:text-white'
                  }
                `}
              >
                <Icon name="Bookmark" size={14} className={video?.isSaved ? 'fill-current' : ''} />
              </button>

              <button
                onClick={handleShare}
                className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-blue-500 hover:text-white transition-all duration-200"
              >
                <Icon name="Share" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
