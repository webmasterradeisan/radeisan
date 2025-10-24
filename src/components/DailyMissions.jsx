// ============================================================================
// DAILY MISSIONS COMPONENT - Componente de Misiones Diarias
// ============================================================================
// Componente UI completo para mostrar y gestionar las misiones diarias
// Incluye: visualización de misiones, progreso, rachas, y recompensas
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useDailyMissions } from '../hooks/useDailyMissions';
import AppIcon from './AppIcon';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente de Misiones Diarias
 * @param {Object} props - Props del componente
 * @param {boolean} props.compact - Modo compacto (para sidebars)
 * @param {boolean} props.showStreak - Mostrar info de racha
 * @param {boolean} props.showCompleted - Mostrar misiones completadas
 * @param {boolean} props.autoRefresh - Auto-refresh activado
 * @param {number} props.refreshInterval - Intervalo de refresh (ms)
 * @param {Function} props.onMissionComplete - Callback al completar misión
 * @param {string} props.className - Clases CSS adicionales
 */
export default function DailyMissions({
  compact = false,
  showStreak = true,
  showCompleted = true,
  autoRefresh = false,
  refreshInterval = 60000,
  onMissionComplete = null,
  className = ''
}) {
  // ============================================================================
  // HOOKS Y ESTADO
  // ============================================================================

  const {
    missions,
    missionStats,
    streak,
    loading,
    refreshing,
    error,
    refresh,
    computed,
    getMissionProgress,
    isMissionCompleted
  } = useDailyMissions({
    autoLoad: true,
    autoRefresh,
    refreshInterval,
    includeCompleted: showCompleted,
    loadStreak: showStreak
  });

  const [expandedMission, setExpandedMission] = useState(null);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  /**
   * Notificar cuando se completa una misión
   */
  useEffect(() => {
    if (onMissionComplete && computed.hasCompletedMissions) {
      onMissionComplete(missions.completed);
    }
  }, [computed.hasCompletedMissions, missions.completed, onMissionComplete]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = async () => {
    await refresh();
  };

  const toggleMissionDetails = (missionId) => {
    setExpandedMission(expandedMission === missionId ? null : missionId);
  };

  // ============================================================================
  // RENDER - LOADING STATE
  // ============================================================================

  if (loading && missions.all.length === 0) {
    return (
      <div className={`daily-missions-container ${className}`}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - ERROR STATE
  // ============================================================================

  if (error && missions.all.length === 0) {
    return (
      <div className={`daily-missions-container ${className}`}>
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AppIcon name="AlertCircle" className="w-5 h-5" />
            <h3 className="font-semibold">Error cargando misiones</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - COMPACT MODE
  // ============================================================================

  if (compact) {
    return (
      <div className={`daily-missions-compact ${className}`}>
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AppIcon name="Target" className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Misiones Diarias</h3>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <AppIcon 
                name="RefreshCw" 
                className={`w-4 h-4 text-purple-600 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progreso del día</span>
              <span className="font-semibold text-purple-600">
                {computed.completedMissionsCount}/{computed.totalMissionsCount}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${computed.overallProgress}%` }}
              />
            </div>

            {showStreak && computed.hasActiveStreak && (
              <div className="flex items-center gap-2 text-sm pt-2 border-t border-purple-100">
                <AppIcon name="Flame" className="w-4 h-4 text-orange-500" />
                <span className="text-gray-700">
                  <span className="font-semibold text-orange-600">{computed.currentStreak}</span> días de racha
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - FULL MODE
  // ============================================================================

  return (
    <div className={`daily-missions-full ${className}`}>
      {/* Header con estadísticas */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-t-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <AppIcon name="Target" className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Misiones Diarias</h2>
              <p className="text-purple-100 text-sm">
                Completa misiones para ganar puntos
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Refrescar misiones"
          >
            <AppIcon 
              name="RefreshCw" 
              className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-100">Progreso del día</span>
            <span className="font-semibold">
              {computed.completedMissionsCount}/{computed.totalMissionsCount} misiones
            </span>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
            <div
              className="bg-white h-full rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${computed.overallProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-100">
              {computed.pointsEarnedToday} puntos ganados hoy
            </span>
            <span className="text-purple-100">
              Reset en {computed.timeUntilReset}
            </span>
          </div>
        </div>

        {/* Mensaje de todas completadas */}
        {computed.allMissionsCompleted && (
          <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3">
            <AppIcon name="CheckCircle" className="w-6 h-6 text-green-300" />
            <div className="flex-1">
              <p className="font-semibold">¡Todas las misiones completadas!</p>
              <p className="text-sm text-purple-100">
                Vuelve mañana para más misiones y recompensas
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Racha del usuario */}
      {showStreak && (
        <StreakSection streak={streak} computed={computed} />
      )}

      {/* Misiones activas */}
      {computed.hasActiveMissions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AppIcon name="ListTodo" className="w-5 h-5 text-purple-600" />
            Misiones Activas
          </h3>

          <div className="space-y-3">
            {missions.active.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                progress={getMissionProgress(mission.id)}
                isExpanded={expandedMission === mission.id}
                onToggle={() => toggleMissionDetails(mission.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Misiones completadas */}
      {showCompleted && computed.hasCompletedMissions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <AppIcon name="CheckCircle" className="w-5 h-5 text-green-600" />
              Completadas ({computed.completedMissionsCount})
            </h3>
            
            {computed.completedMissionsCount > 3 && (
              <button
                onClick={() => setShowAllCompleted(!showAllCompleted)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                {showAllCompleted ? 'Mostrar menos' : 'Ver todas'}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {(showAllCompleted ? missions.completed : missions.completed.slice(0, 3)).map(mission => (
              <CompletedMissionCard
                key={mission.id}
                mission={mission}
              />
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!computed.hasActiveMissions && !computed.hasCompletedMissions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="Target" className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No hay misiones disponibles
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Las misiones diarias se actualizan cada 24 horas
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Refrescar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

/**
 * Sección de racha
 */
function StreakSection({ streak, computed }) {
  if (!computed.hasActiveStreak && computed.currentStreak === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl shadow-lg">
            <AppIcon name="Flame" className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              {computed.currentStreak} días de racha
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Récord personal: {computed.longestStreak} días
            </p>

            {/* Próximo bonus */}
            {computed.daysUntilNextBonus > 0 && (
              <div className="inline-flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-orange-200">
                <AppIcon name="Trophy" className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-700">
                  <span className="font-semibold text-orange-600">
                    +{computed.nextBonusPoints} puntos
                  </span>
                  {' '}en {computed.daysUntilNextBonus} día{computed.daysUntilNextBonus !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Medallas de hitos */}
        <div className="flex gap-2">
          {[7, 10, 30, 100].map(milestone => (
            <div
              key={milestone}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                computed.currentStreak >= milestone
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-300 text-white shadow-lg scale-110'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
              title={`${milestone} días`}
            >
              {milestone}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Card de misión activa
 */
function MissionCard({ mission, progress, isExpanded, onToggle }) {
  const isCompleted = mission.is_completed;
  const progressPercent = progress || 0;

  return (
    <div className={`mission-card border rounded-lg transition-all ${
      isCompleted 
        ? 'bg-green-50 border-green-200' 
        : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icono */}
          <div className={`p-3 rounded-lg flex-shrink-0 ${
            isCompleted
              ? 'bg-green-100'
              : 'bg-gradient-to-br from-purple-100 to-blue-100'
          }`}>
            <AppIcon 
              name={mission.icon || 'Target'} 
              className={`w-6 h-6 ${
                isCompleted ? 'text-green-600' : 'text-purple-600'
              }`}
            />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1">
                  {mission.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {mission.description}
                </p>
              </div>

              {/* Recompensa */}
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex-shrink-0">
                <AppIcon name="Star" className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">
                  +{mission.points_reward}
                </span>
              </div>
            </div>

            {/* Progreso */}
            {!isCompleted && (
              <>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                  <span>Progreso</span>
                  <span className="font-semibold">
                    {mission.current_progress || 0}/{mission.target_count}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            )}

            {/* Badge de completado */}
            {isCompleted && (
              <div className="flex items-center gap-2 text-sm text-green-700 mt-2">
                <AppIcon name="CheckCircle" className="w-4 h-4" />
                <span className="font-medium">¡Completada!</span>
                {mission.completed_at && (
                  <span className="text-gray-500 text-xs">
                    {new Date(mission.completed_at).toLocaleTimeString('es', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detalles expandibles */}
        {mission.requirements && (
          <button
            onClick={onToggle}
            className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
          >
            {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
            <AppIcon 
              name={isExpanded ? 'ChevronUp' : 'ChevronDown'} 
              className="w-4 h-4"
            />
          </button>
        )}

        {isExpanded && mission.requirements && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              {mission.requirements}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Card de misión completada (versión compacta)
 */
function CompletedMissionCard({ mission }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <AppIcon name={mission.icon || 'CheckCircle'} className="w-5 h-5 text-green-600" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-800 text-sm truncate">
          {mission.title}
        </h4>
        <p className="text-xs text-gray-600">
          +{mission.points_reward} puntos ganados
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <AppIcon name="CheckCircle" className="w-5 h-5 text-green-600" />
        {mission.completed_at && (
          <span className="text-xs text-gray-500">
            {new Date(mission.completed_at).toLocaleTimeString('es', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

export { MissionCard, CompletedMissionCard, StreakSection };
