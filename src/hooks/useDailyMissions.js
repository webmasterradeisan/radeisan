// ============================================================================
// USE DAILY MISSIONS HOOK - Hook Personalizado de React
// ============================================================================
// Hook para gestionar el sistema de misiones diarias desde componentes React
// Proporciona estado, funciones de tracking, y utilidades para la UI
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as missionsService from '../services/missionsService';

// ============================================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================================

const DEFAULT_OPTIONS = {
  autoLoad: true,              // Cargar misiones automáticamente al montar
  autoRefresh: false,          // Refrescar automáticamente
  refreshInterval: 60000,      // Intervalo de refresh (1 minuto)
  includeCompleted: true,      // Incluir misiones completadas
  includeExpired: false,       // Incluir misiones expiradas
  loadStreak: true,            // Cargar info de racha
  loadStats: true,             // Cargar estadísticas
  trackLoginOnMount: false     // Registrar login al montar (usar con cuidado)
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook personalizado para gestionar misiones diarias
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Estado y funciones del sistema de misiones
 */
export function useDailyMissions(options = {}) {
  // Merge de opciones con defaults
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Context de autenticación
  const { user } = useAuth();

  // ============================================================================
  // ESTADO
  // ============================================================================

  // Misiones
  const [missions, setMissions] = useState({
    active: [],
    completed: [],
    expired: [],
    all: []
  });

  // Estadísticas de misiones
  const [missionStats, setMissionStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    completionRate: 0,
    totalPointsEarned: 0,
    allCompleted: false
  });

  // Racha del usuario
  const [streak, setStreak] = useState({
    current_streak: 0,
    longest_streak: 0,
    total_days_active: 0,
    last_activity_date: null,
    next_bonus: null
  });

  // Estadísticas generales
  const [stats, setStats] = useState({});

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Refs para timers
  const refreshTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // ============================================================================
  // FUNCIONES DE CARGA
  // ============================================================================

  /**
   * Cargar misiones diarias del usuario
   * @param {boolean} silent - Si es true, no muestra loading
   */
  const fetchMissions = useCallback(async (silent = false) => {
    if (!user) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const result = await missionsService.getDailyMissions({
        includeCompleted: config.includeCompleted,
        includeExpired: config.includeExpired,
        frequency: 'daily'
      });

      if (!mountedRef.current) return;

      if (result.success) {
        setMissions(result.missions);
        setMissionStats(result.stats);
      } else {
        throw new Error(result.error || 'Error cargando misiones');
      }
    } catch (err) {
      console.error('Error en fetchMissions:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, config.includeCompleted, config.includeExpired]);

  /**
   * Cargar la racha del usuario
   * @param {boolean} silent - Si es true, no muestra loading
   */
  const fetchStreak = useCallback(async (silent = false) => {
    if (!user) return;

    try {
      if (!silent) setLoading(true);

      const result = await missionsService.getUserStreak();

      if (!mountedRef.current) return;

      if (result.success) {
        setStreak(result.streak);
      } else {
        throw new Error(result.error || 'Error cargando racha');
      }
    } catch (err) {
      console.error('Error en fetchStreak:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [user]);

  /**
   * Cargar estadísticas generales
   * @param {boolean} silent - Si es true, no muestra loading
   */
  const fetchStats = useCallback(async (silent = false) => {
    if (!user) return;

    try {
      if (!silent) setLoading(true);

      const result = await missionsService.getMissionStats();

      if (!mountedRef.current) return;

      if (result.success) {
        setStats(result.stats);
      } else {
        throw new Error(result.error || 'Error cargando estadísticas');
      }
    } catch (err) {
      console.error('Error en fetchStats:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [user]);

  /**
   * Refrescar todos los datos
   */
  const refresh = useCallback(async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      setError(null);

      // Cargar todo en paralelo
      const promises = [fetchMissions(true)];
      
      if (config.loadStreak) {
        promises.push(fetchStreak(true));
      }
      
      if (config.loadStats) {
        promises.push(fetchStats(true));
      }

      await Promise.all(promises);
    } catch (err) {
      console.error('Error en refresh:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [user, fetchMissions, fetchStreak, fetchStats, config.loadStreak, config.loadStats]);

  // ============================================================================
  // FUNCIONES DE TRACKING
  // ============================================================================

  /**
   * Tracking genérico de progreso
   * @param {string} missionType - Tipo de misión
   * @param {number} amount - Cantidad de progreso
   * @param {Object} metadata - Metadata adicional
   */
  const trackProgress = useCallback(async (missionType, amount = 1, metadata = {}) => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    try {
      const result = await missionsService.trackMissionProgress(missionType, amount, metadata);

      // Si se completó una misión, refrescar datos
      if (result.completed) {
        await fetchMissions(true);
        
        if (config.loadStreak) {
          await fetchStreak(true);
        }
      }

      return result;
    } catch (err) {
      console.error('Error en trackProgress:', err);
      return { success: false, error: err.message };
    }
  }, [user, fetchMissions, fetchStreak, config.loadStreak]);

  /**
   * Tracking cuando el usuario ve un video
   * @param {string} videoId - ID del video
   * @param {number} watchDuration - Duración vista
   */
  const trackWatchVideo = useCallback(async (videoId, watchDuration) => {
    return trackProgress(
      missionsService.MISSION_TYPES.WATCH_VIDEO,
      1,
      { video_id: videoId, watch_duration: watchDuration }
    );
  }, [trackProgress]);

  /**
   * Tracking cuando el usuario sube un video
   * @param {string} videoId - ID del video
   */
  const trackUploadVideo = useCallback(async (videoId) => {
    return trackProgress(
      missionsService.MISSION_TYPES.UPLOAD_VIDEO,
      1,
      { video_id: videoId }
    );
  }, [trackProgress]);

  /**
   * Tracking cuando el usuario da like
   * @param {string} contentType - Tipo de contenido
   * @param {string} contentId - ID del contenido
   */
  const trackGiveLike = useCallback(async (contentType, contentId) => {
    return trackProgress(
      missionsService.MISSION_TYPES.GIVE_LIKE,
      1,
      { content_type: contentType, content_id: contentId }
    );
  }, [trackProgress]);

  /**
   * Tracking cuando el usuario comparte
   * @param {string} contentType - Tipo de contenido
   * @param {string} contentId - ID del contenido
   * @param {string} platform - Plataforma
   */
  const trackShareContent = useCallback(async (contentType, contentId, platform) => {
    return trackProgress(
      missionsService.MISSION_TYPES.SHARE_CONTENT,
      1,
      { content_type: contentType, content_id: contentId, platform }
    );
  }, [trackProgress]);

  /**
   * Tracking cuando el usuario dona puntos
   * @param {string} recipientId - ID del receptor
   * @param {number} pointsAmount - Cantidad de puntos
   */
  const trackDonatePoints = useCallback(async (recipientId, pointsAmount) => {
    return trackProgress(
      missionsService.MISSION_TYPES.DONATE_POINTS,
      1,
      { recipient_id: recipientId, points_amount: pointsAmount }
    );
  }, [trackProgress]);

  /**
   * Tracking cuando el usuario comenta
   * @param {string} contentType - Tipo de contenido
   * @param {string} contentId - ID del contenido
   */
  const trackComment = useCallback(async (contentType, contentId) => {
    return trackProgress(
      missionsService.MISSION_TYPES.COMMENT,
      1,
      { content_type: contentType, content_id: contentId }
    );
  }, [trackProgress]);

  /**
   * Tracking cuando el usuario sigue a alguien
   * @param {string} followedUserId - ID del usuario seguido
   */
  const trackFollowUser = useCallback(async (followedUserId) => {
    return trackProgress(
      missionsService.MISSION_TYPES.FOLLOW_USER,
      1,
      { followed_user_id: followedUserId }
    );
  }, [trackProgress]);

  /**
   * Tracking de login diario
   */
  const trackDailyLogin = useCallback(async () => {
    return trackProgress(
      missionsService.MISSION_TYPES.LOGIN_DAILY,
      1,
      { login_timestamp: new Date().toISOString() }
    );
  }, [trackProgress]);

  // ============================================================================
  // FUNCIONES DE COMPLETADO Y RECOMPENSAS
  // ============================================================================

  /**
   * Completar una misión manualmente
   * @param {string} missionId - ID de la misión
   * @param {Object} options - Opciones
   */
  const completeMission = useCallback(async (missionId, options = {}) => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    try {
      const result = await missionsService.completeMission(missionId, options);

      if (result.success) {
        await fetchMissions(true);
        
        if (config.loadStreak) {
          await fetchStreak(true);
        }
      }

      return result;
    } catch (err) {
      console.error('Error en completeMission:', err);
      return { success: false, error: err.message };
    }
  }, [user, fetchMissions, fetchStreak, config.loadStreak]);

  /**
   * Reclamar recompensa de una misión
   * @param {string} missionId - ID de la misión
   */
  const claimReward = useCallback(async (missionId) => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    try {
      const result = await missionsService.claimMissionReward(missionId);

      if (result.success) {
        await fetchMissions(true);
      }

      return result;
    } catch (err) {
      console.error('Error en claimReward:', err);
      return { success: false, error: err.message };
    }
  }, [user, fetchMissions]);

  // ============================================================================
  // FUNCIONES DE RACHAS
  // ============================================================================

  /**
   * Actualizar la racha del usuario
   */
  const updateStreak = useCallback(async () => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    try {
      const result = await missionsService.updateStreak();

      if (result.success) {
        await fetchStreak(true);
      }

      return result;
    } catch (err) {
      console.error('Error en updateStreak:', err);
      return { success: false, error: err.message };
    }
  }, [user, fetchStreak]);

  /**
   * Obtener historial de rachas
   * @param {number} limit - Límite de resultados
   */
  const getStreakHistory = useCallback(async (limit = 30) => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    try {
      return await missionsService.getStreakHistory(limit);
    } catch (err) {
      console.error('Error en getStreakHistory:', err);
      return { success: false, error: err.message, history: [] };
    }
  }, [user]);

  // ============================================================================
  // FUNCIONES UTILIDADES
  // ============================================================================

  /**
   * Obtener una misión específica por ID
   * @param {string} missionId - ID de la misión
   */
  const getMissionById = useCallback((missionId) => {
    return missions.all.find(m => m.id === missionId);
  }, [missions.all]);

  /**
   * Verificar si una misión está completada
   * @param {string} missionId - ID de la misión
   */
  const isMissionCompleted = useCallback((missionId) => {
    const mission = getMissionById(missionId);
    return mission?.is_completed || false;
  }, [getMissionById]);

  /**
   * Calcular progreso de una misión
   * @param {string} missionId - ID de la misión
   */
  const getMissionProgress = useCallback((missionId) => {
    const mission = getMissionById(missionId);
    if (!mission) return 0;

    return missionsService.calculateMissionProgress(
      mission.current_progress || 0,
      mission.target_count || 1
    );
  }, [getMissionById]);

  /**
   * Verificar si todas las misiones del día están completadas
   */
  const areAllMissionsCompleted = useCallback(() => {
    return missionStats.allCompleted;
  }, [missionStats.allCompleted]);

  /**
   * Obtener tiempo hasta el reset
   */
  const getTimeUntilReset = useCallback(() => {
    return missionsService.getTimeUntilReset();
  }, []);

  /**
   * Obtener próximo bonus de racha
   */
  const getNextStreakBonus = useCallback(() => {
    return streak.next_bonus;
  }, [streak.next_bonus]);

  /**
   * Verificar si el usuario tiene una racha activa
   */
  const hasActiveStreak = useCallback(() => {
    return streak.current_streak > 0;
  }, [streak.current_streak]);

  // ============================================================================
  // VALORES CALCULADOS
  // ============================================================================

  const computed = {
    // Misiones
    activeMissionsCount: missions.active.length,
    completedMissionsCount: missions.completed.length,
    totalMissionsCount: missions.all.length,
    
    // Progreso
    overallProgress: missionStats.completionRate || 0,
    pointsEarnedToday: missionStats.totalPointsEarned || 0,
    
    // Racha
    currentStreak: streak.current_streak || 0,
    longestStreak: streak.longest_streak || 0,
    daysUntilNextBonus: streak.next_bonus?.daysRemaining || 0,
    nextBonusPoints: streak.next_bonus?.points || 0,
    
    // Estados
    hasActiveMissions: missions.active.length > 0,
    hasCompletedMissions: missions.completed.length > 0,
    allMissionsCompleted: missionStats.allCompleted,
    hasActiveStreak: streak.current_streak > 0,
    
    // Tiempo
    timeUntilReset: missionsService.getTimeUntilReset()
  };

  // ============================================================================
  // EFECTOS
  // ============================================================================

  /**
   * Efecto: Cargar datos iniciales
   */
  useEffect(() => {
    if (!user || !config.autoLoad) return;

    const loadInitialData = async () => {
      await refresh();

      // Track login si está configurado
      if (config.trackLoginOnMount) {
        await trackDailyLogin();
      }
    };

    loadInitialData();
  }, [user, config.autoLoad, config.trackLoginOnMount]); // Dependencias mínimas para evitar loops

  /**
   * Efecto: Auto-refresh
   */
  useEffect(() => {
    if (!user || !config.autoRefresh) return;

    // Configurar intervalo de refresh
    refreshTimerRef.current = setInterval(() => {
      refresh();
    }, config.refreshInterval);

    // Cleanup
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [user, config.autoRefresh, config.refreshInterval, refresh]);

  /**
   * Efecto: Cleanup al desmontar
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETORNO DEL HOOK
  // ============================================================================

  return {
    // Estado
    missions,
    missionStats,
    streak,
    stats,
    loading,
    refreshing,
    error,

    // Funciones de carga
    fetchMissions,
    fetchStreak,
    fetchStats,
    refresh,

    // Funciones de tracking
    trackProgress,
    trackWatchVideo,
    trackUploadVideo,
    trackGiveLike,
    trackShareContent,
    trackDonatePoints,
    trackComment,
    trackFollowUser,
    trackDailyLogin,

    // Funciones de completado
    completeMission,
    claimReward,

    // Funciones de rachas
    updateStreak,
    getStreakHistory,

    // Utilidades
    getMissionById,
    isMissionCompleted,
    getMissionProgress,
    areAllMissionsCompleted,
    getTimeUntilReset,
    getNextStreakBonus,
    hasActiveStreak,

    // Valores calculados
    computed,

    // Constantes
    MISSION_TYPES: missionsService.MISSION_TYPES,
    MISSION_STATUS: missionsService.MISSION_STATUS
  };
}

// ============================================================================
// EXPORTACIÓN POR DEFECTO
// ============================================================================

export default useDailyMissions;
