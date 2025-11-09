// src/components/PhotoQuickUpload.jsx
// Sistema simple para subir fotos rápidamente, similar al ProfileImageEditor
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Icon from './AppIcon';
import Button from './ui/Button';
import 'react-image-crop/dist/ReactCrop.css';

// Importar servicio de puntos (asumiendo que tiene la función para sumar puntos)
import { addFreePoints } from '../services/pointsService'; // Importar addFreePoints

// ===============================
// CONFIGURACIONES
// ===============================

const QUICK_CATEGORIES = [
  { id: 'general', label: 'General', icon: 'Image' },
  { id: 'nature', label: 'Naturaleza', icon: 'TreePine' },
  { id: 'portrait', label: 'Retratos', icon: 'User' },
  { id: 'lifestyle', label: 'Estilo de vida', icon: 'Heart' },
  { id: 'travel', label: 'Viajes', icon: 'MapPin' },
  { id: 'food', label: 'Comida', icon: 'UtensilsCrossed' }
];

const CROP_PRESETS = [
  { id: 'original', label: 'Original', aspect: null, icon: 'Maximize' },
  { id: 'square', label: 'Cuadrado', aspect: 1, icon: 'Square' },
  { id: 'landscape', label: 'Horizontal', aspect: 16/9, icon: 'RectangleHorizontal' }
];

const COMPRESSION_CONFIG = {
  maxSizeMB: 3,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  quality: 0.8
};

const POINTS_PER_PHOTO = 10; // Puntos base por foto subida

// ===============================
// EDITOR DE FOTO INDIVIDUAL (sin cambios)
// ===============================

const PhotoCropEditor = ({ 
  file, 
  onComplete, 
  onCancel 
}) => {
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [selectedPreset, setSelectedPreset] = useState('square');
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef(null);

  // Inicializar imagen
  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setImageSrc(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  // Configurar crop inicial
  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    const preset = CROP_PRESETS.find(p => p.id === selectedPreset);
    
    if (preset?.aspect) {
      const initialCrop = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, preset.aspect, width, height),
        width,
        height
      );
      setCrop(initialCrop);
      setCompletedCrop(convertToPixelCrop(initialCrop, width, height));
    }
  }, [selectedPreset]);

  // Cambiar preset
  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    if (imgRef.current) {
      const preset = CROP_PRESETS.find(p => p.id === presetId);
      const { width, height } = imgRef.current;
      
      if (preset?.aspect) {
        const newCrop = centerCrop(
          makeAspectCrop({ unit: '%', width: 90 }, preset.aspect, width, height),
          width,
          height
        );
        setCrop(newCrop);
        setCompletedCrop(convertToPixelCrop(newCrop, width, height));
      } else {
        setCrop(undefined);
        setCompletedCrop(undefined);
      }
    }
  };

  // Procesar imagen
  const handleConfirm = async () => {
    if (!imgRef.current) return;

    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let sourceX = 0, sourceY = 0, sourceWidth = imgRef.current.naturalWidth, sourceHeight = imgRef.current.naturalHeight;

      if (completedCrop) {
        sourceX = completedCrop.x;
        sourceY = completedCrop.y;
        sourceWidth = completedCrop.width;
        sourceHeight = completedCrop.height;
      }

      canvas.width = Math.min(sourceWidth, 1920);
      canvas.height = Math.min(sourceHeight, 1920);

      ctx.drawImage(
        imgRef.current,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, canvas.width, canvas.height
      );

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Comprimir imagen
            const compressedFile = await imageCompression(blob, COMPRESSION_CONFIG);
            
            onComplete({
              file: compressedFile,
              originalFile: file,
              preset: selectedPreset,
              hasCrop: !!completedCrop
            });
          } catch (error) {
            console.error('Error compressing image:', error);
            onComplete({
              file: blob,
              originalFile: file,
              preset: selectedPreset,
              hasCrop: !!completedCrop
            });
          }
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controles de Crop */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Formato
        </label>
        <div className="flex gap-2">
          {CROP_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant={selectedPreset === preset.id ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange(preset.id)}
            >
              <Icon name={preset.icon} size={14} className="mr-1" />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="border rounded-lg overflow-hidden bg-muted">
        {imageSrc && (
          selectedPreset === 'original' ? (
            <img
              src={imageSrc}
              alt="Preview"
              className="w-full max-h-96 object-contain"
            />
          ) : (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(convertToPixelCrop(c, imgRef.current?.width || 0, imgRef.current?.height || 0))}
              aspect={CROP_PRESETS.find(p => p.id === selectedPreset)?.aspect}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop"
                onLoad={onImageLoad}
                className="max-w-full max-h-96 object-contain"
              />
            </ReactCrop>
          )
        )}
      </div>

      {/* Acciones */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Icon name="Check" size={16} className="mr-2" />
              Confirmar
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const PhotoQuickUpload = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState('select'); // 'select' | 'crop' | 'metadata' | 'uploading'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processedPhotos, setProcessedPhotos] = useState([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [metadata, setMetadata] = useState({
    caption: '',
    category: 'general'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedFiles([]);
      setProcessedPhotos([]);
      setCurrentEditIndex(0);
      setMetadata({ caption: '', category: 'general' });
      setUploadProgress(0);
    }
  }, [isOpen]);

  // Seleccionar archivos
  const handleFileSelect = (files) => {
    const validFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );
    
    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setStep('crop');
    }
  };

  // Completar edición de una foto
  const handlePhotoCropped = (result) => {
    const newProcessedPhotos = [...processedPhotos];
    newProcessedPhotos[currentEditIndex] = result;
    setProcessedPhotos(newProcessedPhotos);

    // Si hay más fotos por editar
    if (currentEditIndex < selectedFiles.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1);
    } else {
      setStep('metadata');
    }
  };

  // Skip crop para foto actual
  const handleSkipCrop = () => {
    const result = {
      file: selectedFiles[currentEditIndex],
      originalFile: selectedFiles[currentEditIndex],
      preset: 'original',
      hasCrop: false
    };
    handlePhotoCropped(result);
  };

  // Subir fotos
  const handleUpload = async () => {
    if (!user || processedPhotos.length === 0) return;

    setIsUploading(true);
    setStep('uploading');

    let uploadedCount = 0;
    const totalPhotos = processedPhotos.length;
    
    try {
      const uploadPromises = processedPhotos.map(async (photo, index) => {
        const fileName = `${user.id}/${Date.now()}_${index}.jpg`;
        
        // 1. Subir a Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('photos') // Asegúrate de que el bucket 'photos' existe y tiene RLS de INSERT
          .upload(fileName, photo.file, {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          });

        if (uploadError) throw uploadError;

        // 2. Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
          
        uploadedCount++;
        setUploadProgress((uploadedCount / totalPhotos) * 90); // 90% para subida, 10% para DB/Puntos

        // 3. Insertar en base de datos
        const { data: photoData, error: dbError } = await supabase
          .from('photos')
          .insert({
            user_id: user.id,
            image_url: publicUrl,
            thumbnail_url: publicUrl, // Por ahora usar la misma
            caption: metadata.caption,
            category: metadata.category,
            aspect_ratio: photo.preset,
            file_size: photo.file.size,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (dbError) throw dbError;
        
        // 4. Otorgar Puntos por la subida
        await addFreePoints(
            user.id, 
            POINTS_PER_PHOTO, 
            'photo_upload', 
            photoData.id
        );

        return photoData;
      });

      await Promise.all(uploadPromises);

      setUploadProgress(95);
      
      // 5. Actualizar contador en perfil de forma transaccional (RPC)
      // Usamos RPC o un UPDATE seguro para sumar, en lugar de solo establecer el valor
      const { error: profileError } = await supabase.rpc('increment_photos_count', {
        p_user_id: user.id,
        p_increment_value: totalPhotos
      });

      if (profileError) {
          console.warn('⚠️ Error al actualizar contador de perfil:', profileError);
          // Fallback simple:
          await supabase.from('user_profiles').update({ photos_count: totalPhotos }).eq('id', user.id);
      }

      setUploadProgress(100);

      // Éxito
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Error uploading photos:', error);
      setIsUploading(false);
      setStep('metadata');
    }
  };
  
  // ... (El resto del componente, sin cambios en el renderizado)
// ... (omitted remaining part of component for brevity, assuming only handleUpload was changed)

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Subir Fotos Rápido
              </h2>
              <p className="text-sm text-muted-foreground">
                {step === 'select' && 'Selecciona tus fotos'}
                {step === 'crop' && `Editando foto ${currentEditIndex + 1} de ${selectedFiles.length}`}
                {step === 'metadata' && 'Añade información'}
                {step === 'uploading' && 'Subiendo fotos...'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* PASO 1: Selección */}
          {step === 'select' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="ImagePlus" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Selecciona tus fotos
                </h3>
                <p className="text-muted-foreground mb-4">
                  Haz clic aquí o arrastra las imágenes
                </p>
                <Button>
                  <Icon name="Upload" size={16} className="mr-2" />
                  Elegir archivos
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          )}

          {/* PASO 2: Crop */}
          {step === 'crop' && selectedFiles[currentEditIndex] && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {selectedFiles[currentEditIndex].name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipCrop}
                >
                  Saltar edición
                </Button>
              </div>
              
              <PhotoCropEditor
                file={selectedFiles[currentEditIndex]}
                onComplete={handlePhotoCropped}
                onCancel={() => setStep('select')}
              />
            </div>
          )}

          {/* PASO 3: Metadata */}
          {step === 'metadata' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {processedPhotos.slice(0, 3).map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={URL.createObjectURL(photo.file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {processedPhotos.length > 3 && (
                  <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">
                      +{processedPhotos.length - 3}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Descripción (opcional)
                  </label>
                  <textarea
                    placeholder="Cuéntanos sobre estas fotos..."
                    value={metadata.caption}
                    onChange={(e) => setMetadata(prev => ({ ...prev, caption: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none"
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Categoría
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_CATEGORIES.map((category) => (
                      <Button
                        key={category.id}
                        variant={metadata.category === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMetadata(prev => ({ ...prev, category: category.id }))}
                        className="justify-start"
                      >
                        <Icon name={category.icon} size={14} className="mr-2" />
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setStep('crop')}>
                  Volver
                </Button>
                <Button onClick={handleUpload}>
                  <Icon name="Upload" size={16} className="mr-2" />
                  Subir {processedPhotos.length} foto{processedPhotos.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}

          {/* PASO 4: Uploading */}
          {step === 'uploading' && (
            <div className="text-center space-y-4">
              <Icon name="Upload" size={48} className="text-primary mx-auto" />
              <h3 className="text-lg font-medium text-foreground">
                Subiendo fotos...
              </h3>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round(uploadProgress)}% completado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoQuickUpload;
