// src/pages/photo-upload-studio/components/PhotoUploadZone.jsx
// Zona de drag & drop para upload de fotos múltiples
import React, { useState, useRef, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// ===============================
// CONFIGURACIONES
// ===============================

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 10;

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const PhotoUploadZone = ({ 
  onFilesSelected, 
  multiple = true, 
  maxFiles = DEFAULT_MAX_FILES,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Validar archivos
  const validateFiles = (files) => {
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach((file, index) => {
      // Verificar tipo
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Formato no soportado`);
        return;
      }

      // Verificar tamaño
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Archivo demasiado grande (máx. 10MB)`);
        return;
      }

      // Verificar límite de archivos
      if (validFiles.length >= maxFiles) {
        errors.push(`Máximo ${maxFiles} archivos permitidos`);
        return;
      }

      validFiles.push(file);
    });

    return { validFiles, errors };
  };

  // Manejar archivos seleccionados
  const handleFiles = useCallback((files) => {
    setError(null);
    
    if (!files || files.length === 0) return;

    const { validFiles, errors } = validateFiles(files);

    if (errors.length > 0) {
      setError(errors[0]); // Mostrar primer error
      return;
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected, maxFiles]);

  // Eventos de drag & drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Manejar selección manual
  const handleFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Limpiar input para permitir seleccionar los mismos archivos
    e.target.value = '';
  }, [handleFiles]);

  // Abrir selector de archivos
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Zona de Upload Principal */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${dragActive 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-muted-foreground/25 bg-muted/30 hover:border-primary/50 hover:bg-primary/5'
          }
          ${error ? 'border-destructive bg-destructive/5' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        
        {/* Icono Central */}
        <div className="mb-6">
          <div className={`
            w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-colors
            ${dragActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            <Icon 
              name={dragActive ? "Upload" : "ImagePlus"} 
              size={32} 
            />
          </div>
        </div>

        {/* Texto Principal */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {dragActive 
              ? '¡Suelta las fotos aquí!' 
              : 'Sube tus fotos'
            }
          </h3>
          <p className="text-muted-foreground">
            {multiple 
              ? `Arrastra y suelta hasta ${maxFiles} fotos, o haz clic para seleccionar`
              : 'Arrastra y suelta una foto, o haz clic para seleccionar'
            }
          </p>
        </div>

        {/* Botón de Selección */}
        <Button 
          onClick={openFileSelector}
          className="mb-6"
          disabled={dragActive}
        >
          <Icon name="FolderOpen" size={16} className="mr-2" />
          Seleccionar Fotos
        </Button>

        {/* Información de Formatos */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Formatos soportados: JPG, PNG, WEBP</p>
          <p>Tamaño máximo: 10MB por foto</p>
          {multiple && <p>Hasta {maxFiles} fotos por vez</p>}
        </div>

        {/* Input Oculto */}
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={20} className="text-destructive" />
            <span className="text-destructive font-medium">Error</span>
          </div>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="mt-2 text-destructive hover:text-destructive"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* Ejemplos de Fotos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-2 flex items-center justify-center">
            <Icon name="Camera" size={24} className="text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground">Retratos</p>
        </div>
        <div className="text-center">
          <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded-lg mb-2 flex items-center justify-center">
            <Icon name="TreePine" size={24} className="text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground">Naturaleza</p>
        </div>
        <div className="text-center">
          <div className="aspect-square bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg mb-2 flex items-center justify-center">
            <Icon name="Palette" size={24} className="text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground">Arte</p>
        </div>
        <div className="text-center">
          <div className="aspect-square bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg mb-2 flex items-center justify-center">
            <Icon name="UtensilsCrossed" size={24} className="text-orange-600" />
          </div>
          <p className="text-xs text-muted-foreground">Comida</p>
        </div>
      </div>

      {/* Tips Rápidos */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-2 flex items-center">
          <Icon name="Lightbulb" size={16} className="mr-2 text-blue-500" />
          Tips rápidos
        </h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Las fotos cuadradas funcionan mejor en móviles</p>
          <p>• Usa buena iluminación para mejores resultados</p>
          <p>• Añade descripciones para mayor alcance</p>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadZone;
