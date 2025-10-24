// src/components/DualPointsBalance.jsx
// Componente para mostrar el balance de puntos dual (gratis + premium)

import React, { useState } from 'react';
import { useDualPoints } from '../hooks/useDualPoints';
import AppIcon from './AppIcon';

/**
 * ========================================
 * COMPONENTE: DualPointsBalance
 * ========================================
 * Muestra el balance de puntos dual del usuario con diseño moderno
 * 
 * @param {Object} props - Props del componente
 * @param {boolean} props.showStats - Mostrar estadísticas adicionales (default: false)
 * @param {boolean} props.showTransactions - Mostrar últimas transacciones (default: false)
 * @param {boolean} props.compact - Versión compacta del componente (default: false)
 * @param {boolean} props.autoRefresh - Auto-refrescar balance (default: false)
 * @param {Function} props.onPurchaseClick - Callback al hacer click en comprar puntos
 * @param {string} props.className - Clases CSS adicionales
 */
const DualPointsBalance = ({
  showStats = false,
  showTransactions = false,
  compact = false,
  autoRefresh = false,
  onPurchaseClick,
  className = ''
}) => {
  const {
    balance,
    loading,
    refreshing,
    error,
    refresh,
    formattedTotal,
    formattedFree,
    formattedPremium,
    transactions,
    fetchTransactions
  } = useDualPoints({ autoRefresh });

  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // ========================================
  // HANDLERS
  // ========================================

  const handleRefresh = async () => {
    await refresh();
    if (showTransactions) {
      await fetchTransactions({ limit: 10 });
    }
  };

  const handlePurchaseClick = () => {
    if (onPurchaseClick) {
      onPurchaseClick();
    } else {
      // Redirigir a la página de compra de puntos
      window.location.href = '/rewards?tab=buy-points';
    }
  };

  // ========================================
  // LOADING STATE
  // ========================================
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start">
          <AppIcon icon="AlertCircle" className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error al cargar puntos</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // VERSIÓN COMPACTA
  // ========================================
  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {/* Total de puntos */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <AppIcon icon="Coins" className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-gray-900">{formattedTotal}</p>
          </div>
        </div>

        {/* Divisor */}
        <div className="h-8 w-px bg-gray-200"></div>

        {/* Puntos gratis */}
        <div className="flex items-center space-x-1">
          <AppIcon icon="Circle" className="w-3 h-3 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{formattedFree}</span>
        </div>

        {/* Puntos premium */}
        <div className="flex items-center space-x-1">
          <AppIcon icon="Gem" className="w-3 h-3 text-green-500" />
          <span className="text-sm font-medium text-green-600">{formattedPremium}</span>
        </div>

        {/* Botón refresh */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Actualizar balance"
        >
          <AppIcon 
            icon="RefreshCw" 
            className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} 
          />
        </button>
      </div>
    );
  }

  // ========================================
  // VERSIÓN COMPLETA
  // ========================================
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <AppIcon icon="Coins" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Balance de Puntos</h3>
              <p className="text-sm text-gray-500">Sistema dual gratis + premium</p>
            </div>
          </div>

          {/* Botón refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar balance"
          >
            <AppIcon 
              icon="RefreshCw" 
              className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total de Puntos */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Disponible</span>
              <AppIcon icon="TrendingUp" className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{formattedTotal}</p>
            <p className="text-xs text-gray-500">{balance.total_points.toLocaleString()} puntos</p>
          </div>

          {/* Puntos Gratis */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Puntos Gratis</span>
              <AppIcon icon="Circle" className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{formattedFree}</p>
            <p className="text-xs text-gray-500">{balance.free_points.toLocaleString()} ganados</p>
          </div>

          {/* Puntos Premium */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Puntos Premium</span>
              <AppIcon icon="Gem" className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-700 mb-1">{formattedPremium}</p>
            <p className="text-xs text-gray-500">{balance.premium_points.toLocaleString()} comprados</p>
          </div>
        </div>

        {/* Botón Comprar Puntos Premium */}
        <button
          onClick={handlePurchaseClick}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
        >
          <AppIcon icon="Sparkles" className="w-5 h-5" />
          <span>Comprar Puntos Premium</span>
          <AppIcon icon="ChevronRight" className="w-4 h-4" />
        </button>

        {/* Estadísticas adicionales */}
        {showStats && balance.stats && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Estadísticas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Total Ganado</p>
                <p className="text-lg font-semibold text-gray-900">
                  {balance.stats.total_free_earned.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Total Comprado</p>
                <p className="text-lg font-semibold text-green-600">
                  {balance.stats.total_premium_purchased.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Total Gastado</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(balance.stats.total_free_spent + balance.stats.total_premium_spent).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Disponible</p>
                <p className="text-lg font-semibold text-blue-600">
                  {balance.total_points.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Últimas transacciones */}
        {showTransactions && transactions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Últimas Transacciones</h4>
              <button
                onClick={() => setShowAllTransactions(!showAllTransactions)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAllTransactions ? 'Ver menos' : 'Ver todas'}
              </button>
            </div>
            <div className="space-y-2">
              {transactions.slice(0, showAllTransactions ? undefined : 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.points_change > 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <AppIcon
                        icon={transaction.points_change > 0 ? 'Plus' : 'Minus'}
                        className={`w-4 h-4 ${
                          transaction.points_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      transaction.points_change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.points_change > 0 ? '+' : ''}{transaction.points_change}
                    </p>
                    <div className="flex items-center justify-end space-x-1">
                      <AppIcon
                        icon={transaction.points_type === 'premium' ? 'Gem' : 'Circle'}
                        className={`w-3 h-3 ${
                          transaction.points_type === 'premium' ? 'text-green-500' : 'text-gray-400'
                        }`}
                      />
                      <span className="text-xs text-gray-500 capitalize">
                        {transaction.points_type === 'premium' ? 'Premium' : 'Gratis'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <div className="flex items-start space-x-2">
          <AppIcon icon="Info" className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Sistema Dual:</span> Los puntos premium se usan primero al canjear recompensas. 
            Gana puntos gratis subiendo contenido o completa misiones diarias.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DualPointsBalance;
