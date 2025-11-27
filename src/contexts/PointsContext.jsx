// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN SIN DOBLE CONTEO ✅
// ✅ Fix: El Realtime NO suma, solo refresca desde la DB (fuente única de verdad)
// ✅ Fix: updateLocalBalance activo para feedback inmediato
// ✅ Fix: Al recargar página, siempre se obtiene el valor real de la DB
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
  const isUpdatingLocally = useRef(false); // 🔥 NUEVO: Flag para evitar conflictos
  
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
        // 🔥 CRÍTICO: Solo actualizar si NO estamos en medio de una actualización local
        if (!isUpdatingLocally.current) {
          setPoints({
            total: pointsData?.total || 0,
            free: pointsData?.free || 0,
            premium: pointsData?.premium || 0
          });
        }

        if (missionsData.success) setMissions(missionsData.missions);
        if (statsData.success) setPointsEarnedToday(statsData.stats?.points_today || 0);
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // --- RADAR REAL-TIME CON PROTECCIÓN ANTI-CONFLICTO ---
  useEffect(() => {
    if (!user) return;

    let timeoutId;

    const handleRealtimeUpdate = () => {
      // 🔥 Si estamos actualizando localmente, ignorar el evento de Realtime
      if (isUpdatingLocally.current) {
        console.log("⚠️ Ignorando actualización Realtime (hay actualización local en progreso)");
        return;
      }
      
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        console.log("🔄 Sincronizando datos con la Base de Datos (Realtime)...");
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
  const notifyMissionComplete = (earnedPoints, missionMessage) => {
    console.log("🚀 Orden recibida: Mostrar Modal (+ " + earnedPoints + ")");
    setMissionSuccessData({ show: true, points: earnedPoints, message: missionMessage });
  };

  const handleCloseMissionModal = () => {
    setMissionSuccessData({ show: false, points: 0 });
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

  // 🔥 NUEVO: Refrescar misiones desde el servidor
  const refreshMissions = useCallback(async () => {
    if (!mountedRef.current || !user) return;

    try {
      console.log('🔄 Refrescando misiones desde servidor...');
      
      const missionsData = await getMissionsForProgressPanel();
      
      if (mountedRef.current && missionsData.success) {
        setMissions(missionsData.missions);
        console.log('✅ Misiones actualizadas:', missionsData.missions);
      }
    } catch (error) {
      console.error('❌ Error refrescando misiones:', error);
    }
  }, [user]);

  // --- ACTUALIZACIÓN VISUAL INMEDIATA (CON PROTECCIÓN) ---
  const updateLocalBalance = useCallback((amount) => {
    console.log(`💰 Balance local actualizado: +${amount}`);
    
    // 🔥 ACTIVAR FLAG: Estamos actualizando localmente
    isUpdatingLocally.current = true;
    
    setPoints(prev => ({
      ...prev,
      total: (prev.total || 0) + amount,
      free: (prev.free || 0) + amount
    }));
    setPointsEarnedToday(prev => (prev || 0) + amount);
    triggerAnimation(amount, 'earn', 'free');
    
    // 🔥 DESACTIVAR FLAG después de 3 segundos (suficiente para que Realtime no interfiera)
    setTimeout(() => {
      isUpdatingLocally.current = false;
      console.log("✅ Flag de actualización local desactivado");
    }, 3000);
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
    refreshMissions,  // 🔥 NUEVO: Exportar función
    
    // EXPORTAMOS ESTO PARA MissionNotificationContainer.jsx
    missionSuccessData,      
    handleCloseMissionModal  
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

export default PointsProvider;
