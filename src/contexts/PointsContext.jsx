// src/contexts/PointsContext.jsx 
// ======================================================
// ✅ Contexto global de puntos del usuario
// Sincronizado en tiempo real con Supabase (100% funcional)
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
  const [channel, setChannel] = useState(null);

  // ======================================
  // 🔁 CARGAR PUNTOS AL INICIAR SESIÓN
  // ======================================
  const fetchPoints = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const total = await getUserPoints(user.id);
      if (typeof total === 'number') setPoints(total);
    } catch (err) {
      console.error('❌ Error obteniendo puntos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ======================================
  // 🧠 SUSCRIPCIÓN EN TIEMPO REAL
  // ======================================
  useEffect(() => {
    if (!user?.id) return;

    // Cargar puntos iniciales
    fetchPoints();

    // Crear canal realtime
    const pointsChannel = supabase
      .channel(`points_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('🔔 Cambio detectado en puntos:', payload);
          await fetchPoints();
        }
      )
      .subscribe((status) => {
        console.log('📡 Canal de puntos:', status);
      });

    setChannel(pointsChannel);

    // Limpieza
    return () => {
      console.log('🧹 Cerrando canal de puntos...');
      if (pointsChannel) supabase.removeChannel(pointsChannel);
    };
  }, [user, fetchPoints]);

  // ======================================
  // ➕ FUNCIONES PÚBLICAS
  // ======================================
  const giveFreePoints = useCallback(
    async (actionType) => {
      if (!user?.id) return;
      try {
        const updated = await addFreePoints(user.id, actionType);
        if (updated?.points_added) {
          setPoints((prev) => prev + updated.points_added);
        }
      } catch (err) {
        console.error('❌ Error al sumar puntos free:', err);
      }
    },
    [user]
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
        console.error('❌ Error al sumar puntos premium:', err);
      }
    },
    [user]
  );

  const value = {
    points,
    loading,
    giveFreePoints,
    givePremiumPoints,
    refreshPoints: fetchPoints,
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

// ======================================================
// ✅ Hook para acceder al contexto fácilmente
// ======================================================
export const usePoints = () => {
  const ctx = useContext(PointsContext);
  if (!ctx) {
    throw new Error('usePoints debe usarse dentro de un <PointsProvider>');
  }
  return ctx;
};
