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
  TrendingUp, Gift, Zap, Wallet, Search, User, Heart
} from 'lucide-react';

const PurchasePointsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points, refreshPoints } = usePoints(); // Asegúrate de tener refreshPoints en tu contexto

  // === ESTADOS GLOBALES ===
  const [activeTab, setActiveTab] = useState('buy_points'); // 'buy_points' | 'gift_store'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === ESTADOS DE COMPRA DE PUNTOS (Tu código original) ===
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // === NUEVOS ESTADOS: TIENDA DE REGALOS ===
  const [gifts, setGifts] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
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
      // 1. Cargar Paquetes de Puntos (Lógica Original)
      const initResult = await paymentService.initialize();
      const { data: packagesData } = await supabase.rpc('get_active_packages');
      setPackages(packagesData || []);
      
      const activeGateways = paymentService.getActiveGateways();
      setGateways(activeGateways || []);
      if (activeGateways?.length > 0) setSelectedGateway(paymentService.getDefaultGateway());

      const history = await paymentService.getUserPurchaseHistory(user.id, 10);
      if (history?.success) setPurchaseHistory(history.purchases || []);

      // 2. Cargar Regalos Virtuales (NUEVO)
      const { data: giftsData, error: giftsError } = await supabase
        .from('virtual_gifts')
        .select('*')
        .eq('is_active', true)
        .order('cost_points', { ascending: true });
      
      if (giftsError) console.error('Error loading gifts', giftsError);
      setGifts(giftsData || []);

    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // === LÓGICA DE BÚSQUEDA DE USUARIOS (NUEVO) ===
  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    // Ajusta 'profiles' y los campos según tu tabla real de usuarios
    const { data, error } = await supabase
      .from('profiles') // O 'users_public'
      .select('id, username, full_name, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user.id) // No buscarse a sí mismo
      .limit(5);

    if (!error && data) {
      setSearchResults(data);
    }
  };

  // === LÓGICA DE ENVÍO DE REGALO (NUEVO) ===
  const handleSendGift = async () => {
    if (!selectedGift || !selectedRecipient) return;

    // Validación de saldo local antes de llamar a la API
    const currentBalance = points?.premium || 0; // Asumiendo que se usan puntos premium
    if (currentBalance < selectedGift.cost_points) {
      setError('No tienes suficientes puntos Premium. ¡Recarga primero!');
      setActiveTab('buy_points'); // Redirigir a comprar
      return;
    }

    setSendingGift(true);
    setError(null);

    try {
      // Llamada a la función RPC creada en el paso 1
      const { data, error } = await supabase.rpc('send_virtual_gift', {
        receiver_id: selectedRecipient.id,
        gift_id: selectedGift.id
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      setGiftSuccess(true);
      if(refreshPoints) refreshPoints(); // Actualizar contexto
      
      // Resetear formulario después de 3 segundos
      setTimeout(() => {
        setGiftSuccess(false);
        setSelectedGift(null);
        setSelectedRecipient(null);
        setSearchQuery('');
        setSearchResults([]);
      }, 3000);

    } catch (err) {
      console.error('Error sending gift:', err);
      setError('Error al enviar el regalo: ' + err.message);
    } finally {
      setSendingGift(false);
    }
  };

  // === LÓGICA DE COMPRA DE PUNTOS (Tu código original) ===
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
      if (!result.success) throw new Error(result.error);

      const transactionId = result.id || result.transaction_id;
      if (result.paymentUrl) window.location.href = result.paymentUrl;
      else if (result.checkoutUrl) window.location.href = result.checkoutUrl;
      else if (transactionId) navigate(`/purchase/pending?purchase_id=${transactionId}`);
      else navigate('/purchase/pending');
    } catch (err) {
      setError(err.message);
      setPurchasing(false);
    }
  };

  // Helpers de UI (Originales + Nuevos)
  const calculateDiscountedPrice = (price, discount) => price * (1 - discount / 100);
  const formatCOP = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Completada' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Fallida' },
    };
    return badges[status] || badges.pending;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-16">Cargando...</div>;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* HEADER Y BALANCE */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="text-yellow-500" />
                Marketplace de Puntos
              </h1>
              <p className="text-gray-600">Gestiona tus puntos y envía regalos a creadores</p>
            </div>
            
            {/* CARD DE PUNTOS COMPACTA */}
            <div className="bg-gray-900 text-white p-4 rounded-xl shadow-xl flex items-center gap-6">
              <div>
                <p className="text-gray-400 text-xs uppercase font-bold">Puntos Premium</p>
                <p className="text-2xl font-bold text-yellow-400">{points?.premium || 0}</p>
              </div>
              <div className="h-8 w-px bg-gray-700"></div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-bold">Puntos Gratis</p>
                <p className="text-xl font-bold">{points?.free || 0}</p>
              </div>
            </div>
          </div>

          {/* ERROR GLOBAL */}
          {error && (
            <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex justify-between items-center">
              <p>{error}</p>
              <button onClick={() => setError(null)} className="text-sm underline">Cerrar</button>
            </div>
          )}

          {/* TABS DE NAVEGACIÓN */}
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm mb-8 w-full max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('buy_points')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'buy_points'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Comprar Puntos
            </button>
            <button
              onClick={() => setActiveTab('gift_store')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'gift_store'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Gift className="w-4 h-4" />
              Regalos Virtuales
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: COMPRAR PUNTOS (TU LÓGICA ORIGINAL) */}
          {/* ========================================================= */}
          {activeTab === 'buy_points' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Paquetes de Recarga</h2>
              
              {/* GRID DE PAQUETES */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const finalPrice = calculateDiscountedPrice(pkg.price_cop, pkg.discount_percentage);
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative bg-white rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                          isSelected ? 'ring-2 ring-blue-500 shadow-xl scale-[1.02]' : 'border hover:border-blue-300 shadow-sm'
                        }`}
                      >
                        {pkg.is_featured && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-3 py-0.5 rounded-full text-xs font-bold shadow-sm">
                            Más Popular
                          </div>
                        )}
                        <div className="text-center">
                           <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                             <Package className="text-blue-600" />
                           </div>
                           <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                           <p className="text-2xl font-bold text-blue-600 my-2">{pkg.points_amount.toLocaleString()} pts</p>
                           <p className="text-gray-900 font-bold">{formatCOP(finalPrice)}</p>
                           {pkg.discount_percentage > 0 && (
                             <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">-{pkg.discount_percentage}% OFF</span>
                           )}
                        </div>
                      </div>
                    );
                })}
              </div>

              {/* SECCIÓN DE PAGO (Si hay paquete seleccionado) */}
              {selectedPackage && (
                 <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4">Método de Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {gateways.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGateway(g)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            selectedGateway?.id === g.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                           {g.logo_url ? <img src={g.logo_url} className="h-6" alt="" /> : <CreditCard className="h-6 text-gray-400" />}
                           <span className="font-medium text-sm">{g.display_name}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handlePurchase}
                      disabled={purchasing || !selectedGateway}
                      className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {purchasing ? 'Procesando...' : `Pagar ${formatCOP(calculateDiscountedPrice(selectedPackage.price_cop, selectedPackage.discount_percentage))}`}
                    </button>
                 </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: TIENDA DE REGALOS (NUEVA SECCIÓN) */}
          {/* ========================================================= */}
          {activeTab === 'gift_store' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {!selectedGift ? (
                /* VISTA DE CATÁLOGO DE REGALOS */
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Regalos Virtuales</h2>
                    <p className="text-gray-600">Apoya a tus creadores favoritos enviándoles regalos</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {gifts.map((gift) => (
                      <div 
                        key={gift.id}
                        onClick={() => setSelectedGift(gift)}
                        className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-100 hover:border-pink-200 transition-all cursor-pointer p-4 flex flex-col items-center text-center group"
                      >
                        <div className="w-20 h-20 mb-4 relative">
                          {/* Aquí iría la imagen real */}
                          <img 
                            src={gift.icon_url || "https://via.placeholder.com/150"} 
                            alt={gift.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm mb-1">{gift.name}</h3>
                        <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          {gift.cost_points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* VISTA DE DETALLE Y SELECCIÓN DE USUARIO */
                <div className="max-w-lg mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-pink-100">
                  
                  {/* Cabecera del Regalo */}
                  <div className="bg-pink-50 p-6 text-center relative">
                    <button 
                      onClick={() => { setSelectedGift(null); setSelectedRecipient(null); }}
                      className="absolute top-4 left-4 text-pink-700 hover:bg-pink-100 p-1 rounded-full"
                    >
                      ← Volver
                    </button>
                    <img src={selectedGift.icon_url || "https://via.placeholder.com/150"} alt={selectedGift.name} className="w-24 h-24 mx-auto mb-2 object-contain" />
                    <h2 className="text-2xl font-bold text-gray-900">{selectedGift.name}</h2>
                    <p className="text-pink-600 font-bold flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 fill-current" /> {selectedGift.cost_points} puntos
                    </p>
                  </div>

                  <div className="p-6">
                    {!giftSuccess ? (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">¿A quién se lo quieres enviar?</label>
                        
                        {/* Buscador de Usuarios */}
                        {!selectedRecipient ? (
                          <div className="relative mb-6">
                            <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden focus-within:border-pink-500 transition-colors">
                              <div className="pl-3">
                                <Search className="text-gray-400 w-5 h-5" />
                              </div>
                              <input 
                                type="text"
                                placeholder="Buscar usuario por nombre..."
                                className="w-full p-3 outline-none text-gray-800"
                                value={searchQuery}
                                onChange={(e) => handleSearchUsers(e.target.value)}
                              />
                            </div>
                            
                            {/* Lista de Resultados */}
                            {searchResults.length > 0 && (
                              <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {searchResults.map(userResult => (
                                  <div 
                                    key={userResult.id}
                                    onClick={() => {
                                      setSelectedRecipient(userResult);
                                      setSearchResults([]);
                                      setSearchQuery('');
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b last:border-0"
                                  >
                                    <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                                      {userResult.avatar_url ? (
                                        <img src={userResult.avatar_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <User className="w-full h-full p-1 text-gray-500" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">{userResult.username || "Usuario"}</p>
                                      <p className="text-xs text-gray-500">{userResult.full_name}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Usuario Seleccionado */
                          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-full overflow-hidden border-2 border-pink-200">
                                {selectedRecipient.avatar_url ? (
                                  <img src={selectedRecipient.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-full h-full p-2 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Enviando a:</p>
                                <p className="font-bold text-gray-900">{selectedRecipient.username || "Usuario"}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setSelectedRecipient(null)}
                              className="text-xs text-red-500 font-medium hover:underline"
                            >
                              Cambiar
                            </button>
                          </div>
                        )}

                        <button
                          onClick={handleSendGift}
                          disabled={!selectedRecipient || sendingGift}
                          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                          {sendingGift ? (
                            <span className="flex items-center justify-center gap-2"><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> Enviando...</span>
                          ) : (
                            <span className="flex items-center justify-center gap-2"><Gift className="w-5 h-5" /> Enviar Regalo (-{selectedGift.cost_points} pts)</span>
                          )}
                        </button>
                      </>
                    ) : (
                      /* Mensaje de Éxito */
                      <div className="text-center py-8 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Heart className="w-8 h-8 text-green-500 fill-current" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¡Regalo Enviado!</h3>
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
