// src/pages/video-feed-dashboard/index.jsx
// VideoFeedDashboard CORREGIDO - Muestra videos reales con orientación simplificada
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
// CONSTANTES DE ORIENTACIÓN SIMPLIFICADAS
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

// Hook simplificado para manejar videos REALES
const useVideos = () => {
  const { user: currentUser } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [orientationStats, setOrientationStats] = useState({
    total: 0,
    vertical: 0,
    horizontal: 0,
    square: 0
  });
  const VIDEOS_PER_PAGE = 12;

  // Función formatTimeAgo
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

  // SIMPLIFICADO: Detectar orientación básica sin análisis de video
  const detectSimpleOrientation = (video) => {
    // Si ya tiene orientación en BD, usarla
    if (video.orientation) {
      return video.orientation;
    }

    // Detectar por título o descripción (heurística simple)
    const title = (video.title || '').toLowerCase();
    const description = (video.description || '').toLowerCase();
    const text = title + ' ' + description;

    if (text.includes('reel') || text.includes('vertical') || text.includes('movil')) {
      return VIDEO_ORIENTATIONS.VERTICAL;
    }

    if (text.includes('short') || text.includes('tiktok') || text.includes('instagram')) {
      return VIDEO_ORIENTATIONS.VERTICAL;
    }

    // Por defecto, asumir horizontal
    return VIDEO_ORIENTATIONS.HORIZONTAL;
  };

  // SIMPLIFICADO: Consulta básica SIN diagnósticos complejos
  const fetchVideosBasic = async (pageNum = 0, category = 'all', orientation = 'all') => {
    console.log(`📋 Cargando videos: página ${pageNum}, categoría ${category}, orientación ${orientation}`);
    
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
        orientation
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(pageNum * VIDEOS_PER_PAGE, (pageNum + 1) * VIDEOS_PER_PAGE - 1);

    // Aplicar filtro de categoría
    if (category && category !== 'all' && category !== 'todos') {
      query = query.eq('category', category);
    }

    // Aplicar filtro de orientación SI ya está en la BD
    if (orientation && orientation !== 'all') {
      query = query.eq('orientation', orientation);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error cargando videos:', error);
      throw error;
    }

    console.log(`✅ Videos cargados exitosamente: ${data?.length || 0}`);
    return data || [];
  };

  // SIMPLIFICADO: Obtener perfiles con estrategia única más robusta
  const fetchVideosWithProfiles = async (videoData) => {
    console.log('👥 Obteniendo perfiles de usuarios...');
    
    if (!videoData?.length) {
      return videoData;
    }

    const userIds = [...new Set(videoData.map(v => v.user_id).filter(Boolean))];
    console.log(`🔍 Buscando perfiles para ${userIds.length} usuarios`);
    
    if (userIds.length === 0) {
      return videoData.map(video => ({
        ...video,
        user_profile: null
      }));
    }

    try {
      // ESTRATEGIA ÚNICA: Intentar consulta RLS, fallback inteligente
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, email')
        .in('id', userIds);

      if (!profilesError && profiles?.length > 0) {
        console.log(`✅ Perfiles encontrados: ${profiles.length}/${userIds.length}`);
        
        return videoData.map(video => {
          const userProfile = profiles.find(p => p.id === video.user_id);
          return {
            ...video,
            user_profile: userProfile || null
          };
        });
      }

      // FALLBACK: Crear perfiles básicos
      console.log(`⚠️ RLS bloqueado (${profilesError?.message}), usando perfiles básicos`);
      
      return videoData.map(video => {
        const isCurrentUser = currentUser && video.user_id === currentUser.id;
        
        const basicProfile = {
          id: video.user_id,
          full_name: isCurrentUser ? 
            (currentUser.full_name || currentUser.name || 'Mi Usuario') :
            `Usuario ${video.user_id.substring(0, 8)}`,
          username: isCurrentUser ?
            (currentUser.username || 'mi_usuario') :
            `user_${video.user_id.substring(0, 8)}`,
          avatar_url: isCurrentUser ? currentUser.avatar_url : null,
          email: isCurrentUser ? currentUser.email : null
        };
        
        return {
          ...video,
          user_profile: basicProfile
        };
      });

    } catch (err) {
      console.error('❌ Error obteniendo perfiles:', err);
      
      // ÚLTIMO RECURSO: Perfiles mínimos
      return videoData.map(video => ({
        ...video,
        user_profile: {
          id: video.user_id || 'unknown',
          full_name: `Usuario ${(video.user_id || 'desconocido').substring(0, 8)}`,
          username: `@${(video.user_id || 'desconocido').substring(0, 8)}`,
          avatar_url: null,
          email: null
        }
      }));
    }
  };

  // SIMPLIFICADO: Transformar datos sin análisis complejo de orientación
  const transformVideoData = (rawVideos) => {
    return rawVideos.map((video, index) => {
      // Detectar orientación simple
      const detectedOrientation = detectSimpleOrientation(video);
      
      return {
        id: video.id,
        title: video.title || `Video sin título ${index + 1}`,
        description: video.description || 'Sin descripción disponible',
        thumbnail: video.thumbnail_url || `https://via.placeholder.com/480x270/1f2937/ffffff?text=${encodeURIComponent(video.title?.substring(0, 20) || 'Video')}`,
        videoUrl: video.video_url || '',
        duration: video.duration_seconds || 0,
        views: video.views_count || 0,
        likes: video.likes_count || 0,
        comments: video.comments_count || 0,
        pointsReward: Math.floor((video.duration_seconds || 60) / 60) * 5 + 10,
        creator: {
          id: video.user_profile?.id || video.user_id || 'unknown',
          name: video.user_profile?.full_name || 'Usuario Anónimo',
          username: video.user_profile?.username ? `@${video.user_profile.username}` : '@anonimo',
          avatar: video.user_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user_profile?.full_name || 'U')}&background=6366f1&color=ffffff`
        },
        category: video.category || 'entertainment',
        tags: Array.isArray(video.tags) ? video.tags : [],
        timeAgo: formatTimeAgo(video.created_at),
        isLiked: false,
        isSaved: false,
        
        // Orientación simplificada
        orientation: detectedOrientation,
        aspectRatio: detectedOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 0.5625 : 1.777
      };
    });
  };

  // SIMPLIFICADO: Función principal sin diagnósticos complejos
  const fetchVideos = useCallback(async (pageNum = 0, category = 'all', orientation = 'all', reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🚀 Cargando videos: página ${pageNum}, categoría ${category}, orientación ${orientation}`);

      // Cargar videos directamente
      let videoData = await fetchVideosBasic(pageNum, category, orientation);
      
      // Si hay datos, obtener perfiles
      if (videoData?.length > 0) {
        videoData = await fetchVideosWithProfiles(videoData);
        
        // Transformar datos
        const transformedVideos = transformVideoData(videoData);

        console.log(`✅ ${transformedVideos.length} videos procesados correctamente`);

        // Calcular estadísticas
        const stats = {
          total: 0,
          vertical: 0,
          horizontal: 0,
          square: 0
        };

        transformedVideos.forEach(video => {
          stats.total++;
          if (video.orientation === VIDEO_ORIENTATIONS.VERTICAL) stats.vertical++;
          else if (video.orientation === VIDEO_ORIENTATIONS.HORIZONTAL) stats.horizontal++;
          else if (video.orientation === VIDEO_ORIENTATIONS.SQUARE) stats.square++;
        });

        setOrientationStats(stats);

        // Actualizar estado
        if (reset || pageNum === 0) {
          setVideos(transformedVideos);
        } else {
          setVideos(prev => [...prev, ...transformedVideos]);
        }

        setHasMore(transformedVideos.length === VIDEOS_PER_PAGE);
        setPage(pageNum);

      } else if (pageNum === 0) {
        // Solo si es primera página y NO hay videos
        console.log('ℹ️ No hay videos en la base de datos');
        setVideos([]);
        setHasMore(false);
        setPage(0);
        setOrientationStats({ total: 0, vertical: 0, horizontal: 0, square: 0 });
      }

    } catch (err) {
      console.error('❌ Error cargando videos:', err);
      setError(err.message || 'Error al cargar videos');
      
      // Solo limpiar si es primera página
      if (pageNum === 0) {
        setVideos([]);
        setHasMore(false);
        setPage(0);
        setOrientationStats({ total: 0, vertical: 0, horizontal: 0, square: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Cargar más videos
  const loadMore = useCallback((category = 'all', orientation = 'all') => {
    if (!loading && hasMore) {
      console.log('📜 Cargando más videos...');
      fetchVideos(page + 1, category, orientation);
    }
  }, [loading, hasMore, page, fetchVideos]);

  // Refresh
  const refresh = useCallback(async (category = 'all', orientation = 'all') => {
    console.log(`🔄 Refrescando videos...`);
    await fetchVideos(0, category, orientation, true);
  }, [fetchVideos]);

  // Inicialización
  useEffect(() => {
    console.log('🎬 Inicializando carga de videos...');
    fetchVideos(0, 'all', 'all', true);
  }, []);

  return {
    videos,
    loading,
    error,
    hasMore,
    orientationStats,
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

  const fetchPointsBalance = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_points_balance', { target_user_id: user.id });

      if (error) throw error;
      setPoints(data || 0);
    } catch (error) {
      console.error('Error fetching points balance:', error);
      setPoints(2847);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const addPoints = useCallback(async (pointsAmount, transactionType, description) => {
    if (!user?.id) return;

    try {
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

    // Filtrar por orientación
    if (activeOrientation !== 'all') {
      filtered = filtered.filter(video => video.orientation === activeOrientation);
    }

    setFilteredVideos(filtered);
  }, [videos, activeFilter, activeOrientation]);

  // ===============================
  // EVENT HANDLERS
  // ===============================
  const handleFilterChange = useCallback((filterId) => {
    console.log(`🔄 Cambiando filtro a: ${filterId}`);
    setActiveFilter(filterId);
    refresh(filterId, activeOrientation);
  }, [refresh, activeOrientation]);

  const handleOrientationChange = useCallback((orientationId) => {
    console.log(`🎬 Cambiando orientación a: ${orientationId}`);
    setActiveOrientation(orientationId);
    refresh(activeFilter, orientationId);
  }, [refresh, activeFilter]);

  const handleLayoutChange = useCallback(() => {
    setLayout(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refresh manual');
    await refresh(activeFilter, activeOrientation);
  }, [refresh, activeFilter, activeOrientation]);

  const handleLoadMore = useCallback(() => {
    console.log('📜 Load more');
    loadMore(activeFilter, activeOrientation);
  }, [loadMore, activeFilter, activeOrientation]);

  const handlePointsEarned = useCallback((earnedPoints) => {
    setPointsAnimation({ points: earnedPoints });
    addPoints(earnedPoints, 'video_interaction', 'Puntos ganados por interacción con video');
  }, [addPoints]);

  const handleAnimationComplete = useCallback(() => {
    setPointsAnimation(null);
  }, []);

  // ===============================
  // COMPONENTES UI
  // ===============================
  const OrientationTabs = () => (
    <div className="mb-6">
      <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
        {ORIENTATION_TABS.map((tab) => {
          const isActive = activeOrientation === tab.id;
          const count = tab.id === 'all' ? orientationStats.total : 
                       tab.id === VIDEO_ORIENTATIONS.VERTICAL ? orientationStats.vertical :
                       tab.id === VIDEO_ORIENTATIONS.HORIZONTAL ? orientationStats.horizontal : 0;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleOrientationChange(tab.id)}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }
              `}
            >
              <Icon 
                name={tab.icon} 
                size={16} 
                color={isActive ? tab.color : 'var(--color-muted-foreground)'} 
              />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`
                  ml-1 px-2 py-0.5 rounded-full text-xs font-medium
                  ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 text-center">
        <p className="text-sm text-muted-foreground">
          {activeOrientation === 'all' && 'Mostrando todos los tipos de contenido'}
          {activeOrientation === VIDEO_ORIENTATIONS.VERTICAL && 'Videos verticales optimizados para móvil'}
          {activeOrientation === VIDEO_ORIENTATIONS.HORIZONTAL && 'Videos horizontales estilo tradicional'}
        </p>
      </div>
    </div>
  );

  const EmptyState = () => {
    const orientationConfig = ORIENTATION_TABS.find(tab => tab.id === activeOrientation);
    
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full flex items-center justify-center mb-6">
          <Icon name={orientationConfig?.icon || 'Video'} size={32} color={orientationConfig?.color || 'var(--color-primary)'} />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">
          {activeOrientation === 'all' 
            ? '¡Sé el primero en crear contenido!' 
            : `No hay ${orientationConfig?.label?.toLowerCase()} disponibles`
          }
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {activeOrientation === 'all'
            ? 'Esta comunidad está esperando tu creatividad. ¡Sube tu primer video y gana puntos!'
            : `Sé el primero en subir ${orientationConfig?.label?.toLowerCase()} o explora otros tipos de contenido.`
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => window.location.href = '/upload'}
            className="px-6"
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Subir {orientationConfig?.id === VIDEO_ORIENTATIONS.VERTICAL ? 'Reel' : 'Video'}
          </Button>
          {activeOrientation !== 'all' && (
            <Button 
              variant="outline"
              onClick={() => handleOrientationChange('all')}
              className="px-6"
            >
              <Icon name="Grid3X3" size={16} className="mr-2" />
              Ver Todo
            </Button>
          )}
        </div>
      </div>
    );
  };

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        Error al cargar videos
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        Hubo un problema al conectar con la base de datos. Por favor intenta de nuevo.
      </p>
      <div className="bg-muted/50 rounded-lg p-3 mb-6 max-w-md">
        <p className="text-xs text-muted-foreground">
          Error: {error}
        </p>
      </div>
      <Button onClick={handleRefresh} className="px-6">
        <Icon name="RefreshCw" size={16} className="mr-2" />
        Reintentar
      </Button>
    </div>
  );

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <>
      <Helmet>
        <title>
          {activeOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 'Reels - ' : 
           activeOrientation === VIDEO_ORIENTATIONS.HORIZONTAL ? 'Videos - ' : 
           'Dashboard - '}RADEISAN
        </title>
        <meta name="description" content="Descubre videos increíbles, gana puntos y conecta con creadores en RADEISAN" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col xl:flex-row gap-8">
              
              <div className="flex-1 min-w-0">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                    <h1 className="text-2xl font-bold text-foreground">
                      {activeOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 'Reels' :
                       activeOrientation === VIDEO_ORIENTATIONS.HORIZONTAL ? 'Videos' :
                       activeFilter === 'todos' ? 'Para ti' : 
                       VIDEO_CATEGORIES.find(c => c.id === activeFilter)?.label || 'Contenido'
                      }
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

                {/* Tabs de Orientación */}
                <OrientationTabs />

                {/* Filtros */}
                <div className="mb-8">
                  <FilterChips
                    categories={VIDEO_CATEGORIES}
                    activeFilter={activeFilter}
                    onFilterChange={handleFilterChange}
                  />
                </div>

                {/* Contenido */}
                <div className="min-h-[400px]">
                  {loading && filteredVideos.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">
                          Cargando {activeOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 'reels' : 
                                   activeOrientation === VIDEO_ORIENTATIONS.HORIZONTAL ? 'videos' : 'contenido'}...
                        </p>
                      </div>
                    </div>
                  ) : error ? (
                    <ErrorState />
                  ) : filteredVideos.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <PullToRefresh onRefresh={handleRefresh}>
                      <VideoFeedGrid
                        videos={filteredVideos}
                        layout={activeOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 'reels' : layout}
                        orientation={activeOrientation}
                        onLoadMore={handleLoadMore}
                        onPointsEarned={handlePointsEarned}
                        hasMore={hasMore}
                        loading={loading}
                      />
                    </PullToRefresh>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="hidden xl:block">
                <TrendingSidebar onPointsEarned={handlePointsEarned} />
              </div>
            </div>
          </div>
        </main>

        {/* Animaciones y elementos fijos */}
        {pointsAnimation && (
          <PointsFloatingAnimation
            points={pointsAnimation?.points}
            onAnimationComplete={handleAnimationComplete}
          />
        )}

        <div className="fixed top-20 right-4 z-40 sm:hidden">
          <PointsBalanceIndicator 
            points={userPoints} 
            showAnimation={true}
            size="sm"
            variant="prominent"
          />
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black text-white p-2 rounded text-xs font-mono">
            Videos: {videos.length} | Filtrados: {filteredVideos.length} | Orientación: {activeOrientation}
          </div>
        )}
      </div>
    </>
  );
};

export default VideoFeedDashboard;
