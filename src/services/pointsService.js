// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - Interacción con Supabase (ACTUALIZADO)
// ============================================================================
// CAMBIOS:
// - getUserPoints() ahora usa RPC en lugar de consulta directa
// - Evita problemas de recursión infinita en políticas RLS
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// OBTENER PUNTOS DEL USUARIO (ACTUALIZADO - USA RPC)
// ============================================================================

/**
 * Obtiene el balance completo de puntos de un usuario
 * ACTUALIZADO: Usa función RPC para evitar problemas de RLS
 * @param {string} userId - ID del usuario
 * @returns {Promise<{free: number, premium: number, total: number}>}
 */
export const getUserPoints = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ getUserPoints: No se proporcionó userId');
      return { free: 0, premium: 0, total: 0 };
    }

    console.log('📊 Consultando puntos para usuario:', userId);

    // ✅ USAR FUNCIÓN RPC EN LUGAR DE CONSULTA DIRECTA
    const { data, error } = await supabase.rpc('get_user_points', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error en RPC get_user_points:', error);
      throw error;
    }

    // La función RPC retorna un objeto JSON con la estructura:
    // { free_points: number, premium_points: number, total_points: number }
    const points = {
      free: data?.free_points || 0,
      premium: data?.premium_points || 0,
      total: data?.total_points || 0
    };

    console.log('✅ Puntos obtenidos:', points);
    return points;

  } catch (error) {
    console.error('❌ Error en getUserPoints:', error);
    return { free: 0, premium: 0, total: 0 };
  }
};

// ============================================================================
// AGREGAR PUNTOS GRATIS
// ============================================================================

/**
 * Agrega puntos gratis al usuario por realizar acciones
 * @param {string} userId - ID del usuario
 * @param {string} actionType - Tipo de acción ('watch_video', 'like', 'comment', etc.)
 * @returns {Promise<{success: boolean, points_added: number, new_balance: object}>}
 */
export const addFreePoints = async (userId, actionType) => {
  try {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    console.log('🎁 Agregando puntos gratis:', { userId, actionType });

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('add_free_points', {
      p_user_id: userId,
      p_action_type: actionType
    });

    if (error) {
      console.error('❌ Error en RPC add_free_points:', error);
      throw error;
    }

    console.log('✅ Puntos gratis agregados:', data);

    return {
      success: true,
      points_added: data?.points_added || 0,
      new_balance: {
        free: data?.new_free_balance || 0,
        premium: data?.new_premium_balance || 0,
        total: (data?.new_free_balance || 0) + (data?.new_premium_balance || 0)
      }
    };

  } catch (error) {
    console.error('❌ Error en addFreePoints:', error);
    throw error;
  }
};

// ============================================================================
// AGREGAR PUNTOS PREMIUM
// ============================================================================

/**
 * Agrega puntos premium al usuario (comprados)
 * @param {string} userId - ID del usuario
 * @param {number} amount - Cantidad de puntos a agregar
 * @returns {Promise<{success: boolean, points_added: number, new_balance: object}>}
 */
export const addPremiumPoints = async (userId, amount) => {
  try {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    if (!amount || amount <= 0) {
      throw new Error('Cantidad de puntos inválida');
    }

    console.log('💎 Agregando puntos premium:', { userId, amount });

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('add_premium_points', {
      p_user_id: userId,
      p_points: amount
    });

    if (error) {
      console.error('❌ Error en RPC add_premium_points:', error);
      throw error;
    }

    console.log('✅ Puntos premium agregados:', data);

    return {
      success: true,
      points_added: amount,
      new_balance: {
        free: data?.new_free_balance || 0,
        premium: data?.new_premium_balance || 0,
        total: (data?.new_free_balance || 0) + (data?.new_premium_balance || 0)
      }
    };

  } catch (error) {
    console.error('❌ Error en addPremiumPoints:', error);
    throw error;
  }
};

// ============================================================================
// DEDUCIR PUNTOS
// ============================================================================

/**
 * Deduce puntos del usuario (por canje de recompensas)
 * Primero deduce de premium, luego de free
 * @param {string} userId - ID del usuario
 * @param {number} amount - Cantidad de puntos a deducir
 * @param {string} reason - Razón de la deducción
 * @returns {Promise<{success: boolean, points_deducted: number, new_balance: object}>}
 */
export const deductPoints = async (userId, amount, reason = 'Canje de recompensa') => {
  try {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    if (!amount || amount <= 0) {
      throw new Error('Cantidad de puntos inválida');
    }

    console.log('💸 Deduciendo puntos:', { userId, amount, reason });

    // Obtener balance actual
    const currentBalance = await getUserPoints(userId);

    if (currentBalance.total < amount) {
      throw new Error('Puntos insuficientes');
    }

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('deduct_points', {
      p_user_id: userId,
      p_points: amount,
      p_reason: reason
    });

    if (error) {
      console.error('❌ Error en RPC deduct_points:', error);
      throw error;
    }

    console.log('✅ Puntos deducidos:', data);

    return {
      success: true,
      points_deducted: amount,
      new_balance: {
        free: data?.new_free_balance || 0,
        premium: data?.new_premium_balance || 0,
        total: (data?.new_free_balance || 0) + (data?.new_premium_balance || 0)
      }
    };

  } catch (error) {
    console.error('❌ Error en deductPoints:', error);
    throw error;
  }
};

// ============================================================================
// CALCULAR PUNTOS POR DURACIÓN DE VIDEO (OPCIONAL)
// ============================================================================

/**
 * Calcula cuántos puntos debería ganar un usuario por ver un video
 * según su duración
 * @param {number} durationInSeconds - Duración del video en segundos
 * @returns {number} Puntos a otorgar
 */
export const calculateVideoPoints = (durationInSeconds) => {
  if (durationInSeconds < 30) return 1;
  if (durationInSeconds < 60) return 3;
  if (durationInSeconds < 180) return 5;
  if (durationInSeconds < 300) return 8;
  return 10;
};

// ============================================================================
// VERIFICAR SI USUARIO YA GANÓ PUNTOS POR ACCIÓN
// ============================================================================

/**
 * Verifica si el usuario ya ganó puntos por una acción específica
 * (para evitar duplicados)
 * @param {string} userId - ID del usuario
 * @param {string} actionType - Tipo de acción
 * @param {string} referenceId - ID de referencia (video_id, comment_id, etc.)
 * @returns {Promise<boolean>} true si ya ganó puntos, false si no
 */
export const hasEarnedPoints = async (userId, actionType, referenceId) => {
  try {
    if (!userId || !actionType || !referenceId) {
      return false;
    }

    const { data, error } = await supabase
      .from('points_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .eq('reference_id', referenceId)
      .limit(1);

    if (error) {
      console.error('❌ Error verificando puntos ganados:', error);
      return false;
    }

    return data && data.length > 0;

  } catch (error) {
    console.error('❌ Error en hasEarnedPoints:', error);
    return false;
  }
};

// ============================================================================
// EXPORTACIONES
// ============================================================================

export default {
  getUserPoints,
  addFreePoints,
  addPremiumPoints,
  deductPoints,
  calculateVideoPoints,
  hasEarnedPoints
};
