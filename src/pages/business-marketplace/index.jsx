// src/pages/business-marketplace/index.jsx
// BusinessMarketplace con integración real de Supabase
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// Import components
import ProductCard from './components/ProductCard';
import FilterSidebar from './components/FilterSidebar';
import SearchHeader from './components/SearchHeader';
import BusinessCard from './components/BusinessCard';
import CategoryFilter from './components/CategoryFilter';
import FeaturedSection from './components/FeaturedSection';

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar productos con datos reales de Supabase
const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PRODUCTS_PER_PAGE = 20;

  // Obtener productos de Supabase
  const fetchProducts = useCallback(async (pageNum = 0, filters = {}, reset = false) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          price,
          original_price,
          image_url,
          category,
          subcategory,
          brand,
          stock_quantity,
          is_active,
          is_featured,
          views_count,
          orders_count,
          rating_average,
          rating_count,
          created_at,
          user_profiles!products_business_user_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            business_name,
            business_type,
            business_location
          )
        `)
        .eq('is_active', true)
        .range(pageNum * PRODUCTS_PER_PAGE, (pageNum + 1) * PRODUCTS_PER_PAGE - 1);

      // Aplicar filtros
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.subcategory && filters.subcategory !== 'all') {
        query = query.eq('subcategory', filters.subcategory);
      }

      if (filters.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%,brand.ilike.%${filters.searchQuery}%`);
      }

      if (filters.priceRange?.min) {
        query = query.gte('price', parseFloat(filters.priceRange.min));
      }

      if (filters.priceRange?.max) {
        query = query.lte('price', parseFloat(filters.priceRange.max));
      }

      if (filters.brands && filters.brands.length > 0) {
        query = query.in('brand', filters.brands);
      }

      if (filters.inStock) {
        query = query.gt('stock_quantity', 0);
      }

      // Aplicar ordenamiento
      switch (filters.sortBy) {
        case 'price_low':
          query = query.order('price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('orders_count', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating_average', { ascending: false });
          break;
        default: // relevance
          query = query.order('views_count', { ascending: false });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Transformar datos para compatibilidad con componentes existentes
      const transformedProducts = data?.map(product => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        originalPrice: product.original_price,
        image: product.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
        businessId: product.user_profiles?.id,
        businessName: product.user_profiles?.business_name || product.user_profiles?.full_name,
        businessAvatar: product.user_profiles?.avatar_url,
        location: product.user_profiles?.business_location || 'No especificada',
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
        stock: product.stock_quantity,
        status: product.stock_quantity > 0 ? 'disponible' : 'agotado',
        views: product.views_count,
        orders: product.orders_count,
        rating: product.rating_average,
        ratingCount: product.rating_count,
        isActive: product.is_active,
        isFeatured: product.is_featured,
        createdAt: product.created_at
      })) || [];

      if (reset || pageNum === 0) {
        setProducts(transformedProducts);
      } else {
        setProducts(prev => [...prev, ...transformedProducts]);
      }

      // Determinar si hay más productos
      setHasMore(transformedProducts.length === PRODUCTS_PER_PAGE);
      setPage(pageNum);

    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar más productos
  const loadMore = useCallback((filters) => {
    if (!loading && hasMore) {
      fetchProducts(page + 1, filters);
    }
  }, [loading, hasMore, page, fetchProducts]);

  // Refresh
  const refresh = useCallback(async (filters = {}) => {
    await fetchProducts(0, filters, true);
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    hasMore,
    fetchProducts,
    loadMore,
    refresh
  };
};

// Hook para manejar negocios/vendedores
const useBusinesses = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBusinesses = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          business_name,
          business_type,
          business_location,
          business_description,
          created_at
        `)
        .not('business_name', 'is', null); // Solo usuarios que tienen negocio

      if (searchQuery) {
        query = query.or(`business_name.ilike.%${searchQuery}%,business_description.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }

      query = query.order('created_at', { ascending: false }).limit(50);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Obtener estadísticas de productos para cada negocio
      const businessesWithStats = await Promise.all(
        data?.map(async (business) => {
          const { data: productsData } = await supabase
            .from('products')
            .select('id, is_featured')
            .eq('business_user_id', business.id)
            .eq('is_active', true);

          const productCount = productsData?.length || 0;
          const featuredProducts = productsData?.filter(p => p.is_featured)?.slice(0, 3) || [];

          return {
            id: business.id,
            name: business.business_name || business.full_name,
            username: business.username,
            avatar: business.avatar_url,
            type: business.business_type || 'small_business',
            location: business.business_location,
            description: business.business_description,
            productCount,
            followerCount: Math.floor(Math.random() * 500), // Placeholder hasta implementar follows
            lastActive: formatTimeAgo(business.created_at),
            hasNewProducts: productCount > 0,
            hasDiscount: Math.random() > 0.7, // Placeholder
            fastShipping: business.business_type === 'verified_store',
            featuredProducts: featuredProducts
          };
        }) || []
      );

      setBusinesses(businessesWithStats);

    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return {
    businesses,
    loading,
    error,
    refresh: fetchBusinesses
  };
};

// Hook para manejar favoritos
const useMarketplaceFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState(new Set());
  const [following, setFollowing] = useState(new Set());

  // En una implementación completa, estos se cargarían de la base de datos
  const toggleFavorite = useCallback((productId) => {
    if (!user) return;

    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
        // TODO: Eliminar de la base de datos
      } else {
        newFavorites.add(productId);
        // TODO: Agregar a la base de datos
      }
      return newFavorites;
    });
  }, [user]);

  const followBusiness = useCallback((businessId) => {
    if (!user) return;

    setFollowing(prev => {
      const newFollowing = new Set(prev);
      if (newFollowing.has(businessId)) {
        newFollowing.delete(businessId);
        // TODO: Eliminar seguimiento de la base de datos
      } else {
        newFollowing.add(businessId);
        // TODO: Agregar seguimiento a la base de datos
      }
      return newFollowing;
    });
  }, [user]);

  return {
    favorites,
    following,
    toggleFavorite,
    followBusiness,
    isFavorite: (id) => favorites.has(id),
    isFollowing: (id) => following.has(id)
  };
};

// Hook para carrito de compras
const useShoppingCart = () => {
  const [cart, setCart] = useState([]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      // Verificar si ya está en el carrito
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    cartTotal,
    cartItemCount
  };
};

// ===============================
// UTILIDADES
// ===============================

// Formatear tiempo relativo
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 3600) return 'hace poco';
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)}d`;
  return `hace ${Math.floor(diffInSeconds / 2592000)}m`;
};

// Categorías disponibles
const PRODUCT_CATEGORIES = [
  { id: 'all', label: 'Todos los productos', icon: 'Grid3X3' },
  { id: 'electronics', label: 'Electrónicos', icon: 'Smartphone' },
  { id: 'fashion', label: 'Moda', icon: 'ShoppingBag' },
  { id: 'home', label: 'Hogar', icon: 'Home' },
  { id: 'beauty', label: 'Belleza', icon: 'Sparkles' },
  { id: 'sports', label: 'Deportes', icon: 'Zap' },
  { id: 'books', label: 'Libros', icon: 'BookOpen' },
  { id: 'food', label: 'Comida', icon: 'Coffee' },
  { id: 'services', label: 'Servicios', icon: 'Briefcase' }
];

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const BusinessMarketplace = () => {
  const { user } = useAuth();
  const { products, loading, error, hasMore, loadMore, refresh } = useProducts();
  const { businesses, loading: businessesLoading } = useBusinesses();
  const { favorites, following, toggleFavorite, followBusiness, isFavorite, isFollowing } = useMarketplaceFavorites();
  const { cart, addToCart, cartItemCount } = useShoppingCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('products'); // products, businesses
  
  const [filters, setFilters] = useState({
    category: 'all',
    subcategory: 'all',
    searchQuery: '',
    brands: [],
    priceRange: { min: '', max: '' },
    inStock: false,
    sortBy: 'relevance'
  });

  // ===============================
  // EFECTOS
  // ===============================

  // Cargar productos cuando cambien los filtros
  useEffect(() => {
    const delayedFilters = {
      ...filters,
      category: selectedCategory,
      searchQuery,
      sortBy
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      refresh(delayedFilters);
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, sortBy, filters, refresh]);

  // ===============================
  // COMPUTED VALUES
  // ===============================

  const filteredBusinesses = useMemo(() => {
    if (!searchQuery) return businesses;
    return businesses.filter(business =>
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [businesses, searchQuery]);

  const featuredProducts = useMemo(() => {
    return products.filter(product => product.isFeatured).slice(0, 6);
  }, [products]);

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleSortChange = useCallback((sort) => {
    setSortBy(sort);
  }, []);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleLoadMore = useCallback(() => {
    const currentFilters = {
      ...filters,
      category: selectedCategory,
      searchQuery,
      sortBy
    };
    loadMore(currentFilters);
  }, [filters, selectedCategory, searchQuery, sortBy, loadMore]);

  const handleAddToCart = useCallback((product) => {
    addToCart(product);
    // TODO: Mostrar notificación de éxito
  }, [addToCart]);

  const handleToggleFavorite = useCallback((productId) => {
    toggleFavorite(productId);
  }, [toggleFavorite]);

  const handleFollowBusiness = useCallback((businessId) => {
    followBusiness(businessId);
  }, [followBusiness]);

  // ===============================
  // RENDER HELPERS
  // ===============================

  const EmptyState = ({ type = 'products' }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full flex items-center justify-center mb-6">
        <Icon 
          name={type === 'products' ? 'Package' : 'Store'} 
          size={32} 
          color="var(--color-primary)" 
        />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        {type === 'products' ? 'No se encontraron productos' : 'No se encontraron negocios'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {searchQuery 
          ? `No hay resultados para "${searchQuery}". Intenta con otros términos.`
          : selectedCategory !== 'all'
          ? `No hay productos disponibles en la categoría seleccionada.`
          : 'Sé el primero en agregar productos al marketplace.'
        }
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {searchQuery && (
          <Button variant="outline" onClick={() => setSearchQuery('')}>
            <Icon name="X" size={16} className="mr-2" />
            Limpiar búsqueda
          </Button>
        )}
        {selectedCategory !== 'all' && (
          <Button variant="outline" onClick={() => setSelectedCategory('all')}>
            <Icon name="Grid3X3" size={16} className="mr-2" />
            Ver todos
          </Button>
        )}
        {user && (
          <Button onClick={() => window.location.href = '/business'}>
            <Icon name="Plus" size={16} className="mr-2" />
            {type === 'products' ? 'Vender producto' : 'Crear negocio'}
          </Button>
        )}
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        Error al cargar el marketplace
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Ha ocurrido un problema al cargar los productos. Por favor, intenta nuevamente.
      </p>
      <Button onClick={() => refresh(filters)}>
        <Icon name="RefreshCw" size={16} className="mr-2" />
        Reintentar
      </Button>
    </div>
  );

  const getGridClasses = () => {
    if (viewMode === 'list') {
      return 'grid grid-cols-1 gap-4';
    }
    return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
  };

  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      <Helmet>
        <title>Marketplace - Descubre Productos Únicos | RADEISAN</title>
        <meta name="description" content="Explora productos de negocios locales, encuentra ofertas exclusivas y conecta con vendedores en RADEISAN" />
        <meta name="keywords" content="marketplace, productos, negocios, comprar, vender, ofertas" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Marketplace</h1>
              <p className="text-muted-foreground">Descubre productos únicos de negocios locales</p>
            </div>

            {/* Featured Section */}
            {featuredProducts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">Productos destacados</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {featuredProducts.map((product) => (
                    <div key={product.id} className="bg-card rounded-lg border p-3">
                      <div className="aspect-square bg-muted rounded-lg mb-2 overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="font-medium text-sm text-foreground line-clamp-1 mb-1">
                        {product.title}
                      </h4>
                      <p className="text-primary font-bold text-sm">
                        ${product.price}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                {PRODUCT_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Icon name={category.icon} size={16} />
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-border">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setCurrentTab('products')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      currentTab === 'products'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  >
                    Productos ({products.length})
                  </button>
                  <button
                    onClick={() => setCurrentTab('businesses')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      currentTab === 'businesses'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  >
                    Negocios ({businesses.length})
                  </button>
                </nav>
              </div>
            </div>

            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              
              {/* Desktop Sidebar */}
              <div className="hidden lg:block lg:col-span-3">
                <div className="sticky top-32">
                  <FilterSidebar
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    isOpen={false}
                    onClose={() => {}}
                  />
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-9">
                
                {/* Search and Controls */}
                <div className="mb-6">
                  <SearchHeader
                    searchQuery={searchQuery}
                    onSearchChange={handleSearch}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onToggleFilters={() => setIsFilterOpen(true)}
                    resultsCount={currentTab === 'products' ? products.length : businesses.length}
                    isLoading={loading || businessesLoading}
                  />
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                  {error ? (
                    <ErrorState />
                  ) : currentTab === 'products' ? (
                    /* Products Tab */
                    loading && products.length === 0 ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Cargando productos increíbles...</p>
                        </div>
                      </div>
                    ) : products.length === 0 ? (
                      <EmptyState type="products" />
                    ) : (
                      <div className="space-y-6">
                        <div className={getGridClasses()}>
                          {products.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              onAddToCart={handleAddToCart}
                              onToggleFavorite={handleToggleFavorite}
                              isFavorite={isFavorite(product.id)}
                              layout={viewMode}
                            />
                          ))}
                        </div>

                        {/* Load More */}
                        {hasMore && (
                          <div className="text-center">
                            <Button
                              variant="outline"
                              onClick={handleLoadMore}
                              disabled={loading}
                              className="px-8"
                            >
                              {loading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                  Cargando...
                                </>
                              ) : (
                                <>
                                  <Icon name="ChevronDown" size={16} className="mr-2" />
                                  Cargar más productos
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    /* Businesses Tab */
                    businessesLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Cargando negocios...</p>
                        </div>
                      </div>
                    ) : filteredBusinesses.length === 0 ? (
                      <EmptyState type="businesses" />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredBusinesses.map((business) => (
                          <BusinessCard
                            key={business.id}
                            business={business}
                            onFollow={handleFollowBusiness}
                            isFollowing={isFollowing(business.id)}
                          />
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Shopping Cart Indicator */}
        {cartItemCount > 0 && (
          <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
            <Button
              variant="default"
              size="lg"
              className="shadow-lg"
              onClick={() => console.log('Open cart')} // TODO: Implement cart modal
            >
              <Icon name="ShoppingCart" size={16} className="mr-2" />
              Carrito ({cartItemCount})
            </Button>
          </div>
        )}

        {/* Mobile Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />

        {/* Welcome Message for New Users */}
        {!loading && products.length === 0 && !error && user && (
          <div className="fixed bottom-4 left-4 max-w-sm bg-card border rounded-lg p-4 shadow-lg z-50">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="Store" size={20} color="var(--color-primary)" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">¡Marketplace disponible!</h4>
                <p className="text-sm text-muted-foreground">
                  Explora productos de negocios locales y encuentra ofertas únicas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BusinessMarketplace;
