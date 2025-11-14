// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE PUNTOS (VERSIÓN FINAL Y ESTABLE)
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA: Se blinda addPoints contra TypeError.
// ✅ Se utiliza initializeUserPoints para la estabilidad de la DB.
// ✅ MEJORADO: Centraliza la lógica de misiones y puntos ganados hoy.
// ✅ TIEMPO REAL: Reemplaza el polling de 10s con suscripciones a Supabase
//    para 'user_profiles', 'mission_progress' y 'daily_missions'.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
// 🛑 IMPORTACIÓN DE SERVICIOS: Importar funciones de AMBOS servicios
import { 
  getUserPoints,
  addPoints as addPointsService, 
  deductPoints as deductPointsService, 
  initializeUserPoints 
} from '../services/pointsService'; 
import {
  getDailyMissions,
  getMissionStats
} from '../services/missionsService'; // ✅ Importar servicios de misiones
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
// PROVEEDOR DEL CONTEXTO
// ============================================================================

export const PointsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // ============================================================================
  // ESTADOS PRINCIPALES (AHORA CENTRALIZADOS)
  // ============================================================================
  const [points, setPoints] = useState({
    total: 0,
    free: 0,
    premium: 0,
  });
  
  // ✅ Nuevos estados para misiones (movidos desde el Dashboard)
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  
  // Estado de carga unificado
  const [loading, setLoading] = useState(true);

  // Estado de animación (para notificaciones flotantes)
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn', // 'earn' o 'deduct'
    colorType: 'free' // 'free' o 'premium'
  });

  // Referencias para limpiar efectos
  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  
  // ============================================================================
  // LÓGICA DE CARGA DE DATOS (UNIFICADA)
  // ============================================================================
  
  /**
   * Carga TODOS los datos relacionados con puntos y misiones.
   * Esta es ahora la única fuente de verdad.
   */
  const loadAllData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    if (!user || !isAuthenticated) {
        setPoints({ total: 0, free: 0, premium: 0 });
        setMissions([]);
        setPointsEarnedToday(0);
        setLoading(false);
        return;
    }
    
    setLoading(true);

    try {
      // Inicializar el registro de puntos (seguridad)
      await initializeUserPoints(user.id);
      
      // Cargar datos en paralelo
      const [pointsResult, missionsResult, statsResult] = await Promise.all([
        getUserPoints(user.id),
        getDailyMissions({ includeCompleted: false }), // Solo misiones activas
        getMissionStats()
      ]);
      
      if (mountedRef.current) {
        // 1. Actualizar Saldo de Puntos
        setPoints({
          total: pointsResult.total,
          free: pointsResult.free,
          premium: pointsResult.premium,
        });

        // 2. Actualizar Misiones
        if (missionsResult.success) {
          setMissions(missionsResult.missions.active || []);
        }

        // 3. Actualizar Puntos Ganados Hoy
        if (statsResult.success) {
          setPointsEarnedToday(statsResult.stats.daily_points_earned || 0);
        }
        
        console.log('✅ [PointsContext] Datos unificados cargados:', {
          points: pointsResult,
          missions: missionsResult.missions.active?.length || 0,
          earnedToday: statsResult.stats.daily_points_earned || 0
        });
      }
    } catch (error) {
      console.error('❌ Error cargando datos unificados en PointsContext:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, isAuthenticated]); // Dependencias de useCallback


  // ============================================================================
  // EFECTO: CARGA INICIAL Y SUSCRIPCIONES EN TIEMPO REAL
  // ============================================================================
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      // 1. Carga inicial
      loadAllData();

      // 2. Suscripción a cambios en el SALDO (user_profiles)
      const pointsSubscription = supabase
        .channel('public:user_profiles')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'user_profiles',
            filter: `id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('🔄 [Real-Time] Cambio de Saldo detectado!', payload.new);
            setPoints({
              total: payload.new.points || 0,
              free: payload.new.free_points || 0,
              premium: payload.new.premium_points || 0
            });
            // También refrescamos las stats por si este cambio fue por una misión
            getMissionStats().then(statsResult => {
              if (statsResult.success) {
                setPointsEarnedToday(statsResult.stats.daily_points_earned || 0);
              }
            });
          }
        )
        .subscribe();

      // 3. Suscripción a cambios en el PROGRESO DE MISIONES (mission_progress)
      const missionsSubscription = supabase
        .channel('public:mission_progress')
        .on('postgres_changes',
          {
            event: '*', // Escuchar INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'mission_progress',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 [Real-Time] Cambio de Progreso de Misión detectado!', payload);
            // Un cambio en el progreso (ej. 2/10 -> 3/10)
            // debe recargar la lista de misiones y las stats.
            loadAllData();
          }
        )
        .subscribe();

      // 4. Suscripción a cambios en las MISIONES (daily_missions)
      const adminMissionsSubscription = supabase
        .channel('public:daily_missions')
        .on('postgres_changes',
          {
            event: '*', // Escuchar INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'daily_missions'
          },
          (payload) => {
            console.log('🔄 [Real-Time] Cambio de Admin en Misiones detectado!', payload);
            // Si un admin cambia una misión, recargamos todo.
            loadAllData();
          }
        )
        .subscribe();

      // Función de limpieza
      return () => {
        supabase.removeChannel(pointsSubscription);
        supabase.removeChannel(missionsSubscription);
        supabase.removeChannel(adminMissionsSubscription);
      };
      
    } else {
      // Si no hay usuario, limpiar todo
      setPoints({ total: 0, free: 0, premium: 0 });
      setMissions([]);
      setPointsEarnedToday(0);
      setLoading(false);
    }
  }, [user, isAuthenticated, loadAllData]);

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
      const result = await addPointsService(user.id, amount, type, actionType, referenceId);
      
      if (!result || !result.success) {
          throw new Error(result?.error || 'El servidor falló al registrar la transacción de puntos.');
      }
      
      // 2. Refrescar estado local (la suscripción lo hará, pero forzamos por si acaso)
      await loadAllData(); 

      // 3. Iniciar animación
      triggerAnimation(amount, 'earn', type);
      
      return { success: true, newPoints: result.newPoints };

    } catch (error) {
      console.error('❌ Error en addPoints (Contexto):', error);
      loadAllData(); // Forzar un refresh en caso de fallo
      return { success: false, error: error.message || 'Error al sumar puntos.' };
    }
  }, [user, loadAllData, triggerAnimation]);

  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS (INTERFAZ PÚBLICA)
  // ============================================================================
  const deductPoints = useCallback(async (amount, type = 'free', actionType = 'spend') => {
    if (!user || amount <= 0) return { success: false, error: 'Usuario o monto inválido' };

    try {
      // 1. Llamar a la función del servicio (que llama al RPC)
      const result = await deductPointsService(user.id, amount, type, actionType); 
      
      if (!result || !result.success) {
          throw new Error(result?.error || 'El servidor falló al procesar la deducción.');
      }
      
      // 2. Refrescar estado local
      await loadAllData();

      // 3. Iniciar animación
      triggerAnimation(amount, 'deduct', type);
      
      return { success: true, newPoints: result.newPoints };
      
    } catch (error) {
      console.error('❌ Fallo en deductPoints (Contexto):', error);
      loadAllData();
      return { success: false, error: error.message || 'Error al deducir puntos.' };
    }
  }, [user, loadAllData, triggerAnimation]);


  // ============================================================================
  // FUNCIÓN PARA REFRESCAR PUNTOS MANUALMENTE
  // ============================================================================
  const refreshPoints = useCallback(() => {
    return loadAllData();
  }, [loadAllData]);

  // ============================================================================
  // LIMPIAR AL DESMONTAR
  // ============================================================================
  useEffect(() => {
    mountedRef.current = true; // Marcar como montado
    return () => {
      mountedRef.current = false; // Marcar como desmontado
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // VALOR DEL CONTEXTO
  // ============================================================================
  const value = {
    // Estado de puntos
    totalPoints: points.total,
    freePoints: points.free,
    premiumPoints: points.premium,
    
    // ✅ Nuevos estados
    missions,
    pointsEarnedToday,
    
    // Estado de carga
    loading,
    
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
