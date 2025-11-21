// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - FINAL (ANTI-FARMING & COMPATIBILIDAD)
// ============================================================================
// 1. GESTIÓN: Usa 'points_reward' (coincide con tu MissionsManagement.jsx).
// 2. TRACKING: Usa RPC 'track_mission_event' y maneja error 23505 (Anti-Farming).
// 3. LEGACY: Mantiene funciones antiguas redirigiendo al nuevo sistema.
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// CONSTANTES
// ============================================================================

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

export const MISSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  LOCKED: 'locked'
};

export const MISSION_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time'
};

// ============================================================================
// CONSULTAS (ADMIN Y USUARIO)
// ============================================================================

export async function getAllMissions() {
  try {
    // Intentamos obtener todas las misiones.
    // Si tienes un RPC 'get_all_missions_admin', úsalo. Si no, hacemos un select directo.
    const { data, error } = await supabase
        .from('daily_missions')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, missions: data || [] };
  } catch (error) {
    console.error('Error obteniendo todas las misiones:', error);
    return { success: false, error: error.message, missions: [] };
  }
}

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

    (data || []).forEach(mission => {
      if (mission.status === MISSION_STATUS.COMPLETED) missions.completed.push(mission);
      else if (mission.status === MISSION_STATUS.EXPIRED) missions.expired.push(mission);
      else missions.active.push(mission);
    });

    const stats = {
      total: data?.length || 0,
      active: missions.active.length,
      completed: missions.completed.length,
      // Usamos points_reward directamente
      totalPointsEarned: missions.completed.reduce((sum, m) => sum + (m.points_reward || 0), 0)
    };

    return { success: true, missions, stats };
  } catch (error) {
    console.error('Error obteniendo misiones diarias:', error);
    return { success: false, error: error.message, missions: { active: [], completed: [], all: [] }, stats: {} };
  }
}

export async function getMissionsForProgressPanel() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Obtener misiones configuradas para mostrarse
    const { data: missions, error: missionsError } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('is_active', true)
      .eq('show_in_progress_panel', true)
      .order('display_order', { ascending: true });

    if (missionsError) throw missionsError;
    if (!missions || missions.length === 0) return { success: true, missions: [] };

    // 2. Obtener progreso de HOY
    const todayDate = new Date().toISOString().split('T')[0];
    const missionIds = missions.map(m => m.id);
    
    const { data: progressData, error: progressError } = await supabase
      .from('mission_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('mission_id', missionIds)
      .eq('date', todayDate);

    if (progressError) throw progressError;

    // 3. Combinar
    const missionsWithProgress = missions.map(mission => {
      const progress = progressData?.find(p => p.mission_id === mission.id);
      
      return {
        ...mission,
        current_count: progress?.current_count || 0,
        is_completed: progress?.is_completed || false,
        completed_at: progress?.completed_at || null,
        progress_percentage: mission.target_count > 0 
          ? Math.min(Math.round(((progress?.current_count || 0) / mission.target_count) * 100), 100)
          : 0
      };
    });

    return { success: true, missions: missionsWithProgress };
  } catch (error) {
    console.error('Error panel progreso:', error);
    return { success: false, error: error.message, missions: [] };
  }
}

// ============================================================================
// TRACKING - CORE (Anti-Farming & RPC)
// ============================================================================

/**
 * Función principal de Tracking que llama al RPC seguro.
 * Maneja el error de "unicidad" (farming) y devuelve 'already_paid'.
 */
export async function trackMissionProgress(missionType, referenceType, referenceId, amount = 1, metadata = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { result: 'error', message: 'No autenticado' };

    // Llamada al RPC seguro (track_mission_event)
    const { data, error } = await supabase.rpc('track_mission_event', {
      p_user_id: user.id,
      p_mission_type: missionType,
      p_content_id: referenceId, 
      p_metadata: { ...metadata, reference_type: referenceType }
    });

    if (error) {
      // ✅ MANEJO DE ANTI-FARMING (Error 23505: Duplicate Key)
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return { 
          result: 'already_paid', 
          points_earned: 0, 
          message: 'Ya obtuviste puntos por esta acción hoy.' 
        };
      }
      throw error;
    }

    // Interpretación de la respuesta del RPC
    if (data?.result === 'success') {
      return { result: 'success', points_earned: data.points_earned, message: `¡+${data.points_earned} Puntos!` };
    }
    if (data?.result === 'already_completed') {
      return { result: 'already_completed', points_earned: 0, message: 'Misión diaria ya completada.' };
    }
    
    return { result: 'registered', points_earned: 0, message: 'Progreso registrado.' };

  } catch (error) {
    console.error('❌ Error tracking:', error);
    return { result: 'error', points_earned: 0, message: error.message };
  }
}

// ============================================================================
// WRAPPERS LEGACY (Para no romper componentes viejos)
// ============================================================================

export async function trackWatchVideo(referenceType, referenceId, duration = 30) {
  return trackMissionProgress(MISSION_TYPES.WATCH_VIDEO, referenceType, referenceId, 1, { duration });
}

export async function trackUploadVideo(referenceId) {
  return trackMissionProgress(MISSION_TYPES.UPLOAD_VIDEO, 'video', referenceId);
}

export async function trackGiveLike(referenceType, referenceId) {
  // Convertimos a 'give_like' para el RPC
  return trackMissionProgress(MISSION_TYPES.GIVE_LIKE, referenceType, referenceId);
}

export async function trackShareContent(referenceType, referenceId, platform = 'link') {
  return trackMissionProgress(MISSION_TYPES.SHARE_CONTENT, referenceType, referenceId, 1, { platform });
}

export async function trackComment(referenceType, referenceId) {
  return trackMissionProgress(MISSION_TYPES.COMMENT, referenceType, referenceId);
}

export async function trackFollowUser(followedId) {
  return trackMissionProgress(MISSION_TYPES.FOLLOW_USER, 'user', followedId);
}

export async function trackDonatePoints(recipientId, amount) {
  return trackMissionProgress(MISSION_TYPES.DONATE_POINTS, 'donation', recipientId, 1, { amount });
}

export async function trackDailyLogin() {
  return trackMissionProgress(MISSION_TYPES.LOGIN_DAILY, 'system', 'daily_login_' + new Date().toDateString());
}

// ============================================================================
// ADMIN FUNCTIONS (CRUD)
// ============================================================================

export async function createMission(missionData) {
  try {
    const { data, error } = await supabase
      .from('daily_missions')
      .insert(missionData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, mission: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateMission(id, updates) {
  try {
    const dbUpdates = { ...updates, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('daily_missions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, mission: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteMission(id) {
  const { error } = await supabase.from('daily_missions').delete().eq('id', id);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function reorderMissions(orders) {
  try {
    await Promise.all(orders.map(o => 
      supabase.from('daily_missions').update({ display_order: o.display_order }).eq('id', o.id)
    ));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function resetDailyMissions() {
  const { data, error } = await supabase.rpc('reset_daily_mission_progress');
  return error ? { success: false, error: error.message } : { success: true, count: data };
}

// ============================================================================
// OTRAS UTILIDADES
// ============================================================================

export async function getMissionStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };
  const { data, error } = await supabase.rpc('get_user_mission_stats', { p_user_id: user.id });
  return error ? { success: false, error: error.message } : { success: true, stats: data };
}

export async function getUserStreak() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from('user_streaks').select('*').eq('user_id', user.id).single();
  return { success: true, streak: data };
}

export async function updateStreak() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('update_user_streak', { p_user_id: user.id });
  return error ? { success: false } : { success: true, streak: data };
}

export async function getStreakHistory() {
  return { success: true, history: [] }; 
}

export function getAvailableMissionIcons() {
  return ['Play', 'Upload', 'Heart', 'Share2', 'Gift', 'MessageCircle', 'UserPlus', 'CheckCircle', 'LogIn', 'Eye', 'Star', 'Trophy', 'Target', 'Zap', 'Flame', 'Video'];
}

export function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow - now;
  return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
}

export function calculateMissionProgress(current, target) {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

// EXPORT DEFAULT
export default {
  MISSION_TYPES,
  MISSION_STATUS,
  getAllMissions,
  getDailyMissions,
  trackMissionProgress,
  trackWatchVideo,
  trackUploadVideo,
  trackGiveLike,
  trackShareContent,
  trackDonatePoints,
  trackComment,
  trackFollowUser,
  trackDailyLogin,
  createMission,
  updateMission,
  deleteMission,
  resetDailyMissions,
  getAvailableMissionIcons,
  getMissionsForProgressPanel,
  getUserStreak,
  updateStreak
};
