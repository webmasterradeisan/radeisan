// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE PUNTOS (VERSIÓN FINAL Y ESTABLE)
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA: Se blinda addPoints contra TypeError.
// ✅ Se utiliza initializeUserPoints para la estabilidad de la DB.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
// 🛑 IMPORTACIÓN DE SERVICIO: Importar funciones robustas del servicio con alias
import { 
  getUserPoints,
  // Alias para evitar conflicto de nombres con las funciones del contexto
  addPoints as addPointsService, 
  deductPoints as deductPointsService, 
  initializeUserPoints 
} from '../services/pointsService'; 
import { supabase } from 'lib/supabase';

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints debe ser usado dentro de un PointsProvider');
  }
  return context;
};

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================
const POLLING_INTERVAL = 10000; // 30 segundos

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

  // Estado de animación (para notificaciones flotantes)
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn', // 'earn' o 'deduct'
    colorType: 'free' // 'free' o 'premium'
  });

  // Referencias para limpiar efectos
  const mountedRef = useRef(true);
  const pollingIntervalRef = useRef(null);
  const animationTimeoutRef = useRef(null);

  // ============================================================================
  // LÓGICA DE CARGA Y POLLING
  // ============================================================================
  const loadPoints = useCallback(async () => {
    if (!mountedRef.current) return;
    
    if (!user || !isAuthenticated) {
        setPoints({ total: 0, free: 0, premium: 0, loading: false });
        return;
    }
    
    setPoints(prev => ({ ...prev, loading: true }));

    try {
      const userPoints = await getUserPoints(user.id);
      
      if (mountedRef.current) {
        setPoints({
          total: userPoints.total,
          free: userPoints.free,
          premium: userPoints.premium,
          loading: false
        });
        console.log('✅ Puntos cargados:', userPoints);
        return userPoints;
      }
    } catch (error) {
      console.error('❌ Error cargando puntos:', error);
      if (mountedRef.current) {
        setPoints(prev => ({ ...prev, loading: false }));
      }
      // Retorna 0 para que el código que llama no se quede esperando un objeto.
      return { total: 0, free: 0, premium: 0 };
    }
  }, [user, isAuthenticated]);


  // ============================================================================
  // FUNCIÓN PARA ANIMACIÓN Y NOTIFICACIÓN
  // ============================================================================
  const triggerAnimation = useCallback((amount, type, colorType) => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    setPointsAnimation({
      show: true,
      amount,
      type,
      colorType
    });

    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPointsAnimation(prev => ({ ...prev, show: false }));
      }
    }, 3000); // Muestra la animación por 3 segundos
  }, []);

  // ============================================================================
  // FUNCIÓN PARA AÑADIR PUNTOS (INTERFAZ PÚBLICA)
  // ============================================================================
  const addPoints = useCallback(async (amount, type = 'free', actionType = 'earned', referenceId = null) => {
    if (!user || amount <= 0) return { success: false, error: 'Usuario o monto inválido' };
    
    try {
      // 1. Llamar a la función del servicio (que llama al RPC)
      // Asumimos que el servicio ya maneja la lógica de transacción y devuelve un objeto de saldo.
      const balanceResult = await addPointsService(user.id, amount, type, actionType, referenceId);
      
      // 🛑 CORRECCIÓN CRÍTICA: La línea que lanzaba TypeError:
      // Si el servicio falló, el resultado puede ser null/undefined.
      if (!balanceResult || balanceResult.error) {
          throw new Error(balanceResult?.error?.message || 'El servidor falló al registrar la transacción de puntos.');
      }
      
      // 2. Refrescar estado local (si la operación fue exitosa)
      // loadPoints() actualizará el estado con el nuevo balance de la DB.
      await loadPoints(); 

      // 3. Iniciar animación
      triggerAnimation(amount, 'earn', type);
      
      return { success: true, newPoints: balanceResult };

    } catch (error) {
      console.error('❌ Error en addPoints (Contexto):', error);
      // Forzar un refresh en caso de fallo para recuperar el estado
      loadPoints(); 
      return { success: false, error: error.message || 'Error al sumar puntos.' };
    }
  }, [user, loadPoints, triggerAnimation]);

  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS (INTERFAZ PÚBLICA)
  // ============================================================================
  const deductPoints = useCallback(async (amount, type = 'free', actionType = 'spend') => {
    if (!user || amount <= 0) return { success: false, error: 'Usuario o monto inválido' };

    try {
      // 1. Llamar a la función del servicio (que llama al RPC)
      // Asumimos que el servicio maneja la deducción con amount negativo o un flag.
      const balanceResult = await deductPointsService(user.id, amount, type, actionType); 
      
      // 🛑 CORRECCIÓN DE SEGURIDAD
      if (!balanceResult || balanceResult.error) {
          throw new Error(balanceResult?.error?.message || 'El servidor falló al procesar la deducción.');
      }
      
      // 2. Refrescar estado local
      await loadPoints();

      // 3. Iniciar animación
      triggerAnimation(amount, 'deduct', type);
      
      return { success: true, newPoints: balanceResult };
      
    } catch (error) {
      console.error('❌ Fallo en deductPoints (Contexto):', error);
      loadPoints();
      return { success: false, error: error.message || 'Error al deducir puntos.' };
    }
  }, [user, loadPoints, triggerAnimation]);


  // ============================================================================
  // EFECTO: Carga inicial de puntos y Polling (Sincronización)
  // ============================================================================
  useEffect(() => {
    // Limpieza de Polling al inicio
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
    }

    const setupPoints = async () => {
        if (!user?.id) {
            setPoints({ total: 0, free: 0, premium: 0, loading: false });
            return;
        }

        // 🛑 CORRECCIÓN DE RUNTIME: Inicializar el registro de puntos.
        // Esto previene que el RPC de lectura falle por 'no row found'.
        await initializeUserPoints(user.id);

        // Carga de puntos
        await loadPoints();
        
        // Configurar Polling
        if (mountedRef.current && isAuthenticated && user?.id) {
            pollingIntervalRef.current = setInterval(loadPoints, POLLING_INTERVAL);
        }
    };
    
    setupPoints();

    // Limpieza al desmontar o al cambiar de usuario
    return () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };
  }, [user, isAuthenticated, loadPoints, initializeUserPoints]); // Dependencia de initializeUserPoints es necesaria

  // ============================================================================
  // FUNCIÓN PARA REFRESCAR PUNTOS MANUALMENTE
  // ============================================================================
  const refreshPoints = useCallback(() => {
    return loadPoints();
  }, [loadPoints]);

  // ============================================================================
  // LIMPIAR AL DESMONTAR
  // ============================================================================
  useEffect(() => {
    return () => {
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
