// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN FINAL MERGED
// ✅ Mantiene 'deductPoints' y 'triggerAnimation' (No más pantalla blanca).
// ✅ Agrega 'updateMissionOptimistic' y 'rollbackMission' (Fix Anti-Farming).
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  getUserPoints,
  addPoints as addPointsService, 
  deductPoints as deductPointsService, 
  initializeUserPoints 
} from '../services/pointsService'; 
import {
  getMissionsForProgressPanel,
  getMissionStats
} from '../services/missionsService';
import { supabase } from 'lib/supabase';

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
  
  const [points, setPoints] = useState({
    total: 0,
    free: 0,
    premium: 0,
  });
  
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Estado para animación
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn',
    pointType: 'free' 
  });

  // Refs para control
  const animationTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const optimisticUpdateRef = useRef(false);
  
  // Refs para evitar bucles en actualizaciones optimistas
  const optimisticMissionTypeRef = useRef(null);
  const lastOptimisticUpdateRef = useRef(0);
  const optimisticValueRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Función auxiliar para triggerAnimation (Exportada)
  const triggerAnimation = useCallback((amount, type = 'earn', pointType = 'free') => {
    if (!mountedRef.current) return;
    
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    setPointsAnimation({
      show: true,
      amount,
      type,
      pointType
    });
    
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPointsAnimation(prev => ({ ...prev, show: false }));
      }
    }, 2500);
  }, []);

  // CARGA DE DATOS
  const loadAllData = useCallback(async (force = false) => {
    if (!user) {
      if (mountedRef.current) {
        setPoints({ total: 0, free: 0, premium: 0 });
        setMissions([]);
        setLoading(false);
      }
      return;
    }

    // Evitar recargas si acabamos de hacer una optimista reciente (menos de 2s)
    const now = Date.now();
    if (!force && optimisticUpdateRef.current && (now - lastOptimisticUpdateRef.current < 2000)) {
      return;
    }

    try {
      // 1. Puntos (Perfil)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('free_points, premium_points')
        .eq('id', user.id)
        .single();

      if (profile && mountedRef.current) {
        setPoints({
          total: (profile.free_points || 0) + (profile.premium_points || 0),
          free: profile.free_points || 0,
          premium: profile.premium_points || 0
        });
      }

      // 2. Misiones
      const missionsData = await getMissionsForProgressPanel(user.id);
      if (mountedRef.current) {
         setMissions(missionsData || []);
      }

      // 3. Ganancias hoy (Opcional/Legacy)
      // const earned = await pointsService.getPointsEarnedToday(user.id);
      // if (mountedRef.current) setPointsEarnedToday(earned);

    } catch (error) {
      console.error('Error loading points data:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
      optimisticUpdateRef.current = false;
    }
  }, [user]);

  // SUSCRIPCIÓN REALTIME (Mantenida)
  useEffect(() => {
    loadAllData();

    if (!user) return;

    const pointsSubscription = supabase
      .channel('points_realtime_v4')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_profiles', 
        filter: `id=eq.${user.id}` 
      }, (payload) => {
        if (mountedRef.current) {
            setPoints({
                total: payload.new.free_points + payload.new.premium_points,
                free: payload.new.free_points,
                premium: payload.new.premium_points
            });
            // Recargar misiones también por si se completó alguna
            getMissionsForProgressPanel(user.id).then(data => {
                if (mountedRef.current) setMissions(data);
            });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pointsSubscription);
    };
  }, [user, loadAllData]);


  // ==========================================
  // ACCIONES
  // ==========================================

  const addPoints = useCallback(async (amount, reason, type = 'free') => {
    if (!user) return { success: false, error: 'No autenticado' };

    // Optimistic update
    setPoints(prev => ({
      ...prev,
      total: prev.total + amount,
      [type]: prev[type] + amount
    }));
    setPointsEarnedToday(prev => prev + amount);
    triggerAnimation(amount, 'earn', type);
    
    // Nota: La llamada real al backend ya se hizo en el componente (ReelsContainer)
    // Esta función ahora sirve principalmente para actualizar el estado visual localmente.
    return { success: true };
  }, [user, triggerAnimation]);

  // ✅ FUNCIÓN DEDUCTPOINTS (RESTAURADA)
  const deductPoints = useCallback(async (amount, type = 'free', actionType = 'spend') => {
    if (!user) return { success: false, error: 'No autenticado' };
    if (amount <= 0) return { success: false, error: 'Inválido' };

    // Optimistic
    setPoints(prev => ({
        ...prev,
        total: Math.max(0, prev.total - amount),
        [type]: Math.max(0, prev[type] - amount)
    }));

    try {
      // Llamada al servicio legacy (si se usa)
      const result = await deductPointsService(user.id, amount, type, actionType); 
      if (!result?.success) throw new Error(result?.error);
      
      triggerAnimation(amount, 'deduct', type);
      return { success: true, newPoints: result.newPoints };
    } catch (error) {
      loadAllData(true); // Revertir si falla
      return { success: false, error: error.message };
    }
  }, [user, loadAllData, triggerAnimation]);

  // ✅ NUEVA: UPDATE MISSION OPTIMISTIC (COPIA PROFUNDA)
  // Esta es la clave para que el rollback funcione bien
  const updateMissionOptimistic = useCallback((missionKeyOrType, incrementBy = 1) => {
    setMissions(prevMissions => {
      return prevMissions.map(mission => {
        if (mission.mission_key === missionKeyOrType || mission.mission_type === missionKeyOrType) {
            const newCount = mission.current_count + incrementBy;
            const isNowCompleted = mission.target_count > 0 && newCount >= mission.target_count;

            // ⚠️ Creamos un objeto NUEVO (Copia profunda del item)
            return {
                ...mission,
                current_count: newCount,
                is_completed: mission.is_completed || isNowCompleted
            };
        }
        return mission;
      });
    });
  }, []);

  // ✅ NUEVA: ROLLBACK MISSION
  const rollbackMission = useCallback((previousMissionsState) => {
    if (previousMissionsState && Array.isArray(previousMissionsState)) {
        console.log("🔄 Rolling back missions state...");
        setMissions(previousMissionsState);
    }
  }, []);

  const refreshPoints = useCallback(async () => {
    await loadAllData(true);
  }, [loadAllData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  const value = {
    totalPoints: points.total,
    freePoints: points.free,
    premiumPoints: points.premium,
    missions,
    pointsEarnedToday,
    loading,
    pointsAnimation,
    addPoints,
    deductPoints, // ✅ Presente
    refreshPoints,
    updateMissionOptimistic, // ✅ Presente
    rollbackMission,         // ✅ Presente
    triggerAnimation         // ✅ Presente
  };

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
};
