// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - Sistema de Misiones Diarias (IMPLEMENTACIÓN FINAL)
// ============================================================================
// ✅ Implementa las reglas de negocio de puntos solicitadas (10, 5, 30, 2, 100).
// ✅ Usa addFreePoints del servicio de puntos.
// ✅ Define la estructura de misiones y recompensas.
// ============================================================================

import { supabase } from '../lib/supabase';
// 🛑 Importamos específicamente las funciones de puntos que usaremos
import { 
  addFreePoints, 
  initializeUserPoints 
} from './pointsService'; 

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN DE MISIONES
// ============================================================================

/**
 * Tipos de misiones disponibles (CRÍTICO: DEBE COINCIDIR CON LA BASE DE DATOS)
 */
export const MISSION_TYPES = {
  LOGIN_DAILY: 'login_daily',       // Iniciar sesión
  GIVE_LIKE: 'give_like',           // Dar Me Gusta
  PUBLISH_CONTENT: 'publish_content', // Publicar video/foto/reel
  DONATE_POINTS: 'donate_points',   // Apoyar (donar puntos)
  COMPLETE_ALL: 'complete_all',     // Misión de racha
};

/**
 * Tabla de recompensas y objetivos fijos para misiones
 */
const DAILY_MISSION_REWARDS = {
  [MISSION_TYPES.LOGIN_DAILY]: { target: 1, points: 10, action_type: 'login' },
  [MISSION_TYPES.GIVE_LIKE]: { target: 10, points: 5, action_type: 'like' },
  [MISSION_TYPES.PUBLISH_CONTENT]: { target: 3, points: 30, action_type: 'upload' }, // 1 Video, 1 Foto, 1 Reel = 3
  [MISSION_TYPES.DONATE_POINTS]: { target: 5, points: 2, action_type: 'donation' }, // 5 puntos donados ganan 2
};

const STREAK_BONUS = {
    target_days: 10,
    points: 100, // Bono de 100 puntos por 10 días de racha
};

const MISSION_PROGRESS_TABLE = 'user_mission_progress';


// ============================================================================
// LÓGICA CORE DE TRACKING Y RECOMPENSAS
// ============================================================================

/**
 * Función genérica para registrar el progreso de una misión
 * @param {string} type - Tipo de misión (ej: 'give_like')
 * @param {number} increment - Cantidad a sumar al progreso (generalmente 1)
 * @param {string} userId - ID del usuario
 * @param {string | null} referenceId - ID del objeto relacionado (video ID, etc.)
 */
export async function trackMissionProgress(type, increment, userId, referenceId = null) {
  if (!userId || !type) return;

  const config = DAILY_MISSION_REWARDS[type];
  if (!config) {
      console.warn(`⚠️ Misión desconocida: ${type}`);
      return;
  }

  // 1. Asegurar que el registro de puntos exista ANTES de cualquier operación
  await initializeUserPoints(userId); 

  try {
    // 2. Intentar registrar el incremento en la tabla de progreso
    const { data: currentProgress, error: fetchError } = await supabase
      .from(MISSION_PROGRESS_TABLE)
      .select('progress, claimed')
      .eq('user_id', userId)
      .eq('mission_type', type)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    let newProgress = (currentProgress?.progress || 0) + increment;
    let claimed = currentProgress?.claimed || false;
    let isCompleted = newProgress >= config.target;

    // 3. Actualizar la DB (o crear el registro si no existe)
    const { error: updateError } = await supabase
      .from(MISSION_PROGRESS_TABLE)
      .upsert({
        user_id: userId,
        mission_type: type,
        progress: Math.min(newProgress, config.target), // Limitar progreso al objetivo
        claimed: claimed,
        target: config.target,
        is_completed: isCompleted,
      }, { onConflict: ['user_id', 'mission_type'] });

    if (updateError) throw updateError;
    
    // 4. Otorgar recompensa si se completó y no ha sido reclamada
    if (isCompleted && !claimed) {
      console.log(`🏆 Misión completada: ${type}. Recompensa: ${config.points} Free Points.`);
      await claimMissionReward(userId, type, config.points);
    }

  } catch (error) {
    console.error(`❌ Error en trackMissionProgress (${type}):`, error);
  }
}

/**
 * Reclama la recompensa de una misión completada.
 * @param {string} userId - ID del usuario
 * @param {string} missionType - Tipo de misión
 * @param {number} rewardAmount - Cantidad de puntos a otorgar
 */
export async function claimMissionReward(userId, missionType, rewardAmount) {
  try {
    // 1. Otorgar los puntos (usa la función del servicio)
    const result = await addFreePoints(
      userId, 
      rewardAmount, 
      missionType, // actionType
      missionType // referenceId (para misiones, el ID es el tipo)
    );

    if (result.success) {
      // 2. Marcar como reclamada en la DB
      await supabase
        .from(MISSION_PROGRESS_TABLE)
        .update({ claimed: true })
        .eq('user_id', userId)
        .eq('mission_type', missionType);
    }

    return result;

  } catch (error) {
    console.error(`❌ Fallo al reclamar recompensa de ${missionType}:`, error);
    return { success: false, error: error.message };
  }
}


// ============================================================================\
// FUNCIONES DE TRACKING ESPECÍFICO (Llamadas desde VideoPlayerPage)
// ============================================================================\

export async function trackDailyLogin(userId) {
  return trackMissionProgress(MISSION_TYPES.LOGIN_DAILY, 1, userId);
}

export async function trackWatchVideo(videoId, userId) {
  // Asumimos que la recompensa por vista (30s) se maneja directamente en VideoPlayerPage/addPoints
  // Aquí solo registramos el progreso de la misión de vista (si existiera una misión de 'ver X videos').
  // Para la misión de 30 segundos, el punto se da en el front-end, pero si hubiese una misión de "Ver 5 videos", la registramos aquí:
  // return trackMissionProgress(MISSION_TYPES.WATCH_VIDEO, 1, userId, videoId);
  return true; // No rastreamos progreso de misiones aquí, solo recompensas directas.
}

export async function trackGiveLike(contentType, contentId, userId) {
  return trackMissionProgress(MISSION_TYPES.GIVE_LIKE, 1, userId, contentId);
}

export async function trackShareContent(contentType, contentId, userId, method = 'link') {
  return trackMissionProgress(MISSION_TYPES.SHARE_CONTENT, 1, userId, contentId);
}

export async function trackComment(contentType, contentId, userId) {
  // Asumimos que el punto de comentario se da directamente en VideoPlayerPage/addPoints
  return trackMissionProgress(MISSION_TYPES.COMMENT, 1, userId, contentId);
}

export async function trackFollowUser(followedUserId, userId) {
  return trackMissionProgress(MISSION_TYPES.FOLLOW_USER, 1, userId, followedUserId);
}

// Misión de donación (ejemplo)
export async function trackDonatePoints(amountDonated, userId) {
    if (amountDonated >= DAILY_MISSION_REWARDS[MISSION_TYPES.DONATE_POINTS].target) {
        return trackMissionProgress(
            MISSION_TYPES.DONATE_POINTS, 
            1, 
            userId, 
            `donation_${Date.now()}`
        );
    }
    return false;
}

// ============================================================================\
// LÓGICA DE BONIFICACIÓN DE RACHA (STREAK)
// ============================================================================\

export async function checkStreakBonus(userId) {
    // 1. Obtener el progreso de la racha (ej. de la tabla 'user_streaks')
    const { data, error } = await supabase
        .from('user_streaks')
        .select('current_streak, last_checked_date')
        .eq('user_id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('❌ Error al verificar racha:', error);
        return;
    }

    const currentStreak = data?.current_streak || 0;

    // 2. Verificar si se cumplió la meta de 10 días
    if (currentStreak >= STREAK_BONUS.target_days) {
        
        // 3. Otorgar el bono de 100 puntos y resetear la racha
        console.log(`🎁 Bono de racha de ${STREAK_BONUS.target_days} días para ${userId}`);
        await addFreePoints(
            userId, 
            STREAK_BONUS.points, 
            MISSION_TYPES.COMPLETE_ALL, 
            `streak_${STREAK_BONUS.target_days}_${Date.now()}`
        );
        
        // 4. Resetear el contador de racha
        await supabase
            .from('user_streaks')
            .update({ current_streak: 0, last_checked_date: new Date().toISOString() })
            .eq('user_id', userId);
    }
}


// ============================================================================\
// EXPORTACIONES POR DEFECTO
// ============================================================================\

export default {
    MISSION_TYPES,
    DAILY_MISSION_REWARDS,
    STREAK_BONUS,
    
    // Tracking
    trackMissionProgress,
    trackDailyLogin,
    trackWatchVideo,
    trackGiveLike,
    trackShareContent,
    trackComment,
    trackFollowUser,
    trackDonatePoints,
    
    // Recompensas
    claimMissionReward,
    checkStreakBonus,
    
    // ... (otras funciones que pueda tener el servicio)
};
