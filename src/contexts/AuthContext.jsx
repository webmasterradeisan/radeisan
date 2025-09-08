// src/contexts/AuthContext.jsx
// AuthContext ULTRA ROBUSTO - CORREGIDO para problemas de login timeout

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Estados principales
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Referencias para control de estado
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const authSubscriptionRef = useRef(null);
  const lastCheckTimeRef = useRef(0);
  const userCacheRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  // Estados computados
  const isAuthenticated = !!user;

  // Constantes de configuración
  const DEBOUNCE_TIME = 3000; // 3 segundos entre verificaciones
  const MAX_LOADING_TIME = 15000; // 15 segundos máximo de loading (aumentado)
  const CACHE_DURATION = 30000; // 30 segundos de cache de usuario

  // ===============================
  // UTILIDADES DE CONTROL - CORREGIDAS
  // ===============================

  const setLoadingWithTimeout = useCallback((isLoading) => {
    if (!mountedRef.current) return;

    setLoading(isLoading);

    // Timeout de seguridad SOLO para loading visual, NO para revertir autenticación
    if (isLoading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      loadingTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('⚠️ Loading timeout alcanzado, finalizando loading visual solamente');
          setLoading(false);
          // CORREGIDO: NO setear error aquí, eso causaba el problema
          // setError('Timeout de autenticación'); // ← ESTA LÍNEA CAUSABA EL PROBLEMA
        }
      }, MAX_LOADING_TIME);
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, []);

  const shouldSkipCheck = useCallback(() => {
    const now = Date.now();
    return (
      !mountedRef.current ||
      initializingRef.current ||
      (now - lastCheckTimeRef.current) < DEBOUNCE_TIME
    );
  }, []);

  // ===============================
  // GESTIÓN DE PERFIL - OPTIMIZADA
  // ===============================

  const fetchUserProfile = useCallback(async (userId, useCache = true) => {
    if (!userId || !mountedRef.current) return null;

    // Verificar cache primero
    const cachedUser = userCacheRef.current;
    if (useCache && cachedUser && cachedUser.id === userId) {
      const cacheAge = Date.now() - cachedUser._cacheTime;
      if (cacheAge < CACHE_DURATION) {
        console.log('📦 Usando perfil en cache');
        return cachedUser;
      }
    }

    try {
      console.log('🔍 Fetching perfil para usuario:', userId);
      
      // OPTIMIZADO: Query más simple y rápida
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, avatar_url, email')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error obteniendo perfil:', error);
        // CORREGIDO: No fallar aquí, crear perfil básico
      }

      let profile;
      if (data) {
        // Perfil encontrado en BD
        profile = {
          id: data.id,
          name: data.username || 'Usuario',
          full_name: data.username || 'Usuario',
          username: data.username || 'usuario',
          avatar_url: data.avatar_url,
          email: data.email,
          points: 0, // Simplificado
          _cacheTime: Date.now()
        };
        console.log('✅ Perfil de BD obtenido:', profile.name);
      } else {
        // CORREGIDO: Crear perfil básico inmediatamente
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.id === userId) {
          profile = {
            id: authUser.id,
            name: authUser.email?.split('@')[0] || 'Usuario',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
            username: authUser.email?.split('@')[0] || 'usuario',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            email: authUser.email,
            points: 0,
            _cacheTime: Date.now()
          };
          console.log('✅ Perfil básico creado:', profile.name);
        } else {
          return null;
        }
      }

      // Actualizar cache
      userCacheRef.current = profile;
      return profile;

    } catch (err) {
      console.error('❌ Error en fetchUserProfile:', err);
      // CORREGIDO: En caso de error, crear perfil mínimo
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.id === userId) {
          const minimalProfile = {
            id: authUser.id,
            name: authUser.email?.split('@')[0] || 'Usuario',
            full_name: authUser.email?.split('@')[0] || 'Usuario',
            username: authUser.email?.split('@')[0] || 'usuario',
            avatar_url: null,
            email: authUser.email,
            points: 0,
            _cacheTime: Date.now()
          };
          console.log('✅ Perfil mínimo creado tras error:', minimalProfile.name);
          return minimalProfile;
        }
      } catch {
        // Si todo falla, retornar null
      }
      return null;
    }
  }, []);

  // ===============================
  // INICIALIZACIÓN - SIMPLIFICADA
  // ===============================

  const initializeAuth = useCallback(async (forceRefresh = false) => {
    if (shouldSkipCheck() && !forceRefresh) {
      console.log('⏭️ Saltando verificación (debounce)');
      return;
    }

    initializingRef.current = true;
    lastCheckTimeRef.current = Date.now();

    try {
      console.log('🚀 Inicializando autenticación...');
      
      if (mountedRef.current) {
        setLoadingWithTimeout(true);
        setError(null);
      }

      // Verificar sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Error obteniendo sesión:', sessionError);
        if (mountedRef.current) {
          setUser(null);
          setError(`Error de sesión: ${sessionError.message}`);
        }
        return;
      }

      if (session?.user && mountedRef.current) {
        console.log('✅ Sesión válida encontrada para:', session.user.email);
        
        // CORREGIDO: Crear usuario básico inmediatamente, luego enriquecer
        const basicUser = {
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'Usuario',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
          username: session.user.email?.split('@')[0] || 'usuario',
          avatar_url: session.user.user_metadata?.avatar_url || null,
          email: session.user.email,
          points: 0,
          _cacheTime: Date.now()
        };

        // Setear usuario inmediatamente
        setUser(basicUser);
        setLoadingWithTimeout(false);
        console.log('✅ Usuario básico seteado inmediatamente:', basicUser.name);

        // BACKGROUND: Intentar enriquecer con perfil de BD (sin bloquear)
        setTimeout(async () => {
          try {
            const enrichedProfile = await fetchUserProfile(session.user.id, false);
            if (enrichedProfile && mountedRef.current && enrichedProfile.username) {
              console.log('🎨 Enriqueciendo perfil con datos de BD');
              setUser(enrichedProfile);
            }
          } catch (error) {
            console.log('ℹ️ No se pudo enriquecer perfil, manteniendo básico');
          }
        }, 100);

      } else {
        console.log('ℹ️ No hay sesión activa');
        if (mountedRef.current) {
          setUser(null);
          userCacheRef.current = null;
          setLoadingWithTimeout(false);
        }
      }

    } catch (err) {
      console.error('❌ Error en inicialización:', err);
      if (mountedRef.current) {
        setUser(null);
        userCacheRef.current = null;
        setError(`Error de autenticación: ${err.message}`);
        setLoadingWithTimeout(false);
      }
    } finally {
      initializingRef.current = false;
    }
  }, [shouldSkipCheck, fetchUserProfile, setLoadingWithTimeout]);

  // ===============================
  // LISTENERS - SIN CAMBIOS
  // ===============================

  useEffect(() => {
    console.log('🎬 Iniciando AuthProvider...');
    mountedRef.current = true;

    // Inicialización principal
    initializeAuth(true);

    // Configurar listener de auth
    if (!authSubscriptionRef.current) {
      console.log('🔗 Configurando listener de autenticación...');
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mountedRef.current) return;

          console.log('📡 Auth event recibido:', event);

          switch (event) {
            case 'SIGNED_IN':
              if (session?.user) {
                console.log('🔑 Usuario se autenticó');
                
                // CORREGIDO: Setear usuario inmediatamente con datos básicos
                const immediateUser = {
                  id: session.user.id,
                  name: session.user.email?.split('@')[0] || 'Usuario',
                  full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
                  username: session.user.email?.split('@')[0] || 'usuario',
                  avatar_url: session.user.user_metadata?.avatar_url || null,
                  email: session.user.email,
                  points: 0,
                  _cacheTime: Date.now()
                };

                setUser(immediateUser);
                setLoadingWithTimeout(false);
                setError(null);
                console.log('✅ Usuario seteado inmediatamente en SIGNED_IN');

                // Background: enriquecer perfil
                fetchUserProfile(session.user.id, false).then(enriched => {
                  if (enriched && mountedRef.current && enriched.username) {
                    setUser(enriched);
                  }
                });
              }
              break;

            case 'SIGNED_OUT':
              console.log('🚪 Usuario cerró sesión');
              if (mountedRef.current) {
                setUser(null);
                userCacheRef.current = null;
                setLoadingWithTimeout(false);
                setError(null);
              }
              break;

            case 'TOKEN_REFRESHED':
              console.log('🔄 Token refrescado automáticamente');
              break;

            default:
              console.log('📋 Evento de auth ignorado:', event);
              break;
          }
        }
      );

      authSubscriptionRef.current = subscription;
    }

    return () => {
      console.log('🧹 Limpiando AuthProvider...');
      mountedRef.current = false;
      
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
    };
  }, []);

  // ===============================
  // VISIBILIDAD - SIN CAMBIOS
  // ===============================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!mountedRef.current) return;

      if (document.visibilityState === 'visible') {
        const timeSinceLastCheck = Date.now() - lastCheckTimeRef.current;
        
        if (timeSinceLastCheck > DEBOUNCE_TIME && user) {
          console.log('👁️ Página visible, verificando sesión...');
          
          supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!mountedRef.current) return;
            
            if (error || !session) {
              console.log('⚠️ Sesión inválida detectada, limpiando estado');
              setUser(null);
              userCacheRef.current = null;
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // ===============================
  // SIGN IN - MEJORADO
  // ===============================

  const signIn = useCallback(async (email, password) => {
    try {
      console.log('🔑 INICIANDO signIn para:', email);
      setLoadingWithTimeout(true);
      setError(null);

      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      console.log('📡 Llamando a supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      console.log('📥 Respuesta de Supabase:', { 
        hasSession: !!data?.session, 
        hasUser: !!data?.session?.user,
        error: error?.message 
      });

      if (error) {
        console.error('❌ Error de Supabase:', error);
        const errorMessage = error.message === 'Invalid login credentials' 
          ? 'Email o contraseña incorrectos'
          : error.message;
        
        if (mountedRef.current) {
          setError(errorMessage);
          setLoadingWithTimeout(false);
        }
        return { success: false, error: errorMessage };
      }

      if (data?.session?.user) {
        console.log('✅ Session obtenida exitosamente');
        
        // CORREGIDO: Setear usuario inmediatamente, no esperar perfil
        const immediateUser = {
          id: data.session.user.id,
          name: data.session.user.email?.split('@')[0] || 'Usuario',
          full_name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'Usuario',
          username: data.session.user.email?.split('@')[0] || 'usuario',
          avatar_url: data.session.user.user_metadata?.avatar_url || null,
          email: data.session.user.email,
          points: 0,
          _cacheTime: Date.now()
        };

        if (mountedRef.current) {
          setUser(immediateUser);
          setLoadingWithTimeout(false);
          setError(null);
        }

        console.log('✅ SignIn completado exitosamente para:', immediateUser.name);

        // Background: intentar enriquecer con perfil de BD
        setTimeout(() => {
          fetchUserProfile(data.session.user.id, false).then(enriched => {
            if (enriched && mountedRef.current && enriched.username) {
              console.log('🎨 Perfil enriquecido con datos de BD');
              setUser(enriched);
            }
          }).catch(err => {
            console.log('ℹ️ No se pudo enriquecer perfil:', err.message);
          });
        }, 100);

        return { success: true, user: immediateUser };
      }

      throw new Error('No se recibió sesión válida de Supabase');

    } catch (err) {
      console.error('❌ Error crítico en signIn:', err);
      const errorMessage = err.message || 'Error de conexión';
      
      if (mountedRef.current) {
        setError(errorMessage);
        setLoadingWithTimeout(false);
      }
      
      return { success: false, error: errorMessage };
    }
  }, [setLoadingWithTimeout, fetchUserProfile]);

  // ===============================
  // RESTO DE FUNCIONES - SIN CAMBIOS
  // ===============================

  const signUp = useCallback(async (email, password, metadata = {}) => {
    try {
      setLoadingWithTimeout(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true, data };

    } catch (err) {
      const errorMessage = `Error de conexión: ${err.message}`;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoadingWithTimeout(false);
    }
  }, [setLoadingWithTimeout]);

  const signOut = useCallback(async () => {
    try {
      setLoadingWithTimeout(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error al cerrar sesión:', error);
        setError(error.message);
        return { success: false, error: error.message };
      }

      setUser(null);
      userCacheRef.current = null;
      setError(null);
      
      return { success: true };
      
    } catch (err) {
      const errorMessage = `Error cerrando sesión: ${err.message}`;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoadingWithTimeout(false);
    }
  }, [setLoadingWithTimeout]);

  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (err) {
      return { success: false, error: `Error de conexión: ${err.message}` };
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const updatedUser = {
        ...user,
        ...updates,
        name: updates.full_name || updates.name || user.name,
        full_name: updates.full_name || user.full_name,
        _cacheTime: Date.now()
      };
      
      setUser(updatedUser);
      userCacheRef.current = updatedUser;
      
      return { success: true, data: updatedUser };

    } catch (err) {
      return { success: false, error: `Error de conexión: ${err.message}` };
    }
  }, [user]);

  const refreshAuth = useCallback(() => {
    console.log('🔄 Refresh manual solicitado');
    userCacheRef.current = null;
    initializeAuth(true);
  }, [initializeAuth]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===============================
  // VALOR DEL CONTEXT
  // ===============================

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshAuth,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
