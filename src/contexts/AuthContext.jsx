// src/contexts/AuthContext.jsx
// AuthContext ULTRA ROBUSTO - Solución definitiva para loops y problemas de pestañas

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
  const MAX_LOADING_TIME = 10000; // 10 segundos máximo de loading
  const CACHE_DURATION = 30000; // 30 segundos de cache de usuario

  // ===============================
  // UTILIDADES DE CONTROL
  // ===============================

  const setLoadingWithTimeout = useCallback((isLoading) => {
    if (!mountedRef.current) return;

    setLoading(isLoading);

    // Timeout de seguridad para evitar loading infinito
    if (isLoading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      loadingTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('⚠️ Loading timeout alcanzado, forzando fin de loading');
          setLoading(false);
          setError('Timeout de autenticación');
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
  // GESTIÓN DE PERFIL DE USUARIO
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
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, email, points')
        .eq('id', userId)
        .maybeSingle(); // Usar maybeSingle en lugar de single para evitar errores si no existe

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error obteniendo perfil:', error);
        return null;
      }

      let profile;
      if (data) {
        // Perfil encontrado en BD
        profile = {
          id: data.id,
          name: data.full_name || 'Usuario',
          full_name: data.full_name || 'Usuario',
          username: data.username || 'usuario',
          avatar_url: data.avatar_url,
          email: data.email,
          points: data.points || 0,
          _cacheTime: Date.now()
        };
      } else {
        // No hay perfil en BD, usar datos básicos de auth
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
        } else {
          return null;
        }
      }

      // Actualizar cache
      userCacheRef.current = profile;
      console.log('✅ Perfil obtenido:', profile.name);
      return profile;

    } catch (err) {
      console.error('❌ Error crítico obteniendo perfil:', err);
      return null;
    }
  }, []);

  // ===============================
  // INICIALIZACIÓN DE AUTENTICACIÓN
  // ===============================

  const initializeAuth = useCallback(async (forceRefresh = false) => {
    if (shouldSkipCheck() && !forceRefresh) {
      console.log('⏭️ Saltando verificación (debounce/ya inicializando)');
      return;
    }

    initializingRef.current = true;
    lastCheckTimeRef.current = Date.now();

    try {
      console.log('🚀 Inicializando autenticación...', { forceRefresh });
      
      if (mountedRef.current) {
        setLoadingWithTimeout(true);
        setError(null);
      }

      // Verificar sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Error obteniendo sesión:', sessionError);
        throw new Error(`Error de sesión: ${sessionError.message}`);
      }

      if (session?.user && mountedRef.current) {
        console.log('✅ Sesión válida encontrada');
        
        // Obtener perfil del usuario
        const profile = await fetchUserProfile(session.user.id, !forceRefresh);
        
        if (profile && mountedRef.current) {
          setUser(profile);
          console.log('✅ Usuario autenticado exitosamente:', profile.name);
        } else {
          throw new Error('No se pudo cargar el perfil del usuario');
        }
      } else {
        console.log('ℹ️ No hay sesión activa');
        if (mountedRef.current) {
          setUser(null);
          userCacheRef.current = null;
        }
      }

    } catch (err) {
      console.error('❌ Error en inicialización:', err);
      if (mountedRef.current) {
        setUser(null);
        userCacheRef.current = null;
        setError(`Error de autenticación: ${err.message}`);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingWithTimeout(false);
      }
      initializingRef.current = false;
    }
  }, [shouldSkipCheck, fetchUserProfile, setLoadingWithTimeout]);

  // ===============================
  // CONFIGURACIÓN DE LISTENERS
  // ===============================

  useEffect(() => {
    console.log('🎬 Iniciando AuthProvider...');
    mountedRef.current = true;

    // Inicialización principal
    initializeAuth(true);

    // Configurar listener de auth (UNA SOLA VEZ)
    if (!authSubscriptionRef.current) {
      console.log('🔗 Configurando listener de autenticación...');
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mountedRef.current) return;

          console.log('📡 Auth event recibido:', event);

          // Solo manejar eventos críticos
          switch (event) {
            case 'SIGNED_IN':
              if (session?.user) {
                console.log('🔑 Usuario se autenticó');
                const profile = await fetchUserProfile(session.user.id, false);
                if (profile && mountedRef.current) {
                  setUser(profile);
                  setLoadingWithTimeout(false);
                  setError(null);
                }
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
              // Solo hacer log, no cambiar estado para evitar loops
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

    // Cleanup function
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
  }, []); // Sin dependencias para evitar re-inicializaciones

  // ===============================
  // MANEJO DE VISIBILIDAD DE PÁGINA
  // ===============================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!mountedRef.current) return;

      if (document.visibilityState === 'visible') {
        const timeSinceLastCheck = Date.now() - lastCheckTimeRef.current;
        
        // Solo verificar si ha pasado tiempo suficiente y hay un usuario
        if (timeSinceLastCheck > DEBOUNCE_TIME && user) {
          console.log('👁️ Página visible, verificando sesión...');
          
          // Verificación rápida sin cambiar loading
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
  // FUNCIONES DE AUTENTICACIÓN
  // ===============================

  const signIn = useCallback(async (email, password) => {
    try {
      console.log('🔑 INICIANDO signIn para:', email);
      setLoadingWithTimeout(true);
      setError(null);

      // Verificar que tenemos credenciales
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      console.log('📡 Llamando a supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      console.log('📥 Respuesta de Supabase:', { data: !!data, error: !!error });

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
        
        // Intentar obtener el perfil inmediatamente
        try {
          const profile = await fetchUserProfile(data.session.user.id, false);
          if (profile && mountedRef.current) {
            console.log('✅ Perfil obtenido en signIn:', profile.name);
            setUser(profile);
            setLoadingWithTimeout(false);
            return { success: true, user: profile };
          }
        } catch (profileError) {
          console.warn('⚠️ Error obteniendo perfil en signIn:', profileError);
          // Continuar con datos básicos de la sesión
        }

        // Fallback: usar datos básicos de la sesión
        const basicUser = {
          id: data.session.user.id,
          name: data.session.user.email?.split('@')[0] || 'Usuario',
          full_name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'Usuario',
          email: data.session.user.email,
          avatar_url: data.session.user.user_metadata?.avatar_url || null,
          points: 0,
          _cacheTime: Date.now()
        };

        if (mountedRef.current) {
          setUser(basicUser);
          setLoadingWithTimeout(false);
        }

        return { success: true, user: basicUser };
      }

      // No debería llegar aquí, pero por seguridad
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

      // Limpiar estado inmediatamente
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

  // ===============================
  // FUNCIONES DE PERFIL
  // ===============================

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

      // Actualizar estado local y cache
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

  // ===============================
  // FUNCIONES DE UTILIDAD
  // ===============================

  const refreshAuth = useCallback(() => {
    console.log('🔄 Refresh manual solicitado');
    userCacheRef.current = null; // Limpiar cache
    initializeAuth(true);
  }, [initializeAuth]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===============================
  // VALOR DEL CONTEXT
  // ===============================

  const value = {
    // Estado
    user,
    loading,
    error,
    isAuthenticated,
    
    // Funciones de autenticación
    signIn,
    signUp,
    signOut,
    resetPassword,
    
    // Funciones de perfil
    updateProfile,
    
    // Utilidades
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
