import React, { useState } from 'react';
import { X, Copy, Check, User, Package, CreditCard, Clock, ChevronDown, ChevronUp, MapPin, Monitor } from 'lucide-react';
import TransactionActions from './TransactionActions';

const TransactionDetails = ({ transaction, onClose, onActionComplete }) => {
  const [copiedId, setCopiedId] = useState(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showTechnicalInfo, setShowTechnicalInfo] = useState(false);

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

  // Formatear fecha completa
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Copiar al clipboard
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Construir timeline de eventos
  const getTimeline = () => {
    const events = [];

    if (transaction.created_at) {
      events.push({
        type: 'created',
        label: 'Transacción creada',
        date: transaction.created_at,
        icon: Clock,
        color: 'blue'
      });
    }

    if (transaction.completed_at) {
      events.push({
        type: 'completed',
        label: 'Transacción completada',
        date: transaction.completed_at,
        icon: Check,
        color: 'green'
      });
    }

    if (transaction.failed_at) {
      events.push({
        type: 'failed',
        label: 'Transacción fallida',
        date: transaction.failed_at,
        icon: X,
        color: 'red'
      });
    }

    if (transaction.refunded_at) {
      events.push({
        type: 'refunded',
        label: 'Transacción reembolsada',
        date: transaction.refunded_at,
        icon: CreditCard,
        color: 'gray'
      });
    }

    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const timeline = getTimeline();

  // Cerrar modal al hacer click en el overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Detalles de Transacción</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 font-mono">
                  {transaction.transaction_id?.substring(0, 16)}...
                </span>
                <button
                  onClick={() => copyToClipboard(transaction.transaction_id, 'transaction')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {copiedId === 'transaction' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {getStatusBadge(transaction.status)}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Información del Usuario */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Información del Usuario</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
                <p className="text-sm text-gray-900">{transaction.user_full_name || transaction.user_name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-sm text-gray-900">{transaction.user_email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                <p className="text-sm text-gray-900">@{transaction.user_name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">User ID</label>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-900 font-mono">{transaction.user_id?.substring(0, 8)}...</p>
                  <button
                    onClick={() => copyToClipboard(transaction.user_id, 'user')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedId === 'user' ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Información del Paquete */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Información del Paquete</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nombre del Paquete</label>
                <p className="text-sm font-semibold text-gray-900">{transaction.package_name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Puntos</label>
                <p className="text-sm text-gray-900">{transaction.points_amount?.toLocaleString('es-CO')} puntos</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Precio Original</label>
                <p className="text-sm text-gray-900">{formatCurrency(transaction.price_cop)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Descuento</label>
                <p className="text-sm text-green-600 font-medium">
                  {transaction.discount_percentage > 0 ? `-${transaction.discount_percentage}%` : 'Sin descuento'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Precio Final</label>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(transaction.final_price)}</p>
              </div>
            </div>
          </div>

          {/* Información de Pago */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Información de Pago</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Gateway</label>
                <p className="text-sm text-gray-900">{transaction.gateway_used || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Método de Pago</label>
                <p className="text-sm text-gray-900">{transaction.payment_method || '-'}</p>
              </div>
              {transaction.payment_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Payment ID</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 font-mono">{transaction.payment_id}</p>
                    <button
                      onClick={() => copyToClipboard(transaction.payment_id, 'payment')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {copiedId === 'payment' ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {transaction.external_transaction_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">External Transaction ID</label>
                  <p className="text-sm text-gray-900 font-mono">{transaction.external_transaction_id}</p>
                </div>
              )}
              {transaction.gateway_transaction_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Gateway Transaction ID</label>
                  <p className="text-sm text-gray-900 font-mono">{transaction.gateway_transaction_id}</p>
                </div>
              )}
              {transaction.refund_reason && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Razón de Reembolso</label>
                  <p className="text-sm text-red-600">{transaction.refund_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline de Eventos */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Timeline de Eventos</h3>
            </div>
            <div className="space-y-4">
              {timeline.map((event, index) => {
                const Icon = event.icon;
                const colorClasses = {
                  blue: 'bg-blue-100 text-blue-600',
                  green: 'bg-green-100 text-green-600',
                  red: 'bg-red-100 text-red-600',
                  gray: 'bg-gray-100 text-gray-600'
                };

                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colorClasses[event.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{event.label}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(event.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {transaction.completion_time_minutes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Tiempo de completado:</span>{' '}
                  {Math.round(transaction.completion_time_minutes)} minutos
                </p>
              </div>
            )}
          </div>

          {/* Información Técnica (Colapsable) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <button
              onClick={() => setShowTechnicalInfo(!showTechnicalInfo)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Información Técnica</h3>
              </div>
              {showTechnicalInfo ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {showTechnicalInfo && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">IP Address</label>
                  <p className="text-sm text-gray-900 font-mono">{transaction.ip_address || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">User Agent</label>
                  <p className="text-xs text-gray-700 break-all">{transaction.user_agent || '-'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata (Colapsable) */}
          {(transaction.metadata || transaction.payment_data || transaction.payment_metadata) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className="flex items-center justify-between w-full"
              >
                <h3 className="text-lg font-semibold text-gray-900">Metadata y Datos de Pago</h3>
                {showMetadata ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {showMetadata && (
                <div className="mt-4 space-y-4">
                  {transaction.payment_data && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Payment Data</label>
                      <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(transaction.payment_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {transaction.payment_metadata && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Payment Metadata</label>
                      <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(transaction.payment_metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                  {transaction.metadata && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Metadata</label>
                      <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(transaction.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <TransactionActions
            transaction={transaction}
            onActionComplete={onActionComplete}
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
