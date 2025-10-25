// analyticsService.js - Servicio completo de analytics y estadísticas
// Sprint 6: Moderación y Analytics
// Ruta: src/services/analyticsService.js

import { supabase } from './supabase';

// ============================================================================
// CONSTANTES
// ============================================================================

export const TIME_PERIODS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom'
};

export const METRIC_TYPES = {
  VIEWS: 'views',
  LIKES: 'likes',
  SHARES: 'shares',
  COMMENTS: 'comments',
  UPLOADS: 'uploads',
  USERS: 'users',
  POINTS: 'points',
  REVENUE: 'revenue'
};

export const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  AREA: 'area',
  PIE: 'pie',
  DOUGHNUT: 'doughnut'
};

// ============================================================================
// UTILIDADES DE FECHAS
// ============================================================================

/**
 * Obtener rango de fechas según período
 * @param {string} period - Período de tiempo
 * @param {Date} customStart - Fecha inicio custom
 * @param {Date} customEnd - Fecha fin custom
 * @returns {Object} - Objeto con startDate y endDate
 */
export function getDateRange(period, customStart = null, customEnd = null) {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case TIME_PERIODS.TODAY:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.YESTERDAY:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.LAST_7_DAYS:
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;

    case TIME_PERIODS.LAST_30_DAYS:
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;

    case TIME_PERIODS.THIS_MONTH:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
      break;

    case TIME_PERIODS.LAST_MONTH:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;

    case TIME_PERIODS.THIS_YEAR:
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now);
      break;

    case TIME_PERIODS.CUSTOM:
      startDate = customStart || new Date(now);
      endDate = customEnd || new Date(now);
      break;

    default:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date(now);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

/**
 * Formatear fecha para display
 * @param {string} dateString - Fecha en ISO
 * @returns {string}
 */
export function formatDateForDisplay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ============================================================================
// MÉTRICAS GENERALES DE LA PLATAFORMA
// ============================================================================

/**
 * Obtener métricas generales de la plataforma
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getPlatformOverview(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    // Total de usuarios
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Usuarios activos (último mes)
    const { count: activeUsers, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', startDate);

    if (activeError) throw activeError;

    // Total de videos
    const { count: totalVideos, error: videosError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true });

    if (videosError) throw videosError;

    // Videos subidos en el período
    const { count: newVideos, error: newVideosError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (newVideosError) throw newVideosError;

    // Total de vistas en el período
    const { data: viewsData, error: viewsError } = await supabase
      .from('videos')
      .select('views_count')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (viewsError) throw viewsError;

    const totalViews = viewsData.reduce((sum, v) => sum + (v.views_count || 0), 0);

    // Total de likes en el período
    const { count: totalLikes, error: likesError } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (likesError) throw likesError;

    // Total de comentarios en el período
    const { count: totalComments, error: commentsError } = await supabase
      .from('video_comments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (commentsError) throw commentsError;

    // Calcular métricas comparativas (período anterior)
    const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    const { count: prevNewVideos } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate);

    const videosGrowth = prevNewVideos > 0 
      ? ((newVideos - prevNewVideos) / prevNewVideos * 100).toFixed(1)
      : 0;

    const { count: prevActiveUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', prevStartDate.toISOString())
      .lt('last_seen', startDate);

    const usersGrowth = prevActiveUsers > 0
      ? ((activeUsers - prevActiveUsers) / prevActiveUsers * 100).toFixed(1)
      : 0;

    return {
      success: true,
      data: {
        users: {
          total: totalUsers || 0,
          active: activeUsers || 0,
          growth: parseFloat(usersGrowth)
        },
        content: {
          totalVideos: totalVideos || 0,
          newVideos: newVideos || 0,
          growth: parseFloat(videosGrowth)
        },
        engagement: {
          views: totalViews || 0,
          likes: totalLikes || 0,
          comments: totalComments || 0,
          avgViewsPerVideo: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0
        },
        period: {
          startDate,
          endDate,
          label: period
        }
      }
    };
  } catch (error) {
    console.error('Error al obtener overview de plataforma:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// ANALYTICS DE CONTENIDO
// ============================================================================

/**
 * Obtener top videos por vistas
 * @param {Object} options - Opciones de consulta
 * @returns {Promise<Object>}
 */
export async function getTopVideos(options = {}) {
  try {
    const {
      limit = 10,
      period = TIME_PERIODS.LAST_30_DAYS,
      customStart,
      customEnd,
      categoryId = null
    } = options;

    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    let query = supabase
      .from('videos')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        views_count,
        likes_count,
        comments_count,
        created_at,
        uploader:profiles!videos_user_id_fkey(
          id,
          username,
          avatar_url
        ),
        category:categories(
          id,
          name,
          slug
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('views_count', { ascending: false })
      .limit(limit);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('Error al obtener top videos:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Obtener estadísticas de contenido por categoría
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getContentByCategory(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    const { data, error } = await supabase
      .from('videos')
      .select(`
        category_id,
        views_count,
        likes_count,
        category:categories(
          id,
          name,
          slug,
          icon
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    // Agrupar por categoría
    const grouped = {};
    data.forEach(video => {
      const catId = video.category_id;
      if (!grouped[catId]) {
        grouped[catId] = {
          category: video.category,
          count: 0,
          totalViews: 0,
          totalLikes: 0
        };
      }
      grouped[catId].count++;
      grouped[catId].totalViews += video.views_count || 0;
      grouped[catId].totalLikes += video.likes_count || 0;
    });

    const result = Object.values(grouped).map(item => ({
      ...item,
      avgViews: item.count > 0 ? Math.round(item.totalViews / item.count) : 0,
      avgLikes: item.count > 0 ? Math.round(item.totalLikes / item.count) : 0
    })).sort((a, b) => b.count - a.count);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error al obtener contenido por categoría:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Obtener tendencias de contenido (crecimiento por día)
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getContentTrends(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    const { data, error } = await supabase
      .from('videos')
      .select('created_at, views_count, likes_count')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Agrupar por día
    const dailyData = {};
    data.forEach(video => {
      const date = new Date(video.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          uploads: 0,
          views: 0,
          likes: 0
        };
      }
      dailyData[date].uploads++;
      dailyData[date].views += video.views_count || 0;
      dailyData[date].likes += video.likes_count || 0;
    });

    const result = Object.values(dailyData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error al obtener tendencias de contenido:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============================================================================
// ANALYTICS DE USUARIOS
// ============================================================================

/**
 * Obtener estadísticas de usuarios
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getUserStats(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    // Nuevos usuarios en el período
    const { count: newUsers, error: newUsersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (newUsersError) throw newUsersError;

    // Usuarios activos (con actividad en el período)
    const { count: activeUsers, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', startDate);

    if (activeError) throw activeError;

    // Top usuarios por videos subidos
    const { data: topUploaders, error: uploadersError } = await supabase
      .from('videos')
      .select(`
        user_id,
        uploader:profiles!videos_user_id_fkey(
          id,
          username,
          avatar_url,
          full_name
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (uploadersError) throw uploadersError;

    // Contar videos por usuario
    const uploaderCounts = {};
    topUploaders.forEach(video => {
      const userId = video.user_id;
      if (!uploaderCounts[userId]) {
        uploaderCounts[userId] = {
          user: video.uploader,
          count: 0
        };
      }
      uploaderCounts[userId].count++;
    });

    const topUploadersList = Object.values(uploaderCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Distribución por roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('profiles')
      .select('role');

    if (rolesError) throw rolesError;

    const roleDistribution = {};
    rolesData.forEach(profile => {
      const role = profile.role || 'user';
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    });

    return {
      success: true,
      data: {
        newUsers: newUsers || 0,
        activeUsers: activeUsers || 0,
        topUploaders: topUploadersList,
        roleDistribution
      }
    };
  } catch (error) {
    console.error('Error al obtener stats de usuarios:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener crecimiento de usuarios por día
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getUserGrowth(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    const { data, error } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Agrupar por día
    const dailyData = {};
    data.forEach(profile => {
      const date = new Date(profile.created_at).toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

    // Crear array con todas las fechas del período
    const start = new Date(startDate);
    const end = new Date(endDate);
    const result = [];
    let cumulative = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = dailyData[dateStr] || 0;
      cumulative += count;
      
      result.push({
        date: dateStr,
        newUsers: count,
        totalUsers: cumulative
      });
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error al obtener crecimiento de usuarios:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============================================================================
// ANALYTICS DE PUNTOS Y TRANSACCIONES
// ============================================================================

/**
 * Obtener estadísticas de puntos
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getPointsStats(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    // Total de puntos distribuidos
    const { data: transactionsData, error: transError } = await supabase
      .from('points_transactions')
      .select('amount, transaction_type, points_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (transError) throw transError;

    let totalFreePoints = 0;
    let totalPremiumPoints = 0;
    let totalPointsEarned = 0;
    let totalPointsSpent = 0;

    const typeDistribution = {};

    transactionsData.forEach(trans => {
      const amount = trans.amount || 0;
      
      if (trans.points_type === 'free') {
        totalFreePoints += amount;
      } else if (trans.points_type === 'premium') {
        totalPremiumPoints += amount;
      }

      if (amount > 0) {
        totalPointsEarned += amount;
      } else {
        totalPointsSpent += Math.abs(amount);
      }

      const type = trans.transaction_type || 'other';
      typeDistribution[type] = (typeDistribution[type] || 0) + Math.abs(amount);
    });

    // Top usuarios por puntos ganados
    const { data: topEarners, error: earnersError } = await supabase
      .from('points_transactions')
      .select(`
        user_id,
        amount,
        user:profiles!points_transactions_user_id_fkey(
          id,
          username,
          avatar_url
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .gt('amount', 0);

    if (earnersError) throw earnersError;

    const earnerCounts = {};
    topEarners.forEach(trans => {
      const userId = trans.user_id;
      if (!earnerCounts[userId]) {
        earnerCounts[userId] = {
          user: trans.user,
          totalPoints: 0
        };
      }
      earnerCounts[userId].totalPoints += trans.amount;
    });

    const topEarnersList = Object.values(earnerCounts)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10);

    return {
      success: true,
      data: {
        totalFreePoints,
        totalPremiumPoints,
        totalPointsEarned,
        totalPointsSpent,
        typeDistribution,
        topEarners: topEarnersList
      }
    };
  } catch (error) {
    console.error('Error al obtener stats de puntos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener tendencias de puntos por día
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getPointsTrends(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    const { data, error } = await supabase
      .from('points_transactions')
      .select('created_at, amount, points_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Agrupar por día
    const dailyData = {};
    data.forEach(trans => {
      const date = new Date(trans.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          freePoints: 0,
          premiumPoints: 0,
          totalPoints: 0
        };
      }
      
      const amount = Math.abs(trans.amount || 0);
      dailyData[date].totalPoints += amount;
      
      if (trans.points_type === 'free') {
        dailyData[date].freePoints += amount;
      } else if (trans.points_type === 'premium') {
        dailyData[date].premiumPoints += amount;
      }
    });

    const result = Object.values(dailyData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error al obtener tendencias de puntos:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============================================================================
// ANALYTICS DE ENGAGEMENT
// ============================================================================

/**
 * Obtener métricas de engagement
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getEngagementMetrics(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    // Total de vistas
    const { data: videosData, error: videosError } = await supabase
      .from('videos')
      .select('views_count')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (videosError) throw videosError;

    const totalViews = videosData.reduce((sum, v) => sum + (v.views_count || 0), 0);

    // Total de likes
    const { count: totalLikes, error: likesError } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (likesError) throw likesError;

    // Total de comentarios
    const { count: totalComments, error: commentsError } = await supabase
      .from('video_comments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (commentsError) throw commentsError;

    // Total de shares (si existe la tabla)
    const { count: totalShares } = await supabase
      .from('video_shares')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Calcular tasas de engagement
    const likeRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : 0;
    const commentRate = totalViews > 0 ? ((totalComments / totalViews) * 100).toFixed(2) : 0;

    return {
      success: true,
      data: {
        totalViews,
        totalLikes,
        totalComments,
        totalShares: totalShares || 0,
        likeRate: parseFloat(likeRate),
        commentRate: parseFloat(commentRate),
        avgEngagement: ((parseFloat(likeRate) + parseFloat(commentRate)) / 2).toFixed(2)
      }
    };
  } catch (error) {
    console.error('Error al obtener métricas de engagement:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener tendencias de engagement por día
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getEngagementTrends(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    // Obtener likes por día
    const { data: likesData, error: likesError } = await supabase
      .from('video_likes')
      .select('created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (likesError) throw likesError;

    // Obtener comentarios por día
    const { data: commentsData, error: commentsError } = await supabase
      .from('video_comments')
      .select('created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (commentsError) throw commentsError;

    // Agrupar por día
    const dailyData = {};

    likesData.forEach(like => {
      const date = new Date(like.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, likes: 0, comments: 0 };
      }
      dailyData[date].likes++;
    });

    commentsData.forEach(comment => {
      const date = new Date(comment.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, likes: 0, comments: 0 };
      }
      dailyData[date].comments++;
    });

    const result = Object.values(dailyData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error al obtener tendencias de engagement:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============================================================================
// COMPARACIONES Y RANKINGS
// ============================================================================

/**
 * Comparar métricas entre dos períodos
 * @param {string} metric - Tipo de métrica a comparar
 * @param {Object} period1 - Primer período
 * @param {Object} period2 - Segundo período
 * @returns {Promise<Object>}
 */
export async function compareMetrics(metric, period1, period2) {
  try {
    let result1, result2;

    switch (metric) {
      case METRIC_TYPES.VIEWS:
      case METRIC_TYPES.UPLOADS:
        result1 = await getContentTrends(period1);
        result2 = await getContentTrends(period2);
        break;

      case METRIC_TYPES.USERS:
        result1 = await getUserGrowth(period1);
        result2 = await getUserGrowth(period2);
        break;

      case METRIC_TYPES.POINTS:
        result1 = await getPointsTrends(period1);
        result2 = await getPointsTrends(period2);
        break;

      case METRIC_TYPES.LIKES:
      case METRIC_TYPES.COMMENTS:
        result1 = await getEngagementTrends(period1);
        result2 = await getEngagementTrends(period2);
        break;

      default:
        throw new Error('Tipo de métrica no válido');
    }

    return {
      success: true,
      data: {
        period1: result1.data,
        period2: result2.data
      }
    };
  } catch (error) {
    console.error('Error al comparar métricas:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener ranking de categorías por engagement
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getCategoryRankings(options = {}) {
  try {
    const { period = TIME_PERIODS.LAST_30_DAYS, customStart, customEnd } = options;
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    const { data, error } = await supabase
      .from('videos')
      .select(`
        category_id,
        views_count,
        likes_count,
        comments_count,
        category:categories(
          id,
          name,
          slug,
          icon
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    // Agrupar y calcular scores
    const grouped = {};
    data.forEach(video => {
      const catId = video.category_id;
      if (!grouped[catId]) {
        grouped[catId] = {
          category: video.category,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          videoCount: 0
        };
      }
      grouped[catId].totalViews += video.views_count || 0;
      grouped[catId].totalLikes += video.likes_count || 0;
      grouped[catId].totalComments += video.comments_count || 0;
      grouped[catId].videoCount++;
    });

    // Calcular engagement score
    const rankings = Object.values(grouped).map(item => {
      const avgViews = item.videoCount > 0 ? item.totalViews / item.videoCount : 0;
      const avgLikes = item.videoCount > 0 ? item.totalLikes / item.videoCount : 0;
      const avgComments = item.videoCount > 0 ? item.totalComments / item.videoCount : 0;
      
      // Score ponderado: vistas * 1 + likes * 10 + comentarios * 20
      const engagementScore = avgViews + (avgLikes * 10) + (avgComments * 20);

      return {
        ...item,
        avgViews: Math.round(avgViews),
        avgLikes: Math.round(avgLikes),
        avgComments: Math.round(avgComments),
        engagementScore: Math.round(engagementScore)
      };
    }).sort((a, b) => b.engagementScore - a.engagementScore);

    return {
      success: true,
      data: rankings
    };
  } catch (error) {
    console.error('Error al obtener rankings de categorías:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============================================================================
// EXPORTACIÓN DE DATOS
// ============================================================================

/**
 * Exportar datos de analytics a CSV
 * @param {string} dataType - Tipo de datos a exportar
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function exportToCSV(dataType, options = {}) {
  try {
    let data, headers;

    switch (dataType) {
      case 'content':
        const contentResult = await getTopVideos({ ...options, limit: 1000 });
        data = contentResult.data;
        headers = ['ID', 'Título', 'Vistas', 'Likes', 'Comentarios', 'Creador', 'Fecha'];
        break;

      case 'users':
        const usersResult = await getUserStats(options);
        data = usersResult.data.topUploaders;
        headers = ['Usuario', 'Videos Subidos'];
        break;

      case 'points':
        const pointsResult = await getPointsStats(options);
        data = pointsResult.data.topEarners;
        headers = ['Usuario', 'Puntos Totales'];
        break;

      default:
        throw new Error('Tipo de exportación no válido');
    }

    // Convertir a CSV
    const csvRows = [headers.join(',')];
    data.forEach(row => {
      const values = Object.values(row).map(val => 
        typeof val === 'string' ? `"${val}"` : val
      );
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');

    return {
      success: true,
      data: csvContent,
      filename: `analytics_${dataType}_${new Date().toISOString().split('T')[0]}.csv`
    };
  } catch (error) {
    console.error('Error al exportar datos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// DASHBOARD COMPLETO
// ============================================================================

/**
 * Obtener datos completos para el dashboard de analytics
 * @param {Object} options - Opciones de período
 * @returns {Promise<Object>}
 */
export async function getDashboardData(options = {}) {
  try {
    const [
      overview,
      topVideos,
      contentByCategory,
      userStats,
      pointsStats,
      engagementMetrics,
      contentTrends,
      userGrowth
    ] = await Promise.all([
      getPlatformOverview(options),
      getTopVideos({ ...options, limit: 5 }),
      getContentByCategory(options),
      getUserStats(options),
      getPointsStats(options),
      getEngagementMetrics(options),
      getContentTrends(options),
      getUserGrowth(options)
    ]);

    return {
      success: true,
      data: {
        overview: overview.data,
        topVideos: topVideos.data,
        contentByCategory: contentByCategory.data,
        userStats: userStats.data,
        pointsStats: pointsStats.data,
        engagementMetrics: engagementMetrics.data,
        trends: {
          content: contentTrends.data,
          users: userGrowth.data
        }
      }
    };
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constantes
  TIME_PERIODS,
  METRIC_TYPES,
  CHART_TYPES,
  
  // Utilidades
  getDateRange,
  formatDateForDisplay,
  
  // Métricas generales
  getPlatformOverview,
  getDashboardData,
  
  // Analytics de contenido
  getTopVideos,
  getContentByCategory,
  getContentTrends,
  
  // Analytics de usuarios
  getUserStats,
  getUserGrowth,
  
  // Analytics de puntos
  getPointsStats,
  getPointsTrends,
  
  // Analytics de engagement
  getEngagementMetrics,
  getEngagementTrends,
  
  // Comparaciones y rankings
  compareMetrics,
  getCategoryRankings,
  
  // Exportación
  exportToCSV
};
