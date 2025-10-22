// src/pages/reels/index.jsx
// ✅ ACTUALIZADO: Registra vistas cuando un reel se reproduce
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ReelsContainer from '../video-feed-dashboard/components/ReelsContainer';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const ReelsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedReelId, setSelectedReelId] = useState(null);
  
  // ✅ NUEVO: Tracking de vistas registradas
  const viewedReels = useRef(new Set());

  console.log('🎬 ReelsPage renderizada:', {
    userId: user?.id,
    videosCount: videos.length,
    loading,
    selectedReelId,
    viewsRegistered: viewedReels.current.size
  });

  // ===============================
  // ✅ FUNCIÓN: INCREMENTAR VISTAS (Como VideoPlayerPage)
  // ===============================
  const incrementViewCount = useCallback(async (videoId) => {
    // Evitar registrar vista duplicada en la misma sesión
    if (viewedReels.current.has(videoId)) {
      console.log('⏭️ Vista ya registrada para:', videoId);
      return;
    }

    try {
      console.log('📊 Registrando vista para reel:', videoId);
      
      // Llamar a la función RPC de Supabase (igual que VideoPlayerPage)
      const { error: rpcError } = await supabase.rpc('increment_video_views', { 
        video_id: videoId 
      });

      if (rpcError) {
        console.error('❌ Error incrementando vistas:', rpcError);
        return;
      }

      // Marcar como visto
      viewedReels.current.add(videoId);
      
      // Actualizar contador local en el estado
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, views: (v.views || 0) + 1 } 
          : v
      ));

      console.log('✅ Vista registrada exitosamente para:', videoId);
      
    } catch (err) {
      console.error('💥 Error crítico registrando vista:', err);
    }
  }, []);

  // ===============================
  // ✅ NUEVO: Detectar cambio de reel activo y registrar vista
  // ===============================
  useEffect(() => {
    if (!selectedReelId || videos.length === 0) return;

    // Buscar el video actual
    const currentVideo = videos.find(v => v.id === selectedReelId);
    
    if (!currentVideo) {
      console.warn('⚠️ No se encontró el video con ID:', selectedReelId);
      return;
    }

    console.log('🎯 Reel activo cambió:', {
      id: selectedReelId,
      title: currentVideo.title,
      viewsActuales: currentVideo.views
    });

    // Registrar vista después de 1 segundo (para evitar swipes rápidos)
    const viewTimer = setTimeout(() => {
      incrementViewCount(selectedReelId);
    }, 1000);

    return () => clearTimeout(viewTimer);
  }, [selectedReelId, videos, incrementViewCount]);

  // ===============================
  // ✅ CALLBACK: ReelsContainer notifica cambio de reel activo
  // ===============================
  const handleReelChange = useCallback((newReelId) => {
    console.log('🔄 Cambio de reel detectado:', newReelId);
    setSelectedReelId(newReelId);
  }, []);

  // ===============================
  // DETERMINAR ORIENTACIÓN DEL VIDEO
  // ===============================
  const determineOrientation = useCallback((video) => {
    if (video.orientation) return video.orientation;

    if (video.width && video.height) {
      const aspectRatio = video.width / video.height;
      if (aspectRatio <= 0.8) return 'vertical';
      if (aspectRatio >= 1.3) return 'horizontal'; 
      return 'square';
    }

    if (video.video_width && video.video_height) {
      const aspectRatio = video.video_width / video.video_height;
      if (aspectRatio <= 0.8) return 'vertical';
      if (aspectRatio >= 1.3) return 'horizontal'; 
      return 'square';
    }
    
    return 'vertical';
  }, []);

  // ===============================
  // PROCESAR VIDEOS CON DATOS DE USUARIOS
  // ===============================
  const processVideos = useCallback((rawVideos) => {
    return rawVideos.map(video => {
      const username = video.user_profiles?.username || 'usuario';
      const avatarUrl = video.user_profiles?.avatar_url || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=ffffff&size=128`;

      return {
        ...video,
        orientation: determineOrientation(video),
        views: video.views_count || video.views || 0,
        likes: video.likes_count || video.likes || 0,
        comments: video.comments_count || video.comments || 0,
        duration: video.duration_seconds || video.duration || 30,
        thumbnail: video.thumbnail_url || video.thumbnail || '/api/placeholder/320/180',
        videoUrl: video.video_url || video.videoUrl,
        creator: {
          id: video.user_profiles?.id || video.user_id,
          username: video.user_profiles?.username || `user_${video.user_id?.substring(0, 8)}`,
          name: video.user_profiles?.username || 'usuario',
          avatar: avatarUrl
        }
      };
    });
  }, [determineOrientation]);

  // ===============================
  // CARGAR VIDEOS (SOLO VERTICALES)
  // ===============================
  const loadVideos = useCallback(async (pageNum = 0, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setVideos([]);
        setPage(0);
        setHasMore(true);
        setError(null);
        viewedReels.current.clear(); // Limpiar tracking de vistas
      }

      console.log('🎬 Cargando reels:', { pageNum, reset });

      const ITEMS_PER_PAGE = 20;
      let query = supabase
        .from('videos')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const { data: videoData, error: fetchError } = await query
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      if (fetchError) {
        console.error('❌ Error fetching videos:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('✅ Videos obtenidos:', videoData?.length || 0);

      const userIds = [...new Set(videoData?.map(v => v.user_id).filter(Boolean))];
      let userProfilesMap = {};
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (!profilesError && profiles) {
          userProfilesMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      const videosWithProfiles = (videoData || []).map(video => ({
        ...video,
        user_profiles: userProfilesMap[video.user_id] || null
      }));

      const processedVideos = processVideos(videosWithProfiles);
      const reelsOnly = processedVideos.filter(v => v.orientation === 'vertical');

      console.log('✅ Reels filtrados:', {
        total: processedVideos.length,
        reels: reelsOnly.length
      });

      if (reset) {
        setVideos(reelsOnly);
      } else {
        setVideos(prev => [...prev, ...reelsOnly]);
      }

      setHasMore((videoData || []).length === ITEMS_PER_PAGE);
      setPage(pageNum);

    } catch (err) {
      console.error('💥 Error en loadVideos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [processVideos]);

  // ===============================
  // CARGAR VIDEOS AL MONTAR
  // ===============================
  useEffect(() => {
    loadVideos(0, true);
  }, [loadVideos]);

  // ===============================
  // LEER PARÁMETROS ?id=... o ?start=X
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;

    const idParam = searchParams.get('id');
    if (idParam) {
      console.log('🎯 ID directo desde URL:', idParam);
      setSelectedReelId(idParam);
      return;
    }

    const startParam = searchParams.get('start');
    if (startParam) {
      const index = parseInt(startParam, 10);
      if (!isNaN(index) && index >= 0 && videos[index]) {
        const videoId = videos[index].id;
        console.log('🎯 Iniciando en reel por índice:', { index, videoId });
        setSelectedReelId(videoId);
      }
    }
  }, [searchParams, videos]);

  // ===============================
  // HANDLERS
  // ===============================
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadVideos(page + 1, false);
    }
  }, [hasMore, loading, page, loadVideos]);

  const handleClose = useCallback(() => {
    console.log('❌ Cerrando página de reels');
    navigate('/dashboard');
  }, [navigate]);

  const handlePointsEarned = useCallback((pointsData) => {
    console.log('⭐ Puntos ganados:', pointsData);
  }, []);

  // ===============================
  // ERROR STATE
  // ===============================
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="AlertCircle" size={32} color="#EF4444" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Error al cargar reels
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => loadVideos(0, true)}>
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Intentar de nuevo
            </Button>
            <Button variant="outline" onClick={handleClose}>
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading && videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Cargando reels...</p>
        </div>
      </div>
    );
  }

  // ===============================
  // EMPTY STATE
  // ===============================
  if (!loading && videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="Smartphone" size={32} color="white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            No hay reels disponibles
          </h3>
          <p className="text-gray-400 mb-6 max-w-sm">
            Sé el primero en crear videos verticales para la comunidad
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/upload')}>
              <Icon name="Plus" size={16} className="mr-2" />
              Crear Reel
            </Button>
            <Button variant="outline" onClick={handleClose}>
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <>
      <Helmet>
        <title>Reels - Videos Verticales | RADEISAN</title>
        <meta name="description" content="Explora videos verticales increíbles en formato fullscreen" />
      </Helmet>

      <div className="relative h-[calc(100vh-64px)] md:h-screen bg-black overflow-hidden">
        
        {/* ✅ REELS CONTAINER CON CALLBACK DE CAMBIO */}
        <ReelsContainer
          videos={videos}
          selectedReelId={selectedReelId}
          onReelChange={handleReelChange}
          onLoadMore={handleLoadMore}
          onPointsEarned={handlePointsEarned}
          hasMore={hasMore}
          loading={loading}
        />

        {/* 🛠️ DEBUG INFO - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-xs z-50 border border-white/20">
            <div className="text-green-400 font-bold mb-1">✅ DEBUG ReelsPage</div>
            <div>📹 videos: {videos.length}</div>
            <div>🎯 selectedReelId: {selectedReelId || 'null'}</div>
            <div>📊 vistas registradas: {viewedReels.current.size}</div>
            <div>🔄 loading: {loading.toString()}</div>
            <div>⚡ hasMore: {hasMore.toString()}</div>
            <div>👤 user: {user?.id?.substring(0, 8) || 'none'}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReelsPage;
