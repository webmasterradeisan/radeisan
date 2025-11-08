// ============================================================================
// MISSIONS SERVICE - Sistema de Misiones Diarias
// ============================================================================
// ✅ FIX 9 (FINAL): Implementada restricción de acciones repetibles (Likes, Comentarios)
//    usando 'points_transactions' y 'reference_id' para evitar farming.
//    - La verificación se realiza antes de trackMissionProgress.
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

export async function getAllMissions(filters = {}) {
  try {
    let query = supabase
      .from('daily_missions')
      .select('*')
      .order('display_order', { ascending: true });

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

/**
 * Función de utilidad para verificar si el usuario ya ganó puntos por esta referencia
 * @param {string} userId - ID del usuario
 * @param {string} actionType - Tipo de acción (GIVE_LIKE, COMMENT, SHARE_CONTENT)
 * @param {string} referenceId - ID del objeto (Video ID, Post ID, etc.)
 * @returns {Promise<boolean>} - True si ya ganó puntos, False si no
 */
async function hasUserEarnedPointsForAction(userId, actionType, referenceId) {
    // Si no hay referencia, no podemos restringir, así que retornamos FALSE.
    if (!referenceId) return false; 
    
    // Solo buscamos transacciones positivas (puntos ganados)
    const { data, error } = await supabase
        .from('points_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('transaction_type', actionType)
        .eq('reference_id', referenceId)
        .gt('points_change', 0) // Aseguramos que solo revisamos puntos GANADOS, no perdidos
        .limit(1);
    
    if (error) {
        console.error('Error verificando earning points restriction:', error);
        return false;
    }

    return data.length > 0;
}

/**
 * Registrar progreso en una misión
 * @param {string} missionType - Tipo de misión (MISSION_TYPES)
 * @param {number} amount - Cantidad de progreso (default: 1)
 * @param {Object} metadata - Metadata adicional (debe contener content_id para likes/comments)
 * @returns {Promise<Object>} Resultado del tracking
 */
export async function trackMissionProgress(missionType, amount = 1, metadata = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // ✅ RESTRICCIÓN: Definir las acciones que solo dan puntos una vez por objeto
    const RESTRICTED_ACTIONS = [
        MISSION_TYPES.GIVE_LIKE, 
        MISSION_TYPES.COMMENT,
        MISSION_TYPES.SHARE_CONTENT
        // NOTA: WATCH_VIDEO se maneja por límite diario en la misión, no por ID de video.
    ];

    const referenceId = metadata.content_id || metadata.video_id; // Obtener el ID del objeto

    if (RESTRICTED_ACTIONS.includes(missionType) && referenceId) {
        
        // Verificamos si el usuario YA RECIBIÓ puntos por esta acción en este objeto
        const alreadyPaid = await hasUserEarnedPointsForAction(user.id, missionType, referenceId);
        
        if (alreadyPaid) {
            // Si ya ganó puntos, detenemos el proceso y devolvemos un mensaje.
            return {
                success: true,
                completed: false,
                message: `Puntos por ${missionType} ya ganados para este contenido.`
            };
        }
    }
    // FIN DE RESTRICCIÓN DE FARMING

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
 * Tracking automático cuando el usuario ve un video (Sin cambios)
 * @param {string} videoId - ID del video visto
 * @param {number} watchDuration - Duración vista en segundos
 * @returns {Promise<Object>}
 */
export async function trackWatchVideo(videoId, watchDuration) {
  // WATCH_VIDEO se maneja por límite diario en la misión.
  return trackMissionProgress(MISSION_TYPES.WATCH_VIDEO, 1, {
    video_id: videoId,
    watch_duration: watchDuration
  });
}

/**
 * Tracking automático cuando el usuario sube un video (Sin cambios)
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
  // contentId se usará como referenceId en la restricción
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
  // contentId se usará como referenceId en la restricción
  return trackMissionProgress(MISSION_TYPES.SHARE_CONTENT, 1, {
    content_type: contentType,
    content_id: contentId,
    platform: platform
  });
}

/**
 * Tracking automático cuando el usuario dona puntos (Sin cambios)
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
  // contentId se usará como referenceId en la restricción
  return trackMissionProgress(MISSION_TYPES.COMMENT, 1, {
    content_type: contentType,
    content_id: contentId
  });
}

/**
 * Tracking automático cuando el usuario sigue a alguien (Sin cambios)
 */
export async function trackFollowUser(followedUserId) {
  return trackMissionProgress(MISSION_TYPES.FOLLOW_USER, 1, {
    followed_user_id: followedUserId
  });
}

/**
 * Tracking de login diario (Sin cambios)
 */
export async function trackDailyLogin() {
  return trackMissionProgress(MISSION_TYPES.LOGIN_DAILY, 1, {
    login_timestamp: new Date().toISOString()
  });
}

// ... (El resto del servicio de misiones no requiere cambios) ...

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
