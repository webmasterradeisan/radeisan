// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - FINAL Y ESTABLE (FIX DE ROLLUP Y PERSISTENCIA)
// ============================================================================
// ✅ Se añade calculateVideoPoints como exportación nombrada para FIX el error de Vercel.
// ✅ CORREGIDO: 'amount' -> 'points_change' y eliminada llamada redundante en 'addPoints'.
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

/**
 * Función requerida para el despliegue (RollupError)
 * Calcula los puntos base por la duración de un video.
 */
export const calculateVideoPoints = (durationSeconds) => {
  if (durationSeconds < 10) return 0;
  // Lógica simple: 1 punto por cada 30 segundos.
  return Math.floor(durationSeconds / 30);
};

/**
 * Calcula el valor equivalente de los puntos Premium en Free Points.
 */
export const calculatePremiumValue = (premiumPoints) => {
    return premiumPoints * PREMIUM_POINTS_MULTIPLIER;
};

// ============================================================================
// INICIALIZACIÓN DE PUNTOS (CRÍTICO para la persistencia)
// ============================================================================

/**
 * Asegura que el usuario tenga un registro en la tabla 'user_points'.
 */
export const initializeUserPoints = async (userId) => {
  if (!userId) return false;

  try {
    const { error } = await supabase.rpc(INIT_POINTS_RPC_NAME, {
        p_user_id: userId
    });

    if (error) {
        console.error('❌ Error RPC en initializeUserPoints:', error);
        // Fallback: Intentamos insertar directamente si el RPC falla por 'no row'
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
      // 🛑 Devolvemos 0 si el RPC falla (necesario para la estabilidad del Contexto)
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
        // ✅ CORRECCIÓN: La columna en la DB se llama 'points_change', no 'amount'.
        points_change: amount, 
        point_type: pointType,
        action_type: actionType,
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
    console.log(`📡 Llamando RPC ${UPDATE_POINTS_RPC_NAME}: ${amount} ${type} para ${userId}`);
    
    const { data, error } = await supabase.rpc(UPDATE_POINTS_RPC_NAME, {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_action: actionType,
      p_reference_id: referenceId,
    });

    if (error) {
        throw error; 
    }
    
    return data || { new_free_points: 0, new_premium_points: 0 };

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
        
        // 🛑 CORRECCIÓN: Llamada redundante. El RPC 'updatePointsBalance' (que llama a 'update_user_points')
        // ya se encarga de insertar la transacción en la DB. Esta línea causaba el error 400.
        // await trackPointsAction(userId, amount, type, actionType, referenceId); 
        
        return balanceResult;
    } catch (error) {
        throw error;
    }
};

export const deductPoints = (userId, amount, type, actionType, referenceId = null) => 
    updatePointsBalance(userId, -amount, type, actionType, referenceId);


// 🛑 EXPORTACIÓN NOMBRADA NECESARIA para Misiones y Upload Studio
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
