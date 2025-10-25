// ContentReviewModal.jsx - Modal para revisar y moderar contenido reportado
// Sprint 6: Moderación y Analytics
// Ruta: src/components/admin/ContentReviewModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  moderateContent,
  updateReportStatus,
  warnUser,
  banUser,
  MODERATION_ACTIONS,
  REPORT_STATUS,
  CONTENT_STATUS
} from '../../services/moderationService';

// ============================================================================
// CONSTANTES
// ============================================================================

const ACTION_OPTIONS = [
  { value: MODERATION_ACTIONS.APPROVE, label: 'Aprobar Contenido', icon: 'CheckCircle', color: 'success' },
  { value: MODERATION_ACTIONS.REJECT, label: 'Rechazar Contenido', icon: 'XCircle', color: 'danger' },
  { value: MODERATION_ACTIONS.FEATURE, label: 'Destacar Contenido', icon: 'Star', color: 'warning' },
  { value: MODERATION_ACTIONS.DELETE, label: 'Eliminar Contenido', icon: 'Trash2', color: 'danger' },
  { value: MODERATION_ACTIONS.WARNING, label: 'Advertir Usuario', icon: 'AlertTriangle', color: 'warning' },
  { value: MODERATION_ACTIONS.BAN_USER, label: 'Banear Usuario', icon: 'Ban', color: 'danger' }
];

const BAN_DURATION_OPTIONS = [
  { value: '1d', label: '1 día', days: 1 },
  { value: '3d', label: '3 días', days: 3 },
  { value: '7d', label: '7 días', days: 7 },
  { value: '14d', label: '14 días', days: 14 },
  { value: '30d', label: '30 días', days: 30 },
  { value: 'permanent', label: 'Permanente', days: null }
];

const REPORT_TYPE_LABELS = {
  spam: 'Spam',
  inappropriate: 'Contenido Inapropiado',
  copyright: 'Violación de Copyright',
  harassment: 'Acoso',
  misinformation: 'Desinformación',
  other: 'Otro'
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ContentReviewModal = ({ 
  isOpen, 
  onClose, 
  report = null,
  content = null,
  onActionComplete 
}) => {
  const { user } = useAuth();

  // Estados principales
  const [selectedAction, setSelectedAction] = useState('');
  const [reason, setReason] = useState('');
  const [banDuration, setBanDuration] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Estados de vista
  const [activeTab, setActiveTab] = useState('content'); // 'content', 'reports', 'uploader'
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // Datos del contenido
  const contentData = report?.reported_content || content;
  const uploaderData = contentData?.uploader || {};
  const reportData = report;

  // ============================================================================
  // EFECTOS
  // ============================================================================

  // Reset estados cuando cambia el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedAction('');
      setReason('');
      setBanDuration('7d');
      setError(null);
      setShowConfirmation(false);
      setActiveTab('content');
      setMediaLoaded(false);
    }
  }, [isOpen, report, content]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleActionChange = useCallback((action) => {
    setSelectedAction(action);
    setError(null);
    
    // Prellenar razón según la acción
    if (action === MODERATION_ACTIONS.REJECT && reportData) {
      setReason(`Contenido rechazado por: ${REPORT_TYPE_LABELS[reportData.report_type] || 'reporte'}`);
    } else if (action === MODERATION_ACTIONS.DELETE && reportData) {
      setReason(`Contenido eliminado por: ${REPORT_TYPE_LABELS[reportData.report_type] || 'reporte'}`);
    } else {
      setReason('');
    }
  }, [reportData]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAction) {
      setError('Selecciona una acción');
      return;
    }

    if (!reason.trim()) {
      setError('La razón es obligatoria');
      return;
    }

    setShowConfirmation(true);
  }, [selectedAction, reason]);

  const handleConfirmAction = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const moderatorId = user.id;
      const contentId = contentData.id;
      const userId = uploaderData.id;

      let result;

      // Ejecutar acción según la selección
      switch (selectedAction) {
        case MODERATION_ACTIONS.APPROVE:
        case MODERATION_ACTIONS.REJECT:
        case MODERATION_ACTIONS.FEATURE:
        case MODERATION_ACTIONS.DELETE:
          // Moderar contenido
          result = await moderateContent(contentId, selectedAction, moderatorId, reason);
          break;

        case MODERATION_ACTIONS.WARNING:
          // Advertir usuario
          result = await warnUser(userId, moderatorId, reason);
          
          // Si hay reporte, marcarlo como resuelto
          if (reportData) {
            await updateReportStatus(
              reportData.id, 
              REPORT_STATUS.RESOLVED, 
              moderatorId,
              'Usuario advertido'
            );
          }
          break;

        case MODERATION_ACTIONS.BAN_USER:
          // Banear usuario
          const banOption = BAN_DURATION_OPTIONS.find(opt => opt.value === banDuration);
          let until = null;
          
          if (banOption.days) {
            until = new Date();
            until.setDate(until.getDate() + banOption.days);
            until = until.toISOString();
          }

          result = await banUser(userId, moderatorId, reason, until);
          
          // Si hay reporte, marcarlo como resuelto
          if (reportData) {
            await updateReportStatus(
              reportData.id, 
              REPORT_STATUS.RESOLVED, 
              moderatorId,
              'Usuario baneado'
            );
          }
          break;

        default:
          throw new Error('Acción no válida');
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al ejecutar la acción');
      }

      // Notificar éxito
      if (onActionComplete) {
        onActionComplete(result);
      }

      // Cerrar modal
      onClose();

    } catch (err) {
      console.error('Error al ejecutar acción:', err);
      setError(err.message || 'Error al ejecutar la acción');
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  }, [
    selectedAction, 
    reason, 
    banDuration, 
    user, 
    contentData, 
    uploaderData, 
    reportData, 
    onActionComplete, 
    onClose
  ]);

  const handleCancel = useCallback(() => {
    if (loading) return;
    setShowConfirmation(false);
  }, [loading]);

  const handleClose = useCallback(() => {
    if (loading) return;
    onClose();
  }, [loading, onClose]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderContentTab = () => {
    if (!contentData) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Icon name="AlertCircle" size={24} className="mr-2" />
          <p>No hay contenido para revisar</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Preview del contenido */}
        <div className="bg-card rounded-lg overflow-hidden border border-border">
          {contentData.thumbnail_url && (
            <div className="relative aspect-video bg-muted">
              <img
                src={contentData.thumbnail_url}
                alt={contentData.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  mediaLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setMediaLoaded(true)}
              />
              {!mediaLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon name="Loader" size={32} className="animate-spin text-muted-foreground" />
                </div>
              )}
              {contentData.video_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Icon name="Play" size={48} className="text-white" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Información del contenido */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-1">
              {contentData.title || 'Sin título'}
            </h3>
            {contentData.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {contentData.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
            <div className="flex items-center text-sm">
              <Icon name="Eye" size={16} className="mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-1">Vistas:</span>
              <span className="font-medium text-foreground">
                {contentData.views_count?.toLocaleString() || 0}
              </span>
            </div>

            <div className="flex items-center text-sm">
              <Icon name="Heart" size={16} className="mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-1">Likes:</span>
              <span className="font-medium text-foreground">
                {contentData.likes_count?.toLocaleString() || 0}
              </span>
            </div>

            <div className="flex items-center text-sm">
              <Icon name="Calendar" size={16} className="mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-1">Subido:</span>
              <span className="font-medium text-foreground">
                {new Date(contentData.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center text-sm">
              <Icon name="Tag" size={16} className="mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-1">Estado:</span>
              <span className={`font-medium ${
                contentData.status === CONTENT_STATUS.APPROVED ? 'text-success' :
                contentData.status === CONTENT_STATUS.PENDING ? 'text-warning' :
                contentData.status === CONTENT_STATUS.REJECTED ? 'text-danger' :
                'text-primary'
              }`}>
                {contentData.status === CONTENT_STATUS.APPROVED ? 'Aprobado' :
                 contentData.status === CONTENT_STATUS.PENDING ? 'Pendiente' :
                 contentData.status === CONTENT_STATUS.REJECTED ? 'Rechazado' :
                 contentData.status === CONTENT_STATUS.FEATURED ? 'Destacado' :
                 contentData.status}
              </span>
            </div>
          </div>
        </div>

        {/* Enlace al contenido */}
        {contentData.video_url && (
          <div className="pt-3 border-t border-border">
            <a
              href={contentData.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Icon name="ExternalLink" size={16} className="mr-2" />
              Ver contenido completo
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderReportsTab = () => {
    if (!reportData) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Icon name="AlertCircle" size={24} className="mr-2" />
          <p>No hay reportes asociados</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Información del reporte */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  reportData.report_type === 'spam' ? 'bg-warning/10 text-warning' :
                  reportData.report_type === 'inappropriate' ? 'bg-danger/10 text-danger' :
                  reportData.report_type === 'copyright' ? 'bg-primary/10 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {REPORT_TYPE_LABELS[reportData.report_type] || reportData.report_type}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  reportData.status === REPORT_STATUS.PENDING ? 'bg-warning/10 text-warning' :
                  reportData.status === REPORT_STATUS.RESOLVED ? 'bg-success/10 text-success' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {reportData.status === REPORT_STATUS.PENDING ? 'Pendiente' :
                   reportData.status === REPORT_STATUS.RESOLVED ? 'Resuelto' :
                   reportData.status === REPORT_STATUS.REVIEWED ? 'Revisado' :
                   reportData.status}
                </span>
              </div>
              <p className="text-sm text-foreground">
                {reportData.description || 'Sin descripción adicional'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex items-center text-sm text-muted-foreground">
              <Icon name="Calendar" size={14} className="mr-2" />
              Reportado el {new Date(reportData.created_at).toLocaleString()}
            </div>
          </div>

          {/* Información del reportero */}
          {reportData.reporter && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Reportado por:</p>
              <div className="flex items-center gap-3">
                {reportData.reporter.avatar_url ? (
                  <img
                    src={reportData.reporter.avatar_url}
                    alt={reportData.reporter.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Icon name="User" size={16} className="text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {reportData.reporter.username}
                  </p>
                  {reportData.reporter.full_name && (
                    <p className="text-xs text-muted-foreground">
                      {reportData.reporter.full_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderUploaderTab = () => {
    if (!uploaderData.id) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Icon name="AlertCircle" size={24} className="mr-2" />
          <p>No hay información del usuario</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Perfil del usuario */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-start gap-4 mb-4">
            {uploaderData.avatar_url ? (
              <img
                src={uploaderData.avatar_url}
                alt={uploaderData.username}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Icon name="User" size={32} className="text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-semibold text-foreground text-lg">
                {uploaderData.username}
              </h4>
              {uploaderData.full_name && (
                <p className="text-sm text-muted-foreground mb-2">
                  {uploaderData.full_name}
                </p>
              )}
              {uploaderData.email && (
                <p className="text-sm text-muted-foreground">
                  {uploaderData.email}
                </p>
              )}
            </div>
          </div>

          {/* Estadísticas del usuario */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {uploaderData.videos_count || 0}
              </p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {uploaderData.followers_count || 0}
              </p>
              <p className="text-xs text-muted-foreground">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {uploaderData.total_views || 0}
              </p>
              <p className="text-xs text-muted-foreground">Vistas</p>
            </div>
          </div>

          {/* Información adicional */}
          <div className="space-y-2 pt-4 border-t border-border mt-4">
            <div className="flex items-center text-sm">
              <Icon name="Calendar" size={14} className="mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-1">Miembro desde:</span>
              <span className="font-medium text-foreground">
                {new Date(uploaderData.created_at).toLocaleDateString()}
              </span>
            </div>
            
            {uploaderData.is_banned && (
              <div className="flex items-center text-sm text-danger">
                <Icon name="Ban" size={14} className="mr-2" />
                <span className="font-medium">Usuario baneado</span>
              </div>
            )}

            {uploaderData.role && (
              <div className="flex items-center text-sm">
                <Icon name="Shield" size={14} className="mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">Rol:</span>
                <span className="font-medium text-foreground capitalize">
                  {uploaderData.role}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderActionForm = () => {
    return (
      <div className="space-y-4">
        {/* Selector de acción */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Acción de Moderación *
          </label>
          <Select
            value={selectedAction}
            onChange={(e) => handleActionChange(e.target.value)}
            disabled={loading}
            className="w-full"
          >
            <option value="">Selecciona una acción...</option>
            {ACTION_OPTIONS.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Duración del ban (solo si es ban) */}
        {selectedAction === MODERATION_ACTIONS.BAN_USER && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Duración del Ban
            </label>
            <Select
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value)}
              disabled={loading}
              className="w-full"
            >
              {BAN_DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Razón */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Razón de la Decisión *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica la razón de esta acción..."
            disabled={loading}
            rows={4}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg">
            <Icon name="AlertCircle" size={18} className="text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Descripción de la acción seleccionada */}
        {selectedAction && (
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-2">
              <Icon 
                name={ACTION_OPTIONS.find(a => a.value === selectedAction)?.icon || 'Info'} 
                size={18} 
                className="text-muted-foreground flex-shrink-0 mt-0.5" 
              />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">
                  {ACTION_OPTIONS.find(a => a.value === selectedAction)?.label}
                </p>
                <p className="text-muted-foreground">
                  {selectedAction === MODERATION_ACTIONS.APPROVE && 
                    'El contenido será visible públicamente y se marcará como aprobado.'}
                  {selectedAction === MODERATION_ACTIONS.REJECT && 
                    'El contenido será rechazado y no será visible públicamente.'}
                  {selectedAction === MODERATION_ACTIONS.FEATURE && 
                    'El contenido será destacado y tendrá mayor visibilidad.'}
                  {selectedAction === MODERATION_ACTIONS.DELETE && 
                    'El contenido será eliminado permanentemente de la plataforma.'}
                  {selectedAction === MODERATION_ACTIONS.WARNING && 
                    'Se enviará una advertencia al usuario. Acumular advertencias puede resultar en suspensión.'}
                  {selectedAction === MODERATION_ACTIONS.BAN_USER && 
                    `El usuario será ${banDuration === 'permanent' ? 'baneado permanentemente' : 'suspendido temporalmente'} y no podrá acceder a la plataforma.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderConfirmationDialog = () => {
    if (!showConfirmation) return null;

    const action = ACTION_OPTIONS.find(a => a.value === selectedAction);

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 border border-border">
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 rounded-full ${
              action?.color === 'danger' ? 'bg-danger/10' :
              action?.color === 'warning' ? 'bg-warning/10' :
              action?.color === 'success' ? 'bg-success/10' :
              'bg-primary/10'
            }`}>
              <Icon 
                name={action?.icon || 'AlertCircle'} 
                size={24} 
                className={
                  action?.color === 'danger' ? 'text-danger' :
                  action?.color === 'warning' ? 'text-warning' :
                  action?.color === 'success' ? 'text-success' :
                  'text-primary'
                }
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Confirmar Acción
              </h3>
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que deseas {action?.label.toLowerCase()}?
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 mb-6 border border-border">
            <p className="text-sm text-muted-foreground mb-1">Razón:</p>
            <p className="text-sm text-foreground">{reason}</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={loading}
              className={`flex-1 ${
                action?.color === 'danger' ? 'bg-danger hover:bg-danger/90' :
                action?.color === 'warning' ? 'bg-warning hover:bg-warning/90' :
                'bg-primary hover:bg-primary/90'
              }`}
            >
              {loading ? (
                <>
                  <Icon name="Loader" size={16} className="animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Revisión de Contenido
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Revisa el contenido y toma una decisión de moderación
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            >
              <Icon name="X" size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-6">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'content'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Contenido
              {activeTab === 'content' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            {reportData && (
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'reports'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Reportes
                {activeTab === 'reports' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab('uploader')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'uploader'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Usuario
              {activeTab === 'uploader' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna izquierda - Información */}
              <div>
                {activeTab === 'content' && renderContentTab()}
                {activeTab === 'reports' && renderReportsTab()}
                {activeTab === 'uploader' && renderUploaderTab()}
              </div>

              {/* Columna derecha - Acciones */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Decisión de Moderación
                </h3>
                {renderActionForm()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <Button
              onClick={handleClose}
              disabled={loading}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedAction || !reason.trim()}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Icon name="Loader" size={16} className="animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                'Aplicar Acción'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {renderConfirmationDialog()}
    </>
  );
};

export default ContentReviewModal;
