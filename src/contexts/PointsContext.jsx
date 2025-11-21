// src/contexts/PointsContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from 'lib/supabase';
import { getMissionsForProgressPanel } from '../services/missionsService'; 

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
  
  // Estado para animación
  const [pointsAnimation, setPointsAnimation] = useState({ show: false, amount: 0, type: 'free' });

  // Carga de datos
  const loadAllData = useCallback(async () => {
    if (!user) {
      setPoints({ free: 0, premium: 0 });
      setMissions([]);
      setLoading(false);
      return;
    }

    try {
      // Cargar Puntos
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

      // Cargar Misiones
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

  // Acciones
  const triggerAnimation = (amount, type = 'earn', pointType = 'free') => {
    setPointsAnimation({ show: true, amount, type: pointType }); // type visual
    setTimeout(() => setPointsAnimation({ show: false, amount: 0, type: 'free' }), 2000);
  };

  const addPoints = async (amount, reason, type = 'free') => {
    // Optimistic update
    setPoints(prev => ({
      ...prev,
      [type]: prev[type] + amount
    }));
    setPointsEarnedToday(prev => prev + amount);
    triggerAnimation(amount, 'earn', type);
  };

  // ✅ RESTAURADO: Función deductPoints (necesaria para compras manuales o UI legacy)
  const deductPoints = async (amount, type = 'free') => {
      // Esta función es mayormente visual/optimista ahora, 
      // ya que el backend (SQL) maneja la resta real en la tienda.
      setPoints(prev => ({
          ...prev,
          [type]: Math.max(0, prev[type] - amount)
      }));
      return { success: true };
  };

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

  const rollbackMission = (previousMissionsState) => {
    if (previousMissionsState && Array.isArray(previousMissionsState)) {
        console.log("🔄 Rolling back missions state...");
        setMissions(previousMissionsState);
    }
  };

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
      deductPoints, // ✅ Exportado de nuevo
      updateMissionOptimistic,
      rollbackMission,
      refreshPoints,
      triggerAnimation // ✅ Exportado de nuevo
    }}>
      {children}
    </PointsContext.Provider>
  );
};
