import React, { useState, useRef, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VideoUploadZone = ({ onFileSelect, uploadProgress, isUploading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
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
      onFileSelect(videoFile);
    }
  }, [onFileSelect]);

  const handleFileInput = (e) => {
    const file = e?.target?.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const supportedFormats = ['MP4', 'MOV', 'AVI', 'MKV', 'WebM'];
  const maxSize = '2GB';

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
          ${isDragOver 
            ? 'border-primary bg-primary/5 scale-105' :'border-border hover:border-primary/50 hover:bg-muted/30'
          }
          ${isUploading ? 'pointer-events-none opacity-75' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef?.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="Video" size={32} color="var(--color-primary)" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">
                Arrastra tu video aquí o haz clic para seleccionar
              </h3>
              <p className="text-sm text-muted-foreground">
                Sube videos cortos o largos para compartir con tu audiencia
              </p>
            </div>

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

            <Button variant="outline" className="mt-4">
              <Icon name="FolderOpen" size={16} className="mr-2" />
              Seleccionar archivo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploadZone;