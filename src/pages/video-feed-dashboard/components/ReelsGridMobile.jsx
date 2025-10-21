// src/pages/video-feed-dashboard/components/ReelsGridMobile.jsx
// ✅ ACTUALIZADO: onClick abre ReelsContainer en lugar de navegar a /reels
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

/**
 * 📱 CAROUSEL HORIZONTAL DE REELS PARA MÓVIL
 * Muestra 3 reels visibles + scroll horizontal táctil
 * ✅ ACTUALIZADO: onClick abre visor en lugar de navegar
 */
const ReelsGridMobile = ({ 
  videos = [], 
  onLoadMore, 
  hasMore = true, 
  loading = false,
  onReelClick // ✅ NUEVO: Callback para abrir visor
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  console.log('🎬 ReelsGridMobile renderizado:', {
    totalVideos: videos.length,
    hasMore,
    loading,
    hasOnReelClick: !!onReelClick
  });

  // Filtrar solo videos verticales para reels (aspect ratio <= 0.8)
  const reelsVideos = videos.filter(video => {
    if (!video.width || !video.height) return true; // Asumir vertical si no hay dimensiones
    const aspectRatio = video.width / video.height;
    return aspectRatio <= 0.8; // Videos verticales o cuadrados
  });

  console.log('📱 Videos filtrados para reels:', {
    original: videos.length,
    filtered: reelsVideos.length
  });

  // Verificar posición del scroll para mostrar/ocultar botones de navegación
  const checkScrollPosition = () => {
    const container = scrollRef.current;
    if (!container) return;

    const canScrollLeft = container.scrollLeft > 0;
    const canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth;

    setShowLeftButton(canScrollLeft);
    setShowRightButton(canScrollRight);
  };

  useEffect(() => {
    checkScrollPosition();
    
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [reelsVideos]);

  // Navegación con botones (para desktop)
  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -280, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 280, behavior: 'smooth' });
  };

  // ===============================
  // ✅ HANDLER ACTUALIZADO - Abre visor en lugar de navegar
  // ===============================
  const handleReelClick = (reelIndex) => {
    console.log('🎯 Click en reel:', reelIndex);
    
    // Si existe el callback onReelClick, usarlo (NUEVO COMPORTAMIENTO)
    if (onReelClick) {
      console.log('✅ Abriendo visor de reels con índice:', reelIndex);
      onReelClick(reelIndex);
    } else {
      // Fallback: Navegar a página de reels (COMPORTAMIENTO ANTERIOR)
      console.log('⚠️ No hay onReelClick, navegando a /reels');
      navigate(`/reels?start=${reelIndex}`);
    }
  };

  // Navegar a página completa de reels
  const handleVerTodos = () => {
    console.log('🎯 Navegando a página completa de reels');
    navigate('/reels');
  };

  // Loading skeleton mientras cargan los reels
  const renderSkeleton = () => (
    <div className="flex space-x-3 px-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex-shrink-0">
          <div className="w-32 h-56 bg-muted rounded-lg animate-pulse"></div>
        </div>
      ))}
    </div>
  );

  // Empty state cuando no hay reels
  if (!loading && reelsVideos.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center space-x-2">
            <Icon name="Smartphone" size={20} color="var(--color-primary)" />
            <h2 className="text-lg font-semibold text-foreground">Reels</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleVerTodos}>
            Ver todos
            <Icon name="ChevronRight" size={16} className="ml-1" />
          </Button>
        </div>
        <div className="flex items-center justify-center py-8 px-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
              <Icon name="Smartphone" size={24} color="var(--color-muted-foreground)" />
            </div>
            <p className="text-sm text-muted-foreground">No hay reels disponibles</p>
            <p className="text-xs text-muted-foreground mt-1">Sé el primero en crear contenido vertical</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Header con título y botón "Ver todos" */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center space-x-2">
          <Icon name="Smartphone" size={20} color="var(--color-primary)" />
          <h2 className="text-lg font-semibold text-foreground">Reels</h2>
          <span className="text-sm text-muted-foreground">({reelsVideos.length})</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleVerTodos}
          className="text-primary hover:text-primary/80"
        >
          Ver todos
          <Icon name="ChevronRight" size={16} className="ml-1" />
        </Button>
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className="flex space-x-3 overflow-x-auto scrollbar-hide px-4 pb-2"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {loading ? renderSkeleton() : reelsVideos.map((reel, index) => (
            <div
              key={reel.id}
              className="flex-shrink-0 w-32 cursor-pointer group/reel"
              style={{ scrollSnapAlign: 'start' }}
              onClick={() => handleReelClick(index)}
            >
              {/* Thumbnail Container */}
              <div className="relative w-32 h-56 bg-black rounded-lg overflow-hidden shadow-md">
                {/* Video Thumbnail */}
                <img
                  src={reel.thumbnail || '/api/placeholder/128/224'}
                  alt={reel.title || 'Reel sin título'}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover/reel:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/128/224';
                  }}
                />

                {/* Overlay con gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20">
                  {/* Duración del video (esquina superior derecha) */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    {formatDuration(reel.duration || 30)}
                  </div>

                  {/* Estadísticas principales (esquina superior izquierda) */}
                  <div className="absolute top-2 left-2 text-white text-xs">
                    <div className="flex items-center space-x-1 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                      <Icon name="Eye" size={10} />
                      <span>{formatNumber(reel.views || 0)}</span>
                    </div>
                  </div>

                  {/* Información inferior */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {/* Estadísticas completas */}
                    <div className="flex items-center justify-between text-white text-xs mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <Icon name="Heart" size={11} />
                          <span>{formatNumber(reel.likes || 0)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icon name="MessageCircle" size={11} />
                          <span>{formatNumber(reel.comments || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Título truncado */}
                    <h3 className="text-white text-xs font-medium line-clamp-2 leading-tight mb-1">
                      {reel.title || 'Sin título'}
                    </h3>

                    {/* Creador */}
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-white/20 rounded-full flex-shrink-0"></div>
                      <p className="text-white/80 text-xs truncate">
                        @{reel.creator?.username || 'usuario'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Play Button Overlay - Solo visible en hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/reel:opacity-100 transition-opacity duration-200 bg-black/20">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                    <Icon name="Play" size={20} color="white" />
                  </div>
                </div>

                {/* Borde de selección */}
                <div className="absolute inset-0 border-2 border-transparent group-hover/reel:border-primary/50 rounded-lg transition-colors duration-200"></div>
              </div>
            </div>
          ))}

          {/* Load More Indicator */}
          {hasMore && !loading && reelsVideos.length > 0 && (
            <div className="flex-shrink-0 w-32 h-56 flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                className="h-auto py-4 px-3 flex-col space-y-2 bg-card hover:bg-accent"
              >
                <Icon name="Plus" size={20} />
                <span className="text-xs text-center">Cargar más</span>
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Buttons - Solo visibles en hover en desktop */}
        {showLeftButton && (
          <button
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hidden md:flex"
            aria-label="Scroll hacia la izquierda"
          >
            <Icon name="ChevronLeft" size={16} />
          </button>
        )}

        {showRightButton && (
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hidden md:flex"
            aria-label="Scroll hacia la derecha"
          >
            <Icon name="ChevronRight" size={16} />
          </button>
        )}
      </div>

      {/* Indicador de scroll en móvil */}
      {reelsVideos.length > 3 && (
        <div className="flex justify-center mt-3 md:hidden">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-primary rounded-full"></div>
            <div className="w-4 h-1 bg-muted rounded-full"></div>
            <div className="w-1 h-1 bg-muted rounded-full"></div>
          </div>
        </div>
      )}

      {/* Loading indicator para más contenido */}
      {loading && reelsVideos.length > 0 && (
        <div className="flex justify-center mt-3">
          <div className="flex items-center space-x-2 text-muted-foreground text-sm">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando más reels...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ===============================
// FUNCIONES HELPER
// ===============================

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:30';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatNumber = (num) => {
  if (!num || num === 0) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default ReelsGridMobile;
