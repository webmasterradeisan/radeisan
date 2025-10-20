// src/pages/VideoPlayerPage/index.jsx
// ✅ ACTUALIZADO: UX móvil según PDF de YouTube
// - Player sticky arriba
// - Videos relacionados en scroll infinito debajo
// - Mini-player opcional al hacer scroll

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import VideoPlayer from '../../components/video/VideoPlayer';
import RelatedVideosSidebar from '../../components/video/RelatedVideosSidebar';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const VideoPlayerPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estados principales
  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de interacción
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Estados de stats locales
  const [localLikes, setLocalLikes] = useState(0);
  const [localViews, setLocalViews] = useState(0);
  
  // Tracking de visualización para puntos
  const [watchTime, setWatchTime] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);

  // ✅ NUEVOS ESTADOS PARA UX MÓVIL
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const playerRef = useRef(null);
  const miniPlayerThreshold = 400; // Píxeles de scroll para activar mini-player

  // ===============================
  // RESPONSIVE DETECTION
  // ===============================
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ===============================
  // SCROLL DETECTION PARA MINI-PLAYER (OPCIONAL)
  // ===============================
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      // Activar mini-player cuando scrolleas más allá del player
      if (currentScrollY > miniPlayerThreshold && !showMiniPlayer) {
        setShowMiniPlayer(true);
      } else if (currentScrollY <= miniPlayerThreshold && showMiniPlayer) {
        setShowMiniPlayer(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, showMiniPlayer]);

  // ===============================
  // FETCH VIDEO DATA - SIN JOIN
  // ===============================

  const fetchVideo = useCallback(async () => {
    if (!videoId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🎬 Cargando video:', videoId);

      // PASO 1: Obtener datos del video sin JOIN
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('is_published', true)
        .single();

      if (videoError) throw videoError;

      if (!videoData) {
        setError('Video no encontrado');
        return;
      }

      console.log('✅ Video obtenido:', videoData);

      // PASO 2: Obtener perfil del creador
      let creatorProfile = null;
      if (videoData.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, full_name, username, avatar_url, is_verified')
          .eq('id', videoData.user_id)
          .single();

        if (profileError) {
          console.error('⚠️ Error obteniendo perfil:', profileError);
        } else {
          creatorProfile = profileData;
          console.log('✅ Perfil del creador obtenido:', creatorProfile);
        }
      }

      // PASO 3: Transformar datos
      const transformedVideo = {
        id: videoData.id,
        title: videoData.title || 'Video sin título',
        description: videoData.description || 'Sin descripción',
        videoUrl: videoData.video_url,
        thumbnail: videoData.thumbnail_url,
        duration: videoData.duration_seconds || 0,
        views: videoData.views_count || 0,
        likes: videoData.likes_count || 0,
        comments: videoData.comments_count || 0,
        category: videoData.category || 'general',
        tags: videoData.tags || [],
        createdAt: videoData.created_at,
        creator: {
          id: creatorProfile?.id || videoData.user_id,
          name: creatorProfile?.full_name || 'Usuario Anónimo',
          username: creatorProfile?.username || 'usuario',
          avatar: creatorProfile?.avatar_url || null,
          isVerified: creatorProfile?.is_verified || false
        }
      };

      console.log('✅ Video transformado:', transformedVideo);

      setVideo(transformedVideo);
      setLocalLikes(transformedVideo.likes);
      setLocalViews(transformedVideo.views);

      // Incrementar view count
      await incrementViewCount(videoId);

      // Fetch videos relacionados
      fetchRelatedVideos(transformedVideo.category, videoId);

    } catch (err) {
      console.error('❌ Error fetching video:', err);
      setError(err.message || 'Error al cargar el video');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  // ===============================
  // FETCH RELATED VIDEOS - SIN JOIN
  // ===============================

  const fetchRelatedVideos = async (category, currentVideoId) => {
    try {
      console.log('🔗 Cargando videos relacionados...');

      // PASO 1: Obtener videos relacionados
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('id, title, description, thumbnail_url, duration_seconds, views_count, likes_count, category, created_at, user_id')
        .eq('is_published', true)
        .neq('id', currentVideoId)
        .eq('category', category)
        .order('views_count', { ascending: false })
        .limit(20); // Más videos para scroll infinito

      if (videosError) throw videosError;

      console.log('✅ Videos relacionados obtenidos:', videosData?.length || 0);

      // PASO 2: Obtener perfiles de los creadores
      const userIds = [...new Set(videosData?.map(v => v.user_id).filter(Boolean))];
      
      let userProfilesMap = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('⚠️ Error obteniendo perfiles relacionados:', profilesError);
        } else {
          console.log('✅ Perfiles relacionados obtenidos:', profiles?.length || 0);
          userProfilesMap = (profiles || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      // PASO 3: Transformar datos
      const transformed = (videosData || []).map(v => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail_url,
        duration: v.duration_seconds,
        views: v.views_count,
        likes: v.likes_count,
        category: v.category,
        timeAgo: v.created_at,
        creator: {
          id: userProfilesMap[v.user_id]?.id || v.user_id,
          name: userProfilesMap[v.user_id]?.full_name || 'Usuario',
          username: userProfilesMap[v.user_id]?.username || 'usuario',
          avatar: userProfilesMap[v.user_id]?.avatar_url
        }
      }));

      console.log('✅ Videos relacionados transformados:', transformed.length);
      setRelatedVideos(transformed);

    } catch (err) {
      console.error('❌ Error fetching related videos:', err);
    }
  };

  // ===============================
  // INCREMENT VIEW COUNT
  // ===============================

  const incrementViewCount = async (id) => {
    try {
      await supabase.rpc('increment_video_views', { video_id: id });
      setLocalViews(prev => prev + 1);
    } catch (err) {
      console.error('Error incrementing views:', err);
    }
  };

  // ===============================
  // INTERACCIONES - LIKE
  // ===============================

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
        
        setLocalLikes(prev => prev - 1);
        setIsLiked(false);
      } else {
        await supabase
          .from('video_likes')
          .insert({
            video_id: videoId,
            user_id: user.id
          });
        
        setLocalLikes(prev => prev + 1);
        setIsLiked(true);
        addPoints(2, 'like_video');
      }
    } catch (err) {
      console.error('Error handling like:', err);
    }
  };

  // ===============================
  // INTERACCIONES - SAVE
  // ===============================

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
        
        setIsSaved(false);
      } else {
        await supabase
          .from('saved_videos')
          .insert({
            video_id: videoId,
            user_id: user.id
          });
        
        setIsSaved(true);
        addPoints(1, 'save_video');
      }
    } catch (err) {
      console.error('Error handling save:', err);
    }
  };

  // ===============================
  // INTERACCIONES - SHARE
  // ===============================

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/video/${videoId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Mira este video: ${video.title}`,
          url: shareUrl
        });
        addPoints(3, 'share_video');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copiado al portapapeles');
        addPoints(3, 'share_video');
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  // ===============================
  // INTERACCIONES - FOLLOW
  // ===============================

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (video.creator.id === user.id) {
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', video.creator.id);
        
        setIsFollowing(false);
      } else {
        await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: video.creator.id
          });
        
        setIsFollowing(true);
        addPoints(10, 'follow_user');
      }
    } catch (err) {
      console.error('Error handling follow:', err);
    }
  };

  // ===============================
  // SISTEMA DE PUNTOS
  // ===============================

  const addPoints = async (points, action) => {
    if (!user) return;

    try {
      setPointsEarned(prev => prev + points);
      console.log(`+${points} puntos por ${action}`);
    } catch (err) {
      console.error('Error adding points:', err);
    }
  };

  const handleTimeUpdate = useCallback((currentTime) => {
    setWatchTime(currentTime);
    
    if (currentTime >= video?.duration * 0.25 && watchTime < video?.duration * 0.25) {
      addPoints(5, 'watch_25_percent');
    }
    if (currentTime >= video?.duration * 0.50 && watchTime < video?.duration * 0.50) {
      addPoints(10, 'watch_50_percent');
    }
    if (currentTime >= video?.duration * 0.75 && watchTime < video?.duration * 0.75) {
      addPoints(15, 'watch_75_percent');
    }
  }, [video?.duration, watchTime]);

  const handleVideoEnded = useCallback(() => {
    addPoints(20, 'watch_complete');
  }, []);

  // ===============================
  // EFFECTS
  // ===============================

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  useEffect(() => {
    if (!user || !videoId) return;

    const checkInteractions = async () => {
      try {
        const { data: likeData } = await supabase
          .from('video_likes')
          .select('id')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsLiked(!!likeData);

        const { data: savedData } = await supabase
          .from('saved_videos')
          .select('id')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsSaved(!!savedData);

        if (video?.creator?.id) {
          const { data: followData } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', video.creator.id)
            .maybeSingle();
          
          setIsFollowing(!!followData);
        }
      } catch (err) {
        console.error('Error checking interactions:', err);
      }
    };

    checkInteractions();
  }, [user, videoId, video?.creator?.id]);

  // ===============================
  // FORMATEO DE DATOS
  // ===============================

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num?.toString() || '0';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // ===============================
  // LOADING STATE
  // ===============================

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        <main className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Cargando video...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ===============================
  // ERROR STATE
  // ===============================

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        <main className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {error || 'Video no encontrado'}
              </h2>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                El video que buscas no existe o ha sido eliminado.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                <Icon name="Home" size={16} className="mr-2" />
                Volver al inicio
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ===============================
  // ✅ RENDER PRINCIPAL - MOBILE vs DESKTOP
  // ===============================

  return (
    <>
      <Helmet>
        <title>{video.title} | RADEISAN</title>
        <meta name="description" content={video.description} />
        <meta property="og:title" content={video.title} />
        <meta property="og:description" content={video.description} />
        <meta property="og:image" content={video.thumbnail} />
        <meta property="og:type" content="video.other" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className={isMobile ? 'pt-16' : 'pt-32 pb-16'}>
          {/* ===============================
              LAYOUT MÓVIL (YouTube Style)
              =============================== */}
          {isMobile ? (
            <div className="flex flex-col">
              
              {/* VIDEO PLAYER - Sticky en móvil */}
              <div 
                ref={playerRef}
                className="sticky top-16 z-30 bg-black"
              >
                <VideoPlayer
                  videoUrl={video.videoUrl}
                  thumbnailUrl={video.thumbnail}
                  autoPlay={false}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  className="w-full aspect-video"
                />
              </div>

              {/* CONTENIDO SCROLLABLE */}
              <div className="bg-background">
                
                {/* Título y Stats */}
                <div className="px-4 pt-4 pb-3 border-b border-border">
                  <h1 className="text-lg font-bold text-foreground mb-2">
                    {video.title}
                  </h1>
                  
                  <div className="flex items-center text-sm text-muted-foreground space-x-2">
                    <div className="flex items-center gap-1">
                      <Icon name="Eye" size={14} />
                      <span>{formatNumber(localViews)} vistas</span>
                    </div>
                    <span>•</span>
                    <span>{formatDate(video.createdAt)}</span>
                  </div>
                </div>

                {/* Creator Info + Botones de Acción */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <Link 
                      to={`/profile/${video.creator.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                        {video.creator.avatar ? (
                          <img 
                            src={video.creator.avatar} 
                            alt={video.creator.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                            {video.creator.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h3 className="font-semibold text-foreground truncate text-sm">
                            {video.creator.name}
                          </h3>
                          {video.creator.isVerified && (
                            <Icon name="BadgeCheck" size={14} color="var(--color-primary)" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          @{video.creator.username}
                        </p>
                      </div>
                    </Link>

                    {user?.id !== video.creator.id && (
                      <Button
                        variant={isFollowing ? 'outline' : 'default'}
                        size="sm"
                        onClick={handleFollow}
                        className="flex-shrink-0 ml-2"
                      >
                        {isFollowing ? 'Siguiendo' : 'Seguir'}
                      </Button>
                    )}
                  </div>

                  {/* Botones de Acción - Horizontales */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isLiked ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleLike}
                      className="flex-1 gap-2"
                    >
                      <Icon name="Heart" size={16} className={isLiked ? 'fill-current' : ''} />
                      <span>{formatNumber(localLikes)}</span>
                    </Button>

                    <Button
                      variant={isSaved ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleSave}
                      className="flex-1 gap-2"
                    >
                      <Icon name="Bookmark" size={16} className={isSaved ? 'fill-current' : ''} />
                      <span>{isSaved ? 'Guardado' : 'Guardar'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="flex-1 gap-2"
                    >
                      <Icon name="Share2" size={16} />
                      <span>Compartir</span>
                    </Button>
                  </div>
                </div>

                {/* Descripción */}
                <div className="px-4 py-3 border-b border-border">
                  <p className={`text-sm text-foreground whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                    {video.description}
                  </p>
                  {video.description.length > 150 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-sm text-primary hover:text-primary/80 font-medium mt-2"
                    >
                      {showFullDescription ? 'Mostrar menos' : 'Mostrar más'}
                    </button>
                  )}

                  {video.tags && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {video.tags.map((tag, index) => (
                        <Link
                          key={index}
                          to={`/search?tag=${tag}`}
                          className="text-xs text-primary hover:text-primary/80 font-medium"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Videos Relacionados - Lista Vertical Infinita */}
                <div className="py-3">
                  <h3 className="px-4 text-lg font-semibold text-foreground mb-3">
                    Videos relacionados
                  </h3>
                  <div className="space-y-2">
                    {relatedVideos.map((relatedVideo) => (
                      <Link
                        key={relatedVideo.id}
                        to={`/video/${relatedVideo.id}`}
                        className="flex gap-3 px-4 py-2 hover:bg-muted transition-colors"
                        onClick={() => window.scrollTo(0, 0)}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-40 flex-shrink-0 aspect-video bg-muted rounded-lg overflow-hidden">
                          <img
                            src={relatedVideo.thumbnail}
                            alt={relatedVideo.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                            {Math.floor(relatedVideo.duration / 60)}:{(relatedVideo.duration % 60).toString().padStart(2, '0')}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                            {relatedVideo.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-1">
                            {relatedVideo.creator.name}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground space-x-1">
                            <span>{formatNumber(relatedVideo.views)} vistas</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Mensaje de fin */}
                  {relatedVideos.length > 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Has visto todos los videos relacionados
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/dashboard')}
                        className="mt-3"
                      >
                        Explorar más videos
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            /* ===============================
               LAYOUT DESKTOP (Original)
               =============================== */
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* COLUMNA PRINCIPAL - VIDEO Y DETALLES */}
                <div className="flex-1 min-w-0">
                  
                  <div className="mb-4">
                    <VideoPlayer
                      videoUrl={video.videoUrl}
                      thumbnailUrl={video.thumbnail}
                      autoPlay={true}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleVideoEnded}
                      className="w-full aspect-video"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground mb-2">
                        {video.title}
                      </h1>
                      
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Icon name="Eye" size={16} />
                            <span>{formatNumber(localViews)} visualizaciones</span>
                          </div>
                          <span>•</span>
                          <span>{formatDate(video.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant={isLiked ? 'default' : 'outline'}
                            size="sm"
                            onClick={handleLike}
                            className="gap-2"
                          >
                            <Icon name={isLiked ? 'Heart' : 'Heart'} size={16} className={isLiked ? 'fill-current' : ''} />
                            <span>{formatNumber(localLikes)}</span>
                          </Button>

                          <Button
                            variant={isSaved ? 'default' : 'outline'}
                            size="sm"
                            onClick={handleSave}
                          >
                            <Icon name={isSaved ? 'Bookmark' : 'Bookmark'} size={16} className={isSaved ? 'fill-current' : ''} />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShare}
                          >
                            <Icon name="Share2" size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-card border border-border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <Link 
                          to={`/profile/${video.creator.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                            {video.creator.avatar ? (
                              <img 
                                src={video.creator.avatar} 
                                alt={video.creator.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                                {video.creator.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground truncate">
                                {video.creator.name}
                              </h3>
                              {video.creator.isVerified && (
                                <Icon name="BadgeCheck" size={16} color="var(--color-primary)" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              @{video.creator.username}
                            </p>
                          </div>
                        </Link>

                        {user?.id !== video.creator.id && (
                          <Button
                            variant={isFollowing ? 'outline' : 'default'}
                            size="sm"
                            onClick={handleFollow}
                            className="flex-shrink-0"
                          >
                            <Icon name={isFollowing ? 'UserCheck' : 'UserPlus'} size={16} className="mr-2" />
                            {isFollowing ? 'Siguiendo' : 'Seguir'}
                          </Button>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <p className={`text-sm text-foreground whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                          {video.description}
                        </p>
                        {video.description.length > 150 && (
                          <button
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            className="text-sm text-primary hover:text-primary/80 font-medium mt-2"
                          >
                            {showFullDescription ? 'Mostrar menos' : 'Mostrar más'}
                          </button>
                        )}

                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {video.tags.map((tag, index) => (
                              <Link
                                key={index}
                                to={`/search?tag=${tag}`}
                                className="text-xs text-primary hover:text-primary/80 font-medium"
                              >
                                #{tag}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border border-border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">
                          Comentarios ({formatNumber(video.comments)})
                        </h3>
                      </div>
                      <div className="text-center py-12 text-muted-foreground">
                        <Icon name="MessageSquare" size={32} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Los comentarios estarán disponibles próximamente</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* SIDEBAR - VIDEOS RELACIONADOS */}
                <div className="lg:w-96 flex-shrink-0">
                  <div className="lg:sticky lg:top-32">
                    <RelatedVideosSidebar
                      videos={relatedVideos}
                      currentVideoId={videoId}
                      autoplayEnabled={true}
                      onVideoSelect={(selectedVideo) => {
                        navigate(`/video/${selectedVideo.id}`);
                        window.scrollTo(0, 0);
                      }}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>

        {/* ===============================
            MINI-PLAYER FLOTANTE (OPCIONAL - MÓVIL)
            =============================== */}
        {isMobile && showMiniPlayer && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-black shadow-2xl border-t border-border">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-16 aspect-video bg-muted rounded overflow-hidden flex-shrink-0">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-white truncate">
                    {video.title}
                  </h4>
                  <p className="text-xs text-gray-400 truncate">
                    {video.creator.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Icon name="Maximize2" size={20} />
                </button>
                <button
                  onClick={() => setShowMiniPlayer(false)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VideoPlayerPage;
