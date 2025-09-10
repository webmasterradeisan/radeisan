import { supabase } from '../lib/supabase';

/**
 * SERVICIO DE DETECCIÓN AUTOMÁTICA DE ORIENTACIÓN DE VIDEOS
 * Sistema completo para detectar orientación y metadatos de videos
 * Integra con Supabase para guardar datos técnicos
 */

/**
 * Extrae metadatos técnicos de un archivo de video
 * @param {File} videoFile - Archivo de video a analizar
 * @returns {Promise<Object>} Metadatos del video {width, height, duration, aspectRatio, orientation}
 */
export const getVideoMetadata = (videoFile) => {
  return new Promise((resolve, reject) => {
    console.log('🔍 Analizando metadatos del video:', videoFile.name);
    
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.preload = 'metadata';
    video.muted = true;
    
    video.onloadedmetadata = () => {
      try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration;
        
        console.log(`📐 Dimensiones detectadas: ${width}x${height}`);
        console.log(`⏱️ Duración: ${duration.toFixed(2)}s`);
        
        // Calcular aspect ratio
        const aspectRatio = calculateAspectRatio(width, height);
        
        // Determinar orientación basada en dimensiones reales
        const orientation = determineOrientation(width, height);
        
        const metadata = {
          width,
          height,
          duration: Math.round(duration),
          aspectRatio,
          orientation,
          fileSize: videoFile.size,
          fileName: videoFile.name,
          mimeType: videoFile.type
        };
        
        console.log('✅ Metadatos extraídos:', metadata);
        
        // Limpiar elementos DOM
        video.remove();
        canvas.remove();
        
        resolve(metadata);
        
      } catch (error) {
        console.error('❌ Error extrayendo metadatos:', error);
        video.remove();
        canvas.remove();
        reject(error);
      }
    };
    
    video.onerror = (error) => {
      console.error('❌ Error cargando video para análisis:', error);
      video.remove();
      canvas.remove();
      reject(new Error('No se pudo cargar el video para análisis'));
    };
    
    // Timeout de seguridad (10 segundos)
    setTimeout(() => {
      if (video.readyState < 1) {
        console.error('⏰ Timeout analizando video');
        video.remove();
        canvas.remove();
        reject(new Error('Timeout analizando metadatos del video'));
      }
    }, 10000);
    
    // Crear URL del blob y cargar
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    
    // Limpiar URL cuando termine
    video.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(videoUrl);
    });
  });
};

/**
 * Calcula el aspect ratio en formato string
 * @param {number} width - Ancho del video
 * @param {number} height - Alto del video
 * @returns {string} Aspect ratio (ej: "16:9", "9:16", "1:1")
 */
const calculateAspectRatio = (width, height) => {
  if (!width || !height) return 'unknown';
  
  // Calcular GCD para simplificar la fracción
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  
  const ratioW = width / divisor;
  const ratioH = height / divisor;
  
  // Casos comunes conocidos
  const commonRatios = {
    '16:9': [16, 9],
    '9:16': [9, 16],
    '4:3': [4, 3],
    '3:4': [3, 4],
    '1:1': [1, 1],
    '21:9': [21, 9],
    '3:2': [3, 2],
    '2:3': [2, 3]
  };
  
  // Buscar coincidencia con ratios comunes
  for (const [ratio, [w, h]] of Object.entries(commonRatios)) {
    if (ratioW === w && ratioH === h) {
      return ratio;
    }
  }
  
  // Si no es un ratio común, devolver la fracción simplificada
  return `${ratioW}:${ratioH}`;
};

/**
 * Determina la orientación del video basada en dimensiones
 * @param {number} width - Ancho del video
 * @param {number} height - Alto del video
 * @returns {string} Orientación: 'vertical', 'horizontal', 'square'
 */
const determineOrientation = (width, height) => {
  if (!width || !height) return 'horizontal'; // Default fallback
  
  const ratio = width / height;
  
  console.log(`📊 Ratio calculado: ${ratio.toFixed(3)}`);
  
  if (Math.abs(ratio - 1) < 0.1) {
    // Aproximadamente cuadrado (ratio entre 0.9 y 1.1)
    console.log('🟦 Orientación: CUADRADO');
    return 'square';
  } else if (ratio < 1) {
    // Más alto que ancho = vertical
    console.log('📱 Orientación: VERTICAL (Reel)');
    return 'vertical';
  } else {
    // Más ancho que alto = horizontal
    console.log('🖥️ Orientación: HORIZONTAL (Video)');
    return 'horizontal';
  }
};

/**
 * Detecta la orientación de un archivo de video
 * @param {File} videoFile - Archivo de video
 * @returns {Promise<Object>} Datos de orientación y metadatos
 */
export const detectVideoFileOrientation = async (videoFile) => {
  try {
    console.log('🎬 Iniciando detección de orientación para:', videoFile.name);
    
    // Validar que es un archivo de video
    if (!videoFile.type.startsWith('video/')) {
      throw new Error('El archivo no es un video válido');
    }
    
    // Extraer metadatos técnicos
    const metadata = await getVideoMetadata(videoFile);
    
    // Información adicional para debugging
    const detectionInfo = {
      ...metadata,
      detectionMethod: 'technical_analysis',
      confidence: 'high',
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Detección completada:', detectionInfo);
    
    return detectionInfo;
    
  } catch (error) {
    console.error('❌ Error en detección de orientación:', error);
    
    // Fallback con datos básicos
    const fallbackData = {
      orientation: 'horizontal',
      aspectRatio: 'unknown',
      width: null,
      height: null,
      duration: 0,
      fileSize: videoFile.size,
      fileName: videoFile.name,
      mimeType: videoFile.type,
      detectionMethod: 'fallback',
      confidence: 'low',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    console.log('⚠️ Usando datos fallback:', fallbackData);
    return fallbackData;
  }
};

/**
 * Sube un video con detección automática de orientación
 * @param {File} videoFile - Archivo de video a subir
 * @param {Object} videoData - Datos adicionales del video (title, description, etc.)
 * @param {string} userId - ID del usuario
 * @param {function} onProgress - Callback para progreso de upload (opcional)
 * @returns {Promise<Object>} Resultado del upload con datos completos
 */
export const uploadVideoWithOrientationDetection = async (
  videoFile, 
  videoData, 
  userId, 
  onProgress = null
) => {
  try {
    console.log('🚀 Iniciando upload con detección automática');
    
    // PASO 1: Detectar orientación automáticamente
    if (onProgress) onProgress({ stage: 'analyzing', progress: 10 });
    const detectionResult = await detectVideoFileOrientation(videoFile);
    
    console.log('📊 Datos de detección:', detectionResult);
    
    // PASO 2: Generar nombre único para el archivo
    if (onProgress) onProgress({ stage: 'preparing', progress: 20 });
    const fileExtension = videoFile.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExtension}`;
    const filePath = `videos/${fileName}`;
    
    // PASO 3: Subir archivo a Supabase Storage
    if (onProgress) onProgress({ stage: 'uploading', progress: 30 });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, videoFile, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      throw new Error(`Error subiendo archivo: ${uploadError.message}`);
    }
    
    // PASO 4: Obtener URL pública
    if (onProgress) onProgress({ stage: 'processing', progress: 60 });
    
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);
    
    // PASO 5: Crear registro en base de datos con datos de orientación
    if (onProgress) onProgress({ stage: 'saving', progress: 80 });
    
    const videoRecord = {
      user_id: userId,
      title: videoData.title || detectionResult.fileName,
      description: videoData.description || '',
      video_url: publicUrl,
      thumbnail_url: videoData.thumbnail_url || null,
      category: videoData.category || 'general',
      tags: videoData.tags || [],
      duration_seconds: detectionResult.duration,
      file_size_bytes: detectionResult.fileSize,
      
      // CAMPOS DE ORIENTACIÓN (NUEVOS)
      orientation: detectionResult.orientation,
      aspect_ratio: detectionResult.aspectRatio,
      video_width: detectionResult.width,
      video_height: detectionResult.height,
      
      // Campos por defecto
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      points_earned: videoData.points_earned || 10,
      is_published: videoData.is_published !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: dbData, error: dbError } = await supabase
      .from('videos')
      .insert([videoRecord])
      .select()
      .single();
    
    if (dbError) {
      // Si falla el DB, intentar limpiar el archivo subido
      console.error('❌ Error guardando en BD:', dbError);
      await supabase.storage.from('videos').remove([filePath]);
      throw new Error(`Error guardando video en base de datos: ${dbError.message}`);
    }
    
    // PASO 6: Actualizar contador en perfil de usuario
    if (onProgress) onProgress({ stage: 'completing', progress: 95 });
    
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ 
        videos_count: supabase.sql`videos_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (profileError) {
      console.error('⚠️ Error actualizando contador de videos:', profileError);
      // No es crítico, continuamos
    }
    
    if (onProgress) onProgress({ stage: 'completed', progress: 100 });
    
    // RESULTADO COMPLETO
    const result = {
      success: true,
      video: dbData,
      detection: detectionResult,
      upload: {
        fileName,
        filePath,
        publicUrl,
        fileSize: detectionResult.fileSize
      },
      message: `Video ${detectionResult.orientation} subido exitosamente`
    };
    
    console.log('✅ Upload completado:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error en upload con detección:', error);
    
    if (onProgress) onProgress({ stage: 'error', progress: 0, error: error.message });
    
    throw error;
  }
};

/**
 * Actualiza videos existentes con datos de orientación
 * (Función auxiliar para migrar videos antiguos)
 * @param {string} videoId - ID del video a actualizar
 * @returns {Promise<Object>} Resultado de la actualización
 */
export const updateVideoOrientation = async (videoId) => {
  try {
    console.log('🔄 Actualizando orientación para video:', videoId);
    
    // Obtener datos del video
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();
    
    if (fetchError || !video) {
      throw new Error('Video no encontrado');
    }
    
    // Si ya tiene datos de orientación, no actualizar
    if (video.orientation && video.orientation !== 'horizontal') {
      console.log('⚠️ Video ya tiene datos de orientación');
      return { success: true, message: 'Video ya actualizado', video };
    }
    
    // TODO: Aquí se podría implementar análisis del video existente
    // Por ahora, usar heurística básica
    const estimatedOrientation = estimateOrientationFromUrl(video.video_url);
    
    const updateData = {
      orientation: estimatedOrientation,
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    console.log('✅ Video actualizado:', updatedVideo);
    return { success: true, video: updatedVideo };
    
  } catch (error) {
    console.error('❌ Error actualizando orientación:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Estima orientación basada en heurísticas (para videos existentes)
 * @param {string} videoUrl - URL del video
 * @returns {string} Orientación estimada
 */
const estimateOrientationFromUrl = (videoUrl) => {
  // Heurística simple basada en patrones comunes
  const url = videoUrl.toLowerCase();
  
  if (url.includes('reel') || url.includes('vertical') || url.includes('story')) {
    return 'vertical';
  }
  
  if (url.includes('square')) {
    return 'square';
  }
  
  return 'horizontal'; // Default
};

/**
 * Obtiene estadísticas de orientación de videos
 * @param {string} userId - ID del usuario (opcional)
 * @returns {Promise<Object>} Estadísticas de orientación
 */
export const getOrientationStats = async (userId = null) => {
  try {
    let query = supabase
      .from('videos')
      .select('orientation, id');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: videos, error } = await query;
    
    if (error) {
      throw error;
    }
    
    const stats = {
      total: videos.length,
      horizontal: videos.filter(v => v.orientation === 'horizontal').length,
      vertical: videos.filter(v => v.orientation === 'vertical').length,
      square: videos.filter(v => v.orientation === 'square').length,
      unknown: videos.filter(v => !v.orientation || v.orientation === 'unknown').length
    };
    
    stats.percentages = {
      horizontal: stats.total > 0 ? ((stats.horizontal / stats.total) * 100).toFixed(1) : 0,
      vertical: stats.total > 0 ? ((stats.vertical / stats.total) * 100).toFixed(1) : 0,
      square: stats.total > 0 ? ((stats.square / stats.total) * 100).toFixed(1) : 0,
      unknown: stats.total > 0 ? ((stats.unknown / stats.total) * 100).toFixed(1) : 0
    };
    
    return stats;
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return {
      total: 0,
      horizontal: 0,
      vertical: 0,
      square: 0,
      unknown: 0,
      percentages: { horizontal: 0, vertical: 0, square: 0, unknown: 0 }
    };
  }
};
