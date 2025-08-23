import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const FilterChips = ({ onFilterChange, activeFilter = 'todos' }) => {
  const [selectedFilter, setSelectedFilter] = useState(activeFilter);

  const filters = [
    { id: 'todos', label: 'Todos', icon: 'Grid3X3' },
    { id: 'trending', label: 'Tendencias', icon: 'TrendingUp' },
    { id: 'following', label: 'Siguiendo', icon: 'Users' },
    { id: 'entertainment', label: 'Entretenimiento', icon: 'Smile' },
    { id: 'education', label: 'Educación', icon: 'BookOpen' },
    { id: 'music', label: 'Música', icon: 'Music' },
    { id: 'gaming', label: 'Gaming', icon: 'Gamepad2' },
    { id: 'sports', label: 'Deportes', icon: 'Trophy' },
    { id: 'food', label: 'Comida', icon: 'ChefHat' },
    { id: 'travel', label: 'Viajes', icon: 'MapPin' },
    { id: 'tech', label: 'Tecnología', icon: 'Smartphone' },
    { id: 'lifestyle', label: 'Estilo de vida', icon: 'Heart' }
  ];

  const handleFilterClick = (filterId) => {
    setSelectedFilter(filterId);
    onFilterChange && onFilterChange(filterId);
  };

  return (
    <div className="sticky top-16 lg:top-30 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="px-4 py-3">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
          {filters?.map((filter) => (
            <Button
              key={filter?.id}
              variant={selectedFilter === filter?.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterClick(filter?.id)}
              className={`flex-shrink-0 transition-all duration-200 ${
                selectedFilter === filter?.id 
                  ? 'bg-primary text-primary-foreground shadow-elevation-1' 
                  : 'bg-card hover:bg-muted border-border'
              }`}
            >
              <Icon 
                name={filter?.icon} 
                size={14} 
                className="mr-1.5"
              />
              <span className="whitespace-nowrap">{filter?.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterChips;