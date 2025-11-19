// src/pages/admin-premium-points/PremiumPointsConfig.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Edit2, Trash2, Save, X, DollarSign, Package, 
  CreditCard, Settings, TrendingUp, Eye, EyeOff, AlertCircle,
  CheckCircle, Star, Award, Gift, Image as ImageIcon, Calculator,
  ShoppingBag, Info
} from 'lucide-react';

const PremiumPointsConfig = () => {
  // === ESTADOS GLOBALES ===
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Datos de la DB
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  
  // Estados de Modales
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  
  // Estados de Edición
  const [editingPackage, setEditingPackage] = useState(null);
  const [editingGateway, setEditingGateway] = useState(null);
  const [editingGift, setEditingGift] = useState(null);
  
  // Formulario Paquetes
  const [packageForm, setPackageForm] = useState({
    name: '', description: '', points_amount: '', price_cop: '', 
    discount_percentage: 0, is_featured: false, badge_text: ''
  });

  // Formulario Regalos (Ajustado para estrategia híbrida)
  const [giftForm, setGiftForm] = useState({
    name: '', 
    price_cop: '',     // Precio de venta directa individual
    cost_points: '',   // Precio en puntos (debe ser más atractivo)
    commission_percent: 30, 
    icon_url: '', 
    is_active: true
  });

  // Formulario Pasarelas
  const [gatewayForm, setGatewayForm] = useState({
    gateway_name: '', is_active: false, is_default: false,
    config: { public_key: '', access_token: '', api_key: '' }
  });

  const [showCredentials, setShowCredentials] = useState({});

  // Cargar datos iniciales
  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadPackages(), loadGateways(), loadStatistics(), loadGifts()]);
    } catch (err) {
      console.error('Error loading data:', err);
      // No mostramos error global para no bloquear UI si falla una parte menor
    } finally {
      setLoading(false);
    }
  };

  // Funciones de carga
  const loadPackages = async () => {
    const { data } = await supabase.rpc('get_all_packages_admin');
    setPackages(data || []);
  };
  const loadGateways = async () => {
    const { data } = await supabase.rpc('get_gateways_config_admin');
    setGateways(data || []);
  };
  const loadStatistics = async () => {
    const { data } = await supabase.rpc('get_sales_statistics');
    setStatistics(data?.[0] || null);
  };
  const loadGifts = async () => {
    const { data } = await supabase.from('virtual_gifts').select('*').order('price_cop', { ascending: true });
    setGifts(data || []);
  };

  // === CALCULADORA DE ESTRATEGIA DE PRECIOS ===
  const handleCalculatePoints = (copValue) => {
    if (!copValue) return;
    // Lógica de negocio: 1 Punto ~ 100 COP.
    // Se calcula exacto, pero el admin debería bajarlo manualmente un poco 
    // para que sea más barato comprar con puntos.
    const exactPoints = Math.floor(parseInt(copValue) / 100); 
    setGiftForm(prev => ({ ...prev, cost_points: exactPoints }));
  };

  // === HANDLERS DE GUARDADO ===
  const handleSavePackage = async () => {
    try {
      setLoading(true);
      const payload = {
        p_name: packageForm.name,
        p_description: packageForm.description,
        p_points_amount: parseInt(packageForm.points_amount),
        p_price_cop: parseFloat(packageForm.price_cop),
        p_discount_percentage: parseInt(packageForm.discount_percentage),
        p_is_featured: packageForm.is_featured,
        p_badge_text: packageForm.badge_text || null
      };
      
      if (editingPackage) {
        await supabase.rpc('update_premium_package', { p_package_id: editingPackage.id, ...payload, p_is_active: editingPackage.is_active });
      } else {
        await supabase.rpc('create_premium_package', payload);
      }
      await loadPackages();
      closePackageModal();
    } catch (e) { alert('Error: ' + e.message); } finally { setLoading(false); }
  };

  const handleSaveGift = async () => {
    try {
      setLoading(true);
      const giftData = {
        name: giftForm.name,
        price_cop: parseFloat(giftForm.price_cop), // Precio Venta Directa
        cost_points: parseInt(giftForm.cost_points), // Precio Puntos
        commission_percent: parseInt(giftForm.commission_percent),
        icon_url: giftForm.icon_url,
        is_active: giftForm.is_active
      };

      if (editingGift) {
        await supabase.from('virtual_gifts').update(giftData).eq('id', editingGift.id);
      } else {
        await supabase.from('virtual_gifts').insert([giftData]);
      }
      await loadGifts();
      closeGiftModal();
    } catch (e) { alert('Error: ' + e.message); } finally { setLoading(false); }
  };

  const handleSaveGateway = async () => {
    try {
      setLoading(true);
      await supabase.rpc('update_gateway_config', {
        p_gateway_name: gatewayForm.gateway_name,
        p_is_active: gatewayForm.is_active,
        p_is_default: gatewayForm.is_default,
        p_credentials: gatewayForm.config,
        p_settings: null
      });
      await loadGateways();
      closeGatewayModal();
    } catch (e) { alert('Error: ' + e.message); } finally { setLoading(false); }
  };

  const handleDeletePackage = async (id) => {
    if(!confirm('Confirmar desactivación')) return;
    await supabase.rpc('delete_premium_package', { p_package_id: id });
    loadPackages();
  };
  
  const handleToggleGift = async (gift) => {
    await supabase.from('virtual_gifts').update({ is_active: !gift.is_active }).eq('id', gift.id);
    loadGifts();
  };

  // === UI Helpers & Modals ===
  const openPackageModal = (pkg = null) => {
    setEditingPackage(pkg);
    setPackageForm(pkg ? 
      { name: pkg.name, description: pkg.description, points_amount: pkg.points_amount, price_cop: pkg.price_cop, discount_percentage: pkg.discount_percentage, is_featured: pkg.is_featured, badge_text: pkg.badge_text } : 
      { name: '', description: '', points_amount: '', price_cop: '', discount_percentage: 0, is_featured: false, badge_text: '' }
    );
    setShowPackageModal(true);
  };
  const closePackageModal = () => setShowPackageModal(false);

  const openGiftModal = (gift = null) => {
    setEditingGift(gift);
    setGiftForm(gift ? 
      { name: gift.name, price_cop: gift.price_cop, cost_points: gift.cost_points, commission_percent: gift.commission_percent, icon_url: gift.icon_url, is_active: gift.is_active } : 
      { name: '', price_cop: '', cost_points: '', commission_percent: 30, icon_url: '', is_active: true }
    );
    setShowGiftModal(true);
  };
  const closeGiftModal = () => setShowGiftModal(false);

  const openGatewayModal = (gw) => {
    setEditingGateway(gw);
    setGatewayForm({ gateway_name: gw.gateway_name, is_active: gw.is_active, is_default: gw.is_default, config: gw.config || { public_key: '', access_token: '', api_key: '' } });
    setShowGatewayModal(true);
  };
  const closeGatewayModal = () => setShowGatewayModal(false);

  const formatCOP = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  const calculateDiscountedPrice = (price, discount) => price * (1 - discount / 100);

  if (loading && packages.length === 0) return <div className="flex items-center justify-center h-screen bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" /> Admin Puntos & Regalos
          </h1>
          <p className="text-gray-600 mt-1">Gestiona la economía híbrida (Pesos vs Puntos) de Radeisan</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => openGiftModal()} className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-xl hover:bg-pink-700 transition shadow-lg hover:shadow-pink-200">
            <Gift className="h-5 w-5" /> Nuevo Regalo
          </button>
          <button onClick={() => openPackageModal()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-blue-200">
            <Plus className="h-5 w-5" /> Nuevo Paquete
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: CATÁLOGO DE REGALOS (Estrategia Híbrida) */}
      <section className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="h-6 w-6 text-pink-600" /> Catálogo de Regalos
            </h2>
            <p className="text-sm text-gray-500 mt-1">Ítems comprables individualmente (COP) o canjeables por Puntos.</p>
          </div>
          <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-bold">{gifts.length} Ítems</span>
        </div>
        
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {gifts.map((gift) => (
            <div key={gift.id} className={`relative group border-2 rounded-xl p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${!gift.is_active ? 'opacity-60 bg-gray-50 border-gray-200' : 'bg-white border-gray-100 hover:border-pink-200'}`}>
              {/* Status Toggle */}
              <div className="absolute top-3 right-3 z-10">
                <button onClick={() => handleToggleGift(gift)} className={`p-1.5 rounded-full transition ${gift.is_active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`} title={gift.is_active ? "Desactivar" : "Activar"}>
                  {gift.is_active ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </button>
              </div>

              {/* Imagen Regalo */}
              <div className="h-28 flex items-center justify-center mb-4 p-2">
                <img src={gift.icon_url} alt={gift.name} className="h-full w-auto object-contain drop-shadow-md transition-transform group-hover:scale-110" onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=?'} />
              </div>

              {/* Detalles de Precios */}
              <div className="text-center space-y-3">
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{gift.name}</h3>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Directo</p>
                    <p className="text-gray-900 font-bold">{formatCOP(gift.price_cop)}</p>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-2 border border-pink-100">
                    <p className="text-[10px] text-pink-600 uppercase font-bold">Puntos</p>
                    <p className="text-pink-700 font-bold flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 fill-current" /> {gift.cost_points}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs px-1 pt-1 border-t border-gray-100">
                  <span className="text-gray-400">Comisión App</span>
                  <span className="font-bold text-orange-500">{gift.commission_percent}%</span>
                </div>

                <button onClick={() => openGiftModal(gift)} className="w-full py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition text-sm font-medium flex items-center justify-center gap-2 mt-2">
                  <Edit2 className="h-3 w-3" /> Editar Precio
                </button>
              </div>
            </div>
          ))}
          
          {/* Botón añadir */}
          <div onClick={() => openGiftModal()} className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition min-h-[300px] group">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-md transition">
              <Plus className="h-8 w-8 text-gray-400 group-hover:text-pink-500" />
            </div>
            <span className="text-gray-500 font-bold group-hover:text-pink-700">Añadir Regalo al Catálogo</span>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: PAQUETES DE PUNTOS */}
      <section className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" /> Paquetes de Puntos
            </h2>
            <p className="text-sm text-gray-500 mt-1">La compra por volumen debe ser más económica para incentivar al usuario.</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`relative border rounded-xl p-5 transition hover:shadow-md ${pkg.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 opacity-60'}`}>
              {pkg.is_featured && <span className="absolute -top-2 left-4 bg-yellow-400 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><Star className="h-3 w-3 fill-current"/> POPULAR</span>}
              
              <div className="flex justify-between items-start mb-3 mt-1">
                <h3 className="font-bold text-lg text-gray-900">{pkg.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{pkg.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
              
              <div className="space-y-2 mb-5 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Contiene:</span> 
                  <span className="font-bold text-blue-600 flex items-center gap-1"><Award className="h-4 w-4"/> {pkg.points_amount.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Precio:</span> 
                  <span className="font-bold text-gray-900">{formatCOP(pkg.price_cop)}</span>
                </div>
                {pkg.discount_percentage > 0 && (
                  <div className="text-xs text-center text-green-600 font-medium bg-green-50 py-1 rounded">
                    Ahorra un {pkg.discount_percentage}% vs compra directa
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => openPackageModal(pkg)} className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition text-sm font-medium">Editar</button>
                <button onClick={() => handleDeletePackage(pkg.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 3: PASARELAS */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><CreditCard className="h-6 w-6 text-gray-700"/> Pasarelas de Pago</h2>
         </div>
         <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {gateways.map((gw) => (
              <div key={gw.id} className="border rounded-xl p-4 flex justify-between items-center hover:border-blue-300 transition">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center p-2">
                     {gw.logo_url ? <img src={gw.logo_url} className="w-full h-full object-contain" alt="" /> : <CreditCard className="text-gray-400"/>}
                   </div>
                   <div>
                      <h4 className="font-bold text-gray-900">{gw.display_name}</h4>
                      <div className="flex gap-2 mt-1">
                         <span className={`text-[10px] px-1.5 py-0.5 rounded ${gw.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{gw.is_active ? 'ON' : 'OFF'}</span>
                         {gw.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">DEFAULT</span>}
                      </div>
                   </div>
                </div>
                <button onClick={() => openGatewayModal(gw)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Settings className="h-5 w-5" /></button>
              </div>
            ))}
         </div>
      </section>

      {/* === MODAL REGALO (Lógica Híbrida) === */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-pink-50 to-white">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-600" /> {editingGift ? 'Editar Regalo' : 'Nuevo Regalo'}
              </h3>
              <button onClick={closeGiftModal} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Preview */}
              <div className="flex justify-center">
                <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-2 bg-gray-50 relative">
                  {giftForm.icon_url ? <img src={giftForm.icon_url} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="text-gray-300 h-8 w-8"/>}
                  <span className="absolute -bottom-2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded-full">Vista Previa</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Nombre del Regalo</label>
                <input type="text" value={giftForm.name} onChange={e => setGiftForm({...giftForm, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition" placeholder="Ej: Corona Real" />
              </div>

              {/* Configuración de Precio Híbrida */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Estrategia de Precios</h4>
                
                {/* Precio Directo */}
                <div>
                   <label className="text-xs font-bold text-gray-700 mb-1 block">Precio Compra Directa (COP)</label>
                   <div className="relative">
                     <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                     <input 
                        type="number" 
                        value={giftForm.price_cop} 
                        onChange={e => {
                          const val = e.target.value;
                          setGiftForm({...giftForm, price_cop: val});
                          handleCalculatePoints(val); // Sugerir puntos
                        }} 
                        className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-medium" 
                        placeholder="Ej: 100000" 
                     />
                   </div>
                   <p className="text-[10px] text-gray-500 mt-1">Precio que paga el usuario si usa tarjeta (Individual).</p>
                </div>
                
                {/* Precio Puntos */}
                <div>
                   <label className="text-xs font-bold text-pink-700 mb-1 flex items-center gap-1">
                      Precio en Puntos (Mejor Valor) <Star className="h-3 w-3 fill-current" />
                   </label>
                   <input 
                      type="number" 
                      value={giftForm.cost_points} 
                      onChange={e => setGiftForm({...giftForm, cost_points: e.target.value})} 
                      className="w-full p-2.5 border border-pink-200 bg-white rounded-lg text-pink-600 font-bold focus:ring-2 focus:ring-pink-500 outline-none" 
                      placeholder="Ej: 1000" 
                   />
                   <div className="flex items-start gap-2 mt-2 bg-blue-50 p-2 rounded text-[11px] text-blue-800 leading-tight">
                      <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <p>Consejo: Asegúrate de que este valor en puntos sea equivalente a un precio menor en paquetes para que el usuario prefiera comprar puntos.</p>
                   </div>
                </div>
              </div>

              {/* Comisión */}
              <div>
                <div className="flex justify-between mb-1">
                   <label className="text-xs font-bold text-gray-700">Comisión de Plataforma</label>
                   <span className="text-xs font-bold text-orange-600">{giftForm.commission_percent}%</span>
                </div>
                <input 
                   type="range" min="0" max="100" 
                   value={giftForm.commission_percent} 
                   onChange={e => setGiftForm({...giftForm, commission_percent: e.target.value})} 
                   className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                   <span>El creador recibe: {100 - giftForm.commission_percent}%</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">URL Imagen</label>
                <input type="text" value={giftForm.icon_url} onChange={e => setGiftForm({...giftForm, icon_url: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 text-sm" placeholder="https://..." />
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button onClick={closeGiftModal} className="flex-1 py-2.5 border border-gray-300 rounded-xl hover:bg-white text-gray-600 font-medium transition">Cancelar</button>
              <button onClick={handleSaveGift} className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-bold shadow-lg transition flex justify-center items-center gap-2">
                <Save className="h-4 w-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAQUETE */}
      {showPackageModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in">
               <h3 className="font-bold text-xl text-gray-900">Gestión de Paquete</h3>
               <div className="space-y-3">
                 <div><label className="text-xs font-bold text-gray-500">Nombre</label><input type="text" className="w-full border p-2 rounded-lg" value={packageForm.name} onChange={e => setPackageForm({...packageForm, name: e.target.value})} placeholder="Ej: Pack Inicial" /></div>
                 <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-bold text-gray-500">Puntos</label><input type="number" className="w-full border p-2 rounded-lg" value={packageForm.points_amount} onChange={e => setPackageForm({...packageForm, points_amount: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500">Precio COP</label><input type="number" className="w-full border p-2 rounded-lg" value={packageForm.price_cop} onChange={e => setPackageForm({...packageForm, price_cop: e.target.value})} /></div>
                 </div>
                 <div><label className="text-xs font-bold text-gray-500">% Descuento Visual</label><input type="number" className="w-full border p-2 rounded-lg" value={packageForm.discount_percentage} onChange={e => setPackageForm({...packageForm, discount_percentage: e.target.value})} /></div>
               </div>
               <div className="flex gap-3 pt-2">
                  <button onClick={closePackageModal} className="flex-1 border p-2 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button onClick={handleSavePackage} className="flex-1 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 font-bold">Guardar</button>
               </div>
            </div>
         </div>
      )}
      
      {/* MODAL PASARELA */}
      {showGatewayModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
               <h3 className="font-bold text-xl text-gray-900">Configurar {gatewayForm.gateway_name}</h3>
               <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Estado Activo</span>
                  <input type="checkbox" className="h-5 w-5 accent-blue-600" checked={gatewayForm.is_active} onChange={e => setGatewayForm({...gatewayForm, is_active: e.target.checked})} />
               </div>
               <div className="space-y-3">
                  {Object.keys(gatewayForm.config).map(k => (
                    <div key={k}>
                       <label className="text-xs font-bold text-gray-500 uppercase">{k.replace('_', ' ')}</label>
                       <input type="text" className="w-full border p-2 rounded-lg text-sm" value={gatewayForm.config[k]} onChange={e => setGatewayForm({...gatewayForm, config: {...gatewayForm.config, [k]: e.target.value}})} />
                    </div>
                  ))}
               </div>
               <div className="flex gap-3 pt-2">
                  <button onClick={closeGatewayModal} className="flex-1 border p-2 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button onClick={handleSaveGateway} className="flex-1 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 font-bold">Guardar Cambios</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default PremiumPointsConfig;
