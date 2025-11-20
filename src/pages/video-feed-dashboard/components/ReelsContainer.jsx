// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
// ✅ CORRECCIÓN DE RUTAS (3 niveles en lugar de 4)
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { usePoints } from '../../../contexts/PointsContext'; 
import { updateMissionProgress } from '../../../services/missionsService'; 
import VideoPlayer from './VideoPlayer';
import { Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react';

// ============================================================================
// COMPONENTE INDIVIDUAL: REEL ITEM
// ============================================================================
const ReelItem = ({ video, isActive, onVideoView, onLike, onShare, isMuted, toggleMute }) => {
  const { ref, inView } = useInView({ threshold: 0.6 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewStartTime, setViewStartTime] = useState(null);
  const [hasCountedView, setHasCountedView] = useState(false);

  useEffect(() => {
    if (isActive && inView) {
      setIsPlaying(true);
      setViewStartTime(Date.now());
    } else {
      setIsPlaying(false);
      if (viewStartTime && !hasCountedView && isActive) {
        const duration = Date.now() - viewStartTime;
        // Si vio más de 5 segundos, contamos la vista
        if (duration > 5000) { 
          onVideoView(video.id);
          setHasCountedView(true);
        }
        setViewStartTime(null);
      }
    }
  }, [isActive, inView]);

  return (
    <div ref={ref} className="h-screen w-full snap-start relative bg-black flex items-center justify-center">
      <div className="relative w-full h-full md:w-[400px] md:h-[80vh]">
        <VideoPlayer
          src={video.url}
          poster={video.thumbnail_url}
          isPlaying={isPlaying}
          isMuted={isMuted}
          className="w-full h-full object-cover"
        />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
          {/* Botones Laterales */}
          <div className="absolute right-4 bottom-20 flex flex-col gap-6 items-center">
            
            {/* LIKE */}
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => onLike(video.id, video.hasLiked)}
                className={`p-3 rounded-full bg-black/20 backdrop-blur-sm transition-all active:scale-90 ${video.hasLiked ? 'text-red-500' : 'text-white'}`}
              >
                <Heart className={`w-8 h-8 ${video.hasLiked ? 'fill-current' : ''}`} />
              </button>
              <span className="text-xs font-bold">{video.likes_count || 0}</span>
            </div>

            {/* COMENTARIOS */}
            <div className="flex flex-col items-center gap-1">
              <button className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition">
                <MessageCircle className="w-8 h-8" />
              </button>
              <span className="text-xs font-bold">{video.comments_count || 0}</span>
            </div>

            {/* SHARE */}
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => onShare(video.id)}
                className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white active:scale-90 hover:bg-black/40 transition"
              >
                <Share2 className="w-8 h-8" />
              </button>
              <span className="text-xs font-bold">Share</span>
            </div>

            {/* MUTE */}
            <button onClick={toggleMute} className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white/80 hover:bg-black/40">
              {isMuted ? <VolumeX className="w-6 h-6"/> : <Volume2 className="w-6 h-6"/>}
            </button>
          </div>

          {/* Info Usuario */}
          <div className="pr-16 mb-4">
             <div className="flex items-center gap-3 mb-3">
               <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-white overflow-hidden cursor-pointer">
                 {video.profiles?.avatar_url ? (
                   <img src={video.profiles.avatar_url} alt="" className="w-full h-full object-cover"/>
                 ) : (
                   <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
                 )}
               </div>
               <span className="font-bold text-lg drop-shadow-md cursor-pointer">@{video.profiles?.username || 'usuario'}</span>
               <button className="px-3 py-1 rounded-lg border border-white/50 text-xs font-bold backdrop-blur-sm hover:bg-white/20 transition">Seguir</button>
             </div>
             <p className="text-sm text-gray-100 line-clamp-2 drop-shadow-md">{video.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CONTENEDOR PRINCIPAL
// ============================================================================
const ReelsContainer = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  
  const { user } = useAuth();
  const { addPoints, triggerAnimation } = usePoints(); // Usamos triggerAnimation del contexto
  const containerRef = useRef(null);
  const awardedPointsCache = useRef(new Set());

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          video_likes (user_id)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const processedVideos = data.map(v => ({
        ...v,
        hasLiked: v.video_likes?.some(l => l.user_id === user?.id) || false,
      }));

      setVideos(processedVideos);
    } catch (err) {
      console.error('Error loading reels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
    if (index !== activeVideoIndex) {
      setActiveVideoIndex(index);
    }
  }, [activeVideoIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // ========================================================================
  // LÓGICA DE MISIONES
  // ========================================================================

  // 1. VIEW
  const handleVideoView = async (videoId) => {
    if (!user || awardedPointsCache.current.has(videoId)) return;

    // Solo marcamos para no repetir, no damos puntos por view simple
    awardedPointsCache.current.add(videoId);

    // Misión: Ver videos
    await updateMissionProgress(user.id, 'watch_videos', 1);
  };

  // 2. LIKE
  const handleLike = async (videoId, currentLikeStatus) => {
    if (!user) return;

    setVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return {
          ...v,
          hasLiked: !currentLikeStatus,
          likes_count: currentLikeStatus ? (v.likes_count - 1) : (v.likes_count + 1)
        };
      }
      return v;
    }));

    try {
      if (currentLikeStatus) {
        await supabase.from('video_likes').delete().match({ video_id: videoId, user_id: user.id });
      } else {
        const { error } = await supabase.from('video_likes').insert({ video_id: videoId, user_id: user.id });
        if (error) throw error;

        // Misión: Dar Like
        await updateMissionProgress(user.id, 'give_like', 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // 3. SHARE
  const handleShare = async (videoId) => {
    if (!user) return;

    const url = `${window.location.origin}/video/${videoId}`;
    navigator.clipboard.writeText(url);
    alert('Enlace copiado al portapapeles');

    // Misión: Compartir
    await updateMissionProgress(user.id, 'share_video', 1);
  };

  if (loading) return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Cargando Reels...</div>;

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar"
      style={{ scrollBehavior: 'smooth' }}
    >
      {videos.map((video, index) => (
        <ReelItem 
          key={video.id} 
          video={video} 
          isActive={index === activeVideoIndex}
          onVideoView={handleVideoView}
          onLike={handleLike}
          onShare={handleShare}
          isMuted={isMuted}
          toggleMute={() => setIsMuted(!isMuted)}
        />
      ))}
    </div>
  );
};

export default ReelsContainer;
