// src/pages/video-feed-dashboard/index.jsx
// VideoFeedDashboard CORREGIDO - Lee orientación REAL de BD
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

// CAMBIADO: Videos horizontales por defecto, sin "Todo"
const ORIENTATION_TABS = [
  {
    id: VIDEO_ORIENTATIONS.HORIZONTAL,
    label: 'Videos',
    icon: 'Monitor',
    description: 'Videos horizontales',
    color: '#3B82F6'
  },
  {
    id: VIDEO_ORIENTATIONS.VERTICAL,
    label: 'Reels',
    icon: 'Smartphone',
    description: 'Videos verticales',
    color: '#EF4444'
  }
];

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar videos - CORREGIDO para leer orientación real de BD
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

  // Función para crear video de ejemplo
  const createExampleVideo = (id = 'example-1', index = 0) => ({
    id,
    title: `Video de ejemplo ${index + 1} - Contenido de muestra`,
    description: 'Este es contenido de ejemplo mientras configuramos tu feed personalizado con videos reales.',
    thumbnail: `https://via.placeholder.com/400x225/6366f1/ffffff?text=Video+Ejemplo+${index + 1}`,
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4',
    duration: 120 + (index * 30),
    views: Math.floor(Math.random() * 1000),
    likes: Math.floor(Math.random() * 100),
    comments: Math.floor(Math.random() * 50),
    pointsReward: 25,
    creator: {
      id: 'radeisan-system',
      name: 'RADEISAN Oficial',
      username: '@radeisan_oficial',
      avatar: 'https://ui-avatars.com/api/?name=RADEISAN&background=6366f1&color=ffffff'
    },
    category: 'entertainment',
    tags: ['ejemplo', 'demo', 'bienvenida'],
    timeAgo: 'hace 2h',
    isLiked: false,
    isSaved: false,
    orientation: index % 2 === 0 ? VIDEO_ORIENTATIONS.VERTICAL : VIDEO_ORIENTATIONS.HORIZONTAL
  });

  // CORREGIDO: Consulta que LEE orientación real de BD
  const fetchVideosFromDB = async (pageNum = 0, category = 'all') => {
    console.log(`📋 Cargando videos REALES desde BD: página ${pageNum}, categoría ${category}`);
    
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
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(pageNum * VIDEOS_PER_PAGE, (pageNum + 1) * VIDEOS_PER_PAGE - 1);

    // Aplicar filtro de categoría
    if (category && category !== 'all' && category !== 'todos') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error en consulta a BD:', error);
      throw error;
    }

    console.log(`✅ Datos obtenidos de BD: ${data?.length || 0} videos`);
    
    // Debug: Mostrar orientaciones reales encontradas
    if (data?.length > 0) {
      console.log('🔍 Orientaciones REALES encontradas en BD:');
      data.forEach(video => {
        console.log(`   "${video.title}": ${video.orientation} (${video.aspect_ratio})`);
      });
    }

    return data || [];
  };

  // Consulta con múltiples estrategias para obtener perfiles
  const fetchVideosWithProfiles = async (videoData) => {
    console.log('📋 Obteniendo perfiles de usuarios...');
    
    if (!videoData?.length) {
      console.log('⚠️ No hay videos para obtener perfiles');
      return videoData;
    }

    // Extraer user_ids únicos y válidos
    const userIds = [...new Set(videoData.map(v => v.user_id).filter(Boolean))];
    console.log('🔍 User IDs extraídos:', userIds);
    
    if (userIds.length === 0) {
      console.log('⚠️ No hay user_ids válidos en los videos');
      return videoData.map(video => ({
        ...video,
        user_profile: null
      }));
    }

    try {
      // Estrategia 1: Consulta directa con RLS
      console.log('🔐 Intentando consulta directa...');
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, email')
        .in('id', userIds);

      if (!profilesError && profiles?.length > 0) {
        console.log(`✅ Perfiles obtenidos: ${profiles.length}`);
        
        const mappedVideos = videoData.map(video => {
          const userProfile = profiles.find(p => p.id === video.user_id);
          return {
            ...video,
            user_profile: userProfile || null
          };
        });
        
        return mappedVideos;
      }

      // Fallback: Crear perfiles básicos
      console.log('🔄 Usando perfiles básicos...');
      const mappedVideos = videoData.map(video => {
        // Si el video pertenece al usuario actual, usar su perfil
        if (currentUser && video.user_id === currentUser.id) {
          const userProfile = {
            id: currentUser.id,
            full_name: currentUser.full_name || currentUser.name || 'Mi Usuario',
            username: currentUser.username || 'mi_usuario',
            avatar_url: currentUser.avatar_url,
            email: currentUser.email
          };
          
          return {
            ...video,
            user_profile: userProfile
          };
        }
        
        // Para otros usuarios, crear un perfil básico
        const basicProfile = {
          id: video.user_id,
          full_name: `Usuario ${video.user_id.substring(0, 8)}`,
          username: `user_${video.user_id.substring(0, 8)}`,
          avatar_url: null,
          email: null
        };
        
        return {
          ...video,
          user_profile: basicProfile
        };
      });

      return mappedVideos;

    } catch (err) {
      console.error('❌ Error crítico en fetchVideosWithProfiles:', err);
      return videoData.map(video => ({
        ...video,
        user_profile: {
          id: video.user_id || 'unknown',
          full_name: 'Usuario Desconocido',
          username: '@desconocido',
          avatar_url: null,
          email: null
        }
      }));
    }
  };

  // CORREGIDO: Transformar datos USANDO orientación real de BD
  const transformVideoData = (rawVideos) => {
    console.log('🔄 Transformando datos de videos...');
    
    const transformedVideos = rawVideos.map((video, index) => {
      // USAR ORIENTACIÓN REAL DE BD (no heurísticas)
      const realOrientation = video.orientation || VIDEO_ORIENTATIONS.HORIZONTAL;
      
      console.log(`📹 Video "${video.title}": orientación BD = ${realOrientation}`);
      
      return {
        id: video.id,
        title: video.title || `Video sin título ${index + 1}`,
        description: video.description || 'Sin descripción disponible',
        thumbnail: video.thumbnail_url || `https://via.placeholder.com/400x225/1f2937/ffffff?text=${encodeURIComponent(video.title?.substring(0, 20) || 'Video')}`,
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
        
        // USAR DATOS REALES DE BD
        orientation: realOrientation,
        aspectRatio: video.aspect_ratio || 'unknown',
        videoWidth: video.video_width,
        videoHeight: video.video_height
      };
    });

    // Calcular estadísticas REALES
    const stats = {
      total: transformedVideos.length,
      vertical: 0,
      horizontal: 0,
      square: 0
    };

    transformedVideos.forEach(video => {
      if (video.orientation === VIDEO_ORIENTATIONS.VERTICAL) stats.vertical++;
      else if (video.orientation === VIDEO_ORIENTATIONS.HORIZONTAL) stats.horizontal++;
      else if (video.orientation === VIDEO_ORIENTATIONS.SQUARE) stats.square++;
    });

    setOrientationStats(stats);
    console.log('📊 Estadísticas REALES calculadas:', stats);

    return transformedVideos;
  };

  // Función principal para obtener videos
  const fetchVideos = useCallback(async (pageNum = 0, category = 'all', reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🚀 INICIANDO FETCH DE VIDEOS (página ${pageNum}, categoría ${category}, reset ${reset})`);

      // Intentar consulta a BD
      let videoData = await fetchVideosFromDB(pageNum, category);
      
      // Si hay datos, intentar obtener perfiles
      if (videoData?.length > 0) {
        videoData = await fetchVideosWithProfiles(videoData);
        
        // Transformar datos usando orientación REAL
        const transformedVideos = transformVideoData(videoData);

        console.log(`✅ Videos transformados: ${transformedVideos.length}`);

        // Actualizar estado
        if (reset || pageNum === 0) {
          setVideos(transformedVideos);
        } else {
          setVideos(prev => [...prev, ...transformedVideos]);
        }

        setHasMore(transformedVideos.length === VIDEOS_PER_PAGE);
        setPage(pageNum);

        console.log(`🎉 FETCH COMPLETADO EXITOSAMENTE: ${transformedVideos.length} videos cargados`);

      } else if (pageNum === 0) {
        // Si no hay videos reales, mostrar ejemplos
        console.log('ℹ️ No hay videos reales, mostrando ejemplos');
        const exampleVideos = Array.from({ length: 3 }, (_, i) => createExampleVideo(`example-${i + 1}`, i));
        setVideos(exampleVideos);
        setHasMore(false);
        setPage(0);
        
        // Calcular estadísticas de ejemplos
        const stats = {
          total: exampleVideos.length,
          vertical: exampleVideos.filter(v => v.orientation === VIDEO_ORIENTATIONS.VERTICAL).length,
          horizontal: exampleVideos.filter(v => v.orientation === VIDEO_ORIENTATIONS.HORIZONTAL).length,
          square: 0
        };
        setOrientationStats(stats);
      }

    } catch (err) {
      console.error('❌ ERROR CRÍTICO EN FETCH:', err);
      setError(err.message || 'Error desconocido al cargar videos');
      
      // Si es primera página y hay error, mostrar videos de ejemplo
      if (pageNum === 0) {
        console.log('🆘 Mostrando videos de ejemplo por error crítico');
        const exampleVideos = Array.from({ length: 5 }, (_, i) => createExampleVideo(`fallback-${i + 1}`, i));
        setVideos(exampleVideos);
        setHasMore(false);
        setPage(0);
        
        const stats = {
          total: exampleVideos.length,
          vertical: exampleVideos.filter(v => v.orientation === VIDEO_ORIENTATIONS.VERTICAL).length,
          horizontal: exampleVideos.filter(v => v.orientation === VIDEO_ORIENTATIONS.HORIZONTAL).length,
          square: 0
        };
        setOrientationStats(stats);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Cargar más videos
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      console.log('🔄 Cargando más videos...');
      fetchVideos(page + 1);
    }
  }, [loading, hasMore, page, fetchVideos]);

  // Refresh
  const refresh = useCallback(async (category = 'all') => {
    console.log(`🔄 REFRESH solicitado para categoría: ${category}`);
    await fetchVideos(0, category, true);
  }, [fetchVideos]);

  // Inicialización automática
  useEffect(() => {
    console.log('🎬 INICIALIZANDO useVideos...');
    fetchVideos(0, 'all', true);
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

  // Obtener balance de puntos actual
  const fetchPointsBalance = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_points_balance', { target_user_id: user.id });

      if (error) throw error;
      setPoints(data || 0);
    } catch (error) {
      console.error('Error fetching points balance:', error);
      setPoints(2847); // Valor de ejemplo
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Agregar puntos por acción
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
  const { videos, loading, error, hasMore, orientationStats, loadMore, refresh } = useVideos();
  const { points: userPoints, addPoints } = useUserPoints();

  const [filteredVideos, setFilteredVideos] = useState([]);
  const [activeFilter, setActiveFilter] = useState('todos');
  // CAMBIADO: Inicia con 'horizontal' en lugar de 'all'
  const [activeOrientation, setActiveOrientation] = useState(VIDEO_ORIENTATIONS.HORIZONTAL);
  const [layout, setLayout] = useState('grid');
  const [pointsAnimation, setPointsAnimation] = useState(null);

  // Filtrar videos cuando cambian los datos, filtro o orientación
  useEffect(() => {
    console.log('🎛️ Aplicando filtros:', { 
      totalVideos: videos.length, 
      activeFilter, 
      activeOrientation 
    });

    let filtered = videos;

    // Filtrar por categoría
    if (activeFilter !== 'todos' && activeFilter !== 'all') {
      filtered = filtered.filter(video => video.category === activeFilter);
      console.log(`📂 Después de filtro categoría "${activeFilter}": ${filtered.length} videos`);
    }

    // CORREGIDO: Filtrar por orientación usando datos REALES
    if (activeOrientation !== 'all') {
      filtered = filtered.filter(video => {
        const match = video.orientation === activeOrientation;
        if (!match) {
          console.log(`🚫 Video "${video.title}" filtrado: orientación ${video.orientation} ≠ ${activeOrientation}`);
        }
        return match;
      });
      console.log(`📱 Después de filtro orientación "${activeOrientation}": ${filtered.length} videos`);
    }

    console.log(`✅ Filtrado final: ${filtered.length} videos mostrados`);
    setFilteredVideos(filtered);
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
    // No necesitamos refresh aquí porque el filtrado es en frontend
  }, []);

  const handleLayoutChange = useCallback(() => {
    setLayout(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refresh manual solicitado');
    await refresh(activeFilter);
  }, [refresh, activeFilter]);

  const handleLoadMore = useCallback(() => {
    console.log('📜 Load more solicitado');
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
  // COMPONENTE DE TABS DE ORIENTACIÓN
  // ===============================
  const OrientationTabs = () => (
    <div className="mb-6">
      <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
        {ORIENTATION_TABS.map((tab) => {
          const isActive = activeOrientation === tab.id;
          const count = tab.id === VIDEO_ORIENTATIONS.VERTICAL ? orientationStats.vertical :
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
          {activeOrientation === VIDEO_ORIENTATIONS.VERTICAL && 'Videos verticales optimizados para móvil'}
          {activeOrientation === VIDEO_ORIENTATIONS.HORIZONTAL && 'Videos horizontales estilo tradicional'}
        </p>
      </div>
    </div>
  );

  // ===============================
  // EMPTY STATE COMPONENT
  // ===============================
  const EmptyState = () => {
    const orientationConfig = ORIENTATION_TABS.find(tab => tab.id === activeOrientation);
    
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full flex items-center justify-center mb-6">
          <Icon name={orientationConfig?.icon || 'Video'} size={32} color={orientationConfig?.color || 'var(--color-primary)'} />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">
          {`No hay ${orientationConfig?.label?.toLowerCase()} disponibles`}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {`Sé el primero en subir ${orientationConfig?.label?.toLowerCase()} o explora otros tipos de contenido.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => window.location.href = '/upload'}
            className="px-6"
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Subir {orientationConfig?.id === VIDEO_ORIENTATIONS.VERTICAL ? 'Reel' : 'Video'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleOrientationChange(
              activeOrientation === VIDEO_ORIENTATIONS.HORIZONTAL ? 
              VIDEO_ORIENTATIONS.VERTICAL : VIDEO_ORIENTATIONS.HORIZONTAL
            )}
            className="px-6"
          >
            <Icon name={activeOrientation === VIDEO_ORIENTATIONS.HORIZONTAL ? 'Smartphone' : 'Monitor'} size={16} className="mr-2" />
            Ver {activeOrientation === VIDEO_ORIENTATIONS.HORIZONTAL ? 'Reels' : 'Videos'}
          </Button>
        </div>
      </div>
    );
  };

  // ===============================
  // ERROR STATE COMPONENT
  // ===============================
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        Problema de conexión detectado
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        Detectamos un problema al conectar con la base de datos. Estamos mostrando contenido de ejemplo.
      </p>
      <div className="bg-muted/50 rounded-lg p-3 mb-6 max-w-md">
        <p className="text-xs text-muted-foreground">
          Error técnico: {error}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleRefresh} className="px-6">
          <Icon name="RefreshCw" size={16} className="mr-2" />
          Reintentar Conexión
        </Button>
        <Button 
          variant="outline"
          onClick={() => console.log('Abrir DevTools para logs')}
          className="px-6"
        >
          <Icon name="Terminal" size={16} className="mr-2" />
          Ver Logs (F12)
        </Button>
      </div>
    </div>
  );

  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      <Helmet>
        <title>
          {activeOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 'Reels - ' : 
           'Videos - '}Descubre Contenido | RADEISAN
        </title>
        <meta name="description" content={`
          ${activeOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 'Explora reels verticales increíbles' : 
            'Descubre videos horizontales de calidad'}, gana puntos y conecta con creadores en RADEISAN
        `} />
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
                      {activeOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 'Reels' : 'Videos'}
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
                  {loading && filteredVideos.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">
                          Cargando {activeOrientation === VIDEO_ORIENTATIONS.VERTICAL ? 'reels' : 'videos'}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Conectando con base de datos...</p>
                      </div>
                    </div>
                  ) : error && filteredVideos.length === 0 ? (
                    <ErrorState />
                  ) : filteredVideos.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div>
                      {/* Mostrar alerta si hay error pero también videos */}
                      {error && (
                        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <Icon name="AlertTriangle" size={16} color="orange" />
                            <p className="text-sm text-yellow-800">
                              Algunos videos pueden no cargarse correctamente. Mostrando contenido disponible.
                            </p>
                          </div>
                        </div>
                      )}
                      
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
          <div className="fixed bottom-4 left-4 bg-black text-white p-2 rounded text-xs font-mono">
            <div>Videos BD: {videos.length} | Filtrados: {filteredVideos.length}</div>
            <div>Orientación: {activeOrientation} | Loading: {loading.toString()}</div>
            <div>Stats: H:{orientationStats.horizontal} V:{orientationStats.vertical}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default VideoFeedDashboard;
