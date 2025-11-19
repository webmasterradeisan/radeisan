// src/contexts/PointsContext.jsx
// ============================================================================
// POINTS CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE PUNTOS
// ============================================================================
// ✅ CORRECCIÓN CRÍTICA V3.1: Solución definitiva al bug 9/10
// 🔥 PROTECCIÓN EXTENDIDA: Windows de tiempo aumentados (800ms → 2000ms)
// 🔥 DELAY OPTIMIZADO: Suscripciones esperan más antes de recargar
// 🔥 LÓGICA INTELIGENTE: No sobrescribe si servidor trae valor MENOR
// 🔥 ANTI-RACE: Múltiples capas de protección contra race conditions
// 🔥 HOTFIX V3.1: Misiones ahora visibles correctamente
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  getUserPoints,
  addPoints as addPointsService, 
  deductPoints as deductPointsService, 
  initializeUserPoints 
} from '../services/pointsService'; 
import {
  getMissionsForProgressPanel,
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

export const PointsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [points, setPoints] = useState({
    total: 0,
    free: 0,
    premium: 0,
  });
  
  const [missions, setMissions] = useState([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const [pointsAnimation, setPointsAnimation] = useState({
    show: false,
    amount: 0,
    type: 'earn',
    colorType: 'free'
  });

  const mountedRef = useRef(true);
  const animationTimeoutRef = useRef(null);
  const lastOptimisticUpdateRef = useRef(0);
  const optimisticMissionTypeRef = useRef(null);
  const optimisticValueRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isLoadingRef = useRef(false);
  
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
        
        lastOptimisticUpdateRef.current = Date.now();
        optimisticMissionTypeRef.current = missionType;
        optimisticValueRef.current = newCount;
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
            _optimisticValue: newCount
          };
        }
        return mission;
      });
    });
  }, []);
  
  const rollbackMission = useCallback((snapshot) => {
    console.log('⏪ [Rollback V3] Revirtiendo al estado anterior');
    
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
  
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;
    
    if (!user || !isAuthenticated) {
        setPoints({ total: 0, free: 0, premium: 0 });
        setMissions([]);
        setPointsEarnedToday(0);
        setLoading(false);
        return;
    }
    
    if (isLoadingRef.current && !forceRefresh) {
      console.log('⏸️ [loadAllData V3] Ya hay una carga en progreso, saltando...');
      return;
    }
    
    const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
    if (timeSinceOptimistic < 2000 && !forceRefresh && optimisticMissionTypeRef.current) {
      console.log(`⏸️ [loadAllData V3] Actualización optimista reciente (${timeSinceOptimistic}ms < 2000ms), programando recarga...`);
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        console.log('⏰ [loadAllData V3] Ejecutando recarga programada');
        loadAllData(true);
      }, 2000);
      
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);

    try {
      console.log('🔄 [loadAllData V3] Iniciando carga completa de datos...');
      
      await initializeUserPoints(user.id);
      
      const [pointsResult, missionsResult, statsResult] = await Promise.all([
        getUserPoints(user.id),
        getMissionsForProgressPanel(),
        getMissionStats()
      ]);
      
      if (mountedRef.current) {
        setPoints({
          total: pointsResult.total || 0,
          free: pointsResult.free || 0,
          premium: pointsResult.premium || 0,
        });
        
        if (missionsResult && missionsResult.success) {
          setMissions(prev => {
            const serverMissions = missionsResult.missions || [];
            
            if (!Array.isArray(serverMissions)) {
              console.warn('⚠️ [loadAllData V3] missions array inválido:', serverMissions);
              return prev;
            }
            
            return serverMissions.map(serverMission => {
              const existingMission = prev.find(m => m.id === serverMission.id);
              const isOptimisticMission = serverMission.mission_type === optimisticMissionTypeRef.current;
              
              const hasRecentOptimistic = existingMission?._optimisticTimestamp && 
                (Date.now() - existingMission._optimisticTimestamp) < 3000;
              
              if (isOptimisticMission && hasRecentOptimistic) {
                console.log(`🛡️ [loadAllData V3] CAPA 1 - Protegiendo misión optimista:`, {
                  mission: existingMission.title,
                  keepingCount: existingMission.current_count,
                  serverCount: serverMission.current_count,
                  age: `${Date.now() - existingMission._optimisticTimestamp}ms`
                });
                return existingMission;
              }
              
              if (existingMission?._optimistic && 
                  serverMission.current_count < existingMission.current_count) {
                console.log(`🛡️ [loadAllData V3] CAPA 2 - Servidor trae valor menor, manteniendo optimista:`, {
                  mission: existingMission.title,
                  keepingCount: existingMission.current_count,
                  serverCount: serverMission.current_count,
                  reason: 'server < optimistic'
                });
                
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }
                debounceTimerRef.current = setTimeout(() => {
                  console.log('⏰ [loadAllData V3] Recarga de verificación');
                  loadAllData(true);
                }, 2000);
                
                return existingMission;
              }
              
              if (isOptimisticMission && 
                  optimisticValueRef.current !== null &&
                  serverMission.current_count < optimisticValueRef.current) {
                console.log(`🛡️ [loadAllData V3] CAPA 3 - Servidor no alcanzó valor optimista:`, {
                  mission: serverMission.title,
                  expected: optimisticValueRef.current,
                  serverCount: serverMission.current_count,
                  reason: 'propagación incompleta'
                });
                
                if (existingMission) {
                  return existingMission;
                }
              }
              
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
        } else {
          console.warn('⚠️ [loadAllData V3] No se pudieron cargar misiones:', missionsResult);
        }
        
        if (statsResult && statsResult.success && typeof statsResult.pointsEarnedToday !== 'undefined') {
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

  useEffect(() => {
    console.log('🚀 [useEffect V3] Carga inicial de datos');
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (user && isAuthenticated) {
      console.log('🔌 [Real-Time V3] Conectando suscripciones...');

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
            
            const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current;
            const hasValidOptimistic = timeSinceOptimistic < 2000 && optimisticMissionTypeRef.current;
            
            if (hasValidOptimistic) {
              console.log(`⏸️ [Real-Time V3] Ignorando evento (actualización optimista válida hace ${timeSinceOptimistic}ms)`);
              
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(() => {
                console.log('⏰ [Real-Time V3] Ejecutando recarga programada desde suscripción');
                loadAllData(true);
              }, 2500);
              
              return;
            }
            
            console.log('🔄 [Real-Time V3] Sin actualizaciones optimistas, recargando con delay...');
            
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
              console.log('⏰ [Real-Time V3] Ejecutando recarga');
              loadAllData(true);
            }, 1500);
          }
        )
        .subscribe();

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
            }, 1000);
          }
        )
        .subscribe();

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
      setPoints({ total: 0, free: 0, premium: 0 });
      setMissions([]);
      setPointsEarnedToday(0);
      setLoading(false);
    }
  }, [user, isAuthenticated, loadAllData]);

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

  const addPoints = useCallback(async (amount, type = 'free', actionType = 'earned', referenceId = null) => {
    if (!user || amount <= 0) return { success: false, error: 'Usuario o monto inválido' };
    
    try {
      const result = await addPointsService(user.id, amount, type, actionType, referenceId);
      
      if (!result || !result.success) {
          throw new Error(result?.error || 'El servidor falló al registrar la transacción de puntos.');
      }
      
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

  const refreshPoints = useCallback(async () => {
    console.log('🔄 [refreshPoints V3] Refresh manual solicitado');
    
    optimisticMissionTypeRef.current = null;
    lastOptimisticUpdateRef.current = 0;
    optimisticValueRef.current = null;
    
    await loadAllData(true);
    
    console.log('✅ [refreshPoints V3] Refresh completado');
  }, [loadAllData]);

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
