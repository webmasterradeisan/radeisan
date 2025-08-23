import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const SearchHeader = ({ 
  searchQuery, 
  onSearchChange, 
  sortBy, 
  onSortChange, 
  viewMode, 
  onViewModeChange,
  onToggleFilters,
  resultsCount = 0,
  isLoading = false 
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const sortOptions = [
    { value: 'relevance', label: 'Más relevantes', icon: 'TrendingUp' },
    { value: 'price_low', label: 'Precio: menor a mayor', icon: 'ArrowUp' },
    { value: 'price_high', label: 'Precio: mayor a menor', icon: 'ArrowDown' },
    { value: 'newest', label: 'Más recientes', icon: 'Clock' },
    { value: 'popular', label: 'Más populares', icon: 'Heart' },
    { value: 'rating', label: 'Mejor valorados', icon: 'Star' }
  ];

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    onSearchChange(localSearchQuery);
  };

  const handleSearchClear = () => {
    setLocalSearchQuery('');
    onSearchChange('');
  };

  const getSortIcon = (value) => {
    const option = sortOptions?.find(opt => opt?.value === value);
    return option ? option?.icon : 'ArrowUpDown';
  };

  const getSortLabel = (value) => {
    const option = sortOptions?.find(opt => opt?.value === value);
    return option ? option?.label : 'Ordenar';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-elevation-1 mb-6">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="relative">
          <Input
            type="search"
            placeholder="Buscar productos, marcas, vendedores..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e?.target?.value)}
            className="pr-20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {localSearchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleSearchClear}
                className="w-8 h-8"
              >
                <Icon name="X" size={16} />
              </Button>
            )}
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="Search" size={16} />
              )}
            </Button>
          </div>
        </div>
      </form>
      {/* Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Results Count */}
        <div className="flex items-center space-x-2">
          <Icon name="Package" size={16} color="var(--color-muted-foreground)" />
          <span className="text-sm text-muted-foreground">
            {isLoading ? (
              'Buscando...'
            ) : (
              `${resultsCount?.toLocaleString()} productos encontrados`
            )}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Mobile Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            iconName="Filter"
            iconPosition="left"
            className="lg:hidden"
          >
            Filtros
          </Button>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e?.target?.value)}
              className="appearance-none bg-card border border-border rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {sortOptions?.map((option) => (
                <option key={option?.value} value={option?.value}>
                  {option?.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="ChevronDown" size={16} color="var(--color-muted-foreground)" />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="rounded-none border-0"
            >
              <Icon name="Grid3X3" size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="rounded-none border-0"
            >
              <Icon name="List" size={16} />
            </Button>
          </div>
        </div>
      </div>
      {/* Active Search Query */}
      {searchQuery && (
        <div className="mt-4 flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Buscando:</span>
          <div className="flex items-center space-x-2 bg-primary/10 text-primary px-3 py-1 rounded-full">
            <span className="text-sm font-medium">"{searchQuery}"</span>
            <button
              onClick={() => onSearchChange('')}
              className="hover:bg-primary/20 rounded-full p-1 transition-colors"
            >
              <Icon name="X" size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchHeader;