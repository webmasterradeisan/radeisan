// src/contexts/PointsContext.jsx
// ======================================================
// ✅ Contexto global de puntos del usuario
// Sincronizado en tiempo real con Supabase
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
  subscribeToPoints,
  addFreePoints,
  addPremiumPoints,
} from '../services/pointsService';

const PointsContext = createContext();

export const PointsProvider = ({ children }) => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState(null);

  // ======================================
  // 🔁 CARGAR PUNTOS AL INICIAR SESIÓN
  // ======================================
  const fetchPoints = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const total = await getUserPoints(user.id);
    setPoints(total);
    setLoading(false);
  }, [user]);

  // ======================================
  // 🧠 SINCRONIZAR EN TIEMPO REAL
  // ======================================
  useEffect(() => {
    if (!user?.id) return;

    // 1️⃣ Cargar puntos iniciales
    fetchPoints();

    // 2️⃣ Suscribirse a cambios en tiempo real
    const channel = subscribeToPoints(user.id, (newPoints) => {
      setPoints(newPoints);
    });

    setRealtimeChannel(channel);

    // 3️⃣ Limpiar al salir
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, fetchPoints]);

  // ======================================
  // ➕ FUNCIONES PÚBLICAS
  // ======================================
  const giveFreePoints = useCallback(
    async (actionType) => {
      if (!user?.id) return;
      const updated = await addFreePoints(user.id, actionType);
      if (updated) {
        setPoints((prev) => prev + updated?.points_added || 0);
      }
    },
    [user]
  );

  const givePremiumPoints = useCallback(
    async (amount) => {
      if (!user?.id) return;
      const updated = await addPremiumPoints(user.id, amount);
      if (updated) {
        setPoints((prev) => prev + (updated?.points_added || 0));
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
