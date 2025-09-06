// src/pages/user-profile-settings/components/PhotoLightbox.jsx
// Modal para visualizar fotos en tamaño completo con navegación
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// ===============================
// UTILIDADES
// ===============================

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const PhotoLightbox = ({ 
  photo, 
  photos = [], 
  onClose, 
  onNext, 
  onPrev,
  onLike,
  onEdit,
  onDelete,
  isOwner = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Encontrar índice actual
  useEffect(() => {
    const index = photos.findIndex(p => p.id === photo.id);
    setCurrentIndex(index >= 0 ? index : 0);
  }, [photo, photos]);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'i':
        case 'I':
          setShowInfo(!showInfo);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showInfo, onClose]);

  // Resetear estado de imagen cuando cambia
  useEffect(() => {
    setImageLoaded(false);
  }, [photo]);

  // Navegación
  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      const nextPhoto = photos[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      onNext?.(nextPhoto);
    }
  }, [currentIndex, photos, onNext]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevPhoto = photos[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      onPrev?.(prevPhoto);
    }
  }, [currentIndex, photos, onPrev]);

  // Acciones
  const handleLike = useCallback(() => {
    setIsLiked(!isLiked);
    onLike?.(photo);
  }, [isLiked, photo, onLike]);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = photo.image_url;
    link.download = `foto_${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [photo]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: photo.caption || 'Foto compartida',
          text: photo.caption || 'Mira esta foto',
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copiar URL al portapapeles
      try {
        await navigator.clipboard.writeText(window.location.href);
        // TODO: Mostrar toast de éxito
      } catch (error) {
        console.log('Error copying to clipboard:', error);
      }
    }
  }, [photo]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      
      {/* Overlay para cerrar */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
      />

      {/* Contenido principal */}
      <div className="relative w-full h-full flex flex-col">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between p-4">
            
            {/* Info básica */}
            <div className="flex items-center space-x-3 text-white">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Icon name="User" size={16} />
              </div>
              <div>
                <p className="font-medium">
                  {photo.user?.name || 'Usuario'}
                </p>
                <p className="text-sm opacity-75">
                  {formatDate(photo.created_at)}
                </p>
              </div>
            </div>

            {/* Acciones del header */}
            <div className="flex items-center space-x-2">
              
              {/* Información */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfo(!showInfo)}
                className="text-white hover:bg-white/20"
              >
                <Icon name="Info" size={16} />
              </Button>

              {/* Contador */}
              {photos.length > 1 && (
                <span className="text-white text-sm px-3 py-1 bg-white/20 rounded-full">
                  {currentIndex + 1} de {photos.length}
                </span>
              )}
              
              {/* Cerrar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <Icon name="X" size={20} />
              </Button>
            </div>
          </div>
        </div>

        {/* Imagen principal */}
        <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-20">
          
          {/* Navegación izquierda */}
          {photos.length > 1 && currentIndex > 0 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
            >
              <Icon name="ChevronLeft" size={24} />
            </Button>
          )}

          {/* Navegación derecha */}
          {photos.length > 1 && currentIndex < photos.length - 1 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
            >
              <Icon name="ChevronRight" size={24} />
            </Button>
          )}

          {/* Imagen */}
          <div className="relative max-w-full max-h-full">
            
            {/* Loading */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            <img
              src={photo.image_url}
              alt={photo.caption || 'Foto'}
              onLoad={() => setImageLoaded(true)}
              className={`
                max-w-full max-h-full object-contain transition-opacity duration-200
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              style={{ maxHeight: 'calc(100vh - 160px)' }}
            />
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent">
          <div className="p-4">
            
            {/* Acciones principales */}
            <div className="flex items-center justify-between">
              
              {/* Acciones sociales */}
              <div className="flex items-center space-x-4">
                
                {/* Like */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`text-white hover:bg-white/20 ${isLiked ? 'text-red-400' : ''}`}
                >
                  <Icon name={isLiked ? "Heart" : "Heart"} size={20} className={isLiked ? 'fill-current' : ''} />
                  <span className="ml-2">{formatNumber(photo.likes_count || 0)}</span>
                </Button>
                
                {/* Comentarios */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Icon name="MessageCircle" size={20} />
                  <span className="ml-2">{formatNumber(photo.comments_count || 0)}</span>
                </Button>
                
                {/* Compartir */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="text-white hover:bg-white/20"
                >
                  <Icon name="Share2" size={20} />
                </Button>
              </div>

              {/* Acciones del propietario */}
              <div className="flex items-center space-x-2">
                
                {/* Descargar */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20"
                >
                  <Icon name="Download" size={20} />
                </Button>
                
                {/* Acciones de propietario */}
                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.(photo)}
                      className="text-white hover:bg-white/20"
                    >
                      <Icon name="Edit2" size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete?.(photo)}
                      className="text-white hover:bg-white/20"
                    >
                      <Icon name="Trash2" size={20} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panel de información lateral */}
        {showInfo && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l shadow-xl overflow-y-auto z-20">
            <div className="p-6 space-y-6">
              
              {/* Header del panel */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Información de la foto</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfo(false)}
                >
                  <Icon name="X" size={16} />
                </Button>
              </div>

              {/* Descripción */}
              {photo.caption && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Descripción</h4>
                  <p className="text-muted-foreground">{photo.caption}</p>
                </div>
              )}

              {/* Tags */}
              {photo.tags && photo.tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {photo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary/10 text-primary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Estadísticas */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Estadísticas</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Likes</span>
                    <span className="font-medium">{formatNumber(photo.likes_count || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Comentarios</span>
                    <span className="font-medium">{formatNumber(photo.comments_count || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Visualizaciones</span>
                    <span className="font-medium">{formatNumber(photo.views_count || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Metadatos técnicos */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Detalles</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Categoría</span>
                    <span className="font-medium capitalize">{photo.category || 'General'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Formato</span>
                    <span className="font-medium capitalize">{photo.aspect_ratio || 'Original'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estado</span>
                    <span className={`font-medium ${photo.is_published ? 'text-green-600' : 'text-yellow-600'}`}>
                      {photo.is_published ? 'Publicada' : 'Borrador'}
                    </span>
                  </div>
                  {photo.original_width && photo.original_height && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dimensiones</span>
                      <span className="font-medium">
                        {photo.original_width}×{photo.original_height}px
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ubicación */}
              {photo.location && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Ubicación</h4>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Icon name="MapPin" size={16} />
                    <span>{photo.location}</span>
                  </div>
                </div>
              )}

              {/* Fecha completa */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Fecha de publicación</h4>
                <p className="text-muted-foreground">{formatDate(photo.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indicador de carga de navegación */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        {photos.length > 1 && (
          <div className="flex items-center space-x-1 bg-black/50 rounded-full px-3 py-2">
            {photos.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoLightbox;
