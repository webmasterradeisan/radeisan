// src/pages/video-upload-studio/components/CategorySelector.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Icon from '../../../components/AppIcon';

/**
 * COMPONENTE DE SELECTOR DE CATEGORÍAS - VERSIÓN CORREGIDA
 * Carga categorías activas desde content_categories
 * Maneja correctamente emojis vs nombres de iconos
 */
const CategorySelector = ({ value, onChange, required = true, className = '' }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Consultar categorías activas ordenadas
      const { data, error: fetchError } = await supabase
        .from('content_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories(data || []);
      
      console.log('✅ Categorías cargadas:', data?.length || 0);
      
    } catch (err) {
      console.error('❌ Error loading categories:', err);
      setError('Error al cargar categorías');
      
      // Fallback: categorías por defecto con emojis correctos
      setCategories([
        { id: 'default-1', slug: 'general', name: 'General', icon: '📌', color: '#3b82f6' },
        { id: 'default-2', slug: 'educacion', name: 'Educación', icon: '📚', color: '#10b981' },
        { id: 'default-3', slug: 'entretenimiento', name: 'Entretenimiento', icon: '🎬', color: '#f59e0b' },
        { id: 'default-4', slug: 'tecnologia', name: 'Tecnología', icon: '💻', color: '#8b5cf6' },
        { id: 'default-5', slug: 'negocios', name: 'Negocios', icon: '💼', color: '#ef4444' },
        { id: 'default-6', slug: 'gaming', name: 'Gaming', icon: '🎮', color: '#ec4899' },
        { id: 'default-7', slug: 'comedia', name: 'Comedia', icon: '😂', color: '#f59e0b' },
        { id: 'default-8', slug: 'musica', name: 'Música', icon: '🎵', color: '#8b5cf6' },
        { id: 'default-9', slug: 'deportes', name: 'Deportes', icon: '⚽', color: '#10b981' },
        { id: 'default-10', slug: 'viajes', name: 'Viajes', icon: '✈️', color: '#06b6d4' },
        { id: 'default-11', slug: 'cocina', name: 'Cocina', icon: '🍳', color: '#f59e0b' },
        { id: 'default-12', slug: 'arte', name: 'Arte', icon: '🎨', color: '#ec4899' },
        { id: 'default-13', slug: 'ciencia', name: 'Ciencia', icon: '🔬', color: '#10b981' },
        { id: 'default-14', slug: 'salud', name: 'Salud', icon: '🏥', color: '#10b981' },
        { id: 'default-15', slug: 'moda', name: 'Moda', icon: '👗', color: '#ec4899' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar si el "icon" es un emoji o nombre de icono
  const isEmoji = (str) => {
    if (!str) return false;
    // Los emojis tienen 1-4 caracteres y contienen caracteres especiales
    return str.length <= 4 && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(str);
  };

  // Renderizar el icono correctamente
  const renderIcon = (category) => {
    if (!category.icon) return null;

    // Si es emoji, mostrarlo directamente
    if (isEmoji(category.icon)) {
      return category.icon;
    }

    // Si no es emoji, es probable que sea un nombre de icono de Lucide
    // En este caso, no lo mostramos o usamos un emoji por defecto
    return '📄'; // Emoji por defecto
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-foreground">
        Categoría {required && <span className="text-destructive">*</span>}
      </label>
      
      {loading ? (
        // Loading skeleton
        <div className="h-10 bg-muted animate-pulse rounded-lg" />
      ) : error ? (
        // Error state
        <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <Icon name="AlertCircle" size={16} color="var(--color-destructive)" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      ) : (
        // Select con categorías
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        >
          <option value="">Selecciona una categoría</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.slug}>
              {renderIcon(cat)} {cat.name}
            </option>
          ))}
        </select>
      )}
      
      {/* Información de la categoría seleccionada */}
      {value && !loading && (
        <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg">
          {(() => {
            const selectedCat = categories.find(c => c.slug === value);
            if (!selectedCat) return null;
            
            return (
              <>
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: selectedCat.color || '#3b82f6' }}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedCat.description || `Categoría: ${selectedCat.name}`}
                </p>
              </>
            );
          })()}
        </div>
      )}
      
      {/* Información adicional */}
      <p className="text-xs text-muted-foreground">
        Las categorías determinan los puntos que ganarás por este contenido
      </p>
    </div>
  );
};

export default CategorySelector;
