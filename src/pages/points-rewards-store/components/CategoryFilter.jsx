import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CategoryFilter = ({ 
  categories, 
  activeCategory, 
  onCategoryChange,
  className = '' 
}) => {
  return (
    <div className={`${className}`}>
      {/* Mobile Horizontal Scroll */}
      <div className="lg:hidden">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories?.map((category) => (
            <Button
              key={category?.id}
              variant={activeCategory === category?.id ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category?.id)}
              iconName={category?.icon}
              iconPosition="left"
              className="whitespace-nowrap flex-shrink-0"
            >
              {category?.name}
            </Button>
          ))}
        </div>
      </div>
      {/* Desktop Grid */}
      <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {categories?.map((category) => {
          const isActive = activeCategory === category?.id;
          
          return (
            <button
              key={category?.id}
              onClick={() => onCategoryChange(category?.id)}
              className={`
                p-4 rounded-lg border transition-all duration-200 text-left
                ${isActive 
                  ? 'bg-primary text-primary-foreground border-primary shadow-elevation-1' 
                  : 'bg-card text-foreground border-border hover:border-primary/50 hover:shadow-elevation-1'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${isActive ? 'bg-primary-foreground/20' : 'bg-muted'}
                `}>
                  <Icon 
                    name={category?.icon} 
                    size={20} 
                    color={isActive ? 'currentColor' : 'var(--color-muted-foreground)'} 
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{category?.name}</h3>
                  <p className={`text-sm ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {category?.count} recompensas
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;