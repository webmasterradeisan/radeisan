// src/components/GlobalMiniPlayer.jsx
// ============================================================================
// GLOBAL MINI-PLAYER - Mini-player Flotante Persistente
// ============================================================================
// Se muestra sobre todas las páginas cuando está activo
// Permite navegar por la red social mientras ves un video
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';
import Icon from './AppIcon';

const GlobalMiniPlayer = () => {
  // Detección inline de móvil con verificación de window
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false; // Valor por defecto si window no existe
  });
  
  const navigate = useNavigate();
  
  const {
    isMiniPlayerOpen,
    currentVideo,
    isPlaying,
    volume,
    isMuted,
    miniPlayerPosition,
    miniVideoRef,
    closeMiniPlayer,
    togglePlayPause,
    toggleMute,
    updatePosition,
    handleTimeUpdate,
    handleLoadedMetadata,
    setIsPlaying,
  } = useVideoPlayer();
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Estados locales para drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ===============================
  // FUNCIONES DE DRAG & DROP
  // ===============================
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'VIDEO') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setDragOffset({
      x: clientX - miniPlayerPosition.x,
      y: clientY - miniPlayerPosition.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;

    const miniWidth = isMobile ? 250 : 400;
    const miniHeight = isMobile ? 180 : 250;
    const maxX = window.innerWidth - miniWidth - 20;
    const maxY = window.innerHeight - miniHeight - 20;

    const boundedX = Math.max(10, Math.min(newX, maxX));
    const boundedY = Math.max(10, Math.min(newY, maxY));

    updatePosition({ x: boundedX, y: boundedY });
  }, [isDragging, dragOffset, isMobile, updatePosition]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ===============================
  // FUNCIÓN PARA VOLVER AL VIDEO COMPLETO
  // ===============================
  const handleGoToVideo = () => {
    if (currentVideo?.id) {
      navigate(`/video/${currentVideo.id}`);
    }
  };

  // ===============================
  // SI NO ESTÁ ABIERTO, NO RENDERIZAR NADA
  // ===============================
  if (!isMiniPlayerOpen || !currentVideo) {
    return null;
  }

  // ===============================
  // RENDER
  // ===============================
  return (
    <div
      className="fixed bg-black rounded-lg shadow-2xl border-2 border-primary overflow-hidden"
      style={{
        left: `${miniPlayerPosition.x}px`,
        top: `${miniPlayerPosition.y}px`,
        width: isMobile ? '250px' : '400px',
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Video del mini-player */}
      <div className="relative aspect-video bg-black">
        <video
          ref={miniVideoRef}
          src={currentVideo.video_url}
          className="w-full h-full object-contain"
          muted={isMuted}
          volume={volume}
          onTimeUpdate={(e) => {
            handleTimeUpdate(e.target.currentTime);
          }}
          onLoadedMetadata={(e) => {
            handleLoadedMetadata(e.target.duration);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Click en el video para play/pause */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
        />

        {/* Overlay con botón de play/pause al hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Icon 
              name={isPlaying ? 'Pause' : 'Play'} 
              size={isMobile ? 20 : 24} 
              className="text-white" 
            />
          </div>
        </div>

        {/* Indicador visual de drag */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full pointer-events-none"></div>
      </div>

      {/* Información y controles del mini-player */}
      <div className="p-2 md:p-3 bg-black/95 border-t border-primary/30">
        <div className="flex items-center justify-between gap-2">
          {/* Información del video */}
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={handleGoToVideo}
          >
            <h4 className="text-xs font-medium text-white truncate hover:text-primary transition-colors">
              {currentVideo.title}
            </h4>
            <p className="text-xs text-gray-400 truncate">
              {currentVideo.creator?.name || 'Usuario'}
            </p>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Botón Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              <Icon name={isPlaying ? 'Pause' : 'Play'} size={14} />
            </button>

            {/* Botón Mute */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              <Icon 
                name={isMuted ? 'VolumeX' : volume > 0.5 ? 'Volume2' : 'Volume1'} 
                size={14} 
              />
            </button>

            {/* Botón Maximizar (ir al video completo) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGoToVideo();
              }}
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
              title="Ver video completo"
            >
              <Icon name="Maximize2" size={14} />
            </button>

            {/* Botón Cerrar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeMiniPlayer();
              }}
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
              title="Cerrar"
            >
              <Icon name="X" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalMiniPlayer;
