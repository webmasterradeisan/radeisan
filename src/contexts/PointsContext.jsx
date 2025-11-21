// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN "SINCRO SEGURA" 🛡️
// ✅ Fix: Debounce en Realtime (Espera 1.5s antes de recargar la DB).
// ✅ Fix: updateLocalBalance activo para feedback instantáneo.
// ✅ Gestión centralizada del Modal de Misiones.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as pointsService from '../services/pointsService'; 
import {
  getMissionsForProgressPanel,
  getMissionStats
} from '../services/missionsService';
import { supabase } from '../lib/supabase';

// 1. IMPORTACIÓN DEL MODAL
import MissionCompletedModal from '../components/MissionCompletedModal'; 

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

  // 2. ESTADO DEL MODAL DE MISIÓN
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

  // --- RADAR REAL-TIME CON FRENO (DEBOUNCE) 🛑 ---
  // Esto evita que el frontend lea el saldo "viejo" antes de que la DB termine de escribir.
  useEffect(() => {
    if (!user) return;

    let timeoutId;

    const handleRealtimeUpdate = () => {
      // Si llega otro evento rápido, cancelamos el anterior y esperamos de nuevo
      if (timeoutId) clearTimeout(timeoutId);
      
      // Esperamos 1.5 segundos para asegurar que la DB esté lista
      timeoutId = setTimeout(() => {
        console.log("🔄 Sincronizando datos con la Base de Datos...");
        loadAllData(false);
      }, 1500); 
    };

    const channel = supabase.channel('points_ecosystem_updates')
      // Escuchar cambios en SALDO
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_profiles', 
        filter: `id=eq.${user.id}` 
      }, handleRealtimeUpdate)
      // Escuchar cambios en MISIONES
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mission_progress',
        filter: `user_id=eq.${user.id}`
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

  // 3. FUNCIÓN PARA DISPARAR EL MODAL
  const notifyMissionComplete = (earnedPoints) => {
    console.log("🚀 Misión Cumplida! Puntos:", earnedPoints);
    setMissionSuccessData({ show: true, points: earnedPoints });
  };

  const handleCloseMissionModal = () => {
    setMissionSuccessData({ show: false, points: 0 });
    loadAllData(true); // Recarga final al cerrar para asegurar coherencia
  };

  // --- WRAPPERS DE SERVICIO ---
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

  // Actualización Optimista (Misiones)
  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    setMissions(prev => prev.map(m => {
      if (m.mission_type === missionType) {
        return { ...m, current_count: Math.min(m.current_count + delta, m.target_count), _optimistic: true };
      }
      return m;
    }));
  }, []);

  // 4. 🔥 ACTUALIZACIÓN OPTIMISTA (BALANCE)
  // Esta función suma puntos visualmente AL INSTANTE, sin esperar a la DB.
  const updateLocalBalance = useCallback((amount) => {
    console.log(`💰 Actualizando balance local: +${amount}`);
    
    setPoints(prev => ({
      ...prev,
      total: (prev.total || 0) + amount,
      free: (prev.free || 0) + amount
    }));
    
    setPointsEarnedToday(prev => (prev || 0) + amount);
    
    // Disparamos la animación de monedas también
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
    updateLocalBalance, // ✅ Exportado para ReelsContainer
    notifyMissionComplete
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
      
      {/* 5. RENDERIZAMOS EL MODAL GLOBAL */}
      <MissionCompletedModal 
        isOpen={missionSuccessData.show} 
        points={missionSuccessData.points} 
        onClose={handleCloseMissionModal} 
      />
    </PointsContext.Provider>
  );
};

export default PointsProvider;
