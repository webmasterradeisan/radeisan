// src/services/pointsService.js
import { supabase } from '../lib/supabase';

// ✅ Obtener total de puntos de un usuario desde función SQL
export const getUserTotalPoints = async (userId) => {
  const { data, error } = await supabase.rpc('get_user_total_points', {
    p_user_id: userId,
  });
  if (error) throw error;
  return data || 0;
};

// ✅ Agregar puntos gratis (acciones normales)
export const addFreePoints = async (userId, typeId = 1, reason = 'acción gratuita') => {
  const { error } = await supabase.rpc('add_free_points', {
    p_user_id: userId,
    p_type_id: typeId,
    p_reason: reason,
  });
  if (error) throw error;
  return true;
};

// ✅ Agregar puntos premium (por compras u otros)
export const addPremiumPoints = async (userId, typeId = 2, reason = 'premium') => {
  const { error } = await supabase.rpc('add_premium_points', {
    p_user_id: userId,
    p_type_id: typeId,
    p_reason: reason,
  });
  if (error) throw error;
  return true;
};
