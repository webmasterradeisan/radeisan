import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const PointsFloatingAnimation = ({ points, onAnimationComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [animationClass, setAnimationClass] = useState('animate-bounce');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationClass('animate-pulse opacity-0');
      setTimeout(() => {
        setIsVisible(false);
        onAnimationComplete && onAnimationComplete();
      }, 500);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className={`flex items-center space-x-2 bg-accent text-accent-foreground px-4 py-2 rounded-full shadow-elevation-3 ${animationClass} transition-all duration-500`}>
        <Icon name="Star" size={20} color="white" />
        <span className="font-bold text-lg">+{points}</span>
      </div>
    </div>
  );
};

export default PointsFloatingAnimation;