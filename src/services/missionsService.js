// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - BLINDADO
// ✅ Retorna respuestas completas del RPC para manejar 'already_tracked'.
// ✅ Mapeo correcto de tipos (reel -> like_reel).
// ============================================================================

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

/**
 * Función genérica para llamar al RPC blindado
 */
async function callTrackingRpc(missionType, contentId) {
  try {
    const { data, error } = await supabase.rpc('track_mission_event', {
      p_mission_type: missionType,
      p_content_id: contentId || 'generic'
    });

    if (error) throw error;
    return data; // { status: 'success' | 'already_tracked', ... }
  } catch (error) {
    console.error(`Error tracking ${missionType}:`, error);
    throw error;
  }
}

export const trackGiveLike = async (contentType, contentId) => {
  // Convertir 'reel' -> 'like_reel', 'video' -> 'like_video'
  // El backend unificará todo a 'give_like', pero enviamos el específico por claridad.
  const missionType = contentType === 'reel' ? 'like_reel' : 
                      contentType === 'photo' ? 'like_photo' : 'like_video';
                      
  return await callTrackingRpc(missionType, contentId);
};

export const trackWatchVideo = async (contentType, contentId, duration) => {
  // La lógica de tiempo se maneja en el frontend/hook, aquí solo registramos el evento
  // si cumple con el criterio.
  const missionType = contentType === 'reel' ? 'watch_reel' : 'watch_video';
  return await callTrackingRpc(missionType, contentId);
};

export const trackComment = async (contentType, contentId) => {
  const missionType = contentType === 'photo' ? 'comment_photo' : 'comment_videos';
  return await callTrackingRpc(missionType, contentId);
};

export const trackShareContent = async (contentType, contentId, count = 1, metadata = {}) => {
  // El RPC actual ignora metadata, pero lo dejamos preparado
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
    // Traemos las misiones y el progreso del usuario en una sola llamada eficiente
    // O hacemos un join manual si no tienes una vista preparada.
    
    // 1. Misiones Activas
    const { data: missions, error: mError } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
      
    if (mError) throw mError;

    // 2. Progreso de HOY
    const today = new Date().toISOString().split('T')[0];
    const { data: progress, error: pError } = await supabase
      .from('mission_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);

    if (pError) throw pError;

    // 3. Combinar
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

// ============================================================================
// UTILIDADES
// ============================================================================
export const calculateMissionProgress = (current, target) => {
  if (!target || target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};
