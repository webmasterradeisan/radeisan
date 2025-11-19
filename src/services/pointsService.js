// src/services/pointsService.js
import { supabase } from '../lib/supabase';

/**
 * Obtener los puntos actuales del usuario desde user_profiles (La fuente de la verdad)
 * @param {string} userId - ID del usuario
 * @returns {Object} - Objeto con total, free y premium
 */
export const getUserPoints = async (userId) => {
  try {
    // ✅ LEEMOS DE LA TABLA REAL: user_profiles
    const { data, error } = await supabase
      .from('user_profiles')
      .select('free_points, premium_points') // Solo las columnas que importan
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user points:', error);
      // Si hay error, retornamos ceros para no romper la UI
      return { total: 0, free: 0, premium: 0 };
    }

    // 🔍 LOG DE DIAGNÓSTICO (Míralo en la consola del navegador con F12)
    console.log('💰 [pointsService] Saldo Real DB:', data);

    // Manejo seguro de nulos
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
 * Sumar puntos al usuario (Usando RPC para seguridad)
 */
export const addPoints = async (userId, amount, type = 'free', actionType = 'earned', referenceId = null) => {
  try {
    // Llamada a la función RPC de base de datos
    // NOTA: Asegúrate de que tu función SQL 'add_user_points' actualice 'user_profiles'
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
 * Deducir puntos al usuario
 */
export const deductPoints = async (userId, amount, type = 'free', actionType = 'spend') => {
  try {
    // Llamada a la función RPC de base de datos
    // NOTA: Asegúrate de que tu función SQL 'deduct_user_points' actualice 'user_profiles'
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
 * ✅ CORREGIDO: Ahora verifica user_profiles en lugar de user_points
 */
export const initializeUserPoints = async (userId) => {
  try {
    // 1. Verificar si el usuario ya tiene el perfil configurado
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('premium_points, free_points')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // 2. Si los puntos son NULL, los inicializamos en 0
    if (profile && (profile.premium_points === null || profile.free_points === null)) {
      console.log('🔧 [pointsService] Inicializando puntos nulos en 0...');
      
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
    // Si el error es porque no encuentra la fila, es un problema mayor de auth
    console.error('Error initializing points:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener historial de compras de paquetes
 */
export const getUserPurchaseHistory = async (userId) => {
  try {
    // Asumiendo que tienes una tabla para historial de compras de paquetes
    // Si usas 'points_transactions' para esto, ajusta la query
    const { data, error } = await supabase
      .from('points_transactions') 
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', 'purchase') // Filtramos solo compras
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, purchases: data || [] };
  } catch (error) {
    console.error('Error getting purchase history:', error);
    return { success: false, error: error.message };
  }
};
