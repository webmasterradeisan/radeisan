// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - ARQUITECTURA "ECOSISTEMA UNIFICADO" 🏆
// Basado en el éxito del módulo de Regalos:
// 1. Escucha Realtime (Radar) para el saldo.
// 2. Gestión centralizada del Modal de Celebración.
// 3. Actualización Optimista del Balance (Nuevo Fix).
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as pointsService from '../services/pointsService'; 
import {
  getMissionsForProgressPanel,
  getMissionStats
} from '../services/missionsService';
import { supabase } from '../lib/supabase';

// 1. IMPORTACIÓN DEL MODAL (Pieza clave visual)
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

  // --- ESTADO VISUAL (ANIMACIONES DE MONEDAS) ---
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false, amount: 0, type: 'earn', colorType: 'free'
  });

  // 2. ESTADO DEL MODAL DE MISIÓN (El gatillo visual)
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

  // --- RADAR REAL-TIME (Igual que en GiftNotificationContext) ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('points_ecosystem_updates')
      // Escuchar cambios en SALDO (Como en Regalos)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_profiles', 
        filter: `id=eq.${user.id}` 
      }, () => loadAllData(false))
      // Escuchar cambios en MISIONES
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mission_progress',
        filter: `user_id=eq.${user.id}`
      }, () => loadAllData(false))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadAllData]);

  // --- FUNCIONES VISUALES ---
  const triggerAnimation = useCallback((amount, type = 'earn', colorType = 'free') => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    setPointsAnimation({ show: true, amount, type, colorType });
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPointsAnimation(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // 3. FUNCIÓN PARA DISPARAR EL MODAL (La que usa ReelsContainer)
  const notifyMissionComplete = (earnedPoints) => {
    console.log("🚀 Evento Misión Cumplida Recibido:", earnedPoints);
    setMissionSuccessData({ show: true, points: earnedPoints });
  };

  const handleCloseMissionModal = () => {
    setMissionSuccessData({ show: false, points: 0 });
    // Recarga estratégica al cerrar para asegurar sincronización total con DB
    loadAllData(true);
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

  // Actualización Optimista (Barra de progreso de Misión)
  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    setMissions(prev => prev.map(m => {
      if (m.mission_type === missionType) {
        return { ...m, current_count: Math.min(m.current_count + delta, m.target_count), _optimistic: true };
      }
      return m;
    }));
  }, []);

  // 4. 🔥 CORRECCIÓN CRÍTICA: Actualización del Balance Local
  // Esta función permite sumar puntos visualmente SIN esperar a la DB
  const updateLocalBalance = useCallback((amount) => {
    setPoints(prev => ({
      ...prev,
      total: (prev.total || 0) + amount,
      free: (prev.free || 0) + amount
    }));
    setPointsEarnedToday(prev => (prev || 0) + amount);
  }, []);

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
    updateLocalBalance, // Exportamos la función corregida
    notifyMissionComplete
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
      
      {/* 5. RENDERIZAMOS EL MODAL GLOBAL (Siempre disponible) */}
      <MissionCompletedModal 
        isOpen={missionSuccessData.show} 
        points={missionSuccessData.points} 
        onClose={handleCloseMissionModal} 
      />
    </PointsContext.Provider>
  );
};

export default PointsProvider;
