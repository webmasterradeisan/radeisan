// src/pages/reels/index.jsx
// ✅ CORREGIDO: Carga el video específico cuando viene de carrusel
import React, { useState, useEffect, useCallback } from 'react';
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
  const [initialVideoLoaded, setInitialVideoLoaded] = useState(false);

  console.log('🎬 ReelsPage renderizada:', {
    userId: user?.id,
    videosCount: videos.length,
    loading,
    selectedReelId,
    idParam: searchParams.get('id'),
    startParam: searchParams.get('start'),
    initialVideoLoaded
  });

  // ===============================
  // ✅ DETERMINAR ORIENTACIÓN DEL VIDEO
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
  // ✅ PROCESAR VIDEOS CON DATOS DE USUARIOS
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
  // ✅ CARGAR VIDEO ESPECÍFICO POR ID
  // ===============================
  const loadSpecificVideo = useCallback(async (videoId) => {
    try {
      console.log('🎯 loadSpecificVideo: Cargando video específico:', videoId);

      // Cargar el video específico
      const { data: videoData, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('is_published', true)
        .single();

      if (fetchError) {
        console.error('❌ Error Supabase al cargar video específico:', fetchError);
        return null;
      }

      if (!videoData) {
        console.error('❌ Video específico no encontrado en BD:', videoId);
        return null;
      }

      console.log('✅ Video específico obtenido de BD:', {
        id: videoData.id,
        title: videoData.title,
        width: videoData.width,
        height: videoData.height,
        orientation: videoData.orientation
      });

      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, username, avatar_url')
        .eq('id', videoData.user_id)
        .single();

      const videoWithProfile = {
        ...videoData,
        user_profiles: profile || null
      };

      const processed = processVideos([videoWithProfile])[0];
      
      console.log('✅ Video específico procesado:', {
        id: processed.id,
        title: processed.title,
        orientation: processed.orientation,
        isVertical: processed.orientation === 'vertical'
      });

      return processed;
    } catch (err) {
      console.error('💥 Error en loadSpecificVideo:', err);
      return null;
    }
  }, [processVideos]);

  // ===============================
  // ✅ CARGAR VIDEOS (SOLO VERTICALES)
  // ===============================
  const loadVideos = useCallback(async (pageNum = 0, reset = false, specificVideoId = null) => {
    try {
      if (reset) {
        setLoading(true);
        setVideos([]);
        setPage(0);
        setHasMore(true);
        setError(null);
        setInitialVideoLoaded(false);
      }

      console.log('🎬 Cargando reels:', { pageNum, reset, specificVideoId });

      let finalVideos = [];

      // ✅ SI HAY UN VIDEO ESPECÍFICO, CARGARLO PRIMERO
      if (specificVideoId && !initialVideoLoaded) {
        const specificVideo = await loadSpecificVideo(specificVideoId);
        
        if (specificVideo && specificVideo.orientation === 'vertical') {
          console.log('✅ Video específico es vertical, agregándolo primero');
          finalVideos.push(specificVideo);
          setInitialVideoLoaded(true);
        } else if (specificVideo) {
          console.warn('⚠️ Video específico NO es vertical, ignorándolo');
        }
      }

      // ✅ CARGAR VIDEOS NORMALES
      const ITEMS_PER_PAGE = 20;
      let query = supabase
        .from('videos')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Si ya cargamos un video específico, excluirlo de los resultados
      if (specificVideoId && finalVideos.length > 0) {
        query = query.neq('id', specificVideoId);
      }

      const { data: videoData, error: fetchError } = await query
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      if (fetchError) {
        console.error('❌ Error fetching videos:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('✅ Videos obtenidos:', videoData?.length || 0);

      // Obtener perfiles de usuarios
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

      // Combinar videos con perfiles
      const videosWithProfiles = (videoData || []).map(video => ({
        ...video,
        user_profiles: userProfilesMap[video.user_id] || null
      }));

      const processedVideos = processVideos(videosWithProfiles);

      // Filtrar SOLO videos verticales
      const reelsOnly = processedVideos.filter(v => v.orientation === 'vertical');

      console.log('✅ Reels filtrados:', {
        total: processedVideos.length,
        reels: reelsOnly.length,
        withSpecific: finalVideos.length
      });

      // Combinar video específico + resto de videos
      finalVideos = [...finalVideos, ...reelsOnly];

      if (reset) {
        setVideos(finalVideos);
      } else {
        setVideos(prev => [...prev, ...finalVideos]);
      }

      setHasMore((videoData || []).length === ITEMS_PER_PAGE);
      setPage(pageNum);

    } catch (err) {
      console.error('💥 Error en loadVideos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [processVideos, loadSpecificVideo, initialVideoLoaded]);

  // ===============================
  // ✅ CARGAR VIDEOS AL MONTAR - FIXED (Soporta ?id= y ?videoId=)
  // ===============================
  useEffect(() => {
    // Leer el parámetro ID directamente y SÍNCRONAMENTE
    const urlParams = new URLSearchParams(window.location.search);
    
    // ✅ SOPORTAR AMBOS: ?id= y ?videoId= (por compatibilidad)
    const idParam = urlParams.get('id') || urlParams.get('videoId');
    const startParam = urlParams.get('start');
    
    console.log('🎯 Montando ReelsPage - Params capturados síncronamente:', { 
      idParam, 
      startParam,
      fullUrl: window.location.href,
      allParams: Object.fromEntries(urlParams.entries())
    });
    
    if (idParam) {
      console.log('✅ ID detectado, estableciendo selectedReelId:', idParam);
      setSelectedReelId(idParam);
      console.log('🎯 Llamando loadVideos CON ID específico:', idParam);
      loadVideos(0, true, idParam);
    } else {
      console.log('🎯 Sin ID, cargando videos normalmente');
      loadVideos(0, true, null);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  // ===============================
  // ✅ ACTUALIZAR selectedReelId cuando cambien los params (navegación)
  // ===============================
  useEffect(() => {
    // ✅ SOPORTAR AMBOS: ?id= y ?videoId=
    const idParam = searchParams.get('id') || searchParams.get('videoId');
    const startParam = searchParams.get('start');

    if (videos.length === 0) return;

    console.log('🔍 Actualizando selectedReelId desde params:', {
      idParam,
      startParam,
      videosCount: videos.length,
      currentSelectedReelId: selectedReelId
    });

    if (idParam && idParam !== selectedReelId) {
      console.log('✅ Actualizando selectedReelId a:', idParam);
      setSelectedReelId(idParam);
    } else if (startParam && !idParam) {
      const index = parseInt(startParam, 10);
      if (!isNaN(index) && index >= 0 && videos[index]) {
        const videoId = videos[index].id;
        console.log('✅ Actualizando selectedReelId desde índice:', { index, videoId });
        setSelectedReelId(videoId);
      }
    }
  }, [searchParams, videos, selectedReelId]);

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

      <div className="relative h-[calc(100vh-64px)] md:h-screen bg-black overflow-hidden">
        <ReelsContainer
          videos={videos}
          selectedReelId={selectedReelId}
          onLoadMore={handleLoadMore}
          onPointsEarned={handlePointsEarned}
          hasMore={hasMore}
          loading={loading}
        />

        {/* 🐛 DEBUG INFO */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-xs z-50 border border-white/20">
            <div className="text-green-400 font-bold mb-1">✅ DEBUG ReelsPage</div>
            <div>📹 videos: {videos.length}</div>
            <div>🎯 selectedReelId: {selectedReelId || 'null'}</div>
            <div>🔄 loading: {loading.toString()}</div>
            <div>⚡ hasMore: {hasMore.toString()}</div>
            <div>📄 page: {page}</div>
            <div>🆔 id param: {searchParams.get('id') || 'none'}</div>
            <div>🆔 videoId param: {searchParams.get('videoId') || 'none'}</div>
            <div>📍 start param: {searchParams.get('start') || 'none'}</div>
            <div>🎬 initialLoaded: {initialVideoLoaded.toString()}</div>
            {videos.length > 0 && (
              <>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <div>📹 Primer video:</div>
                  <div className="ml-2">ID: {videos[0]?.id?.slice(0, 8)}</div>
                  <div className="ml-2">Título: {videos[0]?.title?.slice(0, 20)}</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ReelsPage;
