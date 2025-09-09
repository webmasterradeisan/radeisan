// src/pages/photo-upload-studio/components/ImageCropper.jsx
// Componente reutilizable para recorte de imágenes
// Versión simplificada del ProfileImageEditor para uso en el photo studio
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import 'react-image-crop/dist/ReactCrop.css';

// ===============================
// CONFIGURACIONES
// ===============================

const CROP_PRESETS = {
  square: { aspect: 1, label: 'Cuadrado' },
  landscape: { aspect: 16/9, label: 'Horizontal' },
  portrait: { aspect: 9/16, label: 'Vertical' },
  wide: { aspect: 21/9, label: 'Panorámica' },
  original: { aspect: null, label: 'Original' }
};

// ===============================
// UTILIDADES
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

// Generar canvas con imagen recortada
const getCroppedCanvas = (image, pixelCrop, targetSize = null) => {
  if (!validateCrop(pixelCrop)) {
    throw new Error('Coordenadas de recorte inválidas');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No se pudo crear el contexto del canvas');
  }

  // Dimensiones objetivo
  const targetWidth = targetSize?.width || pixelCrop.width;
  const targetHeight = targetSize?.height || pixelCrop.height;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Configurar calidad
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Dibujar imagen recortada
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas;
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const ImageCropper = ({ 
  imageFile,
  aspectRatio = null,
  onCropComplete,
  onCancel,
  showPresets = true,
  previewSize = { width: 200, height: 200 },
  title = "Recortar imagen",
  className = ""
}) => {
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [selectedPreset, setSelectedPreset] = useState(
    aspectRatio ? 
      Object.keys(CROP_PRESETS).find(key => CROP_PRESETS[key].aspect === aspectRatio) || 'original' 
      : 'original'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const imgRef = useRef(null);

  // Inicializar imagen
  useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile);
      setImageSrc(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [imageFile]);

  // Limpiar preview al desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Configurar crop inicial cuando se carga la imagen
  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    const targetAspect = CROP_PRESETS[selectedPreset]?.aspect;

    let initialCrop;
    if (targetAspect) {
      initialCrop = makeAspectCrop(
        { unit: '%', width: 90 },
        targetAspect,
        width,
        height
      );
    } else {
      // Para aspecto original, usar toda la imagen
      initialCrop = {
        unit: '%',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      };
    }

    const centeredCrop = centerCrop(initialCrop, width, height);
    setCrop(centeredCrop);
    setCompletedCrop(convertToPixelCrop(centeredCrop, width, height));
  }, [selectedPreset]);

  // Cambiar preset de aspecto
  const handlePresetChange = useCallback((preset) => {
    setSelectedPreset(preset);
    
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const targetAspect = CROP_PRESETS[preset]?.aspect;

      let newCrop;
      if (targetAspect) {
        newCrop = makeAspectCrop(
          { unit: '%', width: 90 },
          targetAspect,
          width,
          height
        );
      } else {
        newCrop = {
          unit: '%',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        };
      }

      const centeredCrop = centerCrop(newCrop, width, height);
      setCrop(centeredCrop);
      setCompletedCrop(convertToPixelCrop(centeredCrop, width, height));
    }
  }, []);

  // Actualizar preview cuando cambia el crop
  useEffect(() => {
    if (!completedCrop || !imgRef.current) return;

    try {
      const canvas = getCroppedCanvas(imgRef.current, completedCrop, previewSize);
      canvas.toBlob((blob) => {
        if (blob) {
          // Limpiar URL anterior
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          
          const newPreviewUrl = URL.createObjectURL(blob);
          setPreviewUrl(newPreviewUrl);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error generando preview:', error);
    }
  }, [completedCrop, previewSize, previewUrl]);

  // Confirmar recorte
  const handleConfirm = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !onCropComplete) return;

    setIsProcessing(true);

    try {
      const canvas = getCroppedCanvas(imgRef.current, completedCrop);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], imageFile.name, {
            type: imageFile.type,
            lastModified: Date.now()
          });

          onCropComplete({
            file: croppedFile,
            cropData: completedCrop,
            aspectRatio: CROP_PRESETS[selectedPreset]?.aspect || null,
            preview: previewUrl
          });
        } else {
          throw new Error('Error al procesar la imagen recortada');
        }
        setIsProcessing(false);
      }, imageFile.type, 0.95);

    } catch (error) {
      console.error('Error al recortar:', error);
      setIsProcessing(false);
    }
  }, [completedCrop, imageFile, onCropComplete, previewUrl, selectedPreset]);

  // Resetear recorte
  const handleReset = useCallback(() => {
    if (imgRef.current) {
      onImageLoad({ currentTarget: imgRef.current });
    }
  }, [onImageLoad]);

  if (!imageFile) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Icon name="ImageOff" size={48} />
        <span className="ml-2">No hay imagen para recortar</span>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <Icon name="X" size={16} className="mr-2" />
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel de edición */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex justify-center">
              {imageSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(convertToPixelCrop(c, imgRef.current?.width || 0, imgRef.current?.height || 0))}
                  aspect={CROP_PRESETS[selectedPreset]?.aspect}
                  className="max-w-full"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Imagen a recortar"
                    onLoad={onImageLoad}
                    className="max-w-full max-h-96 object-contain"
                  />
                </ReactCrop>
              )}
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Presets de aspecto */}
          {showPresets && (
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-medium text-foreground mb-3">Proporción</h3>
              <div className="space-y-2">
                {Object.entries(CROP_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant={selectedPreset === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetChange(key)}
                    className="w-full justify-start"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium text-foreground mb-3">Vista previa</h3>
            <div className="flex justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="border rounded-lg shadow-sm"
                  style={{
                    width: previewSize.width,
                    height: previewSize.height,
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center"
                  style={{
                    width: previewSize.width,
                    height: previewSize.height
                  }}
                >
                  <Icon name="Image" size={32} className="text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Acciones adicionales */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium text-foreground mb-3">Acciones</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full justify-start"
              >
                <Icon name="RotateCcw" size={16} className="mr-2" />
                Resetear recorte
              </Button>
            </div>
          </div>

          {/* Información */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-primary mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Consejos:</p>
                <ul className="space-y-1">
                  <li>• Arrastra las esquinas para ajustar</li>
                  <li>• Mueve el área seleccionada</li>
                  <li>• Usa los presets para proporciones comunes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
