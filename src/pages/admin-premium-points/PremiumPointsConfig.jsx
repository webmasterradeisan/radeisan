// src/pages/admin-premium-points/PremiumPointsConfig.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CreditCard, Settings, Save, AlertCircle, CheckCircle, 
  ToggleLeft, ToggleRight, Eye, EyeOff, RefreshCw 
} from 'lucide-react';
import { toast } from 'react-hot-toast'; // Asumiendo que usas react-hot-toast o similar

const PremiumPointsConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [showSecrets, setShowSecrets] = useState(false);

  // Cargar configuraciones
  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('id');

      if (error) throw error;
      setGateways(data || []);
    } catch (error) {
      console.error('Error loading gateways:', error);
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Abrir modal de configuración
  const handleConfigureGateway = (gateway) => {
    setSelectedGateway(gateway);
    setShowSecrets(false);
  };

  // ✅ FUNCIÓN CORREGIDA Y ROBUSTA PARA GUARDAR
  const handleSaveGatewayConfig = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Usamos FormData para extraer los datos de forma segura
    const formData = new FormData(e.currentTarget);

    try {
      const isActive = formData.get('is_active') === 'on';
      const isDefault = formData.get('is_default') === 'on';
      
      let credentials = {};
      const gatewayName = selectedGateway.gateway_name.toLowerCase();

      // Captura específica para Mercado Pago
      if (gatewayName === 'mercadopago') {
        const publicKey = formData.get('public_key');
        const accessToken = formData.get('access_token');

        if (!publicKey || !accessToken) {
          throw new Error('La Public Key y el Access Token son obligatorios');
        }

        credentials = {
          public_key: publicKey.trim(),
          access_token: accessToken.trim()
        };
      }
      // Aquí puedes agregar 'else if' para otras pasarelas (Bold, Stripe, etc.)

      const gatewayData = {
        id: selectedGateway.id,
        gateway_name: selectedGateway.gateway_name,
        display_name: selectedGateway.display_name,
        is_active: isActive,
        is_default: isDefault,
        credentials: credentials, // ¡Aquí va el JSON correcto!
        supported_methods: ['CREDIT_CARD', 'DEBIT_CARD', 'PSE', 'EFECTY', 'BALOTO'],
        updated_at: new Date()
      };

      console.log('💾 Guardando configuración:', gatewayData); // Debug en consola

      // Si activamos esta como default, desactivar default en las otras
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

      toast.success('Configuración guardada exitosamente');
      setSelectedGateway(null);
      loadData(); // Recargar lista

    } catch (error) {
      console.error('Error saving config:', error);
      toast.error(error.message || 'Error al guardar la configuración');
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pasarelas de Pago</h1>
          <p className="text-gray-600">Configura los métodos de pago para la compra de puntos</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Lista de Pasarelas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gateways.map((gateway) => (
          <div 
            key={gateway.id}
            className={`border rounded-lg p-6 transition-all ${
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

      {/* Modal de Configuración */}
      {selectedGateway && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Configurar {selectedGateway.display_name}
              </h3>
              <button 
                onClick={() => setSelectedGateway(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
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
