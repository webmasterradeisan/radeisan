// src/pages/video-feed-dashboard/index.jsx
// VideoFeedDashboard con integración real de Supabase
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
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar videos con datos reales de Supabase
const useVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const VIDEOS_PER_PAGE = 12;

  // Obtener videos de Supabase
  const fetchVideos = useCallback(async (pageNum = 0, category = 'all', reset = false) => {
    try {
      setLoading(true);
      setError(null);

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
          points_earned,
          created_at,
          user_profiles!videos_user_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(pageNum * VIDEOS_PER_PAGE, (pageNum + 1) * VIDEOS_PER_PAGE - 1);

      // Aplicar filtro de categoría si no es 'all'
      if (category && category !== 'all' && category !== 'todos') {
        query = query.eq('category', category);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Transformar datos para compatibilidad con componentes existentes
      const transformedVideos = data?.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail_url,
        videoUrl: video.video_url,
        duration: video.duration_seconds,
        views: video.views_count,
        likes: video.likes_count,
        comments: video.comments_count,
        pointsReward: Math.floor(video.duration_seconds / 60) * 5 + 10, // 5 puntos por minuto + base
        creator: {
          id: video.user_profiles?.id,
          name: video.user_profiles?.full_name || 'Usuario Anónimo',
          username: video.user_profiles?.username ? `@${video.user_profiles.username}` : '@anonimo',
          avatar: video.user_profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user_profiles?.full_name || 'U')}&background=6366f1&color=ffffff`
        },
        category: video.category,
        tags: video.tags || [],
        timeAgo: formatTimeAgo(video.created_at),
        isLiked: false, // Se podría consultar likes del usuario
        isSaved: false  // Se podría consultar guardados del usuario
      })) || [];

      if (reset || pageNum === 0) {
        setVideos(transformedVideos);
      } else {
        setVideos(prev => [...prev, ...transformedVideos]);
      }

      // Determinar si hay más videos
      setHasMore(transformedVideos.length === VIDEOS_PER_PAGE);
      setPage(pageNum);

    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar más videos (siguiente página)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchVideos(page + 1);
    }
  }, [loading, hasMore, page, fetchVideos]);

  // Refresh (recargar desde el inicio)
  const refresh = useCallback(async (category = 'all') => {
    await fetchVideos(0, category, true);
  }, [fetchVideos]);

  return {
    videos,
    loading,
    error,
    hasMore,
    fetchVideos,
    loadMore,
    refresh
  };
};

// Hook para manejar puntos del usuario
const useUserPoints = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // Obtener balance de puntos actual
  const fetchPointsBalance = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Llamar a la función de Supabase para obtener balance
      const { data, error } = await supabase
        .rpc('get_user_points_balance', { target_user_id: user.id });

      if (error) throw error;
      setPoints(data || 0);
    } catch (error) {
      console.error('Error fetching points balance:', error);
      setPoints(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Agregar puntos por acción
  const addPoints = useCallback(async (pointsAmount, transactionType, description) => {
    if (!user?.id) return;

    try {
      // Esta función requiere permisos de service_role, se implementará en el backend
      // Por ahora, actualizar localmente
      setPoints(prev => prev + pointsAmount);
    } catch (error) {
      console.error('Error adding points:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPointsBalance();
  }, [fetchPointsBalance]);

  return {
    points,
    loading: loading,
    addPoints,
    refreshBalance: fetchPointsBalance
  };
};

// ===============================
// UTILIDADES
// ===============================

// Formatear tiempo relativo (ej: "hace 2 horas")
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

// Categorías disponibles
const VIDEO_CATEGORIES = [
  { id: 'todos', label: 'Todos', icon: 'Grid3X3' },
  { id: 'entertainment', label: 'Entretenimiento', icon: 'PlayCircle' },
  { id: 'education', label: 'Educación', icon: 'BookOpen' },
  { id: 'business', label: 'Negocios', icon: 'Briefcase' },
  { id: 'lifestyle', label: 'Estilo de vida', icon: 'Heart' },
  { id: 'technology', label: 'Tecnología', icon: 'Smartphone' },
  { id: 'sports', label: 'Deportes', icon: 'Zap' },
  { id: 'music', label: 'Música', icon: 'Music' },
  { id: 'cooking', label: 'Cocina', icon: 'ChefHat' },
  { id: 'travel', label: 'Viajes', icon: 'MapPin' }
];

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const VideoFeedDashboard = () => {
  const { user } = useAuth();
  const { videos, loading, error, hasMore, loadMore, refresh } = useVideos();
  const { points: userPoints, addPoints } = useUserPoints();

  const [filteredVideos, setFilteredVideos] = useState([]);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [layout, setLayout] = useState('grid');
  const [pointsAnimation, setPointsAnimation] = useState(null);

  // Inicializar videos al cargar
  useEffect(() => {
    refresh(activeFilter);
  }, [refresh, activeFilter]);

  // Filtrar videos cuando cambian los datos o filtro
  useEffect(() => {
    if (activeFilter === 'todos' || activeFilter === 'all') {
      setFilteredVideos(videos);
    } else {
      const filtered = videos.filter(video => video.category === activeFilter);
      setFilteredVideos(filtered);
    }
  }, [videos, activeFilter]);

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleFilterChange = useCallback((filterId) => {
    setActiveFilter(filterId);
    refresh(filterId);
  }, [refresh]);

  const handleLayoutChange = useCallback(() => {
    setLayout(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleRefresh = useCallback(async () => {
    await refresh(activeFilter);
  }, [refresh, activeFilter]);

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  const handlePointsEarned = useCallback((earnedPoints) => {
    setPointsAnimation({ points: earnedPoints });
    addPoints(earnedPoints, 'video_interaction', 'Puntos ganados por interacción con video');
  }, [addPoints]);

  const handleAnimationComplete = useCallback(() => {
    setPointsAnimation(null);
  }, []);

  // ===============================
  // EMPTY STATE COMPONENT
  // ===============================
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full flex items-center justify-center mb-6">
        <Icon name="Video" size={32} color="var(--color-primary)" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        {activeFilter === 'todos' ? '¡Sé el primero en crear contenido!' : `No hay videos de ${VIDEO_CATEGORIES.find(c => c.id === activeFilter)?.label.toLowerCase()}`}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {activeFilter === 'todos' 
          ? 'Esta comunidad está esperando tu creatividad. ¡Sube tu primer video y gana puntos!'
          : 'Explora otras categorías o sé el primero en crear contenido en esta sección.'
        }
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={() => window.location.href = '/upload'}
          className="px-6"
        >
          <Icon name="Plus" size={16} className="mr-2" />
          Subir Video
        </Button>
        {activeFilter !== 'todos' && (
          <Button 
            variant="outline"
            onClick={() => handleFilterChange('todos')}
            className="px-6"
          >
            <Icon name="Grid3X3" size={16} className="mr-2" />
            Ver Todos
          </Button>
        )}
      </div>
    </div>
  );

  // ===============================
  // ERROR STATE COMPONENT
  // ===============================
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        Error al cargar videos
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Ha ocurrido un problema al cargar el contenido. Por favor, intenta nuevamente.
      </p>
      <Button onClick={handleRefresh} className="px-6">
        <Icon name="RefreshCw" size={16} className="mr-2" />
        Reintentar
      </Button>
    </div>
  );

  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      <Helmet>
        <title>Dashboard - Descubre Videos | RADEISAN</title>
        <meta name="description" content="Descubre videos increíbles, gana puntos y conecta con creadores en RADEISAN" />
        <meta name="keywords" content="videos, dashboard, contenido, creadores, puntos, recompensas" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col xl:flex-row gap-8">
              
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                    <h1 className="text-2xl font-bold text-foreground">
                      {activeFilter === 'todos' ? 'Para ti' : 
                       VIDEO_CATEGORIES.find(c => c.id === activeFilter)?.label || 'Videos'}
                    </h1>
                    <div className="hidden sm:block">
                      <PointsBalanceIndicator 
                        points={userPoints} 
                        showAnimation={true}
                        size="default"
                        variant="prominent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleLayoutChange}
                      className="hidden md:flex"
                      title={layout === 'grid' ? 'Vista de lista' : 'Vista de cuadrícula'}
                    >
                      <Icon name={layout === 'grid' ? 'List' : 'Grid3X3'} size={20} />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={loading}
                      title="Actualizar feed"
                    >
                      <Icon 
                        name="RefreshCw" 
                        size={20} 
                        className={loading ? 'animate-spin' : ''}
                      />
                    </Button>
                  </div>
                </div>

                {/* Filter Chips */}
                <div className="mb-8">
                  <FilterChips
                    categories={VIDEO_CATEGORIES}
                    activeFilter={activeFilter}
                    onFilterChange={handleFilterChange}
                  />
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                  {error ? (
                    <ErrorState />
                  ) : loading && filteredVideos.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Cargando videos increíbles...</p>
                      </div>
                    </div>
                  ) : filteredVideos.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <PullToRefresh onRefresh={handleRefresh}>
                      <VideoFeedGrid
                        videos={filteredVideos}
                        layout={layout}
                        onLoadMore={handleLoadMore}
                        onPointsEarned={handlePointsEarned}
                        hasMore={hasMore}
                        loading={loading}
                      />
                    </PullToRefresh>
                  )}
                </div>
              </div>

              {/* Desktop Sidebar */}
              <div className="hidden xl:block">
                <TrendingSidebar onPointsEarned={handlePointsEarned} />
              </div>
            </div>
          </div>
        </main>

        {/* Points Animation */}
        {pointsAnimation && (
          <PointsFloatingAnimation
            points={pointsAnimation?.points}
            onAnimationComplete={handleAnimationComplete}
          />
        )}

        {/* Mobile Points Indicator */}
        <div className="fixed top-20 right-4 z-40 sm:hidden">
          <PointsBalanceIndicator 
            points={userPoints} 
            showAnimation={true}
            size="sm"
            variant="prominent"
          />
        </div>

        {/* Welcome Message for New Users */}
        {!loading && filteredVideos.length === 0 && !error && user && (
          <div className="fixed bottom-4 right-4 max-w-sm bg-card border rounded-lg p-4 shadow-lg z-50">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="Sparkles" size={20} color="var(--color-primary)" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">¡Bienvenido/a!</h4>
                <p className="text-sm text-muted-foreground">
                  Explora contenido, gana puntos y canjea recompensas increíbles.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VideoFeedDashboard;
