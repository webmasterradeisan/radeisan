// src/hooks/useDualPoints.js
// Hook personalizado para gestionar el sistema de puntos dual

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as pointsService from '../services/pointsService';

/**
 * ========================================
 * HOOK: useDualPoints
 * ========================================
 * Gestiona el sistema de puntos dual (gratis + premium) del usuario
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.autoRefresh - Auto-refrescar balance (default: false)
 * @param {number} options.refreshInterval - Intervalo de refresh en ms (default: 30000)
 * 
 * @returns {Object} Estado y funciones del sistema de puntos
 */
export const useDualPoints = (options = {}) => {
  const { user } = useAuth();
  const { 
    autoRefresh = false, 
    refreshInterval = 30000 // 30 segundos
  } = options;

  // ========================================
  // ESTADO
  // ========================================
  const [balance, setBalance] = useState({
    free_points: 0,
    premium_points: 0,
    total_points: 0,
    stats: {
      total_free_earned: 0,
      total_premium_purchased: 0,
      total_free_spent: 0,
      total_premium_spent: 0
    }
  });

  const [transactions, setTransactions] = useState([]);
  const [categoryMultipliers, setCategoryMultipliers] = useState({});
  const [premiumPackages, setPremiumPackages] = useState([]);
  const [conversionRatio, setConversionRatio] = useState(10);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ========================================
  // FUNCIONES DE CONSULTA
  // ========================================

  /**
   * Cargar balance de puntos del usuario
   */
  const fetchBalance = useCallback(async (silent = false) => {
    if (!user) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const data = await pointsService.getUserPointsBalance();
      
      setBalance({
        free_points: data.free_points || 0,
        premium_points: data.premium_points || 0,
        total_points: data.total_points || 0,
        stats: data.stats || {
          total_free_earned: 0,
          total_premium_purchased: 0,
          total_free_spent: 0,
          total_premium_spent: 0
        }
      });

    } catch (err) {
      console.error('Error al cargar balance:', err);
      setError(err.message || 'Error al cargar balance de puntos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  /**
   * Cargar historial de transacciones
   */
  const fetchTransactions = useCallback(async (filters = {}) => {
    if (!user) return;

    try {
      const data = await pointsService.getPointsTransactions(filters);
      setTransactions(data);
      return data;
    } catch (err) {
      console.error('Error al cargar transacciones:', err);
      return [];
    }
  }, [user]);

  /**
   * Cargar multiplicadores de categorías
   */
  const fetchCategoryMultipliers = useCallback(async () => {
    try {
      const data = await pointsService.getCategoryMultipliers();
      setCategoryMultipliers(data);
      return data;
    } catch (err) {
      console.error('Error al cargar multiplicadores:', err);
      return {};
    }
  }, []);

  /**
   * Cargar paquetes de puntos premium
   */
  const fetchPremiumPackages = useCallback(async () => {
    try {
      const data = await pointsService.getPremiumPointsPackages();
      setPremiumPackages(data);
      return data;
    } catch (err) {
      console.error('Error al cargar paquetes:', err);
      return [];
    }
  }, []);

  /**
   * Cargar ratio de conversión
   */
  const fetchConversionRatio = useCallback(async () => {
    try {
      const ratio = await pointsService.getConversionRatio();
      setConversionRatio(ratio);
      return ratio;
    } catch (err) {
      console.error('Error al cargar ratio:', err);
      return 10;
    }
  }, []);

  /**
   * Refrescar todos los datos
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchBalance(true),
      fetchTransactions({ limit: 20 }),
      fetchCategoryMultipliers(),
      fetchConversionRatio()
    ]);
    setRefreshing(false);
  }, [fetchBalance, fetchTransactions, fetchCategoryMultipliers, fetchConversionRatio]);

  // ========================================
  // FUNCIONES DE PUNTOS
  // ========================================

  /**
   * Agregar puntos gratis al usuario
   */
  const addFreePoints = useCallback(async (points, reason, referenceType = null, referenceId = null) => {
    try {
      setError(null);
      
      const result = await pointsService.addFreePoints(
        points,
        reason,
        referenceType,
        referenceId
      );

      // Actualizar balance local
      await fetchBalance(true);

      return result;
    } catch (err) {
      console.error('Error al agregar puntos gratis:', err);
      setError(err.message);
      throw err;
    }
  }, [fetchBalance]);

  /**
   * Agregar puntos premium al usuario
   */
  const addPremiumPoints = useCallback(async (points, reason = 'Compra de puntos premium', transactionId = null) => {
    try {
      setError(null);
      
      const result = await pointsService.addPremiumPoints(
        points,
        reason,
        transactionId
      );

      // Actualizar balance local
      await fetchBalance(true);

      return result;
    } catch (err) {
      console.error('Error al agregar puntos premium:', err);
      setError(err.message);
      throw err;
    }
  }, [fetchBalance]);

  /**
   * Deducir puntos del usuario (canje)
   */
  const deductPoints = useCallback(async (points, reason, referenceType = null, referenceId = null) => {
    try {
      setError(null);

      // Verificar que tenga suficientes puntos
      if (balance.total_points < points) {
        throw new Error(`Puntos insuficientes. Necesitas ${points} puntos, tienes ${balance.total_points}`);
      }

      const result = await pointsService.deductPoints(
        points,
        reason,
        referenceType,
        referenceId
      );

      // Actualizar balance local
      await fetchBalance(true);

      return result;
    } catch (err) {
      console.error('Error al deducir puntos:', err);
      setError(err.message);
      throw err;
    }
  }, [balance.total_points, fetchBalance]);

  /**
   * Calcular puntos por subir un video
   */
  const calculateVideoPoints = useCallback(async (durationSeconds, categorySlug, orientation = 'horizontal') => {
    try {
      return await pointsService.calculateVideoPoints(
        durationSeconds,
        categorySlug,
        orientation
      );
    } catch (err) {
      console.error('Error al calcular puntos de video:', err);
      return {
        base_points: 10,
        category_multiplier: 1.0,
        points_with_category: 10,
        orientation_bonus: 0,
        total_points: 10
      };
    }
  }, []);

  /**
   * Calcular puntos por subir una foto
   */
  const calculatePhotoPoints = useCallback(async (categorySlug) => {
    try {
      return await pointsService.calculatePhotoPoints(categorySlug);
    } catch (err) {
      console.error('Error al calcular puntos de foto:', err);
      return {
        base_points: 5,
        category_multiplier: 1.0,
        total_points: 5
      };
    }
  }, []);

  /**
   * Comprar puntos premium
   */
  const purchasePremiumPoints = useCallback(async (packageId, paymentInfo) => {
    try {
      setError(null);

      const result = await pointsService.purchasePremiumPoints(
        packageId,
        paymentInfo
      );

      // Actualizar balance local
      await fetchBalance(true);

      return result;
    } catch (err) {
      console.error('Error al comprar puntos premium:', err);
      setError(err.message);
      throw err;
    }
  }, [fetchBalance]);

  // ========================================
  // FUNCIONES DE UTILIDAD
  // ========================================

  /**
   * Verificar si el usuario tiene suficientes puntos
   */
  const hasEnoughPoints = useCallback((requiredPoints) => {
    return balance.total_points >= requiredPoints;
  }, [balance.total_points]);

  /**
   * Formatear puntos para mostrar
   */
  const formatPoints = useCallback((points) => {
    return pointsService.formatPoints(points);
  }, []);

  /**
   * Obtener el desglose de cómo se usarán los puntos para un canje
   */
  const getDeductionBreakdown = useCallback((requiredPoints) => {
    const premiumUsed = Math.min(balance.premium_points, requiredPoints);
    const freeUsed = Math.max(0, requiredPoints - premiumUsed);

    return {
      total_required: requiredPoints,
      premium_used: premiumUsed,
      free_used: freeUsed,
      has_enough: balance.total_points >= requiredPoints,
      remaining_total: balance.total_points - requiredPoints,
      remaining_premium: balance.premium_points - premiumUsed,
      remaining_free: balance.free_points - freeUsed
    };
  }, [balance]);

  /**
   * Obtener estadísticas completas
   */
  const getStats = useCallback(async () => {
    try {
      return await pointsService.getPointsStats();
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
      return null;
    }
  }, []);

  // ========================================
  // EFECTOS
  // ========================================

  /**
   * Cargar datos iniciales cuando el usuario está disponible
   */
  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchCategoryMultipliers();
      fetchConversionRatio();
    }
  }, [user, fetchBalance, fetchCategoryMultipliers, fetchConversionRatio]);

  /**
   * Auto-refresh si está habilitado
   */
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      fetchBalance(true); // Silent refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, user, fetchBalance]);

  // ========================================
  // RETORNO DEL HOOK
  // ========================================
  return {
    // Estado
    balance,
    transactions,
    categoryMultipliers,
    premiumPackages,
    conversionRatio,
    loading,
    refreshing,
    error,

    // Funciones de consulta
    fetchBalance,
    fetchTransactions,
    fetchCategoryMultipliers,
    fetchPremiumPackages,
    refresh,

    // Funciones de puntos
    addFreePoints,
    addPremiumPoints,
    deductPoints,
    calculateVideoPoints,
    calculatePhotoPoints,
    purchasePremiumPoints,

    // Utilidades
    hasEnoughPoints,
    formatPoints,
    getDeductionBreakdown,
    getStats,

    // Valores calculados
    totalPoints: balance.total_points,
    freePoints: balance.free_points,
    premiumPoints: balance.premium_points,
    formattedTotal: pointsService.formatPoints(balance.total_points),
    formattedFree: pointsService.formatPoints(balance.free_points),
    formattedPremium: pointsService.formatPoints(balance.premium_points)
  };
};

export default useDualPoints;
