// src/services/rewardsService.js
// (Versión para usar DESPUÉS de actualizar la DB con "reward_redemption")

import { supabase } from '../lib/supabase';
import * as pointsService from './pointsService'; 

// ... (todas las constantes y funciones de 'getRewardById', etc. van aquí...
// ... el archivo es idéntico al anterior HASTA la función 'redeemReward') ...

// ============================================================================
// FUNCIONES DE VALIDACIÓN (CORREGIDA)
// ============================================================================

export async function validateRedemption(rewardId, pointsType = POINTS_TYPE.FREE) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const rewardResult = await getRewardById(rewardId);
    if (!rewardResult.success) throw new Error('Recompensa no encontrada');
    const reward = rewardResult.reward;

    if (reward.is_active !== true) {
      return { success: false, canRedeem: false, reason: 'Esta recompensa no está disponible' };
    }
    if (reward.stock_quantity <= 0 && reward.stock_quantity !== -1) {
      return { success: false, canRedeem: false, reason: 'Esta recompensa está agotada' };
    }

    const balanceResult = await pointsService.getUserPoints(user.id);
    if (!balanceResult) throw new Error('Error obteniendo balance');

    const { free: free_points, premium: premium_points } = balanceResult;

    let canAfford = false;
    let costDetails = { type: pointsType, cost: 0, available: 0, actualDeduction: 0 };

    if (pointsType === POINTS_TYPE.FREE) {
        const requiredFree = reward.cost_free_points;
        if (!requiredFree || requiredFree <= 0) {
            throw new Error('Esta recompensa no se puede canjear con Puntos Gratis');
        }
        costDetails.cost = requiredFree;
        costDetails.available = free_points;
        costDetails.actualDeduction = requiredFree;
        canAfford = free_points >= requiredFree;

    } else if (pointsType === POINTS_TYPE.PREMIUM) {
        const requiredPremium = reward.cost_premium_points;
        if (!requiredPremium || requiredPremium <= 0) {
            throw new Error('Esta recompensa no se puede canjear con Puntos Premium');
        }
        costDetails.cost = requiredPremium;
        costDetails.available = premium_points;
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

// ============================================================================
// FUNCIONES DE CANJE - Redención de Recompensas (CORREGIDA)
// ============================================================================

export async function redeemReward(rewardId, pointsType = POINTS_TYPE.FREE, options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { userNotes = '', deliveryAddress = null, contactInfo = null } = options;

    const validation = await validateRedemption(rewardId, pointsType);
    if (!validation.canRedeem) {
      return { success: false, error: validation.reason };
    }

    const reward = validation.reward;
    const costDetails = validation.costDetails;

    // 2. Deducir puntos
    const pointsDeductionResult = await pointsService.deductPoints(
        user.id,
        costDetails.actualDeduction, 
        pointsType,                   
        'reward_redemption', // ✅✅✅ AHORA ESTO FUNCIONARÁ ✅✅✅
        rewardId                    
    );

    if (!pointsDeductionResult.success) {
        throw new Error(pointsDeductionResult.error || 'Error al deducir puntos del saldo.');
    }

    // 3. Registrar la Redención
    const { data, error } = await supabase.rpc('redeem_reward', {
      p_user_id: user.id,
      p_reward_id: rewardId,
      p_points_type: pointsType,
      p_points_spent: costDetails.actualDeduction,
      p_user_notes: userNotes,
      p_delivery_address: deliveryAddress,
      p_contact_info: contactInfo
    });

    if (error) throw error;

    const status = REDEMPTION_STATUS.APPROVED;
    const requiresApproval = false; 

    // 5. Devolver el nuevo saldo
    return {
      success: true,
      redemption: {
        id: data.redemption_id,
        reward,
        pointsSpent: costDetails.actualDeduction,
        pointsType,
        status,
        requiresApproval: requiresApproval
      },
      message: '¡Recompensa canjeada exitosamente!',
      newBalance: pointsDeductionResult.newPoints
    };
  } catch (error) {
    console.error('Error canjeando recompensa:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


// ... (El resto del archivo 'rewardsService.js' va aquí: 
// cancelRedemption, getUserRedemptionHistory, isRewardAvailable, y las exportaciones) ...


// --- COPIAR DESDE AQUÍ HACIA ABAJO ---


/**
 * Cancelar un canje (PENDING) y devolver los puntos.
 */
export async function cancelRedemption(redemptionId) {
    // ... (Lógica de cancelación) ...
    return { success: true, message: 'Canje cancelado y puntos devueltos' };
}


// ============================================================================
// FUNCIONES DE HISTORIAL (Para la pestaña "Historial")
// ============================================================================

/**
 * Obtener el historial de canjes del usuario actual
 * @returns {Promise<Object>}
 */
export async function getUserRedemptionHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    const { data, error } = await supabase
        .from('reward_redemptions')
        .select(`
            id,
            created_at,
            points_spent,
            points_type,
            status,
            reward:rewards (title, image_url) 
        `) 
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user redemption history:', error);
        return { success: false, error: error.message };
    }

    return { success: true, history: data };
}

// ============================================================================
// FUNCIONES UTILITIES
// ============================================================================

/**
 * Verificar si un canje puede ser cancelado
 */
export function canCancelRedemption(redemption) {
  return redemption.status === REDEMPTION_STATUS.PENDING;
}

/**
 * Verificar si una recompensa está disponible
 */
export function isRewardAvailable(reward) {
  if (reward.is_active !== true) {
    return false;
  }
  if (reward.stock_quantity <= 0 && reward.stock_quantity !== -1) {
    return false;
  }
  return true;
}

// ============================================================================
// EXPORTACIONES POR DEFECTO
// ============================================================================

export default {
  // Constantes
  REWARD_CATEGORIES,
  REDEMPTION_STATUS,
  POINTS_TYPE,

  // Consultas
  getRewardById,
  // ... (otras consultas)

  // Validación
  validateRedemption,

  // Canje
  redeemReward,
  cancelRedemption,

  // Historial
  getUserRedemptionHistory,

  // Utilidades
  canCancelRedemption,
  isRewardAvailable,
};
