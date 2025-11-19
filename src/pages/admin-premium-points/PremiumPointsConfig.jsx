import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Edit2, Trash2, Save, X, AlertCircle, CheckCircle, 
  Package, CreditCard, Settings, RefreshCw, Eye, EyeOff 
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

const PremiumPointsConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  
  // Estados para Paquetes
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [currentPackage, setCurrentPackage] = useState(null);

  // Estados para Pasarelas
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [showSecrets, setShowSecrets] = useState(false);

  // Cargar datos iniciales
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Cargar Paquetes
      const { data: packagesData, error: packagesError } = await supabase
        .from('point_packages')
        .select('*')
        .order('price_cop', { ascending: true });

      if (packagesError) throw packagesError;

      // 2. Cargar Pasarelas
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('id');

      if (gatewaysError) throw gatewaysError;

      setPackages(packagesData || []);
      setGateways(gatewaysData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // LÓGICA DE PAQUETES (INTACTA)
  // ==========================================

  const handleEditPackage = (pkg = null) => {
    if (pkg) {
      setCurrentPackage(pkg);
    } else {
      setCurrentPackage({
        name: '',
        description: '',
        points_amount: 100,
        price_cop: 10000,
        discount_percentage: 0,
        is_active: true,
        is_featured: false,
        badge_text: ''
      });
    }
    setIsEditingPackage(true);
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este paquete?')) return;

    try {
      const { error } = await supabase
        .from('point_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Paquete eliminado');
      loadData();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Error al eliminar el paquete');
    }
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const packageData = {
        name: currentPackage.name,
        description: currentPackage.description,
        points_amount: parseInt(currentPackage.points_amount),
        price_cop: parseFloat(currentPackage.price_cop),
        discount_percentage: parseInt(currentPackage.discount_percentage || 0),
        is_active: currentPackage.is_active,
        is_featured: currentPackage.is_featured,
        badge_text: currentPackage.badge_text,
        updated_at: new Date()
      };

      if (currentPackage.id) {
        const { error } = await supabase
          .from('point_packages')
          .update(packageData)
          .eq('id', currentPackage.id);
        if (error) throw error;
        toast.success('Paquete actualizado');
      } else {
        const { error } = await supabase
          .from('point_packages')
          .insert(packageData);
        if (error) throw error;
        toast.success('Paquete creado');
      }

      setIsEditingPackage(false);
      setCurrentPackage(null);
      loadData();
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error('Error al guardar el paquete');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LÓGICA DE PASARELAS (CORREGIDA)
  // ==========================================

  const handleConfigureGateway = (gateway) => {
    setSelectedGateway(gateway);
    setShowSecrets(false);
  };

  // ✅ FUNCIÓN CORREGIDA: Usa FormData para asegurar que las credenciales se guarden
  const handleSaveGatewayConfig = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.target);

    try {
      // Capturar valores del formulario
      const isActive = formData.get('is_active') === 'on';
      const isDefault = formData.get('is_default') === 'on';
      
      // Construir objeto de credenciales
      let credentials = selectedGateway.credentials || {};

      // Si es MercadoPago, capturamos explícitamente los inputs del formulario
      if (selectedGateway.gateway_name === 'mercadopago') {
        const publicKey = formData.get('public_key');
        const accessToken = formData.get('access_token');

        if (publicKey && accessToken) {
          credentials = {
            public_key: publicKey.trim(),
            access_token: accessToken.trim()
          };
        }
      }

      const gatewayData = {
        id: selectedGateway.id,
        gateway_name: selectedGateway.gateway_name,
        display_name: selectedGateway.display_name,
        is_active: isActive,
        is_default: isDefault,
        credentials: credentials, // Guardamos el JSON actualizado
        updated_at: new Date()
      };

      // Si esta es default, quitar default a las demás
      if (isDefault) {
        await supabase
          .from('payment_gateways')
          .update({ is_default: false })
          .neq('id', selectedGateway.id);
      }

      const { error } = await supabase
        .from('payment_gateways')
        .upsert(gatewayData);

      if (error) throw error;

      toast.success('Configuración de pasarela guardada');
      setSelectedGateway(null);
      loadData();

    } catch (error) {
      console.error('Error saving gateway config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <Toaster position="top-right" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Puntos Premium</h1>
          <p className="text-gray-600">Gestiona los paquetes de puntos y pasarelas de pago</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* SECCIÓN 1: PAQUETES DE PUNTOS (INTACTA) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Package size={20} />
            Paquetes de Puntos
          </h2>
          <button
            onClick={() => handleEditPackage()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Nuevo Paquete
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`bg-white border rounded-xl p-6 shadow-sm relative ${
                !pkg.is_active ? 'opacity-75 bg-gray-50' : ''
              }`}
            >
              {pkg.is_active && (
                <span className="absolute top-4 right-4 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  Activo
                </span>
              )}
              
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                <p className="text-sm text-gray-500">{pkg.description}</p>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Puntos:</span>
                  <span className="font-bold text-blue-600">{pkg.points_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Precio:</span>
                  <div className="text-right">
                    {pkg.discount_percentage > 0 && (
                      <span className="text-xs text-gray-400 line-through block">
                        ${pkg.price_cop.toLocaleString()}
                      </span>
                    )}
                    <span className="font-bold text-gray-900">
                      ${(pkg.price_cop * (1 - pkg.discount_percentage/100)).toLocaleString()}
                    </span>
                  </div>
                </div>
                {pkg.discount_percentage > 0 && (
                  <div className="mt-2 text-center">
                    <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded border border-green-100">
                      {pkg.discount_percentage}% descuento
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEditPackage(pkg)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button
                  onClick={() => handleDeletePackage(pkg.id)}
                  className="px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 2: PASARELAS DE PAGO */}
      <section className="pt-8 border-t border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard size={20} />
            Pasarelas de Pago
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gateways.map((gateway) => (
            <div 
              key={gateway.id}
              className={`border rounded-xl p-6 transition-all ${
                gateway.is_active 
                  ? 'bg-white border-green-200 shadow-sm' 
                  : 'bg-gray-50 border-gray-200 opacity-75'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${
                    gateway.gateway_name === 'mercadopago' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{gateway.display_name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{gateway.gateway_name}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    gateway.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {gateway.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  {gateway.is_default && (
                    <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Predeterminada
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <p className="text-sm text-gray-600">Métodos soportados:</p>
                <div className="flex flex-wrap gap-2">
                  {gateway.supported_methods?.map((method) => (
                    <span key={method} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border">
                      {method.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleConfigureGateway(gateway)}
                className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center gap-2"
              >
                <Settings size={18} />
                Configurar
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL: EDICIÓN DE PAQUETES (INTACTA) */}
      {isEditingPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">
                {currentPackage.id ? 'Editar Paquete' : 'Nuevo Paquete'}
              </h3>
              <button onClick={() => setIsEditingPackage(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSavePackage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Paquete</label>
                <input
                  type="text"
                  value={currentPackage.name}
                  onChange={(e) => setCurrentPackage({...currentPackage, name: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={currentPackage.description}
                  onChange={(e) => setCurrentPackage({...currentPackage, description: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puntos</label>
                  <input
                    type="number"
                    value={currentPackage.points_amount}
                    onChange={(e) => setCurrentPackage({...currentPackage, points_amount: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (COP)</label>
                  <input
                    type="number"
                    value={currentPackage.price_cop}
                    onChange={(e) => setCurrentPackage({...currentPackage, price_cop: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    value={currentPackage.discount_percentage}
                    onChange={(e) => setCurrentPackage({...currentPackage, discount_percentage: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0" max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge (Opcional)</label>
                  <input
                    type="text"
                    value={currentPackage.badge_text || ''}
                    onChange={(e) => setCurrentPackage({...currentPackage, badge_text: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ej: ¡Popular!"
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPackage.is_active}
                    onChange={(e) => setCurrentPackage({...currentPackage, is_active: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Activo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPackage.is_featured}
                    onChange={(e) => setCurrentPackage({...currentPackage, is_featured: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Destacado</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingPackage(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {saving ? 'Guardando...' : 'Guardar Paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURACIÓN DE PASARELA (CORREGIDA) */}
      {selectedGateway && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Configurar {selectedGateway.display_name}
              </h3>
              <button 
                onClick={() => setSelectedGateway(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveGatewayConfig} className="p-6 space-y-6">
              {/* Configuración Específica de Mercado Pago */}
              {selectedGateway.gateway_name.toLowerCase() === 'mercadopago' && (
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Credenciales API</h4>
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                    >
                      {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showSecrets ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-blue-800 mb-1">Public Key</label>
                      {/* ✅ AÑADIDO NAME="PUBLIC_KEY" PARA QUE FUNCIONE EL GUARDADO */}
                      <input
                        type={showSecrets ? "text" : "password"}
                        name="public_key"
                        defaultValue={selectedGateway.credentials?.public_key || ''}
                        className="w-full p-2.5 border border-blue-200 rounded-md font-mono text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                        placeholder="TEST-..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-blue-800 mb-1">Access Token</label>
                      {/* ✅ AÑADIDO NAME="ACCESS_TOKEN" PARA QUE FUNCIONE EL GUARDADO */}
                      <input
                        type={showSecrets ? "text" : "password"}
                        name="access_token"
                        defaultValue={selectedGateway.credentials?.access_token || ''}
                        className="w-full p-2.5 border border-blue-200 rounded-md font-mono text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                        placeholder="TEST-..."
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 mt-2 text-xs text-blue-700 bg-white/50 p-2 rounded">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <p>
                      Asegúrate de usar las credenciales de <strong>Producción</strong> para ventas reales o <strong>Pruebas</strong> para desarrollo.
                    </p>
                  </div>
                </div>
              )}

              {/* Opciones Generales */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Estado de la Pasarela</span>
                    <span className="text-xs text-gray-500">Activa esta pasarela para que los usuarios puedan usarla</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    {/* ✅ AÑADIDO NAME="IS_ACTIVE" */}
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      defaultChecked={selectedGateway.is_active}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Pasarela Predeterminada</span>
                    <span className="text-xs text-gray-500">Se seleccionará automáticamente para los usuarios</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    {/* ✅ AÑADIDO NAME="IS_DEFAULT" */}
                    <input 
                      type="checkbox" 
                      name="is_default" 
                      defaultChecked={selectedGateway.is_default}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedGateway(null)}
                  className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Guardar Configuración
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumPointsConfig;
