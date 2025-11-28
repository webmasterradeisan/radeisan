// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - VERSIÓN MAESTRA SINCRONIZADA 🔗
// ✅ FIX CRÍTICO: Claves alineadas con la Base de Datos (points_rules).
// ✅ Incluye exportación de getMissionStats para evitar error de compilación.
// ✅ AÑADIDO: Función resetDailyMissions para solucionar el error de compilación.
// ✅ FIX PARÁMETROS RPC: p_reference_type en lugar de p_content_id (línea 239)
// ============================================================================

import { supabase } from '../lib/supabase';
import * as pointsService from './pointsService';

// ============================================================================
// 1. CONSTANTES Y CONFIGURACIÓN (DICCIONARIO CORREGIDO)
// ============================================================================

/**
 * Tipos de misiones disponibles
 * ⚠️ IMPORTANTE: Estos valores deben ser IDÉNTICOS a la columna 'action_type'
 * en la tabla 'points_rules' de Supabase.
 */
export const MISSION_TYPES = {
  // --- INTERACCIONES (Coinciden con points_rules) ---
  GIVE_LIKE: 'give_like',           
  COMMENT: 'give_comment',          // ✅ CORREGIDO (DB espera 'give_comment')
  SHARE_CONTENT: 'share_content',   // ✅ CORREGIDO (DB espera 'share_content')
  DONATE_POINTS: 'donate_points',
  
  // --- CONSUMO ---
  WATCH_VIDEO: 'watch_video',       // ✅ Singular (Estándar histórico)
  WATCH_REELS: 'watch_reels',       
  
  // --- CREACIÓN ---
  UPLOAD_VIDEO: 'upload_video',
  UPLOAD_REEL: 'upload_reel',
  UPLOAD_PHOTO: 'upload_photo',
  UPLOAD_PACK: 'upload_pack',
  
  // --- USUARIO ---
  FOLLOW_USER: 'follow_user',
  COMPLETE_PROFILE: 'profile_complete', // ✅ CORREGIDO (DB espera 'profile_complete')
  LOGIN_DAILY: 'login_daily',
  INVITE_FRIEND: 'invite_friend',
  
  // --- ESPECIALES ---
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
// UTILIDAD PRIVADA
// ============================================================================
const mapMissionData = (mission) => {
  if (!mission) return null;
  return {
    ...mission,
    points_reward: mission.points_reward,
    reward_points: mission.points_reward 
  };
};

// ============================================================================
// FUNCIONES DE CONSULTA (GET)
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
    const missions = { active: [], completed: [], expired: [], all: mappedData };

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

export async function getAllMissions() {
  try {
    const { data, error } = await supabase.rpc('get_all_missions_admin');
    if (error) throw error;
    return { success: true, missions: data.map(mapMissionData) || [] };
  } catch (error) {
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
    if (!user) throw new Error('Usuario');
    const { data, error } = await supabase
      .from('mission_progress')
      .select(`*, mission:daily_missions (*)`)
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, progress: data || null };
  } catch (error) {
    return { success: false, error: error.message, progress: null };
  }
}

// ============================================================================
// FUNCIONES DE TRACKING (REGISTRO DE ACCIONES)
// ============================================================================

/**
 * Registrar progreso en una misión
 * Llama al RPC maestro 'track_mission_update'
 */
export async function trackMissionProgress(missionType, referenceType, referenceId, amount = 1, metadata = {}) {
  const userAuth = await supabase.auth.getUser();
  if (!userAuth.data.user) return { result: 'error', points_earned: 0, message: 'No auth' };
  
  const userId = userAuth.data.user.id;

  try {
    // 🔥 FIX CRÍTICO: Usar p_reference_type en lugar de p_content_id
    const { data, error } = await supabase
      .rpc('track_mission_update', {
        p_user_id: userId,
        p_mission_type: missionType, 
        p_reference_type: referenceType,  // ✅ CORREGIDO: era p_content_id
        p_metadata: {
            reference_id: referenceId,
            ...metadata
        }
      });

    if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) { 
             return { result: 'already_paid', points_earned: 0, message: 'Ya registrado.' };
        }
        throw error;
    }
    
    const result = data?.result || 'registered';
    const earned = data?.points_earned || 0;
    
    return { 
        result: result, 
        points_earned: earned, 
        message: data?.message || (earned > 0 ? `+${earned} Puntos` : 'Registrado')
    };

  } catch (error) {
    console.error('❌ [trackMissionProgress] Error:', error);
    throw error; 
  }
}

// --- WRAPPERS (Usan las constantes corregidas) ---

export async function trackWatchVideo(referenceType, referenceId, watchDuration = 30) {
  return trackMissionProgress(MISSION_TYPES.WATCH_VIDEO, referenceType, referenceId, 1, { watch_duration: watchDuration });
}

export async function trackUploadVideo(referenceId) {
  return trackMissionProgress(MISSION_TYPES.UPLOAD_VIDEO, 'video', referenceId, 1, {});
}

export async function trackGiveLike(referenceType, referenceId) {
  return trackMissionProgress(MISSION_TYPES.GIVE_LIKE, referenceType, referenceId);
}

// ✅ USA MISSION_TYPES.SHARE_CONTENT ('share_content')
export async function trackShareContent(referenceType, referenceId, platform = 'link') {
  return trackMissionProgress(MISSION_TYPES.SHARE_CONTENT, referenceType, referenceId, 1, { platform: platform });
}

export async function trackDonatePoints(recipientId, pointsAmount) {
  return trackMissionProgress(MISSION_TYPES.DONATE_POINTS, 'donation', recipientId, 1, { recipient_id: recipientId, points_amount: pointsAmount });
}

// ✅ USA MISSION_TYPES.COMMENT ('give_comment')
export async function trackComment(referenceType, referenceId) {
  return trackMissionProgress(MISSION_TYPES.COMMENT, referenceType, referenceId);
}

export async function trackFollowUser(followedUserId) {
  return trackMissionProgress(MISSION_TYPES.FOLLOW_USER, 'user', followedUserId, 1, { followed_user_id: followedUserId });
}

export async function trackDailyLogin() {
  return trackMissionProgress(MISSION_TYPES.LOGIN_DAILY, 'system', 'daily_login_' + new Date().toDateString(), 1, { login_timestamp: new Date().toISOString() });
}

// ============================================================================
// FUNCIONES DE ESTADÍSTICAS (Exportación garantizada)
// ============================================================================

export async function getMissionStats() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, stats: {} };

    const { data, error } = await supabase
      .rpc('get_user_mission_stats', { p_user_id: user.id });

    if (error) throw error;

    return { success: true, stats: data || {} };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
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
// FUNCIONES DE COMPLETADO Y RACHAS
// ============================================================================

export async function completeMission(missionId, options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    const { grantReward = true, bonusPoints = 0 } = options;
    const { data, error } = await supabase.rpc('complete_user_mission', { p_user_id: user.id, p_mission_id: missionId, p_grant_reward: grantReward, p_bonus_points: bonusPoints });
    if (error) throw error;
    return { success: true, data, message: 'Misión completada' };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function claimMissionReward(missionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    const { data, error } = await supabase.rpc('claim_mission_reward', { p_user_id: user.id, p_mission_id: missionId });
    if (error) throw error;
    return { success: true, pointsEarned: data?.points_earned || 0, message: 'Recompensa reclamada' };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function getUserStreak() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, streak: null };
  const { data, error } = await supabase.from('user_streaks').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).single();
  if (error && error.code !== 'PGRST116') console.error(error);
  return { success: true, streak: data || null };
}

export async function updateStreak() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };
  const { data, error } = await supabase.rpc('update_user_streak', { p_user_id: user.id });
  if (error) return { success: false, error: error.message };
  return { success: true, streak: data };
}

export async function getStreakHistory(limit = 30) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };
  const { data } = await supabase.from('user_streaks').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(limit);
  return { success: true, history: data || [] };
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================
export async function createMission(d) { const { error, data } = await supabase.from('daily_missions').insert(d).select().single(); return error ? { success: false, error: error.message } : { success: true, mission: data }; }
export async function updateMission(id, u) { const { error, data } = await supabase.from('daily_missions').update({...u, updated_at: new Date()}).eq('id', id).select().single(); return error ? { success: false, error: error.message } : { success: true, mission: data }; }
export async function deleteMission(id) { const { error } = await supabase.from('daily_missions').delete().eq('id', id); return error ? { success: false, error: error.message } : { success: true }; }
export async function toggleMissionActive(id, a) { return updateMission(id, { is_active: a }); }
export async function reorderMissions(orders) { await Promise.all(orders.map(({id, o}) => supabase.from('daily_missions').update({display_order: o}).eq('id', id))); return { success: true }; }

// ✅ NUEVO: FUNCIÓN PARA SOLUCIONAR EL ERROR DE COMPILACIÓN
/**
 * Función administrativa para reiniciar el estado de las misiones diarias para todos los usuarios.
 * Asume que existe un RPC o una función de base de datos para manejar la lógica de reinicio.
 */
export async function resetDailyMissions() {
  try {
    // ⚠️ ATENCIÓN: Esta función puede tomar tiempo y potencialmente requerir permisos elevados.
    // Asumimos que existe un RPC en Supabase llamado 'reset_all_daily_missions'.
    const { data, error } = await supabase.rpc('reset_all_daily_missions');

    if (error) {
      console.error('❌ Error al reiniciar misiones:', error);
      throw error;
    }

    return { success: true, message: data?.message || 'Misiones diarias reiniciadas exitosamente.' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// UTILS
// ============================================================================
export function getAvailableMissionIcons() { return ['Play', 'Upload', 'Heart', 'Share2', 'Gift', 'MessageCircle', 'UserPlus', 'CheckCircle', 'LogIn', 'Eye', 'Star', 'Trophy', 'Target', 'Zap', 'Flame']; }
export function getTimeUntilReset() { const now = new Date(); const t = new Date(now); t.setDate(t.getDate()+1); t.setHours(0,0,0,0); const d = t-now; return `${Math.floor(d/36e5)}h ${Math.floor((d%36e5)/6e4)}m`; }
export function calculateMissionProgress(c, t) { return t===0?0:Math.min(Math.round((c/t)*100),100); }

// ============================================================================
// EXPORTACIONES DEFAULT
// ============================================================================

export default {
  MISSION_TYPES,
  MISSION_STATUS,
  MISSION_FREQUENCY,
  STREAK_BONUSES,
  getDailyMissions,
  getAllMissions,
  getMissionProgress,
  getMissionsForProgressPanel,
  trackMissionProgress,
  trackWatchVideo,
  trackUploadVideo,
  trackGiveLike,
  trackShareContent,
  trackDonatePoints,
  trackComment,
  trackFollowUser,
  trackDailyLogin,
  completeMission,
  claimMissionReward,
  getUserStreak,
  updateStreak,
  getStreakHistory,
  getMissionStats,
  getTopMissions,
  createMission,
  updateMission,
  deleteMission,
  toggleMissionActive,
  reorderMissions,
  resetDailyMissions,
  getAvailableMissionIcons,
  getTimeUntilReset,
  calculateMissionProgress
};
