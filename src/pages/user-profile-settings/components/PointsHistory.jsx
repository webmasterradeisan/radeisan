import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import PointsBalanceIndicator from '../../../components/ui/PointsBalanceIndicator';

const PointsHistory = ({ pointsData, totalPoints }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const periods = [
    { id: 'all', label: 'Todo' },
    { id: 'today', label: 'Hoy' },
    { id: 'week', label: 'Esta semana' },
    { id: 'month', label: 'Este mes' }
  ];

  const getActivityIcon = (type) => {
    const iconMap = {
      'video_watch': 'Play',
      'video_upload': 'Upload',
      'daily_login': 'Calendar',
      'social_interaction': 'Heart',
      'achievement': 'Award',
      'referral': 'Users',
      'purchase': 'ShoppingBag',
      'bonus': 'Gift'
    };
    return iconMap?.[type] || 'Star';
  };

  const getActivityColor = (type) => {
    const colorMap = {
      'video_watch': 'var(--color-primary)',
      'video_upload': 'var(--color-secondary)',
      'daily_login': 'var(--color-success)',
      'social_interaction': 'var(--color-accent)',
      'achievement': 'var(--color-warning)',
      'referral': 'var(--color-secondary)',
      'purchase': 'var(--color-error)',
      'bonus': 'var(--color-accent)'
    };
    return colorMap?.[type] || 'var(--color-muted-foreground)';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hoy';
    if (diffDays === 2) return 'Ayer';
    if (diffDays <= 7) return `Hace ${diffDays - 1} días`;
    
    return date?.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date?.getFullYear() !== now?.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Points Summary */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 mb-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">Puntos Totales</h3>
          <PointsBalanceIndicator 
            points={totalPoints} 
            size="lg" 
            variant="prominent"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Ganados desde que te uniste a VideoRewards
          </p>
        </div>
      </div>
      {/* Period Filter */}
      <div className="flex space-x-2 mb-6 overflow-x-auto scrollbar-hide">
        {periods?.map((period) => (
          <button
            key={period?.id}
            onClick={() => setSelectedPeriod(period?.id)}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors
              ${selectedPeriod === period?.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            {period?.label}
          </button>
        ))}
      </div>
      {/* Points Timeline */}
      <div className="space-y-4">
        {pointsData?.map((entry, index) => (
          <div key={entry?.id} className="flex items-start space-x-4 p-4 bg-card border border-border rounded-lg">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${getActivityColor(entry?.type)}20` }}
            >
              <Icon 
                name={getActivityIcon(entry?.type)} 
                size={18} 
                color={getActivityColor(entry?.type)} 
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-foreground">
                  {entry?.title}
                </h4>
                <div className={`
                  flex items-center space-x-1 text-sm font-medium
                  ${entry?.points > 0 ? 'text-success' : 'text-error'}
                `}>
                  <span>{entry?.points > 0 ? '+' : ''}{entry?.points}</span>
                  <Icon name="Star" size={14} color="var(--color-accent)" />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                {entry?.description}
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(entry?.date)}</span>
                {entry?.multiplier && entry?.multiplier > 1 && (
                  <div className="flex items-center space-x-1 bg-accent/10 px-2 py-0.5 rounded-full">
                    <Icon name="Zap" size={10} color="var(--color-accent)" />
                    <span className="text-accent font-medium">{entry?.multiplier}x</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Load More */}
      <div className="flex justify-center mt-8">
        <button className="px-6 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
          Ver más actividad
        </button>
      </div>
      {/* Milestones */}
      <div className="mt-8 p-4 bg-accent/5 border border-accent/20 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Icon name="Trophy" size={18} color="var(--color-accent)" />
          <h4 className="font-medium text-foreground">Próximo Hito</h4>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground font-medium">10,000 Puntos</p>
            <p className="text-xs text-muted-foreground">Desbloquea recompensas premium</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-accent">
              {(10000 - totalPoints)?.toLocaleString()} restantes
            </p>
            <div className="w-24 h-2 bg-muted rounded-full mt-1">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totalPoints / 10000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsHistory;