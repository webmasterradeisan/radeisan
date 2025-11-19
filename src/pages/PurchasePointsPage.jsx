// src/pages/PurchasePointsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import paymentService from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import Header from '../components/ui/Header';
import { 
  CreditCard, Package, Star, Award, CheckCircle, 
  ArrowRight, Sparkles, Clock, ShieldCheck, AlertCircle,
  TrendingUp, Gift, Zap, Wallet, Search, User, Heart, DollarSign
} from 'lucide-react';

const PurchasePointsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points, refreshPoints } = usePoints();

  // === ESTADOS GENERALES ===
  const [activeTab, setActiveTab] = useState('buy_points'); // 'buy_points' | 'gift_store'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === ESTADOS DE COMPRA PAQUETES (Original) ===
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // === ESTADOS DE REGALOS (Nuevo Híbrido) ===
  const [gifts, setGifts] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [paymentMethodGift, setPaymentMethodGift] = useState('points'); // 'points' | 'direct'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [sendingGift, setSendingGift] = useState(false);
  const [giftSuccess, setGiftSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Paquetes y Pasarelas
      const initResult = await paymentService.initialize();
      const { data: packagesData } = await supabase.rpc('get_active_packages');
      setPackages(packagesData || []);

      const activeGateways = paymentService.getActiveGateways();
      setGateways(activeGateways || []);
      if (activeGateways?.length > 0) setSelectedGateway(paymentService.getDefaultGateway());

      const history = await paymentService.getUserPurchaseHistory(user.id, 5);
      if (history?.success) setPurchaseHistory(history.purchases || []);

      // 2. Regalos Virtuales (Con precios híbridos)
      const { data: giftsData, error: giftsError } = await supabase
        .from('virtual_gifts')
        .select('*')
        .eq('is_active', true)
        .order('price_cop', { ascending: true });
      
      if (!giftsError) setGifts(giftsData || []);

    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión. Intenta recargar.');
    } finally {
      setLoading(false);
    }
  };

  // === HANDLER COMPRA PAQUETES ===
  const handlePurchasePackage = async () => {
    if (!selectedPackage || !selectedGateway) return setError('Selecciona paquete y método de pago');
    setPurchasing(true);
    try {
      const result = await paymentService.purchasePackage(selectedPackage, selectedGateway.gateway_name);
      if (!result.success) throw new Error(result.error);
      
      if (result.paymentUrl) window.location.href = result.paymentUrl;
      else navigate('/purchase/pending');
    } catch (err) {
      setError(err.message);
      setPurchasing(false);
    }
  };

  // === HANDLERS REGALOS ===
  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 3) return setSearchResults([]);
    
    const { data } = await supabase
      .from('profiles') // Ajustar a tu tabla real de usuarios
      .select('id, username, full_name, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(5);

    if (data) setSearchResults(data);
  };

  const handleSendGift = async () => {
    if (!selectedGift || !selectedRecipient) return;

    // Opción 1: Pago con Puntos
    if (paymentMethodGift === 'points') {
      const currentBalance = points?.premium || 0;
      if (currentBalance < selectedGift.cost_points) {
        setError('No tienes suficientes Puntos Premium. ¡Recarga un paquete para ahorrar!');
        return;
      }

      setSendingGift(true);
      try {
        const { data, error } = await supabase.rpc('send_virtual_gift', {
          receiver_id: selectedRecipient.id,
          gift_id: selectedGift.id
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);

        setGiftSuccess(true);
        if (refreshPoints) refreshPoints();

        setTimeout(() => {
          setGiftSuccess(false);
          setSelectedGift(null);
          setSelectedRecipient(null);
          setSearchQuery('');
        }, 3000);
      } catch (err) {
        setError('Error al enviar regalo: ' + err.message);
      } finally {
        setSendingGift(false);
      }
    } 
    // Opción 2: Pago Directo (Simulado o Integrado)
    else {
      // Aquí iría la integración para pagar un ítem individual
      // Por ahora redirigimos a comprar puntos como sugerencia o mostramos alerta
      alert("La compra directa individual está en mantenimiento. Por favor compra un paquete de puntos para obtener el mejor precio.");
      setActiveTab('buy_points');
    }
  };

  // Helpers
  const calculateDiscountedPrice = (price, discount) => price * (1 - discount / 100);
  const formatCOP = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  const getStatusBadge = (status) => {
    const map = { completed: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', failed: 'bg-red-100 text-red-800' };
    return map[status] || map.pending;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* CABECERA Y BALANCE */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {activeTab === 'buy_points' ? 'Recargar Puntos' : 'Tienda de Regalos'}
              </h1>
              <p className="text-gray-600">
                {activeTab === 'buy_points' ? 'Compra paquetes y ahorra dinero' : 'Envía detalles únicos a tus creadores'}
              </p>
            </div>
            
            <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg flex items-center gap-6 min-w-[280px]">
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Tu Balance</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-yellow-400">{points?.premium || 0}</span>
                  <span className="text-xs mb-1 text-gray-300">Puntos Premium</span>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-700"></div>
              <Wallet className="text-gray-500 h-8 w-8" />
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-sm font-bold text-red-700">✕</button>
            </div>
          )}

          {/* PESTAÑAS */}
          <div className="flex p-1 bg-white rounded-xl shadow-sm mb-8 max-w-md mx-auto border border-gray-200">
            <button
              onClick={() => setActiveTab('buy_points')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'buy_points' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4" /> Paquetes Puntos
            </button>
            <button
              onClick={() => setActiveTab('gift_store')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'gift_store' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Gift className="w-4 h-4" /> Regalos
            </button>
          </div>

          {/* === TAB 1: COMPRA DE PAQUETES (TU DISEÑO ORIGINAL MANTENIDO) === */}
          {activeTab === 'buy_points' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                 <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-full"><Zap className="text-blue-600 h-5 w-5"/></div>
                    <div><p className="font-bold text-gray-900">Instantáneo</p><p className="text-xs text-gray-500">Recarga automática</p></div>
                 </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500 flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-full"><TrendingUp className="text-green-600 h-5 w-5"/></div>
                    <div><p className="font-bold text-gray-900">Mejor Precio</p><p className="text-xs text-gray-500">Más barato que compra directa</p></div>
                 </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500 flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-full"><ShieldCheck className="text-purple-600 h-5 w-5"/></div>
                    <div><p className="font-bold text-gray-900">Seguro</p><p className="text-xs text-gray-500">Pagos encriptados</p></div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {packages.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  const finalPrice = calculateDiscountedPrice(pkg.price_cop, pkg.discount_percentage);
                  return (
                    <div key={pkg.id} onClick={() => setSelectedPackage(pkg)} 
                      className={`relative bg-white rounded-xl p-6 cursor-pointer transition-all border-2 ${isSelected ? 'border-blue-500 shadow-xl scale-105' : 'border-gray-100 hover:border-blue-200 hover:shadow-md'} ${pkg.is_featured ? 'ring-1 ring-yellow-400' : ''}`}
                    >
                      {pkg.is_featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-3 py-0.5 rounded-full text-xs font-bold shadow-sm">POPULAR</span>}
                      <div className="text-center">
                        <Package className="h-10 w-10 mx-auto mb-3 text-blue-600" />
                        <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                        <div className="my-3 bg-blue-50 p-2 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{pkg.points_amount.toLocaleString()}</p>
                          <p className="text-[10px] uppercase text-blue-400 font-bold">Puntos</p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{formatCOP(finalPrice)}</p>
                        {pkg.discount_percentage > 0 && <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">-{pkg.discount_percentage}% OFF</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedPackage && (
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto border border-gray-200">
                   <h3 className="font-bold text-lg mb-4">Resumen de Pago</h3>
                   <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-4">
                      <span>{selectedPackage.name} ({selectedPackage.points_amount} pts)</span>
                      <span className="font-bold text-lg">{formatCOP(calculateDiscountedPrice(selectedPackage.price_cop, selectedPackage.discount_percentage))}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                      {gateways.map(g => (
                        <button key={g.id} onClick={() => setSelectedGateway(g)} className={`p-3 border rounded-lg flex items-center gap-2 ${selectedGateway?.id === g.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                           {g.logo_url ? <img src={g.logo_url} className="h-6"/> : <CreditCard/>} <span className="text-sm font-bold">{g.display_name}</span>
                        </button>
                      ))}
                   </div>
                   <button onClick={handlePurchasePackage} disabled={purchasing || !selectedGateway} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                     {purchasing ? 'Procesando...' : 'Pagar Ahora'}
                   </button>
                </div>
              )}
            </div>
          )}

          {/* === TAB 2: TIENDA DE REGALOS (NUEVA LÓGICA HÍBRIDA) === */}
          {activeTab === 'gift_store' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {!selectedGift ? (
                // 1. CATÁLOGO DE REGALOS
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gifts.map((gift) => (
                    <div key={gift.id} onClick={() => setSelectedGift(gift)}
                      className="group bg-white rounded-xl border-2 border-gray-100 hover:border-pink-300 hover:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col"
                    >
                      <div className="h-32 bg-gradient-to-b from-pink-50 to-white flex items-center justify-center p-4 relative">
                        <img src={gift.icon_url} alt={gift.name} className="h-full w-auto object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="p-4 text-center flex-1 flex flex-col justify-between">
                         <div>
                           <h3 className="font-bold text-gray-900 mb-2">{gift.name}</h3>
                           {/* Precio Híbrido */}
                           <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs bg-gray-50 p-1.5 rounded">
                                 <span className="text-gray-500">Directo</span>
                                 <span className="font-bold text-gray-900">{formatCOP(gift.price_cop)}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs bg-pink-50 p-1.5 rounded border border-pink-100">
                                 <span className="text-pink-600 font-medium">Puntos</span>
                                 <span className="font-bold text-pink-700 flex items-center gap-1"><Star className="w-3 h-3 fill-current"/> {gift.cost_points}</span>
                              </div>
                           </div>
                         </div>
                         <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs font-bold text-blue-600 group-hover:underline">Enviar Regalo →</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // 2. DETALLE Y ENVÍO DE REGALO
                <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
                  {/* Header Detalle */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 flex items-center gap-4 border-b border-pink-100">
                    <button onClick={() => { setSelectedGift(null); setSelectedRecipient(null); setGiftSuccess(false); }} className="bg-white p-2 rounded-full hover:bg-gray-100 transition"><ArrowRight className="w-5 h-5 rotate-180 text-gray-600"/></button>
                    <img src={selectedGift.icon_url} className="w-16 h-16 object-contain" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedGift.name}</h2>
                      <p className="text-sm text-gray-500">Selecciona destinatario y método de pago</p>
                    </div>
                  </div>

                  <div className="p-6">
                    {!giftSuccess ? (
                      <>
                        {/* Paso 1: Buscar Usuario */}
                        <div className="mb-6">
                           <label className="block text-sm font-bold text-gray-700 mb-2">1. ¿Para quién es el regalo?</label>
                           {!selectedRecipient ? (
                             <div className="relative">
                               <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                               <input 
                                 type="text" placeholder="Buscar usuario (ej: @juan)..."
                                 className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                                 value={searchQuery} onChange={(e) => handleSearchUsers(e.target.value)}
                               />
                               {searchResults.length > 0 && (
                                 <div className="absolute w-full bg-white border mt-1 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                    {searchResults.map(u => (
                                      <div key={u.id} onClick={() => { setSelectedRecipient(u); setSearchResults([]); }} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                                           {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <User className="p-1 text-gray-500"/>}
                                        </div>
                                        <p className="text-sm font-bold">{u.username}</p>
                                      </div>
                                    ))}
                                 </div>
                               )}
                             </div>
                           ) : (
                             <div className="flex justify-between items-center p-3 bg-pink-50 border border-pink-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-full border border-pink-200 overflow-hidden">
                                     {selectedRecipient.avatar_url ? <img src={selectedRecipient.avatar_url} className="w-full h-full object-cover"/> : <User className="p-2 text-gray-400"/>}
                                  </div>
                                  <span className="font-bold text-gray-900">{selectedRecipient.username}</span>
                                </div>
                                <button onClick={() => setSelectedRecipient(null)} className="text-xs text-red-500 font-bold hover:underline">Cambiar</button>
                             </div>
                           )}
                        </div>

                        {/* Paso 2: Método de Pago (Híbrido) */}
                        <div className="mb-8">
                          <label className="block text-sm font-bold text-gray-700 mb-2">2. ¿Cómo quieres pagar?</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {/* Opción A: Puntos (Recomendada) */}
                             <div 
                               onClick={() => setPaymentMethodGift('points')}
                               className={`cursor-pointer border-2 rounded-xl p-4 relative ${paymentMethodGift === 'points' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-200'}`}
                             >
                                {paymentMethodGift === 'points' && <div className="absolute top-2 right-2 text-pink-600"><CheckCircle className="w-5 h-5"/></div>}
                                <div className="flex items-center gap-2 mb-2">
                                   <Star className="w-5 h-5 text-yellow-500 fill-current"/>
                                   <span className="font-bold text-gray-900">Usar Puntos</span>
                                </div>
                                <p className="text-2xl font-bold text-pink-600">{selectedGift.cost_points} pts</p>
                                <p className="text-xs text-gray-500 mt-1">Saldo: {points?.premium || 0} pts</p>
                             </div>

                             {/* Opción B: Directo (Referencia) */}
                             <div 
                               onClick={() => setPaymentMethodGift('direct')}
                               className={`cursor-pointer border-2 rounded-xl p-4 relative ${paymentMethodGift === 'direct' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                             >
                                {paymentMethodGift === 'direct' && <div className="absolute top-2 right-2 text-blue-600"><CheckCircle className="w-5 h-5"/></div>}
                                <div className="flex items-center gap-2 mb-2">
                                   <CreditCard className="w-5 h-5 text-blue-500"/>
                                   <span className="font-bold text-gray-900">Tarjeta / PSE</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{formatCOP(selectedGift.price_cop)}</p>
                                <p className="text-xs text-orange-600 font-medium mt-1">Sin descuento de puntos</p>
                             </div>
                          </div>
                        </div>

                        <button
                          onClick={handleSendGift}
                          disabled={!selectedRecipient || sendingGift}
                          className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${paymentMethodGift === 'points' ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700' : 'bg-gray-900 hover:bg-black'}`}
                        >
                          {sendingGift ? 'Procesando...' : (
                             <>
                               <Gift className="w-5 h-5" /> 
                               {paymentMethodGift === 'points' ? `Enviar por ${selectedGift.cost_points} Puntos` : `Pagar ${formatCOP(selectedGift.price_cop)}`}
                             </>
                          )}
                        </button>
                        
                        {paymentMethodGift === 'direct' && (
                           <p className="text-xs text-center text-gray-500 mt-3">
                              Recomendamos comprar paquetes de puntos para obtener mejores precios.
                           </p>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-10">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                           <Heart className="w-10 h-10 text-green-500 fill-current animate-bounce"/>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Regalo Enviado!</h3>
                        <p className="text-gray-600">
                           Has enviado <strong>{selectedGift.name}</strong> a {selectedRecipient.username}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PurchasePointsPage;
