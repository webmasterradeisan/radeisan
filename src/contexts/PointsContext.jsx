// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE PUNTOS (VERSIÓN FINAL CON FIX DE RUNTIME)
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA: Se implementa initializeUserPoints (RPC) para asegurar
//    que el registro de puntos exista al iniciar la sesión.
// ✅ La lógica de inicialización se llama de forma robusta en el useEffect,
//    eliminando el error de runtime "reading 'addPoints'".
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
// Nombres de las funciones RPC en Supabase (deben existir en el backend)
const POINTS_RPC_NAME = 'update_user_points'; 
const INIT_POINTS_RPC_NAME = 'ensure_user_points_record'; // 💡 NUEVA FUNCIÓN RPC para inicializar
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

  // Estado de animación para notificar al usuario
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn', // 'earn' | 'deduct'
    colorType: 'free' // 'free' | 'premium'
  });

  // Referencias para evitar fugas de memoria y controlar intervalos
  const mountedRef = useRef(true);
  const pollingIntervalRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  
  // ============================================================================
  // FUNCIÓN PARA CARGAR PUNTOS (RPC)
  // ============================================================================
  const loadPoints = useCallback(async () => {
    if (!mountedRef.current) return;
    
    // Si no está autenticado, simplemente establecemos el estado sin cargar.
    if (!isAuthenticated || !user?.id) {
        setPoints({
            total: 0,
            free: 0,
            premium: 0,
            loading: false
        });
        return;
    }
    
    setPoints(prev => ({ ...prev, loading: true }));

    try {
      const data = await getUserPoints(user.id);
      
      if (mountedRef.current) {
        setPoints({
          total: data.total,
          free: data.free,
          premium: data.premium,
          loading: false
        });
        console.log(`✅ Puntos cargados: Total ${data.total} (Free: ${data.free}, Premium: ${data.premium})`);
      }
    } catch (error) {
      console.error('❌ Error al cargar puntos:', error);
      if (mountedRef.current) {
        setPoints(prev => ({ ...prev, loading: false }));
      }
    }
  }, [isAuthenticated, user?.id]);

  // ============================================================================
  // FUNCIÓN PARA INICIALIZAR REGISTRO DE PUNTOS EN BACKEND (NUEVA)
  // ============================================================================
  /**
   * Asegura que el registro de puntos del usuario exista en la base de datos.
   * Llama a un RPC que debe crear el registro si no existe (upsert implícito).
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} Éxito de la operación
   */
  const initializeUserPoints = useCallback(async (userId) => {
    if (!userId) return false;
    
    try {
        const { error } = await supabase.rpc(INIT_POINTS_RPC_NAME, {
            p_user_id: userId
        });

        if (error) {
            console.error(`❌ Error RPC ${INIT_POINTS_RPC_NAME} (inicialización):`, error);
            return false;
        }
        console.log(`✅ Inicialización de puntos para ${userId} completada.`);
        return true;

    } catch (err) {
        console.error('❌ Error de conexión al inicializar puntos:', err);
        return false;
    }
  }, []);

  // ============================================================================
  // FUNCIÓN RPC PARA ACTUALIZAR PUNTOS EN BACKEND
  // ============================================================================
  /**
   * Ejecuta la función RPC para actualizar puntos y refresca el estado local.
   * @param {string} userId - ID del usuario
   * @param {number} freeDelta - Cambio en puntos 'free'
   * @param {number} premiumDelta - Cambio en puntos 'premium'
   * @returns {Promise<boolean>} Éxito de la operación
   */
  const updatePointsInSupabase = useCallback(async (userId, freeDelta, premiumDelta) => {
    try {
      const { error } = await supabase.rpc(POINTS_RPC_NAME, {
        p_user_id: userId,
        p_free_delta: freeDelta,
        p_premium_delta: premiumDelta
      });

      if (error) {
        console.error(`❌ Error RPC ${POINTS_RPC_NAME}:`, error);
        return false;
      }
      return true;

    } catch (err) {
      console.error('❌ Error de conexión al actualizar puntos:', err);
      return false;
    } finally {
        // Siempre refrescamos el estado local desde el backend para tener la fuente de verdad
        await loadPoints();
    }
  }, [loadPoints]);


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
  const addPoints = useCallback(async (amount, type = 'free', notify = true) => {
    if (!isAuthenticated || !user?.id || amount <= 0) return false;
    
    console.log(`🎁 Intentando añadir ${amount} puntos ${type} a ${user.id}`);

    const freeDelta = type === 'free' ? amount : 0;
    const premiumDelta = type === 'premium' ? amount : 0;
    
    const success = await updatePointsInSupabase(user.id, freeDelta, premiumDelta);

    if (success && notify) {
        triggerAnimation(amount, 'earn', type);
    }
    
    return success;
  }, [isAuthenticated, user?.id, updatePointsInSupabase, triggerAnimation]);

  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS (INTERFAZ PÚBLICA)
  // ============================================================================
  const deductPoints = useCallback(async (amount, type = 'free', notify = true) => {
    if (!isAuthenticated || !user?.id || amount <= 0) return false;

    console.log(`💸 Intentando deducir ${amount} puntos ${type} a ${user.id}`);

    // La deducción se pasa como valor negativo al RPC
    const freeDelta = type === 'free' ? -amount : 0;
    const premiumDelta = type === 'premium' ? -amount : 0;

    // TODO: Se debe implementar lógica de validación de balance en el RPC para evitar saldos negativos.
    
    const success = await updatePointsInSupabase(user.id, freeDelta, premiumDelta);
    
    if (success && notify) {
        triggerAnimation(amount, 'deduct', type);
    }
    
    return success;
  }, [isAuthenticated, user?.id, updatePointsInSupabase, triggerAnimation]);


  // ============================================================================
  // EFECTO: Carga inicial de puntos y Polling (Sincronización)
  // ============================================================================
  useEffect(() => {
    // 1. Limpieza de Polling al inicio
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
    }

    const setupPoints = async () => {
        if (!user?.id) {
            // Usuario no autenticado o cargando, resetear estado.
            setPoints({
                total: 0,
                free: 0,
                premium: 0,
                loading: false
            });
            return;
        }

        // 2. 💡 CORRECCIÓN DE RUNTIME: Inicializar el registro de puntos.
        // Esto asegura que el registro exista antes de cualquier operación.
        await initializeUserPoints(user.id);

        // 3. Carga de puntos
        await loadPoints();
        
        // 4. Configurar Polling
        if (mountedRef.current && isAuthenticated && user?.id) {
            console.log(`⏱️ Iniciando Polling (${POLLING_INTERVAL / 1000}s)`);
            pollingIntervalRef.current = setInterval(loadPoints, POLLING_INTERVAL);
        }
    };
    
    // Ejecutar la configuración de puntos
    setupPoints();

    // Limpieza al desmontar o al cambiar de usuario
    return () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };
  }, [user, isAuthenticated, loadPoints, initializeUserPoints]);

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
