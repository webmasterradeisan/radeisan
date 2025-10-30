// src/contexts/PointsContext.jsx
// ======================================================
// ✅ Contexto global de puntos del usuario (estable y sin loops)
// ======================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  getUserPoints,
  addFreePoints,
  addPremiumPoints,
} from '../services/pointsService';

const PointsContext = createContext();

export const PointsProvider = ({ children }) => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // 🔁 CARGAR PUNTOS UNA SOLA VEZ AL ENTRAR
  // ======================================================
  const fetchPoints = useCallback(async () => {
    if (!user?.id) return;
    try {
      const total = await getUserPoints(user.id);
      if (typeof total === 'number') setPoints(total);
    } catch (err) {
      console.error('❌ Error obteniendo puntos:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ======================================================
  // 🧠 SUSCRIPCIÓN EN TIEMPO REAL (SIN LOOP)
  // ======================================================
  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    fetchPoints();

    const channel = supabase
      .channel(`points_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 Cambio detectado en puntos:', payload);
          fetchPoints(); // solo actualiza sin cambiar dependencias
        }
      )
      .subscribe(); // ⚠️ sin callback

    return () => {
      console.log('🧹 Canal cerrado');
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchPoints]);

  // ======================================================
  // ➕ FUNCIONES PÚBLICAS
  // ======================================================
  const giveFreePoints = useCallback(
    async (actionType) => {
      if (!user?.id) return;
      try {
        const updated = await addFreePoints(user.id, actionType);
        if (updated?.points_added) {
          setPoints((p) => p + updated.points_added);
        }
      } catch (err) {
        console.error('❌ Error sumando puntos free:', err);
      }
    },
    [user?.id]
  );

  const givePremiumPoints = useCallback(
    async (amount) => {
      if (!user?.id) return;
      try {
        const updated = await addPremiumPoints(user.id, amount);
        if (updated?.points_added) {
          setPoints((p) => p + updated.points_added);
        }
      } catch (err) {
        console.error('❌ Error sumando puntos premium:', err);
      }
    },
    [user?.id]
  );

  const value = {
    points,
    loading,
    refreshPoints: fetchPoints,
    giveFreePoints,
    givePremiumPoints,
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

// ======================================================
// ✅ Hook para usar fácilmente el contexto
// ======================================================
export const usePoints = () => {
  const ctx = useContext(PointsContext);
  if (!ctx)
    throw new Error('usePoints debe usarse dentro de un <PointsProvider>');
  return ctx;
};
