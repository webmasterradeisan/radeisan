// ============================================================================
// REWARDS SERVICE - Servicio de Recompensas
// ============================================================================
// Servicio completo para gestionar el sistema de recompensas:
// - Obtención de catálogo de recompensas
// - Canje de puntos por recompensas
// - Validación de stock y puntos
// - Historial de canjes
// - Gestión de aprobaciones (admin)
// - Integración con sistema de puntos dual
// ============================================================================

import { supabase } from '../supabase';
import * as pointsService from './pointsService';

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
 * Estados de canjes
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
  PREMIUM: 'premium',
  MIXED: 'mixed'
};

// ============================================================================
// FUNCIONES DE CONSULTA - Catálogo de Recompensas
// ============================================================================

/**
 * Obtener todas las recompensas activas disponibles
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>} Objeto con recompensas
 */
export async function getAvailableRewards(filters = {}) {
  try {
    let query = supabase
      .from('rewards')
      .select('*')
      .eq('status', REWARD_STATUS.ACTIVE)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.maxFreePoints) {
      query = query.lte('cost_free_points', filters.maxFreePoints);
    }

    if (filters.maxPremiumPoints) {
      query = query.lte('cost_premium_points', filters.maxPremiumPoints);
    }

    if (filters.onlyFeatured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filtrar recompensas sin stock
    const availableRewards = data?.filter(reward => {
      if (reward.is_unlimited_stock) return true;
      return reward.stock_quantity > 0;
    }) || [];

    return {
      success: true,
      rewards: availableRewards,
      total: availableRewards.length
    };
  } catch (error) {
    console.error('Error obteniendo recompensas:', error);
    return {
      success: false,
      error: error.message,
      rewards: [],
      total: 0
    };
  }
}

/**
 * Obtener una recompensa específica por ID
 * @param {string} rewardId - ID de la recompensa
 * @returns {Promise<Object>}
 */
export async function getRewardById(rewardId) {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .single();

    if (error) throw error;

    return {
      success: true,
      reward: data
    };
  } catch (error) {
    console.error('Error obteniendo recompensa:', error);
    return {
      success: false,
      error: error.message,
      reward: null
    };
  }
}

/**
 * Obtener recompensas destacadas (featured)
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>}
 */
export async function getFeaturedRewards(limit = 6) {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('status', REWARD_STATUS.ACTIVE)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      rewards: data || []
    };
  } catch (error) {
    console.error('Error obteniendo recompensas destacadas:', error);
    return {
      success: false,
      error: error.message,
      rewards: []
    };
  }
}

/**
 * Obtener recompensas por categoría
 * @param {string} category - Categoría de recompensa
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>}
 */
export async function getRewardsByCategory(category, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('status', REWARD_STATUS.ACTIVE)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      rewards: data || [],
      category
    };
  } catch (error) {
    console.error('Error obteniendo recompensas por categoría:', error);
    return {
      success: false,
      error: error.message,
      rewards: [],
      category
    };
  }
}

/**
 * Obtener recompensas que el usuario puede canjear con sus puntos actuales
 * @returns {Promise<Object>}
 */
export async function getAffordableRewards() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener balance de puntos del usuario
    const balanceResult = await pointsService.getUserBalance();
    if (!balanceResult.success) throw new Error('Error obteniendo balance');

    const { free_points, premium_points } = balanceResult.balance;

    // Obtener todas las recompensas activas
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('status', REWARD_STATUS.ACTIVE)
      .order('is_featured', { ascending: false })
      .order('cost_free_points', { ascending: true });

    if (error) throw error;

    // Filtrar recompensas que el usuario puede pagar
    const affordable = data?.filter(reward => {
      // Verificar stock
      if (!reward.is_unlimited_stock && reward.stock_quantity <= 0) {
        return false;
      }

      // Verificar si puede pagar con puntos gratis
      if (reward.cost_free_points > 0 && free_points >= reward.cost_free_points) {
        return true;
      }

      // Verificar si puede pagar con puntos premium
      if (reward.cost_premium_points > 0 && premium_points >= reward.cost_premium_points) {
        return true;
      }

      return false;
    }) || [];

    return {
      success: true,
      rewards: affordable,
      userBalance: { free_points, premium_points }
    };
  } catch (error) {
    console.error('Error obteniendo recompensas disponibles:', error);
    return {
      success: false,
      error: error.message,
      rewards: [],
      userBalance: null
    };
  }
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Validar si el usuario puede canjear una recompensa
 * @param {string} rewardId - ID de la recompensa
 * @param {string} pointsType - Tipo de puntos a usar ('free', 'premium', 'mixed')
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
      return {
        success: false,
        canRedeem: false,
        reason: 'Esta recompensa no está disponible'
      };
    }

    // Validar stock
    if (!reward.is_unlimited_stock && reward.stock_quantity <= 0) {
      return {
        success: false,
        canRedeem: false,
        reason: 'Esta recompensa está agotada'
      };
    }

    // Obtener balance del usuario
    const balanceResult = await pointsService.getUserBalance();
    if (!balanceResult.success) throw new Error('Error obteniendo balance');

    const { free_points, premium_points } = balanceResult.balance;

    // Validar puntos según tipo seleccionado
    let canAfford = false;
    let costDetails = {};

    if (pointsType === POINTS_TYPE.FREE) {
      canAfford = free_points >= reward.cost_free_points;
      costDetails = {
        type: POINTS_TYPE.FREE,
        cost: reward.cost_free_points,
        available: free_points,
        remaining: free_points - reward.cost_free_points
      };
    } else if (pointsType === POINTS_TYPE.PREMIUM) {
      canAfford = premium_points >= reward.cost_premium_points;
      costDetails = {
        type: POINTS_TYPE.PREMIUM,
        cost: reward.cost_premium_points,
        available: premium_points,
        remaining: premium_points - reward.cost_premium_points
      };
    }

    if (!canAfford) {
      return {
        success: false,
        canRedeem: false,
        reason: 'No tienes suficientes puntos',
        costDetails
      };
    }

    return {
      success: true,
      canRedeem: true,
      reward,
      costDetails
    };
  } catch (error) {
    console.error('Error validando canje:', error);
    return {
      success: false,
      canRedeem: false,
      reason: error.message
    };
  }
}

/**
 * Verificar disponibilidad de stock
 * @param {string} rewardId - ID de la recompensa
 * @returns {Promise<Object>}
 */
export async function checkStock(rewardId) {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('stock_quantity, is_unlimited_stock')
      .eq('id', rewardId)
      .single();

    if (error) throw error;

    return {
      success: true,
      available: data.is_unlimited_stock || data.stock_quantity > 0,
      stock: data.is_unlimited_stock ? 'unlimited' : data.stock_quantity,
      isUnlimited: data.is_unlimited_stock
    };
  } catch (error) {
    console.error('Error verificando stock:', error);
    return {
      success: false,
      available: false,
      error: error.message
    };
  }
}

// ============================================================================
// FUNCIONES DE CANJE - Redención de Recompensas
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

    const {
      userNotes = '',
      deliveryAddress = null,
      contactInfo = null
    } = options;

    // Validar canje
    const validation = await validateRedemption(rewardId, pointsType);
    if (!validation.canRedeem) {
      return {
        success: false,
        error: validation.reason
      };
    }

    const reward = validation.reward;
    const costDetails = validation.costDetails;

    // Iniciar transacción usando RPC function
    const { data, error } = await supabase.rpc('redeem_reward', {
      p_user_id: user.id,
      p_reward_id: rewardId,
      p_points_type: pointsType,
      p_points_spent: costDetails.cost,
      p_user_notes: userNotes,
      p_delivery_address: deliveryAddress,
      p_contact_info: contactInfo
    });

    if (error) throw error;

    // Si la recompensa requiere aprobación, informar al usuario
    const status = reward.requires_approval 
      ? REDEMPTION_STATUS.PENDING 
      : REDEMPTION_STATUS.APPROVED;

    return {
      success: true,
      redemption: {
        id: data.redemption_id,
        reward,
        pointsSpent: costDetails.cost,
        pointsType,
        status,
        requiresApproval: reward.requires_approval
      },
      message: reward.requires_approval
        ? '¡Canje solicitado! Espera la aprobación del administrador'
        : '¡Recompensa canjeada exitosamente!'
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
 * Cancelar un canje pendiente
 * @param {string} redemptionId - ID del canje
 * @returns {Promise<Object>}
 */
export async function cancelRedemption(redemptionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Verificar que el canje sea del usuario y esté pendiente
    const { data: redemption, error: fetchError } = await supabase
      .from('reward_redemptions')
      .select('*, rewards!reward_id(cost_free_points, cost_premium_points)')
      .eq('id', redemptionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    if (redemption.status !== REDEMPTION_STATUS.PENDING) {
      throw new Error('Solo puedes cancelar canjes pendientes');
    }

    // Cancelar canje y devolver puntos usando RPC
    const { error: cancelError } = await supabase.rpc('cancel_redemption', {
      p_redemption_id: redemptionId,
      p_user_id: user.id
    });

    if (cancelError) throw cancelError;

    return {
      success: true,
      message: 'Canje cancelado y puntos devueltos'
    };
  } catch (error) {
    console.error('Error cancelando canje:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// FUNCIONES DE HISTORIAL
// ============================================================================

/**
 * Obtener historial de canjes del usuario actual
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>}
 */
export async function getUserRedemptionHistory(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const {
      status = null,
      limit = 20,
      offset = 0
    } = filters;

    let query = supabase
      .from('reward_redemptions')
      .select(`
        *,
        rewards!reward_id(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calcular estadísticas
    const stats = {
      total: data?.length || 0,
      pending: data?.filter(r => r.status === REDEMPTION_STATUS.PENDING).length || 0,
      approved: data?.filter(r => r.status === REDEMPTION_STATUS.APPROVED).length || 0,
      delivered: data?.filter(r => r.status === REDEMPTION_STATUS.DELIVERED).length || 0,
      totalPointsSpent: data?.reduce((sum, r) => sum + (r.points_spent || 0), 0) || 0
    };

    return {
      success: true,
      redemptions: data || [],
      stats
    };
  } catch (error) {
    console.error('Error obteniendo historial de canjes:', error);
    return {
      success: false,
      error: error.message,
      redemptions: [],
      stats: {}
    };
  }
}

/**
 * Obtener detalles de un canje específico
 * @param {string} redemptionId - ID del canje
 * @returns {Promise<Object>}
 */
export async function getRedemptionDetails(redemptionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('reward_redemptions')
      .select(`
        *,
        rewards!reward_id(*),
        users!user_id(id, full_name, username, avatar_url)
      `)
      .eq('id', redemptionId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    return {
      success: true,
      redemption: data
    };
  } catch (error) {
    console.error('Error obteniendo detalles de canje:', error);
    return {
      success: false,
      error: error.message,
      redemption: null
    };
  }
}

/**
 * Obtener canjes recientes (últimos N canjes)
 * @param {number} limit - Número de canjes a obtener
 * @returns {Promise<Object>}
 */
export async function getRecentRedemptions(limit = 10) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('reward_redemptions')
      .select(`
        *,
        rewards!reward_id(name, image_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      redemptions: data || []
    };
  } catch (error) {
    console.error('Error obteniendo canjes recientes:', error);
    return {
      success: false,
      error: error.message,
      redemptions: []
    };
  }
}

// ============================================================================
// FUNCIONES DE ADMINISTRACIÓN
// ============================================================================

/**
 * Obtener todos los canjes (admin)
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>}
 */
export async function getAllRedemptions(filters = {}) {
  try {
    const {
      status = null,
      userId = null,
      rewardId = null,
      limit = 50,
      offset = 0
    } = filters;

    let query = supabase
      .from('reward_redemptions')
      .select(`
        *,
        users!user_id(id, full_name, username, avatar_url),
        rewards!reward_id(*)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (rewardId) {
      query = query.eq('reward_id', rewardId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      redemptions: data || [],
      total: data?.length || 0
    };
  } catch (error) {
    console.error('Error obteniendo todos los canjes:', error);
    return {
      success: false,
      error: error.message,
      redemptions: [],
      total: 0
    };
  }
}

/**
 * Aprobar un canje (admin)
 * @param {string} redemptionId - ID del canje
 * @param {string} adminNotes - Notas del administrador
 * @returns {Promise<Object>}
 */
export async function approveRedemption(redemptionId, adminNotes = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('reward_redemptions')
      .update({
        status: REDEMPTION_STATUS.APPROVED,
        admin_notes: adminNotes,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', redemptionId);

    if (error) throw error;

    // TODO: Enviar notificación al usuario

    return {
      success: true,
      message: 'Canje aprobado exitosamente'
    };
  } catch (error) {
    console.error('Error aprobando canje:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Rechazar un canje (admin)
 * @param {string} redemptionId - ID del canje
 * @param {string} adminNotes - Notas del administrador
 * @returns {Promise<Object>}
 */
export async function rejectRedemption(redemptionId, adminNotes = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Rechazar y devolver puntos usando RPC
    const { error } = await supabase.rpc('reject_redemption', {
      p_redemption_id: redemptionId,
      p_admin_id: user.id,
      p_admin_notes: adminNotes
    });

    if (error) throw error;

    // TODO: Enviar notificación al usuario

    return {
      success: true,
      message: 'Canje rechazado y puntos devueltos'
    };
  } catch (error) {
    console.error('Error rechazando canje:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Marcar un canje como entregado (admin)
 * @param {string} redemptionId - ID del canje
 * @param {string} adminNotes - Notas del administrador
 * @returns {Promise<Object>}
 */
export async function markAsDelivered(redemptionId, adminNotes = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('reward_redemptions')
      .update({
        status: REDEMPTION_STATUS.DELIVERED,
        admin_notes: adminNotes,
        delivered_at: new Date().toISOString(),
        processed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', redemptionId);

    if (error) throw error;

    // TODO: Enviar notificación al usuario

    return {
      success: true,
      message: 'Canje marcado como entregado'
    };
  } catch (error) {
    console.error('Error marcando como entregado:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas de recompensas (admin)
 * @returns {Promise<Object>}
 */
export async function getRewardsStats() {
  try {
    // Estadísticas de recompensas
    const { data: rewardsData, error: rewardsError } = await supabase
      .from('rewards')
      .select('status, category, cost_free_points, cost_premium_points');

    if (rewardsError) throw rewardsError;

    // Estadísticas de canjes
    const { data: redemptionsData, error: redemptionsError } = await supabase
      .from('reward_redemptions')
      .select('status, points_spent, points_type, created_at');

    if (redemptionsError) throw redemptionsError;

    const stats = {
      rewards: {
        total: rewardsData?.length || 0,
        active: rewardsData?.filter(r => r.status === REWARD_STATUS.ACTIVE).length || 0,
        inactive: rewardsData?.filter(r => r.status === REWARD_STATUS.INACTIVE).length || 0,
        byCategory: {}
      },
      redemptions: {
        total: redemptionsData?.length || 0,
        pending: redemptionsData?.filter(r => r.status === REDEMPTION_STATUS.PENDING).length || 0,
        approved: redemptionsData?.filter(r => r.status === REDEMPTION_STATUS.APPROVED).length || 0,
        delivered: redemptionsData?.filter(r => r.status === REDEMPTION_STATUS.DELIVERED).length || 0,
        rejected: redemptionsData?.filter(r => r.status === REDEMPTION_STATUS.REJECTED).length || 0,
        totalPointsSpent: redemptionsData?.reduce((sum, r) => sum + (r.points_spent || 0), 0) || 0,
        avgPointsPerRedemption: 0
      }
    };

    // Calcular promedio
    if (stats.redemptions.total > 0) {
      stats.redemptions.avgPointsPerRedemption = Math.round(
        stats.redemptions.totalPointsSpent / stats.redemptions.total
      );
    }

    // Agrupar por categoría
    Object.values(REWARD_CATEGORIES).forEach(category => {
      stats.rewards.byCategory[category] = rewardsData?.filter(r => r.category === category).length || 0;
    });

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      success: false,
      error: error.message,
      stats: {}
    };
  }
}

/**
 * Obtener recompensas más populares
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>}
 */
export async function getTopRewards(limit = 10) {
  try {
    const { data, error } = await supabase
      .rpc('get_top_rewards', { p_limit: limit });

    if (error) throw error;

    return {
      success: true,
      rewards: data || []
    };
  } catch (error) {
    console.error('Error obteniendo recompensas populares:', error);
    return {
      success: false,
      error: error.message,
      rewards: []
    };
  }
}

/**
 * Obtener usuarios que más han canjeado
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>}
 */
export async function getTopRedeemers(limit = 10) {
  try {
    const { data, error } = await supabase
      .rpc('get_top_redeemers', { p_limit: limit });

    if (error) throw error;

    return {
      success: true,
      users: data || []
    };
  } catch (error) {
    console.error('Error obteniendo top usuarios:', error);
    return {
      success: false,
      error: error.message,
      users: []
    };
  }
}

// ============================================================================
// FUNCIONES UTILIDADES
// ============================================================================

/**
 * Calcular el costo total en puntos de una recompensa
 * @param {Object} reward - Objeto de recompensa
 * @param {string} pointsType - Tipo de puntos a usar
 * @returns {number}
 */
export function calculateRewardCost(reward, pointsType = POINTS_TYPE.FREE) {
  if (pointsType === POINTS_TYPE.FREE) {
    return reward.cost_free_points || 0;
  } else if (pointsType === POINTS_TYPE.PREMIUM) {
    return reward.cost_premium_points || 0;
  }
  return 0;
}

/**
 * Obtener el nombre legible de una categoría
 * @param {string} category - Categoría
 * @returns {string}
 */
export function getCategoryLabel(category) {
  const labels = {
    [REWARD_CATEGORIES.DIGITAL]: 'Digital',
    [REWARD_CATEGORIES.PHYSICAL]: 'Físico',
    [REWARD_CATEGORIES.DISCOUNT]: 'Descuento',
    [REWARD_CATEGORIES.PREMIUM]: 'Premium',
    [REWARD_CATEGORIES.EXCLUSIVE]: 'Exclusivo',
    [REWARD_CATEGORIES.GIFT_CARD]: 'Gift Card'
  };
  return labels[category] || category;
}

/**
 * Obtener el nombre legible de un estado de canje
 * @param {string} status - Estado
 * @returns {string}
 */
export function getRedemptionStatusLabel(status) {
  const labels = {
    [REDEMPTION_STATUS.PENDING]: 'Pendiente',
    [REDEMPTION_STATUS.APPROVED]: 'Aprobado',
    [REDEMPTION_STATUS.REJECTED]: 'Rechazado',
    [REDEMPTION_STATUS.DELIVERED]: 'Entregado',
    [REDEMPTION_STATUS.CANCELLED]: 'Cancelado'
  };
  return labels[status] || status;
}

/**
 * Verificar si un canje puede ser cancelado
 * @param {Object} redemption - Objeto de canje
 * @returns {boolean}
 */
export function canCancelRedemption(redemption) {
  return redemption.status === REDEMPTION_STATUS.PENDING;
}

/**
 * Verificar si una recompensa está disponible
 * @param {Object} reward - Objeto de recompensa
 * @returns {boolean}
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
  getFeaturedRewards,
  getRewardsByCategory,
  getAffordableRewards,

  // Validación
  validateRedemption,
  checkStock,

  // Canje
  redeemReward,
  cancelRedemption,

  // Historial
  getUserRedemptionHistory,
  getRedemptionDetails,
  getRecentRedemptions,

  // Administración
  getAllRedemptions,
  approveRedemption,
  rejectRedemption,
  markAsDelivered,

  // Estadísticas
  getRewardsStats,
  getTopRewards,
  getTopRedeemers,

  // Utilidades
  calculateRewardCost,
  getCategoryLabel,
  getRedemptionStatusLabel,
  canCancelRedemption,
  isRewardAvailable
};
