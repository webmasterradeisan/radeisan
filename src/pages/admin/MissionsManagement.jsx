// ============================================================================
// MISSIONS MANAGEMENT - Panel de Administración de Misiones Diarias
// ============================================================================
// Componente completo para gestionar el sistema de misiones desde el admin panel
// Incluye: CRUD completo, estadísticas, activar/desactivar, reordenamiento
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import * as missionsService from '../../services/missionsService';
import AppIcon from '../../components/AppIcon';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function MissionsManagement() {
  // ============================================================================
  // ESTADO
  // ============================================================================

  // Tabs
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'form', 'stats'

  // Misiones
  const [missions, setMissions] = useState([]);
  const [filteredMissions, setFilteredMissions] = useState([]);

  // Filtros y búsqueda
  const [filters, setFilters] = useState({
    search: '',
    is_active: 'all', // 'all', true, false
    frequency: 'all', // 'all', 'daily', 'weekly', 'monthly'
    mission_type: 'all'
  });

  // Formulario
  const [editingMission, setEditingMission] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mission_type: 'watch_videos', // Sincronizado con 'missionsService'
    mission_key: 'watch_videos', 
    target_count: 1,
    points_reward: 0, // ✅ CORREGIDO: Default es 0
    frequency: 'daily',
    icon: 'Target',
    is_active: true,
    display_order: 0
  });

  // Estadísticas
  const [stats, setStats] = useState(null);
  const [topMissions, setTopMissions] = useState([]);

  // Estados UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal de confirmación
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ============================================================================
  // FUNCIONES DE CARGA
  // ============================================================================

  /**
   * Cargar todas las misiones
   */
  const loadMissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Llama a la función de admin que ignora RLS (del 'missionsService' corregido)
      const result = await missionsService.getAllMissions();

      if (result.success) {
        setMissions(result.missions);
        // setFilteredMissions(result.missions); // El useEffect [missions, filters] se encarga de esto
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error cargando misiones:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar estadísticas
   */
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResult, topResult] = await Promise.all([
        missionsService.getMissionStats(),
        missionsService.getTopMissions(10)
      ]);

      if (statsResult.success) {
        setStats(statsResult.stats);
      }

      if (topResult.success) {
        setTopMissions(topResult.missions);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Efecto: Cargar datos iniciales
   */
  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  /**
   * Efecto: Cargar stats cuando se cambia a tab de estadísticas
   */
  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab, loadStats]);

  // ============================================================================
  // FUNCIONES DE FILTRADO
  // ============================================================================

  /**
   * Aplicar filtros a las misiones
   */
  useEffect(() => {
    let filtered = [...missions];

    // Filtro por búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        m =>
          m.title.toLowerCase().includes(searchLower) ||
          (m.description && m.description.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por estado activo
    if (filters.is_active !== 'all') {
      filtered = filtered.filter(m => m.is_active === filters.is_active);
    }

    // Filtro por frecuencia
    if (filters.frequency !== 'all') {
      filtered = filtered.filter(m => m.frequency === filters.frequency);
    }

    // Filtro por tipo de misión
    if (filters.mission_type !== 'all') {
      filtered = filtered.filter(m => m.mission_type === filters.mission_type);
    }

    setFilteredMissions(filtered);
  }, [missions, filters]);

  /**
   * Actualizar filtros
   */
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // ============================================================================
  // FUNCIONES CRUD
  // ============================================================================

  /**
   * Crear nueva misión
   */
  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const result = await missionsService.createMission(formData);

      if (result.success) {
        setSuccess('Misión creada exitosamente');
        setFormData({
          title: '',
          description: '',
          mission_type: 'watch_videos',
          mission_key: 'watch_videos', 
          target_count: 1,
          points_reward: 0, // ✅ CORREGIDO: Default es 0
          frequency: 'daily',
          icon: 'Target',
          is_active: true,
          display_order: 0
        });
        await loadMissions();
        setActiveTab('list');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error creando misión:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Actualizar misión existente
   */
  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const result = await missionsService.updateMission(editingMission.id, formData);

      if (result.success) {
        setSuccess('Misión actualizada exitosamente');
        setEditingMission(null);
        setFormData({
          title: '',
          description: '',
          mission_type: 'watch_videos',
          mission_key: 'watch_videos', 
          target_count: 1,
          points_reward: 0, // ✅ CORREGIDO: Default es 0
          frequency: 'daily',
          icon: 'Target',
          is_active: true,
          display_order: 0
        });
        await loadMissions();
        setActiveTab('list');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error actualizando misión:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Eliminar misión
   */
  const handleDelete = async (missionId) => {
    try {
      setError(null);

      const result = await missionsService.deleteMission(missionId);

      if (result.success) {
        setSuccess('Misión eliminada exitosamente');
        setDeleteConfirm(null);
        await loadMissions();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error eliminando misión:', err);
      setError(err.message);
    }
  };

  /**
   * Toggle activar/desactivar misión
   */
  const handleToggleActive = async (mission) => {
    try {
      setError(null);

      // Usamos el servicio 'updateMission' genérico para que las RLS funcionen
      const result = await missionsService.updateMission(mission.id, { 
        ...mission, // Pasa todos los datos existentes
        is_active: !mission.is_active // Cambia solo el estado
      });

      if (result.success) {
        setSuccess(
          `Misión ${!mission.is_active ? 'activada' : 'desactivada'} exitosamente`
        );
        await loadMissions(); // Recarga la lista
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error cambiando estado de misión:', err);
      setError(err.message);
    }
  };

  /**
   * Cargar misión para editar
   */
  const handleEdit = (mission) => {
    setEditingMission(mission);
    setFormData({
      title: mission.title,
      description: mission.description,
      mission_type: mission.mission_type,
      mission_key: mission.mission_key, 
      target_count: mission.target_count,
      points_reward: mission.points_reward,
      frequency: mission.frequency,
      icon: mission.icon,
      is_active: mission.is_active,
      display_order: mission.display_order
    });
    setActiveTab('form');
  };

  /**
   * Cancelar edición
   */
  const handleCancelEdit = () => {
    setEditingMission(null);
    setFormData({
      title: '',
      description: '',
      mission_type: 'watch_videos',
      mission_key: 'watch_videos', 
      target_count: 1,
      points_reward: 0, // ✅ CORREGIDO: Default es 0
      frequency: 'daily',
      icon: 'Target',
      is_active: true,
      display_order: 0
    });
    setActiveTab('list');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="missions-management-container p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Gestión de Misiones Diarias</h1>
        <p className="text-gray-600">
          Administra las misiones que los usuarios pueden completar para ganar puntos
        </p>
      </div>

      {/* Mensajes de éxito/error */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <AppIcon name="CheckCircle" className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AppIcon name="AlertCircle" className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            <AppIcon name="X" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'list'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <AppIcon name="List" className="w-4 h-4" />
              Lista de Misiones
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('form');
              if (editingMission) {
                handleCancelEdit();
              }
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'form'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <AppIcon name="Plus" className="w-4 h-4" />
              Nueva Misión
            </div>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <AppIcon name="BarChart3" className="w-4 h-4" />
              Estadísticas
            </div>
          </button>
        </div>
      </div>

      {/* Contenido de los tabs */}
      {activeTab === 'list' && (
        <ListTab
          missions={filteredMissions}
          filters={filters}
          updateFilter={updateFilter}
          onEdit={handleEdit}
          onDelete={missionId => setDeleteConfirm(missionId)}
          onToggleActive={handleToggleActive}
          loading={loading}
        />
      )}

      {activeTab === 'form' && (
        <FormTab
          formData={formData}
          setFormData={setFormData}
          editingMission={editingMission}
          onSubmit={editingMission ? handleUpdate : handleCreate}
          onCancel={handleCancelEdit}
          saving={saving}
        />
      )}

      {activeTab === 'stats' && (
        <StatsTab stats={stats} topMissions={topMissions} loading={loading} />
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <DeleteConfirmModal
          mission={missions.find(m => m.id === deleteConfirm)}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// TAB: LISTA DE MISIONES
// ============================================================================

function ListTab({ missions, filters, updateFilter, onEdit, onDelete, onToggleActive, loading }) {
  // ✅✅✅ INICIO DE LA CORRECCIÓN DEL CRASH ✅✅✅
  // El componente recibe 'missions' (que son las 'filteredMissions' del padre).
  // Debemos mapear 'missions', no 'filteredMissions' (que no existe aquí).
  
  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar misión
            </label>
            <div className="relative">
              <AppIcon
                name="Search"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar por título o descripción..."
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filters.is_active}
              onChange={e =>
                updateFilter('is_active', e.target.value === 'all' ? 'all' : e.target.value === 'true')
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>

          {/* Filtro por frecuencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia</label>
            <select
              value={filters.frequency}
              onChange={e => updateFilter('frequency', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="one_time">Una vez</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de misiones */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600">Cargando misiones...</p>
          </div>
        </div>
      ) : missions.length === 0 ? ( // ✅ CORREGIDO: usar 'missions' (la prop)
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <AppIcon name="Target" className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No hay misiones
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {filters.search || filters.is_active !== 'all' || filters.frequency !== 'all'
                ? 'No se encontraron misiones con los filtros aplicados'
                : 'Aún no has creado ninguna misión'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {missions.map(mission => ( // ✅ CORREGIDO: usar 'missions' (la prop)
            <MissionCard
              key={mission.id}
              mission={mission}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      )}

      {/* Contador de resultados */}
      {missions.length > 0 && ( // ✅ CORREGIDO: usar 'missions' (la prop)
        <div className="text-sm text-gray-600 text-center">
          Mostrando {missions.length} misión{missions.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
  // ✅✅✅ FIN DE LA CORRECCIÓN DEL CRASH ✅✅✅
}

// ============================================================================
// COMPONENTE: CARD DE MISIÓN
// ============================================================================

function MissionCard({ mission, onEdit, onDelete, onToggleActive }) {
  const getMissionTypeLabel = type => {
    // ✅ CORREGIDO: Lista de 'labels' actualizada para coincidir con el 'FormTab'
    const types = {
      watch_videos: 'Ver videos',
      upload_video: 'Subir video',
      upload_photo: 'Subir foto', 
      like_videos: 'Dar likes',
      share_video: 'Compartir',
      donate_points: 'Donar puntos',
      comment_videos: 'Comentar',
      follow_user: 'Seguir usuarios',
      complete_profile: 'Completar perfil',
      login_daily: 'Login diario',
      watch_reels: 'Ver reels',
      invite_friend: 'Invitar amigo',
      upload_pack: 'Paquete de Publicación',
      all_missions_streak: 'Racha de Misiones'
    };
    return types[type] || type;
  };

  const getFrequencyLabel = frequency => {
    const labels = {
      daily: 'Diaria',
      weekly: 'Semanal',
      monthly: 'Mensual',
      one_time: 'Una vez'
    };
    return labels[frequency] || frequency;
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all ${
        mission.is_active
          ? 'border-gray-200 hover:border-purple-300 hover:shadow-md'
          : 'border-gray-100 bg-gray-50'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Icono */}
          <div
            className={`p-3 rounded-lg flex-shrink-0 ${
              mission.is_active
                ? 'bg-gradient-to-br from-purple-100 to-blue-100'
                : 'bg-gray-100'
            }`}
          >
            <AppIcon
              name={mission.icon || 'Target'}
              className={`w-6 h-6 ${mission.is_active ? 'text-purple-600' : 'text-gray-400'}`}
            />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  {mission.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">{mission.description}</p>
              </div>

              {/* Badge de estado */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    mission.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {mission.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>

            {/* Detalles de la misión */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AppIcon name="Target" className="w-4 h-4" />
                <span>Meta: {mission.target_count}x</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                <AppIcon name="Star" className="w-4 h-4" />
                <span>+{mission.points_reward} puntos</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AppIcon name="Calendar" className="w-4 h-4" />
                <span>{getFrequencyLabel(mission.frequency)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AppIcon name="Tag" className="w-4 h-4" />
                <span>{getMissionTypeLabel(mission.mission_type)}</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => onEdit(mission)}
                className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <AppIcon name="Edit2" className="w-4 h-4" />
                Editar
              </button>

              <button
                onClick={() => onToggleActive(mission)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                  mission.is_active
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                <AppIcon name={mission.is_active ? 'EyeOff' : 'Eye'} className="w-4 h-4" />
                {mission.is_active ? 'Desactivar' : 'Activar'}
              </button>

              <button
                onClick={() => onDelete(mission.id)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-2 ml-auto"
              >
                <AppIcon name="Trash2" className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: FORMULARIO (Crear/Editar)
// ============================================================================

function FormTab({ formData, setFormData, editingMission, onSubmit, onCancel, saving }) {
  const availableIcons = missionsService.getAvailableMissionIcons();

  // --- CORRECCIÓN APLICADA AQUÍ ---
  const updateField = (field, value) => {
    setFormData(prev => {
      // Crea el nuevo objeto de estado
      const newState = { ...prev, [field]: value };
      
      // Si el campo que cambió es 'mission_type',
      // actualiza también 'mission_key' para que coincida.
      if (field === 'mission_type') {
        newState.mission_key = value;
      }
      
      return newState;
    });
  };
  
  // --- LÓGICA CONDICIONAL DE FORMULARIO ---
  const showTargetCount = formData.mission_type !== 'upload_pack';
  const isUploadPack = formData.mission_type === 'upload_pack';
  const isStreakMission = formData.mission_type === 'all_missions_streak';

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {editingMission ? 'Editar Misión' : 'Crear Nueva Misión'}
        </h2>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título de la misión *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Ver 5 videos"
              value={formData.title}
              onChange={e => updateField('title', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              required
              placeholder="Describe qué debe hacer el usuario para completar esta misión"
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Grid de 2 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ================================================== */}
            {/* ✅ INICIO: "Tipo de misión" CORREGIDO */}
            {/* ================================================== */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de misión *
              </label>
              <select
                required
                value={formData.mission_type}
                onChange={e => updateField('mission_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {/* Lista basada en missionsService.js y tu solicitud */}
                <option value="watch_videos">Ver videos</option>
                <option value="upload_video">Subir video</option>
                <option value="upload_photo">Subir foto</option>
                <option value="like_videos">Dar likes</option>
                <option value="share_video">Compartir contenido</option>
                <option value="comment_videos">Comentar</option>
                <option value="follow_user">Seguir usuarios</option>
                <option value="complete_profile">Completar perfil</option>
                <option value="login_daily">Login diario</option>
                <option value="watch_reels">Ver reels</option>
                <option value="invite_friend">Invitar amigo</option>
                <option value="donate_points">Donar puntos</option>
                {/* Tipos especiales (si aún los usas) */}
                <option value="upload_pack">Paquete de Publicación</option>
                <option value="all_missions_streak">Racha de Misiones Diarias</option>
              </select>
              
              {/* === AVISO CONDICIONAL 1 (UPLOAD_PACK) === */}
              {isUploadPack && (
                <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md mt-2">
                  <strong>Paquete Implícito:</strong> Recompensa por (1 Video + 1 Reel + 1 Foto). La lógica se gestiona en el backend.
                </p>
              )}
            </div>
            {/* ================================================== */}
            {/* ✅ FIN: "Tipo de misión" CORREGIDO */}
            {/* ================================================== */}


            {/* Frecuencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frecuencia *
              </label>
              <select
                required
                value={formData.frequency}
                onChange={e => updateField('frequency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="one_time">Una vez</option>
              </select>
            </div>

            {/* ================================================== */}
            {/* ✅ INICIO: "Meta (cantidad)" CORREGIDO */}
            {/* ================================================== */}
            {showTargetCount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta (cantidad) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0" // <-- CORREGIDO: Permite 0
                    placeholder="1"
                    value={formData.target_count}
                    onChange={e => {
                      const value = parseInt(e.target.value);
                      // Permite 0, pero si está vacío, usa 1 como fallback
                      updateField('target_count', isNaN(value) ? 1 : value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  
                  {/* === AVISO CONDICIONAL 2 (STREAK) === */}
                  {isStreakMission ? (
                     <p className="text-xs text-gray-500 mt-1">
                       Número de <strong>días seguidos</strong> necesarios para la racha.
                     </p>
                  ) : (
                     <p className="text-xs text-gray-500 mt-1">
                       Cuántas veces debe realizar la acción.
                     </p>
                  )}
                </div>
            )}
            {/* ================================================== */}
            {/* ✅ FIN: "Meta (cantidad)" CORREGIDO */}
            {/* ================================================== */}


            {/* ================================================== */}
            {/* ✅ INICIO: "Recompensa (puntos)" CORREGIDO */}
            {/* ================================================== */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recompensa (puntos) *
              </label>
              <input
                type="number"
                required
                min="0" // <-- CORREGIDO: Permite 0
                placeholder="0"
                value={formData.points_reward}
                onChange={e => {
                  const value = parseInt(e.target.value);
                  // Permite 0, pero si está vacío, usa 0 como fallback
                  updateField('points_reward', isNaN(value) ? 0 : value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Puntos que ganará al completar</p>
            </div>
            {/* ================================================== */}
            {/* ✅ FIN: "Recompensa (puntos)" CORREGIDO */}
            {/* ================================================== */}

          </div>

          {/* Selector de icono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Icono de la misión
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {availableIcons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => updateField('icon', icon)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-110 ${
                    formData.icon === icon
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  title={icon}
                >
                  <AppIcon
                    name={icon}
                    className={`w-6 h-6 ${
                      formData.icon === icon ? 'text-purple-600' : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Estado activo */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => updateField('is_active', e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Misión activa (visible para los usuarios)
            </label>
          </div>

          {/* Vista previa */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Vista previa:</h3>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
                  <AppIcon name={formData.icon} className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 mb-1">
                    {formData.title || 'Título de la misión'}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {formData.description || 'Descripción de la misión'}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <AppIcon name="Target" className="w-4 h-4" />
                      <span>{formData.target_count}x</span>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 rounded-full">
                      <AppIcon name="Star" className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-700">
                        +{formData.points_reward}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {editingMission ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  <AppIcon name="Save" className="w-4 h-4" />
                  {editingMission ? 'Actualizar Misión' : 'Crear Misión'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: ESTADÍSTICAS
// ============================================================================

function StatsTab({ stats, topMissions, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center">
          <AppIcon name="BarChart3" className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No hay estadísticas disponibles
          </h3>
          <p className="text-gray-600">Las estadísticas aparecerán cuando haya actividad</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="Target"
          label="Total de Misiones"
          value={stats.total_missions || 0}
          color="purple"
        />
        <StatCard
          icon="CheckCircle"
          label="Completadas Hoy"
          value={stats.completed_today || 0}
          color="green"
        />
        <StatCard
          icon="Users"
          label="Usuarios Activos"
          value={stats.active_users || 0}
          color="blue"
        />
        <StatCard
          icon="Star"
          label="Puntos Repartidos"
          value={(stats.total_points_distributed || 0).toLocaleString()}
          color="yellow"
        />
      </div>

      {/* Misiones más completadas */}
      {topMissions && topMissions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AppIcon name="TrendingUp" className="w-5 h-5 text-purple-600" />
            Top 10 Misiones Más Completadas
          </h3>
          <div className="space-y-3">
            {topMissions.map((mission, index) => (
              <div
                key={mission.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 font-bold rounded-lg flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <AppIcon
                    name={mission.icon || 'Target'}
                    className="w-5 h-5 text-purple-600 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{mission.title}</p>
                    <p className="text-xs text-gray-500">
                      {mission.completion_count} veces completada
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-purple-600">
                  <AppIcon name="Star" className="w-4 h-4" />
                  +{mission.points_reward}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasa de completación */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AppIcon name="PieChart" className="w-5 h-5 text-blue-600" />
            Tasa de Completación
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Misiones iniciadas</span>
                <span className="font-semibold text-gray-800">
                  {stats.missions_started || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Misiones completadas</span>
                <span className="font-semibold text-gray-800">
                  {stats.missions_completed || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-full rounded-full"
                  style={{
                    width: `${
                      stats.missions_started > 0
                        ? (stats.missions_completed / stats.missions_started) * 100
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-2xl font-bold text-purple-600">
                {stats.missions_started > 0
                  ? Math.round((stats.missions_completed / stats.missions_started) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-gray-600">Tasa de éxito</p>
            </div>
          </div>
        </div>

        {/* Engagement por día */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AppIcon name="Activity" className="w-5 h-5 text-green-600" />
            Engagement Diario
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Promedio diario</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.avg_daily_completions || 0}
                </p>
              </div>
              <AppIcon name="TrendingUp" className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Récord diario</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.max_daily_completions || 0}
                </p>
              </div>
              <AppIcon name="Award" className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-60Am-1">Rachas activas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.active_streaks || 0}
                </p>
              </div>
              <AppIcon name="Flame" className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: STAT CARD
// ============================================================================

function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    purple: 'from-purple-500 to-blue-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
    yellow: 'from-yellow-500 to-orange-500'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-lg`}>
          <AppIcon name={icon} className="w-6 h-6 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

// ============================================================================
// MODAL: CONFIRMACIÓN DE ELIMINACIÓN
// ============================================================================

function DeleteConfirmModal({ mission, onConfirm, onCancel }) {
  if (!mission) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <AppIcon name="AlertTriangle" className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Confirmar Eliminación</h3>
        </div>

        <p className="text-gray-600 mb-2">¿Estás seguro de que quieres eliminar esta misión?</p>
        <p className="text-sm text-gray-500 mb-4">
          <strong>{mission.title}</strong>
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Advertencia:</strong> Esta acción no se puede deshacer. El progreso de los
            usuarios en esta misión se perderá.
          </T>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Sí, eliminar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
