// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN SEGURA
// ✅ Mantiene 'deductPoints' y 'triggerAnimation' (Evita pantalla blanca).
// ✅ Incluye actualización optimista para el feedback instantáneo de misiones.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from 'lib/supabase';
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

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) throw new Error('usePoints must be used within a PointsProvider');
  return context;
};

export const PointsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [points, setPoints] = useState({ free: 0, premium: 0, total: 0 });
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Estado para animación
  const [pointsAnimation, setPointsAnimation] = useState({ show: false, amount: 0, type: 'free' });

  const animationTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // Función triggerAnimation (Exportada)
  const triggerAnimation = useCallback((amount, type = 'earn', pointType = 'free') => {
    if (!mountedRef.current) return;
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    
    setPointsAnimation({ show: true, amount, type, pointType });
    
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPointsAnimation(prev => ({ ...prev, show: false }));
    }, 2500);
  }, []);

  // Carga de Datos
  const loadAllData = useCallback(async (force = false) => {
    if (!user) {
      if (mountedRef.current) {
        setPoints({ total: 0, free: 0, premium: 0 });
        setMissions([]);
        setLoading(false);
      }
      return;
    }

    try {
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

      const missionsData = await getMissionsForProgressPanel(user.id);
      if (mountedRef.current) setMissions(missionsData || []);

    } catch (error) {
      console.error('Error loading points:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Realtime
  useEffect(() => {
    loadAllData();
    if (!user) return;
    
    const subscription = supabase.channel('points_update')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` }, (payload) => {
        if (mountedRef.current) {
            setPoints({
                total: payload.new.free_points + payload.new.premium_points,
                free: payload.new.free_points,
                premium: payload.new.premium_points
            });
            // Recargar misiones por si se completó alguna
            getMissionsForProgressPanel(user.id).then(data => {
                if (mountedRef.current) setMissions(data);
            });
        }
      }).subscribe();
      
    return () => { supabase.removeChannel(subscription); };
  }, [user, loadAllData]);

  // Acciones
  const addPoints = useCallback(async (amount, reason, type = 'free') => {
    if (!user) return { success: false };
    setPoints(prev => ({ ...prev, [type]: prev[type] + amount, total: prev.total + amount }));
    setPointsEarnedToday(prev => prev + amount);
    triggerAnimation(amount, 'earn', type);
    return { success: true };
  }, [user, triggerAnimation]);

  // ✅ FUNCIÓN MANTENIDA (DEDUCT POINTS)
  const deductPoints = useCallback(async (amount, type = 'free', actionType = 'spend') => {
    if (!user) return { success: false };
    setPoints(prev => ({ ...prev, [type]: Math.max(0, prev[type] - amount) }));

    try {
      const result = await deductPointsService(user.id, amount, type, actionType); 
      if (!result?.success) throw new Error(result?.error);
      triggerAnimation(amount, 'deduct', type);
      return { success: true };
    } catch (error) {
      loadAllData(true);
      return { success: false, error: error.message };
    }
  }, [user, loadAllData, triggerAnimation]);

  // ✅ FUNCIÓN NUEVA (OPTIMISTIC UPDATE - Anti-Farming Visual)
  const updateMissionOptimistic = useCallback((missionKeyOrType, incrementBy = 1) => {
    setMissions(prevMissions => {
      return prevMissions.map(mission => {
        if (mission.mission_key === missionKeyOrType || mission.mission_type === missionKeyOrType) {
            const newCount = mission.current_count + incrementBy;
            const isNowCompleted = mission.target_count > 0 && newCount >= mission.target_count;
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

  // ✅ FUNCIÓN NUEVA (ROLLBACK)
  const rollbackMission = useCallback((previousMissionsState) => {
    if (previousMissionsState && Array.isArray(previousMissionsState)) {
        setMissions(previousMissionsState);
    }
  }, []);

  const refreshPoints = useCallback(async () => { await loadAllData(true); }, [loadAllData]);

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
    deductPoints, // ✅ Disponible
    refreshPoints,
    updateMissionOptimistic, // ✅ Disponible
    rollbackMission, // ✅ Disponible
    triggerAnimation // ✅ Disponible
  };

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
};
