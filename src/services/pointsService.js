// src/services/pointsService.js
import { supabase } from '../lib/supabase';

// ===================================================
// SISTEMA GLOBAL DE CALLBACK PARA SINCRONIZAR CONTEXTO
// ===================================================
let pointsContextCallback = null;

export const setPointsContextCallback = (callback) => {
  pointsContextCallback = callback;
};

// ===================================================
// FUNCIÓN: Obtener los puntos actuales del usuario
// ===================================================
export const getUserPoints = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('points')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return data?.points || 0;
  } catch (err) {
    console.error('❌ Error al obtener puntos del usuario:', err.message);
    return 0;
  }
};

// ===================================================
// FUNCIÓN: Suscribirse a cambios en tiempo real
// ===================================================
export const subscribeToPoints = (userId, onPointsChange) => {
  if (!userId) return null;

  const channel = supabase
    .channel('realtime-points')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const newPoints = payload.new?.points ?? 0;
        onPointsChange(newPoints);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// ===================================================
// FUNCIÓN: Agregar puntos GRATIS
// ===================================================
export const addFreePoints = async (points, reason = 'acción gratuita', referenceType = null, referenceId = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Llamar función RPC
    const { data, error } = await supabase.rpc('add_free_points', {
      p_user_id: user.id,
      p_points: points,
      p_reason: reason,
      p_reference_type: referenceType,
      p_reference_id: referenceId,
    });

    if (error) throw error;

    // ✅ Notificar al contexto global
    if (pointsContextCallback) {
      pointsContextCallback(points, reason, 'free');
    }

    return {
      success: true,
      points_added: points,
      new_balance: data,
    };
  } catch (err) {
    console.error('❌ Error al agregar puntos gratis:', err.message);
    throw err;
  }
};

// ===================================================
// FUNCIÓN: Agregar puntos PREMIUM (comprados o bonus VIP)
// ===================================================
export const addPremiumPoints = async (points, reason = 'puntos premium', referenceType = null, referenceId = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase.rpc('add_premium_points', {
      p_user_id: user.id,
      p_points: points,
      p_reason: reason,
      p_reference_type: referenceType,
      p_reference_id: referenceId,
    });

    if (error) throw error;

    // ✅ Notificar al contexto global
    if (pointsContextCallback) {
      pointsContextCallback(points, reason, 'premium');
    }

    return {
      success: true,
      points_added: points,
      new_balance: data,
    };
  } catch (err) {
    console.error('❌ Error al agregar puntos premium:', err.message);
    throw err;
  }
};

// ===================================================
// OPCIONAL: Calcular puntos por video (si aplica)
// ===================================================
export const calculateVideoPoints = (durationInSeconds) => {
  // Reglas básicas: puedes personalizar
  if (durationInSeconds < 30) return 1;
  if (durationInSeconds < 60) return 3;
  if (durationInSeconds < 180) return 5;
  return 10;
};
