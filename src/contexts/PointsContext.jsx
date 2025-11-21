// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE PUNTOS
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA V4.0: UNIFICACIÓN DE BILLETERAS
// 🔥 SOLUCIÓN REAL-TIME: Escucha a 'user_profiles'
// 🔥 EXPORT: Se expone triggerAnimation para corrección visual de colores
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

  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn',
    colorType: 'free'
  });

  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  const lastOptimisticUpdateRef = useRef(0);
  const optimisticMissionTypeRef = useRef(null);
  const optimisticValueRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    setMissions(prev => {
      const targetMission = prev.find(m => m.mission_type === missionType);
      
      if (targetMission) {
        const newCount = Math.min(targetMission.current_count + delta, targetMission.target_count);
        lastOptimisticUpdateRef.current = Date.now();
        optimisticMissionTypeRef.current = missionType;
        optimisticValueRef.current = newCount;
      }
      
      return prev.map(mission => {
        if (mission.mission_type === missionType) {
          const newCount = Math.min(mission.current_count + delta, mission.target_count);
          return { ...mission, current_count: newCount, _optimistic: true, _optimisticTimestamp: Date.now(), _optimisticValue: newCount };
        }
        return mission;
      });
    });
  }, []);
  
  const rollbackMission = useCallback((snapshot) => {
    lastOptimisticUpdateRef.current = 0;
    optimisticMissionTypeRef.current = null;
    optimisticValueRef.current = null;
    setMissions(snapshot.map(m => ({ ...m, _optimistic: false, _optimisticTimestamp: undefined, _optimisticValue: undefined }))); 
  }, []);
  
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;
    
    if (!user || !isAuthenticated) {
        setPoints({ total: 0, free: 0, premium: 0 });
        setMissions([]);
        setPointsEarnedToday(0);
        setLoading(false);
        return;
    }
    
    if (isLoadingRef.current && !forceRefresh) return;
    
    const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
    if (timeSinceOptimistic < 2000 && !forceRefresh && optimisticMissionTypeRef.current) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => loadAllData(true), 2000);
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);

    try {
      await initializeUserPoints(user.id);
      
      const [pointsResult, missionsResult, statsResult] = await Promise.all([
        getUserPoints(user.id),
        getMissionsForProgressPanel(),
        getMissionStats()
      ]);
      
      if (mountedRef.current) {
        setPoints({
          total: pointsResult.total || 0,
          free: pointsResult.free || 0,
          premium: pointsResult.premium || 0,
        });
        
        if (missionsResult && missionsResult.success) {
          setMissions(prev => {
            const serverMissions = missionsResult.missions || [];
            return serverMissions.map(serverMission => {
              const existingMission = prev.find(m => m.id === serverMission.id);
              const isOptimisticMission = serverMission.mission_type === optimisticMissionTypeRef.current;
              
              if (isOptimisticMission && existingMission?._optimisticTimestamp && (Date.now() - existingMission._optimisticTimestamp) < 3000) return existingMission;
              if (existingMission?._optimistic && serverMission.current_count < existingMission.current_count) {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = setTimeout(() => loadAllData(true), 2000);
                return existingMission;
              }
              
              return { ...serverMission, _optimistic: false, _optimisticTimestamp: undefined, _optimisticValue: undefined };
            });
          });
        }
        
        if (statsResult?.success) setPointsEarnedToday(statsResult.pointsEarnedToday || 0);
      }
    } catch (error) {
      console.error('❌ [loadAllData] Error:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (user && isAuthenticated) {
      console.log('🔌 [PointsContext] Conectando suscripciones Real-Time...');

      const pointsSubscription = supabase
        .channel('public:user_profiles_points_update')
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 [Real-Time] Cambio de Puntos en Perfil detectado!', payload);
            
            const newPremium = payload.new.premium_points;
            const oldPremium = payload.old.premium_points;
            const newFree = payload.new.free_points;
            const oldFree = payload.old.free_points;

            if (newPremium !== oldPremium || newFree !== oldFree) {
                setTimeout(() => {
                  loadAllData(true);
                }, 500);
            }
          }
        )
        .subscribe();

      const transactionsSubscription = supabase
        .channel('public:points_transactions')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'points_transactions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 [Real-Time] Nueva Transacción!', payload);
            setTimeout(() => {
              loadAllData(true);
            }, 800);
          }
        )
        .subscribe();

      const missionsSubscription = supabase
        .channel('public:mission_progress')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mission_progress',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
             const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
             if (timeSinceOptimistic < 2000 && optimisticMissionTypeRef.current) {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = setTimeout(() => loadAllData(true), 2500);
                return;
             }
             if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
             debounceTimerRef.current = setTimeout(() => loadAllData(true), 1500);
          }
        )
        .subscribe();

      return () => {
        console.log('🔌 [PointsContext] Desconectando...');
        supabase.removeChannel(pointsSubscription);
        supabase.removeChannel(transactionsSubscription);
        supabase.removeChannel(missionsSubscription);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      };
      
    } else {
      setPoints({ total: 0, free: 0, premium: 0 });
      setMissions([]);
      setPointsEarnedToday(0);
      setLoading(false);
    }
  }, [user, isAuthenticated, loadAllData]);

  const triggerAnimation = useCallback((amount, type, colorType) => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    setPointsAnimation({ show: true, amount, type, colorType });
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPointsAnimation(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  const addPoints = useCallback(async (amount, type = 'free', actionType = 'earned', referenceId = null) => {
    if (!user || amount <= 0) return { success: false, error: 'Inválido' };
    try {
      const result = await addPointsService(user.id, amount, type, actionType, referenceId);
      if (!result?.success) throw new Error(result?.error);
      setTimeout(() => loadAllData(true), 500);
      triggerAnimation(amount, 'earn', type);
      return { success: true, newPoints: result.newPoints };
    } catch (error) {
      loadAllData(true);
      return { success: false, error: error.message };
    }
  }, [user, loadAllData, triggerAnimation]);

  const deductPoints = useCallback(async (amount, type = 'free', actionType = 'spend') => {
    if (!user || amount <= 0) return { success: false, error: 'Inválido' };
    try {
      const result = await deductPointsService(user.id, amount, type, actionType); 
      if (!result?.success) throw new Error(result?.error);
      setTimeout(() => loadAllData(true), 500);
      triggerAnimation(amount, 'deduct', type);
      return { success: true, newPoints: result.newPoints };
    } catch (error) {
      loadAllData(true);
      return { success: false, error: error.message };
    }
  }, [user, loadAllData, triggerAnimation]);

  const refreshPoints = useCallback(async () => {
    optimisticMissionTypeRef.current = null;
    lastOptimisticUpdateRef.current = 0;
    optimisticValueRef.current = null;
    await loadAllData(true);
  }, [loadAllData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
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
    deductPoints,
    refreshPoints,
    updateMissionOptimistic,
    rollbackMission,
    triggerAnimation // ✅ AGREGADO: Exportamos para control manual
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

export default PointsProvider;
