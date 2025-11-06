// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - FINAL Y ESTABLE (FIX DE ERRORES DE LECTURA Y ESCRITURA)
// ============================================================================
// ✅ Se estabiliza la lectura (getUserPoints) para evitar que el Header se quede en 'Cargando'.
// ✅ Se manejan los errores de RPC (update_user_points) de forma segura.
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================
export const PREMIUM_POINTS_MULTIPLIER = 2;
const TRANSACTION_TABLE = 'points_transactions';
const INIT_POINTS_RPC_NAME = 'ensure_user_points_record'; 


// ============================================================================
// CÁLCULO Y VALOR
// ============================================================================

export const calculateVideoPoints = (durationSeconds) => {
  if (durationSeconds < 10) return 0;
  return Math.floor(durationSeconds / 30);
};

export const calculatePremiumValue = (premiumPoints) => {
    return premiumPoints * PREMIUM_POINTS_MULTIPLIER;
};

// ============================================================================
// INICIALIZACIÓN DE PUNTOS (para asegurar el registro en la DB)
// ============================================================================

export const initializeUserPoints = async (userId) => {
  if (!userId) return false;

  try {
    const { error } = await supabase.rpc(INIT_POINTS_RPC_NAME, {
        p_user_id: userId
    });

    if (error) {
        console.error('❌ Error RPC en initializeUserPoints:', error);
        // Fallback: Intentamos insertar directamente
        await supabase.from('user_points').insert({ user_id: userId, free_points: 0, premium_points: 0 }).onConflict('user_id').single();
    }
    
    return true;

  } catch (error) {
    console.error('❌ Excepción al inicializar puntos:', error);
    return false;
  }
};


// ============================================================================
// OBTENER PUNTOS DEL USUARIO (RPC)
// ============================================================================

/**
 * Obtiene el balance completo de puntos de un usuario
 * 🛑 CRÍTICO: Devuelve 0 en caso de fallo para evitar que el Contexto se quede en 'Loading'.
 */
export const getUserPoints = async (userId) => {
  try {
    if (!userId) return { free: 0, premium: 0, total: 0 };

    const { data, error } = await supabase.rpc('get_user_points', {
      p_user_id: userId
    });

    if (error) {
      // 🛑 ERROR MANEJADO: Si la RPC falla, no lanzamos una excepción, solo loggeamos
      console.error('❌ Error en RPC get_user_points:', error);
      // y retornamos 0, permitiendo que el Contexto complete su carga.
      return { free: 0, premium: 0, total: 0 };
    }

    const total = (data?.free_points || 0) + (data?.premium_points || 0);

    return {
      free: data?.free_points || 0,
      premium: data?.premium_points || 0,
      total: data?.total_points || total
    };

  } catch (error) {
    // Captura errores de red o excepciones JS
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
 * 🛑 CRÍTICO: Esta función debe relanzar el error para que el Contexto sepa que la operación falló.
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
        // 🛑 LANZAMOS EL ERROR ORIGINAL: El error que estabas viendo ("undefined") ocurre si el
        // error de Supabase no es capturado aquí o si el RPC devuelve un JSON corrupto.
        throw error; 
    }
    
    return data || { new_free_points: 0, new_premium_points: 0 };

  } catch (error) {
    // Si la RPC lanza una excepción, la relanzamos al Contexto
    console.error('❌ Error en RPC update_user_points:', error);
    throw error;
  }
};

// ============================================================================
// ALIASES DE INTERFAZ
// ============================================================================

export const addPoints = async (userId, amount, type, actionType, referenceId = null) => {
    try {
        const balanceResult = await updatePointsBalance(userId, amount, type);
        await trackPointsAction(userId, amount, type, actionType, referenceId); 
        return balanceResult;
    } catch (error) {
        // Relanzamos la excepción con un mensaje útil si es posible
        throw new Error(`Fallo al añadir puntos: ${error.message || 'Error desconocido del servidor'}`);
    }
};

export const deductPoints = (userId, amount, type) => 
    updatePointsBalance(userId, -amount, type);


// 🛑 EXPORTACIÓN NOMBRADA para MissionsService.js y video-upload-studio/index.jsx
export const addFreePoints = async (userId, amount, actionType, referenceId = null) => {
    // Usamos 'addPoints' para la lógica interna
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
