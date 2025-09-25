// src/pages/ReelPlayer.jsx
// Página wrapper para el player individual de reels

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReelsPlayerMobile from './video-feed-dashboard/components/ReelsPlayerMobile';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';

const ReelPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [videos, setVideos] = useState([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPoints, setUserPoints] = useState(0);

  // ===============================
  // OBTENER DATOS DESDE LOCATION STATE O FETCH
  // ===============================
  useEffect(() => {
    const loadReelData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Si viene desde ReelsFeedMobile, usar datos pasados por state
        if (location.state?.videos && location.state?.currentIndex !== undefined) {
          const { videos: stateVideos, currentIndex } = location.state;
          setVideos(stateVideos);
          setInitialIndex(currentIndex);
          setLoading(false);
          return;
        }

        // Si no, hacer fetch individual del reel y cargar contexto
        await fetchReelWithContext(id);
        
      } catch (err) {
        console.error('Error loading reel:', err);
        setError('Error al cargar el reel');
        setLoading(false);
      }
    };

    if (id) {
      loadReelData();
    } else {
      setError('ID de reel no válido');
      setLoading(false);
    }
  }, [id, location.state]);

  // ===============================
  // FETCH REEL INDIVIDUAL + CONTEXTO
  // ===============================
  const fetchReelWithContext = async (reelId) => {
    try {
      // 1. Buscar el reel específico
      const { data: targetReel, error: reelError } = await supabase
        .from('videos')
        .select(`
          *,
          creator:profiles(id, name, username, avatar_url)
        `)
        .eq('id', reelId)
        .eq('orientation', 'vertical')
        .single();

      if (reelError) {
        throw new Error('Reel no encontrado');
      }

      // 2. Obtener contexto de reels similares/cercanos
      const { data: contextVideos, error: contextError } = await supabase
        .from('videos')
        .select(`
          *,
          creator:profiles(id, name, username, avatar_url)
        `)
        .eq('orientation', 'vertical')
        .order('created_at', { ascending: false })
        .limit(50);

      if (contextError) {
        throw contextError;
      }

      // 3. Procesar y estructurar datos
      const processedVideos = contextVideos.map(video => ({
        id: video.id,
        title: video.title || 'Video sin título',
        description: video.description || '',
        thumbnail: video.thumbnail_url,
        videoUrl: video.video_url,
        duration: video.duration || 30,
        views: video.views || 0,
        likes: video.likes || 0,
        comments: video.comments_count || 0,
        pointsReward: 25, // Bonus para reels
        creator: {
          id: video.creator?.id || 'unknown',
          name: video.creator?.name || 'Usuario Anónimo',
          username: video.creator?.username || '@anonimo',
          avatar: video.creator?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.creator?.name || 'Anónimo')}&background=6366f1&color=ffffff`
        },
        category: video.category || 'entertainment',
        tags: video.tags ? (Array.isArray(video.tags) ? video.tags : []) : [],
        timeAgo: formatTimeAgo(video.created_at),
        isLiked: false,
        isSaved: false,
        orientation: video.orientation
      }));

      // 4. Encontrar índice del reel target
      const targetIndex = processedVideos.findIndex(v => v.id === reelId);
      
      if (targetIndex === -1) {
        // Si no se encuentra en el contexto, agregarlo al inicio
        const processedTarget = {
          id: targetReel.id,
          title: targetReel.title || 'Video sin título',
          description: targetReel.description || '',
          thumbnail: targetReel.thumbnail_url,
          videoUrl: targetReel.video_url,
          duration: targetReel.duration || 30,
          views: targetReel.views || 0,
          likes: targetReel.likes || 0,
          comments: targetReel.comments_count || 0,
          pointsReward: 25,
          creator: {
            id: targetReel.creator?.id || 'unknown',
            name: targetReel.creator?.name || 'Usuario Anónimo',
            username: targetReel.creator?.username || '@anonimo',
            avatar: targetReel.creator?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetReel.creator?.name || 'Anónimo')}&background=6366f1&color=ffffff`
          },
          category: targetReel.category || 'entertainment',
          tags: targetReel.tags ? (Array.isArray(targetReel.tags) ? targetReel.tags : []) : [],
          timeAgo: formatTimeAgo(targetReel.created_at),
          isLiked: false,
          isSaved: false,
          orientation: targetReel.orientation
        };

        setVideos([processedTarget, ...processedVideos]);
        setInitialIndex(0);
      } else {
        setVideos(processedVideos);
        setInitialIndex(targetIndex);
      }

      setLoading(false);

    } catch (err) {
      console.error('Error fetching reel context:', err);
      setError(err.message || 'Error al cargar el reel');
      setLoading(false);
    }
  };

  // ===============================
  // OBTENER PUNTOS DEL USUARIO
  // ===============================
  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserPoints(data.points || 0);
        }
      } catch (err) {
        console.error('Error fetching user points:', err);
      }
    };

    fetchUserPoints();
  }, [user]);

  // ===============================
  // ACTUALIZAR PUNTOS
  // ===============================
  const handlePointsEarned = async (points) => {
    if (!user?.id) return;

    try {
      const newTotal = userPoints + points;
      setUserPoints(newTotal);

      // Actualizar en base de datos
      const { error } = await supabase
        .from('profiles')
        .update({ points: newTotal })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating points:', error);
        // Revertir en caso de error
        setUserPoints(userPoints);
      }
    } catch (err) {
      console.error('Error in handlePointsEarned:', err);
      setUserPoints(userPoints);
    }
  };

  // ===============================
  // FORMATEAR TIEMPO
  // ===============================
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'hace un momento';
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)}d`;
    return `hace ${Math.floor(diffInSeconds / 2592000)}m`;
  };

  // ===============================
  // MOCK LOAD MORE
  // ===============================
  const handleLoadMore = async () => {
    // Implementar carga de más videos si es necesario
    console.log('Load more reels...');
  };

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading) {
    return (
      <>
        <Helmet>
          <title>Cargando Reel | RADEISAN</title>
        </Helmet>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-white text-lg">Cargando reel...</p>
          </div>
        </div>
      </>
    );
  }

  // ===============================
  // ERROR STATE
  // ===============================
  if (error) {
    return (
      <>
        <Helmet>
          <title>Reel No Encontrado | RADEISAN</title>
        </Helmet>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="text-center px-4">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="AlertCircle" size={32} color="#ef4444" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Reel no encontrado
            </h3>
            <p className="text-gray-300 mb-6 max-w-sm">
              {error === 'Reel no encontrado' 
                ? 'Este reel podría haber sido eliminado o no estar disponible.'
                : error
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
              >
                <Icon name="Home" size={16} className="mr-2" />
                Ir al Dashboard
              </Button>
              <Button 
                onClick={() => navigate(-1)}
              >
                <Icon name="ArrowLeft" size={16} className="mr-2" />
                Volver
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===============================
  // RENDER PLAYER
  // ===============================
  const currentVideo = videos[initialIndex];
  
  return (
    <>
      <Helmet>
        <title>
          {currentVideo?.title ? `${currentVideo.title} - Reel` : 'Reel'} | RADEISAN
        </title>
        <meta 
          name="description" 
          content={
            currentVideo?.description 
              ? `${currentVideo.description} - Reel de ${currentVideo.creator?.name} en RADEISAN`
              : 'Descubre reels increíbles en RADEISAN'
          } 
        />
        
        {/* Meta tags para compartir en redes sociales */}
        <meta property="og:title" content={currentVideo?.title || 'Reel en RADEISAN'} />
        <meta property="og:description" content={currentVideo?.description || 'Descubre contenido increíble'} />
        <meta property="og:image" content={currentVideo?.thumbnail} />
        <meta property="og:url" content={`${window.location.origin}/reel/${id}`} />
        <meta property="og:type" content="video.other" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={currentVideo?.title || 'Reel en RADEISAN'} />
        <meta name="twitter:description" content={currentVideo?.description || 'Descubre contenido increíble'} />
        <meta name="twitter:image" content={currentVideo?.thumbnail} />
      </Helmet>

      <ReelsPlayerMobile
        videos={videos}
        initialIndex={initialIndex}
        onLoadMore={handleLoadMore}
        onPointsEarned={handlePointsEarned}
        hasMore={true}
        loading={false}
      />
    </>
  );
};

export default ReelPlayer;
