// ============================================
// PÁGINA: Admin Dashboard
// ============================================
// Dashboard principal del panel de administración
// Muestra KPIs, estadísticas y actividad reciente
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Hooks
import { useAdminRole } from '../../hooks/useAdminRole';

// Servicios
import { 
  getAdminStats, 
  getRecentActivity, 
  getTopUsersByPoints,
  formatNumber,
  formatRelativeDate
} from '../../services/adminService';

// Componentes
import { AppIcon } from '../../components/AppIcon';

// ============================================
// COMPONENTE: StatsCard
// ============================================

/**
 * Card de estadística con icono, valor y variación
 */
const StatsCard = ({ 
  title, 
  value, 
  icon, 
  iconColor, 
  iconBg, 
  change = null,
  loading = false,
  link = null
}) => {
  const CardWrapper = link ? Link : 'div';
  const cardProps = link ? { to: link } : {};

  return (
    <CardWrapper
      {...cardProps}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200 ${
        link ? 'hover:shadow-md hover:border-blue-300 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Título */}
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          
          {/* Valor */}
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
          )}

          {/* Variación */}
          {change !== null && !loading && (
            <div className="flex items-center mt-2 space-x-1">
              {change > 0 ? (
                <>
                  <AppIcon name="TrendingUp" className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    +{change}%
                  </span>
                </>
              ) : change < 0 ? (
                <>
                  <AppIcon name="TrendingDown" className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    {change}%
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-gray-500">
                  Sin cambios
                </span>
              )}
              <span className="text-xs text-gray-500">vs semana anterior</span>
            </div>
          )}
        </div>

        {/* Icono */}
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${iconBg}`}>
          <AppIcon name={icon} className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </CardWrapper>
  );
};

// ============================================
// COMPONENTE: ActivityItem
// ============================================

/**
 * Item de actividad reciente
 */
const ActivityItem = ({ activity }) => {
  const getActivityIcon = () => {
    switch (activity.action_type) {
      case 'user_registered':
        return { icon: 'UserPlus', color: 'text-green-600', bg: 'bg-green-100' };
      case 'video_uploaded':
        return { icon: 'Video', color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'photo_uploaded':
        return { icon: 'Image', color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'reward_redeemed':
        return { icon: 'Gift', color: 'text-orange-600', bg: 'bg-orange-100' };
      case 'points_earned':
        return { icon: 'Coins', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      default:
        return { icon: 'Activity', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const { icon, color, bg } = getActivityIcon();

  return (
    <div className="flex items-start space-x-3 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
      {/* Icono */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${bg} flex-shrink-0`}>
        <AppIcon name={icon} className={`w-4 h-4 ${color}`} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 font-medium truncate">
          {activity.user_name || 'Usuario'}
        </p>
        <p className="text-sm text-gray-600 truncate">
          {activity.description}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatRelativeDate(activity.created_at)}
        </p>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: TopUserItem
// ============================================

/**
 * Item de top usuario
 */
const TopUserItem = ({ user, rank }) => {
  const getMedalColor = () => {
    switch (rank) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-orange-600';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="flex items-center space-x-3 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
      {/* Ranking */}
      <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
        {rank <= 3 ? (
          <AppIcon name="Medal" className={`w-6 h-6 ${getMedalColor()}`} />
        ) : (
          <span className="text-sm font-bold text-gray-500">#{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">
              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user.full_name || 'Usuario'}
        </p>
        <div className="flex items-center space-x-2 mt-0.5">
          <AppIcon name="Coins" className="w-3 h-3 text-yellow-600" />
          <span className="text-xs text-gray-600">
            {formatNumber(user.total_points)} puntos
          </span>
        </div>
      </div>

      {/* Badge verificado */}
      {user.is_verified && (
        <AppIcon name="BadgeCheck" className="w-5 h-5 text-blue-600 flex-shrink-0" />
      )}
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL: AdminDashboard
// ============================================

const AdminDashboard = () => {
  const { canAccess } = useAdminRole();

  // ============================================
  // ESTADO LOCAL
  // ============================================

  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // ============================================
  // FUNCIONES
  // ============================================

  /**
   * Cargar datos del dashboard
   */
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Cargar estadísticas principales
      const statsData = await getAdminStats();
      setStats(statsData);

      // Cargar actividad reciente
      const activityData = await getRecentActivity(10);
      setRecentActivity(activityData || []);

      // Cargar top usuarios
      const topUsersData = await getTopUsersByPoints(5);
      setTopUsers(topUsersData || []);

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh manual
   */
  const handleRefresh = () => {
    setLoading(true);
    loadDashboardData();
  };

  // ============================================
  // EFECTOS
  // ============================================

  // Cargar datos al montar
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div className="space-y-6 p-6">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Vista general de tu plataforma
          </p>
        </div>

        {/* Botón de refresh */}
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <span className="text-xs text-gray-500">
            Última actualización: {formatRelativeDate(lastUpdate)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <AppIcon 
              name="RefreshCw" 
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} 
            />
            Actualizar
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* MENSAJE DE ERROR */}
      {/* ============================================ */}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AppIcon name="AlertCircle" className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="text-sm font-medium text-red-800 hover:text-red-900 mt-2 underline"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* GRID DE KPIs */}
      {/* ============================================ */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          title="Total de Usuarios"
          value={stats?.total_users || 0}
          icon="Users"
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          change={stats?.users_growth}
          loading={loading}
          link={canAccess('manage_users') ? '/admin/users' : null}
        />

        <StatsCard
          title="Total de Contenido"
          value={stats?.total_content || 0}
          icon="FileVideo"
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
          change={stats?.content_growth}
          loading={loading}
        />

        <StatsCard
          title="Puntos Distribuidos"
          value={stats?.total_points_distributed || 0}
          icon="Coins"
          iconColor="text-yellow-600"
          iconBg="bg-yellow-100"
          loading={loading}
          link={canAccess('manage_points') ? '/admin/points' : null}
        />

        <StatsCard
          title="Ventas Premium"
          value={stats?.premium_sales ? `$${formatNumber(stats.premium_sales)}` : '$0'}
          icon="DollarSign"
          iconColor="text-green-600"
          iconBg="bg-green-100"
          change={stats?.sales_growth}
          loading={loading}
        />

        <StatsCard
          title="Usuarios Activos Hoy"
          value={stats?.active_users_today || 0}
          icon="Activity"
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100"
          loading={loading}
        />

        <StatsCard
          title="Reportes Pendientes"
          value={stats?.pending_reports || 0}
          icon="Shield"
          iconColor={stats?.pending_reports > 0 ? 'text-red-600' : 'text-gray-600'}
          iconBg={stats?.pending_reports > 0 ? 'bg-red-100' : 'bg-gray-100'}
          loading={loading}
          link={canAccess('moderate_content') ? '/admin/moderation' : null}
        />
      </div>

      {/* ============================================ */}
      {/* GRID DE SECCIONES ADICIONALES */}
      {/* ============================================ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ============================================ */}
        {/* ACTIVIDAD RECIENTE */}
        {/* ============================================ */}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
            <AppIcon name="Clock" className="w-5 h-5 text-gray-400" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AppIcon name="Inbox" className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No hay actividad reciente</p>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* TOP USUARIOS */}
        {/* ============================================ */}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Usuarios</h2>
            <AppIcon name="Trophy" className="w-5 h-5 text-yellow-600" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-gray-200 animate-pulse"></div>
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : topUsers.length > 0 ? (
            <div className="space-y-1">
              {topUsers.map((user, index) => (
                <TopUserItem key={user.id} user={user} rank={index + 1} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AppIcon name="Users" className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No hay usuarios registrados aún</p>
            </div>
          )}

          {/* Link a ver todos */}
          {topUsers.length > 0 && canAccess('manage_users') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                to="/admin/users"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center space-x-1"
              >
                <span>Ver todos los usuarios</span>
                <AppIcon name="ArrowRight" className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* SECCIÓN DE GRÁFICA (PLACEHOLDER) */}
      {/* ============================================ */}

      {canAccess('view_analytics') && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Crecimiento de la Plataforma</h2>
            <Link
              to="/admin/analytics"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>Ver Analytics</span>
              <AppIcon name="ArrowRight" className="w-4 h-4" />
            </Link>
          </div>

          {/* Placeholder para gráfica */}
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <AppIcon name="BarChart3" className="w-16 h-16 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Gráfica de Crecimiento</p>
              <p className="text-xs text-gray-500 mt-1">Se implementará con Recharts en Sprint 4</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
