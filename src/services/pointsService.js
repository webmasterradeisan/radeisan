// src/services/pointsService.js
// ============================================================================
// ✅ FIX: 'calculateVideoPointsFull' ajustado para usar COLUMNAS EXISTENTES:
//         'action_type' y 'metadata' para multiplicadores, basándose en el esquema del usuario.
// ✅ FIX: Valores de FALLBACK de Puntos Base y Bono Vertical alineados a la configuración del Admin (30 y 0).
// ✅ NUEVO: LÓGICA DE REGALO DE PUNTOS (giftPoints)
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================
export const PREMIUM_POINTS_MULTIPLIER = 2;
const TRANSACTION_TABLE = 'points_transactions';
const INIT_POINTS_RPC_NAME = 'ensure_user_points_record'; 
const UPDATE_POINTS_RPC_NAME = 'update_user_points';

// ✅ NUEVA CONSTANTE RPC para REGALAR PUNTOS
const GIFT_POINTS_RPC_NAME = 'rpc_gift_points'; 

// Constantes de reglas (AJUSTADAS AL ESQUEMA DEL USUARIO: ASUMIMOS QUE action_type TIENE ESTOS VALORES)
const BASE_UPLOAD_RULE = 'video_base'; // Usaremos 'video_base' en lugar de 'video_base_upload'
const DURATION_RULE = 'points_per_minute'; // Usaremos 'points_per_minute' en lugar de 'video_points_per_minute'
const VERTICAL_BONUS_RULE = 'vertical_bonus'; // Usaremos 'vertical_bonus' en lugar de 'video_vertical_bonus'

// ============================================================================
// CÁLCULO Y VALOR (EXPORTACIONES NOMBRADAS)
// ============================================================================

/**
 * Calcula los puntos totales ganados por un video subido,
 * basándose en la duración, categoría y orientación (dinámico de BD).
 */
export const calculateVideoPointsFull = async (durationSeconds, categoryId, orientation) => {
    
    // Paso 1: Obtener reglas de la tabla points_rules
    const { data: rules, error } = await supabase
        .from('points_rules')
        .select('*');

    if (error) {
        console.error("❌ Error al cargar reglas de puntos:", error);
        // 🛑 CORRECCIÓN: Fallback alineado con la configuración base (30 pts)
        return { total_points: 30, base_points: 30, category_multiplier: 1.0, orientation_bonus: 0, category_name: categoryId };
    }

    // Convertir reglas a un mapa usando action_type como clave
    const rulesMap = rules.reduce((acc, rule) => {
        acc[rule.action_type] = { 
            amount: rule.points_amount || 0,
            metadata: rule.metadata || {}
        };
        return acc;
    }, {});

    // Paso 2: Obtener el slug de la categoría (si se usa el ID) y el multiplicador
    let categorySlug = categoryId; // Usaremos el ID temporalmente si no podemos obtener el slug
    let categoryMultiplier = 1.0;
    let categoryName = categoryId;
    
    try {
        const { data: categoryData } = await supabase
            .from('content_categories')
            .select('slug, points_multiplier, is_multiplier_enabled, name')
            .eq('id', categoryId)
            .single();

        if (categoryData) {
            categorySlug = categoryData.slug;
            categoryName = categoryData.name;
            
            if (categoryData.is_multiplier_enabled !== false) {
                categoryMultiplier = categoryData.points_multiplier || 1.0;
            }
        }
    } catch (e) {
        console.warn("⚠️ No se pudo obtener el multiplicador de la categoría por ID. Usando x1.0");
    }

    // 1. Puntos Base de la acción 
    // 🛑 CORRECCIÓN: Fallback ajustado de 50 a 30
    const basePoints = rulesMap[BASE_UPLOAD_RULE]?.amount || 30; 

    // 2. Puntos por Duración
    // 🛑 CORRECCIÓN: Fallback ajustado de 10 a 0 (si la DB lo tiene en 0, lo respetará)
    const pointsPerMinute = rulesMap[DURATION_RULE]?.amount || 0; 
    const durationPoints = Math.floor(durationSeconds / 60) * pointsPerMinute;

    let subtotal = basePoints + durationPoints;
    
    // 3. Aplicar Multiplicador de Categoría
    const pointsWithCategory = Math.round(subtotal * categoryMultiplier);

    // 4. Bonus por Orientación Vertical (Reel)
    let orientationBonus = 0;
    if (orientation === 'vertical') {
        // 🛑 CORRECCIÓN: Fallback ajustado de 10 a 0 para respetar la configuración del Admin
        orientationBonus = rulesMap[VERTICAL_BONUS_RULE]?.amount || 0; 
    }

    // 5. Total
    const totalPoints = pointsWithCategory + orientationBonus;

    return {
        total_points: totalPoints,
        base_points: subtotal, // Puntos base + duración sin multiplicar
        points_with_category: pointsWithCategory, // Subtotal con multiplicador
        category_multiplier: categoryMultiplier,
        orientation_bonus: orientationBonus,
        category_name: categoryName
    };
};

export const calculatePremiumValue = (premiumPoints) => {
    return premiumPoints * PREMIUM_POINTS_MULTIPLIER;
};

// ============================================================================
// LÓGICA DE REGALO DE PUNTOS (NUEVA)
// ============================================================================

/**
 * Llama al RPC de Supabase para transferir puntos del emisor al receptor.
 * @param {string} senderId - ID del usuario que regala.
 * @param {string} receiverId - ID del usuario que recibe.
 * @param {number} amount - Cantidad de puntos a regalar (debe ser puntos 'free').
 * @param {string} contentType - Tipo de contenido ('video', 'photo', 'reel').
 * @param {string} contentId - ID del contenido.
 * @returns {Promise<{success: boolean, message: string, newSenderPoints?: object}>}
 */
export const giftPoints = async (senderId, receiverId, amount, contentType, contentId) => {
    if (!senderId || !receiverId || amount <= 0) {
        return { success: false, message: 'Datos de regalo inválidos.' };
    }
    
    try {
        console.log(`📡 Llamando RPC ${GIFT_POINTS_RPC_NAME}: ${amount} de ${senderId} a ${receiverId}`);

        const rpcParams = {
            p_sender_id: senderId,
            p_receiver_id: receiverId,
            p_amount: amount,
            p_content_type: contentType,
            p_content_id: contentId
        };
        
        // Supabase RPC se encargará de:
        // 1. Verificar saldo del emisor.
        // 2. Deducción y registro de transacción para el emisor.
        // 3. Adición y registro de transacción para el receptor.
        const { data, error } = await supabase.rpc(GIFT_POINTS_RPC_NAME, rpcParams);

        if (error) {
            console.error(`❌ Error en RPC ${GIFT_POINTS_RPC_NAME}:`, error);
            // El RPC debe devolver un error claro (ej: 'No hay saldo suficiente')
            return { success: false, message: error.message }; 
        }
        
        // El RPC debe devolver el nuevo saldo del emisor o un mensaje de éxito.
        return { 
            success: true, 
            message: data?.message || `Regalo de ${amount} puntos enviado con éxito.`,
            newSenderPoints: { free: data?.sender_free_points || 0, premium: data?.sender_premium_points || 0 }
        };

    } catch (error) {
        console.error('❌ Excepción en giftPoints:', error);
        return { success: false, message: `Error inesperado: ${error.message}` };
    }
};


// ============================================================================
// INICIALIZACIÓN DE PUNTOS
// ============================================================================

export const initializeUserPoints = async (userId) => {
  if (!userId) return false;
  try {
    const { error } = await supabase.rpc(INIT_POINTS_RPC_NAME, {
        p_user_id: userId
    });
    if (error) {
        console.error('❌ Error RPC en initializeUserPoints:', error);
        await supabase.from('user_points').insert({ user_id: userId, free_points: 0, premium_points: 0 }).onConflict('user_id').single();
    }
    return true;
  } catch (error) {
    console.error('❌ Excepción al inicializar puntos:', error);
    return false;
  }
};


// ============================================================================
// OBTENER PUNTOS DEL USUARIO (LECTURA)
// ============================================================================

export const getUserPoints = async (userId) => {
  try {
    if (!userId) return { free: 0, premium: 0, total: 0 };
    const { data, error } = await supabase.rpc('get_user_points', {
      p_user_id: userId
    });
    if (error) {
      console.error('❌ Error en RPC get_user_points:', error);
      return { free: 0, premium: 0, total: 0 };
    }
    const total = (data?.free_points || 0) + (data?.premium_points || 0);
    return {
      free: data?.free_points || 0,
      premium: data?.premium_points || 0,
      total: data?.total_points || total
    };
  } catch (error) {
    console.error('❌ Error en getUserPoints (excepción):', error);
    return { free: 0, premium: 0, total: 0 };
  }
};


// ============================================================================
// REGISTRAR TRANSACCIÓN (Para Historial)
// ============================================================================

export const trackPointsAction = async (userId, amount, pointType, actionType, referenceId) => {
  try {
    const { error } = await supabase
      .from(TRANSACTION_TABLE)
      .insert({
        user_id: userId,
        points_change: amount, 
        point_type: pointType,
        transaction_type: actionType, 
        reference_id: referenceId,
      });
    if (error) {
      console.error(`❌ Error registrando acción ${actionType} de puntos:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Excepción al registrar acción de puntos:', error);
    return false;
  }
};

// ============================================================================
// SUMAR/RESTAR PUNTOS (FUNCIÓN CORE QUE LLAMA AL RPC)
// ============================================================================

export const updatePointsBalance = async (userId, amount, type, actionType, referenceId = null) => {
  try {
    console.log(`📡 Preparando RPC ${UPDATE_POINTS_RPC_NAME}: ${amount} ${type} para ${userId}`);

    let free_change = 0;
    let premium_change = 0;

    if (type === 'free') {
      free_change = amount;
    } else if (type === 'premium') {
      premium_change = amount;
    }

    const rpcParams = {
      p_user_id: userId,
      p_free_points_change: free_change,
      p_premium_points_change: premium_change,
      p_transaction_type: actionType,
      p_reference_id: referenceId
    };
    
    const { data, error } = await supabase.rpc(UPDATE_POINTS_RPC_NAME, rpcParams);

    if (error) {
        throw error; 
    }
    
    return data || { free_points: 0, premium_points: 0 }; 

  } catch (error) {
    console.error('❌ Error en RPC update_user_points:', error);
    throw error;
  }
};

// ============================================================================
// ALIASES DE INTERFAZ (Exportaciones de uso común)
// ============================================================================

export const addPoints = async (userId, amount, type, actionType, referenceId = null) => {
    try {
        const balanceResult = await updatePointsBalance(userId, amount, type, actionType, referenceId);
        return { 
            success: true, 
            newPoints: { 
                free: balanceResult.free_points, 
                premium: balanceResult.premium_points 
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const deductPoints = async (userId, amount, type, actionType, referenceId = null) => {
    try {
        const balanceResult = await updatePointsBalance(userId, -amount, type, actionType, referenceId);
        return { 
            success: true, 
            newPoints: { 
                free: balanceResult.free_points, 
                premium: balanceResult.premium_points 
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};


export const addFreePoints = async (userId, amount, actionType, referenceId = null) => {
    return addPoints(userId, amount, 'free', actionType, referenceId);
};

// ============================================================================
// HISTORIAL DE PUNTOS (CON FILTROS Y PAGINACIÓN)
// ============================================================================

const PAGE_SIZE = 10; // Cuántos items cargar por página

/**
 * Obtener el historial de puntos (transacciones) del usuario.
 * Acepta filtros de fecha y paginación.
 */
export const getUserPointsHistory = async (userId, options = {}) => {
  const { startDate, endDate, page = 1 } = options;
  
  if (!userId) {
    return { success: false, error: 'User ID is required', data: [], hasMore: false };
  }
  
  try {
    let query = supabase
      .from(TRANSACTION_TABLE)
      .select('*', { count: 'exact' }) // Pedimos el conteo total
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Aplicar filtros de fecha si existen
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    // Aplicar paginación
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }
    
    // Calcular si hay más páginas
    const hasMore = (from + data.length) < count;
    
    return { success: true, data, hasMore, count };
    
  } catch (error) {
    console.error('Error fetching points history:', error);
    return { success: false, error: error.message, data: [], hasMore: false };
  }
};

// ============================================================================
// EXPORTACIONES POR DEFECTO
// ============================================================================

export default {
  getUserPoints,
  initializeUserPoints, 
  trackPointsAction,
  updatePointsBalance,
  calculateVideoPoints: calculateVideoPointsFull, // Exportamos la versión completa con alias
  addPoints, 
  deductPoints,
  calculatePremiumValue,
  PREMIUM_POINTS_MULTIPLIER,
  getUserPointsHistory, // <-- Función actualizada
  giftPoints // ✅ NUEVA FUNCIÓN EXPORTADA
};
