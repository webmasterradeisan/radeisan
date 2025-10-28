// ============================================
// PÁGINA: Admin Dashboard
// ============================================
// Dashboard principal del panel de administración
// Muestra KPIs, estadísticas y actividad reciente
// ✅ MODIFICADO: Separa Videos, Reels y Fotos
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Hooks
import { useAdminRole } from '../../hooks/useAdminRole';

// Servicios
import { supabase } from '../../supabase';
import { 
  getRecentActivity, 
  getTopUsersByPoints,
  formatNumber,
  formatRelativeDate
} from '../../services/adminService';

// Componentes
import AppIcon from '../../components/AppIcon';

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
  subtitle = null,
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

          {/* Subtítulo */}
          {subtitle && !loading && (
            <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
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
  const { isAdmin, loading: roleLoading, canAccess } = useAdminRole();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_users: 0,
    total_videos: 0,
    total_reels: 0,
    total_photos: 0,
    total_points_distributed: 0,
    active_users_today: 0,
    pending_reports: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  // ============================================
  // FETCH STATS PERSONALIZADAS
  // ============================================
  const fetchStats = useCallback(async () => {
    try {
      // Total de usuarios
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total de videos horizontales
      const { count: totalVideos } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('orientation', 'horizontal');

      // Total de reels (verticales)
      const { count: totalReels } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('orientation', 'vertical');

      // Total de fotos
      const { count: totalPhotos } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true });

      // Puntos distribuidos
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('free_points, premium_points');

      const totalPoints = pointsData?.reduce(
        (sum, p) => sum + (p.free_points || 0) + (p.premium_points || 0),
        0
      ) || 0;

      // Usuarios activos hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: activeToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', today.toISOString());

      // Reportes pendientes
      const { count: pendingReports } = await supabase
        .from('content_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        total_users: totalUsers || 0,
        total_videos: totalVideos || 0,
        total_reels: totalReels || 0,
        total_photos: totalPhotos || 0,
        total_points_distributed: totalPoints,
        active_users_today: activeToday || 0,
        pending_reports: pendingReports || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
    }
  }, []);

  // ============================================
  // CARGAR DATOS
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchStats(),
        getRecentActivity(10).then(data => setRecentActivity(data.activities || [])),
        getTopUsersByPoints(5).then(data => setTopUsers(data.users || []))
      ]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (!roleLoading && isAdmin) {
      loadData();
    }
  }, [roleLoading, isAdmin, loadData]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleRefresh = () => {
    loadData();
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel Admin</h1>
            <p className="text-sm text-gray-600 mt-1">
              Vista general de tu plataforma
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      {/* GRID DE KPIs - 5 TARJETAS */}
      {/* ============================================ */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Usuarios"
          value={stats?.total_users || 0}
          icon="Users"
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          subtitle="Total registrados"
          loading={loading}
          link={canAccess('manage_users') ? '/admin/users' : null}
        />

        <StatsCard
          title="Videos"
          value={stats?.total_videos || 0}
          icon="Monitor"
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
          subtitle="Formato horizontal"
          loading={loading}
        />

        <StatsCard
          title="Reels"
          value={stats?.total_reels || 0}
          icon="Smartphone"
          iconColor="text-pink-600"
          iconBg="bg-pink-100"
          subtitle="Formato vertical"
          loading={loading}
        />

        <StatsCard
          title="Fotos"
          value={stats?.total_photos || 0}
          icon="Image"
          iconColor="text-cyan-600"
          iconBg="bg-cyan-100"
          subtitle="Galería de imágenes"
          loading={loading}
        />

        <StatsCard
          title="Puntos"
          value={stats?.total_points_distributed || 0}
          icon="Coins"
          iconColor="text-yellow-600"
          iconBg="bg-yellow-100"
          subtitle="Distribuidos"
          loading={loading}
          link={canAccess('manage_points') ? '/admin/points' : null}
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
              <p className="text-xs text-gray-500 mt-1">Próximamente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
