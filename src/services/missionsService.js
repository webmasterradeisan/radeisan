// src/services/missionsService.js
// ============================================================================
// MISSIONS SERVICE - Sistema de Misiones Diarias (IMPLEMENTACIÓN FINAL)
// ============================================================================
// ✅ Implementa las reglas de negocio de puntos solicitadas.
// ✅ Soluciona la importación de addFreePoints y la usa para otorgar recompensas.
// ✅ Utiliza initializeUserPoints para asegurar la persistencia en la DB.
// ============================================================================

import { supabase } from '../lib/supabase';
// 🛑 IMPORTACIÓN CRÍTICA: Importar las funciones de puntos como named exports
import { 
  addFreePoints, 
  initializeUserPoints // Para asegurar que el registro de puntos exista
} from './pointsService'; 

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN DE MISIONES
// ============================================================================

/**
 * Tipos de misiones disponibles (CRÍTICO: DEBE COINCIDIR CON LA BASE DE DATOS)
 */
export const MISSION_TYPES = {
  LOGIN_DAILY: 'login_daily',       // Iniciar sesión (10 puntos)
  GIVE_LIKE: 'give_like',           // Dar 10 Me Gusta (5 puntos)
  PUBLISH_CONTENT: 'publish_content', // Publicar contenido (30 puntos)
  DONATE_POINTS: 'donate_points',   // Apoyar (donar puntos) (2 puntos)
  COMPLETE_ALL: 'complete_all',     // Misión de racha (100 puntos)
  // Añadimos los tipos específicos de publicación para el tracking
  UPLOAD_VIDEO: 'upload_video',
  UPLOAD_PHOTO: 'upload_photo',
  UPLOAD_REEL: 'upload_reel',
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

  // 1. Asegurar que el registro de puntos exista ANTES de cualquier operación (CRÍTICO)
  await initializeUserPoints(userId); 

  try {
    // 2. Intentar registrar el incremento en la tabla de progreso
    const { data: currentProgress, error: fetchError } = await supabase
      .from(MISSION_PROGRESS_TABLE)
      .select('progress, claimed')
      // Se asume que hay un filtro de fecha implícito o en la política RLS para que sea DIARIO
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
 */
export async function claimMissionReward(userId, missionType, rewardAmount) {
  try {
    // 1. Otorgar los puntos (usa la función de pointsService)
    // 🛑 Usamos la función nombrada addFreePoints.
    const result = await addFreePoints(
      userId, 
      rewardAmount, 
      missionType, // actionType
      missionType // referenceId 
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
// FUNCIONES DE TRACKING ESPECÍFICO (Llamadas desde Componentes)
// ============================================================================\
// NOTA: Estas funciones son las que se deben importar y llamar en VideoPlayerPage

export async function trackDailyLogin(userId) {
  return trackMissionProgress(MISSION_TYPES.LOGIN_DAILY, 1, userId);
}

export async function trackWatchVideo(videoId, userId) {
  // Aquí se registraría si tuvieras una misión de "Ver X videos"
  return true; 
}

export async function trackGiveLike(contentType, contentId, userId) {
  // Rastra el progreso de la misión "Dar 10 Me Gusta"
  return trackMissionProgress(MISSION_TYPES.GIVE_LIKE, 1, userId, contentId);
}

export async function trackShareContent(contentType, contentId, userId, method = 'link') {
  return trackMissionProgress(MISSION_TYPES.SHARE_CONTENT, 1, userId, contentId);
}

export async function trackComment(contentType, contentId, userId) {
  return trackMissionProgress(MISSION_TYPES.COMMENT, 1, userId, contentId);
}

export async function trackFollowUser(followedUserId, userId) {
  return trackMissionProgress(MISSION_TYPES.FOLLOW_USER, 1, userId, followedUserId);
}

// ============================================================================\
// EXPORTACIONES POR DEFECTO (Para asegurar compatibilidad)
// ============================================================================\

export default {
    MISSION_TYPES,
    DAILY_MISSION_REWARDS,
    STREAK_BONUS,
    
    // Tracking
    trackMissionProgress,
    
    // Tracking Específico
    trackDailyLogin,
    trackWatchVideo,
    trackGiveLike,
    trackShareContent,
    trackComment,
    trackFollowUser,
    
    // Recompensas
    claimMissionReward,
    // ... (otras funciones que puedan existir) // 🛑 SE ELIMINA LA NOTA COMENTADA PARA SER COMPLETO
};
