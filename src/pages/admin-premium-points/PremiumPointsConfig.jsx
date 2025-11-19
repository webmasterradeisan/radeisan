// src/pages/admin-premium-points/PremiumPointsConfig.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Edit2, Trash2, Save, X, DollarSign, Package, 
  CreditCard, Settings, TrendingUp, Eye, EyeOff, AlertCircle,
  CheckCircle, Star, Award, Gift, Image as ImageIcon
} from 'lucide-react';

const PremiumPointsConfig = () => {
  // === ESTADOS DE PAQUETES ===
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // === NUEVO: ESTADO DE REGALOS VIRTUALES ===
  const [gifts, setGifts] = useState([]);
  
  // === ESTADOS DE MODALES ===
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false); // Nuevo modal
  
  const [editingPackage, setEditingPackage] = useState(null);
  const [editingGateway, setEditingGateway] = useState(null);
  const [editingGift, setEditingGift] = useState(null); // Nuevo edit state
  
  // === FORMULARIO DE PAQUETE ===
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    points_amount: '',
    price_cop: '',
    discount_percentage: 0,
    is_featured: false,
    badge_text: ''
  });

  // === NUEVO: FORMULARIO DE REGALO ===
  const [giftForm, setGiftForm] = useState({
    name: '',
    cost_points: '',
    icon_url: '',
    is_active: true
  });

  // === FORMULARIO DE PASARELA ===
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
        loadStatistics(),
        loadGifts() // Cargamos regalos
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
      // No lanzamos error para no bloquear la UI si fallan las stats
    }
  };

  // === NUEVO: CARGAR REGALOS ===
  const loadGifts = async () => {
    try {
      const { data, error } = await supabase
        .from('virtual_gifts')
        .select('*')
        .order('cost_points', { ascending: true });
      
      if (error) throw error;
      setGifts(data || []);
    } catch (err) {
      console.error('Error loading gifts:', err);
      throw err;
    }
  };

  // === HANDLERS DE PAQUETES ===
  const handleSavePackage = async () => {
    try {
      setLoading(true);
      if (editingPackage) {
        // Update
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
        // Create
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
      await loadPackages();
      closePackageModal();
    } catch (err) {
      showToast('Error al guardar el paquete: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (packageId) => {
    if (!confirm('¿Estás seguro de desactivar este paquete?')) return;
    try {
      setLoading(true);
      const { error } = await supabase.rpc('delete_premium_package', { p_package_id: packageId });
      if (error) throw error;
      showToast('Paquete desactivado exitosamente', 'success');
      await loadPackages();
    } catch (err) {
      showToast('Error al desactivar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // === NUEVO: HANDLERS DE REGALOS ===
  const handleSaveGift = async () => {
    try {
      setLoading(true);
      const giftData = {
        name: giftForm.name,
        cost_points: parseInt(giftForm.cost_points),
        icon_url: giftForm.icon_url,
        is_active: giftForm.is_active
      };

      if (editingGift) {
        const { error } = await supabase
          .from('virtual_gifts')
          .update(giftData)
          .eq('id', editingGift.id);
        if (error) throw error;
        showToast('Regalo actualizado correctamente', 'success');
      } else {
        const { error } = await supabase
          .from('virtual_gifts')
          .insert([giftData]);
        if (error) throw error;
        showToast('Regalo creado correctamente', 'success');
      }
      await loadGifts();
      closeGiftModal();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el regalo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGiftStatus = async (gift) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('virtual_gifts')
        .update({ is_active: !gift.is_active })
        .eq('id', gift.id);
      
      if (error) throw error;
      showToast(`Regalo ${!gift.is_active ? 'activado' : 'desactivado'}`, 'success');
      await loadGifts();
    } catch (err) {
      showToast('Error al cambiar estado', 'error');
    } finally {
      setLoading(false);
    }
  };

  // === HANDLERS DE PASARELA ===
  const handleSaveGateway = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('update_gateway_config', {
        p_gateway_name: gatewayForm.gateway_name,
        p_is_active: gatewayForm.is_active,
        p_is_default: gatewayForm.is_default,
        p_credentials: gatewayForm.config,
        p_settings: null
      });
      if (error) throw error;
      showToast('Pasarela actualizada exitosamente', 'success');
      await loadGateways();
      closeGatewayModal();
    } catch (err) {
      showToast('Error al guardar la pasarela: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // === MODAL OPEN/CLOSE HELPERS ===
  const openCreatePackageModal = () => {
    setEditingPackage(null);
    setPackageForm({ name: '', description: '', points_amount: '', price_cop: '', discount_percentage: 0, is_featured: false, badge_text: '' });
    setShowPackageModal(true);
  };

  const openEditPackageModal = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({ name: pkg.name, description: pkg.description, points_amount: pkg.points_amount.toString(), price_cop: pkg.price_cop.toString(), discount_percentage: pkg.discount_percentage, is_featured: pkg.is_featured, badge_text: pkg.badge_text || '' });
    setShowPackageModal(true);
  };

  const closePackageModal = () => { setShowPackageModal(false); setEditingPackage(null); };

  const openGatewayModal = (gateway) => {
    setEditingGateway(gateway);
    setGatewayForm({ gateway_name: gateway.gateway_name, is_active: gateway.is_active, is_default: gateway.is_default, config: gateway.config || { public_key: '', access_token: '', api_key: '' } });
    setShowGatewayModal(true);
  };

  const closeGatewayModal = () => { setShowGatewayModal(false); setEditingGateway(null); };

  // Helpers Modal Regalos
  const openCreateGiftModal = () => {
    setEditingGift(null);
    setGiftForm({ name: '', cost_points: '', icon_url: '', is_active: true });
    setShowGiftModal(true);
  };

  const openEditGiftModal = (gift) => {
    setEditingGift(gift);
    setGiftForm({ name: gift.name, cost_points: gift.cost_points, icon_url: gift.icon_url, is_active: gift.is_active });
    setShowGiftModal(true);
  };

  const closeGiftModal = () => { setShowGiftModal(false); setEditingGift(null); };

  const showToast = (message) => alert(message);
  const formatCOP = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  const calculateDiscountedPrice = (price, discount) => price * (1 - discount / 100);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" />
            Puntos Premium
          </h1>
          <p className="text-gray-600 mt-1">Gestiona paquetes, regalos virtuales y pasarelas</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openCreateGiftModal}
            className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition shadow-sm"
          >
            <Gift className="h-5 w-5" />
            Crear Regalo
          </button>
          <button
            onClick={openCreatePackageModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Crear Paquete
          </button>
        </div>
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
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Ventas</p>
                <p className="text-3xl font-bold mt-1">{statistics.completed_sales}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ingresos Totales</p>
                <p className="text-2xl font-bold mt-1">{formatCOP(statistics.total_revenue)}</p>
              </div>
              <DollarSign className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Puntos Vendidos</p>
                <p className="text-3xl font-bold mt-1">{statistics.total_points_sold?.toLocaleString()}</p>
              </div>
              <Award className="h-12 w-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
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

      {/* SECCIÓN 1: Paquetes de Puntos */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Paquetes de Puntos</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative border-2 rounded-lg p-6 transition ${pkg.is_active ? 'border-blue-200 hover:border-blue-400' : 'border-gray-200 opacity-50'}`}
              >
                {pkg.is_featured && pkg.is_active && (
                  <div className="absolute -top-3 left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Star className="h-3 w-3" /> {pkg.badge_text || 'Destacado'}
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {pkg.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Puntos:</span><span className="font-bold text-blue-600">{pkg.points_amount.toLocaleString()}</span></div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Precio:</span>
                      <div className="text-right">
                        {pkg.discount_percentage > 0 ? (
                          <>
                            <span className="text-xs text-gray-400 line-through block">{formatCOP(pkg.price_cop)}</span>
                            <span className="font-bold text-green-600">{formatCOP(calculateDiscountedPrice(pkg.price_cop, pkg.discount_percentage))}</span>
                          </>
                        ) : <span className="font-bold text-gray-900">{formatCOP(pkg.price_cop)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => openEditPackageModal(pkg)} className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 transition"><Edit2 className="h-4 w-4" /> Editar</button>
                    <button onClick={() => handleDeletePackage(pkg.id)} disabled={!pkg.is_active} className="flex items-center justify-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 transition disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN 2 (NUEVO): Regalos Virtuales */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-pink-600" />
            Regalos Virtuales
          </h2>
          <span className="text-sm text-gray-500">{gifts.length} regalos creados</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gifts.map((gift) => (
              <div key={gift.id} className={`relative border rounded-lg p-4 transition hover:shadow-md ${!gift.is_active && 'opacity-60 bg-gray-50'}`}>
                <div className="absolute top-2 right-2">
                   <div className={`w-3 h-3 rounded-full ${gift.is_active ? 'bg-green-500' : 'bg-gray-300'}`} title={gift.is_active ? "Activo" : "Inactivo"}></div>
                </div>
                
                <div className="flex justify-center mb-4 h-16">
                   <img src={gift.icon_url || "https://via.placeholder.com/100"} alt={gift.name} className="h-full object-contain" />
                </div>
                
                <h3 className="text-center font-bold text-gray-900">{gift.name}</h3>
                
                <div className="flex justify-center mt-2 mb-4">
                  <span className="bg-pink-50 text-pink-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                     <Star className="h-3 w-3 fill-current" /> {gift.cost_points} Pts
                  </span>
                </div>

                <div className="flex gap-2 mt-auto">
                   <button 
                     onClick={() => openEditGiftModal(gift)} 
                     className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded text-xs font-medium transition"
                   >
                     Editar
                   </button>
                   <button 
                     onClick={() => handleToggleGiftStatus(gift)} 
                     className={`px-2 py-1.5 rounded transition ${gift.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                     title={gift.is_active ? "Desactivar" : "Activar"}
                   >
                     {gift.is_active ? <Trash2 className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                   </button>
                </div>
              </div>
            ))}
            
            {/* Card para crear nuevo regalo (acceso rápido) */}
            <div 
              onClick={openCreateGiftModal}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition min-h-[200px]"
            >
               <Plus className="h-8 w-8 text-gray-400 mb-2" />
               <span className="text-sm font-medium text-gray-500">Añadir Regalo</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Pasarelas de Pago */}
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
              <div key={gateway.id} className={`border-2 rounded-lg p-6 ${gateway.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {gateway.logo_url && <img src={gateway.logo_url} alt={gateway.display_name} className="h-10 w-auto" />}
                    <div>
                      <h3 className="font-bold text-gray-900">{gateway.display_name}</h3>
                      <p className="text-sm text-gray-600">{gateway.gateway_name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${gateway.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{gateway.is_active ? 'Activa' : 'Inactiva'}</span>
                    {gateway.is_default && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">Predeterminada</span>}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 font-medium mb-2">Métodos soportados:</p>
                  <div className="flex flex-wrap gap-2">
                    {gateway.supported_methods?.map((method, idx) => (<span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{method.toUpperCase()}</span>))}
                  </div>
                </div>
                <button onClick={() => openGatewayModal(gateway)} className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"><Settings className="h-4 w-4" /> Configurar</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DE PAQUETE (Existente) */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">{editingPackage ? 'Editar Paquete' : 'Crear Paquete'}</h3>
              <button onClick={closePackageModal} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Paquete *</label><input type="text" value={packageForm.name} onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="ej: Paquete Premium" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea value={packageForm.description} onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="3" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Puntos *</label><input type="number" value={packageForm.points_amount} onChange={(e) => setPackageForm({ ...packageForm, points_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio COP *</label><input type="number" value={packageForm.price_cop} onChange={(e) => setPackageForm({ ...packageForm, price_cop: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label><input type="number" value={packageForm.discount_percentage} onChange={(e) => setPackageForm({ ...packageForm, discount_percentage: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Badge (opcional)</label><input type="text" value={packageForm.badge_text} onChange={(e) => setPackageForm({ ...packageForm, badge_text: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Más Popular" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="is_featured" checked={packageForm.is_featured} onChange={(e) => setPackageForm({ ...packageForm, is_featured: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" /><label htmlFor="is_featured" className="text-sm text-gray-700">Marcar como destacado</label></div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={closePackageModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSavePackage} disabled={!packageForm.name || !packageForm.points_amount || !packageForm.price_cop} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Save className="h-5 w-5" /> {editingPackage ? 'Actualizar' : 'Crear Paquete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO: MODAL DE REGALO */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-600" />
                {editingGift ? 'Editar Regalo' : 'Crear Regalo'}
              </h3>
              <button onClick={closeGiftModal} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Preview del Icono */}
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {giftForm.icon_url ? (
                    <img src={giftForm.icon_url} alt="Preview" className="w-full h-full object-contain" onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=Error'} />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Regalo *</label>
                <input type="text" value={giftForm.name} onChange={(e) => setGiftForm({ ...giftForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500" placeholder="ej: Rosa Virtual" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo en Puntos *</label>
                <input type="number" value={giftForm.cost_points} onChange={(e) => setGiftForm({ ...giftForm, cost_points: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500" placeholder="50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de la Imagen (Icono) *</label>
                <input type="text" value={giftForm.icon_url} onChange={(e) => setGiftForm({ ...giftForm, icon_url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500" placeholder="https://..." />
                <p className="text-xs text-gray-500 mt-1">Recomendado: PNG transparente o SVG</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="gift_active" checked={giftForm.is_active} onChange={(e) => setGiftForm({ ...giftForm, is_active: e.target.checked })} className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                <label htmlFor="gift_active" className="text-sm text-gray-700">Regalo activo (visible en tienda)</label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={closeGiftModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveGift} disabled={!giftForm.name || !giftForm.cost_points || !giftForm.icon_url} className="flex-1 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 disabled:opacity-50">Guardar Regalo</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PASARELA (Existente) */}
      {showGatewayModal && editingGateway && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Configurar {editingGateway.display_name}</h3>
              <button onClick={closeGatewayModal} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div><label className="block text-sm font-medium text-gray-700">Estado</label><p className="text-xs text-gray-500">Activa para usuarios</p></div>
                <input type="checkbox" checked={gatewayForm.is_active} onChange={(e) => setGatewayForm({ ...gatewayForm, is_active: e.target.checked })} className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center justify-between">
                <div><label className="block text-sm font-medium text-gray-700">Predeterminada</label><p className="text-xs text-gray-500">Selección automática</p></div>
                <input type="checkbox" checked={gatewayForm.is_default} onChange={(e) => setGatewayForm({ ...gatewayForm, is_default: e.target.checked })} className="w-4 h-4 text-blue-600" />
              </div>
              
              {/* Configuración dinámica de keys */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Credenciales API</h4>
                {Object.keys(gatewayForm.config).map((key) => (
                   <div key={key} className="mb-4">
                     <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{key.replace('_', ' ')}</label>
                     <div className="relative">
                       <input 
                         type={showCredentials[key] ? 'text' : 'password'} 
                         value={gatewayForm.config[key]} 
                         onChange={(e) => setGatewayForm({...gatewayForm, config: {...gatewayForm.config, [key]: e.target.value}})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                       />
                       <button type="button" onClick={() => setShowCredentials(prev => ({...prev, [key]: !prev[key]}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                         {showCredentials[key] ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                       </button>
                     </div>
                   </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={closeGatewayModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">Cancelar</button>
              <button onClick={handleSaveGateway} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumPointsConfig;
