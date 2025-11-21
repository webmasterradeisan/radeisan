// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - OPTIMIZADO PARA FEEDBACK INSTANTÁNEO ⚡
// ✅ Se agregó 'updateLocalBalance' para sumar puntos visualmente al instante.
// ✅ Se mantiene la sincronización real con Supabase de respaldo.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as pointsService from '../services/pointsService'; 
import {
  getMissionsForProgressPanel,
  getMissionStats
} from '../services/missionsService';
import { supabase } from '../lib/supabase';

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) throw new Error('usePoints must be used within PointsProvider');
  return context;
};

export const PointsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth(); // Mantenemos tu desestructuración original
  
  // Estado Global
  const [points, setPoints] = useState({ total: 0, free: 0, premium: 0 });
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  // Estado de Animación
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false, amount: 0, type: 'earn', colorType: 'free'
  });

  // Refs
  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  const lastOptimisticUpdateRef = useRef(0);
  const optimisticMissionTypeRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // ==========================================================================
  // 1. ACTUALIZACIÓN OPTIMISTA Y MANUAL (NUEVO)
  // ==========================================================================
  
  // 🔥 ESTA ES LA FUNCIÓN QUE FALTA PARA QUE SEA INSTANTÁNEO
  const updateLocalBalance = useCallback((amount, type = 'free') => {
    if (!mountedRef.current) return;
    
    setPoints(prev => ({
      ...prev,
      total: (prev.total || 0) + amount,
      [type]: (prev[type] || 0) + amount
    }));

    if (amount > 0) {
      setPointsEarnedToday(prev => prev + amount);
    }
  }, []);

  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    setMissions(prev => {
      lastOptimisticUpdateRef.current = Date.now();
      optimisticMissionTypeRef.current = missionType;
      
      return prev.map(mission => {
        if (mission.mission_type === missionType) {
          const newCount = Math.min(mission.current_count + delta, mission.target_count);
          return { 
            ...mission, 
            current_count: newCount, 
            _optimistic: true 
          };
        }
        return mission;
      });
    });
  }, []);

  const rollbackMission = useCallback(() => {
    loadAllData(true);
  }, []);

  // ==========================================================================
  // 2. CARGA DE DATOS
  // ==========================================================================

  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current || !user) return;

    // Evitar sobreescritura si acabamos de hacer una actualización optimista (< 2s)
    if (!forceRefresh && optimisticMissionTypeRef.current && (Date.now() - lastOptimisticUpdateRef.current < 2000)) {
      return;
    }

    try {
      if (forceRefresh) setLoading(true);

      const [pointsData, missionsData, statsData] = await Promise.all([
        pointsService.getUserPoints(user.id), 
        getMissionsForProgressPanel(),
        getMissionStats()
      ]);

      if (mountedRef.current) {
        setPoints({
          total: pointsData?.total || 0,
          free: pointsData?.free || 0,
          premium: pointsData?.premium || 0
        });

        if (missionsData.success) {
          setMissions(missionsData.missions);
        }

        if (statsData.success) {
          setPointsEarnedToday(statsData.stats?.points_today || 0);
        }
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Error cargando datos de puntos:', error);
      setLoading(false);
    }
  }, [user]);

  // ==========================================================================
  // 3. REAL-TIME SUBSCRIPTIONS
  // ==========================================================================

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('points_realtime_updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_profiles', 
        filter: `id=eq.${user.id}` 
      }, (payload) => {
        loadAllData(true);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mission_progress',
        filter: `user_id=eq.${user.id}`
      }, () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => loadAllData(false), 1000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadAllData]);

  // ==========================================================================
  // 4. FUNCIONES EXPORTADAS
  // ==========================================================================

  const triggerAnimation = useCallback((amount, type = 'earn', colorType = 'free') => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    setPointsAnimation({ show: true, amount, type, colorType });
    
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPointsAnimation(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  const addPoints = useCallback(async (amount, type = 'free') => {
    const res = await pointsService.addPoints(user.id, amount, type);
    if (res.success) {
        triggerAnimation(amount, 'earn', type);
        loadAllData(true);
    }
    return res;
  }, [user, loadAllData, triggerAnimation]);

  const deductPoints = useCallback(async (amount, type = 'free') => {
    const res = await pointsService.deductPoints(user.id, amount, type);
    if (res.success) {
        triggerAnimation(amount, 'deduct', type);
        loadAllData(true);
    }
    return res;
  }, [user, loadAllData, triggerAnimation]);

  const refreshPoints = () => loadAllData(true);

  // Inicialización
  useEffect(() => {
    mountedRef.current = true;
    loadAllData(true);
    return () => { 
        mountedRef.current = false;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [loadAllData]);

  const value = {
    totalPoints: points.total,
    freePoints: points.free,
    premiumPoints: points.premium,
    missions,
    pointsEarnedToday,
    loading,
    pointsAnimation,
    triggerAnimation,      
    addPoints,
    deductPoints,          
    refreshPoints,
    updateMissionOptimistic,
    rollbackMission,
    updateLocalBalance // <--- IMPORTANTE: Ahora está disponible para ReelsContainer
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

export default PointsProvider;
