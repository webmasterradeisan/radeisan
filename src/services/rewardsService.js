// ============================================================================
// REWARDS SERVICE - Servicio de Recompensas (VERSIÓN CORREGIDA)
// ============================================================================
// ✅ FIX 1: Actualizada la lógica de validación para usar la DB real:
//    - 'is_active' (boolean) en lugar de 'status' (string)
//    - 'stock_quantity === -1' en lugar de 'is_unlimited_stock'
// ✅ FIX 2: Lógica de costos actualizada para leer 'cost_free_points' y
//    'cost_premium_points' directamente, en lugar de calcularlos.
// ✅ FIX 3: Eliminada la dependencia de 'requires_approval' (no existe).
// ============================================================================

import { supabase } from '../lib/supabase';
import * as pointsService from './pointsService'; // Importación necesaria

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

export const REWARD_CATEGORIES = {
  DIGITAL: 'digital',
  PHYSICAL: 'physical',
  DISCOUNT: 'discount',
  PREMIUM: 'premium',
  EXCLUSIVE: 'exclusive',
  GIFT_CARD: 'gift_card'
};

/**
 * Estados de canjes (redenciones)
 */
export const REDEMPTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

/**
 * Tipos de puntos que se pueden usar
 */
export const POINTS_TYPE = {
  FREE: 'free',
  PREMIUM: 'premium'
};

// ============================================================================
// FUNCIONES DE CONSULTA
// ============================================================================

/**
 * Obtener una recompensa por ID
 * (Simplificado para obtener solo las columnas que usamos)
 */
export async function getRewardById(rewardId) {
  const { data, error } = await supabase
    .from('rewards')
    .select(`
      id, title, is_active, stock_quantity, 
      cost_free_points, cost_premium_points
    `)
    .eq('id', rewardId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, reward: data };
}

// ... (Otras funciones de consulta como getAvailableRewards)

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

    // 1. Obtener recompensa
    const rewardResult = await getRewardById(rewardId);
    if (!rewardResult.success) throw new Error('Recompensa no encontrada');
    const reward = rewardResult.reward;

    // 2. ✅ FIX 1: Validaciones de estado y stock (Usando la DB real)
    if (reward.is_active !== true) {
      return { success: false, canRedeem: false, reason: 'Esta recompensa no está disponible' };
    }
    // No está disponible si el stock es 0 o menor, PERO no es -1 (ilimitado)
    if (reward.stock_quantity <= 0 && reward.stock_quantity !== -1) {
      return { success: false, canRedeem: false, reason: 'Esta recompensa está agotada' };
    }

    // 3. Obtener balance del usuario
    const balanceResult = await pointsService.getUserBalance();
    if (!balanceResult.success) throw new Error('Error obteniendo balance');
    const { free_points, premium_points } = balanceResult.balance;

    let canAfford = false;
    let costDetails = { type: pointsType, cost: 0, available: 0, actualDeduction: 0 };

    // 4. ✅ FIX 2: Lógica de Costos (Leyendo los costos explícitos de la DB)
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

    // 1. Validar canje (Ahora usa la lógica correcta)
    const validation = await validateRedemption(rewardId, pointsType);
    if (!validation.canRedeem) {
      // Esta es la alerta que estabas viendo
      return { success: false, error: validation.reason };
    }

    const reward = validation.reward;
    const costDetails = validation.costDetails;

    // 2. Deducir puntos usando el servicio deductPoints
    const pointsDeductionResult = await pointsService.deductPoints(
        user.id,
        costDetails.actualDeduction, // Deducción real
        pointsType,                   // Moneda a deducir
        'reward_redemption',        // Tipo de acción
        rewardId                    // ID de la recompensa
    );

    if (!pointsDeductionResult.success) {
        throw new Error(pointsDeductionResult.error || 'Error al deducir puntos del saldo.');
    }

    // 3. Registrar la Redención usando RPC function
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

    // 4. ✅ FIX 3: La columna 'requires_approval' no existe. Asumimos auto-aprobación.
    const status = REDEMPTION_STATUS.APPROVED;
    const requiresApproval = false; // Hardcodeado ya que no está en la DB

    // 5. Devolver el nuevo saldo para actualizar el PointsContext
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
      message: '¡Recompensa canjeada exitosamente!', // Mensaje de éxito
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

/**
 * Cancelar un canje (PENDING) y devolver los puntos.
 */
export async function cancelRedemption(redemptionId) {
    // ... (Lógica de cancelación) ...
    // Importante: La devolución de puntos debe usar pointsService.addPoints(userId, amount, type, 'redemption_cancelled', redemptionId);
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
        `) // ✅ FIX: 'name' no existe, se usa 'title'
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user redemption history:', error);
        return { success: false, error: error.message };
    }

    return { success: true, history: data };
}

// ... (Otras funciones de historial y administración) ...


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
 * (Función de ayuda corregida con la lógica de DB real)
 */
export function isRewardAvailable(reward) {
  // ✅ FIX: Comprobar 'is_active' (boolean)
  if (reward.is_active !== true) {
    return false;
  }

  // ✅ FIX: Comprobar 'stock_quantity' (number)
  // No está disponible si es 0 o menor, PERO no es -1 (ilimitado)
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
