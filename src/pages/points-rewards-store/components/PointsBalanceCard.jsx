// src/pages/points-rewards-store/components/PointsBalanceCard.jsx
// ============================================================================
// POINTS BALANCE CARD - FIXED VISUAL COMPLETION + STREAK DISPLAY
// ============================================================================
// ✅ CORREGIDO: Ahora detecta "Misión Cumplida" matemáticamente.
//    Si llegas a 10/10, muestra el éxito AUNQUE la base de datos tarde un poco.
// ✅ CORREGIDO: Evita el parpadeo visual (intermitencia).
// ✅ NUEVO: Visualización especial para misión "Racha Imparable" con icono 🔥
// ============================================================================

import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Link } from 'react-router-dom';

const PointsBalanceCard = ({ 
  freePoints = 0,
  premiumPoints = 0,
  pointsEarnedToday = 0, 
  nextRewardThreshold,
  missions = [], 
  loading = false,
  className = '' 
}) => {
  const totalDisplayValue = freePoints + premiumPoints;
  
  const [displayPoints, setDisplayPoints] = useState(totalDisplayValue);
  const [showEarnedAnimation, setShowEarnedAnimation] = useState(false);

  useEffect(() => {
    setDisplayPoints(totalDisplayValue);
  }, [totalDisplayValue]);

  useEffect(() => {
    if (pointsEarnedToday > 0) {
      setShowEarnedAnimation(true);
      setTimeout(() => setShowEarnedAnimation(false), 3000);
    }
  }, [pointsEarnedToday]);

  if (loading && totalDisplayValue === 0 && freePoints === 0 && premiumPoints === 0) {
     return (
      <div className={`flex flex-col items-center justify-center p-6 bg-card border border-border rounded-lg shadow-elevation-1 min-h-[350px] ${className}`}>
        <Icon name="Loader" className="animate-spin text-accent w-8 h-8 mb-3" />
        <p className="text-sm text-muted-foreground">Obteniendo saldo...</p>
      </div>
    );
  }

  const progressToNext = nextRewardThreshold ? 
    Math.min((totalDisplayValue / nextRewardThreshold) * 100, 100) : 0;

  const pointsNeeded = nextRewardThreshold ? 
    Math.max(nextRewardThreshold - totalDisplayValue, 0) : 0;

  return (
    <div className={`bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground">
            Mis Puntos
          </h2>
          <p className="text-sm text-muted-foreground">
            Balance actual de recompensas
          </p>
        </div>
        <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
          <Icon name="Star" size={24} color="white" />
        </div>
      </div>
      
      {/* Current Balance */}
      <div className="text-center mb-4">
        <div className="relative inline-block">
          <span className="text-5xl font-mono font-bold text-accent">
            {displayPoints?.toLocaleString()}
          </span>
          {showEarnedAnimation && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <span className="bg-success text-success-foreground px-2 py-1 rounded-full text-xs font-bold">
                +{pointsEarnedToday}
              </span>
            </div>
          )}
        </div>
        <p className="text-lg font-medium text-foreground mt-1">puntos disponibles</p>
      </div>

      {/* Saldo Dual */}
      <div className="flex justify-around border-b border-border pb-4 mb-4">
          <div className="text-center">
              <span className="text-xl font-bold text-orange-400 block">
                  {freePoints.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Icon name="Star" size={14} className="text-orange-400" />
                  Puntos Gratis
              </span>
          </div>
          <div className="text-center">
              <span className="text-xl font-bold text-green-600 block">
                  {premiumPoints.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Icon name="Award" size={14} className="text-green-600" />
                  Puntos Premium
              </span>
          </div>
      </div>
      
      {/* Today's Earnings */}
      {pointsEarnedToday > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-6">
          <div className="flex items-center space-x-2">
            <Icon name="TrendingUp" size={16} color="var(--color-success)" />
            <span className="text-sm font-medium text-success">
              +{pointsEarnedToday} puntos ganados hoy
            </span>
          </div>
        </div>
      )}
      
      {/* Progress Bar */}
      {nextRewardThreshold > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Próxima recompensa
            </span>
            <span className="text-sm text-muted-foreground">
              {pointsNeeded?.toLocaleString()} puntos restantes
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/dashboard"> 
          <Button variant="outline" size="sm" fullWidth iconName="Play" iconPosition="left">
            Ver Videos
          </Button>
        </Link>
        
        <Link to="/profile#historial-puntos">
          <Button variant="outline" size="sm" fullWidth iconName="History" iconPosition="left">
            Historial
          </Button>
        </Link>
      </div>
      
      {/* ================================================== */}
      {/* ✅ PROGRESO DE MISIONES (LÓGICA MEJORADA + RACHAS) */}
      {/* ================================================== */}
      <div className="border-t border-border pt-6 mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Progreso de Misiones
        </h3>
        
        {loading && missions.length === 0 && (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/4"></div>
          </div>
        )}

        {!loading && missions.length > 0 && (
          <div className="space-y-4">
            {missions.map((mission) => {
              // ✅ LÓGICA HÍBRIDA: Es completada si la bandera lo dice O si los números coinciden.
              // Esto arregla el "limbo" visual cuando llegas a 10/10 pero la DB aún no actualiza la bandera.
              const isCompleted = mission.is_completed || (mission.target_count > 0 && mission.current_count >= mission.target_count);

              // Calcular porcentaje visual (máximo 100%)
              const percentage = isCompleted 
                ? 100 
                : (mission.target_count > 0 
                    ? Math.min(Math.round((mission.current_count / mission.target_count) * 100), 100)
                    : 0);

              // 🔥 DETECTAR SI ES LA MISIÓN DE RACHA
              const isStreakMission = mission.mission_type === 'all_missions_streak' || 
                                     mission.title?.toLowerCase().includes('racha');

              // Colores dinámicos
              let statusColor = isCompleted ? 'text-green-600' : 'text-accent';
              let barColor = isCompleted ? 'bg-green-500' : 'bg-accent';
              let titleClass = isCompleted ? 'text-green-700 font-bold' : 'text-foreground font-medium';
              let iconName = isCompleted ? 'CheckCircle' : (mission.icon || 'Target');

              // 🔥 OVERRIDE para racha (colores especiales)
              if (isStreakMission && !isCompleted) {
                statusColor = 'text-orange-500';
                barColor = 'bg-gradient-to-r from-orange-400 to-red-500';
                iconName = 'Flame';
              }

              // 🔥 Calcular si está cerca de completarse (80%+)
              const isCloseToComplete = percentage >= 80 && !isCompleted;

              return (
                <div key={mission.id} className={`group ${isStreakMission ? 'relative' : ''}`}>
                  {/* 🔥 BADGE ESPECIAL PARA RACHA */}
                  {isStreakMission && !isCompleted && mission.current_count > 0 && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                      {mission.current_count} {mission.current_count === 1 ? 'día' : 'días'}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <div className="flex items-center overflow-hidden">
                      <Icon 
                        name={iconName} 
                        size={14} 
                        className={`${statusColor} mr-2 flex-shrink-0 ${isStreakMission && !isCompleted ? 'animate-pulse' : ''}`} 
                      />
                      <span className={`${titleClass} truncate`} title={mission.title}>
                        {mission.title}
                      </span>
                    </div>
                    
                    {/* ✅ INDICADOR VISUAL */}
                    {isCompleted ? (
                      <div className="flex items-center gap-1 text-green-600 flex-shrink-0 ml-2 animate-in fade-in zoom-in duration-300">
                        <span className="text-[10px] font-bold uppercase tracking-wider">¡Completada!</span>
                      </div>
                    ) : (
                      <span className={`font-mono text-xs flex-shrink-0 ml-2 ${
                        isCloseToComplete ? 'text-orange-600 font-bold' : 'text-muted-foreground'
                      }`}>
                        {mission.current_count}/{mission.target_count}
                      </span>
                    )}
                  </div>
                  
                  {/* Barra */}
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ease-out ${barColor} ${
                        isCloseToComplete ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* 🔥 MENSAJE MOTIVACIONAL PARA RACHA (cuando está cerca) */}
                  {isStreakMission && isCloseToComplete && !isCompleted && (
                    <p className="text-[10px] text-orange-600 font-medium mt-1 animate-pulse">
                      ¡Solo {mission.target_count - mission.current_count} {mission.target_count - mission.current_count === 1 ? 'día' : 'días'} más para +100 puntos!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && missions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg border border-dashed border-border">
            No hay misiones activas hoy.
          </p>
        )}
      </div>
      
    </div>
  );
};

export default PointsBalanceCard;
