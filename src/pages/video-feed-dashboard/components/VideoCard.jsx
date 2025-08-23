import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [isLiked, setIsLiked] = useState(video?.isLiked || false);
  const [isSaved, setIsSaved] = useState(video?.isSaved || false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const videoRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video?.currentTime / video?.duration) * 100;
      setWatchProgress(progress);
      
      // Award points for watching milestones
      if (progress >= 25 && !video?.dataset?.points25) {
        video.dataset.points25 = 'true';
        onPointsEarned && onPointsEarned(5);
      }
      if (progress >= 50 && !video?.dataset?.points50) {
        video.dataset.points50 = 'true';
        onPointsEarned && onPointsEarned(10);
      }
      if (progress >= 100 && !video?.dataset?.points100) {
        video.dataset.points100 = 'true';
        onPointsEarned && onPointsEarned(20);
      }
    };

    video?.addEventListener('timeupdate', handleTimeUpdate);
    return () => video?.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onPointsEarned]);

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

  const handlePlayPause = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const videoElement = videoRef?.current;
    if (videoElement) {
      if (isPlaying) {
        videoElement?.pause();
      } else {
        videoElement?.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

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
    return views?.toString();
  };

  return (
    <div className={`bg-card rounded-lg shadow-elevation-1 overflow-hidden transition-all duration-300 hover:shadow-elevation-2 ${
      layout === 'list' ? 'flex' : 'flex flex-col'
    }`}>
      {/* Video Thumbnail/Player */}
      <div 
        className={`relative bg-muted group cursor-pointer ${
          layout === 'list' ? 'w-48 flex-shrink-0' : 'w-full aspect-video'
        }`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={handlePlayPause}
      >
        {!isPlaying ? (
          <>
            <Image
              src={video?.thumbnail}
              alt={video?.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                <Icon name="Play" size={20} color="var(--color-foreground)" />
              </div>
            </div>
          </>
        ) : (
          <video
            ref={videoRef}
            src={video?.videoUrl}
            className="w-full h-full object-cover"
            controls={showControls}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video?.duration)}
        </div>

        {/* Points Indicator */}
        <div className="absolute top-2 right-2 bg-accent/90 text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center space-x-1">
          <Icon name="Star" size={12} />
          <span>+{video?.pointsReward}</span>
        </div>

        {/* Progress Bar */}
        {watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
        )}
      </div>
      {/* Video Info */}
      <div className={`p-4 flex-1 ${layout === 'list' ? 'flex flex-col justify-between' : ''}`}>
        <div className="flex-1">
          <h3 className="font-medium text-foreground line-clamp-2 mb-2 hover:text-primary transition-colors">
            {video?.title}
          </h3>
          
          <Link 
            to={`/creator/${video?.creator?.id}`}
            className="flex items-center space-x-2 mb-3 group"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={video?.creator?.avatar}
                alt={video?.creator?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                {video?.creator?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatViews(video?.views)} visualizaciones • {video?.timeAgo}
              </p>
            </div>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`p-2 ${isLiked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon name={isLiked ? "Heart" : "Heart"} size={16} />
              <span className="ml-1 text-xs">{video?.likes + (isLiked ? 1 : 0)}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {}}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Icon name="MessageCircle" size={16} />
              <span className="ml-1 text-xs">{video?.comments}</span>
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className={`p-2 ${isSaved ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon name={isSaved ? "Bookmark" : "Bookmark"} size={16} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Icon name="Share" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;