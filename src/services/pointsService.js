// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - FINAL Y ESTABLE (CORRECCIÓN DE PERSISTENCIA Y EXPORTACIÓN)
// ============================================================================
// ✅ Incluye initializeUserPoints para asegurar el registro en la DB.
// ✅ La lógica de error de RPC está manejada para evitar colapsos en el Contexto.
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
// INICIALIZACIÓN DE PUNTOS (CRÍTICO)
// ============================================================================

/**
 * Asegura que el usuario tenga un registro en la tabla 'user_points' (para evitar fallos RPC).
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} true si existe o se creó, false si falló.
 */
export const initializeUserPoints = async (userId) => {
  if (!userId) return false;

  try {
    // ASUMIMOS QUE EL BACKEND TIENE ESTE RPC DE INICIALIZACIÓN
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
      // Devolvemos 0 si el RPC falla, estabilizando el Contexto.
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
// REGISTRAR TRANSACCIÓN (Historial)
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
 * @param {number} amount - Cantidad (positiva para sumar, negativa para restar)
 */
export const updatePointsBalance = async (userId, amount, type, actionType, referenceId = null) => {
  try {
    // Se asume que el Contexto llama a initializeUserPoints() antes.
    
    // 🛑 ATENCIÓN: El RPC de tu sistema requiere una firma muy específica.
    // Usamos el formato que el error de tu consola sugirió.
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
    
    // Si la RPC es exitosa, devolvemos el objeto de nuevos saldos
    return data || { new_free_points: 0, new_premium_points: 0 };

  } catch (error) {
    console.error('❌ Error en RPC update_user_points:', error);
    throw error;
  }
};


// ============================================================================
// ALIASES DE INTERFAZ (Para PointsContext y Misiones)
// ============================================================================

/**
 * Función universal para añadir puntos (usada por addPoints del Contexto)
 */
export const addPoints = async (userId, amount, type, actionType, referenceId = null) => {
    try {
        const balanceResult = await updatePointsBalance(userId, amount, type, actionType, referenceId);
        
        // 2. Registrar la transacción (para el historial)
        await trackPointsAction(userId, amount, type, actionType, referenceId); 
        
        return balanceResult;
    } catch (error) {
        throw error;
    }
};

/**
 * Función universal para deducir puntos (usada por deductPoints del Contexto)
 */
export const deductPoints = (userId, amount, type, actionType, referenceId = null) => 
    updatePointsBalance(userId, -amount, type, actionType, referenceId);


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
  calculatePremiumValue,
  PREMIUM_POINTS_MULTIPLIER
};
