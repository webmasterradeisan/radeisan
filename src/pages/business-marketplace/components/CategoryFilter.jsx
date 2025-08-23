import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CategoryFilter = ({ 
  selectedCategory, 
  onCategoryChange, 
  className = '' 
}) => {
  const [showAll, setShowAll] = useState(false);

  const categories = [
    { id: 'all', label: 'Todos', icon: 'Grid3X3', count: 1247 },
    { id: 'electronics', label: 'Electrónicos', icon: 'Smartphone', count: 156 },
    { id: 'fashion', label: 'Moda', icon: 'Shirt', count: 243 },
    { id: 'home', label: 'Hogar', icon: 'Home', count: 89 },
    { id: 'sports', label: 'Deportes', icon: 'Dumbbell', count: 67 },
    { id: 'books', label: 'Libros', icon: 'Book', count: 134 },
    { id: 'art', label: 'Arte', icon: 'Palette', count: 78 },
    { id: 'automotive', label: 'Automotriz', icon: 'Car', count: 45 },
    { id: 'beauty', label: 'Belleza', icon: 'Sparkles', count: 92 },
    { id: 'toys', label: 'Juguetes', icon: 'Gamepad2', count: 56 },
    { id: 'music', label: 'Música', icon: 'Music', count: 34 },
    { id: 'pets', label: 'Mascotas', icon: 'Heart', count: 23 }
  ];

  const visibleCategories = showAll ? categories : categories?.slice(0, 8);

  const handleCategoryClick = (categoryId) => {
    onCategoryChange(categoryId);
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 shadow-elevation-1 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Icon name="Grid3X3" size={18} color="var(--color-muted-foreground)" />
          <h2 className="font-medium text-foreground">Categorías</h2>
        </div>
        
        {categories?.length > 8 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            iconName={showAll ? "ChevronUp" : "ChevronDown"}
            iconPosition="right"
            iconSize={14}
          >
            {showAll ? 'Ver menos' : 'Ver más'}
          </Button>
        )}
      </div>
      {/* Desktop Grid Layout */}
      <div className="hidden lg:grid grid-cols-4 gap-3">
        {visibleCategories?.map((category) => (
          <button
            key={category?.id}
            onClick={() => handleCategoryClick(category?.id)}
            className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 hover:shadow-elevation-1 ${
              selectedCategory === category?.id
                ? 'border-primary bg-primary/10 text-primary' :'border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
          >
            <Icon
              name={category?.icon}
              size={24}
              color={selectedCategory === category?.id ? 'var(--color-primary)' : 'currentColor'}
              className="mb-2"
            />
            <span className="text-sm font-medium text-center">{category?.label}</span>
            <span className="text-xs opacity-75 mt-1">({category?.count})</span>
          </button>
        ))}
      </div>
      {/* Mobile/Tablet Horizontal Scroll */}
      <div className="lg:hidden">
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {visibleCategories?.map((category) => (
            <button
              key={category?.id}
              onClick={() => handleCategoryClick(category?.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                selectedCategory === category?.id
                  ? 'border-primary bg-primary/10 text-primary' :'border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Icon
                name={category?.icon}
                size={16}
                color={selectedCategory === category?.id ? 'var(--color-primary)' : 'currentColor'}
              />
              <span className="text-sm font-medium">{category?.label}</span>
              <span className="text-xs opacity-75">({category?.count})</span>
            </button>
          ))}
        </div>
      </div>
      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-primary">1.2K+</div>
            <div className="text-xs text-muted-foreground">Productos</div>
          </div>
          <div>
            <div className="text-lg font-bold text-secondary">340+</div>
            <div className="text-xs text-muted-foreground">Vendedores</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent">98%</div>
            <div className="text-xs text-muted-foreground">Satisfacción</div>
          </div>
          <div>
            <div className="text-lg font-bold text-success">24h</div>
            <div className="text-xs text-muted-foreground">Envío rápido</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryFilter;