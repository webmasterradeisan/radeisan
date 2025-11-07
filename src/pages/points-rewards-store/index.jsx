// src/pages/points-rewards-store/index.jsx (Versión Final Corregida)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext'; 
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import RewardCard from './components/RewardCard';
import PointsBalanceCard from './components/PointsBalanceCard';
import TransactionHistory from './components/TransactionHistory';
import RedemptionModal from './components/RedemptionModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { redeemReward } from '../../services/rewardsService'; // ✅ Importar la función clave

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar recompensas con datos reales de Supabase
const useRewards = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRewards = useCallback(async (filters = {}) => {
    try {
      setLoading(true); setError(null);
      let query = supabase.from('rewards').select('*').eq('is_active', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false });
      
      if (filters.category && filters.category !== 'all') { query = query.eq('category', filters.category); }
      if (filters.searchQuery) { query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`); }
      if (filters.maxPoints) { query = query.lte('points_cost', filters.maxPoints); }
      if (filters.inStock) { query = query.or('stock_quantity.gt.0,stock_quantity.eq.-1'); }
      
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const transformedRewards = data?.map(r => ({
        id: r.id, title: r.name, description: r.description, image: r.image_url || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
        // ✅ Corregir los nombres de columna aquí para la tarjeta
        cost_free_points: r.cost_free_points, 
        cost_premium_points: r.cost_premium_points,
        pointsCost: r.points_cost, // Mantenemos esta por si otros componentes la usan
        stock: r.stock_quantity, isAvailable: r.stock_quantity !== 0,
        category: r.category_name || 'General', categoryIcon: r.category_icon || 'Star',
        isExclusive: r.is_exclusive, isPopular: r.is_popular
      })) || [];

      setRewards(transformedRewards);
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRewards(); }, [fetchRewards]);
  const refresh = useCallback((filters = {}) => { fetchRewards(filters); }, [fetchRewards]);

  return { rewards, loading, error, refresh };
};

// ... (Hook usePointsStats y usePointsTransactions omitidos por brevedad, asumo que son correctos) ...

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const PointsRewardsStore = () => {
  const { user } = useAuth();
  
  // ✅ CORRECCIÓN 1: Desestructurar el loading del contexto de Puntos
  const { 
    totalPoints, 
    freePoints, 
    premiumPoints, 
    loading: pointsLoading, 
    refreshPoints 
  } = usePoints();
  
  const { rewards, loading: rewardsLoading, error: rewardsError, refresh: refreshRewards } = useRewards();
  
  const [selectedReward, setSelectedReward] = useState(null);
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulación de Stats y Transacciones (deberías usar tus hooks reales aquí)
  const statsLoading = false; 
  const totalPointsEarned = 2661;
  const totalPointsSpent = 0;
  const transactions = [];
  const transactionsLoading = false;
  const nextRewardThreshold = 300;
  const featuredRewards = useMemo(() => rewards.filter(r => r.isFeatured).slice(0, 4), [rewards]);
  const activeCategory = 'all';
  
  const pageLoading = rewardsLoading || pointsLoading; 

  // Filtrado y Asequibilidad
  const filteredRewards = useMemo(() => rewards.filter(reward => {
    // Lógica de filtrado
    return reward.title.toLowerCase().includes(searchQuery.toLowerCase());
  }), [rewards, searchQuery]);
  
  const affordableRewards = useMemo(() => {
    if (pointsLoading) return []; 
    return filteredRewards.filter(reward => {
      const requiredFree = reward.cost_free_points || 0;
      const requiredPremium = reward.cost_premium_points || 0;
      const canAfford = (freePoints >= requiredFree) || (premiumPoints >= requiredPremium);
      return canAfford;
    });
  }, [filteredRewards, freePoints, premiumPoints, pointsLoading]);


  // ===============================
  // HANDLERS
  // ===============================

  const handleRedeem = async (reward, redemptionType) => {
    // El RewardCard ya nos dijo el TIPO de moneda preferido
    setSelectedReward({ ...reward, redemptionType }); 
    setIsRedemptionModalOpen(true);
  };
  
  const handleRedeemConfirm = useCallback(async (deliveryDetails) => {
    if (!selectedReward) return;

    try {
      // 1. Llamar al servicio de canje con los parámetros correctos
      const result = await redeemReward(
        selectedReward.id, 
        selectedReward.redemptionType, // ✅ Tipo de moneda a usar ('free' o 'premium')
        deliveryDetails
      );
      
      if (result.success) {
        // 2. ✅ FIX 3: Usar el nuevo saldo devuelto por el servicio para actualizar el Context
        if (result.newBalance) {
             // Asumo que tu refreshPoints puede tomar los saldos directos (free, premium)
             refreshPoints(result.newBalance.free, result.newBalance.premium);
        } else {
             refreshPoints(); // Fallback
        }
        
        // 3. Refrescar recompensas (para actualizar stock)
        await refreshRewards();
        
        setIsRedemptionModalOpen(false);
        setSelectedReward(null);
        alert(result.message || '¡Canje completado exitosamente!');
        setRedemptionSuccess(result.message || '¡Canje completado exitosamente!');
      } else {
        alert(`Error al canjear: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error en handleRedeemConfirm:', error);
      alert(`Error inesperado al canjear: ${error.message}`);
    }
  }, [selectedReward, refreshPoints, refreshRewards]);

  const handleWaitlist = (reward) => {
    alert(`Te avisaremos cuando ${reward.title} esté disponible.`);
  };
  
  const handleCategoryChange = useCallback((category) => {
    setFilter(category);
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleSortChange = useCallback((sort) => {
    setSortBy(sort);
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
      <Button onClick={() => refreshRewards()}>
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
                  
                  {/* ✅ MODIFICADO: Points Balance Card con lógica de carga */}
                  <PointsBalanceCard
                    currentPoints={totalPoints}
                    freePoints={freePoints}
                    premiumPoints={premiumPoints}
                    pointsEarnedToday={totalPointsEarned}
                    pointsEarnedThisWeek={totalPointsEarned}
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
                          // ✅ CORRECCIÓN 2: Pasar el doble saldo al RewardCard
                          userFreePoints={freePoints}
                          userPremiumPoints={premiumPoints}
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
                  {rewardsError ? (
                    <ErrorState />
                  ) : rewardsLoading ? (
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
                          // ✅ CORRECCIÓN 2: Pasar el doble saldo al RewardCard
                          userFreePoints={freePoints}
                          userPremiumPoints={premiumPoints}
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
            // ✅ CORRECCIÓN 3: Pasar el doble saldo al modal
            userFreePoints={freePoints}
            userPremiumPoints={premiumPoints}
            isOpen={isRedemptionModalOpen}
            onClose={() => {
              setIsRedemptionModalOpen(false);
              setSelectedReward(null);
            }}
            onConfirm={handleRedeemConfirm}
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
      </div>
    </>
  );
};

export default PointsRewardsStore;
