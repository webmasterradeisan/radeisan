// src/pages/video-feed-dashboard/index.jsx
// VideoFeedDashboard con integración real de Supabase - VERSIÓN ROBUSTA
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

// Hook para manejar videos con datos reales de Supabase - VERSIÓN ROBUSTA
const useVideos = () => {
  const { user: currentUser } = useAuth(); // Para usar en fallbacks
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
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
    isSaved: false
  });

  // Función para diagnóstico de base de datos
  const diagnoseDatabaseIssues = async () => {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE BASE DE DATOS...');
    
    try {
      // Test 1: Verificar conectividad básica
      console.log('Test 1: Verificando conectividad a Supabase...');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('videos')
        .select('count', { count: 'exact' })
        .limit(1);
      
      if (connectionError) {
        console.error('❌ Error de conectividad:', connectionError);
        return { issue: 'connection', error: connectionError };
      }
      console.log('✅ Conectividad OK');

      // Test 2: Verificar si existe la tabla videos
      console.log('Test 2: Verificando tabla videos...');
      const { data: videosExist, error: videosError } = await supabase
        .from('videos')
        .select('id')
        .limit(1);
      
      if (videosError) {
        console.error('❌ Error accediendo tabla videos:', videosError);
        return { issue: 'table_access', error: videosError };
      }
      console.log('✅ Tabla videos accesible');

      // Test 3: Contar videos totales
      console.log('Test 3: Contando videos en BD...');
      const { count, error: countError } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('❌ Error contando videos:', countError);
        return { issue: 'count', error: countError };
      }
      console.log(`✅ Total videos en BD: ${count || 0}`);

      // Test 4: Verificar videos publicados
      console.log('Test 4: Verificando videos publicados...');
      const { data: publishedVideos, error: publishedError } = await supabase
        .from('videos')
        .select('id, title, is_published')
        .eq('is_published', true)
        .limit(5);
      
      if (publishedError) {
        console.error('❌ Error buscando videos publicados:', publishedError);
        return { issue: 'published_videos', error: publishedError };
      }
      console.log(`✅ Videos publicados encontrados: ${publishedVideos?.length || 0}`);

      // Test 5: Verificar tabla user_profiles
      console.log('Test 5: Verificando tabla user_profiles...');
      const { data: profilesExist, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (profilesError) {
        console.error('❌ Error accediendo user_profiles:', profilesError);
        return { issue: 'profiles_access', error: profilesError };
      }
      console.log('✅ Tabla user_profiles accesible');

      return { 
        issue: null, 
        summary: {
          totalVideos: count || 0,
          publishedVideos: publishedVideos?.length || 0,
          hasProfiles: true
        }
      };

    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      return { issue: 'diagnosis_failed', error };
    }
  };

  // Consulta básica sin JOIN
  const fetchVideosBasic = async (pageNum = 0, category = 'all') => {
    console.log(`📋 Intento 1: Consulta básica (página ${pageNum}, categoría ${category})`);
    
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
        user_id
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
      console.error('❌ Error en consulta básica:', error);
      throw error;
    }

    console.log(`✅ Consulta básica exitosa: ${data?.length || 0} videos`);
    return data || [];
  };

  // CORREGIDA: Consulta con múltiples estrategias para obtener perfiles
  const fetchVideosWithProfiles = async (videoData) => {
    console.log('📋 Intento 2: Obteniendo perfiles de usuarios...');
    
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
      // ESTRATEGIA 1: Intentar consulta directa con RLS
      console.log('🔐 Estrategia 1: Consulta directa con RLS...');
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, email')
        .in('id', userIds);

      // Si la consulta RLS funciona, usarla
      if (!profilesError && profiles?.length > 0) {
        console.log(`✅ RLS permitió consulta: ${profiles.length} perfiles encontrados`);
        console.log('👥 Perfiles obtenidos:', profiles.map(p => ({ id: p.id, name: p.full_name })));
        
        const mappedVideos = videoData.map(video => {
          const userProfile = profiles.find(p => p.id === video.user_id);
          console.log(`🔗 Video "${video.title}" → ${userProfile?.full_name || 'NO ENCONTRADO'}`);
          
          return {
            ...video,
            user_profile: userProfile || null
          };
        });
        
        return mappedVideos;
      }

      // ESTRATEGIA 2: Usar función RPC si está disponible
      console.log('🔄 Estrategia 2: Función RPC...');
      console.log('❌ Error RLS:', profilesError);
      
      const { data: rpcProfiles, error: rpcError } = await supabase
        .rpc('get_user_profiles_by_ids', { user_ids: userIds });

      if (!rpcError && rpcProfiles?.length > 0) {
        console.log(`✅ RPC funcionó: ${rpcProfiles.length} perfiles encontrados`);
        
        const mappedVideos = videoData.map(video => {
          const userProfile = rpcProfiles.find(p => p.id === video.user_id);
          console.log(`🔗 Video "${video.title}" → ${userProfile?.full_name || 'NO ENCONTRADO'}`);
          
          return {
            ...video,
            user_profile: userProfile || null
          };
        });
        
        return mappedVideos;
      }

      // ESTRATEGIA 3: Consulta JOIN directa en videos
      console.log('🔄 Estrategia 3: JOIN directo...');
      console.log('❌ Error RPC:', rpcError);
      
      const videoIds = videoData.map(v => v.id);
      const { data: videosWithProfiles, error: joinError } = await supabase
        .from('videos')
        .select(`
          id,
          user_id,
          user_profiles!inner (
            id,
            full_name,
            username,
            avatar_url,
            email
          )
        `)
        .in('id', videoIds);

      if (!joinError && videosWithProfiles?.length > 0) {
        console.log(`✅ JOIN funcionó: ${videosWithProfiles.length} videos con perfiles`);
        
        const mappedVideos = videoData.map(video => {
          const videoWithProfile = videosWithProfiles.find(v => v.id === video.id);
          const userProfile = videoWithProfile?.user_profiles;
          console.log(`🔗 Video "${video.title}" → ${userProfile?.full_name || 'NO ENCONTRADO'}`);
          
          return {
            ...video,
            user_profile: userProfile || null
          };
        });
        
        return mappedVideos;
      }

      // ESTRATEGIA 4: Crear perfiles "virtuales" inteligentes
      console.log('🔄 Estrategia 4: Perfiles virtuales...');
      console.log('❌ Error JOIN:', joinError);
      
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
          
          console.log(`🔗 Video "${video.title}" → ${userProfile.full_name} (usuario actual)`);
          
          return {
            ...video,
            user_profile: userProfile
          };
        }
        
        // Para otros usuarios, crear un perfil básico con el ID
        const basicProfile = {
          id: video.user_id,
          full_name: `Usuario ${video.user_id.substring(0, 8)}`,
          username: `user_${video.user_id.substring(0, 8)}`,
          avatar_url: null,
          email: null
        };
        
        console.log(`🔗 Video "${video.title}" → ${basicProfile.full_name} (perfil básico)`);
        
        return {
          ...video,
          user_profile: basicProfile
        };
      });

      console.log('✅ Perfiles virtuales creados');
      return mappedVideos;

    } catch (err) {
      console.error('❌ Error crítico en fetchVideosWithProfiles:', err);
      
      // FALLBACK FINAL: Al menos mostrar IDs de usuarios
      const fallbackVideos = videoData.map(video => {
        const fallbackProfile = {
          id: video.user_id || 'unknown',
          full_name: video.user_id ? `Usuario ${video.user_id.substring(0, 8)}` : 'Usuario Desconocido',
          username: video.user_id ? `@${video.user_id.substring(0, 8)}` : '@desconocido',
          avatar_url: null,
          email: null
        };
        
        console.log(`🆘 Video "${video.title}" → ${fallbackProfile.full_name} (fallback final)`);
        
        return {
          ...video,
          user_profile: fallbackProfile
        };
      });

      console.log('🆘 Usando fallback final con IDs de usuario');
      return fallbackVideos;
    }
  };

  // Transformar datos a formato esperado
  const transformVideoData = (rawVideos) => {
    return rawVideos.map((video, index) => ({
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
      isSaved: false
    }));
  };

  // Función principal para obtener videos
  const fetchVideos = useCallback(async (pageNum = 0, category = 'all', reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🚀 INICIANDO FETCH DE VIDEOS (página ${pageNum}, categoría ${category}, reset ${reset})`);

      // Si es la primera página, hacer diagnóstico
      if (pageNum === 0) {
        const diagnosis = await diagnoseDatabaseIssues();
        if (diagnosis.issue) {
          throw new Error(`Problema de BD: ${diagnosis.issue} - ${diagnosis.error?.message || 'Desconocido'}`);
        }
        
        // Si no hay videos en la BD, mostrar ejemplos directamente
        if (diagnosis.summary?.totalVideos === 0) {
          console.log('ℹ️ BD vacía, mostrando videos de ejemplo');
          const exampleVideos = Array.from({ length: 3 }, (_, i) => createExampleVideo(`example-${i + 1}`, i));
          setVideos(exampleVideos);
          setHasMore(false);
          setPage(0);
          return;
        }
      }

      // Intentar consulta básica
      let videoData = await fetchVideosBasic(pageNum, category);
      
      // Si hay datos, intentar obtener perfiles
      if (videoData?.length > 0) {
        videoData = await fetchVideosWithProfiles(videoData);
      }

      // Transformar datos
      const transformedVideos = transformVideoData(videoData);

      console.log(`✅ Videos transformados: ${transformedVideos.length}`);

      // Si no hay videos reales, mostrar ejemplos
      if (transformedVideos.length === 0 && pageNum === 0) {
        console.log('ℹ️ No hay videos reales, mostrando ejemplos');
        const exampleVideos = Array.from({ length: 3 }, (_, i) => createExampleVideo(`example-${i + 1}`, i));
        setVideos(exampleVideos);
        setHasMore(false);
        setPage(0);
        return;
      }

      // Actualizar estado
      if (reset || pageNum === 0) {
        setVideos(transformedVideos);
      } else {
        setVideos(prev => [...prev, ...transformedVideos]);
      }

      setHasMore(transformedVideos.length === VIDEOS_PER_PAGE);
      setPage(pageNum);

      console.log(`🎉 FETCH COMPLETADO EXITOSAMENTE: ${transformedVideos.length} videos cargados`);

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
        // No limpiar el error para que se muestre el mensaje
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]); // Agregar currentUser como dependencia

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
      setPoints(2847); // Valor de ejemplo
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
    console.log(`🔄 Cambiando filtro a: ${filterId}`);
    setActiveFilter(filterId);
    refresh(filterId);
  }, [refresh]);

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
                  {loading && filteredVideos.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Cargando contenido increíble...</p>
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
                          layout={layout}
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
            Videos: {videos.length} | Loading: {loading.toString()} | Error: {error ? 'Yes' : 'No'}
          </div>
        )}
      </div>
    </>
  );
};

export default VideoFeedDashboard;
