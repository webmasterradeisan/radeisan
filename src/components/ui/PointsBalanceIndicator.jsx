import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';

const PointsBalanceIndicator = ({ 
  points = 0, 
  showAnimation = false, 
  size = 'default',
  variant = 'default' 
}) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (showAnimation && points !== displayPoints) {
      setIsAnimating(true);
      
      // Animate number change
      const difference = points - displayPoints;
      const steps = 20;
      const stepValue = difference / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (currentStep <= steps) {
          setDisplayPoints(Math.round(displayPoints + (stepValue * currentStep)));
        } else {
          setDisplayPoints(points);
          setIsAnimating(false);
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    } else {
      setDisplayPoints(points);
    }
  }, [points, showAnimation]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 14,
          text: 'text-xs'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 20,
          text: 'text-base'
        };
      default:
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 16,
          text: 'text-sm'
        };
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'bg-transparent text-accent';
      case 'prominent':
        return 'bg-accent text-accent-foreground shadow-elevation-1';
      default:
        return 'bg-accent/10 text-accent';
    }
  };

  const sizeClasses = getSizeClasses();
  const variantClasses = getVariantClasses();

  return (
    <div 
      className={`
        inline-flex items-center space-x-2 rounded-full font-mono font-medium
        transition-all duration-300 ease-smooth
        ${sizeClasses?.container}
        ${variantClasses}
        ${isAnimating ? 'scale-105 shadow-elevation-2' : ''}
      `}
    >
      <Icon 
        name="Star" 
        size={sizeClasses?.icon} 
        color="var(--color-accent)" 
        className={`${isAnimating ? 'animate-pulse' : ''}`}
      />
      <span className={`${sizeClasses?.text} ${isAnimating ? 'animate-pulse' : ''}`}>
        {displayPoints?.toLocaleString()}
      </span>
      {/* Floating animation for point gains */}
      {showAnimation && isAnimating && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="animate-bounce text-success font-bold text-xs">
            +{Math.abs(points - (displayPoints - (points - displayPoints)))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsBalanceIndicator;