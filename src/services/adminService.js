// src/services/adminService.js
import { supabase } from '../lib/supabase';

/**
 * Servicio de Administración
 * Contiene todas las funciones para interactuar con el panel de administración
 */

// ============================================
// VERIFICACIÓN DE ROLES Y PERMISOS
// ============================================

/**
 * Verifica si un usuario tiene rol de administrador
 * @param {string} userId - ID del usuario a verificar
 * @returns {Promise<Object>} Objeto con el rol y permisos
 */
export const checkAdminRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No se encontró rol de admin
        return { isAdmin: false, role: null };
      }
      throw error;
    }

    return {
      isAdmin: true,
      role: data,
      permissions: data.permissions || {},
      roleType: data.role_type,
    };
  } catch (error) {
    console.error('Error al verificar rol de admin:', error);
    throw error;
  }
};

/**
 * Obtiene los permisos por defecto de un tipo de rol
 * @param {string} roleType - Tipo de rol (super_admin, admin, moderator, editor)
 * @returns {Object} Objeto con los permisos
 */
export const getAdminPermissions = (roleType) => {
  const permissions = {
    super_admin: {
      manage_users: true,
      manage_content: true,
      manage_categories: true,
      manage_points: true,
      manage_missions: true,
      manage_rewards: true,
      manage_settings: true,
      view_analytics: true,
      view_logs: true,
      moderate_content: true,
    },
    admin: {
      manage_users: true,
      manage_content: true,
      manage_categories: true,
      manage_points: true,
      manage_missions: true,
      manage_rewards: true,
      manage_settings: false,
      view_analytics: true,
      view_logs: true,
      moderate_content: true,
    },
    moderator: {
      manage_users: false,
      manage_content: true,
      manage_categories: false,
      manage_points: false,
      manage_missions: false,
      manage_rewards: false,
      manage_settings: false,
      view_analytics: true,
      view_logs: false,
      moderate_content: true,
    },
    editor: {
      manage_users: false,
      manage_content: true,
      manage_categories: false,
      manage_points: false,
      manage_missions: false,
      manage_rewards: false,
      manage_settings: false,
      view_analytics: false,
      view_logs: false,
      moderate_content: false,
    },
  };

  return permissions[roleType] || {};
};

/**
 * Verifica si un usuario es admin usando la función SQL
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
export const isAdmin = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('is_admin', {
      user_id: userId,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error al verificar si es admin:', error);
    return false;
  }
};

// ============================================
// ESTADÍSTICAS DEL DASHBOARD
// ============================================

/**
 * Obtiene las estadísticas principales del dashboard
 * ✅ MODIFICADO: Ahora solo llama a la RPC que calcula todo.
 * @returns {Promise<Object>} Estadísticas del dashboard
 */
export const getAdminStats = async () => {
  try {
    // 1. Llamar a la función RPC (que ahora lo hace todo)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats');

    if (rpcError) throw rpcError;

    // 2. Simplemente asignar los resultados
    const stats = {
      total_users: rpcData?.total_users || 0,
      total_videos: rpcData?.total_videos || 0, // Ahora viene de la RPC (horizontales)
      total_reels: rpcData?.total_reels || 0,    // Ahora viene de la RPC (verticales)
      total_photos: rpcData?.total_photos || 0,
      total_points_distributed: rpcData?.total_points_distributed || 0,
      active_users_today: rpcData?.active_users_today || 0,
      new_users_this_week: rpcData?.new_users_this_week || 0,
      pending_reports: rpcData?.pending_reports || 0,
      total_premium_sales: rpcData?.total_premium_sales || 0,
    };

    return { stats };
  } catch (error) {
    console.error('Error al obtener estadísticas del admin:', error);
    // Devolver estructura vacía en caso de error
    return {
      stats: {
        total_users: 0,
        total_videos: 0,
        total_reels: 0,
        total_photos: 0,
        total_points_distributed: 0,
        active_users_today: 0,
        new_users_this_week: 0,
        pending_reports: 0,
        total_premium_sales: 0,
      }
    };
  }
};

/**
 * Obtiene la actividad reciente del sistema
 * @param {number} limit - Número de actividades a obtener (default: 10)
 * @returns {Promise<Object>} Objeto con lista de actividades recientes
 */
export const getRecentActivity = async (limit = 10) => {
  try {
    const { data, error } = await supabase.rpc('get_recent_activity', {
      activity_limit: limit,
    });

    if (error) throw error;
    return { activities: data || [] }; // Devolver en formato que espera el componente
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    return { activities: [] };
  }
};

/**
 * Obtiene el ranking de usuarios por puntos
 * @param {number} limit - Número de usuarios a obtener (default: 10)
 * @returns {Promise<Object>} Objeto con lista de top usuarios
 */
export const getTopUsersByPoints = async (limit = 10) => {
  try {
    const { data, error } = await supabase.rpc('get_top_users_by_points', {
      users_limit: limit,
    });

    if (error) throw error;
    return { users: data || [] }; // Devolver en formato que espera el componente
  } catch (error) {
    console.error('Error al obtener top usuarios:', error);
    return { users: [] };
  }
};

/**
 * Obtiene estadísticas de contenido por categoría
 * @returns {Promise<Array>} Estadísticas por categoría
 */
export const getContentStatsByCategory = async () => {
  try {
    const { data, error } = await supabase
      .from('content_categories')
      .select('*')
      .order('content_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener stats por categoría:', error);
    throw error;
  }
};

// ============================================
// LOGGING DE ACCIONES ADMINISTRATIVAS
// ============================================

/**
 * Registra una acción administrativa en los logs
 * @param {string} action - Tipo de acción (create_user, update_settings, etc.)
 * @param {Object} details - Detalles adicionales de la acción
 * @param {string} userId - ID del usuario que realiza la acción
 * @returns {Promise<Object>} Log creado
 */
export const logAdminAction = async (action, details = {}, userId = null) => {
  try {
    // Obtener información del navegador
    const userAgent = navigator.userAgent;
    const ipAddress = 'unknown'; // En producción, obtener desde el servidor

    const logData = {
      user_id: userId,
      action_type: action,
      action_details: details,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('admin_logs')
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al registrar acción en logs:', error);
    // No lanzar el error para no interrumpir la operación principal
    return null;
  }
};

/**
 * Obtiene los logs de administración con filtros
 * @param {Object} filters - Filtros para los logs
 * @returns {Promise<Array>} Lista de logs
 */
export const getAdminLogs = async (filters = {}) => {
  try {
    let query = supabase
      .from('admin_logs')
      .select(`
        *,
        user:user_profiles(full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.actionType) {
      query = query.eq('action_type', filters.actionType);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener logs de admin:', error);
    throw error;
  }
};

// ============================================
// GESTIÓN DE USUARIOS
// ============================================

/**
 * Obtiene la lista de usuarios con paginación
 * @param {Object} options - Opciones de búsqueda y paginación
 * @returns {Promise<Object>} Usuarios y total
 */
export const getUsers = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      orderBy = 'created_at',
      order = 'desc',
    } = options;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Búsqueda
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
    }

    // Ordenar
    query = query.order(orderBy, { ascending: order === 'asc' });

    // Paginación
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      users: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
};

/**
 * Actualiza información de un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} updates - Datos a actualizar
 * @param {string} adminId - ID del admin que realiza la actualización
 * @returns {Promise<Object>} Usuario actualizado
 */
export const updateUser = async (userId, updates, adminId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Registrar en logs
    await logAdminAction(
      'update_user',
      {
        user_id: userId,
        updates,
      },
      adminId
    );

    return data;
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    throw error;
  }
};

/**
 * Ajusta los puntos de un usuario
 * @param {string} userId - ID del usuario
 * @param {number} pointsChange - Cambio en puntos (positivo o negativo)
 * @param {string} reason - Razón del ajuste
 * @param {string} adminId - ID del admin
 * @returns {Promise<Object>} Resultado de la transacción
 */
export const adjustUserPoints = async (userId, pointsChange, reason, adminId) => {
  try {
    // Registrar transacción de puntos
    const { data, error } = await supabase.rpc('add_points_transaction', {
      p_user_id: userId,
      p_points_change: pointsChange,
      p_transaction_type: 'admin_adjustment',
      p_description: reason,
      p_point_type: 'free',
    });

    if (error) throw error;

    // Registrar en logs
    await logAdminAction(
      'adjust_points',
      {
        user_id: userId,
        points_change: pointsChange,
        reason,
      },
      adminId
    );

    return data;
  } catch (error) {
    console.error('Error al ajustar puntos:', error);
    throw error;
  }
};

// ============================================
// GESTIÓN DE CONTENIDO
// ============================================

/**
 * Obtiene videos con filtros y paginación
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Object>} Videos y total
 */
export const getVideos = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = null,
      isPublished = null,
      orderBy = 'created_at',
      order = 'desc',
    } = options;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('videos')
      .select(`
        *,
        user:user_profiles(id, full_name, username, avatar_url)
      `, { count: 'exact' });

    // Filtros
    if (category) {
      query = query.eq('category', category);
    }
    if (isPublished !== null) {
      query = query.eq('is_published', isPublished);
    }

    // Ordenar
    query = query.order(orderBy, { ascending: order === 'asc' });

    // Paginación
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      videos: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Error al obtener videos:', error);
    throw error;
  }
};

/**
 * Actualiza un video (destacar, ocultar, etc.)
 * @param {string} videoId - ID del video
 * @param {Object} updates - Datos a actualizar
 * @param {string} adminId - ID del admin
 * @returns {Promise<Object>} Video actualizado
 */
export const updateVideo = async (videoId, updates, adminId) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', videoId)
      .select()
      .single();

    if (error) throw error;

    // Registrar en logs
    await logAdminAction(
      'update_video',
      {
        video_id: videoId,
        updates,
      },
      adminId
    );

    return data;
  } catch (error) {
    console.error('Error al actualizar video:', error);
    throw error;
  }
};

/**
 * Elimina un video
 * @param {string} videoId - ID del video
 * @param {string} adminId - ID del admin
 * @returns {Promise<boolean>} Éxito de la operación
 */
export const deleteVideo = async (videoId, adminId) => {
  try {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (error) throw error;

    // Registrar en logs
    await logAdminAction(
      'delete_video',
      { video_id: videoId },
      adminId
    );

    return true;
  } catch (error) {
    console.error('Error al eliminar video:', error);
    throw error;
  }
};

// ============================================
// GESTIÓN DE REPORTES Y MODERACIÓN
// ============================================

/**
 * Obtiene reportes de contenido pendientes
 * @param {Object} filters - Filtros para los reportes
 * @returns {Promise<Array>} Lista de reportes
 */
export const getContentReports = async (filters = {}) => {
  try {
    let query = supabase
      .from('content_reports')
      .select(`
        *,
        reporter:user_profiles!content_reports_reporter_id_fkey(full_name, username, avatar_url),
        content_owner:user_profiles!content_reports_content_owner_id_fkey(full_name, username)
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.contentType) {
      query = query.eq('content_type', filters.contentType);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    throw error;
  }
};

/**
 * Actualiza el estado de un reporte
 * @param {string} reportId - ID del reporte
 * @param {string} status - Nuevo estado (reviewed, resolved, dismissed)
 * @param {string} moderatorNotes - Notas del moderador
 * @param {string} adminId - ID del admin
 * @returns {Promise<Object>} Reporte actualizado
 */
export const updateReportStatus = async (reportId, status, moderatorNotes, adminId) => {
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .update({
        status,
        moderator_notes: moderatorNotes,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    // Registrar en logs
    await logAdminAction(
      'resolve_report',
      {
        report_id: reportId,
        status,
        notes: moderatorNotes,
      },
      adminId
    );

    return data;
  } catch (error) {
    console.error('Error al actualizar reporte:', error);
    throw error;
  }
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Formatea un número de forma legible
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Formatea una fecha de forma relativa
 * @param {string} date - Fecha ISO
 * @returns {string} Fecha formateada
 */
export const formatRelativeDate = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return past.toLocaleString('es-ES');
};

export default {
  // Roles y permisos
  checkAdminRole,
  getAdminPermissions,
  isAdmin,
  
  // Estadísticas
  getAdminStats,
  getRecentActivity,
  getTopUsersByPoints,
  getContentStatsByCategory,
  
  // Logging
  logAdminAction,
  getAdminLogs,
  
  // Usuarios
  getUsers,
  updateUser,
  adjustUserPoints,
  
  // Contenido
  getVideos,
  updateVideo,
  deleteVideo,
  
  // Moderación
  getContentReports,
  updateReportStatus,
  
  // Utilidades
  formatNumber,
  formatRelativeDate,
};
