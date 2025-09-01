// src/pages/business-profile-management/index.jsx
// BusinessProfileManagement con integración real de Supabase
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

// Import components
import ProfileSetupSection from './components/ProfileSetupSection';
import ProductManagementSection from './components/ProductManagementSection';
import VideoContentSection from './components/VideoContentSection';
import AnalyticsSection from './components/AnalyticsSection';
import SettingsSection from './components/SettingsSection';

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar perfil de negocio
const useBusinessProfile = () => {
  const { user } = useAuth();
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Obtener datos del negocio
  const fetchBusinessProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const transformedData = {
        businessName: data.business_name || '',
        description: data.business_description || '',
        category: data.business_category || '',
        type: data.business_type || 'small_business',
        phone: data.phone_number || '',
        email: data.email || user.email,
        website: data.website || '',
        address: data.business_location || '',
        city: data.business_city || '',
        country: data.business_country || '',
        logo: data.business_logo_url || '',
        banner: data.business_banner_url || '',
        isVerified: data.is_verified || false,
        isActive: data.business_is_active !== false,
        taxId: data.business_tax_id || '',
        registrationNumber: data.business_registration_number || '',
        foundedYear: data.business_founded_year || null,
        employeeCount: data.business_employee_count || '',
        socialMedia: {
          instagram: data.business_instagram || '',
          facebook: data.business_facebook || '',
          twitter: data.business_twitter || '',
          linkedin: data.business_linkedin || ''
        },
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setBusinessData(transformedData);

    } catch (err) {
      console.error('Error fetching business profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  // Actualizar perfil de negocio
  const updateBusinessProfile = useCallback(async (updates) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);
      setError(null);

      // Transformar datos para la base de datos
      const dbUpdates = {
        business_name: updates.businessName,
        business_description: updates.description,
        business_category: updates.category,
        business_type: updates.type,
        phone_number: updates.phone,
        website: updates.website,
        business_location: updates.address,
        business_city: updates.city,
        business_country: updates.country,
        business_logo_url: updates.logo,
        business_banner_url: updates.banner,
        business_is_active: updates.isActive,
        business_tax_id: updates.taxId,
        business_registration_number: updates.registrationNumber,
        business_founded_year: updates.foundedYear,
        business_employee_count: updates.employeeCount,
        business_instagram: updates.socialMedia?.instagram,
        business_facebook: updates.socialMedia?.facebook,
        business_twitter: updates.socialMedia?.twitter,
        business_linkedin: updates.socialMedia?.linkedin,
        updated_at: new Date().toISOString()
      };

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(dbUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar estado local
      setBusinessData(prev => ({ ...prev, ...updates }));
      
      return { success: true, data };

    } catch (err) {
      console.error('Error updating business profile:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Upload de imágenes del negocio
  const uploadBusinessImage = useCallback(async (file, type = 'logo') => {
    if (!user?.id || !file) return { success: false, error: 'Invalid parameters' };

    try {
      setUploading(true);
      
      // Validar archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB max
        throw new Error('La imagen debe ser menor a 10MB');
      }

      // Generar nombre único
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.id}/${type}_${Date.now()}.${fileExtension}`;

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('business-images')
        .getPublicUrl(fileName);

      return { success: true, url: urlData.publicUrl };

    } catch (err) {
      console.error('Error uploading business image:', err);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  // Crear cuenta de negocio
  const createBusinessAccount = useCallback(async (businessInfo) => {
    const result = await updateBusinessProfile(businessInfo);
    if (result.success) {
      // Marcar como cuenta de negocio
      await supabase
        .from('user_profiles')
        .update({ business_is_active: true })
        .eq('id', user.id);
    }
    return result;
  }, [updateBusinessProfile, user?.id]);

  useEffect(() => {
    fetchBusinessProfile();
  }, [fetchBusinessProfile]);

  return {
    businessData,
    loading,
    error,
    uploading,
    updateBusinessProfile,
    uploadBusinessImage,
    createBusinessAccount,
    refreshProfile: fetchBusinessProfile
  };
};

// Hook para gestión de productos
const useProductManagement = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Obtener productos del negocio
  const fetchProducts = useCallback(async (filters = {}) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('products')
        .select('*')
        .eq('business_user_id', user.id)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.status && filters.status !== 'all') {
        const isActive = filters.status === 'active';
        query = query.eq('is_active', isActive);
      }

      if (filters.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%,sku.ilike.%${filters.searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformedProducts = data?.map(product => ({
        id: product.id,
        name: product.title,
        description: product.description,
        price: product.price,
        originalPrice: product.original_price,
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
        sku: product.sku,
        images: product.image_urls || (product.image_url ? [product.image_url] : []),
        stock: product.stock_quantity,
        minOrderQuantity: product.min_order_quantity,
        weight: product.weight_grams,
        dimensions: product.dimensions_cm ? JSON.parse(product.dimensions_cm) : null,
        status: product.is_active ? 'active' : 'inactive',
        isFeatured: product.is_featured,
        views: product.views_count,
        orders: product.orders_count,
        rating: product.rating_average,
        ratingCount: product.rating_count,
        createdAt: product.created_at,
        updatedAt: product.updated_at
      })) || [];

      setProducts(transformedProducts);

    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Crear producto
  const createProduct = useCallback(async (productData) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);

      const { data, error: createError } = await supabase
        .from('products')
        .insert({
          business_user_id: user.id,
          title: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          original_price: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
          category: productData.category,
          subcategory: productData.subcategory,
          brand: productData.brand,
          sku: productData.sku,
          image_url: productData.images?.[0] || null,
          image_urls: productData.images,
          stock_quantity: parseInt(productData.stock) || 0,
          min_order_quantity: parseInt(productData.minOrderQuantity) || 1,
          weight_grams: productData.weight ? parseInt(productData.weight) : null,
          dimensions_cm: productData.dimensions ? JSON.stringify(productData.dimensions) : null,
          is_active: productData.status === 'active',
          is_featured: productData.isFeatured || false
        })
        .select()
        .single();

      if (createError) throw createError;

      // Actualizar estado local
      await fetchProducts();

      return { success: true, data };

    } catch (err) {
      console.error('Error creating product:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchProducts]);

  // Actualizar producto
  const updateProduct = useCallback(async (productId, updates) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);

      const dbUpdates = {
        title: updates.name,
        description: updates.description,
        price: parseFloat(updates.price),
        original_price: updates.originalPrice ? parseFloat(updates.originalPrice) : null,
        category: updates.category,
        subcategory: updates.subcategory,
        brand: updates.brand,
        sku: updates.sku,
        image_url: updates.images?.[0] || null,
        image_urls: updates.images,
        stock_quantity: parseInt(updates.stock) || 0,
        min_order_quantity: parseInt(updates.minOrderQuantity) || 1,
        weight_grams: updates.weight ? parseInt(updates.weight) : null,
        dimensions_cm: updates.dimensions ? JSON.stringify(updates.dimensions) : null,
        is_active: updates.status === 'active',
        is_featured: updates.isFeatured || false,
        updated_at: new Date().toISOString()
      };

      const { data, error: updateError } = await supabase
        .from('products')
        .update(dbUpdates)
        .eq('id', productId)
        .eq('business_user_id', user.id) // Seguridad adicional
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar estado local
      await fetchProducts();

      return { success: true, data };

    } catch (err) {
      console.error('Error updating product:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchProducts]);

  // Eliminar producto
  const deleteProduct = useCallback(async (productId) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('business_user_id', user.id); // Seguridad adicional

      if (deleteError) throw deleteError;

      // Actualizar estado local
      setProducts(prev => prev.filter(product => product.id !== productId));

      return { success: true };

    } catch (err) {
      console.error('Error deleting product:', err);
      return { success: false, error: err.message };
    }
  }, [user?.id]);

  // Upload de imágenes de productos
  const uploadProductImages = useCallback(async (files) => {
    if (!user?.id || !files?.length) return { success: false, error: 'Invalid parameters' };

    try {
      setUploading(true);
      const uploadedUrls = [];

      for (const file of files) {
        // Validar archivo
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB max per image
          console.warn(`Skipping large file: ${file.name}`);
          continue;
        }

        // Generar nombre único
        const fileExtension = file.name.split('.').pop();
        const fileName = `${user.id}/products/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
          continue;
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      return { success: true, urls: uploadedUrls };

    } catch (err) {
      console.error('Error uploading product images:', err);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  // Acciones en lote
  const bulkUpdateProducts = useCallback(async (productIds, updates) => {
    if (!user?.id || !productIds?.length) return { success: false, error: 'Invalid parameters' };

    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', productIds)
        .eq('business_user_id', user.id);

      if (updateError) throw updateError;

      // Actualizar estado local
      await fetchProducts();

      return { success: true };

    } catch (err) {
      console.error('Error bulk updating products:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    uploading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImages,
    bulkUpdateProducts
  };
};

// Hook para analytics del negocio
const useBusinessAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    overview: {
      totalProducts: 0,
      activeProducts: 0,
      totalViews: 0,
      totalOrders: 0,
      totalRevenue: 0,
      averageRating: 0
    },
    recentActivity: [],
    topProducts: [],
    categoryBreakdown: [],
    monthlyStats: []
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Obtener productos para estadísticas
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('business_user_id', user.id);

      if (productsError) throw productsError;

      // Calcular estadísticas generales
      const totalProducts = products?.length || 0;
      const activeProducts = products?.filter(p => p.is_active)?.length || 0;
      const totalViews = products?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      const totalOrders = products?.reduce((sum, p) => sum + (p.orders_count || 0), 0) || 0;
      const totalRevenue = products?.reduce((sum, p) => sum + ((p.orders_count || 0) * (p.price || 0)), 0) || 0;
      const averageRating = products?.length 
        ? products.reduce((sum, p) => sum + (p.rating_average || 0), 0) / products.length 
        : 0;

      // Top productos por views
      const topProducts = products
        ?.sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        ?.slice(0, 5)
        ?.map(p => ({
          id: p.id,
          name: p.title,
          views: p.views_count || 0,
          orders: p.orders_count || 0,
          revenue: (p.orders_count || 0) * (p.price || 0)
        })) || [];

      // Breakdown por categoría
      const categoryMap = {};
      products?.forEach(p => {
        const category = p.category || 'other';
        if (!categoryMap[category]) {
          categoryMap[category] = { count: 0, views: 0, orders: 0 };
        }
        categoryMap[category].count++;
        categoryMap[category].views += p.views_count || 0;
        categoryMap[category].orders += p.orders_count || 0;
      });

      const categoryBreakdown = Object.entries(categoryMap).map(([category, stats]) => ({
        category,
        ...stats
      }));

      // Actividad reciente (mock data por ahora)
      const recentActivity = [
        {
          id: 1,
          type: 'product_view',
          description: 'Nuevo producto visualizado',
          timestamp: new Date().toISOString(),
          metadata: { productName: 'Producto destacado' }
        },
        {
          id: 2,
          type: 'product_order',
          description: 'Nueva orden recibida',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          metadata: { amount: 29.99 }
        }
      ];

      setAnalytics({
        overview: {
          totalProducts,
          activeProducts,
          totalViews,
          totalOrders,
          totalRevenue,
          averageRating: Math.round(averageRating * 10) / 10
        },
        recentActivity,
        topProducts,
        categoryBreakdown,
        monthlyStats: [] // TODO: Implementar estadísticas mensuales
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    refreshAnalytics: fetchAnalytics
  };
};

// ===============================
// CONSTANTES Y UTILIDADES
// ===============================

const BUSINESS_CATEGORIES = [
  { value: 'fashion', label: 'Moda y Accesorios' },
  { value: 'electronics', label: 'Electrónicos' },
  { value: 'home', label: 'Hogar y Jardín' },
  { value: 'beauty', label: 'Belleza y Cuidado Personal' },
  { value: 'sports', label: 'Deportes y Fitness' },
  { value: 'books', label: 'Libros y Medios' },
  { value: 'food', label: 'Alimentos y Bebidas' },
  { value: 'art', label: 'Arte y Manualidades' },
  { value: 'automotive', label: 'Automotriz' },
  { value: 'services', label: 'Servicios' },
  { value: 'other', label: 'Otros' }
];

const BUSINESS_TYPES = [
  { value: 'small_business', label: 'Pequeño Negocio' },
  { value: 'artist', label: 'Artista/Creador' },
  { value: 'verified_store', label: 'Tienda Verificada' },
  { value: 'dropshipper', label: 'Dropshipper' },
  { value: 'manufacturer', label: 'Fabricante' },
  { value: 'reseller', label: 'Revendedor' }
];

const COUNTRY_OPTIONS = [
  { value: 'es', label: 'España' },
  { value: 'mx', label: 'México' },
  { value: 'ar', label: 'Argentina' },
  { value: 'co', label: 'Colombia' },
  { value: 'pe', label: 'Perú' },
  { value: 'cl', label: 'Chile' },
  { value: 'ec', label: 'Ecuador' },
  { value: 've', label: 'Venezuela' },
  { value: 'uy', label: 'Uruguay' },
  { value: 'py', label: 'Paraguay' },
  { value: 'other', label: 'Otro país' }
];

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const BusinessProfileManagement = () => {
  const { user } = useAuth();
  const { 
    businessData, 
    loading: businessLoading, 
    error: businessError,
    uploading,
    updateBusinessProfile,
    uploadBusinessImage,
    createBusinessAccount
  } = useBusinessProfile();
  const { 
    products, 
    loading: productsLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImages,
    bulkUpdateProducts
  } = useProductManagement();
  const { analytics, loading: analyticsLoading } = useBusinessAnalytics();

  const [activeTab, setActiveTab] = useState('profile');
  const [showCreateFlow, setShowCreateFlow] = useState(false);

  // ===============================
  // COMPUTED VALUES
  // ===============================

  const isBusinessAccount = useMemo(() => {
    return businessData?.businessName && businessData?.businessName.trim().length > 0;
  }, [businessData?.businessName]);

  const tabs = useMemo(() => [
    {
      id: 'profile',
      label: 'Configuración del Perfil',
      icon: 'Building2',
      description: 'Información básica y verificación'
    },
    {
      id: 'products',
      label: 'Gestión de Productos',
      icon: 'Package',
      description: `${products.length} productos`,
      disabled: !isBusinessAccount
    },
    {
      id: 'videos',
      label: 'Contenido de Video',
      icon: 'Video',
      description: 'Videos promocionales y tutoriales',
      disabled: !isBusinessAccount
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart3',
      description: `${analytics.overview.totalViews} views totales`,
      disabled: !isBusinessAccount
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'Settings',
      description: 'Preferencias y ajustes',
      disabled: !isBusinessAccount
    }
  ], [isBusinessAccount, products.length, analytics.overview.totalViews]);

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleBusinessDataUpdate = useCallback(async (updatedData) => {
    const result = await updateBusinessProfile(updatedData);
    if (result.success) {
      console.log('Business profile updated successfully');
    } else {
      console.error('Failed to update business profile:', result.error);
    }
  }, [updateBusinessProfile]);

  const handleCreateBusinessAccount = useCallback(async (businessInfo) => {
    try {
      const result = await createBusinessAccount(businessInfo);
      if (result.success) {
        setShowCreateFlow(false);
        console.log('Business account created successfully');
      } else {
        console.error('Failed to create business account:', result.error);
      }
    } catch (error) {
      console.error('Error creating business account:', error);
    }
  }, [createBusinessAccount]);

  const handleImageUpload = useCallback(async (file, type) => {
    try {
      const result = await uploadBusinessImage(file, type);
      if (result.success) {
        // Actualizar perfil con nueva imagen
        const update = {};
        update[type] = result.url;
        await handleBusinessDataUpdate({ ...businessData, ...update });
      }
      return result;
    } catch (error) {
      console.error('Error uploading image:', error);
      return { success: false, error: error.message };
    }
  }, [uploadBusinessImage, handleBusinessDataUpdate, businessData]);

  const handleProductAction = useCallback(async (action, productId, data = {}) => {
    switch (action) {
      case 'create':
        return await createProduct(data);
      case 'update':
        return await updateProduct(productId, data);
      case 'delete':
        if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
          return await deleteProduct(productId);
        }
        return { success: false, error: 'Cancelled' };
      case 'bulk_update':
        return await bulkUpdateProducts(productId, data); // productId is actually productIds array
      default:
        return { success: false, error: 'Unknown action' };
    }
  }, [createProduct, updateProduct, deleteProduct, bulkUpdateProducts]);

  // ===============================
  // RENDER HELPERS
  // ===============================

  const renderTabContent = () => {
    if (!isBusinessAccount && activeTab !== 'profile') {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Icon name="Lock" size={24} color="var(--color-muted-foreground)" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Configura tu perfil de negocio
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            Completa la configuración de tu perfil para acceder a esta sección
          </p>
          <Button onClick={() => setActiveTab('profile')}>
            Ir a configuración
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'profile':
        return (
          <ProfileSetupSection
            businessData={businessData}
            loading={businessLoading}
            uploading={uploading}
            onUpdate={handleBusinessDataUpdate}
            onImageUpload={handleImageUpload}
            categories={BUSINESS_CATEGORIES}
            types={BUSINESS_TYPES}
            countries={COUNTRY_OPTIONS}
          />
        );
      case 'products':
        return (
          <ProductManagementSection
            products={products}
            loading={productsLoading}
            uploading={uploading}
            onProductAction={handleProductAction}
            onImageUpload={uploadProductImages}
            categories={BUSINESS_CATEGORIES}
          />
        );
      case 'videos':
        return (
          <VideoContentSection
            videos={[]} // TODO: Implementar videos del negocio
            products={products}
            onVideoUpdate={() => {}}
          />
        );
      case 'analytics':
        return (
          <AnalyticsSection 
            analytics={analytics}
            loading={analyticsLoading}
          />
        );
      case 'settings':
        return (
          <SettingsSection
            businessData={businessData}
            onUpdate={handleBusinessDataUpdate}
          />
        );
      default:
        return (
          <ProfileSetupSection
            businessData={businessData}
            loading={businessLoading}
            uploading={uploading}
            onUpdate={handleBusinessDataUpdate}
            onImageUpload={handleImageUpload}
            categories={BUSINESS_CATEGORIES}
            types={BUSINESS_TYPES}
            countries={COUNTRY_OPTIONS}
          />
        );
    }
  };

  // Loading state
  if (businessLoading && !businessData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        <main className="pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando perfil de negocio...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (businessError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        <main className="pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Error al cargar el perfil de negocio
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md text-center">
                {businessError}
              </p>
              <Button onClick={() => window.location.reload()}>
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Crear cuenta de negocio
  if (!isBusinessAccount && !showCreateFlow) {
    return (
      <>
        <Helmet>
          <title>Crear Cuenta de Negocio | RADEISAN</title>
          <meta name="description" content="Crea tu cuenta de negocio en RADEISAN y comienza a vender productos a través de videos." />
        </Helmet>

        <div className="min-h-screen bg-background">
          <Header />
          <PrimaryNavigation />
          
          <main className="pt-32 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="Building2" size={48} color="var(--color-primary)" />
                </div>
                
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Crea tu Cuenta de Negocio
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Transforma tu pasión en un negocio rentable. Vende productos únicos, 
                  crea contenido atractivo y conecta con clientes que valoran tu trabajo.
                </p>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="flex items-start space-x-4 p-6 bg-card border rounded-lg">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="Package" size={24} color="var(--color-primary)" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground mb-2">Catálogo Ilimitado</h3>
                      <p className="text-muted-foreground">
                        Sube todos tus productos sin límites y gestiona tu inventario fácilmente.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-6 bg-card border rounded-lg">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="Video" size={24} color="var(--color-accent)" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground mb-2">Videos Promocionales</h3>
                      <p className="text-muted-foreground">
                        Crea videos atractivos para mostrar tus productos y aumentar las ventas.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-6 bg-card border rounded-lg">
                    <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="BarChart3" size={24} color="var(--color-success)" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground mb-2">Analytics Detallados</h3>
                      <p className="text-muted-foreground">
                        Seguimiento completo de ventas, views y rendimiento de productos.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-6 bg-card border rounded-lg">
                    <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="Award" size={24} color="var(--color-warning)" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground mb-2">Verificación</h3>
                      <p className="text-muted-foreground">
                        Obtén el badge de verificación para generar más confianza en tus clientes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => setShowCreateFlow(true)}
                    className="px-8"
                  >
                    <Icon name="Plus" size={20} className="mr-2" />
                    Crear Cuenta de Negocio
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => window.location.href = '/marketplace'}
                    className="px-8"
                  >
                    <Icon name="Store" size={20} className="mr-2" />
                    Explorar Marketplace
                  </Button>
                </div>

                <div className="mt-8 text-sm text-muted-foreground">
                  <p>¿Ya tienes una cuenta de negocio? 
                    <button 
                      onClick={() => setShowCreateFlow(true)}
                      className="text-primary hover:underline ml-1"
                    >
                      Configúrala aquí
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  // Mostrar flujo de creación
  if (showCreateFlow) {
    return (
      <>
        <Helmet>
          <title>Configurar Negocio | RADEISAN</title>
          <meta name="description" content="Configura tu perfil de negocio en RADEISAN" />
        </Helmet>

        <div className="min-h-screen bg-background">
          <Header />
          <PrimaryNavigation />
          
          <main className="pt-32 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Configura tu Perfil de Negocio
                </h1>
                <p className="text-muted-foreground">
                  Completa la información de tu negocio para empezar a vender
                </p>
              </div>

              {/* Setup Form */}
              <ProfileSetupSection
                businessData={businessData || {}}
                loading={businessLoading}
                uploading={uploading}
                onUpdate={handleCreateBusinessAccount}
                onImageUpload={handleImageUpload}
                categories={BUSINESS_CATEGORIES}
                types={BUSINESS_TYPES}
                countries={COUNTRY_OPTIONS}
                isCreating={true}
              />

              {/* Back Button */}
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateFlow(false)}
                >
                  <Icon name="ArrowLeft" size={16} className="mr-2" />
                  Volver
                </Button>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  // ===============================
  // RENDER PRINCIPAL - CORREGIDO
  // ===============================
  return (
    <>
      <Helmet>
        <title>{businessData?.businessName || 'Mi Negocio'} - Gestión | RADEISAN</title>
        <meta name="description" content={`Gestiona tu negocio ${businessData?.businessName || ''} en RADEISAN. ${analytics.overview.totalProducts} productos, ${analytics.overview.totalViews} visualizaciones.`} />
        <meta name="keywords" content="negocio, gestión, productos, ventas, analytics, dashboard" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                    {businessData?.logo ? (
                      <img 
                        src={businessData.logo} 
                        alt={businessData.businessName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Icon name="Building2" size={32} color="var(--color-primary)" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      {businessData?.businessName || 'Mi Negocio'}
                    </h1>
                    <p className="text-muted-foreground flex items-center space-x-2">
                      <span>{businessData?.category && BUSINESS_CATEGORIES.find(c => c.value === businessData.category)?.label}</span>
                      {businessData?.isVerified && (
                        <Icon name="BadgeCheck" size={16} color="var(--color-success)" />
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/marketplace'}
                  >
                    <Icon name="ExternalLink" size={16} className="mr-2" />
                    Ver en Marketplace
                  </Button>
                  <Button onClick={() => setActiveTab('profile')}>
                    <Icon name="Settings" size={16} className="mr-2" />
                    Configurar
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="Package" size={20} color="var(--color-primary)" />
                    <span className="text-2xl font-bold text-foreground">
                      {analytics.overview.totalProducts}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Productos</p>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="Eye" size={20} color="var(--color-accent)" />
                    <span className="text-2xl font-bold text-foreground">
                      {analytics.overview.totalViews.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Visualizaciones</p>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="ShoppingCart" size={20} color="var(--color-success)" />
                    <span className="text-2xl font-bold text-foreground">
                      {analytics.overview.totalOrders}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Órdenes</p>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="DollarSign" size={20} color="var(--color-warning)" />
                    <span className="text-2xl font-bold text-foreground">
                      ${analytics.overview.totalRevenue.toFixed(0)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Ingresos</p>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="mb-8">
              <div className="border-b border-border">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => !tab.disabled && setActiveTab(tab.id)}
                      disabled={tab.disabled}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : tab.disabled
                          ? 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon name={tab.icon} size={16} />
                        <span>{tab.label}</span>
                      </div>
                      {tab.description && (
                        <div className="text-xs mt-1 text-muted-foreground">
                          {tab.description}
                        </div>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {renderTabContent()}
            </div>
          </div>
        </main>

        {/* Floating Action Button - Add Product */}
        {activeTab === 'products' && isBusinessAccount && (
          <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
            <Button
              size="lg"
              className="rounded-full shadow-lg"
              onClick={() => {
                // TODO: Abrir modal de agregar producto
                console.log('Add product');
              }}
            >
              <Icon name="Plus" size={16} className="mr-2" />
              Agregar Producto
            </Button>
          </div>
        )}

        {/* Success Message */}
        {isBusinessAccount && (
          <div className="fixed bottom-4 left-4 max-w-sm bg-card border rounded-lg p-4 shadow-lg z-50 hidden lg:block">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="CheckCircle" size={20} color="var(--color-success)" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">¡Negocio activo!</h4>
                <p className="text-sm text-muted-foreground">
                  Tu perfil de negocio está configurado y listo para recibir clientes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BusinessProfileManagement;
