// src/pages/video-feed-dashboard/components/HorizontalVideoGrid.jsx
// ✅ ARREGLADO: Videos horizontales se reproducen correctamente + Click navega a /video/:id

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const HorizontalVideoGrid = ({ 
  videos = [], 
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const navigate = useNavigate();
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [hoveredVideo, setHoveredVideo] = useState(null);

  console.log('🎬 HorizontalVideoGrid render:', {
    videosCount: videos.length,
    firstVideo: videos[0]
  });

  // ===============================
  // HANDLERS DE INTERACCIÓN
  // ===============================

  // ✅ Click en video -> navega a /video/:id (igual que YouTube)
  const handleVideoClick = (video) => {
    console.log('🔗 Navegando a video:', video.id);
    navigate(`/video/${video.id}`);
    onPointsEarned && onPointsEarned(2); // Puntos por ver video
  };

  const handleLike = (videoId, e) => {
    e?.stopPropagation();
    const newLikedVideos = new Set(likedVideos);
    if (newLikedVideos.has(videoId)) {
      newLikedVideos.delete(videoId);
    } else {
      newLikedVideos.add(videoId);
      onPointsEarned && onPointsEarned(5);
    }
    setLikedVideos(newLikedVideos);
  };

  const handleSave = (videoId, e) => {
    e?.stopPropagation();
    const newSavedVideos = new Set(savedVideos);
    if (newSavedVideos.has(videoId)) {
      newSavedVideos.delete(videoId);
    } else {
      newSavedVideos.add(videoId);
      onPointsEarned && onPointsEarned(3);
    }
    setSavedVideos(newSavedVideos);
  };

  const handleShare = async (video, e) => {
    e?.stopPropagation();
    const shareUrl = `${window.location.origin}/video/${video.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Mira este video de ${video.creator?.name}`,
          url: shareUrl
        });
        onPointsEarned && onPointsEarned(3);
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard?.writeText(shareUrl);
      onPointsEarned && onPointsEarned(3);
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
    return count?.toString() || '0';
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  // COMPONENTE CARD DE VIDEO
  // ===============================

  const HorizontalVideoCard = ({ video }) => {
    const isLiked = likedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isHovered = hoveredVideo === video.id;

    return (
      <div 
        className="group cursor-pointer bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-border hover:border-primary/50"
        onClick={() => handleVideoClick(video)}
        onMouseEnter={() => setHoveredVideo(video.id)}
        onMouseLeave={() => setHoveredVideo(null)}
      >
        {/* Thumbnail Container */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          <Image
            src={video.thumbnail || video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            fallbackSrc="/api/placeholder/640/360"
          />
          
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
            {formatDuration(video.duration || video.duration_seconds || 0)}
          </div>

          {/* Play Overlay */}
          <div className={`
            absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}>
            <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg">
              <Icon name="Play" size={28} color="var(--color-foreground)" className="ml-1" />
            </div>
          </div>

          {/* Quick Actions Overlay */}
          <div className={`
            absolute top-2 left-2 flex space-x-2 transition-all duration-300
            ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
          `}>
            <button
              onClick={(e) => handleLike(video.id, e)}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                ${isLiked 
                  ? 'bg-red-500 text-white shadow-lg' 
                  : 'bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white'
                }
              `}
              title={isLiked ? 'Quitar me gusta' : 'Me gusta'}
            >
              <Icon name="Heart" size={14} className={isLiked ? 'fill-current' : ''} />
            </button>
            
            <button
              onClick={(e) => handleSave(video.id, e)}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                ${isSaved 
                  ? 'bg-yellow-500 text-white shadow-lg' 
                  : 'bg-white/90 text-gray-700 hover:bg-yellow-500 hover:text-white'
                }
              `}
              title={isSaved ? 'Guardado' : 'Guardar'}
            >
              <Icon name="Bookmark" size={14} className={isSaved ? 'fill-current' : ''} />
            </button>

            <button
              onClick={(e) => handleShare(video, e)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-white/90 text-gray-700 hover:bg-blue-500 hover:text-white"
              title="Compartir"
            >
              <Icon name="Share" size={14} />
            </button>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4">
          {/* Creator Info */}
          <div className="flex items-start space-x-3 mb-2">
            <Link 
              to={`/profile/${video.creator?.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0"
            >
              <img
                src={video.creator?.avatar}
                alt={video.creator?.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-border"
              />
            </Link>
            
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              
              {/* Creator Name */}
              <Link 
                to={`/profile/${video.creator?.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {video.creator?.name || 'Usuario'}
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Icon name="Eye" size={14} />
                <span>{formatCount(video.views || video.views_count || 0)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Heart" size={14} />
                <span>{formatCount((video.likes || video.likes_count || 0) + (isLiked ? 1 : 0))}</span>
              </div>
            </div>
            <span>{formatTimeAgo(video.created_at || video.timeAgo)}</span>
          </div>

          {/* Category Badge */}
          {video.category && (
            <div className="mt-2">
              <span className="inline-block text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                {video.category}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===============================
  // EMPTY STATE
  // ===============================

  if (videos.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Icon name="Monitor" size={32} color="var(--color-primary)" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">
          No hay videos horizontales disponibles
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Sé el primero en crear contenido de formato tradicional para la comunidad
        </p>
        <Button onClick={() => window.location.href = '/upload'}>
          <Icon name="Plus" size={16} className="mr-2" />
          Crear Video
        </Button>
      </div>
    );
  }

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  return (
    <div className="space-y-6">
      {/* Grid de Videos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {videos.map((video) => (
          <HorizontalVideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* Loading More Indicator */}
      {loading && hasMore && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando más videos...</span>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {!loading && hasMore && videos.length > 0 && (
        <div className="flex justify-center py-6">
          <Button
            variant="outline"
            onClick={onLoadMore}
            className="px-8"
          >
            <Icon name="ChevronDown" size={16} className="mr-2" />
            Cargar más videos
          </Button>
        </div>
      )}

      {/* End of Feed Message */}
      {!hasMore && videos.length > 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="Check" size={20} color="var(--color-success)" />
          </div>
          <p className="text-muted-foreground">
            ¡Has visto todos los videos disponibles!
          </p>
          <Button
            variant="ghost"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-4"
          >
            <Icon name="ArrowUp" size={16} className="mr-2" />
            Volver arriba
          </Button>
        </div>
      )}
    </div>
  );
};

export default HorizontalVideoGrid;
