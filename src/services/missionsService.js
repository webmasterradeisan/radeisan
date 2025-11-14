// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - CORRECCIÓN FINAL: La lógica de restricción (Farming) se 
// basa enteramente en el error de unicidad (23505) de la Base de Datos.
// ============================================================================

import { supabase } from '../lib/supabase';
import * as pointsService from './pointsService';

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

/**
 * Tipos de misiones disponibles
 * ¡CORREGIDO! Estos nombres ahora coinciden con la columna 'mission_type'
 * de la tabla 'daily_missions' que nos mostraste.
 */
export const MISSION_TYPES = {
  WATCH_VIDEO: 'watch_videos',      // Corregido (antes 'watch_video')
  UPLOAD_VIDEO: 'upload_video',       // Coincidía (según tu lista)
  GIVE_LIKE: 'like_videos',         // Corregido (antes 'give_like')
  SHARE_CONTENT: 'share_video',       // Corregido (antes 'share_content')
  DONATE_POINTS: 'donate_points',     // (No estaba en tu lista, se mantiene por si acaso)
  COMMENT: 'comment_videos',      // Corregido (antes 'comment')
  FOLLOW_USER: 'follow_user',       // (No estaba en tu lista, se mantiene por si acaso)
  COMPLETE_PROFILE: 'complete_profile', // Coincidía (según tu lista)
  LOGIN_DAILY: 'login_daily',       // (No estaba en tu lista, se mantiene por si acaso)
  WATCH_REELS: 'watch_reels',       // (No estaba en tu lista, se mantiene por si acaso)
  INVITE_FRIEND: 'invite_friend'      // Añadido (estaba en tu lista)
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
// FUNCIONES DE CONSULTA - Obtener Misiones (Sin cambios)
// ============================================================================

export async function getDailyMissions(options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const {
      includeCompleted = true,
      includeExpired = false,
      frequency = 'daily'
    } = options;

    const { data, error } = await supabase
      .rpc('get_user_daily_missions', {
        p_user_id: user.id,
        p_include_completed: includeCompleted,
        p_include_expired: includeExpired,
        p_frequency: frequency
      });

    if (error) throw error;

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

// ============================================================================
// --- ESTA ES LA FUNCIÓN CORREGIDA ---
// ============================================================================
export async function getAllMissions(filters = {}) {
  // ✅ CORRECCIÓN:
  // Esta función ahora llama a 'get_all_missions_admin()' (Paso 1)
  // para ignorar la RLS y obtener TODAS las misiones para el panel de admin.
  // El filtrado (búsqueda, estado, etc.) se maneja en el componente
  // 'MissionsManagement.jsx' que la llama.
  try {
    const { data, error } = await supabase
      .rpc('get_all_missions_admin');

    if (error) throw error;

    // 'data' ahora contendrá las 9 misiones
    return {
      success: true,
      missions: data || []
    };

  } catch (error) {
    console.error('Error obteniendo todas las misiones (admin):', error);
    return {
      success: false,
      error: error.message,
      missions: []
    };
  }
}
// ============================================================================
// --- FIN DE LA CORRECCIÓN ---
// ============================================================================

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
// FUNCIONES DE TRACKING - Registrar Progreso (CORREGIDA)
// ============================================================================

// 🛑 hasUserEarnedPointsForAction se elimina del flujo de trackMissionProgress
// para confiar en la restricción UNIQUE de la DB.

/**
 * Registrar progreso en una misión
 * @param {string} missionType - Tipo de misión (MISSION_TYPES)
 * @param {string} referenceType - Tipo de contenido ('video', 'photo')
 * @param {string} referenceId - ID del objeto (Video ID, Post ID, etc.)
 * @param {number} amount - Cantidad de progreso (default: 1)
 * @param {Object} metadata - Metadata adicional (watch_duration, platform, etc.)
 * @returns {Promise<{result: string, points_earned: number, message?: string}>} Resultado del tracking
 */
export async function trackMissionProgress(missionType, referenceType, referenceId, amount = 1, metadata = {}) {
  const userAuth = await supabase.auth.getUser();
  if (!userAuth.data.user) {
    return { result: 'error', points_earned: 0, message: 'Usuario no autenticado' };
  }
  const userId = userAuth.data.user.id;

  try {
    // 🛑 SE OMITE LA VERIFICACIÓN DE alreadyPaid EN JAVASCRIPT
    // para forzar que la restricción de unicidad de la DB maneje el bloqueo.

    // 1. Ejecución del RPC de la base de datos para registrar el progreso y otorgar puntos
    const { data, error } = await supabase
      .rpc('track_mission_progress', {
        p_user_id: userId,
        p_mission_type: missionType,
        p_progress_amount: amount,
        p_metadata: {
            reference_type: referenceType,
            reference_id: referenceId,
            ...metadata
        }
      });

    if (error) {
        // ✅ CORRECCIÓN CRÍTICA: Captura el error de unicidad (23505) y devuelve 'already_paid'.
        if (error.code === '23505' || error.message.includes('duplicate key')) { 
             return {
                result: 'already_paid', 
                points_earned: 0, 
                message: 'Error de unicidad: Puntos ya ganados.'
             };
        }
        // Si es cualquier otro error, se propaga
        throw error;
    }
    
    // 2. Devolver el resultado de los puntos obtenidos
    // (Esta 'data' viene del 'RETURN' en la función SQL 'track_mission_progress')
    if (data && data.result === 'success') {
        // ✅ DEVOLUCIÓN: Éxito con puntos (Esto disparará la notificación de éxito)
        return { 
          result: 'success', 
          points_earned: data.points_earned, 
          message: `¡Misión completada! +${data.points_earned} puntos` 
        };
    }
    
    // ✅ DEVOLUCIÓN: Esto se activa si la función SQL devuelve 'already_paid'
    if (data && data.result === 'already_paid') {
        return {
          result: 'already_paid',
          points_earned: 0,
          message: 'Puntos ya ganados por esta acción.'
        };
    }

    // Devolución si la acción se registró, pero no hubo puntos (ej: 'mission_not_found_or_no_points')
    return {
      result: 'registered',
      points_earned: 0,
      message: 'Acción registrada, pero no hubo recompensa inmediata.'
    };

  } catch (error) {
    console.error('Error tracking misión:', error);
    return {
      result: 'error',
      points_earned: 0,
      message: error.message
    };
  }
}

/**
 * Tracking automático cuando el usuario ve un video
 */
export async function trackWatchVideo(referenceType, referenceId, watchDuration = 30) {
  return trackMissionProgress(MISSION_TYPES.WATCH_VIDEO, referenceType, referenceId, 1, {
    watch_duration: watchDuration
  });
}

/**
 * Tracking automático cuando el usuario sube un video (Sin cambios)
 */
export async function trackUploadVideo(referenceId) {
  return trackMissionProgress(MISSION_TYPES.UPLOAD_VIDEO, 'video', referenceId, 1, {});
}

/**
 * Tracking automático cuando el usuario da like
 */
export async function trackGiveLike(referenceType, referenceId) {
  return trackMissionProgress(MISSION_TYPES.GIVE_LIKE, referenceType, referenceId);
}

/**
 * Tracking automático cuando el usuario comparte contenido
 */
export async function trackShareContent(referenceType, referenceId, platform = 'link') {
  return trackMissionProgress(MISSION_TYPES.SHARE_CONTENT, referenceType, referenceId, 1, {
    platform: platform
  });
}

/**
 * Tracking automático cuando el usuario dona puntos (Sin cambios)
 */
export async function trackDonatePoints(recipientId, pointsAmount) {
  return trackMissionProgress(MISSION_TYPES.DONATE_POINTS, 'donation', recipientId, 1, {
    recipient_id: recipientId,
    points_amount: pointsAmount
  });
}

/**
 * Tracking automático cuando el usuario comenta
 */
export async function trackComment(referenceType, referenceId) {
  return trackMissionProgress(MISSION_TYPES.COMMENT, referenceType, referenceId);
}

/**
 * Tracking automático cuando el usuario sigue a alguien (Sin cambios)
 */
export async function trackFollowUser(followedUserId) {
  return trackMissionProgress(MISSION_TYPES.FOLLOW_USER, 'user', followedUserId, 1, {
    followed_user_id: followedUserId
  });
}

/**
 * Tracking de login diario (Sin cambios)
 */
export async function trackDailyLogin() {
  return trackMissionProgress(MISSION_TYPES.LOGIN_DAILY, 'system', 'daily_login', 1, {
    login_timestamp: new Date().toISOString()
  });
}

// ============================================================================
// FUNCIONES DE COMPLETADO (Sin cambios)
// ============================================================================
export async function completeMission(missionId, options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { grantReward = true, bonusPoints = 0 } = options;

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

export async function claimMissionReward(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

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

    const pointsResult = await pointsService.addFreePoints(
      progress.mission.points_reward,
      `Recompensa por completar: ${progress.mission.title}`,
      'mission',
      missionId
    );

    if (!pointsResult.success) throw new Error('Error otorgando puntos');

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
// FUNCIONES DE RACHAS, ESTADÍSTICAS Y ADMIN (Sin cambios)
// ============================================================================

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

  return {
    days: null,
    points: null,
    daysRemaining: 0,
    maxReached: true
  };
}

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
// --- SECCIÓN DE ADMIN (AQUÍ ESTÁ LA CORRECCIÓN) ---
// ============================================================================

export async function createMission(missionData) {
  try {
    // --- CORRECCIÓN ---
    // De-estructuramos todos los campos del formData, incluyendo mission_key
    const {
      title,
      description,
      mission_type,
      mission_key, // <-- CAMPO AÑADIDO
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
        mission_key, // <-- CAMPO AÑADIDO
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

export async function updateMission(missionId, updates) {
  try {
    // --- CORRECCIÓN (Mejora) ---
    // De-estructuramos 'updates' para pasar solo los campos permitidos
    // Esto es más seguro y asegura que 'mission_key' se incluya.
    const {
      title,
      description,
      mission_type,
      mission_key,
      target_count,
      points_reward,
      frequency,
      icon,
      is_active,
      display_order
    } = updates;

    const { data, error } = await supabase
      .from('daily_missions')
      .update({
        title,
        description,
        mission_type,
        mission_key, // <-- CAMPO AÑADIDO
        target_count,
        points_reward,
        frequency,
        icon,
        is_active,
        display_order,
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

export async function toggleMissionActive(missionId, isActive) {
  return updateMission(missionId, { is_active: isActive });
}

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
// FUNCIONES DE UTILIDAD (Sin cambios)
// ============================================================================

export async function canCompleteMissionToday(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

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

    const today = new Date().toDateString();
    const completedDate = new Date(data.completed_at).toDateString();

    return today !== completedDate;
  } catch (error) {
    console.error('Error verificando disponibilidad de misión:', error);
    return false;
  }
}

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
