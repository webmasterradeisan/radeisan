// src/components/video/VideoControls.jsx
// Controles personalizados para el reproductor de video

import React, { useState, useRef, useCallback } from 'react';
import Icon from '../AppIcon';

const VideoControls = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  isPiP,
  playbackRate,
  buffered,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onPiPToggle,
  onPlaybackRateChange,
  formatTime
}) => {
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [previewTime, setPreviewTime] = useState(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);

  const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // ===============================
  // PROGRESS BAR - SEEK
  // ===============================

  const handleProgressMouseDown = useCallback((e) => {
    setIsDraggingProgress(true);
    updateProgress(e);
  }, []);

  const handleProgressMouseMove = useCallback((e) => {
    if (!progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * duration;
    setPreviewTime(time);

    if (isDraggingProgress) {
      updateProgress(e);
    }
  }, [isDraggingProgress, duration]);

  const handleProgressMouseUp = useCallback(() => {
    setIsDraggingProgress(false);
  }, []);

  const handleProgressClick = useCallback((e) => {
    updateProgress(e);
  }, []);

  const updateProgress = useCallback((e) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    onSeek(time);
  }, [duration, onSeek]);

  const handleProgressMouseLeave = () => {
    setPreviewTime(null);
    if (!isDraggingProgress) {
      setIsDraggingProgress(false);
    }
  };

  // ===============================
  // VOLUME SLIDER
  // ===============================

  const handleVolumeMouseDown = useCallback((e) => {
    e.stopPropagation();
    setIsDraggingVolume(true);
    updateVolume(e);
  }, []);

  const handleVolumeMouseMove = useCallback((e) => {
    if (isDraggingVolume) {
      updateVolume(e);
    }
  }, [isDraggingVolume]);

  const handleVolumeMouseUp = useCallback(() => {
    setIsDraggingVolume(false);
  }, []);

  const updateVolume = useCallback((e) => {
    if (!volumeRef.current) return;
    
    const rect = volumeRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    
    onVolumeChange(percentage);
  }, [onVolumeChange]);

  // ===============================
  // GLOBAL MOUSE EVENTS FOR DRAGGING
  // ===============================

  React.useEffect(() => {
    if (isDraggingProgress) {
      const handleMouseMove = (e) => handleProgressMouseMove(e);
      const handleMouseUp = () => handleProgressMouseUp();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingProgress, handleProgressMouseMove, handleProgressMouseUp]);

  React.useEffect(() => {
    if (isDraggingVolume) {
      const handleMouseMove = (e) => handleVolumeMouseMove(e);
      const handleMouseUp = () => handleVolumeMouseUp();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingVolume, handleVolumeMouseMove, handleVolumeMouseUp]);

  // ===============================
  // CALCULAR PORCENTAJES
  // ===============================

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = volume * 100;

  // ===============================
  // RENDER
  // ===============================

  return (
    <div className="space-y-2">
      {/* PROGRESS BAR */}
      <div className="relative">
        <div
          ref={progressRef}
          className="relative h-1 bg-white/30 rounded-full cursor-pointer group hover:h-2 transition-all"
          onMouseDown={handleProgressMouseDown}
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          {/* Buffer Bar */}
          <div 
            className="absolute left-0 top-0 h-full bg-white/40 rounded-full transition-all"
            style={{ width: `${buffered}%` }}
          />
          
          {/* Progress Bar */}
          <div 
            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Progress Handle */}
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
          </div>

          {/* Preview Tooltip */}
          {previewTime !== null && progressRef.current && (
            <div 
              className="absolute bottom-full mb-2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
              style={{ 
                left: `${(previewTime / duration) * 100}%`
              }}
            >
              {formatTime(previewTime)}
            </div>
          )}
        </div>
      </div>

      {/* CONTROLES PRINCIPALES */}
      <div className="flex items-center justify-between text-white">
        
        {/* LEFT SIDE - Play, Volume, Time */}
        <div className="flex items-center space-x-3">
          
          {/* Play/Pause Button */}
          <button
            onClick={onPlayPause}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            <Icon name={isPlaying ? 'Pause' : 'Play'} size={20} />
          </button>

          {/* Volume Controls */}
          <div 
            className="flex items-center space-x-2 group"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => !isDraggingVolume && setShowVolumeSlider(false)}
          >
            <button
              onClick={onMuteToggle}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              <Icon 
                name={isMuted ? 'VolumeX' : volume > 0.5 ? 'Volume2' : volume > 0 ? 'Volume1' : 'Volume'} 
                size={20} 
              />
            </button>

            {/* Volume Slider */}
            <div 
              className={`
                transition-all duration-200 overflow-hidden
                ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}
              `}
            >
              <div
                ref={volumeRef}
                className="relative h-1 bg-white/30 rounded-full cursor-pointer group/volume hover:h-2"
                onMouseDown={handleVolumeMouseDown}
              >
                <div 
                  className="absolute left-0 top-0 h-full bg-white rounded-full"
                  style={{ width: `${volumePercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/volume:opacity-100 transition-opacity shadow-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Time Display */}
          <div className="text-sm font-medium tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span className="text-white/60"> / </span>
            <span className="text-white/80">{formatTime(duration)}</span>
          </div>
        </div>

        {/* RIGHT SIDE - Speed, PiP, Fullscreen */}
        <div className="flex items-center space-x-2">
          
          {/* Playback Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className={`
                px-3 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-sm font-medium
                ${playbackRate !== 1 ? 'text-primary' : ''}
              `}
              aria-label="Velocidad de reproducción"
            >
              {playbackRate}x
            </button>

            {/* Speed Menu */}
            {showSpeedMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSpeedMenu(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]">
                  <div className="py-2">
                    <div className="px-3 py-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Velocidad
                    </div>
                    {PLAYBACK_SPEEDS.map(speed => (
                      <button
                        key={speed}
                        onClick={() => {
                          onPlaybackRateChange(speed);
                          setShowSpeedMenu(false);
                        }}
                        className={`
                          w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors
                          ${speed === playbackRate ? 'text-primary font-medium' : 'text-white'}
                        `}
                      >
                        {speed === 1 ? 'Normal' : `${speed}x`}
                        {speed === playbackRate && (
                          <Icon name="Check" size={16} className="inline-block ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Picture in Picture */}
          {document.pictureInPictureEnabled && (
            <button
              onClick={onPiPToggle}
              className={`
                w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors
                ${isPiP ? 'text-primary' : ''}
              `}
              aria-label="Picture in Picture"
              title="Picture in Picture (P)"
            >
              <Icon name="PictureInPicture" size={20} />
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={onFullscreenToggle}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
          >
            <Icon name={isFullscreen ? 'Minimize' : 'Maximize'} size={20} />
          </button>
        </div>
      </div>

      
    </div>
  );
};

export default VideoControls;
