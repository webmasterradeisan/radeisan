import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const PublishConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  videoData,
  isScheduled = false 
}) => {
  const [shareToSocial, setShareToSocial] = useState({
    twitter: false,
    facebook: false,
    instagram: false
  });
  const [customMessage, setCustomMessage] = useState('');

  if (!isOpen) return null;

  const handleSocialToggle = (platform) => {
    setShareToSocial(prev => ({
      ...prev,
      [platform]: !prev?.[platform]
    }));
  };

  const handleConfirm = () => {
    onConfirm({
      shareToSocial,
      customMessage: customMessage?.trim()
    });
  };

  const socialPlatforms = [
    { key: 'twitter', label: 'Twitter', icon: 'Twitter', color: '#1DA1F2' },
    { key: 'facebook', label: 'Facebook', icon: 'Facebook', color: '#4267B2' },
    { key: 'instagram', label: 'Instagram', icon: 'Instagram', color: '#E4405F' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-elevation-3 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-foreground">
              {isScheduled ? 'Confirmar programación' : 'Confirmar publicación'}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Video Preview */}
          <div className="mb-6">
            <div className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
              <div className="w-20 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                {videoData?.thumbnail ? (
                  <img
                    src={videoData?.thumbnail?.url}
                    alt="Miniatura"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Icon name="Video" size={20} color="var(--color-muted-foreground)" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate mb-1">
                  {videoData?.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {videoData?.description}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                  <span>Categoría: {videoData?.category}</span>
                  <span>Visibilidad: {videoData?.visibility}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling Info */}
          {isScheduled && videoData?.scheduledDate && (
            <div className="mb-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
              <div className="flex items-center space-x-2 mb-2">
                <Icon name="Calendar" size={16} color="var(--color-accent)" />
                <span className="font-medium text-foreground">Programado para:</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(videoData.scheduledDate)?.toLocaleString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}

          {/* Points Estimation */}
          <div className="mb-6 p-4 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="Star" size={16} color="var(--color-success)" />
              <span className="font-medium text-foreground">Potencial de puntos</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Estimación basada en tu categoría y configuración
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-success">10-50</span>
              <span className="text-sm text-muted-foreground">puntos por cada 1000 visualizaciones</span>
            </div>
          </div>

          {/* Social Media Sharing */}
          {!isScheduled && (
            <div className="mb-6 space-y-4">
              <h4 className="font-medium text-foreground">Compartir en redes sociales</h4>
              
              <div className="space-y-3">
                {socialPlatforms?.map((platform) => (
                  <label
                    key={platform?.key}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={shareToSocial?.[platform?.key]}
                      onChange={() => handleSocialToggle(platform?.key)}
                      className="sr-only"
                    />
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${shareToSocial?.[platform?.key] 
                        ? 'bg-primary border-primary' :'border-border'
                      }
                    `}>
                      {shareToSocial?.[platform?.key] && (
                        <Icon name="Check" size={12} color="white" />
                      )}
                    </div>
                    <Icon name={platform?.icon} size={20} color={platform?.color} />
                    <span className="text-sm font-medium text-foreground">
                      {platform?.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Custom Message */}
              {Object.values(shareToSocial)?.some(Boolean) && (
                <div className="space-y-2">
                  <Input
                    label="Mensaje personalizado (opcional)"
                    type="text"
                    placeholder="Agrega un mensaje para acompañar tu video..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e?.target?.value)}
                    maxLength={280}
                    description={`${customMessage?.length}/280 caracteres`}
                  />
                </div>
              )}
            </div>
          )}

          {/* Performance Tracking */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="BarChart3" size={16} color="var(--color-primary)" />
              <span className="font-medium text-foreground">Seguimiento de rendimiento</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Podrás ver estadísticas detalladas de tu video en el panel de creador una vez publicado.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              {isScheduled ? 'Programar video' : 'Publicar ahora'}
            </Button>
          </div>

          {/* Terms Notice */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Al publicar, confirmas que tienes los derechos necesarios sobre el contenido y aceptas nuestros{' '}
              <button className="text-primary hover:underline">
                términos de servicio
              </button>{' '}
              y{' '}
              <button className="text-primary hover:underline">
                políticas de contenido
              </button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishConfirmationModal;