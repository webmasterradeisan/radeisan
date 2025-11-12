// src/pages/video-feed-dashboard/index.jsx  
// VideoFeedDashboard OPTIMIZADO - Query con JOIN directo a user_profiles
// ✅ ACTUALIZADO: Con carrusel de reels para desktop + aleatorización completa
// ✅ CORREGIDO: Navegación del carrusel desktop (cambia vista en vez de navegar)
// ✅ CORREGIDO: Pasa ID del video en lugar de índice para reproducción correcta
// ✅ CORREGIDO: shuffleArray movida fuera del hook para evitar error
// ✅ CORREGIDO: Carrusel desktop no desaparece - usa videos sin filtrar por orientación
// ✅ NUEVO: Recibe orientación desde Header para navegación directa a Reels/Videos
// ✅ CORREGIDO: Lee selectedReelId del location.state para reproducción desde Perfil
// ✅ CORRECCIÓN FINAL: Añadido selectedReelId a dependencias para forzar reordenamiento (Sidebar fix)

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

// ===========================================
// FUNCIONES HELPER
// ===========================================

// Función para mezclar un array (Algoritmo de Fisher-Yates)
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================

const VideoFeedDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  // ===========================================
  // ESTADO
  // ===========================================
  const [videos, setVideos] = useState([]); // Todos los videos
  const [filteredVideos, setFilteredVideos] = useState([]); // Videos para la grilla
  const [shuffledReels, setShuffledReels] = useState([]); // Solo verticales, aleatorizados
  const [shuffledHorizontals, setShuffledHorizontals] = useState([]); // Solo horizontales, aleatorizados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'trending', 'following'
  const [activeOrientation, setActiveOrientation] = useState('all'); // 'all', 'vertical', 'horizontal'
  const [layout, setLayout] = useState('grid'); // 'grid' o 'feed' (solo para videos horizontales)
  const [selectedReelId, setSelectedReelId] = useState(null); // ID del reel a reproducir
  const [orientationStats, setOrientationStats] = useState({ vertical: 0, horizontal: 0 });

  // ===========================================
  // EFECTOS DE NAVEGACIÓN Y CARGA
  // ===========================================

  // Efecto para leer la orientación y el Reel ID desde location.state
  useEffect(() => {
    // Lee el estado de navegación
    let newOrientation = location.state?.orientation;
    let newReelId = location.state?.selectedReelId;

    if (newOrientation || newReelId) {
      if (newOrientation) {
        console.log('🎯 Orientación recibida:', newOrientation);
        setActiveOrientation(newOrientation);
      }
      
      if (newReelId) {
        console.log('🎯 Reel ID recibido:', newReelId);
        setSelectedReelId(newReelId); 
      }
      
      // Limpiar el state para evitar que persista en futuras navegaciones
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, location.pathname]);


  // Función de carga principal
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedReelId(null); // Limpiar ID al cargar nuevos videos

    try {
      console.log('⚙️ Fetching videos...');
      // Consulta optimizada con JOIN (por defecto usa * para evitar seleccionar todos los campos innecesarios)
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          creator:user_profiles (id, full_name, username, avatar_url, is_verified)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const videoData = data || [];
      console.log(`✅ Videos cargados: ${videoData.length}`);
      setVideos(videoData);
    } catch (err) {
      console.error('❌ Error fetching videos:', err);
      setError('No se pudieron cargar los videos. Intenta de nuevo.');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar videos al inicio
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ===========================================
  // LÓGICA DE FILTRADO Y SHUFFLE
  // ===========================================

  // Efecto para aplicar filtros, aleatorizar y establecer el Reel seleccionado
  useEffect(() => {
    if (videos.length === 0) {
      setFilteredVideos([]);
      setShuffledReels([]);
      setShuffledHorizontals([]);
      setOrientationStats({ vertical: 0, horizontal: 0 });
      return;
    }

    console.log('🔄 Aplicando lógica de filtrado y aleatorización...');

    // 1. Separar y contar orientaciones
    const verticalVids = videos.filter(v => v.orientation === 'vertical');
    const horizontalVids = videos.filter(v => v.orientation !== 'vertical');
    setOrientationStats({ vertical: verticalVids.length, horizontal: horizontalVids.length });

    // 2. Aleatorizar por separado (solo si la lista completa no ha sido aleatorizada previamente)
    const shuffledR = shuffleArray(verticalVids);
    const shuffledH = shuffleArray(horizontalVids);
    
    setShuffledReels(shuffledR);
    setShuffledHorizontals(shuffledH);

    // 3. Aplicar orientación y ordenamiento (main logic)
    let filtered = [];

    if (activeOrientation === 'all') {
      // Si estamos en 'all', mezclamos horizontales y verticales
      // NOTA: Para UX, podemos mostrar el carrusel de reels arriba
      const combined = [...shuffledR, ...shuffledH];
      filtered = shuffleArray(combined);
      
      // En 'all', forzamos el layout a 'grid'
      if (layout !== 'grid') setLayout('grid'); 

    } else if (activeOrientation === 'vertical') {
      
      // Si el ID de un reel específico fue pasado por navegación
      if (selectedReelId) {
        // Buscamos el reel específico. Si no se encuentra, usamos los shuffled.
        const specificReel = shuffledR.find(r => r.id === selectedReelId);
        if (specificReel) {
          console.log(`✨ Reel ID ${selectedReelId} encontrado y movido al inicio.`);
          // Movemos el reel seleccionado al inicio y lo concatenamos con el resto
          filtered = [
            specificReel,
            ...shuffledR.filter(r => r.id !== selectedReelId)
          ];
        } else {
          console.log(`⚠️ Reel ID ${selectedReelId} no encontrado. Usando lista aleatoria.`);
          filtered = shuffledR;
        }
      } else {
        // Si no hay ID, usamos la lista aleatoria
        filtered = shuffledR;
      }

      // En 'vertical', forzamos el layout a 'grid'
      if (layout !== 'grid') setLayout('grid');

    } else if (activeOrientation === 'horizontal') {
      
      // En horizontal, aplicamos el filtro de layout
      if (layout === 'grid') {
        filtered = shuffledH;
      } else if (layout === 'feed') {
        // En feed, no aleatorizamos y mostramos los más recientes primero
        filtered = horizontalVids.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    }

    // 4. Aplicar filtros generales (ej: 'trending', 'following')
    // Nota: Por simplicidad, se omite la implementación de 'trending'/'following'
    // en la lógica actual, ya que el focus está en la orientación.

    setFilteredVideos(filtered);
    
    // Inicialización segura de selectedReelId para el carrusel móvil
    // Si estamos en vertical y no hay un ID seleccionado, usamos el primero
    if (activeOrientation === 'vertical' && !selectedReelId && shuffledR.length > 0) {
      console.log('✨ Inicializando selectedReelId con el primer reel aleatorio.');
      setSelectedReelId(shuffledR[0].id);
    }
  }, [videos, activeFilter, activeOrientation, layout, selectedReelId]); // ✅ CORRECCIÓN: AÑADIDO selectedReelId

  // ===========================================
  // HANDLERS
  // ===========================================

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleOrientationChange = (orientation) => {
    console.log(`🎬 Cambiando orientación a: ${orientation}`);
    setActiveOrientation(orientation);
    setSelectedReelId(null); // Limpiar el ID al cambiar de orientación
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };
  
  // Handler para la selección de Reel (desde carrusel desktop o VideoFeedGrid)
  const handleReelSelect = (reelId) => {
    console.log(`🔄 Seleccionando Reel ID: ${reelId}`);
    // Esto disparará la re-ejecución del useEffect gracias a la corrección
    setSelectedReelId(reelId);
    
    // Si el usuario ya estaba en el dashboard, pero en modo 'all',
    // lo movemos a 'vertical' para enfocar el Reel.
    if (activeOrientation !== 'vertical') {
      setActiveOrientation('vertical');
    }
  };


  // ===========================================
  // RENDERIZADO
  // ===========================================

  const effectiveLayout = isMobile ? 'grid' : layout;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Loader" size={40} className="animate-spin mx-auto mb-4" />
          <p>Cargando feed de videos...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-20 text-red-500">
          <Icon name="AlertTriangle" size={40} className="mx-auto mb-4" />
          <p>{error}</p>
          <Button onClick={fetchVideos} variant="primary" className="mt-4">Reintentar</Button>
        </div>
      );
    }

    // Si la orientación es vertical, renderizamos la grilla de Reels
    if (activeOrientation === 'vertical') {
        // En móvil siempre será un carrusel vertical
        const isCarouselMobile = isMobile;
        
        if (shuffledReels.length === 0) {
          return (
            <div className="text-center py-20 text-muted-foreground">
              <Icon name="VideoOff" size={40} className="mx-auto mb-4" />
              <p>No hay Reels (videos verticales) disponibles.</p>
            </div>
          );
        }

        return (
          <VideoFeedGrid
            videos={filteredVideos}
            layout={isCarouselMobile ? 'feed' : 'grid'} // feed es el layout de carrusel vertical en móvil
            activeVideoId={selectedReelId} // Pasamos el ID del reel seleccionado
            onVideoSelect={handleReelSelect}
            isReelMode={true}
            isMobileCarousel={isCarouselMobile}
          />
        );
    } 

    // Si la orientación es 'all' o 'horizontal', renderizamos la grilla normal
    if (filteredVideos.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="VideoOff" size={40} className="mx-auto mb-4" />
          <p>No hay videos disponibles con esta configuración.</p>
        </div>
      );
    }

    return (
      <VideoFeedGrid
        videos={filteredVideos}
        layout={effectiveLayout}
        activeVideoId={null}
        onVideoSelect={() => {}} // No hay selección en modo grilla normal
        isReelMode={false}
      />
    );
  };


  return (
    <>
      <Helmet>
        <title>Dashboard | Video Feed</title>
      </Helmet>
      
      <Header
        activeOrientation={activeOrientation}
        onOrientationChange={handleOrientationChange}
        orientationStats={orientationStats}
      />

      <div className="pt-16 min-h-screen bg-background">
        <main className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {activeOrientation === 'all' && 'Explorar Videos'}
              {activeOrientation === 'vertical' && 'Reels (Videos Cortos)'}
              {activeOrientation === 'horizontal' && 'Videos Largos'}
            </h1>
            
            <div className="flex items-center space-x-3">
              {/* Controles de Layout (Solo para horizontal en Desktop) */}
              {activeOrientation === 'horizontal' && !isMobile && (
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => handleLayoutChange('grid')}
                    className={`p-2 rounded-md transition-colors ${layout === 'grid' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:bg-muted/80'}`}
                    title="Vista de Cuadrícula"
                  >
                    <Icon name="LayoutGrid" size={20} />
                  </button>
                  <button
                    onClick={() => handleLayoutChange('feed')}
                    className={`p-2 rounded-md transition-colors ${layout === 'feed' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:bg-muted/80'}`}
                    title="Vista de Feed"
                  >
                    <Icon name="List" size={20} />
                  </button>
                </div>
              )}

              <FilterChips
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>
          
          <PullToRefresh onRefresh={fetchVideos}>
            <div className="flex gap-8">
              {/* Contenido Principal */}
              <div className="flex-1 min-w-0">
                {/* Carrusel de Reels para Desktop (Solo en modo 'all') */}
                {!isMobile && activeOrientation === 'all' && shuffledReels.length > 0 && (
                  <div className="mb-6">
                    <ReelsCarouselDesktop 
                      videos={shuffledReels}
                      onReelClick={handleReelSelect}
                      // Aquí podrías pasar lógica de carga infinita si la tienes
                    />
                  </div>
                )}

                {/* Contenido principal (Grilla/Feed de Videos) */}
                {renderContent()}
              </div>

              {/* Sidebar de Tendencias (Solo en Desktop) */}
              {!isMobile && (
                <div className="w-80 flex-shrink-0 sticky top-20 hidden lg:block">
                  <TrendingSidebar />
                </div>
              )}
            </div>
          </PullToRefresh>
        </main>
        
        {/* Componente flotante para animación de puntos */}
        <PointsFloatingAnimation />

        {/* Indicador de Balance de Puntos Fijo en Móvil */}
        <div className="fixed bottom-4 right-4 z-40 lg:hidden">
          <PointsBalanceIndicator
            points={user?.freePoints}
            premiumPoints={user?.premiumPoints} 
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
