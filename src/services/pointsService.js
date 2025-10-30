// src/services/pointsService.js
// Servicio completo para el sistema de puntos dual (gratis + premium)

import { supabase } from '../lib/supabase';

// ========================================
// ✅ NUEVO: Sistema de Callback para PointsContext
// ========================================
let pointsContextCallback = null;

export const setPointsContextCallback = (callback) => {
  pointsContextCallback = callback;
};

/**
 * ========================================
 * SERVICIO DE PUNTOS DUAL
 * ========================================
 * Gestiona todos los aspectos del sistema de puntos:
 * - Puntos Gratis (free_points): Ganados por actividad
 * - Puntos Premium (premium_points): Comprados con dinero real
 * - Ambos sirven para canjear recompensas
 * - Los premium se usan primero al canjear
 */

// ========================================
// 1. CONSULTAS DE BALANCE
// ========================================

/**
 * Obtener el balance de puntos del usuario actual
 * @returns {Promise<Object>} Balance de puntos con historial
 */
export const getUserPointsBalance = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener balance de puntos
    const { data: pointsData, error: pointsError } = await supabase
      .from('points_types')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (pointsError && pointsError.code !== 'PGRST116') { // PGRST116 = no rows
      throw pointsError;
    }

    // Si no existe registro, crear uno nuevo
    if (!pointsData) {
      const { data: newBalance, error: createError } = await supabase
        .from('points_types')
        .insert({
          user_id: user.id,
          free_points: 0,
          premium_points: 0,
          total_free_earned: 0,
          total_premium_purchased: 0,
          total_free_spent: 0,
          total_premium_spent: 0
        })
        .select()
        .single();

      if (createError) throw createError;
      
      return {
        balance: newBalance,
        total_points: 0,
        free_points: 0,
        premium_points: 0
      };
    }

    return {
      balance: pointsData,
      total_points: pointsData.free_points + pointsData.premium_points,
      free_points: pointsData.free_points,
      premium_points: pointsData.premium_points,
      stats: {
        total_free_earned: pointsData.total_free_earned,
        total_premium_purchased: pointsData.total_premium_purchased,
        total_free_spent: pointsData.total_free_spent,
        total_premium_spent: pointsData.total_premium_spent
      }
    };

  } catch (error) {
    console.error('Error al obtener balance de puntos:', error);
    throw error;
  }
};

/**
 * Obtener balance de puntos de un usuario específico (admin)
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Balance de puntos
 */
export const getUserPointsBalanceById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('points_types')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return {
        free_points: 0,
        premium_points: 0,
        total_points: 0
      };
    }

    return {
      ...data,
      total_points: data.free_points + data.premium_points
    };

  } catch (error) {
    console.error('Error al obtener balance de usuario:', error);
    throw error;
  }
};

// ========================================
// 2. AGREGAR PUNTOS
// ========================================

/**
 * Agregar puntos gratis al usuario
 * @param {number} points - Cantidad de puntos a agregar
 * @param {string} reason - Razón de la transacción
 * @param {string} referenceType - Tipo de referencia ('video', 'photo', 'mission', etc)
 * @param {string} referenceId - ID de la referencia
 * @returns {Promise<Object>} Resultado de la transacción
 */
export const addFreePoints = async (points, reason, referenceType = null, referenceId = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Llamar a la función SQL que maneja la lógica de agregar puntos
    const { data, error } = await supabase.rpc('add_free_points', {
      p_user_id: user.id,
      p_points: points,
      p_reason: reason,
      p_reference_type: referenceType,
      p_reference_id: referenceId
    });

    if (error) throw error;

    // ✅ NUEVO: Notificar al contexto de puntos
    if (pointsContextCallback) {
      pointsContextCallback(points, reason, 'free');
    }

    return {
      success: true,
      points_added: points,
      new_balance: data
    };

  } catch (error) {
    console.error('Error al agregar puntos gratis:', error);
    throw error;
  }
};

/**
 * Agregar puntos premium al usuario (compra)
 * @param {number} points - Cantidad de puntos premium a agregar
 * @param {string} reason - Razón de la transacción
 * @param {string} transactionId - ID de la transacción de pago
 * @returns {Promise<Object>} Resultado de la transacción
 */
export const addPremiumPoints = async (points, reason = 'Compra de puntos premium', transactionId = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Llamar a la función SQL
    const { data, error } = await supabase.rpc('add_premium_points', {
      p_user_id: user.id,
      p_points: points,
      p_reason: reason,
      p_reference_type: 'purchase',
      p_reference_id: transactionId
    });

    if (error) throw error;

    // ✅ NUEVO: Notificar al contexto de puntos
    if (pointsContextCallback) {
      pointsContextCallback(points, reason, 'premium');
    }

    return {
      success: true,
      points_added: points,
      new_balance: data
    };

  } catch (error) {
    console.error('Error al agregar puntos premium:', error);
    throw error;
  }
};

// ========================================
// 3. DEDUCIR PUNTOS (CANJE)
// ========================================

/**
 * Deducir puntos del usuario (usa premium primero, luego gratis)
 * @param {number} points - Cantidad de puntos a deducir
 * @param {string} reason - Razón de la deducción
 * @param {string} referenceType - Tipo de referencia ('reward', etc)
 * @param {string} referenceId - ID de la referencia
 * @returns {Promise<Object>} Resultado de la deducción
 */
export const deductPoints = async (points, reason, referenceType = null, referenceId = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar que el usuario tenga suficientes puntos
    const balance = await getUserPointsBalance();
    if (balance.total_points < points) {
      throw new Error(`Puntos insuficientes. Necesitas ${points} puntos, tienes ${balance.total_points}`);
    }

    // Llamar a la función SQL que maneja la lógica de deducción
    const { data, error } = await supabase.rpc('deduct_points', {
      p_user_id: user.id,
      p_points: points,
      p_reason: reason,
      p_reference_type: referenceType,
      p_reference_id: referenceId
    });

    if (error) throw error;

    // ✅ NUEVO: Notificar al contexto de puntos (gasto)
    if (pointsContextCallback) {
      pointsContextCallback(-points, reason, 'spend');
    }

    return {
      success: true,
      points_deducted: points,
      new_balance: data
    };

  } catch (error) {
    console.error('Error al deducir puntos:', error);
    throw error;
  }
};

// ========================================
// 4. TRANSACCIONES E HISTORIAL
// ========================================

/**
 * Obtener historial de transacciones del usuario
 * @param {Object} options - Opciones de filtrado
 * @param {number} options.limit - Límite de resultados (default: 50)
 * @param {string} options.type - Filtrar por tipo ('earn', 'spend', 'all')
 * @param {string} options.pointsType - Filtrar por tipo de puntos ('free', 'premium', 'all')
 * @returns {Promise<Array>} Lista de transacciones
 */
export const getPointsTransactions = async (options = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const {
      limit = 50,
      type = 'all',
      pointsType = 'all'
    } = options;

    let query = supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtrar por tipo de transacción
    if (type === 'earn') {
      query = query.gt('points_change', 0);
    } else if (type === 'spend') {
      query = query.lt('points_change', 0);
    }

    // Filtrar por tipo de puntos
    if (pointsType === 'free') {
      query = query.eq('points_type', 'free');
    } else if (pointsType === 'premium') {
      query = query.eq('points_type', 'premium');
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de puntos del usuario
 * @returns {Promise<Object>} Estadísticas
 */
export const getPointsStats = async () => {
  try {
    const balance = await getUserPointsBalance();
    const transactions = await getPointsTransactions({ limit: 1000 });

    // Calcular estadísticas
    const totalEarned = transactions
      .filter(t => t.points_change > 0)
      .reduce((sum, t) => sum + t.points_change, 0);

    const totalSpent = transactions
      .filter(t => t.points_change < 0)
      .reduce((sum, t) => sum + Math.abs(t.points_change), 0);

    return {
      current_balance: balance.total_points,
      free_points: balance.free_points,
      premium_points: balance.premium_points,
      total_earned: totalEarned,
      total_spent: totalSpent,
      transaction_count: transactions.length,
      stats: balance.stats
    };

  } catch (error) {
    console.error('Error al obtener estadísticas de puntos:', error);
    throw error;
  }
};

// ========================================
// 5. CÁLCULO DE PUNTOS POR CONTENIDO
// ========================================

/**
 * Obtener multiplicadores de categorías desde la BD
 * @returns {Promise<Object>} Objeto con categorías y multiplicadores
 */
export const getCategoryMultipliers = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('slug, name, points_multiplier')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;

    // Convertir a objeto para fácil acceso
    const multipliers = {};
    data.forEach(cat => {
      multipliers[cat.slug] = {
        name: cat.name,
        multiplier: cat.points_multiplier || 1.0
      };
    });

    return multipliers;

  } catch (error) {
    console.error('Error al obtener multiplicadores de categorías:', error);
    // Retornar multiplicadores por defecto en caso de error
    return {
      'education': { name: 'Educación', multiplier: 1.5 },
      'business': { name: 'Negocios', multiplier: 1.3 },
      'technology': { name: 'Tecnología', multiplier: 1.2 },
      'default': { name: 'General', multiplier: 1.0 }
    };
  }
};

/**
 * Calcular puntos por subir un video
 * @param {number} durationSeconds - Duración del video en segundos
 * @param {string} categorySlug - Slug de la categoría
 * @param {string} orientation - Orientación del video ('vertical' o 'horizontal')
 * @returns {Promise<Object>} Puntos calculados con detalles
 */
export const calculateVideoPoints = async (durationSeconds, categorySlug, orientation = 'horizontal') => {
  try {
    // Obtener multiplicadores de categorías
    const multipliers = await getCategoryMultipliers();

    // Puntos base según duración
    let basePoints = 0;
    if (durationSeconds <= 30) {
      basePoints = 5;
    } else if (durationSeconds <= 60) {
      basePoints = 10;
    } else if (durationSeconds <= 180) { // 3 minutos
      basePoints = 15;
    } else if (durationSeconds <= 300) { // 5 minutos
      basePoints = 20;
    } else {
      basePoints = 25;
    }

    // Bonus por orientación vertical (reels)
    const orientationBonus = orientation === 'vertical' ? 10 : 0;

    // Aplicar multiplicador de categoría
    const categoryMultiplier = multipliers[categorySlug]?.multiplier || 1.0;
    const categoryName = multipliers[categorySlug]?.name || 'General';

    // Calcular puntos finales
    const pointsWithCategory = Math.round(basePoints * categoryMultiplier);
    const totalPoints = pointsWithCategory + orientationBonus;

    return {
      base_points: basePoints,
      category_multiplier: categoryMultiplier,
      category_name: categoryName,
      points_with_category: pointsWithCategory,
      orientation_bonus: orientationBonus,
      total_points: totalPoints,
      breakdown: {
        duration_seconds: durationSeconds,
        category: categorySlug,
        orientation: orientation
      }
    };

  } catch (error) {
    console.error('Error al calcular puntos de video:', error);
    // Retornar puntos mínimos en caso de error
    return {
      base_points: 10,
      category_multiplier: 1.0,
      points_with_category: 10,
      orientation_bonus: 0,
      total_points: 10
    };
  }
};

/**
 * Calcular puntos por subir una foto
 * @param {string} categorySlug - Slug de la categoría
 * @returns {Promise<Object>} Puntos calculados
 */
export const calculatePhotoPoints = async (categorySlug) => {
  try {
    const multipliers = await getCategoryMultipliers();

    const basePoints = 5; // Puntos base por foto
    const categoryMultiplier = multipliers[categorySlug]?.multiplier || 1.0;
    const categoryName = multipliers[categorySlug]?.name || 'General';

    const totalPoints = Math.round(basePoints * categoryMultiplier);

    return {
      base_points: basePoints,
      category_multiplier: categoryMultiplier,
      category_name: categoryName,
      total_points: totalPoints
    };

  } catch (error) {
    console.error('Error al calcular puntos de foto:', error);
    return {
      base_points: 5,
      category_multiplier: 1.0,
      total_points: 5
    };
  }
};

// ========================================
// 6. COMPRA DE PUNTOS PREMIUM
// ========================================

/**
 * Obtener paquetes de puntos premium disponibles
 * @returns {Promise<Array>} Lista de paquetes
 */
export const getPremiumPointsPackages = async () => {
  try {
    // Obtener configuración de precios desde site_settings
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'premium_points_price')
      .single();

    if (error) throw error;

    const priceConfig = data?.setting_value || { usd_per_100_points: 1.0 };
    const basePrice = priceConfig.usd_per_100_points;

    // Definir paquetes con descuentos progresivos
    const packages = [
      {
        id: 'package_100',
        points: 100,
        price: basePrice * 1, // $1.00
        discount: 0,
        popular: false
      },
      {
        id: 'package_500',
        points: 500,
        price: basePrice * 4.5, // $4.50 (10% descuento)
        discount: 10,
        popular: true
      },
      {
        id: 'package_1000',
        points: 1000,
        price: basePrice * 8, // $8.00 (20% descuento)
        discount: 20,
        popular: false
      },
      {
        id: 'package_2500',
        points: 2500,
        price: basePrice * 18.75, // $18.75 (25% descuento)
        discount: 25,
        popular: false
      }
    ];

    return packages;

  } catch (error) {
    console.error('Error al obtener paquetes de puntos:', error);
    // Retornar paquetes por defecto
    return [
      { id: 'package_100', points: 100, price: 1.0, discount: 0, popular: false },
      { id: 'package_500', points: 500, price: 4.5, discount: 10, popular: true },
      { id: 'package_1000', points: 1000, price: 8.0, discount: 20, popular: false }
    ];
  }
};

/**
 * Procesar compra de puntos premium (placeholder para integración con Stripe/PayPal)
 * @param {string} packageId - ID del paquete
 * @param {Object} paymentInfo - Información del pago
 * @returns {Promise<Object>} Resultado de la compra
 */
export const purchasePremiumPoints = async (packageId, paymentInfo) => {
  try {
    // TODO: Integrar con gateway de pago (Stripe, PayPal, etc)
    // Por ahora es un placeholder
    
    const packages = await getPremiumPointsPackages();
    const selectedPackage = packages.find(p => p.id === packageId);

    if (!selectedPackage) {
      throw new Error('Paquete no encontrado');
    }

    // Aquí iría la lógica de pago con Stripe/PayPal
    // const paymentResult = await processPayment(paymentInfo);

    // Si el pago fue exitoso, agregar los puntos
    const result = await addPremiumPoints(
      selectedPackage.points,
      `Compra de ${selectedPackage.points} puntos premium`,
      paymentInfo.transactionId
    );

    return {
      success: true,
      points_purchased: selectedPackage.points,
      amount_paid: selectedPackage.price,
      transaction_id: paymentInfo.transactionId,
      new_balance: result.new_balance
    };

  } catch (error) {
    console.error('Error al procesar compra de puntos:', error);
    throw error;
  }
};

// ========================================
// 7. UTILIDADES
// ========================================

/**
 * Formatear número de puntos para mostrar
 * @param {number} points - Cantidad de puntos
 * @returns {string} Puntos formateados (ej: "1K", "1.5M")
 */
export const formatPoints = (points) => {
  if (!points && points !== 0) return '0';
  
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  } else if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  
  return points.toString();
};

/**
 * Verificar si el usuario tiene suficientes puntos
 * @param {number} requiredPoints - Puntos requeridos
 * @returns {Promise<boolean>} True si tiene suficientes puntos
 */
export const hasEnoughPoints = async (requiredPoints) => {
  try {
    const balance = await getUserPointsBalance();
    return balance.total_points >= requiredPoints;
  } catch (error) {
    console.error('Error al verificar puntos:', error);
    return false;
  }
};

/**
 * Obtener ratio de conversión de puntos gratis a premium
 * @returns {Promise<number>} Ratio (ej: 10 = 10 puntos gratis = 1 premium)
 */
export const getConversionRatio = async () => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'points_conversion_ratio')
      .single();

    if (error) throw error;

    return data?.setting_value?.free_to_premium || 10;

  } catch (error) {
    console.error('Error al obtener ratio de conversión:', error);
    return 10; // Default
  }
};

// Exportar todas las funciones
export default {
  // Balance
  getUserPointsBalance,
  getUserPointsBalanceById,
  
  // Agregar puntos
  addFreePoints,
  addPremiumPoints,
  
  // Deducir puntos
  deductPoints,
  
  // Transacciones
  getPointsTransactions,
  getPointsStats,
  
  // Cálculo de puntos
  getCategoryMultipliers,
  calculateVideoPoints,
  calculatePhotoPoints,
  
  // Compra de puntos
  getPremiumPointsPackages,
  purchasePremiumPoints,
  
  // Utilidades
  formatPoints,
  hasEnoughPoints,
  getConversionRatio
};
