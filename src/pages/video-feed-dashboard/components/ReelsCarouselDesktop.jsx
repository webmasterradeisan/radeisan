// src/pages/video-feed-dashboard/components/ReelsCarouselDesktop.jsx
// ✅ ACTUALIZADO: Pasa ID del video además del índice para reproducción correcta
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

/**
 * 🖥️ CAROUSEL HORIZONTAL DE REELS PARA DESKTOP
 * Muestra 4-5 reels visibles + navegación con botones
 * Al hacer clic → Abre ReelsContainer con el reel correcto
 */
const ReelsCarouselDesktop = ({ 
  videos = [], 
  onReelClick,
  onLoadMore,
  hasMore = true,
  loading = false
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  const ITEM_WIDTH = 200; // Ancho de cada reel (px)
  const GAP = 16; // Gap entre items (px)
  const VISIBLE_ITEMS = 5; // Cantidad de items visibles

  console.log('🖥️ ReelsCarouselDesktop renderizado:', {
    totalReels: videos.length,
    hasOnReelClick: !!onReelClick,
    scrollPosition
  });

  // Verificar posición del scroll para mostrar/ocultar botones
  const checkScrollPosition = () => {
    const container = scrollRef.current;
    if (!container) return;

    const canScrollLeft = container.scrollLeft > 0;
    const canScrollRight = 
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10;

    setShowLeftButton(canScrollLeft);
    setShowRightButton(canScrollRight);
    setScrollPosition(container.scrollLeft);
  };

  useEffect(() => {
    checkScrollPosition();
    
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);
      
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
      };
    }
  }, [videos]);

  // Navegación con botones
  const scrollLeft = () => {
    if (scrollRef.current) {
      const scrollAmount = (ITEM_WIDTH + GAP) * 2; // Scroll 2 items
      scrollRef.current.scrollBy({ 
        left: -scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      const scrollAmount = (ITEM_WIDTH + GAP) * 2; // Scroll 2 items
      scrollRef.current.scrollBy({ 
        left: scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  // ===============================
  // ✅ HANDLER ACTUALIZADO: Pasa el reel completo para obtener su ID
  // ===============================
  const handleReelClick = (reel, reelIndex) => {
    console.log('🎯 Desktop Carousel: Click en reel');
    console.log('   📍 Índice en carrusel:', reelIndex);
    console.log('   🆔 ID del video:', reel.id);
    console.log('   📹 Título:', reel.title);
    
    if (onReelClick) {
      // ✅ Pasar ÍNDICE Y ID al handler padre
      onReelClick(reelIndex, reel.id);
    } else {
      // Fallback: navegar a /reels
      navigate(`/reels?start=${reelIndex}`);
    }
  };

  // Navegar a página completa de reels
  const handleVerTodos = () => {
    navigate('/reels');
  };

  // Empty state
  if (!loading && videos.length === 0) {
    return null; // No mostrar nada si no hay reels
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon name="Smartphone" size={20} color="var(--color-primary)" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center space-x-2">
              <span>Reels</span>
              <span className="text-sm font-normal text-muted-foreground">
                ({videos.length})
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Videos verticales destacados
            </p>
          </div>
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
        {/* Botón Izquierdo */}
        {showLeftButton && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/95 hover:bg-background rounded-full shadow-lg flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 border border-border"
            aria-label="Scroll hacia la izquierda"
          >
            <Icon name="ChevronLeft" size={20} />
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth py-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {loading && videos.length === 0 ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0"
                style={{ width: ITEM_WIDTH }}
              >
                <div className="w-full aspect-[9/16] bg-muted rounded-lg animate-pulse"></div>
                <div className="mt-2 h-4 bg-muted rounded animate-pulse"></div>
                <div className="mt-1 h-3 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
            ))
          ) : (
            videos.map((reel, index) => (
              <div
                key={reel.id}
                className="flex-shrink-0 cursor-pointer group/reel"
                style={{ width: ITEM_WIDTH }}
                onClick={() => handleReelClick(reel, index)}
              >
                {/* Thumbnail Container (9:16 aspect ratio) */}
                <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-md">
                  {/* Thumbnail Image */}
                  <img
                    src={reel.thumbnail || reel.thumbnail_url || '/api/placeholder/200/356'}
                    alt={reel.title || 'Reel sin título'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/reel:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/api/placeholder/200/356';
                    }}
                  />

                  {/* Overlay con gradiente */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30">
                    {/* Duración (esquina superior derecha) */}
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                      {formatDuration(reel.duration || reel.duration_seconds || 30)}
                    </div>

                    {/* Views (esquina superior izquierda) */}
                    <div className="absolute top-2 left-2">
                      <div className="flex items-center space-x-1 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                        <Icon name="Eye" size={12} />
                        <span>{formatNumber(reel.views || reel.views_count || 0)}</span>
                      </div>
                    </div>

                    {/* Información inferior */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      {/* Estadísticas */}
                      <div className="flex items-center space-x-3 text-white text-xs mb-2">
                        <div className="flex items-center space-x-1">
                          <Icon name="Heart" size={12} />
                          <span>{formatNumber(reel.likes || reel.likes_count || 0)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icon name="MessageCircle" size={12} />
                          <span>{formatNumber(reel.comments || reel.comments_count || 0)}</span>
                        </div>
                      </div>

                      {/* Título */}
                      <h3 className="text-white text-sm font-medium line-clamp-2 leading-tight mb-2">
                        {reel.title || 'Sin título'}
                      </h3>

                      {/* Creador */}
                      <div className="flex items-center space-x-2">
                        <img
                          src={reel.creator?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reel.creator?.username || 'User')}`}
                          alt={reel.creator?.name || 'Usuario'}
                          className="w-5 h-5 rounded-full border border-white/30"
                        />
                        <p className="text-white/90 text-xs truncate">
                          @{reel.creator?.username || reel.creator?.name || 'usuario'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/reel:opacity-100 transition-opacity duration-200 bg-black/30">
                    <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 transform group-hover/reel:scale-110 transition-transform duration-200">
                      <Icon name="Play" size={24} color="white" />
                    </div>
                  </div>

                  {/* Borde de hover */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover/reel:border-primary rounded-lg transition-colors duration-200"></div>
                </div>

                {/* Info debajo del thumbnail (opcional) */}
                <div className="mt-2 px-1">
                  <p className="text-sm text-foreground font-medium line-clamp-1">
                    {reel.title || 'Sin título'}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    @{reel.creator?.username || reel.creator?.name || 'usuario'}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Load More Indicator */}
          {hasMore && !loading && videos.length > 0 && (
            <div 
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: ITEM_WIDTH }}
            >
              <Button
                variant="outline"
                onClick={onLoadMore}
                className="h-auto py-8 px-4 flex flex-col items-center space-y-3 bg-card hover:bg-accent"
              >
                <Icon name="Plus" size={24} />
                <span className="text-sm text-center">Cargar más reels</span>
              </Button>
            </div>
          )}
        </div>

        {/* Botón Derecho */}
        {showRightButton && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/95 hover:bg-background rounded-full shadow-lg flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 border border-border"
            aria-label="Scroll hacia la derecha"
          >
            <Icon name="ChevronRight" size={20} />
          </button>
        )}

        {/* Gradientes laterales para indicar más contenido */}
        {showLeftButton && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none"></div>
        )}
        {showRightButton && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none"></div>
        )}
      </div>

      {/* Loading indicator para más contenido */}
      {loading && videos.length > 0 && (
        <div className="flex justify-center mt-4">
          <div className="flex items-center space-x-2 text-muted-foreground text-sm">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando más reels...</span>
          </div>
        </div>
      )}

      {/* Indicador de scroll */}
      {videos.length > VISIBLE_ITEMS && (
        <div className="flex justify-center mt-4 gap-1">
          {Array.from({ length: Math.ceil(videos.length / VISIBLE_ITEMS) }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-200 ${
                Math.floor(scrollPosition / ((ITEM_WIDTH + GAP) * VISIBLE_ITEMS)) === i
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted'
              }`}
            ></div>
          ))}
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

export default ReelsCarouselDesktop;
