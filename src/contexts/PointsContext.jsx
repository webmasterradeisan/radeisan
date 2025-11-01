// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - Gestión Global del Sistema de Puntos (ACTUALIZADO)
// ============================================================================
// CAMBIOS:
// - Reemplaza Realtime por Polling (consultas cada 30 segundos)
// - Usa el servicio actualizado con RPC
// - Evita problemas de recursión infinita en políticas RLS
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getUserPoints } from '../services/pointsService';

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints debe ser usado dentro de un PointsProvider');
  }
  return context;
};

export const PointsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // ============================================================================
  // ESTADOS PRINCIPALES
  // ============================================================================
  const [points, setPoints] = useState({
    total: 0,
    free: 0,
    premium: 0,
    loading: true
  });

  // Estado de animación
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn', // 'earn' o 'spend'
    message: ''
  });

  // ============================================================================
  // REFS
  // ============================================================================
  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null); // ✅ NUEVO: Polling en lugar de Realtime

  // ============================================================================
  // CARGAR PUNTOS INICIALES
  // ============================================================================
  const loadPoints = useCallback(async () => {
    if (!user || !isAuthenticated) {
      console.log('⏭️ No hay usuario, reseteando puntos');
      setPoints({ total: 0, free: 0, premium: 0, loading: false });
      return;
    }

    try {
      console.log('💰 Cargando puntos para usuario:', user.id);
      
      // ✅ Usa el servicio actualizado que llama a la función RPC
      const pointsData = await getUserPoints(user.id);

      console.log('✅ Puntos cargados:', pointsData);
      
      if (mountedRef.current) {
        setPoints({
          ...pointsData,
          loading: false
        });
      }
    } catch (error) {
      console.error('❌ Error al cargar puntos:', error);
      if (mountedRef.current) {
        setPoints({ total: 0, free: 0, premium: 0, loading: false });
      }
    }
  }, [user, isAuthenticated]);

  // ============================================================================
  // CARGAR PUNTOS AL MONTAR O CUANDO CAMBIE EL USUARIO
  // ============================================================================
  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  // ============================================================================
  // POLLING - Consultar puntos cada 30 segundos (REEMPLAZA REALTIME)
  // ============================================================================
  useEffect(() => {
    if (!user || !isAuthenticated) {
      // Limpiar polling si no hay usuario
      if (pollingIntervalRef.current) {
        console.log('⏹️ Deteniendo polling - no hay usuario');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    console.log('🔄 Iniciando polling de puntos (cada 30 segundos)');

    // Configurar intervalo de polling
    pollingIntervalRef.current = setInterval(() => {
      console.log('🔄 Polling: Actualizando puntos...');
      loadPoints();
    }, 30000); // 30 segundos

    // Cleanup
    return () => {
      console.log('🧹 Limpiando polling');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, isAuthenticated, loadPoints]);

  // ============================================================================
  // FUNCIÓN PARA AÑADIR PUNTOS CON ANIMACIÓN
  // ============================================================================
  const addPoints = useCallback((amount, message = '', type = 'free') => {
    console.log('🎉 addPoints llamado:', { amount, message, type });

    if (!amount || amount <= 0) {
      console.warn('⚠️ Cantidad de puntos inválida:', amount);
      return;
    }

    // Actualizar puntos optimísticamente (sin esperar al servidor)
    setPoints(prev => {
      const newPoints = { ...prev };
      
      if (type === 'free') {
        newPoints.free += amount;
      } else if (type === 'premium') {
        newPoints.premium += amount;
      }
      
      newPoints.total = newPoints.free + newPoints.premium;

      console.log('💫 Puntos actualizados optimísticamente:', newPoints);
      return newPoints;
    });

    // Mostrar animación
    setPointsAnimation({
      show: true,
      amount,
      type: 'earn',
      message: message || `+${amount} puntos`
    });

    // Ocultar animación después de 3 segundos
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPointsAnimation({
          show: false,
          amount: 0,
          type: 'earn',
          message: ''
        });
      }
    }, 3000);

    // Recargar puntos desde el servidor para confirmar
    setTimeout(() => {
      loadPoints();
    }, 500);
  }, [loadPoints]);

  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS
  // ============================================================================
  const deductPoints = useCallback((amount, message = '') => {
    console.log('💸 deductPoints llamado:', { amount, message });

    if (!amount || amount <= 0) {
      console.warn('⚠️ Cantidad de puntos inválida:', amount);
      return;
    }

    // Actualizar puntos optimísticamente
    setPoints(prev => {
      const newPoints = { ...prev };
      
      // Deducir primero de premium, luego de free
      if (newPoints.premium >= amount) {
        newPoints.premium -= amount;
      } else {
        const remaining = amount - newPoints.premium;
        newPoints.premium = 0;
        newPoints.free = Math.max(0, newPoints.free - remaining);
      }
      
      newPoints.total = newPoints.free + newPoints.premium;

      console.log('💫 Puntos deducidos optimísticamente:', newPoints);
      return newPoints;
    });

    // Mostrar animación
    setPointsAnimation({
      show: true,
      amount,
      type: 'spend',
      message: message || `-${amount} puntos`
    });

    // Ocultar animación
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPointsAnimation({
          show: false,
          amount: 0,
          type: 'spend',
          message: ''
        });
      }
    }, 3000);

    // Recargar puntos desde el servidor
    setTimeout(() => {
      loadPoints();
    }, 500);
  }, [loadPoints]);

  // ============================================================================
  // FUNCIÓN PARA REFRESCAR PUNTOS MANUALMENTE
  // ============================================================================
  const refreshPoints = useCallback(() => {
    console.log('🔄 Refrescando puntos manualmente');
    return loadPoints();
  }, [loadPoints]);

  // ============================================================================
  // LIMPIAR AL DESMONTAR
  // ============================================================================
  useEffect(() => {
    return () => {
      console.log('🧹 Limpiando PointsProvider');
      mountedRef.current = false;
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // ============================================================================
  // VALOR DEL CONTEXTO
  // ============================================================================
  const value = {
    // Estado de puntos
    points,
    totalPoints: points.total,
    freePoints: points.free,
    premiumPoints: points.premium,
    loading: points.loading,
    
    // Animación
    pointsAnimation,
    
    // Funciones
    addPoints,
    deductPoints,
    refreshPoints
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

export default PointsProvider;
