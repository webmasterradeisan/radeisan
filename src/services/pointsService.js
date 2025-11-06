// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - FINAL Y ESTABLE (FIX DE ROLLUP Y PERSISTENCIA)
// ============================================================================
// ✅ Incluye initializeUserPoints (CRÍTICO para la DB).
// ✅ Soluciona RollupError: Exporta addFreePoints y calculateVideoPoints.
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN (TASA DE CAMBIO)
// ============================================================================
// Multiplicador Premium (Asumido para el cálculo de valor)
export const PREMIUM_POINTS_MULTIPLIER = 2;
const TRANSACTION_TABLE = 'points_transactions';
const INIT_POINTS_RPC_NAME = 'ensure_user_points_record'; 


// ============================================================================
// CÁLCULO Y VALOR
// ============================================================================

/**
 * Función requerida para el despliegue (RollupError)
 * Calcula los puntos base por la duración de un video.
 */
export const calculateVideoPoints = (durationSeconds) => {
  if (durationSeconds < 10) return 0;
  // Regla de ejemplo: 1 punto por cada 30 segundos.
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
 * @param {string} userId - ID del usuario
 */
export const initializeUserPoints = async (userId) => {
  if (!userId) return false;

  try {
    // ASUMIMOS QUE EL BACKEND TIENE ESTE RPC DE INICIALIZACIÓN
    const { error } = await supabase.rpc(INIT_POINTS_RPC_NAME, {
        p_user_id: userId
    });

    if (error) {
        console.error('❌ Error RPC en initializeUserPoints (Base de Datos):', error);
        // Fallback: Intentamos insertar directamente si el RPC falla (ej. tabla no existe)
        await supabase.from('user_points').insert({ user_id: userId, free_points: 0, premium_points: 0 }).onConflict('user_id').single();
    }
    
    console.log('✅ Registro de puntos inicializado/verificado.');
    return true;

  } catch (error) {
    console.error('❌ Excepción al inicializar puntos:', error);
    return false;
  }
};


// ============================================================================
// OBTENER PUNTOS DEL USUARIO (USA RPC)
// ============================================================================

/**
 * Obtiene el balance completo de puntos de un usuario
 */
export const getUserPoints = async (userId) => {
  try {
    if (!userId) return { free: 0, premium: 0, total: 0 };

    const { data, error } = await supabase.rpc('get_user_points', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error en RPC get_user_points:', error);
      throw error;
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

/**
 * Registra una transacción de puntos (usado después de updatePointsBalance)
 */
export const trackPointsAction = async (userId, amount, pointType, actionType, referenceId) => {
  try {
    const { error } = await supabase
      .from(TRANSACTION_TABLE)
      .insert({
        user_id: userId,
        amount: amount,
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

/**
 * Función genérica para otorgar o deducir puntos
 */
export const updatePointsBalance = async (userId, amount, type) => {
  try {
    console.log(`📡 Llamando RPC update_user_points: ${amount} ${type} para ${userId}`);
    
    const { data, error } = await supabase.rpc('update_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
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
// ALIASES DE INTERFAZ (Usados por Contexto y otros servicios)
// ============================================================================

/**
 * Función universal para añadir puntos (usada por addPoints del Contexto)
 */
export const addPoints = async (userId, amount, type, actionType, referenceId = null) => {
    // 1. Actualizar el balance (sumar puntos)
    const balanceResult = await updatePointsBalance(userId, amount, type);
    
    // 2. Registrar la transacción (para el historial)
    await trackPointsAction(userId, amount, type, actionType, referenceId); 
    
    return balanceResult;
};

/**
 * Función universal para deducir puntos (usada por deductPoints del Contexto)
 */
export const deductPoints = (userId, amount, type) => 
    updatePointsBalance(userId, -amount, type);


// 🛑 EXPORTACIÓN NOMBRADA para MissionsService.js y video-upload-studio/index.jsx
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
  PREMIUM_POINTS_MULTIPLIER,
  // NO exportamos addFreePoints aquí para evitar conflictos de exportación.
};
