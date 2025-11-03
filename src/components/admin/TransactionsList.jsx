import React from 'react';
import { ChevronLeft, ChevronRight, Eye, CreditCard, Smartphone } from 'lucide-react';

const TransactionsList = ({ transactions, loading, pagination, onPageChange, onViewDetails }) => {
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

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Truncar ID
  const truncateId = (id) => {
    if (!id) return '-';
    return `${id.substring(0, 8)}...`;
  };

  // Obtener badge de estado
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: {
        label: 'Completado',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      pending: {
        label: 'Pendiente',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      failed: {
        label: 'Fallido',
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      refunded: {
        label: 'Reembolsado',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Obtener ícono de gateway
  const getGatewayIcon = (gateway) => {
    if (!gateway) return <CreditCard className="w-4 h-4 text-gray-400" />;
    
    const gatewayLower = gateway.toLowerCase();
    if (gatewayLower.includes('mercadopago') || gatewayLower.includes('mercado')) {
      return <CreditCard className="w-4 h-4 text-blue-500" />;
    }
    if (gatewayLower.includes('nequi')) {
      return <Smartphone className="w-4 h-4 text-purple-500" />;
    }
    return <CreditCard className="w-4 h-4 text-gray-400" />;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['ID', 'Usuario', 'Paquete', 'Monto', 'Estado', 'Gateway', 'Fecha', 'Acciones'].map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-24" /></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay transacciones</h3>
        <p className="mt-1 text-sm text-gray-500">
          No se encontraron transacciones con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paquete
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gateway
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr
                key={transaction.transaction_id}
                onClick={() => onViewDetails(transaction)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* ID */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="group relative">
                    <span className="text-sm font-mono text-gray-900">
                      {truncateId(transaction.transaction_id)}
                    </span>
                    <div className="hidden group-hover:block absolute z-10 left-0 top-full mt-1 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                      {transaction.transaction_id}
                    </div>
                  </div>
                </td>

                {/* Usuario */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {transaction.user_name || transaction.user_email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {transaction.user_email}
                    </span>
                  </div>
                </td>

                {/* Paquete */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900">
                      {transaction.package_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {transaction.points_amount?.toLocaleString('es-CO')} puntos
                    </span>
                  </div>
                </td>

                {/* Monto */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(transaction.final_price)}
                    </span>
                    {transaction.discount_percentage > 0 && (
                      <span className="text-xs text-green-600">
                        -{transaction.discount_percentage}% dto.
                      </span>
                    )}
                  </div>
                </td>

                {/* Estado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(transaction.status)}
                </td>

                {/* Gateway */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getGatewayIcon(transaction.gateway_used)}
                    <span className="text-sm text-gray-900">
                      {transaction.gateway_used || '-'}
                    </span>
                  </div>
                </td>

                {/* Fecha */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {formatDate(transaction.created_at)}
                  </span>
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(transaction);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Ver detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          {/* Paginación móvil */}
          <button
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>

        {/* Paginación desktop */}
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">
                {(pagination.currentPage - 1) * pagination.limit + 1}
              </span>
              {' '}-{' '}
              <span className="font-medium">
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
              </span>
              {' '}de{' '}
              <span className="font-medium">{pagination.totalCount}</span>
              {' '}transacciones
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Números de página */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      pagination.currentPage === pageNum
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsList;
