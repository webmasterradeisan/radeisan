// src/pages/video-feed-dashboard/index.jsx
// VideoFeedDashboard con FILTRADO POR ORIENTACIÓN (Reels/Videos/Todo)

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import FilterChips from './components/FilterChips';
import VideoFeedGrid from './components/VideoFeedGrid';
import TrendingSidebar from './components/TrendingSidebar';
import PointsFloatingAnimation from './components/PointsFloatingAnimation';
import PullToRefresh from './components/PullToRefresh';
import PointsBalanceIndicator from '../../components/ui/PointsBalanceIndicator';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// ===============================
// CONSTANTES DE ORIENTACIÓN
// ===============================
const VIDEO_ORIENTATIONS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  SQUARE: 'square'
};

const ORIENTATION_TABS = [
  {
    id: 'all',
    label: 'Todo',
    icon: 'Grid3X3',
    description: 'Todos los videos',
    color: '#6B7280'
  },
  {
    id: VIDEO_ORIENTATIONS.VERTICAL,
    label: 'Reels',
    icon: 'Smartphone',
    description: 'Videos verticales',
    color: '#EF4444'
  },
  {
    id: VIDEO_ORIENTATIONS.HORIZONTAL,
    label: 'Videos',
    icon: 'Monitor',
    description: 'Videos horizontales',
    color: '#3B82F6'
  }
];

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar videos con integración real de Supabase
const useVideos = () => {
  const { user: currentUser } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [orientationStats, setOrientationStats] = useState({
    total: 0,
    horizontal: 0,
    vertical: 0,
    square: 0
  });

  const VIDEOS_PER_PAGE = 12;

  // Función para obtener videos de Supabase - ACTUALIZADA CON ORIENTATION
  const fetchVideosBasic = async (pageNum = 0, category = 'all') => {
    try {
      console.log(`📡 Fetching videos - Page: ${pageNum}, Category: ${category}`);
      
      let query = supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          video_url,
          thumbnail_url,
          category,
          tags,
          duration_seconds,
          views_count,
          likes_count,
          comments_count,
          created_at,
          user_id,
          orientation,
          aspect_ratio,
          video_width,
          video_height
        `)
        .order('created_at', { ascending: false })
        .range(pageNum * VIDEOS_PER_PAGE, (pageNum + 1) * VIDEOS_PER_PAGE - 1);

      if (category !== 'all' && category !== 'todos') {
        query = query.eq('category', category);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        console.error('❌ Error fetching videos:', fetchError);
        throw fetchError;
      }

      console.log(`✅ Fetched ${data?.length || 0} videos`);
      
      // Calcular estadísticas de orientación
      if (data) {
        const stats = {
          total: data.length,
          horizontal: data.filter(v => v.orientation === 'horizontal').length,
          vertical: data.filter(v => v.orientation === 'vertical').length,
          square: data.filter(v => v.orientation === 'square').length
        };
        setOrientationStats(stats);
        console.log('📊 Orientation stats:', stats);
      }

      return {
        videos: data || [],
        hasMore: data?.length === VIDEOS_PER_PAGE
      };

    } catch (err) {
      console.error('❌ Error in fetchVideosBasic:', err);
      throw err;
    }
  };

  // Cargar videos iniciales
  const loadVideos = useCallback(async (category = 'all') => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchVideosBasic(0, category);
      setVideos(result.videos);
      setHasMore(result.hasMore);
      setPage(0);
    } catch (err) {
      setError(err.message);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar más videos (paginación)
  const loadMore = useCallback(async (category = 'all') => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      const nextPage = page + 1;
      const result = await fetchVideosBasic(nextPage, category);
      
      setVideos(prev => [...prev, ...result.videos]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more videos:', err);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading]);

  // Refrescar videos
  const refresh = useCallback(async (category = 'all') => {
    await loadVideos(category);
  }, [loadVideos]);

  // Cargar videos al montar
  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  return {
    videos,
    loading,
    error,
    hasMore,
    orientationStats,
    loadMore,
    refresh
  };
};

// Hook para manejar puntos del usuario
const useUserPoints = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (user?.id) {
      const fetchPoints = async () => {
        const { data } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setPoints(data.points);
        }
      };
      fetchPoints();
    }
  }, [user]);

  const addPoints = (amount) => {
    setPoints(prev => prev + amount);
  };

  return { points, addPoints };
};

// ===============================
// DATOS DE FILTROS
// ===============================
const filterCategories = [
  { id: 'todos', label: 'Todos', icon: 'Grid3X3' },
  { id: 'educacion', label: 'Educación', icon: 'GraduationCap' },
  { id: 'entretenimiento', label: 'Entretenimiento', icon: 'Tv' },
  { id: 'tecnologia', label: 'Tecnología', icon: 'Cpu' },
  { id: 'negocios', label: 'Negocios', icon: 'Briefcase' },
  { id: 'deportes', label: 'Deportes', icon: 'Zap' },
  { id: 'musica', label: 'Música', icon: 'Music' },
  { id: 'cocina', label: 'Cocina', icon: 'ChefHat' },
  { id: 'viajes', label: 'Viajes', icon: 'MapPin' }
];

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const VideoFeedDashboard = () => {
  const { user } = useAuth();
  const { videos, loading, error, hasMore, orientationStats, loadMore, refresh } = useVideos();
  const { points: userPoints, addPoints } = useUserPoints();

  const [filteredVideos, setFilteredVideos] = useState([]);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [activeOrientation, setActiveOrientation] = useState('all');
  const [layout, setLayout] = useState('grid');
  const [pointsAnimation, setPointsAnimation] = useState(null);

  // Filtrar videos cuando cambian los datos, filtro o orientación
  useEffect(() => {
    let filtered = videos;

    // Filtrar por categoría
    if (activeFilter !== 'todos' && activeFilter !== 'all') {
      filtered = filtered.filter(video => video.category === activeFilter);
    }

    // 🎯 FILTRAR POR ORIENTACIÓN (NUEVO)
    if (activeOrientation !== 'all') {
      filtered = filtered.filter(video => {
        // Si no tiene orientación, asumir horizontal por defecto
        const videoOrientation = video.orientation || 'horizontal';
        return videoOrientation === activeOrientation;
      });
    }

    setFilteredVideos(filtered);
    console.log(`🔍 Filtered: ${filtered.length} videos (Orientation: ${activeOrientation}, Category: ${activeFilter})`);
  }, [videos, activeFilter, activeOrientation]);

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleFilterChange = useCallback((filterId) => {
    console.log(`🔄 Cambiando filtro a: ${filterId}`);
    setActiveFilter(filterId);
    refresh(filterId);
  }, [refresh]);

  const handleOrientationChange = useCallback((orientationId) => {
    console.log(`🎬 Cambiando orientación a: ${orientationId}`);
    setActiveOrientation(orientationId);
  }, []);

  const handleLayoutChange = useCallback(() => {
    setLayout(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleVideoInteraction = useCallback((videoId, action, pointsEarned) => {
    console.log(`🎯 Video ${videoId} - ${action} (+${pointsEarned} pts)`);
    
    if (pointsEarned > 0) {
      addPoints(pointsEarned);
      
      setPointsAnimation({
        id: Date.now(),
        points: pointsEarned,
        position: { x: Math.random() * 100, y: 20 }
      });

      setTimeout(() => setPointsAnimation(null), 2000);
    }
  }, [addPoints]);

  const handleRefresh = useCallback(async () => {
    await refresh(activeFilter);
  }, [refresh, activeFilter]);

  // ===============================
  // RENDER
  // ===============================

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
            <Icon name="AlertCircle" size={48} color="var(--color-destructive)" className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar videos</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Feed de Videos - Radeisan</title>
        <meta name="description" content="Descubre contenido increíble en Radeisan" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="container mx-auto px-4 py-6">
            
            {/* 🎯 PESTAÑAS DE ORIENTACIÓN (NUEVO) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Tipo de Contenido
                </h2>
                <PointsBalanceIndicator points={userPoints} />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {ORIENTATION_TABS.map(tab => {
                  const isActive = activeOrientation === tab.id;
                  const count = tab.id === 'all' 
                    ? orientationStats.total 
                    : orientationStats[tab.id] || 0;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleOrientationChange(tab.id)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                        whitespace-nowrap transition-all duration-200
                        ${isActive 
                          ? 'bg-primary text-primary-foreground shadow-md' 
                          : 'bg-card text-muted-foreground hover:bg-muted'
                        }
                      `}
                      style={isActive ? { backgroundColor: tab.color } : {}}
                    >
                      <Icon name={tab.icon} size={18} />
                      <span>{tab.label}</span>
                      <span className="text-xs opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtros de Categoría */}
            <FilterChips
              filters={filterCategories}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
            />

            {/* Grid de Videos */}
            <div className="lg:grid lg:grid-cols-12 lg:gap-6">
              <div className="lg:col-span-9">
                <VideoFeedGrid
                  videos={filteredVideos}
                  layout={layout}
                  onLayoutChange={handleLayoutChange}
                  onVideoInteraction={handleVideoInteraction}
                  onLoadMore={() => loadMore(activeFilter)}
                  hasMore={hasMore}
                  loading={loading}
                />
              </div>

              <div className="hidden lg:block lg:col-span-3">
                <TrendingSidebar />
              </div>
            </div>

            {/* Animación de puntos */}
            {pointsAnimation && (
              <PointsFloatingAnimation
                points={pointsAnimation.points}
                position={pointsAnimation.position}
              />
            )}
          </div>
        </PullToRefresh>

        <PrimaryNavigation />
      </div>
    </>
  );
};

export default VideoFeedDashboard;
