// src/pages/photo-upload-studio/index.jsx
// Photo Upload Studio con componentes mock temporales (preparado para build)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
// import PhotoUploadZone from './components/PhotoUploadZone'; // TODO: Crear este componente
// import PhotoPreview from './components/PhotoPreview'; // TODO: Crear este componente
// import PhotoMetadataForm from './components/PhotoMetadataForm'; // TODO: Crear este componente

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
// COMPONENTES MOCK TEMPORALES
// ===============================

// TODO: Reemplazar con PhotoUploadZone real
const PhotoUploadZoneMock = ({ onFilesSelected, multiple = true, maxFiles = 10 }) => {
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200">
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-muted text-muted-foreground flex items-center justify-center">
          <Icon name="ImagePlus" size={32} />
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Sube tus fotos
        </h3>
        <p className="text-muted-foreground">
          {multiple 
            ? `Arrastra y suelta hasta ${maxFiles} fotos, o haz clic para seleccionar`
            : 'Arrastra y suelta una foto, o haz clic para seleccionar'
          }
        </p>
      </div>

      <input
        type="file"
        multiple={multiple}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        id="photo-upload-input"
      />
      
      <Button onClick={() => document.getElementById('photo-upload-input')?.click()}>
        <Icon name="FolderOpen" size={16} className="mr-2" />
        Seleccionar Fotos
      </Button>

      <div className="mt-6 text-sm text-muted-foreground space-y-1">
        <p>Formatos soportados: JPG, PNG, WEBP</p>
        <p>Tamaño máximo: 10MB por foto</p>
        {multiple && <p>Hasta {maxFiles} fotos por vez</p>}
      </div>
    </div>
  );
};

// TODO: Reemplazar con PhotoPreview real
const PhotoPreviewMock = ({ 
  files, 
  onRemoveFile, 
  onNext 
}) => {
  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="ImageOff" size={48} className="text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay fotos para editar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Editar Fotos
          </h2>
          <p className="text-sm text-muted-foreground">
            Ajusta el recorte y formato de tus {files.length} foto{files.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {files.map((file, index) => (
          <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            <img
              src={URL.createObjectURL(file)}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0"
              onClick={() => onRemoveFile(index)}
            >
              <Icon name="X" size={14} />
            </Button>
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {file.name}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{files.length}</p>
              <p className="text-xs text-muted-foreground">Fotos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {(files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(1)}MB
              </p>
              <p className="text-xs text-muted-foreground">Tamaño total</p>
            </div>
          </div>
          
          <Button onClick={onNext}>
            <Icon name="ArrowRight" size={16} className="mr-2" />
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
};

// TODO: Reemplazar con PhotoMetadataForm real
const PhotoMetadataFormMock = ({ 
  metadata = {}, 
  onChange, 
  categories = PHOTO_CATEGORIES,
  onSaveDraft,
  onPublish,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    caption: metadata.caption || '',
    category: metadata.category || 'general',
    tags: metadata.tags || [],
    publish: metadata.publish !== false
  });

  const [currentTag, setCurrentTag] = useState('');

  const updateFormData = (updates) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onChange?.(newData);
  };

  const addTag = () => {
    const cleanTag = currentTag.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (cleanTag && !formData.tags.includes(cleanTag) && formData.tags.length < 10) {
      updateFormData({ tags: [...formData.tags, cleanTag] });
    }
    setCurrentTag('');
  };

  const removeTag = (tagToRemove) => {
    updateFormData({ 
      tags: formData.tags.filter(tag => tag !== tagToRemove) 
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Información de las fotos
        </h2>
        <p className="text-sm text-muted-foreground">
          Añade información para que más personas puedan descubrir tus fotos
        </p>
      </div>

      <div className="space-y-6">
        {/* Descripción */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Descripción
          </label>
          <textarea
            placeholder="Cuenta la historia detrás de tus fotos..."
            value={formData.caption}
            onChange={(e) => updateFormData({ caption: e.target.value })}
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Una buena descripción ayuda a que más personas encuentren tus fotos
            </p>
            <span className="text-xs text-muted-foreground">
              {formData.caption.length}/1000
            </span>
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Categoría
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category.id}
                onClick={() => updateFormData({ category: category.id })}
                className={`
                  p-3 rounded-lg border text-left transition-all hover:border-primary/50
                  ${formData.category === category.id 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <Icon name={category.icon} size={16} />
                  <span className="font-medium text-sm">{category.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Tags
          </label>
          
          <div className="flex items-center space-x-2 mb-3">
            <input
              type="text"
              placeholder="Añadir tag..."
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
              maxLength={30}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={addTag}
              disabled={!currentTag.trim()}
            >
              <Icon name="Plus" size={16} />
            </Button>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-destructive"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="text-sm text-muted-foreground">
          Las fotos se optimizarán automáticamente
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={onSaveDraft}
            disabled={loading}
          >
            <Icon name="Save" size={16} className="mr-2" />
            Guardar Borrador
          </Button>
          <Button 
            onClick={onPublish}
            disabled={loading || !formData.category}
          >
            {loading ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Icon name="Upload" size={16} className="mr-2" />
                Publicar Fotos
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ===============================
// HOOK PARA GESTIONAR FORMULARIO
// ===============================

const usePhotoForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    caption: '',
    category: 'general',
    tags: [],
    publish: true
  });

  const addFiles = (files) => {
    const newFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setCurrentStep(2);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedFiles([]);
    setMetadata({
      caption: '',
      category: 'general',
      tags: [],
      publish: true
    });
  };

  return {
    currentStep,
    setCurrentStep,
    selectedFiles,
    metadata,
    setMetadata,
    addFiles,
    removeFile,
    resetForm
  };
};

// ===============================
// HOOK PARA UPLOAD (MOCK)
// ===============================

const usePhotoUploadMock = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const uploadMultiplePhotos = async (files, metadata) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Simular upload
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Mock success
      return files.map(() => ({ success: true }));
      
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
    metadata,
    setMetadata,
    addFiles,
    removeFile,
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
      const results = await uploadMultiplePhotos(selectedFiles, metadata);
      
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
                  <PhotoUploadZoneMock 
                    onFilesSelected={addFiles}
                    multiple={true}
                    maxFiles={10}
                  />
                )}

                {currentStep === 2 && selectedFiles.length > 0 && (
                  <PhotoPreviewMock
                    files={selectedFiles}
                    onRemoveFile={removeFile}
                    onNext={nextStep}
                  />
                )}

                {currentStep === 3 && (
                  <PhotoMetadataFormMock
                    metadata={metadata}
                    onChange={setMetadata}
                    categories={PHOTO_CATEGORIES}
                    onSaveDraft={() => handleBatchUpload()}
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
                      Tus {selectedFiles.length} foto{selectedFiles.length !== 1 ? 's han' : ' ha'} sido publicada{selectedFiles.length !== 1 ? 's' : ''} en tu perfil
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button onClick={handlePublish}>
                        <Icon name="Eye" size={16} className="mr-2" />
                        Ver en Perfil
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

                {/* Nota sobre funcionalidad */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-6">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center">
                    <Icon name="Info" size={20} className="mr-2 text-blue-500" />
                    Sistema en desarrollo
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Esta es una versión demo del sistema de fotos.</p>
                    <p>Próximamente tendrás:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Recorte y edición avanzada</li>
                      <li>Filtros y efectos</li>
                      <li>Feed público de fotos</li>
                      <li>Sistema de likes y comentarios</li>
                    </ul>
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
                  <Button 
                    onClick={handleBatchUpload}
                    disabled={isUploading}
                  >
                    <Icon name="Upload" size={16} className="mr-2" />
                    Publicar Fotos
                  </Button>
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
                Subiendo fotos...
              </h3>
              
              <p className="text-sm text-muted-foreground mb-6">
                Procesando tus imágenes
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
