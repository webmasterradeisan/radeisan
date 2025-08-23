import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import RewardCard from './components/RewardCard';
import CategoryFilter from './components/CategoryFilter';
import PointsBalanceCard from './components/PointsBalanceCard';
import RedemptionModal from './components/RedemptionModal';
import TransactionHistory from './components/TransactionHistory';
import AchievementBadges from './components/AchievementBadges';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const PointsRewardsStore = () => {
  const [userPoints, setUserPoints] = useState(2847);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReward, setSelectedReward] = useState(null);
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('popular'); // popular, points_low, points_high, newest
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  // Mock data for categories
  const categories = [
    { id: 'all', name: 'Todas', icon: 'Grid3X3', count: 24 },
    { id: 'digital', name: 'Digital', icon: 'Smartphone', count: 8 },
    { id: 'physical', name: 'Físicos', icon: 'Package', count: 12 },
    { id: 'experiences', name: 'Experiencias', icon: 'MapPin', count: 4 },
    { id: 'platform', name: 'Plataforma', icon: 'Star', count: 6 }
  ];

  // Mock data for rewards
  const allRewards = [
    {
      id: 1,
      title: "Auriculares Bluetooth Premium",
      description: "Auriculares inalámbricos con cancelación de ruido y 30h de batería",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      pointsCost: 2500,
      originalPrice: 89.99,
      category: "physical",
      categoryIcon: "Headphones",
      type: "physical",
      stock: 15,
      isPopular: true,
      isExclusive: false
    },
    {
      id: 2,
      title: "Suscripción Premium 3 Meses",
      description: "Acceso completo a contenido exclusivo y funciones avanzadas",
      image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
      pointsCost: 1200,
      originalPrice: 29.99,
      category: "platform",
      categoryIcon: "Crown",
      type: "digital",
      stock: 999,
      isPopular: false,
      isExclusive: false
    },
    {
      id: 3,
      title: "Tarjeta Regalo Amazon €50",
      description: "Tarjeta regalo digital para compras en Amazon España",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400",
      pointsCost: 4800,
      originalPrice: 50.00,
      category: "digital",
      categoryIcon: "Gift",
      type: "digital",
      stock: 25,
      isPopular: true,
      isExclusive: false
    },
    {
      id: 4,
      title: "Camiseta Edición Limitada",
      description: "Camiseta oficial de VideoRewards con diseño exclusivo",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
      pointsCost: 1800,
      originalPrice: 24.99,
      category: "physical",
      categoryIcon: "Shirt",
      type: "physical",
      stock: 3,
      isPopular: false,
      isExclusive: true
    },
    {
      id: 5,
      title: "Entrada Cine Premium",
      description: "Entrada para cualquier película en cines seleccionados",
      image: "https://images.unsplash.com/photo-1489599904472-84b0e19e8b0c?w=400",
      pointsCost: 900,
      originalPrice: 12.50,
      category: "experiences",
      categoryIcon: "Film",
      type: "digital",
      stock: 50,
      isPopular: true,
      isExclusive: false
    },
    {
      id: 6,
      title: "Powerbank 20000mAh",
      description: "Batería externa de alta capacidad con carga rápida",
      image: "https://images.unsplash.com/photo-1609592806596-7f6e4b6b6b6b?w=400",
      pointsCost: 3200,
      originalPrice: 45.99,
      category: "physical",
      categoryIcon: "Battery",
      type: "physical",
      stock: 8,
      isPopular: false,
      isExclusive: false
    },
    {
      id: 7,
      title: "Curso Online Marketing Digital",
      description: "Curso completo de marketing digital con certificado",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
      pointsCost: 5500,
      originalPrice: 199.99,
      category: "digital",
      categoryIcon: "GraduationCap",
      type: "digital",
      stock: 100,
      isPopular: false,
      isExclusive: true
    },
    {
      id: 8,
      title: "Experiencia Gastronómica",
      description: "Cena para dos personas en restaurante seleccionado",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
      pointsCost: 6800,
      originalPrice: 120.00,
      category: "experiences",
      categoryIcon: "UtensilsCrossed",
      type: "experience",
      stock: 5,
      isPopular: true,
      isExclusive: true
    }
  ];

  // Mock transaction history
  const transactionHistory = [
    {
      type: 'earned',
      category: 'video_watch',
      description: 'Video completado: "Tutorial React"',
      points: 15,
      date: '2025-01-16T10:30:00Z',
      source: 'Video Feed'
    },
    {
      type: 'earned',
      category: 'daily_login',
      description: 'Inicio de sesión diario',
      points: 25,
      date: '2025-01-16T08:00:00Z',
      source: 'Sistema'
    },
    {
      type: 'spent',
      category: 'reward_redemption',
      description: 'Entrada Cine Premium canjeada',
      points: -900,
      date: '2025-01-15T16:45:00Z',
      source: 'Tienda de Recompensas'
    },
    {
      type: 'earned',
      category: 'social_interaction',
      description: 'Me gusta y comentarios',
      points: 8,
      date: '2025-01-15T14:20:00Z',
      source: 'Interacciones'
    },
    {
      type: 'earned',
      category: 'bonus',
      description: 'Bonus fin de semana',
      points: 50,
      date: '2025-01-14T12:00:00Z',
      source: 'Promoción'
    }
  ];

  // Mock achievements
  const achievements = [
    {
      name: "Primer Canje",
      description: "Canjea tu primera recompensa",
      type: "first_redemption",
      rarity: "common",
      pointsReward: 100,
      unlockedAt: "2025-01-15T16:45:00Z",
      isNew: true
    },
    {
      name: "Cinéfilo",
      description: "Ve 50 videos completos",
      type: "video_watcher",
      rarity: "rare",
      pointsReward: 250,
      progress: { current: 32, target: 50 }
    },
    {
      name: "Racha de 7 Días",
      description: "Inicia sesión 7 días consecutivos",
      type: "daily_streak",
      rarity: "epic",
      pointsReward: 500,
      progress: { current: 4, target: 7 }
    }
  ];

  // Filter and sort rewards
  const filteredRewards = allRewards?.filter(reward => {
      const matchesCategory = activeCategory === 'all' || reward?.category === activeCategory;
      const matchesSearch = reward?.title?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
                           reward?.description?.toLowerCase()?.includes(searchQuery?.toLowerCase());
      return matchesCategory && matchesSearch;
    })?.sort((a, b) => {
      switch (sortBy) {
        case 'points_low':
          return a?.pointsCost - b?.pointsCost;
        case 'points_high':
          return b?.pointsCost - a?.pointsCost;
        case 'newest':
          return b?.id - a?.id;
        case 'popular':
        default:
          return (b?.isPopular ? 1 : 0) - (a?.isPopular ? 1 : 0);
      }
    });

  const handleRedemption = async (reward, deliveryDetails = {}) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update user points
    setUserPoints(prev => prev - reward?.pointsCost);
    
    // Update reward stock
    const updatedRewards = allRewards?.map(r => 
      r?.id === reward?.id ? { ...r, stock: r?.stock - 1 } : r
    );
    
    console.log('Reward redeemed:', reward, deliveryDetails);
  };

  const handleWaitlist = (reward) => {
    console.log('Added to waitlist:', reward);
    // Show success message or handle waitlist logic
  };

  const nextRewardThreshold = 3000; // Next affordable reward
  const pointsEarnedToday = 98;

  return (
    <>
      <Helmet>
        <title>Tienda de Recompensas - VideoRewards</title>
        <meta name="description" content="Canjea tus puntos por increíbles recompensas digitales y físicas en VideoRewards" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        {/* Main Content */}
        <main className="pt-16 lg:pt-28 pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                  <Icon name="Gift" size={24} color="white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">
                    Tienda de Recompensas
                  </h1>
                  <p className="text-muted-foreground">
                    Canjea tus puntos por increíbles premios y experiencias
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Points Balance */}
                <PointsBalanceCard
                  currentPoints={userPoints}
                  pointsEarnedToday={pointsEarnedToday}
                  nextRewardThreshold={nextRewardThreshold}
                />

                {/* Achievement Badges */}
                <AchievementBadges achievements={achievements} />
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Filters and Search */}
                <div className="bg-card border border-border rounded-lg p-6">
                  {/* Search */}
                  <div className="mb-6">
                    <Input
                      type="search"
                      placeholder="Buscar recompensas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e?.target?.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Category Filter */}
                  <CategoryFilter
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                    className="mb-6"
                  />

                  {/* Sort and View Options */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e?.target?.value)}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="popular">Más Popular</option>
                        <option value="points_low">Puntos: Menor a Mayor</option>
                        <option value="points_high">Puntos: Mayor a Menor</option>
                        <option value="newest">Más Recientes</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                      >
                        <Icon name="Grid3X3" size={16} />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                      >
                        <Icon name="List" size={16} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredRewards?.length} recompensas encontradas
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Icon name="Star" size={14} color="var(--color-accent)" />
                    <span>Tu balance: {userPoints?.toLocaleString()} puntos</span>
                  </div>
                </div>

                {/* Rewards Grid */}
                {filteredRewards?.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-12 text-center">
                    <Icon name="Search" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No se encontraron recompensas
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Intenta ajustar tus filtros o términos de búsqueda
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('all');
                      }}
                    >
                      Limpiar Filtros
                    </Button>
                  </div>
                ) : (
                  <div className={`
                    ${viewMode === 'grid' ?'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' :'space-y-4'
                    }
                  `}>
                    {filteredRewards?.map((reward) => (
                      <RewardCard
                        key={reward?.id}
                        reward={reward}
                        userPoints={userPoints}
                        onRedeem={(reward) => {
                          setSelectedReward(reward);
                          setIsRedemptionModalOpen(true);
                        }}
                        onWaitlist={handleWaitlist}
                        className={viewMode === 'list' ? 'flex-row' : ''}
                      />
                    ))}
                  </div>
                )}

                {/* Transaction History */}
                <TransactionHistory transactions={transactionHistory} />
              </div>
            </div>
          </div>
        </main>

        {/* Redemption Modal */}
        <RedemptionModal
          reward={selectedReward}
          userPoints={userPoints}
          isOpen={isRedemptionModalOpen}
          onClose={() => {
            setIsRedemptionModalOpen(false);
            setSelectedReward(null);
          }}
          onConfirm={handleRedemption}
        />
      </div>
    </>
  );
};

export default PointsRewardsStore;