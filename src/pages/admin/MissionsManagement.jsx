// ============================================================================
// MISSIONS MANAGEMENT - Panel de Administración de Misiones Diarias
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import * as missionsService from '../../services/missionsService';
import AppIcon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select'; 
// NOTA: Los problemas de interacción se han solucionado reemplazando los componentes Select por <select> nativos en MissionForm.

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN (ESPAÑOL)
// ============================================================================

// Opciones de tipo de misión para Select (filtros y formulario)
const MISSION_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los Tipos' },
  { value: missionsService.MISSION_TYPES.WATCH_VIDEO, label: 'Ver videos' },
  { value: missionsService.MISSION_TYPES.UPLOAD_VIDEO, label: 'Subir video' },
  { value: missionsService.MISSION_TYPES.UPLOAD_REEL, label: 'Subir reel' }, 
  { value: missionsService.MISSION_TYPES.UPLOAD_PHOTO, label: 'Subir foto' }, 
  { value: missionsService.MISSION_TYPES.GIVE_LIKE, label: 'Dar likes' },
  { value: missionsService.MISSION_TYPES.SHARE_CONTENT, label: 'Compartir contenido' },
  { value: missionsService.MISSION_TYPES.COMMENT, label: 'Comentar' },
  { value: missionsService.MISSION_TYPES.FOLLOW_USER, label: 'Seguir usuarios' },
  { value: missionsService.MISSION_TYPES.COMPLETE_PROFILE, label: 'Completar perfil' },
  { value: missionsService.MISSION_TYPES.LOGIN_DAILY, label: 'Inicio de sesión diario' },
  { value: missionsService.MISSION_TYPES.WATCH_REELS, label: 'Ver reels' },
  { value: missionsService.MISSION_TYPES.INVITE_FRIEND, label: 'Invitar amigo' },
  { value: missionsService.MISSION_TYPES.DONAR_PUNTOS, label: 'Donar puntos' }, 
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

const SHOW_IN_PROGRESS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
];

// ============================================================================
// COMPONENTE: MissionForm (Formulario de Creación/Edición)
// ============================================================================

const MissionForm = ({ 
  initialData = null, 
  onSuccess, 
  onCancel 
}) => {
  // Uso 'id' para diferenciar edición de creación. Si se está prellenando para crear, no hay id.
  const isEditing = !!initialData && !!initialData.id; 

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    mission_type: String(initialData?.mission_type || missionsService.MISSION_TYPES.WATCH_VIDEO),
    mission_key: String(initialData?.mission_key || ''),
    target_count: initialData?.target_count || 1,
    points_reward: initialData?.points_reward || 0,
    frequency: initialData?.frequency || missionsService.MISSION_FREQUENCY.DAILY,
    icon: String(initialData?.icon || 'Star'), 
    is_active: initialData?.is_active ?? true,
    show_in_progress_panel: initialData?.show_in_progress_panel ?? true, 
    display_order: initialData?.display_order || 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const availableIcons = missionsService.getAvailableMissionIcons();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => {
      let newState = { ...prev, [name]: newValue };
      
      // Autollenar mission_key al cambiar mission_type
      if (name === 'mission_type') {
        newState.mission_key = newValue; 
      }
      
      return newState;
    });
  };
  
  // Asegura el prellenado de mission_key en la carga inicial
  useEffect(() => {
    if (!isEditing && formData.mission_key === '' && formData.mission_type) {
        setFormData(prev => ({
            ...prev,
            mission_key: prev.mission_type
        }));
    }
  }, [isEditing, formData.mission_type, formData.mission_key]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const dataToSubmit = {
      ...formData,
      target_count: Number(formData.target_count),
      points_reward: Number(formData.points_reward),
    };

    let result;
    if (isEditing) {
      // ✅ Esta llamada actualiza la misión, sincronizando el estado con el panel de progreso
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
          {/* Reemplazo de Select por <select> nativo para Tipo de Misión */}
          <div className="flex flex-col space-y-1">
            <label htmlFor="mission_type" className="text-sm font-medium text-foreground">
              Tipo de Misión <span className="text-destructive">*</span>
            </label>
            <select
              id="mission_type"
              name="mission_type"
              value={formData.mission_type}
              onChange={handleChange}
              required
              className="px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition duration-150 ease-in-out"
            >
              {MISSION_TYPE_OPTIONS.filter(opt => opt.value !== 'all').map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          <Input 
            label="Clave de Misión (mission_key)" 
            name="mission_key" 
            value={formData.mission_key} 
            onChange={handleChange} 
            placeholder="Ej: ver_videos_diario_unico"
            required 
            helpText="Clave única para la lógica de la base de datos (se autollena al elegir el tipo)."
          />
        </div>

        {/* Fila 3: Objetivo, Recompensa, Frecuencia */}
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
          {/* Mantenemos el componente Select original para Frecuencia, es un campo simple */}
          <Select
            label="Frecuencia"
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            options={FREQUENCY_OPTIONS.filter(opt => opt.value !== 'all')} 
            required
          />
        </div>

        {/* Fila 4: Ícono y Estado Activo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ✅ CORRECCIÓN FINAL: Reemplazo de Select por <select> nativo para Ícono de Misión */}
          <div className="flex flex-col space-y-1">
            <label htmlFor="icon" className="text-sm font-medium text-foreground">
              Ícono de Misión <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center border border-border rounded-lg bg-input focus-within:ring-2 focus-within:ring-primary">
              <div className="p-2 bg-muted rounded-l-lg mr-2">
                {/* Muestra el ícono seleccionado */}
                <AppIcon name={formData.icon} size={16} className="text-primary" />
              </div>
              <select
                id="icon"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                required
                className="flex-grow py-2 bg-input text-foreground outline-none appearance-none" 
              >
                {availableIcons.map(icon => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
          </div>


          <div className="flex flex-col justify-center"> {/* Contenedor para alinear checkboxes */}
            <div className="flex items-center space-x-2 mb-2">
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
            {/* ✅ Sincronización de visibilidad: Campo clave */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show_in_progress_panel"
                name="show_in_progress_panel"
                checked={formData.show_in_progress_panel}
                onChange={handleChange}
                className="form-checkbox h-4 w-4 text-primary rounded"
              />
              <label htmlFor="show_in_progress_panel" className="text-sm font-medium text-foreground">
                Mostrar en Panel de Progreso
              </label>
              {/* Este campo se guarda y es leído por el componente de Progreso */}
            </div>
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

const ConfirmationModal = ({ mission, onConfirm, onCancel, isDeleting }) => (
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
          usuarios en esta misión se perderá permanentemente.
        </p> 
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
        >
          {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
        </button>
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
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

  const [activeTab, setActiveTab] = useState('list'); 
  const [missions, setMissions] = useState([]);
  const [filteredMissions, setFilteredMissions] = useState([]); 

  const [filters, setFilters] = useState({
    search: '',
    is_active: 'all', 
    frequency: 'all', 
    mission_type: 'all',
    show_in_progress_panel: 'all', 
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [missionToEdit, setMissionToEdit] = useState(null);
  const [missionToDelete, setMissionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false); 


  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await missionsService.getAllMissions();
    
    setLoading(false);

    if (result.success) {
      const sortedMissions = result.missions.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
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
  // LÓGICA DE FILTRADO Y CRUD (Misiones)
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

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      tempMissions = tempMissions.filter(m => 
        m.title.toLowerCase().includes(searchTerm) ||
        (m.description && m.description.toLowerCase().includes(searchTerm)) ||
        m.mission_type.toLowerCase().includes(searchTerm) ||
        (m.mission_key && m.mission_key.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.is_active !== 'all') {
      const isActive = filters.is_active === 'true';
      tempMissions = tempMissions.filter(m => m.is_active === isActive);
    }

    if (filters.frequency !== 'all') {
      tempMissions = tempMissions.filter(m => m.frequency === filters.frequency);
    }

    if (filters.mission_type !== 'all') {
      tempMissions = tempMissions.filter(m => m.mission_type === filters.mission_type);
    }

    if (filters.show_in_progress_panel !== 'all') {
      const showInPanel = filters.show_in_progress_panel === 'true';
      tempMissions = tempMissions.filter(m => m.show_in_progress_panel === showInPanel);
    }

    setFilteredMissions(tempMissions);
  }, [missions, filters]);


  const handleMissionFormSuccess = (newOrUpdatedMission) => {
    setMissions(prev => {
      const existingIndex = prev.findIndex(m => m.id === newOrUpdatedMission.id);
      if (existingIndex !== -1) {
        return prev.map((m, i) => i === existingIndex ? newOrUpdatedMission : m);
      }
      return [...prev, newOrUpdatedMission].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
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
    const result = await missionsService.updateMission(mission.id, { is_active: newStatus });
    if (result.success) {
      setMissions(prev => prev.map(m => 
        m.id === mission.id ? { ...m, is_active: newStatus } : m
      ));
    } else {
      alert(`Error al cambiar estado: ${result.error}`);
    }
  };

  // ✅ CORRECCIÓN DE SINCRONÍA: Asegura que el estado local se actualice correctamente.
  const handleToggleShowInPanel = async (mission) => {
    const newStatus = !mission.show_in_progress_panel;
    
    // Optimistic UI update (opcional, pero mejora la experiencia)
    setMissions(prev => prev.map(m =>
        m.id === mission.id ? { ...m, show_in_progress_panel: newStatus } : m
    ));

    const result = await missionsService.updateMission(mission.id, { show_in_progress_panel: newStatus });
    
    if (!result.success) {
      alert(`Error al cambiar visibilidad en panel: ${result.error}`);
      // Revertir el estado local si el backend falla
      setMissions(prev => prev.map(m =>
          m.id === mission.id ? { ...m, show_in_progress_panel: !newStatus } : m
      ));
    }
    // Si es exitoso, el optimistic update ya lo reflejó, no necesitamos hacer nada más.
  };
  
  
  const handleCreateNewMission = () => {
    const missionTypeUploadReel = missionsService.MISSION_TYPES.UPLOAD_REEL;
    
    const prefilledReelMission = {
        title: "Subir un Reel",
        description: "Sube un video corto (reel) a tu perfil para ganar puntos.",
        mission_type: missionTypeUploadReel,
        mission_key: missionTypeUploadReel,
        target_count: 1,
        points_reward: 75,
        frequency: missionsService.MISSION_FREQUENCY.DAILY,
        icon: 'Video',
        is_active: true,
        show_in_progress_panel: true,
        display_order: 10,
    };

    setMissionToEdit(prefilledReelMission);
    setActiveTab('form');
  }


  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-extrabold text-foreground mb-6">
        Gestión de Misiones
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
          onClick={handleCreateNewMission}
          className="rounded-b-none"
        >
          <AppIcon name="Plus" size={18} className="mr-2" />
          Crear Misión (Subir Reel Demo)
        </Button>
        
        <Button 
            variant="destructive" 
            onClick={missionsService.resetDailyMissions}
            className="ml-auto"
        >
            <AppIcon name="RotateCw" size={18} className="mr-2" />
            Reiniciar Progreso Diario (Admin)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
            <Input 
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar por título, tipo o clave..."
              icon="Search"
            />
            <Select 
              label="Estado"
              name="is_active"
              value={filters.is_active}
              onChange={handleFilterChange}
              options={IS_ACTIVE_OPTIONS}
            />
            <Select 
              label="Frecuencia"
              name="frequency"
              value={filters.frequency}
              onChange={handleFilterChange}
              options={FREQUENCY_OPTIONS}
            />
            <Select 
              label="Tipo de Misión"
              name="mission_type"
              value={filters.mission_type}
              onChange={handleFilterChange}
              options={MISSION_TYPE_OPTIONS}
            />
            {/* FILTRO: Mostrar en Panel de Progreso */}
            <Select 
              label="Mostrar en Progreso"
              name="show_in_progress_panel"
              value={filters.show_in_progress_panel}
              onChange={handleFilterChange}
              options={SHOW_IN_PROGRESS_OPTIONS}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Progreso</th> 
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
                    <td colSpan="6" className="text-center py-4 text-sm text-muted-foreground">No se encontraron misiones con los filtros aplicados.</td>
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
                        <span className="block font-medium">{MISSION_TYPE_OPTIONS.find(o => o.value === mission.mission_type)?.label || mission.mission_type}</span>
                        <span className="block text-xs text-muted-foreground font-mono">{mission.mission_key}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{mission.points_reward} Puntos</span>
                        <span className="block text-xs uppercase">{FREQUENCY_OPTIONS.find(o => o.value === mission.frequency)?.label || mission.frequency} - {mission.target_count} Veces</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start space-y-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mission.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {mission.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                        {/* Insignia: Mostrar en Panel de Progreso (Sincronizado) */}
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mission.show_in_progress_panel ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                          {mission.show_in_progress_panel ? 'Visible en Progreso' : 'Oculta en Progreso'}
                        </span>
                      </div>
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
                        {/* Botón de Sincronización (Ojo) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleShowInPanel(mission)}
                          title={mission.show_in_progress_panel ? 'Ocultar del panel de progreso' : 'Mostrar en el panel de progreso'}
                        >
                          {/* El ícono que se muestra aquí es el que alterna (Oculto o Visible) */}
                          <AppIcon name={mission.show_in_progress_panel ? 'EyeOff' : 'Eye'} size={18} />
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
