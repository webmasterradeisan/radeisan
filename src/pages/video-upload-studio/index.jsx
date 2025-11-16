// src/pages/video-upload-studio/index.jsx
// VideoUploadStudio con VISTA PREVIA EN TIEMPO REAL según miniatura seleccionada
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadVideoWithOrientationDetection, detectVideoFileOrientation } from '../../services/videoDetection';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import VideoUploadZone from './components/VideoUploadZone';
import CategorySelector from './components/CategorySelector';
// ✅ CORRECCIÓN CLAVE: Se elimina 'pointsService' y se añade 'missionsService'
import * as missionsService from '../../services/missionsService';
// ✅ NUEVO: Importar 'usePoints' para las notificaciones globales
import { usePoints } from '../../contexts/PointsContext';

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para subir videos con detección automática de orientación
const useVideoUpload = () => {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [detectionResult, setDetectionResult] = useState(null);

  // Validar archivo de video
  const validateVideoFile = (file) => {
    const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
    const maxSizeBytes = 2 * 1024 * 1024 * 1024; // 2GB
    const maxDurationSeconds = 3600; // 60 minutos

    if (!validTypes.includes(file.type)) {
      throw new Error(`Formato no soportado. Use: ${validTypes.join(', ')}`);
    }

    if (file.size > maxSizeBytes) {
      throw new Error(`El archivo es demasiado grande. Máximo: 2GB`);
    }

    return true;
  };

  // Subir video con detección automática
  const uploadVideo = async (file, metadata) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setDetectionResult(null);

      console.log('🎬 Iniciando upload con detección automática');

      // PASO 1: OBTENER USUARIO AUTENTICADO
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        throw new Error('Usuario no autenticado correctamente');
      }

      // PASO 2: VALIDAR ARCHIVO
      validateVideoFile(file);

      // PASO 3: DETECTAR ORIENTACIÓN
      setUploadProgress(5);
      console.log('🔍 Detectando orientación del video...');
      
      let orientationData = null;
      try {
        orientationData = await detectVideoFileOrientation(file);
        setDetectionResult(orientationData);
        console.log('✅ Orientación detectada:', orientationData);
        
      } catch (detectionError) {
        console.warn('⚠️ Error en detección, continuando con fallback:', detectionError);
        orientationData = {
          orientation: 'horizontal',
          aspectRatio: 'unknown',
          width: null,
          height: null,
          duration: 0,
          detectionMethod: 'fallback'
        };
      }

      setUploadProgress(15);

      // PASO 4: GENERAR NOMBRE ÚNICO
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const sanitizedTitle = metadata.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const fileName = `${currentUser.id}/${timestamp}_${sanitizedTitle}.${fileExtension}`;

      setUploadProgress(25);

      // PASO 5: SUBIR ARCHIVO A STORAGE
      let uploadData;
      try {
        const { data, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) throw uploadError;
        uploadData = data;
      } catch (uploadError) {
        console.warn('Bucket error:', uploadError);
        throw new Error('Error de configuración de almacenamiento. Contacta al administrador.');
      }

      setUploadProgress(50);

      // PASO 6: OBTENER URL PÚBLICA
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      setUploadProgress(65);

      // PASO 7: SUBIR THUMBNAIL
      let thumbnailUrl = null;
      try {
        if (metadata.customThumbnail) {
          console.log('📸 Subiendo miniatura personalizada...');
          const thumbnailFileName = `${currentUser.id}/${timestamp}_custom_thumb.jpg`;
          
          const { error: thumbError } = await supabase.storage
            .from('thumbnails')
            .upload(thumbnailFileName, metadata.customThumbnail);

          if (thumbError) throw thumbError;

          const { data: thumbUrlData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(thumbnailFileName);
          
          thumbnailUrl = thumbUrlData.publicUrl;
          console.log('✅ Miniatura personalizada subida');
          
        } else if (metadata.selectedThumbnail) {
          console.log('📸 Subiendo miniatura auto-generada...');
          const thumbnailFileName = fileName.replace(/\.[^/.]+$/, '_thumb.jpg');
          
          const { error: thumbError } = await supabase.storage
            .from('thumbnails')
            .upload(thumbnailFileName, metadata.selectedThumbnail.blob);

          if (!thumbError) {
            const { data: thumbUrlData } = supabase.storage
              .from('thumbnails')
              .getPublicUrl(thumbnailFileName);
            thumbnailUrl = thumbUrlData.publicUrl;
            console.log('✅ Miniatura auto-generada subida');
          }
        }
      } catch (thumbError) {
        console.warn('Error uploading thumbnail:', thumbError);
      }

      setUploadProgress(75);

      // PASO 8: OBTENER DURACIÓN
      const videoDuration = await getVideoDuration(file);

      setUploadProgress(75);

      // 🛑 PASO 9: ELIMINADO
      // El cálculo de puntos ahora lo hace el sistema de misiones.
      console.log('💰 Cálculo de puntos transferido al servicio de misiones.');

      setUploadProgress(80);

      // 🆕 PASO 10: INSERTAR EN BASE DE DATOS
      const { data: videoData, error: insertError } = await supabase
        .from('videos')
        .insert({
          user_id: currentUser.id,
          title: metadata.title,
          description: metadata.description || '',
          video_url: urlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          category_id: metadata.category, 
          tags: metadata.tags || [],
          duration_seconds: Math.round(videoDuration || 0),
          file_size_bytes: file.size,
          is_published: metadata.visibility === 'public',
          
          orientation: orientationData.orientation,
          aspect_ratio: orientationData.aspectRatio,
          video_width: orientationData.width,
          video_height: orientationData.height,
          
          // ✅ CORRECCIÓN: Los puntos se manejan por misiones, no en la tabla de video.
          points_earned: 0 
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(85);

      // 🆕 PASO 11: REPORTAR ACCIÓN AL SISTEMA DE MISIONES
      // ✅ CORRECCIÓN: Distinguir entre VIDEO y REEL basándose en orientación
      console.log('🔔 Reportando subida al sistema de misiones...');
      let pointsEarnedToday = 0;
      let missionResult = null;

      try {
        // ✅ Determinar el tipo de misión según la orientación
        const isReel = orientationData.orientation === 'vertical';
        const missionType = isReel 
          ? missionsService.MISSION_TYPES.UPLOAD_REEL   // Vertical = Reel
          : missionsService.MISSION_TYPES.UPLOAD_VIDEO; // Horizontal = Video
        
        const referenceType = isReel ? 'reel' : 'video';

        console.log(`📹 Detectado como: ${isReel ? 'REEL' : 'VIDEO'} (orientación: ${orientationData.orientation})`);

        missionResult = await missionsService.trackMissionProgress(
            missionType,      // ✅ UPLOAD_REEL o UPLOAD_VIDEO según orientación
            referenceType,    // ✅ 'reel' o 'video'
            videoData.id
        );

        console.log('✅ Misión reportada:', missionResult);

        // Si la misión se completó y dio puntos, los guardamos para la UI
        if (missionResult.result === 'success' && missionResult.points_earned > 0) {
            pointsEarnedToday = missionResult.points_earned;
        }
        
      } catch (missionError) {
        console.warn('⚠️ Error al reportar misión:', missionError);
      }
      
      setUploadProgress(90);

      // 🆕 PASO 12: ACTUALIZAR CONTADOR DE CATEGORÍA
      console.log('📊 Actualizando contador de categoría...');
      try {
        const { error: categoryError } = await supabase.rpc('increment_category_count', {
          category_id: metadata.category
        });
        
        if (categoryError) {
          console.warn('⚠️ Error actualizando contador (posiblemente necesita SLUG):', categoryError);
        } else {
          console.log('✅ Contador de categoría actualizado');
        }
      } catch (categoryUpdateError) {
        console.warn('⚠️ Error en contador de categoría:', categoryUpdateError);
      }

      setUploadProgress(95);

      // 🛑 Lógica duplicada/anterior eliminada
      setUploadProgress(100);

      return {
        success: true,
        videoId: videoData.id,
        videoUrl: urlData.publicUrl,
        thumbnailUrl,
        pointsEarned: pointsEarnedToday,
        orientation: orientationData.orientation,
        aspectRatio: orientationData.aspectRatio,
        detectionData: orientationData,
        missionResult: missionResult // ✅ CORRECCIÓN: Devolver el resultado de la misión
      };

    } catch (error) {
      console.error('❌ Error uploading video:', error);
      setUploadError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadVideo,
    uploadProgress,
    isUploading,
    uploadError,
    uploadSpeed,
    estimatedTime,
    detectionResult
  };
};

// ... (Resto de Hooks y Utilidades: useUserVideos, getVideoDuration, etc.)
// ... (Se asume que las funciones 'calculateUploadPoints' y 'addPointsTransaction'
// ...  ya no son necesarias, pero se dejan para no romper el archivo si son
// ...  usadas en otra parte que no vimos)

// ===============================
// UTILIDADES
// ===============================

const getVideoDuration = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
};

// 🛑 ESTA LÓGICA ESTÁ OBSOLETA (AHORA SE MANEJA POR MISIONES)
// PERO SE MANTIENE POR INTEGRIDAD DEL ARCHIVO ORIGINAL
const calculateUploadPoints = (durationSeconds, category) => {
  let basePoints = 30;
  let durationPoints = Math.floor(durationSeconds / 60) * 10;
  
  const categoryMultipliers = {
    'education': 1.5,
    'business': 1.3,
    'technology': 1.2,
    'entertainment': 1.0,
    'lifestyle': 1.0,
    'sports': 1.1,
    'music': 1.1,
    'cooking': 1.2,
    'travel': 1.1
  };
  
  const multiplier = categoryMultipliers[category] || 1.0;
  return Math.round((basePoints + durationPoints) * multiplier);
};

// 🛑 ESTA LÓGICA ESTÁ OBSOLETA
const addPointsTransaction = async (points, type, description) => {
  console.log(`Points transaction: +${points} for ${type}: ${description}`);
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('es-ES');
};

const formatSpeed = (bytesPerSecond) => {
  const mbps = bytesPerSecond / (1024 * 1024);
  return mbps < 1 ? `${(mbps * 1024).toFixed(0)} KB/s` : `${mbps.toFixed(1)} MB/s`;
};

const formatTime = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Hook para obtener videos recientes
const useUserVideos = () => {
  const { user } = useAuth();
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentVideos = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          duration_seconds,
          views_count,
          is_published,
          created_at,
          orientation
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const transformedVideos = data?.map(video => ({
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnail_url || '/default-thumbnail.jpg',
        duration: formatDuration(video.duration_seconds),
        status: video.is_published ? 'published' : 'draft',
        views: video.views_count,
        uploadDate: formatDate(video.created_at),
        orientation: video.orientation || 'horizontal'
      }));

      setRecentVideos(transformedVideos);
    } catch (error) {
      console.error('Error fetching recent videos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRecentVideos();
  }, [fetchRecentVideos]);

  return { recentVideos, loading, refetch: fetchRecentVideos };
};


// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const VideoUploadStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // ✅ NUEVO: Obtener 'triggerAnimation' de 'usePoints'
  const { triggerAnimation } = usePoints();
  const { uploadVideo, uploadProgress, isUploading, uploadError, uploadSpeed, estimatedTime, detectionResult } = useVideoUpload();
  const { recentVideos, loading: recentLoading } = useUserVideos();

  // ✨ NUEVO: Ref para el video de preview
  const videoPreviewRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [generatedThumbnails, setGeneratedThumbnails] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  
  // Estados para miniatura personalizada
  const [customThumbnail, setCustomThumbnail] = useState(null);
  const [customThumbnailPreview, setCustomThumbnailPreview] = useState(null);
  const [useCustomThumbnail, setUseCustomThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(null);
  
  // Estado para orientación del video
  const [videoOrientation, setVideoOrientation] = useState('horizontal');
  
  // Estado para el carrusel de miniaturas
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '', // 🛑 IMPORTANTE: Contendrá el UUID
    tags: [],
    visibility: 'public',
    allowComments: true,
    allowRatings: true,
    scheduledDate: ''
  });

  const categories = [
    { value: '', label: 'Selecciona una categoría' },
    { value: 'entertainment', label: 'Entretenimiento' },
    { value: 'education', label: 'Educación (+50% puntos)' },
    { value: 'business', label: 'Negocios (+30% puntos)' },
    { value: 'technology', label: 'Tecnología (+20% puntos)' },
    { value: 'lifestyle', label: 'Estilo de Vida' },
    { value: 'sports', label: 'Deportes (+10% puntos)' },
    { value: 'music', label: 'Música (+10% puntos)' },
    { value: 'cooking', label: 'Cocina (+20% puntos)' },
    { value: 'travel', label: 'Viajes (+10% puntos)' },
    { value: 'other', label: 'Otros' }
  ];

  const visibilityOptions = [
    { value: 'public', label: 'Público' },
    { value: 'unlisted', label: 'No listado' },
    { value: 'private', label: 'Privado' }
  ];

  // ✨ NUEVO: Efecto para actualizar vista previa cuando cambia la miniatura seleccionada
  useEffect(() => {
    if (videoPreviewRef.current && selectedThumbnail && !useCustomThumbnail) {
      // Saltar al segundo correspondiente de la miniatura seleccionada
      videoPreviewRef.current.currentTime = selectedThumbnail.time;
      console.log(`⏱️ Vista previa actualizada a ${selectedThumbnail.time.toFixed(2)}s`);
    }
  }, [selectedThumbnail, useCustomThumbnail]);

  // ===============================
  // FUNCIONES DEL CARRUSEL
  // ===============================

  const handleCarouselPrev = () => {
    const itemsPerView = videoOrientation === 'vertical' ? 2 : 1;
    setCarouselIndex(prev => Math.max(0, prev - itemsPerView));
  };

  const handleCarouselNext = () => {
    const itemsPerView = videoOrientation === 'vertical' ? 2 : 1;
    const maxIndex = generatedThumbnails.length - itemsPerView;
    setCarouselIndex(prev => Math.min(maxIndex, prev + itemsPerView));
  };

  const getVisibleThumbnails = () => {
    const itemsPerView = videoOrientation === 'vertical' ? 2 : 1;
    return generatedThumbnails.slice(carouselIndex, carouselIndex + itemsPerView);
  };

  const getCarouselIndicator = () => {
    const itemsPerView = videoOrientation === 'vertical' ? 2 : 1;
    const currentStart = carouselIndex + 1;
    const currentEnd = Math.min(carouselIndex + itemsPerView, generatedThumbnails.length);
    return `${currentStart}${itemsPerView > 1 ? `-${currentEnd}` : ''} / ${generatedThumbnails.length}`;
  };

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleFileSelect = async (fileData) => {
    try {
      const file = fileData.file || fileData;
      
      setSelectedFile(file);
      setCurrentStep(2);
      setCarouselIndex(0);
      
      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setFormData(prev => ({
        ...prev,
        title: prev.title || title
      }));

      // Detectar orientación
      const orientation = await detectVideoOrientation(file);
      setVideoOrientation(orientation);
      console.log('🎯 Orientación detectada:', orientation);

      // Generar thumbnails
      const thumbnails = await generateThumbnails(file, orientation);
      setGeneratedThumbnails(thumbnails);
      if (thumbnails.length > 0) {
        setSelectedThumbnail(thumbnails[0]);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  // ✨ MEJORADO: Actualiza vista previa al seleccionar miniatura
  const handleThumbnailSelect = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
    // El useEffect se encargará de actualizar el video
  };

  const handleCustomThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setThumbnailError(null);

    try {
      await validateCustomThumbnail(file, videoOrientation);
      
      setCustomThumbnail(file);
      setCustomThumbnailPreview(URL.createObjectURL(file));
      setUseCustomThumbnail(true);
      setThumbnailError(null);
      
      console.log('✅ Miniatura personalizada cargada:', file.name);
    } catch (error) {
      setThumbnailError(error);
      setCustomThumbnail(null);
      setCustomThumbnailPreview(null);
      setUseCustomThumbnail(false);
      console.error('❌ Error validando miniatura:', error);
    }
  };

  const handleUseCustomThumbnailToggle = (checked) => {
    setUseCustomThumbnail(checked);
    if (!checked) {
      setCustomThumbnail(null);
      setCustomThumbnailPreview(null);
      setThumbnailError(null);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (tagsString) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Por favor selecciona un archivo de video');
      return;
    }
    
    if (!formData.title.trim()) {
      alert('Por favor ingresa un título para el video');
      return;
    }
    
    if (!formData.category) {
      alert('Por favor selecciona una categoría');
      return;
    }

    if (!useCustomThumbnail && !selectedThumbnail) {
      alert('Por favor selecciona una miniatura o sube una personalizada');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const uploadMetadata = {
        ...formData,
        customThumbnail: useCustomThumbnail ? customThumbnail : null,
        selectedThumbnail: useCustomThumbnail ? null : selectedThumbnail
      };

      const result = await uploadVideo(selectedFile, uploadMetadata);
      
      if (result.success) {
        setUploadSuccess(result);
        setCurrentStep(3);

        // ============================================================
        // ✅ NUEVO: LÓGICA DE NOTIFICACIÓN GLOBAL
        // ============================================================
        const { missionResult } = result;
        if (missionResult) {
          if (missionResult.result === 'success' && missionResult.points_earned > 0) {
            // 1. MISIÓN COMPLETA (Dispara la notificación global de puntos)
            // (La función 'addPoints' en 'PointsContext' ya dispara la animación)
            console.log('Notificación de Misión Completa (manejada por addPoints)');
          } else if (missionResult.result === 'progress_updated') {
            // 2. PROGRESO REGISTRADO (Dispara una notificación genérica)
            triggerAnimation(0, 'earn', 'free'); // 0 puntos, pero activa la UI
            console.log('Notificación de Progreso de Misión');
          }
          // 'already_completed' no se maneja aquí, ya que 'Revisando...' es suficiente.
        }
        // ============================================================
        // ✅ FIN DE LA LÓGICA DE NOTIFICACIÓN
        // ============================================================

      } else {
        // Muestra el error específico de la subida
        alert(`Error al subir el video: ${result.error || 'Violación de restricción de clave foránea.'}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al procesar el formulario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepClick = (stepNumber) => {
    if (stepNumber === 1) {
      setCurrentStep(1);
    } else if (stepNumber === 2 && selectedFile) {
      setCurrentStep(2);
    } else if (stepNumber === 3 && uploadSuccess) {
      setCurrentStep(3);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setSelectedThumbnail(null);
    setGeneratedThumbnails([]);
    setUploadSuccess(null);
    setCustomThumbnail(null);
    setCustomThumbnailPreview(null);
    setUseCustomThumbnail(false);
    setThumbnailError(null);
    setVideoOrientation('horizontal');
    setCarouselIndex(0);
    
    setFormData({
      title: '',
      description: '',
      category: '',
      tags: [],
      visibility: 'public',
      allowComments: true,
      allowRatings: true,
      scheduledDate: ''
    });
  };

  // ===============================
  // FUNCIONES DE GENERACIÓN Y VALIDACIÓN
  // ===============================

  const detectVideoOrientation = (videoFile) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        const isVertical = video.videoHeight > video.videoWidth;
        const isSquare = Math.abs(video.videoHeight - video.videoWidth) < 10;
        
        let orientation = 'horizontal';
        if (isSquare) {
          orientation = 'square';
        } else if (isVertical) {
          orientation = 'vertical';
        }
        
        console.log(`📐 Dimensiones: ${video.videoWidth}x${video.videoHeight}`);
        console.log(`🎯 Orientación: ${orientation}`);
        
        URL.revokeObjectURL(video.src);
        resolve(orientation);
      };
      video.onerror = () => resolve('horizontal');
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const generateThumbnails = async (videoFile, orientation = 'horizontal') => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          const times = [
            video.duration * 0.10,
            video.duration * 0.25,
            video.duration * 0.40,
            video.duration * 0.60,
            video.duration * 0.75,
            video.duration * 0.90
          ];
          
          const thumbnails = [];
          let currentIndex = 0;

          const captureThumbnail = () => {
            if (currentIndex >= times.length) {
              resolve(thumbnails);
              return;
            }

            video.currentTime = times[currentIndex];
            video.onseeked = () => {
              if (orientation === 'vertical') {
                const targetHeight = 1280;
                const targetWidth = Math.round(targetHeight * (video.videoWidth / video.videoHeight));
                canvas.width = Math.min(targetWidth, 720);
                canvas.height = Math.min(targetHeight, 1280);
              } else {
                const targetWidth = 1920;
                const targetHeight = Math.round(targetWidth * (video.videoHeight / video.videoWidth));
                canvas.width = Math.min(targetWidth, 1920);
                canvas.height = Math.min(targetHeight, 1080);
              }
              
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              canvas.toBlob(blob => {
                thumbnails.push({
                  time: times[currentIndex],
                  blob: blob,
                  url: URL.createObjectURL(blob),
                  index: currentIndex,
                  orientation: orientation
                });
                currentIndex++;
                captureThumbnail();
              }, 'image/jpeg', 0.8);
            };
          };

          captureThumbnail();
        };

        video.onerror = () => {
          console.error('Error loading video for thumbnails');
          resolve([]);
        };

        video.src = URL.createObjectURL(videoFile);
      });
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return [];
    }
  };

  const validateCustomThumbnail = (file, orientation = 'horizontal') => {
    return new Promise((resolve, reject) => {
      const validFormats = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validFormats.includes(file.type)) {
        reject('Solo se permiten imágenes JPG o PNG');
        return;
      }

      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        reject('La imagen debe ser menor a 2MB');
        return;
      }

      const img = new Image();
      img.onload = () => {
        let minWidth, minHeight, expectedRatio;
        
        if (orientation === 'vertical') {
          minWidth = 720;
          minHeight = 1280;
          expectedRatio = 'vertical (9:16)';
        } else {
          minWidth = 1280;
          minHeight = 720;
          expectedRatio = 'horizontal (16:9)';
        }
        
        if (img.width < minWidth || img.height < minHeight) {
          reject(`Dimensión mínima para ${expectedRatio}: ${minWidth}x${minHeight}px`);
          return;
        }

        const isImageVertical = img.height > img.width;
        if (orientation === 'vertical' && !isImageVertical) {
          reject('La imagen debe ser vertical (9:16) para un Reel vertical');
          return;
        } else if (orientation === 'horizontal' && isImageVertical) {
          reject('La imagen debe ser horizontal (16:9) para un video horizontal');
          return;
        }

        resolve({
          valid: true,
          width: img.width,
          height: img.height,
          size: file.size
        });
      };

      img.onerror = () => reject('Error al cargar la imagen');
      img.src = URL.createObjectURL(file);
    });
  };

  const steps = [
    { number: 1, title: 'Subir', icon: 'Upload', active: currentStep >= 1, completed: currentStep > 1 },
    { number: 2, title: 'Configurar', icon: 'Settings', active: currentStep >= 2, completed: currentStep > 2 },
    { number: 3, title: 'Publicar', icon: 'CheckCircle', active: currentStep >= 3, completed: uploadSuccess !== null }
  ];

  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      <Helmet>
        <title>Estudio de Subida - Comparte tu Contenido | RADEISAN</title>
        <meta name="description" content="Sube videos, gana puntos y comparte tu creatividad con la comunidad RADEISAN" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Estudio de Creación</h1>
              <p className="text-muted-foreground">Sube tu contenido y compártelo con la comunidad</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {steps.map((step, index) => (
                  <React.Fragment key={step.number}>
                    <div 
                      className={`flex items-center cursor-pointer transition-all ${
                        step.active ? 'text-primary' : 'text-muted-foreground'
                      }`}
                      onClick={() => handleStepClick(step.number)}
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center mr-3 transition-all
                        ${step.completed ? 'bg-primary text-primary-foreground' : 
                          step.active ? 'bg-primary/10 text-primary border-2 border-primary' : 
                          'bg-muted text-muted-foreground'}
                      `}>
                        <Icon name={step.completed ? 'Check' : step.icon} size={20} />
                      </div>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-muted-foreground">Paso {step.number}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        step.completed ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Step 1: Upload */}
                {currentStep === 1 && (
                  <div className="bg-card rounded-lg border p-6">
                    <h2 className="text-xl font-medium text-foreground mb-6">
                      Selecciona tu video
                    </h2>
                    <VideoUploadZone
                      onFileSelect={handleFileSelect}
                      uploadProgress={uploadProgress}
                      isUploading={isUploading}
                    />
                    {uploadError && (
                      <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Icon name="AlertCircle" size={20} color="var(--color-destructive)" />
                          <p className="text-destructive font-medium">Error de subida</p>
                        </div>
                        <p className="text-sm text-destructive/80 mt-1">{uploadError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Configure */}
                {currentStep === 2 && selectedFile && (
                  <div className="space-y-6">
                    {/* File Preview */}
                    <div className="bg-card rounded-lg border p-6">
                      <h2 className="text-xl font-medium text-foreground mb-4">
                        Vista previa
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ✨ Vista previa ADAPTADA con REF para actualización en tiempo real */}
                        <div>
                          <div className={`bg-black rounded-lg overflow-hidden mb-3 ${
                            videoOrientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'
                          }`}>
                            <video 
                              ref={videoPreviewRef}
                              src={URL.createObjectURL(selectedFile)}
                              controls
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {selectedFile.name} • {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                          
                          {/* Información de detección */}
                          {detectionResult && (
                            <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                              <div className="flex items-center space-x-2 mb-1">
                                <Icon 
                                  name={detectionResult.orientation === 'vertical' ? 'Smartphone' : 'Monitor'} 
                                  size={16} 
                                  color="var(--color-primary)" 
                                />
                                <span className="text-sm font-medium text-primary">
                                  {detectionResult.orientation === 'vertical' ? 'Reel' : 
                                   detectionResult.orientation === 'square' ? 'Video Cuadrado' : 'Video'}
                                </span>
                              </div>
                              <p className="text-xs text-primary/80">
                                {detectionResult.width && detectionResult.height && (
                                  `${detectionResult.width}x${detectionResult.height} • ${detectionResult.aspectRatio}`
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* ✨ CARRUSEL DE MINIATURAS */}
                        {generatedThumbnails.length > 0 && (
                          <div>
                            <h4 className="font-medium text-foreground mb-3">
                              Seleccionar miniatura {useCustomThumbnail && '(opcional)'}
                            </h4>
                            
                            {/* Carrusel con navegación */}
                            <div className="space-y-3">
                              {/* Contenedor del carrusel */}
                              <div className="relative">
                                {/* Botón anterior */}
                                <button
                                  onClick={handleCarouselPrev}
                                  disabled={carouselIndex === 0 || useCustomThumbnail}
                                  className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all ${
                                    (carouselIndex === 0 || useCustomThumbnail) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                >
                                  <Icon name="ChevronLeft" size={16} />
                                </button>

                                {/* Grid de miniaturas visibles */}
                                <div className={`grid gap-3 ${
                                  videoOrientation === 'vertical' 
                                    ? 'grid-cols-2' // 2 visibles para Reels
                                    : 'grid-cols-1' // 1 visible para Videos
                                }`}>
                                  {getVisibleThumbnails().map((thumb) => (
                                    <div 
                                      key={thumb.index}
                                      className={`rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative ${
                                        videoOrientation === 'vertical' 
                                          ? 'aspect-[9/16]'
                                          : 'aspect-video'
                                      } ${
                                        !useCustomThumbnail && selectedThumbnail?.index === thumb.index
                                          ? 'border-primary ring-2 ring-primary/20' 
                                          : 'border-border hover:border-primary/50'
                                      } ${useCustomThumbnail ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      onClick={() => {
                                        if (!useCustomThumbnail) {
                                          handleThumbnailSelect(thumb);
                                        }
                                      }}
                                    >
                                      <img 
                                        src={thumb.url} 
                                        alt={`Thumbnail ${thumb.index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                        {Math.round(thumb.time)}s
                                      </div>
                                      {!useCustomThumbnail && selectedThumbnail?.index === thumb.index && (
                                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                                          ✓
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Botón siguiente */}
                                <button
                                  onClick={handleCarouselNext}
                                  disabled={
                                    carouselIndex >= generatedThumbnails.length - (videoOrientation === 'vertical' ? 2 : 1) ||
                                    useCustomThumbnail
                                  }
                                  className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all ${
                                    (carouselIndex >= generatedThumbnails.length - (videoOrientation === 'vertical' ? 2 : 1) || useCustomThumbnail) 
                                      ? 'opacity-50 cursor-not-allowed' 
                                      : 'cursor-pointer'
                                  }`}
                                >
                                  <Icon name="ChevronRight" size={16} />
                                </button>
                              </div>

                              {/* Indicador de posición */}
                              <div className="text-center">
                                <span className="text-xs text-muted-foreground font-medium">
                                  {getCarouselIndicator()}
                                </span>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="relative my-4">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                              </div>
                              <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-card text-muted-foreground">O</span>
                              </div>
                            </div>

                            {/* Opción de miniatura personalizada */}
                            <div className="space-y-3">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={useCustomThumbnail}
                                  onChange={(e) => handleUseCustomThumbnailToggle(e.target.checked)}
                                  className="rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-foreground">
                                  Usar miniatura personalizada
                                </span>
                              </label>

                              {useCustomThumbnail && (
                                <div className="space-y-3">
                                  {/* Input de archivo */}
                                  <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-all">
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png"
                                      onChange={handleCustomThumbnailUpload}
                                      className="hidden"
                                      id="custom-thumbnail-input"
                                    />
                                    <label 
                                      htmlFor="custom-thumbnail-input"
                                      className="cursor-pointer flex flex-col items-center space-y-2"
                                    >
                                      <Icon name="Upload" size={24} color="var(--color-primary)" />
                                      <div className="text-center">
                                        <p className="text-sm font-medium text-foreground">
                                          Subir imagen
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {videoOrientation === 'vertical' 
                                            ? 'JPG o PNG • Máx 2MB • Min 720x1280px (9:16)'
                                            : 'JPG o PNG • Máx 2MB • Min 1280x720px (16:9)'}
                                        </p>
                                      </div>
                                    </label>
                                  </div>

                                  {/* ✨ Preview de miniatura personalizada MÁS PEQUEÑO */}
                                  {customThumbnailPreview && (
                                    <div className="flex justify-center">
                                      <div className={`relative rounded-lg overflow-hidden border-2 border-primary ${
                                        videoOrientation === 'vertical' 
                                          ? 'w-32 aspect-[9/16]'
                                          : 'w-48 aspect-video'
                                      }`}>
                                        <img 
                                          src={customThumbnailPreview} 
                                          alt="Miniatura personalizada"
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                          Personalizada ✓
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Error de validación */}
                                  {thumbnailError && (
                                    <div className="flex items-start space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                      <Icon name="AlertCircle" size={16} color="var(--color-destructive)" className="mt-0.5 flex-shrink-0" />
                                      <p className="text-sm text-destructive">{thumbnailError}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata Form */}
                    <div className="bg-card rounded-lg border p-6">
                      <h2 className="text-xl font-medium text-foreground mb-6">
                        Información del video
                      </h2>
                      
                      <form onSubmit={handleFormSubmit} className="space-y-6">
                        {/* Título */}
                        <div>
                          <Input
                            label="Título del video"
                            type="text"
                            placeholder="Ingresa un título atractivo"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            required
                            maxLength={100}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {formData.title.length}/100 caracteres
                          </p>
                        </div>

                        {/* Descripción */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Descripción
                          </label>
                          <textarea
                            placeholder="Describe tu video..."
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={4}
                            maxLength={500}
                            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {formData.description.length}/500 caracteres
                          </p>
                        </div>

                        {/* Categoría - 🆕 INTEGRADO CON ADMIN */}
                        <CategorySelector
                          value={formData.category}
                          onChange={(category) => handleInputChange('category', category)}
                          required
                        />

                        {/* Tags */}
                        <div>
                          <Input
                            label="Etiquetas (separadas por coma)"
                            type="text"
                            placeholder="gaming, tutorial, tech, español"
                            value={formData.tags.join(', ')}
                            onChange={(e) => handleTagsChange(e.target.value)}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Ayuda a que otros usuarios encuentren tu video
                          </p>
                        </div>

                        {/* Visibilidad */}
                        <div>
                          <Select
                            label="Visibilidad"
                            value={formData.visibility}
                            onChange={(value) => handleInputChange('visibility', value)}
                            options={visibilityOptions}
                          />
                        </div>

                        {/* Configuraciones adicionales */}
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.allowComments}
                              onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm text-foreground">Permitir comentarios</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.allowRatings}
                              onChange={(e) => handleInputChange('allowRatings', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm text-foreground">Permitir calificaciones</span>
                          </label>
                        </div>

                        {/* Botón de envío */}
                        <div className="flex gap-4 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(1)}
                            disabled={isSubmitting}
                          >
                            <Icon name="ArrowLeft" size={16} className="mr-2" />
                            Volver
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmitting || !formData.title || !formData.category}
                            className="flex-1"
                          >
                            {isSubmitting ? (
                              <>
                                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                                Publicando...
                              </>
                            ) : (
                              <>
                                <Icon name="Upload" size={16} className="mr-2" />
                                Publicar Video
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Step 3: Success */}
                {currentStep === 3 && uploadSuccess && (
                  <div className="bg-card rounded-lg border p-6 text-center">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon name="CheckCircle" size={32} color="var(--color-success)" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {uploadSuccess.orientation === 'vertical' ? '¡Reel publicado exitosamente!' : '¡Video publicado exitosamente!'}
                    </h2>
                    
                    <p className="text-muted-foreground mb-6">
                      Tu {uploadSuccess.orientation === 'vertical' ? 'reel' : 'video'} está ahora disponible para la comunidad
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon name="Award" size={20} color="var(--color-primary)" />
                          <span className="font-medium">Puntos ganados</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {uploadSuccess.pointsEarned > 0 ? `+${uploadSuccess.pointsEarned}` : 'Revisando...'}
                        </p>
                        {uploadSuccess.pointsEarned === 0 && (
                          <p className="text-xs text-muted-foreground">El sistema de misiones procesará tu subida.</p>
                        )}
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon 
                            name={uploadSuccess.orientation === 'vertical' ? 'Smartphone' : 'Monitor'} 
                            size={20} 
                            color="var(--color-muted-foreground)" 
                          />
                          <span className="font-medium">Tipo detectado</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {uploadSuccess.orientation === 'vertical' ? 'Reel' : 
                           uploadSuccess.orientation === 'square' ? 'Cuadrado' : 'Video'}
                        </p>
                        <p className="text-xs text-muted-foreground">{uploadSuccess.aspectRatio}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        onClick={() => navigate('/dashboard')}
                        className="flex-1"
                      >
                        <Icon name="Eye" size={16} className="mr-2" />
                        Ver en Feed
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={resetForm}
                        className="flex-1"
                      >
                        <Icon name="Plus" size={16} className="mr-2" />
                        Subir Otro Video
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                
                {/* Upload Stats */}
                {isUploading && (
                  <div className="bg-card rounded-lg border p-6">
                    <h3 className="font-medium text-foreground mb-4">Progreso de subida</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progreso</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      {uploadSpeed > 0 && (
                        <>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Velocidad</span>
                            <span>{formatSpeed(uploadSpeed)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Tiempo restante</span>
                            <span>{formatTime(estimatedTime)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent Uploads */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-medium text-foreground mb-4">Videos recientes</h3>
                  {recentLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 animate-pulse">
                          <div className="w-16 h-12 bg-muted rounded" />
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded mb-2" />
                            <div className="h-3 bg-muted rounded w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentVideos.length > 0 ? (
                    <div className="space-y-3">
                      {recentVideos.map((video) => (
                        <div key={video.id} className="flex items-center space-x-3">
                          <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                            <img 
                              src={video.thumbnail} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 right-1">
                              <Icon 
                                name={video.orientation === 'vertical' ? 'Smartphone' : 'Monitor'} 
                                size={12} 
                                color="white"
                                className="bg-black/50 rounded p-0.5"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm truncate">
                              {video.title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                video.status === 'published' 
                                  ? 'bg-success/10 text-success' 
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {video.status === 'published' ? 'Publicado' : 'Borrador'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {video.views} views
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tienes videos aún
                    </p>
                  )}
                </div>

                {/* Tips */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-medium text-foreground mb-4">Consejos para creadores</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <Icon name="Lightbulb" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Los videos educativos y de negocios ganan más puntos (próximamente)
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Smartphone" size={16} color="var(--color-success)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Los Reels (videos verticales) reciben más puntos (próximamente)
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Clock" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Videos más largos generan más puntos por minuto (próximamente)
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Eye" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        La vista previa se actualiza automáticamente al seleccionar miniaturas
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default VideoUploadStudio;
