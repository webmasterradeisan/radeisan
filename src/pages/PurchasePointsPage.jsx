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
  TrendingUp, Gift, Zap, Wallet, Search, User, Heart, DollarSign, Info
} from 'lucide-react';

const PurchasePointsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points, refreshPoints } = usePoints();

  // === ESTADOS GLOBALES ===
  const [activeTab, setActiveTab] = useState('buy_points'); // 'buy_points' | 'gift_store'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === ESTADOS: COMPRA DE PUNTOS (ORIGINAL) ===
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // === ESTADOS: TIENDA DE REGALOS (HÍBRIDA) ===
  const [gifts, setGifts] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [paymentMethodGift, setPaymentMethodGift] = useState('points'); // 'points' | 'direct'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [sendingGift, setSendingGift] = useState(false);
  const [giftSuccess, setGiftSuccess] = useState(false);

  // Cargar datos al montar
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
      // 1. Inicializar servicio de pagos
      const initResult = await paymentService.initialize();
      if (!initResult || !initResult.success) console.warn('Advertencia pagos:', initResult);

      // 2. Cargar Paquetes
      const { data: packagesData, error: packagesError } = await supabase.rpc('get_active_packages');
      if (packagesError) throw packagesError;
      setPackages(packagesData || []);

      // 3. Cargar Pasarelas (MercadoPago, etc.)
      const activeGateways = paymentService.getActiveGateways();
      setGateways(activeGateways || []);
      
      // Seleccionar pasarela por defecto (MercadoPago usualmente)
      if (activeGateways && activeGateways.length > 0) {
        const defaultGw = paymentService.getDefaultGateway();
        setSelectedGateway(defaultGw);
      }

      // 4. Cargar Historial
      const history = await paymentService.getUserPurchaseHistory(user.id, 10);
      if (history && history.success) {
        setPurchaseHistory(history.purchases || []);
      }

      // 5. Cargar Regalos
      const { data: giftsData, error: giftsError } = await supabase
        .from('virtual_gifts')
        .select('*')
        .eq('is_active', true)
        .order('price_cop', { ascending: true });
      
      if (!giftsError) setGifts(giftsData || []);

    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // === 1. COMPRA DE PAQUETES DE PUNTOS (ORIGINAL) ===
  const handlePurchasePackage = async () => {
    if (!selectedPackage || !selectedGateway) {
      setError('Por favor selecciona un paquete y método de pago');
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const result = await paymentService.purchasePackage(
        selectedPackage, 
        selectedGateway.gateway_name
      );

      handlePaymentResult(result);

    } catch (err) {
      console.error('❌ Error en handlePurchasePackage:', err);
      setError(err.message || 'Error al procesar la compra.');
      setPurchasing(false);
    }
  };

  // === 2. COMPRA DIRECTA DE REGALO (MERCADOPAGO) ===
  const handleDirectGiftPurchase = async () => {
    if (!selectedGift || !selectedRecipient) {
        setError('Faltan datos del regalo o destinatario.');
        return;
    }
    
    if (!selectedGateway) {
        setError('No hay pasarela de pago configurada (MercadoPago).');
        return;
    }

    setSendingGift(true);
    setError(null);

    try {
        // Construimos un objeto "tipo paquete" temporal para que el paymentService lo procese
        // Incluimos metadata extra para que el backend sepa que es un REGALO y a quién va
        const giftTransactionObject = {
            id: selectedGift.id, // ID del regalo
            name: `Regalo: ${selectedGift.name}`,
            price_cop: selectedGift.price_cop,
            description: `Regalo para @${selectedRecipient.username}`,
            // Metadata importante para tu backend/webhook:
            type: 'gift_purchase',
            recipient_id: selectedRecipient.id,
            sender_id: user.id
        };

        // Usamos la misma pasarela (MercadoPago) configurada
        const result = await paymentService.purchasePackage(
            giftTransactionObject,
            selectedGateway.gateway_name
        );

        handlePaymentResult(result);

    } catch (err) {
        console.error('❌ Error en handleDirectGiftPurchase:', err);
        setError('Error al conectar con MercadoPago: ' + err.message);
        setSendingGift(false);
    }
  };

  // Helper para manejar la redirección de pagos (Común para Paquetes y Regalos)
  const handlePaymentResult = (result) => {
      if (!result.success) throw new Error(result.error || 'Error desconocido');

      const transactionId = result.id || result.transaction_id || result.purchaseId;

      if (result.paymentUrl) {
        // Redirección a MercadoPago
        window.location.href = result.paymentUrl;
      } else if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        if (transactionId) navigate(`/purchase/pending?purchase_id=${transactionId}`);
        else navigate('/purchase/pending');
      }
  };

  // === 3. ENVÍO DE REGALO CON PUNTOS (INTERNO) ===
  const handleSendGiftWithPoints = async () => {
    if (!selectedGift || !selectedRecipient) return;

    const currentBalance = points?.premium || 0;
    if (currentBalance < selectedGift.cost_points) {
        setError('No tienes suficientes Puntos Premium. ¡Compra un paquete o paga directo!');
        return;
    }

    setSendingGift(true);
    setError(null);

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
            setSearchResults([]);
        }, 3000);
    } catch (err) {
        setError(err.message || 'Error al enviar el regalo.');
    } finally {
        setSendingGift(false);
    }
  };

  // Helpers UI
  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').ilike('username', `%${query}%`).neq('id', user.id).limit(5);
    if (data) setSearchResults(data);
  };

  const calculateDiscountedPrice = (price, discount) => price * (1 - discount / 100);
  const formatCOP = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const getStatusBadge = (status) => {
    const badges = { completed: { color: 'bg-green-100 text-green-800', text: 'Completada' }, pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' }, failed: { color: 'bg-red-100 text-red-800', text: 'Fallida' } };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          
          {/* TÍTULO DE PÁGINA */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-2">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {activeTab === 'buy_points' ? 'Comprar Puntos Premium' : 'Tienda de Regalos'}
                </h1>
                <p className="text-gray-600 text-sm">
                  {activeTab === 'buy_points' ? 'Obtén puntos para canjear por increíbles recompensas' : 'Envía detalles únicos. Compra directa o canjea puntos.'}
                </p>
              </div>
            </div>
          </div>

          {/* BALANCE ACTUAL */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-6 mb-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-white/90 text-sm font-medium">Tu Balance Actual</p>
                  <p className="text-white text-xs mt-0.5">Disponible para canjear</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-white/80 text-xs">Puntos Gratis</p>
                  <p className="text-white text-2xl font-bold">{points?.free || 0}</p>
                </div>
                <div className="w-px h-12 bg-white/30"></div>
                <div className="text-center">
                  <p className="text-white/80 text-xs">Puntos Premium</p>
                  <p className="text-green-300 text-2xl font-bold">{points?.premium || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ERRORES */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-sm font-bold text-red-700">✕</button>
            </div>
          )}

          {/* PESTAÑAS DE NAVEGACIÓN */}
          <div className="flex p-1 bg-white rounded-xl shadow-sm mb-8 max-w-md mx-auto border border-gray-100">
            <button onClick={() => setActiveTab('buy_points')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'buy_points' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Package className="w-4 h-4" /> Recargar Puntos
            </button>
            <button onClick={() => setActiveTab('gift_store')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'gift_store' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Gift className="w-4 h-4" /> Tienda Regalos
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: COMPRAR PUNTOS (TU LÓGICA ORIGINAL) */}
          {/* ========================================================================= */}
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

              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Elige tu Paquete</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const finalPrice = calculateDiscountedPrice(pkg.price_cop, pkg.discount_percentage);
                    return (
                      <div key={pkg.id} onClick={() => setSelectedPackage(pkg)} className={`relative bg-white rounded-xl p-6 cursor-pointer transition-all duration-200 ${isSelected ? 'ring-4 ring-blue-500 shadow-2xl scale-105' : 'border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg'} ${pkg.is_featured ? 'border-yellow-400' : ''}`}>
                        {pkg.is_featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg"><Star className="h-3 w-3" />{pkg.badge_text || '¡Más Popular!'}</span>}
                        {isSelected && <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-1"><CheckCircle className="h-5 w-5 text-white" /></div>}
                        <div className="text-center">
                          <Package className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                          <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{pkg.description}</p>
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
                            <p className="text-3xl font-bold text-blue-600 flex items-center justify-center gap-2"><Award className="h-6 w-6" />{pkg.points_amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-600">Puntos Premium</p>
                          </div>
                          <div className="mb-4">
                            {pkg.discount_percentage > 0 ? (
                              <>
                                <p className="text-sm text-gray-400 line-through">{formatCOP(pkg.price_cop)}</p>
                                <p className="text-2xl font-bold text-green-600">{formatCOP(finalPrice)}</p>
                                <div className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full mt-2">Ahorra {pkg.discount_percentage}%</div>
                              </>
                            ) : <p className="text-2xl font-bold text-gray-900">{formatCOP(pkg.price_cop)}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedPackage && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
                   <h3 className="font-bold text-lg mb-4">Método de Pago (Paquete)</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {gateways.map(g => (
                        <button key={g.id} onClick={() => setSelectedGateway(g)} className={`p-3 border rounded-lg flex items-center gap-2 ${selectedGateway?.id === g.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                           {g.logo_url ? <img src={g.logo_url} className="h-6" alt=""/> : <CreditCard/>} <span className="text-sm font-bold">{g.display_name}</span>
                        </button>
                      ))}
                   </div>
                   <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                      <div className="flex justify-between text-lg border-b border-gray-300 pb-3 mb-3">
                        <span className="font-bold text-gray-900">Total a Pagar:</span>
                        <span className="font-bold text-blue-600">{formatCOP(calculateDiscountedPrice(selectedPackage.price_cop, selectedPackage.discount_percentage))}</span>
                      </div>
                      <button onClick={handlePurchasePackage} disabled={purchasing || !selectedGateway} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {purchasing ? 'Procesando...' : <>Continuar al Pago <ArrowRight className="h-5 w-5 inline"/></>}
                      </button>
                   </div>
                </div>
              )}

              {purchaseHistory.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-24">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Clock className="h-6 w-6" /> Historial de Compras</h2>
                    <button onClick={() => setShowHistory(!showHistory)} className="text-blue-600 text-sm hover:underline">{showHistory ? 'Ocultar' : 'Ver Todo'}</button>
                  </div>
                  {showHistory && (
                    <div className="space-y-3">
                      {purchaseHistory.map((purchase) => {
                        const statusBadge = getStatusBadge(purchase.status);
                        return (
                          <div key={purchase.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-gray-900">{purchase.package_name}</h4>
                                <p className="text-xs text-gray-500">{formatDate(purchase.created_at)}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.color}`}>{statusBadge.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TIENDA DE REGALOS (HÍBRIDA CON MERCADOPAGO) */}
          {/* ========================================================================= */}
          {activeTab === 'gift_store' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {!selectedGift ? (
                // LISTA DE REGALOS
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Catálogo de Regalos</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gifts.map((gift) => (
                      <div key={gift.id} onClick={() => setSelectedGift(gift)} className="bg-white rounded-xl p-4 cursor-pointer border-2 border-gray-100 hover:border-pink-300 hover:shadow-lg transition-all group">
                        <div className="text-center">
                          <div className="h-24 flex items-center justify-center mb-3 p-2 bg-gradient-to-b from-pink-50 to-white rounded-lg group-hover:scale-105 transition-transform">
                             <img src={gift.icon_url} alt={gift.name} className="h-full w-auto object-contain" />
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm mb-2">{gift.name}</h3>
                          <div className="space-y-1.5">
                             <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded text-xs">
                                <span className="text-gray-500">Directo</span>
                                <span className="font-bold text-gray-900">{formatCOP(gift.price_cop)}</span>
                             </div>
                             <div className="flex justify-between items-center bg-pink-50 p-1.5 rounded text-xs border border-pink-100">
                                <span className="text-pink-600 font-medium">Puntos</span>
                                <span className="font-bold text-pink-700 flex items-center gap-1"><Star className="w-3 h-3 fill-current"/> {gift.cost_points}</span>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // DETALLE Y PAGO DE REGALO
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto border border-gray-200">
                   <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                      <button onClick={() => { setSelectedGift(null); setSelectedRecipient(null); setGiftSuccess(false); }} className="text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-2">
                        <ArrowRight className="h-5 w-5 rotate-180" />
                      </button>
                      <img src={selectedGift.icon_url} className="w-14 h-14 object-contain" />
                      <div>
                         <h2 className="text-xl font-bold text-gray-900">{selectedGift.name}</h2>
                         <p className="text-sm text-gray-500">Selecciona destinatario y forma de pago</p>
                      </div>
                   </div>

                   {!giftSuccess ? (
                     <div className="space-y-6">
                        {/* BÚSQUEDA DE USUARIO */}
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><User className="w-4 h-4"/> Destinatario</label>
                           {!selectedRecipient ? (
                             <div className="relative">
                               <input 
                                 type="text" placeholder="Buscar por usuario..." 
                                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                                 value={searchQuery} onChange={e => handleSearchUsers(e.target.value)}
                               />
                               {searchResults.length > 0 && (
                                 <div className="absolute w-full bg-white border mt-1 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                    {searchResults.map(u => (
                                      <div key={u.id} onClick={() => { setSelectedRecipient(u); setSearchResults([]); }} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b">
                                         <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <User className="p-1 text-gray-500"/>}
                                         </div>
                                         <span className="font-bold text-sm">{u.username}</span>
                                      </div>
                                    ))}
                                 </div>
                               )}
                             </div>
                           ) : (
                             <div className="flex justify-between items-center p-3 bg-pink-50 border border-pink-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-white rounded-full border overflow-hidden">
                                     {selectedRecipient.avatar_url ? <img src={selectedRecipient.avatar_url} className="w-full h-full object-cover"/> : <User className="p-2 text-gray-400"/>}
                                  </div>
                                  <span className="font-bold text-gray-900">{selectedRecipient.username}</span>
                                </div>
                                <button onClick={() => setSelectedRecipient(null)} className="text-xs text-red-500 font-bold hover:underline">Cambiar</button>
                             </div>
                           )}
                        </div>

                        {/* SELECCIÓN DE PAGO */}
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Forma de Pago</label>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Opción Puntos */}
                              <div onClick={() => setPaymentMethodGift('points')} className={`cursor-pointer border-2 rounded-xl p-4 relative ${paymentMethodGift === 'points' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-200'}`}>
                                 {paymentMethodGift === 'points' && <div className="absolute top-2 right-2 text-pink-600"><CheckCircle className="w-5 h-5"/></div>}
                                 <div className="flex items-center gap-2 mb-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-current"/>
                                    <span className="font-bold text-gray-900 text-sm">Usar Puntos</span>
                                 </div>
                                 <p className="text-xl font-bold text-pink-600">{selectedGift.cost_points} pts</p>
                                 <p className="text-[10px] text-gray-500">Saldo: {points?.premium || 0}</p>
                              </div>
                              
                              {/* Opción Directa (MercadoPago) */}
                              <div onClick={() => setPaymentMethodGift('direct')} className={`cursor-pointer border-2 rounded-xl p-4 relative ${paymentMethodGift === 'direct' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                                 {paymentMethodGift === 'direct' && <div className="absolute top-2 right-2 text-blue-600"><CheckCircle className="w-5 h-5"/></div>}
                                 <div className="flex items-center gap-2 mb-1">
                                    <CreditCard className="w-4 h-4 text-blue-500"/>
                                    <span className="font-bold text-gray-900 text-sm">Pago Directo</span>
                                 </div>
                                 <p className="text-lg font-bold text-gray-900">{formatCOP(selectedGift.price_cop)}</p>
                                 <p className="text-[10px] text-gray-600">MercadoPago / Tarjetas</p>
                              </div>
                           </div>
                        </div>

                        {/* BOTÓN DE ACCIÓN (DIFERENCIADO POR MÉTODO) */}
                        <button
                          onClick={paymentMethodGift === 'points' ? handleSendGiftWithPoints : handleDirectGiftPurchase}
                          disabled={!selectedRecipient || sendingGift}
                          className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${paymentMethodGift === 'points' ? 'bg-gradient-to-r from-pink-600 to-purple-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                          {sendingGift ? 'Procesando...' : (
                             <>
                               {paymentMethodGift === 'points' ? <Gift className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                               {paymentMethodGift === 'points' ? `Canjear por ${selectedGift.cost_points} Pts` : `Pagar ${formatCOP(selectedGift.price_cop)} con MercadoPago`}
                             </>
                          )}
                        </button>
                        
                        {paymentMethodGift === 'direct' && (
                           <p className="text-xs text-center text-gray-500 mt-3 flex items-center justify-center gap-1">
                              <Info className="h-3 w-3"/> Serás redirigido a MercadoPago para completar la transacción de forma segura.
                           </p>
                        )}
                     </div>
                   ) : (
                     <div className="text-center py-8 animate-in zoom-in">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                           <Heart className="w-8 h-8 text-green-600 fill-current animate-bounce"/>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¡Regalo Enviado!</h3>
                        <p className="text-gray-600 text-sm">Has enviado <strong>{selectedGift.name}</strong> a {selectedRecipient.username}.</p>
                     </div>
                   )}
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
