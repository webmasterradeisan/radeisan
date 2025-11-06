// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE PUNTOS (VERSIÓN FINAL)
// ============================================================================
// ✅ CORRECCIÓN: Se eliminó el retorno temprano en loadPoints para forzar
//    la ejecución completa del Provider, evitando que las funciones como addPoints
//    sean undefined debido a un estado inconsistente de autenticación.
// ✅ Implementada la persistencia de puntos con función RPC de Supabase.
// ✅ Usa Polling (cada 30s) para mantener los puntos actualizados.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getUserPoints } from '../services/pointsService';
import { supabase } from 'lib/supabase';

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    // Si ves este error, DEBES envolver tu aplicación en <PointsProvider> dentro de <AuthProvider>
    throw new Error('usePoints debe ser usado dentro de un PointsProvider');
  }
  // ✅ El error 'reading addPoints' ocurre si se intenta leer una propiedad de 'context' antes
  //    de que el Provider haya terminado de definir sus funciones.
  return context;
};

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================
// Nombre de la función RPC en Supabase para actualizar puntos
const POINTS_RPC_NAME = 'update_user_points'; 
const POLLING_INTERVAL = 30000; // 30 segundos

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
    
    // NOTA IMPORTANTE: Se quitó el retorno temprano aquí. 
    // Ahora solo se limpia el estado si no hay autenticación.

    if (user && isAuthenticated) {
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
        }
        console.log('✅ Puntos cargados:', userPoints);
        return userPoints;
      } catch (error) {
        console.error('❌ Error cargando puntos:', error);
        if (mountedRef.current) {
          setPoints(prev => ({ ...prev, loading: false }));
        }
        return { total: 0, free: 0, premium: 0 };
      }
    } else {
      // Usuario no autenticado, resetear a valores por defecto
      if (mountedRef.current) {
        setPoints({ total: 0, free: 0, premium: 0, loading: false });
      }
      return { total: 0, free: 0, premium: 0 };
    }
  }, [user, isAuthenticated]);


  // Efecto para iniciar la carga inicial y el polling
  useEffect(() => {
    if (!isAuthenticated) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Limpiar puntos
      setPoints({ total: 0, free: 0, premium: 0, loading: false });
      return;
    }
    
    // Carga inicial
    loadPoints();

    // Iniciar polling
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(loadPoints, POLLING_INTERVAL);

    // Limpiar al desmontar o al cambiar de usuario
    return () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };
  }, [isAuthenticated, loadPoints]); // Dependencia simplificada: user se usa dentro de loadPoints

  // ============================================================================
  // FUNCIÓN PARA AÑADIR PUNTOS (Persistencia con RPC)
  // ============================================================================
  const addPoints = useCallback(async (amount, type = 'free') => {
    if (!user || !mountedRef.current) return { success: false, error: 'Usuario no autenticado o contexto desmontado' };
    if (amount <= 0) return { success: false, error: 'La cantidad debe ser positiva' };
    
    try {
      console.log(`📡 Llamando a RPC para añadir ${amount} puntos ${type}...`);
      
      // 1. Llamar a la función RPC de Supabase para la persistencia
      const { data, error } = await supabase.rpc(POINTS_RPC_NAME, {
        p_user_id: user.id,
        p_amount: amount,
        p_type: type, // 'free' o 'premium'
        p_operation: 'add'
      });

      if (error) {
        console.error(`❌ Error añadiendo ${type} points via RPC:`, error);
        throw new Error(`Error en el servidor al añadir puntos: ${error.message}`);
      }
      
      // El RPC devuelve el nuevo balance (new_points)
      const newPoints = data; 
      
      // 2. Actualizar el estado local
      if (mountedRef.current && newPoints) {
        setPoints({
            total: newPoints.total_points,
            free: newPoints.free_points,
            premium: newPoints.premium_points,
            loading: false
        });

        // 3. Iniciar animación de ganancia
        setPointsAnimation({
          show: true,
          amount: amount,
          type: 'earn'
        });

        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }
        animationTimeoutRef.current = setTimeout(() => {
          if(mountedRef.current) {
             setPointsAnimation(prev => ({ ...prev, show: false }));
          }
        }, 3000); // Duración de la animación: 3 segundos
      }
      
      console.log(`🎉 Puntos ${type} añadidos: ${amount}. Nuevo total: ${newPoints?.total_points}`);
      return { success: true, newPoints };

    } catch (error) {
      console.error(`❌ Fallo en addPoints (${type}):`, error);
      // Forzar un refresh en caso de fallo para recuperar el estado
      loadPoints(); 
      return { success: false, error: error.message };
    }
  }, [user, loadPoints]); // Depende de user y loadPoints


  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS (Persistencia con RPC)
  // ============================================================================
  const deductPoints = useCallback(async (amount, type = 'free') => {
    if (!user || !mountedRef.current) return { success: false, error: 'Usuario no autenticado o contexto desmontado' };
    if (amount <= 0) return { success: false, error: 'La cantidad debe ser positiva' };

    try {
      console.log(`📡 Llamando a RPC para deducir ${amount} puntos ${type}...`);
      
      // 1. Llamar a la función RPC de Supabase para la persistencia
      const { data, error } = await supabase.rpc(POINTS_RPC_NAME, {
        p_user_id: user.id,
        p_amount: amount,
        p_type: type, // 'free' o 'premium'
        p_operation: 'deduct'
      });

      if (error) {
        console.error(`❌ Error deduciendo ${type} points via RPC:`, error);
        throw new Error(`Error en el servidor al deducir puntos: ${error.message}`);
      }
      
      // El RPC devuelve el nuevo balance (new_points)
      const newPoints = data; 
      
      // 2. Actualizar el estado local
      if (mountedRef.current && newPoints) {
        setPoints({
            total: newPoints.total_points,
            free: newPoints.free_points,
            premium: newPoints.premium_points,
            loading: false
        });
        
        // 3. Iniciar animación de deducción
        setPointsAnimation({
          show: true,
          amount: amount,
          type: 'deduct'
        });

        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }
        animationTimeoutRef.current = setTimeout(() => {
          if(mountedRef.current) {
             setPointsAnimation(prev => ({ ...prev, show: false }));
          }
        }, 3000); 
      }
      
      console.log(`💸 Puntos ${type} deducidos: ${amount}. Nuevo total: ${newPoints?.total_points}`);
      return { success: true, newPoints };
      
    } catch (error) {
      console.error(`❌ Fallo en deductPoints (${type}):`, error);
      // Forzar un refresh en caso de fallo para recuperar el estado
      loadPoints();
      return { success: false, error: error.message };
    }
  }, [user, loadPoints]); // Depende de user y loadPoints


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
