// src/services/pointsService.js
// ======================================================
// ✅ Servicio de puntos 100% compatible con PointsContext
// Sin callbacks globales, sin inconsistencias
// ======================================================

import { supabase } from '../lib/supabase';

// ===================================================
// 📊 Obtener puntos totales del usuario
// ===================================================
export const getUserPoints = async (userId) => {
  try {
    if (!userId) return 0;

    // ✅ Consultar tabla user_points (consistente con PointsContext)
    const { data, error } = await supabase
      .from('user_points')
      .select('total_points')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Si no existe el registro, retornar 0
      if (error.code === 'PGRST116') return 0;
      throw error;
    }

    return data?.total_points || 0;
  } catch (err) {
    console.error('❌ Error al obtener puntos:', err.message);
    return 0;
  }
};

// ===================================================
// 🎯 Agregar puntos GRATIS
// ===================================================
export const addFreePoints = async (userId, actionType) => {
  try {
    if (!userId) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase.rpc('add_free_points', {
      p_user_id: userId,
      p_action_type: actionType,
    });

    if (error) throw error;

    return {
      success: true,
      points_added: data?.points_added || 0,
      new_balance: data?.new_balance || 0,
    };
  } catch (err) {
    console.error('❌ Error al agregar puntos gratis:', err.message);
    throw err;
  }
};

// ===================================================
// 💎 Agregar puntos PREMIUM
// ===================================================
export const addPremiumPoints = async (userId, amount) => {
  try {
    if (!userId) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase.rpc('add_premium_points', {
      p_user_id: userId,
      p_points: amount,
    });

    if (error) throw error;

    return {
      success: true,
      points_added: amount,
      new_balance: data || 0,
    };
  } catch (err) {
    console.error('❌ Error al agregar puntos premium:', err.message);
    throw err;
  }
};

// ===================================================
// 🎬 Calcular puntos por duración de video (opcional)
// ===================================================
export const calculateVideoPoints = (durationInSeconds) => {
  if (durationInSeconds < 30) return 1;
  if (durationInSeconds < 60) return 3;
  if (durationInSeconds < 180) return 5;
  return 10;
};
