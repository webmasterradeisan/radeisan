// src/contexts/AuthContext.jsx
// AuthContext CORREGIDO - Sin loops al cambiar pestañas/ventanas

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

  // Referencias para evitar múltiples llamadas
  const initializingRef = useRef(false);
  const lastSessionCheckRef = useRef(0);
  const mountedRef = useRef(true);

  // Computed state
  const isAuthenticated = !!user;

  // Debounce para evitar múltiples verificaciones
  const DEBOUNCE_TIME = 2000; // 2 segundos

  // ===============================
  // FUNCIÓN PARA OBTENER PERFIL
  // ===============================
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId || !mountedRef.current) return null;

    try {
      console.log('👤 Obteniendo perfil para usuario:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, email, points')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo perfil:', error);
        return null;
      }

      const profile = {
        id: data.id,
        name: data.full_name || data.name || 'Usuario',
        full_name: data.full_name || data.name || 'Usuario',
        username: data.username || 'usuario',
        avatar_url: data.avatar_url,
        email: data.email,
        points: data.points || 0
      };

      console.log('✅ Perfil obtenido exitosamente:', profile.name);
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
    // Evitar múltiples inicializaciones simultáneas
    if (initializingRef.current && !forceRefresh) {
      console.log('⏸️ Inicialización ya en curso, saltando...');
      return;
    }

    // Debounce para evitar llamadas muy frecuentes
    const now = Date.now();
    if (now - lastSessionCheckRef.current < DEBOUNCE_TIME && !forceRefresh) {
      console.log('⏸️ Verificación reciente, saltando...');
      return;
    }

    initializingRef.current = true;
    lastSessionCheckRef.current = now;

    try {
      console.log('🚀 Inicializando autenticación...');
      
      if (!mountedRef.current) return;
      setError(null);

      // Obtener sesión actual de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Error obteniendo sesión:', sessionError);
        if (mountedRef.current) {
          setUser(null);
          setLoading(false);
          setError('Error de autenticación');
        }
        return;
      }

      if (session?.user && mountedRef.current) {
        console.log('✅ Sesión válida encontrada');
        
        // Obtener perfil del usuario
        const profile = await fetchUserProfile(session.user.id);
        
        if (profile && mountedRef.current) {
          setUser(profile);
          console.log('✅ Usuario autenticado:', profile.name);
        } else if (mountedRef.current) {
          // Si no se puede obtener el perfil, usar datos básicos de la sesión
          const basicUser = {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'Usuario',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
            email: session.user.email,
            avatar_url: session.user.user_metadata?.avatar_url || null,
            points: 0
          };
          setUser(basicUser);
          console.log('⚠️ Usando datos básicos de sesión');
        }
      } else if (mountedRef.current) {
        console.log('ℹ️ No hay sesión activa');
        setUser(null);
      }

    } catch (err) {
      console.error('❌ Error crítico en inicialización:', err);
      if (mountedRef.current) {
        setUser(null);
        setError('Error de conexión');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      initializingRef.current = false;
    }
  }, [fetchUserProfile]);

  // ===============================
  // EFECTOS PRINCIPALES
  // ===============================

  // Inicialización única al montar
  useEffect(() => {
    console.log('🎬 INICIANDO AuthProvider...');
    mountedRef.current = true;
    initializeAuth(true);

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Listener de cambios de autenticación (solo eventos importantes)
  useEffect(() => {
    console.log('🔄 Configurando listener de auth...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        console.log('📡 Auth event:', event);

        // Solo manejar eventos importantes, ignorar TOKEN_REFRESHED
        if (event === 'SIGNED_IN') {
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile && mountedRef.current) {
              setUser(profile);
              setLoading(false);
              setError(null);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (mountedRef.current) {
            setUser(null);
            setLoading(false);
            setError(null);
          }
        }
        // Ignorar TOKEN_REFRESHED y otros eventos para evitar loops
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  // ===============================
  // FUNCIONES DE AUTENTICACIÓN
  // ===============================

  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      // El listener se encargará de actualizar el estado
      return { success: true, data };

    } catch (err) {
      const errorMessage = 'Error de conexión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email, password, metadata = {}) => {
    try {
      setLoading(true);
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
      const errorMessage = 'Error de conexión';
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
        console.error('Error signing out:', error);
      }
      
      // Limpiar estado local inmediatamente
      setUser(null);
      setError(null);
      
      return { success: !error };
    } catch (err) {
      console.error('Error in signOut:', err);
      return { success: false };
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
      return { success: false, error: 'Error de conexión' };
    }
  }, []);

  // ===============================
  // ACTUALIZACIÓN DE PERFIL
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

      // Actualizar estado local
      const updatedUser = {
        ...user,
        ...updates,
        name: updates.full_name || updates.name || user.name,
        full_name: updates.full_name || user.full_name
      };
      
      setUser(updatedUser);
      return { success: true, data: updatedUser };

    } catch (err) {
      return { success: false, error: 'Error de conexión' };
    }
  }, [user]);

  // ===============================
  // REFRESH MANUAL
  // ===============================

  const refreshAuth = useCallback(() => {
    console.log('🔄 Refresh manual solicitado');
    initializeAuth(true);
  }, [initializeAuth]);

  // ===============================
  // PROVIDER VALUE
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
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
