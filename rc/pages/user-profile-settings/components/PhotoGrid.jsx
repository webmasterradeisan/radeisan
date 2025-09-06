// src/pages/user-profile-settings/components/PhotoGrid.jsx
// Galería de fotos para el perfil del usuario
import React, { useState, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import PhotoLightbox from './PhotoLightbox';

// ===============================
// CONFIGURACIONES
// ===============================

const GRID_LAYOUTS = {
  masonry: { label: 'Mosaico', icon: 'Grid3X3', cols: 'auto-fit' },
  grid: { label: 'Cuadrícula', icon: 'Grid2X2', cols: '3' },
  list: { label: 'Lista', icon: 'List', cols: '1' }
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes', icon: 'Clock' },
  { value: 'oldest', label: 'Más antiguas', icon: 'History' },
  { value: 'popular', label: 'Más populares', icon: 'Heart' },
  { value: 'views', label: 'Más vistas', icon: 'Eye' }
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todas', count: null },
  { value: 'published', label: 'Publicadas', count: null },
  { value: 'draft', label: 'Borradores', count: null },
  { value: 'private', label: 'Privadas', count: null }
];

// ===============================
// COMPONENTE DE FOTO INDIVIDUAL
// ===============================

const PhotoCard = ({ 
  photo, 
  layout = 'grid', 
  onSelect, 
  onLike, 
  onEdit, 
  onDelete,
  showActions = true,
  isOwner = false 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = () => setImageError(true);

  // Formatear estadísticas
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div 
      className={`
        group relative bg-card rounded-lg overflow-hidden border transition-all duration-200
        hover:shadow-lg hover:border-primary/20 cursor-pointer
        ${layout === 'list' ? 'flex' : ''}
      `}
      onClick={() => onSelect?.(photo)}
    >
      
      {/* Imagen */}
      <div className={`
        relative bg-muted
        ${layout === 'list' ? 'w-48 flex-shrink-0' : 'aspect-square'}
        ${layout === 'masonry' ? 'aspect-auto' : ''}
      `}>
        
        {/* Estado de carga */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Error de imagen */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Icon name="ImageOff" size={32} className="text-muted-foreground" />
          </div>
        )}
        
        {/* Imagen principal */}
        {!imageError && (
          <img
            src={photo.thumbnail_url || photo.image_url}
            alt={photo.caption || 'Foto'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`
              w-full h-full object-cover transition-transform duration-200
              group-hover:scale-105
              ${!imageLoaded ? 'opacity-0' : 'opacity-100'}
            `}
          />
        )}

        {/* Overlay con estadísticas */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center space-x-4 text-white">
              
              {/* Likes */}
              <div className="flex items-center space-x-1">
                <Icon name="Heart" size={16} />
                <span className="text-sm font-medium">
                  {formatNumber(photo.likes_count || 0)}
                </span>
              </div>
              
              {/* Comentarios */}
              <div className="flex items-center space-x-1">
                <Icon name="MessageCircle" size={16} />
                <span className="text-sm font-medium">
                  {formatNumber(photo.comments_count || 0)}
                </span>
              </div>
              
              {/* Vistas */}
              <div className="flex items-center space-x-1">
                <Icon name="Eye" size={16} />
                <span className="text-sm font-medium">
                  {formatNumber(photo.views_count || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores de estado */}
        <div className="absolute top-2 left-2">
          {!photo.is_published && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
              <Icon name="Clock" size={12} className="mr-1" />
              Borrador
            </span>
          )}
          {photo.privacy === 'private' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 ml-1">
              <Icon name="Lock" size={12} className="mr-1" />
              Privada
            </span>
          )}
        </div>

        {/* Acciones (solo para el propietario) */}
        {isOwner && showActions && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(photo);
                }}
                className="h-8 w-8 p-0"
              >
                <Icon name="Edit2" size={14} />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(photo);
                }}
                className="h-8 w-8 p-0"
              >
                <Icon name="Trash2" size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Información adicional (para layout de lista) */}
      {layout === 'list' && (
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-foreground line-clamp-1">
              {photo.caption || 'Sin título'}
            </h3>
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {formatDate(photo.created_at)}
            </span>
          </div>
          
          {photo.caption && photo.caption.length > 50 && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {photo.caption}
            </p>
          )}
          
          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {photo.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary/10 text-primary"
                >
                  #{tag}
                </span>
              ))}
              {photo.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{photo.tags.length - 3} más
                </span>
              )}
            </div>
          )}
          
          {/* Estadísticas en lista */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Icon name="Heart" size={14} />
              <span>{formatNumber(photo.likes_count || 0)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Icon name="MessageCircle" size={14} />
              <span>{formatNumber(photo.comments_count || 0)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Icon name="Eye" size={14} />
              <span>{formatNumber(photo.views_count || 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const PhotoGrid = ({ 
  photos = [], 
  loading = false,
  onPhotoSelect,
  onPhotoLike,
  onPhotoEdit,
  onPhotoDelete,
  isOwner = false,
  showUploadButton = true,
  onUploadClick 
}) => {
  const [layout, setLayout] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [filter, setFilter] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Filtrar y ordenar fotos
  const processedPhotos = React.useMemo(() => {
    let filtered = [...photos];
    
    // Aplicar filtros
    switch (filter) {
      case 'published':
        filtered = filtered.filter(photo => photo.is_published);
        break;
      case 'draft':
        filtered = filtered.filter(photo => !photo.is_published);
        break;
      case 'private':
        filtered = filtered.filter(photo => photo.privacy === 'private');
        break;
      default:
        break;
    }
    
    // Aplicar ordenamiento
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        break;
      case 'views':
        filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      default:
        break;
    }
    
    return filtered;
  }, [photos, filter, sortBy]);

  // Manejar selección de foto
  const handlePhotoSelect = useCallback((photo) => {
    setSelectedPhoto(photo);
    setShowLightbox(true);
    onPhotoSelect?.(photo);
  }, [onPhotoSelect]);

  // Cerrar lightbox
  const handleCloseLightbox = useCallback(() => {
    setShowLightbox(false);
    setSelectedPhoto(null);
  }, []);

  // Estado vacío
  if (!loading && photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="ImageOff" size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isOwner ? 'Aún no has subido fotos' : 'No hay fotos publicadas'}
        </h3>
        <p className="text-muted-foreground mb-6">
          {isOwner 
            ? 'Comparte tus mejores momentos con la comunidad'
            : 'Este usuario no ha compartido fotos aún'
          }
        </p>
        {isOwner && showUploadButton && (
          <Button onClick={onUploadClick}>
            <Icon name="Plus" size={16} className="mr-2" />
            Subir tu primera foto
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Filtros y ordenamiento */}
        <div className="flex items-center space-x-4">
          
          {/* Filtro */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border rounded px-3 py-2 bg-background min-w-[120px]"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Ordenamiento */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border rounded px-3 py-2 bg-background min-w-[140px]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Layout y acciones */}
        <div className="flex items-center space-x-2">
          
          {/* Selector de layout */}
          <div className="flex items-center space-x-1 border rounded p-1">
            {Object.entries(GRID_LAYOUTS).map(([key, layoutOption]) => (
              <Button
                key={key}
                variant={layout === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setLayout(key)}
                className="h-8 w-8 p-0"
                title={layoutOption.label}
              >
                <Icon name={layoutOption.icon} size={14} />
              </Button>
            ))}
          </div>
          
          {/* Botón de subir */}
          {isOwner && showUploadButton && (
            <Button size="sm" onClick={onUploadClick}>
              <Icon name="Plus" size={16} className="mr-2" />
              Subir fotos
            </Button>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {processedPhotos.length} foto{processedPhotos.length !== 1 ? 's' : ''} 
          {filter !== 'all' && ` (${FILTER_OPTIONS.find(f => f.value === filter)?.label.toLowerCase()})`}
        </span>
        {processedPhotos.length !== photos.length && (
          <span>
            de {photos.length} total{photos.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Grid de fotos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className={`
          ${layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : ''}
          ${layout === 'masonry' ? 'columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4' : ''}
          ${layout === 'list' ? 'space-y-4' : ''}
        `}>
          {processedPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              layout={layout}
              onSelect={handlePhotoSelect}
              onLike={onPhotoLike}
              onEdit={onPhotoEdit}
              onDelete={onPhotoDelete}
              isOwner={isOwner}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={processedPhotos}
          onClose={handleCloseLightbox}
          onNext={(nextPhoto) => setSelectedPhoto(nextPhoto)}
          onPrev={(prevPhoto) => setSelectedPhoto(prevPhoto)}
          onLike={onPhotoLike}
          onEdit={onPhotoEdit}
          onDelete={onPhotoDelete}
          isOwner={isOwner}
        />
      )}
    </div>
  );
};

export default PhotoGrid;
