// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN "GAMIFICADA" CON MODAL 🏆
// ✅ Incluye: Escucha Realtime + Modal de Misión Cumplida
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as pointsService from '../services/pointsService'; 
import { getMissionsForProgressPanel, getMissionStats } from '../services/missionsService';
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
  
  // Estados de Datos
  const [points, setPoints] = useState({ total: 0, free: 0, premium: 0 });
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  // Estados Visuales
  const [pointsAnimation, setPointsAnimation] = useState({ show: false, amount: 0, type: 'earn', colorType: 'free' });
  
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
    } catch (error) { console.error(error); if (mountedRef.current) setLoading(false); }
  }, [user]);

  // --- REALTIME (Escucha cambios en DB) ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('points_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` }, () => loadAllData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_progress', filter: `user_id=eq.${user.id}` }, () => loadAllData(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadAllData]);

  // --- FUNCIONES DE ANIMACIÓN ---
  const triggerAnimation = useCallback((amount, type = 'earn', colorType = 'free') => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    setPointsAnimation({ show: true, amount, type, colorType });
    animationTimeoutRef.current = setTimeout(() => setPointsAnimation(p => ({ ...p, show: false })), 3000);
  }, []);

  // 3. FUNCIÓN PARA ABRIR EL MODAL (Exportada)
  const notifyMissionComplete = (earnedPoints) => {
    console.log("🏆 Context: Abriendo Modal con puntos:", earnedPoints);
    setMissionSuccessData({ show: true, points: earnedPoints });
  };

  const handleCloseMissionModal = () => {
    setMissionSuccessData({ show: false, points: 0 });
    loadAllData(true); // Recarga datos al cerrar el modal
  };

  // Wrappers y Utilidades
  const addPoints = async (amount, type) => await pointsService.addPoints(user.id, amount, type);
  const deductPoints = async (amount, type) => await pointsService.deductPoints(user.id, amount, type);
  const refreshPoints = () => loadAllData(true);
  const rollbackMission = () => loadAllData(false);
  const updateMissionOptimistic = (type, delta) => setMissions(p => p.map(m => m.mission_type === type ? { ...m, current_count: m.current_count + delta } : m));
  const updateLocalBalance = () => {}; // Placeholder por compatibilidad con componentes viejos

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
    deductPoints,
    refreshPoints,
    updateMissionOptimistic,
    rollbackMission,
    updateLocalBalance,
    notifyMissionComplete // 4. EXPORTAR LA FUNCIÓN CLAVE
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
      {/* 5. RENDERIZAR EL MODAL AQUÍ */}
      <MissionCompletedModal 
        isOpen={missionSuccessData.show} 
        points={missionSuccessData.points} 
        onClose={handleCloseMissionModal} 
      />
    </PointsContext.Provider>
  );
};

export default PointsProvider;
