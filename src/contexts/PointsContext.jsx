// src/contexts/PointsContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getUserTotalPoints } from '../services/pointsService';

const PointsContext = createContext();

export const PointsProvider = ({ children }) => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ Obtiene los puntos desde Supabase RPC
  const fetchPoints = useCallback(async () => {
    if (!user?.id) return;
    try {
      const total = await getUserTotalPoints(user.id);
      setPoints(total || 0);
    } catch (error) {
      console.error('❌ Error obteniendo puntos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ✅ Escucha cambios en tiempo real desde la tabla points_transactions
  useEffect(() => {
    if (!user?.id) return;

    fetchPoints();

    const channel = supabase
      .channel(`points_sync_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Cambio en puntos detectado (Realtime):', payload);
          fetchPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPoints]);

  const addLocalPoints = useCallback((amount) => {
    setPoints((prev) => prev + amount);
  }, []);

  return (
    <PointsContext.Provider
      value={{
        points,
        loading,
        refreshPoints: fetchPoints,
        addLocalPoints,
      }}
    >
      {children}
    </PointsContext.Provider>
  );
};

export const usePoints = () => useContext(PointsContext);
