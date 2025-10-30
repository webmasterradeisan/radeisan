// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - Gestión Global del Sistema de Puntos
// ============================================================================
// Maneja el estado de puntos del usuario en tiempo real y proporciona
// funciones para actualizar puntos con animaciones y notificaciones
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints debe ser usado dentro de un PointsProvider');
  }
  return context;
};

export const PointsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Estados principales
  const [points, setPoints] = useState({
    total: 0,
    free: 0,
    premium: 0,
    loading: true
  });

  // Estado de animación
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn', // 'earn' o 'spend'
    message: ''
  });

  // Refs
  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  // ============================================================================
  // CARGAR PUNTOS INICIALES
  // ============================================================================
  const loadPoints = useCallback(async () => {
    if (!user || !isAuthenticated) {
      console.log('⏭️ No hay usuario, reseteando puntos');
      setPoints({ total: 0, free: 0, premium: 0, loading: false });
      return;
    }

    try {
      console.log('💰 Cargando puntos para usuario:', user.id);
      
      const { data, error } = await supabase
        .from('points_types')
        .select('free_points, premium_points')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error cargando puntos:', error);
        throw error;
      }

      if (data) {
        const pointsData = {
          free: data.free_points || 0,
          premium: data.premium_points || 0,
          total: (data.free_points || 0) + (data.premium_points || 0),
          loading: false
        };

        console.log('✅ Puntos cargados:', pointsData);
        
        if (mountedRef.current) {
          setPoints(pointsData);
        }
      } else {
        // No existe registro, inicializar en 0
        if (mountedRef.current) {
          setPoints({ total: 0, free: 0, premium: 0, loading: false });
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar puntos:', error);
      if (mountedRef.current) {
        setPoints({ total: 0, free: 0, premium: 0, loading: false });
      }
    }
  }, [user, isAuthenticated]);

  // ============================================================================
  // CARGAR PUNTOS AL MONTAR O CUANDO CAMBIE EL USUARIO
  // ============================================================================
  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  // ============================================================================
  // SUSCRIPCIÓN EN TIEMPO REAL (REALTIME)
  // ============================================================================
  useEffect(() => {
    if (!user || !isAuthenticated) {
      // Limpiar suscripción si no hay usuario
      if (realtimeChannelRef.current) {
        console.log('🔌 Desconectando realtime - no hay usuario');
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    console.log('🔌 Configurando realtime para puntos del usuario:', user.id);

    // Crear canal de Realtime
    const channel = supabase
      .channel(`points:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'points_types',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Cambio en puntos detectado (Realtime):', payload);
          
          if (payload.new && mountedRef.current) {
            const newPoints = {
              free: payload.new.free_points || 0,
              premium: payload.new.premium_points || 0,
              total: (payload.new.free_points || 0) + (payload.new.premium_points || 0),
              loading: false
            };

            console.log('✅ Actualizando puntos desde realtime:', newPoints);
            setPoints(newPoints);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción realtime:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('🧹 Limpiando suscripción realtime');
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [user, isAuthenticated]);

  // ============================================================================
  // FUNCIÓN PARA AÑADIR PUNTOS CON ANIMACIÓN
  // ============================================================================
  const addPoints = useCallback((amount, message = '', type = 'free') => {
    console.log('🎉 addPoints llamado:', { amount, message, type });

    // Actualizar puntos optimísticamente (sin esperar al servidor)
    setPoints(prev => {
      const newPoints = { ...prev };
      
      if (type === 'free') {
        newPoints.free += amount;
      } else if (type === 'premium') {
        newPoints.premium += amount;
      }
      
      newPoints.total = newPoints.free + newPoints.premium;

      console.log('💫 Puntos actualizados optimísticamente:', newPoints);
      return newPoints;
    });

    // Mostrar animación
    setPointsAnimation({
      show: true,
      amount,
      type: 'earn',
      message: message || `+${amount} puntos`
    });

    // Ocultar animación después de 3 segundos
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPointsAnimation({
          show: false,
          amount: 0,
          type: 'earn',
          message: ''
        });
      }
    }, 3000);

    // Recargar puntos desde el servidor para confirmar
    setTimeout(() => {
      loadPoints();
    }, 500);
  }, [loadPoints]);

  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS
  // ============================================================================
  const deductPoints = useCallback((amount, message = '') => {
    console.log('💸 deductPoints llamado:', { amount, message });

    // Actualizar puntos optimísticamente
    setPoints(prev => {
      const newPoints = { ...prev };
      
      // Deducir primero de premium, luego de free
      if (newPoints.premium >= amount) {
        newPoints.premium -= amount;
      } else {
        const remaining = amount - newPoints.premium;
        newPoints.premium = 0;
        newPoints.free = Math.max(0, newPoints.free - remaining);
      }
      
      newPoints.total = newPoints.free + newPoints.premium;

      console.log('💫 Puntos deducidos optimísticamente:', newPoints);
      return newPoints;
    });

    // Mostrar animación
    setPointsAnimation({
      show: true,
      amount,
      type: 'spend',
      message: message || `-${amount} puntos`
    });

    // Ocultar animación
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPointsAnimation({
          show: false,
          amount: 0,
          type: 'spend',
          message: ''
        });
      }
    }, 3000);

    // Recargar puntos desde el servidor
    setTimeout(() => {
      loadPoints();
    }, 500);
  }, [loadPoints]);

  // ============================================================================
  // FUNCIÓN PARA REFRESCAR PUNTOS MANUALMENTE
  // ============================================================================
  const refreshPoints = useCallback(() => {
    console.log('🔄 Refrescando puntos manualmente');
    return loadPoints();
  }, [loadPoints]);

  // ============================================================================
  // LIMPIAR AL DESMONTAR
  // ============================================================================
  useEffect(() => {
    return () => {
      console.log('🧹 Limpiando PointsProvider');
      mountedRef.current = false;
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // ============================================================================
  // VALOR DEL CONTEXTO
  // ============================================================================
  const value = {
    // Estado de puntos
    points,
    totalPoints: points.total,
    freePoints: points.free,
    premiumPoints: points.premium,
    loading: points.loading,
    
    // Animación
    pointsAnimation,
    
    // Funciones
    addPoints,
    deductPoints,
    refreshPoints
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

export default PointsProvider;
