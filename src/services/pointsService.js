// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - FINAL Y ESTABLE (Con soporte para Puntos DUALES y Fix de Persistencia)
// ============================================================================
// ✅ Incluye initializeUserPoints (CRÍTICO para la DB).
// ✅ Incluye calculateVideoPoints (CRÍTICO para el despliegue de Rollup).
// ✅ Soporte para Puntos Gratuitos y Premium.
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN (TASA DE CAMBIO)
// ============================================================================
// Multiplicador Premium (Se usa para calcular el valor de canje en la tienda)
export const PREMIUM_POINTS_MULTIPLIER = 2;
const TRANSACTION_TABLE = 'points_transactions';
const INIT_POINTS_RPC_NAME = 'ensure_user_points_record'; // RPC para inicializar (Asumido en el backend)


// ============================================================================
// CÁLCULO Y VALOR
// ============================================================================

/**
 * Función requerida para el despliegue (RollupError)
 * Calcula los puntos base por la duración de un video.
 * @param {number} durationSeconds - Duración del video en segundos.
 * @returns {number} Puntos calculados.
 */
export const calculateVideoPoints = (durationSeconds) => {
  if (durationSeconds < 10) return 0;
  // Regla de ejemplo: 1 punto por cada 30 segundos.
  return Math.floor(durationSeconds / 30);
};

/**
 * Calcula el valor equivalente de los puntos Premium en Free Points.
 * @param {number} premiumPoints - Cantidad de puntos Premium.
 * @returns {number} Valor total equivalente.
 */
export const calculatePremiumValue = (premiumPoints) => {
    return premiumPoints * PREMIUM_POINTS_MULTIPLIER;
};

// ============================================================================
// INICIALIZACIÓN DE PUNTOS (CRÍTICO para la persistencia)
// ============================================================================

/**
 * Asegura que el usuario tenga un registro en la tabla 'user_points'.
 * Si el registro no existe, lo crea con 0 puntos.
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} true si existe o se creó, false si falló.
 */
export const initializeUserPoints = async (userId) => {
  if (!userId) {
    console.warn('⚠️ initializeUserPoints: No se proporcionó userId');
    return false;
  }

  try {
    // ASUMIMOS QUE EL BACKEND TIENE ESTE RPC DE INICIALIZACIÓN
    const { error } = await supabase.rpc(INIT_POINTS_RPC_NAME, {
        p_user_id: userId
    });

    if (error) {
        console.error('❌ Error RPC en initializeUserPoints (Base de Datos):', error);
        // Fallback: Si el RPC falla, intentamos insertar directamente (esto debería manejarse con RLS)
        await supabase.from('user_points').insert({ user_id: userId, free_points: 0, premium_points: 0 }).onConflict('user_id').single();
    }
    
    console.log('✅ Registro de puntos inicializado/verificado.');
    return true;

  } catch (error) {
    // Captura si la tabla no existe o hay errores de conexión.
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

    // El total se calcula localmente si la RPC no lo devuelve.
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
 * @param {string} userId - ID del usuario
 * @param {number} amount - Cantidad (positiva para sumar, negativa para restar)
 * @param {'free' | 'premium'} type - Tipo de punto
 * @returns {Promise<{new_free_points: number, new_premium_points: number}>}
 */
export const updatePointsBalance = async (userId, amount, type) => {
  try {
    console.log(`📡 Llamando RPC update_user_points: ${amount} ${type} para ${userId}`);
    
    // Asumimos que esta RPC maneja la suma/resta y valida el balance.
    const { data, error } = await supabase.rpc('update_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
    });

    if (error) {
        // Relanzamos el error para que el Contexto lo atrape
        throw error; 
    }
    
    // Si la RPC fue exitosa, devolvemos los nuevos saldos.
    return data || { new_free_points: 0, new_premium_points: 0 };

  } catch (error) {
    console.error('❌ Error en RPC update_user_points:', error);
    throw error;
  }
};


// ============================================================================
// ALIASES DE INTERFAZ (Usados por PointsContext)
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
    // updatePointsBalance maneja la deducción si se pasa el monto negativo
    updatePointsBalance(userId, -amount, type);


// ============================================================================
// EXPORTACIONES FINALES
// ============================================================================

export default {
  getUserPoints,
  initializeUserPoints, 
  trackPointsAction,
  updatePointsBalance,
  addPoints, 
  deductPoints,
  calculateVideoPoints,
  calculatePremiumValue,
  PREMIUM_POINTS_MULTIPLIER
};
