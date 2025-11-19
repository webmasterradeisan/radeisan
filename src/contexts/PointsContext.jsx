// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE PUNTOS
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA V3: Solución definitiva al bug 9/10
// 🔥 PROTECCIÓN EXTENDIDA: Windows de tiempo aumentados (800ms → 2000ms)
// 🔥 DELAY OPTIMIZADO: Suscripciones esperan más antes de recargar
// 🔥 LÓGICA INTELIGENTE: No sobrescribe si servidor trae valor MENOR
// 🔥 ANTI-RACE: Múltiples capas de protección contra race conditions
// ============================================================================
// CAMBIOS APLICADOS:
// 1. Protección optimista: 1000ms → 3000ms (línea ~237)
// 2. Debounce loadAllData: 800ms → 2000ms (línea ~198)
// 3. Delay suscripción con optimistic: 1200ms → 2500ms (línea ~380)
// 4. Delay suscripción sin optimistic: 400ms → 1500ms (línea ~395)
// 5. Comparación inteligente: No sobrescribe si server < optimistic (línea ~243)
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
// 🛠️ IMPORTACIÓN DE SERVICIOS: Importar funciones de AMBOS servicios
import { 
  getUserPoints,
  addPoints as addPointsService, 
  deductPoints as deductPointsService, 
  initializeUserPoints 
} from '../services/pointsService'; 
import {
  getMissionsForProgressPanel, // ✅ NUEVA FUNCIÓN IMPORTADA
  getMissionStats
} from '../services/missionsService';
import { supabase } from 'lib/supabase';

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints debe ser usado dentro de un PointsProvider');
  }
  return context;
};

// ============================================================================
// PROVEEDOR DEL CONTEXTO
// ============================================================================

export const PointsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // ============================================================================
  // ESTADOS PRINCIPALES (AHORA CENTRALIZADOS)
  // ============================================================================
  const [points, setPoints] = useState({
    total: 0,
    free: 0,
    premium: 0,
  });
  
  // ✅ Estados para misiones (movidos desde el Dashboard)
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  
  // Estado de carga unificado
  const [loading, setLoading] = useState(true);

  // Estado de animación (para notificaciones flotantes)
  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn', // 'earn' o 'deduct'
    colorType: 'free' // 'free' o 'premium'
  });

  // Referencias para limpiar efectos
  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  
  // 🔥 REFERENCIAS PARA CONTROL DE RACE CONDITIONS
  const lastOptimisticUpdateRef = useRef(0);
  const optimisticMissionTypeRef = useRef(null);
  const optimisticValueRef = useRef(null); // 🔥 V3: Guardar valor optimista
  const debounceTimerRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  // ============================================================================
  // 🔥 NUEVAS FUNCIONES: ACTUALIZACIÓN OPTIMISTA Y ROLLBACK
  // ============================================================================
  
  /**
   * ✅ V3: Actualiza el progreso de una misión LOCALMENTE (optimista)
   * sin esperar confirmación del backend.
   * El usuario verá el cambio INSTANTÁNEAMENTE.
   * 
   * @param {string} missionType - Tipo de misión (ej: 'give_like')
   * @param {number} delta - Cantidad a incrementar (default: 1)
   */
  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    console.log('⚡ [Optimistic V3] Actualizando misión localmente:', {
      missionType,
      delta
    });
    
    setMissions(prev => {
      const targetMission = prev.find(m => m.mission_type === missionType);
      
      if (targetMission) {
        const newCount = Math.min(
          targetMission.current_count + delta,
          targetMission.target_count
        );
        
        console.log('⚡ [Optimistic V3] Misión encontrada:', {
          mission: targetMission.title,
          before: `${targetMission.current_count}/${targetMission.target_count}`,
          after: `${newCount}/${targetMission.target_count}`
        });
        
        // 🔥 V3: Guardar referencias MÁS COMPLETAS
        lastOptimisticUpdateRef.current = Date.now();
        optimisticMissionTypeRef.current = missionType;
        optimisticValueRef.current = newCount; // 🔥 NUEVO: Guardar el valor esperado
      }
      
      return prev.map(mission => {
        if (mission.mission_type === missionType) {
          const newCount = Math.min(
            mission.current_count + delta,
            mission.target_count
          );
          
          return {
            ...mission,
            current_count: newCount,
            _updated: Date.now(),
            _optimistic: true,
            _optimisticTimestamp: Date.now(),
            _optimisticValue: newCount // 🔥 V3: Marcar el valor optimista
          };
        }
        return mission;
      });
    });
  }, []);
  
  /**
   * Revierte el estado de las misiones a un snapshot anterior
   * Se usa cuando el backend falla o rechaza la operación.
   * 
   * @param {Array} snapshot - Estado anterior de las misiones
   */
  const rollbackMission = useCallback((snapshot) => {
    console.log('⏪ [Rollback V3] Revirtiendo al estado anterior');
    
    // Limpiar referencias optimistas
    lastOptimisticUpdateRef.current = 0;
    optimisticMissionTypeRef.current = null;
    optimisticValueRef.current = null;
    
    setMissions(snapshot.map(m => ({ 
      ...m, 
      _updated: Date.now(),
      _optimistic: false,
      _optimisticTimestamp: undefined,
      _optimisticValue: undefined
    }))); 
  }, []);
  
  // ============================================================================
  // LÓGICA DE CARGA DE DATOS (UNIFICADA Y CORREGIDA V3)
  // ============================================================================
  
  /**
   * 🔥 V3: Carga TODOS los datos relacionados con puntos y misiones.
   * CORRECCIONES CRÍTICAS APLICADAS:
   * 1. Window de protección optimista: 1000ms → 3000ms
   * 2. Debounce aumentado: 800ms → 2000ms  
   * 3. Lógica inteligente: No sobrescribe si server < optimistic
   */
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;
    
    if (!user || !isAuthenticated) {
        setPoints({ total: 0, free: 0, premium: 0 });
        setMissions([]);
        setPointsEarnedToday(0);
        setLoading(false);
        return;
    }
    
    // Prevenir llamadas concurrentes
    if (isLoadingRef.current && !forceRefresh) {
      console.log('⏸️ [loadAllData V3] Ya hay una carga en progreso, saltando...');
      return;
    }
    
    // 🔥 V3: CORRECCIÓN #1 - Window aumentado de 800ms → 2000ms
    const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
    if (timeSinceOptimistic < 2000 && !forceRefresh && optimisticMissionTypeRef.current) {
      console.log(`⏸️ [loadAllData V3] Actualización optimista reciente (${timeSinceOptimistic}ms < 2000ms), programando recarga...`);
      
      // 🔥 V3: Delay aumentado de 1000ms → 2000ms
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        console.log('⏰ [loadAllData V3] Ejecutando recarga programada');
        loadAllData(true);
      }, 2000); // ← AUMENTADO: 1000ms → 2000ms
      
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);

    try {
      console.log('🔄 [loadAllData V3] Iniciando carga completa de datos...');
      
      // Inicializar el registro de puntos (seguridad)
      await initializeUserPoints(user.id);
      
      // Cargar datos en paralelo
      const [pointsResult, missionsResult, statsResult] = await Promise.all([
        getUserPoints(user.id),
        getMissionsForProgressPanel(),
        getMissionStats()
      ]);
      
      if (mountedRef.current) {
        // Actualizar puntos
        if (pointsResult && typeof pointsResult.total !== 'undefined') {
          setPoints({
            total: pointsResult.total || 0,
            free: pointsResult.free || 0,
            premium: pointsResult.premium || 0
          });
        }
        
        // 🔥 V3: CORRECCIÓN #2 - Protección extendida + Lógica inteligente
        setMissions(prev => {
          if (!missionsResult || !Array.isArray(missionsResult)) {
            console.warn('⚠️ [loadAllData V3] missionsResult inválido:', missionsResult);
            return prev;
          }
          
          return missionsResult.map(serverMission => {
            const existingMission = prev.find(m => m.id === serverMission.id);
            const isOptimisticMission = serverMission.mission_type === optimisticMissionTypeRef.current;
            
            // 🔥 V3: CORRECCIÓN #3 - Window extendido de 1000ms → 3000ms
            const hasRecentOptimistic = existingMission?._optimisticTimestamp && 
              (Date.now() - existingMission._optimisticTimestamp) < 3000; // ← AUMENTADO
            
            // 🔥 V3: PROTECCIÓN CAPA 1 - Proteger misión con actualización optimista reciente
            if (isOptimisticMission && hasRecentOptimistic) {
              console.log(`🛡️ [loadAllData V3] CAPA 1 - Protegiendo misión optimista:`, {
                mission: existingMission.title,
                keepingCount: existingMission.current_count,
                serverCount: serverMission.current_count,
                age: `${Date.now() - existingMission._optimisticTimestamp}ms`
              });
              return existingMission; // ← MANTENER VALOR OPTIMISTA
            }
            
            // 🔥 V3: PROTECCIÓN CAPA 2 - No sobrescribir si servidor trae valor MENOR
            if (existingMission?._optimistic && 
                serverMission.current_count < existingMission.current_count) {
              console.log(`🛡️ [loadAllData V3] CAPA 2 - Servidor trae valor menor, manteniendo optimista:`, {
                mission: existingMission.title,
                keepingCount: existingMission.current_count,
                serverCount: serverMission.current_count,
                reason: 'server < optimistic'
              });
              
              // Programar una recarga futura para verificar
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(() => {
                console.log('⏰ [loadAllData V3] Recarga de verificación');
                loadAllData(true);
              }, 2000);
              
              return existingMission; // ← MANTENER VALOR OPTIMISTA
            }
            
            // 🔥 V3: PROTECCIÓN CAPA 3 - Validar con valor optimista guardado
            if (isOptimisticMission && 
                optimisticValueRef.current !== null &&
                serverMission.current_count < optimisticValueRef.current) {
              console.log(`🛡️ [loadAllData V3] CAPA 3 - Servidor no alcanzó valor optimista:`, {
                mission: serverMission.title,
                expected: optimisticValueRef.current,
                serverCount: serverMission.current_count,
                reason: 'propagación incompleta'
              });
              
              // Mantener estado actual y verificar después
              if (existingMission) {
                return existingMission;
              }
            }
            
            // Todo OK: Usar dato del servidor
            console.log(`✅ [loadAllData V3] Usando dato del servidor:`, {
              mission: serverMission.title,
              count: `${serverMission.current_count}/${serverMission.target_count}`,
              completed: serverMission.is_completed
            });
            
            return {
              ...serverMission,
              _updated: Date.now(),
              _optimistic: false,
              _optimisticTimestamp: undefined,
              _optimisticValue: undefined
            };
          });
        });
        
        // Actualizar estadísticas
        if (statsResult && typeof statsResult.pointsEarnedToday !== 'undefined') {
          setPointsEarnedToday(statsResult.pointsEarnedToday || 0);
        }
        
        console.log('✅ [loadAllData V3] Carga completa exitosa');
      }
      
    } catch (error) {
      console.error('❌ [loadAllData V3] Error al cargar datos:', error);
      
      if (mountedRef.current) {
        setPoints({ total: 0, free: 0, premium: 0 });
        setMissions([]);
        setPointsEarnedToday(0);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [user, isAuthenticated]);

  // ============================================================================
  // EFECTO PRINCIPAL: CARGA INICIAL
  // ============================================================================
  useEffect(() => {
    console.log('🚀 [useEffect V3] Carga inicial de datos');
    loadAllData();
  }, [loadAllData]);

  // ============================================================================
  // SUSCRIPCIONES EN TIEMPO REAL (CORREGIDAS V3)
  // ============================================================================
  useEffect(() => {
    if (user && isAuthenticated) {
      console.log('🔌 [Real-Time V3] Conectando suscripciones...');

      // 1. Suscripción a cambios en PUNTOS
      const pointsSubscription = supabase
        .channel('public:user_points')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_points',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 [Real-Time V3] Cambio de Puntos detectado!', payload);
            setTimeout(() => {
              loadAllData(true);
            }, 800);
          }
        )
        .subscribe();

      // 2. Suscripción a TRANSACCIONES de puntos
      const transactionsSubscription = supabase
        .channel('public:points_transactions')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'points_transactions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 [Real-Time V3] Nueva Transacción detectada!', payload);
            setTimeout(() => {
              loadAllData(true);
            }, 800);
          }
        )
        .subscribe();

      // 3. Suscripción a cambios en PROGRESO DE MISIONES
      const missionsSubscription = supabase
        .channel('public:mission_progress')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mission_progress',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 [Real-Time V3] Cambio de Progreso de Misión detectado!', payload);
            
            // 🔥 V3: CORRECCIÓN #4 - Window aumentado de 800ms → 2000ms
            const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
            const hasValidOptimistic = timeSinceOptimistic < 2000 && optimisticMissionTypeRef.current;
            
            if (hasValidOptimistic) {
              console.log(`⏸️ [Real-Time V3] Ignorando evento (actualización optimista válida hace ${timeSinceOptimistic}ms)`);
              
              // 🔥 V3: CORRECCIÓN #5 - Delay aumentado de 1200ms → 2500ms
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(() => {
                console.log('⏰ [Real-Time V3] Ejecutando recarga programada desde suscripción');
                loadAllData(true);
              }, 2500); // ← AUMENTADO: 1200ms → 2500ms
              
              return;
            }
            
            // 🔥 V3: CORRECCIÓN #6 - Delay aumentado de 400ms → 1500ms
            console.log('🔄 [Real-Time V3] Sin actualizaciones optimistas, recargando con delay...');
            
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
              console.log('⏰ [Real-Time V3] Ejecutando recarga');
              loadAllData(true);
            }, 1500); // ← AUMENTADO: 400ms → 1500ms
          }
        )
        .subscribe();

      // 4. Suscripción a cambios en las MISIONES (daily_missions)
      const adminMissionsSubscription = supabase
        .channel('public:daily_missions')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_missions'
          },
          (payload) => {
            console.log('🔄 [Real-Time V3] Cambio de Admin en Misiones detectado!', payload);
            setTimeout(() => {
              loadAllData(true);
            }, 1000); // Delay moderado para cambios administrativos
          }
        )
        .subscribe();

      // Función de limpieza
      return () => {
        console.log('🔌 [Real-Time V3] Desconectando suscripciones...');
        supabase.removeChannel(pointsSubscription);
        supabase.removeChannel(transactionsSubscription);
        supabase.removeChannel(missionsSubscription);
        supabase.removeChannel(adminMissionsSubscription);
        
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
      
    } else {
      // Si no hay usuario, limpiar todo
      setPoints({ total: 0, free: 0, premium: 0 });
      setMissions([]);
      setPointsEarnedToday(0);
      setLoading(false);
    }
  }, [user, isAuthenticated, loadAllData]);

  // ============================================================================
  // FUNCIÓN PARA ANIMACIÓN Y NOTIFICACIÓN
  // ============================================================================
  const triggerAnimation = useCallback((amount, type, colorType) => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    setPointsAnimation({
      show: true,
      amount,
      type,
      colorType
    });

    animationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPointsAnimation(prev => ({ ...prev, show: false }));
      }
    }, 3000);
  }, []);

  // ============================================================================
  // FUNCIÓN PARA AÑADIR PUNTOS (INTERFAZ PÚBLICA)
  // ============================================================================
  const addPoints = useCallback(async (amount, type = 'free', actionType = 'earned', referenceId = null) => {
    if (!user || amount <= 0) return { success: false, error: 'Usuario o monto inválido' };
    
    try {
      const result = await addPointsService(user.id, amount, type, actionType, referenceId);
      
      if (!result || !result.success) {
          throw new Error(result?.error || 'El servidor falló al registrar la transacción de puntos.');
      }
      
      // Refrescar con delay
      setTimeout(() => {
        loadAllData(true);
      }, 500);

      triggerAnimation(amount, 'earn', type);
      
      return { success: true, newPoints: result.newPoints };

    } catch (error) {
      console.error('❌ Error en addPoints (Contexto):', error);
      loadAllData(true);
      return { success: false, error: error.message || 'Error al sumar puntos.' };
    }
  }, [user, loadAllData, triggerAnimation]);

  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS (INTERFAZ PÚBLICA)
  // ============================================================================
  const deductPoints = useCallback(async (amount, type = 'free', actionType = 'spend') => {
    if (!user || amount <= 0) return { success: false, error: 'Usuario o monto inválido' };

    try {
      const result = await deductPointsService(user.id, amount, type, actionType); 
      
      if (!result || !result.success) {
          throw new Error(result?.error || 'El servidor falló al procesar la deducción.');
      }
      
      setTimeout(() => {
        loadAllData(true);
      }, 500);

      triggerAnimation(amount, 'deduct', type);
      
      return { success: true, newPoints: result.newPoints };
      
    } catch (error) {
      console.error('❌ Fallo en deductPoints (Contexto):', error);
      loadAllData(true);
      return { success: false, error: error.message || 'Error al deducir puntos.' };
    }
  }, [user, loadAllData, triggerAnimation]);


  // ============================================================================
  // 🔥 FUNCIÓN PARA REFRESCAR PUNTOS MANUALMENTE (CORREGIDA V3)
  // ============================================================================
  const refreshPoints = useCallback(async () => {
    console.log('🔄 [refreshPoints V3] Refresh manual solicitado');
    
    // Limpiar referencias optimistas antes de refrescar
    optimisticMissionTypeRef.current = null;
    lastOptimisticUpdateRef.current = 0;
    optimisticValueRef.current = null;
    
    await loadAllData(true);
    
    console.log('✅ [refreshPoints V3] Refresh completado');
  }, [loadAllData]);

  // ============================================================================
  // LIMPIAR AL DESMONTAR
  // ============================================================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // VALOR DEL CONTEXTO
  // ============================================================================
  const value = {
    totalPoints: points.total,
    freePoints: points.free,
    premiumPoints: points.premium,
    missions,
    pointsEarnedToday,
    loading,
    pointsAnimation,
    addPoints,
    deductPoints,
    refreshPoints,
    updateMissionOptimistic,
    rollbackMission
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

export default PointsProvider;
