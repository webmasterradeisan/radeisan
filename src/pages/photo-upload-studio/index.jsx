// src/pages/photo-upload-studio/index.jsx
// Photo Upload Studio con integración real de Supabase
// RADEISAN - Sistema completo de upload de fotos
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import PhotoUploadZone from './components/PhotoUploadZone';
import PhotoPreview from './components/PhotoPreview';
import PhotoMetadataForm from './components/PhotoMetadataForm';

// ===============================
// CONFIGURACIONES Y CONSTANTES
// ===============================

const PHOTO_CATEGORIES = [
  { id: 'general', label: 'General', icon: 'Image' },
  { id: 'nature', label: 'Naturaleza', icon: 'TreePine' },
  { id: 'portrait', label: 'Retratos', icon: 'User' },
  { id: 'lifestyle', label: 'Estilo de vida', icon: 'Heart' },
  { id: 'travel', label: 'Viajes', icon: 'MapPin' },
  { id: 'food', label: 'Comida', icon: 'UtensilsCrossed' },
  { id: 'art', label: 'Arte', icon: 'Palette' },
  { id: 'technology', label: 'Tecnología', icon: 'Smartphone' },
  { id: 'sports', label: 'Deportes', icon: 'Trophy' },
  { id: 'animals', label: 'Animales', icon: 'Zap' },
  { id: 'architecture', label: 'Arquitectura', icon: 'Building' },
  { id: 'other', label: 'Otros', icon: 'MoreHorizontal' }
];

const ASPECT_RATIOS = [
  { id: 'square', label: 'Cuadrado (1:1)', aspect: 1, icon: 'Square' },
  { id: 'landscape', label: 'Horizontal (16:9)', aspect: 16/9, icon: 'RectangleHorizontal' },
  { id: 'portrait', label: 'Vertical (9:16)', aspect: 9/16, icon: 'RectangleVertical' },
  { id: 'original', label: 'Original', aspect: null, icon: 'Maximize' }
];

const UPLOAD_STEPS = [
  { number: 1, title: 'Subir fotos', description: 'Selecciona tus imágenes' },
  { number: 2, title: 'Editar', description: 'Ajusta y recorta las fotos' },
  { number: 3, title: 'Configurar', description: 'Añade información y metadatos' },
  { number: 4, title: 'Publicar', description: 'Revisa y publica tu contenido' }
];

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para subir fotos a Supabase
const usePhotoUpload = () => {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  // Validar archivo de imagen
  const validateImageFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      throw new Error(`Formato no soportado. Use: ${validTypes.join(', ')}`);
    }

    if (file.size > maxSizeBytes) {
      throw new Error('El archivo es demasiado grande. Máximo: 10MB');
    }

    return true;
  };

  // Procesar imagen con canvas
  const processImage = async (file, cropData, aspectRatio) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let { width, height } = img;
          let sx = 0, sy = 0, sw = width, sh = height;

          // Aplicar crop si existe
          if (cropData) {
            sx = cropData.x;
            sy = cropData.y;
            sw = cropData.width;
            sh = cropData.height;
          }

          // Calcular dimensiones finales
          let targetWidth = sw;
          let targetHeight = sh;

          // Aplicar aspect ratio si se especifica
          if (aspectRatio && aspectRatio !== null) {
            if (sw / sh > aspectRatio) {
              targetWidth = sh * aspectRatio;
            } else {
              targetHeight = sw / aspectRatio;
            }
          }

          // Limitar tamaño máximo manteniendo calidad
          const maxDimension = 1920;
          if (targetWidth > maxDimension || targetHeight > maxDimension) {
            const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
            targetWidth *= scale;
            targetHeight *= scale;
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Configurar calidad
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Dibujar imagen procesada
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

          // Convertir a blob
          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            0.9
          );
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Subir foto procesada
  const uploadPhoto = async (file, metadata, cropData, aspectRatio) => {
    try {
      setIsUploading(true);
      setUploadError(null);
      setCurrentFile(file.name);
      setUploadProgress(0);

      // Validar archivo
      validateImageFile(file);
      setUploadProgress(10);

      // Procesar imagen
      const processedBlob = await processImage(file, cropData, aspectRatio);
      setUploadProgress(30);

      // Generar nombres únicos
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `${user.id}/photo_${timestamp}_${random}.jpg`;
      const thumbnailName = `${user.id}/thumb_${timestamp}_${random}.jpg`;

      // Crear thumbnail
      const thumbnailBlob = await processImage(file, cropData, 1); // Thumbnail cuadrado
      setUploadProgress(50);

      // Subir imagen principal
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, processedBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      // Subir thumbnail
      const { data: thumbUploadData, error: thumbUploadError } = await supabase.storage
        .from('photos')
        .upload(thumbnailName, thumbnailBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (thumbUploadError) throw thumbUploadError;
      setUploadProgress(85);

      // Obtener URLs públicas
      const { data: imageUrl } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      const { data: thumbnailUrl } = supabase.storage
        .from('photos')
        .getPublicUrl(thumbnailName);

      // Guardar en base de datos
      const { data: photoData, error: dbError } = await supabase
        .from('photos')
        .insert({
          user_id: user.id,
          image_url: imageUrl.publicUrl,
          thumbnail_url: thumbnailUrl.publicUrl,
          caption: metadata.caption || '',
          aspect_ratio: aspectRatio ? Object.keys(ASPECT_RATIOS).find(k => ASPECT_RATIOS[k].aspect === aspectRatio) : 'original',
          original_width: file.width || null,
          original_height: file.height || null,
          crop_data: cropData || null,
          category: metadata.category || 'general',
          tags: metadata.tags || [],
          is_published: metadata.publish || true
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setUploadProgress(100);

      return {
        success: true,
        data: photoData,
        urls: {
          image: imageUrl.publicUrl,
          thumbnail: thumbnailUrl.publicUrl
        }
      };

    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsUploading(false);
      setCurrentFile(null);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  // Subir múltiples fotos
  const uploadMultiplePhotos = async (files, metadata, cropDataArray, aspectRatios) => {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const cropData = cropDataArray?.[i] || null;
      const aspectRatio = aspectRatios?.[i] || null;
      
      const result = await uploadPhoto(file, metadata, cropData, aspectRatio);
      results.push(result);
      
      if (!result.success) {
        break; // Detener en caso de error
      }
    }
    
    return results;
  };

  return {
    uploadPhoto,
    uploadMultiplePhotos,
    isUploading,
    uploadProgress,
    uploadError,
    currentFile,
    setUploadError
  };
};

// Hook para gestionar el estado del formulario
const usePhotoForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processedPhotos, setProcessedPhotos] = useState([]);
  const [metadata, setMetadata] = useState({
    caption: '',
    category: 'general',
    tags: [],
    publish: true
  });
  const [cropData, setCropData] = useState([]);
  const [aspectRatios, setAspectRatios] = useState([]);

  const addFiles = (files) => {
    const newFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setCurrentStep(2);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setCropData(prev => prev.filter((_, i) => i !== index));
    setAspectRatios(prev => prev.filter((_, i) => i !== index));
  };

  const updateCropData = (index, crop) => {
    setCropData(prev => {
      const newCropData = [...prev];
      newCropData[index] = crop;
      return newCropData;
    });
  };

  const updateAspectRatio = (index, ratio) => {
    setAspectRatios(prev => {
      const newRatios = [...prev];
      newRatios[index] = ratio;
      return newRatios;
    });
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedFiles([]);
    setProcessedPhotos([]);
    setMetadata({
      caption: '',
      category: 'general',
      tags: [],
      publish: true
    });
    setCropData([]);
    setAspectRatios([]);
  };

  return {
    currentStep,
    setCurrentStep,
    selectedFiles,
    processedPhotos,
    setProcessedPhotos,
    metadata,
    setMetadata,
    cropData,
    aspectRatios,
    addFiles,
    removeFile,
    updateCropData,
    updateAspectRatio,
    resetForm
  };
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const PhotoUploadStudio = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    uploadPhoto,
    uploadMultiplePhotos,
    isUploading,
    uploadProgress,
    uploadError,
    currentFile,
    setUploadError
  } = usePhotoUpload();

  const {
    currentStep,
    setCurrentStep,
    selectedFiles,
    processedPhotos,
    setProcessedPhotos,
    metadata,
    setMetadata,
    cropData,
    aspectRatios,
    addFiles,
    removeFile,
    updateCropData,
    updateAspectRatio,
    resetForm
  } = usePhotoForm();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStage, setUploadStage] = useState('uploading'); // 'uploading', 'processing', 'finalizing'

  // Verificar autenticación
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  // Manejar upload de múltiples fotos
  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;

    setShowUploadModal(true);
    setUploadStage('uploading');

    try {
      const results = await uploadMultiplePhotos(
        selectedFiles,
        metadata,
        cropData,
        aspectRatios
      );

      const successfulUploads = results.filter(r => r.success);
      
      if (successfulUploads.length > 0) {
        setUploadStage('finalizing');
        setProcessedPhotos(successfulUploads.map(r => r.data));
        
        setTimeout(() => {
          setShowUploadModal(false);
          setCurrentStep(4);
        }, 1500);
      } else {
        throw new Error('No se pudieron subir las fotos');
      }

    } catch (error) {
      setUploadError(error.message);
      setShowUploadModal(false);
    }
  };

  // Navegación entre pasos
  const nextStep = () => {
    if (currentStep < UPLOAD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Publicar fotos
  const handlePublish = () => {
    // Navegar al feed de fotos o perfil
    navigate('/photo-feed');
  };

  // Guardar como borrador
  const handleSaveDraft = async () => {
    const draftMetadata = { ...metadata, publish: false };
    await handleBatchUpload();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Subir Fotos - Photo Studio | RADEISAN</title>
        <meta name="description" content="Sube y comparte tus mejores fotos en RADEISAN" />
        <meta name="keywords" content="fotos, upload, compartir, galería, imágenes" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header del Studio */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    Photo Studio
                  </h1>
                  <p className="text-muted-foreground">
                    Comparte tus mejores momentos con la comunidad
                  </p>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">
                      {selectedFiles.length} foto{selectedFiles.length !== 1 ? 's' : ''} seleccionada{selectedFiles.length !== 1 ? 's' : ''}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetForm}
                    >
                      <Icon name="X" size={16} className="mr-2" />
                      Limpiar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Indicador de Pasos */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 overflow-x-auto pb-2">
                {UPLOAD_STEPS.map((step, index) => (
                  <div 
                    key={step.number}
                    className={`flex items-center space-x-3 min-w-0 ${
                      index < UPLOAD_STEPS.length - 1 ? 'flex-shrink-0' : ''
                    }`}
                  >
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                      ${currentStep >= step.number 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {currentStep > step.number ? (
                        <Icon name="Check" size={16} />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${
                        currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {index < UPLOAD_STEPS.length - 1 && (
                      <Icon 
                        name="ChevronRight" 
                        size={16} 
                        className="text-muted-foreground flex-shrink-0 mx-2" 
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contenido Principal */}
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Área Principal */}
              <div className="lg:col-span-2">
                {currentStep === 1 && (
                  <PhotoUploadZone 
                    onFilesSelected={addFiles}
                    multiple={true}
                    maxFiles={10}
                  />
                )}

                {currentStep === 2 && selectedFiles.length > 0 && (
                  <PhotoPreview
                    files={selectedFiles}
                    cropData={cropData}
                    aspectRatios={aspectRatios}
                    onRemoveFile={removeFile}
                    onCropChange={updateCropData}
                    onAspectRatioChange={updateAspectRatio}
                    onNext={nextStep}
                  />
                )}

                {currentStep === 3 && (
                  <PhotoMetadataForm
                    metadata={metadata}
                    onChange={setMetadata}
                    categories={PHOTO_CATEGORIES}
                    onSaveDraft={handleSaveDraft}
                    onPublish={handleBatchUpload}
                    loading={isUploading}
                  />
                )}

                {currentStep === 4 && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icon name="Check" size={32} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      ¡Fotos publicadas exitosamente!
                    </h2>
                    <p className="text-muted-foreground mb-8">
                      Tus {processedPhotos.length} foto{processedPhotos.length !== 1 ? 's han' : ' ha'} sido publicada{processedPhotos.length !== 1 ? 's' : ''} en tu perfil
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button onClick={handlePublish}>
                        <Icon name="Eye" size={16} className="mr-2" />
                        Ver en Feed
                      </Button>
                      <Button variant="outline" onClick={resetForm}>
                        <Icon name="Plus" size={16} className="mr-2" />
                        Subir Más Fotos
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Lateral */}
              <div className="space-y-6">
                
                {/* Tips de Upload */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center">
                    <Icon name="Lightbulb" size={20} className="mr-2 text-yellow-500" />
                    Tips para mejores fotos
                  </h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start space-x-2">
                      <Icon name="Camera" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Usa buena iluminación natural siempre que sea posible</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Crop" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Experimenta con diferentes encuadres y composiciones</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="Hash" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Añade tags relevantes para mayor alcance</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Icon name="FileImage" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Formatos soportados: JPG, PNG, WEBP</span>
                    </div>
                  </div>
                </div>

                {/* Estadísticas de Usuario */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Tu actividad
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Fotos publicadas</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total de likes</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Visualizaciones</span>
                      <span className="font-medium">--</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Footer */}
            {currentStep > 1 && currentStep < 4 && (
              <div className="flex items-center justify-between py-8 border-t mt-8">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={isUploading}
                >
                  <Icon name="ChevronLeft" size={16} className="mr-2" />
                  Anterior
                </Button>
                
                {currentStep === 3 ? (
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={handleSaveDraft}
                      disabled={isUploading}
                    >
                      <Icon name="Save" size={16} className="mr-2" />
                      Guardar Borrador
                    </Button>
                    <Button 
                      onClick={handleBatchUpload}
                      disabled={isUploading}
                    >
                      <Icon name="Upload" size={16} className="mr-2" />
                      Publicar Fotos
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={nextStep}
                    disabled={isUploading || (currentStep === 2 && selectedFiles.length === 0)}
                  >
                    Siguiente
                    <Icon name="ChevronRight" size={16} className="ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Upload" size={32} className="text-primary" />
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {uploadStage === 'uploading' && 'Subiendo fotos...'}
                {uploadStage === 'processing' && 'Procesando imágenes...'}
                {uploadStage === 'finalizing' && 'Finalizando...'}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-6">
                {currentFile && `Procesando: ${currentFile}`}
              </p>

              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {Math.round(uploadProgress)}% completado
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {uploadError && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-destructive text-destructive-foreground rounded-lg border p-4 max-w-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={20} />
                <span className="font-medium">Error al subir</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setUploadError(null)}
              >
                <Icon name="X" size={16} />
              </Button>
            </div>
            <p className="text-sm mt-1">{uploadError}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoUploadStudio;
