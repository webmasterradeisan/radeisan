// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - CON "ESCUDO ANTI-REBOTE" 🛡️
// ✅ Solución: Bloquea la lectura del servidor por 3 segundos tras ganar puntos
//    para evitar que el saldo viejo sobrescriba al nuevo.
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
  
  // 🛡️ EL ESCUDO: Timestamp de la última actualización manual
  const lastManualUpdateRef = useRef(0); 
  
  const debounceTimerRef = useRef(null);

  // ==========================================================================
  // 1. ACTUALIZACIÓN MANUAL (INSTANTÁNEA)
  // ==========================================================================
  const updateLocalBalance = useCallback((amount, type = 'free') => {
    if (!mountedRef.current) return;
    
    // 1. Activamos el ESCUDO: "No escuches al servidor por 3 segundos"
    lastManualUpdateRef.current = Date.now(); 

    // 2. Actualizamos la pantalla YA
    setPoints(prev => ({
      ...prev,
      total: (prev.total || 0) + amount,
      [type]: (prev[type] || 0) + amount
    }));

    if (amount > 0) {
      setPointsEarnedToday(prev => prev + amount);
    }
    console.log(`⚡ Saldo actualizado visualmente: +${amount}`);
  }, []);

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

  // ==========================================================================
  // 2. CARGA DE DATOS (SERVIDOR) - CON PROTECCIÓN
  // ==========================================================================
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current || !user) return;

    // 🛡️ LÓGICA DEL ESCUDO:
    // Si hace menos de 3 segundos hicimos una actualización manual,
    // ABORTAMOS la carga del servidor para no traer datos viejos.
    const timeSinceManualUpdate = Date.now() - lastManualUpdateRef.current;
    if (!forceRefresh && timeSinceManualUpdate < 3000) {
      console.log("🛡️ Escudo activo: Ignorando datos del servidor para proteger el saldo visual.");
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
        // Doble chequeo por si el usuario ganó puntos MIENTRAS cargaba la data
        if (Date.now() - lastManualUpdateRef.current < 3000) {
             console.log("🛡️ Escudo activo post-carga: Descartando datos lentos.");
             setLoading(false);
             return;
        }

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
  // 3. REAL-TIME (Escucha cambios)
  // ==========================================================================
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('points_realtime_updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_profiles', 
        filter: `id=eq.${user.id}` 
      }, () => {
        // Cuando llega un evento real, intentamos cargar, 
        // pero loadAllData respetará el escudo si está activo.
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

    return () => { supabase.removeChannel(channel); };
  }, [user, loadAllData]);

  // ==========================================================================
  // 4. UTILIDADES Y EXPORTACIÓN
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
        // Al usar addPoints manual, también activamos el escudo
        updateLocalBalance(amount, type); 
        triggerAnimation(amount, 'earn', type);
    }
    return res;
  }, [user, updateLocalBalance, triggerAnimation]); // Quitamos loadAllData directo

  const deductPoints = useCallback(async (amount, type = 'free') => {
    const res = await pointsService.deductPoints(user.id, amount, type);
    if (res.success) {
        updateLocalBalance(-amount, type);
        triggerAnimation(amount, 'deduct', type);
    }
    return res;
  }, [user, updateLocalBalance, triggerAnimation]);

  const refreshPoints = () => loadAllData(true);
  const rollbackMission = useCallback(() => loadAllData(true), [loadAllData]);

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
    updateLocalBalance 
  };

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
};

export default PointsProvider;
