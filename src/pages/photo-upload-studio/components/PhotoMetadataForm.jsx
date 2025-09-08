// src/pages/photo-upload-studio/components/PhotoMetadataForm.jsx
// Formulario para metadatos, categorías y tags de fotos
import React, { useState, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// ===============================
// CONFIGURACIONES Y CONSTANTES
// ===============================

const PHOTO_CATEGORIES = [
  { id: 'general', label: 'General', icon: 'Image', description: 'Fotos variadas sin categoría específica' },
  { id: 'nature', label: 'Naturaleza', icon: 'TreePine', description: 'Paisajes, plantas, animales salvajes' },
  { id: 'portrait', label: 'Retratos', icon: 'User', description: 'Fotos de personas, selfies, grupos' },
  { id: 'lifestyle', label: 'Estilo de vida', icon: 'Heart', description: 'Momentos cotidianos, hobbies' },
  { id: 'travel', label: 'Viajes', icon: 'MapPin', description: 'Destinos, vacaciones, aventuras' },
  { id: 'food', label: 'Comida', icon: 'UtensilsCrossed', description: 'Gastronomía, recetas, restaurantes' },
  { id: 'art', label: 'Arte', icon: 'Palette', description: 'Obras de arte, creatividad, diseño' },
  { id: 'technology', label: 'Tecnología', icon: 'Smartphone', description: 'Gadgets, innovación, digital' },
  { id: 'sports', label: 'Deportes', icon: 'Trophy', description: 'Actividades deportivas, fitness' },
  { id: 'animals', label: 'Animales', icon: 'Heart', description: 'Mascotas, fauna, vida animal' },
  { id: 'architecture', label: 'Arquitectura', icon: 'Building', description: 'Edificios, estructuras, diseño urbano' },
  { id: 'events', label: 'Eventos', icon: 'Calendar', description: 'Celebraciones, conciertos, fiestas' },
  { id: 'fashion', label: 'Moda', icon: 'Shirt', description: 'Ropa, accesorios, tendencias' },
  { id: 'business', label: 'Negocios', icon: 'Briefcase', description: 'Trabajo, oficinas, profesional' },
  { id: 'other', label: 'Otros', icon: 'MoreHorizontal', description: 'Categorías no especificadas' }
];

const POPULAR_TAGS = [
  'photography', 'photooftheday', 'beautiful', 'nature', 'life',
  'style', 'art', 'design', 'travel', 'food', 'instagood', 'love',
  'amazing', 'cool', 'fun', 'happy', 'awesome', 'perfect', 'best',
  'moment', 'memories', 'inspiration', 'creative', 'original'
];

const PRIVACY_OPTIONS = [
  { 
    id: 'public', 
    label: 'Público', 
    description: 'Visible para todos los usuarios',
    icon: 'Globe' 
  },
  { 
    id: 'followers', 
    label: 'Solo seguidores', 
    description: 'Solo visible para quienes te siguen',
    icon: 'Users' 
  },
  { 
    id: 'private', 
    label: 'Privado', 
    description: 'Solo visible para ti',
    icon: 'Lock' 
  }
];

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const PhotoMetadataForm = ({ 
  metadata = {}, 
  onChange, 
  categories = PHOTO_CATEGORIES,
  onSaveDraft,
  onPublish,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    caption: metadata.caption || '',
    category: metadata.category || 'general',
    tags: metadata.tags || [],
    privacy: metadata.privacy || 'public',
    allowComments: metadata.allowComments !== false,
    allowDownload: metadata.allowDownload || false,
    showLocation: metadata.showLocation || false,
    location: metadata.location || '',
    publish: metadata.publish !== false
  });

  const [currentTag, setCurrentTag] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Actualizar datos
  const updateFormData = useCallback((updates) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onChange?.(newData);
  }, [formData, onChange]);

  // Manejar cambios de input
  const handleInputChange = (field, value) => {
    updateFormData({ [field]: value });
  };

  // Manejar tags
  const addTag = (tag) => {
    const cleanTag = tag.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (cleanTag && !formData.tags.includes(cleanTag) && formData.tags.length < 20) {
      updateFormData({ tags: [...formData.tags, cleanTag] });
    }
    setCurrentTag('');
  };

  const removeTag = (tagToRemove) => {
    updateFormData({ 
      tags: formData.tags.filter(tag => tag !== tagToRemove) 
    });
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(currentTag);
    }
  };

  // Categorías visibles
  const visibleCategories = showAllCategories 
    ? categories 
    : categories.slice(0, 8);

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Información de las fotos
        </h2>
        <p className="text-sm text-muted-foreground">
          Añade información para que más personas puedan descubrir tus fotos
        </p>
      </div>

      {/* Formulario Principal */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Descripción */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Descripción
            </label>
            <textarea
              placeholder="Cuenta la historia detrás de tus fotos..."
              value={formData.caption}
              onChange={(e) => handleInputChange('caption', e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Una buena descripción ayuda a que más personas encuentren tus fotos
              </p>
              <span className="text-xs text-muted-foreground">
                {formData.caption.length}/1000
              </span>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Categoría
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleInputChange('category', category.id)}
                  className={`
                    p-3 rounded-lg border text-left transition-all hover:border-primary/50
                    ${formData.category === category.id 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Icon name={category.icon} size={16} />
                    <span className="font-medium text-sm">{category.label}</span>
                  </div>
                  <p className="text-xs opacity-75 line-clamp-2">
                    {category.description}
                  </p>
                </button>
              ))}
            </div>
            
            {categories.length > 8 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="mt-3"
              >
                {showAllCategories ? 'Ver menos' : `Ver todas (${categories.length})`}
                <Icon 
                  name={showAllCategories ? "ChevronUp" : "ChevronDown"} 
                  size={16} 
                  className="ml-2" 
                />
              </Button>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Tags
            </label>
            
            {/* Input de Tags */}
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="text"
                placeholder="Añadir tag..."
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                maxLength={30}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addTag(currentTag)}
                disabled={!currentTag.trim()}
              >
                <Icon name="Plus" size={16} />
              </Button>
            </div>

            {/* Tags Actuales */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 hover:text-destructive"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tags Populares */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tags populares:</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    disabled={formData.tags.includes(tag)}
                    className={`
                      px-2 py-1 rounded text-xs transition-colors
                      ${formData.tags.includes(tag)
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-muted hover:bg-primary hover:text-primary-foreground'
                      }
                    `}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Máximo 20 tags. Usa palabras relevantes para que más personas encuentren tus fotos.
            </p>
          </div>

          {/* Ubicación */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="showLocation"
                checked={formData.showLocation}
                onChange={(e) => handleInputChange('showLocation', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showLocation" className="text-sm font-medium text-foreground">
                Añadir ubicación
              </label>
            </div>
            
            {formData.showLocation && (
              <input
                type="text"
                placeholder="¿Dónde tomaste estas fotos?"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground mt-2"
              />
            )}
          </div>
        </div>

        {/* Panel Lateral */}
        <div className="space-y-6">
          
          {/* Configuración de Privacidad */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center">
              <Icon name="Shield" size={16} className="mr-2" />
              Privacidad
            </h3>
            <div className="space-y-3">
              {PRIVACY_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`
                    flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${formData.privacy === option.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value={option.id}
                    checked={formData.privacy === option.id}
                    onChange={(e) => handleInputChange('privacy', e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon name={option.icon} size={14} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Configuraciones Adicionales */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center">
              <Icon name="Settings" size={16} className="mr-2" />
              Configuraciones
            </h3>
            <div className="space-y-3">
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-foreground">Permitir comentarios</span>
                <input
                  type="checkbox"
                  checked={formData.allowComments}
                  onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                  className="rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-foreground">Permitir descarga</span>
                <input
                  type="checkbox"
                  checked={formData.allowDownload}
                  onChange={(e) => handleInputChange('allowDownload', e.target.checked)}
                  className="rounded"
                />
              </label>
            </div>
          </div>

          {/* Estadísticas Previstas */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center">
              <Icon name="TrendingUp" size={16} className="mr-2 text-blue-500" />
              Potencial de alcance
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Categoría:</span>
                <span className="font-medium">
                  {categories.find(c => c.id === formData.category)?.label || 'General'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tags:</span>
                <span className="font-medium">{formData.tags.length}/20</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Descripción:</span>
                <span className="font-medium">
                  {formData.caption.length > 0 ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
            
            {/* Score Visual */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Optimización SEO</span>
                <span className="font-medium">
                  {Math.round(
                    (formData.caption.length > 0 ? 25 : 0) +
                    (formData.tags.length * 3.75) +
                    (formData.category !== 'general' ? 25 : 0)
                  )}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.round(
                      (formData.caption.length > 0 ? 25 : 0) +
                      (formData.tags.length * 3.75) +
                      (formData.category !== 'general' ? 25 : 0)
                    )}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Finales */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Info" size={16} />
          <span>
            Las fotos se optimizarán automáticamente para mejor rendimiento
          </span>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={onSaveDraft}
            disabled={loading}
          >
            <Icon name="Save" size={16} className="mr-2" />
            Guardar Borrador
          </Button>
          <Button 
            onClick={onPublish}
            disabled={loading || !formData.category}
          >
            {loading ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Icon name="Upload" size={16} className="mr-2" />
                Publicar Fotos
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PhotoMetadataForm;
