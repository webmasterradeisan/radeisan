import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const UploadProgressModal = ({ 
  isOpen, 
  progress, 
  stage, 
  onCancel, 
  onComplete,
  estimatedTime,
  uploadSpeed 
}) => {
  if (!isOpen) return null;

  const stages = [
    { key: 'uploading', label: 'Subiendo archivo', icon: 'Upload' },
    { key: 'processing', label: 'Procesando video', icon: 'Settings' },
    { key: 'generating', label: 'Generando miniaturas', icon: 'Image' },
    { key: 'finalizing', label: 'Finalizando', icon: 'Check' }
  ];

  const currentStageIndex = stages?.findIndex(s => s?.key === stage);
  const currentStage = stages?.[currentStageIndex];

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (bytesPerSecond) => {
    const mbps = bytesPerSecond / (1024 * 1024);
    return `${mbps?.toFixed(1)} MB/s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-elevation-3 w-full max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-foreground">
              Subiendo video
            </h3>
            {stage === 'uploading' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={20} />
              </Button>
            )}
          </div>

          {/* Progress Circle */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="var(--color-muted)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="var(--color-primary)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Current Stage */}
            <div className="flex items-center space-x-2 mb-2">
              <Icon 
                name={currentStage?.icon || 'Upload'} 
                size={16} 
                color="var(--color-primary)"
                className={stage === 'processing' ? 'animate-spin' : ''}
              />
              <span className="text-sm font-medium text-foreground">
                {currentStage?.label || 'Procesando...'}
              </span>
            </div>

            {/* Upload Stats */}
            {stage === 'uploading' && (
              <div className="text-center space-y-1">
                {estimatedTime && (
                  <p className="text-sm text-muted-foreground">
                    Tiempo restante: {formatTime(estimatedTime)}
                  </p>
                )}
                {uploadSpeed && (
                  <p className="text-sm text-muted-foreground">
                    Velocidad: {formatSpeed(uploadSpeed)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stage Progress */}
          <div className="space-y-3 mb-6">
            {stages?.map((stageItem, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;

              return (
                <div
                  key={stageItem?.key}
                  className={`
                    flex items-center space-x-3 p-2 rounded-lg transition-all duration-200
                    ${isCurrent ? 'bg-primary/10' : ''}
                  `}
                >
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${isCompleted 
                      ? 'bg-success text-success-foreground' 
                      : isCurrent 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {isCompleted ? (
                      <Icon name="Check" size={12} />
                    ) : (
                      <Icon 
                        name={stageItem?.icon} 
                        size={12}
                        className={isCurrent && stage === 'processing' ? 'animate-spin' : ''}
                      />
                    )}
                  </div>
                  <span className={`
                    text-sm
                    ${isCompleted 
                      ? 'text-success font-medium' 
                      : isCurrent 
                        ? 'text-foreground font-medium' 
                        : 'text-muted-foreground'
                    }
                  `}>
                    {stageItem?.label}
                  </span>
                  {isCurrent && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Completion Message */}
          {progress === 100 && stage === 'finalizing' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                <Icon name="CheckCircle" size={24} color="var(--color-success)" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  ¡Video subido exitosamente!
                </h4>
                <p className="text-sm text-muted-foreground">
                  Tu video está siendo procesado y estará disponible pronto
                </p>
              </div>
              <Button onClick={onComplete} className="w-full">
                Continuar
              </Button>
            </div>
          )}

          {/* Tips */}
          {stage === 'uploading' && progress < 100 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Icon name="Lightbulb" size={16} color="var(--color-accent)" className="mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Consejo:</strong> Mantén esta ventana abierta para asegurar que la subida se complete correctamente.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProgressModal;