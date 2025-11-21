// src/services/missionsService.js
import { supabase } from '../lib/supabase';

// ============================================================================
// CONSTANTES
// ============================================================================
export const MISSION_TYPES = {
  WATCH_VIDEO: 'watch_videos',
  UPLOAD_VIDEO: 'upload_video',
  GIVE_LIKE: 'give_like',
  SHARE_CONTENT: 'share_content',
  COMMENT: 'comment_videos',
  FOLLOW_USER: 'follow_user',
  DAILY_LOGIN: 'daily_login'
};

// ============================================================================
// TRACKING (NÚCLEO)
// ============================================================================

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
    throw error;
  }
}

export const trackGiveLike = async (contentType, contentId) => {
  const missionType = contentType === 'reel' ? 'like_reel' : 
                      contentType === 'photo' ? 'like_photo' : 'like_video';
  return await callTrackingRpc(missionType, contentId);
};

export const trackWatchVideo = async (contentType, contentId, duration) => {
  const missionType = contentType === 'reel' ? 'watch_reel' : 'watch_video';
  return await callTrackingRpc(missionType, contentId);
};

export const trackComment = async (contentType, contentId) => {
  const missionType = contentType === 'photo' ? 'comment_photo' : 'comment_videos';
  return await callTrackingRpc(missionType, contentId);
};

export const trackShareContent = async (contentType, contentId, count = 1, metadata = {}) => {
  return await callTrackingRpc('share_content', contentId);
};

export const trackFollowUser = async (targetUserId) => {
  return await callTrackingRpc('follow_user', targetUserId);
};

// ============================================================================
// CONSULTAS (READ)
// ============================================================================

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
    progress?.forEach(p => {
      progressMap[p.mission_id] = p;
    });

    return missions.map(m => {
      const userProgress = progressMap[m.id];
      return {
        ...m,
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

// ✅ FUNCIÓN RESTAURADA (Placeholder seguro)
export const getMissionStats = async (userId) => {
  if (!userId) return { completed: 0, total: 0 };
  return { completed: 0, total: 0 };
};

export const calculateMissionProgress = (current, target) => {
  if (!target || target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};

// ✅ EXPORT DEFAULT RESTAURADO (Para evitar pantalla blanca en otros archivos)
export default {
  MISSION_TYPES,
  trackGiveLike,
  trackWatchVideo,
  trackComment,
  trackShareContent,
  trackFollowUser,
  getMissionsForProgressPanel,
  getMissionStats,
  calculateMissionProgress
};
