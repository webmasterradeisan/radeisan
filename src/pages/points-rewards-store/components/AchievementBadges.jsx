import React from 'react';
import Icon from '../../../components/AppIcon';

const AchievementBadges = ({ 
  achievements = [], 
  className = '' 
}) => {
  const getAchievementIcon = (type) => {
    switch (type) {
      case 'first_redemption':
        return 'Gift';
      case 'video_watcher':
        return 'Play';
      case 'social_butterfly':
        return 'Users';
      case 'daily_streak':
        return 'Calendar';
      case 'big_spender':
        return 'Star';
      case 'early_adopter':
        return 'Zap';
      default:
        return 'Award';
    }
  };

  const getAchievementColor = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-400 to-orange-500';
      case 'epic':
        return 'from-purple-400 to-pink-500';
      case 'rare':
        return 'from-blue-400 to-cyan-500';
      case 'common':
        return 'from-green-400 to-emerald-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const recentAchievements = achievements?.filter(a => a?.unlockedAt)?.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))?.slice(0, 6);

  const upcomingAchievements = achievements?.filter(a => !a?.unlockedAt)?.slice(0, 3);

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-heading font-bold text-foreground">
          Logros y Insignias
        </h2>
        <Icon name="Award" size={20} color="var(--color-accent)" />
      </div>
      {/* Recent Achievements */}
      {recentAchievements?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
            <Icon name="Trophy" size={16} />
            <span>Logros Recientes</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentAchievements?.map((achievement, index) => (
              <div
                key={index}
                className="relative group cursor-pointer"
                title={achievement?.description}
              >
                <div className={`
                  w-16 h-16 rounded-full bg-gradient-to-br ${getAchievementColor(achievement?.rarity)}
                  flex items-center justify-center shadow-elevation-1 group-hover:shadow-elevation-2
                  transition-all duration-200 group-hover:scale-105
                `}>
                  <Icon 
                    name={getAchievementIcon(achievement?.type)} 
                    size={24} 
                    color="white" 
                  />
                </div>
                <p className="text-xs text-center text-foreground font-medium mt-2 truncate">
                  {achievement?.name}
                </p>
                {achievement?.pointsReward && (
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    <Icon name="Star" size={10} color="var(--color-accent)" />
                    <span className="text-xs font-mono text-accent">
                      +{achievement?.pointsReward}
                    </span>
                  </div>
                )}
                
                {/* New Badge */}
                {achievement?.isNew && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs text-primary-foreground font-bold">!</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Upcoming Achievements */}
      {upcomingAchievements?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
            <Icon name="Target" size={16} />
            <span>Próximos Logros</span>
          </h3>
          <div className="space-y-3">
            {upcomingAchievements?.map((achievement, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon 
                    name={getAchievementIcon(achievement?.type)} 
                    size={16} 
                    color="var(--color-muted-foreground)" 
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">
                    {achievement?.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {achievement?.description}
                  </p>
                  {achievement?.progress && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="text-foreground">
                          {achievement?.progress?.current}/{achievement?.progress?.target}
                        </span>
                      </div>
                      <div className="w-full bg-border rounded-full h-1.5">
                        <div 
                          className="bg-accent h-1.5 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(achievement?.progress?.current / achievement?.progress?.target) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {achievement?.pointsReward && (
                  <div className="flex items-center space-x-1">
                    <Icon name="Star" size={12} color="var(--color-accent)" />
                    <span className="text-xs font-mono text-accent">
                      +{achievement?.pointsReward}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Empty State */}
      {recentAchievements?.length === 0 && upcomingAchievements?.length === 0 && (
        <div className="text-center py-8">
          <Icon name="Award" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            ¡Comienza a ganar logros!
          </p>
          <p className="text-sm text-muted-foreground">
            Ve videos, interactúa y canjea recompensas para desbloquear insignias.
          </p>
        </div>
      )}
    </div>
  );
};

export default AchievementBadges;