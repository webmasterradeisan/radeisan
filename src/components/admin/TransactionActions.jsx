import React, { useState } from 'react';
import { Check, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { approveTransaction, rejectTransaction, refundTransaction } from '../../services/transactionsService';

const TransactionActions = ({ transaction, onActionComplete }) => {
  const [showModal, setShowModal] = useState(null); // 'approve', 'reject', 'refund', null
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Manejar aprobación
  const handleApprove = async () => {
    try {
      setLoading(true);
      const result = await approveTransaction(transaction.transaction_id);

      if (result.success) {
        toast.success('Transacción aprobada exitosamente');
        setShowModal(null);
        onActionComplete();
      } else {
        toast.error(result.error || 'Error al aprobar la transacción');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      toast.error('Error al aprobar la transacción');
    } finally {
      setLoading(false);
    }
  };

  // Manejar rechazo
  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('Debes proporcionar una razón para rechazar');
      return;
    }

    if (reason.trim().length < 10) {
      toast.error('La razón debe tener al menos 10 caracteres');
      return;
    }

    try {
      setLoading(true);
      const result = await rejectTransaction(transaction.transaction_id, reason.trim());

      if (result.success) {
        toast.success('Transacción rechazada exitosamente');
        setShowModal(null);
        setReason('');
        onActionComplete();
      } else {
        toast.error(result.error || 'Error al rechazar la transacción');
      }
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      toast.error('Error al rechazar la transacción');
    } finally {
      setLoading(false);
    }
  };

  // Manejar reembolso
  const handleRefund = async () => {
    if (!reason.trim()) {
      toast.error('Debes proporcionar una razón para el reembolso');
      return;
    }

    if (reason.trim().length < 10) {
      toast.error('La razón debe tener al menos 10 caracteres');
      return;
    }

    try {
      setLoading(true);
      const result = await refundTransaction(transaction.transaction_id, reason.trim());

      if (result.success) {
        toast.success('Transacción reembolsada exitosamente');
        setShowModal(null);
        setReason('');
        onActionComplete();
      } else {
        toast.error(result.error || 'Error al reembolsar la transacción');
      }
    } catch (error) {
      console.error('Error refunding transaction:', error);
      toast.error('Error al reembolsar la transacción');
    } finally {
      setLoading(false);
    }
  };

  // Cerrar modal
  const closeModal = () => {
    if (!loading) {
      setShowModal(null);
      setReason('');
    }
  };

  // Determinar qué botones mostrar según el estado
  const canApprove = transaction.status === 'pending';
  const canReject = transaction.status === 'pending';
  const canRefund = transaction.status === 'completed';

  // Si no hay acciones disponibles
  if (!canApprove && !canReject && !canRefund) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-gray-500">No hay acciones disponibles para esta transacción</p>
      </div>
    );
  }

  return (
    <>
      {/* Botones de acción */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {canApprove && (
          <button
            onClick={() => setShowModal('approve')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <Check className="w-4 h-4" />
            Aprobar Transacción
          </button>
        )}

        {canReject && (
          <button
            onClick={() => setShowModal('reject')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
            Rechazar Transacción
          </button>
        )}

        {canRefund && (
          <button
            onClick={() => setShowModal('refund')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reembolsar Transacción
          </button>
        )}
      </div>

      {/* Modal de Aprobación */}
      {showModal === 'approve' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aprobar Transacción
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  ¿Estás seguro de que deseas aprobar esta transacción? Los puntos serán acreditados al usuario inmediatamente.
                </p>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Usuario:</p>
                  <p className="text-sm font-medium text-gray-900">{transaction.user_email}</p>
                  <p className="text-xs text-gray-500 mt-2 mb-1">Puntos a acreditar:</p>
                  <p className="text-sm font-medium text-gray-900">
                    {transaction.points_amount?.toLocaleString('es-CO')} puntos
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {loading ? 'Aprobando...' : 'Confirmar Aprobación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rechazo */}
      {showModal === 'reject' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Rechazar Transacción
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Proporciona una razón para rechazar esta transacción. El usuario será notificado.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razón del rechazo *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Pago duplicado, información incorrecta, transacción sospechosa..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo 10 caracteres
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={loading || !reason.trim() || reason.trim().length < 10}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {loading ? 'Rechazando...' : 'Confirmar Rechazo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reembolso */}
      {showModal === 'refund' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Reembolsar Transacción
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Esta acción reembolsará la transacción y descontará los puntos del usuario si ya fueron utilizados.
                </p>
                <div className="bg-orange-50 rounded-lg p-3 mb-4 border border-orange-200">
                  <p className="text-xs font-medium text-orange-800 mb-1">⚠️ Advertencia:</p>
                  <p className="text-xs text-orange-700">
                    Esta acción es irreversible. Los puntos serán descontados inmediatamente.
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razón del reembolso *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Solicitud del usuario, error en la transacción, problema técnico..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo 10 caracteres
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRefund}
                    disabled={loading || !reason.trim() || reason.trim().length < 10}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {loading ? 'Reembolsando...' : 'Confirmar Reembolso'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionActions;
