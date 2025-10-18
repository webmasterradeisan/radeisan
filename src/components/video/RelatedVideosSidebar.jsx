// src/components/video/RelatedVideosSidebar.jsx
// Sidebar con videos relacionados estilo YouTube

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Image from '../AppImage';

const RelatedVideosSidebar = ({
  videos = [],
  currentVideoId,
  autoplayEnabled = true,
  onVideoSelect,
  loading = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Filtrar videos (excluir el actual)
  useEffect(() => {
    const filtered = videos.filter(video => video.id !== currentVideoId);
    setFilteredVideos(filtered);
  }, [videos, currentVideoId]);

  // ===============================
  // FORMATEO DE DATOS
  // ===============================

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views?.toString() || '0';
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Reciente';
    
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) return `hace ${diffYears} año${diffYears > 1 ? 's' : ''}`;
    if (diffMonths > 0) return `hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
    if (diffDays > 0) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffMinutes > 0) return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    return 'hace un momento';
  };

  // ===============================
  // HANDLERS
  // ===============================

  const handleVideoClick = (video) => {
    if (onVideoSelect) {
      onVideoSelect(video);
    } else {
      navigate(`/video/${video.id}`);
    }
  };

  // ===============================
  // FILTERS
  // ===============================

  const filters = [
    { id: 'all', label: 'Todos', icon: 'Grid3x3' },
    { id: 'category', label: 'Categoría', icon: 'Tag' },
    { id: 'recent', label: 'Recientes', icon: 'Clock' },
    { id: 'popular', label: 'Populares', icon: 'TrendingUp' }
  ];

  const applyFilter = (filterId) => {
    setSelectedFilter(filterId);
    
    let filtered = videos.filter(video => video.id !== currentVideoId);
    
    switch (filterId) {
      case 'recent':
        filtered = filtered.sort((a, b) => 
          new Date(b.created_at || b.timeAgo) - new Date(a.created_at || a.timeAgo)
        );
        break;
      case 'popular':
        filtered = filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'category':
        // Filtrar por la misma categoría del video actual
        const currentVideo = videos.find(v => v.id === currentVideoId);
        if (currentVideo?.category) {
          filtered = filtered.filter(v => v.category === currentVideo.category);
        }
        break;
      default:
        // 'all' - no additional filtering
        break;
    }
    
    setFilteredVideos(filtered);
  };

  // ===============================
  // LOADING STATE
  // ===============================

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-40 h-24 bg-muted rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ===============================
  // EMPTY STATE
  // ===============================

  if (filteredVideos.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Video" size={24} color="var(--color-muted-foreground)" />
        </div>
        <p className="text-muted-foreground text-sm">
          No hay videos relacionados disponibles
        </p>
      </div>
    );
  }

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  return (
    <div className={`${className}`}>
      
      {/* HEADER CON FILTROS */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">
            Videos relacionados
          </h2>
          {autoplayEnabled && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Icon name="Play" size={14} className="mr-1" />
              <span>Autoplay</span>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => applyFilter(filter.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                ${selectedFilter === filter.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }
              `}
            >
              <Icon name={filter.icon} size={14} />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE VIDEOS */}
      <div className="space-y-3">
        {filteredVideos.map((video, index) => (
          <div
            key={video.id}
            onClick={() => handleVideoClick(video)}
            className="flex gap-3 cursor-pointer group"
          >
            {/* Thumbnail */}
            <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
              <Image
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Duration Badge */}
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                {formatDuration(video.duration)}
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="Play" size={16} className="ml-0.5" />
                </div>
              </div>

              {/* Index Badge (para autoplay) */}
              {autoplayEnabled && index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                  Siguiente
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {video.title}
              </h3>

              {/* Creator */}
              <Link
                to={`/profile/${video.creator?.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
              >
                {video.creator?.name || 'Usuario Anónimo'}
              </Link>

              {/* Stats */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Icon name="Eye" size={12} />
                  <span>{formatViews(video.views)}</span>
                </div>
                <span>•</span>
                <span>{formatTimeAgo(video.timeAgo || video.created_at)}</span>
              </div>

              {/* Category Badge (opcional) */}
              {video.category && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <Icon name="Tag" size={10} />
                    {video.category}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* LOAD MORE BUTTON */}
      {filteredVideos.length > 10 && (
        <div className="mt-6 text-center">
          <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
            Ver más videos relacionados
          </button>
        </div>
      )}

      {/* AUTOPLAY INDICATOR */}
      {autoplayEnabled && filteredVideos.length > 0 && (
        <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon name="Play" size={20} color="var(--color-primary)" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground mb-1">
                Autoplay activado
              </h4>
              <p className="text-xs text-muted-foreground">
                El siguiente video se reproducirá automáticamente cuando termine este.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedVideosSidebar;
