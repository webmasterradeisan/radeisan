// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ✅ VERSIÓN FINAL: Combinación perfecta de ambos archivos
// ✅ Deslizamiento funcional en móviles + Player sin franjas negras
// ✅ Navegación con rueda del mouse en desktop + Touch gestures óptimos
// ✅ Menú de navegación inferior integrado (solo móviles)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Share, Volume2, VolumeX, Play, ChevronUp, ChevronDown, Home, Video, ShoppingBag, Gift, User } from 'lucide-react';

const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null,
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [enableTransition, setEnableTransition] = useState(false);
  const [initialReelSet, setInitialReelSet] = useState(false);
  const [lastSelectedReelId, setLastSelectedReelId] = useState(null);
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const hasPlayedInitial = useRef(false);
  const wheelTimeout = useRef(null);

  console.log('🎬 ReelsContainer render:', {
    videosCount: videos.length,
    currentIndex,
    selectedReelId,
    lastSelectedReelId,
    initialReelSet,
    currentVideoId: videos[currentIndex]?.id,
    currentVideoTitle: videos[currentIndex]?.title
  });

  // ===============================
  // ✅ FUNCIÓN: Encontrar índice por ID (MEMOIZADA)
  // ===============================
  const findVideoIndexById = useCallback((videoId) => {
    if (!videoId || videos.length === 0) return 0;
    
    const index = videos.findIndex(video => video.id === videoId);
    
    if (index !== -1) {
      console.log('🔍 Video encontrado:', {
        searchId: videoId,
        foundIndex: index,
        title: videos[index]?.title
      });
    }
    
    return index >= 0 ? index : 0;
  }, [videos]);

  // ===============================
  // ✅ EFECTO PRINCIPAL: Establecer reel inicial (SOLO UNA VEZ)
  // ===============================
  useEffect(() => {
    if (videos.length === 0 || initialReelSet) return;
    
    console.log('🎯 [INICIAL] Configurando reel por primera vez');

    const targetIndex = findVideoIndexById(selectedReelId);
    
    console.log('✅ [INICIAL] Índice calculado:', targetIndex);

    setCurrentIndex(targetIndex);
    setEnableTransition(false);
    setInitialReelSet(true);
    hasPlayedInitial.current = false;

    setTimeout(() => {
      setEnableTransition(true);
    }, 100);

  }, [videos.length, initialReelSet]); // Dependencias mínimas

  // ===============================
  // ✅ EFECTO: Actualizar cuando cambie selectedReelId (DESPUÉS DEL INICIAL)
  // ===============================
  useEffect(() => {
    if (!initialReelSet || !selectedReelId || videos.length === 0) return;

    const targetIndex = findVideoIndexById(selectedReelId);
    
    if (targetIndex !== currentIndex) {
      console.log('🔄 [UPDATE] Cambiando a reel:', targetIndex);
      setCurrentIndex(targetIndex);
      hasPlayedInitial.current = false;
    }
  }, [selectedReelId, initialReelSet]); // Sin videos ni currentIndex para evitar loops

  // ===============================
  // RESPONSIVE DETECTION
  // ===============================
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const newIsDesktop = width >= 768;
      console.log('📱 Device check:', { width, isDesktop: newIsDesktop });
      setIsDesktop(newIsDesktop);
    };

    checkDevice(); // Ejecutar inmediatamente
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // ===============================
  // ✅ MOUSE WHEEL NAVIGATION (DESKTOP) - CORREGIDO V3
  // ===============================
  useEffect(() => {
    if (!isDesktop) {
      console.log('⏭️ Skipping wheel listener (mobile mode)');
      return;
    }

    const handleWheel = (e) => {
      // CRÍTICO: Prevenir scroll de la página
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🖱️ Wheel event:', e.deltaY, 'currentIndex:', currentIndex);
      
      // Debounce simple para evitar scroll demasiado rápido
      if (handleWheel.isScrolling) {
        console.log('⏸️ Scroll en progreso, ignorando');
        return;
      }
      
      handleWheel.isScrolling = true;
      
      // Navegación
      if (e.deltaY > 0 && currentIndex < videos.length - 1) {
        console.log('⬇️ Next video');
        setCurrentIndex(prev => prev + 1);
        hasPlayedInitial.current = true;
      } else if (e.deltaY < 0 && currentIndex > 0) {
        console.log('⬆️ Previous video');
        setCurrentIndex(prev => prev - 1);
        hasPlayedInitial.current = true;
      }
      
      // Liberar después de 500ms
      setTimeout(() => {
        handleWheel.isScrolling = false;
      }, 500);
    };

    // Capturar en el contenedor principal del componente
    const mainContainer = document.querySelector('[data-reels-container]');
    
    if (mainContainer) {
      console.log('✅ Wheel listener agregado al contenedor principal');
      mainContainer.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        console.log('🗑️ Wheel listener removido');
        mainContainer.removeEventListener('wheel', handleWheel);
      };
    } else {
      console.warn('⚠️ No se encontró el contenedor principal');
    }
  }, [isDesktop, currentIndex, videos.length]);

  // ===============================
  // ✅ FORZAR REPRODUCCIÓN DEL VIDEO INICIAL
  // ===============================
  useEffect(() => {
    if (hasPlayedInitial.current || videos.length === 0 || !initialReelSet) return;

    console.log('🎬 Intentando reproducir video inicial:', {
      currentIndex,
      videoId: videos[currentIndex]?.id,
      videoTitle: videos[currentIndex]?.title
    });
    
    const attemptPlay = () => {
      const currentVideo = videoRefs.current[currentIndex];
      
      if (!currentVideo) {
        console.log('⏳ Video no disponible aún, reintentando...');
        setTimeout(attemptPlay, 100);
        return;
      }

      console.log('🎮 Video encontrado, reproduciendo:', {
        index: currentIndex,
        src: currentVideo.src,
        readyState: currentVideo.readyState
      });

      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
        }
      });

      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video inicial reproduciendo correctamente');
            hasPlayedInitial.current = true;
          })
          .catch(err => {
            console.error('❌ Error autoplay inicial:', err);
            currentVideo.muted = true;
            currentVideo.play()
              .then(() => {
                console.log('✅ Video inicial reproduciendo (muted)');
                hasPlayedInitial.current = true;
              })
              .catch(e => console.error('❌ Error crítico reproducción inicial:', e));
          });
      }
    };

    setTimeout(attemptPlay, 250);
  }, [videos, currentIndex, mutedVideos, initialReelSet]);

  // ===============================
  // ✅ AUTOPLAY Y GESTIÓN DE VIDEOS
  // ===============================
  useEffect(() => {
    if (videos.length === 0 || !initialReelSet) return;
    
    if (!hasPlayedInitial.current) {
      return;
    }

    const currentVideo = videoRefs.current[currentIndex];
    
    if (currentVideo && isAutoPlaying) {
      console.log('🎮 Autoplay - Video:', {
        index: currentIndex,
        videoId: videos[currentIndex]?.id,
        videoTitle: videos[currentIndex]?.title
      });

      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
        }
      });

      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video reproduciendo (autoplay)');
          })
          .catch(err => {
            console.error('❌ Error autoplay:', err);
            currentVideo.muted = true;
            currentVideo.play()
              .then(() => console.log('✅ Video reproduciendo (muted)'))
              .catch(e => console.error('❌ Error crítico autoplay:', e));
          });
      }
    }
  }, [currentIndex, videos, isAutoPlaying, mutedVideos, initialReelSet]);

  // Precargar videos adyacentes
  useEffect(() => {
    if (videos.length === 0) return;

    if (currentIndex < videos.length - 1) {
      const nextVideo = videoRefs.current[currentIndex + 1];
      if (nextVideo && nextVideo.readyState < 2) {
        nextVideo.load();
      }
    }

    if (currentIndex >= videos.length - 3 && hasMore && !loading) {
      onLoadMore && onLoadMore();
    }
  }, [currentIndex, videos.length, hasMore, loading, onLoadMore]);

  // ===============================
  // ✅ NAVEGACIÓN POR SCROLL/TOUCH - OPTIMIZADO V2
  // ===============================
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartTime = useRef(0);

  const handleTouchStart = useCallback((e) => {
    console.log('👆 Touch start:', e.touches[0].clientY);
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    
    console.log('👉 Touch move:', diff);
    
    // NO prevenir el comportamiento por defecto aquí
  }, [isDragging, startY]);

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging) return;
    
    console.log('👋 Touch end');
    setIsDragging(false);

    const currentY = e.changedTouches[0].clientY;
    const diff = startY - currentY;
    const touchDuration = Date.now() - touchStartTime.current;

    console.log('📊 Swipe stats:', {
      diff,
      duration: touchDuration,
      currentIndex,
      maxIndex: videos.length - 1
    });

    // Detectar swipe con umbral más bajo
    const isQuickSwipe = touchDuration < 300 && Math.abs(diff) > 30;
    const isLongSwipe = Math.abs(diff) > 60;

    if (isQuickSwipe || isLongSwipe) {
      if (diff > 0 && currentIndex < videos.length - 1) {
        console.log('⬇️ Swipe UP - Next video');
        setCurrentIndex(prev => prev + 1);
        hasPlayedInitial.current = true;
      } else if (diff < 0 && currentIndex > 0) {
        console.log('⬆️ Swipe DOWN - Previous video');
        setCurrentIndex(prev => prev - 1);
        hasPlayedInitial.current = true;
      }
    }
  }, [isDragging, startY, currentIndex, videos.length]);

  // Navegación con teclas
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log('⌨️ Key pressed:', e.key);
      
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        console.log('⬆️ Arrow UP');
        setCurrentIndex(prev => prev - 1);
        hasPlayedInitial.current = true;
      } else if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        console.log('⬇️ Arrow DOWN');
        setCurrentIndex(prev => prev + 1);
        hasPlayedInitial.current = true;
      } else if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  // ===============================
  // HANDLERS DE INTERACCIÓN
  // ===============================
  const handlePlayPause = (e) => {
    if (e) e.stopPropagation();
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    if (currentVideo.paused) {
      currentVideo.play();
      setIsAutoPlaying(true);
    } else {
      currentVideo.pause();
      setIsAutoPlaying(false);
    }
  };

  const handleMuteToggle = (videoId) => {
    const newMutedVideos = new Set(mutedVideos);
    if (newMutedVideos.has(videoId)) {
      newMutedVideos.delete(videoId);
    } else {
      newMutedVideos.add(videoId);
    }
    setMutedVideos(newMutedVideos);

    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.muted = newMutedVideos.has(videoId);
    }
  };

  const handleLike = (videoId) => {
    const newLikedVideos = new Set(likedVideos);
    if (newLikedVideos.has(videoId)) {
      newLikedVideos.delete(videoId);
    } else {
      newLikedVideos.add(videoId);
      onPointsEarned && onPointsEarned(5);
    }
    setLikedVideos(newLikedVideos);
  };

  const handleSave = (videoId) => {
    const newSavedVideos = new Set(savedVideos);
    if (newSavedVideos.has(videoId)) {
      newSavedVideos.delete(videoId);
    } else {
      newSavedVideos.add(videoId);
      onPointsEarned && onPointsEarned(2);
    }
    setSavedVideos(newSavedVideos);
  };

  const handleShare = async (video) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Mira este reel de ${video.creator.name}`,
          url: `${window.location.origin}/reel/${video.id}`
        });
        onPointsEarned && onPointsEarned(3);
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/reel/${video.id}`);
        alert('Enlace copiado al portapapeles');
        onPointsEarned && onPointsEarned(3);
      } catch (error) {
        console.log('Error copying:', error);
      }
    }
  };

  // ===============================
  // NAVEGACIÓN CON BOTONES
  // ===============================
  const navigateNext = () => {
    console.log('🔘 Button Next clicked');
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      hasPlayedInitial.current = true;
    }
  };

  const navigatePrevious = () => {
    console.log('🔘 Button Previous clicked');
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      hasPlayedInitial.current = true;
    }
  };

  // ===============================
  // ✅ COMPONENTE INDIVIDUAL DE REEL
  // ===============================
  const ReelItem = ({ video, index, isActive }) => {
    const videoUrl = video.videoUrl || video.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const isLiked = likedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isMuted = mutedVideos.has(video.id);

    return (
      <div 
        key={video.id}
        className={`
          relative flex-shrink-0 bg-black
          ${isDesktop ? 'h-[80vh]' : 'h-screen'}
        `}
      >
        {/* CAPA TOUCH OVERLAY para capturar gestos - z-10 (solo móvil) */}
        {!isDesktop && (
          <div
            className="absolute inset-0 z-10"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
              touchAction: 'pan-y',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          />
        )}

        {/* VIDEO - ✅ object-cover sin franjas negras */}
        <video
          ref={el => videoRefs.current[index] = el}
          src={videoUrl}
          className="w-full h-full object-cover"
          loop
          playsInline
          preload={Math.abs(index - currentIndex) <= 1 ? "auto" : "none"}
          onClick={isDesktop ? handlePlayPause : undefined}
          style={{ pointerEvents: isDesktop ? 'auto' : 'none' }}
        />

        {/* CONTROLES LATERALES (Derecha) - z-50 */}
        <div className={`
          absolute flex flex-col space-y-4 z-50 pointer-events-none
          ${isDesktop ? 'bottom-16 right-6' : 'bottom-24 right-4'}
        `}>
          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike(video.id);
            }}
            className="flex flex-col items-center space-y-1 pointer-events-auto"
          >
            <div className={`
              rounded-full flex items-center justify-center transition-all duration-200
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
              ${isLiked 
                ? 'bg-red-500/20 text-red-500' 
                : 'bg-black/30 text-white hover:bg-white/20'
              }
            `}>
              <Heart 
                size={isDesktop ? 26 : 24} 
                className={isLiked ? 'fill-current' : ''} 
              />
            </div>
            <span className={`text-white font-medium ${isDesktop ? 'text-sm' : 'text-xs'}`}>
              {video.likes || 0}
            </span>
          </button>

          {/* Comentarios */}
          <div className="flex flex-col items-center space-y-1 pointer-events-auto">
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              <MessageCircle size={isDesktop ? 26 : 24} color="white" />
            </div>
            <span className={`text-white font-medium ${isDesktop ? 'text-sm' : 'text-xs'}`}>
              {video.comments || 0}
            </span>
          </div>

          {/* Guardar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave(video.id);
            }}
            className="flex flex-col items-center space-y-1 pointer-events-auto"
          >
            <div className={`
              rounded-full flex items-center justify-center transition-all duration-200
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
              ${isSaved 
                ? 'bg-yellow-500/20 text-yellow-500' 
                : 'bg-black/30 text-white hover:bg-white/20'
              }
            `}>
              <Bookmark 
                size={isDesktop ? 26 : 24} 
                className={isSaved ? 'fill-current' : ''} 
              />
            </div>
          </button>

          {/* Compartir */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare(video);
            }}
            className="flex flex-col items-center space-y-1 pointer-events-auto"
          >
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              <Share size={isDesktop ? 26 : 24} color="white" />
            </div>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMuteToggle(video.id);
            }}
            className="flex flex-col items-center space-y-1 pointer-events-auto"
          >
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              {isMuted ? (
                <VolumeX size={isDesktop ? 26 : 24} color="white" />
              ) : (
                <Volume2 size={isDesktop ? 26 : 24} color="white" />
              )}
            </div>
          </button>
        </div>

        {/* INFORMACIÓN DEL VIDEO (Abajo Izquierda) - z-50 */}
        <div className={`
          absolute text-white z-50 pointer-events-none
          ${isDesktop ? 'bottom-12 left-6 right-24' : 'bottom-24 left-4 right-20'}
        `}>
          
          {/* Información del creador */}
          <div className="flex items-center space-x-3 mb-3">
            <span className={`font-semibold ${isDesktop ? 'text-lg' : 'text-base'}`}>
              {video.creator?.name || 'Usuario'}
            </span>
            <span className="text-gray-300">•</span>
            <span className={`text-gray-300 ${isDesktop ? 'text-base' : 'text-sm'}`}>
              {video.timeAgo || 'Reciente'}
            </span>
          </div>

          {/* Título y descripción */}
          <div className="mb-3">
            <h3 className={`font-medium mb-1 line-clamp-2 ${isDesktop ? 'text-xl' : 'text-lg'}`}>
              {video.title}
            </h3>
            <p className={`text-gray-200 line-clamp-2 opacity-90 ${isDesktop ? 'text-base' : 'text-sm'}`}>
              {video.description}
            </p>
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.tags.slice(0, 3).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className={`text-cyan-400 font-medium ${isDesktop ? 'text-base' : 'text-sm'}`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* INDICADOR DE PLAY/PAUSE - z-30 */}
        {!isAutoPlaying && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`
              bg-black/50 rounded-full flex items-center justify-center
              ${isDesktop ? 'w-20 h-20' : 'w-16 h-16'}
            `}>
              <Play size={isDesktop ? 28 : 24} color="white" />
            </div>
          </div>
        )}

        {/* PROGRESO DEL VIDEO - z-20 */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div 
            className="h-full bg-white transition-all duration-1000"
            style={{ 
              width: isActive ? '100%' : '0%',
              transitionDuration: isActive ? `${video.duration || 30}s` : '0s'
            }}
          />
        </div>
      </div>
    );
  };

  // ===============================
  // ✅ RENDER PRINCIPAL
  // ===============================
  if (videos.length === 0) {
    return (
      <div className={`
        relative overflow-hidden bg-black flex items-center justify-center
        ${isDesktop 
          ? 'max-w-[450px] mx-auto rounded-lg shadow-2xl h-[80vh]' 
          : 'w-full h-full'}
      `}>
        <p className="text-white text-lg">No hay videos disponibles</p>
      </div>
    );
  }

  return (
    <div 
      data-reels-container
      className={`
        relative overflow-hidden bg-black
        ${isDesktop 
          ? 'max-w-[450px] mx-auto rounded-lg shadow-2xl h-[80vh]' 
          : 'w-full h-full'}
      `}
    >
      
      {/* CONTENEDOR DE REELS */}
      <div
        ref={containerRef}
        className={`flex flex-col h-full ease-out ${enableTransition ? 'transition-transform duration-500' : ''}`}
        style={{
          transform: `translateY(-${currentIndex * (isDesktop ? 80 : 100)}vh)`
        }}
      >
        {videos.map((video, index) => (
          <ReelItem
            key={video.id}
            video={video}
            index={index}
            isActive={index === currentIndex}
          />
        ))}
      </div>

      {/* FLECHAS DE NAVEGACIÓN DESKTOP - z-40 */}
      {isDesktop && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none z-40">
          <button
            onClick={navigatePrevious}
            disabled={currentIndex === 0}
            className={`
              absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto
              w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full 
              flex items-center justify-center transition-all duration-200
              hover:bg-black/70 hover:scale-110 active:scale-95
              ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'}
            `}
          >
            <ChevronUp size={24} color="white" />
          </button>

          <button
            onClick={navigateNext}
            disabled={currentIndex === videos.length - 1}
            className={`
              absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto
              w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full 
              flex items-center justify-center transition-all duration-200
              hover:bg-black/70 hover:scale-110 active:scale-95
              ${currentIndex === videos.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100'}
            `}
          >
            <ChevronDown size={24} color="white" />
          </button>
        </div>
      )}

      {/* INDICADOR DE CARGA - z-40 */}
      {loading && (
        <div className="absolute top-4 right-4 pointer-events-none z-40">
          <div className="text-white flex items-center space-x-2 bg-black/30 rounded-full px-3 py-1">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className={isDesktop ? 'text-base' : 'text-sm'}>Cargando más...</span>
          </div>
        </div>
      )}

      {/* INSTRUCCIONES DESKTOP/MÓVIL - z-40 */}
      {currentIndex === 0 && initialReelSet && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-none z-40">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className={isDesktop ? 'text-base' : 'text-sm'}>
              {isDesktop ? 'Usa flechas ↑↓ o rueda del mouse' : 'Desliza ↑↓ para navegar'}
            </p>
            <p className={`opacity-75 ${isDesktop ? 'text-sm' : 'text-xs'}`}>
              Toca para pausar
            </p>
          </div>
        </div>
      )}

      {/* 🐛 DEBUG INFO */}
      <div className="fixed bottom-20 left-4 bg-black/95 text-white p-3 rounded-lg text-xs font-mono max-w-xs z-50 border border-white/20">
        <div className="text-green-400 font-bold mb-1">✅ DEBUG ReelsContainer</div>
        <div>📹 Total videos: {videos.length}</div>
        <div>📍 currentIndex: {currentIndex}</div>
        <div>🆔 selectedReelId: {selectedReelId || 'null'}</div>
        <div>🎯 initialReelSet: {initialReelSet.toString()}</div>
        <div>🎬 Video actual: {videos[currentIndex]?.title || 'N/A'}</div>
        <div>🆔 ID actual: {videos[currentIndex]?.id || 'N/A'}</div>
        <div>🖥️ isDesktop: {isDesktop.toString()}</div>
        <div>📏 Window width: {window.innerWidth}px</div>
        <div>▶️ isAutoPlaying: {isAutoPlaying.toString()}</div>
        <div>🔄 enableTransition: {enableTransition.toString()}</div>
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="text-yellow-400 font-bold mb-1">🎮 Controles:</div>
          <div>• Desktop: Rueda mouse / Flechas / Click botones</div>
          <div>• Móvil: Swipe arriba/abajo (60px min)</div>
          <div className="text-cyan-400 mt-1">Mira la consola para logs detallados</div>
        </div>
      </div>
    </div>
  );
};

export default ReelsContainer;
