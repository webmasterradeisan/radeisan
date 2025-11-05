// src/contexts/VideoPlayerContext.jsx
// ============================================================================
// VIDEO PLAYER CONTEXT - Estado Global del Mini-Player Persistente
// ============================================================================
// Permite que el mini-player persista al navegar entre páginas
// ============================================================================

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const VideoPlayerContext = createContext(null);

export const VideoPlayerProvider = ({ children }) => {
  // ===============================
  // ESTADOS DEL MINI-PLAYER
  // ===============================
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [miniPlayerPosition, setMiniPlayerPosition] = useState({ 
    x: window.innerWidth - 420,
    y: window.innerHeight - 300
  });

  // Ref del video en el mini-player
  const miniVideoRef = useRef(null);

  // ===============================
  // FUNCIONES PÚBLICAS
  // ===============================

  /**
   * Abre el mini-player con un video específico
   * @param {Object} videoData - Datos del video (id, title, video_url, creator, etc.)
   * @param {number} startTime - Tiempo inicial del video en segundos
   * @param {boolean} autoPlay - Si debe reproducirse automáticamente
   */
  const openMiniPlayer = useCallback((videoData, startTime = 0, autoPlay = true) => {
    console.log('🎬 Abriendo mini-player:', videoData.title);
    
    setCurrentVideo(videoData);
    setCurrentTime(startTime);
    setIsMiniPlayerOpen(true);

    // Esperar a que el video se monte
    setTimeout(() => {
      const video = miniVideoRef.current;
      if (video) {
        video.currentTime = startTime;
        video.volume = volume;
        video.muted = isMuted;
        
        if (autoPlay) {
          video.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.error('Error al reproducir mini-player:', err));
        }
      }
    }, 100);
  }, [volume, isMuted]);

  /**
   * Cierra el mini-player
   */
  const closeMiniPlayer = useCallback(() => {
    console.log('❌ Cerrando mini-player');
    
    const video = miniVideoRef.current;
    if (video) {
      video.pause();
    }
    
    setIsMiniPlayerOpen(false);
    setIsPlaying(false);
    setCurrentTime(0);
    // NO limpiamos currentVideo para poder restaurar si se vuelve a abrir
  }, []);

  /**
   * Toggle Play/Pause del mini-player
   */
  const togglePlayPause = useCallback(() => {
    const video = miniVideoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Error al reproducir:', err));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  /**
   * Cambia el volumen del mini-player
   */
  const changeVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    const video = miniVideoRef.current;
    if (video) {
      video.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  }, []);

  /**
   * Toggle Mute del mini-player
   */
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    const video = miniVideoRef.current;
    if (video) {
      video.muted = newMuted;
    }
    
    if (newMuted) {
      setVolume(0);
    } else if (volume === 0) {
      setVolume(0.5);
      if (video) video.volume = 0.5;
    }
  }, [isMuted, volume]);

  /**
   * Actualiza la posición del mini-player
   */
  const updatePosition = useCallback((newPosition) => {
    setMiniPlayerPosition(newPosition);
  }, []);

  /**
   * Maneja la actualización del tiempo del video
   */
  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  /**
   * Maneja cuando el video se carga
   */
  const handleLoadedMetadata = useCallback((videoDuration) => {
    setDuration(videoDuration);
  }, []);

  // ===============================
  // VALOR DEL CONTEXTO
  // ===============================
  const value = {
    // Estado
    isMiniPlayerOpen,
    currentVideo,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    miniPlayerPosition,
    miniVideoRef,

    // Funciones
    openMiniPlayer,
    closeMiniPlayer,
    togglePlayPause,
    changeVolume,
    toggleMute,
    updatePosition,
    handleTimeUpdate,
    handleLoadedMetadata,
    setIsPlaying,
  };

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useVideoPlayer = () => {
  const context = useContext(VideoPlayerContext);
  
  if (!context) {
    throw new Error('useVideoPlayer debe usarse dentro de VideoPlayerProvider');
  }
  
  return context;
};

export default VideoPlayerContext;
