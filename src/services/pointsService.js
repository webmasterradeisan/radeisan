// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - FINAL Y CORREGIDO
// ============================================================================
// ✅ ESTE ES EL CÓDIGO FINAL:
//    - Llama al RPC con 'p_transaction_type' para coincidir con la DB.
//    - Llama al RPC con 'p_free_points_change' y 'p_premium_points_change'.
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
// REGISTRAR TRANSACCIÓN (Para Historial) - (Esta función ya no se usa por el RPC)
// ============================================================================

export const trackPointsAction = async (userId, amount, pointType, actionType, referenceId) => {
  try {
    const { error } = await supabase
      .from(TRANSACTION_TABLE)
      .insert({
        user_id: userId,
        points_change: amount, 
        point_type: pointType,
        transaction_type: actionType, // Corregido por si se usa
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

    // ✅ ESTA ES LA PARTE IMPORTANTE
    // El objeto de parámetros ahora coincide 100% con el SQL
    const rpcParams = {
      p_user_id: userId,
      p_free_points_change: free_change,
      p_premium_points_change: premium_change,
      p_transaction_type: actionType, // <-- Nombre corregido
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
  PREMIUM_POINTS_MULTIPLIER
};
