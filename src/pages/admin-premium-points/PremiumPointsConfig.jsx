import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { 
  Plus, Edit2, Trash2, Save, X, DollarSign, Package, 
  CreditCard, Settings, TrendingUp, Eye, EyeOff, AlertCircle,
  CheckCircle, Star, Award
} from 'lucide-react';

const PremiumPointsConfig = () => {
  // Estado de paquetes
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado de modales
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [editingGateway, setEditingGateway] = useState(null);
  
  // Estado de formulario de paquete
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    points_amount: '',
    price_cop: '',
    discount_percentage: 0,
    is_featured: false,
    badge_text: ''
  });

  // Estado de formulario de pasarela
  const [gatewayForm, setGatewayForm] = useState({
    gateway_name: '',
    is_active: false,
    is_default: false,
    credentials: {
      public_key: '',
      access_token: '',
      api_key: ''
    }
  });

  // Estado de vista de credenciales
  const [showCredentials, setShowCredentials] = useState({});

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAllData();
  }, []);

  // Función para cargar todos los datos
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadPackages(),
        loadGateways(),
        loadStatistics()
      ]);
    } catch (err) {
      setError('Error al cargar los datos: ' + err.message);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar paquetes
  const loadPackages = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_packages_admin');
      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error('Error loading packages:', err);
      throw err;
    }
  };

  // Cargar pasarelas
  const loadGateways = async () => {
    try {
      const { data, error } = await supabase.rpc('get_gateways_config_admin');
      if (error) throw error;
      setGateways(data || []);
    } catch (err) {
      console.error('Error loading gateways:', err);
      throw err;
    }
  };

  // Cargar estadísticas
  const loadStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_sales_statistics');
      if (error) throw error;
      setStatistics(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error('Error loading statistics:', err);
      throw err;
    }
  };

  // Manejar creación/edición de paquete
  const handleSavePackage = async () => {
    try {
      setLoading(true);
      
      if (editingPackage) {
        // Actualizar paquete existente
        const { error } = await supabase.rpc('update_premium_package', {
          p_package_id: editingPackage.id,
          p_name: packageForm.name,
          p_description: packageForm.description,
          p_points_amount: parseInt(packageForm.points_amount),
          p_price_cop: parseFloat(packageForm.price_cop),
          p_discount_percentage: parseInt(packageForm.discount_percentage),
          p_is_active: editingPackage.is_active,
          p_is_featured: packageForm.is_featured,
          p_badge_text: packageForm.badge_text || null
        });
        
        if (error) throw error;
        showToast('Paquete actualizado exitosamente', 'success');
      } else {
        // Crear nuevo paquete
        const { error } = await supabase.rpc('create_premium_package', {
          p_name: packageForm.name,
          p_description: packageForm.description,
          p_points_amount: parseInt(packageForm.points_amount),
          p_price_cop: parseFloat(packageForm.price_cop),
          p_discount_percentage: parseInt(packageForm.discount_percentage),
          p_is_featured: packageForm.is_featured,
          p_badge_text: packageForm.badge_text || null
        });
        
        if (error) throw error;
        showToast('Paquete creado exitosamente', 'success');
      }
      
      // Recargar paquetes y cerrar modal
      await loadPackages();
      closePackageModal();
    } catch (err) {
      console.error('Error saving package:', err);
      showToast('Error al guardar el paquete: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manejar eliminación de paquete
  const handleDeletePackage = async (packageId) => {
    if (!confirm('¿Estás seguro de desactivar este paquete?')) return;
    
    try {
      setLoading(true);
      const { error } = await supabase.rpc('delete_premium_package', {
        p_package_id: packageId
      });
      
      if (error) throw error;
      showToast('Paquete desactivado exitosamente', 'success');
      await loadPackages();
    } catch (err) {
      console.error('Error deleting package:', err);
      showToast('Error al desactivar el paquete: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manejar actualización de pasarela
  const handleSaveGateway = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.rpc('update_gateway_config', {
        p_gateway_name: gatewayForm.gateway_name,
        p_is_active: gatewayForm.is_active,
        p_is_default: gatewayForm.is_default,
        p_credentials: gatewayForm.credentials,
        p_settings: null
      });
      
      if (error) throw error;
      showToast('Pasarela actualizada exitosamente', 'success');
      await loadGateways();
      closeGatewayModal();
    } catch (err) {
      console.error('Error saving gateway:', err);
      showToast('Error al guardar la pasarela: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para crear paquete
  const openCreatePackageModal = () => {
    setEditingPackage(null);
    setPackageForm({
      name: '',
      description: '',
      points_amount: '',
      price_cop: '',
      discount_percentage: 0,
      is_featured: false,
      badge_text: ''
    });
    setShowPackageModal(true);
  };

  // Abrir modal para editar paquete
  const openEditPackageModal = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      description: pkg.description,
      points_amount: pkg.points_amount.toString(),
      price_cop: pkg.price_cop.toString(),
      discount_percentage: pkg.discount_percentage,
      is_featured: pkg.is_featured,
      badge_text: pkg.badge_text || ''
    });
    setShowPackageModal(true);
  };

  // Cerrar modal de paquete
  const closePackageModal = () => {
    setShowPackageModal(false);
    setEditingPackage(null);
    setPackageForm({
      name: '',
      description: '',
      points_amount: '',
      price_cop: '',
      discount_percentage: 0,
      is_featured: false,
      badge_text: ''
    });
  };

  // Abrir modal para editar pasarela
  const openGatewayModal = (gateway) => {
    setEditingGateway(gateway);
    setGatewayForm({
      gateway_name: gateway.gateway_name,
      is_active: gateway.is_active,
      is_default: gateway.is_default,
      credentials: gateway.credentials || {
        public_key: '',
        access_token: '',
        api_key: ''
      }
    });
    setShowGatewayModal(true);
  };

  // Cerrar modal de pasarela
  const closeGatewayModal = () => {
    setShowGatewayModal(false);
    setEditingGateway(null);
    setGatewayForm({
      gateway_name: '',
      is_active: false,
      is_default: false,
      credentials: {
        public_key: '',
        access_token: '',
        api_key: ''
      }
    });
  };

  // Mostrar notificación
  const showToast = (message, type = 'info') => {
    // Implementar con tu sistema de notificaciones preferido
    alert(message);
  };

  // Formatear moneda COP
  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calcular precio con descuento
  const calculateDiscountedPrice = (price, discount) => {
    return price * (1 - discount / 100);
  };

  if (loading && packages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" />
            Puntos Premium
          </h1>
          <p className="text-gray-600 mt-1">Gestiona paquetes y pasarelas de pago</p>
        </div>
        <button
          onClick={openCreatePackageModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-5 w-5" />
          Crear Paquete
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Estadísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Ventas</p>
                <p className="text-3xl font-bold mt-1">{statistics.completed_sales}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ingresos Totales</p>
                <p className="text-2xl font-bold mt-1">{formatCOP(statistics.total_revenue)}</p>
              </div>
              <DollarSign className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Puntos Vendidos</p>
                <p className="text-3xl font-bold mt-1">{statistics.total_points_sold?.toLocaleString()}</p>
              </div>
              <Award className="h-12 w-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Ventas Hoy</p>
                <p className="text-3xl font-bold mt-1">{statistics.sales_today}</p>
                <p className="text-sm text-orange-100 mt-1">{formatCOP(statistics.revenue_today)}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-orange-200" />
            </div>
          </div>
        </div>
      )}

      {/* Paquetes de Puntos */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Paquetes de Puntos</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative border-2 rounded-lg p-6 transition ${
                  pkg.is_active 
                    ? 'border-blue-200 hover:border-blue-400' 
                    : 'border-gray-200 opacity-50'
                }`}
              >
                {/* Badge */}
                {pkg.is_featured && pkg.is_active && (
                  <div className="absolute -top-3 left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {pkg.badge_text || 'Destacado'}
                  </div>
                )}

                {/* Estado */}
                <div className="absolute top-4 right-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    pkg.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {pkg.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Contenido */}
                <div className="mt-2">
                  <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Puntos:</span>
                      <span className="font-bold text-blue-600">{pkg.points_amount.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Precio:</span>
                      <div className="text-right">
                        {pkg.discount_percentage > 0 ? (
                          <>
                            <span className="text-xs text-gray-400 line-through block">
                              {formatCOP(pkg.price_cop)}
                            </span>
                            <span className="font-bold text-green-600">
                              {formatCOP(calculateDiscountedPrice(pkg.price_cop, pkg.discount_percentage))}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-gray-900">{formatCOP(pkg.price_cop)}</span>
                        )}
                      </div>
                    </div>

                    {pkg.discount_percentage > 0 && (
                      <div className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full text-center">
                        {pkg.discount_percentage}% descuento
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openEditPackageModal(pkg)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 transition"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      disabled={!pkg.is_active}
                      className="flex items-center justify-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pasarelas de Pago */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Pasarelas de Pago
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gateways.map((gateway) => (
              <div
                key={gateway.id}
                className={`border-2 rounded-lg p-6 ${
                  gateway.is_active 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {gateway.logo_url && (
                      <img 
                        src={gateway.logo_url} 
                        alt={gateway.display_name}
                        className="h-10 w-auto"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">{gateway.display_name}</h3>
                      <p className="text-sm text-gray-600">{gateway.gateway_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      gateway.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {gateway.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                    {gateway.is_default && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        Predeterminada
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 font-medium mb-2">Métodos soportados:</p>
                  <div className="flex flex-wrap gap-2">
                    {gateway.supported_methods && Array.isArray(gateway.supported_methods) && 
                      gateway.supported_methods.map((method, idx) => (
                        <span 
                          key={idx}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                        >
                          {method.toUpperCase()}
                        </span>
                      ))
                    }
                  </div>
                </div>

                <button
                  onClick={() => openGatewayModal(gateway)}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  <Settings className="h-4 w-4" />
                  Configurar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Paquete */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {editingPackage ? 'Editar Paquete' : 'Crear Paquete'}
              </h3>
              <button
                onClick={closePackageModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Paquete *
                </label>
                <input
                  type="text"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ej: Paquete Premium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Descripción del paquete"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Puntos *
                  </label>
                  <input
                    type="number"
                    value={packageForm.points_amount}
                    onChange={(e) => setPackageForm({ ...packageForm, points_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio COP *
                  </label>
                  <input
                    type="number"
                    value={packageForm.price_cop}
                    onChange={(e) => setPackageForm({ ...packageForm, price_cop: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descuento (%) - Opcional
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={packageForm.discount_percentage}
                  onChange={(e) => setPackageForm({ ...packageForm, discount_percentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texto de Badge - Opcional
                </label>
                <input
                  type="text"
                  value={packageForm.badge_text}
                  onChange={(e) => setPackageForm({ ...packageForm, badge_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="¡Más Popular!"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={packageForm.is_featured}
                  onChange={(e) => setPackageForm({ ...packageForm, is_featured: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_featured" className="text-sm text-gray-700">
                  Marcar como destacado
                </label>
              </div>

              {/* Preview */}
              {packageForm.points_amount && packageForm.price_cop && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Vista Previa:</p>
                  <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900">{packageForm.name || 'Nombre del paquete'}</h4>
                    <p className="text-sm text-gray-600 mt-1">{packageForm.description || 'Descripción'}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-bold text-blue-600">{parseInt(packageForm.points_amount).toLocaleString()} puntos</span>
                      <span className="font-bold text-green-600">
                        {formatCOP(calculateDiscountedPrice(parseFloat(packageForm.price_cop), packageForm.discount_percentage))}
                      </span>
                    </div>
                    {packageForm.discount_percentage > 0 && (
                      <div className="mt-2 bg-green-50 text-green-700 text-xs px-2 py-1 rounded text-center">
                        {packageForm.discount_percentage}% descuento
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={closePackageModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePackage}
                disabled={!packageForm.name || !packageForm.points_amount || !packageForm.price_cop}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                {editingPackage ? 'Actualizar' : 'Crear Paquete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pasarela */}
      {showGatewayModal && editingGateway && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                Configurar {editingGateway.display_name}
              </h3>
              <button
                onClick={closeGatewayModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estado de la Pasarela
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Activa esta pasarela para que los usuarios puedan usarla
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gatewayForm.is_active}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pasarela Predeterminada
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Se seleccionará automáticamente para los usuarios
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gatewayForm.is_default}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, is_default: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Credenciales API</h4>
                
                {editingGateway.gateway_name === 'mercadopago' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Public Key
                      </label>
                      <div className="relative">
                        <input
                          type={showCredentials['public_key'] ? 'text' : 'password'}
                          value={gatewayForm.credentials.public_key || ''}
                          onChange={(e) => setGatewayForm({
                            ...gatewayForm,
                            credentials: { ...gatewayForm.credentials, public_key: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                          placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, public_key: !prev.public_key }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCredentials['public_key'] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Access Token
                      </label>
                      <div className="relative">
                        <input
                          type={showCredentials['access_token'] ? 'text' : 'password'}
                          value={gatewayForm.credentials.access_token || ''}
                          onChange={(e) => setGatewayForm({
                            ...gatewayForm,
                            credentials: { ...gatewayForm.credentials, access_token: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                          placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, access_token: !prev.access_token }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCredentials['access_token'] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {editingGateway.gateway_name === 'bold' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showCredentials['api_key'] ? 'text' : 'password'}
                        value={gatewayForm.credentials.api_key || ''}
                        onChange={(e) => setGatewayForm({
                          ...gatewayForm,
                          credentials: { ...gatewayForm.credentials, api_key: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCredentials(prev => ({ ...prev, api_key: !prev.api_key }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCredentials['api_key'] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Información importante:</p>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>Usa credenciales de prueba para desarrollo</li>
                        <li>Las credenciales se guardan de forma segura</li>
                        <li>Verifica que las credenciales sean correctas antes de activar</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={closeGatewayModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGateway}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Save className="h-5 w-5" />
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumPointsConfig;
