// src/hooks/usePointsSync.js
// ============================================================================
// Hook para sincronizar pointsService con PointsContext
// ============================================================================

import { useEffect } from 'react';
import { usePoints } from '../contexts/PointsContext';
import { setPointsContextCallback } from '../services/pointsService';

export const usePointsSync = () => {
  const { addPoints, deductPoints } = usePoints();

  useEffect(() => {
    // Configurar callback en pointsService
    setPointsContextCallback((points, message, type) => {
      if (points > 0) {
        addPoints(points, message, type);
      } else if (points < 0) {
        deductPoints(Math.abs(points), message);
      }
    });

    return () => {
      setPointsContextCallback(null);
    };
  }, [addPoints, deductPoints]);
};
