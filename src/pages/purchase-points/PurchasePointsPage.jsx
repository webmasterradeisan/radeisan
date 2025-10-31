import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import paymentService from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import Header from '../components/ui/Header';
import { 
  CreditCard, Package, Star, Award, CheckCircle, 
  ArrowRight, Sparkles, Clock, ShieldCheck, AlertCircle,
  TrendingUp, Gift, Zap, Wallet
} from 'lucide-react';

const PurchasePointsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points, refreshPoints } = usePoints();

  // Estados
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, [user]);

  // Cargar paquetes, pasarelas e historial
  const loadData = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Inicializar servicio de pagos
      const initResult = await paymentService.initialize();
      if (!initResult.success) {
        throw new Error(initResult.error || 'Error al inicializar servicio de pagos');
      }

      // Cargar paquetes activos directamente desde Supabase
      const { data: packagesData, error: packagesError } = await supabase
        .from('premium_points_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (packagesError) throw packagesError;
      setPackages(packagesData || []);

      // Obtener pasarelas activas del servicio
      const activeGateways = paymentService.getActiveGateways();
      setGateways(activeGateways);

      // Establecer pasarela predeterminada
      if (activeGateways.length > 0) {
        setSelectedGateway(paymentService.getDefaultGateway());
      }

      // Cargar historial de compras
      const history = await paymentService.getUserPurchaseHistory(user.id, 10);
      if (history.success) {
        setPurchaseHistory(history.purchases);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Error al cargar los paquetes. Por favor recarga la página.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar compra
  const handlePurchase = async () => {
    if (!selectedPackage || !selectedGateway) {
      setError('Por favor selecciona un paquete y método de pago');
      return;
    }

    // Validar el paquete antes de proceder
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

      if (!result.success) {
        throw new Error(result.error);
      }

      // El usuario será redirigido a la pasarela de pago automáticamente
      // Cuando regrese, se actualizarán los puntos mediante webhook
    } catch (err) {
      console.error('Error purchasing:', err);
      setError(err.message || 'Error al procesar la compra. Por favor intenta de nuevo.');
      setPurchasing(false);
    }
  };

  // Seleccionar paquete
  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setError(null);
  };

  // Calcular precio con descuento
  const calculateDiscountedPrice = (price, discount) => {
    return price * (1 - discount / 100);
  };

  // Formatear moneda COP
  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener badge de estado
  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Completada' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Fallida' },
      refunded: { color: 'bg-gray-100 text-gray-800', text: 'Reembolsada' }
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
            <p className="text-gray-600">Cargando paquetes...</p>
          </div>
        </div>
      </>
    );
  }

  if (gateways.length === 0) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4 pt-16">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pagos Temporalmente No Disponibles
            </h2>
            <p className="text-gray-600 mb-6">
              Las pasarelas de pago no están configuradas en este momento. 
              Por favor intenta más tarde.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ===================================== */}
      {/* HEADER FIJO */}
      {/* ===================================== */}
      <Header />

      {/* ===================================== */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ===================================== */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* ===================================== */}
          {/* TÍTULO DE PÁGINA */}
          {/* ===================================== */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-2">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Comprar Puntos Premium
                </h1>
                <p className="text-gray-600 text-sm">
                  Obtén puntos para canjear por increíbles recompensas
                </p>
              </div>
            </div>
          </div>

          {/* ===================================== */}
          {/* BALANCE ACTUAL - Card Destacada */}
          {/* ===================================== */}
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

          {/* ===================================== */}
          {/* ERROR MESSAGE */}
          {/* ===================================== */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* ===================================== */}
          {/* BENEFICIOS */}
          {/* ===================================== */}
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

          {/* ===================================== */}
          {/* PAQUETES */}
          {/* ===================================== */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Elige tu Paquete</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const finalPrice = calculateDiscountedPrice(pkg.price_cop, pkg.discount_percentage);
                
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className={`relative bg-white rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'ring-4 ring-blue-500 shadow-2xl scale-105'
                        : 'border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg'
                    } ${pkg.is_featured ? 'border-yellow-400' : ''}`}
                  >
                    {/* Badge destacado */}
                    {pkg.is_featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <Star className="h-3 w-3" />
                        {pkg.badge_text || '¡Más Popular!'}
                      </div>
                    )}

                    {/* Checkmark si está seleccionado */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-1">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                    )}

                    {/* Contenido */}
                    <div className="text-center">
                      <Package className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {pkg.name}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-4 min-h-[40px]">
                        {pkg.description}
                      </p>

                      {/* Puntos */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
                        <p className="text-3xl font-bold text-blue-600 flex items-center justify-center gap-2">
                          <Award className="h-6 w-6" />
                          {pkg.points_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">Puntos Premium</p>
                      </div>

                      {/* Precio */}
                      <div className="mb-4">
                        {pkg.discount_percentage > 0 ? (
                          <>
                            <p className="text-sm text-gray-400 line-through">
                              {formatCOP(pkg.price_cop)}
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCOP(finalPrice)}
                            </p>
                            <div className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full mt-2">
                              Ahorra {pkg.discount_percentage}%
                            </div>
                          </>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCOP(pkg.price_cop)}
                          </p>
                        )}
                      </div>

                      {/* Valor por punto */}
                      <p className="text-xs text-gray-500">
                        ${Math.round(finalPrice / pkg.points_amount)} COP por punto
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===================================== */}
          {/* MÉTODOS DE PAGO */}
          {/* ===================================== */}
          {selectedPackage && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Método de Pago
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {gateways.map((gateway) => {
                  const isSelected = selectedGateway?.id === gateway.id;
                  
                  return (
                    <div
                      key={gateway.id}
                      onClick={() => setSelectedGateway(gateway)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {gateway.logo_url && (
                            <img 
                              src={gateway.logo_url} 
                              alt={gateway.display_name}
                              className="h-8 w-auto"
                            />
                          )}
                          <h3 className="font-bold text-gray-900">{gateway.display_name}</h3>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>

                      {gateway.is_default && (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2">
                          Recomendado
                        </span>
                      )}

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
                  );
                })}
              </div>

              {/* Resumen de compra */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4">Resumen de tu Compra</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paquete:</span>
                    <span className="font-bold text-gray-900">{selectedPackage.name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Puntos:</span>
                    <span className="font-bold text-blue-600">
                      {selectedPackage.points_amount.toLocaleString()}
                    </span>
                  </div>

                  {selectedPackage.discount_percentage > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({selectedPackage.discount_percentage}%):</span>
                      <span className="font-bold">
                        -{formatCOP(selectedPackage.price_cop - calculateDiscountedPrice(selectedPackage.price_cop, selectedPackage.discount_percentage))}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-300 pt-3 flex justify-between text-lg">
                    <span className="font-bold text-gray-900">Total a Pagar:</span>
                    <span className="font-bold text-blue-600">
                      {formatCOP(calculateDiscountedPrice(selectedPackage.price_cop, selectedPackage.discount_percentage))}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={!selectedGateway || purchasing}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      Continuar al Pago
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-500 mt-3">
                  <ShieldCheck className="h-3 w-3 inline mr-1" />
                  Pago 100% seguro y encriptado
                </p>
              </div>
            </div>
          )}

          {/* ===================================== */}
          {/* HISTORIAL DE COMPRAS */}
          {/* ===================================== */}
          {purchaseHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Historial de Compras
                </h2>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  {showHistory ? 'Ocultar' : 'Ver Todo'}
                </button>
              </div>

              {showHistory && (
                <div className="space-y-3">
                  {purchaseHistory.map((purchase) => {
                    const statusBadge = getStatusBadge(purchase.status);
                    
                    return (
                      <div
                        key={purchase.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-gray-900">{purchase.package_name}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.color}`}>
                                {statusBadge.text}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>{purchase.points_amount.toLocaleString()} puntos</span>
                              <span>•</span>
                              <span>{formatCOP(purchase.price_cop)}</span>
                              <span>•</span>
                              <span>{purchase.gateway_used}</span>
                              {purchase.payment_method && (
                                <>
                                  <span>•</span>
                                  <span>{purchase.payment_method.toUpperCase()}</span>
                                </>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(purchase.created_at)}
                            </p>
                          </div>

                          {purchase.status === 'completed' && (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
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
