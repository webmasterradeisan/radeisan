// src/services/rewardsService.js
// ============================================================================
// REWARDS SERVICE - Servicio de Recompensas (VERSIÓN CORREGIDA)
// ============================================================================
// ✅ FIX 1: Se importa calculatePremiumValue para aplicar la regla 2x.
// ✅ FIX 2: Se modifica validateRedemption para usar el multiplicador.
// ✅ FIX 3: Se añade el nuevo parámetro 'pointsSpent' a redeemReward para el motor.
// ============================================================================

import { supabase } from '../lib/supabase';
// ✅ Importar funciones necesarias para el multiplicador y deducción
import * as pointsService from './pointsService';

// ... (CONSTANTES Y FUNCIONES DE CONSULTA, sin cambios) ...

// ============================================================================
// FUNCIONES DE VALIDACIÓN (CORREGIDA)
// ============================================================================

/**
 * Validar si el usuario puede canjear una recompensa
 * @param {string} rewardId - ID de la recompensa
 * @param {string} pointsType - Tipo de puntos a usar ('free', 'premium')
 * @returns {Promise<Object>}
 */
export async function validateRedemption(rewardId, pointsType = POINTS_TYPE.FREE) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener recompensa
    const rewardResult = await getRewardById(rewardId);
    if (!rewardResult.success) throw new Error('Recompensa no encontrada');
    const reward = rewardResult.reward;

    // Validar estado de la recompensa
    if (reward.status !== REWARD_STATUS.ACTIVE) {
      return { success: false, canRedeem: false, reason: 'Esta recompensa no está disponible' };
    }
    // Validar stock
    if (!reward.is_unlimited_stock && reward.stock_quantity <= 0) {
      return { success: false, canRedeem: false, reason: 'Esta recompensa está agotada' };
    }

    // Obtener balance del usuario
    // Suponemos que cost_points es la columna del costo unificado.
    const costBase = reward.cost_free_points || reward.cost_premium_points;
    if (!costBase) throw new Error('Costo de recompensa no definido');
    
    const balanceResult = await pointsService.getUserBalance();
    if (!balanceResult.success) throw new Error('Error obteniendo balance');
    const { free_points, premium_points } = balanceResult.balance;

    let canAfford = false;
    let costDetails = { type: pointsType, cost: 0, available: 0, remaining: 0, actualDeduction: 0 };
    
    // ✅ FIX: Lógica de Deducción (Usando el Multiplicador)
    if (pointsType === POINTS_TYPE.FREE) {
        costDetails.cost = costBase;
        costDetails.available = free_points;
        costDetails.remaining = free_points - costBase;
        costDetails.actualDeduction = costBase; // Deducción es 1:1
        canAfford = free_points >= costBase;

    } else if (pointsType === POINTS_TYPE.PREMIUM) {
        // ✅ FIX: Aplicar el mayor valor aquí. El costo en PREMIUM es menor.
        const multiplier = pointsService.PREMIUM_POINTS_MULTIPLIER || 2;
        const requiredPremium = Math.ceil(costBase / multiplier); // Costo real en moneda Premium
        
        costDetails.cost = requiredPremium; // El costo real a deducir de la moneda Premium
        costDetails.available = premium_points;
        costDetails.remaining = premium_points - requiredPremium;
        costDetails.actualDeduction = requiredPremium;
        canAfford = premium_points >= requiredPremium;
    }

    if (!canAfford) {
      return { success: false, canRedeem: false, reason: 'No tienes suficientes puntos', costDetails };
    }

    return { success: true, canRedeem: true, reward, costDetails };
  } catch (error) {
    console.error('Error validando canje:', error);
    return { success: false, canRedeem: false, reason: error.message };
  }
}

// ... (checkStock, sin cambios) ...

// ============================================================================
// FUNCIONES DE CANJE - Redención de Recompensas (CORREGIDA)
// ============================================================================

/**
 * Canjear una recompensa con puntos
 * @param {string} rewardId - ID de la recompensa
 * @param {string} pointsType - Tipo de puntos a usar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>}
 */
export async function redeemReward(rewardId, pointsType = POINTS_TYPE.FREE, options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { userNotes = '', deliveryAddress = null, contactInfo = null } = options;

    // 1. Validar canje (Usará la lógica del multiplicador)
    const validation = await validateRedemption(rewardId, pointsType);
    if (!validation.canRedeem) {
      return { success: false, error: validation.reason };
    }

    const reward = validation.reward;
    const costDetails = validation.costDetails;
    
    // ✅ FIX: Deducir puntos usando el servicio deductPoints
    const pointsDeductionResult = await pointsService.deductPoints(
        user.id,
        costDetails.actualDeduction, // Deducción real calculada
        pointsType,                   // Moneda a deducir
        'reward_redemption',        // Tipo de acción
        rewardId                    // ID de la recompensa
    );
    
    if (!pointsDeductionResult.success) {
        throw new Error(pointsDeductionResult.error || 'Error al deducir puntos del saldo.');
    }

    // 2. Iniciar transacción usando RPC function
    const { data, error } = await supabase.rpc('redeem_reward', {
      p_user_id: user.id,
      p_reward_id: rewardId,
      p_points_type: pointsType,
      p_points_spent: costDetails.actualDeduction, // Costo deducido
      p_user_notes: userNotes,
      p_delivery_address: deliveryAddress,
      p_contact_info: contactInfo
    });

    if (error) throw error;

    // Si la recompensa requiere aprobación, informar al usuario
    const status = reward.requires_approval 
      ? REDEMPTION_STATUS.PENDING 
      : REDEMPTION_STATUS.APPROVED;

    // ✅ FIX: Devolver el nuevo saldo para actualizar el PointsContext de inmediato (Problema 3)
    return {
      success: true,
      redemption: {
        id: data.redemption_id,
        reward,
        pointsSpent: costDetails.actualDeduction,
        pointsType,
        status,
        requiresApproval: reward.requires_approval
      },
      message: reward.requires_approval
        ? '¡Canje solicitado! Espera la aprobación del administrador'
        : '¡Recompensa canjeada exitosamente!',
      newBalance: pointsDeductionResult.newPoints // El nuevo saldo del usuario
    };
  } catch (error) {
    console.error('Error canjeando recompensa:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ... (Resto de funciones de Historial y Admin, sin cambios) ...

// ============================================================================
// EXPORTACIONES POR DEFECTO
// ============================================================================

export default {
  // ... (Exportaciones de constantes y funciones de consulta)
  // ... (Exportaciones de funciones de Administración)
  // ... (Exportaciones de funciones de Historial)
  
  // Canje
  redeemReward,
  cancelRedemption,
  // ... (Resto de funciones)
};
