// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - FINAL BUILD FIX
// ✅ Importaciones limpias y verificadas.
// ✅ Gestión de estado inmutable (Anti-Farming visual).
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from 'lib/supabase';
import { getMissionsForProgressPanel } from '../services/missionsService'; // ✅ Solo importamos lo que usamos

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) throw new Error('usePoints must be used within a PointsProvider');
  return context;
};

export const PointsProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [points, setPoints] = useState({ free: 0, premium: 0 });
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Estado para animación (+50 pts)
  const [pointsAnimation, setPointsAnimation] = useState({ show: false, amount: 0, type: 'free' });

  // ==========================================
  // CARGA DE DATOS
  // ==========================================
  const loadAllData = useCallback(async () => {
    if (!user) {
      setPoints({ free: 0, premium: 0 });
      setMissions([]);
      setLoading(false);
      return;
    }

    try {
      // 1. Cargar Puntos (Perfil)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('free_points, premium_points')
        .eq('id', user.id)
        .single();

      if (profile) {
        setPoints({ 
          free: profile.free_points || 0, 
          premium: profile.premium_points || 0 
        });
      }

      // 2. Cargar Misiones
      const missionsData = await getMissionsForProgressPanel(user.id);
      setMissions(missionsData || []);

    } catch (error) {
      console.error('Error loading points context:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllData();
    
    if (!user) return;
    
    const subscription = supabase
      .channel('points_update')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        setPoints({
          free: payload.new.free_points,
          premium: payload.new.premium_points
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user, loadAllData]);


  // ==========================================
  // MÉTODOS DE ACCIÓN
  // ==========================================

  // 1. Sumar puntos localmente + animación
  const addPoints = async (amount, reason, type = 'free') => {
    setPoints(prev => ({
      ...prev,
      [type]: prev[type] + amount
    }));
    
    setPointsEarnedToday(prev => prev + amount);
    
    setPointsAnimation({ show: true, amount, type });
    setTimeout(() => setPointsAnimation({ show: false, amount: 0, type: 'free' }), 2000);
  };

  // 2. Actualizar Misión (Optimista e Inmutable)
  const updateMissionOptimistic = (missionKeyOrType, incrementBy = 1) => {
    setMissions(prevMissions => {
      return prevMissions.map(mission => {
        if (mission.mission_key === missionKeyOrType || mission.mission_type === missionKeyOrType) {
            const newCount = mission.current_count + incrementBy;
            const isNowCompleted = mission.target_count > 0 && newCount >= mission.target_count;

            return {
                ...mission,
                current_count: newCount,
                is_completed: mission.is_completed || isNowCompleted
            };
        }
        return mission;
      });
    });
  };

  // 3. Rollback
  const rollbackMission = (previousMissionsState) => {
    if (previousMissionsState && Array.isArray(previousMissionsState)) {
        console.log("🔄 Rolling back missions state...");
        setMissions(previousMissionsState);
    }
  };

  // 4. Refrescar todo
  const refreshPoints = async () => {
    await loadAllData();
  };

  return (
    <PointsContext.Provider value={{
      totalPoints: points.free + points.premium, 
      freePoints: points.free,
      premiumPoints: points.premium,
      missions,
      pointsEarnedToday,
      loading,
      pointsAnimation,
      addPoints,
      updateMissionOptimistic,
      rollbackMission,
      refreshPoints
    }}>
      {children}
    </PointsContext.Provider>
  );
};
