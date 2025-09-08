// src/pages/photo-upload-studio/components/PhotoPreview.jsx
// Preview y edición de fotos con crop y filtros
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import 'react-image-crop/dist/ReactCrop.css';

// ===============================
// CONFIGURACIONES
// ===============================

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', aspect: null, icon: 'Maximize' },
  { id: 'square', label: 'Cuadrado (1:1)', aspect: 1, icon: 'Square' },
  { id: 'landscape', label: 'Horizontal (16:9)', aspect: 16/9, icon: 'RectangleHorizontal' },
  { id: 'portrait', label: 'Vertical (9:16)', aspect: 9/16, icon: 'RectangleVertical' },
  { id: 'wide', label: 'Panorámica (21:9)', aspect: 21/9, icon: 'Monitor' }
];

// ===============================
// COMPONENTE DE EDICIÓN INDIVIDUAL
// ===============================

const PhotoEditor = ({ 
  file, 
  index, 
  cropData, 
  aspectRatio, 
  onCropChange, 
  onAspectRatioChange,
  onRemove 
}) => {
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [selectedRatio, setSelectedRatio] = useState(aspectRatio || 'original');
  const imgRef = useRef(null);

  // Inicializar imagen
  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setImageSrc(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  // Configurar crop inicial cuando la imagen carga
  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    
    const selectedAspectRatio = ASPECT_RATIOS.find(r => r.id === selectedRatio);
    
    if (selectedAspectRatio && selectedAspectRatio.aspect) {
      const initialCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          selectedAspectRatio.aspect,
          width,
          height,
        ),
        width,
        height,
      );
      
      setCrop(initialCrop);
      const pixelCrop = convertToPixelCrop(initialCrop, width, height);
      setCompletedCrop(pixelCrop);
      onCropChange(index, pixelCrop);
    } else {
      // No crop para original
      setCrop(undefined);
      setCompletedCrop(undefined);
      onCropChange(index, null);
    }
  }, [selectedRatio, index, onCropChange]);

  // Manejar cambio de crop
  const onCropChangeHandler = useCallback((pixelCrop, percentCrop) => {
    setCrop(percentCrop);
  }, []);

  // Manejar crop completado
  const onCropComplete = useCallback((pixelCrop) => {
    if (pixelCrop && pixelCrop.width > 0 && pixelCrop.height > 0) {
      setCompletedCrop(pixelCrop);
      onCropChange(index, pixelCrop);
    }
  }, [index, onCropChange]);

  // Cambiar aspect ratio
  const handleAspectRatioChange = (ratioId) => {
    setSelectedRatio(ratioId);
    onAspectRatioChange(index, ratioId);
    
    const ratioData = ASPECT_RATIOS.find(r => r.id === ratioId);
    
    if (imgRef.current && ratioData && ratioData.aspect) {
      const { width, height } = imgRef.current;
      const initialCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          ratioData.aspect,
          width,
          height,
        ),
        width,
        height,
      );
      
      setCrop(initialCrop);
      const pixelCrop = convertToPixelCrop(initialCrop, width, height);
      setCompletedCrop(pixelCrop);
      onCropChange(index, pixelCrop);
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Icon name="Image" size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground truncate">
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({(file.size / 1024 / 1024).toFixed(1)}MB)
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive"
        >
          <Icon name="Trash2" size={16} />
        </Button>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-2 block">
          Formato
        </label>
        <div className="flex flex-wrap gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <Button
              key={ratio.id}
              variant={selectedRatio === ratio.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleAspectRatioChange(ratio.id)}
              className="flex items-center space-x-1"
            >
              <Icon name={ratio.icon} size={14} />
              <span className="text-xs">{ratio.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Image Editor */}
      <div className="mb-4">
        {imageSrc && (
          <div className="border rounded-lg overflow-hidden bg-muted">
            {selectedRatio === 'original' ? (
              <img
                src={imageSrc}
                alt="Preview"
                className="w-full h-auto max-h-64 object-contain"
              />
            ) : (
              <ReactCrop
                crop={crop}
                onChange={onCropChangeHandler}
                onComplete={onCropComplete}
                aspect={ASPECT_RATIOS.find(r => r.id === selectedRatio)?.aspect}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="w-full h-auto max-h-64 object-contain"
                />
              </ReactCrop>
            )}
          </div>
        )}
      </div>

      {/* Preview Info */}
      <div className="text-xs text-muted-foreground">
        {selectedRatio === 'original' ? (
          <p>Imagen original sin recortar</p>
        ) : (
          <p>Arrastra las esquinas para ajustar el recorte</p>
        )}
      </div>
    </div>
  );
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const PhotoPreview = ({ 
  files, 
  cropData = [], 
  aspectRatios = [], 
  onRemoveFile, 
  onCropChange, 
  onAspectRatioChange,
  onNext 
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  // Funciones de navegación
  const nextPhoto = () => {
    if (selectedPhoto < files.length - 1) {
      setSelectedPhoto(selectedPhoto + 1);
    }
  };

  const prevPhoto = () => {
    if (selectedPhoto > 0) {
      setSelectedPhoto(selectedPhoto - 1);
    }
  };

  // Aplicar filtro global
  const applyToAll = (type, value) => {
    if (type === 'aspectRatio') {
      files.forEach((_, index) => {
        onAspectRatioChange(index, value);
      });
    }
  };

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
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Editar Fotos
          </h2>
          <p className="text-sm text-muted-foreground">
            Ajusta el recorte y formato de tus {files.length} foto{files.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Acciones Globales */}
        <div className="flex items-center space-x-2">
          <select
            className="text-sm border rounded px-3 py-1 bg-background"
            onChange={(e) => applyToAll('aspectRatio', e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Aplicar formato a todas</option>
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio.id} value={ratio.id}>
                {ratio.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vista Desktop - Grid */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-2 gap-6">
          {files.map((file, index) => (
            <PhotoEditor
              key={`${file.name}-${index}`}
              file={file}
              index={index}
              cropData={cropData[index]}
              aspectRatio={aspectRatios[index]}
              onCropChange={onCropChange}
              onAspectRatioChange={onAspectRatioChange}
              onRemove={onRemoveFile}
            />
          ))}
        </div>
      </div>

      {/* Vista Mobile - Carousel */}
      <div className="lg:hidden">
        
        {/* Navegación */}
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={prevPhoto}
            disabled={selectedPhoto === 0}
          >
            <Icon name="ChevronLeft" size={16} />
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {selectedPhoto + 1} de {files.length}
          </span>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={nextPhoto}
            disabled={selectedPhoto === files.length - 1}
          >
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>

        {/* Editor Actual */}
        <PhotoEditor
          file={files[selectedPhoto]}
          index={selectedPhoto}
          cropData={cropData[selectedPhoto]}
          aspectRatio={aspectRatios[selectedPhoto]}
          onCropChange={onCropChange}
          onAspectRatioChange={onAspectRatioChange}
          onRemove={onRemoveFile}
        />

        {/* Thumbnails */}
        <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
          {files.map((file, index) => (
            <button
              key={`thumb-${index}`}
              onClick={() => setSelectedPhoto(index)}
              className={`
                flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors
                ${selectedPhoto === index ? 'border-primary' : 'border-transparent'}
              `}
            >
              <img
                src={URL.createObjectURL(file)}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
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
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {cropData.filter(crop => crop !== null).length}
              </p>
              <p className="text-xs text-muted-foreground">Con recorte</p>
            </div>
          </div>
          
          <Button onClick={onNext}>
            <Icon name="ArrowRight" size={16} className="mr-2" />
            Continuar
          </Button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-2 flex items-center">
          <Icon name="Info" size={16} className="mr-2 text-blue-500" />
          Tips de edición
        </h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• El formato cuadrado funciona mejor en feeds sociales</p>
          <p>• El formato horizontal es ideal para paisajes</p>
          <p>• Puedes aplicar el mismo formato a todas las fotos</p>
          <p>• Las imágenes se optimizarán automáticamente al subir</p>
        </div>
      </div>
    </div>
  );
};

export default PhotoPreview;
