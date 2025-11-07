// ============================================================================
// REWARDS MANAGEMENT - Gestión de Recompensas (VERSIÓN FINAL Y CORREGIDA)
// ============================================================================
// ✅ FIX CRÍTICO: Mapeo de todas las columnas del formulario a las columnas
//    reales de la base de datos (las que nos diste en la lista).
//    - name (Form) <-> title (DB)
//    - instructions (Form) <-> redemption_instructions (DB)
//    - status (Form) <-> is_active (DB)
//    - is_unlimited_stock (Form) <-> stock_quantity = -1 (DB)
//    - cost_free_points / cost_premium_points (Form) <-> points_cost / points_type (DB)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppIcon from '../../components/AppIcon';

// ============================================================================
// CONSTANTES
// ============================================================================

const REWARD_CATEGORIES = {
  DIGITAL: 'digital',
  PHYSICAL: 'physical',
  DISCOUNT: 'discount',
  PREMIUM: 'premium',
  EXCLUSIVE: 'exclusive',
  GIFT_CARD: 'gift_card'
};

// ESTADOS DE LA UI (NO DE LA DB)
const REWARD_STATUS_UI = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock'
};

const REDEMPTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function RewardsManagement() {
  // ============================================================================
  // ESTADO
  // ============================================================================

  const [activeTab, setActiveTab] = useState('rewards');
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all' // Usa REWARD_STATUS_UI
  });

  // Modal de edición/creación
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [modalData, setModalData] = useState({
    name: '', // Mapea a 'title'
    description: '',
    category: REWARD_CATEGORIES.DIGITAL,
    cost_free_points: 0, 
    cost_premium_points: 0, 
    stock_quantity: 1,
    is_unlimited_stock: false, // Mapea a 'stock_quantity' = -1
    image_url: '',
    instructions: '', // Mapea a 'redemption_instructions'
    status: REWARD_STATUS_UI.ACTIVE, // Mapea a 'is_active'
    is_featured: false,
    requires_approval: true,
    metadata: {}
  });

  // Modal de detalles de canje
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState(null);

  // Estadísticas
  const [stats, setStats] = useState({
    totalRewards: 0,
    activeRewards: 0,
    totalRedemptions: 0,
    pendingRedemptions: 0,
    totalPointsRedeemed: 0
  });

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [rewards, redemptions]);

  // ============================================================================
  // FUNCIONES DE CARGA
  // ============================================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar recompensas
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (rewardsError) throw rewardsError;
      
      // ✅ FIX: Mapear los datos de la DB a los inputs del modal
      const mappedRewards = rewardsData?.map(r => ({
          ...r,
          // Mapeamos 'title' de la DB a 'name' (que usa el resto del componente)
          name: r.title, 
          // Mapeamos points_cost según el points_type
          cost_free_points: r.points_type === 'free' ? r.points_cost : 0, 
          cost_premium_points: r.points_type === 'premium' ? r.points_cost : 0,
          // Mapeamos stock quantity
          is_unlimited_stock: r.stock_quantity === -1,
          // Mapeamos is_active (DB) al 'status' de la UI
          status: r.is_active ? REWARD_STATUS_UI.ACTIVE : REWARD_STATUS_UI.INACTIVE
      })) || [];
      
      setRewards(mappedRewards);

      // Cargar canjes recientes
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('reward_redemptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (redemptionsError) throw redemptionsError;

      // Simplificado: Enriquecer los canjes con la info de usuario y reward
      const enrichedRedemptions = redemptionsData?.map(r => ({ ...r, user: { full_name: 'Usuario' }, reward: { name: 'Recompensa' } })) || [];
      setRedemptions(enrichedRedemptions);

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    setStats({
      totalRewards: rewards.length,
      activeRewards: rewards.filter(r => r.is_active).length,
      totalRedemptions: redemptions.length,
      pendingRedemptions: redemptions.filter(r => r.status === REDEMPTION_STATUS.PENDING).length,
      totalPointsRedeemed: redemptions.reduce((sum, r) => sum + (r.points_spent || 0), 0)
    });
  };

  // ============================================================================
  // FUNCIONES DE RECOMPENSAS (CRUD)
  // ============================================================================

  const openCreateModal = () => {
    setEditingReward(null);
    setModalData({
      name: '', description: '', category: REWARD_CATEGORIES.DIGITAL,
      cost_free_points: 0, cost_premium_points: 0, stock_quantity: 1, 
      is_unlimited_stock: false, image_url: '', instructions: '', 
      status: REWARD_STATUS_UI.ACTIVE, is_featured: false, requires_approval: true,
      metadata: {}
    });
    setShowModal(true);
  };

  const openEditModal = (reward) => {
    setEditingReward(reward);
    setModalData({
      name: reward.title, // ✅ FIX: Cargar 'title' de la DB
      description: reward.description,
      category: reward.category,
      // ✅ FIX: Cargar los valores desde las columnas reales de la DB
      cost_free_points: reward.points_type === 'free' ? reward.points_cost : 0, 
      cost_premium_points: reward.points_type === 'premium' ? reward.points_cost : 0,
      
      stock_quantity: reward.is_unlimited_stock ? 0 : (reward.stock_quantity || 0), 
      is_unlimited_stock: reward.is_unlimited_stock,
      image_url: reward.image_url || '', 
      instructions: reward.redemption_instructions || '', // ✅ FIX: Mapear 'redemption_instructions'
      status: reward.is_active ? REWARD_STATUS_UI.ACTIVE : REWARD_STATUS_UI.INACTIVE, // ✅ FIX: Mapear 'is_active'
      is_featured: reward.is_featured, 
      requires_approval: reward.requires_approval,
      metadata: reward.metadata || {}
    });
    setShowModal(true);
  };

  const saveReward = async () => {
    try {
      setSaving(true);
      setError(null);

      // 1. Validaciones
      if (!modalData.name || !modalData.name.trim()) { // ✅ FIX: 'trim' error
        throw new Error('El nombre es requerido'); 
      }
      if (modalData.cost_free_points <= 0 && modalData.cost_premium_points <= 0) {
        throw new Error('Debe definir al menos un costo en puntos');
      }

      // 2. Determinar el costo y tipo de punto REAL (Columna única)
      let finalCost = 0;
      let finalType = 'free';

      if (modalData.cost_premium_points > 0) {
          finalCost = parseInt(modalData.cost_premium_points);
          finalType = 'premium';
      } else {
          finalCost = parseInt(modalData.cost_free_points);
          finalType = 'free';
      }
      
      // 3. Preparar los datos para la DB (USANDO LAS COLUMNAS CORRECTAS)
      const rewardDataForDB = {
        title: modalData.name, // ✅ FIX: Mapear 'name' a 'title'
        description: modalData.description,
        category: modalData.category,
        
        // ✅ FIX CRÍTICO: Usar las columnas reales de la DB
        points_cost: finalCost, // Columna numérica
        points_type: finalType, // Columna de tipo de moneda
        
        // ✅ FIX: 'is_unlimited_stock' no existe, usar 'stock_quantity = -1'
        stock_quantity: modalData.is_unlimited_stock ? -1 : (parseInt(modalData.stock_quantity) || 0),
        
        image_url: modalData.image_url,
        // ✅ FIX FINAL: Mapear 'instructions' a 'redemption_instructions'
        redemption_instructions: modalData.instructions, 
        is_active: modalData.status === REWARD_STATUS_UI.ACTIVE, // ✅ FIX: Mapear 'status' a 'is_active'
        is_featured: modalData.is_featured,
        requires_approval: modalData.requires_approval,
        metadata: modalData.metadata,
        updated_at: new Date().toISOString()
      };

      if (editingReward) {
        // 4. Actualizar
        const { error: updateError } = await supabase
          .from('rewards')
          .update(rewardDataForDB) 
          .eq('id', editingReward.id);

        if (updateError) throw updateError;
        setSuccessMessage('Recompensa actualizada exitosamente');
      } else {
        // 5. Crear
        const { error: insertError } = await supabase
          .from('rewards')
          .insert({
            ...rewardDataForDB,
            created_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
        setSuccessMessage('Recompensa creada exitosamente');
      }

      setShowModal(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error guardando recompensa:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteReward = async (rewardId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta recompensa?')) { return; }
    try {
      setSaving(true); setError(null);
      const { error: deleteError } = await supabase.from('rewards').delete().eq('id', rewardId);
      if (deleteError) throw deleteError;
      setSuccessMessage('Recompensa eliminada exitosamente');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error eliminando recompensa:', err); setError(err.message);
    } finally { setSaving(false); }
  };

  const toggleRewardStatus = async (rewardId, currentStatus) => {
    try {
      // ✅ FIX CRÍTICO: Toggle debe actualizar la columna 'is_active'
      const newActiveState = currentStatus === REWARD_STATUS_UI.ACTIVE ? false : true;
      const { error } = await supabase
        .from('rewards')
        .update({ is_active: newActiveState, updated_at: new Date().toISOString() })
        .eq('id', rewardId);
        
      if (error) throw error;
      setSuccessMessage('Estado actualizado');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Error actualizando estado:', err); setError(err.message);
    }
  };

  const updateStock = async (rewardId, newStock) => {
    try {
      const { error } = await supabase.from('rewards').update({ stock_quantity: parseInt(newStock), updated_at: new Date().toISOString() }).eq('id', rewardId);
      if (error) throw error;
      setSuccessMessage('Stock actualizado');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Error actualizando stock:', err); setError(err.message);
    }
  };

  // ============================================================================
  // FUNCIONES DE CANJES
  // ============================================================================

  const openRedemptionDetails = (redemption) => {
    setSelectedRedemption(redemption);
    setShowRedemptionModal(true);
  };

  const updateRedemptionStatus = async (redemptionId, newStatus, notes = '') => {
    try {
      setSaving(true); setError(null);
      const { error } = await supabase
        .from('reward_redemptions')
        .update({ status: newStatus, admin_notes: notes, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', redemptionId);
      if (error) throw error;
      setSuccessMessage('Estado de canje actualizado');
      setShowRedemptionModal(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error actualizando canje:', err); setError(err.message);
    } finally { setSaving(false); }
  };

  // ============================================================================
  // FUNCIONES DE FILTRADO
  // ============================================================================

  const filteredRewards = rewards.filter(reward => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!reward.title.toLowerCase().includes(searchLower) && // ✅ FIX: Buscar en 'title'
          !reward.description?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.category !== 'all' && reward.category !== filters.category) { return false; }
    // ✅ FIX: Filtrar por 'is_active'
    if (filters.status === REWARD_STATUS_UI.ACTIVE && !reward.is_active) { return false; }
    if (filters.status === REWARD_STATUS_UI.INACTIVE && reward.is_active) { return false; }
    if (filters.status === REWARD_STATUS_UI.OUT_OF_STOCK && reward.stock_quantity !== 0) { return false; }

    return true;
  });

  // ============================================================================
  // FUNCIONES AUXILIARES
  // ============================================================================

  const getCategoryLabel = (category) => {
    const labels = {
      [REWARD_CATEGORIES.DIGITAL]: 'Digital', [REWARD_CATEGORIES.PHYSICAL]: 'Físico', [REWARD_CATEGORIES.DISCOUNT]: 'Descuento',
      [REWARD_CATEGORIES.PREMIUM]: 'Premium', [REWARD_CATEGORIES.EXCLUSIVE]: 'Exclusivo', [REWARD_CATEGORIES.GIFT_CARD]: 'Gift Card'
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      [REWARD_CATEGORIES.DIGITAL]: 'Smartphone', [REWARD_CATEGORIES.PHYSICAL]: 'Package', [REWARD_CATEGORIES.DISCOUNT]: 'Percent',
      [REWARD_CATEGORIES.PREMIUM]: 'Crown', [REWARD_CATEGORIES.EXCLUSIVE]: 'Star', [REWARD_CATEGORIES.GIFT_CARD]: 'Gift'
    };
    return icons[category] || 'Gift';
  };

  const getStatusColor = (reward) => { // ✅ FIX: Recibe el objeto 'reward'
    if (!reward) return 'gray';
    if (reward.is_active) {
        if (!reward.is_unlimited_stock && reward.stock_quantity <= 0) return 'red'; // Out of stock
        return 'green'; // Active
    }
    return 'gray'; // Inactive
  };

  const getRedemptionStatusColor = (status) => {
    const colors = {
      [REDEMPTION_STATUS.PENDING]: 'yellow', [REDEMPTION_STATUS.APPROVED]: 'green', [REDEMPTION_STATUS.REJECTED]: 'red',
      [REDEMPTION_STATUS.DELIVERED]: 'blue', [REDEMPTION_STATUS.CANCELLED]: 'gray'
    };
    return colors[status] || 'gray';
  };

  // ============================================================================
  // RENDER - LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"> {[1, 2, 3].map(i => ( <div key={i} className="h-24 bg-gray-100 rounded"></div> ))} </div>
          <div className="space-y-4"> {[1, 2, 3].map(i => ( <div key={i} className="h-32 bg-gray-100 rounded"></div> ))} </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900"> Gestión de Recompensas </h1>
            <p className="text-gray-600 mt-1"> Administra el catálogo de recompensas canjeables </p>
          </div>
          <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2" >
            <AppIcon name="Plus" className="w-4 h-4" /> Nueva Recompensa
          </button>
        </div>

        {successMessage && ( <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-800"> <AppIcon name="CheckCircle" className="w-4 h-4" /> {successMessage} </div> )}
        {error && ( <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-800"> <AppIcon name="AlertCircle" className="w-4 h-4" /> {error} </div> )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <StatCard icon="Gift" label="Total Recompensas" value={stats.totalRewards} color="blue" />
        <StatCard icon="CheckCircle" label="Activas" value={stats.activeRewards} color="green" />
        <StatCard icon="ShoppingBag" label="Total Canjes" value={stats.totalRedemptions} color="purple" />
        <StatCard icon="Clock" label="Pendientes" value={stats.pendingRedemptions} color="yellow" />
        <StatCard icon="Coins" label="Puntos Canjeados" value={stats.totalPointsRedeemed.toLocaleString()} color="orange" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2">
            {[
              { id: 'rewards', label: 'Recompensas', icon: 'Gift' },
              { id: 'redemptions', label: 'Canjes', icon: 'ShoppingBag', badge: stats.pendingRedemptions }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors relative ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <AppIcon name={tab.icon} className="w-4 h-4" /> {tab.label}
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"> {tab.badge} </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Recompensas */}
          {activeTab === 'rewards' && (
            <div className="space-y-6">
              {/* Filtros */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input type="text" placeholder="Buscar recompensas..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" >
                  <option value="all">Todas las categorías</option>
                  {Object.values(REWARD_CATEGORIES).map(cat => ( <option key={cat} value={cat}>{getCategoryLabel(cat)}</option> ))}
                </select>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" >
                  <option value="all">Todos los estados</Costo en Puntos Gratisoption>
                  <option value={REWARD_STATUS_UI.ACTIVE}>Activas</option>
                  <option value={REWARD_STATUS_UI.INACTIVE}>Inactivas</option>
                  <option value={REWARD_STATUS_UI.OUT_OF_STOCK}>Sin stock</option>
                </select>
              </div>

              {/* Lista de recompensas */}
              {filteredRewards.length === 0 ? (
                <div className="text-center py-12"> <AppIcon name="Gift" className="w-16 h-16 text-gray-400 mx-auto mb-4" /> <h3 className="text-lg font-medium text-gray-900 mb-2"> No hay recompensas </h3> <p className="text-gray-600 mb-4"> {filters.search || filters.category !== 'all' || filters.status !== 'all' ? 'No se encontraron recompensas con los filtros aplicados' : 'Comienza creando tu primera recompensa'} </p>
                  {!filters.search && filters.category === 'all' && filters.status === 'all' && (
                    <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" > Crear Primera Recompensa </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRewards.map(reward => (
                    <RewardCard key={reward.id} reward={reward} onEdit={() => openEditModal(reward)} onDelete={() => deleteReward(reward.id)} onToggleStatus={() => toggleRewardStatus(reward.id, reward.is_active ? REWARD_STATUS_UI.ACTIVE : REWARD_STATUS_UI.INACTIVE)} onUpdateStock={(stock) => updateStock(reward.id, stock)} getCategoryLabel={getCategoryLabel} getCategoryIcon={getCategoryIcon} getStatusColor={getStatusColor} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Canjes */}
          {activeTab === 'redemptions' && (
            <div className="space-y-6">
              {redemptions.length === 0 ? (
                <div className="text-center py-12"> <AppIcon name="ShoppingBag" className="w-16 h-16 text-gray-400 mx-auto mb-4" /> <h3 className="text-lg font-medium text-gray-900 mb-2"> No hay canjes registrados </h3> <p className="text-gray-600"> Los canjes de recompensas aparecerán aquí </p> </div>
              ) : (
                <div className="space-y-3">
                  {redemptions.map(redemption => (
                    <RedemptionCard key={redemption.id} redemption={redemption} onClick={() => openRedemptionDetails(redemption)} getStatusColor={getRedemptionStatusColor} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Crear/Editar Recompensa */}
      {showModal && (
        <RewardModal
          isEditing={!!editingReward}
          data={modalData}
          onChange={setModalData}
          onSave={saveReward}
          onClose={() => setShowModal(false)}
          saving={saving}
          getCategoryLabel={getCategoryLabel}
          getCategoryIcon={getCategoryIcon}
        />
      )}

      {/* Modal: Detalles de Canje */}
      {showRedemptionModal && selectedRedemption && (
        <RedemptionModal
          redemption={selectedRedemption}
          onUpdateStatus={updateRedemptionStatus}
          onClose={() => setShowRedemptionModal(false)}
          saving={saving}
          getStatusColor={getRedemptionStatusColor}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

/**
 * Card de estadística
 */
function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600', orange: 'bg-orange-50 text-orange-600', red: 'bg-red-50 text-red-600'
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}> <AppIcon name={icon} className="w-5 h-5" /> </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

/**
 * Card de recompensa
 */
function RewardCard({ 
  reward, onEdit, onDelete, onToggleStatus, onUpdateStock, getCategoryLabel, getCategoryIcon, getStatusColor
}) {
  const [editingStock, setEditingStock] = useState(false);
  const [newStock, setNewStock] = useState(reward.stock_quantity || 0);

  const handleStockUpdate = () => { onUpdateStock(newStock); setEditingStock(false); };
  const statusColor = getStatusColor(reward); // ✅ FIX: Pasar el objeto reward
  const statusClasses = {
    green: 'bg-green-100 text-green-800', gray: 'bg-gray-100 text-gray-800', red: 'bg-red-100 text-red-800', blue: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagen */}
      <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100">
        {reward.image_url ? ( <img src={reward.image_url} alt={reward.title} className="w-full h-full object-cover" /> ) : (
          <div className="w-full h-full flex items-center justify-center"> <AppIcon name={getCategoryIcon(reward.category)} className="w-16 h-16 text-gray-400" /> </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[statusColor]}`}>
            {reward.is_active ? 'Activo' : 'Inactivo'}
          </span>
          {reward.is_featured && ( <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium"> ⭐ Destacado </span> )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Categoría */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2"> <AppIcon name={getCategoryIcon(reward.category)} className="w-4 h-4" /> {getCategoryLabel(reward.category)} </div>
        {/* Nombre */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1"> {reward.title} </h3>
        {/* Descripción */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2"> {reward.description} </p>

        {/* Costos */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {reward.cost_free_points > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <AppIcon name="Coins" className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-600"> {reward.cost_free_points} </span> <span className="text-gray-600">gratis</span>
            </div>
          )}
          {reward.cost_premium_points > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <AppIcon name="Crown" className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-purple-600"> {reward.cost_premium_points} </span> <span className="text-gray-600">premium</span>
            </div>
          )}
        </div>

        {/* Stock */}
        {!reward.is_unlimited_stock && (
          <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
            {editingStock ? (
              <div className="flex items-center gap-2">
                <input type="number" value={newStock} onChange={(e) => setNewStock(parseInt(e.target.value) || 0)} className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" min="0" />
                <button onClick={handleStockUpdate} className="p-1 text-green-600 hover:bg-green-50 rounded"> <AppIcon name="Check" className="w-4 h-4" /> </button>
                <button onClick={() => setEditingStock(false)} className="p-1 text-red-600 hover:bg-red-50 rounded"> <AppIcon name="X" className="w-4 h-4" /> </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600"> Stock: <span className="font-semibold">{reward.stock_quantity || 0}</span> </span>
                <button onClick={() => setEditingStock(true)} className="text-blue-600 hover:text-blue-700 text-sm"> Editar </button>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          <button onClick={onEdit} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium" > Editar </button>
          <button onClick={onToggleStatus} className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${reward.is_active ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`} >
            {reward.is_active ? 'Desactivar' : 'Activar'}
          </button>
          <button onClick={onDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" > <AppIcon name="Trash2" className="w-4 h-4" /> </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de crear/editar recompensa
 */
function RewardModal({ 
  isEditing, data, onChange, onSave, onClose, saving, getCategoryLabel, getCategoryIcon
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900"> {isEditing ? 'Editar Recompensa' : 'Nueva Recompensa'} </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" > <AppIcon name="X" className="w-5 h-5" /> </button>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            {/* Nombre */}
            <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Nombre * </label>
              <input type="text" value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Gift Card Amazon $10" />
            </div>

            {/* Descripción */}
            <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Descripción * </label>
              <textarea value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe la recompensa..." />
            </div>

            {/* Categoría */}
            <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Categoría * </label>
              <select value={data.category} onChange={(e) => onChange({ ...data, category: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" >
                {Object.values(REWARD_CATEGORIES).map(cat => ( <option key={cat} value={cat}> {getCategoryLabel(cat)} </option> ))}
              </select>
            </div>

            {/* Costos */}
            <div className="grid grid-cols-2 gap-4">
              <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Costo en Puntos Gratis </label>
                <input type="number" min="0" value={data.cost_free_points} onChange={(e) => onChange({ ...data, cost_free_points: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Costo en Puntos Premium </label>
                <input type="number" min="0" value={data.cost_premium_points} onChange={(e) => onChange({ ...data, cost_premium_points: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Stock */}
            <div> <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={data.is_unlimited_stock} onChange={(e) => onChange({ ...data, is_unlimited_stock: e.target.checked })} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700"> Stock ilimitado </span>
              </label>
              {!data.is_unlimited_stock && (
                <input type="number" min="0" value={data.stock_quantity || 0} onChange={(e) => onChange({ ...data, stock_quantity: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cantidad disponible" />
              )}
            </div>

            {/* URL de imagen */}
            <div> <label className="block text-sm font-medium text-gray-700 mb-1"> URL de Imagen </label>
              <input type="url" value={data.image_url} onChange={(e) => onChange({ ...data, image_url: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
            </div>

            {/* Instrucciones de canje */}
            <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Instrucciones de Canje </label>
              <textarea value={data.instructions} onChange={(e) => onChange({ ...data, instructions: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cómo canjear esta recompensa..." />
            </div>

            {/* Opciones */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={data.is_featured} onChange={(e) => onChange({ ...data, is_featured: e.target.checked })} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Destacar esta recompensa</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={data.requires_approval} onChange={(e) => onChange({ ...data, requires_approval: e.target.checked })} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Requiere aprobación de admin</span>
              </label>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" > Cancelar </button>
            <button onClick={onSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" >
              {saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
