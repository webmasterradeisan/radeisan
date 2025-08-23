import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// Import components
import ProductCard from './components/ProductCard';
import FilterSidebar from './components/FilterSidebar';
import SearchHeader from './components/SearchHeader';
import BusinessCard from './components/BusinessCard';
import CategoryFilter from './components/CategoryFilter';
import FeaturedSection from './components/FeaturedSection';

const BusinessMarketplace = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [following, setFollowing] = useState(new Set());
  const [cart, setCart] = useState([]);
  const [currentTab, setCurrentTab] = useState('products'); // products, businesses

  const [filters, setFilters] = useState({
    categories: [],
    businessTypes: [],
    locations: [],
    conditions: [],
    priceRange: { min: '', max: '' },
    availability: []
  });

  // Mock data
  const mockProducts = [
    {
      id: 1,
      title: "iPhone 14 Pro Max 256GB - Como nuevo",
      description: "Smartphone Apple en excelente estado, incluye cargador original y funda protectora. Sin rayones ni golpes.",
      price: 899,
      originalPrice: 1199,
      image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop",
      businessId: 1,
      businessName: "TechStore Madrid",
      location: "Madrid",
      status: "available",
      stock: 1,
      views: 234,
      likes: 45,
      category: "electronics",
      condition: "like_new"
    },
    {
      id: 2,
      title: "Vestido de noche elegante - Talla M",
      description: "Hermoso vestido negro para ocasiones especiales, usado solo una vez. Perfecto estado.",
      price: 89,
      originalPrice: 150,
      image: "https://images.unsplash.com/photo-1566479179817-c0a5b4b3b5b5?w=400&h=400&fit=crop",
      businessId: 2,
      businessName: "Moda Vintage",
      location: "Barcelona",
      status: "available",
      stock: 1,
      views: 156,
      likes: 23,
      category: "fashion",
      condition: "like_new"
    },
    {
      id: 3,
      title: "Set de herramientas profesional",
      description: "Kit completo de herramientas para carpintería y bricolaje. Incluye taladro, destornilladores y más.",
      price: 149,
      originalPrice: 199,
      image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=400&fit=crop",
      businessId: 3,
      businessName: "Ferretería Central",
      location: "Valencia",
      status: "available",
      stock: 5,
      views: 89,
      likes: 12,
      category: "home",
      condition: "new"
    },
    {
      id: 4,
      title: "Bicicleta de montaña Trek",
      description: "Bicicleta en buen estado, ideal para rutas de montaña. Mantenimiento reciente realizado.",
      price: 450,
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      businessId: 4,
      businessName: "Deportes Extremos",
      location: "Sevilla",
      status: "sold",
      stock: 0,
      views: 345,
      likes: 67,
      category: "sports",
      condition: "good"
    },
    {
      id: 5,
      title: "Cuadro abstracto original",
      description: "Obra de arte original pintada a mano. Perfecto para decorar espacios modernos.",
      price: 120,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop",
      businessId: 5,
      businessName: "Artesanías Luna",
      location: "Madrid",
      status: "available",
      stock: 1,
      views: 78,
      likes: 34,
      category: "art",
      condition: "new"
    },
    {
      id: 6,
      title: "Laptop Gaming ASUS ROG",
      description: "Portátil gaming de alta gama, perfecto para juegos y trabajo profesional. Excelente rendimiento.",
      price: 1299,
      originalPrice: 1599,
      image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop",
      businessId: 1,
      businessName: "TechStore Madrid",
      location: "Madrid",
      status: "limited",
      stock: 2,
      views: 567,
      likes: 89,
      category: "electronics",
      condition: "new"
    },
    {
      id: 7,
      title: "Sofá de 3 plazas - Casi nuevo",
      description: "Cómodo sofá en color gris, perfecto para sala de estar. Muy poco uso, como nuevo.",
      price: 299,
      originalPrice: 599,
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
      businessId: 6,
      businessName: "Muebles Hogar",
      location: "Barcelona",
      status: "reserved",
      stock: 1,
      views: 234,
      likes: 45,
      category: "home",
      condition: "like_new"
    },
    {
      id: 8,
      title: "Reloj inteligente Apple Watch",
      description: "Apple Watch Series 8 en excelente estado. Incluye correa original y cargador.",
      price: 299,
      originalPrice: 429,
      image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&h=400&fit=crop",
      businessId: 1,
      businessName: "TechStore Madrid",
      location: "Madrid",
      status: "available",
      stock: 3,
      views: 445,
      likes: 78,
      category: "electronics",
      condition: "like_new"
    }
  ];

  const mockBusinesses = [
    {
      id: 1,
      name: "TechStore Madrid",
      description: "Especialistas en tecnología y dispositivos electrónicos de segunda mano en perfecto estado.",
      avatar: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop",
      type: "verified_store",
      location: "Madrid, España",
      rating: 4.8,
      reviewCount: 156,
      productCount: 89,
      followerCount: 1234,
      lastActive: "2 horas",
      hasNewProducts: true,
      hasDiscount: true,
      fastShipping: true,
      featuredProducts: [
        { image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100&h=100&fit=crop", title: "iPhone" },
        { image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=100&h=100&fit=crop", title: "Laptop" },
        { image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=100&h=100&fit=crop", title: "Watch" }
      ]
    },
    {
      id: 2,
      name: "Moda Vintage",
      description: "Ropa y accesorios vintage únicos, cuidadosamente seleccionados para personas con estilo.",
      avatar: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop",
      type: "small_business",
      location: "Barcelona, España",
      rating: 4.9,
      reviewCount: 89,
      productCount: 156,
      followerCount: 567,
      lastActive: "1 día",
      hasNewProducts: false,
      hasDiscount: true,
      fastShipping: false,
      featuredProducts: [
        { image: "https://images.unsplash.com/photo-1566479179817-c0a5b4b3b5b5?w=100&h=100&fit=crop", title: "Vestido" },
        { image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=100&h=100&fit=crop", title: "Bolso" },
        { image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&h=100&fit=crop", title: "Zapatos" }
      ]
    },
    {
      id: 3,
      name: "Ferretería Central",
      description: "Todo lo que necesitas para tus proyectos de bricolaje y construcción.",
      type: "small_business",
      location: "Valencia, España",
      rating: 4.6,
      reviewCount: 234,
      productCount: 445,
      followerCount: 890,
      lastActive: "3 horas",
      hasNewProducts: true,
      hasDiscount: false,
      fastShipping: true,
      featuredProducts: [
        { image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=100&h=100&fit=crop", title: "Herramientas" },
        { image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop", title: "Taladro" },
        { image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=100&h=100&fit=crop", title: "Tornillos" }
      ]
    },
    {
      id: 4,
      name: "Deportes Extremos",
      description: "Equipamiento deportivo para aventureros y atletas de todos los niveles.",
      type: "small_business",
      location: "Sevilla, España",
      rating: 4.7,
      reviewCount: 67,
      productCount: 123,
      followerCount: 445,
      lastActive: "5 horas",
      hasNewProducts: false,
      hasDiscount: true,
      fastShipping: false,
      featuredProducts: [
        { image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop", title: "Bicicleta" },
        { image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop", title: "Casco" },
        { image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=100&h=100&fit=crop", title: "Mochila" }
      ]
    },
    {
      id: 5,
      name: "Artesanías Luna",
      description: "Creaciones artísticas únicas hechas a mano con amor y dedicación.",
      avatar: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop",
      type: "artist",
      location: "Madrid, España",
      rating: 4.9,
      reviewCount: 45,
      productCount: 67,
      followerCount: 234,
      lastActive: "1 hora",
      hasNewProducts: true,
      hasDiscount: false,
      fastShipping: false,
      featuredProducts: [
        { image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop", title: "Cuadro" },
        { image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=100&h=100&fit=crop", title: "Escultura" },
        { image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=100&h=100&fit=crop", title: "Cerámica" }
      ]
    },
    {
      id: 6,
      name: "Muebles Hogar",
      description: "Muebles de calidad para hacer de tu casa un hogar acogedor y funcional.",
      type: "small_business",
      location: "Barcelona, España",
      rating: 4.5,
      reviewCount: 123,
      productCount: 234,
      followerCount: 678,
      lastActive: "2 días",
      hasNewProducts: false,
      hasDiscount: true,
      fastShipping: true,
      featuredProducts: [
        { image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&h=100&fit=crop", title: "Sofá" },
        { image: "https://images.unsplash.com/photo-1549497538-303791108f95?w=100&h=100&fit=crop", title: "Mesa" },
        { image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&h=100&fit=crop", title: "Silla" }
      ]
    }
  ];

  // Filter and search logic
  const filteredProducts = mockProducts?.filter(product => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery?.toLowerCase();
      if (!product?.title?.toLowerCase()?.includes(query) &&
          !product?.description?.toLowerCase()?.includes(query) &&
          !product?.businessName?.toLowerCase()?.includes(query)) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all' && product?.category !== selectedCategory) {
      return false;
    }

    // Additional filters
    if (filters?.categories?.length > 0 && !filters?.categories?.includes(product?.category)) {
      return false;
    }

    if (filters?.locations?.length > 0 && !filters?.locations?.some(loc => 
      product?.location?.toLowerCase()?.includes(loc?.toLowerCase())
    )) {
      return false;
    }

    if (filters?.conditions?.length > 0 && !filters?.conditions?.includes(product?.condition)) {
      return false;
    }

    // Price range filter
    if (filters?.priceRange?.min && product?.price < parseFloat(filters?.priceRange?.min)) {
      return false;
    }
    if (filters?.priceRange?.max && product?.price > parseFloat(filters?.priceRange?.max)) {
      return false;
    }

    // Availability filter
    if (filters?.availability?.length > 0) {
      if (filters?.availability?.includes('available') && product?.status !== 'available') {
        return false;
      }
      if (!filters?.availability?.includes('reserved') && product?.status === 'reserved') {
        return false;
      }
    }

    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts]?.sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a?.price - b?.price;
      case 'price_high':
        return b?.price - a?.price;
      case 'newest':
        return b?.id - a?.id;
      case 'popular':
        return (b?.views + b?.likes) - (a?.views + a?.likes);
      case 'rating':
        return 4.5 - 4.5; // Mock rating comparison
      default:
        return 0;
    }
  });

  const filteredBusinesses = mockBusinesses?.filter(business => {
    if (searchQuery) {
      const query = searchQuery?.toLowerCase();
      if (!business?.name?.toLowerCase()?.includes(query) &&
          !business?.description?.toLowerCase()?.includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Event handlers
  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleAddToCart = (product) => {
    setCart(prev => [...prev, product]);
    // Show success notification (could be implemented with a toast library)
    console.log('Producto añadido al carrito:', product?.title);
  };

  const handleToggleFavorite = (productId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites?.has(productId)) {
        newFavorites?.delete(productId);
      } else {
        newFavorites?.add(productId);
      }
      return newFavorites;
    });
  };

  const handleFollowBusiness = (businessId) => {
    setFollowing(prev => {
      const newFollowing = new Set(prev);
      if (newFollowing?.has(businessId)) {
        newFollowing?.delete(businessId);
      } else {
        newFollowing?.add(businessId);
      }
      return newFollowing;
    });
  };

  const getGridClasses = () => {
    if (viewMode === 'list') {
      return 'grid grid-cols-1 gap-4';
    }
    return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Marketplace - VideoRewards</title>
        <meta name="description" content="Descubre productos únicos de vendedores locales y negocios verificados en nuestro marketplace integrado." />
      </Helmet>
      <Header />
      <PrimaryNavigation />
      <main className="pt-16 lg:pt-30 pb-16 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Featured Section */}
          <FeaturedSection className="mb-6" />

          {/* Category Filter */}
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            className="mb-6"
          />

          {/* Content Layout */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-6">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block lg:col-span-3">
              <FilterSidebar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                className="sticky top-32"
                isOpen={false}
                onClose={() => {}}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9">
              {/* Search and Controls */}
              <SearchHeader
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                sortBy={sortBy}
                onSortChange={setSortBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onToggleFilters={() => setIsFilterOpen(true)}
                resultsCount={currentTab === 'products' ? sortedProducts?.length : filteredBusinesses?.length}
                isLoading={isLoading}
              />

              {/* Tab Navigation */}
              <div className="flex items-center space-x-1 mb-6 bg-card border border-border rounded-lg p-1">
                <Button
                  variant={currentTab === 'products' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentTab('products')}
                  iconName="Package"
                  iconPosition="left"
                  iconSize={16}
                  className="flex-1"
                >
                  Productos ({sortedProducts?.length})
                </Button>
                <Button
                  variant={currentTab === 'businesses' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentTab('businesses')}
                  iconName="Store"
                  iconPosition="left"
                  iconSize={16}
                  className="flex-1"
                >
                  Vendedores ({filteredBusinesses?.length})
                </Button>
              </div>

              {/* Content */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando productos...</p>
                  </div>
                </div>
              ) : (
                <>
                  {currentTab === 'products' ? (
                    <>
                      {sortedProducts?.length > 0 ? (
                        <div className={getGridClasses()}>
                          {sortedProducts?.map((product) => (
                            <ProductCard
                              key={product?.id}
                              product={product}
                              onAddToCart={handleAddToCart}
                              onToggleFavorite={handleToggleFavorite}
                              isFavorite={favorites?.has(product?.id)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Icon name="Package" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron productos</h3>
                          <p className="text-muted-foreground mb-4">
                            Intenta ajustar tus filtros o términos de búsqueda
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedCategory('all');
                              setFilters({
                                categories: [],
                                businessTypes: [],
                                locations: [],
                                conditions: [],
                                priceRange: { min: '', max: '' },
                                availability: []
                              });
                            }}
                          >
                            Limpiar filtros
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {filteredBusinesses?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredBusinesses?.map((business) => (
                            <BusinessCard
                              key={business?.id}
                              business={business}
                              onFollow={handleFollowBusiness}
                              isFollowing={following?.has(business?.id)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Icon name="Store" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron vendedores</h3>
                          <p className="text-muted-foreground mb-4">
                            Intenta ajustar tus términos de búsqueda
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setSearchQuery('')}
                          >
                            Limpiar búsqueda
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Load More Button */}
              {!isLoading && (currentTab === 'products' ? sortedProducts?.length : filteredBusinesses?.length) > 0 && (
                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    size="lg"
                    iconName="ChevronDown"
                    iconPosition="right"
                  >
                    Cargar más resultados
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {/* Mobile Filter Sidebar */}
      <FilterSidebar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
      {/* Shopping Cart Indicator */}
      {cart?.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
          <Button
            variant="default"
            size="lg"
            iconName="ShoppingCart"
            iconPosition="left"
            className="shadow-elevation-3"
          >
            Carrito ({cart?.length})
          </Button>
        </div>
      )}
    </div>
  );
};

export default BusinessMarketplace;