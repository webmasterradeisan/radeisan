// src/pages/points-rewards-store/index.jsx
// PointsRewardsStore - ✅ INTEGRADO CON SISTEMA DE PUNTOS
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext'; // ✅ NUEVO: Importar usePoints
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import RewardCard from './components/RewardCard';
import PointsBalanceCard from './components/PointsBalanceCard';
import TransactionHistory from './components/TransactionHistory';
import RedemptionModal from './components/RedemptionModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar recompensas con datos reales de Supabase
const useRewards = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener recompensas de Supabase
  const fetchRewards = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
      }

      if (filters.maxPoints) {
        query = query.lte('points_cost', filters.maxPoints);
      }

      if (filters.inStock) {
        query = query.or('stock_quantity.gt.0,stock_quantity.eq.-1'); // -1 = unlimited stock
      }

      // Aplicar ordenamiento
      switch (filters.sortBy) {
        case 'points_low':
          query = query.order('points_cost', { ascending: true });
          break;
        case 'points_high':
          query = query.order('points_cost', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        default: // popular
          query = query.order('redeemed_count', { ascending: false });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Transformar datos para compatibilidad con componentes existentes
      const transformedRewards = data?.map(reward => ({
        id: reward.id,
        title: reward.title,
        description: reward.description,
        image: reward.image_url || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
        pointsCost: reward.points_cost,
        originalPrice: reward.original_points_cost,
        category: reward.category,
        rewardType: reward.reward_type,
        rewardValue: reward.reward_value ? JSON.parse(reward.reward_value) : {},
        stock: reward.stock_quantity,
        maxPerUser: reward.max_per_user,
        minLevelRequired: reward.min_level_required,
        isAvailable: reward.stock_quantity !== 0,
        isExclusive: reward.category === 'exclusive',
        isFeatured: reward.is_featured,
        isPopular: reward.redeemed_count > 100,
        redeemedCount: reward.redeemed_count,
        validFrom: reward.valid_from,
        validUntil: reward.valid_until,
        categoryIcon: getCategoryIcon(reward.category),
        typeIcon: getTypeIcon(reward.reward_type)
      })) || [];

      setRewards(transformedRewards);

    } catch (err) {
      console.error('Error fetching rewards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh
  const refresh = useCallback(async (filters = {}) => {
    await fetchRewards(filters);
  }, [fetchRewards]);

  return {
    rewards,
    loading,
    error,
    refresh
  };
};

// ✅ MODIFICADO: Hook para estadísticas de puntos (complementa al Context)
const usePointsStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pointsEarnedToday: 0,
    pointsEarnedThisWeek: 0,
    pointsEarnedThisMonth: 0,
    totalPointsEarned: 0,
    totalPointsSpent: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Obtener transacciones para estadísticas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('points_transactions')
        .select('points_change, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        throw transactionsError;
      }

      // Calcular estadísticas
      const transactions = transactionsData || [];
      const todayTransactions = transactions.filter(t => new Date(t.created_at) >= today);
      const weekTransactions = transactions.filter(t => new Date(t.created_at) >= weekAgo);
      const monthTransactions = transactions.filter(t => new Date(t.created_at) >= monthAgo);

      const pointsEarnedToday = todayTransactions
        .filter(t => t.points_change > 0)
        .reduce((sum, t) => sum + t.points_change, 0);

      const pointsEarnedThisWeek = weekTransactions
        .filter(t => t.points_change > 0)
        .reduce((sum, t) => sum + t.points_change, 0);

      const pointsEarnedThisMonth = monthTransactions
        .filter(t => t.points_change > 0)
        .reduce((sum, t) => sum + t.points_change, 0);

      const totalPointsEarned = transactions
        .filter(t => t.points_change > 0)
        .reduce((sum, t) => sum + t.points_change, 0);

      const totalPointsSpent = Math.abs(transactions
        .filter(t => t.points_change < 0)
        .reduce((sum, t) => sum + t.points_change, 0));

      setStats({
        pointsEarnedToday,
        pointsEarnedThisWeek,
        pointsEarnedThisMonth,
        totalPointsEarned,
        totalPointsSpent
      });

    } catch (err) {
      console.error('Error fetching points stats:', err);
      setError(err.message);
      setStats({
        pointsEarnedToday: 0,
        pointsEarnedThisWeek: 0,
        pointsEarnedThisMonth: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    ...stats,
    loading,
    error,
    refresh: fetchStats
  };
};

// Hook para manejar transacciones de puntos
const usePointsTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async (limit = 50) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const transformedTransactions = data?.map(transaction => ({
        id: transaction.id,
        points: transaction.points_change,
        type: transaction.transaction_type,
        description: transaction.description,
        date: transaction.created_at,
        balanceAfter: transaction.points_balance_after,
        metadata: transaction.metadata,
        icon: getTransactionIcon(transaction.transaction_type),
        isPositive: transaction.points_change > 0
      })) || [];

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    refresh: fetchTransactions
  };
};

// ✅ MODIFICADO: Hook para canjear recompensas con integración al Context
const useRewardRedemption = () => {
  const { user } = useAuth();
  const { deductPoints, refreshPoints } = usePoints(); // ✅ NUEVO: Usar funciones del Context
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const redeemReward = useCallback(async (reward, deliveryDetails = {}) => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🎁 Iniciando canje de recompensa:', {
        rewardId: reward.id,
        title: reward.title,
        cost: reward.pointsCost
      });

      // Verificar stock disponible
      const { data: rewardData } = await supabase
        .from('rewards')
        .select('stock_quantity, max_per_user')
        .eq('id', reward.id)
        .single();

      if (rewardData.stock_quantity === 0) {
        throw new Error('Recompensa agotada');
      }

      // Procesar el canje según el tipo de recompensa
      let redemptionResult = {};

      switch (reward.rewardType) {
        case 'instant':
          redemptionResult = await processInstantReward(reward, user.id);
          break;
        case 'code':
          redemptionResult = await processCodeReward(reward, user.id);
          break;
        case 'physical_shipping':
          redemptionResult = await processPhysicalReward(reward, user.id, deliveryDetails);
          break;
        case 'service_booking':
          redemptionResult = await processServiceReward(reward, user.id, deliveryDetails);
          break;
        default:
          throw new Error('Tipo de recompensa no soportado');
      }

      // ✅ NUEVO: Deducir puntos usando el Context
      deductPoints(reward.pointsCost, `Canje: ${reward.title}`);

      // Actualizar el stock de la recompensa
      if (rewardData.stock_quantity > 0) {
        await supabase
          .from('rewards')
          .update({ 
            stock_quantity: rewardData.stock_quantity - 1,
            redeemed_count: reward.redeemedCount + 1
          })
          .eq('id', reward.id);
      }

      // Registrar el canje en la tabla de redemptions
      await supabase
        .from('redemptions')
        .insert({
          user_id: user.id,
          reward_id: reward.id,
          points_spent: reward.pointsCost,
          status: 'pending',
          delivery_details: deliveryDetails,
          redemption_data: redemptionResult
        });

      console.log('✅ Canje completado exitosamente');

      // ✅ NUEVO: Refrescar puntos desde el servidor
      await refreshPoints();

      return {
        success: true,
        ...redemptionResult
      };

    } catch (err) {
      console.error('❌ Error al canjear recompensa:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  }, [user?.id, deductPoints, refreshPoints]);

  return {
    redeemReward,
    loading,
    error
  };
};

// ===============================
// UTILIDADES
// ===============================

// Obtener icono según categoría
const getCategoryIcon = (category) => {
  const icons = {
    'digital': 'Smartphone',
    'physical': 'Package',
    'service': 'Briefcase',
    'discount': 'Percent',
    'exclusive': 'Crown',
    'other': 'Gift'
  };
  return icons[category] || 'Gift';
};

// Obtener icono según tipo de recompensa
const getTypeIcon = (type) => {
  const icons = {
    'instant': 'Zap',
    'code': 'Key',
    'physical_shipping': 'Truck',
    'service_booking': 'Calendar'
  };
  return icons[type] || 'Gift';
};

// Obtener icono según tipo de transacción
const getTransactionIcon = (type) => {
  const icons = {
    'video_upload': 'Upload',
    'video_view': 'Eye',
    'video_like': 'Heart',
    'daily_login': 'Calendar',
    'referral': 'Users',
    'reward_redemption': 'Gift',
    'admin_adjustment': 'Settings',
    'bonus': 'Award',
    'contest_win': 'Trophy',
    'other': 'Plus'
  };
  return icons[type] || 'Plus';
};

// Procesar diferentes tipos de recompensas
const processInstantReward = async (reward, userId) => {
  // Lógica para recompensas instantáneas (ej: destacar video)
  console.log('⚡ Procesando recompensa instantánea');
  return {
    type: 'instant',
    message: 'Recompensa aplicada instantáneamente',
    details: reward.rewardValue
  };
};

const processCodeReward = async (reward, userId) => {
  // Generar código de descuento único
  const code = `RADEISAN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  
  console.log('🔑 Generando código de descuento:', code);
  
  return {
    type: 'code',
    code: code,
    message: `Tu código de descuento: ${code}`,
    instructions: 'Usa este código en el checkout del marketplace'
  };
};

const processPhysicalReward = async (reward, userId, deliveryDetails) => {
  // Lógica para productos físicos
  console.log('📦 Procesando envío de producto físico');
  
  return {
    type: 'physical',
    trackingNumber: `RDS${Date.now()}`,
    estimatedDelivery: '7-10 días hábiles',
    shippingAddress: deliveryDetails.address,
    message: 'Tu pedido será enviado en las próximas 24-48 horas'
  };
};

const processServiceReward = async (reward, userId, serviceDetails) => {
  // Lógica para servicios/bookings
  console.log('📅 Procesando reserva de servicio');
  
  return {
    type: 'service',
    bookingId: `BK${Date.now()}`,
    scheduledDate: serviceDetails.preferredDate,
    message: 'Te contactaremos para confirmar tu cita'
  };
};

// Categorías de recompensas
const REWARD_CATEGORIES = [
  { id: 'all', name: 'Todas', icon: 'Grid3X3', description: 'Todas las recompensas' },
  { id: 'digital', name: 'Digital', icon: 'Smartphone', description: 'Contenido y servicios digitales' },
  { id: 'physical', name: 'Físicas', icon: 'Package', description: 'Productos tangibles entregados a domicilio' },
  { id: 'service', name: 'Servicios', icon: 'Briefcase', description: 'Consultas y servicios profesionales' },
  { id: 'discount', name: 'Descuentos', icon: 'Percent', description: 'Cupones y ofertas especiales' },
  { id: 'exclusive', name: 'Exclusivas', icon: 'Crown', description: 'Recompensas premium y limitadas' }
];

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const PointsRewardsStore = () => {
  const { user } = useAuth();
  
  // ✅ NUEVO: Usar puntos del Context en tiempo real
  const { 
    totalPoints,
    freePoints,
    premiumPoints,
    loading: pointsLoading 
  } = usePoints();
  
  const { rewards, loading, error, refresh } = useRewards();
  
  // ✅ MODIFICADO: Solo estadísticas adicionales
  const { 
    pointsEarnedToday, 
    pointsEarnedThisWeek,
    totalPointsEarned,
    totalPointsSpent,
    loading: statsLoading 
  } = usePointsStats();
  
  const { transactions, loading: transactionsLoading, refresh: refreshTransactions } = usePointsTransactions();
  const { redeemReward, loading: redemptionLoading } = useRewardRedemption();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedReward, setSelectedReward] = useState(null);
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  const [filters, setFilters] = useState({
    category: 'all',
    searchQuery: '',
    maxPoints: null,
    inStock: true,
    sortBy: 'popular'
  });

  // ===============================
  // EFECTOS
  // ===============================

  // Cargar recompensas cuando cambien los filtros
  useEffect(() => {
    const delayedFilters = {
      ...filters,
      category: activeCategory,
      searchQuery,
      sortBy
    };

    const timeoutId = setTimeout(() => {
      refresh(delayedFilters);
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeCategory, sortBy, filters, refresh]);

  // ===============================
  // COMPUTED VALUES
  // ===============================

  // ✅ MODIFICADO: Usar totalPoints del Context
  const affordableRewards = useMemo(() => {
    return rewards.filter(reward => totalPoints >= reward.pointsCost);
  }, [rewards, totalPoints]);

  // Próxima recompensa alcanzable
  const nextRewardThreshold = useMemo(() => {
    const unaffordable = rewards
      .filter(reward => reward.pointsCost > totalPoints)
      .sort((a, b) => a.pointsCost - b.pointsCost);
    return unaffordable.length > 0 ? unaffordable[0].pointsCost : null;
  }, [rewards, totalPoints]);

  // Recompensas destacadas
  const featuredRewards = useMemo(() => {
    return rewards.filter(reward => reward.isFeatured).slice(0, 4);
  }, [rewards]);

  // ===============================
  // EVENT HANDLERS
  // ===============================

  const handleCategoryChange = useCallback((category) => {
    setActiveCategory(category);
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleSortChange = useCallback((sort) => {
    setSortBy(sort);
  }, []);

  const handleRewardClick = useCallback((reward) => {
    if (totalPoints >= reward.pointsCost && reward.isAvailable) {
      setSelectedReward(reward);
      setIsRedemptionModalOpen(true);
    }
  }, [totalPoints]);

  const handleRedemption = useCallback(async (reward, deliveryDetails = {}) => {
    try {
      console.log('🎁 Iniciando proceso de canje...');
      
      const result = await redeemReward(reward, deliveryDetails);
      
      if (result.success) {
        console.log('✅ Canje exitoso, actualizando datos...');
        
        // Actualizar lista de recompensas
        await refresh({ ...filters, category: activeCategory, searchQuery, sortBy });
        
        // Refrescar transacciones
        await refreshTransactions();
        
        // Cerrar modal
        setIsRedemptionModalOpen(false);
        setSelectedReward(null);
        
        // Mostrar notificación de éxito
        console.log('🎉 Recompensa canjeada:', result);
        
        // TODO: Mostrar toast/notification con los detalles
        alert(`¡Recompensa canjeada exitosamente! ${result.message || ''}`);
      } else {
        console.error('❌ Error en el canje:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error en handleRedemption:', error);
      alert(`Error: ${error.message}`);
    }
  }, [redeemReward, refresh, refreshTransactions, filters, activeCategory, searchQuery, sortBy]);

  const handleWaitlist = useCallback((reward) => {
    // TODO: Implementar lista de espera
    console.log('📋 Agregado a lista de espera:', reward);
    alert('Has sido agregado a la lista de espera. Te notificaremos cuando esté disponible.');
  }, []);

  // ===============================
  // RENDER HELPERS
  // ===============================

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-accent/10 to-primary/10 rounded-full flex items-center justify-center mb-6">
        <Icon name="Gift" size={32} color="var(--color-accent)" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        {searchQuery ? 'No se encontraron recompensas' : 'Próximamente más recompensas'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {searchQuery 
          ? `No hay resultados para "${searchQuery}". Intenta con otros términos.`
          : 'Estamos preparando recompensas increíbles para ti. ¡Sigue ganando puntos!'
        }
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {searchQuery && (
          <Button variant="outline" onClick={() => setSearchQuery('')}>
            <Icon name="X" size={16} className="mr-2" />
            Limpiar búsqueda
          </Button>
        )}
        <Button onClick={() => window.location.href = '/dashboard'}>
          <Icon name="Play" size={16} className="mr-2" />
          Ganar más puntos
        </Button>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        Error al cargar recompensas
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Ha ocurrido un problema al cargar las recompensas. Por favor, intenta nuevamente.
      </p>
      <Button onClick={() => refresh(filters)}>
        <Icon name="RefreshCw" size={16} className="mr-2" />
        Reintentar
      </Button>
    </div>
  );

  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      <Helmet>
        <title>Tienda de Recompensas - Canjea tus Puntos | RADEISAN</title>
        <meta name="description" content="Canjea tus puntos por recompensas increíbles: productos digitales, físicos, descuentos y experiencias exclusivas" />
        <meta name="keywords" content="recompensas, puntos, canjear, productos, descuentos, premios" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                  <Icon name="Gift" size={24} color="white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Tienda de Recompensas</h1>
                  <p className="text-muted-foreground">Canjea tus puntos por increíbles premios</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Sidebar */}
              <div className="lg:col-span-4 xl:col-span-3">
                <div className="sticky top-32 space-y-6">
                  
                  {/* ✅ MODIFICADO: Points Balance Card con datos del Context */}
                  <PointsBalanceCard
                    currentPoints={totalPoints}
                    freePoints={freePoints}
                    premiumPoints={premiumPoints}
                    pointsEarnedToday={pointsEarnedToday}
                    pointsEarnedThisWeek={pointsEarnedThisWeek}
                    nextRewardThreshold={nextRewardThreshold}
                    loading={pointsLoading || statsLoading}
                  />

                  {/* Quick Stats */}
                  <div className="bg-card rounded-lg border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Estadísticas</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Recompensas disponibles</span>
                        <span className="font-medium">{rewards.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Puedes canjear</span>
                        <span className="font-medium text-success">{affordableRewards.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Destacadas</span>
                        <span className="font-medium">{featuredRewards.length}</span>
                      </div>
                      <div className="h-px bg-border my-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total ganado</span>
                        <span className="font-medium text-green-600">{totalPointsEarned.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total gastado</span>
                        <span className="font-medium text-red-600">{totalPointsSpent.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Toggle */}
                  <div className="bg-card rounded-lg border p-6">
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => setShowTransactions(!showTransactions)}
                      iconName={showTransactions ? "ChevronUp" : "ChevronDown"}
                      iconPosition="right"
                    >
                      {showTransactions ? 'Ocultar' : 'Ver'} Historial
                    </Button>
                    
                    {showTransactions && (
                      <div className="mt-4 max-h-96 overflow-y-auto">
                        <TransactionHistory
                          transactions={transactions}
                          loading={transactionsLoading}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-8 xl:col-span-9">
                
                {/* Search and Controls */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <Input
                        type="search"
                        placeholder="Buscar recompensas..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full"
                        iconName="Search"
                        iconPosition="left"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                        className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      >
                        <option value="popular">Más populares</option>
                        <option value="points_low">Menos puntos</option>
                        <option value="points_high">Más puntos</option>
                        <option value="newest">Más recientes</option>
                      </select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      >
                        <Icon name={viewMode === 'grid' ? 'List' : 'Grid3X3'} size={20} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                    {REWARD_CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id)}
                        className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          activeCategory === category.id
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Icon name={category.icon} size={16} />
                        <span>{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Featured Rewards */}
                {featuredRewards.length > 0 && activeCategory === 'all' && !searchQuery && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-foreground mb-4">🌟 Destacadas</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {featuredRewards.map((reward) => (
                        <RewardCard
                          key={reward.id}
                          reward={reward}
                          userPoints={totalPoints}
                          onRedeem={handleRewardClick}
                          onWaitlist={handleWaitlist}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Rewards Grid */}
                <div className="min-h-[400px]">
                  {error ? (
                    <ErrorState />
                  ) : loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Cargando recompensas increíbles...</p>
                      </div>
                    </div>
                  ) : rewards.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className={`grid gap-6 ${
                      viewMode === 'grid' 
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                        : 'grid-cols-1'
                    }`}>
                      {rewards.map((reward) => (
                        <RewardCard
                          key={reward.id}
                          reward={reward}
                          userPoints={totalPoints}
                          onRedeem={handleRewardClick}
                          onWaitlist={handleWaitlist}
                          layout={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Redemption Modal */}
        {selectedReward && (
          <RedemptionModal
            reward={selectedReward}
            userPoints={totalPoints}
            isOpen={isRedemptionModalOpen}
            onClose={() => {
              setIsRedemptionModalOpen(false);
              setSelectedReward(null);
            }}
            onConfirm={handleRedemption}
            loading={redemptionLoading}
          />
        )}

        {/* Floating Action Button */}
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
          <Button
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => window.location.href = '/dashboard'}
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Ganar Puntos
          </Button>
        </div>

        {/* Welcome Message for New Users */}
        {!loading && totalPoints === 0 && user && (
          <div className="fixed bottom-4 left-4 max-w-sm bg-card border rounded-lg p-4 shadow-lg z-50">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="Gift" size={20} color="var(--color-accent)" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">¡Comienza a ganar puntos!</h4>
                <p className="text-sm text-muted-foreground">
                  Ve videos, sube contenido y gana puntos para canjear por recompensas increíbles.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info - Solo en development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-24 bg-black text-white p-2 rounded text-xs font-mono max-w-xs z-50">
            <div className="space-y-1">
              <div>Total: {totalPoints}</div>
              <div>Gratis: {freePoints}</div>
              <div>Premium: {premiumPoints}</div>
              <div>Canjeables: {affordableRewards.length}/{rewards.length}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PointsRewardsStore;
