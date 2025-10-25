// AdvancedAnalytics.jsx - Dashboard completo de analytics con gráficos
// Sprint 6: Moderación y Analytics
// Ruta: src/pages/admin-analytics/AdvancedAnalytics.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import {
  getPlatformOverview,
  getDashboardData,
  getTopVideos,
  getContentByCategory,
  getContentTrends,
  getUserGrowth,
  getPointsTrends,
  getEngagementTrends,
  getCategoryRankings,
  exportToCSV,
  TIME_PERIODS,
  formatDateForDisplay
} from '../../services/analyticsService';

// ============================================================================
// CONSTANTES
// ============================================================================

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#a855f7',
  pink: '#ec4899',
  indigo: '#6366f1'
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.purple,
  COLORS.pink,
  COLORS.indigo
];

const PERIOD_OPTIONS = [
  { value: TIME_PERIODS.LAST_7_DAYS, label: 'Últimos 7 días' },
  { value: TIME_PERIODS.LAST_30_DAYS, label: 'Últimos 30 días' },
  { value: TIME_PERIODS.THIS_MONTH, label: 'Este mes' },
  { value: TIME_PERIODS.LAST_MONTH, label: 'Mes anterior' },
  { value: TIME_PERIODS.THIS_YEAR, label: 'Este año' }
];

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const StatCard = ({ icon, label, value, change, loading = false, trend = 'neutral' }) => (
  <div className="bg-card rounded-lg p-6 border border-border">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-full bg-${icon === 'Users' ? 'primary' : icon === 'Video' ? 'secondary' : icon === 'Heart' ? 'danger' : 'success'}/10`}>
        <Icon name={icon} size={24} className={`text-${icon === 'Users' ? 'primary' : icon === 'Video' ? 'secondary' : icon === 'Heart' ? 'danger' : 'success'}`} />
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm font-medium ${
          trend === 'up' ? 'text-success' : 
          trend === 'down' ? 'text-danger' : 
          'text-muted-foreground'
        }`}>
          {trend === 'up' && <Icon name="TrendingUp" size={16} />}
          {trend === 'down' && <Icon name="TrendingDown" size={16} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      {loading ? (
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      ) : (
        <p className="text-3xl font-bold text-foreground">{value}</p>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, children, loading = false, onExport = null }) => (
  <div className="bg-card rounded-lg border border-border overflow-hidden">
    <div className="flex items-center justify-between p-4 border-b border-border">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {onExport && (
        <Button onClick={onExport} variant="outline" size="sm">
          <Icon name="Download" size={16} className="mr-2" />
          Exportar
        </Button>
      )}
    </div>
    <div className="p-4">
      {loading ? (
        <div className="flex items-center justify-center h-80">
          <Icon name="Loader" size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const AdvancedAnalytics = () => {
  const { user } = useAuth();

  // Estados principales
  const [period, setPeriod] = useState(TIME_PERIODS.LAST_30_DAYS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Estados de datos
  const [overview, setOverview] = useState(null);
  const [topVideos, setTopVideos] = useState([]);
  const [contentByCategory, setContentByCategory] = useState([]);
  const [contentTrends, setContentTrends] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [pointsTrends, setPointsTrends] = useState([]);
  const [engagementTrends, setEngagementTrends] = useState([]);
  const [categoryRankings, setCategoryRankings] = useState([]);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    loadAllData();
  }, [period]);

  // ============================================================================
  // FUNCIONES DE CARGA
  // ============================================================================

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const options = { period };

      const [
        overviewResult,
        topVideosResult,
        categoryResult,
        trendsResult,
        growthResult,
        pointsResult,
        engagementResult,
        rankingsResult
      ] = await Promise.all([
        getPlatformOverview(options),
        getTopVideos({ ...options, limit: 10 }),
        getContentByCategory(options),
        getContentTrends(options),
        getUserGrowth(options),
        getPointsTrends(options),
        getEngagementTrends(options),
        getCategoryRankings(options)
      ]);

      if (overviewResult.success) setOverview(overviewResult.data);
      if (topVideosResult.success) setTopVideos(topVideosResult.data);
      if (categoryResult.success) setContentByCategory(categoryResult.data);
      if (trendsResult.success) setContentTrends(trendsResult.data);
      if (growthResult.success) setUserGrowth(growthResult.data);
      if (pointsResult.success) setPointsTrends(pointsResult.data);
      if (engagementResult.success) setEngagementTrends(engagementResult.data);
      if (rankingsResult.success) setCategoryRankings(rankingsResult.data);

    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Error al cargar los datos de analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleExportData = useCallback(async (dataType) => {
    try {
      const result = await exportToCSV(dataType, { period });
      
      if (result.success) {
        // Crear blob y descargar
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', result.filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Error al exportar los datos');
    }
  }, [period]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const pieChartData = useMemo(() => {
    return contentByCategory.slice(0, 6).map((cat, index) => ({
      name: cat.category?.name || 'Sin categoría',
      value: cat.count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [contentByCategory]);

  const topCategoriesData = useMemo(() => {
    return categoryRankings.slice(0, 8).map(cat => ({
      name: cat.category?.name || 'Sin categoría',
      engagement: cat.engagementScore,
      videos: cat.videoCount
    }));
  }, [categoryRankings]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStatsCards = () => {
    if (!overview) return null;

    const usersTrend = overview.users.growth > 0 ? 'up' : overview.users.growth < 0 ? 'down' : 'neutral';
    const contentTrend = overview.content.growth > 0 ? 'up' : overview.content.growth < 0 ? 'down' : 'neutral';

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon="Users"
          label="Usuarios Activos"
          value={overview.users.active.toLocaleString()}
          change={overview.users.growth}
          trend={usersTrend}
          loading={loading}
        />
        <StatCard
          icon="Video"
          label="Nuevos Videos"
          value={overview.content.newVideos.toLocaleString()}
          change={overview.content.growth}
          trend={contentTrend}
          loading={loading}
        />
        <StatCard
          icon="Eye"
          label="Total Vistas"
          value={overview.engagement.views.toLocaleString()}
          loading={loading}
        />
        <StatCard
          icon="Heart"
          label="Total Likes"
          value={overview.engagement.likes.toLocaleString()}
          loading={loading}
        />
      </div>
    );
  };

  const renderContentTrendsChart = () => {
    if (!contentTrends.length) {
      return (
        <div className="flex items-center justify-center h-80 text-muted-foreground">
          <div className="text-center">
            <Icon name="TrendingUp" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay datos de tendencias disponibles</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={contentTrends}>
          <defs>
            <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            stroke="#6b7280"
          />
          <YAxis stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="uploads"
            name="Videos Subidos"
            stroke={COLORS.primary}
            fill="url(#colorUploads)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="views"
            name="Vistas"
            stroke={COLORS.success}
            fill="url(#colorViews)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderUserGrowthChart = () => {
    if (!userGrowth.length) {
      return (
        <div className="flex items-center justify-center h-80 text-muted-foreground">
          <div className="text-center">
            <Icon name="Users" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay datos de crecimiento disponibles</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={userGrowth}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            stroke="#6b7280"
          />
          <YAxis stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="newUsers"
            name="Nuevos Usuarios"
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={{ fill: COLORS.primary, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="totalUsers"
            name="Total Acumulado"
            stroke={COLORS.secondary}
            strokeWidth={2}
            dot={{ fill: COLORS.secondary, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderCategoryDistributionChart = () => {
    if (!pieChartData.length) {
      return (
        <div className="flex items-center justify-center h-80 text-muted-foreground">
          <div className="text-center">
            <Icon name="PieChart" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay datos de categorías disponibles</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieChartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderCategoryRankingsChart = () => {
    if (!topCategoriesData.length) {
      return (
        <div className="flex items-center justify-center h-80 text-muted-foreground">
          <div className="text-center">
            <Icon name="BarChart" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay datos de rankings disponibles</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topCategoriesData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" />
          <YAxis dataKey="name" type="category" width={100} stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="engagement" name="Score de Engagement" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPointsTrendsChart = () => {
    if (!pointsTrends.length) {
      return (
        <div className="flex items-center justify-center h-80 text-muted-foreground">
          <div className="text-center">
            <Icon name="DollarSign" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay datos de puntos disponibles</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={pointsTrends}>
          <defs>
            <linearGradient id="colorFree" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPremium" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            stroke="#6b7280"
          />
          <YAxis stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="freePoints"
            name="Puntos Gratis"
            stroke={COLORS.success}
            fill="url(#colorFree)"
            strokeWidth={2}
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="premiumPoints"
            name="Puntos Premium"
            stroke={COLORS.warning}
            fill="url(#colorPremium)"
            strokeWidth={2}
            stackId="1"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderEngagementChart = () => {
    if (!engagementTrends.length) {
      return (
        <div className="flex items-center justify-center h-80 text-muted-foreground">
          <div className="text-center">
            <Icon name="Activity" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay datos de engagement disponibles</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={engagementTrends}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            stroke="#6b7280"
          />
          <YAxis stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="likes"
            name="Likes"
            stroke={COLORS.danger}
            strokeWidth={2}
            dot={{ fill: COLORS.danger, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="comments"
            name="Comentarios"
            stroke={COLORS.info}
            strokeWidth={2}
            dot={{ fill: COLORS.info, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderTopVideosTable = () => {
    if (!topVideos.length) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <Icon name="Video" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay videos destacados en este período</p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">#</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Video</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Creador</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Vistas</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Likes</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Comentarios</th>
            </tr>
          </thead>
          <tbody>
            {topVideos.map((video, index) => (
              <tr key={video.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-foreground">#{index + 1}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {video.thumbnail_url && (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-16 h-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {video.title}
                      </p>
                      {video.category && (
                        <p className="text-xs text-muted-foreground">
                          {video.category.name}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {video.uploader?.avatar_url && (
                      <img
                        src={video.uploader.avatar_url}
                        alt={video.uploader.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm text-foreground">
                      {video.uploader?.username || 'Desconocido'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-foreground">
                    {(video.views_count || 0).toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-foreground">
                    {(video.likes_count || 0).toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-foreground">
                    {(video.comments_count || 0).toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Analytics Avanzado
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Métricas detalladas y visualización de datos de la plataforma
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="min-w-[180px]"
              >
                {PERIOD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Button
                onClick={refresh}
                disabled={refreshing}
                variant="outline"
              >
                {refreshing ? (
                  <>
                    <Icon name="Loader" size={16} className="animate-spin mr-2" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Icon name="RefreshCw" size={16} className="mr-2" />
                    Actualizar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <Icon name="AlertCircle" size={18} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-danger">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-danger hover:text-danger/80"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tendencias de Contenido */}
          <ChartCard
            title="Tendencias de Contenido"
            loading={loading}
            onExport={() => handleExportData('content')}
          >
            {renderContentTrendsChart()}
          </ChartCard>

          {/* Crecimiento de Usuarios */}
          <ChartCard
            title="Crecimiento de Usuarios"
            loading={loading}
            onExport={() => handleExportData('users')}
          >
            {renderUserGrowthChart()}
          </ChartCard>

          {/* Distribución por Categoría */}
          <ChartCard
            title="Distribución de Contenido por Categoría"
            loading={loading}
          >
            {renderCategoryDistributionChart()}
          </ChartCard>

          {/* Rankings de Categorías */}
          <ChartCard
            title="Top Categorías por Engagement"
            loading={loading}
          >
            {renderCategoryRankingsChart()}
          </ChartCard>

          {/* Tendencias de Puntos */}
          <ChartCard
            title="Distribución de Puntos"
            loading={loading}
            onExport={() => handleExportData('points')}
          >
            {renderPointsTrendsChart()}
          </ChartCard>

          {/* Engagement */}
          <ChartCard
            title="Métricas de Engagement"
            loading={loading}
          >
            {renderEngagementChart()}
          </ChartCard>
        </div>

        {/* Top Videos Table */}
        <ChartCard
          title="Top Videos del Período"
          loading={loading}
        >
          {renderTopVideosTable()}
        </ChartCard>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
