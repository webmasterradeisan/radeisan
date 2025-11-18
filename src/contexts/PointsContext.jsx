// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE PUNTOS
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA: Se blinda addPoints contra TypeError.
// ✅ Se utiliza initializeUserPoints para la estabilidad de la DB.
// ✅ MEJORADO: Centraliza la lógica de misiones y puntos ganados hoy.
// ✅ TIEMPO REAL: Usa suscripciones a Supabase para actualización automática.
// ✅ NUEVO: Usa getMissionsForProgressPanel() para mostrar solo misiones visibles
// 🔥 NUEVO: updateMissionOptimistic() - Actualización instantánea sin esperar backend
// 🔥 NUEVO: rollbackMission() - Revierte cambios si el backend falla
// 🔥 CORREGIDO: Eliminada dependencia circular en updateMissionOptimistic
// 🔥 CORREGIDO: refreshPoints ahora fuerza re-render con timestamp único
// 🎯 CORRECCIÓN V2: Solucionado bug donde todos los usuarios veían 10/10
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
  
  // 🔥 NUEVO: Referencias para control de race conditions
  const lastOptimisticUpdateRef = useRef(0);
  const optimisticMissionTypeRef = useRef(null); // 🔥 V2: Guardar qué misión se actualizó
  const debounceTimerRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  // ============================================================================
  // 🔥 NUEVAS FUNCIONES: ACTUALIZACIÓN OPTIMISTA Y ROLLBACK
  // ============================================================================
  
  /**
   * ✅ CORRECCIÓN: Eliminada dependencia de 'missions' para evitar re-creación
   * Actualiza el progreso de una misión LOCALMENTE (optimista)
   * sin esperar confirmación del backend.
   * El usuario verá el cambio INSTANTÁNEAMENTE.
   * 
   * @param {string} missionType - Tipo de misión (ej: 'give_like')
   * @param {number} delta - Cantidad a incrementar (default: 1)
   */
  const updateMissionOptimistic = useCallback((missionType, delta = 1) => {
    console.log('⚡ [Optimistic] Actualizando misión localmente:', {
      missionType,
      delta
    });
    
    // 🔥 V2: Marcar timestamp Y tipo de misión
    lastOptimisticUpdateRef.current = Date.now();
    optimisticMissionTypeRef.current = missionType;
    
    setMissions(prev => {
      const targetMission = prev.find(m => m.mission_type === missionType);
      
      if (targetMission) {
        console.log('⚡ [Optimistic] Misión encontrada:', {
          mission: targetMission.title,
          before: `${targetMission.current_count}/${targetMission.target_count}`
        });
      }
      
      return prev.map(mission => {
        if (mission.mission_type === missionType) {
          const newCount = Math.min(
            mission.current_count + delta,
            mission.target_count
          );
          
          console.log('⚡ [Optimistic] Nuevo progreso:', {
            mission: mission.title,
            from: `${mission.current_count}/${mission.target_count}`,
            to: `${newCount}/${mission.target_count}`
          });
          
          return {
            ...mission,
            current_count: newCount,
            _updated: Date.now(), // 🔥 Forzar nueva referencia
            _optimistic: true, // 🔥 Marcar como actualización optimista
            _optimisticTimestamp: Date.now() // 🔥 V2: Timestamp específico de esta misión
          };
        }
        return mission;
      });
    });
  }, []); // ✅ SIN DEPENDENCIAS - usa setMissions con función callback
  
  /**
   * Revierte el estado de las misiones a un snapshot anterior
   * Se usa cuando el backend falla o rechaza la operación.
   * 
   * @param {Array} snapshot - Estado anterior de las misiones
   */
  const rollbackMission = useCallback((snapshot) => {
    console.log('⏪ [Rollback] Revirtiendo al estado anterior');
    
    // 🔥 V2: Limpiar referencias optimistas
    lastOptimisticUpdateRef.current = 0;
    optimisticMissionTypeRef.current = null;
    
    setMissions(snapshot.map(m => ({ 
      ...m, 
      _updated: Date.now(),
      _optimistic: false,
      _optimisticTimestamp: undefined
    }))); 
  }, []);
  
  // ============================================================================
  // LÓGICA DE CARGA DE DATOS (UNIFICADA Y CORREGIDA V2)
  // ============================================================================
  
  /**
   * 🔥 V2: Carga TODOS los datos relacionados con puntos y misiones.
   * CORRECCIÓN CRÍTICA: Solo protege la misión específica que se actualizó optimísticamente.
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
    
    // 🔥 NUEVO: Prevenir llamadas concurrentes
    if (isLoadingRef.current && !forceRefresh) {
      console.log('⏸️ [loadAllData] Ya hay una carga en progreso, saltando...');
      return;
    }
    
    // 🔥 V2: Solo respetar actualizaciones optimistas MUY recientes (< 800ms)
    const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
    if (timeSinceOptimistic < 800 && !forceRefresh && optimisticMissionTypeRef.current) {
      console.log(`⏸️ [loadAllData] Actualización optimista MUY reciente (${timeSinceOptimistic}ms), programando recarga...`);
      
      // 🔥 Programar recarga después de 1 segundo
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        console.log('⏰ [loadAllData] Ejecutando recarga programada');
        loadAllData(true);
      }, 1000);
      
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);

    try {
      console.log('🔄 [loadAllData] Iniciando carga completa de datos...');
      
      // Inicializar el registro de puntos (seguridad)
      await initializeUserPoints(user.id);
      
      // Cargar datos en paralelo
      const [pointsResult, missionsResult, statsResult] = await Promise.all([
        getUserPoints(user.id),
        getMissionsForProgressPanel(),
        getMissionStats()
      ]);
      
      if (mountedRef.current) {
        // 1. Actualizar Saldo de Puntos
        setPoints({
          total: pointsResult.total,
          free: pointsResult.free,
          premium: pointsResult.premium,
        });

        // 2. ✅ V2: CORRECCIÓN CRÍTICA - Solo proteger la misión específica optimista
        if (missionsResult.success) {
          setMissions(prev => {
            const newMissions = (missionsResult.missions || []).map(m => ({
              ...m,
              _updated: Date.now(),
              _optimistic: false,
              _optimisticTimestamp: undefined
            }));
            
            // 🔥 V2: Calcular si hay actualizaciones optimistas VÁLIDAS
            const now = Date.now();
            const recentOptimisticMission = prev.find(m => 
              m._optimistic && 
              m._optimisticTimestamp &&
              (now - m._optimisticTimestamp) < 1000 && // Menos de 1 segundo
              m.mission_type === optimisticMissionTypeRef.current // Coincide con la misión actualizada
            );
            
            if (recentOptimisticMission) {
              console.log('⚠️ [loadAllData] Protegiendo misión optimista reciente:', {
                mission: recentOptimisticMission.title,
                type: recentOptimisticMission.mission_type,
                progress: `${recentOptimisticMission.current_count}/${recentOptimisticMission.target_count}`,
                age: `${now - recentOptimisticMission._optimisticTimestamp}ms`
              });
              
              // Solo proteger ESA misión específica, actualizar todas las demás
              return newMissions.map(serverMission => {
                if (serverMission.mission_type === recentOptimisticMission.mission_type) {
                  console.log(`⚡ [loadAllData] Manteniendo misión optimista: ${recentOptimisticMission.title}`);
                  return recentOptimisticMission; // Mantener versión optimista
                }
                return serverMission; // Usar versión del servidor
              });
            }
            
            // 🔥 V2: Si NO hay misiones optimistas válidas, SIEMPRE usar datos del servidor
            console.log('📥 [loadAllData] Sin misiones optimistas válidas, usando TODOS los datos del servidor');
            
            // 🔥 V2: Limpiar referencias optimistas
            optimisticMissionTypeRef.current = null;
            lastOptimisticUpdateRef.current = 0;
            
            return newMissions;
          });
          
          console.log('📊 [loadAllData] Misiones cargadas:', {
            total: missionsResult.missions?.length || 0,
            timestamp: Date.now(),
            details: missionsResult.missions?.map(m => ({
              title: m.title,
              progress: `${m.current_count}/${m.target_count}`,
              completed: m.is_completed
            }))
          });
        }

        // 3. Actualizar Puntos Ganados Hoy
        if (statsResult.success) {
          setPointsEarnedToday(statsResult.stats.daily_points_earned || 0);
        }
        
        console.log('✅ [PointsContext] Datos unificados cargados');
      }
    } catch (error) {
      console.error('❌ Error cargando datos de PointsContext:', error);
      if (mountedRef.current) {
        setLoading(false);
      }
    } finally {
      isLoadingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, isAuthenticated]);

  // ============================================================================
  // SUSCRIPCIONES EN TIEMPO REAL (MEJORADAS V2)
  // ============================================================================
  useEffect(() => {
    if (!user) return;
    
    // 1. Cargar datos iniciales
    loadAllData(true);
    
    console.log('🔌 [Real-Time] Conectando suscripciones...');

    if (user && isAuthenticated) {
      // 2. Suscripción a cambios en el SALDO (user_profiles)
      const pointsSubscription = supabase
        .channel('public:user_profiles')
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public', 
            table: 'user_profiles',
            filter: `id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('🔄 [Real-Time] Cambio de Saldo detectado!', payload.new);
            setPoints({
              total: payload.new.points || 0,
              free: payload.new.free_points || 0,
              premium: payload.new.premium_points || 0
            });
            getMissionStats().then(statsResult => {
              if (statsResult.success) {
                setPointsEarnedToday(statsResult.stats.daily_points_earned || 0);
              }
            });
          }
        )
        .subscribe();

      // 3. 🔥 V2: Suscripción mejorada a cambios en PROGRESO DE MISIONES
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
            console.log('🔄 [Real-Time] Cambio de Progreso de Misión detectado!', payload);
            
            // 🔥 V2: Solo aplicar debounce si hay actualizaciones optimistas VÁLIDAS
            const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
            const hasValidOptimistic = timeSinceOptimistic < 800 && optimisticMissionTypeRef.current;
            
            if (hasValidOptimistic) {
              console.log(`⏸️ [Real-Time] Ignorando evento (actualización optimista válida hace ${timeSinceOptimistic}ms)`);
              
              // Programar recarga con debounce
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(() => {
                console.log('⏰ [Real-Time] Ejecutando recarga programada desde suscripción');
                loadAllData(true);
              }, 1200);
              
              return;
            }
            
            // 🔥 V2: Si NO hay actualizaciones optimistas válidas, recargar con delay corto
            console.log('🔄 [Real-Time] Sin actualizaciones optimistas, recargando con delay...');
            
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
              console.log('⏰ [Real-Time] Ejecutando recarga');
              loadAllData(true);
            }, 400);
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
            console.log('🔄 [Real-Time] Cambio de Admin en Misiones detectado!', payload);
            setTimeout(() => {
              loadAllData(true);
            }, 800);
          }
        )
        .subscribe();

      // Función de limpieza
      return () => {
        console.log('🔌 [Real-Time] Desconectando suscripciones...');
        supabase.removeChannel(pointsSubscription);
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
      }, 400);

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
      }, 400);

      triggerAnimation(amount, 'deduct', type);
      
      return { success: true, newPoints: result.newPoints };
      
    } catch (error) {
      console.error('❌ Fallo en deductPoints (Contexto):', error);
      loadAllData(true);
      return { success: false, error: error.message || 'Error al deducir puntos.' };
    }
  }, [user, loadAllData, triggerAnimation]);


  // ============================================================================
  // 🔥 FUNCIÓN PARA REFRESCAR PUNTOS MANUALMENTE (CORREGIDA)
  // ============================================================================
  const refreshPoints = useCallback(async () => {
    console.log('🔄 [refreshPoints] Refresh manual solicitado');
    
    // 🔥 V2: Limpiar referencias optimistas antes de refrescar
    optimisticMissionTypeRef.current = null;
    lastOptimisticUpdateRef.current = 0;
    
    await loadAllData(true);
    
    console.log('✅ [refreshPoints] Refresh completado');
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
