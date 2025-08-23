import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Link } from 'react-router-dom';

const PointsBalanceCard = ({ 
  currentPoints, 
  pointsEarnedToday, 
  nextRewardThreshold,
  className = '' 
}) => {
  const [displayPoints, setDisplayPoints] = useState(currentPoints);
  const [showEarnedAnimation, setShowEarnedAnimation] = useState(false);

  useEffect(() => {
    if (pointsEarnedToday > 0) {
      setShowEarnedAnimation(true);
      setTimeout(() => setShowEarnedAnimation(false), 3000);
    }
  }, [pointsEarnedToday]);

  const progressToNext = nextRewardThreshold ? 
    Math.min((currentPoints / nextRewardThreshold) * 100, 100) : 0;

  const pointsNeeded = nextRewardThreshold ? 
    Math.max(nextRewardThreshold - currentPoints, 0) : 0;

  const earningTips = [
    {
      icon: "Play",
      text: "Ver videos completos",
      points: "+5-15 puntos"
    },
    {
      icon: "Heart",
      text: "Dar me gusta y comentar",
      points: "+2-5 puntos"
    },
    {
      icon: "Calendar",
      text: "Iniciar sesión diariamente",
      points: "+10-50 puntos"
    },
    {
      icon: "Share2",
      text: "Compartir contenido",
      points: "+3-8 puntos"
    }
  ];

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
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <span className="text-4xl font-mono font-bold text-accent">
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
        <p className="text-sm text-muted-foreground mt-1">puntos disponibles</p>
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
      {nextRewardThreshold && (
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
      <div className="grid grid-cols-2 gap-3 mb-6">
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
      {/* Earning Tips */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
          <Icon name="Lightbulb" size={16} />
          <span>Cómo ganar más puntos</span>
        </h3>
        <div className="space-y-2">
          {earningTips?.map((tip, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Icon name={tip?.icon} size={12} color="var(--color-muted-foreground)" />
                <span className="text-muted-foreground">{tip?.text}</span>
              </div>
              <span className="font-mono font-medium text-accent">{tip?.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PointsBalanceCard;