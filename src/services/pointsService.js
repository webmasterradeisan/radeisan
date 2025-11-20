// src/services/pointsService.js
import { supabase } from '../lib/supabase';

/**
 * Obtener los puntos actuales del usuario desde user_profiles (La fuente de la verdad)
 */
export const getUserPoints = async (userId) => {
  try {
    // ✅ LEEMOS DE LA TABLA REAL: user_profiles
    const { data, error } = await supabase
      .from('user_profiles')
      .select('free_points, premium_points') 
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user points:', error);
      return { total: 0, free: 0, premium: 0 };
    }

    const free = data?.free_points || 0;
    const premium = data?.premium_points || 0;

    return {
      total: free + premium,
      free: free,
      premium: premium
    };
  } catch (error) {
    console.error('Error in getUserPoints:', error);
    return { total: 0, free: 0, premium: 0 };
  }
};

/**
 * Sumar puntos al usuario (Genérico)
 */
export const addPoints = async (userId, amount, type = 'free', actionType = 'earned', referenceId = null) => {
  try {
    const { data, error } = await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_action_type: actionType,
      p_reference_id: referenceId
    });

    if (error) throw error;

    return { success: true, newPoints: data };
  } catch (error) {
    console.error('Error adding points:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Deducir puntos al usuario (Genérico)
 */
export const deductPoints = async (userId, amount, type = 'free', actionType = 'spend') => {
  try {
    const { data, error } = await supabase.rpc('deduct_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_action_type: actionType
    });

    if (error) throw error;

    return { success: true, newPoints: data };
  } catch (error) {
    console.error('Error deducting points:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener historial de transacciones
 */
export const getPointsHistory = async (userId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, transactions: data };
  } catch (error) {
    console.error('Error fetching history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Inicializar puntos si no existen
 */
export const initializeUserPoints = async (userId) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('premium_points, free_points')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (profile && (profile.premium_points === null || profile.free_points === null)) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          premium_points: profile.premium_points || 0,
          free_points: profile.free_points || 0
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing points:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener historial de compras de paquetes
 */
export const getUserPurchaseHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('points_transactions') 
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', 'purchase') 
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, purchases: data || [] };
  } catch (error) {
    console.error('Error getting purchase history:', error);
    return { success: false, error: error.message };
  }
};

// ===========================================================
// ✅ FUNCIONES RESTAURADAS (Para compatibilidad con componentes viejos)
// ===========================================================

/**
 * Enviar regalo (Wrapper para la lógica nueva)
 */
export const giftPoints = async (receiverId, giftId) => {
  try {
    const { data, error } = await supabase.rpc('send_virtual_gift', {
      receiver_id: receiverId,
      gift_id: giftId
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error gifting points:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Wrapper específico para sumar Puntos Gratis
 * Soluciona el error en PhotoQuickUpload.jsx
 */
export const addFreePoints = async (userId, amount, actionType = 'earned', referenceId = null) => {
  return await addPoints(userId, amount, 'free', actionType, referenceId);
};

/**
 * Wrapper específico para sumar Puntos Premium
 */
export const addPremiumPoints = async (userId, amount, actionType = 'earned', referenceId = null) => {
  return await addPoints(userId, amount, 'premium', actionType, referenceId);
};
