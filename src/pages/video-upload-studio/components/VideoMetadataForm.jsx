import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const VideoMetadataForm = ({ formData, onChange, onSubmit, isSubmitting }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const categories = [
    { value: 'entertainment', label: 'Entretenimiento' },
    { value: 'education', label: 'Educación' },
    { value: 'music', label: 'Música' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'sports', label: 'Deportes' },
    { value: 'technology', label: 'Tecnología' },
    { value: 'cooking', label: 'Cocina' },
    { value: 'travel', label: 'Viajes' },
    { value: 'fashion', label: 'Moda' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'art', label: 'Arte' },
    { value: 'comedy', label: 'Comedia' }
  ];

  const visibilityOptions = [
    { value: 'public', label: 'Público', description: 'Visible para todos' },
    { value: 'unlisted', label: 'No listado', description: 'Solo con enlace' },
    { value: 'private', label: 'Privado', description: 'Solo para ti' }
  ];

  const monetizationOptions = [
    { value: 'enabled', label: 'Habilitada', description: 'Ganar puntos por visualizaciones' },
    { value: 'disabled', label: 'Deshabilitada', description: 'Sin monetización' }
  ];

  const handleInputChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  const handleTagAdd = (e) => {
    if (e?.key === 'Enter' || e?.key === ',') {
      e?.preventDefault();
      const tag = tagInput?.trim();
      if (tag && !formData?.tags?.includes(tag)) {
        handleInputChange('tags', [...formData?.tags, tag]);
        setTagInput('');
      }
    }
  };

  const handleTagRemove = (tagToRemove) => {
    handleInputChange('tags', formData?.tags?.filter(tag => tag !== tagToRemove));
  };

  const suggestedTags = [
    'viral', 'trending', 'tutorial', 'review', 'unboxing', 'vlog', 
    'challenge', 'reaction', 'tips', 'howto', 'lifestyle', 'daily'
  ];

  const calculatePointsPotential = () => {
    let basePoints = 10;
    
    // Category multiplier
    const categoryMultipliers = {
      'education': 1.5,
      'technology': 1.3,
      'entertainment': 1.2,
      'music': 1.1,
      'gaming': 1.0
    };
    
    const multiplier = categoryMultipliers?.[formData?.category] || 1.0;
    const estimatedPoints = Math.round(basePoints * multiplier);
    
    return {
      min: estimatedPoints,
      max: estimatedPoints * 5
    };
  };

  const pointsPotential = calculatePointsPotential();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Información básica</h3>
        
        <Input
          label="Título del video"
          type="text"
          placeholder="Escribe un título atractivo..."
          value={formData?.title}
          onChange={(e) => handleInputChange('title', e?.target?.value)}
          required
          maxLength={100}
          description={`${formData?.title?.length}/100 caracteres`}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Descripción
          </label>
          <textarea
            placeholder="Describe tu video, incluye información relevante para tu audiencia..."
            value={formData?.description}
            onChange={(e) => handleInputChange('description', e?.target?.value)}
            rows={4}
            maxLength={5000}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {formData?.description?.length}/5000 caracteres
          </p>
        </div>

        <Select
          label="Categoría"
          options={categories}
          value={formData?.category}
          onChange={(value) => handleInputChange('category', value)}
          placeholder="Selecciona una categoría"
          required
        />

        <Select
          label="Visibilidad"
          options={visibilityOptions}
          value={formData?.visibility}
          onChange={(value) => handleInputChange('visibility', value)}
          required
        />
      </div>
      {/* Tags Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground">Etiquetas</h4>
        
        <div className="space-y-2">
          <Input
            label="Agregar etiquetas"
            type="text"
            placeholder="Escribe una etiqueta y presiona Enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e?.target?.value)}
            onKeyDown={handleTagAdd}
            description="Presiona Enter o coma para agregar etiquetas"
          />
          
          {/* Current Tags */}
          {formData?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData?.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-md"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleTagRemove(tag)}
                    className="hover:text-primary/70"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Suggested Tags */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Etiquetas sugeridas:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTags?.filter(tag => !formData?.tags?.includes(tag))?.slice(0, 6)?.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInputChange('tags', [...formData?.tags, tag])}
                    className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
      {/* Points Potential */}
      <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="Star" size={16} color="var(--color-accent)" />
          <h4 className="font-medium text-foreground">Potencial de puntos</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          Basado en la categoría y configuración de tu video
        </p>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-lg font-bold text-accent">{pointsPotential?.min}</div>
            <div className="text-xs text-muted-foreground">Mínimo</div>
          </div>
          <div className="text-muted-foreground">-</div>
          <div className="text-center">
            <div className="text-lg font-bold text-accent">{pointsPotential?.max}</div>
            <div className="text-xs text-muted-foreground">Máximo</div>
          </div>
          <div className="text-xs text-muted-foreground">
            puntos por cada 1000 visualizaciones
          </div>
        </div>
      </div>
      {/* Advanced Options */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2"
        >
          <Icon name={showAdvanced ? "ChevronUp" : "ChevronDown"} size={16} />
          <span>Opciones avanzadas</span>
        </Button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-border">
            <Select
              label="Monetización"
              options={monetizationOptions}
              value={formData?.monetization}
              onChange={(value) => handleInputChange('monetization', value)}
            />

            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Configuración de comentarios
              </label>
              <Checkbox
                label="Permitir comentarios"
                checked={formData?.allowComments}
                onChange={(e) => handleInputChange('allowComments', e?.target?.checked)}
              />
              <Checkbox
                label="Permitir likes/dislikes"
                checked={formData?.allowRatings}
                onChange={(e) => handleInputChange('allowRatings', e?.target?.checked)}
              />
            </div>

            <Input
              label="Programar publicación"
              type="datetime-local"
              value={formData?.scheduledDate}
              onChange={(e) => handleInputChange('scheduledDate', e?.target?.value)}
              description="Deja vacío para publicar inmediatamente"
            />
          </div>
        )}
      </div>
      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isSubmitting}
        >
          Guardar como borrador
        </Button>
        <Button
          type="submit"
          className="flex-1"
          loading={isSubmitting}
          disabled={!formData?.title || !formData?.category}
        >
          {formData?.scheduledDate ? 'Programar publicación' : 'Publicar video'}
        </Button>
      </div>
    </form>
  );
};

export default VideoMetadataForm;