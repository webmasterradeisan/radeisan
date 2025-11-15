// ============================================================================
// MISSIONS MANAGEMENT - Panel de Administración de Misiones Diarias
// ============================================================================
// Componente completo para gestionar el sistema de misiones desde el admin panel
// Incluye: CRUD completo, estadísticas, activar/desactivar, reordenamiento
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import * as missionsService from '../../services/missionsService';
import AppIcon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
// 🛑 ELIMINADO: La dependencia 'react-beautiful-dnd' para evitar el error de compilación.

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

// Tipos de misión dinámicos (incluye upload_reel y upload_photo)
const MISSION_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los Tipos' },
  // Las opciones visibles en el menú de filtros (basadas en el servicio)
  { value: missionsService.MISSION_TYPES.WATCH_VIDEO, label: 'Ver videos' },
  { value: missionsService.MISSION_TYPES.UPLOAD_VIDEO, label: 'Subir video' },
  { value: missionsService.MISSION_TYPES.UPLOAD_REEL, label: 'Subir reel' }, // ✅ AÑADIDO
  { value: missionsService.MISSION_TYPES.UPLOAD_PHOTO, label: 'Subir foto' }, // ✅ AÑADIDO
  { value: missionsService.MISSION_TYPES.GIVE_LIKE, label: 'Dar likes' },
  { value: missionsService.MISSION_TYPES.SHARE_CONTENT, label: 'Compartir contenido' },
  { value: missionsService.MISSION_TYPES.COMMENT, label: 'Comentar' },
  { value: missionsService.MISSION_TYPES.FOLLOW_USER, label: 'Seguir usuarios' },
  { value: missionsService.MISSION_TYPES.COMPLETE_PROFILE, label: 'Completar perfil' },
  { value: missionsService.MISSION_TYPES.LOGIN_DAILY, label: 'Login diario' },
  { value: missionsService.MISSION_TYPES.WATCH_REELS, label: 'Ver reels' },
  { value: missionsService.MISSION_TYPES.INVITE_FRIEND, label: 'Invitar amigo' },
  { value: missionsService.MISSION_TYPES.DONATE_POINTS, label: 'Donar puntos' },
  { value: missionsService.MISSION_TYPES.UPLOAD_PACK, label: 'Paquete de Publicación' },
  { value: missionsService.MISSION_TYPES.ALL_MISSIONS_STREAK, label: 'Racha de Misiones Diarias' }
];

const FREQUENCY_OPTIONS = [
  { value: 'all', label: 'Todas las Frecuencias' },
  { value: missionsService.MISSION_FREQUENCY.DAILY, label: 'Diaria' },
  { value: missionsService.MISSION_FREQUENCY.WEEKLY, label: 'Semanal' },
  { value: missionsService.MISSION_FREQUENCY.MONTHLY, label: 'Mensual' },
  { value: missionsService.MISSION_FREQUENCY.ONE_TIME, label: 'Una vez' }
];

const IS_ACTIVE_OPTIONS = [
  { value: 'all', label: 'Todos los Estados' },
  { value: 'true', label: 'Activas' },
  { value: 'false', label: 'Inactivas' }
];

// ============================================================================
// COMPONENTE: MissionForm (Formulario de Creación/Edición)
// ============================================================================

const MissionForm = ({ 
  initialData = null, 
  onSuccess, 
  onCancel 
}) => {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    mission_type: initialData?.mission_type || missionsService.MISSION_TYPES.WATCH_VIDEO,
    mission_key: initialData?.mission_key || '', // ✅ AÑADIDO: Clave de Misión
    target_count: initialData?.target_count || 1,
    points_reward: initialData?.points_reward || 0, // ✅ Default 0
    frequency: initialData?.frequency || missionsService.MISSION_FREQUENCY.DAILY,
    icon: initialData?.icon || 'Star',
    is_active: initialData?.is_active ?? true,
    display_order: initialData?.display_order || 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const availableIcons = missionsService.getAvailableMissionIcons();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Asegurarse de que el target_count y points_reward sean números
    const dataToSubmit = {
      ...formData,
      target_count: Number(formData.target_count),
      points_reward: Number(formData.points_reward),
    };

    let result;
    if (isEditing) {
      result = await missionsService.updateMission(initialData.id, dataToSubmit);
    } else {
      result = await missionsService.createMission(dataToSubmit);
    }

    setLoading(false);

    if (result.success) {
      onSuccess(result.mission);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-xl max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-foreground">
        {isEditing ? 'Editar Misión' : 'Crear Nueva Misión'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fila 1: Título y Descripción */}
        <Input 
          label="Título" 
          name="title" 
          value={formData.title} 
          onChange={handleChange} 
          required 
        />
        <Input 
          label="Descripción" 
          name="description" 
          value={formData.description} 
          onChange={handleChange} 
          required 
          multiline 
        />

        {/* Fila 2: Tipo de Misión y Clave */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo de Misión"
            name="mission_type"
            value={formData.mission_type}
            onChange={handleChange}
            // Mapea todas las opciones excepto la primera ('all')
            options={MISSION_TYPE_OPTIONS.slice(1).map(opt => ({
              value: opt.value,
              label: opt.label,
            }))}
            required
          />
          {/* ✅ NUEVO CAMPO: Clave de Misión */}
          <Input 
            label="Clave de Misión (mission_key)" 
            name="mission_key" 
            value={formData.mission_key} 
            onChange={handleChange} 
            placeholder="Ej: watch_video_daily_unique"
            required 
            helpText="Clave única para la lógica de la DB (anti-farming)."
          />
        </div>

        {/* Fila 3: Target, Puntos, Frecuencia */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Conteo Objetivo (Target)" 
            name="target_count" 
            type="number" 
            min="0"
            value={formData.target_count} 
            onChange={handleChange} 
            required 
          />
          <Input 
            label="Recompensa (Puntos)" 
            name="points_reward" 
            type="number" 
            min="0"
            value={formData.points_reward} 
            onChange={handleChange} 
            required 
          />
          <Select
            label="Frecuencia"
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            options={FREQUENCY_OPTIONS.slice(1)}
            required
          />
        </div>

        {/* Fila 4: Ícono y Estado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Ícono de Misión"
            name="icon"
            value={formData.icon}
            onChange={handleChange}
            options={availableIcons.map(icon => ({
              value: icon,
              label: icon
            }))}
            required
            // Opcional: Renderizar vista previa de ícono
            renderPrefix={() => (
              <div className="p-2 bg-muted rounded-md mr-2">
                <AppIcon name={formData.icon} size={16} className="text-primary" />
              </div>
            )}
          />

          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="form-checkbox h-4 w-4 text-primary rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-foreground">
              Misión Activa
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
            Error: {error}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {isEditing ? 'Guardar Cambios' : 'Crear Misión'}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// COMPONENTE: ConfirmationModal (Modal de Eliminación)
// ============================================================================

const ConfirmationModal = ({ mission, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        </p> 
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
          className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
);

// ============================================================================
// COMPONENTE PRINCIPAL: MissionsManagement
// ============================================================================

export default function MissionsManagement() {
  // ============================================================================
  // ESTADO
  // ============================================================================

  // Tabs
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'form', 'stats', 'reorder'

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

  // Carga y Errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // CRUD y Modales
  const [missionToEdit, setMissionToEdit] = useState(null);
  const [missionToDelete, setMissionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);


  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await missionsService.getAllMissions();
    
    setLoading(false);

    if (result.success) {
      // Ordenar por display_order por defecto
      const sortedMissions = result.missions.sort((a, b) => a.display_order - b.display_order);
      setMissions(sortedMissions);
    } else {
      setError(result.error);
      setMissions([]);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);


  // ============================================================================
  // LÓGICA DE FILTRADO
  // ============================================================================

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    let tempMissions = [...missions];

    // 1. Búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      tempMissions = tempMissions.filter(m => 
        m.title.toLowerCase().includes(searchTerm) ||
        m.description.toLowerCase().includes(searchTerm) ||
        m.mission_type.toLowerCase().includes(searchTerm) ||
        m.mission_key?.toLowerCase().includes(searchTerm) // Incluir mission_key
      );
    }

    // 2. Estado
    if (filters.is_active !== 'all') {
      const isActive = filters.is_active === 'true';
      tempMissions = tempMissions.filter(m => m.is_active === isActive);
    }

    // 3. Frecuencia
    if (filters.frequency !== 'all') {
      tempMissions = tempMissions.filter(m => m.frequency === filters.frequency);
    }

    // 4. Tipo de Misión
    if (filters.mission_type !== 'all') {
      tempMissions = tempMissions.filter(m => m.mission_type === filters.mission_type);
    }

    setFilteredMissions(tempMissions);
  }, [missions, filters]);


  // ============================================================================
  // LÓGICA CRUD
  // ============================================================================

  const handleMissionFormSuccess = (newOrUpdatedMission) => {
    setMissions(prev => {
      // Actualizar si ya existe
      const existingIndex = prev.findIndex(m => m.id === newOrUpdatedMission.id);
      if (existingIndex !== -1) {
        return prev.map((m, i) => i === existingIndex ? newOrUpdatedMission : m);
      }
      // Agregar si es nueva
      return [...prev, newOrUpdatedMission].sort((a, b) => a.display_order - b.display_order);
    });
    setMissionToEdit(null);
    setActiveTab('list');
  };

  const handleDeleteMission = async () => {
    if (!missionToDelete) return;

    setIsDeleting(true);
    const result = await missionsService.deleteMission(missionToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      setMissions(prev => prev.filter(m => m.id !== missionToDelete.id));
      setMissionToDelete(null);
    } else {
      alert(`Error al eliminar: ${result.error}`);
      setMissionToDelete(null);
    }
  };
  
  const handleToggleActive = async (mission) => {
    const newStatus = !mission.is_active;
    const result = await missionsService.toggleMissionActive(mission.id, newStatus);
    if (result.success) {
      setMissions(prev => prev.map(m => 
        m.id === mission.id ? { ...m, is_active: newStatus } : m
      ));
    } else {
      alert(`Error al cambiar estado: ${result.error}`);
    }
  };
  
  // ============================================================================
  // LÓGICA DE REORDENAMIENTO (Drag and Drop)
  // ============================================================================

  // 🛑 ELIMINADAS: onDragEnd y handleSaveReorder para evitar el error de compilación.

  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-extrabold text-foreground mb-6">
        Gestión de Misiones Diarias
      </h1>
      
      {/* Selector de Pestañas */}
      <div className="flex border-b border-border mb-6">
        <Button 
          variant={activeTab === 'list' ? 'default' : 'ghost'} 
          onClick={() => { setActiveTab('list'); setMissionToEdit(null); }}
          className="rounded-b-none"
        >
          <AppIcon name="List" size={18} className="mr-2" />
          Listado ({missions.length})
        </Button>
        <Button 
          variant={activeTab === 'form' ? 'default' : 'ghost'} 
          onClick={() => { setActiveTab('form'); setMissionToEdit(null); }}
          className="rounded-b-none"
        >
          <AppIcon name="Plus" size={18} className="mr-2" />
          Crear Misión
        </Button>
        {/* Pestaña Reordenar Deshabilitada */}
        <Button 
          variant={activeTab === 'reorder' ? 'default' : 'ghost'} 
          onClick={() => { alert('Funcionalidad de Reordenamiento Deshabilitada'); }}
          className="rounded-b-none"
        >
          <AppIcon name="Move" size={18} className="mr-2" />
          Reordenar (Desh.)
        </Button>
        {/* Estadísticas de Misiones (Opcional, se mantiene por estructura) */}
        {/* <Button variant={activeTab === 'stats' ? 'default' : 'ghost'} onClick={() => setActiveTab('stats')} className="rounded-b-none">
          <AppIcon name="BarChart2" size={18} className="mr-2" />
          Estadísticas
        </Button> */}
        <Button 
            variant="destructive" 
            onClick={missionsService.resetDailyMissions}
            className="ml-auto"
        >
            <AppIcon name="RotateCw" size={18} className="mr-2" />
            Resetear Progreso Diario (Admin)
        </Button>
      </div>

      {/* ============================================================================
      // PESTAÑA DE FORMULARIO (Crear/Editar)
      // ============================================================================ */}
      {activeTab === 'form' && (
        <MissionForm 
          initialData={missionToEdit}
          onSuccess={handleMissionFormSuccess}
          onCancel={() => {
            setMissionToEdit(null);
            setActiveTab('list');
          }}
        />
      )}
      
      {/* ============================================================================
      // PESTAÑA DE LISTADO
      // ============================================================================ */}
      {activeTab === 'list' && (
        <>
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Input 
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar por título, tipo o clave..."
              icon="Search"
            />
            <Select 
              name="is_active"
              value={filters.is_active}
              onChange={handleFilterChange}
              options={IS_ACTIVE_OPTIONS}
            />
            <Select 
              name="frequency"
              value={filters.frequency}
              onChange={handleFilterChange}
              options={FREQUENCY_OPTIONS}
            />
            <Select 
              name="mission_type"
              value={filters.mission_type}
              onChange={handleFilterChange}
              options={MISSION_TYPE_OPTIONS}
            />
          </div>

          {/* Listado */}
          <div className="bg-card rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Orden</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Misión</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo / Clave</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Meta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-sm text-muted-foreground">Cargando misiones...</td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-sm text-destructive">Error: {error}</td>
                  </tr>
                )}
                {!loading && filteredMissions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-sm text-muted-foreground">No se encontraron misiones.</td>
                  </tr>
                )}
                {filteredMissions.map((mission) => (
                  <tr key={mission.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono w-16">
                      {mission.display_order}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-accent text-primary">
                          <AppIcon name={mission.icon} size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{mission.title}</p>
                          <p className="text-xs text-muted-foreground">{mission.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        <span className="block font-medium">{mission.mission_type}</span>
                        <span className="block text-xs text-muted-foreground font-mono">{mission.mission_key}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{mission.points_reward} Puntos</span>
                        <span className="block text-xs uppercase">{mission.frequency} - {mission.target_count} Veces</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mission.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {mission.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleToggleActive(mission)}
                          title={mission.is_active ? 'Desactivar' : 'Activar'}
                        >
                          <AppIcon name={mission.is_active ? 'ToggleRight' : 'ToggleLeft'} size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setMissionToEdit(mission); setActiveTab('form'); }}
                          title="Editar"
                        >
                          <AppIcon name="Edit" size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setMissionToDelete(mission)}
                          title="Eliminar"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <AppIcon name="Trash2" size={18} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ============================================================================
      // PESTAÑA DE REORDENAMIENTO (Deshabilitada para Fix)
      // ============================================================================ */}
      {activeTab === 'reorder' && (
        <div className="space-y-4 text-center py-16">
            <AppIcon name="AlertCircle" size={40} className="text-yellow-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-foreground">Reordenamiento Deshabilitado</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
                La funcionalidad de arrastrar y soltar está temporalmente deshabilitada
                debido a una dependencia del proyecto que no se pudo resolver durante la compilación.
            </p>
            <Button onClick={() => setActiveTab('list')}>
                Volver al Listado
            </Button>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {missionToDelete && (
        <ConfirmationModal
          mission={missionToDelete}
          onConfirm={handleDeleteMission}
          onCancel={() => setMissionToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
