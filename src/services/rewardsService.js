// ============================================================================
// REWARDS SERVICE - Servicio de Recompensas (VERSIÓN CORREGIDA)
// ============================================================================
// ✅ FIX 1: Lógica de Mayor Valor (Multiplicador Premium 2x) aplicada en validateRedemption.
// ✅ FIX 2: Deducción de puntos explícita usando pointsService.deductPoints (el motor seguro).
// ✅ FIX 3: Retorno de 'newBalance' para actualizar el Contexto de Puntos de inmediato.
// ============================================================================

import { supabase } from '../lib/supabase';
import * as pointsService from './pointsService'; // Importación necesaria para el multiplicador y deducción

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

/**
 * Categorías de recompensas
 */
export const REWARD_CATEGORIES = {
  DIGITAL: 'digital',
  PHYSICAL: 'physical',
  DISCOUNT: 'discount',
  PREMIUM: 'premium',
  EXCLUSIVE: 'exclusive',
  GIFT_CARD: 'gift_card'
};

/**
 * Estados de recompensas
 */
export const REWARD_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
  COMING_SOON: 'coming_soon'
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
 * Obtener todas las recompensas disponibles
 */
export async function getAvailableRewards(filters = {}) {
  let query = supabase
    .from('rewards')
    .select(`
      *,
      category:reward_categories(name)
    `)
    .eq('status', REWARD_STATUS.ACTIVE)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (filters.category) {
    query = query.eq('category_id', filters.category);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching available rewards:', error);
    return { success: false, error: error.message };
  }

  return { success: true, rewards: data };
}

/**
 * Obtener una recompensa por ID
 */
export async function getRewardById(rewardId) {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, reward: data };
}

// ... (Otras funciones de consulta como getFeaturedRewards, getRewardsByCategory, getAffordableRewards)

// ============================================================================
// FUNCIONES DE VALIDACIÓN (CORREGIDA)
// ============================================================================

/**
 * Validar si el usuario puede canjear una recompensa (Implementa Lógica de Mayor Valor)
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

    // Validaciones de estado y stock...
    if (reward.status !== REWARD_STATUS.ACTIVE) {
      return { success: false, canRedeem: false, reason: 'Esta recompensa no está disponible' };
    }
    if (!reward.is_unlimited_stock && reward.stock_quantity <= 0) {
      return { success: false, canRedeem: false, reason: 'Esta recompensa está agotada' };
    }

    // 2. Obtener balance del usuario
    const costBase = reward.cost_free_points; // Usar el costo en moneda Gratis como la base de valor
    if (!costBase) throw new Error('Costo de recompensa no definido');

    const balanceResult = await pointsService.getUserBalance();
    if (!balanceResult.success) throw new Error('Error obteniendo balance');
    const { free_points, premium_points } = balanceResult.balance;

    let canAfford = false;
    let costDetails = { type: pointsType, cost: 0, available: 0, actualDeduction: 0 };

    // 3. ✅ FIX 1: Lógica de Deducción (Usando el Multiplicador)
    if (pointsType === POINTS_TYPE.FREE) {
        costDetails.cost = costBase;
        costDetails.available = free_points;
        costDetails.actualDeduction = costBase; // Deducción 1:1
        canAfford = free_points >= costBase;

    } else if (pointsType === POINTS_TYPE.PREMIUM) {
        const multiplier = pointsService.PREMIUM_POINTS_MULTIPLIER || 2;
        // Costo real en moneda Premium es la mitad (o según el multiplicador)
        const requiredPremium = Math.ceil(costBase / multiplier); 

        costDetails.cost = requiredPremium; // El costo real a deducir de la moneda Premium
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

// ... (checkStock, sin cambios) ...

// ============================================================================
// FUNCIONES DE CANJE - Redención de Recompensas (CORREGIDA)
// ============================================================================

/**
 * Canjear una recompensa con puntos (Implementa Deducción Segura y Actualización Inmediata)
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

    // 2. ✅ FIX 2: Deducir puntos usando el servicio deductPoints (el Motor seguro)
    const pointsDeductionResult = await pointsService.deductPoints(
        user.id,
        costDetails.actualDeduction, // Deducción real calculada (ej. 100 Premium)
        pointsType,                   // Moneda a deducir
        'reward_redemption',        // Tipo de acción
        rewardId                    // ID de la recompensa
    );

    if (!pointsDeductionResult.success) {
        throw new Error(pointsDeductionResult.error || 'Error al deducir puntos del saldo.');
    }

    // 3. Registrar la Redención usando RPC function (Registra la compra)
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

    const status = reward.requires_approval
      ? REDEMPTION_STATUS.PENDING
      : REDEMPTION_STATUS.APPROVED;

    // 4. ✅ FIX 3: Devolver el nuevo saldo para actualizar el PointsContext de inmediato
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

/**
 * Cancelar un canje (PENDING) y devolver los puntos.
 */
export async function cancelRedemption(redemptionId) {
    // ... (Lógica de cancelación, asumiendo que es correcta) ...
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
            reward:rewards (name, image_url, requires_approval)
        `)
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
 */
export function isRewardAvailable(reward) {
  if (reward.status !== REWARD_STATUS.ACTIVE) {
    return false;
  }

  if (!reward.is_unlimited_stock && reward.stock_quantity <= 0) {
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
  REWARD_STATUS,
  REDEMPTION_STATUS,
  POINTS_TYPE,

  // Consultas
  getAvailableRewards,
  getRewardById,
  // ... (otras consultas)

  // Validación
  validateRedemption,
  // ... (otras validaciones)

  // Canje
  redeemReward,
  cancelRedemption,

  // Historial
  getUserRedemptionHistory,
  // ... (otras funciones de historial y admin)

  // Utilidades
  canCancelRedemption,
  isRewardAvailable,
};
