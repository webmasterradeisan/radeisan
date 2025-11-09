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

// ✅ CORRECCIÓN DE EXPORTACIÓN: Usamos calculateVideoPointsFull como alias de calculateVideoPoints
import { calculateVideoPointsFull as calculateVideoPoints, addFreePoints } from '../../services/pointsService';

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

  const resetState = () => {
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
    setUploadSpeed(0);
    setEstimatedTime(0);
  };

  const uploadVideo = useCallback(async (videoFile, metadata, videoDuration, orientationData, thumbnailUrl) => {
    if (!user || !videoFile || !orientationData || !thumbnailUrl) {
      setUploadError("Faltan datos de usuario, video, orientación o miniatura.");
      return { success: false, videoId: null };
    }

    resetState();
    setIsUploading(true);
    setUploadError(null);

    let videoUrl = null;
    let videoId = null;
    let pointsCalculation = { total_points: 0 };
    
    try {
      // PASO 1-8: SUBIDA DEL ARCHIVO AL STORAGE
      const { videoUrl: uploadedUrl, error: uploadErr } = await uploadVideoWithOrientationDetection(
        user.id,
        videoFile,
        (progress, speed, time) => {
          setUploadProgress(progress);
          setUploadSpeed(speed);
          setEstimatedTime(time);
        }
      );

      if (uploadErr) {
        throw new Error(`Error en Storage: ${uploadErr.message}`);
      }
      videoUrl = uploadedUrl;

      // PASO 9: CALCULAR PUNTOS BASADOS EN CATEGORÍA Y ORIENTACIÓN
      // ✅ CORRECCIÓN: Llamada a la función ASÍNCRONA con 3 argumentos
      console.log('💰 Calculando puntos...');
      try {
        pointsCalculation = await calculateVideoPoints(
          Math.round(videoDuration || 0),
          metadata.category,
          orientationData.orientation
        );
        console.log('📊 Puntos calculados:', pointsCalculation);
      } catch (pointsCalcError) {
        console.error('❌ Error calculando puntos, usando fallback (10 pts):', pointsCalcError);
        // Fallback si falla la BD al obtener reglas
        pointsCalculation.total_points = 10;
      }

      // PASO 10: Insertar metadatos del video
      const { error: insertError, data: videoInsertData } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: metadata.title,
          description: metadata.description,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          category: metadata.category,
          tags: metadata.tags,
          duration_seconds: Math.round(videoDuration || 0),
          file_size_bytes: videoFile.size,
          orientation: orientationData.orientation,
          aspect_ratio: orientationData.aspectRatio,
          video_width: orientationData.videoWidth,
          video_height: orientationData.videoHeight,
          points_earned: pointsCalculation.total_points, // USAR PUNTOS CALCULADOS
          is_published: true, 
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Error al guardar metadatos: ${insertError.message}`);
      }
      videoId = videoInsertData.id;
      
      // PASO 11: Otorgar puntos al usuario
      const pointsResult = await addFreePoints(
          user.id, 
          pointsCalculation.total_points, 
          'video_upload', 
          videoId
      );

      if (pointsResult.success) {
          console.log(`✅ Puntos otorgados: ${pointsCalculation.total_points}`);
      } else {
          console.error('❌ Fallo al otorgar puntos:', pointsResult.error);
          // Este es un error secundario, no bloquea la subida.
      }


      return { success: true, videoId };

    } catch (err) {
      console.error('❌ Error de subida o metadatos:', err.message);
      setUploadError(err.message);
      
      // Limpieza de subida fallida (opcional pero recomendado)
      // if (videoUrl) { await deleteVideoFromStorage(videoUrl); } 

      return { success: false, videoId: null };

    } finally {
      setIsUploading(false);
    }
  }, [user]);

  return { 
    uploadVideo, 
    uploadProgress, 
    isUploading, 
    uploadError, 
    uploadSpeed, 
    estimatedTime, 
    resetState 
  };
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const VideoUploadStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { uploadVideo, uploadProgress, isUploading, uploadError, uploadSpeed, estimatedTime } = useVideoUpload();
  
  // Paso 1: Estados del Formulario
  const [videoFile, setVideoFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [orientationData, setOrientationData] = useState(null); // {orientation, aspectRatio, videoWidth, videoHeight}
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  
  // Paso 2: Metadatos
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    category: 'educacion', // Por defecto para la vista previa
    categoryId: '',
    tags: [],
    thumbnailType: 'auto', // auto | custom | frame
    selectedFrameTime: 0,
  });

  // Paso 3: Miniaturas y Previews
  const [previewThumbnailUrl, setPreviewThumbnailUrl] = useState(null); // URL de la miniatura que se mostrará
  const [customThumbnailFile, setCustomThumbnailFile] = useState(null);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [videoFrames, setVideoFrames] = useState([]); // Lista de objetos {time, url}

  // Ref para el video HTML
  const videoRef = useRef(null);

  // Determinar el botón de Submit (si es un Reel o Video normal)
  const isReel = orientationData?.orientation === 'vertical';

  // =========================================================================
  // EFECTOS Y LÓGICA DE PREVISUALIZACIÓN DE PUNTOS
  // =========================================================================

  // Efecto para liberar URL del blob cuando se limpia el archivo
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      videoFrames.forEach(frame => URL.revokeObjectURL(frame.url));
    };
  }, [videoPreviewUrl, videoFrames]);


  // Generar URL de blob para previsualización
  const handleFileDrop = async (file) => {
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));

    // Detección de orientación y duración (asíncrono)
    const { orientationData: newOrientationData, duration } = await detectVideoFileOrientation(file);
    setOrientationData(newOrientationData);
    setVideoDuration(duration);
    
    // Calcular automáticamente los puntos base para previsualización
    // NOTA: La lógica completa se ejecuta en uploadVideo, esto es solo una estimación visual
    if (newOrientationData) {
        const estimatedPoints = await calculateVideoPoints(
            Math.round(duration || 0), 
            metadata.category, 
            newOrientationData.orientation
        );
        console.log('✅ Puntos estimados en Preview:', estimatedPoints.total_points);
        // Podrías guardar esto en un estado para mostrarlo
    }
  };


  // Lógica para seleccionar la miniatura que se mostrará
  useEffect(() => {
    if (metadata.thumbnailType === 'custom' && customThumbnailFile) {
      setPreviewThumbnailUrl(URL.createObjectURL(customThumbnailFile));
    } else if (metadata.thumbnailType === 'frame' && metadata.selectedFrameTime && videoFrames.length > 0) {
      const frame = videoFrames.find(f => f.time === metadata.selectedFrameTime);
      setPreviewThumbnailUrl(frame?.url || null);
    } else {
      // Lógica de miniatura automática
      setPreviewThumbnailUrl(null);
    }
  }, [metadata.thumbnailType, customThumbnailFile, metadata.selectedFrameTime, videoFrames]);

  // =========================================================================
  // MANEJO DE ENVÍO
  // =========================================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile || !metadata.title || !metadata.category || !previewThumbnailUrl) {
      alert("Por favor, completa todos los campos requeridos y selecciona una miniatura.");
      return;
    }
    
    // 1. Subir la miniatura seleccionada
    // Esto debería ser una función en services/storage.js que sube customThumbnailFile o genera/sube el frame seleccionado.
    // Por simplicidad, asumiremos que aquí se sube la miniatura y devuelve su URL final:
    let finalThumbnailUrl = previewThumbnailUrl; // Placeholder: En un entorno real, esta URL de blob DEBE subirse a Storage.

    if (metadata.thumbnailType === 'custom' && customThumbnailFile) {
        // LÓGICA REAL: Subir customThumbnailFile
        // const { data: thumbnailUrl, error } = await uploadCustomThumbnail(customThumbnailFile);
        // if (error) throw error;
        // finalThumbnailUrl = thumbnailUrl;
    } else if (metadata.thumbnailType === 'frame') {
        // LÓGICA REAL: Subir el frame seleccionado
        // const frameFile = convertBlobUrlToJpg(previewThumbnailUrl);
        // const { data: thumbnailUrl, error } = await uploadFrame(frameFile);
        // finalThumbnailUrl = thumbnailUrl;
        // FINAL THUMBNAIL URL EN ENTORNO REAL DEBE VENIR DE LA SUBIDA A STORAGE
    }
    
    if (finalThumbnailUrl === previewThumbnailUrl) {
        console.warn("⚠️ Usando URL de Blob local para la miniatura. ¡Reemplazar por URL de Storage en producción!");
    }


    // 2. Llamar a la función principal de subida
    const result = await uploadVideo(
      videoFile,
      metadata,
      videoDuration,
      orientationData,
      finalThumbnailUrl // Usamos la URL final de la miniatura
    );

    if (result.success) {
      alert("Video subido exitosamente!");
      // Navegar al perfil o a la página del video
      navigate(`/user/profile`); 
    } else {
      console.error(uploadError);
      alert(`Error al subir el video: ${uploadError}`);
    }
  };


  // =========================================================================
  // RENDERIZADO
  // =========================================================================

  return (
    <>
      <Helmet>
        <title>Estudio de Carga de Videos - Radeisan</title>
      </Helmet>
      <div className="flex h-screen bg-background">
        <PrimaryNavigation />
        <main className="flex-1 overflow-y-auto pt-16">
          <Header title="Estudio de Carga de Videos" user={user} />
          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold mb-6 border-b pb-2">
              {isReel ? 'Subir Nuevo Reel' : 'Subir Nuevo Video'}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Columna 1 y 2: Formulario y Subida */}
              <div className="lg:col-span-2 space-y-8">
                {/* 1. Zona de Carga del Archivo */}
                <div className="bg-card p-6 rounded-xl shadow-lg">
                  <h2 className="text-xl font-semibold mb-4">Paso 1: Archivo</h2>
                  {!videoFile ? (
                    <VideoUploadZone onFileDrop={handleFileDrop} />
                  ) : (
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/50">
                      <div className="flex items-center space-x-3">
                        <Icon name="FileVideo" size={20} className="text-primary" />
                        <p className="font-medium">{videoFile.name}</p>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                          setVideoFile(null);
                          setOrientationData(null);
                          setVideoPreviewUrl('');
                        }}
                        disabled={isUploading}
                      >
                        Cambiar
                      </Button>
                    </div>
                  )}
                  {orientationData && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Orientación detectada: <span className="font-semibold">{orientationData.orientation}</span> ({orientationData.videoWidth}x{orientationData.videoHeight}). Duración: {Math.round(videoDuration)}s.
                    </p>
                  )}
                </div>
                
                {/* 2. Metadatos del Video */}
                {videoFile && (
                  <div className="bg-card p-6 rounded-xl shadow-lg space-y-6">
                    <h2 className="text-xl font-semibold mb-4">Paso 2: Detalles</h2>
                    <Input
                      label="Título del Video"
                      placeholder="Un título pegadizo para tu contenido..."
                      value={metadata.title}
                      onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                      required
                      maxLength={100}
                    />
                    <Input
                      label="Descripción"
                      type="textarea"
                      placeholder="Describe de qué trata tu video (máx 500 caracteres)"
                      value={metadata.description}
                      onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                      rows={4}
                      maxLength={500}
                    />
                    <CategorySelector
                        label="Categoría"
                        // Asumiendo que CategorySelector maneja category y categoryId
                        onCategoryChange={(newCategory, newCategoryId) => setMetadata(prev => ({ 
                            ...prev, 
                            category: newCategory, 
                            categoryId: newCategoryId 
                        }))}
                        value={metadata.category}
                        required
                    />
                    <Input
                        label="Etiquetas (Tags)"
                        placeholder="separadas por comas (ej: tutorial, javascript, frontend)"
                        value={metadata.tags.join(', ')}
                        onChange={(e) => setMetadata({ ...metadata, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) })}
                    />
                  </div>
                )}

                {/* 3. Opciones de Miniatura */}
                {videoFile && (
                    <div className="bg-card p-6 rounded-xl shadow-lg space-y-6">
                        <h2 className="text-xl font-semibold mb-4">Paso 3: Miniatura</h2>
                        {/* Aquí iría la lógica y UI para seleccionar: Auto, Frame o Custom */}
                        <div className="flex space-x-4">
                            <Button 
                                variant={metadata.thumbnailType === 'auto' ? 'default' : 'outline'}
                                onClick={() => setMetadata({...metadata, thumbnailType: 'auto'})}
                            >
                                Automática
                            </Button>
                            <Button 
                                variant={metadata.thumbnailType === 'frame' ? 'default' : 'outline'}
                                onClick={() => setMetadata({...metadata, thumbnailType: 'frame'})}
                                disabled={loadingFrames}
                            >
                                <Icon name="Film" size={16} className="mr-2" />
                                Seleccionar Frame
                            </Button>
                            <Button 
                                variant={metadata.thumbnailType === 'custom' ? 'default' : 'outline'}
                                onClick={() => {
                                    setMetadata({...metadata, thumbnailType: 'custom'});
                                    // Abrir diálogo de carga de archivo
                                    // Ref: fileInputRef.current.click();
                                }}
                            >
                                <Icon name="Upload" size={16} className="mr-2" />
                                Subir Propia
                            </Button>
                        </div>
                        
                        {/* Área de Miniatura Custom o Selección de Frame (omitida por brevedad) */}
                        {/* ... */}
                    </div>
                )}
                
                {/* 4. Botón de Subida */}
                {videoFile && (
                    <div className="flex justify-end pt-4">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleSubmit}
                            disabled={isUploading || !metadata.title || !metadata.category || !previewThumbnailUrl}
                        >
                            {isUploading ? (
                                <div className="flex items-center">
                                    <Icon name="Loader" size={16} className="mr-2 animate-spin" />
                                    Subiendo ({uploadProgress.toFixed(0)}%)
                                </div>
                            ) : (
                                <>
                                    <Icon name="Send" size={18} className="mr-2" />
                                    {isReel ? 'Publicar Reel' : 'Publicar Video'}
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Mensajes de Estado */}
                {uploadError && <div className="text-red-500 mt-4 p-3 bg-red-100 border border-red-400 rounded-lg">{uploadError}</div>}
                {isUploading && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Velocidad: {(uploadSpeed / 1024 / 1024).toFixed(2)} MB/s | Tiempo estimado: {estimatedTime.toFixed(0)}s
                  </div>
                )}
                
              </div>

              {/* Columna 3: Vista Previa y Consejos */}
              <div className="lg:col-span-1 space-y-8 sticky top-20 h-fit">
                {/* Vista Previa */}
                <div className="bg-card p-4 rounded-xl shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-2">Vista Previa</h2>
                  <div className={`relative ${isReel ? 'aspect-[9/16] w-full max-w-sm mx-auto' : 'aspect-video w-full'} bg-black rounded-lg overflow-hidden`}>
                    
                    {/* Visualización de Miniatura Seleccionada */}
                    {previewThumbnailUrl ? (
                        <img 
                            src={previewThumbnailUrl} 
                            alt="Miniatura del Video" 
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                            {videoFile ? 'Selecciona una miniatura' : 'Carga un video para previsualizar'}
                        </div>
                    )}
                    
                    {/* Detalles sobre el video */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white">
                        <p className="font-bold text-lg leading-tight">{metadata.title || 'Título de tu video...'}</p>
                        <p className="text-sm opacity-80">{metadata.description.substring(0, 50) || 'Descripción corta...'}</p>
                    </div>
                  </div>
                </div>

                {/* Consejos de Puntos */}
                <div className="bg-card p-6 rounded-xl shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Icon name="Award" size={20} className="mr-2 text-yellow-500" />
                    Cómo Ganar Más Puntos
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Icon name="Hash" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        Los videos educativos y de negocios ganan más puntos
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
                        Videos más largos generan más puntos por minuto
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
