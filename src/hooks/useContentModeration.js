// useContentModeration.js - Hook personalizado para gestión de moderación
// Sprint 6: Moderación y Analytics
// Ruta: src/hooks/useContentModeration.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getContentReports,
  getReportDetails,
  getPendingContent,
  moderateContent,
  deleteContent,
  bulkModerateContent,
  updateReportStatus,
  warnUser,
  banUser,
  unbanUser,
  getModerationStats,
  getModerationHistory,
  getRecentModerationActivity,
  getMostReportedContent,
  canUserModerate,
  REPORT_STATUS,
  MODERATION_ACTIONS
} from '../services/moderationService';

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook personalizado para gestión completa de moderación
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - Estados y funciones de moderación
 */
export const useContentModeration = (options = {}) => {
  const { user } = useAuth();
  const {
    autoLoad = true,
    autoRefreshInterval = null, // ms, null = sin auto-refresh
    initialFilters = {}
  } = options;

  // Estados principales
  const [reports, setReports] = useState([]);
  const [pendingContent, setPendingContent] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [mostReported, setMostReported] = useState([]);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Estados de filtros y paginación
  const [filters, setFilters] = useState({
    status: null,
    type: null,
    sortBy: 'created_at',
    page: 1,
    limit: 20,
    ...initialFilters
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Permisos
  const [canModerate, setCanModerate] = useState(false);

  // Refs para auto-refresh
  const intervalRef = useRef(null);

  // ============================================================================
  // VERIFICACIÓN DE PERMISOS
  // ============================================================================

  useEffect(() => {
    const checkPermissions = async () => {
      if (user?.id) {
        const hasPerm = await canUserModerate(user.id);
        setCanModerate(hasPerm);
      }
    };
    checkPermissions();
  }, [user]);

  // ============================================================================
  // CARGA INICIAL
  // ============================================================================

  useEffect(() => {
    if (autoLoad && canModerate) {
      loadAllData();
    }
  }, [autoLoad, canModerate]);

  // ============================================================================
  // AUTO-REFRESH
  // ============================================================================

  useEffect(() => {
    if (autoRefreshInterval && canModerate) {
      intervalRef.current = setInterval(() => {
        loadAllData(true); // silent refresh
      }, autoRefreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefreshInterval, canModerate]);

  // ============================================================================
  // FUNCIONES DE CARGA
  // ============================================================================

  /**
   * Cargar todos los datos de moderación
   * @param {boolean} silent - Si es true, no muestra loading
   */
  const loadAllData = useCallback(async (silent = false) => {
    if (!canModerate) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const [
        reportsResult,
        pendingResult,
        statsResult,
        activityResult,
        mostReportedResult
      ] = await Promise.all([
        loadReports(),
        loadPendingContent(),
        loadStats(),
        loadRecentActivity(),
        loadMostReported()
      ]);

      // Los resultados ya actualizan los estados en sus funciones individuales

    } catch (err) {
      console.error('Error loading moderation data:', err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canModerate, filters]);

  /**
   * Cargar reportes con filtros
   */
  const loadReports = useCallback(async () => {
    try {
      const result = await getContentReports({
        status: filters.status,
        type: filters.type,
        sortBy: filters.sortBy,
        page: filters.page,
        limit: filters.limit
      });

      if (result.success) {
        setReports(result.data);
        setPagination(result.pagination);
      }

      return result;
    } catch (err) {
      console.error('Error loading reports:', err);
      throw err;
    }
  }, [filters]);

  /**
   * Cargar contenido pendiente
   */
  const loadPendingContent = useCallback(async () => {
    try {
      const result = await getPendingContent({
        sortBy: filters.sortBy,
        page: filters.page,
        limit: filters.limit
      });

      if (result.success) {
        setPendingContent(result.data);
      }

      return result;
    } catch (err) {
      console.error('Error loading pending content:', err);
      throw err;
    }
  }, [filters]);

  /**
   * Cargar estadísticas de moderación
   */
  const loadStats = useCallback(async () => {
    try {
      const result = await getModerationStats();
      
      if (result.success) {
        setStats(result.data);
      }

      return result;
    } catch (err) {
      console.error('Error loading stats:', err);
      throw err;
    }
  }, []);

  /**
   * Cargar actividad reciente
   */
  const loadRecentActivity = useCallback(async (limit = 20) => {
    try {
      const result = await getRecentModerationActivity(limit);
      
      if (result.success) {
        setRecentActivity(result.data);
      }

      return result;
    } catch (err) {
      console.error('Error loading recent activity:', err);
      throw err;
    }
  }, []);

  /**
   * Cargar contenido más reportado
   */
  const loadMostReported = useCallback(async (limit = 10) => {
    try {
      const result = await getMostReportedContent(limit);
      
      if (result.success) {
        setMostReported(result.data);
      }

      return result;
    } catch (err) {
      console.error('Error loading most reported:', err);
      throw err;
    }
  }, []);

  /**
   * Obtener detalles de un reporte específico
   */
  const getReportDetailsById = useCallback(async (reportId) => {
    try {
      setActionInProgress(true);
      const result = await getReportDetails(reportId);
      return result;
    } catch (err) {
      console.error('Error getting report details:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setActionInProgress(false);
    }
  }, []);

  // ============================================================================
  // ACCIONES DE MODERACIÓN
  // ============================================================================

  /**
   * Moderar contenido (aprobar, rechazar, destacar, eliminar)
   */
  const handleModerateContent = useCallback(async (
    contentId,
    action,
    reason = ''
  ) => {
    if (!canModerate || !user?.id) {
      setError('No tienes permisos para moderar');
      return { success: false, error: 'No tienes permisos' };
    }

    try {
      setActionInProgress(true);
      setError(null);

      const result = await moderateContent(
        contentId,
        action,
        user.id,
        reason
      );

      if (result.success) {
        // Recargar datos después de la acción
        await loadAllData(true);
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('Error moderating content:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setActionInProgress(false);
    }
  }, [canModerate, user, loadAllData]);

  /**
   * Eliminar contenido
   */
  const handleDeleteContent = useCallback(async (
    contentId,
    reason = ''
  ) => {
    if (!canModerate || !user?.id) {
      setError('No tienes permisos para eliminar');
      return { success: false, error: 'No tienes permisos' };
    }

    try {
      setActionInProgress(true);
      setError(null);

      const result = await deleteContent(contentId, user.id, reason);

      if (result.success) {
        await loadAllData(true);
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('Error deleting content:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setActionInProgress(false);
    }
  }, [canModerate, user, loadAllData]);

  /**
   * Moderar múltiples contenidos en lote
   */
  const handleBulkModerate = useCallback(async (
    contentIds,
    action,
    reason = ''
  ) => {
    if (!canModerate || !user?.id) {
      setError('No tienes permisos para moderar');
      return { success: false, error: 'No tienes permisos' };
    }

    try {
      setActionInProgress(true);
      setError(null);

      const result = await bulkModerateContent(
        contentIds,
        action,
        user.id,
        reason
      );

      if (result.success) {
        await loadAllData(true);
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('Error in bulk moderation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setActionInProgress(false);
    }
  }, [canModerate, user, loadAllData]);

  // ============================================================================
  // GESTIÓN DE REPORTES
  // ============================================================================

  /**
   * Actualizar estado de un reporte
   */
  const handleUpdateReportStatus = useCallback(async (
    reportId,
    status,
    resolution = ''
  ) => {
    if (!canModerate || !user?.id) {
      setError('No tienes permisos');
      return { success: false, error: 'No tienes permisos' };
    }

    try {
      setActionInProgress(true);
      setError(null);

      const result = await updateReportStatus(
        reportId,
        status,
        user.id,
        resolution
      );

      if (result.success) {
        await loadReports();
        await loadStats();
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('Error updating report status:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setActionInProgress(false);
    }
  }, [canModerate, user, loadReports, loadStats]);

  /**
   * Resolver reporte (marcar como resuelto)
   */
  const handleResolveReport = useCallback(async (
    reportId,
    resolution = ''
  ) => {
    return handleUpdateReportStatus(
      reportId,
      REPORT_STATUS.RESOLVED,
      resolution
    );
  }, [handleUpdateReportStatus]);

  /**
   * Descartar reporte
   */
  const handleDismissReport = useCallback(async (
    reportId,
    reason = ''
  ) => {
    return handleUpdateReportStatus(
      reportId,
      REPORT_STATUS.DISMISSED,
      reason
    );
  }, [handleUpdateReportStatus]);

  // ============================================================================
  // GESTIÓN DE USUARIOS
  // ============================================================================

  /**
   * Advertir a un usuario
   */
  const handleWarnUser = useCallback(async (
    userId,
    reason = ''
  ) => {
    if (!canModerate || !user?.id) {
      setError('No tienes permisos');
      return { success: false, error: 'No tienes permisos' };
    }

    try {
      setActionInProgress(true);
      setError(null);

      const result = await warnUser(userId, user.id, reason);

      if (result.success) {
        await loadRecentActivity();
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('Error warning user:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setActionInProgress(false);
    }
  }, [canModerate, user, loadRecentActivity]);

  /**
   * Banear/suspender un usuario
   */
  const handleBanUser = useCallback(async (
    userId,
    reason = '',
    until = null
  ) => {
    if (!canModerate || !user?.id) {
      setError('No tienes permisos');
      return { success: false, error: 'No tienes permisos' };
    }

    try {
      setActionInProgress(true);
      setError(null);

      const result = await banUser(userId, user.id, reason, until);

      if (result.success) {
        await loadRecentActivity();
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('Error banning user:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setActionInProgress(false);
    }
  }, [canModerate, user, loadRecentActivity]);

  /**
   * Desbanear un usuario
   */
  const handleUnbanUser = useCallback(async (userId) => {
    if (!canModerate || !user?.id) {
      setError('No tienes permisos');
      return { success: false, error: 'No tienes permisos' };
    }

    try {
      setActionInProgress(true);
      setError(null);

      const result = await unbanUser(userId, user.id);

      if (result.success) {
        await loadRecentActivity();
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('Error unbanning user:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setActionInProgress(false);
    }
  }, [canModerate, user, loadRecentActivity]);

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Actualizar filtros
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset a página 1 cuando cambian filtros
    }));
  }, []);

  /**
   * Cambiar página
   */
  const changePage = useCallback((newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  }, []);

  /**
   * Refresh manual
   */
  const refresh = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  /**
   * Limpiar error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset filtros
   */
  const resetFilters = useCallback(() => {
    setFilters({
      status: null,
      type: null,
      sortBy: 'created_at',
      page: 1,
      limit: 20
    });
  }, []);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Estados de datos
    reports,
    pendingContent,
    stats,
    recentActivity,
    mostReported,

    // Estados de UI
    loading,
    error,
    actionInProgress,
    canModerate,

    // Filtros y paginación
    filters,
    pagination,

    // Funciones de carga
    loadAllData,
    loadReports,
    loadPendingContent,
    loadStats,
    loadRecentActivity,
    loadMostReported,
    getReportDetailsById,

    // Acciones de moderación
    moderateContent: handleModerateContent,
    deleteContent: handleDeleteContent,
    bulkModerate: handleBulkModerate,

    // Gestión de reportes
    updateReportStatus: handleUpdateReportStatus,
    resolveReport: handleResolveReport,
    dismissReport: handleDismissReport,

    // Gestión de usuarios
    warnUser: handleWarnUser,
    banUser: handleBanUser,
    unbanUser: handleUnbanUser,

    // Utilidades
    updateFilters,
    changePage,
    refresh,
    clearError,
    resetFilters
  };
};

// ============================================================================
// HOOK SIMPLIFICADO PARA REPORTES
// ============================================================================

/**
 * Hook simplificado solo para gestión de reportes
 */
export const useReports = (options = {}) => {
  const {
    reports,
    loading,
    error,
    filters,
    pagination,
    loadReports,
    updateFilters,
    changePage,
    resolveReport,
    dismissReport,
    clearError
  } = useContentModeration(options);

  return {
    reports,
    loading,
    error,
    filters,
    pagination,
    loadReports,
    updateFilters,
    changePage,
    resolveReport,
    dismissReport,
    clearError
  };
};

// ============================================================================
// HOOK SIMPLIFICADO PARA CONTENIDO PENDIENTE
// ============================================================================

/**
 * Hook simplificado solo para contenido pendiente
 */
export const usePendingContent = (options = {}) => {
  const {
    pendingContent,
    loading,
    error,
    filters,
    pagination,
    loadPendingContent,
    moderateContent,
    deleteContent,
    bulkModerate,
    updateFilters,
    changePage,
    clearError
  } = useContentModeration(options);

  return {
    pendingContent,
    loading,
    error,
    filters,
    pagination,
    loadPendingContent,
    moderateContent,
    deleteContent,
    bulkModerate,
    updateFilters,
    changePage,
    clearError
  };
};

// ============================================================================
// HOOK SIMPLIFICADO PARA ESTADÍSTICAS
// ============================================================================

/**
 * Hook simplificado solo para estadísticas
 */
export const useModerationStats = (options = {}) => {
  const {
    stats,
    recentActivity,
    mostReported,
    loading,
    error,
    loadStats,
    loadRecentActivity,
    loadMostReported,
    refresh,
    clearError
  } = useContentModeration(options);

  return {
    stats,
    recentActivity,
    mostReported,
    loading,
    error,
    loadStats,
    loadRecentActivity,
    loadMostReported,
    refresh,
    clearError
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default useContentModeration;
