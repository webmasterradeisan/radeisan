// src/pages/admin-dashboard/AdminDashboard.jsx
// ✅ SPRINT 4 - Panel Admin Core: Dashboard con Gráficas
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para métricas
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalVideos: 0,
    totalPhotos: 0,
    totalCategories: 0,
    totalFreePoints: 0,
    totalPremiumPoints: 0,
    activeUsers: 0,
    newUsersToday: 0
  });

  // Estados para gráficas
  const [usersChartData, setUsersChartData] = useState([]);
  const [contentChartData, setContentChartData] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  // Colores para las gráficas
  const COLORS = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    purple: '#a855f7',
    pink: '#ec4899'
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

  // ===============================
  // FETCH MÉTRICAS PRINCIPALES
  // ===============================
  const fetchMetrics = useCallback(async () => {
    try {
      // Total de usuarios
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Usuarios activos (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', sevenDaysAgo.toISOString());

      // Nuevos usuarios hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Total de videos
      const { count: totalVideos } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true });

      // Total de fotos
      const { count: totalPhotos } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true });

      // Total de categorías activas
      const { count: totalCategories } = await supabase
        .from('content_categories')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Suma total de puntos (free y premium)
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('free_points, premium_points');

      const totalFreePoints = pointsData?.reduce((sum, p) => sum + (p.free_points || 0), 0) || 0;
      const totalPremiumPoints = pointsData?.reduce((sum, p) => sum + (p.premium_points || 0), 0) || 0;

      setMetrics({
        totalUsers: totalUsers || 0,
        totalVideos: totalVideos || 0,
        totalPhotos: totalPhotos || 0,
        totalCategories: totalCategories || 0,
        totalFreePoints,
        totalPremiumPoints,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0
      });

    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, []);

  // ===============================
  // FETCH DATOS PARA GRÁFICA DE USUARIOS
  // ===============================
  const fetchUsersChartData = useCallback(async () => {
    try {
      // Obtener usuarios de los últimos 30 días agrupados por día
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: users } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Agrupar por día
      const groupedByDay = {};
      users?.forEach(user => {
        const date = new Date(user.created_at);
        const dateKey = `${date.getDate()}/${date.getMonth() + 1}`;
        groupedByDay[dateKey] = (groupedByDay[dateKey] || 0) + 1;
      });

      // Convertir a formato para Recharts
      const chartData = Object.entries(groupedByDay).map(([date, count]) => ({
        date,
        usuarios: count
      }));

      setUsersChartData(chartData);
    } catch (error) {
      console.error('Error fetching users chart data:', error);
    }
  }, []);

  // ===============================
  // FETCH DATOS PARA GRÁFICA DE CONTENIDO
  // ===============================
  const fetchContentChartData = useCallback(async () => {
    try {
      // Obtener videos y fotos de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: videos } = await supabase
        .from('videos')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { data: photos } = await supabase
        .from('photos')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Agrupar por semana
      const getWeekNumber = (date) => {
        const d = new Date(date);
        const week = Math.ceil((d.getDate()) / 7);
        return `Semana ${week}`;
      };

      const weeklyData = {};
      
      videos?.forEach(video => {
        const week = getWeekNumber(video.created_at);
        if (!weeklyData[week]) weeklyData[week] = { semana: week, videos: 0, fotos: 0 };
        weeklyData[week].videos++;
      });

      photos?.forEach(photo => {
        const week = getWeekNumber(photo.created_at);
        if (!weeklyData[week]) weeklyData[week] = { semana: week, videos: 0, fotos: 0 };
        weeklyData[week].fotos++;
      });

      setContentChartData(Object.values(weeklyData));
    } catch (error) {
      console.error('Error fetching content chart data:', error);
    }
  }, []);

  // ===============================
  // FETCH DATOS PARA GRÁFICA DE CATEGORÍAS
  // ===============================
  const fetchCategoryChartData = useCallback(async () => {
    try {
      const { data: categories } = await supabase
        .from('content_categories')
        .select('id, name')
        .eq('is_active', true);
      
      // Contar videos por categoría
      const categoriesWithCounts = await Promise.all(
        (categories || []).map(async (cat) => {
          const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id);
          return { name: cat.name, value: count || 0 };
        })
      );

      const chartData = categoriesWithCounts.filter(item => item.value > 0);
      setCategoryChartData(chartData);
    } catch (error) {
      console.error('Error fetching category chart data:', error);
    }
  }, []);

  // ===============================
  // FETCH ACTIVIDAD RECIENTE
  // ===============================
  const fetchRecentActivity = useCallback(async () => {
    try {
      // Obtener últimas transacciones de puntos
      const { data: transactions } = await supabase
        .from('points_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Enriquecer con info de usuarios
      if (transactions && transactions.length > 0) {
        const userIds = [...new Set(transactions.map(t => t.user_id).filter(Boolean))];
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);
        
        const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));
        
        transactions.forEach(t => {
          t.profiles = usersMap[t.user_id] || null;
        });
      }

      setRecentActivity(transactions || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  }, []);

  // ===============================
  // FETCH TOP USUARIOS
  // ===============================
  const fetchTopUsers = useCallback(async () => {
    try {
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('user_id, free_points, premium_points')
        .order('free_points', { ascending: false })
        .limit(5);
      
      // Enriquecer con info de usuarios
      let topUsersData = [];
      if (pointsData && pointsData.length > 0) {
        const userIds = pointsData.map(p => p.user_id);
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);
        
        const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));
        
        topUsersData = pointsData.map(p => ({
          ...p,
          profiles: usersMap[p.user_id] || null
        }));
      }

      setTopUsers(topUsersData);
    } catch (error) {
      console.error('Error fetching top users:', error);
    }
  }, []);

  // ===============================
  // FETCH INICIAL Y REFRESH
  // ===============================
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchUsersChartData(),
        fetchContentChartData(),
        fetchCategoryChartData(),
        fetchRecentActivity(),
        fetchTopUsers()
      ]);
    } finally {
      setLoading(false);
    }
  }, [
    fetchMetrics, 
    fetchUsersChartData, 
    fetchContentChartData,
    fetchCategoryChartData,
    fetchRecentActivity,
    fetchTopUsers
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <>
      <Helmet>
        <title>Dashboard Admin - Radeisan</title>
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Bienvenido de nuevo, {user?.user_metadata?.full_name || 'Admin'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <Icon 
              name="RefreshCw" 
              size={16} 
              className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} 
            />
            Actualizar
          </Button>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Usuarios */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Users" size={24} color={COLORS.primary} />
              </div>
              <span className="text-xs text-success flex items-center">
                <Icon name="TrendingUp" size={14} className="mr-1" />
                +{metrics.newUsersToday} hoy
              </span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalUsers.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Total Usuarios</p>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {metrics.activeUsers} activos (7 días)
              </p>
            </div>
          </div>

          {/* Total Videos */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Icon name="Video" size={24} color={COLORS.secondary} />
              </div>
              <Link to="/admin/moderation">
                <Button variant="ghost" size="sm">
                  <Icon name="Eye" size={14} />
                </Button>
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalVideos.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Total Videos</p>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {metrics.totalPhotos.toLocaleString()} fotos
              </p>
            </div>
          </div>

          {/* Puntos Gratis */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Icon name="Coins" size={24} color={COLORS.accent} />
              </div>
              <Link to="/admin/points">
                <Button variant="ghost" size="sm">
                  <Icon name="Settings" size={14} />
                </Button>
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalFreePoints.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Puntos Gratis</p>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {metrics.totalPremiumPoints.toLocaleString()} premium
              </p>
            </div>
          </div>

          {/* Categorías */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Icon name="Layers" size={24} color={COLORS.success} />
              </div>
              <Link to="/admin/categories">
                <Button variant="ghost" size="sm">
                  <Icon name="Edit" size={14} />
                </Button>
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalCategories}
            </h3>
            <p className="text-sm text-muted-foreground">Categorías Activas</p>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Sistema configurado
              </p>
            </div>
          </div>
        </div>

        {/* Gráficas Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfica de Usuarios Nuevos */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Usuarios Nuevos
                </h3>
                <p className="text-sm text-muted-foreground">Últimos 30 días</p>
              </div>
              <Icon name="Users" size={20} color={COLORS.primary} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usersChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="usuarios" 
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica de Contenido */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Contenido Subido
                </h3>
                <p className="text-sm text-muted-foreground">Por semana</p>
              </div>
              <Icon name="BarChart3" size={20} color={COLORS.secondary} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="semana" 
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="videos" fill={COLORS.secondary} radius={[8, 8, 0, 0]} />
                <Bar dataKey="fotos" fill={COLORS.accent} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráficas Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfica de Categorías */}
          <div className="bg-card border border-border rounded-lg p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Videos por Categoría
                </h3>
                <p className="text-sm text-muted-foreground">Distribución</p>
              </div>
              <Icon name="PieChart" size={20} color={COLORS.success} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Actividad Reciente
                </h3>
                <p className="text-sm text-muted-foreground">Últimas transacciones</p>
              </div>
              <Link to="/admin/logs">
                <Button variant="ghost" size="sm">
                  Ver todo
                  <Icon name="ArrowRight" size={14} className="ml-2" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div 
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.transaction_type === 'earn' ? 'bg-success/10' : 
                        activity.transaction_type === 'purchase' ? 'bg-warning/10' :
                        'bg-primary/10'
                      }`}>
                        <Icon 
                          name={
                            activity.transaction_type === 'earn' ? 'TrendingUp' :
                            activity.transaction_type === 'purchase' ? 'ShoppingCart' :
                            'ArrowRight'
                          }
                          size={16}
                          color={
                            activity.transaction_type === 'earn' ? COLORS.success :
                            activity.transaction_type === 'purchase' ? COLORS.warning :
                            COLORS.primary
                          }
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {activity.profiles?.full_name || activity.profiles?.username || 'Usuario'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        activity.amount > 0 ? 'text-success' : 'text-error'
                      }`}>
                        {activity.amount > 0 ? '+' : ''}{activity.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="Activity" size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No hay actividad reciente</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Usuarios */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Top Usuarios
              </h3>
              <p className="text-sm text-muted-foreground">Por puntos acumulados</p>
            </div>
            <Link to="/admin/users">
              <Button variant="ghost" size="sm">
                Ver todos
                <Icon name="ArrowRight" size={14} className="ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topUsers.map((topUser, index) => (
              <div 
                key={topUser.user_id}
                className="bg-background border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="relative">
                    {topUser.profiles?.avatar_url ? (
                      <img 
                        src={topUser.profiles.avatar_url}
                        alt={topUser.profiles.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon name="User" size={20} color={COLORS.primary} />
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {topUser.profiles?.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{topUser.profiles?.username || 'user'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Gratis:</span>
                    <span className="font-semibold text-accent">
                      {topUser.free_points.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Premium:</span>
                    <span className="font-semibold text-warning">
                      {topUser.premium_points.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold text-primary">
                        {(topUser.free_points + topUser.premium_points).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/users">
            <Button variant="outline" className="w-full justify-start h-auto py-4">
              <Icon name="Users" size={20} className="mr-3" />
              <div className="text-left">
                <p className="font-medium">Gestionar Usuarios</p>
                <p className="text-xs text-muted-foreground">Ver y editar usuarios</p>
              </div>
            </Button>
          </Link>
          <Link to="/admin/categories">
            <Button variant="outline" className="w-full justify-start h-auto py-4">
              <Icon name="Layers" size={20} className="mr-3" />
              <div className="text-left">
                <p className="font-medium">Gestionar Categorías</p>
                <p className="text-xs text-muted-foreground">CRUD de categorías</p>
              </div>
            </Button>
          </Link>
          <Link to="/admin/moderation">
            <Button variant="outline" className="w-full justify-start h-auto py-4">
              <Icon name="Shield" size={20} className="mr-3" />
              <div className="text-left">
                <p className="font-medium">Moderación</p>
                <p className="text-xs text-muted-foreground">Revisar contenido</p>
              </div>
            </Button>
          </Link>
          <Link to="/admin/settings">
            <Button variant="outline" className="w-full justify-start h-auto py-4">
              <Icon name="Settings" size={20} className="mr-3" />
              <div className="text-left">
                <p className="font-medium">Configuración</p>
                <p className="text-xs text-muted-foreground">Ajustes del sitio</p>
              </div>
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
