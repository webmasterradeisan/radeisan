// src/pages/points-rewards-store/components/RewardCard.jsx
// ✅ FIX 4 (FINAL): Corregida la lógica de 'canAfford' para que solo
//    evalúe un tipo de moneda si la recompensa TIENE un costo > 0
//    en esa moneda.
// ============================================================================

import React, { useState } from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RewardCard = ({ 
  reward, 
  userFreePoints,         
  userPremiumPoints,      
  onRedeem, 
  onWaitlist,
  className = '' 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const requiredFree = reward?.cost_free_points || 0;
  const requiredPremium = reward?.cost_premium_points || 0;

  // ✅✅✅ LÓGICA CORREGIDA AQUÍ ✅✅✅
  // Solo se puede costear si la recompensa TIENE un costo en esa moneda
  const canAffordFree = (requiredFree > 0) && (userFreePoints >= requiredFree);
  const canAffordPremium = (requiredPremium > 0) && (userPremiumPoints >= requiredPremium);
  
  // El usuario puede costearlo si puede pagar con CUALQUIERA de las monedas
  const canAfford = canAffordFree || canAffordPremium;
  
  // La disponibilidad viene del componente padre (que ya entiende el stock ilimitado)
  const isAvailable = reward?.isAvailable;
  
  // Determinar la moneda a usar: Prioriza Premium SOLO SI es costeable
  const redemptionType = (canAffordPremium) ? 'premium' : 'free';

  const handleRedeem = async () => {
    if (!canAfford || !isAvailable) return;
    
    setIsLoading(true);
    try {
      // Pasa el tipo de moneda correcto ('premium' o 'free')
      await onRedeem(reward, redemptionType); 
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

        {/* Costo dual */}
        <div className="mb-4">
            <span className="text-xs text-muted-foreground font-medium block mb-1">
                Costo en Puntos de Valor:
            </span>
            <div className="space-y-1">
                {/* 1. Costo en Puntos PREMIUM */}
                {requiredPremium > 0 && (
                  <div 
                    className={`flex items-center justify-between text-sm p-1 rounded-md ${
                        canAffordPremium ? 'bg-green-50' : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                        <Icon name="Award" size={16} className="text-green-600" />
                        <span className="font-bold text-green-600">
                          {requiredPremium.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-600">Premium</span>
                    </div>
                    <span className={`text-xs font-medium ${canAffordPremium ? 'text-green-700' : 'text-red-500'}`}>
                        {canAffordPremium ? '¡Asequible!' : 'Insuficiente'}
                    </span>
                  </div>
                )}
                
                {/* 2. Costo en Puntos GRATIS */}
                {requiredFree > 0 && (
                   <div 
                    className={`flex items-center justify-between text-sm p-1 rounded-md ${
                        canAffordFree ? 'bg-orange-50' : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                        <Icon name="Star" size={16} className="text-orange-400" />
                        <span className="font-bold text-orange-600">
                          {requiredFree.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-600">Gratis</span>
                    </div>
                    <span className={`text-xs font-medium ${canAffordFree ? 'text-green-700' : 'text-red-500'}`}>
                        {canAffordFree ? 'Asequible' : 'Insuficiente'}
                    </span>
                  </div>
                )}
            </div>
        </div>


        {/* Stock Info */}
        {isAvailable && reward?.stock > 0 && reward?.stock <= 10 && (
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
              {/* ✅✅✅ LÓGICA DE TEXTO CORREGIDA ✅✅✅ */}
              {/* El botón ahora muestra la moneda correcta */}
              {canAfford ? `Canjear con ${redemptionType === 'premium' ? 'Premium' : 'Gratis'}` : "Puntos Insuficientes"}
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
