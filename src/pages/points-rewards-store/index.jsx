// src/pages/points-rewards-store/index.jsx
// ============================================================================
// ✅ FIX: Eliminada la sección estática "Cómo ganar más puntos".
// ✅ FIX: 'fetchPointsRules' ahora carga desde 'points_rules' usando
//    las columnas correctas ('action_name', 'points_amount', 'metadata').
// ✅ FIX: La carga de reglas ahora filtra por 'show_in_store = true'
//    para que solo muestre las que el admin seleccionó.
// ❌ ELIMINADO: Toda la lógica y JSX del Historial de Transacciones.
// ============================================================================
// 🟢 CORRECCIÓN: Se pasan 'missions' y 'pointsEarnedToday' del contexto
//    directamente a PointsBalanceCard para solucionar el bug de sincronización.
// ============================================================================


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext'; 
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import RewardCard from './components/RewardCard';
import PointsBalanceCard from './components/PointsBalanceCard';
// ❌ import TransactionHistory from './components/TransactionHistory';
import RedemptionModal from './components/RedemptionModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { redeemReward } from '../../services/rewardsService'; 
// ❌ import { getUserPointsHistory } from '../../services/pointsService'; 


// ===============================
// CONSTANTES ASUMIDAS
// ===============================

const REWARD_CATEGORIES = [
  { id: 'all', name: 'Todo', icon: 'Sparkles' },
  { id: 'digital', name: 'Digital', icon: 'Monitor' },
  { id: 'physical', name: 'Físico', icon: 'Package' },
  { id: 'exclusive', name: 'Exclusivo', icon: 'Star' },
];
const REDEMPTION_STATUS = { PENDING: 'pending', APPROVED: 'approved' };
const VIEW_MODES = { GRID: 'grid', LIST: 'list' };

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar recompensas (Sin cambios)
const useRewards = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRewards = useCallback(async (filters = {}) => {
    try {
      setLoading(true); setError(null);
      let query = supabase.from('rewards')
        .select(`
          id, title, description, image_url, category, 
          cost_free_points, cost_premium_points, 
          stock_quantity, is_featured, is_active, created_at
        `)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (filters.category && filters.category !== 'all') { query = query.eq('category', filters.category); }
      if (filters.searchQuery) { query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`); }
      
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const transformedRewards = data?.map(r => ({
        id: r.id, 
        title: r.title,
        description: r.description, 
        image: r.image_url || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
        cost_free_points: r.cost_free_points || 0, 
        cost_premium_points: r.cost_premium_points || 0,
        pointsCost: Math.max(r.cost_free_points || 0, r.cost_premium_points || 0),
        stock: r.stock_quantity,
        isAvailable: r.stock_quantity === -1 || r.stock_quantity > 0,
        category: r.category || 'General',
        categoryIcon: 'Star',
        isExclusive: false, 
        isPopular: false,
        isFeatured: r.is_featured,
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

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const PointsRewardsStore = () => {
  const { user } = useAuth();
  
  // ==================================================================
  // ✅ INICIO DE LA CORRECCIÓN 1
  // ==================================================================
  // Obtenemos 'missions', 'pointsEarnedToday' y el 'loading' general
  // directamente del contexto.
  const { 
    totalPoints, 
    freePoints, 
    premiumPoints, 
    loading: pointsLoading, // Este es el 'loading' general de PointsContext
    refreshPoints,
    missions,          // <-- AÑADIDO
    pointsEarnedToday  // <-- AÑADIDO
  } = usePoints();
  // ==================================================================
  // ✅ FIN DE LA CORRECCIÓN 1
  // ==================================================================
  
  const { 
    rewards, 
    loading: rewardsLoading, 
    error: rewardsError, 
    refresh: refreshRewards 
  } = useRewards();
  
  const [selectedReward, setSelectedReward] = useState(null);
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(null);
  const [redemptionLoading, setRedemptionLoading] = useState(false);
  
  // Estados de UI y Filtros
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  
  // ❌ ESTADOS PARA EL HISTORIAL (ELIMINADOS)
  
  // ESTADO PARA ESTADÍSTICAS
  // 🛑 'stats.earnedToday' YA NO ES NECESARIO, usamos 'pointsEarnedToday' del contexto
  const [stats, setStats] = useState({ earnedAllTime: 0, spentAllTime: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  
  // ✅ ESTADO PARA REGLAS DE PUNTOS
  const [pointsRules, setPointsRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true); 
  
  // ❌ ESTADOS PARA FILTRO Y PAGINACIÓN DEL HISTORIAL (ELIMINADOS)

  const nextRewardThreshold = 300;
  
  // ✅ CORRECCIÓN: 'statsLoading' ya no es necesario aquí si 'earnedToday' viene del contexto.
  const pageLoading = rewardsLoading || pointsLoading || rulesLoading; 

  // Carga las estadísticas (Total Ganado, Total Gastado)
  // 🛑 ELIMINADO: El cálculo de 'earnedToday' se quita, ya que viene del contexto.
  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const { data, error } = await supabase
          .from('points_transactions')
          .select('points_change') // Ya no necesitamos 'created_at' para 'earnedToday'
          .eq('user_id', user.id);

        if (error) throw error;

        let earnedAllTime = 0;
        let spentAllTime = 0;

        for (const t of data) {
          const points = t.points_change || 0;

          if (points > 0) {
            earnedAllTime += points;
          } else if (points < 0) {
            spentAllTime += Math.abs(points);
          }
        }
        
        setStats({ earnedAllTime, spentAllTime });

      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchStats();
  }, [user]);

  // ✅ CORREGIDO: Carga las reglas de puntos (Cómo ganar más puntos)
  useEffect(() => {
    const fetchPointsRules = async () => {
      setRulesLoading(true);
      try {
        const { data, error } = await supabase
          .from('points_rules') 
          .select('id, action_name, points_amount, metadata') 
          .eq('show_in_store', true) 
          .gt('points_amount', 0) 
          .order('action_name', { ascending: true });

        if (error) throw error;
        
        const rules = data.map(rule => ({
          id: rule.id,
          icon: rule.metadata?.icon || 'Check', 
          text: rule.action_name, 
          points: rule.points_amount 
        }));
        setPointsRules(rules);

      } catch (err) {
        console.error("Error fetching points rules:", err);
      } finally {
        setRulesLoading(false);
      }
    };
    
    fetchPointsRules();
  }, []); 


  // ❌ FUNCIÓN PARA CARGAR EL HISTORIAL (ELIMINADA)
  // ❌ EFECTO PARA CARGAR EL HISTORIAL (ELIMINADO)

  // Filtrado y Asequibilidad (Sin cambios)
  const filteredRewards = useMemo(() => {
    let list = rewards;
    if (searchQuery) {
      list = list.filter(reward => 
        reward.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filter !== 'all') {
      list = list.filter(reward => reward.category === filter);
    }
    switch (sortBy) {
      case 'points_low':
        list.sort((a, b) => a.pointsCost - b.pointsCost);
        break;
      case 'points_high':
        list.sort((a, b) => b.pointsCost - b.pointsCost);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); 
        break;
      case 'popular':
      default:
        list.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
        break;
    }
    return list;
  }, [rewards, searchQuery, filter, sortBy]);
  
  const affordableRewards = useMemo(() => {
    if (pointsLoading) return []; 
    return filteredRewards.filter(reward => {
      const canAffordFree = (reward.cost_free_points > 0) && (freePoints >= reward.cost_free_points);
      const canAffordPremium = (reward.cost_premium_points > 0) && (premiumPoints >= reward.cost_premium_points);
      return canAffordFree || canAffordPremium;
    });
  }, [filteredRewards, freePoints, premiumPoints, pointsLoading]);
  
  const featuredRewards = useMemo(() => rewards.filter(r => r.isFeatured).slice(0, 4), [rewards]);
  const activeCategory = filter;


  // ===============================
  // HANDLERS
  // ===============================

  const handleRewardClick = (reward, redemptionType) => {
    setSelectedReward({ ...reward, redemptionType }); 
    setIsRedemptionModalOpen(true);
  };
  
  const handleRedeemConfirm = useCallback(async (deliveryDetails) => {
    if (!selectedReward) return;

    setRedemptionLoading(true);
    setRedemptionSuccess(null);

    try {
      const result = await redeemReward(
        selectedReward.id, 
        selectedReward.redemptionType,
        deliveryDetails
      );
      
      if (result.success) {
        if (result.newBalance) {
             const { free: freeBalance, premium: premiumBalance } = result.newBalance;
             refreshPoints(freeBalance, premiumBalance);
        } else {
             refreshPoints();
        }
        
        await refreshRewards();
        
        // ❌ Ya no refrescamos el historial aquí
        
        setIsRedemptionModalOpen(false);
        setSelectedReward(null);
        alert(result.message || '¡Canje completado exitosamente!'); 
        setRedemptionSuccess(result.message || '¡Canje completado exitosamente!');
      } else {
        console.error('❌ Error devuelto por el servicio de canje:', result.error);
        alert(`Error al canjear: ${result.error}`);
        setIsRedemptionModalOpen(false);
      }
    } catch (error) {
      console.error('❌ Error crítico en handleRedeemConfirm:', error);
      alert(`Error inesperado al canjear: ${error.message}`);
      setIsRedemptionModalOpen(false);
    } finally {
      setRedemptionLoading(false);
    }
  }, [selectedReward, refreshPoints, refreshRewards]); // ❌ 'loadHistory' eliminado de dependencias

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

  // ❌ HANDLERS PARA FILTROS Y PAGINACIÓN DEL HISTORIAL (ELIMINADOS)


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
                  
                  {/* ================================================================== */}
                  {/* ✅ INICIO DE LA CORRECCIÓN 2 */}
                  {/* ================================================================== */}
                  {/* Points Balance Card */}
                  <PointsBalanceCard
                    // currentPoints={totalPoints} // 'PointsBalanceCard' calcula el total internamente
                    freePoints={freePoints}
                    premiumPoints={premiumPoints}
                    pointsEarnedToday={pointsEarnedToday} // <-- CORREGIDO: Usando valor del contexto
                    nextRewardThreshold={nextRewardThreshold}
                    loading={pointsLoading} // <-- CORREGIDO: Usando el 'loading' general del contexto
                    missions={missions}     // <-- AÑADIDO: Pasando las misiones
                  />
                  {/* ================================================================== */}
                  {/* ✅ FIN DE LA CORRECCIÓN 2 */}
                  {/* ================================================================== */}


                  {/* ✅ CORREGIDO: Sección "Cómo ganar más puntos" */}
                  <div className="bg-card rounded-lg border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Cómo ganar más puntos</h3>
                    <div className="space-y-3">
                      {rulesLoading ? (
                        <p className="text-sm text-muted-foreground">Cargando reglas...</p>
                      ) : pointsRules.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Completa acciones como ver videos y comentar para ganar puntos.
                        </p>
                      ) : (
                        pointsRules.map((rule) => (
                          <div key={rule.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Icon name={rule.icon} size={16} className="text-muted-foreground" />
                              <span className="text-sm text-foreground">{rule.text}</span>
                            </div>
                            <span className="text-sm font-medium text-success">
                              +{rule.points}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

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
                        <span className="font-medium text-green-600">{stats.earnedAllTime.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total gastado</span>
                        <span className="font-medium text-red-600">{stats.spentAllTime.toLocaleString()}</span>
                      </div>
                    </div>
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
                        onClick={() => setViewMode(viewMode === VIEW_MODES.GRID ? VIEW_MODES.LIST : VIEW_MODES.GRID)}
                      >
                        <Icon name={viewMode === VIEW_MODES.GRID ? 'List' : 'Grid3X3'} size={20} />
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

                {/* ❌ Historial de Puntos (ELIMINADO DE AQUÍ) */}
                
                {/* Featured Rewards */}
                {featuredRewards.length > 0 && activeCategory === 'all' && !searchQuery && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-foreground mb-4">🌟 Destacadas</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {featuredRewards.map((reward) => (
                        <RewardCard
                          key={reward.id}
                          reward={reward}
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
                  ) : filteredRewards.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className={`grid gap-6 ${
                      viewMode === VIEW_MODES.GRID
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                        : 'grid-cols-1'
                    }`}>
                      {filteredRewards.map((reward) => (
                        <RewardCard
                          key={reward.id}
                          reward={reward}
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

        {/* Debug Info */}
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
