// src/pages/purchase-points/PurchasePending.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, RefreshCw, Home, AlertCircle } from 'lucide-react';
import paymentService from '../../services/paymentService.js';

const PurchasePending = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const purchaseId = searchParams.get('purchase_id');

  useEffect(() => {
    if (purchaseId) {
      checkStatus();
    }
  }, [purchaseId]);

  const checkStatus = async () => {
    if (!purchaseId) return;
    
    setChecking(true);
    try {
      const result = await paymentService.checkPurchaseStatus(purchaseId);
      if (result.success) {
        setPurchase(result.purchase);
        
        // Si el pago ya se completó, redirigir a success
        if (result.purchase.status === 'completed') {
          navigate(`/purchase/success?purchase_id=${purchaseId}`, { replace: true });
        } else if (result.purchase.status === 'failed') {
          navigate('/purchase/failure', { replace: true });
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Icono de reloj animado */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-yellow-100 rounded-full animate-pulse opacity-50"></div>
            </div>
            <div className="relative bg-gradient-to-br from-yellow-400 to-orange-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-20 w-20 text-white animate-pulse" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Pago Pendiente
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Tu pago está siendo procesado
          </p>

          {/* Información */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h3 className="font-bold text-gray-900 mb-2">
                  ¿Qué significa esto?
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Tu pago está siendo verificado por la entidad bancaria. 
                  Este proceso puede tomar algunos minutos o hasta 24 horas 
                  dependiendo del método de pago utilizado.
                </p>
                <p className="text-sm text-gray-700">
                  Te notificaremos por email cuando el pago sea confirmado 
                  y tus puntos serán acreditados automáticamente.
                </p>
              </div>
            </div>
          </div>

          {/* ✅ CORRECCIÓN: Mostrar el ID siempre que exista en la URL, incluso si 'purchase' es null */}
          {purchaseId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">ID de Transacción:</span>
                <span className="font-mono text-gray-900 text-xs md:text-sm break-all">
                  {/* Preferir el ID del objeto purchase, fallback al ID de la URL */}
                  {purchase?.transaction_id || purchaseId}
                </span>
              </div>
              {purchase && (
                 <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-gray-600">Estado actual:</span>
                    <span className="font-bold text-yellow-600 capitalize">
                      {purchase.status === 'pending' ? 'Pendiente' : purchase.status}
                    </span>
                 </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="space-y-3">
            <button
              onClick={checkStatus}
              disabled={checking || !purchaseId}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Verificar Estado
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full border-2 border-gray-300 text-gray-700 font-medium py-4 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Volver al Inicio
            </button>
          </div>

          {/* Nota */}
          <p className="text-xs text-gray-500 mt-6">
            No cierres esta ventana hasta que el pago sea confirmado o 
            guarda el ID de transacción para futuras consultas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PurchasePending;
