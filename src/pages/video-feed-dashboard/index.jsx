// src/pages/video-feed-dashboard/index.jsx  
// VideoFeedDashboard OPTIMIZADO - Query con JOIN directo a user_profiles
// ✅ ACTUALIZADO: Con carrusel de reels para desktop + aleatorización completa
// ✅ CORREGIDO: Navegación del carrusel desktop (cambia vista en vez de navegar)
// ✅ CORREGIDO: Pasa ID del video en lugar de índice para reproducción correcta
// ✅ CORREGIDO: shuffleArray movida fuera del hook para evitar error
// ✅ CORREGIDO: Carrusel desktop no desaparece - usa videos sin filtrar por orientación
// ✅ NUEVO: Recibe orientación desde Header para navegación directa a Reels/Videos

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import FilterChips from './components/FilterChips';
import VideoFeedGrid from './components/VideoFeedGrid';
import ReelsCarouselDesktop from './components/ReelsCarouselDesktop';
import TrendingSidebar from './components/TrendingSidebar';
import PointsFloatingAnimation from './components/PointsFloatingAnimation';
import PullToRefresh from './components/PullToRefresh';
import PointsBalanceIndicator from '../../components/ui/PointsBalanceIndicator';
import useIsMobile from '../../hooks/useIsMobile';
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
// ✅ FUNCIÓN DE ALEATORIZACIÓN GLOBAL
// ===============================
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar videos - ✅ QUERY OPTIMIZADA CON JOIN DIRECTO
const useVideos = () => {
  const { user: currentUser } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [orientationStats, setOrientationStats] = useState({
    horizontal: 0,
    vertical: 0,
    square: 0,
    total: 0
  });

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
    
    // PRIORIDAD 4: usar heurística de título/descripción
    const title = (video.title || '').toLowerCase();
    const description = (video.description || '').toLowerCase();
    const text = title + ' ' + description;

    if (text.includes('reel') || text.includes('vertical') || text.includes('móvil') || 
        text.includes('short') || text.includes('tiktok') || text.includes('stories')) {
      return 'vertical';
    }

    // Por defecto, horizontal
    return 'horizontal';
  }, []);

  // ✅ FUNCIÓN ACTUALIZADA: Procesa videos con datos de user_profiles
  const processVideos = useCallback((rawVideos) => {
    const processed = rawVideos.map(video => {
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
        // ✅ DATOS DEL CREADOR REALES
        creator: {
          id: video.user_profiles?.id || video.user_id,
          username: video.user_profiles?.username || `user_${video.user_id?.substring(0, 8)}`,
          name: video.user_profiles?.username || 'usuario',
          avatar: avatarUrl
        }
      };
    });
    
    const stats = processed.reduce((acc, video) => {
      acc[video.orientation] = (acc[video.orientation] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { horizontal: 0, vertical: 0, square: 0, total: 0 });
    
    setOrientationStats(stats);
    return processed;
  }, [determineOrientation]);

  const loadVideos = useCallback(async (pageNum = 0, category = 'todos', reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setVideos([]);
        setPage(0);
        setHasMore(true);
        setError(null);
      }

      console.log('🎬 Cargando videos:', { pageNum, category, reset });

      // ✅ PASO 1: Obtener videos sin JOIN
      let query = supabase
        .from('videos')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Filtrar por categoría si no es 'todos'
      if (category !== 'todos' && category !== 'all') {
        query = query.eq('category', category);
      }

      const ITEMS_PER_PAGE = 12;
      const { data: videoData, error: fetchError } = await query
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      if (fetchError) {
        console.error('❌ Error fetching videos:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('✅ Videos obtenidos:', {
        count: videoData?.length || 0,
        firstVideo: videoData?.[0]
      });

      // ✅ PASO 2: Obtener user_ids únicos
      const userIds = [...new Set(videoData?.map(v => v.user_id).filter(Boolean))];
      
      console.log('👥 Usuarios únicos:', userIds.length);

      // ✅ PASO 3: Fetch user profiles por lote
      let userProfiles = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profileError) {
          console.warn('⚠️ Error fetching profiles:', profileError);
        } else {
          // Crear un mapa de user_id -> profile
          userProfiles = (profilesData || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
          console.log('✅ Perfiles cargados:', Object.keys(userProfiles).length);
        }
      }

      // ✅ PASO 4: Combinar videos con profiles
      const videosWithProfiles = (videoData || []).map(video => ({
        ...video,
        user_profiles: userProfiles[video.user_id] || null
      }));

      const processedVideos = processVideos(videosWithProfiles);

      if (reset) {
        setVideos(processedVideos);
      } else {
        setVideos(prev => [...prev, ...processedVideos]);
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

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadVideos(page + 1, 'todos', false);
    }
  }, [hasMore, loading, page, loadVideos]);

  const refresh = useCallback((category = 'todos') => {
    loadVideos(0, category, true);
  }, [loadVideos]);

  useEffect(() => {
    loadVideos(0, 'todos', true);
  }, []);

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

// Hook para gestionar puntos del usuario
const useUserPoints = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (user?.id) {
      const fetchPoints = async () => {
        const { data } = await supabase
          .from('user_profiles')
          .select('points')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setPoints(data.points || 0);
        }
      };

      fetchPoints();

      // Suscribirse a cambios en tiempo real
      const subscription = supabase
        .channel('user-points')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'user_profiles',
            filter: `id=eq.${user.id}`
          }, 
          (payload) => {
            setPoints(payload.new.points || 0);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const addPoints = useCallback((amount) => {
    setPoints(prev => prev + amount);
  }, []);

  return { points, addPoints };
};

// Configuración de categorías
const VIDEO_CATEGORIES = [
  { id: 'todos', label: 'Todo', icon: 'Grid3X3' },
  { id: 'tendencias', label: 'Tendencias', icon: 'TrendingUp' },
  { id: 'educacion', label: 'Educación', icon: 'GraduationCap' },
  { id: 'entretenimiento', label: 'Entretenimiento', icon: 'Tv' },
  { id: 'musica', label: 'Música', icon: 'Music' },
  { id: 'deportes', label: 'Deportes', icon: 'Trophy' },
  { id: 'gaming', label: 'Gaming', icon: 'Gamepad2' },
  { id: 'tecnologia', label: 'Tecnología', icon: 'Cpu' },
  { id: 'comedia', label: 'Comedia', icon: 'Laugh' },
];

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const VideoFeedDashboard = () => {
  const { user } = useAuth();
  const { videos, loading, error, hasMore, orientationStats, loadMore, refresh } = useVideos();
  const { points: userPoints, addPoints } = useUserPoints();
  
  const isMobile = useIsMobile();
  const location = useLocation(); // ✅ AGREGADO: Para recibir el state de navegación

  const [filteredVideos, setFilteredVideos] = useState([]);
  const [shuffledReels, setShuffledReels] = useState([]);
  const [shuffledHorizontals, setShuffledHorizontals] = useState([]);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [activeOrientation, setActiveOrientation] = useState('all');
  const [layout, setLayout] = useState('grid');
  const [pointsAnimation, setPointsAnimation] = useState(null);
  const [selectedReelId, setSelectedReelId] = useState(null);

  // ✅ NUEVO: Efecto para aplicar orientación desde navegación del Header
  useEffect(() => {
    if (location.state?.orientation) {
      console.log('🎯 Orientación recibida desde Header:', location.state.orientation);
      setActiveOrientation(location.state.orientation);
      // Limpiar el state para evitar que persista en futuras navegaciones
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  console.log('🏠 VideoFeedDashboard rendered:', {
    isMobile,
    activeOrientation,
    layout,
    videosCount: videos.length,
    filteredCount: filteredVideos.length,
    orientationStats,
    selectedReelId,
    error
  });

  // ✅ CORREGIDO: Filtrar Y ALEATORIZAR videos cuando cambian los datos
  // SOLUCIÓN: Separar reels/horizontales ANTES de aplicar filtro de orientación
  useEffect(() => {
    // ✅ PASO 1: Aplicar solo filtro de CATEGORÍA (NO orientación) para los arrays de carrusel
    let videosForCarousel = videos;
    if (activeFilter !== 'todos' && activeFilter !== 'all') {
      videosForCarousel = videos.filter(video => video.category === activeFilter);
    }

    // ✅ PASO 2: Separar y aleatorizar reels y horizontales DEL ARRAY COMPLETO (sin filtro de orientación)
    const allReels = videosForCarousel.filter(v => v.orientation === 'vertical');
    const allHorizontals = videosForCarousel.filter(v => v.orientation === 'horizontal' || v.orientation === 'square');
    
    const shuffledR = shuffleArray(allReels);
    const shuffledH = shuffleArray(allHorizontals);
    
    console.log('🎲 Arrays para carrusel (sin filtro de orientación):', {
      reelsCount: shuffledR.length,
      horizontalsCount: shuffledH.length,
      activeFilter
    });
    
    // ✅ PASO 3: Guardar arrays aleatorizados (estos siempre tendrán datos cuando hay videos)
    setShuffledReels(shuffledR);
    setShuffledHorizontals(shuffledH);

    // ✅ PASO 4: Aplicar TODOS los filtros (categoría + orientación) para el grid
    let filtered = videos;
    
    // Filtrar por categoría
    if (activeFilter !== 'todos' && activeFilter !== 'all') {
      filtered = filtered.filter(video => video.category === activeFilter);
    }

    // Filtrar por orientación
    if (activeOrientation !== 'all') {
      filtered = filtered.filter(video => video.orientation === activeOrientation);
    }

    console.log('🔍 Filtrado final para grid:', {
      original: videos.length,
      afterFilters: filtered.length,
      activeFilter,
      activeOrientation
    });
    
    setFilteredVideos(filtered);
  }, [videos, activeFilter, activeOrientation]);

  // ===============================
  // LÓGICA DE LAYOUT
  // ===============================
  
  const getEffectiveLayout = () => {
    if (activeOrientation === VIDEO_ORIENTATIONS.VERTICAL) {
      return isMobile ? 'grid' : 'reels';
    }
    return layout;
  };

  const effectiveLayout = getEffectiveLayout();

  console.log('🎬 Layout logic:', {
    activeOrientation,
    isMobile,
    originalLayout: layout,
    effectiveLayout,
    willShowCarousel: isMobile && effectiveLayout === 'grid'
  });

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleFilterChange = useCallback((filterId) => {
    console.log(`🔄 Cambiando filtro a: ${filterId}`);
    setActiveFilter(filterId);
    refresh(filterId);
  }, [refresh]);

  const handleOrientationChange = useCallback((orientation) => {
    console.log(`🔄 Cambiando orientación a: ${orientation}`);
    setActiveOrientation(orientation);
  }, []);

  const handleLayoutChange = useCallback(() => {
    setLayout(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refrescando feed');
    refresh(activeFilter);
  }, [refresh, activeFilter]);

  const handleLoadMore = useCallback(() => {
    console.log('⬇️ Cargando más videos');
    loadMore();
  }, [loadMore]);

  const handlePointsEarned = useCallback((points) => {
    console.log(`⭐ Puntos ganados: ${points}`);
    addPoints(points);
    setPointsAnimation({ points });
  }, [addPoints]);

  const handleAnimationComplete = useCallback(() => {
    console.log('✅ Animación de puntos completada');
    setPointsAnimation(null);
  }, []);

  // ===============================
  // ✅ HANDLER PARA REELS EN DESKTOP - CAMBIA VISTA EN LUGAR DE NAVEGAR
  // ===============================
  const handleReelClickDesktop = useCallback((reelIndex, reelId) => {
    console.log('🖥️ Desktop: Click en reel del carrusel');
    console.log('   📍 Índice:', reelIndex);
    console.log('   🆔 ID del video:', reelId);
    
    // Cambiar vista a reels mode con el ID específico
    setActiveOrientation('vertical');
    setSelectedReelId(reelId);
  }, []);

  // ===============================
  // ERROR STATE
  // ===============================
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Error al cargar videos
            </h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={handleRefresh}>
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Reintentar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <>
      <Helmet>
        <title>RADEISAN - Red Social de Videos</title>
        <meta name="description" content="Descubre y comparte videos increíbles en RADEISAN" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 pt-20 pb-20 md:pt-24 md:pb-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
              {/* Main Content */}
              <div className="min-w-0">
                {/* Header con puntos y controles */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold text-foreground">
                      Descubre
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

                {/* Orientation Tabs - Solo visible en móviles */}
                <div className="flex md:hidden items-center space-x-1 mb-6 overflow-x-auto scrollbar-hide">
                  {ORIENTATION_TABS.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={activeOrientation === tab.id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleOrientationChange(tab.id)}
                      className="flex-shrink-0 flex items-center space-x-2"
                    >
                      <Icon name={tab.icon} size={16} />
                      <span>{tab.label}</span>
                      {tab.id === 'all' && orientationStats.total > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                          {orientationStats.total}
                        </span>
                      )}
                      {tab.id === 'vertical' && orientationStats.vertical > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                          {orientationStats.vertical}
                        </span>
                      )}
                      {tab.id === 'horizontal' && orientationStats.horizontal > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                          {orientationStats.horizontal}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Filter Chips */}
                <div className="mb-6">
                  <FilterChips
                    categories={VIDEO_CATEGORIES}
                    activeFilter={activeFilter}
                    onFilterChange={handleFilterChange}
                  />
                </div>

                {/* ✅ CARRUSEL DE REELS DESKTOP - CORREGIDO: Usa shuffledReels.length */}
                {!isMobile && activeOrientation === 'all' && shuffledReels.length > 0 && (
                  <div className="hidden md:block mb-6">
                    <ReelsCarouselDesktop
                      videos={shuffledReels}
                      onReelClick={handleReelClickDesktop}
                      onLoadMore={handleLoadMore}
                      hasMore={hasMore}
                      loading={loading}
                    />
                  </div>
                )}

                {/* Content Area */}
                <div className="min-h-screen">
                  {filteredVideos.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Icon name="Search" size={24} color="var(--color-muted-foreground)" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No hay videos para mostrar
                      </h3>
                      <p className="text-muted-foreground max-w-md">
                        {activeOrientation !== 'all' 
                          ? `No se encontraron videos ${activeOrientation === 'vertical' ? 'verticales' : 'horizontales'} en esta categoría.`
                          : 'No hay contenido disponible. Prueba con otros filtros o vuelve más tarde.'
                        }
                      </p>
                      <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <Button onClick={() => setActiveFilter('todos')}>
                          <Icon name="Grid3X3" size={16} className="mr-2" />
                          Ver todo el contenido
                        </Button>
                        <Button variant="outline" onClick={handleRefresh}>
                          <Icon name="RefreshCw" size={16} className="mr-2" />
                          Actualizar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {filteredVideos.length > 0 && (
                        <div className="mb-4 text-sm text-muted-foreground">
                          <p>
                            Mostrando {filteredVideos.length} de {videos.length} videos disponibles.
                          </p>
                        </div>
                      )}
                      
                      <PullToRefresh onRefresh={handleRefresh}>
                        <VideoFeedGrid
                          videos={filteredVideos}
                          reelsVideos={shuffledReels}
                          horizontalVideos={shuffledHorizontals}
                          layout={effectiveLayout}
                          orientation={activeOrientation}
                          selectedReelId={selectedReelId}
                          onLoadMore={handleLoadMore}
                          onPointsEarned={handlePointsEarned}
                          hasMore={hasMore}
                          loading={loading}
                        />
                      </PullToRefresh>
                    </div>
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

        {/* Debug Info for Development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black text-white p-3 rounded text-xs font-mono max-w-sm z-50">
            <div className="text-green-400 font-bold mb-1">✅ Dashboard v4.2 - NAVEGACIÓN HEADER</div>
            <div>📱 isMobile: {isMobile.toString()}</div>
            <div>🎬 activeOrientation: {activeOrientation}</div>
            <div>🎯 originalLayout: {layout}</div>
            <div>✨ effectiveLayout: {effectiveLayout}</div>
            <div>📹 videos: {videos.length}</div>
            <div>🔍 filtered: {filteredVideos.length}</div>
            <div>🎥 shuffled reels: {shuffledReels.length}</div>
            <div>🎬 shuffled horizontals: {shuffledHorizontals.length}</div>
            <div>🔄 loading: {loading.toString()}</div>
            <div>🎠 Mobile Carousel: {(isMobile && effectiveLayout === 'grid').toString()}</div>
            <div>🖥️ Desktop Carousel: {(!isMobile && activeOrientation === 'all' && shuffledReels.length > 0).toString()}</div>
            <div>📊 Stats: V:{orientationStats.vertical} H:{orientationStats.horizontal}</div>
            <div>🆔 selectedReelId: {selectedReelId || 'null'}</div>
            <div>❌ error: {error || 'none'}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default VideoFeedDashboard;
