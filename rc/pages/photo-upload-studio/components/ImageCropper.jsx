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
    aspectRatio ? Object.keys(CROP_PRESETS).find(key => CROP_PRESETS[key].aspect === aspectRatio) || 'original' : 'original'
  );
  const [previewCanvas, setPreviewCanvas] = useState(null);
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
    
    const preset = CROP_PRESETS[selectedPreset];
    
    if (preset && preset.aspect) {
      const initialCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          preset.aspect,
          width,
          height,
        ),
        width,
        height,
      );
      
      setCrop(initialCrop);
      const pixelCrop = convertToPixelCrop(initialCrop, width, height);
      setCompletedCrop(pixelCrop);
    } else {
      // Sin recorte para original
      setCrop(undefined);
      setCompletedCrop(null);
    }
  }, [selectedPreset]);

  // Manejar cambio de crop
  const onCropChange = useCallback((pixelCrop, percentCrop) => {
    setCrop(percentCrop);
  }, []);

  // Manejar crop completado
  const onCropCompleteHandler = useCallback((pixelCrop) => {
    if (validateCrop(pixelCrop)) {
      setCompletedCrop(pixelCrop);
      
      // Generar preview
      if (imgRef.current) {
        try {
          const canvas = getCroppedCanvas(imgRef.current, pixelCrop, previewSize);
          setPreviewCanvas(canvas);
        } catch (error) {
          console.error('Error generating preview:', error);
        }
      }
    }
  }, [previewSize]);

  // Cambiar preset
  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    const preset = CROP_PRESETS[presetKey];
    
    if (imgRef.current && preset && preset.aspect) {
      const { width, height } = imgRef.current;
      const initialCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          preset.aspect,
          width,
          height,
        ),
        width,
        height,
      );
      
      setCrop(initialCrop);
      const pixelCrop = convertToPixelCrop(initialCrop, width, height);
      setCompletedCrop(pixelCrop);
    } else if (presetKey === 'original') {
      setCrop(undefined);
      setCompletedCrop(null);
      setPreviewCanvas(null);
    }
  };

  // Aplicar recorte
  const handleApply = () => {
    if (selectedPreset === 'original') {
      onCropComplete?.(null, selectedPreset);
    } else if (validateCrop(completedCrop)) {
      onCropComplete?.(completedCrop, selectedPreset);
    }
  };

  return (
    <div className={`bg-background ${className}`}>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {title}
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onCancel}
          >
            <Icon name="X" size={16} />
          </Button>
        </div>

        {/* Presets */}
        {showPresets && (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Formato
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CROP_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant={selectedPreset === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetChange(key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Editor y Preview */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Área de Crop */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Ajustar recorte
            </label>
            {imageSrc && (
              <div className="border rounded-lg overflow-hidden bg-muted">
                {selectedPreset === 'original' ? (
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Original"
                    onLoad={onImageLoad}
                    className="w-full h-auto max-h-96 object-contain"
                  />
                ) : (
                  <ReactCrop
                    crop={crop}
                    onChange={onCropChange}
                    onComplete={onCropCompleteHandler}
                    aspect={CROP_PRESETS[selectedPreset]?.aspect}
                    className="max-w-full"
                    minWidth={50}
                    minHeight={50}
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc}
                      alt="Crop preview"
                      onLoad={onImageLoad}
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </ReactCrop>
                )}
              </div>
            )}
            {selectedPreset !== 'original' && (
              <p className="text-xs text-muted-foreground mt-2">
                Arrastra las esquinas para ajustar el recorte
              </p>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Vista previa
            </label>
            <div className="border rounded-lg overflow-hidden bg-muted p-4">
              {selectedPreset === 'original' ? (
                <div className="text-center py-8">
                  <Icon name="Image" size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Imagen original sin recortar
                  </p>
                </div>
              ) : previewCanvas ? (
                <div className="text-center">
                  <canvas
                    ref={(canvas) => {
                      if (canvas && previewCanvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          canvas.width = previewSize.width;
                          canvas.height = previewSize.height;
                          ctx.drawImage(previewCanvas, 0, 0);
                        }
                      }
                    }}
                    className="max-w-full border rounded"
                    style={{ 
                      width: `${previewSize.width}px`, 
                      height: `${previewSize.height}px` 
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Resultado final
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Icon name="Crop" size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Ajusta el recorte para ver el preview
                  </p>
                </div>
              )}
            </div>

            {/* Info adicional */}
            {completedCrop && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Área seleccionada:</span>
                    <span className="font-medium">
                      {Math.round(completedCrop.width)}×{Math.round(completedCrop.height)}px
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posición:</span>
                    <span className="font-medium">
                      x:{Math.round(completedCrop.x)}, y:{Math.round(completedCrop.y)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedPreset === 'original' 
              ? 'La imagen se mantendrá en su formato original'
              : 'El recorte se aplicará al guardar la imagen'
            }
          </div>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleApply}
              disabled={selectedPreset !== 'original' && !validateCrop(completedCrop)}
            >
              <Icon name="Check" size={16} className="mr-2" />
              Aplicar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
