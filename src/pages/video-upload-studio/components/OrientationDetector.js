// src/pages/video-upload-studio/components/OrientationDetector.js

/**
 * 🎬 ORIENTATION DETECTOR - Sistema de Clasificación de Videos
 * ====================================================================
 * Detecta automáticamente la orientación de videos y los clasifica
 * para mostrar el feed correcto (Reels vs Videos Horizontales)
 */

// 📐 CONSTANTES DE ASPECT RATIOS
const ASPECT_RATIOS = {
  // Videos Horizontales (YouTube style)
  LANDSCAPE: {
    min: 1.3,  // 4:3 en adelante
    max: 2.4,  // Ultra-wide
    ideal: 16/9 // 1.777...
  },
  
  // Videos Verticales (TikTok/Instagram Reels style)  
  PORTRAIT: {
    min: 0.4,  // Ultra-tall
    max: 0.8,  // Casi cuadrado
    ideal: 9/16 // 0.5625
  },
  
  // Videos Cuadrados (Instagram post style)
  SQUARE: {
    min: 0.8,
    max: 1.3,
    ideal: 1.0
  }
};

// 🎯 TIPOS DE ORIENTACIÓN
export const VIDEO_ORIENTATIONS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical', 
  SQUARE: 'square'
};

// 🎨 CONFIGURACIÓN DE UI POR ORIENTACIÓN
export const ORIENTATION_CONFIG = {
  [VIDEO_ORIENTATIONS.HORIZONTAL]: {
    displayName: 'Video Horizontal',
    icon: 'Monitor',
    aspectRatio: '16:9',
    feedType: 'grid',
    cardType: 'horizontal',
    playerType: 'modal',
    recommendedSize: '1920x1080',
    color: '#3B82F6'
  },
  
  [VIDEO_ORIENTATIONS.VERTICAL]: {
    displayName: 'Reel Vertical',
    icon: 'Smartphone',
    aspectRatio: '9:16',
    feedType: 'reels',
    cardType: 'vertical',
    playerType: 'fullscreen',
    recommendedSize: '1080x1920',
    color: '#EF4444'
  },
  
  [VIDEO_ORIENTATIONS.SQUARE]: {
    displayName: 'Video Cuadrado',
    icon: 'Square',
    aspectRatio: '1:1',
    feedType: 'grid',
    cardType: 'square',
    playerType: 'modal',
    recommendedSize: '1080x1080',
    color: '#10B981'
  }
};

/**
 * 🏷️ CLASIFICAR ORIENTACIÓN BASADA EN ASPECT RATIO
 * @param {number} aspectRatio - Ratio ancho/alto
 * @returns {string} - Tipo de orientación
 */
const classifyOrientation = (aspectRatio) => {
  // 📱 Video Vertical (Reels)
  if (aspectRatio >= ASPECT_RATIOS.PORTRAIT.min && aspectRatio <= ASPECT_RATIOS.PORTRAIT.max) {
    return VIDEO_ORIENTATIONS.VERTICAL;
  }
  
  // 🖥️ Video Horizontal (YouTube style)
  if (aspectRatio >= ASPECT_RATIOS.LANDSCAPE.min && aspectRatio <= ASPECT_RATIOS.LANDSCAPE.max) {
    return VIDEO_ORIENTATIONS.HORIZONTAL;
  }
  
  // ⬜ Video Cuadrado
  if (aspectRatio >= ASPECT_RATIOS.SQUARE.min && aspectRatio <= ASPECT_RATIOS.SQUARE.max) {
    return VIDEO_ORIENTATIONS.SQUARE;
  }
  
  // 🤷 Casos edge - clasificar por proximidad
  if (aspectRatio < ASPECT_RATIOS.PORTRAIT.min) {
    return VIDEO_ORIENTATIONS.VERTICAL; // Ultra vertical
  }
  
  if (aspectRatio > ASPECT_RATIOS.LANDSCAPE.max) {
    return VIDEO_ORIENTATIONS.HORIZONTAL; // Ultra wide
  }
  
  // 🎯 Fallback - decidir por lado más cercano
  return aspectRatio < 1 ? VIDEO_ORIENTATIONS.VERTICAL : VIDEO_ORIENTATIONS.HORIZONTAL;
};

/**
 * 🔍 DETECTAR ORIENTACIÓN DE ARCHIVO DE VIDEO
 * @param {File} videoFile - Archivo de video a analizar
 * @returns {Promise<Object>} - Información completa de orientación
 */
export const detectVideoOrientation = async (videoFile) => {
  return new Promise((resolve, reject) => {
    // ✅ Validar que es un archivo de video
    if (!videoFile || !videoFile.type.startsWith('video/')) {
      reject(new Error('El archivo no es un video válido'));
      return;
    }

    // 🎬 Crear elemento video temporal para leer metadatos
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(videoFile);
    
    video.onloadedmetadata = () => {
      try {
        // 🔍 Obtener dimensiones reales
        const width = video.videoWidth;
        const height = video.videoHeight;
        const aspectRatio = width / height;
        
        // 🏷️ Clasificar orientación
        const orientation = classifyOrientation(aspectRatio);
        const config = ORIENTATION_CONFIG[orientation];
        
        // 📊 Información completa
        const orientationData = {
          // Datos básicos
          orientation,
          aspectRatio: Number(aspectRatio.toFixed(3)),
          width,
          height,
          
          // Configuración UI
          config,
          
          // Metadatos adicionales
          fileSize: videoFile.size,
          fileName: videoFile.name,
          fileType: videoFile.type,
          duration: video.duration || 0,
          
          // Información para debugging
          rawAspectRatio: aspectRatio,
          isLandscape: aspectRatio > 1,
          isPortrait: aspectRatio < 1,
          isSquare: Math.abs(aspectRatio - 1) < 0.2,
          
          // Timestamp
          detectedAt: new Date().toISOString()
        };
        
        console.log('🎬 Video orientation detected:', orientationData);
        
        // ✅ Limpiar recursos
        URL.revokeObjectURL(objectUrl);
        
        resolve(orientationData);
        
      } catch (error) {
        console.error('❌ Error analyzing video:', error);
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    
    video.onerror = () => {
      console.error('❌ Error loading video for analysis');
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar el video para análisis'));
    };
    
    // 🚀 Iniciar carga de metadatos
    video.src = objectUrl;
    video.load();
  });
};

/**
 * 🖼️ GENERAR THUMBNAIL DESDE VIDEO
 * @param {File} videoFile - Archivo de video
 * @param {string} orientation - Orientación del video
 * @returns {Promise<string>} - Data URL del thumbnail
 */
export const generateOrientationThumbnail = (file, orientation) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const objectUrl = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      video.currentTime = 1;
    };
    
    video.onseeked = () => {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log(`🖼️ Generated ${orientation} thumbnail:`, thumbnailDataUrl.length);
        
        URL.revokeObjectURL(objectUrl);
        resolve(thumbnailDataUrl);
        
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error generando thumbnail'));
    };
    
    video.src = objectUrl;
  });
};

/**
 * 📋 OBTENER ESTADÍSTICAS DE ORIENTACIONES
 * @param {Array} videos - Lista de videos con orientación
 * @returns {Object} - Estadísticas completas
 */
export const getOrientationStats = (videos) => {
  const stats = {
    total: videos.length,
    horizontal: 0,
    vertical: 0,
    square: 0,
    percentages: {}
  };
  
  videos.forEach(video => {
    if (video.orientation) {
      stats[video.orientation]++;
    }
  });
  
  // 📊 Calcular porcentajes
  Object.keys(VIDEO_ORIENTATIONS).forEach(key => {
    const orientation = VIDEO_ORIENTATIONS[key];
    stats.percentages[orientation] = stats.total > 0 
      ? Math.round((stats[orientation] / stats.total) * 100)
      : 0;
  });
  
  return stats;
};

/**
 * 🎯 FILTRAR VIDEOS POR ORIENTACIÓN
 * @param {Array} videos - Lista de videos
 * @param {string} orientation - Orientación a filtrar
 * @returns {Array} - Videos filtrados
 */
export const filterVideosByOrientation = (videos, orientation) => {
  if (!orientation || orientation === 'all') {
    return videos;
  }
  
  return videos.filter(video => 
    video.orientation === orientation ||
    video.config?.orientation === orientation
  );
};

// 🚀 EXPORT DEFAULT
export default {
  detectVideoOrientation,
  generateOrientationThumbnail,
  getOrientationStats,
  filterVideosByOrientation,
  VIDEO_ORIENTATIONS,
  ORIENTATION_CONFIG,
  ASPECT_RATIOS
};

