import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const PullToRefresh = ({ onRefresh, children, threshold = 80 }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e?.touches?.[0]?.clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;

    currentY.current = e?.touches?.[0]?.clientY;
    const distance = Math.max(0, currentY?.current - startY?.current);
    
    if (distance > 0 && window.scrollY === 0) {
      e?.preventDefault();
      setPullDistance(Math.min(distance * 0.5, threshold * 1.5));
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      onRefresh && onRefresh()?.finally(() => {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }, 1000);
      });
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    container?.addEventListener('touchstart', handleTouchStart, { passive: false });
    container?.addEventListener('touchmove', handleTouchMove, { passive: false });
    container?.addEventListener('touchend', handleTouchEnd);

    return () => {
      container?.removeEventListener('touchstart', handleTouchStart);
      container?.removeEventListener('touchmove', handleTouchMove);
      container?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, isRefreshing]);

  const getRefreshIndicatorStyle = () => {
    const opacity = Math.min(pullDistance / threshold, 1);
    const scale = Math.min(0.5 + (pullDistance / threshold) * 0.5, 1);
    const rotation = (pullDistance / threshold) * 180;

    return {
      transform: `translateY(${pullDistance}px) scale(${scale}) rotate(${rotation}deg)`,
      opacity: opacity
    };
  };

  const getRefreshText = () => {
    if (isRefreshing) return 'Actualizando...';
    if (pullDistance >= threshold) return 'Suelta para actualizar';
    if (pullDistance > 0) return 'Desliza para actualizar';
    return '';
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Pull to Refresh Indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm z-30 transition-all duration-200"
          style={{
            height: `${Math.max(pullDistance, isRefreshing ? 80 : 0)}px`,
            transform: `translateY(-${Math.max(pullDistance, isRefreshing ? 80 : 0)}px)`
          }}
        >
          <div 
            className="flex flex-col items-center space-y-2"
            style={getRefreshIndicatorStyle()}
          >
            <div className={`w-8 h-8 flex items-center justify-center ${
              isRefreshing ? 'animate-spin' : ''
            }`}>
              <Icon 
                name={isRefreshing ? "Loader2" : "ArrowDown"} 
                size={20} 
                color="var(--color-primary)" 
              />
            </div>
            <span className="text-sm font-medium text-primary">
              {getRefreshText()}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isPulling || isRefreshing ? pullDistance : 0}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;