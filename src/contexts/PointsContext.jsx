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
// 🎯 CORRECCIÓN CRÍTICA: Solucionado bug 9/10 con debounce y protección contra race conditions
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
    
    // 🔥 NUEVO: Marcar timestamp de actualización optimista
    lastOptimisticUpdateRef.current = Date.now();
    
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
            _optimistic: true // 🔥 NUEVO: Marcar como actualización optimista
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
    setMissions(snapshot.map(m => ({ 
      ...m, 
      _updated: Date.now(),
      _optimistic: false // 🔥 NUEVO: Quitar flag optimista
    }))); 
  }, []);
  
  // ============================================================================
  // LÓGICA DE CARGA DE DATOS (UNIFICADA Y CORREGIDA)
  // ============================================================================
  
  /**
   * 🔥 CORREGIDA: Carga TODOS los datos relacionados con puntos y misiones.
   * Ahora respeta las actualizaciones optimistas recientes para evitar race conditions.
   * Esta es ahora la única fuente de verdad.
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
    
    // 🔥 NUEVO: Respetar actualizaciones optimistas recientes (< 1 segundo)
    const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
    if (timeSinceOptimistic < 1000 && !forceRefresh) {
      console.log(`⏸️ [loadAllData] Actualización optimista reciente (${timeSinceOptimistic}ms), esperando...`);
      
      // 🔥 Programar recarga después de 1.5 segundos
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        console.log('⏰ [loadAllData] Ejecutando recarga programada');
        loadAllData(true);
      }, 1500);
      
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
        
        // ============================================================
        // ✅ CORRECCIÓN CRÍTICA: Usar getMissionsForProgressPanel()
        // Esta función SOLO trae misiones con show_in_progress_panel=true
        // y ya incluye el current_count y is_completed del usuario
        // ============================================================
        getMissionsForProgressPanel(),
        // ============================================================
        
        getMissionStats()
      ]);
      
      if (mountedRef.current) {
        // 1. Actualizar Saldo de Puntos
        setPoints({
          total: pointsResult.total,
          free: pointsResult.free,
          premium: pointsResult.premium,
        });

        // 2. ✅ Actualizar Misiones (ahora con protección contra race conditions)
        if (missionsResult.success) {
          setMissions(prev => {
            const newMissions = (missionsResult.missions || []).map(m => ({
              ...m,
              _updated: Date.now(),
              _optimistic: false // 🔥 NUEVO: Marcar como datos del servidor
            }));
            
            // 🔥 NUEVO: Si hay misiones optimistas, solo actualizar las que NO sean optimistas
            const hasOptimisticMissions = prev.some(m => m._optimistic);
            
            if (hasOptimisticMissions) {
              console.log('⚠️ [loadAllData] Hay misiones optimistas, mezclando datos...');
              
              // Mantener las misiones optimistas, actualizar solo las del servidor
              return prev.map(mission => {
                if (mission._optimistic) {
                  console.log(`⚡ [loadAllData] Manteniendo misión optimista: ${mission.title} ${mission.current_count}/${mission.target_count}`);
                  return mission; // Mantener versión optimista
                }
                
                // Buscar versión actualizada del servidor
                const serverVersion = newMissions.find(m => m.mission_type === mission.mission_type);
                if (serverVersion) {
                  console.log(`📥 [loadAllData] Actualizando desde servidor: ${serverVersion.title} ${serverVersion.current_count}/${serverVersion.target_count}`);
                  return serverVersion;
                }
                
                return mission;
              });
            }
            
            // Si no hay misiones optimistas, usar directamente las del servidor
            console.log('📥 [loadAllData] Sin misiones optimistas, usando datos del servidor');
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
        
        console.log('✅ [PointsContext] Datos unificados cargados:', {
          points: pointsResult,
          missions: missionsResult.missions?.length || 0,
          earnedToday: statsResult.stats.daily_points_earned || 0
        });
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
  // SUSCRIPCIONES EN TIEMPO REAL (MEJORADAS CON DEBOUNCE)
  // ============================================================================
  useEffect(() => {
    if (!user) return;
    
    // 1. Cargar datos iniciales
    loadAllData(true);
    
    console.log('🔌 [Real-Time] Conectando suscripciones...');

    if (user && isAuthenticated) {
      // ============================================================
      // 2. Suscripción a cambios en el SALDO (user_profiles)
      // ============================================================
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
            // También refrescamos las stats por si este cambio fue por una misión
            getMissionStats().then(statsResult => {
              if (statsResult.success) {
                setPointsEarnedToday(statsResult.stats.daily_points_earned || 0);
              }
            });
          }
        )
        .subscribe();

      // ============================================================
      // 🔥 CORRECCIÓN CRÍTICA: Suscripción a cambios en PROGRESO DE MISIONES
      // Ahora con debounce y respeto por actualizaciones optimistas
      // ============================================================
      const missionsSubscription = supabase
        .channel('public:mission_progress')
        .on('postgres_changes',
          {
            event: '*', // Escuchar INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'mission_progress',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 [Real-Time] Cambio de Progreso de Misión detectado!', payload);
            
            // 🔥 NUEVO: Verificar si hay actualizaciones optimistas recientes
            const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
            
            if (timeSinceOptimistic < 1000) {
              console.log(`⏸️ [Real-Time] Ignorando evento (actualización optimista hace ${timeSinceOptimistic}ms)`);
              
              // 🔥 Programar recarga con debounce
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(() => {
                console.log('⏰ [Real-Time] Ejecutando recarga programada desde suscripción');
                loadAllData(true);
              }, 1500);
              
              return;
            }
            
            // 🔥 NUEVO: Si no hay actualizaciones optimistas recientes, recargar con debounce
            console.log('🔄 [Real-Time] Programando recarga (sin actualizaciones optimistas recientes)');
            
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
              console.log('⏰ [Real-Time] Ejecutando recarga programada');
              loadAllData(true);
            }, 500); // Debounce de 500ms para permitir que la DB propague cambios
          }
        )
        .subscribe();

      // 4. Suscripción a cambios en las MISIONES (daily_missions)
      const adminMissionsSubscription = supabase
        .channel('public:daily_missions')
        .on('postgres_changes',
          {
            event: '*', // Escuchar INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'daily_missions'
          },
          (payload) => {
            console.log('🔄 [Real-Time] Cambio de Admin en Misiones detectado!', payload);
            // Si un admin cambia una misión, recargamos todo con delay
            setTimeout(() => {
              loadAllData(true);
            }, 1000);
          }
        )
        .subscribe();

      // Función de limpieza
      return () => {
        console.log('🔌 [Real-Time] Desconectando suscripciones...');
        supabase.removeChannel(pointsSubscription);
        supabase.removeChannel(missionsSubscription);
        supabase.removeChannel(adminMissionsSubscription);
        
        // 🔥 NUEVO: Limpiar timer de debounce
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
    }, 3000); // Muestra la animación por 3 segundos
  }, []);

  // ============================================================================
  // FUNCIÓN PARA AÑADIR PUNTOS (INTERFAZ PÚBLICA)
  // ============================================================================
  const addPoints = useCallback(async (amount, type = 'free', actionType = 'earned', referenceId = null) => {
    if (!user || amount <= 0) return { success: false, error: 'Usuario o monto inválido' };
    
    try {
      // 1. Llamar a la función del servicio (que llama al RPC)
      const result = await addPointsService(user.id, amount, type, actionType, referenceId);
      
      if (!result || !result.success) {
          throw new Error(result?.error || 'El servidor falló al registrar la transacción de puntos.');
      }
      
      // 2. Refrescar estado local con delay para permitir propagación
      setTimeout(() => {
        loadAllData(true);
      }, 500);

      // 3. Iniciar animación
      triggerAnimation(amount, 'earn', type);
      
      return { success: true, newPoints: result.newPoints };

    } catch (error) {
      console.error('❌ Error en addPoints (Contexto):', error);
      loadAllData(true); // Forzar un refresh en caso de fallo
      return { success: false, error: error.message || 'Error al sumar puntos.' };
    }
  }, [user, loadAllData, triggerAnimation]);

  // ============================================================================
  // FUNCIÓN PARA DEDUCIR PUNTOS (INTERFAZ PÚBLICA)
  // ============================================================================
  const deductPoints = useCallback(async (amount, type = 'free', actionType = 'spend') => {
    if (!user || amount <= 0) return { success: false, error: 'Usuario o monto inválido' };

    try {
      // 1. Llamar a la función del servicio (que llama al RPC)
      const result = await deductPointsService(user.id, amount, type, actionType); 
      
      if (!result || !result.success) {
          throw new Error(result?.error || 'El servidor falló al procesar la deducción.');
      }
      
      // 2. Refrescar estado local con delay
      setTimeout(() => {
        loadAllData(true);
      }, 500);

      // 3. Iniciar animación
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
    
    // 🔥 CORRECCIÓN: Esperar a que termine el refresh, forzar carga
    await loadAllData(true);
    
    console.log('✅ [refreshPoints] Refresh completado');
  }, [loadAllData]);

  // ============================================================================
  // LIMPIAR AL DESMONTAR
  // ============================================================================
  useEffect(() => {
    mountedRef.current = true; // Marcar como montado
    return () => {
      mountedRef.current = false; // Marcar como desmontado
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      // 🔥 NUEVO: Limpiar timer de debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // VALOR DEL CONTEXTO
  // ============================================================================
  const value = {
    // Estado de puntos
    totalPoints: points.total,
    freePoints: points.free,
    premiumPoints: points.premium,
    
    // ✅ Estados de misiones con progreso en tiempo real
    missions,
    pointsEarnedToday,
    
    // Estado de carga
    loading,
    
    // Animación
    pointsAnimation,
    
    // Funciones principales
    addPoints,
    deductPoints,
    refreshPoints,
    
    // 🔥 NUEVAS FUNCIONES EXPORTADAS
    updateMissionOptimistic,  // ✅ Actualización instantánea (sin dependencia circular)
    rollbackMission           // ✅ Rollback en caso de error (con timestamp forzado)
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

export default PointsProvider;
