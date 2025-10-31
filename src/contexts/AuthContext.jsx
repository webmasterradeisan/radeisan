// src/contexts/AuthContext.jsx
// AuthContext HÍBRIDO - VERSIÓN CORREGIDA CON FOREIGN KEY EXPLÍCITA
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const authSubscriptionRef = useRef(null);
  const userCacheRef = useRef(null);
  const isAuthenticated = !!user;
  const CACHE_DURATION = 30000;

  const fetchUserProfile = useCallback(async (userId, useCache = true) => {
    if (!userId || !mountedRef.current) return null;

    const cachedUser = userCacheRef.current;
    if (useCache && cachedUser && cachedUser.id === userId) {
      const cacheAge = Date.now() - cachedUser._cacheTime;
      if (cacheAge < CACHE_DURATION) {
        console.log('📦 Usando perfil en cache');
        return cachedUser;
      }
    }

    try {
      console.log('🔍 Obteniendo perfil de BD para:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id, 
          username, 
          avatar_url, 
          email, 
          full_name,
          admin_role:admin_roles!admin_roles_user_id_fkey(role_name, permissions, is_active)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Error obteniendo perfil de BD:', error);
      }

      let profile;
      if (data) {
        profile = {
          id: data.id,
          name: data.full_name || data.username || data.email?.split('@')[0] || 'Usuario',
          full_name: data.full_name || data.username || 'Usuario',
          username: data.username || data.email?.split('@')[0] || 'usuario',
          avatar_url: data.avatar_url,
          email: data.email,
          points: 0,
          role: data.admin_role?.role_name || 'user',
          permissions: data.admin_role?.permissions || [],
          isActive: data.admin_role?.is_active !== false,
          admin_role: data.admin_role,
          isAdmin: ['super_admin', 'admin', 'moderator'].includes(data.admin_role?.role_name) && data.admin_role?.is_active !== false,
          _cacheTime: Date.now()
        };
        console.log('✅ Perfil cargado:', profile.name, '| Role:', profile.role, '| Admin:', profile.isAdmin);
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.id === userId) {
          profile = {
            id: authUser.id,
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
            username: authUser.email?.split('@')[0] || 'usuario',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            email: authUser.email,
            points: 0,
            role: 'user',
            permissions: [],
            isActive: true,
            admin_role: null,
            isAdmin: false,
            _cacheTime: Date.now()
          };
          console.log('✅ Perfil básico creado:', profile.name);
        } else {
          return null;
        }
      }

      userCacheRef.current = profile;
      return profile;
    } catch (err) {
      console.error('❌ Error en fetchUserProfile:', err);
      return null;
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      console.log('🚀 Inicializando autenticación...');
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Error obteniendo sesión:', sessionError);
        if (mountedRef.current) {
          setUser(null);
          setError(sessionError.message);
          setLoading(false);
        }
        return;
      }

      if (session?.user && mountedRef.current) {
        console.log('✅ Sesión válida encontrada:', session.user.email);
        const fullProfile = await fetchUserProfile(session.user.id, false);
        
        if (fullProfile && mountedRef.current) {
          setUser(fullProfile);
          setLoading(false);
        } else {
          const basicUser = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
            username: session.user.email?.split('@')[0] || 'usuario',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            email: session.user.email,
            points: 0,
            role: 'user',
            permissions: [],
            isAdmin: false,
            isActive: true,
            admin_role: null,
            _cacheTime: Date.now()
          };
          setUser(basicUser);
          setLoading(false);
        }
      } else {
        console.log('ℹ️ No hay sesión activa');
        if (mountedRef.current) {
          setUser(null);
          userCacheRef.current = null;
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('❌ Error en inicialización:', err);
      if (mountedRef.current) {
        setUser(null);
        userCacheRef.current = null;
        setError(err.message);
        setLoading(false);
      }
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    console.log('🎬 Iniciando AuthProvider...');
    mountedRef.current = true;
    initializeAuth();

    if (!authSubscriptionRef.current) {
      console.log('🔗 Configurando listener de auth...');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mountedRef.current) return;
          console.log('📡 Auth event:', event);

          switch (event) {
            case 'SIGNED_IN':
              if (session?.user) {
                console.log('🔑 SIGNED_IN detectado');
                const fullProfile = await fetchUserProfile(session.user.id, false);
                if (fullProfile && mountedRef.current) {
                  setUser(fullProfile);
                  setLoading(false);
                  setError(null);
                }
              }
              break;
            case 'SIGNED_OUT':
              console.log('🚪 SIGNED_OUT detectado');
              if (mountedRef.current) {
                setUser(null);
                userCacheRef.current = null;
                setLoading(false);
                setError(null);
              }
              break;
            case 'TOKEN_REFRESHED':
              console.log('🔄 Token refrescado');
              break;
            default:
              break;
          }
        }
      );
      authSubscriptionRef.current = subscription;
    }

    return () => {
      console.log('🧹 Limpiando AuthProvider...');
      mountedRef.current = false;
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
    };
  }, [initializeAuth, fetchUserProfile]);

  const signIn = useCallback(async (email, password) => {
    try {
      console.log('🔑 INICIANDO signIn para:', email);
      setLoading(true);
      setError(null);

      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        console.error('❌ Error de Supabase signIn:', error);
        let errorMessage = error.message;
        if (error.message === 'Invalid login credentials') {
          errorMessage = 'Email o contraseña incorrectos';
        } else if (error.message === 'Email not confirmed') {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión';
        }
        if (mountedRef.current) {
          setError(errorMessage);
          setLoading(false);
        }
        return { success: false, error: errorMessage };
      }

      if (data?.session?.user) {
        console.log('✅ Sesión obtenida exitosamente');
        const fullProfile = await fetchUserProfile(data.session.user.id, false);
        
        if (fullProfile && mountedRef.current) {
          setUser(fullProfile);
          setLoading(false);
          setError(null);
          console.log('✅ SignIn completado:', fullProfile.email, '| Role:', fullProfile.role);
          return { success: true, user: fullProfile };
        }
      }

      throw new Error('No se recibió sesión válida');
    } catch (err) {
      console.error('❌ Error crítico en signIn:', err);
      const errorMessage = err.message || 'Error de conexión';
      if (mountedRef.current) {
        setError(errorMessage);
        setLoading(false);
      }
      return { success: false, error: errorMessage };
    }
  }, [fetchUserProfile]);

  const signUp = useCallback(async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
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
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }, []);

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
    initializeAuth();
  }, [initializeAuth]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
