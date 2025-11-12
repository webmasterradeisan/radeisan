// src/components/video/RelatedVideosSidebar.jsx
// ============================================================================
// SIDEBAR DE VIDEOS RELACIONADOS - Estilo YouTube Mejorado
// ============================================================================
// ✅ Carrusel de REELS con scroll de rueda del mouse
// ✅ Flechas SIEMPRE VISIBLES con diseño moderno
// ✅ CORREGIDO: Navegación de Reels para usar state (replicando el comportamiento del Dashboard)
// ✅ Videos relacionados horizontales
// ✅ Información completa del creador
// ✅ Filtros inteligentes
// ✅ Diseño responsive
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import Icon from 'components/AppIcon';

// ===============================
// COMPONENTE: CARRUSEL DE REELS
// ===============================
const ReelsCarousel = ({ reels = [], onReelClick }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [reels]);

  // ✅ SCROLL CON RUEDA DEL MOUSE
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollBy({
          left: e.deltaY > 0 ? 100 : -100,
          behavior: 'smooth'
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === 'left' ? -280 : 280;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!reels || reels.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <Icon name="Play" size={16} className="text-white" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Reels</h3>
      </div>

      {/* Carrusel */}
      <div className="relative group">
        {/* ✅ Botón izquierdo - SIEMPRE VISIBLE */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-background hover:scale-110 border border-border"
            aria-label="Scroll a la izquierda"
          >
            <Icon name="ChevronLeft" size={20} className="text-foreground" />
          </button>
        )}

        {/* Contenedor de reels */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {reels.slice(0, 12).map((reel, index) => (
            <div
              key={reel.id}
              onClick={() => onReelClick?.(index, reel.id)}
              className="flex-shrink-0 w-[140px] cursor-pointer group/reel"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted mb-2">
                {reel.thumbnail || reel.thumbnail_url ? (
                  <img
                    src={reel.thumbnail || reel.thumbnail_url}
                    alt={reel.title}
                    onError={(e) => {
                      e.target.src = '/default-thumbnail.jpg';
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/reel:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Icon name="Video" size={32} className="text-muted-foreground" />
                  </div>
                )}
                
                {/* Overlay gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                {/* Play button en hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/reel:opacity-100 transition-opacity duration-200 bg-black/30">
                  <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50">
                    <Icon name="Play" size={20} color="white" />
                  </div>
                </div>

                {/* Borde en hover */}
                <div className="absolute inset-0 border-2 border-transparent group-hover/reel:border-primary rounded-xl transition-colors duration-200" />
              </div>

              {/* Título (máximo 2 líneas) */}
              <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight mb-1">
                {reel.title}
              </p>

              {/* Visualizaciones */}
              <p className="text-xs text-muted-foreground">
                {formatViews(reel.views_count || reel.views)} visualizaciones
              </p>
            </div>
          ))}
        </div>

        {/* ✅ Botón derecho - SIEMPRE VISIBLE */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-background hover:scale-110 border border-border"
            aria-label="Scroll a la derecha"
          >
            <Icon name="ChevronRight" size={20} className="text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};

// ===============================
// COMPONENTE: VIDEO CARD
// ===============================
const VideoCard = ({ video, onClick, showIndex, index }) => {
  return (
    <div
      onClick={onClick}
      className="flex gap-3 cursor-pointer group mb-3"
    >
      {/* Thumbnail */}
      <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {video.thumbnail || video.thumbnail_url ? (
          <img
            src={video.thumbnail || video.thumbnail_url}
            alt={video.title}
            onError={(e) => {
              e.target.src = '/default-thumbnail.jpg';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Icon name="Video" size={24} className="text-muted-foreground" />
          </div>
        )}
        
        {/* Duration Badge */}
        {video.duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Icon name="Play" size={16} className="ml-0.5" />
          </div>
        </div>

        {/* Index Badge */}
        {showIndex && index === 0 && (
          <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
            Siguiente
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {video.title}
        </h3>

        {/* Creator */}
        <div className="flex items-center gap-1 mb-1">
          <Link
            to={`/profile/${video.creator?.username || 'unknown'}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
          >
            {video.creator?.name || 'Usuario'}
          </Link>
          {video.creator?.is_verified && (
            <Icon name="BadgeCheck" size={12} className="text-blue-500 flex-shrink-0" />
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{formatViews(video.views_count || video.views)} vistas</span>
          {video.created_at && (
            <>
              <span>•</span>
              <span>{formatTimeAgo(video.created_at)}</span>
            </>
          )}
        </div>

        {/* Category Badge */}
        {video.category && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Icon name="Tag" size={10} />
              {video.category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ===============================
// FUNCIONES DE FORMATEO
// ===============================
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatViews = (views) => {
  if (!views) return '0';
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M de`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K de`;
  }
  return views.toString();
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Reciente';
  
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `hace ${diffYears} año${diffYears > 1 ? 's' : ''}`;
  if (diffMonths > 0) return `hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
  if (diffDays > 0) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffMinutes > 0) return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  return 'hace un momento';
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const RelatedVideosSidebar = ({
  videos = [],
  currentVideoId,
  autoplayEnabled = true,
  onVideoSelect,
  loading = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [reels, setReels] = useState([]);
  const [loadingReels, setLoadingReels] = useState(false);

  // Filtrar videos (excluir el actual, solo horizontales y ordenar aleatoriamente)
  useEffect(() => {
    console.log('📹 Videos recibidos en sidebar:', videos.length);
    console.log('🎯 Video actual ID:', currentVideoId);
    
    let filtered = videos.filter(video => {
      const isNotCurrent = video.id !== currentVideoId;
      const isHorizontal = !video.orientation || video.orientation === 'horizontal';
      return isNotCurrent && isHorizontal;
    });
    
    console.log('✅ Videos después de filtrar:', filtered.length);
    
    // Ordenar aleatoriamente por defecto
    filtered = filtered.sort(() => Math.random() - 0.5);
    
    setFilteredVideos(filtered);
  }, [videos, currentVideoId]);

  // Cargar Reels
  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      setLoadingReels(true);
      console.log('🎬 Cargando Reels...');
      
      // Obtener reels (videos verticales cortos)
      const { data: reelsData, error } = await supabase
        .from('videos')
        .select('*')
        .eq('is_published', true)
        .eq('orientation', 'vertical')
        .order('views_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error al cargar reels:', error);
        throw error;
      }

      console.log('✅ Reels encontrados:', reelsData?.length || 0);

      // Cargar información de creadores
      if (reelsData && reelsData.length > 0) {
        const userIds = [...new Set(reelsData.map(v => v.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: creatorsData, error: creatorsError } = await supabase
            .from('user_profiles')
            .select('id, full_name, username, avatar_url, is_verified')
            .in('id', userIds);
          
          if (creatorsError) {
            console.error('❌ Error al cargar creadores de reels:', creatorsError);
          } else if (creatorsData) {
            console.log('✅ Creadores de reels cargados:', creatorsData.length);
            const creatorsMap = {};
            creatorsData.forEach(creator => {
              creatorsMap[creator.id] = {
                id: creator.id,
                name: creator.full_name,
                username: creator.username,
                profile_image_url: creator.avatar_url,
                is_verified: creator.is_verified
              };
            });
            
            reelsData.forEach(reel => {
              if (reel.user_id && creatorsMap[reel.user_id]) {
                reel.creator = creatorsMap[reel.user_id];
              }
            });
          }
        }
      }

      setReels(reelsData || []);
      console.log('🎬 Reels cargados y listos:', reelsData?.length || 0);
    } catch (err) {
      console.error('❌ Error al cargar reels:', err);
      setReels([]);
    } finally {
      setLoadingReels(false);
    }
  };

  // Handlers
  const handleVideoClick = (video) => {
    if (onVideoSelect) {
      onVideoSelect(video);
    } else {
      navigate(`/video/${video.id}`);
      window.scrollTo(0, 0);
    }
  };

  // ✅ NAVEGACIÓN CORREGIDA A DASHBOARD CON REEL ID (USANDO STATE + REPLACE)
  const handleReelClick = (reelIndex, reelId) => {
    console.log('🎬 Click en reel del sidebar:');
    console.log('   📍 Índice:', reelIndex);
    console.log('   🆔 ID:', reelId);
    
    // Navegar a /dashboard con el ID del reel en el state
    navigate('/dashboard', {
      state: {
        orientation: 'vertical',
        selectedReelId: reelId
      },
      replace: true // ✅ FUERZA un estado de historial limpio para el Dashboard
    });
  };

  // Filtros
  const filters = [
    { id: 'all', label: 'Aleatorio', icon: 'Shuffle' },
    { id: 'recent', label: 'Recientes', icon: 'Clock' },
    { id: 'popular', label: 'Populares', icon: 'TrendingUp' }
  ];

  const applyFilter = (filterId) => {
    console.log('🔍 Aplicando filtro:', filterId);
    setSelectedFilter(filterId);
    
    let filtered = videos.filter(video => {
      const isNotCurrent = video.id !== currentVideoId;
      const isHorizontal = !video.orientation || video.orientation === 'horizontal';
      return isNotCurrent && isHorizontal;
    });
    
    switch (filterId) {
      case 'recent':
        filtered = filtered.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        break;
      case 'popular':
        filtered = filtered.sort((a, b) => 
          (b.views_count || b.views || 0) - (a.views_count || a.views || 0)
        );
        break;
      case 'all':
      default:
        filtered = filtered.sort(() => Math.random() - 0.5);
        break;
    }
    
    setFilteredVideos(filtered);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-40 h-24 bg-muted rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Carrusel de Reels */}
      {!loadingReels && reels.length > 0 && (
        <ReelsCarousel 
          reels={reels} 
          onReelClick={handleReelClick}
        />
      )}

      {/* Header con filtros */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Videos relacionados
          </h2>
          {autoplayEnabled && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Icon name="Play" size={14} className="mr-1" />
              <span>Autoplay</span>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => applyFilter(filter.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                ${selectedFilter === filter.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }
              `}
            >
              <Icon name={filter.icon} size={14} />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de videos */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Video" size={24} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            No hay videos relacionados disponibles
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {filteredVideos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={() => handleVideoClick(video)}
              showIndex={autoplayEnabled}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Autoplay notice */}
      {autoplayEnabled && filteredVideos.length > 0 && (
        <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon name="Play" size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground mb-1">
                Autoplay activado
              </h4>
              <p className="text-xs text-muted-foreground">
                El siguiente video se reproducirá automáticamente cuando termine este.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedVideosSidebar;
