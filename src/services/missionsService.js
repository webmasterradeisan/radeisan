// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - VERSIÓN FINAL ESTABLE (BASADA EN ARCHIVO 20)
// ✅ Contiene todas las funciones legacy (Fix "Pantalla en Blanco").
// ✅ FIX RPC: 'track_mission_event' renombrado a 'track_mission_update' (Solución final a 42883).
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
  WATCH_VIDEO: 'watch_videos',
  UPLOAD_VIDEO: 'upload_video',
  UPLOAD_REEL: 'upload_reel',
  UPLOAD_PHOTO: 'upload_photo',
  GIVE_LIKE: 'give_like',           
  SHARE_CONTENT: 'share_video',
  DONATE_POINTS: 'donate_points',
  COMMENT: 'comment_videos',
  FOLLOW_USER: 'follow_user',
  COMPLETE_PROFILE: 'complete_profile',
  LOGIN_DAILY: 'login_daily',
  WATCH_REELS: 'watch_reels',
  INVITE_FRIEND: 'invite_friend',
  UPLOAD_PACK: 'upload_pack',
  ALL_MISSIONS_STREAK: 'all_missions_streak'
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
  7: 50,
  10: 100,
  30: 500,
  100: 2000
};

// ============================================================================
// UTILIDAD PRIVADA: MAPEO HÍBRIDO (Para Admin)
// ============================================================================
const mapMissionData = (mission) => {
  if (!mission) return null;
  // Duplicar el valor para compatibilidad legacy (reward_points)
  return {
    ...mission,
    points_reward: mission.points_reward,
    reward_points: mission.points_reward 
  };
};

// ============================================================================
// FUNCIONES DE CONSULTA
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

    const mappedData = (data || []).map(mapMissionData);

    const missions = {
      active: [],
      completed: [],
      expired: [],
      all: mappedData
    };

    mappedData.forEach(mission => {
      if (mission.status === MISSION_STATUS.COMPLETED) missions.completed.push(mission);
      else if (mission.status === MISSION_STATUS.EXPIRED) missions.expired.push(mission);
      else missions.active.push(mission);
    });

    const stats = {
      total: mappedData.length,
      active: missions.active.length,
      completed: missions.completed.length,
      completionRate: missions.active.length > 0 
        ? Math.round((missions.completed.length / (missions.active.length + missions.completed.length)) * 100)
        : 0,
      totalPointsEarned: missions.completed.reduce((sum, m) => sum + (m.points_reward || 0), 0)
    };

    return { success: true, missions, stats };
  } catch (error) {
    console.error('Error obteniendo misiones diarias:', error);
    return { success: false, error: error.message, missions: { active: [], completed: [], expired: [], all: [] }, stats: {} };
  }
}

export async function getAllMissions(filters = {}) {
  try {
    const { data, error } = await supabase
      .rpc('get_all_missions_admin');

    if (error) throw error;

    return { success: true, missions: data.map(mapMissionData) || [] };
  } catch (error) {
    console.error('Error obteniendo todas las misiones (admin):', error);
    return { success: false, error: error.message, missions: [] };
  }
}

export async function getMissionsForProgressPanel() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: missions, error: missionsError } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('is_active', true)
      .eq('show_in_progress_panel', true)
      .order('display_order', { ascending: true });

    if (missionsError) throw missionsError;
    if (!missions || missions.length === 0) return { success: true, missions: [] };

    const todayDate = new Date().toISOString().split('T')[0];
    const missionIds = missions.map(m => m.id);
    
    const { data: progressData, error: progressError } = await supabase
      .from('mission_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('mission_id', missionIds)
      .eq('date', todayDate);

    if (progressError) throw progressError;

    const missionsWithProgress = missions.map(mission => {
      const mappedMission = mapMissionData(mission);
      const progress = progressData?.find(p => p.mission_id === mission.id);
      
      const isCompleted = progress?.is_completed || false;
      const realCount = progress?.current_count || 0;
      const displayCount = isCompleted ? mission.target_count : realCount;

      return {
        ...mappedMission,
        current_count: displayCount,
        is_completed: isCompleted,
        progress_percentage: mission.target_count > 0 
          ? Math.min(Math.round((displayCount / mission.target_count) * 100), 100)
          : 0
      };
    });

    return { success: true, missions: missionsWithProgress };
  } catch (error) {
    console.error('Error panel progreso:', error);
    return { success: false, error: error.message, missions: [] };
  }
}

export async function getMissionProgress(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('mission_progress')
      .select(`
        *,
        mission:daily_missions (*)
      `)
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return { success: true, progress: data || null };
  } catch (error) {
    console.error('Error obteniendo progreso de misión:', error);
    return { success: false, error: error.message, progress: null };
  }
}

// ============================================================================
// FUNCIONES DE TRACKING - Registrar Progreso (CORREGIDA)
// ============================================================================

/**
 * Registrar progreso en una misión
 * ✅ USA EL RPC RENOMBRADO 'track_mission_update'
 */
export async function trackMissionProgress(missionType, referenceType, referenceId, amount = 1, metadata = {}) {
  const userAuth = await supabase.auth.getUser();
  if (!userAuth.data.user) {
    return { result: 'error', points_earned: 0, message: 'Usuario no autenticado' };
  }
  const userId = userAuth.data.user.id;

  try {
    // 🔥 RPC RENOMBRADO A track_mission_update PARA BYPASS DE CACHE
    const { data, error } = await supabase
      .rpc('track_mission_update', {
        p_user_id: userId,
        p_mission_type: missionType,
        p_content_id: referenceId, 
        p_metadata: {
            reference_type: referenceType,
            reference_id: referenceId,
            ...metadata
        }
      });

    if (error) {
        // ✅ MANEJO DE ANTI-FARMING (Error 23505)
        if (error.code === '23505' || error.message?.includes('duplicate key')) { 
             return {
                result: 'already_paid', 
                points_earned: 0, 
                message: 'Error de unicidad: Puntos ya ganados.'
             };
        }
        throw error;
    }
    
    // 2. Devolver el resultado del RPC
    if (data && data.result === 'success') {
        return { result: 'success', points_earned: data.points_earned, message: `¡Misión completada! +${data.points_earned} puntos` };
    }
    if (data && data.result === 'already_paid') {
        return { result: 'already_paid', points_earned: 0, message: 'Puntos ya ganados por esta acción.' };
    }
    if (data && data.result === 'progress_updated') {
        return { result: 'progress_updated', points_earned: 0, message: 'Progreso registrado exitosamente.' };
    }
    if (data && data.result === 'already_completed') {
        return { result: 'already_completed', points_earned: 0, message: 'Ya completaste esta misión hoy.' };
    }

    return { result: 'registered', points_earned: 0, message: 'Acción registrada, pero no hubo recompensa inmediata.' };

  } catch (error) {
    console.error('❌ [trackMissionProgress] Error tracking misión:', error);
    throw error; 
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
 * Tracking automático cuando el usuario sube un video 
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
 * Tracking automático cuando el usuario dona puntos
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
 * Tracking automático cuando el usuario sigue a alguien
 */
export async function trackFollowUser(followedUserId) {
  return trackMissionProgress(MISSION_TYPES.FOLLOW_USER, 'user', followedUserId, 1, {
    followed_user_id: followedUserId
  });
}

/**
 * Tracking de login diario
 */
export async function trackDailyLogin() {
  return trackMissionProgress(MISSION_TYPES.LOGIN_DAILY, 'system', 'daily_login_' + new Date().toDateString(), 1, {
    login_timestamp: new Date().toISOString()
  });
}

// ============================================================================
// FUNCIONES DE COMPLETADO Y RECOMPENSA
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

    return { success: true, data, message: 'Misión completada exitosamente' };
  } catch (error) {
    console.error('Error completando misión:', error);
    return { success: false, error: error.message };
  }
}

export async function claimMissionReward(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .rpc('claim_mission_reward', {
        p_user_id: user.id,
        p_mission_id: missionId
      });

    if (error) throw error;

    return { success: true, pointsEarned: data?.points_earned || 0, message: 'Recompensa reclamada exitosamente' };
  } catch (error) {
    console.error('Error reclamando recompensa:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// FUNCIONES DE RACHAS (STREAKS)
// ============================================================================

export async function getUserStreak() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return { success: true, streak: data || null };
  } catch (error) {
    console.error('Error obteniendo racha:', error);
    return { success: false, error: error.message, streak: null };
  }
}

export async function updateStreak() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .rpc('update_user_streak', { p_user_id: user.id });

    if (error) throw error;

    return { success: true, streak: data };
  } catch (error) {
    console.error('Error actualizando racha:', error);
    return { success: false, error: error.message };
  }
}

export async function getStreakHistory(limit = 30) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, history: data || [] };
  } catch (error) {
    console.error('Error obteniendo historial de rachas:', error);
    return { success: false, error: error.message, history: [] };
  }
}

// ============================================================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================================================

export async function getMissionStats() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .rpc('get_user_mission_stats', { p_user_id: user.id });

    if (error) throw error;

    return { success: true, stats: data || {} };
  } catch (error) {
    console.error('Error obteniendo estadísticas de misiones:', error);
    return { success: false, error: error.message, stats: {} };
  }
}

export async function getTopMissions(limit = 5) {
  try {
    const { data, error } = await supabase
      .rpc('get_top_missions', { p_limit: limit });

    if (error) throw error;

    return { success: true, missions: data || [] };
  } catch (error) {
    console.error('Error obteniendo top misiones:', error);
    return { success: false, error: error.message, missions: [] };
  }
}

// ============================================================================
// FUNCIONES DE ADMINISTRACIÓN
// ============================================================================

export async function createMission(missionData) {
  try {
    const {
      title,
      description,
      mission_type,
      mission_key,
      target_count,
      points_reward,
      frequency = 'daily',
      icon,
      is_active = true,
      show_in_progress_panel = true,
      display_order = 0
    } = missionData;

    const { data, error } = await supabase
      .from('daily_missions')
      .insert({
        title,
        description,
        mission_type,
        mission_key,
        target_count,
        points_reward,
        frequency,
        icon,
        is_active,
        show_in_progress_panel,
        display_order
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, mission: data, message: 'Misión creada exitosamente' };
  } catch (error) {
    console.error('Error creando misión:', error);
    return { success: false, error: error.message };
  }
}

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

    return { success: true, mission: data, message: 'Misión actualizada exitosamente' };
  } catch (error) {
    console.error('Error actualizando misión:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteMission(missionId) {
  try {
    const { error } = await supabase
      .from('daily_missions')
      .delete()
      .eq('id', missionId);

    if (error) throw error;

    return { success: true, message: 'Misión eliminada exitosamente' };
  } catch (error) {
    console.error('Error eliminando misión:', error);
    return { success: false, error: error.message };
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

    return { success: true, message: 'Misiones reordenadas exitosamente' };
  } catch (error) {
    console.error('Error reordenando misiones:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

export async function canCompleteMissionToday(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('mission_progress')
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

    return { success: true, resetCount: data?.reset_count || 0, message: `${data?.reset_count || 0} misiones reseteadas` };
  } catch (error) {
    console.error('Error reseteando misiones diarias:', error);
    return { success: false, error: error.message };
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
  getMissionsForProgressPanel,
  getTopMissions,

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
