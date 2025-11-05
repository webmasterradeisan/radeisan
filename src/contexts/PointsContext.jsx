// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - Gestión Global del Sistema de Puntos (SOLUCIÓN PERSISTENCIA)
// ============================================================================
// ✅ CORRECCIÓN: Implementada la lógica de comunicación con Supabase (RPC) 
//    dentro de addPoints y deductPoints para asegurar la persistencia de los puntos.
// ✅ La aplicación ahora lee y escribe los puntos 'free' y 'premium' correctamente.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getUserPoints } from '../services/pointsService';
import { supabase } from 'lib/supabase'; // ⚠️ NECESARIO para la persistencia

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
// Nombre de la función RPC en Supabase (debe existir en el backend)
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
  const pollingIntervalRef = useRef(null);

  // ============================================================================
  // CARGAR PUNTOS INICIALES (Funciona como el Polling)
  // ============================================================================
  const loadPoints = useCallback(async () => {
    if (!user || !isAuthenticated) {
      // Limpiar puntos si no hay usuario
      setPoints({ total: 0, free: 0, premium: 0, loading: false });
      return;
    }

    try {
      // ✅ Se asume que getUserPoints llama a Supabase y trae { free: N, premium: M }
      const pointsData = await getUserPoints(user.id);

      if (mountedRef.current) {
        setPoints({
          ...pointsData,
          total: (pointsData.free || 0) + (pointsData.premium || 0),
          loading: false
        });
      }
    } catch (error) {
      console.error('❌ Error al cargar puntos:', error);
      if (mountedRef.current) {
        setPoints(prev => ({ ...prev, loading: false }));
      }
    }
  }, [user, isAuthenticated]);

  // ============================================================================
  // FUNCIÓN PARA AÑADIR PUNTOS CON PERSISTENCIA
  // ============================================================================
  const addPoints = useCallback(async (amount, message = '', type = 'free') => {
    if (!user || amount <= 0 || !['free', 'premium'].includes(type)) return;

    console.log(`🎉 addPoints llamado: +${amount} ${type} por ${message}`);

    try {
      // ⚠️ PASO CRÍTICO: Llamada a la función RPC de Supabase para SUMAR
      const { data, error } = await supabase.rpc(POINTS_RPC_NAME, {
        p_user_id: user.id,
        p_amount: amount, // Cantidad positiva para sumar
        p_type: type
      });
      
      if (error) throw error;
      
      // OPTIMIZACIÓN: Si la RPC devuelve los nuevos totales, actualizamos el estado
      if (data && typeof data === 'object') {
        setPoints(prev => ({
            ...prev,
            free: data.new_free_points,
            premium: data.new_premium_points,
            total: data.new_free_points + data.new_premium_points
        }));
      } else {
        // Sino, forzamos una recarga de todos los puntos para sincronizar
        loadPoints();
      }

      // Mostrar animación (siempre después de la operación exitosa)
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      setPointsAnimation({
        show: true,
        amount: amount,
        type: 'earn',
        message: message || `+${amount} puntos`
      });

      animationTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setPointsAnimation(prev => ({ ...prev, show: false }));
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Error al añadir puntos:', error);
      // Si la operación falla en el servidor, cargamos los puntos reales
      loadPoints(); 
    }
  }, [user, loadPoints]);

  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS CON PERSISTENCIA
  // ============================================================================
  // 💡 Modificada para requerir el tipo de punto a descontar
  const deductPoints = useCallback(async (amount, message = '', type) => {
    if (!user || amount <= 0 || !['free', 'premium'].includes(type)) {
      throw new Error('Tipo de punto o cantidad inválida para la deducción.');
    }

    console.log(`💸 deductPoints llamado: -${amount} ${type} por ${message}`);
    
    try {
      // ⚠️ PASO CRÍTICO: Llamada a la función RPC de Supabase para RESTAR
      const { data, error } = await supabase.rpc(POINTS_RPC_NAME, {
        p_user_id: user.id,
        p_amount: -amount, // Cantidad negativa para restar
        p_type: type 
      });

      if (error) throw error;

      // Actualizar el estado con los valores de retorno de la RPC
      if (data && typeof data === 'object') {
        setPoints(prev => ({
            ...prev,
            free: data.new_free_points,
            premium: data.new_premium_points,
            total: data.new_free_points + data.new_premium_points
        }));
      } else {
        loadPoints();
      }
      
      // Lógica de animación
      setPointsAnimation({
        show: true,
        amount: amount,
        type: 'spend',
        message: message || `-${amount} puntos`
      });
      animationTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setPointsAnimation(prev => ({ ...prev, show: false }));
        }
      }, 3000); 

      return true; // Éxito

    } catch (error) {
      console.error('❌ Error al deducir puntos:', error);
      // Re-lanza el error (útil para manejar "Puntos insuficientes" en la compra)
      throw new Error(error.message || 'Error desconocido al deducir puntos.');
    }
  }, [user, loadPoints]);

  // ============================================================================
  // EFECTOS DE SINCRONIZACIÓN
  // ============================================================================
  
  // 1. Cargar puntos al iniciar sesión
  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  // 2. Polling para sincronización (cada 30 segundos)
  useEffect(() => {
    if (!user || !isAuthenticated) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    pollingIntervalRef.current = setInterval(() => {
      loadPoints();
    }, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, isAuthenticated, loadPoints]);

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
