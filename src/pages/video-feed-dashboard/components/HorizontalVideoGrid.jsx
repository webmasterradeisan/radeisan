// src/pages/video-feed-dashboard/components/HorizontalVideoGrid.jsx
// Grid especializado para videos horizontales (16:9) estilo YouTube

import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [hoveredVideo, setHoveredVideo] = useState(null);
  const videoModalRef = useRef(null);

  // ===============================
  // HANDLERS DE INTERACCIÓN
  // ===============================

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    onPointsEarned && onPointsEarned(2); // Puntos por ver video
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
    if (videoModalRef.current) {
      videoModalRef.current.pause();
      videoModalRef.current.currentTime = 0;
    }
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
          text: `Mira este video de ${video.creator.name}`,
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
    return count.toString();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        className="group cursor-pointer bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
        onClick={() => handleVideoClick(video)}
        onMouseEnter={() => setHoveredVideo(video.id)}
        onMouseLeave={() => setHoveredVideo(null)}
      >
        {/* Thumbnail Container */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          <Image
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>

          {/* Points Reward Badge */}
          <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center space-x-1">
            <Icon name="Star" size={12} />
            <span>+{video.pointsReward}</span>
          </div>

          {/* Play Overlay */}
          <div className={`
            absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}>
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Icon name="Play" size={24} color="var(--color-foreground)" className="ml-1" />
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
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white'
                }
              `}
            >
              <Icon name="Heart" size={14} className={isLiked ? 'fill-current' : ''} />
            </button>
            
            <button
              onClick={(e) => handleSave(video.id, e)}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                ${isSaved 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white/90 text-gray-700 hover:bg-yellow-500 hover:text-white'
                }
              `}
            >
              <Icon name="Bookmark" size={14} className={isSaved ? 'fill-current' : ''} />
            </button>
            
            <button
              onClick={(e) => handleShare(video, e)}
              className="w-8 h-8 bg-white/90 text-gray-700 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all duration-200"
            >
              <Icon name="Share" size={14} />
            </button>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4">
          {/* Creator Info */}
          <div className="flex items-center space-x-3 mb-3">
            <Link 
              to={`/profile/${video.creator.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0"
            >
              <img
                src={video.creator.avatar}
                alt={video.creator.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <Link 
                to={`/profile/${video.creator.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {video.creator.name}
              </Link>
              <p className="text-xs text-muted-foreground">{video.timeAgo}</p>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-medium text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {video.description}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Icon name="Eye" size={12} />
                <span>{formatCount(video.views)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Heart" size={12} />
                <span>{formatCount(video.likes + (isLiked ? 1 : 0))}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="MessageCircle" size={12} />
                <span>{formatCount(video.comments)}</span>
              </div>
            </div>
            
            {/* Category Badge */}
            <span className="px-2 py-1 bg-muted rounded-full text-xs font-medium">
              {video.category}
            </span>
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {video.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {video.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{video.tags.length - 3} más
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===============================
  // MODAL DE REPRODUCCIÓN
  // ===============================

  const VideoModal = ({ video, onClose }) => {
    if (!video) return null;

    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
        >
          <Icon name="X" size={24} color="white" />
        </button>

        {/* Video Container */}
        <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoModalRef}
            src={video.videoUrl}
            className="w-full h-full object-contain"
            controls
            autoPlay
            onPlay={() => onPointsEarned && onPointsEarned(10)}
          />
        </div>

        {/* Video Info Overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="bg-black/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">{video.title}</h2>
                <p className="text-gray-300 mb-3">{video.description}</p>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <img
                      src={video.creator.avatar}
                      alt={video.creator.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{video.creator.name}</span>
                  </div>
                  <span>{formatCount(video.views)} visualizaciones</span>
                  <span>{video.timeAgo}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center space-x-3 ml-4">
                <button
                  onClick={(e) => handleLike(video.id, e)}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200
                    ${likedVideos.has(video.id)
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/20 hover:bg-red-500 text-white'
                    }
                  `}
                >
                  <Icon name="Heart" size={16} className={likedVideos.has(video.id) ? 'fill-current' : ''} />
                  <span>{formatCount(video.likes + (likedVideos.has(video.id) ? 1 : 0))}</span>
                </button>

                <button
                  onClick={(e) => handleSave(video.id, e)}
                  className={`
                    p-2 rounded-full transition-all duration-200
                    ${savedVideos.has(video.id)
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-white/20 hover:bg-yellow-500 text-white'
                    }
                  `}
                >
                  <Icon name="Bookmark" size={16} className={savedVideos.has(video.id) ? 'fill-current' : ''} />
                </button>

                <button
                  onClick={(e) => handleShare(video, e)}
                  className="p-2 bg-white/20 hover:bg-blue-500 rounded-full text-white transition-all duration-200"
                >
                  <Icon name="Share" size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===============================
  // EMPTY STATE
  // ===============================

  if (videos.length === 0) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
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
          <p className="text-sm text-muted-foreground mt-1">
            Vuelve más tarde para ver contenido nuevo
          </p>
        </div>
      )}

      {/* Modal de Reproducción */}
      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default HorizontalVideoGrid;
