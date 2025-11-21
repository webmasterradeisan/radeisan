// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - VERSIÓN "MASTER KEY" 🗝️
// ✅ FIX CRÍTICO: Se alinearon los nombres con la Base de Datos (points_rules).
//    - 'comment'/'comment_videos'  ---> AHORA ES: 'give_comment'
//    - 'share_video'               ---> AHORA ES: 'share_content'
// ============================================================================

import { supabase } from '../lib/supabase';
import * as pointsService from './pointsService';

// ============================================================================
// 1. CONSTANTES Y CONFIGURACIÓN (LA CORRECCIÓN ESTÁ AQUÍ)
// ============================================================================

/**
 * Tipos de misiones disponibles
 * Deben ser IDÉNTICOS a la columna 'action_type' en tu tabla 'points_rules'.
 */
export const MISSION_TYPES = {
  // --- ACCIONES BÁSICAS (Coinciden con DB) ---
  GIVE_LIKE: 'give_like',           
  COMMENT: 'give_comment',          // 🔥 CORREGIDO (Antes era 'comment' o 'comment_videos')
  SHARE_CONTENT: 'share_content',   // 🔥 CORREGIDO (Antes era 'share_video')
  
  // --- ACCIONES DE CARGA ---
  UPLOAD_VIDEO: 'upload_video',
  UPLOAD_REEL: 'upload_reel',
  UPLOAD_PHOTO: 'upload_photo',
  
  // --- OTRAS ---
  WATCH_VIDEO: 'watch_videos',
  DONATE_POINTS: 'donate_points',
  FOLLOW_USER: 'follow_user',
  COMPLETE_PROFILE: 'profile_complete',
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

export const MISSION_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time'
};

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
    console.error('Error obteniendo misiones:', error);
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

export async function trackMissionProgress(missionType, referenceType, referenceId, amount = 1, metadata = {}) {
  const userAuth = await supabase.auth.getUser();
  if (!userAuth.data.user) return { result: 'error', points_earned: 0, message: 'No auth' };
  
  const userId = userAuth.data.user.id;

  try {
    // LLAMADA AL RPC MAESTRO EN BASE DE DATOS
    const { data, error } = await supabase
      .rpc('track_mission_update', {
        p_user_id: userId,
        p_mission_type: missionType, // Ahora envía 'give_comment', 'share_content', etc.
        p_content_id: referenceId, 
        p_metadata: {
            reference_type: referenceType,
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

// --- WRAPPERS (FUNCIONES CORTAS) ---

export async function trackWatchVideo(referenceType, referenceId, watchDuration = 30) {
  return trackMissionProgress(MISSION_TYPES.WATCH_VIDEO, referenceType, referenceId, 1, { watch_duration: watchDuration });
}

export async function trackUploadVideo(referenceId) {
  return trackMissionProgress(MISSION_TYPES.UPLOAD_VIDEO, 'video', referenceId, 1, {});
}

export async function trackGiveLike(referenceType, referenceId) {
  return trackMissionProgress(MISSION_TYPES.GIVE_LIKE, referenceType, referenceId);
}

// 🔥 AHORA SÍ USA EL TIPO CORRECTO: 'share_content'
export async function trackShareContent(referenceType, referenceId, platform = 'link') {
  return trackMissionProgress(MISSION_TYPES.SHARE_CONTENT, referenceType, referenceId, 1, { platform: platform });
}

export async function trackDonatePoints(recipientId, pointsAmount) {
  return trackMissionProgress(MISSION_TYPES.DONATE_POINTS, 'donation', recipientId, 1, { recipient_id: recipientId, points_amount: pointsAmount });
}

// 🔥 AHORA SÍ USA EL TIPO CORRECTO: 'give_comment'
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
  trackDailyLogin
};
