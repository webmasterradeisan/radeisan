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

      // Filtrado por categoría (simplificado)
      if (filters.category) {
        query = query.eq('category_id', filters.category);
      }

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }

      // Simular la estructura de datos que espera RewardCard:
      const formattedRewards = data.map(r => ({
        id: r.id,
        title: r.name,
        description: r.description,
        image: r.image_url,
        // ✅ Ahora lee los dos costos
        cost_free_points: r.cost_free_points, 
        cost_premium_points: r.cost_premium_points,
        stock: r.stock_quantity,
        is_unlimited_stock: r.is_unlimited_stock,
        category: r.category_name || 'General',
        categoryIcon: r.category_icon || 'Star',
        isExclusive: r.is_exclusive,
        isPopular: r.is_popular
      }));

      setRewards(formattedRewards);
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return { rewards, loading, error, fetchRewards };
};


// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const PointsRewardsStore = () => {
  const { user } = useAuth();
  
  // ✅ CORRECCIÓN 1: Desestructurar el loading del contexto de Puntos
  const { totalPoints, freePoints, premiumPoints, loading: pointsLoading, refreshPoints } = usePoints();
  
  const { rewards, loading: rewardsLoading, error: rewardsError, fetchRewards } = useRewards();
  
  const [selectedReward, setSelectedReward] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Estado de Carga Unificado
  const pageLoading = rewardsLoading || pointsLoading; 

  // 2. Filtrado de Recompensas
  const filteredRewards = useMemo(() => {
    return rewards.filter(reward => {
      // Filtrar por búsqueda
      const matchesSearch = reward.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            reward.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtrar por categoría (ej. 'digital', 'physical')
      const matchesFilter = filter === 'all' || reward.category === filter;

      return matchesSearch && matchesFilter;
    });
  }, [rewards, searchQuery, filter]);
  
  // 3. Recompensas Asequibles
  const affordableRewards = useMemo(() => {
    // Si pointsLoading es true, no se calcula la asequibilidad para evitar el '0'
    if (pointsLoading) return []; 
    
    return filteredRewards.filter(reward => {
      const requiredFree = reward.cost_free_points || 0;
      const requiredPremium = reward.cost_premium_points || 0;

      // Puede pagar con cualquiera de las dos monedas
      const canAfford = (freePoints >= requiredFree) || (premiumPoints >= requiredPremium);
      return canAfford;
    });
  }, [filteredRewards, freePoints, premiumPoints, pointsLoading]); // Depende de pointsLoading

  // ===============================
  // HANDLERS
  // ===============================

  const handleRedeem = async (reward, redemptionType) => {
    setSelectedReward({ ...reward, redemptionType });
    setIsModalOpen(true);
  };
  
  const handleRedeemConfirm = async (redemptionData) => {
    // Esta función debe llamar al rewardsService.redeemReward
    // y luego cerrar el modal y refrescar la UI.
    // ... (Tu lógica de canje aquí) ...
    // Ejemplo de cómo refrescar:
    // refreshPoints(); // Llama a la función del context para actualizar el saldo
    // fetchRewards();  // Vuelve a cargar las recompensas (stock)
    setIsModalOpen(false);
    setRedemptionSuccess('¡Canje realizado con éxito! Revisa tu historial.');
  };

  const handleWaitlist = (reward) => {
    alert(`Te avisaremos cuando ${reward.title} esté disponible.`);
  };

  // ===============================
  // RENDERIZADO
  // ===============================

  const renderRewards = () => {
    if (rewardsError) {
      return <p className="text-center text-error">Error al cargar las recompensas: {rewardsError}</p>;
    }

    if (pageLoading) {
      return (
        <div className="text-center py-10">
          <Icon name="Loader" className="animate-spin text-accent w-8 h-8 mx-auto mb-3" />
          <p className="text-muted-foreground">Cargando recompensas y saldo...</p>
        </div>
      );
    }
    
    if (filteredRewards.length === 0 && searchQuery) {
      return <p className="text-center py-10 text-muted-foreground">No se encontraron recompensas para "{searchQuery}".</p>;
    }
    
    if (filteredRewards.length === 0) {
        return <p className="text-center py-10 text-muted-foreground">No hay recompensas disponibles en esta categoría.</p>;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRewards.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            // ✅ CORRECCIÓN 2: Pasar los dos saldos
            userFreePoints={freePoints} 
            userPremiumPoints={premiumPoints}
            onRedeem={handleRedeem}
            onWaitlist={handleWaitlist}
          />
        ))}
      </div>
    );
  };
  
  // 3. Renderizado del Saldo
  const renderPointsBalance = () => {
      // ✅ CORRECCIÓN 3: Si pointsLoading es true, mostrar un estado de carga en el panel de saldo.
      if (pointsLoading) {
          return (
              <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-lg shadow-elevation-1 min-h-[150px]">
                <Icon name="Loader" className="animate-spin text-accent w-6 h-6 mb-2" />
                <p className="text-sm text-muted-foreground">Obteniendo saldo...</p>
              </div>
          );
      }
      
      return (
        <PointsBalanceCard
          totalPoints={totalPoints}
          freePoints={freePoints}
          premiumPoints={premiumPoints}
          affordableRewardsCount={affordableRewards.length}
          totalRewardsCount={rewards.length}
        />
      );
  };


  return (
    <>
      <Helmet>
        <title>Tienda de Recompensas y Puntos | RADEISAN</title>
      </Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold text-foreground mb-6">
          Tienda de Recompensas
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Columna de Saldo (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            {renderPointsBalance()} {/* Ahora usa la lógica de carga */}

            <TransactionHistory />

            <div className="flex flex-col space-y-3 p-4 bg-muted rounded-lg border border-border">
              <h3 className="font-semibold text-foreground">Aprovecha tus Puntos</h3>
              <p className="text-sm text-muted-foreground">
                Ve videos, completa misiones y consigue puntos premium para mejores ofertas.
              </p>
              <Button 
                variant="accent" 
                size="sm"
                iconName="Target"
                iconPosition="left"
              >
                <a href="/missions">Misiones Diarias</a>
              </Button>
            </div>
          </div>

          {/* Columna de Tienda (8/12) */}
          <div className="lg:col-span-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold text-foreground">
                {pageLoading ? "Cargando Recompensas..." : `${rewards.length} Recompensas Disponibles`}
              </h2>
              <div className="flex gap-3 w-full md:w-auto">
                {/* Search Input */}
                <Input
                  type="text"
                  placeholder="Buscar recompensa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  iconName="Search"
                  className="w-full md:w-64"
                />
                <Button 
                  onClick={() => { /* Navegar a la página de compra de puntos */ }}
                  variant="premium"
                  iconName="PlusCircle"
                  iconPosition="left"
                >
                  Comprar Puntos
                </Button>
              </div>
            </div>

            {/* Lista de Recompensas */}
            {renderRewards()}
          </div>
        </div>

        {/* Modal de Canje */}
        <RedemptionModal
          reward={selectedReward}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleRedeemConfirm}
        />

        {/* Mensaje de éxito de canje (Si lo tienes implementado) */}
        {redemptionSuccess && (
          <div className="fixed bottom-4 right-4 max-w-sm bg-success text-success-foreground border rounded-lg p-4 shadow-lg z-50">
            <p className="font-medium">{redemptionSuccess}</p>
          </div>
        )}
        
        {/* Welcome Message for New Users */}
        {!pageLoading && totalPoints === 0 && user && (
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
