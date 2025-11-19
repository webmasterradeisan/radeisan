import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
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
    config: {
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

  // Manejar actualización de pasarela - REPARADO
  const handleSaveGateway = async () => {
    try {
      setLoading(true);
      
      // Validar que haya credenciales antes de guardar
      const hasCredentials = gatewayForm.gateway_name === 'mercadopago' 
        ? (gatewayForm.config.public_key && gatewayForm.config.access_token)
        : (gatewayForm.config.api_key);

      if (gatewayForm.is_active && !hasCredentials) {
        showToast('Debes ingresar las credenciales antes de activar la pasarela', 'error');
        setLoading(false);
        return;
      }

      // Preparar credenciales según la pasarela
      let configToSave = {};
      if (gatewayForm.gateway_name === 'mercadopago') {
        configToSave = {
          public_key: gatewayForm.config.public_key || '',
          access_token: gatewayForm.config.access_token || ''
        };
      } else if (gatewayForm.gateway_name === 'bold') {
        configToSave = {
          api_key: gatewayForm.config.api_key || ''
        };
      }

      console.log('Guardando pasarela:', {
        gateway: gatewayForm.gateway_name,
        is_active: gatewayForm.is_active,
        is_default: gatewayForm.is_default,
        config: configToSave
      });

      const { error } = await supabase.rpc('update_gateway_config', {
        p_gateway_name: gatewayForm.gateway_name,
        p_is_active: gatewayForm.is_active,
        p_is_default: gatewayForm.is_default,
        p_credentials: configToSave,  // La RPC espera p_credentials aunque se guarde en config
        p_settings: null
      });
      
      if (error) {
        console.error('Error al guardar:', error);
        throw error;
      }
      
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

  // Funciones de gestión de modales
  const openPackageModal = (pkg = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPackageForm({
        name: pkg.name,
        description: pkg.description,
        points_amount: pkg.points_amount.toString(),
        price_cop: pkg.price_cop.toString(),
        discount_percentage: pkg.discount_percentage || 0,
        is_featured: pkg.is_featured || false,
        badge_text: pkg.badge_text || ''
      });
    } else {
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
    }
    setShowPackageModal(true);
  };

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

  const openGatewayModal = (gateway) => {
    setEditingGateway(gateway);
    setGatewayForm({
      gateway_name: gateway.gateway_name,
      is_active: gateway.is_active,
      is_default: gateway.is_default,
      config: gateway.config || {
        public_key: '',
        access_token: '',
        api_key: ''
      }
    });
    setShowCredentials({});
    setShowGatewayModal(true);
  };

  const closeGatewayModal = () => {
    setShowGatewayModal(false);
    setEditingGateway(null);
    setGatewayForm({
      gateway_name: '',
      is_active: false,
      is_default: false,
      config: {
        public_key: '',
        access_token: '',
        api_key: ''
      }
    });
    setShowCredentials({});
  };

  // Sistema de notificaciones
  const showToast = (message, type = 'info') => {
    // Implementación simple de toast
    const toastColors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500'
    };

    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 ${toastColors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-fade-out-up');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Formatear números
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading && packages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadAllData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-500" />
            Gestión de Puntos Premium
          </h1>
          <p className="text-gray-600 mt-2">
            Administra paquetes de puntos y pasarelas de pago
          </p>
        </div>

        {/* Estadísticas */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ventas Totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.total_sales || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingresos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(statistics.total_revenue || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Puntos Vendidos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(statistics.total_points_sold || 0).toLocaleString()}
                  </p>
                </div>
                <Award className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Precio Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(statistics.average_sale_price || 0)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* Paquetes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6" />
              Paquetes de Puntos
            </h2>
            <button
              onClick={() => openPackageModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="h-5 w-5" />
              Nuevo Paquete
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-white rounded-lg shadow overflow-hidden ${
                  !pkg.is_active ? 'opacity-60' : ''
                } ${pkg.is_featured ? 'ring-2 ring-yellow-400' : ''}`}
              >
                {pkg.is_featured && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 text-sm font-medium flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    {pkg.badge_text || 'Destacado'}
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {pkg.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {pkg.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Puntos:</span>
                      <span className="font-bold text-blue-600">
                        {pkg.points_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Precio:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(pkg.price_cop)}
                      </span>
                    </div>
                    {pkg.discount_percentage > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Descuento:</span>
                        <span className="font-bold text-red-600">
                          {pkg.discount_percentage}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openPackageModal(pkg)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      Desactivar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pasarelas de Pago */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Pasarelas de Pago
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gateways.map((gateway) => (
              <div
                key={gateway.id}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {gateway.display_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {gateway.gateway_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {gateway.is_active && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Activa
                      </span>
                    )}
                    {gateway.is_default && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        Predeterminada
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Credenciales configuradas:</p>
                  <div className="flex gap-2 flex-wrap">
                    {gateway.config?.public_key && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        Public Key
                      </span>
                    )}
                    {gateway.config?.access_token && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        Access Token
                      </span>
                    )}
                    {gateway.config?.api_key && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        API Key
                      </span>
                    )}
                    {!gateway.config?.public_key && !gateway.config?.access_token && !gateway.config?.api_key && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                        Sin credenciales
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openGatewayModal(gateway)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Settings className="h-5 w-5" />
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
                {editingPackage ? 'Editar Paquete' : 'Nuevo Paquete'}
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
                  Nombre del Paquete
                </label>
                <input
                  type="text"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Paquete Básico"
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
                  placeholder="Descripción del paquete"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Puntos
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
                    Precio (COP)
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
                  Descuento (%)
                </label>
                <input
                  type="number"
                  value={packageForm.discount_percentage}
                  onChange={(e) => setPackageForm({ ...packageForm, discount_percentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Marcar como Destacado
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Los paquetes destacados se muestran con un badge especial
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageForm.is_featured}
                    onChange={(e) => setPackageForm({ ...packageForm, is_featured: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {packageForm.is_featured && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto del Badge (opcional)
                  </label>
                  <input
                    type="text"
                    value={packageForm.badge_text}
                    onChange={(e) => setPackageForm({ ...packageForm, badge_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Más Popular"
                  />
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
                disabled={loading}
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
                          value={gatewayForm.config.public_key || ''}
                          onChange={(e) => setGatewayForm({
                            ...gatewayForm,
                            config: { ...gatewayForm.config, public_key: e.target.value }
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
                          value={gatewayForm.config.access_token || ''}
                          onChange={(e) => setGatewayForm({
                            ...gatewayForm,
                            config: { ...gatewayForm.config, access_token: e.target.value }
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
                        value={gatewayForm.config.api_key || ''}
                        onChange={(e) => setGatewayForm({
                          ...gatewayForm,
                          config: { ...gatewayForm.config, api_key: e.target.value }
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
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
