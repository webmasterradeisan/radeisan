// ============================================================================
// MISSIONS SERVICE - Sistema de Misiones Diarias
// ============================================================================
// Servicio completo para gestionar el sistema de misiones diarias con:
// - Obtención de misiones del día
// - Tracking automático de progreso
// - Sistema de rachas (streaks)
// - Recompensas automáticas al completar
// - Integración con sistema de puntos dual
// ============================================================================

import { supabase } from '../lib/supabase';
import * as pointsService from './pointsService';

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

/**
 * Tipos de misiones disponibles
 */
export const MISSION_TYPES = {
  WATCH_VIDEO: 'watch_video',
  UPLOAD_VIDEO: 'upload_video',
  GIVE_LIKE: 'give_like',
  SHARE_CONTENT: 'share_content',
  DONATE_POINTS: 'donate_points',
  COMMENT: 'comment',
  FOLLOW_USER: 'follow_user',
  COMPLETE_PROFILE: 'complete_profile',
  LOGIN_DAILY: 'login_daily',
  WATCH_REELS: 'watch_reels'
};

/**
 * Estados de las misiones
 */
export const MISSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  LOCKED: 'locked'
};

/**
 * Frecuencia de las misiones
 */
export const MISSION_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time'
};

/**
 * Bonus de rachas por días consecutivos
 */
export const STREAK_BONUSES = {
  7: 50,   // 7 días consecutivos = +50 puntos bonus
  10: 100, // 10 días = +100 puntos
  30: 500, // 30 días = +500 puntos
  100: 2000 // 100 días = +2000 puntos
};

// ============================================================================
// FUNCIONES DE CONSULTA - Obtener Misiones
// ============================================================================

/**
 * Obtener las misiones diarias del usuario actual
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Object>} Objeto con misiones y progreso
 */
export async function getDailyMissions(options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const {
      includeCompleted = true,
      includeExpired = false,
      frequency = 'daily'
    } = options;

    // Obtener misiones del usuario con progreso
    const { data, error } = await supabase
      .rpc('get_user_daily_missions', {
        p_user_id: user.id,
        p_include_completed: includeCompleted,
        p_include_expired: includeExpired,
        p_frequency: frequency
      });

    if (error) throw error;

    // Agrupar por estado
    const missions = {
      active: [],
      completed: [],
      expired: [],
      all: data || []
    };

    data?.forEach(mission => {
      if (mission.status === MISSION_STATUS.COMPLETED) {
        missions.completed.push(mission);
      } else if (mission.status === MISSION_STATUS.EXPIRED) {
        missions.expired.push(mission);
      } else {
        missions.active.push(mission);
      }
    });

    // Calcular estadísticas
    const stats = {
      total: data?.length || 0,
      active: missions.active.length,
      completed: missions.completed.length,
      completionRate: missions.active.length > 0 
        ? Math.round((missions.completed.length / (missions.active.length + missions.completed.length)) * 100)
        : 0,
      totalPointsEarned: missions.completed.reduce((sum, m) => sum + (m.points_reward || 0), 0),
      allCompleted: missions.active.length === 0 && missions.completed.length > 0
    };

    return {
      success: true,
      missions,
      stats
    };
  } catch (error) {
    console.error('Error obteniendo misiones diarias:', error);
    return {
      success: false,
      error: error.message,
      missions: { active: [], completed: [], expired: [], all: [] },
      stats: {}
    };
  }
}

/**
 * Obtener todas las misiones disponibles (para admin)
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} Array de misiones
 */
export async function getAllMissions(filters = {}) {
  try {
    let query = supabase
      .from('daily_missions')
      .select('*')
      .order('display_order', { ascending: true });

    // Aplicar filtros
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.frequency) {
      query = query.eq('frequency', filters.frequency);
    }

    if (filters.mission_type) {
      query = query.eq('mission_type', filters.mission_type);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      missions: data || []
    };
  } catch (error) {
    console.error('Error obteniendo todas las misiones:', error);
    return {
      success: false,
      error: error.message,
      missions: []
    };
  }
}

/**
 * Obtener el progreso de una misión específica
 * @param {string} missionId - ID de la misión
 * @returns {Promise<Object>} Progreso de la misión
 */
export async function getMissionProgress(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_mission_progress')
      .select(`
        *,
        mission:daily_missions (*)
      `)
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return {
      success: true,
      progress: data || null
    };
  } catch (error) {
    console.error('Error obteniendo progreso de misión:', error);
    return {
      success: false,
      error: error.message,
      progress: null
    };
  }
}

// ============================================================================
// FUNCIONES DE TRACKING - Registrar Progreso
// ============================================================================

/**
 * Registrar progreso en una misión
 * @param {string} missionType - Tipo de misión (MISSION_TYPES)
 * @param {number} amount - Cantidad de progreso (default: 1)
 * @param {Object} metadata - Metadata adicional
 * @returns {Promise<Object>} Resultado del tracking
 */
export async function trackMissionProgress(missionType, amount = 1, metadata = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Llamar a la función SQL que maneja el tracking automático
    const { data, error } = await supabase
      .rpc('track_mission_progress', {
        p_user_id: user.id,
        p_mission_type: missionType,
        p_progress_amount: amount,
        p_metadata: metadata
      });

    if (error) throw error;

    // Si la misión se completó, data contendrá info de la recompensa
    if (data && data.completed) {
      return {
        success: true,
        completed: true,
        mission: data.mission,
        reward: {
          points: data.points_awarded,
          type: data.points_type || 'free'
        },
        message: `¡Misión completada! +${data.points_awarded} puntos`
      };
    }

    return {
      success: true,
      completed: false,
      progress: data
    };
  } catch (error) {
    console.error('Error tracking misión:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tracking automático cuando el usuario ve un video
 * @param {string} videoId - ID del video visto
 * @param {number} watchDuration - Duración vista en segundos
 * @returns {Promise<Object>}
 */
export async function trackWatchVideo(videoId, watchDuration) {
  return trackMissionProgress(MISSION_TYPES.WATCH_VIDEO, 1, {
    video_id: videoId,
    watch_duration: watchDuration
  });
}

/**
 * Tracking automático cuando el usuario sube un video
 * @param {string} videoId - ID del video subido
 * @returns {Promise<Object>}
 */
export async function trackUploadVideo(videoId) {
  return trackMissionProgress(MISSION_TYPES.UPLOAD_VIDEO, 1, {
    video_id: videoId
  });
}

/**
 * Tracking automático cuando el usuario da like
 * @param {string} contentType - Tipo de contenido ('video', 'photo')
 * @param {string} contentId - ID del contenido
 * @returns {Promise<Object>}
 */
export async function trackGiveLike(contentType, contentId) {
  return trackMissionProgress(MISSION_TYPES.GIVE_LIKE, 1, {
    content_type: contentType,
    content_id: contentId
  });
}

/**
 * Tracking automático cuando el usuario comparte contenido
 * @param {string} contentType - Tipo de contenido
 * @param {string} contentId - ID del contenido
 * @param {string} platform - Plataforma donde se compartió
 * @returns {Promise<Object>}
 */
export async function trackShareContent(contentType, contentId, platform) {
  return trackMissionProgress(MISSION_TYPES.SHARE_CONTENT, 1, {
    content_type: contentType,
    content_id: contentId,
    platform: platform
  });
}

/**
 * Tracking automático cuando el usuario dona puntos
 * @param {string} recipientId - ID del usuario que recibe
 * @param {number} pointsAmount - Cantidad de puntos donados
 * @returns {Promise<Object>}
 */
export async function trackDonatePoints(recipientId, pointsAmount) {
  return trackMissionProgress(MISSION_TYPES.DONATE_POINTS, 1, {
    recipient_id: recipientId,
    points_amount: pointsAmount
  });
}

/**
 * Tracking automático cuando el usuario comenta
 * @param {string} contentType - Tipo de contenido
 * @param {string} contentId - ID del contenido
 * @returns {Promise<Object>}
 */
export async function trackComment(contentType, contentId) {
  return trackMissionProgress(MISSION_TYPES.COMMENT, 1, {
    content_type: contentType,
    content_id: contentId
  });
}

/**
 * Tracking automático cuando el usuario sigue a alguien
 * @param {string} followedUserId - ID del usuario seguido
 * @returns {Promise<Object>}
 */
export async function trackFollowUser(followedUserId) {
  return trackMissionProgress(MISSION_TYPES.FOLLOW_USER, 1, {
    followed_user_id: followedUserId
  });
}

/**
 * Tracking de login diario
 * @returns {Promise<Object>}
 */
export async function trackDailyLogin() {
  return trackMissionProgress(MISSION_TYPES.LOGIN_DAILY, 1, {
    login_timestamp: new Date().toISOString()
  });
}

// ============================================================================
// FUNCIONES DE COMPLETADO - Marcar como Completada (CORREGIDA)
// ============================================================================

/**
 * Completar manualmente una misión (usado por admin o para misiones especiales)
 * @param {string} missionId - ID de la misión
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>}
 */
export async function completeMission(missionId, options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { grantReward = true, bonusPoints = 0 } = options;

    // Llamar a función SQL para completar
    const { data, error } = await supabase
      .rpc('complete_user_mission', {
        p_user_id: user.id,
        p_mission_id: missionId,
        p_grant_reward: grantReward,
        p_bonus_points: bonusPoints
      });

    if (error) throw error;

    return {
      success: true,
      mission: data,
      message: `Misión completada${grantReward ? ` +${data.points_awarded} puntos` : ''}`
    };
  } catch (error) {
    console.error('Error completando misión:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reclamar recompensa de una misión completada
 * @param {string} missionId - ID de la misión
 * @returns {Promise<Object>}
 */
export async function claimMissionReward(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener progreso de la misión
    const { data: progress, error: progressError } = await supabase
      .from('user_mission_progress')
      .select(`
        *,
        mission:daily_missions (*)
      `)
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .single();

    if (progressError) throw progressError;
    if (!progress) throw new Error('Misión no encontrada');
    if (!progress.is_completed) throw new Error('Misión no completada');
    if (progress.reward_claimed) throw new Error('Recompensa ya reclamada');

    // ✅ CORRECCIÓN CRÍTICA: Se usa la firma de addFreePoints que acepta el monto explícito.
    const pointsResult = await pointsService.addFreePoints(
      user.id, // 1. userId
      progress.mission.points_reward, // 2. amount
      `Recompensa por completar: ${progress.mission.title}`, // 3. reason
      'mission_reward' // 4. actionType
    );

    if (!pointsResult.success) throw new Error('Error otorgando puntos');

    // Marcar como reclamada
    const { error: updateError } = await supabase
      .from('user_mission_progress')
      .update({
        reward_claimed: true,
        reward_claimed_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('mission_id', missionId);

    if (updateError) throw updateError;

    return {
      success: true,
      points: progress.mission.points_reward,
      message: `¡Recompensa reclamada! +${progress.mission.points_reward} puntos`
    };
  } catch (error) {
    console.error('Error reclamando recompensa:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// FUNCIONES DE RACHAS (STREAKS)
// ============================================================================

/**
 * Obtener la racha actual del usuario
 * @returns {Promise<Object>} Info de la racha
 */
export async function getUserStreak() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_mission_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Si no existe, retornar streak en 0
    if (!data) {
      return {
        success: true,
        streak: {
          current_streak: 0,
          longest_streak: 0,
          total_days_active: 0,
          last_activity_date: null,
          next_bonus: getNextStreakBonus(0)
        }
      };
    }

    // Calcular próximo bonus
    const nextBonus = getNextStreakBonus(data.current_streak);

    return {
      success: true,
      streak: {
        ...data,
        next_bonus: nextBonus
      }
    };
  } catch (error) {
    console.error('Error obteniendo racha:', error);
    return {
      success: false,
      error: error.message,
      streak: null
    };
  }
}

/**
 * Calcular el próximo bonus de racha
 * @param {number} currentStreak - Racha actual
 * @returns {Object} Info del próximo bonus
 */
function getNextStreakBonus(currentStreak) {
  const milestones = Object.keys(STREAK_BONUSES).map(Number).sort((a, b) => a - b);
  
  for (const milestone of milestones) {
    if (currentStreak < milestone) {
      return {
        days: milestone,
        points: STREAK_BONUSES[milestone],
        daysRemaining: milestone - currentStreak
      };
    }
  }

  // Si ya pasó todos los milestones
  return {
    days: null,
    points: null,
    daysRemaining: 0,
    maxReached: true
  };
}

/**
 * Actualizar la racha del usuario (automático al completar misiones)
 * Esta función se llama automáticamente desde el backend
 * @returns {Promise<Object>}
 */
export async function updateStreak() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .rpc('update_user_streak', {
        p_user_id: user.id
      });

    if (error) throw error;

    return {
      success: true,
      streak: data,
      bonusAwarded: data?.bonus_awarded || false,
      bonusPoints: data?.bonus_points || 0
    };
  } catch (error) {
    console.error('Error actualizando racha:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener el historial de rachas del usuario
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getStreakHistory(limit = 30) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_mission_progress')
      .select('completed_at, mission:daily_missions(title)')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      history: data || []
    };
  } catch (error) {
    console.error('Error obteniendo historial de rachas:', error);
    return {
      success: false,
      error: error.message,
      history: []
    };
  }
}

// ============================================================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas completas de misiones del usuario
 * @returns {Promise<Object>}
 */
export async function getMissionStats() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .rpc('get_user_mission_stats', {
        p_user_id: user.id
      });

    if (error) throw error;

    return {
      success: true,
      stats: data || {}
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de misiones:', error);
    return {
      success: false,
      error: error.message,
      stats: {}
    };
  }
}

/**
 * Obtener las misiones más completadas
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getTopMissions(limit = 10) {
  try {
    const { data, error } = await supabase
      .rpc('get_top_missions', {
        p_limit: limit
      });

    if (error) throw error;

    return {
      success: true,
      missions: data || []
    };
  } catch (error) {
    console.error('Error obteniendo top misiones:', error);
    return {
      success: false,
      error: error.message,
      missions: []
    };
  }
}

// ============================================================================
// FUNCIONES ADMIN - Gestión de Misiones
// ============================================================================

/**
 * Crear una nueva misión (admin)
 * @param {Object} missionData - Datos de la misión
 * @returns {Promise<Object>}
 */
export async function createMission(missionData) {
  try {
    const {
      title,
      description,
      mission_type,
      target_count,
      points_reward,
      frequency = 'daily',
      icon,
      is_active = true,
      display_order = 0
    } = missionData;

    const { data, error } = await supabase
      .from('daily_missions')
      .insert({
        title,
        description,
        mission_type,
        target_count,
        points_reward,
        frequency,
        icon,
        is_active,
        display_order
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      mission: data,
      message: 'Misión creada exitosamente'
    };
  } catch (error) {
    console.error('Error creando misión:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Actualizar una misión existente (admin)
 * @param {string} missionId - ID de la misión
 * @param {Object} updates - Actualizaciones
 * @returns {Promise<Object>}
 */
export async function updateMission(missionId, updates) {
  try {
    const { data, error } = await supabase
      .from('daily_missions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', missionId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      mission: data,
      message: 'Misión actualizada exitosamente'
    };
  } catch (error) {
    console.error('Error actualizando misión:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Eliminar una misión (admin)
 * @param {string} missionId - ID de la misión
 * @returns {Promise<Object>}
 */
export async function deleteMission(missionId) {
  try {
    const { error } = await supabase
      .from('daily_missions')
      .delete()
      .eq('id', missionId);

    if (error) throw error;

    return {
      success: true,
      message: 'Misión eliminada exitosamente'
    };
  } catch (error) {
    console.error('Error eliminando misión:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Activar/desactivar una misión (admin)
 * @param {string} missionId - ID de la misión
 * @param {boolean} isActive - Estado activo
 * @returns {Promise<Object>}
 */
export async function toggleMissionActive(missionId, isActive) {
  return updateMission(missionId, { is_active: isActive });
}

/**
 * Reordenar misiones (admin)
 * @param {Array} missionOrders - Array de {id, display_order}
 * @returns {Promise<Object>}
 */
export async function reorderMissions(missionOrders) {
  try {
    const updates = missionOrders.map(({ id, display_order }) => 
      supabase
        .from('daily_missions')
        .update({ display_order })
        .eq('id', id)
    );

    await Promise.all(updates);

    return {
      success: true,
      message: 'Misiones reordenadas exitosamente'
    };
  } catch (error) {
    console.error('Error reordenando misiones:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// FUNCIONES UTILIDADES
// ============================================================================

/**
 * Verificar si el usuario puede completar una misión hoy
 * @param {string} missionId - ID de la misión
 * @returns {Promise<boolean>}
 */
export async function canCompleteMissionToday(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_mission_progress')
      .select('completed_at, is_completed')
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return true;

    // Verificar si ya se completó hoy
    const today = new Date().toDateString();
    const completedDate = new Date(data.completed_at).toDateString();

    return today !== completedDate;
  } catch (error) {
    console.error('Error verificando disponibilidad de misión:', error);
    return false;
  }
}

/**
 * Reset de progreso diario (llamado automáticamente por cron job)
 * @returns {Promise<Object>}
 */
export async function resetDailyMissions() {
  try {
    const { data, error } = await supabase
      .rpc('reset_daily_mission_progress');

    if (error) throw error;

    return {
      success: true,
      resetCount: data?.reset_count || 0,
      message: `${data?.reset_count || 0} misiones reseteadas`
    };
  } catch (error) {
    console.error('Error reseteando misiones diarias:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener iconos disponibles para misiones
 * @returns {Array<string>}
 */
export function getAvailableMissionIcons() {
  return [
    'Play',
    'Upload',
    'Heart',
    'Share2',
    'Gift',
    'MessageCircle',
    'UserPlus',
    'CheckCircle',
    'LogIn',
    'Eye',
    'Star',
    'Trophy',
    'Target',
    'Zap',
    'Flame'
  ];
}

/**
 * Formatear tiempo restante para reset de misiones
 * @returns {string}
 */
export function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

/**
 * Calcular porcentaje de progreso de una misión
 * @param {number} current - Progreso actual
 * @param {number} target - Objetivo
 * @returns {number}
 */
export function calculateMissionProgress(current, target) {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

// ============================================================================
// EXPORTACIONES POR DEFECTO
// ============================================================================

export default {
  // Constantes
  MISSION_TYPES,
  MISSION_STATUS,
  MISSION_FREQUENCY,
  STREAK_BONUSES,

  // Consultas
  getDailyMissions,
  getAllMissions,
  getMissionProgress,

  // Tracking
  trackMissionProgress,
  trackWatchVideo,
  trackUploadVideo,
  trackGiveLike,
  trackShareContent,
  trackDonatePoints,
  trackComment,
  trackFollowUser,
  trackDailyLogin,

  // Completado
  completeMission,
  claimMissionReward,

  // Rachas
  getUserStreak,
  updateStreak,
  getStreakHistory,

  // Estadísticas
  getMissionStats,
  getTopMissions,

  // Admin
  createMission,
  updateMission,
  deleteMission,
  toggleMissionActive,
  reorderMissions,

  // Utilidades
  canCompleteMissionToday,
  resetDailyMissions,
  getAvailableMissionIcons,
  getTimeUntilReset,
  calculateMissionProgress
};
