// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
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
  // Estados simples y claros
  const [user, setUser] = useState(null); // null = no autenticado, object = autenticado
  const [loading, setLoading] = useState(true); // true hasta verificar sesión inicial
  
  // Computed state
  const isAuthenticated = !!user;

  // Inicializar estado de autenticación al cargar la app
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Obtener sesión actual
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Si hay sesión, obtener perfil del usuario
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          // No hay sesión - usuario no autenticado
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔑 Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Refrescar perfil si es necesario
          if (!user || user.id !== session.user.id) {
            await fetchUserProfile(session.user.id);
          }
        }
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Obtener perfil del usuario desde la base de datos
  const fetchUserProfile = async (userId) => {
    try {
      setLoading(true);

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Si no existe el perfil, intentar crearlo
        if (error.code === 'PGRST116') {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            await createUserProfile(authUser);
            return;
          }
        }
        setUser(null);
        return;
      }

      setUser(profile);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Crear perfil de usuario en la base de datos
  const createUserProfile = async (authUser) => {
    try {
      const newProfile = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email.split('@')[0],
        username: authUser.user_metadata?.username || `user_${Date.now()}`,
        points: 1000, // Puntos de bienvenida
        avatar_url: authUser.user_metadata?.avatar_url || null,
        is_business_account: authUser.user_metadata?.account_type === 'business',
        created_at: authUser.created_at,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        setUser(null);
        return;
      }

      setUser(data);
      console.log('✅ Profile created with 1000 welcome points');
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      setUser(null);
    }
  };

  // Iniciar sesión con email y contraseña
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      // El perfil se cargará automáticamente por el listener de auth state
      return { user: data.user, error: null };
      
    } catch (error) {
      console.error('Error in signIn:', error);
      return { user: null, error: 'Error de conexión' };
    }
  };

  // Registrar nuevo usuario
  const signUp = async ({ email, password, name, username, accountType = 'personal' }) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            username: username.trim(),
            account_type: accountType
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      // Si la confirmación por email está deshabilitada, el usuario se crea inmediatamente
      if (data.user && !data.user.email_confirmed_at) {
        return { 
          user: data.user, 
          error: null,
          needsEmailConfirmation: true
        };
      }

      return { user: data.user, error: null };
      
    } catch (error) {
      console.error('Error in signUp:', error);
      return { user: null, error: 'Error de conexión' };
    }
  };

  // Iniciar sesión con proveedor OAuth
  const signInWithProvider = async (provider) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: null, error: null }; // OAuth redirect, no user returned immediately
      
    } catch (error) {
      console.error(`Error in signInWithProvider (${provider}):`, error);
      return { user: null, error: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // El estado se limpiará automáticamente por el listener
      
    } catch (error) {
      console.error('Error in signOut:', error);
    }
  };

  // Restablecer contraseña
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Actualizar perfil de usuario
  const updateProfile = async (updates) => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }

      // Actualizar estado local
      setUser(data);
      return { success: true, data };
      
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Actualizar puntos del usuario
  const updatePoints = async (newPoints, reason = 'Activity') => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating points:', error);
        return { success: false, error: error.message };
      }

      // Actualizar estado local
      setUser(data);
      console.log(`✅ Points updated: ${newPoints} (${reason})`);
      return { success: true, data };
      
    } catch (error) {
      console.error('Error in updatePoints:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Añadir puntos (helper function)
  const addPoints = async (pointsToAdd, reason = 'Activity') => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }
    
    const newPoints = (user.points || 0) + pointsToAdd;
    return await updatePoints(newPoints, reason);
  };

  // Verificar si el usuario está autenticado (útil para componentes)
  const checkAuth = () => {
    return isAuthenticated;
  };

  const value = {
    // Estado
    user,
    loading,
    isAuthenticated,
    
    // Funciones de autenticación
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    resetPassword,
    
    // Funciones de perfil
    updateProfile,
    updatePoints,
    addPoints,
    
    // Utilidades
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
