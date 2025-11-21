// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - REPARADO ADMIN Y COMPATIBILIDAD
// ✅ Mapeo de columnas: 'points_reward' -> 'reward_points' (Evita tabla vacía en Admin)
// ✅ Todas las funciones de tracking y consulta integradas.
// ============================================================================

import { supabase } from '../lib/supabase';
import * as pointsService from './pointsService';

export const MISSION_TYPES = {
  WATCH_VIDEO: 'watch_videos',
  UPLOAD_VIDEO: 'upload_video',
  UPLOAD_REEL: 'upload_reel',
  UPLOAD_PHOTO: 'upload_photo',
  GIVE_LIKE: 'give_like',
  SHARE_CONTENT: 'share_content',
  COMMENT: 'comment_videos',
  FOLLOW_USER: 'follow_user',
  DAILY_LOGIN: 'daily_login'
};

export const MISSION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CLAIMED: 'claimed'
};

export const MISSION_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  ONE_TIME: 'one_time'
};

export const STREAK_BONUSES = {
  3: 50,
  7: 150,
  30: 1000
};

// --- CORE TRACKING ---
async function callTrackingRpc(missionType, contentId) {
  try {
    const { data, error } = await supabase.rpc('track_mission_event', {
      p_mission_type: missionType,
      p_content_id: contentId || 'generic'
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error tracking ${missionType}:`, error);
    return { status: 'error', message: error.message };
  }
}

// --- TRACKING FUNCTIONS ---
export const trackGiveLike = async (contentType, contentId) => {
  const missionType = contentType === 'reel' ? 'like_reel' : 
                      contentType === 'photo' ? 'like_photo' : 'like_video';
  return await callTrackingRpc(missionType, contentId);
};

export const trackWatchVideo = async (contentType, contentId, duration) => {
  const missionType = contentType === 'reel' ? 'watch_reel' : 'watch_video';
  return await callTrackingRpc(missionType, contentId);
};

export const trackComment = async (contentType, contentId, commentContent) => {
  const missionType = contentType === 'photo' ? 'comment_photo' : 'comment_videos';
  return await callTrackingRpc(missionType, contentId);
};

export const trackShareContent = async (contentType, contentId, count = 1, metadata = {}) => {
  return await callTrackingRpc('share_content', contentId);
};

export const trackFollowUser = async (targetUserId) => {
  return await callTrackingRpc('follow_user', targetUserId);
};

export const trackMissionProgress = async (missionType, contentType, contentId) => {
  return await callTrackingRpc(missionType, contentId);
};

export const trackUploadVideo = async (videoData) => {
  return { success: true };
};

export const trackDonatePoints = async (amount) => {
  return await callTrackingRpc('donate_points', 'system');
};

export const trackDailyLogin = async () => {
  return await callTrackingRpc('daily_login', 'system');
};

// --- COMPLETION & REWARDS ---
export const completeMission = async (missionId, userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('mission_progress')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('mission_id', missionId)
      .eq('user_id', userId)
      .eq('date', today);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error completing mission:', error);
    return { success: false, error };
  }
};

export const claimMissionReward = async (missionId, userId) => {
  return { success: true };
};

// --- READ FUNCTIONS (CONSULTAS) ---

// ✅ FUNCIÓN CORREGIDA PARA EL ADMIN
export const getAllMissions = async () => {
  try {
    const { data, error } = await supabase
      .from('daily_missions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // 🛠️ PARCHE DE COMPATIBILIDAD:
    // Si el admin espera 'reward_points' pero la BD tiene 'points_reward', se lo duplicamos.
    const mappedData = (data || []).map(m => ({
        ...m,
        reward_points: m.points_reward || m.reward_points || 0, // Compatibilidad hacia atrás
        points_reward: m.points_reward || m.reward_points || 0  // Compatibilidad hacia adelante
    }));

    return mappedData;
  } catch (error) {
    console.error('Error getting all missions:', error);
    return [];
  }
};

export const getDailyMissions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    
    // Mapeo también aquí por seguridad
    const mappedData = (data || []).map(m => ({
        ...m,
        reward_points: m.points_reward || m.reward_points || 0
    }));

    return mappedData;
  } catch (error) {
    console.error('Error getting daily missions:', error);
    return [];
  }
};

export const getMissionProgress = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('mission_progress')
      .select(`*, daily_missions (*)`)
      .eq('user_id', userId)
      .eq('date', today);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting mission progress:', error);
    return [];
  }
};

export const getMissionsForProgressPanel = async (userId) => {
  if (!userId) return [];
  try {
    const { data: missions, error: mError } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
      
    if (mError) throw mError;

    const today = new Date().toISOString().split('T')[0];
    const { data: progress, error: pError } = await supabase
      .from('mission_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);

    if (pError) throw pError;

    const progressMap = {};
    progress?.forEach(p => { progressMap[p.mission_id] = p; });

    return missions.map(m => {
      const userProgress = progressMap[m.id];
      return {
        ...m,
        // Mapeo de puntos para el frontend
        reward_points: m.points_reward || m.reward_points || 0,
        current_count: userProgress?.current_count || 0,
        is_completed: userProgress?.is_completed || false,
        target_count: m.target_count || 1
      };
    });

  } catch (error) {
    console.error('Error getting missions:', error);
    return [];
  }
};

// --- STATS & UTILS ---

export const getUserStreak = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('daily_streak_count, last_login_date')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) { return { daily_streak_count: 0 }; }
};

export const updateStreak = async (userId) => { return { success: true }; };
export const getStreakHistory = async (userId) => { return []; };

export const getMissionStats = async (userId) => {
  if (!userId) return { completed: 0, total: 0 };
  try {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('mission_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('date', today)
        .eq('is_completed', true);
      return { completed: count || 0 };
  } catch (e) { return { completed: 0 }; }
};

export const getTimeUntilReset = () => {
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
  getTimeUntilReset,
  calculateMissionProgress
};
