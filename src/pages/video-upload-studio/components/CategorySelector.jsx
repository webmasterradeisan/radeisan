// src/pages/video-upload-studio/components/CategorySelector.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Icon from '../../../components/AppIcon';

/**
 * COMPONENTE DE SELECTOR DE CATEGORÍAS
 * Carga categorías activas desde content_categories y permite selección
 * Integrado con el sistema administrativo de categorías
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
      
      // Fallback: categorías por defecto si falla la carga
      setCategories([
        { id: 'default-1', slug: 'general', name: 'General', icon: '📌', color: '#3b82f6' },
        { id: 'default-2', slug: 'educacion', name: 'Educación', icon: '📚', color: '#10b981' },
        { id: 'default-3', slug: 'entretenimiento', name: 'Entretenimiento', icon: '🎬', color: '#f59e0b' },
        { id: 'default-4', slug: 'tecnologia', name: 'Tecnología', icon: '💻', color: '#8b5cf6' },
        { id: 'default-5', slug: 'negocios', name: 'Negocios', icon: '💼', color: '#ef4444' }
      ]);
    } finally {
      setLoading(false);
    }
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
              {cat.icon && `${cat.icon} `}{cat.name}
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
