import React from 'react';
import { Receipt, DollarSign, TrendingUp, ShoppingCart, Calendar } from 'lucide-react';

const TransactionStats = ({ stats, loading, period, onPeriodChange }) => {
  // Formatear moneda COP
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Formatear número con separadores
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('es-CO').format(num);
  };

  // Formatear porcentaje
  const formatPercentage = (percent) => {
    if (!percent && percent !== 0) return '0%';
    return `${percent.toFixed(1)}%`;
  };

  // Períodos disponibles
  const periods = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mes' },
    { value: 'all', label: 'Todo' }
  ];

  // Cards de estadísticas
  const statsCards = [
    {
      id: 'transactions',
      title: 'Total Transacciones',
      value: stats?.overview?.total_transactions || 0,
      format: formatNumber,
      icon: Receipt,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      id: 'revenue',
      title: 'Ingresos Totales',
      value: stats?.overview?.total_revenue || 0,
      format: formatCurrency,
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      id: 'conversion',
      title: 'Tasa de Conversión',
      value: stats?.overview?.conversion_rate || 0,
      format: formatPercentage,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      subtitle: `${formatNumber(stats?.by_status?.completed || 0)} completadas / ${formatNumber(stats?.overview?.total_transactions || 0)} total`
    },
    {
      id: 'average',
      title: 'Ticket Promedio',
      value: stats?.overview?.average_transaction || 0,
      format: formatCurrency,
      icon: ShoppingCart,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200'
    }
  ];

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              </div>
              <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-40 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con selector de período */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Estadísticas</h2>
          <p className="text-sm text-gray-500">
            Período: {periods.find(p => p.value === period)?.label}
          </p>
        </div>

        {/* Selector de período */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <Calendar className="w-4 h-4 text-gray-400 ml-2" />
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                period === p.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          
          return (
            <div
              key={card.id}
              className={`bg-white rounded-lg border ${card.borderColor} p-6 hover:shadow-md transition-shadow`}
            >
              {/* Header del card */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <div className={`${card.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>

              {/* Valor principal */}
              <div className="space-y-2">
                <p className={`text-2xl font-bold text-gray-900`}>
                  {card.format(card.value)}
                </p>

                {/* Subtitle opcional */}
                {card.subtitle && (
                  <p className="text-xs text-gray-500">
                    {card.subtitle}
                  </p>
                )}

                {/* Indicador de estado (opcional) */}
                {card.id === 'transactions' && stats?.by_status && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-green-600">
                      <span className="w-2 h-2 bg-green-600 rounded-full" />
                      {formatNumber(stats.by_status.completed)} completadas
                    </span>
                    <span className="flex items-center gap-1 text-yellow-600">
                      <span className="w-2 h-2 bg-yellow-600 rounded-full" />
                      {formatNumber(stats.by_status.pending || 0)} pendientes
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen por estado (opcional - panel adicional) */}
      {stats?.by_status && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Resumen por Estado
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(stats.by_status.completed || 0)}
              </p>
              <p className="text-xs text-gray-500">Completadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {formatNumber(stats.by_status.pending || 0)}
              </p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {formatNumber(stats.by_status.failed || 0)}
              </p>
              <p className="text-xs text-gray-500">Fallidas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {formatNumber(stats.by_status.refunded || 0)}
              </p>
              <p className="text-xs text-gray-500">Reembolsadas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionStats;
