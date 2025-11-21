// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN GAMIFICADA FINAL 🏆
// ✅ Conecta el Modal de Celebración con el sistema de Likes.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as pointsService from '../services/pointsService'; 
import {
  getMissionsForProgressPanel,
  getMissionStats
} from '../services/missionsService';
import { supabase } from '../lib/supabase';

// 1. IMPORTACIÓN DEL MODAL (Asegúrate de que la ruta sea correcta)
import MissionCompletedModal from '../components/MissionCompletedModal'; 

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) throw new Error('usePoints must be used within PointsProvider');
  return context;
};

export const PointsProvider = ({ children }) => {
  const { user } = useAuth();
  
  // --- ESTADOS GLOBALES ---
  const [points, setPoints] = useState({ total: 0, free: 0, premium: 0 });
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS VISUALES ---
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false, amount: 0, type: 'earn', colorType: 'free'
  });

  // 2. ESTADO PARA EL MODAL DE MISIÓN
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

  // --- REAL-TIME (Escucha cambios en DB) ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('points_realtime_updates')
      .on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` 
      }, () => loadAllData(false))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'mission_progress', filter: `user_id=eq.${user.id}`
      }, () => loadAllData(false))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadAllData]);

  // --- ANIMACIONES ---
  const triggerAnimation = useCallback((amount, type = 'earn', colorType = 'free') => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    setPointsAnimation({ show: true, amount, type, colorType });
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPointsAnimation(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // 3. FUNCIÓN PARA ACTIVAR EL MODAL
  const notifyMissionComplete = (earnedPoints) => {
    console.log("🏆 MODAL ACTIVADO: Ganaste", earnedPoints);
    setMissionSuccessData({ show: true, points: earnedPoints });
  };

  const handleCloseMissionModal = () => {
    setMissionSuccessData({ show: false, points: 0 });
    // Al cerrar, recargamos datos para asegurar que el saldo se vea actualizado
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
    setMissions(prev => prev.map(m => m.mission_type === missionType ? { ...m, current_count: Math.min(m.current_count + delta, m.target_count) } : m));
  }, []);

  // Placeholder
  const updateLocalBalance = () => {}; 

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
    notifyMissionComplete // 4. EXPORTAMOS LA FUNCIÓN (¡CRÍTICO!)
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
      
      {/* 5. RENDERIZAMOS EL MODAL AQUÍ (¡CRÍTICO!) */}
      <MissionCompletedModal 
        isOpen={missionSuccessData.show} 
        points={missionSuccessData.points} 
        onClose={handleCloseMissionModal} 
      />
    </PointsContext.Provider>
  );
};

export default PointsProvider;
