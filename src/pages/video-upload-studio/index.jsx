// src/pages/video-upload-studio/index.jsx
// VideoUploadStudio con VISTA PREVIA EN TIEMPO REAL + SISTEMA DE PUNTOS DUAL
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadVideoWithOrientationDetection, detectVideoFileOrientation } from '../../services/videoDetection';
import { useDualPoints } from '../../hooks/useDualPoints';
import * as pointsService from '../../services/pointsService';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import VideoUploadZone from './components/VideoUploadZone';

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para subir videos con detección automática de orientación
const useVideoUpload = () => {
  const { user } = useAuth();
  const { addFreePoints } = useDualPoints();
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

      setUploadProgress(85);

      // PASO 9: CALCULAR PUNTOS CON SISTEMA DUAL
      console.log('💎 Calculando puntos con sistema dual...');
      const pointsCalculation = await pointsService.calculateVideoPoints(
        videoDuration,
        metadata.category,
        orientationData.orientation
      );
      const totalPoints = pointsCalculation.total_points;

      // PASO 10: INSERTAR EN BASE DE DATOS
      const { data: videoData, error: insertError } = await supabase
        .from('videos')
        .insert({
          user_id: currentUser.id,
          title: metadata.title,
          description: metadata.description || '',
          video_url: urlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          category: metadata.category,
          tags: metadata.tags || [],
          duration_seconds: videoDuration,
          file_size_bytes: file.size,
          orientation: orientationData.orientation,
          aspect_ratio: orientationData.aspectRatio,
          video_width: orientationData.width,
          video_height: orientationData.height,
          is_published: true,
          points_earned: totalPoints
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(95);

      // PASO 11: AGREGAR PUNTOS GRATIS AL USUARIO
      console.log('🎁 Agregando puntos gratis al usuario...');
      try {
        await addFreePoints(
          totalPoints,
          `Video subido: ${metadata.title}`,
          'video',
          videoData.id
        );
        console.log(`✅ ${totalPoints} puntos gratis agregados`);
      } catch (pointsError) {
        console.error('Error agregando puntos:', pointsError);
        // No lanzar error, el video ya fue subido exitosamente
      }

      setUploadProgress(100);

      return {
        success: true,
        video: videoData,
        pointsEarned: totalPoints,
        pointsBreakdown: pointsCalculation,
        orientation: orientationData.orientation,
        aspectRatio: orientationData.aspectRatio
      };

    } catch (error) {
      console.error('❌ Error en upload:', error);
      setUploadError(error.message || 'Error desconocido al subir video');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
    setDetectionResult(null);
  };

  return {
    uploadVideo,
    uploadProgress,
    isUploading,
    uploadError,
    uploadSpeed,
    estimatedTime,
    detectionResult,
    resetUpload
  };
};

// Hook para generar miniaturas automáticamente
const useThumbnailGenerator = () => {
  const [thumbnails, setThumbnails] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateThumbnails = useCallback(async (videoFile, count = 4) => {
    setIsGenerating(true);
    setThumbnails([]);

    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(videoFile);

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      const duration = video.duration;
      const interval = duration / (count + 1);
      const generatedThumbnails = [];

      for (let i = 1; i <= count; i++) {
        const time = interval * i;
        video.currentTime = time;

        await new Promise((resolve) => {
          video.onseeked = resolve;
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.85);
        });

        const url = URL.createObjectURL(blob);
        generatedThumbnails.push({
          id: `thumb-${i}`,
          url,
          blob,
          timestamp: time
        });
      }

      setThumbnails(generatedThumbnails);
      URL.revokeObjectURL(video.src);
    } catch (error) {
      console.error('Error generating thumbnails:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { thumbnails, isGenerating, generateThumbnails };
};

// ===============================
// UTILIDADES
// ===============================

// Obtener duración de un video
const getVideoDuration = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => reject(new Error('Error al leer duración del video'));
    video.src = URL.createObjectURL(file);
  });
};

// Formatear velocidad de subida
const formatSpeed = (bytesPerSecond) => {
  const mbps = (bytesPerSecond / (1024 * 1024)).toFixed(2);
  return `${mbps} MB/s`;
};

// Formatear tiempo restante
const formatTime = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const VideoUploadStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const { 
    uploadVideo, 
    uploadProgress, 
    isUploading, 
    uploadError,
    uploadSpeed,
    estimatedTime,
    detectionResult,
    resetUpload
  } = useVideoUpload();

  const { thumbnails, isGenerating, generateThumbnails } = useThumbnailGenerator();

  // Estado del formulario
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: []
  });
  const [customThumbnail, setCustomThumbnail] = useState(null);
  const [customThumbnailPreview, setCustomThumbnailPreview] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [recentVideos, setRecentVideos] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // ✅ NUEVO: Estado para categorías dinámicas
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // ✅ NUEVO: Estado para preview de puntos
  const [pointsPreview, setPointsPreview] = useState(null);
  const [loadingPointsPreview, setLoadingPointsPreview] = useState(false);

  // ===============================
  // ✅ NUEVO: CARGAR CATEGORÍAS DINÁMICAS
  // ===============================
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;

        setCategories(data || []);
        
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        // Fallback a categorías por defecto si hay error
        setCategories([
          { slug: 'education', name: 'Educación', icon: 'GraduationCap', points_multiplier: 1.5 },
          { slug: 'business', name: 'Negocios', icon: 'Briefcase', points_multiplier: 1.3 },
          { slug: 'technology', name: 'Tecnología', icon: 'Laptop', points_multiplier: 1.2 },
          { slug: 'entertainment', name: 'Entretenimiento', icon: 'Tv', points_multiplier: 1.0 }
        ]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  // ===============================
  // ✅ NUEVO: CALCULAR PREVIEW DE PUNTOS
  // ===============================
  useEffect(() => {
    const calculatePointsPreview = async () => {
      // Solo calcular si tenemos archivo y categoría
      if (!selectedFile || !formData.category) {
        setPointsPreview(null);
        return;
      }

      try {
        setLoadingPointsPreview(true);

        // Obtener duración del video
        const duration = await getVideoDuration(selectedFile);

        // Obtener orientación detectada o usar horizontal por defecto
        const orientation = detectionResult?.orientation || 'horizontal';

        // Calcular puntos usando el servicio
        const calculation = await pointsService.calculateVideoPoints(
          duration,
          formData.category,
          orientation
        );

        setPointsPreview(calculation);

      } catch (error) {
        console.error('Error calculando preview de puntos:', error);
        setPointsPreview(null);
      } finally {
        setLoadingPointsPreview(false);
      }
    };

    calculatePointsPreview();
  }, [selectedFile, formData.category, detectionResult]);

  // Cargar videos recientes
  useEffect(() => {
    const loadRecentVideos = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('id, title, thumbnail_url, views_count, is_published, orientation, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        setRecentVideos(data.map(video => ({
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnail_url || '/placeholder-thumbnail.jpg',
          views: video.views_count || 0,
          status: video.is_published ? 'published' : 'draft',
          orientation: video.orientation || 'horizontal'
        })));
      } catch (error) {
        console.error('Error loading recent videos:', error);
      } finally {
        setRecentLoading(false);
      }
    };

    loadRecentVideos();
  }, [user, uploadSuccess]);

  // Generar miniaturas cuando se selecciona un archivo
  useEffect(() => {
    if (selectedFile) {
      generateThumbnails(selectedFile);
    }
  }, [selectedFile, generateThumbnails]);

  // Handlers
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setUploadSuccess(null);
    setUploadError(null);
    setSelectedThumbnail(null);
    setCustomThumbnail(null);
    setCustomThumbnailPreview(null);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailSelect = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
    setCustomThumbnail(null);
    setCustomThumbnailPreview(null);
  };

  const handleCustomThumbnailUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomThumbnail(file);
      setCustomThumbnailPreview(URL.createObjectURL(file));
      setSelectedThumbnail(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Por favor selecciona un video');
      return;
    }

    if (!formData.title.trim()) {
      alert('Por favor ingresa un título');
      return;
    }

    if (!formData.category) {
      alert('Por favor selecciona una categoría');
      return;
    }

    try {
      const result = await uploadVideo(selectedFile, {
        ...formData,
        customThumbnail,
        selectedThumbnail
      });

      setUploadSuccess(result);
      
    } catch (error) {
      console.error('Error en submit:', error);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setFormData({ title: '', description: '', category: '', tags: [] });
    setCustomThumbnail(null);
    setCustomThumbnailPreview(null);
    setSelectedThumbnail(null);
    setUploadSuccess(null);
    setPointsPreview(null);
    resetUpload();
  };

  // Determinar qué thumbnail mostrar en el preview
  const getPreviewThumbnail = () => {
    if (customThumbnailPreview) return customThumbnailPreview;
    if (selectedThumbnail) return selectedThumbnail.url;
    if (thumbnails.length > 0) return thumbnails[0].url;
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Subir Video - RADEISAN Studio</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Video Upload Studio</h1>
              <p className="text-muted-foreground">
                Sube tu video y gana puntos. Los Reels verticales reciben bonus adicional.
              </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Upload Area */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* File Upload Zone */}
                {!selectedFile && !uploadSuccess && (
                  <VideoUploadZone onFileSelect={handleFileSelect} />
                )}

                {/* Video Form */}
                {selectedFile && !uploadSuccess && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Video Preview con Thumbnail Seleccionada */}
                    <div className="bg-card rounded-lg border p-6">
                      <h3 className="font-medium text-foreground mb-4">Vista previa del video</h3>
                      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                        {getPreviewThumbnail() ? (
                          <img
                            src={getPreviewThumbnail()}
                            alt="Video preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <video
                            src={videoPreviewUrl}
                            className="w-full h-full object-contain"
                          />
                        )}
                        {detectionResult && (
                          <div className="absolute top-4 right-4 bg-black/75 text-white px-3 py-1.5 rounded-lg text-sm">
                            <Icon 
                              name={detectionResult.orientation === 'vertical' ? 'Smartphone' : 'Monitor'} 
                              size={16}
                              className="inline mr-2"
                            />
                            {detectionResult.orientation === 'vertical' ? 'Reel' : 'Video'}
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1.5 rounded-lg text-xs">
                          <Icon name="Image" size={14} className="inline mr-1" />
                          {customThumbnailPreview ? 'Miniatura personalizada' : 
                           selectedThumbnail ? `Miniatura ${thumbnails.findIndex(t => t.id === selectedThumbnail.id) + 1}` : 
                           'Miniatura por defecto'}
                        </div>
                      </div>
                    </div>

                    {/* ✅ NUEVO: Preview de Puntos */}
                    {pointsPreview && (
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Icon name="Coins" size={24} color="var(--color-primary)" />
                            <h3 className="font-semibold text-foreground">Puntos que ganarás</h3>
                          </div>
                          <div className="text-3xl font-bold text-primary">
                            +{pointsPreview.total_points}
                          </div>
                        </div>

                        {/* Desglose de puntos */}
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between py-2 border-t border-blue-200">
                            <span className="text-gray-600">Puntos base (por duración)</span>
                            <span className="font-medium">+{pointsPreview.base_points}</span>
                          </div>
                          
                          <div className="flex items-center justify-between py-2 border-t border-blue-200">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">Multiplicador de categoría</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {pointsPreview.category_name}
                              </span>
                            </div>
                            <span className="font-medium text-blue-600">
                              ×{pointsPreview.category_multiplier}
                            </span>
                          </div>

                          {pointsPreview.orientation_bonus > 0 && (
                            <div className="flex items-center justify-between py-2 border-t border-blue-200">
                              <div className="flex items-center space-x-2">
                                <Icon name="Smartphone" size={16} color="var(--color-success)" />
                                <span className="text-gray-600">Bonus por Reel</span>
                              </div>
                              <span className="font-medium text-green-600">
                                +{pointsPreview.orientation_bonus}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between py-3 border-t-2 border-blue-300">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="text-2xl font-bold text-primary">
                              {pointsPreview.total_points} pts
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-start space-x-2 bg-white/50 rounded p-3">
                          <Icon name="Info" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-600">
                            Los puntos se agregarán automáticamente a tu balance después de publicar el video
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Video Details */}
                    <div className="bg-card rounded-lg border p-6 space-y-4">
                      <h3 className="font-medium text-foreground mb-4">Detalles del video</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Título *
                        </label>
                        <Input
                          type="text"
                          value={formData.title}
                          onChange={(e) => handleFormChange('title', e.target.value)}
                          placeholder="Dale un título atractivo a tu video"
                          required
                          maxLength={100}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Descripción
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleFormChange('description', e.target.value)}
                          placeholder="Describe tu video (opcional)"
                          className="w-full min-h-[100px] px-3 py-2 border border-input rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          maxLength={500}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Categoría *
                        </label>
                        {categoriesLoading ? (
                          <div className="h-10 bg-muted animate-pulse rounded-lg"></div>
                        ) : (
                          <Select
                            value={formData.category}
                            onChange={(e) => handleFormChange('category', e.target.value)}
                            required
                          >
                            <option value="">Selecciona una categoría</option>
                            {categories.map((cat) => (
                              <option key={cat.slug} value={cat.slug}>
                                {cat.name} (×{cat.points_multiplier} puntos)
                              </option>
                            ))}
                          </Select>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Las categorías con mayor multiplicador otorgan más puntos
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Tags (opcional)
                        </label>
                        <Input
                          type="text"
                          placeholder="Separados por comas: gaming, tutorial, español"
                          onChange={(e) => {
                            const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                            handleFormChange('tags', tags);
                          }}
                        />
                      </div>
                    </div>

                    {/* Thumbnail Selection */}
                    <div className="bg-card rounded-lg border p-6">
                      <h3 className="font-medium text-foreground mb-4">Miniatura del video</h3>
                      
                      {/* Auto-generated thumbnails */}
                      {isGenerating ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="aspect-video bg-muted rounded-lg animate-pulse" />
                          ))}
                        </div>
                      ) : thumbnails.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          {thumbnails.map((thumb, index) => (
                            <button
                              key={thumb.id}
                              type="button"
                              onClick={() => handleThumbnailSelect(thumb)}
                              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                                selectedThumbnail?.id === thumb.id
                                  ? 'border-primary ring-2 ring-primary/20'
                                  : 'border-transparent hover:border-primary/50'
                              }`}
                            >
                              <img
                                src={thumb.url}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {selectedThumbnail?.id === thumb.id && (
                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                  <div className="bg-primary text-white rounded-full p-1">
                                    <Icon name="Check" size={16} />
                                  </div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {/* Custom thumbnail upload */}
                      <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          O sube tu propia miniatura
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCustomThumbnailUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Icon name="Upload" size={16} className="mr-2" />
                          {customThumbnail ? 'Cambiar miniatura personalizada' : 'Subir miniatura personalizada'}
                        </Button>
                        
                        {customThumbnailPreview && (
                          <div className="mt-3 relative aspect-video rounded-lg overflow-hidden border-2 border-primary">
                            <img
                              src={customThumbnailPreview}
                              alt="Custom thumbnail"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                              Personalizada
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        type="submit"
                        disabled={isUploading || !formData.title || !formData.category}
                        className="flex-1"
                      >
                        {isUploading ? (
                          <>
                            <Icon name="Upload" size={16} className="mr-2 animate-pulse" />
                            Subiendo... {Math.round(uploadProgress)}%
                          </>
                        ) : (
                          <>
                            <Icon name="Upload" size={16} className="mr-2" />
                            Publicar Video
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        disabled={isUploading}
                      >
                        <Icon name="X" size={16} className="mr-2" />
                        Cancelar
                      </Button>
                    </div>

                    {uploadError && (
                      <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Icon name="AlertCircle" size={20} color="var(--color-destructive)" className="flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-destructive">Error al subir video</h4>
                            <p className="text-sm text-destructive mt-1">{uploadError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                )}

                {/* Success State */}
                {uploadSuccess && (
                  <div className="bg-card rounded-lg border p-8">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="CheckCircle" size={32} color="var(--color-success)" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">¡Video publicado exitosamente!</h2>
                      <p className="text-muted-foreground">Tu contenido ya está disponible en el feed</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon name="Award" size={20} color="var(--color-primary)" />
                          <span className="font-medium">Puntos ganados</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">+{uploadSuccess.pointsEarned}</p>
                        {uploadSuccess.pointsBreakdown && (
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <p>Base: {uploadSuccess.pointsBreakdown.base_points} pts</p>
                            <p>Categoría: ×{uploadSuccess.pointsBreakdown.category_multiplier}</p>
                            {uploadSuccess.pointsBreakdown.orientation_bonus > 0 && (
                              <p className="text-success">Bonus Reel: +{uploadSuccess.pointsBreakdown.orientation_bonus}</p>
                            )}
                          </div>
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
                        Las categorías con mayor multiplicador otorgan más puntos gratis
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Smartphone" size={16} color="var(--color-success)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Los Reels (videos verticales) reciben +10 puntos bonus
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Clock" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Videos más largos generan más puntos base
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Eye" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        La vista previa se actualiza automáticamente al seleccionar miniaturas
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Coins" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Los puntos se agregan automáticamente a tu balance de puntos gratis
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
