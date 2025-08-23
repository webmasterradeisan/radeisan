import React, { useState } from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RewardCard = ({ 
  reward, 
  userPoints, 
  onRedeem, 
  onWaitlist,
  className = '' 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const canAfford = userPoints >= reward?.pointsCost;
  const isAvailable = reward?.stock > 0;

  const handleRedeem = async () => {
    if (!canAfford || !isAvailable) return;
    
    setIsLoading(true);
    try {
      await onRedeem(reward);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaitlist = () => {
    onWaitlist(reward);
  };

  const getStatusBadge = () => {
    if (!isAvailable) {
      return (
        <div className="absolute top-2 right-2 bg-error text-error-foreground px-2 py-1 rounded-full text-xs font-medium">
          Agotado
        </div>
      );
    }
    
    if (reward?.isExclusive) {
      return (
        <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-medium">
          Exclusivo
        </div>
      );
    }

    if (reward?.isPopular) {
      return (
        <div className="absolute top-2 right-2 bg-success text-success-foreground px-2 py-1 rounded-full text-xs font-medium">
          Popular
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 ${className}`}>
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={reward?.image}
          alt={reward?.title}
          className="w-full h-full object-cover"
        />
        {getStatusBadge()}
        
        {/* Overlay for out of stock */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-medium text-sm">No Disponible</span>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <div className="flex items-center space-x-2 mb-2">
          <Icon name={reward?.categoryIcon} size={14} color="var(--color-muted-foreground)" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            {reward?.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading font-semibold text-foreground mb-2 line-clamp-2">
          {reward?.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {reward?.description}
        </p>

        {/* Points Cost */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1">
            <Icon name="Star" size={16} color="var(--color-accent)" />
            <span className="font-mono font-bold text-accent">
              {reward?.pointsCost?.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">puntos</span>
          </div>
          
          {reward?.originalPrice && (
            <div className="text-xs text-muted-foreground">
              Valor: €{reward?.originalPrice}
            </div>
          )}
        </div>

        {/* Stock Info */}
        {isAvailable && reward?.stock <= 10 && (
          <div className="flex items-center space-x-1 mb-3">
            <Icon name="AlertTriangle" size={14} color="var(--color-warning)" />
            <span className="text-xs text-warning font-medium">
              Solo quedan {reward?.stock} disponibles
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {isAvailable ? (
            <Button
              variant={canAfford ? "default" : "outline"}
              fullWidth
              disabled={!canAfford}
              loading={isLoading}
              onClick={handleRedeem}
              iconName={canAfford ? "Gift" : "Lock"}
              iconPosition="left"
            >
              {canAfford ? "Canjear Ahora" : "Puntos Insuficientes"}
            </Button>
          ) : (
            <Button
              variant="outline"
              fullWidth
              onClick={handleWaitlist}
              iconName="Bell"
              iconPosition="left"
            >
              Lista de Espera
            </Button>
          )}

          {/* Share Button */}
          <Button
            variant="ghost"
            size="sm"
            iconName="Share2"
            iconPosition="left"
            className="w-full"
          >
            Compartir
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RewardCard;