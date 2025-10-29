// src/contexts/AuthContext.jsx
// AuthContext CORREGIDO - Sin loops infinitos
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
  
  // Refs para evitar race conditions
  const mountedRef = useRef(true);
  const authSubscriptionRef = useRef(null);
  const initializingRef = useRef(false);
  const lastFetchRef = useRef(null);
  
  const isAuthenticated = !!user;

  // Función para obtener perfil de usuario - sin caché problemático
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId || !mountedRef.current) return null;

    // Evitar llamadas duplicadas en rápida sucesión
    const now = Date.now();
    if (lastFetchRef.current && (now - lastFetchRef.current) < 500) {
      console.log('⏱️ Throttling fetchUserProfile');
      return null;
    }
    lastFetchRef.current = now;

    try {
      console.log('🔍 Obteniendo perfil para:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id, 
          username, 
          avatar_url, 
          email, 
          full_name,
          admin_role:admin_roles!admin_roles_user_id_fkey(
            role_name, 
            permissions, 
            is_active
          )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Error en query de perfil:', error.message);
      }

      // Si hay datos del perfil
      if (data) {
        const profile = {
          id: data.id,
          email: data.email,
          username: data.username || data.email?.split('@')[0] || 'usuario',
          full_name: data.full_name || data.username || 'Usuario',
          name: data.full_name || data.username || data.email?.split('@')[0] || 'Usuario',
          avatar_url: data.avatar_url,
          points: 0,
          role: data.admin_role?.role_name || 'user',
          permissions: data.admin_role?.permissions || [],
          isActive: data.admin_role?.is_active !== false,
          admin_role: data.admin_role,
          isAdmin: ['super_admin', 'admin', 'moderator'].includes(data.admin_role?.role_name) && 
                   data.admin_role?.is_active !== false
        };
        
        console.log('✅ Perfil cargado:', profile.name, '| Role:', profile.role);
        return profile;
      }

      // Si no hay perfil, crear uno básico desde auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || authUser.id !== userId) {
        console.warn('⚠️ Usuario auth no coincide');
        return null;
      }

      const basicProfile = {
        id: authUser.id,
        email: authUser.email,
        username: authUser.email?.split('@')[0] || 'usuario',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
        avatar_url: authUser.user_metadata?.avatar_url || null,
        points: 0,
        role: 'user',
        permissions: [],
        isActive: true,
        admin_role: null,
        isAdmin: false
      };

      console.log('✅ Perfil básico creado:', basicProfile.name);
      return basicProfile;

    } catch (err) {
      console.error('❌ Error en fetchUserProfile:', err);
      return null;
    }
  }, []); // Sin dependencias para evitar recreación

  // Inicializar autenticación - SOLO UNA VEZ
  useEffect(() => {
    let isCancelled = false;

    const initializeAuth = async () => {
      // Prevenir múltiples inicializaciones
      if (initializingRef.current) {
        console.log('⏭️ Ya inicializando, skipping...');
        return;
      }

      initializingRef.current = true;
      console.log('🚀 Inicializando autenticación...');

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (isCancelled) return;

        if (sessionError) {
          console.error('❌ Error obteniendo sesión:', sessionError);
          setUser(null);
          setError(sessionError.message);
          setLoading(false);
          initializingRef.current = false;
          return;
        }

        if (session?.user) {
          console.log('✅ Sesión encontrada:', session.user.email);
          const profile = await fetchUserProfile(session.user.id);

          if (isCancelled) return;

          if (profile) {
            setUser(profile);
          } else {
            // Fallback a datos básicos
            setUser({
              id: session.user.id,
              email: session.user.email,
              username: session.user.email?.split('@')[0] || 'usuario',
              full_name: session.user.user_metadata?.full_name || 'Usuario',
              name: session.user.user_metadata?.full_name || 'Usuario',
              avatar_url: session.user.user_metadata?.avatar_url || null,
              points: 0,
              role: 'user',
              permissions: [],
              isAdmin: false,
              isActive: true,
              admin_role: null
            });
          }
        } else {
          console.log('ℹ️ No hay sesión activa');
          setUser(null);
        }

        setError(null);
      } catch (err) {
        console.error('❌ Error en inicialización:', err);
        if (!isCancelled) {
          setUser(null);
          setError(err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          initializingRef.current = false;
        }
      }
    };

    initializeAuth();

    // Configurar listener de cambios de auth
    console.log('🔗 Configurando listener de auth...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isCancelled) return;
        
        console.log('📡 Auth event:', event);

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              console.log('🔑 Usuario signed in');
              const profile = await fetchUserProfile(session.user.id);
              if (!isCancelled && profile) {
                setUser(profile);
                setLoading(false);
                setError(null);
              }
            }
            break;

          case 'SIGNED_OUT':
            console.log('🚪 Usuario signed out');
            if (!isCancelled) {
              setUser(null);
              setLoading(false);
              setError(null);
            }
            break;

          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refrescado');
            // Solo actualizar si es necesario
            if (session?.user && !isCancelled) {
              const profile = await fetchUserProfile(session.user.id);
              if (profile && !isCancelled) {
                setUser(profile);
              }
            }
            break;

          case 'USER_UPDATED':
            console.log('👤 Usuario actualizado');
            if (session?.user && !isCancelled) {
              const profile = await fetchUserProfile(session.user.id);
              if (profile && !isCancelled) {
                setUser(profile);
              }
            }
            break;

          default:
            break;
        }
      }
    );

    authSubscriptionRef.current = subscription;

    // Cleanup
    return () => {
      console.log('🧹 Limpiando AuthProvider...');
      isCancelled = true;
      mountedRef.current = false;
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
    };
  }, []); // Array vacío - solo ejecutar una vez

  const signIn = useCallback(async (email, password) => {
    try {
      console.log('🔑 Iniciando signIn...');
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
        console.error('❌ Error en signIn:', error);
        let errorMessage = error.message;
        
        if (error.message === 'Invalid login credentials') {
          errorMessage = 'Email o contraseña incorrectos';
        } else if (error.message === 'Email not confirmed') {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión';
        }
        
        setError(errorMessage);
        setLoading(false);
        return { success: false, error: errorMessage };
      }

      if (data?.session?.user) {
        console.log('✅ Sesión creada');
        const profile = await fetchUserProfile(data.session.user.id);
        
        if (profile) {
          setUser(profile);
          setError(null);
          console.log('✅ SignIn exitoso:', profile.email);
          return { success: true, user: profile };
        }
      }

      throw new Error('No se recibió sesión válida');
    } catch (err) {
      console.error('❌ Error en signIn:', err);
      const errorMessage = err.message || 'Error de conexión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
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
        console.error('❌ Error en signOut:', error);
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      setUser(null);
      setError(null);
      console.log('✅ SignOut exitoso');
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
        full_name: updates.full_name || user.full_name
      };
      
      setUser(updatedUser);
      return { success: true, data: updatedUser };
    } catch (err) {
      return { success: false, error: `Error de conexión: ${err.message}` };
    }
  }, [user]);

  const refreshAuth = useCallback(async () => {
    console.log('🔄 Refresh manual iniciado');
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          setUser(profile);
          console.log('✅ Auth refrescado');
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('❌ Error en refresh:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

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
