// src/pages/video-feed-dashboard/utils/VideoPerformanceOptimizer.js
// Utilidades de optimización para el sistema de videos por orientación

/**
 * 🚀 OPTIMIZADOR DE RENDIMIENTO PARA VIDEOS
 * ====================================================================
 * Mejoras de performance, lazy loading, y gestión de memoria
 * para el sistema de videos con orientaciones
 */

// ===============================
// LAZY LOADING INTELIGENTE
// ===============================

/**
 * Hook para lazy loading de videos basado en orientación
 */
export const useVideoLazyLoading = (videos, orientation, threshold = 0.1) => {
  const [visibleVideos, setVisibleVideos] = React.useState(new Set());
  const observerRef = React.useRef(null);

  React.useEffect(() => {
    // Configurar Intersection Observer específico por orientación
    const observerOptions = {
      root: null,
      rootMargin: orientation === 'vertical' ? '50px 0px' : '100px 0px',
      threshold: orientation === 'vertical' ? 0.5 : threshold
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const videoId = entry.target.getAttribute('data-video-id');
        
        if (entry.isIntersecting) {
          setVisibleVideos(prev => new Set([...prev, videoId]));
        } else if (orientation === 'vertical') {
          // Para reels, limpiar videos no visibles más agresivamente
          setVisibleVideos(prev => {
            const newSet = new Set(prev);
            newSet.delete(videoId);
            return newSet;
          });
        }
      });
    }, observerOptions);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [orientation, threshold]);

  const observeVideo = React.useCallback((element, videoId) => {
    if (element && observerRef.current) {
      element.setAttribute('data-video-id', videoId);
      observerRef.current.observe(element);
    }
  }, []);

  const unobserveVideo = React.useCallback((element) => {
    if (element && observerRef.current) {
      observerRef.current.unobserve(element);
    }
  }, []);

  return {
    visibleVideos,
    observeVideo,
    unobserveVideo
  };
};

// ===============================
// GESTIÓN DE MEMORIA DE VIDEOS
// ===============================

/**
 * Limpieza automática de videos no utilizados
 */
export const useVideoMemoryManager = (maxVideosInMemory = 20) => {
  const videoElementsRef = React.useRef(new Map());
  const lastAccessedRef = React.useRef(new Map());

  const registerVideo = React.useCallback((videoId, videoElement) => {
    videoElementsRef.current.set(videoId, videoElement);
    lastAccessedRef.current.set(videoId, Date.now());

    // Limpiar videos antiguos si excedemos el límite
    if (videoElementsRef.current.size > maxVideosInMemory) {
      const sortedByAccess = [...lastAccessedRef.current.entries()]
        .sort((a, b) => a[1] - b[1]);
      
      const toRemove = sortedByAccess.slice(0, 5); // Remover los 5 más antiguos
      
      toRemove.forEach(([oldVideoId]) => {
        const oldElement = videoElementsRef.current.get(oldVideoId);
        if (oldElement) {
          oldElement.src = '';
          oldElement.load();
        }
        videoElementsRef.current.delete(oldVideoId);
        lastAccessedRef.current.delete(oldVideoId);
      });
    }
  }, [maxVideosInMemory]);

  const accessVideo = React.useCallback((videoId) => {
    lastAccessedRef.current.set(videoId, Date.now());
  }, []);

  const clearAllVideos = React.useCallback(() => {
    videoElementsRef.current.forEach((element) => {
      element.src = '';
      element.load();
    });
    videoElementsRef.current.clear();
    lastAccessedRef.current.clear();
  }, []);

  return {
    registerVideo,
    accessVideo,
    clearAllVideos
  };
};

// ===============================
// PRELOAD INTELIGENTE
// ===============================

/**
 * Sistema de preload adaptativo según orientación
 */
export const useVideoPreloader = (videos, currentIndex, orientation) => {
  const preloadedVideos = React.useRef(new Set());

  React.useEffect(() => {
    if (!videos.length) return;

    const preloadStrategy = orientation === 'vertical' 
      ? { before: 1, after: 2 } // Reels: menos preload para conservar memoria
      : { before: 2, after: 3 }; // Horizontales: más preload para mejor UX

    const toPreload = [];
    
    // Videos anteriores
    for (let i = Math.max(0, currentIndex - preloadStrategy.before); i < currentIndex; i++) {
      if (videos[i] && !preloadedVideos.current.has(videos[i].id)) {
        toPreload.push(videos[i]);
      }
    }
    
    // Videos siguientes
    for (let i = currentIndex + 1; i <= Math.min(videos.length - 1, currentIndex + preloadStrategy.after); i++) {
      if (videos[i] && !preloadedVideos.current.has(videos[i].id)) {
        toPreload.push(videos[i]);
      }
    }

    // Precargar videos
    toPreload.forEach((video) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = video.videoUrl;
      link.as = 'video';
      document.head.appendChild(link);
      
      preloadedVideos.current.add(video.id);
      
      // Limpiar link después de un tiempo
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 30000);
    });

  }, [videos, currentIndex, orientation]);

  return {
    preloadedVideos: preloadedVideos.current
  };
};

// ===============================
// OPTIMIZACIÓN DE THUMBNAILS
// ===============================

/**
 * Generador de thumbnails responsivos según orientación
 */
export const generateResponsiveThumbnail = (originalUrl, orientation, size = 'medium') => {
  if (!originalUrl) return null;

  const sizeConfigs = {
    vertical: {
      small: '270x480',
      medium: '405x720', 
      large: '540x960'
    },
    horizontal: {
      small: '480x270',
      medium: '720x405',
      large: '960x540'
    },
    square: {
      small: '320x320',
      medium: '480x480',
      large: '640x640'
    }
  };

  const dimensions = sizeConfigs[orientation]?.[size] || sizeConfigs.horizontal.medium;
  
  // Si es placeholder, usar dimensiones correctas
  if (originalUrl.includes('placeholder')) {
    return originalUrl.replace(/\d+x\d+/, dimensions);
  }
  
  // Para URLs reales, agregar parámetros de redimensionamiento si es compatible
  if (originalUrl.includes('supabase') || originalUrl.includes('cloudinary')) {
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}w=${dimensions.split('x')[0]}&h=${dimensions.split('x')[1]}&fit=cover`;
  }
  
  return originalUrl;
};

// ===============================
// MÉTRICAS DE RENDIMIENTO
// ===============================

/**
 * Hook para monitorear métricas de rendimiento
 */
export const useVideoPerformanceMetrics = () => {
  const [metrics, setMetrics] = React.useState({
    videosLoaded: 0,
    averageLoadTime: 0,
    memoryUsage: 0,
    errors: 0
  });

  const recordVideoLoad = React.useCallback((loadTime) => {
    setMetrics(prev => ({
      ...prev,
      videosLoaded: prev.videosLoaded + 1,
      averageLoadTime: ((prev.averageLoadTime * prev.videosLoaded) + loadTime) / (prev.videosLoaded + 1)
    }));
  }, []);

  const recordError = React.useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      errors: prev.errors + 1
    }));
  }, []);

  const updateMemoryUsage = React.useCallback(() => {
    if ('memory' in performance) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: performance.memory.usedJSHeapSize / 1024 / 1024 // MB
      }));
    }
  }, []);

  React.useEffect(() => {
    const interval = setInterval(updateMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [updateMemoryUsage]);

  return {
    metrics,
    recordVideoLoad,
    recordError,
    updateMemoryUsage
  };
};

// ===============================
// UTILS DE ORIENTACIÓN
// ===============================

/**
 * Detectar orientación del dispositivo para optimizar layout
 */
export const useDeviceOrientation = () => {
  const [orientation, setOrientation] = React.useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  React.useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
};

/**
 * Optimizar configuración de video según orientación del dispositivo
 */
export const getOptimalVideoConfig = (videoOrientation, deviceOrientation) => {
  const isOptimal = 
    (videoOrientation === 'vertical' && deviceOrientation === 'portrait') ||
    (videoOrientation === 'horizontal' && deviceOrientation === 'landscape');

  return {
    isOptimal,
    autoplay: isOptimal, // Solo autoplay si la orientación es óptima
    preload: isOptimal ? 'auto' : 'metadata',
    quality: isOptimal ? 'high' : 'medium'
  };
};

// ===============================
// CACHE DE VIDEOS
// ===============================

/**
 * Sistema de cache simple para videos viseados
 */
export const useVideoCache = (maxCacheSize = 50) => {
  const cache = React.useRef(new Map());
  const accessOrder = React.useRef([]);

  const cacheVideo = React.useCallback((videoId, videoData) => {
    // Si el cache está lleno, remover el más antiguo
    if (cache.current.size >= maxCacheSize) {
      const oldestVideoId = accessOrder.current.shift();
      cache.current.delete(oldestVideoId);
    }

    cache.current.set(videoId, {
      ...videoData,
      cachedAt: Date.now()
    });

    // Actualizar orden de acceso
    const existingIndex = accessOrder.current.indexOf(videoId);
    if (existingIndex > -1) {
      accessOrder.current.splice(existingIndex, 1);
    }
    accessOrder.current.push(videoId);
  }, [maxCacheSize]);

  const getCachedVideo = React.useCallback((videoId) => {
    const cached = cache.current.get(videoId);
    
    if (cached) {
      // Actualizar orden de acceso
      const existingIndex = accessOrder.current.indexOf(videoId);
      if (existingIndex > -1) {
        accessOrder.current.splice(existingIndex, 1);
        accessOrder.current.push(videoId);
      }
    }
    
    return cached;
  }, []);

  const clearCache = React.useCallback(() => {
    cache.current.clear();
    accessOrder.current = [];
  }, []);

  return {
    cacheVideo,
    getCachedVideo,
    clearCache,
    cacheSize: cache.current.size
  };
};

// ===============================
// EXPORT DEFAULT
// ===============================
export default {
  useVideoLazyLoading,
  useVideoMemoryManager,
  useVideoPreloader,
  generateResponsiveThumbnail,
  useVideoPerformanceMetrics,
  useDeviceOrientation,
  getOptimalVideoConfig,
  useVideoCache
};
