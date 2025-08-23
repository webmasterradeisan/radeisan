import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const FilterSidebar = ({ 
  filters, 
  onFiltersChange, 
  isOpen, 
  onClose,
  className = '' 
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const categories = [
    { id: 'electronics', label: 'Electrónicos', count: 156 },
    { id: 'fashion', label: 'Moda y Accesorios', count: 243 },
    { id: 'home', label: 'Hogar y Jardín', count: 89 },
    { id: 'sports', label: 'Deportes y Fitness', count: 67 },
    { id: 'books', label: 'Libros y Medios', count: 134 },
    { id: 'art', label: 'Arte y Manualidades', count: 78 },
    { id: 'automotive', label: 'Automotriz', count: 45 },
    { id: 'beauty', label: 'Belleza y Cuidado', count: 92 }
  ];

  const businessTypes = [
    { id: 'individual', label: 'Vendedor Individual', count: 324 },
    { id: 'small_business', label: 'Pequeño Negocio', count: 187 },
    { id: 'verified_store', label: 'Tienda Verificada', count: 98 },
    { id: 'artist', label: 'Artista/Creador', count: 156 }
  ];

  const locations = [
    { id: 'madrid', label: 'Madrid', count: 234 },
    { id: 'barcelona', label: 'Barcelona', count: 198 },
    { id: 'valencia', label: 'Valencia', count: 87 },
    { id: 'sevilla', label: 'Sevilla', count: 76 },
    { id: 'bilbao', label: 'Bilbao', count: 54 },
    { id: 'malaga', label: 'Málaga', count: 43 }
  ];

  const conditions = [
    { id: 'new', label: 'Nuevo', count: 456 },
    { id: 'like_new', label: 'Como nuevo', count: 234 },
    { id: 'good', label: 'Buen estado', count: 187 },
    { id: 'fair', label: 'Estado regular', count: 89 }
  ];

  const handleFilterChange = (filterType, value, checked) => {
    const newFilters = { ...localFilters };
    
    if (filterType === 'priceRange') {
      newFilters.priceRange = value;
    } else {
      if (!newFilters?.[filterType]) {
        newFilters[filterType] = [];
      }
      
      if (checked) {
        newFilters[filterType] = [...newFilters?.[filterType], value];
      } else {
        newFilters[filterType] = newFilters?.[filterType]?.filter(item => item !== value);
      }
    }
    
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    if (onClose) onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      categories: [],
      businessTypes: [],
      locations: [],
      conditions: [],
      priceRange: { min: '', max: '' },
      availability: []
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    Object.keys(localFilters)?.forEach(key => {
      if (key === 'priceRange') {
        if (localFilters?.[key]?.min || localFilters?.[key]?.max) count++;
      } else if (Array.isArray(localFilters?.[key])) {
        count += localFilters?.[key]?.length;
      }
    });
    return count;
  };

  const FilterSection = ({ title, items, filterType, icon }) => (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-3">
        <Icon name={icon} size={16} color="var(--color-muted-foreground)" />
        <h3 className="font-medium text-foreground">{title}</h3>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items?.map((item) => (
          <div key={item?.id} className="flex items-center justify-between">
            <Checkbox
              label={item?.label}
              checked={localFilters?.[filterType]?.includes(item?.id) || false}
              onChange={(e) => handleFilterChange(filterType, item?.id, e?.target?.checked)}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground ml-2">
              ({item?.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Icon name="Filter" size={20} />
          <h2 className="text-lg font-bold">Filtros</h2>
          {getActiveFiltersCount() > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        )}
      </div>

      {/* Filters Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Price Range */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="Euro" size={16} color="var(--color-muted-foreground)" />
            <h3 className="font-medium text-foreground">Rango de precio</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Mín"
              value={localFilters?.priceRange?.min || ''}
              onChange={(e) => handleFilterChange('priceRange', 
                { ...localFilters?.priceRange, min: e?.target?.value }
              )}
            />
            <Input
              type="number"
              placeholder="Máx"
              value={localFilters?.priceRange?.max || ''}
              onChange={(e) => handleFilterChange('priceRange', 
                { ...localFilters?.priceRange, max: e?.target?.value }
              )}
            />
          </div>
        </div>

        {/* Categories */}
        <FilterSection
          title="Categorías"
          items={categories}
          filterType="categories"
          icon="Grid3X3"
        />

        {/* Business Types */}
        <FilterSection
          title="Tipo de vendedor"
          items={businessTypes}
          filterType="businessTypes"
          icon="Store"
        />

        {/* Locations */}
        <FilterSection
          title="Ubicación"
          items={locations}
          filterType="locations"
          icon="MapPin"
        />

        {/* Condition */}
        <FilterSection
          title="Estado del producto"
          items={conditions}
          filterType="conditions"
          icon="Package"
        />

        {/* Availability */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="Clock" size={16} color="var(--color-muted-foreground)" />
            <h3 className="font-medium text-foreground">Disponibilidad</h3>
          </div>
          <div className="space-y-2">
            <Checkbox
              label="Solo productos disponibles"
              checked={localFilters?.availability?.includes('available') || false}
              onChange={(e) => handleFilterChange('availability', 'available', e?.target?.checked)}
            />
            <Checkbox
              label="Incluir productos reservados"
              checked={localFilters?.availability?.includes('reserved') || false}
              onChange={(e) => handleFilterChange('availability', 'reserved', e?.target?.checked)}
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="default"
          fullWidth
          onClick={handleApplyFilters}
          iconName="Check"
          iconPosition="left"
        >
          Aplicar filtros
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={handleClearFilters}
          iconName="RotateCcw"
          iconPosition="left"
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );

  // Mobile overlay
  if (onClose) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-80 bg-card shadow-elevation-3">
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 ${className}`}>
      {sidebarContent}
    </div>
  );
};

export default FilterSidebar;