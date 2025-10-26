// moderationService.js - Servicio completo de moderación de contenido
// Sprint 6: Moderación y Analytics
// Funciones para gestionar reportes, moderar contenido y obtener estadísticas

import { supabase } from '../lib/supabase';

// ============================================================================
// CONSTANTES
// ============================================================================

export const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
};

export const REPORT_TYPES = {
  SPAM: 'spam',
  INAPPROPRIATE: 'inappropriate',
  COPYRIGHT: 'copyright',
  HARASSMENT: 'harassment',
  MISINFORMATION: 'misinformation',
  OTHER: 'other'
};

export const MODERATION_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  FEATURE: 'feature',
  DELETE: 'delete',
  WARNING: 'warning',
  BAN_USER: 'ban_user'
};

export const CONTENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FEATURED: 'featured'
};

// ============================================================================
// GESTIÓN DE REPORTES
// ============================================================================

/**
 * Obtener todos los reportes de contenido
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>} - Lista de reportes y metadata
 */
export async function getContentReports(filters = {}) {
  try {
    const {
      status = null,
      type = null,
      contentType = null, // 'video' o 'photo'
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = filters;

    let query = supabase
      .from('content_reports')
      .select(`
        *,
        reporter:profiles!content_reports_reporter_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        reported_content:videos(
          id,
          title,
          thumbnail_url,
          status
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('report_type', type);
    }

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    // Ordenamiento
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
  }
}

/**
 * Obtener detalles de un reporte específico
 * @param {string} reportId - ID del reporte
 * @returns {Promise<Object>}
 */
export async function getReportDetails(reportId) {
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .select(`
        *,
        reporter:profiles!content_reports_reporter_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          email
        ),
        reported_content:videos(
          id,
          title,
          description,
          thumbnail_url,
          video_url,
          status,
          views_count,
          likes_count,
          created_at,
          uploader:profiles!videos_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url,
            email
          )
        ),
        moderator:profiles!content_reports_reviewed_by_fkey(
          id,
          username,
          full_name
        )
      `)
      .eq('id', reportId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error al obtener detalles del reporte:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Crear un nuevo reporte de contenido
 * @param {Object} reportData - Datos del reporte
 * @returns {Promise<Object>}
 */
export async function createReport(reportData) {
  try {
    const {
      contentId,
      contentType = 'video',
      reportType,
      description,
      reporterId
    } = reportData;

    // Validar datos requeridos
    if (!contentId || !reportType || !reporterId) {
      throw new Error('Faltan datos requeridos para crear el reporte');
    }

    const { data, error } = await supabase
      .from('content_reports')
      .insert({
        content_id: contentId,
        content_type: contentType,
        report_type: reportType,
        description: description || '',
        reporter_id: reporterId,
        status: REPORT_STATUS.PENDING
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      message: 'Reporte creado exitosamente'
    };
  } catch (error) {
    console.error('Error al crear reporte:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Actualizar el estado de un reporte
 * @param {string} reportId - ID del reporte
 * @param {string} status - Nuevo estado
 * @param {string} moderatorId - ID del moderador
 * @param {string} resolution - Resolución del reporte
 * @returns {Promise<Object>}
 */
export async function updateReportStatus(reportId, status, moderatorId, resolution = '') {
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .update({
        status,
        reviewed_by: moderatorId,
        reviewed_at: new Date().toISOString(),
        resolution
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      message: 'Estado del reporte actualizado'
    };
  } catch (error) {
    console.error('Error al actualizar reporte:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener reportes agrupados por contenido
 * @returns {Promise<Object>}
 */
export async function getReportsByContent() {
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .select(`
        content_id,
        content_type,
        report_type,
        status,
        reported_content:videos(
          id,
          title,
          thumbnail_url
        )
      `)
      .eq('status', REPORT_STATUS.PENDING);

    if (error) throw error;

    // Agrupar reportes por contenido
    const grouped = {};
    data.forEach(report => {
      const key = report.content_id;
      if (!grouped[key]) {
        grouped[key] = {
          content_id: report.content_id,
          content_type: report.content_type,
          content: report.reported_content,
          reports: [],
          total_reports: 0
        };
      }
      grouped[key].reports.push(report);
      grouped[key].total_reports++;
    });

    return {
      success: true,
      data: Object.values(grouped).sort((a, b) => b.total_reports - a.total_reports)
    };
  } catch (error) {
    console.error('Error al obtener reportes agrupados:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============================================================================
// MODERACIÓN DE CONTENIDO
// ============================================================================

/**
 * Obtener contenido pendiente de moderación
 * @param {Object} filters - Filtros
 * @returns {Promise<Object>}
 */
export async function getPendingContent(filters = {}) {
  try {
    const {
      contentType = 'video',
      sortBy = 'created_at',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = filters;

    let query = supabase
      .from('videos')
      .select(`
        *,
        uploader:profiles!videos_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        category:categories(
          id,
          name,
          slug,
          icon
        )
      `, { count: 'exact' })
      .eq('status', CONTENT_STATUS.PENDING);

    // Ordenamiento
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('Error al obtener contenido pendiente:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
  }
}

/**
 * Moderar contenido (aprobar, rechazar, destacar)
 * @param {string} contentId - ID del contenido
 * @param {string} action - Acción de moderación
 * @param {string} moderatorId - ID del moderador
 * @param {string} reason - Razón de la decisión
 * @returns {Promise<Object>}
 */
export async function moderateContent(contentId, action, moderatorId, reason = '') {
  try {
    let newStatus;
    
    switch (action) {
      case MODERATION_ACTIONS.APPROVE:
        newStatus = CONTENT_STATUS.APPROVED;
        break;
      case MODERATION_ACTIONS.REJECT:
        newStatus = CONTENT_STATUS.REJECTED;
        break;
      case MODERATION_ACTIONS.FEATURE:
        newStatus = CONTENT_STATUS.FEATURED;
        break;
      case MODERATION_ACTIONS.DELETE:
        // Eliminar contenido
        return await deleteContent(contentId, moderatorId, reason);
      default:
        throw new Error('Acción de moderación no válida');
    }

    // Actualizar estado del contenido
    const { data: content, error: contentError } = await supabase
      .from('videos')
      .update({ 
        status: newStatus,
        moderated_at: new Date().toISOString(),
        moderated_by: moderatorId
      })
      .eq('id', contentId)
      .select()
      .single();

    if (contentError) throw contentError;

    // Registrar en historial de moderación
    const { error: logError } = await supabase
      .from('moderation_log')
      .insert({
        content_id: contentId,
        content_type: 'video',
        action,
        moderator_id: moderatorId,
        reason,
        previous_status: content.status,
        new_status: newStatus
      });

    if (logError) console.error('Error al registrar log:', logError);

    // Actualizar reportes relacionados si existen
    await supabase
      .from('content_reports')
      .update({
        status: REPORT_STATUS.RESOLVED,
        reviewed_by: moderatorId,
        reviewed_at: new Date().toISOString(),
        resolution: `Contenido ${action === MODERATION_ACTIONS.APPROVE ? 'aprobado' : action === MODERATION_ACTIONS.REJECT ? 'rechazado' : 'destacado'}`
      })
      .eq('content_id', contentId)
      .eq('status', REPORT_STATUS.PENDING);

    return {
      success: true,
      data: content,
      message: `Contenido ${action === MODERATION_ACTIONS.APPROVE ? 'aprobado' : action === MODERATION_ACTIONS.REJECT ? 'rechazado' : 'destacado'} exitosamente`
    };
  } catch (error) {
    console.error('Error al moderar contenido:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Eliminar contenido
 * @param {string} contentId - ID del contenido
 * @param {string} moderatorId - ID del moderador
 * @param {string} reason - Razón de eliminación
 * @returns {Promise<Object>}
 */
export async function deleteContent(contentId, moderatorId, reason) {
  try {
    // Obtener información del contenido antes de eliminar
    const { data: content, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', contentId)
      .single();

    if (fetchError) throw fetchError;

    // Registrar en historial antes de eliminar
    const { error: logError } = await supabase
      .from('moderation_log')
      .insert({
        content_id: contentId,
        content_type: 'video',
        action: MODERATION_ACTIONS.DELETE,
        moderator_id: moderatorId,
        reason,
        previous_status: content.status,
        new_status: 'deleted'
      });

    if (logError) console.error('Error al registrar log:', logError);

    // Eliminar archivos del storage
    if (content.video_url) {
      const videoPath = content.video_url.split('/').pop();
      await supabase.storage.from('videos').remove([videoPath]);
    }

    if (content.thumbnail_url) {
      const thumbPath = content.thumbnail_url.split('/').pop();
      await supabase.storage.from('thumbnails').remove([thumbPath]);
    }

    // Eliminar contenido de la base de datos
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', contentId);

    if (deleteError) throw deleteError;

    // Actualizar reportes relacionados
    await supabase
      .from('content_reports')
      .update({
        status: REPORT_STATUS.RESOLVED,
        reviewed_by: moderatorId,
        reviewed_at: new Date().toISOString(),
        resolution: 'Contenido eliminado'
      })
      .eq('content_id', contentId);

    return {
      success: true,
      message: 'Contenido eliminado exitosamente'
    };
  } catch (error) {
    console.error('Error al eliminar contenido:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Moderar múltiples contenidos en lote
 * @param {Array} contentIds - IDs de contenidos
 * @param {string} action - Acción a realizar
 * @param {string} moderatorId - ID del moderador
 * @param {string} reason - Razón
 * @returns {Promise<Object>}
 */
export async function bulkModerateContent(contentIds, action, moderatorId, reason = '') {
  try {
    const results = {
      success: [],
      failed: []
    };

    for (const contentId of contentIds) {
      const result = await moderateContent(contentId, action, moderatorId, reason);
      if (result.success) {
        results.success.push(contentId);
      } else {
        results.failed.push({ contentId, error: result.error });
      }
    }

    return {
      success: true,
      data: results,
      message: `${results.success.length} contenidos moderados, ${results.failed.length} fallidos`
    };
  } catch (error) {
    console.error('Error en moderación en lote:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// GESTIÓN DE USUARIOS
// ============================================================================

/**
 * Advertir a un usuario
 * @param {string} userId - ID del usuario
 * @param {string} moderatorId - ID del moderador
 * @param {string} reason - Razón de la advertencia
 * @returns {Promise<Object>}
 */
export async function warnUser(userId, moderatorId, reason) {
  try {
    // Registrar advertencia
    const { error: logError } = await supabase
      .from('moderation_log')
      .insert({
        user_id: userId,
        action: MODERATION_ACTIONS.WARNING,
        moderator_id: moderatorId,
        reason
      });

    if (logError) throw logError;

    // Incrementar contador de advertencias en el perfil
    const { data, error } = await supabase.rpc('increment_user_warnings', {
      user_id: userId
    });

    if (error) throw error;

    return {
      success: true,
      message: 'Advertencia registrada exitosamente'
    };
  } catch (error) {
    console.error('Error al advertir usuario:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Banear/suspender un usuario
 * @param {string} userId - ID del usuario
 * @param {string} moderatorId - ID del moderador
 * @param {string} reason - Razón del ban
 * @param {Date} until - Fecha de fin del ban (null = permanente)
 * @returns {Promise<Object>}
 */
export async function banUser(userId, moderatorId, reason, until = null) {
  try {
    // Actualizar estado del usuario
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .update({
        is_banned: true,
        banned_until: until,
        banned_at: new Date().toISOString(),
        banned_by: moderatorId
      })
      .eq('id', userId)
      .select()
      .single();

    if (userError) throw userError;

    // Registrar en log
    const { error: logError } = await supabase
      .from('moderation_log')
      .insert({
        user_id: userId,
        action: MODERATION_ACTIONS.BAN_USER,
        moderator_id: moderatorId,
        reason,
        details: until ? `Suspendido hasta ${until}` : 'Ban permanente'
      });

    if (logError) console.error('Error al registrar log:', logError);

    return {
      success: true,
      data: user,
      message: until ? 'Usuario suspendido temporalmente' : 'Usuario baneado permanentemente'
    };
  } catch (error) {
    console.error('Error al banear usuario:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Desbanear un usuario
 * @param {string} userId - ID del usuario
 * @param {string} moderatorId - ID del moderador
 * @returns {Promise<Object>}
 */
export async function unbanUser(userId, moderatorId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_banned: false,
        banned_until: null,
        banned_at: null,
        banned_by: null
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Registrar en log
    await supabase
      .from('moderation_log')
      .insert({
        user_id: userId,
        action: 'unban',
        moderator_id: moderatorId,
        reason: 'Usuario desbaneado'
      });

    return {
      success: true,
      data,
      message: 'Usuario desbaneado exitosamente'
    };
  } catch (error) {
    console.error('Error al desbanear usuario:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// HISTORIAL Y ESTADÍSTICAS
// ============================================================================

/**
 * Obtener historial de moderación
 * @param {Object} filters - Filtros
 * @returns {Promise<Object>}
 */
export async function getModerationHistory(filters = {}) {
  try {
    const {
      moderatorId = null,
      action = null,
      startDate = null,
      endDate = null,
      page = 1,
      limit = 50
    } = filters;

    let query = supabase
      .from('moderation_log')
      .select(`
        *,
        moderator:profiles!moderation_log_moderator_id_fkey(
          id,
          username,
          full_name
        ),
        content:videos(
          id,
          title,
          thumbnail_url
        )
      `, { count: 'exact' });

    if (moderatorId) {
      query = query.eq('moderator_id', moderatorId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
    };
  }
}

/**
 * Obtener estadísticas de moderación
 * @param {Object} filters - Filtros de fecha
 * @returns {Promise<Object>}
 */
export async function getModerationStats(filters = {}) {
  try {
    const { startDate, endDate } = filters;

    // Reportes por estado
    let reportsQuery = supabase
      .from('content_reports')
      .select('status', { count: 'exact' });

    if (startDate) reportsQuery = reportsQuery.gte('created_at', startDate);
    if (endDate) reportsQuery = reportsQuery.lte('created_at', endDate);

    const { data: reportsData, error: reportsError } = await reportsQuery;
    if (reportsError) throw reportsError;

    // Agrupar por estado
    const reportsByStatus = {};
    reportsData.forEach(r => {
      reportsByStatus[r.status] = (reportsByStatus[r.status] || 0) + 1;
    });

    // Contenido pendiente
    const { count: pendingCount, error: pendingError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('status', CONTENT_STATUS.PENDING);

    if (pendingError) throw pendingError;

    // Acciones de moderación por tipo
    let actionsQuery = supabase
      .from('moderation_log')
      .select('action', { count: 'exact' });

    if (startDate) actionsQuery = actionsQuery.gte('created_at', startDate);
    if (endDate) actionsQuery = actionsQuery.lte('created_at', endDate);

    const { data: actionsData, error: actionsError } = await actionsQuery;
    if (actionsError) throw actionsError;

    const actionsByType = {};
    actionsData.forEach(a => {
      actionsByType[a.action] = (actionsByType[a.action] || 0) + 1;
    });

    // Top moderadores
    const { data: topModerators, error: modError } = await supabase
      .from('moderation_log')
      .select(`
        moderator_id,
        moderator:profiles!moderation_log_moderator_id_fkey(
          id,
          username,
          full_name
        )
      `)
      .not('moderator_id', 'is', null);

    if (modError) throw modError;

    const moderatorStats = {};
    topModerators.forEach(log => {
      const id = log.moderator_id;
      if (!moderatorStats[id]) {
        moderatorStats[id] = {
          moderator: log.moderator,
          count: 0
        };
      }
      moderatorStats[id].count++;
    });

    const topModList = Object.values(moderatorStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      success: true,
      data: {
        reports: {
          total: reportsData.length,
          byStatus: reportsByStatus,
          pending: reportsByStatus[REPORT_STATUS.PENDING] || 0,
          resolved: reportsByStatus[REPORT_STATUS.RESOLVED] || 0
        },
        content: {
          pendingModeration: pendingCount || 0
        },
        actions: {
          total: actionsData.length,
          byType: actionsByType
        },
        topModerators: topModList
      }
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Obtener reportes recientes sin revisar
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>}
 */
export async function getRecentUnreviewedReports(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .select(`
        *,
        reporter:profiles!content_reports_reporter_id_fkey(
          username,
          avatar_url
        ),
        reported_content:videos(
          title,
          thumbnail_url
        )
      `)
      .eq('status', REPORT_STATUS.PENDING)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('Error al obtener reportes recientes:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Obtener actividad reciente de moderación
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>}
 */
export async function getRecentModerationActivity(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('moderation_log')
      .select(`
        *,
        moderator:profiles!moderation_log_moderator_id_fkey(
          username,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Verificar si un usuario puede moderar
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
export async function canUserModerate(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return data.role === 'admin' || data.role === 'moderator';
  } catch (error) {
    console.error('Error al verificar permisos:', error);
    return false;
  }
}

/**
 * Obtener contenido más reportado
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>}
 */
export async function getMostReportedContent(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .select(`
        content_id,
        content_type,
        reported_content:videos(
          id,
          title,
          thumbnail_url,
          status
        )
      `)
      .eq('status', REPORT_STATUS.PENDING);

    if (error) throw error;

    // Contar reportes por contenido
    const counts = {};
    data.forEach(report => {
      const id = report.content_id;
      if (!counts[id]) {
        counts[id] = {
          content_id: id,
          content: report.reported_content,
          report_count: 0
        };
      }
      counts[id].report_count++;
    });

    const sorted = Object.values(counts)
      .sort((a, b) => b.report_count - a.report_count)
      .slice(0, limit);

    return {
      success: true,
      data: sorted
    };
  } catch (error) {
    console.error('Error al obtener contenido más reportado:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

export default {
  // Constantes
  REPORT_STATUS,
  REPORT_TYPES,
  MODERATION_ACTIONS,
  CONTENT_STATUS,
  
  // Gestión de reportes
  getContentReports,
  getReportDetails,
  createReport,
  updateReportStatus,
  getReportsByContent,
  
  // Moderación de contenido
  getPendingContent,
  moderateContent,
  deleteContent,
  bulkModerateContent,
  
  // Gestión de usuarios
  warnUser,
  banUser,
  unbanUser,
  
  // Historial y estadísticas
  getModerationHistory,
  getModerationStats,
  getRecentUnreviewedReports,
  getRecentModerationActivity,
  
  // Utilidades
  canUserModerate,
  getMostReportedContent
};
