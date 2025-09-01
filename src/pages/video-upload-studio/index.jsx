// src/pages/video-upload-studio/index.jsx
// VideoUploadStudio con integración real de Supabase
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import VideoUploadZone from './components/VideoUploadZone';
import VideoPreview from './components/VideoPreview';
import VideoMetadataForm from './components/VideoMetadataForm';

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para subir videos a Supabase Storage
const useVideoUpload = () => {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

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

  // Generar thumbnail del video
  const generateThumbnail = (videoFile) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        // Buscar thumbnail en diferentes momentos del video
        const times = [0, video.duration * 0.25, video.duration * 0.5, video.duration * 0.75];
        const thumbnails = [];
        let currentIndex = 0;

        const captureThumbnail = () => {
          if (currentIndex >= times.length) {
            resolve(thumbnails);
            return;
          }

          video.currentTime = times[currentIndex];
          video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            canvas.toBlob(blob => {
              thumbnails.push({
                time: times[currentIndex],
                blob: blob,
                url: URL.createObjectURL(blob)
              });
              currentIndex++;
              captureThumbnail();
            }, 'image/jpeg', 0.8);
          };
        };

        captureThumbnail();
      };

      video.onerror = () => reject(new Error('Error generando thumbnails'));
      video.src = URL.createObjectURL(videoFile);
    });
  };

  // Subir video a Supabase Storage
  const uploadVideo = async (file, metadata) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      // Validar archivo
      validateVideoFile(file);

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.id}/${timestamp}_${metadata.title.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;

      let startTime = Date.now();
      let lastLoaded = 0;

      // Subir archivo con progreso
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            setUploadProgress(percentage);

            // Calcular velocidad y tiempo estimado
            const currentTime = Date.now();
            const elapsedSeconds = (currentTime - startTime) / 1000;
            const uploadedBytes = progress.loaded - lastLoaded;
            const speed = uploadedBytes / elapsedSeconds;
            const remainingBytes = progress.total - progress.loaded;
            const estimatedSeconds = remainingBytes / speed;

            setUploadSpeed(speed);
            setEstimatedTime(estimatedSeconds);
            lastLoaded = progress.loaded;
            startTime = currentTime;
          }
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública del video
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      // Generar y subir thumbnail
      const thumbnails = await generateThumbnail(file);
      let thumbnailUrl = null;

      if (thumbnails.length > 0) {
        const selectedThumbnail = thumbnails[Math.floor(thumbnails.length / 2)]; // Usar el del medio
        const thumbnailFileName = fileName.replace(/\.[^/.]+$/, '_thumb.jpg');
        
        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailFileName, selectedThumbnail.blob);

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(thumbnailFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      // Obtener duración del video
      const videoDuration = await getVideoDuration(file);

      // Insertar metadata en la tabla videos
      const { data: videoData, error: insertError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: metadata.title,
          description: metadata.description,
          video_url: urlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          category: metadata.category,
          tags: metadata.tags || [],
          duration_seconds: Math.round(videoDuration),
          file_size_bytes: file.size,
          is_published: metadata.visibility === 'public',
          points_earned: 0 // Se calculará cuando tenga views
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Otorgar puntos por subir video
      const uploadPoints = calculateUploadPoints(videoDuration, metadata.category);
      await addPointsTransaction(uploadPoints, 'video_upload', `Puntos por subir: ${metadata.title}`);

      setUploadProgress(100);
      return {
        success: true,
        videoId: videoData.id,
        videoUrl: urlData.publicUrl,
        thumbnailUrl,
        pointsEarned: uploadPoints
      };

    } catch (error) {
      console.error('Error uploading video:', error);
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
    estimatedTime
  };
};

// Hook para obtener videos recientes del usuario
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
          created_at
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
        uploadDate: formatDate(video.created_at)
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
// UTILIDADES
// ===============================

// Obtener duración del video
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

// Calcular puntos por subir video
const calculateUploadPoints = (durationSeconds, category) => {
  let basePoints = 50; // Base por subir
  let durationPoints = Math.floor(durationSeconds / 60) * 10; // 10 puntos por minuto
  
  // Multiplicador por categoría
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

// Agregar transacción de puntos
const addPointsTransaction = async (points, type, description) => {
  // Esta función se implementaría en el backend o con permisos service_role
  // Por ahora es un placeholder
  console.log(`Points transaction: +${points} for ${type}: ${description}`);
};

// Formatear duración en MM:SS
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Formatear fecha
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('es-ES');
};

// Formatear velocidad de subida
const formatSpeed = (bytesPerSecond) => {
  const mbps = bytesPerSecond / (1024 * 1024);
  return mbps < 1 ? `${(mbps * 1024).toFixed(0)} KB/s` : `${mbps.toFixed(1)} MB/s`;
};

// Formatear tiempo estimado
const formatTime = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const VideoUploadStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { uploadVideo, uploadProgress, isUploading, uploadError, uploadSpeed, estimatedTime } = useVideoUpload();
  const { recentVideos, loading: recentLoading } = useUserVideos();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [generatedThumbnails, setGeneratedThumbnails] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: [],
    visibility: 'public',
    allowComments: true,
    allowRatings: true,
    scheduledDate: ''
  });

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleFileSelect = async (file) => {
    try {
      setSelectedFile(file);
      setCurrentStep(2);
      
      // Auto-generar título basado en el nombre del archivo
      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setFormData(prev => ({
        ...prev,
        title: prev.title || title
      }));

      // Generar thumbnails automáticamente
      const thumbnails = await generateThumbnail(file);
      setGeneratedThumbnails(thumbnails);
      if (thumbnails.length > 0) {
        setSelectedThumbnail(thumbnails[0]);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  const handleThumbnailSelect = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
  };

  const handleFormChange = (newFormData) => {
    setFormData(newFormData);
  };

  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedFile || !formData?.title || !formData?.category) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await uploadVideo(selectedFile, formData);
      
      if (result.success) {
        setUploadSuccess(result);
        setCurrentStep(3);
      } else {
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
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
  // RENDER HELPERS
  // ===============================

  const generateThumbnail = async (videoFile) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          const times = [0, video.duration * 0.33, video.duration * 0.66];
          const thumbnails = [];
          let currentIndex = 0;

          const captureThumbnail = () => {
            if (currentIndex >= times.length) {
              resolve(thumbnails);
              return;
            }

            video.currentTime = times[currentIndex];
            video.onseeked = () => {
              canvas.width = Math.min(video.videoWidth, 1920);
              canvas.height = Math.min(video.videoHeight, 1080);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              canvas.toBlob(blob => {
                thumbnails.push({
                  time: times[currentIndex],
                  blob: blob,
                  url: URL.createObjectURL(blob)
                });
                currentIndex++;
                captureThumbnail();
              }, 'image/jpeg', 0.8);
            };
          };

          captureThumbnail();
        };

        video.src = URL.createObjectURL(videoFile);
      });
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return [];
    }
  };

  // Progreso steps
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
        <meta name="keywords" content="subir video, contenido, creador, puntos, recompensas" />
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
                        <div>
                          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                            <video 
                              src={URL.createObjectURL(selectedFile)}
                              controls
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {selectedFile.name} • {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                        
                        {/* Thumbnails */}
                        {generatedThumbnails.length > 0 && (
                          <div>
                            <h4 className="font-medium text-foreground mb-3">Seleccionar miniatura</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {generatedThumbnails.map((thumb, index) => (
                                <div 
                                  key={index}
                                  className={`aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                                    selectedThumbnail?.time === thumb.time 
                                      ? 'border-primary ring-2 ring-primary/20' 
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                  onClick={() => handleThumbnailSelect(thumb)}
                                >
                                  <img 
                                    src={thumb.url} 
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
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
                      <VideoMetadataForm
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={handleFormSubmit}
                        isSubmitting={isSubmitting}
                      />
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
                      ¡Video publicado exitosamente!
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Tu video está ahora disponible para la comunidad
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon name="Award" size={20} color="var(--color-primary)" />
                          <span className="font-medium">Puntos ganados</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">+{uploadSuccess.pointsEarned}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon name="Eye" size={20} color="var(--color-muted-foreground)" />
                          <span className="font-medium">Visualizaciones</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">0</p>
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
                          <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                            <img 
                              src={video.thumbnail} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
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
                        Los videos educativos y de negocios ganan más puntos
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Clock" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Videos más largos generan más puntos por minuto
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Hash" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Usa tags relevantes para mayor visibilidad
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
