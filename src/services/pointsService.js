// src/services/pointsService.js
// ============================================================================
// ✅ FIX 8: 'getUserPointsHistory' ahora acepta rangos de fecha
//    y paginación (limit/offset) para los nuevos filtros.
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================
export const PREMIUM_POINTS_MULTIPLIER = 2;
const TRANSACTION_TABLE = 'points_transactions';
const INIT_POINTS_RPC_NAME = 'ensure_user_points_record'; 
const UPDATE_POINTS_RPC_NAME = 'update_user_points';


// ============================================================================
// CÁLCULO Y VALOR (EXPORTACIONES NOMBRADAS)
// ============================================================================

export const calculateVideoPoints = (durationSeconds) => {
  if (durationSeconds < 10) return 0;
  return Math.floor(durationSeconds / 30);
};

export const calculatePremiumValue = (premiumPoints) => {
    return premiumPoints * PREMIUM_POINTS_MULTIPLIER;
};

// ============================================================================
// INICIALIZACIÓN DE PUNTOS
// ============================================================================

export const initializeUserPoints = async (userId) => {
  if (!userId) return false;
  try {
    const { error } = await supabase.rpc(INIT_POINTS_RPC_NAME, {
        p_user_id: userId
    });
    if (error) {
        console.error('❌ Error RPC en initializeUserPoints:', error);
        await supabase.from('user_points').insert({ user_id: userId, free_points: 0, premium_points: 0 }).onConflict('user_id').single();
    }
    return true;
  } catch (error) {
    console.error('❌ Excepción al inicializar puntos:', error);
    return false;
  }
};


// ============================================================================
// OBTENER PUNTOS DEL USUARIO (LECTURA)
// ============================================================================

export const getUserPoints = async (userId) => {
  try {
    if (!userId) return { free: 0, premium: 0, total: 0 };
    const { data, error } = await supabase.rpc('get_user_points', {
      p_user_id: userId
    });
    if (error) {
      console.error('❌ Error en RPC get_user_points:', error);
      return { free: 0, premium: 0, total: 0 };
    }
    const total = (data?.free_points || 0) + (data?.premium_points || 0);
    return {
      free: data?.free_points || 0,
      premium: data?.premium_points || 0,
      total: data?.total_points || total
    };
  } catch (error) {
    console.error('❌ Error en getUserPoints (excepción):', error);
    return { free: 0, premium: 0, total: 0 };
  }
};


// ============================================================================
// REGISTRAR TRANSACCIÓN (Para Historial)
// ============================================================================

export const trackPointsAction = async (userId, amount, pointType, actionType, referenceId) => {
  try {
    const { error } = await supabase
      .from(TRANSACTION_TABLE)
      .insert({
        user_id: userId,
        points_change: amount, 
        point_type: pointType,
        transaction_type: actionType, 
        reference_id: referenceId,
      });
    if (error) {
      console.error(`❌ Error registrando acción ${actionType} de puntos:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Excepción al registrar acción de puntos:', error);
    return false;
  }
};

// ============================================================================
// SUMAR/RESTAR PUNTOS (FUNCIÓN CORE QUE LLAMA AL RPC)
// ============================================================================

export const updatePointsBalance = async (userId, amount, type, actionType, referenceId = null) => {
  try {
    console.log(`📡 Preparando RPC ${UPDATE_POINTS_RPC_NAME}: ${amount} ${type} para ${userId}`);

    let free_change = 0;
    let premium_change = 0;

    if (type === 'free') {
      free_change = amount;
    } else if (type === 'premium') {
      premium_change = amount;
    }

    const rpcParams = {
      p_user_id: userId,
      p_free_points_change: free_change,
      p_premium_points_change: premium_change,
      p_transaction_type: actionType,
      p_reference_id: referenceId
    };
    
    const { data, error } = await supabase.rpc(UPDATE_POINTS_RPC_NAME, rpcParams);

    if (error) {
        throw error; 
    }
    
    return data || { free_points: 0, premium_points: 0 }; 

  } catch (error) {
    console.error('❌ Error en RPC update_user_points:', error);
    throw error;
  }
};

// ============================================================================
// ALIASES DE INTERFAZ (Exportaciones de uso común)
// ============================================================================

export const addPoints = async (userId, amount, type, actionType, referenceId = null) => {
    try {
        const balanceResult = await updatePointsBalance(userId, amount, type, actionType, referenceId);
        return { 
            success: true, 
            newPoints: { 
                free: balanceResult.free_points, 
                premium: balanceResult.premium_points 
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const deductPoints = async (userId, amount, type, actionType, referenceId = null) => {
    try {
        const balanceResult = await updatePointsBalance(userId, -amount, type, actionType, referenceId);
        return { 
            success: true, 
            newPoints: { 
                free: balanceResult.free_points, 
                premium: balanceResult.premium_points 
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};


export const addFreePoints = async (userId, amount, actionType, referenceId = null) => {
    return addPoints(userId, amount, 'free', actionType, referenceId);
};

// ============================================================================
// HISTORIAL DE PUNTOS (CON FILTROS Y PAGINACIÓN)
// ============================================================================

const PAGE_SIZE = 10; // Cuántos items cargar por página

/**
 * Obtener el historial de puntos (transacciones) del usuario.
 * Acepta filtros de fecha y paginación.
 */
export const getUserPointsHistory = async (userId, options = {}) => {
  const { startDate, endDate, page = 1 } = options;
  
  if (!userId) {
    return { success: false, error: 'User ID is required', data: [], hasMore: false };
  }
  
  try {
    let query = supabase
      .from('points_transactions')
      .select('*', { count: 'exact' }) // Pedimos el conteo total
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Aplicar filtros de fecha si existen
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    // Aplicar paginación
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }
    
    // Calcular si hay más páginas
    const hasMore = (from + data.length) < count;
    
    return { success: true, data, hasMore, count };
    
  } catch (error) {
    console.error('Error fetching points history:', error);
    return { success: false, error: error.message, data: [], hasMore: false };
  }
};

// ============================================================================
// EXPORTACIONES POR DEFECTO
// ============================================================================

export default {
  getUserPoints,
  initializeUserPoints, 
  trackPointsAction,
  updatePointsBalance,
  calculateVideoPoints,
  addPoints, 
  deductPoints,
  calculatePremiumValue,
  PREMIUM_POINTS_MULTIPLIER,
  getUserPointsHistory // <-- Función actualizada
};
