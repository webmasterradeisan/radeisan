import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VideoPreview = ({ videoFile, onThumbnailSelect, selectedThumbnail }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [thumbnails, setThumbnails] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (videoFile && videoRef?.current) {
      const videoUrl = URL.createObjectURL(videoFile);
      videoRef.current.src = videoUrl;
      
      return () => URL.revokeObjectURL(videoUrl);
    }
  }, [videoFile]);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video?.duration);
      generateThumbnails();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video?.currentTime);
    };

    video?.addEventListener('loadedmetadata', handleLoadedMetadata);
    video?.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video?.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video?.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const generateThumbnails = () => {
    const video = videoRef?.current;
    const canvas = canvasRef?.current;
    if (!video || !canvas) return;

    const ctx = canvas?.getContext('2d');
    const thumbnailCount = 4;
    const thumbnailsArray = [];

    canvas.width = 160;
    canvas.height = 90;

    for (let i = 0; i < thumbnailCount; i++) {
      const time = (video?.duration / thumbnailCount) * i;
      video.currentTime = time;
      
      video?.addEventListener('seeked', function captureFrame() {
        ctx?.drawImage(video, 0, 0, canvas?.width, canvas?.height);
        const thumbnailUrl = canvas?.toDataURL('image/jpeg', 0.8);
        thumbnailsArray?.push({
          id: i,
          url: thumbnailUrl,
          time: time
        });
        
        if (thumbnailsArray?.length === thumbnailCount) {
          setThumbnails(thumbnailsArray);
          if (!selectedThumbnail) {
            onThumbnailSelect(thumbnailsArray?.[0]);
          }
        }
        
        video?.removeEventListener('seeked', captureFrame);
      }, { once: true });
    }
  };

  const togglePlayPause = () => {
    const video = videoRef?.current;
    if (!video) return;

    if (isPlaying) {
      video?.pause();
    } else {
      video?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const video = videoRef?.current;
    if (!video) return;

    const rect = e?.currentTarget?.getBoundingClientRect();
    const clickX = e?.clientX - rect?.left;
    const newTime = (clickX / rect?.width) * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e?.target?.value);
    setVolume(newVolume);
    if (videoRef?.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds?.toString()?.padStart(2, '0')}`;
  };

  if (!videoFile) return null;

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progress Bar */}
            <div 
              className="w-full h-1 bg-white/30 rounded-full cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-primary rounded-full transition-all duration-150"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlayPause}
                  className="text-white hover:bg-white/20"
                >
                  <Icon name={isPlaying ? "Pause" : "Play"} size={20} />
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Icon name="Volume2" size={16} color="white" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/30 rounded-full appearance-none slider"
                  />
                </div>
              </div>
              
              <div className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Thumbnail Selection */}
      <div className="space-y-3">
        <h4 className="font-medium text-foreground">Seleccionar miniatura</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {thumbnails?.map((thumbnail) => (
            <button
              key={thumbnail?.id}
              onClick={() => onThumbnailSelect(thumbnail)}
              className={`
                relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200
                ${selectedThumbnail?.id === thumbnail?.id 
                  ? 'border-primary shadow-elevation-2' 
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <img
                src={thumbnail?.url}
                alt={`Miniatura ${thumbnail?.id + 1}`}
                className="w-full h-full object-cover"
              />
              {selectedThumbnail?.id === thumbnail?.id && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <Icon name="Check" size={20} color="var(--color-primary)" />
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                {formatTime(thumbnail?.time)}
              </div>
            </button>
          ))}
        </div>
      </div>
      {/* Hidden Canvas for Thumbnail Generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoPreview;