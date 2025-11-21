// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - VERSIÓN "REALTIME PURO" (TÉCNICA REGALO) 🎁
// ✅ Sin escudos, sin bloqueos.
// ✅ Escucha directamente a la base de datos. Si la DB cambia, la App cambia.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as pointsService from '../services/pointsService'; 
import { getMissionsForProgressPanel, getMissionStats } from '../services/missionsService';
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

  // ==========================================================================
  // 1. CARGA DE DATOS (Simple y Directa)
  // ==========================================================================
  const loadAllData = useCallback(async (forceLoadingSpinner = false) => {
    if (!mountedRef.current || !user) return;

    try {
      if (forceLoadingSpinner) setLoading(true);

      // Ejecutamos todo en paralelo
      const [pointsData, missionsData, statsData] = await Promise.all([
        pointsService.getUserPoints(user.id), 
        getMissionsForProgressPanel(),
        getMissionStats()
      ]);

      if (mountedRef.current) {
        // Actualizar Puntos
        setPoints({
          total: pointsData?.total || 0,
          free: pointsData?.free || 0,
          premium: pointsData?.premium || 0
        });

        // Actualizar Misiones
        if (missionsData.success) setMissions(missionsData.missions);
        
        // Actualizar Estadística diaria
        if (statsData.success) setPointsEarnedToday(statsData.stats?.points_today || 0);
        
        setLoading(false);
        console.log("✅ Datos actualizados desde el Servidor");
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // ==========================================================================
  // 2. REAL-TIME: LA TÉCNICA DEL REGALO 🎁
  // ==========================================================================
  useEffect(() => {
    if (!user) return;

    console.log("🔌 Conectando canal Realtime para Puntos...");

    const channel = supabase.channel('public:user_profiles_points')
      .on(
        'postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_profiles', 
          filter: `id=eq.${user.id}` // Solo escuchamos cambios en MI usuario
        }, 
        (payload) => {
          console.log("🔔 ¡CAMBIO DETECTADO EN DB! Recargando puntos...", payload);
          // Si la DB cambió (SQL ejecutado), recargamos los datos inmediatamente
          loadAllData(false); 
          
          // Opcional: Si quieres animar basado en la diferencia real
          if (payload.new && payload.old) {
             const diff = (payload.new.free_points || 0) - (payload.old.free_points || 0);
             if (diff > 0) triggerAnimation(diff, 'earn', 'free');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Insert o Update
          schema: 'public',
          table: 'mission_progress',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Si avanzó una misión, también recargamos para actualizar la barra
          loadAllData(false);
        }
      )
      .subscribe((status) => {
         if (status === 'SUBSCRIBED') console.log("✅ Escuchando cambios de saldo en tiempo real");
      });

    return () => { supabase.removeChannel(channel); };
  }, [user, loadAllData]); // Dependencias limpias

  // ==========================================================================
  // 3. UTILIDADES VISUALES (Optimistas pero no bloqueantes)
  // ==========================================================================
  
  const triggerAnimation = useCallback((amount, type = 'earn', colorType = 'free') => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    setPointsAnimation({ show: true, amount, type, colorType });
    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPointsAnimation(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // Actualización Local Manual (Solo para feedback instantáneo, no bloquea al server)
  const updateLocalBalance = useCallback((amount, type = 'free') => {
    setPoints(prev => ({
      ...prev,
      total: (prev.total || 0) + amount,
      [type]: (prev[type] || 0) + amount
    }));
    if (amount > 0) setPointsEarnedToday(prev => prev + amount);
  }, []);

  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    setMissions(prev => prev.map(m => 
      m.mission_type === missionType 
        ? { ...m, current_count: Math.min(m.current_count + delta, m.target_count), _optimistic: true }
        : m
    ));
  }, []);

  // Funciones Wrapper
  const addPoints = async (amount, type = 'free') => {
    const res = await pointsService.addPoints(user.id, amount, type);
    return res; // Ya no llamamos updateLocalBalance aquí, dejamos que el Realtime lo haga
  };

  const deductPoints = async (amount, type = 'free') => {
    const res = await pointsService.deductPoints(user.id, amount, type);
    return res;
  };

  const refreshPoints = () => loadAllData(true);
  const rollbackMission = () => loadAllData(false);

  // Carga inicial
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
    updateLocalBalance 
  };

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
};

export default PointsProvider;
