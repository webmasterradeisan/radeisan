// src/pages/video-feed-dashboard/components/ReelsGridMobile.jsx
// Grid compacto 2x2 para reels en móvil - Patrón YouTube home móvil

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const ReelsGridMobile = ({ 
  videos = [], 
  onLoadMore,
  hasMore = true,
  loading = false 
}) => {
  const navigate = useNavigate();
  const [loadingThumbnails, setLoadingThumbnails] = useState(new Set());

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
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ===============================
  // MANEJADORES DE EVENTOS
  // ===============================

  const handleThumbnailLoad = (videoId) => {
    setLoadingThumbnails(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  const handleThumbnailError = (videoId) => {
    setLoadingThumbnails(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  const handleReelClick = (video, index) => {
    // Navegar a la sección fullscreen de reels
    // Pasamos el índice para que empiece en el video correcto
    navigate(`/reels?start=${index}`, { 
      state: { 
        videos,
        startIndex: index,
        returnTo: '/dashboard'
      }
    });
  };

  // ===============================
  // EMPTY STATE
  // ===============================

  if (videos.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 p-2">
        {/* Placeholder cards para loading state */}
        {[...Array(4)].map((_, index) => (
          <div 
            key={index}
            className="aspect-[9/16] rounded-xl bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ===============================
  // COMPONENTE REEL THUMBNAIL CARD
  // ===============================

  const ReelThumbnailCard = ({ video, index }) => {
    const isLoadingThumbnail = loadingThumbnails.has(video.id);
    
    return (
      <div
        onClick={() => handleReelClick(video, index)}
        className="
          aspect-[9/16] rounded-xl overflow-hidden relative 
          bg-black cursor-pointer transform transition-all duration-200
          hover:scale-[1.02] active:scale-[0.98]
          group
        "
      >
        {/* THUMBNAIL IMAGE/VIDEO */}
        <div className="absolute inset-0">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onLoad={() => handleThumbnailLoad(video.id)}
              onError={() => handleThumbnailError(video.id)}
            />
          ) : (
            <video
              src={video.videoUrl}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              onLoadedData={() => handleThumbnailLoad(video.id)}
              onError={() => handleThumbnailError(video.id)}
            />
          )}

          {/* Loading overlay */}
          {isLoadingThumbnail && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
              <Icon name="Play" size={24} color="var(--color-muted-foreground)" />
            </div>
          )}
        </div>

        {/* GRADIENT OVERLAY */}
        <div className="
          absolute inset-0 bg-gradient-to-t 
          from-black/80 via-black/20 to-transparent
        " />

        {/* PLAY INDICATOR */}
        <div className="absolute top-2 left-2">
          <div className="
            w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm
            flex items-center justify-center
          ">
            <Icon name="Play" size={16} color="white" />
          </div>
        </div>

        {/* DURATION */}
        {video.duration && (
          <div className="absolute top-2 right-2">
            <div className="
              px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm
              text-white text-xs font-medium
            ">
              {formatDuration(video.duration)}
            </div>
          </div>
        )}

        {/* CONTENT INFO OVERLAY */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          
          {/* CREATOR INFO */}
          <div className="flex items-center space-x-2 mb-2">
            <img
              src={video.creator?.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${video.creator?.username}`}
              alt={video.creator?.name}
              className="w-6 h-6 rounded-full border border-white/20"
            />
            <span className="text-white text-xs font-medium truncate flex-1">
              @{video.creator?.username}
            </span>
          </div>

          {/* TITLE */}
          <h3 className="
            text-white text-sm font-medium leading-tight mb-2
            line-clamp-2 group-hover:line-clamp-none transition-all duration-200
          ">
            {video.title}
          </h3>

          {/* STATS */}
          <div className="flex items-center space-x-3 text-white/80">
            
            {/* Likes */}
            <div className="flex items-center space-x-1">
              <Icon name="Heart" size={12} />
              <span className="text-xs font-medium">
                {formatCount(video.likes)}
              </span>
            </div>

            {/* Views */}
            <div className="flex items-center space-x-1">
              <Icon name="Eye" size={12} />
              <span className="text-xs font-medium">
                {formatCount(video.views)}
              </span>
            </div>

            {/* Comments */}
            {video.comments > 0 && (
              <div className="flex items-center space-x-1">
                <Icon name="MessageCircle" size={12} />
                <span className="text-xs font-medium">
                  {formatCount(video.comments)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* HOVER EFFECTS */}
        <div className="
          absolute inset-0 bg-white/0 group-hover:bg-white/5 
          transition-all duration-200
        " />
      </div>
    );
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  return (
    <div className="w-full">
      
      {/* GRID 2x2 DE REELS */}
      <div className="grid grid-cols-2 gap-2 p-2">
        {videos.map((video, index) => (
          <ReelThumbnailCard
            key={video.id}
            video={video}
            index={index}
          />
        ))}
      </div>

      {/* LOAD MORE TRIGGER */}
      {hasMore && videos.length >= 4 && (
        <div className="p-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="
              w-full py-3 px-4 rounded-xl
              bg-primary/10 hover:bg-primary/20 
              text-primary font-medium text-sm
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center space-x-2
            "
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Cargando más reels...</span>
              </>
            ) : (
              <>
                <Icon name="Plus" size={16} />
                <span>Ver más reels</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* CTA PARA CREAR CONTENIDO */}
      {videos.length < 4 && (
        <div className="p-4 text-center">
          <div className="
            rounded-xl border-2 border-dashed border-muted-foreground/30
            p-6 bg-muted/20
          ">
            <Icon 
              name="Smartphone" 
              size={32} 
              color="var(--color-muted-foreground)" 
              className="mx-auto mb-3"
            />
            <h3 className="text-sm font-medium text-foreground mb-2">
              ¡Crea tu primer reel!
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Sé parte de la comunidad y comparte tu creatividad
            </p>
            <Link
              to="/upload"
              className="
                inline-flex items-center space-x-2 px-4 py-2
                bg-primary text-primary-foreground rounded-lg
                text-sm font-medium hover:bg-primary/90
                transition-colors duration-200
              "
            >
              <Icon name="Plus" size={14} />
              <span>Crear Reel</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsGridMobile;
