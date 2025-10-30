// src/contexts/PointsContext.jsx
// ======================================================
// ✅ Contexto global y estable de puntos (100% compatible con Supabase v2)
// Sin bloqueos, sin bucles infinitos, sin errores t.unsubscribe
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
  // 🔁 Cargar puntos iniciales del usuario
  // ======================================================
  const fetchPoints = useCallback(async () => {
    if (!user?.id) return;
    try {
      const total = await getUserPoints(user.id);
      if (typeof total === 'number') {
        setPoints(total);
      }
    } catch (error) {
      console.error('❌ Error al obtener puntos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ======================================================
  // 🧠 Suscripción en tiempo real segura (sin loops)
  // ======================================================
  useEffect(() => {
    if (!user?.id) return;

    fetchPoints(); // cargar puntos iniciales

    console.log('📡 Suscribiendo a cambios en user_points...');

    const channel = supabase
      .channel(`user_points_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🎯 Cambio detectado en user_points:', payload);
          // Actualizamos solo si cambió el balance
          if (payload?.new?.total_points !== undefined) {
            setPoints(payload.new.total_points);
          } else {
            fetchPoints(); // fallback si no hay total_points
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de canal realtime:', status);
      });

    // Cleanup al desmontar
    return () => {
      console.log('🧹 Cerrando canal realtime de puntos');
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchPoints]);

  // ======================================================
  // ➕ Funciones públicas
  // ======================================================
  const giveFreePoints = useCallback(
    async (actionType) => {
      if (!user?.id) return;
      try {
        const updated = await addFreePoints(user.id, actionType);
        if (updated?.points_added) {
          setPoints((prev) => prev + updated.points_added);
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
          setPoints((prev) => prev + updated.points_added);
        }
      } catch (err) {
        console.error('❌ Error sumando puntos premium:', err);
      }
    },
    [user?.id]
  );

  // ======================================================
  // 💾 Valor expuesto al contexto
  // ======================================================
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
// ✅ Hook para usar el contexto fácilmente
// ======================================================
export const usePoints = () => {
  const ctx = useContext(PointsContext);
  if (!ctx)
    throw new Error('usePoints debe usarse dentro de un <PointsProvider>');
  return ctx;
};
