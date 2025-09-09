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
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  // Click para seleccionar archivos
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Cambio en input file
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    
    // Limpiar input para permitir seleccionar el mismo archivo
    e.target.value = '';
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Zona de Upload */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${dragActive 
            ? 'border-primary bg-primary/5 scale-105' 
            : error 
              ? 'border-destructive bg-destructive/5' 
              : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
          }
        `}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Contenido principal */}
        <div className="flex flex-col items-center space-y-4">
          {/* Icono principal */}
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-all
            ${dragActive 
              ? 'bg-primary text-primary-foreground scale-110' 
              : error 
                ? 'bg-destructive/10 text-destructive' 
                : 'bg-muted text-muted-foreground'
            }
          `}>
            <Icon 
              name={dragActive ? 'Download' : error ? 'AlertCircle' : 'ImagePlus'} 
              size={32} 
            />
          </div>

          {/* Texto principal */}
          <div className="space-y-2">
            <h3 className={`text-lg font-semibold ${
              error ? 'text-destructive' : 'text-foreground'
            }`}>
              {dragActive 
                ? '¡Suelta las fotos aquí!' 
                : error 
                  ? 'Error en los archivos' 
                  : 'Sube tus fotos'
              }
            </h3>
            
            <p className="text-sm text-muted-foreground">
              {dragActive 
                ? 'Libera para subir las imágenes'
                : `Arrastra ${multiple ? 'imágenes' : 'una imagen'} aquí o haz clic para seleccionar`
              }
            </p>
          </div>

          {/* Botón de acción */}
          {!dragActive && (
            <Button 
              variant={error ? "destructive" : "default"}
              size="lg"
              className="pointer-events-none"
            >
              <Icon name="Upload" size={20} className="mr-2" />
              {error ? 'Intentar de nuevo' : 'Seleccionar archivos'}
            </Button>
          )}
        </div>

        {/* Efecto de drag activo */}
        {dragActive && (
          <div className="absolute inset-0 border-2 border-primary bg-primary/10 rounded-lg flex items-center justify-center">
            <div className="bg-primary text-primary-foreground rounded-full p-3">
              <Icon name="Download" size={24} />
            </div>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-4 space-y-2">
        {error && (
          <div className="flex items-center space-x-2 text-destructive text-sm">
            <Icon name="AlertCircle" size={16} />
            <span>{error}</span>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Icon name="FileImage" size={14} />
            <span>Formatos: JPG, PNG, WebP</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Icon name="HardDrive" size={14} />
            <span>Máximo: {formatFileSize(MAX_FILE_SIZE)} por archivo</span>
          </div>
          
          {multiple && (
            <div className="flex items-center space-x-1">
              <Icon name="Hash" size={14} />
              <span>Hasta {maxFiles} archivos</span>
            </div>
          )}
        </div>
      </div>

      {/* Tips adicionales */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Icon name="Lightbulb" size={16} className="text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Consejos para mejores resultados:</p>
            <ul className="space-y-1">
              <li>• Usa fotos con buena iluminación y resolución</li>
              <li>• Las imágenes se optimizarán automáticamente</li>
              <li>• Puedes recortar y ajustar después de subirlas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadZone;
