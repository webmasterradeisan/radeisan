// src/pages/photo-upload-studio/index.jsx
// Photo Upload Studio con componentes reales integrados
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

const UPLOAD_STEPS = [
  { number: 1, title: 'Subir fotos', description: 'Selecciona tus imágenes' },
  { number: 2, title: 'Editar', description: 'Ajusta y recorta las fotos' },
  { number: 3, title: 'Configurar', description: 'Añade información y metadatos' },
  { number: 4, title: 'Publicar', description: 'Revisa y publica tu contenido' }
];

// ===============================
// HOOK PARA GESTIONAR FORMULARIO
// ===============================

const usePhotoForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [cropData, setCropData] = useState({});
  const [aspectRatios, setAspectRatios] = useState({});
  const [metadata, setMetadata] = useState({
    caption: '',
    tags: [],
    category: 'general',
    privacy: 'public',
    location: '',
    allowComments: true,
    allowDownloads: false
  });

  // Añadir archivos
  const addFiles = useCallback((files) => {
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    
    // Inicializar crop data para nuevos archivos
    const newCropData = { ...cropData };
    const newAspectRatios = { ...aspectRatios };
    
    files.forEach((_, index) => {
      const fileIndex = selectedFiles.length + index;
      newCropData[fileIndex] = null;
      newAspectRatios[fileIndex] = 'original';
    });
    
    setCropData(newCropData);
    setAspectRatios(newAspectRatios);
  }, [selectedFiles, cropData, aspectRatios]);

  // Remover archivo
  const removeFile = useCallback((index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    // Actualizar índices de crop data
    const newCropData = {};
    const newAspectRatios = {};
    
    newFiles.forEach((_, i) => {
      const oldIndex = selectedFiles.findIndex((file, originalIndex) => 
        originalIndex < index ? originalIndex === i : originalIndex === i + 1
      );
      if (cropData[oldIndex] !== undefined) {
        newCropData[i] = cropData[oldIndex];
        newAspectRatios[i] = aspectRatios[oldIndex];
      }
    });
    
    setCropData(newCropData);
    setAspectRatios(newAspectRatios);
  }, [selectedFiles, cropData, aspectRatios]);

  // Actualizar crop data
  const updateCropData = useCallback((index, data) => {
    setCropData(prev => ({ ...prev, [index]: data }));
  }, []);

  // Actualizar aspect ratio
  const updateAspectRatio = useCallback((index, ratio) => {
    setAspectRatios(prev => ({ ...prev, [index]: ratio }));
  }, []);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setSelectedFiles([]);
    setCropData({});
    setAspectRatios({});
    setMetadata({
      caption: '',
      tags: [],
      category: 'general',
      privacy: 'public',
      location: '',
      allowComments: true,
      allowDownloads: false
    });
  }, []);

  return {
    currentStep,
    setCurrentStep,
    selectedFiles,
    cropData,
    aspectRatios,
    metadata,
    setMetadata,
    addFiles,
    removeFile,
    updateCropData,
    updateAspectRatio,
    resetForm
  };
};

// ===============================
// MOCK HOOK PARA UPLOAD (TEMPORAL)
// ===============================

const usePhotoUploadMock = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const uploadMultiplePhotos = async (files, metadata, cropData, aspectRatios) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Simular procesamiento de cada archivo
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Mock success - simular respuesta exitosa
      const results = files.map((file, index) => ({
        success: true,
        id: `photo_${Date.now()}_${index}`,
        file_name: file.name,
        crop_applied: cropData[index] !== null,
        aspect_ratio: aspectRatios[index],
        size: file.size
      }));
      
      return results;
      
    } catch (error) {
      setUploadError(error.message);
      return [];
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return {
    uploadMultiplePhotos,
    isUploading,
    uploadProgress,
    uploadError,
    setUploadError
  };
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const PhotoUploadStudio = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    uploadMultiplePhotos,
    isUploading,
    uploadProgress,
    uploadError,
    setUploadError
  } = usePhotoUploadMock();

  const {
    currentStep,
    setCurrentStep,
    selectedFiles,
    cropData,
    aspectRatios,
    metadata,
    setMetadata,
    addFiles,
    removeFile,
    updateCropData,
    updateAspectRatio,
    resetForm
  } = usePhotoForm();

  const [showUploadModal, setShowUploadModal] = useState(false);

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

    try {
      const results = await uploadMultiplePhotos(selectedFiles, metadata, cropData, aspectRatios);
      
      const successfulUploads = results.filter(r => r.success);
      
      if (successfulUploads.length > 0) {
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
    navigate('/profile');
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
                      <Icon name="RotateCcw" size={16} className="mr-2" />
                      Reiniciar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {UPLOAD_STEPS.map((step, index) => (
                  <React.Fragment key={step.number}>
                    <div className={`flex items-center ${
                      currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center mr-3 transition-all
                        ${currentStep > step.number 
                          ? 'bg-primary text-primary-foreground' 
                          : currentStep === step.number 
                            ? 'bg-primary/10 text-primary border-2 border-primary' 
                            : 'bg-muted text-muted-foreground'
                        }
                      `}>
                        <Icon 
                          name={currentStep > step.number ? 'Check' : 'Circle'} 
                          size={20} 
                        />
                      </div>
                      <div className="hidden sm:block">
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    {index < UPLOAD_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        currentStep > step.number ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Contenido Principal */}
            <div className="bg-card rounded-lg border shadow-sm">
              <div className="p-6">
                
                {/* PASO 1: Upload de Fotos */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <PhotoUploadZone
                      onFilesSelected={addFiles}
                      multiple={true}
                      maxFiles={10}
                    />
                    
                    {selectedFiles.length > 0 && (
                      <div className="flex justify-end space-x-3">
                        <Button onClick={nextStep}>
                          <Icon name="ArrowRight" size={16} className="mr-2" />
                          Continuar ({selectedFiles.length} fotos)
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* PASO 2: Edición de Fotos */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <PhotoPreview
                      files={selectedFiles}
                      cropData={cropData}
                      aspectRatios={aspectRatios}
                      onCropChange={updateCropData}
                      onAspectRatioChange={updateAspectRatio}
                      onRemoveFile={removeFile}
                    />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={prevStep}>
                        <Icon name="ArrowLeft" size={16} className="mr-2" />
                        Anterior
                      </Button>
                      <Button onClick={nextStep}>
                        <Icon name="ArrowRight" size={16} className="mr-2" />
                        Configurar metadatos
                      </Button>
                    </div>
                  </div>
                )}

                {/* PASO 3: Metadatos */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <PhotoMetadataForm
                      metadata={metadata}
                      onChange={setMetadata}
                      categories={PHOTO_CATEGORIES}
                      onSaveDraft={() => console.log('Guardar borrador')}
                      onPublish={handleBatchUpload}
                      loading={isUploading}
                    />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={prevStep}>
                        <Icon name="ArrowLeft" size={16} className="mr-2" />
                        Anterior
                      </Button>
                    </div>
                  </div>
                )}

                {/* PASO 4: Confirmación */}
                {currentStep === 4 && (
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                      <Icon name="CheckCircle" size={40} className="text-green-500" />
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        ¡Fotos publicadas exitosamente!
                      </h2>
                      <p className="text-muted-foreground">
                        Tus {selectedFiles.length} fotos han sido subidas y están disponibles en tu perfil
                      </p>
                    </div>

                    <div className="flex justify-center space-x-4">
                      <Button onClick={handlePublish}>
                        <Icon name="User" size={16} className="mr-2" />
                        Ver en mi perfil
                      </Button>
                      <Button variant="outline" onClick={resetForm}>
                        <Icon name="Plus" size={16} className="mr-2" />
                        Subir más fotos
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Upload" size={32} className="text-primary" />
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Subiendo fotos...
              </h3>
              
              <p className="text-sm text-muted-foreground mb-6">
                Procesando y optimizando tus {selectedFiles.length} imágenes
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
              
              {uploadProgress > 50 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Aplicando recortes y optimizaciones...
                </p>
              )}
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
