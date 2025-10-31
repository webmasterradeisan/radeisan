import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, RefreshCw, Home, HelpCircle } from 'lucide-react';

const PurchaseFailure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('error') || 'El pago no pudo ser procesado';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Icono de error */}
          <div className="bg-gradient-to-br from-red-400 to-red-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-20 w-20 text-white" />
          </div>

          {/* Título */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Pago No Completado
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            {errorMessage}
          </p>

          {/* Razones comunes */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-red-600" />
              Posibles razones:
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Fondos insuficientes en tu cuenta</li>
              <li>• Datos de pago incorrectos</li>
              <li>• Transacción cancelada por el usuario</li>
              <li>• Problemas con la entidad bancaria</li>
              <li>• Límite de transacciones alcanzado</li>
            </ul>
          </div>

          {/* Nota importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> No se realizó ningún cargo a tu cuenta. 
              Puedes intentar nuevamente con otro método de pago.
            </p>
          </div>

          {/* Acciones */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/purchase-points')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Intentar Nuevamente
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full border-2 border-gray-300 text-gray-700 font-medium py-4 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Volver al Inicio
            </button>
          </div>

          {/* Soporte */}
          <p className="text-xs text-gray-500 mt-6">
            Si el problema persiste, contáctanos a soporte@radeisan.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseFailure;
