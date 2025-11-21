// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN FINAL "ARQUITECTURA LIMPIA" 💎
// ✅ Fix: Debounce en Realtime (Espera 1.5s).
// ✅ Fix: updateLocalBalance activo.
// ✅ Fix: EXPORTA los datos del modal pero NO LO RENDERIZA (Lo hace Routes.jsx).
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as pointsService from '../services/pointsService'; 
import {
  getMissionsForProgressPanel,
  getMissionStats
} from '../services/missionsService';
import { supabase } from '../lib/supabase';

// ⚠️ NOTA: Ya no importamos MissionCompletedModal aquí para evitar duplicados.

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) throw new Error('usePoints must be used within PointsProvider');
  return context;
};

export const PointsProvider = ({ children }) => {
  const { user } = useAuth();
  
  // --- ESTADO GLOBAL ---
  const [points, setPoints] = useState({ total: 0, free: 0, premium: 0 });
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- ESTADO VISUAL (ANIMACIONES) ---
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false, amount: 0, type: 'earn', colorType: 'free'
  });

  // --- ESTADO DEL MODAL DE MISIÓN (Datos puros) ---
  const [missionSuccessData, setMissionSuccessData] = useState({ show: false, points: 0 });

  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  
  // --- CARGA DE DATOS ---
  const loadAllData = useCallback(async (forceLoadingSpinner = false) => {
    if (!mountedRef.current || !user) return;

    try {
      if (forceLoadingSpinner) setLoading(true);

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
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // --- RADAR REAL-TIME CON FRENO (DEBOUNCE) ---
  useEffect(() => {
    if (!user) return;

    let timeoutId;

    const handleRealtimeUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        console.log("🔄 Sincronizando datos con la Base de Datos...");
        loadAllData(false);
      }, 1500); 
    };

    const channel = supabase.channel('points_ecosystem_updates')
      .on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` 
      }, handleRealtimeUpdate)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'mission_progress', filter: `user_id=eq.${user.id}`
      }, handleRealtimeUpdate)
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, loadAllData]);

  // --- FUNCIONES VISUALES ---
  const triggerAnimation = useCallback((amount, type = 'earn', colorType = 'free') => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    setPointsAnimation({ show: true, amount, type, colorType });
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPointsAnimation(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // --- CONTROL DEL MODAL ---
  const notifyMissionComplete = (earnedPoints) => {
    console.log("🚀 Orden recibida: Mostrar Modal (+ " + earnedPoints + ")");
    setMissionSuccessData({ show: true, points: earnedPoints });
  };

  const handleCloseMissionModal = () => {
    setMissionSuccessData({ show: false, points: 0 });
    loadAllData(true); 
  };

  // --- WRAPPERS ---
  const addPoints = useCallback(async (amount, type = 'free') => {
    const res = await pointsService.addPoints(user.id, amount, type);
    if (res.success) triggerAnimation(amount, 'earn', type);
    return res;
  }, [user, triggerAnimation]);

  const deductPoints = useCallback(async (amount, type = 'free') => {
    const res = await pointsService.deductPoints(user.id, amount, type);
    if (res.success) triggerAnimation(amount, 'deduct', type);
    return res;
  }, [user, triggerAnimation]);

  const refreshPoints = () => loadAllData(true);
  const rollbackMission = useCallback(() => loadAllData(true), [loadAllData]);

  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    setMissions(prev => prev.map(m => {
      if (m.mission_type === missionType) {
        return { ...m, current_count: Math.min(m.current_count + delta, m.target_count), _optimistic: true };
      }
      return m;
    }));
  }, []);

  // --- ACTUALIZACIÓN VISUAL INMEDIATA ---
  const updateLocalBalance = useCallback((amount) => {
    console.log(`💰 Balance local actualizado: +${amount}`);
    setPoints(prev => ({
      ...prev,
      total: (prev.total || 0) + amount,
      free: (prev.free || 0) + amount
    }));
    setPointsEarnedToday(prev => (prev || 0) + amount);
    triggerAnimation(amount, 'earn', 'free');
  }, [triggerAnimation]);

  // Inicialización
  useEffect(() => {
    mountedRef.current = true;
    loadAllData(true);
    return () => { mountedRef.current = false; };
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
    updateLocalBalance,
    notifyMissionComplete,

    // ✅ EXPORTAMOS ESTO PARA MissionNotificationContainer.jsx
    missionSuccessData,      
    handleCloseMissionModal  
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
      
      {/* 🚫 YA NO RENDERIZAMOS EL MODAL AQUÍ */}
      {/* El trabajo visual ahora lo hace Routes.jsx -> MissionNotificationContainer */}
      
    </PointsContext.Provider>
  );
};

export default PointsProvider;
