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

  // === ESTADOS: TIENDA DE REGALOS (NUEVO) ===
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
      // 1. Inicializar servicio de pagos (Lógica Original)
      const initResult = await paymentService.initialize();
      if (!initResult || !initResult.success) console.warn('Advertencia pagos:', initResult);

      // 2. Cargar Paquetes (Lógica Original)
      const { data: packagesData, error: packagesError } = await supabase.rpc('get_active_packages');
      if (packagesError) throw packagesError;
      setPackages(packagesData || []);

      // 3. Cargar Pasarelas (Lógica Original)
      const activeGateways = paymentService.getActiveGateways();
      setGateways(activeGateways || []);
      if (activeGateways && activeGateways.length > 0) {
        setSelectedGateway(paymentService.getDefaultGateway());
      }

      // 4. Cargar Historial (Lógica Original)
      const history = await paymentService.getUserPurchaseHistory(user.id, 10);
      if (history && history.success) {
        setPurchaseHistory(history.purchases || []);
      }

      // 5. Cargar Regalos (Lógica Nueva para soportar precio híbrido)
      const { data: giftsData, error: giftsError } = await supabase
        .from('virtual_gifts')
        .select('*')
        .eq('is_active', true)
        .order('price_cop', { ascending: true });
      
      if (!giftsError) setGifts(giftsData || []);

    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err.message || 'Error al cargar los datos. Por favor recarga la página.');
    } finally {
      setLoading(false);
    }
  };

  // === MANEJO DE COMPRA DE PAQUETES (ORIGINAL) ===
  const handlePurchase = async () => {
    if (!selectedPackage || !selectedGateway) {
      setError('Por favor selecciona un paquete y método de pago');
      return;
    }

    const validation = paymentService.validatePackage(selectedPackage);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const result = await paymentService.purchasePackage(
        selectedPackage, 
        selectedGateway.gateway_name
      );

      if (!result.success) throw new Error(result.error || 'Error desconocido');

      const transactionId = result.id || result.transaction_id || result.purchaseId || result.purchase?.id;

      if (result.paymentUrl) window.location.href = result.paymentUrl;
      else if (result.checkoutUrl) window.location.href = result.checkoutUrl;
      else {
        if (transactionId) navigate(`/purchase/pending?purchase_id=${transactionId}`);
        else navigate('/purchase/pending');
      }

    } catch (err) {
      console.error('❌ Error en handlePurchase:', err);
      setError(err.message || 'Error al procesar la compra.');
      setPurchasing(false);
    }
  };

  // === MANEJO DE ENVÍO DE REGALOS (NUEVO) ===
  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles') 
      .select('id, username, full_name, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(5);

    if (data) setSearchResults(data);
  };

  const handleSendGift = async () => {
    if (!selectedGift || !selectedRecipient) return;

    // Opción A: Pago con Puntos (Lógica de canje)
    if (paymentMethodGift === 'points') {
        const currentBalance = points?.premium || 0;
        if (currentBalance < selectedGift.cost_points) {
            setError('No tienes suficientes Puntos Premium. Compra un paquete para ahorrar dinero.');
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
    } 
    // Opción B: Compra Directa (Lógica de pasarela individual)
    else {
        alert("La compra directa individual está en mantenimiento. Te recomendamos comprar un paquete de puntos para obtener mejor precio.");
        // Aquí iría la integración con la pasarela para un cobro único
    }
  };

  // Helpers de Formato
  const calculateDiscountedPrice = (price, discount) => price * (1 - discount / 100);
  const formatCOP = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Completada' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Fallida' },
    };
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
          
          {/* TÍTULO DE PÁGINA (MANTENIDO) */}
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
                  {activeTab === 'buy_points' 
                    ? 'Obtén puntos para canjear por increíbles recompensas'
                    : 'Envía detalles únicos. Compra directa o canjea puntos.'}
                </p>
              </div>
            </div>
          </div>

          {/* BALANCE ACTUAL (MANTENIDO EXACTO) */}
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

          {/* ERROR MESSAGE */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* === PESTAÑAS (NUEVO - DISEÑO INTEGRADO) === */}
          <div className="flex p-1 bg-white rounded-xl shadow-sm mb-8 max-w-md mx-auto border border-gray-100">
            <button
              onClick={() => setActiveTab('buy_points')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'buy_points'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4" />
              Recargar Puntos
            </button>
            <button
              onClick={() => setActiveTab('gift_store')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'gift_store'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Gift className="w-4 h-4" />
              Tienda Regalos
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: COMPRAR PUNTOS (TU CONTENIDO ORIGINAL INTACTO) */}
          {/* ========================================================================= */}
          {activeTab === 'buy_points' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* BENEFICIOS (Original) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-lg p-6 shadow-md border-2 border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-full p-3">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Acreditación Instantánea</h3>
                      <p className="text-sm text-gray-600">Puntos disponibles al momento</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md border-2 border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 rounded-full p-3">
                      <ShieldCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Pago Seguro</h3>
                      <p className="text-sm text-gray-600">Transacciones protegidas</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md border-2 border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 rounded-full p-3">
                      <Gift className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Descuentos por Volumen</h3>
                      <p className="text-sm text-gray-600">Ahorra comprando más</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAQUETES (Original) */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Elige tu Paquete</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const finalPrice = calculateDiscountedPrice(pkg.price_cop, pkg.discount_percentage);
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative bg-white rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'ring-4 ring-blue-500 shadow-2xl scale-105'
                            : 'border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg'
                        } ${pkg.is_featured ? 'border-yellow-400' : ''}`}
                      >
                        {pkg.is_featured && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                            <Star className="h-3 w-3" />
                            {pkg.badge_text || '¡Más Popular!'}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-1">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div className="text-center">
                          <Package className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                          <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{pkg.description}</p>
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
                            <p className="text-3xl font-bold text-blue-600 flex items-center justify-center gap-2">
                              <Award className="h-6 w-6" />
                              {pkg.points_amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">Puntos Premium</p>
                          </div>
                          <div className="mb-4">
                            {pkg.discount_percentage > 0 ? (
                              <>
                                <p className="text-sm text-gray-400 line-through">{formatCOP(pkg.price_cop)}</p>
                                <p className="text-2xl font-bold text-green-600">{formatCOP(finalPrice)}</p>
                                <div className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full mt-2">
                                  Ahorra {pkg.discount_percentage}%
                                </div>
                              </>
                            ) : (
                              <p className="text-2xl font-bold text-gray-900">{formatCOP(pkg.price_cop)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MÉTODOS DE PAGO (Original) */}
              {selectedPackage && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="h-6 w-6" /> Método de Pago
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {gateways.map((gateway) => {
                      const isSelected = selectedGateway?.id === gateway.id;
                      return (
                        <div
                          key={gateway.id}
                          onClick={() => setSelectedGateway(gateway)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {gateway.logo_url && <img src={gateway.logo_url} alt={gateway.display_name} className="h-8 w-auto" />}
                              <h3 className="font-bold text-gray-900">{gateway.display_name}</h3>
                            </div>
                            {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
                          </div>
                          {gateway.is_default && <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2">Recomendado</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Resumen de tu Compra</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">Paquete:</span><span className="font-bold text-gray-900">{selectedPackage.name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Puntos:</span><span className="font-bold text-blue-600">{selectedPackage.points_amount.toLocaleString()}</span></div>
                      <div className="border-t border-gray-300 pt-3 flex justify-between text-lg">
                        <span className="font-bold text-gray-900">Total a Pagar:</span>
                        <span className="font-bold text-blue-600">{formatCOP(calculateDiscountedPrice(selectedPackage.price_cop, selectedPackage.discount_percentage))}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); handlePurchase(); }}
                      disabled={!selectedGateway || purchasing}
                      className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {purchasing ? 'Procesando...' : <>Continuar al Pago <ArrowRight className="h-5 w-5" /></>}
                    </button>
                  </div>
                </div>
              )}

              {/* HISTORIAL (Original) */}
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
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-bold text-gray-900">{purchase.package_name}</h4>
                                  <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.color}`}>{statusBadge.text}</span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                  <span>{purchase.points_amount.toLocaleString()} puntos</span>
                                  <span>•</span><span>{formatCOP(purchase.price_cop)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(purchase.created_at)}</p>
                              </div>
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
          {/* TAB 2: TIENDA DE REGALOS (NUEVO - DISEÑO ADAPTADO) */}
          {/* ========================================================================= */}
          {activeTab === 'gift_store' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {!selectedGift ? (
                // GRID DE REGALOS (Usando el mismo diseño de Cards de Paquetes)
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Catálogo de Regalos</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gifts.map((gift) => (
                      <div
                        key={gift.id}
                        onClick={() => setSelectedGift(gift)}
                        className="bg-white rounded-xl p-4 cursor-pointer border-2 border-gray-100 hover:border-pink-300 hover:shadow-lg transition-all group"
                      >
                        <div className="text-center">
                          <div className="h-24 flex items-center justify-center mb-3 p-2 bg-gradient-to-b from-pink-50 to-white rounded-lg group-hover:scale-105 transition-transform">
                             <img src={gift.icon_url} alt={gift.name} className="h-full w-auto object-contain" />
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm mb-2">{gift.name}</h3>
                          
                          {/* PRECIOS HÍBRIDOS */}
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
                // VISTA DE DETALLE DE REGALO (Usando diseño de sección de pago)
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto border border-gray-200">
                   {/* Header Detalle */}
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
                        {/* 1. BÚSQUEDA DE USUARIO */}
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

                        {/* 2. SELECCIÓN DE PAGO */}
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
                              
                              {/* Opción Directa */}
                              <div onClick={() => setPaymentMethodGift('direct')} className={`cursor-pointer border-2 rounded-xl p-4 relative ${paymentMethodGift === 'direct' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                                 {paymentMethodGift === 'direct' && <div className="absolute top-2 right-2 text-blue-600"><CheckCircle className="w-5 h-5"/></div>}
                                 <div className="flex items-center gap-2 mb-1">
                                    <CreditCard className="w-4 h-4 text-blue-500"/>
                                    <span className="font-bold text-gray-900 text-sm">Pago Directo</span>
                                 </div>
                                 <p className="text-lg font-bold text-gray-900">{formatCOP(selectedGift.price_cop)}</p>
                                 <p className="text-[10px] text-orange-600 font-medium">Sin ahorro de puntos</p>
                              </div>
                           </div>
                        </div>

                        <button
                          onClick={handleSendGift}
                          disabled={!selectedRecipient || sendingGift}
                          className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${paymentMethodGift === 'points' ? 'bg-gradient-to-r from-pink-600 to-purple-600' : 'bg-gray-900'}`}
                        >
                          {sendingGift ? 'Procesando...' : (
                             <>
                               <Gift className="w-5 h-5" /> 
                               {paymentMethodGift === 'points' ? `Enviar (${selectedGift.cost_points} Pts)` : `Pagar ${formatCOP(selectedGift.price_cop)}`}
                             </>
                          )}
                        </button>
                     </div>
                   ) : (
                     <div className="text-center py-8">
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
