// src/pages/admin-dashboard/AdminDashboard.jsx
// ✅ SPRINT 4 - Panel Admin Core: Dashboard con Gráficas
// 🔧 CORREGIDO: Usa 'points_change' en lugar de 'amount'
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
    totalVideos: 0, // Videos horizontales
    totalReels: 0, // Videos verticales
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

      // Total de videos horizontales (orientation = 'horizontal')
      const { count: totalVideos } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('orientation', 'horizontal');

      // Total de reels (orientation = 'vertical')
      const { count: totalReels } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('orientation', 'vertical');

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
        totalReels: totalReels || 0,
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

      // Videos horizontales
      const { data: videosHorizontal } = await supabase
        .from('videos')
        .select('created_at')
        .eq('orientation', 'horizontal')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Reels (videos verticales)
      const { data: videosVertical } = await supabase
        .from('videos')
        .select('created_at')
        .eq('orientation', 'vertical')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fotos
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
      
      videosHorizontal?.forEach(video => {
        const week = getWeekNumber(video.created_at);
        if (!weeklyData[week]) weeklyData[week] = { semana: week, videos: 0, reels: 0, fotos: 0 };
        weeklyData[week].videos++;
      });

      videosVertical?.forEach(reel => {
        const week = getWeekNumber(reel.created_at);
        if (!weeklyData[week]) weeklyData[week] = { semana: week, videos: 0, reels: 0, fotos: 0 };
        weeklyData[week].reels++;
      });

      photos?.forEach(photo => {
        const week = getWeekNumber(photo.created_at);
        if (!weeklyData[week]) weeklyData[week] = { semana: week, videos: 0, reels: 0, fotos: 0 };
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
      const { data: topUsers } = await supabase
        .from('user_points')
        .select('*')
        .order('free_points', { ascending: false })
        .limit(5);

      // Enriquecer con info de perfiles
      if (topUsers && topUsers.length > 0) {
        const userIds = topUsers.map(u => u.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);
        
        const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
        
        topUsers.forEach(u => {
          u.profiles = profilesMap[u.user_id] || null;
        });
      }

      setTopUsers(topUsers || []);
    } catch (error) {
      console.error('Error fetching top users:', error);
    }
  }, []);

  // ===============================
  // CARGAR TODOS LOS DATOS
  // ===============================
  const fetchAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchUsersChartData(),
        fetchContentChartData(),
        fetchCategoryChartData(),
        fetchRecentActivity(),
        fetchTopUsers()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    fetchMetrics, 
    fetchUsersChartData, 
    fetchContentChartData, 
    fetchCategoryChartData,
    fetchRecentActivity,
    fetchTopUsers
  ]);

  // Cargar datos al montar
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard Admin | Panel de Administración</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Vista general de la plataforma
            </p>
          </div>
          <Button 
            onClick={fetchAllData}
            disabled={refreshing}
            variant="outline"
          >
            <Icon 
              name="RefreshCw" 
              size={16} 
              className={`mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Usuarios */}
          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="Users" size={24} color={COLORS.primary} />
              </div>
              <span className="text-xs text-success font-semibold bg-success/10 px-2 py-1 rounded-full">
                +{metrics.newUsersToday} hoy
              </span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalUsers.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Usuarios</p>
            <div className="mt-2 text-xs text-muted-foreground">
              <Icon name="Activity" size={12} className="inline mr-1" />
              {metrics.activeUsers} activos
            </div>
          </div>

          {/* Total Videos Horizontales */}
          <div className="bg-card border border-border rounded-lg p-6 hover:border-secondary/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Icon name="Monitor" size={24} color={COLORS.secondary} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalVideos.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Videos</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Formato horizontal
            </div>
          </div>

          {/* Total Reels */}
          <div className="bg-card border border-border rounded-lg p-6 hover:border-purple/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple/10 flex items-center justify-center">
                <Icon name="Smartphone" size={24} color={COLORS.purple} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalReels.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Reels</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Formato vertical
            </div>
          </div>

          {/* Total Fotos */}
          <div className="bg-card border border-border rounded-lg p-6 hover:border-accent/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Icon name="Image" size={24} color={COLORS.accent} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalPhotos.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Fotos</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Galería de imágenes
            </div>
          </div>

          {/* Puntos Distribuidos */}
          <div className="bg-card border border-border rounded-lg p-6 hover:border-warning/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Icon name="Award" size={24} color={COLORS.warning} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {(metrics.totalFreePoints + metrics.totalPremiumPoints).toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Puntos</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-accent">
                <Icon name="Circle" size={8} className="inline mr-1" />
                {metrics.totalFreePoints.toLocaleString()}
              </span>
              <span className="text-success">
                <Icon name="Gem" size={8} className="inline mr-1" />
                {metrics.totalPremiumPoints.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
              <span className="text-success">
                <Icon name="Gem" size={10} className="inline mr-1" />
                {metrics.totalPremiumPoints.toLocaleString()} premium
              </span>
            </div>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfica de Nuevos Usuarios */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              Nuevos Usuarios (últimos 30 días)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usersChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  fontSize={12}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="usuarios" 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica de Contenido */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              Contenido Subido (últimos 30 días)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="semana" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
                <Legend />
                <Bar dataKey="videos" name="Videos" fill={COLORS.secondary} radius={[8, 8, 0, 0]} />
                <Bar dataKey="reels" name="Reels" fill={COLORS.purple} radius={[8, 8, 0, 0]} />
                <Bar dataKey="fotos" name="Fotos" fill={COLORS.accent} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categorías y Actividad */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfica de Categorías */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              Contenido por Categoría
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
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
                        activity.points_change > 0 ? 'text-success' : 'text-error'
                      }`}>
                        {activity.points_change > 0 ? '+' : ''}{activity.points_change}
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
