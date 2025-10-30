// src/hooks/usePointsSync.js
// ======================================================
// ✅ Hook que sincroniza los puntos globales del usuario
// con Supabase en tiempo real
// ======================================================

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { subscribeToPoints } from '../services/pointsService';
import { supabase } from '../lib/supabase';

export function usePointsSync() {
  const { user } = useAuth();
  const { refreshPoints } = usePoints();

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 usePointsSync iniciado para usuario:', user.id);

    // 1️⃣ Cargar puntos iniciales al montar
    refreshPoints();

    // 2️⃣ Escuchar actualizaciones en tiempo real
    const channel = subscribeToPoints(user.id, (newPoints) => {
      console.log('⚡ Actualización de puntos recibida:', newPoints);
      refreshPoints();
    });

    // 3️⃣ Limpieza
    return () => {
      if (channel) {
        console.log('🧹 Eliminando canal de puntos');
        supabase.removeChannel(channel);
      }
    };
  }, [user, refreshPoints]);
}
