import React, { useState, useRef, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { detectVideoOrientation, generateOrientationThumbnail, ORIENTATION_CONFIG } from './OrientationDetector';

const VideoUploadZone = ({ onFileSelect, uploadProgress, isUploading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [orientationData, setOrientationData] = useState(null);
  const [previewThumbnail, setPreviewThumbnail] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e?.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e?.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e?.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e?.dataTransfer?.files);
    const videoFile = files?.find(file => file?.type?.startsWith('video/'));
    
    if (videoFile) {
      processVideoFile(videoFile);
    }
  }, []);

  const handleFileInput = (e) => {
    const file = e?.target?.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  // 🎬 PROCESAR ARCHIVO DE VIDEO CON DETECCIÓN DE ORIENTACIÓN
  const processVideoFile = async (file) => {
    try {
      setIsAnalyzing(true);
      console.log('🔍 Analyzing video orientation...');

      // ✅ Detectar orientación del video
      const orientationInfo = await detectVideoOrientation(file);
      console.log('✅ Orientation detected:', orientationInfo);

      // ✅ Generar thumbnail según orientación
      const thumbnail = await generateOrientationThumbnail(file, orientationInfo.orientation);
      
      // ✅ Actualizar estados
      setOrientationData(orientationInfo);
      setPreviewThumbnail(thumbnail);

      // ✅ Enviar archivo con datos de orientación al componente padre
      const fileWithOrientation = {
        file,
        orientationData: orientationInfo,
        thumbnail
      };

      onFileSelect(fileWithOrientation);

    } catch (error) {
      console.error('❌ Error processing video:', error);
      
      // 🔄 Fallback: enviar archivo sin orientación
      onFileSelect({
        file,
        orientationData: null,
        thumbnail: null,
        error: error.message
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const supportedFormats = ['MP4', 'MOV', 'AVI', 'MKV', 'WebM'];
  const maxSize = '2GB';

  // 🎨 Renderizar información de orientación
  const renderOrientationInfo = () => {
    if (!orientationData) return null;

    const config = orientationData.config;
    
    return (
      <div className="mt-4 p-3 bg-card rounded-lg border border-border">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${config.color}15`, border: `1px solid ${config.color}` }}
          >
            <Icon name={config.icon} size={16} color={config.color} />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{config.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {config.aspectRatio} • {orientationData.width}x{orientationData.height}
            </p>
          </div>
        </div>
        
        {/* 🖼️ Preview del thumbnail */}
        {previewThumbnail && (
          <div className="flex justify-center mt-3">
            <div className={`
              relative overflow-hidden rounded border border-border
              ${orientationData.orientation === 'vertical' ? 'w-16 h-28' : 
                orientationData.orientation === 'square' ? 'w-20 h-20' : 'w-28 h-16'
              }
            `}>
              <img 
                src={previewThumbnail} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Icon name="Play" size={12} color="white" />
              </div>
            </div>
          </div>
        )}

        {/* 📊 Información técnica */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 rounded px-2 py-1">
            <span className="text-muted-foreground">Tipo: </span>
            <span className="text-foreground font-medium">{config.feedType}</span>
          </div>
          <div className="bg-muted/50 rounded px-2 py-1">
            <span className="text-muted-foreground">Ratio: </span>
            <span className="text-foreground font-medium">{orientationData.aspectRatio}</span>
          </div>
        </div>

        {/* ✨ Mensaje informativo según tipo */}
        <div className="mt-2 text-xs text-center">
          {orientationData.orientation === 'vertical' && (
            <p className="text-accent">📱 Se mostrará en el feed de Reels</p>
          )}
          {orientationData.orientation === 'horizontal' && (
            <p className="text-primary">🖥️ Se mostrará en el feed de Videos</p>
          )}
          {orientationData.orientation === 'square' && (
            <p className="text-success">⬜ Se mostrará en el feed de Videos</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
          ${isDragOver 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }
          ${(isUploading || isAnalyzing) ? 'pointer-events-none opacity-75' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !(isUploading || isAnalyzing) && fileInputRef?.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading || isAnalyzing}
        />

        {/* 🔄 ESTADO: ANALIZANDO ORIENTACIÓN */}
        {isAnalyzing ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
              <Icon name="Search" size={32} color="var(--color-accent)" className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Analizando video...</p>
              <p className="text-sm text-muted-foreground">
                Detectando orientación y generando preview
              </p>
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        ) : 
        
        /* ⬆️ ESTADO: SUBIENDO VIDEO */
        isUploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="Upload" size={32} color="var(--color-primary)" className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Subiendo video...</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{uploadProgress}% completado</p>
            </div>

            {/* 📱 Mostrar info de orientación durante upload */}
            {orientationData && (
              <div className="text-xs text-muted-foreground">
                Subiendo {orientationData.config.displayName.toLowerCase()}
              </div>
            )}
          </div>
        ) : 
        
        /* 📤 ESTADO: ESPERANDO ARCHIVO */
        (
          <div className="space-y-4">
            {/* 🎯 Iconos específicos por orientación si ya hay datos */}
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              {orientationData ? (
                <Icon 
                  name={orientationData.config.icon} 
                  size={32} 
                  color={orientationData.config.color} 
                />
              ) : (
                <Icon name="Video" size={32} color="var(--color-primary)" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">
                {orientationData ? 
                  `${orientationData.config.displayName} seleccionado` :
                  'Arrastra tu video aquí o haz clic para seleccionar'
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                {orientationData ? 
                  'El video se clasificará automáticamente según su orientación' :
                  'Videos verticales aparecerán como Reels, horizontales como Videos'
                }
              </p>
            </div>

            {/* 📋 Formatos soportados */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {supportedFormats?.map((format) => (
                <span
                  key={format}
                  className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md font-mono"
                >
                  {format}
                </span>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Tamaño máximo: {maxSize} • Duración máxima: 60 minutos
            </p>

            {!orientationData && (
              <Button variant="outline" className="mt-4">
                <Icon name="FolderOpen" size={16} className="mr-2" />
                Seleccionar archivo
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 🎬 INFORMACIÓN DE ORIENTACIÓN DETECTADA */}
      {orientationData && !isUploading && !isAnalyzing && renderOrientationInfo()}

      {/* 🎯 TIPS DE ORIENTACIÓN */}
      {!orientationData && !isUploading && !isAnalyzing && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-card rounded-lg border border-border">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="Smartphone" size={16} color="#EF4444" />
              <span className="text-sm font-medium text-foreground">Videos Verticales</span>
            </div>
            <p className="text-xs text-muted-foreground">
              9:16 • Aparecerán como Reels • Ideal para móviles
            </p>
          </div>
          
          <div className="p-3 bg-card rounded-lg border border-border">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="Monitor" size={16} color="#3B82F6" />
              <span className="text-sm font-medium text-foreground">Videos Horizontales</span>
            </div>
            <p className="text-xs text-muted-foreground">
              16:9 • Aparecerán en grid • Ideal para desktop
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploadZone;
