// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - MOTOR DE TIEMPO REAL
// ✅ Clave: Expone 'updateLocalBalance' para que la UI reaccione instantáneamente.
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
  const { user } = useAuth();
  
  // Estado Global
  const [points, setPoints] = useState({ total: 0, free: 0, premium: 0 });
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  // Estado de Animación
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false, amount: 0, type: 'earn', colorType: 'free'
  });

  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  const lastOptimisticUpdateRef = useRef(0);
  const optimisticMissionTypeRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // ==========================================================================
  // 🔥 FUNCIÓN MÁGICA: ACTUALIZACIÓN INSTANTÁNEA
  // ==========================================================================
  const updateLocalBalance = useCallback((amount, type = 'free') => {
    console.log(`⚡ Actualizando saldo local: +${amount} (${type})`);
    
    setPoints(prev => ({
      ...prev,
      total: (prev.total || 0) + amount,
      [type]: (prev[type] || 0) + amount // Suma inmediata visual
    }));

    if (amount > 0) {
      setPointsEarnedToday(prev => prev + amount);
    }
  }, []);

  // ==========================================================================
  // CARGA DE DATOS (SERVIDOR)
  // ==========================================================================
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current || !user) return;

    // Protección anti-rebote: Si acabamos de actualizar visualmente, no recargamos inmediatamente
    // para evitar que el servidor (lento) sobrescriba el dato nuevo con el viejo.
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

        if (missionsData.success) setMissions(missionsData.missions);
        if (statsData.success) setPointsEarnedToday(statsData.stats?.points_today || 0);
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setLoading(false);
    }
  }, [user]);

  // ==========================================================================
  // REAL-TIME (Escucha cambios de otros dispositivos)
  // ==========================================================================
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('points_realtime_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` }, () => loadAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_progress', filter: `user_id=eq.${user.id}` }, () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => loadAllData(false), 1000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadAllData]);

  // ==========================================================================
  // UTILIDADES
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
    if (res.success) { triggerAnimation(amount, 'earn', type); loadAllData(true); }
    return res;
  }, [user, loadAllData, triggerAnimation]);

  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    setMissions(prev => {
      lastOptimisticUpdateRef.current = Date.now();
      optimisticMissionTypeRef.current = missionType;
      return prev.map(m => m.mission_type === missionType ? { ...m, current_count: Math.min(m.current_count + delta, m.target_count), _optimistic: true } : m);
    });
  }, []);

  const rollbackMission = useCallback(() => loadAllData(true), [loadAllData]);
  const refreshPoints = () => loadAllData(true);

  useEffect(() => { mountedRef.current = true; loadAllData(true); return () => { mountedRef.current = false; }; }, [loadAllData]);

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
    refreshPoints,
    updateMissionOptimistic,
    rollbackMission,
    updateLocalBalance // <--- ¡ESTA ES LA IMPORTANTE!
  };

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
};

export default PointsProvider;
