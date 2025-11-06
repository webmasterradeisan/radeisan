// src/services/pointsService.js
// ============================================================================
// SERVICIO DE PUNTOS - FINAL Y ESTABLE (FIX DE INICIALIZACIÓN DE BASE DE DATOS Y ROLLUP)
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA: Se añade initializeUserPoints.
// ✅ CORRECCIÓN ROLLUP: Se añade calculateVideoPoints para satisfacer importación.
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// CÁLCULO DE PUNTOS POR VIDEO (FIX ROLLUP)
// ============================================================================

/**
 * Calcula los puntos base por la duración de un video.
 * NOTA: Esta función es necesaria para resolver el error de compilación.
 * @param {number} durationSeconds - Duración del video en segundos.
 * @returns {number} Puntos calculados.
 */
export const calculateVideoPoints = (durationSeconds) => {
  if (durationSeconds < 10) return 0;
  // Regla de ejemplo: 1 punto por cada 30 segundos.
  return Math.floor(durationSeconds / 30);
};


// ============================================================================
// INICIALIZACIÓN DE PUNTOS (CRÍTICO)
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
    // 1. Intentar leer el registro para verificar existencia
    const { data } = await supabase
      .from('user_points')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      return true;
    }

    // 2. Si no hay registro (data es null), intentar crearlo.
    console.log('✨ Inicializando registro de puntos para:', userId);
    const { error: insertError } = await supabase
      .from('user_points')
      .insert({
        user_id: userId,
        free_points: 0,
        premium_points: 0,
      })
      .onConflict('user_id') 
      .single();

    if (insertError) {
      console.error('❌ Error al insertar registro de puntos:', insertError);
      return false;
    }

    console.log('✅ Registro de puntos inicializado.');
    return true;

  } catch (error) {
    console.error('❌ Error en initializeUserPoints (excepción):', error);
    return false;
  }
};


// ============================================================================
// OBTENER PUNTOS DEL USUARIO (USA RPC)
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
// REGISTRAR PUNTOS POR ACCIÓN ESPECÍFICA (TRANSACCIÓN)
// ============================================================================

/**
 * Registra una transacción de puntos libres
 * @param {string} userId - ID del usuario
 * @param {number} amount - Cantidad de puntos a sumar
 * @param {string} actionType - Tipo de acción ('like', 'watch_video', etc.)
 * @param {string} referenceId - ID de la referencia (video_id, etc.)
 * @returns {Promise<boolean>}
 */
export const trackFreePointsAction = async (userId, amount, actionType, referenceId) => {
  try {
    const { error } = await supabase
      .from('points_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        point_type: 'free',
        action_type: actionType,
        reference_id: referenceId,
      });

    if (error) {
      console.error('❌ Error registrando acción de puntos:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Excepción al registrar acción de puntos:', error);
    return false;
  }
};

// ============================================================================
// SUMAR/RESTAR PUNTOS (USA RPC update_user_points)
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
    
    const { data, error } = await supabase.rpc('update_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
    });

    if (error) throw error;
    
    if (data && typeof data === 'object') {
        console.log('✅ Balance actualizado por RPC:', data);
        return data; 
    }
    
    return { new_free_points: 0, new_premium_points: 0 };

  } catch (error) {
    console.error('❌ Error en RPC update_user_points:', error);
    throw error;
  }
};

// ============================================================================
// FUNCIONES DE ALIAS Y LEGADO
// ============================================================================

export const grantFreePoints = async (userId, amount, actionType, referenceId) => {
    // 1. Actualizar el balance (sumar puntos)
    const balanceResult = await updatePointsBalance(userId, amount, 'free');
    
    // 2. Registrar la transacción (para el historial)
    trackFreePointsAction(userId, amount, actionType, referenceId); 
    
    return balanceResult;
};

// ALIAS: La función que acepta el monto explícito se exporta como 'addFreePoints'
export const addFreePoints = grantFreePoints;

// Alias para sumar puntos premium
export const addPremiumPoints = (userId, amount, actionType, referenceId) => 
    updatePointsBalance(userId, amount, 'premium');

// Alias para deducir puntos
export const deductPoints = (userId, amount, type) => 
    updatePointsBalance(userId, -amount, type);


// ============================================================================
// EXPORTACIONES FINALES
// ============================================================================

export default {
  getUserPoints,
  initializeUserPoints, 
  trackFreePointsAction,
  updatePointsBalance,
  calculateVideoPoints, // <-- EXPORTACIÓN AGREGADA
  addFreePoints, 
  addPremiumPoints,
  deductPoints,
};
