// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - Corregido para Montos Explícitos
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA: Se define grantFreePoints (que acepta AMOUNT) y se exporta 
//    como addFreePoints para compatibilidad con MissionsService y Context.
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// OBTENER PUNTOS DEL USUARIO
// ============================================================================

/**
 * Obtiene el balance completo de puntos de un usuario
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

    const { data, error } = await supabase.rpc('get_user_points', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error en RPC get_user_points:', error);
      throw error;
    }

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
// OTORGAR PUNTOS GRATIS (MONTO EXPLÍCITO - PARA MISIONES/CONTEXT)
// ============================================================================

/**
 * Agrega una cantidad explícita de puntos gratis al usuario (para misiones, recompensas, etc.).
 * @param {string} userId - ID del usuario
 * @param {number} amount - Cantidad de puntos a otorgar
 * @param {string} reason - Razón del otorgamiento
 * @param {string} actionType - Tipo de acción para la transacción ('mission_reward', 'view_video', etc.)
 * @returns {Promise<{success: boolean, points_added: number, new_balance: object}>}
 */
export const grantFreePoints = async (userId, amount, reason, actionType) => {
    try {
        if (!userId) {
            throw new Error('Usuario no autenticado');
        }

        if (!amount || amount <= 0) {
            throw new Error('Cantidad de puntos inválida');
        }

        console.log('🎁 Otorgando puntos gratis explícitos:', { userId, amount, reason, actionType });

        // ✅ ASUMIMOS que existe una RPC en la DB que permite otorgar una cantidad explícita
        // Reemplaza la RPC original 'add_free_points' que solo usaba actionType.
        const { data, error } = await supabase.rpc('grant_free_points', {
            p_user_id: userId,
            p_points: amount,
            p_reason: reason,
            p_action_type: actionType,
        });

        if (error) {
            console.error('❌ Error en RPC grant_free_points:', error);
            throw error;
        }

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
        console.error('❌ Error en grantFreePoints:', error);
        throw error;
    }
};

// ============================================================================
// TRACKING PUNTOS POR ACCIÓN (MONTO FIJO EN RPC)
// ============================================================================

/**
 * Agrega puntos gratis al usuario por realizar acciones (monto fijo definido en el RPC).
 * RENOMBRADO: Usado para acciones de puntos fijos (e.g., ver 30s) donde el monto lo define el servidor.
 * @param {string} userId - ID del usuario
 * @param {string} actionType - Tipo de acción ('watch_video', 'like', 'comment', etc.)
 * @returns {Promise<Object>}
 */
export const trackFreePointsAction = async (userId, actionType) => {
  try {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    console.log('🎁 Agregando puntos gratis (fijo RPC):', { userId, actionType });

    // La RPC original 'add_free_points' se mantiene para acciones de monto fijo
    const { data, error } = await supabase.rpc('add_free_points', {
      p_user_id: userId,
      p_action_type: actionType
    });

    if (error) {
      console.error('❌ Error en RPC add_free_points:', error);
      throw error;
    }

    console.log('✅ Puntos fijos agregados:', data);

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
    console.error('❌ Error en trackFreePointsAction:', error);
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
 * @returns {Promise<Object>}
 */
export const addPremiumPoints = async (userId, amount) => {
  // ... (cuerpo sin cambios)
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
 * @param {string} userId - ID del usuario
 * @param {number} amount - Cantidad de puntos a deducir
 * @param {string} reason - Razón de la deducción
 * @returns {Promise<Object>}
 */
export const deductPoints = async (userId, amount, reason = 'Canje de recompensa') => {
  // ... (cuerpo sin cambios)
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

// ... (calculateVideoPoints y hasEarnedPoints sin cambios)

// ============================================================================
// EXPORTACIONES FINALES
// ============================================================================
// ✅ La función que acepta el monto explícito se exporta como 'addFreePoints'
//    para no romper las llamadas del Context y del MissionsService.
export const addFreePoints = grantFreePoints;

export default {
  getUserPoints,
  addFreePoints, // Exporta grantFreePoints
  trackFreePointsAction, // El original (para tracking de acciones fijas)
  addPremiumPoints,
  deductPoints,
  calculateVideoPoints,
  hasEarnedPoints
};
