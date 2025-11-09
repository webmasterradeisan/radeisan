// src/pages/photo-upload-studio/components/PhotoPreview.jsx
// Preview y edición de fotos con crop y filtros
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  // Inicializamos el estado local con la prop que viene del padre
  const [selectedRatio, setSelectedRatio] = useState(aspectRatio || 'original');
  // Usamos el cropData del padre si existe, si no, inicializamos sin valor.
  const [crop, setCrop] = useState(cropData || undefined); 
  const [completedCrop, setCompletedCrop] = useState(cropData ? cropData : undefined);
  
  const imgRef = useRef(null);

  // Generar URL del objeto de forma estable
  const imageSrc = useMemo(() => {
    if (file) {
      return URL.createObjectURL(file);
    }
    return '';
  }, [file]);

  // Sincronizar el estado del crop local si cambia la prop principal
  useEffect(() => {
    setCrop(cropData || undefined);
    setCompletedCrop(cropData || undefined);
  }, [cropData]);

  // Manejar cambio de aspecto
  const handleAspectRatioChange = useCallback((ratioId) => {
    const ratioData = ASPECT_RATIOS.find(r => r.id === ratioId);
    
    // 1. Actualizar estado local y en el padre
    setSelectedRatio(ratioId);
    onAspectRatioChange(index, ratioId); // Notifica al padre el nuevo aspecto
    
    // 2. Aplicar recorte inicial si se selecciona un aspecto fijo
    if (imgRef.current && ratioData.aspect) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      
      const initialCrop = centerCrop(
        makeAspectCrop(
          { unit: '%', width: 90 },
          ratioData.aspect,
          naturalWidth,
          naturalHeight,
        ),
        naturalWidth,
        naturalHeight,
      );
      
      const pixelCrop = convertToPixelCrop(initialCrop, naturalWidth, naturalHeight);

      setCrop(initialCrop);
      setCompletedCrop(pixelCrop);
      onCropChange(index, pixelCrop); // Notifica el nuevo recorte al padre
    } else if (ratioId === 'original') {
      // Si volvemos a original, limpiamos el crop
      setCrop(undefined);
      setCompletedCrop(undefined);
      onCropChange(index, null);
    }
  }, [index, onAspectRatioChange, onCropChange]);


  // Manejar crop mientras se arrastra (sólo actualiza el estado local)
  const onCropChangeHandler = useCallback((newCrop, percentCrop) => {
    setCrop(newCrop);
  }, []);

  // Manejar crop al soltar (actualiza el estado del padre)
  const onCropCompleteHandler = useCallback((newCrop, percentCrop) => {
    if (imgRef.current && newCrop.width && newCrop.height) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      const pixelCrop = convertToPixelCrop(newCrop, naturalWidth, naturalHeight);
      setCompletedCrop(pixelCrop);
      onCropChange(index, pixelCrop);
    }
  }, [index, onCropChange]);

  // **Estabilización Crítica:** Aplicar crop inicial SÓLO al cargar la imagen, si es necesario.
  const onImageLoad = useCallback((e) => {
    // Si no hay cropData inicial del padre, aplicamos el crop por defecto (si no es 'original')
    if (!cropData && selectedRatio !== 'original') {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        const ratioData = ASPECT_RATIOS.find(r => r.id === selectedRatio);

        if (ratioData?.aspect) {
            const initialCrop = centerCrop(
                makeAspectCrop(
                    { unit: '%', width: 90 },
                    ratioData.aspect,
                    naturalWidth,
                    naturalHeight,
                ),
                naturalWidth,
                naturalHeight,
            );
            
            const pixelCrop = convertToPixelCrop(initialCrop, naturalWidth, naturalHeight);
            
            setCrop(initialCrop);
            setCompletedCrop(pixelCrop);
            onCropChange(index, pixelCrop);
        }
    }
  }, [selectedRatio, index, onCropChange, cropData]);


  // Efecto para revocar la URL cuando el componente se desmonta o el archivo cambia
  useEffect(() => {
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);
  
  const currentAspect = ASPECT_RATIOS.find(r => r.id === selectedRatio)?.aspect;

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
                onComplete={onCropCompleteHandler}
                aspect={currentAspect}
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
  
  // CORRECCIÓN: Si el array de cropData no existe o está vacío, lo inicializamos.
  const safeCropData = Array.isArray(cropData) ? cropData : files.map(() => null);
  const safeAspectRatios = Array.isArray(aspectRatios) ? aspectRatios : files.map(() => 'original');

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
          <div className="text-sm text-muted-foreground">
            Aplicar a todas:
          </div>
          <div className="flex items-center space-x-1">
            {ASPECT_RATIOS.map((ratio) => (
              <Button
                key={ratio.id}
                variant="outline"
                size="sm"
                onClick={() => applyToAll('aspectRatio', ratio.id)}
                className="flex items-center space-x-1"
              >
                <Icon name={ratio.icon} size={12} />
                <span className="text-xs hidden sm:inline">{ratio.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Principal */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Panel de Edición */}
        <div className="order-2 lg:order-1">
          {files.map((file, index) => (
            <div key={index} className={index === selectedPhoto ? 'block' : 'hidden'}>
              <PhotoEditor
                file={file}
                index={index}
                // Usamos los datos seguros para asegurar que siempre haya un valor inicial
                cropData={safeCropData[index]}
                aspectRatio={safeAspectRatios[index]}
                onCropChange={onCropChange}
                onAspectRatioChange={onAspectRatioChange}
                onRemove={onRemoveFile}
              />
            </div>
          ))}
        </div>

        {/* Panel de Navegación */}
        <div className="order-1 lg:order-2">
          <div className="bg-card rounded-lg border p-4 sticky top-4">
            
            {/* Navegación entre fotos */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">
                Foto {selectedPhoto + 1} de {files.length}
              </h3>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPhoto}
                  disabled={selectedPhoto === 0}
                >
                  <Icon name="ChevronLeft" size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPhoto}
                  disabled={selectedPhoto === files.length - 1}
                >
                  <Icon name="ChevronRight" size={16} />
                </Button>
              </div>
            </div>

            {/* Thumbnails Grid */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {files.map((file, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhoto(index)}
                  className={`
                    aspect-square rounded-lg overflow-hidden border-2 transition-colors
                    ${selectedPhoto === index 
                      ? 'border-primary' 
                      : 'border-transparent hover:border-muted-foreground/50'
                    }
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

            {/* Información de la foto actual */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="text-foreground font-medium truncate ml-2">
                  {files[selectedPhoto]?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tamaño:</span>
                <span className="text-foreground">
                  {(files[selectedPhoto]?.size / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Formato:</span>
                <span className="text-foreground">
                  {ASPECT_RATIOS.find(r => r.id === safeAspectRatios[selectedPhoto])?.label || 'Original'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recorte:</span>
                <span className="text-foreground">
                  {safeCropData[selectedPhoto] ? 'Aplicado' : 'Sin recorte'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen y Navegación */}
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
                {safeCropData.filter(crop => crop !== null).length}
              </p>
              <p className="text-xs text-muted-foreground">Con recorte</p>
            </div>
          </div>
          
          <Button onClick={onNext}>
            <Icon name="ArrowRight" size={16} className="mr-2" />
            Continuar con metadatos
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
