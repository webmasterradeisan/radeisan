// src/components/ProfileImageEditor.jsx
// Editor completo de imágenes de perfil y portada para RADEISAN
// VERSIÓN CORREGIDA - Soluciona problema del recorte
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Icon from './AppIcon';
import Button from './ui/Button';
import 'react-image-crop/dist/ReactCrop.css';

// ===============================
// CONFIGURACIONES DE IMAGEN
// ===============================

const IMAGE_CONFIGS = {
  avatar: {
    aspect: 1,
    shape: 'circle',
    dimensions: { width: 400, height: 400 },
    quality: 0.9,
    maxSizeMB: 2,
    label: 'Imagen de Perfil',
    description: 'Se mostrará como un círculo. Recorta para centrar tu rostro.',
    bucketName: 'avatars'
  },
  cover: {
    aspect: 21 / 9, // Ratio más moderno que 16:9
    shape: 'rectangle',
    dimensions: { width: 1920, height: 823 },
    quality: 0.8,
    maxSizeMB: 5,
    label: 'Imagen de Portada',
    description: 'Se mostrará en la parte superior de tu perfil.',
    bucketName: 'covers'
  }
};

// ===============================
// UTILIDADES DE CANVAS
// ===============================

// Validar que el crop tenga valores válidos
const validateCrop = (crop) => {
  return crop && 
         typeof crop.x === 'number' && 
         typeof crop.y === 'number' && 
         typeof crop.width === 'number' && 
         typeof crop.height === 'number' &&
         crop.width > 0 && 
         crop.height > 0;
};

// Generar canvas con la imagen recortada (MEJORADO)
const getCroppedCanvas = (image, pixelCrop, targetWidth, targetHeight) => {
  console.log('🎨 Procesando recorte:', { pixelCrop, targetWidth, targetHeight });
  
  if (!validateCrop(pixelCrop)) {
    throw new Error('Coordenadas de recorte inválidas');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No se pudo crear el contexto del canvas');
  }

  // Establecer dimensiones del canvas final
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Aplicar suavizado para mejor calidad
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  console.log('🖼️ Dimensiones imagen:', { 
    natural: { width: image.naturalWidth, height: image.naturalHeight },
    displayed: { width: image.width, height: image.height }
  });

  // Dibujar imagen recortada y redimensionada
  ctx.drawImage(
    image,
    // Coordenadas de origen (en imagen original)
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    // Coordenadas de destino (en canvas)
    0,
    0,
    targetWidth,
    targetHeight
  );

  console.log('✅ Canvas generado exitosamente');
  return canvas;
};

// Crear canvas de preview optimizado
const createPreviewCanvas = (image, pixelCrop, previewSize) => {
  if (!validateCrop(pixelCrop)) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;

  canvas.width = previewSize.width;
  canvas.height = previewSize.height;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    previewSize.width,
    previewSize.height
  );

  return canvas;
};

// ===============================
// HOOK PERSONALIZADO
// ===============================

const useImageEditor = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Validar archivo de imagen
  const validateImageFile = (file, config) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeBytes = config.maxSizeMB * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      throw new Error(`Formato no soportado. Use: JPG, PNG, WEBP`);
    }

    if (file.size > maxSizeBytes) {
      throw new Error(`El archivo es demasiado grande. Máximo: ${config.maxSizeMB}MB`);
    }

    return true;
  };

  // Subir imagen procesada (CORREGIDO)
  const uploadProcessedImage = async (file, pixelCrop, config, imageType) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      console.log('🚀 Iniciando upload de imagen:', { imageType, pixelCrop });

      // Validar archivo
      validateImageFile(file, config);
      setUploadProgress(10);

      // Validar crop
      if (!validateCrop(pixelCrop)) {
        throw new Error('Coordenadas de recorte inválidas. Por favor ajusta el recorte.');
      }

      // Crear imagen temporal para procesar
      const image = new Image();
      const imageUrl = URL.createObjectURL(file);
      image.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        image.onload = () => {
          console.log('🖼️ Imagen cargada:', { 
            naturalWidth: image.naturalWidth, 
            naturalHeight: image.naturalHeight 
          });
          resolve();
        };
        image.onerror = () => reject(new Error('Error al cargar la imagen'));
      });
      setUploadProgress(25);

      // Generar canvas recortado
      const canvas = getCroppedCanvas(
        image, 
        pixelCrop, 
        config.dimensions.width, 
        config.dimensions.height
      );
      setUploadProgress(40);

      // Convertir a blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              console.log('💾 Blob generado:', { size: result.size, type: result.type });
              resolve(result);
            } else {
              reject(new Error('Error al generar blob de imagen'));
            }
          },
          'image/jpeg', 
          config.quality
        );
      });
      setUploadProgress(55);

      // Comprimir imagen
      const compressedFile = await imageCompression(blob, {
        maxSizeMB: config.maxSizeMB,
        maxWidthOrHeight: Math.max(config.dimensions.width, config.dimensions.height),
        useWebWorker: true,
        preserveExif: false
      });
      
      console.log('🗜️ Imagen comprimida:', { 
        originalSize: blob.size, 
        compressedSize: compressedFile.size,
        compressionRatio: ((blob.size - compressedFile.size) / blob.size * 100).toFixed(1) + '%'
      });
      setUploadProgress(70);

      // Generar nombre único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `${user.id}/${imageType}_${timestamp}_${random}.jpg`;

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(config.bucketName)
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Error uploading to Supabase:', uploadError);
        throw new Error(`Error al subir imagen: ${uploadError.message}`);
      }
      
      console.log('☁️ Imagen subida a Storage:', uploadData);
      setUploadProgress(85);

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(config.bucketName)
        .getPublicUrl(fileName);

      if (!urlData.publicUrl) {
        throw new Error('Error al obtener URL pública de la imagen');
      }

      console.log('🔗 URL pública generada:', urlData.publicUrl);
      setUploadProgress(95);

      // Actualizar perfil de usuario
      const updateField = imageType === 'avatar' ? 'avatar_url' : 'cover_image_url';
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          [updateField]: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        throw new Error(`Error al actualizar perfil: ${updateError.message}`);
      }

      console.log('✅ Perfil actualizado exitosamente');
      setUploadProgress(100);

      // Limpiar recursos
      URL.revokeObjectURL(imageUrl);

      return {
        success: true,
        url: urlData.publicUrl,
        fileName
      };

    } catch (err) {
      console.error('💥 Error en upload:', err);
      setError(err.message || 'Error desconocido al procesar la imagen');
      return { success: false, error: err.message };
    } finally {
      setIsUploading(false);
      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return {
    uploadProcessedImage,
    isUploading,
    uploadProgress,
    error,
    setError
  };
};

// ===============================
// COMPONENTE CROP EDITOR
// ===============================

const CropEditor = ({ 
  imageFile, 
  imageType = 'avatar', 
  onCancel, 
  onSuccess 
}) => {
  const config = IMAGE_CONFIGS[imageType];
  const { uploadProcessedImage, isUploading, uploadProgress, error, setError } = useImageEditor();
  
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState(); // Porcentajes
  const [completedCrop, setCompletedCrop] = useState(); // Píxeles
  const [previewCanvases, setPreviewCanvases] = useState({});
  const imgRef = useRef(null);

  // Inicializar imagen
  useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile);
      setImageSrc(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [imageFile]);

  // Configurar crop inicial cuando la imagen carga
  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    
    console.log('📐 Imagen cargada para crop:', { width, height });
    
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        config.aspect,
        width,
        height,
      ),
      width,
      height,
    );
    
    setCrop(initialCrop);
    
    // Convertir a píxeles inmediatamente
    const pixelCrop = convertToPixelCrop(initialCrop, width, height);
    setCompletedCrop(pixelCrop);
    
    console.log('🎯 Crop inicial establecido:', { initialCrop, pixelCrop });
  }, [config.aspect]);

  // Manejar cambio de crop
  const onCropChange = useCallback((pixelCrop, percentCrop) => {
    setCrop(percentCrop);
  }, []);

  // Manejar crop completado (CORREGIDO)
  const onCropComplete = useCallback((pixelCrop, percentCrop) => {
    console.log('✂️ Crop completado:', { pixelCrop, percentCrop });
    
    if (pixelCrop && validateCrop(pixelCrop)) {
      setCompletedCrop(pixelCrop);
      
      // Actualizar previews
      if (imgRef.current) {
        const avatarCanvas = createPreviewCanvas(imgRef.current, pixelCrop, { width: 128, height: 128 });
        const coverCanvas = createPreviewCanvas(imgRef.current, pixelCrop, { width: 320, height: 137 });
        
        setPreviewCanvases({
          avatar: avatarCanvas,
          cover: coverCanvas
        });
      }
    }
  }, []);

  // Procesar y subir (CORREGIDO)
  const handleSave = async () => {
    if (!completedCrop || !imgRef.current || !validateCrop(completedCrop)) {
      setError('Por favor ajusta el recorte de la imagen correctamente');
      return;
    }

    console.log('💾 Iniciando guardado con crop:', completedCrop);

    const result = await uploadProcessedImage(
      imageFile, 
      completedCrop, // Ya está en píxeles
      config, 
      imageType
    );

    if (result.success) {
      console.log('🎉 Upload exitoso:', result.url);
      onSuccess?.(result.url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Editar {config.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {config.description}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onCancel}
              disabled={isUploading}
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="p-6 max-h-[60vh] overflow-auto">
          {imageSrc && (
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Crop Area */}
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-3">
                  Ajustar recorte
                </h3>
                <div className="border rounded-lg overflow-hidden bg-muted">
                  <ReactCrop
                    crop={crop}
                    onChange={onCropChange}
                    onComplete={onCropComplete}
                    aspect={config.aspect}
                    circularCrop={config.shape === 'circle'}
                    className="max-w-full"
                    minWidth={50}
                    minHeight={50}
                  >
                    <img
                      ref={imgRef}
                      alt="Crop preview"
                      src={imageSrc}
                      onLoad={onImageLoad}
                      className="max-w-full h-auto"
                      style={{ maxHeight: '400px' }}
                    />
                  </ReactCrop>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Arrastra las esquinas para ajustar el recorte
                </p>
              </div>

              {/* Preview */}
              <div className="lg:w-80">
                <h3 className="font-medium text-foreground mb-3">
                  Vista previa
                </h3>
                <div className="space-y-4">
                  
                  {/* Preview Avatar */}
                  {imageType === 'avatar' && previewCanvases.avatar && (
                    <div className="text-center">
                      <div className="relative inline-block">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 mx-auto">
                          <canvas
                            ref={(canvas) => {
                              if (canvas && previewCanvases.avatar) {
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                  canvas.width = 128;
                                  canvas.height = 128;
                                  ctx.drawImage(previewCanvases.avatar, 0, 0);
                                }
                              }
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Como se verá en tu perfil
                      </p>
                    </div>
                  )}

                  {/* Preview Cover */}
                  {imageType === 'cover' && previewCanvases.cover && (
                    <div>
                      <div className="w-full aspect-[21/9] rounded-lg overflow-hidden border">
                        <canvas
                          ref={(canvas) => {
                            if (canvas && previewCanvases.cover) {
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                canvas.width = 320;
                                canvas.height = 137;
                                ctx.drawImage(previewCanvases.cover, 0, 0);
                              }
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Como se verá en tu perfil
                      </p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensiones:</span>
                        <span className="font-medium">
                          {config.dimensions.width}×{config.dimensions.height}px
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Formato:</span>
                        <span className="font-medium">JPG optimizado</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Calidad:</span>
                        <span className="font-medium">{Math.round(config.quality * 100)}%</span>
                      </div>
                      {completedCrop && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Recorte:</span>
                          <span className="font-medium text-xs">
                            {Math.round(completedCrop.width)}×{Math.round(completedCrop.height)}px
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Debug Info (Solo en desarrollo) */}
                  {process.env.NODE_ENV === 'development' && completedCrop && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        DEBUG: x:{Math.round(completedCrop.x)}, y:{Math.round(completedCrop.y)}, 
                        w:{Math.round(completedCrop.width)}, h:{Math.round(completedCrop.height)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={20} color="var(--color-destructive)" />
                <p className="text-destructive font-medium">Error</p>
              </div>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            
            {/* Progress */}
            {isUploading && (
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
            )}

            {!isUploading && <div />}

            {/* Actions */}
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={onCancel}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isUploading || !completedCrop || !validateCrop(completedCrop)}
              >
                {isUploading ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Icon name="Check" size={16} className="mr-2" />
                    Guardar {config.label}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const ProfileImageEditor = ({ 
  currentAvatar, 
  currentCover, 
  onAvatarChange, 
  onCoverChange,
  onClose 
}) => {
  const [editingType, setEditingType] = useState(null); // 'avatar' | 'cover' | null
  const [selectedFile, setSelectedFile] = useState(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Manejar selección de archivo
  const handleFileSelect = (file, type) => {
    if (file && file.type.startsWith('image/')) {
      console.log('📁 Archivo seleccionado:', { 
        name: file.name, 
        size: file.size, 
        type: file.type,
        imageType: type 
      });
      setSelectedFile(file);
      setEditingType(type);
    } else {
      console.error('❌ Archivo inválido:', file);
    }
  };

  // Éxito en la subida
  const handleUploadSuccess = (url) => {
    console.log('🎉 Upload completado exitosamente:', { url, type: editingType });
    
    if (editingType === 'avatar') {
      onAvatarChange?.(url);
    } else if (editingType === 'cover') {
      onCoverChange?.(url);
    }
    
    // Cerrar editor
    setEditingType(null);
    setSelectedFile(null);
  };

  // Cancelar edición
  const handleCancel = () => {
    console.log('❌ Edición cancelada');
    setEditingType(null);
    setSelectedFile(null);
  };

  // Eliminar imagen de portada
  const handleRemoveCover = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar la imagen de portada?')) {
      onCoverChange?.(null);
    }
  };

  return (
    <>
      {/* Trigger Buttons - This would be integrated into your profile UI */}
      <div className="space-y-4">
        
        {/* Avatar Section */}
        <div className="flex items-center space-x-4 p-4 border rounded-lg">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {currentAvatar ? (
              <img 
                src={currentAvatar} 
                alt="Avatar actual"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name="User" size={24} color="var(--color-muted-foreground)" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Imagen de perfil</h3>
            <p className="text-sm text-muted-foreground">
              Recomendamos una imagen cuadrada de al menos 400×400px
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => avatarInputRef.current?.click()}
          >
            <Icon name="Camera" size={16} className="mr-2" />
            Cambiar
          </Button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file, 'avatar');
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>

        {/* Cover Section */}
        <div className="p-4 border rounded-lg">
          <div className="w-full aspect-[21/9] rounded-lg overflow-hidden bg-muted mb-3">
            {currentCover ? (
              <img 
                src={currentCover} 
                alt="Portada actual"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Icon name="Image" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin imagen de portada</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground">Imagen de portada</h3>
              <p className="text-sm text-muted-foreground">
                Se mostrará en la parte superior de tu perfil (1920×823px recomendado)
              </p>
            </div>
            <div className="flex space-x-2">
              {currentCover && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleRemoveCover}
                  title="Eliminar imagen de portada"
                >
                  <Icon name="Trash2" size={16} />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => coverInputRef.current?.click()}
              >
                <Icon name="Camera" size={16} className="mr-2" />
                {currentCover ? 'Cambiar' : 'Añadir'}
              </Button>
            </div>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file, 'cover');
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Crop Editor Modal */}
      {editingType && selectedFile && (
        <CropEditor
          imageFile={selectedFile}
          imageType={editingType}
          onCancel={handleCancel}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
};

export default ProfileImageEditor;
