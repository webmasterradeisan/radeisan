// src/services/pointsService.js
// ======================================================
// ✅ Servicio global para manejar el sistema de puntos
// ======================================================

import { supabase } from '../lib/supabase';

/**
 * 🧮 Calcula los puntos de un video según sus datos
 * (duración, etiquetas, etc.)
 * -> Si no lo usas en el flujo actual, no pasa nada. No interfiere.
 */
export const calculateVideoPoints = (videoData = {}) => {
  const basePoints = 10;
  const durationBonus = videoData?.duration > 60 ? 5 : 0;
  const tagsBonus = Array.isArray(videoData?.tags) ? videoData.tags.length : 0;
  return basePoints + durationBonus + tagsBonus;
};

/**
 * 🎁 Otorga puntos gratuitos al usuario autenticado.
 * Se registra en la tabla "user_points_history" y se suma en "user_profiles"
 */
export const addFreePoints = async (points, reason = 'Acción libre', category = 'general', relatedId = null) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Usuario no autenticado');

    const userId = user.id;

    // 🔹 Inserta en el historial
    const { error: insertError } = await supabase
      .from('user_points_history')
      .insert({
        user_id: userId,
        points,
        reason,
        category,
        related_id: relatedId,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    // 🔹 Actualiza el total en user_profiles
    const { error: updateError } = await supabase.rpc('increment_user_points', {
      user_id: userId,
      points_to_add: points
    });

    if (updateError) throw updateError;

    console.log(`✅ +${points} puntos otorgados (${reason})`);
    return { success: true, points, reason };
  } catch (error) {
    console.error('❌ Error al otorgar puntos:', error.message || error);
    return { success: false, error: error.message || error };
  }
};

/**
 * 🔄 Obtiene el balance actual de puntos del usuario autenticado
 */
export const getUserPoints = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_profiles')
      .select('points')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return data?.points || 0;
  } catch (error) {
    console.error('Error obteniendo puntos del usuario:', error.message || error);
    return 0;
  }
};

/**
 * 📡 Suscribe en tiempo real a cambios en los puntos del usuario
 * Llama al callback cada vez que los puntos cambian
 */
export const subscribeToPoints = (userId, callback) => {
  if (!userId) return null;

  console.log('📡 Subscribiendo a cambios de puntos para:', userId);

  const channel = supabase
    .channel(`points-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`
      },
      async (payload) => {
        console.log('⚡ Actualización detectada:', payload);
        const newPoints = payload.new?.points ?? payload.old?.points ?? 0;
        callback(newPoints);
      }
    )
    .subscribe((status) => {
      console.log(`🔌 Canal de puntos (${userId}):`, status);
    });

  return channel;
};

/**
 * 🧾 Obtiene el historial de puntos del usuario
 */
export const getPointsHistory = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_points_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo historial de puntos:', error.message || error);
    return [];
  }
};
