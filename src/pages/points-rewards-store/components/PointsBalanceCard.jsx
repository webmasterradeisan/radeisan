// src/pages/points-rewards-store/components/PointsBalanceCard.jsx
// ============================================================================
// ✅ FIX: Eliminada la sección "Cómo ganar más puntos" (earningTips)
//    ya que ahora se maneja dinámicamente en el componente padre.
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
      <div className={`flex flex-col items-center justify-center p-6 bg-card border border-border rounded-lg shadow-elevation-1 min-h-[250px] ${className}`}>
        <Icon name="Loader" className="animate-spin text-accent w-8 h-8 mb-3" />
        <p className="text-sm text-muted-foreground">Obteniendo saldo...</p>
      </div>
    );
  }

  const progressToNext = nextRewardThreshold ? 
    Math.min((totalDisplayValue / nextRewardThreshold) * 100, 100) : 0;

  const pointsNeeded = nextRewardThreshold ? 
    Math.max(nextRewardThreshold - totalDisplayValue, 0) : 0;

  // ✅ FIX: 'earningTips' ha sido eliminado de este archivo.

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
      
      {/* Current Balance (Combinado) */}
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

      {/* Mostrar el saldo dual por separado */}
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
      
      {/* Progress to Next Reward */}
      {nextRewardThreshold > 0 && ( // <-- Añadida comprobación
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
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3"> {/* ✅ FIX: Eliminado mb-6 */}
        <Link to="/video-feed-dashboard">
          <Button variant="outline" size="sm" fullWidth iconName="Play" iconPosition="left">
            Ver Videos
          </Button>
        </Link>
        <Button 
          variant="outline" 
          size="sm" 
          fullWidth 
          iconName="History" 
          iconPosition="left"
          onClick={() => {
            const historySection = document.getElementById('transaction-history');
            if (historySection) {
              historySection?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          Historial
        </Button>
      </div>
      
      {/* ✅ FIX: Sección "Earning Tips" eliminada de aquí */}
      
    </div>
  );
};

export default PointsBalanceCard;
