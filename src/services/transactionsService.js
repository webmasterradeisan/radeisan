/**
 * TRANSACTIONS SERVICE
 * Servicio para gestión de transacciones en el panel administrativo
 * RADEISAN Platform
 */

import { supabase } from '../supabase';

/**
 * Obtiene transacciones con filtros opcionales y paginación
 * @param {Object} filters - Filtros opcionales
 * @param {string} filters.status - Estado de la transacción (pending, completed, failed, refunded)
 * @param {string} filters.userId - UUID del usuario
 * @param {string} filters.dateFrom - Fecha desde (ISO format)
 * @param {string} filters.dateTo - Fecha hasta (ISO format)
 * @param {number} filters.limit - Límite de resultados (default: 50)
 * @param {number} filters.offset - Offset para paginación (default: 0)
 * @returns {Promise<Object>} Objeto con transacciones, paginación y metadatos
 */
export const getTransactions = async (filters = {}) => {
  try {
    const {
      status = null,
      userId = null,
      dateFrom = null,
      dateTo = null,
      limit = 50,
      offset = 0
    } = filters;

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('get_admin_transactions', {
      p_status: status,
      p_user_id: userId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    return {
      success: true,
      data: data || {
        transactions: [],
        pagination: {
          total: 0,
          limit: limit,
          offset: offset,
          has_more: false
        },
        filters_applied: filters,
        total_transactions: 0
      }
    };
  } catch (error) {
    console.error('Error in getTransactions:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener transacciones'
    };
  }
};

/**
 * Obtiene una transacción específica por ID
 * @param {string} transactionId - UUID de la transacción
 * @returns {Promise<Object>} Objeto con los datos de la transacción
 */
export const getTransactionById = async (transactionId) => {
  try {
    if (!transactionId) {
      throw new Error('ID de transacción requerido');
    }

    // Consultar directamente la vista usando el ID
    const { data, error } = await supabase
      .from('admin_transactions_view')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (error) {
      console.error('Error fetching transaction by ID:', error);
      throw error;
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error in getTransactionById:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener la transacción'
    };
  }
};

/**
 * Obtiene estadísticas de transacciones por período
 * @param {string} period - Período a consultar ('today', 'week', 'month', 'all')
 * @returns {Promise<Object>} Objeto con estadísticas completas
 */
export const getStats = async (period = 'today') => {
  try {
    // Validar período
    const validPeriods = ['today', 'week', 'month', 'all'];
    if (!validPeriods.includes(period)) {
      throw new Error(`Período inválido. Use: ${validPeriods.join(', ')}`);
    }

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('get_transaction_stats', {
      p_period: period
    });

    if (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }

    return {
      success: true,
      data: data || {}
    };
  } catch (error) {
    console.error('Error in getStats:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener estadísticas'
    };
  }
};

/**
 * Aprueba una compra pendiente manualmente
 * @param {string} purchaseId - UUID de la compra
 * @returns {Promise<Object>} Resultado de la operación
 */
export const approveTransaction = async (purchaseId) => {
  try {
    if (!purchaseId) {
      throw new Error('ID de compra requerido');
    }

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('admin_approve_purchase', {
      p_purchase_id: purchaseId
    });

    if (error) {
      console.error('Error approving transaction:', error);
      throw error;
    }

    // Verificar si la función retornó un error
    if (data && !data.success) {
      throw new Error(data.error || 'Error al aprobar la compra');
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error in approveTransaction:', error);
    return {
      success: false,
      error: error.message || 'Error al aprobar la transacción'
    };
  }
};

/**
 * Rechaza una compra con una razón específica
 * @param {string} purchaseId - UUID de la compra
 * @param {string} reason - Razón del rechazo
 * @returns {Promise<Object>} Resultado de la operación
 */
export const rejectTransaction = async (purchaseId, reason) => {
  try {
    if (!purchaseId) {
      throw new Error('ID de compra requerido');
    }

    if (!reason || reason.trim() === '') {
      throw new Error('Debe proporcionar una razón para rechazar la compra');
    }

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('admin_reject_purchase', {
      p_purchase_id: purchaseId,
      p_reason: reason
    });

    if (error) {
      console.error('Error rejecting transaction:', error);
      throw error;
    }

    // Verificar si la función retornó un error
    if (data && !data.success) {
      throw new Error(data.error || 'Error al rechazar la compra');
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error in rejectTransaction:', error);
    return {
      success: false,
      error: error.message || 'Error al rechazar la transacción'
    };
  }
};

/**
 * Procesa un reembolso de una compra completada
 * @param {string} purchaseId - UUID de la compra
 * @param {string} reason - Razón del reembolso
 * @returns {Promise<Object>} Resultado de la operación
 */
export const refundTransaction = async (purchaseId, reason) => {
  try {
    if (!purchaseId) {
      throw new Error('ID de compra requerido');
    }

    if (!reason || reason.trim() === '') {
      throw new Error('Debe proporcionar una razón para el reembolso');
    }

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('admin_refund_purchase', {
      p_purchase_id: purchaseId,
      p_reason: reason
    });

    if (error) {
      console.error('Error refunding transaction:', error);
      throw error;
    }

    // Verificar si la función retornó un error
    if (data && !data.success) {
      throw new Error(data.error || 'Error al procesar el reembolso');
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error in refundTransaction:', error);
    return {
      success: false,
      error: error.message || 'Error al procesar el reembolso'
    };
  }
};

/**
 * Obtiene transacciones recientes (últimas 10)
 * @returns {Promise<Object>} Array con las transacciones recientes
 */
export const getRecentTransactions = async () => {
  try {
    const { data, error } = await supabase
      .from('admin_transactions_view')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent transactions:', error);
      throw error;
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('Error in getRecentTransactions:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener transacciones recientes'
    };
  }
};

/**
 * Exporta transacciones a CSV (prepara los datos)
 * @param {Object} filters - Mismos filtros que getTransactions
 * @returns {Promise<Object>} Datos preparados para exportar
 */
export const exportTransactionsCSV = async (filters = {}) => {
  try {
    // Obtener todas las transacciones con los filtros (sin límite)
    const result = await getTransactions({
      ...filters,
      limit: 10000, // Límite alto para exportación
      offset: 0
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const transactions = result.data.transactions || [];

    // Preparar datos para CSV
    const csvData = transactions.map(t => ({
      'ID Transacción': t.transaction_id,
      'Usuario': t.user_email,
      'Paquete': t.package_name,
      'Puntos': t.points_amount,
      'Precio': t.final_price,
      'Descuento %': t.discount_percentage,
      'Gateway': t.gateway_used,
      'Método de Pago': t.payment_method || 'N/A',
      'Estado': t.status_label,
      'Payment ID': t.payment_id || 'N/A',
      'Fecha': new Date(t.created_at).toLocaleString('es-CO'),
      'Completado': t.completed_at ? new Date(t.completed_at).toLocaleString('es-CO') : 'N/A'
    }));

    return {
      success: true,
      data: csvData,
      count: csvData.length
    };
  } catch (error) {
    console.error('Error in exportTransactionsCSV:', error);
    return {
      success: false,
      error: error.message || 'Error al exportar transacciones'
    };
  }
};

// Objeto con todas las funciones exportadas
const transactionsService = {
  getTransactions,
  getTransactionById,
  getStats,
  approveTransaction,
  rejectTransaction,
  refundTransaction,
  getRecentTransactions,
  exportTransactionsCSV
};

export default transactionsService;
