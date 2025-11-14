// ============================================
// PÁGINA: Admin Dashboard
// ============================================
// Dashboard principal del panel de administración
// Muestra KPIs, estadísticas, gráficas y actividad reciente
// ✅ CON GRÁFICAS: Recharts para visualización de datos
// ✅ SEPARADO: Videos horizontales vs Reels verticales
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

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
import AppIcon from '../../components/AppIcon';

// ============================================
// COLORES PARA GRÁFICAS
// ============================================
const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.secondary, 
  COLORS.accent,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.pink
];

// ============================================
// COMPONENTE: StatsCard
// ============================================

/**
 * Card de estadística con icono, valor y subtítulo
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
    // --- ✅ ESTA SECCIÓN DEBE TENER TODOS LOS CASE ---
    // Ajustamos los 'case' para que coincidan con los datos
    // que envía la base de datos (ej. 'video_upload', 'like_videos')
    switch (activity.action_type) {
      case 'user_registered':
        return { icon: 'UserPlus', color: 'text-green-600', bg: 'bg-green-100' };
      
      case 'video_upload':
        return { icon: 'Video', color: 'text-blue-600', bg: 'bg-blue-100' };
      
      case 'photo_upload':
        return { icon: 'Image', color: 'text-purple-600', bg: 'bg-purple-100' };
      
      case 'reward_redeemed':
        return { icon: 'Gift', color: 'text-orange-600', bg: 'bg-orange-100' };
      
      case 'like_videos':
        return { icon: 'Heart', color: 'text-red-500', bg: 'bg-red-100' };
        
      case 'points_earned':
        return { icon: 'Coins', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      
      case 'admin_adjustment':
        return { icon: 'Settings2', color: 'text-gray-600', bg: 'bg-gray-100' };

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
        </s.
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
  
  // Estados para métricas
  const [stats, setStats] = useState({
    total_users: 0,
    total_videos: 0,
    total_reels: 0,
    total_photos: 0,
    total_points_distributed: 0,
    active_users_today: 0,
    pending_reports: 0
  });

  // Estados para actividad y usuarios
  const [recentActivity, setRecentActivity] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  // Estados para gráficas
  const [contentChartData, setContentChartData] = useState([]);

  // ============================================
  // GENERAR DATOS DE GRÁFICA
  // ============================================
  const generateContentChartData = useCallback((videos, reels, photos) => {
    // Generar datos de ejemplo para las últimas 4 semanas
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    const data = weeks.map((week, index) => {
      // Distribución proporcional simple
      const factor = (index + 1) / 4;
      return {
        semana: week,
        videos: Math.round(videos * factor * Math.random()),
        reels: Math.round(reels * factor * Math.random()),
        fotos: Math.round(photos * factor * Math.random()),
      };
    });
    return data;
  }, []);

  // ============================================
  // CARGAR DATOS
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Cargar stats usando el servicio
      const statsData = await getAdminStats();
      
      setStats({
        total_users: statsData.stats?.total_users || 0,
        total_videos: statsData.stats?.total_videos || 0,
        total_reels: statsData.stats?.total_reels || 0,
        total_photos: statsData.stats?.total_photos || 0,
        total_points_distributed: statsData.stats?.total_points_distributed || 0,
        active_users_today: statsData.stats?.active_users_today || 0,
        pending_reports: statsData.stats?.pending_reports || 0
      });

      // Generar datos de gráfica
      const chartData = generateContentChartData(
        statsData.stats?.total_videos || 0,
        statsData.stats?.total_reels || 0,
        statsData.stats?.total_photos || 0
      );
      setContentChartData(chartData);

      // Cargar actividad y top users
      const activityData = await getRecentActivity(10);
      const topUsersData = await getTopUsersByPoints(5);
      
      setRecentActivity(activityData.activities || []);
      setTopUsers(topUsersData.users || []);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [generateContentChartData]);

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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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
      {/* GRÁFICA DE CONTENIDO */}
      {/* ============================================ */}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Contenido Subido</h2>
            <p className="text-sm text-gray-500 mt-1">Distribución semanal del contenido</p>
          </div>
          <AppIcon name="BarChart3" className="w-5 h-5 text-gray-400" />
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Cargando gráfica...</p>
            </div>
          </div>
        ) : contentChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={contentChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="semana" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              <Bar 
                dataKey="videos" 
                name="Videos" 
                fill={COLORS.secondary} 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="reels" 
                name="Reels" 
                fill={COLORS.pink} 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="fotos" 
                name="Fotos" 
                fill={COLORS.cyan} 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <AppIcon name="BarChart3" className="w-16 h-16 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Sin datos para mostrar</p>
              <p className="text-xs text-gray-500 mt-1">Los datos aparecerán cuando haya contenido subido</p>
            </div>
          </div>
        )}
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
            <div className="text-center py-12 text-gray-500">
              <AppIcon name="Inbox" className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">No hay actividad reciente</p>
              <p className="text-xs mt-1">La actividad aparecerá aquí cuando los usuarios interactúen</p>
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
            <div className="text-center py-12 text-gray-500">
              <AppIcon name="Users" className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">No hay usuarios registrados aún</p>
              <p className="text-xs mt-1">Los top usuarios aparecerán aquí</p>
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
      {/* SECCIÓN DE GRÁFICA DE DISTRIBUCIÓN */}
      {/* ============================================ */}

      {canAccess('view_analytics') && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Distribución de Contenido</h2>
              <p className="text-sm text-gray-500 mt-1">Proporción de tipos de contenido</p>
            </div>
            <Link
              to="/admin/analytics"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>Ver Analytics</span>
              <AppIcon name="ArrowRight" className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">Cargando gráfica...</p>
              </div>
            </div>
          ) : (stats.total_videos + stats.total_reels + stats.total_photos) > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfica de Pie */}
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Videos', value: stats.total_videos },
                      { name: 'Reels', value: stats.total_reels },
                      { name: 'Fotos', value: stats.total_photos },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill={COLORS.secondary} />
                    <Cell fill={COLORS.pink} />
                    <Cell fill={COLORS.cyan} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Estadísticas Detalladas */}
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.secondary }}></div>
                    <span className="text-sm font-medium text-gray-700">Videos Horizontales</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.total_videos}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pink }}></div>
                    <span className="text-sm font-medium text-gray-700">Reels Verticales</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.total_reels}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.cyan }}></div>
                    <span className="text-sm font-medium text-gray-700">Fotos</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.total_photos}</span>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Total de Contenido</span>
                    <span className="text-xl font-bold text-blue-600">
                      {stats.total_videos + stats.total_reels + stats.total_photos}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <AppIcon name="PieChart" className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Sin contenido para analizar</p>
                <p className="text-xs text-gray-500 mt-1">La distribución aparecerá cuando haya contenido subido</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
