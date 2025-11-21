// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN "GAMIFICADA" CON MODAL Y REALTIME 🏆
// ✅ Incluye: Escucha Realtime a DB (Técnica Regalo).
// ✅ Incluye: Lógica para disparar el Modal de Misión Cumplida.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as pointsService from '../services/pointsService'; 
import {
  getMissionsForProgressPanel,
  getMissionStats
} from '../services/missionsService';
import { supabase } from '../lib/supabase';

// 1. IMPORTACIÓN OBLIGATORIA DEL MODAL
// Asegúrate de tener el archivo en src/components/MissionCompletedModal.jsx
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

  // --- ESTADOS VISUALES (ANIMACIONES) ---
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false, amount: 0, type: 'earn', colorType: 'free'
  });

  // 2. ESTADO PARA EL MODAL DE MISIÓN (¡NUEVO!)
  const [missionSuccessData, setMissionSuccessData] = useState({ show: false, points: 0 });

  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  
  // --- CARGA DE DATOS DESDE SERVIDOR ---
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

  // --- SISTEMA REAL-TIME (LA TÉCNICA DEL REGALO) ---
  // Escucha cambios en la base de datos y actualiza el saldo solo.
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('points_realtime_updates')
      // Escuchar cambios en el SALDO (user_profiles)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_profiles', 
        filter: `id=eq.${user.id}` 
      }, () => {
        loadAllData(false); // Recarga silenciosa (sin spinner)
      })
      // Escuchar cambios en el PROGRESO (mission_progress)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mission_progress',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadAllData(false); // Recarga silenciosa
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadAllData]);

  // --- FUNCIONES DE ANIMACIÓN (MONEDAS VOLADORAS) ---
  const triggerAnimation = useCallback((amount, type = 'earn', colorType = 'free') => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    setPointsAnimation({ show: true, amount, type, colorType });
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPointsAnimation(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // 3. FUNCIÓN PARA ACTIVAR EL MODAL (¡LA CLAVE!)
  // Esta función la llamará ReelsContainer cuando detecte éxito.
  const notifyMissionComplete = (earnedPoints) => {
    console.log("🏆 MODAL ACTIVADO: Ganaste", earnedPoints);
    setMissionSuccessData({ show: true, points: earnedPoints });
  };

  // Al cerrar el modal, forzamos una recarga de datos para asegurar que todo esté sincronizado
  const handleCloseMissionModal = () => {
    setMissionSuccessData({ show: false, points: 0 });
    loadAllData(true); 
  };

  // --- WRAPPERS Y UTILIDADES ---
  const addPoints = useCallback(async (amount, type = 'free') => {
    const res = await pointsService.addPoints(user.id, amount, type);
    if (res.success) {
        triggerAnimation(amount, 'earn', type);
        // No necesitamos updateLocalBalance manual, el Realtime lo hará.
    }
    return res;
  }, [user, triggerAnimation]);

  const deductPoints = useCallback(async (amount, type = 'free') => {
    const res = await pointsService.deductPoints(user.id, amount, type);
    if (res.success) {
        triggerAnimation(amount, 'deduct', type);
    }
    return res;
  }, [user, triggerAnimation]);

  const refreshPoints = () => loadAllData(true);
  const rollbackMission = useCallback(() => loadAllData(true), [loadAllData]);
  
  // Actualización optimista de la barra de misiones (solo visual)
  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    setMissions(prev => {
      return prev.map(mission => {
        if (mission.mission_type === missionType) {
          const newCount = Math.min(mission.current_count + delta, mission.target_count);
          return { ...mission, current_count: newCount, _optimistic: true };
        }
        return mission;
      });
    });
  }, []);

  // Placeholder para compatibilidad (ya no se usa lógica manual, pero para que no rompa código viejo)
  const updateLocalBalance = () => {}; 

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
    notifyMissionComplete // 4. EXPORTAMOS LA FUNCIÓN
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
      
      {/* 5. RENDERIZAMOS EL MODAL AQUÍ PARA QUE SEA GLOBAL */}
      <MissionCompletedModal 
        isOpen={missionSuccessData.show} 
        points={missionSuccessData.points} 
        onClose={handleCloseMissionModal} 
      />
    </PointsContext.Provider>
  );
};

export default PointsProvider;
