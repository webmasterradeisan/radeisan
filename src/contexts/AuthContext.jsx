// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Computed state
  const isAuthenticated = !!user;

  // CORREGIDO: Función para obtener perfil con mejor manejo de errores
  const fetchUserProfile = useCallback(async (userId) => {
    console.log('👤 INICIANDO fetchUserProfile para:', userId);
    
    try {
      // No cambiar loading aquí, se maneja desde donde se llama
      console.log('📋 Consultando user_profiles...');
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo perfil:', error);
        
        // Si no existe el perfil (código PGRST116), intentar crearlo
        if (error.code === 'PGRST116') {
          console.log('🔧 Perfil no existe, intentando crear...');
          const success = await createUserProfile(userId);
          return success; // true o false
        }
        
        // Otros errores
        console.error('❌ Error no recoverable en user_profiles:', error.message);
        return false;
      }

      if (!profile) {
        console.warn('⚠️ Perfil vacío obtenido de BD');
        return false;
      }

      console.log('✅ Perfil obtenido exitosamente:', { id: profile.id, name: profile.full_name });
      setUser(profile);
      return true;

    } catch (error) {
      console.error('❌ Error crítico en fetchUserProfile:', error);
      return false;
    }
  }, []);

  // CORREGIDO: Función para crear perfil con mejor manejo
  const createUserProfile = useCallback(async (userId) => {
    console.log('🔧 INICIANDO createUserProfile para:', userId);
    
    try {
      // Obtener datos del usuario de auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('❌ Error obteniendo datos de auth:', authError);
        return false;
      }

      if (authUser.id !== userId) {
        console.error('❌ Mismatch de user ID:', { expected: userId, actual: authUser.id });
        return false;
      }

      // CORREGIDO: Usar los nombres correctos de campos
      const newProfile = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 
                  authUser.user_metadata?.name || 
                  authUser.email?.split('@')[0] || 'Usuario',
        username: authUser.user_metadata?.username || `user_${Date.now()}`,
        points: 1000, // Puntos de bienvenida
        avatar_url: authUser.user_metadata?.avatar_url || null,
        is_business_account: authUser.user_metadata?.account_type === 'business' || false,
        created_at: authUser.created_at,
        updated_at: new Date().toISOString()
      };

      console.log('📝 Insertando nuevo perfil:', {
        id: newProfile.id,
        email: newProfile.email, 
        full_name: newProfile.full_name,
        username: newProfile.username
      });

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('❌ Error insertando perfil:', error);
        return false;
      }

      if (!data) {
        console.error('❌ No se recibió data del perfil insertado');
        return false;
      }

      console.log('✅ Perfil creado exitosamente:', { id: data.id, name: data.full_name });
      setUser(data);
      return true;

    } catch (error) {
      console.error('❌ Error crítico en createUserProfile:', error);
      return false;
    }
  }, []);

  // CORREGIDO: Inicialización mejorada con mejor manejo de estados
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🚀 INICIANDO inicialización de AuthContext...');
      
      try {
        // Obtener sesión actual
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Si hay sesión, obtener perfil del usuario
        if (session?.user) {
          console.log('👤 Sesión encontrada, obteniendo perfil...');
          const success = await fetchUserProfile(session.user.id);
          
          if (mounted) {
            if (!success) {
              console.warn('⚠️ No se pudo obtener/crear perfil, limpiando sesión');
              setUser(null);
            }
            setLoading(false);
          }
        } else {
          console.log('ℹ️ No hay sesión activa');
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // CORREGIDO: Listener mejorado con mejor manejo de estados
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔑 Auth state changed:', event, session?.user?.id || 'no-user');

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ Usuario firmado, obteniendo perfil...');
            setLoading(true);
            const success = await fetchUserProfile(session.user.id);
            
            if (!success) {
              console.warn('⚠️ Fallo obtener perfil después de sign in');
              setUser(null);
            }
            setLoading(false);
            
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 Usuario desconectado');
            setUser(null);
            setLoading(false);
            
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('🔄 Token refrescado');
            // Solo recargar perfil si no tenemos usuario o es diferente
            if (!user || user.id !== session.user.id) {
              setLoading(true);
              const success = await fetchUserProfile(session.user.id);
              if (!success) {
                console.warn('⚠️ Fallo obtener perfil después de token refresh');
                setUser(null);
              }
              setLoading(false);
            }
            
          } else if (event === 'USER_UPDATED' && session?.user) {
            console.log('👤 Usuario actualizado');
            // Recargar perfil cuando el usuario se actualiza
            setLoading(true);
            await fetchUserProfile(session.user.id);
            setLoading(false);
          }
          
        } catch (error) {
          console.error('❌ Error en onAuthStateChange:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    // Cleanup
    return () => {
      console.log('🧹 Limpiando AuthContext...');
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]); // CORREGIDO: Dependencias correctas

  // Iniciar sesión con email y contraseña
  const signIn = async (email, password) => {
    console.log('🔐 Intentando sign in:', email);
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('❌ Error en signIn:', error.message);
        setLoading(false);
        return { user: null, error: error.message };
      }

      console.log('✅ SignIn exitoso, esperando auth state change...');
      // No cambiar loading aquí, se manejará en onAuthStateChange
      return { user: data.user, error: null };
      
    } catch (error) {
      console.error('❌ Error crítico en signIn:', error);
      setLoading(false);
      return { user: null, error: 'Error de conexión' };
    }
  };

  // Registrar nuevo usuario
  const signUp = async ({ email, password, name, username, accountType = 'personal' }) => {
    console.log('📝 Intentando sign up:', email);
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(), // CORREGIDO: usar full_name
            name: name.trim(), // Mantener ambos por compatibilidad
            username: username.trim(),
            account_type: accountType
          }
        }
      });

      if (error) {
        console.error('❌ Error en signUp:', error.message);
        setLoading(false);
        return { user: null, error: error.message };
      }

      // Si la confirmación por email está deshabilitada, el usuario se crea inmediatamente
      if (data.user && !data.user.email_confirmed_at) {
        console.log('📧 Usuario creado, requiere confirmación de email');
        setLoading(false);
        return { 
          user: data.user, 
          error: null,
          needsEmailConfirmation: true
        };
      }

      console.log('✅ SignUp exitoso, esperando auth state change...');
      // No cambiar loading aquí, se manejará en onAuthStateChange
      return { user: data.user, error: null };
      
    } catch (error) {
      console.error('❌ Error crítico en signUp:', error);
      setLoading(false);
      return { user: null, error: 'Error de conexión' };
    }
  };

  // Iniciar sesión con proveedor OAuth
  const signInWithProvider = async (provider) => {
    console.log('🔗 Intentando OAuth con:', provider);
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/video-feed-dashboard`
        }
      });

      if (error) {
        console.error('❌ Error en OAuth:', error.message);
        setLoading(false);
        return { user: null, error: error.message };
      }

      console.log('🔗 OAuth iniciado, redirigiendo...');
      return { user: null, error: null }; // OAuth redirect, no user returned immediately
      
    } catch (error) {
      console.error(`❌ Error crítico en OAuth (${provider}):`, error);
      setLoading(false);
      return { user: null, error: 'Error de conexión' };
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    console.log('👋 Intentando sign out');
    
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Error en signOut:', error);
      } else {
        console.log('✅ SignOut exitoso');
      }
      
      // El estado se limpiará automáticamente por el listener
      
    } catch (error) {
      console.error('❌ Error crítico en signOut:', error);
      // Forzar limpieza local si falla el signOut remoto
      setUser(null);
      setLoading(false);
    }
  };

  // Restablecer contraseña
  const resetPassword = async (email) => {
    console.log('🔄 Intentando reset password:', email);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        console.error('❌ Error en resetPassword:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ Reset password email enviado');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error crítico en resetPassword:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Actualizar perfil de usuario
  const updateProfile = async (updates) => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    console.log('✏️ Actualizando perfil:', updates);

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
        console.error('❌ Error actualizando perfil:', error);
        return { success: false, error: error.message };
      }

      // Actualizar estado local
      setUser(data);
      console.log('✅ Perfil actualizado exitosamente');
      return { success: true, data };
      
    } catch (error) {
      console.error('❌ Error crítico en updateProfile:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Actualizar puntos del usuario
  const updatePoints = async (newPoints, reason = 'Activity') => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    console.log('💰 Actualizando puntos:', { newPoints, reason });

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
        console.error('❌ Error actualizando puntos:', error);
        return { success: false, error: error.message };
      }

      // Actualizar estado local
      setUser(data);
      console.log(`✅ Puntos actualizados: ${newPoints} (${reason})`);
      return { success: true, data };
      
    } catch (error) {
      console.error('❌ Error crítico en updatePoints:', error);
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

  // Debug info en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 AuthContext State:', {
      hasUser: !!user,
      loading,
      isAuthenticated,
      userId: user?.id
    });
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
