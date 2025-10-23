// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ✅ ARREGLADO: Videos se reproducen + Tamaño compacto responsive
// ✅ CORREGIDO: Salta directamente al reel seleccionado sin iterar por todos
// ✅ CORREGIDO: Video inicial se reproduce automáticamente
// ✅ CORREGIDO: Solo un video se reproduce a la vez (sin audio duplicado)
// ✅ NUEVO: Soporte para selectedReelId en mobile
// ✅ CORREGIDO: Play/Pause funciona correctamente sin reiniciar el video

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null, // ✅ NUEVO: Recibe ID del reel desde mobile
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
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const isInitialMount = useRef(true);
  const hasPlayedInitial = useRef(false);

  console.log('🎬 ReelsContainer render:', {
    videosCount: videos.length,
    firstVideo: videos[0],
    videoUrl: videos[0]?.videoUrl || videos[0]?.video_url,
    currentIndex,
    selectedReelId,
    enableTransition,
    hasPlayedInitial: hasPlayedInitial.current
  });

  // ===============================
  // ✅ FUNCIÓN: Convertir ID del video a índice en array aleatorizado
  // ===============================
  const getInitialReelIndex = useCallback(() => {
    // Si no hay ID seleccionado, iniciar en 0
    if (!selectedReelId) {
      console.log('🔍 ReelsContainer: No hay ID seleccionado, iniciando en índice 0');
      return 0;
    }
    
    // Buscar el índice del video por su ID en el array aleatorizado
    const index = videos.findIndex(video => video.id === selectedReelId);
    
    console.log('🔍 ReelsContainer: Búsqueda de video por ID');
    console.log('   🆔 ID buscado:', selectedReelId);
    console.log('   📍 Índice encontrado:', index);
    console.log('   📹 Video:', index >= 0 ? videos[index]?.title : 'No encontrado');
    console.log('   📊 Total reels en array:', videos.length);
    
    // Si no se encuentra, iniciar en 0 (fallback)
    if (index < 0) {
      console.warn('⚠️ Video con ID', selectedReelId, 'no encontrado en array de reels');
      return 0;
    }
    
    return index;
  }, [selectedReelId, videos]);

  // ===============================
  // 🎯 SINCRONIZACIÓN INICIAL: Convertir selectedReelId a índice
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    
    // ✅ Calcular el índice correcto (por ID o por defecto 0)
    const correctIndex = getInitialReelIndex();
    
    console.log('🎯 ReelsContainer: Sincronizando estado inicial');
    console.log('   🆔 selectedReelId recibido:', selectedReelId);
    console.log('   🎯 Índice calculado:', correctIndex);
    console.log('   📹 Video a reproducir:', videos[correctIndex]?.title || 'No existe');
    console.log('   📊 Total videos:', videos.length);
    console.log('   🎬 Es montaje inicial:', isInitialMount.current);
    
    // Si es el montaje inicial, saltar directamente SIN transición
    if (isInitialMount.current) {
      setCurrentIndex(correctIndex);
      setEnableTransition(false);
      
      // Después de renderizar, habilitar transiciones para navegación manual
      setTimeout(() => {
        setEnableTransition(true);
        isInitialMount.current = false;
        console.log('✅ Transiciones habilitadas para navegación manual');
      }, 100);
    } else {
      // Para cambios posteriores, usar transición
      setCurrentIndex(correctIndex);
    }
  }, [selectedReelId, videos, getInitialReelIndex]);

  // ===============================
  // ✅ FORZAR REPRODUCCIÓN DEL VIDEO INICIAL
  // ===============================
  useEffect(() => {
    // Solo ejecutar una vez cuando el componente se monta
    if (hasPlayedInitial.current || videos.length === 0) return;

    console.log('🎬 Intentando reproducir video inicial:', currentIndex);
    
    // Esperar a que el video esté en el DOM y listo
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

      // ✅ PRIMERO: PAUSAR TODOS LOS OTROS VIDEOS
      console.log('⏸️ Pausando todos los videos excepto el índice:', currentIndex);
      videoRefs.current.forEach((video, index) => {
        if (video && index !== currentIndex) {
          video.pause();
          video.currentTime = 0;
          console.log('   ⏸️ Video pausado:', index);
        }
      });

      // ✅ SEGUNDO: CONFIGURAR Y REPRODUCIR EL VIDEO ACTUAL
      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      // Intentar reproducir
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video inicial reproduciendo correctamente');
            hasPlayedInitial.current = true;
          })
          .catch(err => {
            console.error('❌ Error autoplay inicial:', err);
            // Si falla, intentar con muted
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

    // Iniciar intento de reproducción
    setTimeout(attemptPlay, 250);
  }, [videos, currentIndex, mutedVideos]);

  // ===============================
  // RESPONSIVE DETECTION
  // ===============================
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ===============================
  // MOUSE WHEEL NAVIGATION (DESKTOP)
  // ===============================
  useEffect(() => {
    if (!isDesktop) return;

    const handleWheel = (e) => {
      e.preventDefault();
      
      clearTimeout(handleWheel.timeout);
      handleWheel.timeout = setTimeout(() => {
        if (e.deltaY > 0 && currentIndex < videos.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else if (e.deltaY < 0 && currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      }, 150);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [isDesktop, currentIndex, videos.length]);

  // ===============================
  // ✅ AUTOPLAY Y GESTIÓN DE VIDEOS - Solo cuando cambia el índice
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    
    // ✅ Si es el video inicial y aún no se ha reproducido, dejar que el useEffect anterior lo maneje
    const initialIndex = getInitialReelIndex();
    if (!hasPlayedInitial.current && currentIndex === initialIndex) {
      console.log('⏭️ Skipping autoplay - el video inicial será manejado por useEffect dedicado');
      return;
    }

    const currentVideo = videoRefs.current[currentIndex];
    console.log('🎮 Cambio de índice - Gestionando videos:', {
      index: currentIndex,
      videoExists: !!currentVideo,
      videoSrc: currentVideo?.src
    });

    // Pausar todos los otros videos Y REINICIARLOS
    console.log('⏸️ Pausando todos excepto:', currentIndex);
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });

    // ✅ REPRODUCIR VIDEO ACTUAL (siempre que cambie de índice)
    if (currentVideo) {
      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);
      
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Video reproduciendo correctamente');
            setIsAutoPlaying(true); // Actualizar estado después de reproducir
          })
          .catch(err => {
            console.error('❌ Error autoplay:', err);
            currentVideo.muted = true;
            currentVideo.play()
              .then(() => {
                console.log('✅ Video reproduciendo (muted)');
                setIsAutoPlaying(true);
              })
              .catch(e => console.error('❌ Error crítico autoplay:', e));
          });
      }
    }
  }, [currentIndex, videos, mutedVideos, getInitialReelIndex]);

  // Precargar videos adyacentes
  useEffect(() => {
    if (videos.length === 0) return;

    // Precargar video siguiente
    if (currentIndex < videos.length - 1) {
      const nextVideo = videoRefs.current[currentIndex + 1];
      if (nextVideo && nextVideo.readyState < 2) {
        nextVideo.load();
      }
    }

    // Cargar más videos si estamos cerca del final
    if (currentIndex >= videos.length - 3 && hasMore && !loading) {
      onLoadMore && onLoadMore();
    }
  }, [currentIndex, videos.length, hasMore, loading, onLoadMore]);

  // ===============================
  // NAVEGACIÓN POR SCROLL/TOUCH
  // ===============================
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    
    // Visual feedback durante el drag
    const container = containerRef.current;
    if (container && Math.abs(diff) > 50) {
      container.style.transform = `translateY(${-diff * 0.1}px)`;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    const currentY = e.changedTouches[0].clientY;
    const diff = startY - currentY;
    const container = containerRef.current;

    if (container) {
      container.style.transform = 'translateY(0)';
    }

    // Navegar si el swipe es suficientemente grande
    if (Math.abs(diff) > 100) {
      if (diff > 0 && currentIndex < videos.length - 1) {
        // Swipe up - próximo video
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe down - video anterior  
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  // ===============================
  // HANDLERS DE INTERACCIÓN
  // ===============================
  const handlePlayPause = () => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    console.log('🎯 handlePlayPause llamado:', {
      paused: currentVideo.paused,
      currentTime: currentVideo.currentTime,
      src: currentVideo.src
    });

    // ✅ IGUAL QUE VideoPlayer.jsx - Verificar estado real del video
    if (currentVideo.paused) {
      currentVideo.play().then(() => {
        console.log('✅ Video reproduciendo desde:', currentVideo.currentTime);
        setIsAutoPlaying(true);
      }).catch(err => {
        console.error('❌ Error al reproducir:', err);
      });
    } else {
      currentVideo.pause();
      console.log('⏸️ Video pausado en:', currentVideo.currentTime);
      setIsAutoPlaying(false);
    }
  };

  // Navegación con teclas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

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
      // Fallback: copiar al portapapeles
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
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const navigatePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // ===============================
  // ✅ COMPONENTE INDIVIDUAL DE REEL
  // ===============================
  const ReelItem = ({ video, index, isActive }) => {
    const videoUrl = video.videoUrl || video.video_url;
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* VIDEO */}
        <video
          ref={el => videoRefs.current[index] = el}
          src={videoUrl}
          className="w-full h-full object-contain"
          loop
          playsInline
          preload={Math.abs(index - currentIndex) <= 1 ? "auto" : "none"}
          onClick={handlePlayPause}
        />

        {/* CONTROLES LATERALES (Derecha) */}
        <div className={`
          absolute flex flex-col space-y-4
          ${isDesktop ? 'bottom-16 right-6' : 'bottom-12 right-4'}
        `}>
          {/* Like */}
          <button
            onClick={() => handleLike(video.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              rounded-full flex items-center justify-center transition-all duration-200
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
              ${isLiked 
                ? 'bg-red-500/20 text-red-500' 
                : 'bg-black/30 text-white hover:bg-white/20'
              }
            `}>
              <Icon 
                name="Heart" 
                size={isDesktop ? 26 : 24} 
                className={isLiked ? 'fill-current' : ''} 
              />
            </div>
            <span className={`text-white font-medium ${isDesktop ? 'text-sm' : 'text-xs'}`}>
              {video.likes || 0}
            </span>
          </button>

          {/* Comentarios */}
          <Link 
            to={`/reel/${video.id}`}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              <Icon name="MessageCircle" size={isDesktop ? 26 : 24} color="white" />
            </div>
            <span className={`text-white font-medium ${isDesktop ? 'text-sm' : 'text-xs'}`}>
              {video.comments || 0}
            </span>
          </Link>

          {/* Guardar */}
          <button
            onClick={() => handleSave(video.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              rounded-full flex items-center justify-center transition-all duration-200
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
              ${isSaved 
                ? 'bg-yellow-500/20 text-yellow-500' 
                : 'bg-black/30 text-white hover:bg-white/20'
              }
            `}>
              <Icon 
                name="Bookmark" 
                size={isDesktop ? 26 : 24} 
                className={isSaved ? 'fill-current' : ''} 
              />
            </div>
          </button>

          {/* Compartir */}
          <button
            onClick={() => handleShare(video)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              <Icon name="Share" size={isDesktop ? 26 : 24} color="white" />
            </div>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={() => handleMuteToggle(video.id)}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`
              bg-black/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors
              ${isDesktop ? 'w-14 h-14' : 'w-12 h-12'}
            `}>
              <Icon 
                name={isMuted ? 'VolumeX' : 'Volume2'} 
                size={isDesktop ? 26 : 24} 
                color="white" 
              />
            </div>
          </button>
        </div>

        {/* INFORMACIÓN DEL VIDEO (Abajo Izquierda) */}
        <div className={`
          absolute text-white
          ${isDesktop ? 'bottom-12 left-6 right-24' : 'bottom-8 left-4 right-20'}
        `}>
          
          {/* Información del creador */}
          <div className="flex items-center space-x-3 mb-3">
            <Link 
              to={`/profile/${video.creator?.id}`}
              className={`font-semibold hover:underline ${isDesktop ? 'text-lg' : 'text-base'}`}
            >
              {video.creator?.name || 'Usuario'}
            </Link>
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

        {/* INDICADOR DE PLAY/PAUSE */}
        {!isAutoPlaying && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`
              bg-black/50 rounded-full flex items-center justify-center
              ${isDesktop ? 'w-20 h-20' : 'w-16 h-16'}
            `}>
              <Icon name="Play" size={isDesktop ? 28 : 24} color="white" />
            </div>
          </div>
        )}

        {/* PROGRESO DEL VIDEO */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
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
  return (
    <div className={`
      relative overflow-hidden bg-black
      ${isDesktop 
        ? 'max-w-[500px] mx-auto rounded-lg shadow-2xl h-[80vh]' 
        : 'w-full h-full'
      }
    `}>
      
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

      {/* FLECHAS DE NAVEGACIÓN DESKTOP */}
      {isDesktop && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
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
            <Icon name="ChevronUp" size={24} color="white" />
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
            <Icon name="ChevronDown" size={24} color="white" />
          </button>
        </div>
      )}

      {/* INDICADOR DE CARGA */}
      {loading && (
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className="text-white flex items-center space-x-2 bg-black/30 rounded-full px-3 py-1">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className={isDesktop ? 'text-base' : 'text-sm'}>Cargando más...</span>
          </div>
        </div>
      )}

      {/* INSTRUCCIONES DESKTOP/MÓVIL */}
      {currentIndex === 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-none">
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
    </div>
  );
};

export default ReelsContainer;
