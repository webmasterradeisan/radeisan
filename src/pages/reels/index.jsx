// src/pages/reels/index.jsx
// ✅ PÁGINA FULLSCREEN DE REELS - SIN HEADER (Estilo TikTok/YouTube)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ReelsContainer from '../video-feed-dashboard/components/ReelsContainer';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

/**
 * 📱 PÁGINA FULLSCREEN DE REELS
 * - Sin Header ni navegación
 * - Estilo TikTok/YouTube Shorts
 * - Lee parámetro ?start=X para comenzar en reel específico
 */
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

  console.log('🎬 ReelsPage renderizada:', {
    userId: user?.id,
    videosCount: videos.length,
    loading,
    selectedReelId,
    startParam: searchParams.get('start')
  });

  // ===============================
  // ✅ DETERMINAR ORIENTACIÓN DEL VIDEO
  // ===============================
  const determineOrientation = useCallback((video) => {
    // PRIORIDAD 1: Si tiene campo orientation en BD, usarlo
    if (video.orientation) {
      return video.orientation;
    }

    // PRIORIDAD 2: Si hay dimensiones, usarlas
    if (video.width && video.height) {
      const aspectRatio = video.width / video.height;
      if (aspectRatio <= 0.8) return 'vertical';
      if (aspectRatio >= 1.3) return 'horizontal'; 
      return 'square';
    }

    // PRIORIDAD 3: Si tiene video_width y video_height, usarlos
    if (video.video_width && video.video_height) {
      const aspectRatio = video.video_width / video.video_height;
      if (aspectRatio <= 0.8) return 'vertical';
      if (aspectRatio >= 1.3) return 'horizontal'; 
      return 'square';
    }
    
    // Por defecto, vertical (estamos en página de reels)
    return 'vertical';
  }, []);

  // ===============================
  // ✅ PROCESAR VIDEOS CON DATOS DE USUARIOS
  // ===============================
  const processVideos = useCallback((rawVideos) => {
    return rawVideos.map(video => {
      // Generar avatar con UI Avatars si no existe
      const username = video.user_profiles?.username || 'usuario';
      const avatarUrl = video.user_profiles?.avatar_url || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=ffffff&size=128`;

      return {
        ...video,
        orientation: determineOrientation(video),
        // Normalizar datos
        views: video.views_count || video.views || 0,
        likes: video.likes_count || video.likes || 0,
        comments: video.comments_count || video.comments || 0,
        duration: video.duration_seconds || video.duration || 30,
        thumbnail: video.thumbnail_url || video.thumbnail || '/api/placeholder/320/180',
        // Normalizar videoUrl
        videoUrl: video.video_url || video.videoUrl,
        // Datos del creador
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
  // ✅ CARGAR VIDEOS (SOLO VERTICALES)
  // ===============================
  const loadVideos = useCallback(async (pageNum = 0, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setVideos([]);
        setPage(0);
        setHasMore(true);
        setError(null);
      }

      console.log('🎬 Cargando reels:', { pageNum, reset });

      // ✅ PASO 1: Obtener videos sin JOIN
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

      // ✅ PASO 2: Obtener user_ids únicos
      const userIds = [...new Set(videoData?.map(v => v.user_id).filter(Boolean))];

      // ✅ PASO 3: Obtener perfiles de usuarios
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

      // ✅ PASO 4: Combinar videos con perfiles
      const videosWithProfiles = (videoData || []).map(video => ({
        ...video,
        user_profiles: userProfilesMap[video.user_id] || null
      }));

      const processedVideos = processVideos(videosWithProfiles);

      // ✅ PASO 5: Filtrar SOLO videos verticales
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
  // ✅ CARGAR VIDEOS AL MONTAR
  // ===============================
  useEffect(() => {
    loadVideos(0, true);
  }, [loadVideos]);

  // ===============================
// ✅ LEER PARÁMETROS ?start=X o ?id=... Y CONFIGURAR REEL INICIAL
useEffect(() => {
  if (videos.length === 0) return;

  // PRIORIDAD 1: Si viene ?id=..., usarlo directamente
  const idParam = searchParams.get('id');
  if (idParam) {
    console.log('🎯 ID directo desde URL:', idParam);
    setSelectedReelId(idParam);
    return;
  }

  // PRIORIDAD 2: Si viene ?start=X, convertir índice a ID (backward compatibility)
  const startParam = searchParams.get('start');
  if (startParam) {
    const index = parseInt(startParam, 10);
    if (!isNaN(index) && index >= 0 && videos[index]) {
      const videoId = videos[index].id;
      console.log('🎯 Iniciando en reel por índice:', { index, videoId, title: videos[index].title });
      setSelectedReelId(videoId);
    }
  }
}, [searchParams, videos]);

  // ===============================
  // ✅ HANDLERS
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
    // Aquí podrías actualizar el balance de puntos del usuario
  }, []);

  // ===============================
  // ✅ ERROR STATE
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
  // ✅ LOADING STATE
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
  // ✅ EMPTY STATE
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
  // ✅ RENDER PRINCIPAL - FULLSCREEN
  // ===============================
  return (
    <>
      <Helmet>
        <title>Reels - Videos Verticales | RADEISAN</title>
        <meta name="description" content="Explora videos verticales increíbles en formato fullscreen" />
      </Helmet>

      {/* 
        ✅ CONTENEDOR FULLSCREEN SIN HEADER 
        - position: fixed para ocupar toda la pantalla
        - z-index alto para estar sobre todo
        - bg-black para fondo negro estilo TikTok
      */}
      <div className="relative h-[calc(100vh-64px)] md:h-screen bg-black overflow-hidden">
        
        

        {/* ✅ REELS CONTAINER - FULLSCREEN */}
        <ReelsContainer
          videos={videos}
          selectedReelId={selectedReelId}
          onLoadMore={handleLoadMore}
          onPointsEarned={handlePointsEarned}
          hasMore={hasMore}
          loading={loading}
        />

        {/* 🐛 DEBUG INFO - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-xs z-50 border border-white/20">
            <div className="text-green-400 font-bold mb-1">✅ DEBUG ReelsPage</div>
            <div>📹 videos: {videos.length}</div>
            <div>🎯 selectedReelId: {selectedReelId || 'null'}</div>
            <div>🔄 loading: {loading.toString()}</div>
            <div>⚡ hasMore: {hasMore.toString()}</div>
            <div>📄 page: {page}</div>
            <div>👤 user: {user?.id?.substring(0, 8) || 'none'}</div>
            <div>🔗 start param: {searchParams.get('start') || 'none'}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReelsPage;
