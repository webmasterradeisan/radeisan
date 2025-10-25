// ContentModeration.jsx - Página principal de moderación de contenido
// Sprint 6: Moderación y Analytics
// Ruta: src/pages/admin-moderation/ContentModeration.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ContentReviewModal from '../../components/admin/ContentReviewModal';
import {
  getContentReports,
  getPendingContent,
  getModerationStats,
  getRecentModerationActivity,
  getMostReportedContent,
  bulkModerateContent,
  REPORT_STATUS,
  REPORT_TYPES,
  MODERATION_ACTIONS,
  CONTENT_STATUS
} from '../../services/moderationService';

// ============================================================================
// CONSTANTES
// ============================================================================

const TABS = {
  REPORTS: 'reports',
  PENDING: 'pending',
  ACTIVITY: 'activity'
};

const REPORT_TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: REPORT_TYPES.SPAM, label: 'Spam' },
  { value: REPORT_TYPES.INAPPROPRIATE, label: 'Contenido Inapropiado' },
  { value: REPORT_TYPES.COPYRIGHT, label: 'Violación de Copyright' },
  { value: REPORT_TYPES.HARASSMENT, label: 'Acoso' },
  { value: REPORT_TYPES.MISINFORMATION, label: 'Desinformación' },
  { value: REPORT_TYPES.OTHER, label: 'Otro' }
];

const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: REPORT_STATUS.PENDING, label: 'Pendientes' },
  { value: REPORT_STATUS.REVIEWED, label: 'Revisados' },
  { value: REPORT_STATUS.RESOLVED, label: 'Resueltos' },
  { value: REPORT_STATUS.DISMISSED, label: 'Descartados' }
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Más recientes' },
  { value: 'report_count', label: 'Más reportados' },
  { value: 'priority', label: 'Prioridad' }
];

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const StatsCard = ({ icon, label, value, color = 'primary', loading = false }) => (
  <div className="bg-card rounded-lg p-4 border border-border">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
      </div>
      <div className={`p-3 rounded-full bg-${color}/10`}>
        <Icon name={icon} size={24} className={`text-${color}`} />
      </div>
    </div>
  </div>
);

const ReportCard = ({ report, onClick }) => {
  const content = report.reported_content;
  const reporter = report.reporter;

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-all cursor-pointer group"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        {content?.thumbnail_url && (
          <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="Eye" size={20} className="text-white" />
            </div>
          </div>
        )}

        {/* Información */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-foreground truncate flex-1">
              {content?.title || 'Sin título'}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                report.report_type === REPORT_TYPES.SPAM ? 'bg-warning/10 text-warning' :
                report.report_type === REPORT_TYPES.INAPPROPRIATE ? 'bg-danger/10 text-danger' :
                report.report_type === REPORT_TYPES.COPYRIGHT ? 'bg-primary/10 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {report.report_type}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                report.status === REPORT_STATUS.PENDING ? 'bg-warning/10 text-warning' :
                report.status === REPORT_STATUS.RESOLVED ? 'bg-success/10 text-success' :
                'bg-muted text-muted-foreground'
              }`}>
                {report.status}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {report.description || 'Sin descripción adicional'}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {reporter && (
                <div className="flex items-center gap-2">
                  <Icon name="User" size={14} />
                  <span>{reporter.username}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Icon name="Calendar" size={14} />
                <span>{new Date(report.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

const PendingContentCard = ({ content, onClick }) => {
  const uploader = content.uploader;
  const category = content.category;

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-all cursor-pointer group"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        {content.thumbnail_url && (
          <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="Eye" size={20} className="text-white" />
            </div>
          </div>
        )}

        {/* Información */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-foreground truncate flex-1">
              {content.title}
            </h4>
            {category && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary flex-shrink-0">
                {category.name}
              </span>
            )}
          </div>

          {content.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {content.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {uploader && (
                <div className="flex items-center gap-2">
                  <Icon name="User" size={14} />
                  <span>{uploader.username}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Icon name="Calendar" size={14} />
                <span>{new Date(content.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Eye" size={14} />
                <span>{content.views_count || 0}</span>
              </div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  const getActionIcon = (action) => {
    switch (action) {
      case MODERATION_ACTIONS.APPROVE: return 'CheckCircle';
      case MODERATION_ACTIONS.REJECT: return 'XCircle';
      case MODERATION_ACTIONS.FEATURE: return 'Star';
      case MODERATION_ACTIONS.DELETE: return 'Trash2';
      case MODERATION_ACTIONS.WARNING: return 'AlertTriangle';
      case MODERATION_ACTIONS.BAN_USER: return 'Ban';
      default: return 'Activity';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case MODERATION_ACTIONS.APPROVE: return 'text-success';
      case MODERATION_ACTIONS.REJECT: return 'text-danger';
      case MODERATION_ACTIONS.FEATURE: return 'text-warning';
      case MODERATION_ACTIONS.DELETE: return 'text-danger';
      case MODERATION_ACTIONS.WARNING: return 'text-warning';
      case MODERATION_ACTIONS.BAN_USER: return 'text-danger';
      default: return 'text-muted-foreground';
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case MODERATION_ACTIONS.APPROVE: return 'aprobó';
      case MODERATION_ACTIONS.REJECT: return 'rechazó';
      case MODERATION_ACTIONS.FEATURE: return 'destacó';
      case MODERATION_ACTIONS.DELETE: return 'eliminó';
      case MODERATION_ACTIONS.WARNING: return 'advirtió';
      case MODERATION_ACTIONS.BAN_USER: return 'baneó';
      default: return 'moderó';
    }
  };

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={`p-2 rounded-full bg-muted flex-shrink-0 h-fit`}>
        <Icon name={getActionIcon(activity.action)} size={16} className={getActionColor(activity.action)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-medium">{activity.moderator?.username || 'Moderador'}</span>
          {' '}{getActionLabel(activity.action)}{' '}
          {activity.content ? (
            <span className="font-medium">{activity.content.title}</span>
          ) : activity.user_id ? (
            <span className="font-medium">un usuario</span>
          ) : (
            <span className="font-medium">contenido</span>
          )}
        </p>
        {activity.reason && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            Razón: {activity.reason}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ContentModeration = () => {
  const { user } = useAuth();

  // Estados principales
  const [activeTab, setActiveTab] = useState(TABS.REPORTS);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Estados de datos
  const [reports, setReports] = useState([]);
  const [pendingContent, setPendingContent] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [mostReported, setMostReported] = useState([]);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de filtros
  const [filters, setFilters] = useState({
    reportType: '',
    reportStatus: '',
    searchQuery: '',
    sortBy: 'created_at',
    page: 1,
    limit: 20
  });

  // Estados de paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Estados de selección múltiple
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  // ============================================================================
  // EFECTOS
  // ============================================================================

  // Cargar datos iniciales
  useEffect(() => {
    loadAllData();
  }, []);

  // Recargar cuando cambien filtros
  useEffect(() => {
    if (activeTab === TABS.REPORTS) {
      loadReports();
    } else if (activeTab === TABS.PENDING) {
      loadPendingContent();
    }
  }, [filters, activeTab]);

  // ============================================================================
  // FUNCIONES DE CARGA DE DATOS
  // ============================================================================

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadReports(),
        loadPendingContent(),
        loadRecentActivity(),
        loadStats(),
        loadMostReported()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const result = await getContentReports({
        status: filters.reportStatus || null,
        type: filters.reportType || null,
        sortBy: filters.sortBy,
        page: filters.page,
        limit: filters.limit
      });

      if (result.success) {
        setReports(result.data);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  }, [filters]);

  const loadPendingContent = useCallback(async () => {
    try {
      const result = await getPendingContent({
        sortBy: filters.sortBy,
        page: filters.page,
        limit: filters.limit
      });

      if (result.success) {
        setPendingContent(result.data);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Error loading pending content:', err);
    }
  }, [filters]);

  const loadRecentActivity = useCallback(async () => {
    try {
      const result = await getRecentModerationActivity(20);
      if (result.success) {
        setRecentActivity(result.data);
      }
    } catch (err) {
      console.error('Error loading activity:', err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const result = await getModerationStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  const loadMostReported = useCallback(async () => {
    try {
      const result = await getMostReportedContent(5);
      if (result.success) {
        setMostReported(result.data);
      }
    } catch (err) {
      console.error('Error loading most reported:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleItemClick = useCallback((item, type) => {
    setSelectedItem({ ...item, type });
    setShowReviewModal(true);
  }, []);

  const handleActionComplete = useCallback(async (result) => {
    // Recargar datos después de completar una acción
    await refresh();
  }, [refresh]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset a página 1 cuando cambian filtros
    }));
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedItems([]);
    setFilters(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleSelectItem = useCallback((itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      }
      return [...prev, itemId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const currentData = activeTab === TABS.REPORTS ? reports : pendingContent;
    if (selectedItems.length === currentData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentData.map(item => item.id));
    }
  }, [activeTab, reports, pendingContent, selectedItems]);

  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedItems.length === 0) return;

    try {
      setLoading(true);
      const result = await bulkModerateContent(
        selectedItems,
        bulkAction,
        user.id,
        'Acción en lote desde panel de moderación'
      );

      if (result.success) {
        setSelectedItems([]);
        setBulkAction('');
        await refresh();
      }
    } catch (err) {
      console.error('Error in bulk action:', err);
      setError('Error al ejecutar la acción en lote');
    } finally {
      setLoading(false);
    }
  }, [bulkAction, selectedItems, user, refresh]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredReports = useMemo(() => {
    let filtered = reports;

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        report.reported_content?.title?.toLowerCase().includes(query) ||
        report.description?.toLowerCase().includes(query) ||
        report.reporter?.username?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reports, filters.searchQuery]);

  const filteredPendingContent = useMemo(() => {
    let filtered = pendingContent;

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(content =>
        content.title?.toLowerCase().includes(query) ||
        content.description?.toLowerCase().includes(query) ||
        content.uploader?.username?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [pendingContent, filters.searchQuery]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        icon="AlertCircle"
        label="Reportes Pendientes"
        value={stats?.reports?.pending || 0}
        color="warning"
        loading={loading}
      />
      <StatsCard
        icon="FileText"
        label="Contenido Pendiente"
        value={stats?.content?.pendingModeration || 0}
        color="primary"
        loading={loading}
      />
      <StatsCard
        icon="CheckCircle"
        label="Resueltos Hoy"
        value={stats?.reports?.resolved || 0}
        color="success"
        loading={loading}
      />
      <StatsCard
        icon="Activity"
        label="Acciones Totales"
        value={stats?.actions?.total || 0}
        color="primary"
        loading={loading}
      />
    </div>
  );

  const renderFilters = () => (
    <div className="bg-card rounded-lg p-4 border border-border mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Búsqueda */}
        <div className="md:col-span-2">
          <Input
            type="text"
            placeholder="Buscar por título, descripción o usuario..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            leftIcon="Search"
          />
        </div>

        {/* Tipo de reporte (solo en tab de reportes) */}
        {activeTab === TABS.REPORTS && (
          <Select
            value={filters.reportType}
            onChange={(e) => handleFilterChange('reportType', e.target.value)}
          >
            {REPORT_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}

        {/* Estado (solo en tab de reportes) */}
        {activeTab === TABS.REPORTS && (
          <Select
            value={filters.reportStatus}
            onChange={(e) => handleFilterChange('reportStatus', e.target.value)}
          >
            {REPORT_STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}

        {/* Ordenamiento */}
        <Select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );

  const renderBulkActions = () => {
    if (selectedItems.length === 0) return null;

    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-foreground">
              {selectedItems.length} elemento{selectedItems.length !== 1 ? 's' : ''} seleccionado{selectedItems.length !== 1 ? 's' : ''}
            </p>
            <Select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="min-w-[200px]"
            >
              <option value="">Selecciona una acción...</option>
              <option value={MODERATION_ACTIONS.APPROVE}>Aprobar Todo</option>
              <option value={MODERATION_ACTIONS.REJECT}>Rechazar Todo</option>
              <option value={MODERATION_ACTIONS.DELETE}>Eliminar Todo</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBulkAction}
              disabled={!bulkAction || loading}
              size="sm"
            >
              {loading ? 'Procesando...' : 'Aplicar'}
            </Button>
            <Button
              onClick={() => setSelectedItems([])}
              variant="outline"
              size="sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderReportsList = () => {
    if (loading && reports.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader" size={32} className="animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredReports.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Icon name="CheckCircle" size={32} className="text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No hay reportes pendientes
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {filters.searchQuery ? 'No se encontraron reportes con esos criterios' : 'Todos los reportes han sido revisados'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredReports.map(report => (
          <ReportCard
            key={report.id}
            report={report}
            onClick={() => handleItemClick(report, 'report')}
          />
        ))}
      </div>
    );
  };

  const renderPendingList = () => {
    if (loading && pendingContent.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader" size={32} className="animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredPendingContent.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Icon name="CheckCircle" size={32} className="text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No hay contenido pendiente
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {filters.searchQuery ? 'No se encontró contenido con esos criterios' : 'Todo el contenido ha sido revisado'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredPendingContent.map(content => (
          <PendingContentCard
            key={content.id}
            content={content}
            onClick={() => handleItemClick(content, 'content')}
          />
        ))}
      </div>
    );
  };

  const renderActivityList = () => {
    if (loading && recentActivity.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader" size={32} className="animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (recentActivity.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Icon name="Activity" size={32} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No hay actividad reciente
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Las acciones de moderación aparecerán aquí
          </p>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-lg border border-border divide-y divide-border">
        {recentActivity.map(activity => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            variant="outline"
            size="sm"
          >
            <Icon name="ChevronLeft" size={16} />
          </Button>
          <span className="text-sm text-foreground px-3">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            variant="outline"
            size="sm"
          >
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Moderación de Contenido
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestiona reportes y contenido pendiente de aprobación
              </p>
            </div>
            <Button
              onClick={refresh}
              disabled={refreshing}
              variant="outline"
            >
              {refreshing ? (
                <>
                  <Icon name="Loader" size={16} className="animate-spin mr-2" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Icon name="RefreshCw" size={16} className="mr-2" />
                  Actualizar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        {renderStats()}

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <Icon name="AlertCircle" size={18} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-danger">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-danger hover:text-danger/80"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-border">
          <button
            onClick={() => handleTabChange(TABS.REPORTS)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === TABS.REPORTS
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Reportes
            {stats?.reports?.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning">
                {stats.reports.pending}
              </span>
            )}
            {activeTab === TABS.REPORTS && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => handleTabChange(TABS.PENDING)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === TABS.PENDING
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Contenido Pendiente
            {stats?.content?.pendingModeration > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                {stats.content.pendingModeration}
              </span>
            )}
            {activeTab === TABS.PENDING && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => handleTabChange(TABS.ACTIVITY)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === TABS.ACTIVITY
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Actividad Reciente
            {activeTab === TABS.ACTIVITY && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Filters */}
        {activeTab !== TABS.ACTIVITY && renderFilters()}

        {/* Bulk Actions */}
        {activeTab !== TABS.ACTIVITY && renderBulkActions()}

        {/* Content by Tab */}
        {activeTab === TABS.REPORTS && renderReportsList()}
        {activeTab === TABS.PENDING && renderPendingList()}
        {activeTab === TABS.ACTIVITY && renderActivityList()}

        {/* Pagination */}
        {activeTab !== TABS.ACTIVITY && renderPagination()}
      </div>

      {/* Review Modal */}
      <ContentReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedItem(null);
        }}
        report={selectedItem?.type === 'report' ? selectedItem : null}
        content={selectedItem?.type === 'content' ? selectedItem : null}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
};

export default ContentModeration;
