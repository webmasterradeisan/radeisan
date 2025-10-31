import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Sparkles, ArrowRight, Home } from 'lucide-react';
import { usePoints } from '../../contexts/PointsContext';
import paymentService from '../../services/paymentService';

const PurchaseSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshPoints, points } = usePoints();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPurchaseInfo = async () => {
      const purchaseId = searchParams.get('purchase_id');
      
      if (purchaseId) {
        const result = await paymentService.checkPurchaseStatus(purchaseId);
        if (result.success) {
          setPurchase(result.purchase);
        }
      }
      
      // Refrescar puntos
      await refreshPoints();
      setLoading(false);
    };

    loadPurchaseInfo();
  }, [searchParams, refreshPoints]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Icono de éxito animado */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-green-100 rounded-full animate-ping opacity-20"></div>
            </div>
            <div className="relative bg-gradient-to-br from-green-400 to-green-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-20 w-20 text-white" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            ¡Compra Exitosa! 🎉
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Tus puntos premium han sido acreditados correctamente
          </p>

          {/* Información de la compra */}
          {purchase && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Puntos Comprados</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {purchase.points_amount?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monto Pagado</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0
                    }).format(purchase.price_cop)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Balance actual */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl p-6 mb-8 text-white">
            <p className="text-sm opacity-90 mb-2">Tu Nuevo Balance</p>
            <div className="flex items-center justify-center gap-6">
              <div>
                <p className="text-xs opacity-75">Gratis</p>
                <p className="text-2xl font-bold">{points?.free || 0}</p>
              </div>
              <div className="w-px h-12 bg-white opacity-30"></div>
              <div>
                <p className="text-xs opacity-75">Premium</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                  {points?.premium || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/rewards')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2"
            >
              Ver Recompensas
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full border-2 border-gray-300 text-gray-700 font-medium py-4 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Ir al Inicio
            </button>
          </div>

          {/* Mensaje adicional */}
          <p className="text-xs text-gray-500 mt-6">
            Gracias por tu compra. Los puntos están disponibles de inmediato.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSuccess;
