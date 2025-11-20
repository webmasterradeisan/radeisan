// src/services/pointsService.js
import { supabase } from '../lib/supabase';

/**
 * Obtener los puntos actuales del usuario desde user_profiles (La fuente de la verdad)
 * @param {string} userId - ID del usuario
 * @returns {Object} - Objeto con total, free y premium
 */
export const getUserPoints = async (userId) => {
  try {
    // ✅ ACTUALIZADO: Lee de 'user_profiles' donde está el saldo real
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
 * Obtener historial simple (últimos N movimientos)
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
 * ✅ RESTAURADO: Obtener historial PAGINADO
 * (Necesario para src/pages/user-profile-settings/index.jsx)
 */
export const getUserPointsHistory = async (userId, page = 1, limit = 10) => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from('points_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return { 
      success: true, 
      history: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching paginated history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Inicializar puntos si no existen
 * ✅ ACTUALIZADO: Verifica e inicializa en 'user_profiles'
 */
export const initializeUserPoints = async (userId) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('premium_points, free_points')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Si los puntos son NULL, los inicializamos en 0
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
// ✅ WRAPPERS Y FUNCIONES DE COMPATIBILIDAD
// (Necesarios para componentes antiguos que usan nombres específicos)
// ===========================================================

/**
 * Enviar regalo (Wrapper para la lógica nueva de la DB)
 * Necesario para: src/components/GiftPointsModal.jsx
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
 * Wrapper para sumar Puntos Gratis
 * Necesario para: src/components/PhotoQuickUpload.jsx
 */
export const addFreePoints = async (userId, amount, actionType = 'earned', referenceId = null) => {
  return await addPoints(userId, amount, 'free', actionType, referenceId);
};

/**
 * Wrapper para sumar Puntos Premium
 */
export const addPremiumPoints = async (userId, amount, actionType = 'earned', referenceId = null) => {
  return await addPoints(userId, amount, 'premium', actionType, referenceId);
};
