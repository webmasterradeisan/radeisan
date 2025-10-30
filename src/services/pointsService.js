// src/services/pointsService.js
// ======================================================
// ✅ Servicio central de puntos — sincronizado con Supabase
// ======================================================

import { supabase } from '../lib/supabase';

/**
 * Obtiene el total actual de puntos del usuario
 */
export async function getUserPoints(userId) {
  if (!userId) return 0;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('points')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('⚠️ Error obteniendo puntos:', error.message);
    return 0;
  }

  return data?.points || 0;
}

/**
 * Añade puntos "gratuitos" (por acciones dentro de la app)
 * Usa la función RPC add_free_points() que actualiza user_profiles.points
 */
export async function addFreePoints(userId, actionType) {
  if (!userId || !actionType) {
    console.error('❌ Falta userId o actionType en addFreePoints');
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('add_free_points', {
      p_user_id: userId,
      p_action_type: actionType
    });

    if (error) throw error;

    console.log(`⭐ Puntos añadidos (${actionType}):`, data);
    return data;
  } catch (err) {
    console.error('💥 Error en addFreePoints:', err.message);
    return null;
  }
}

/**
 * Añade puntos "premium" (compras, suscripciones, etc.)
 */
export async function addPremiumPoints(userId, amount) {
  if (!userId || !amount) {
    console.error('❌ Falta userId o amount en addPremiumPoints');
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('add_premium_points', {
      p_user_id: userId,
      p_amount: amount
    });

    if (error) throw error;

    console.log(`💎 Puntos premium añadidos:`, data);
    return data;
  } catch (err) {
    console.error('💥 Error en addPremiumPoints:', err.message);
    return null;
  }
}

/**
 * Escucha cambios en tiempo real en los puntos del usuario
 */
export function subscribeToPoints(userId, callback) {
  if (!userId) return null;

  const channel = supabase
    .channel(`realtime-points-${userId}`)
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
        console.log('🔁 Realtime update de puntos:', newPoints);
        callback(newPoints);
      }
    )
    .subscribe();

  return channel;
}
