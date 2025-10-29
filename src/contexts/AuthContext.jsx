// src/contexts/AuthContext.jsx
// AuthContext ESTABLE - Sin expulsión de sesión
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
  const initializingRef = useRef(false);
  
  const isAuthenticated = !!user;

  // Función para obtener perfil de usuario
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId || !mountedRef.current) return null;

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

      // Si hay error, no lo tratamos como crítico
      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Error obteniendo perfil:', error.message);
      }

      // Si hay datos del perfil
      if (data) {
        return {
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
      }

      // Fallback a usuario de auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && authUser.id === userId) {
        return {
          id: authUser.id,
          email: authUser.email,
          username: authUser.email?.split('@')[0] || 'usuario',
          full_name: authUser.user_metadata?.full_name || 'Usuario',
          name: authUser.user_metadata?.full_name || 'Usuario',
          avatar_url: authUser.user_metadata?.avatar_url || null,
          points: 0,
          role: 'user',
          permissions: [],
          isActive: true,
          admin_role: null,
          isAdmin: false
        };
      }

      return null;
    } catch (err) {
      console.error('❌ Error en fetchUserProfile:', err);
      // IMPORTANTE: Retornar null pero NO lanzar error
      return null;
    }
  }, []);

  // Inicializar autenticación
  useEffect(() => {
    let isCancelled = false;

    const initializeAuth = async () => {
      if (initializingRef.current) {
        return;
      }

      initializingRef.current = true;
      console.log('🚀 Inicializando autenticación...');

      try {
        // Timeout de seguridad para garantizar que loading termine
        const timeoutId = setTimeout(() => {
          if (mountedRef.current && !isCancelled) {
            console.warn('⚠️ Timeout alcanzado, terminando loading');
            setLoading(false);
            initializingRef.current = false;
          }
        }, 5000); // 5 segundos máximo

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        clearTimeout(timeoutId);

        if (isCancelled) return;

        if (sessionError) {
          console.error('❌ Error obteniendo sesión:', sessionError);
          // NO cerrar sesión, solo mostrar sin usuario
          setUser(null);
          setLoading(false);
          initializingRef.current = false;
          return;
        }

        if (session?.user) {
          console.log('✅ Sesión encontrada:', session.user.email);
          
          // Intentar obtener perfil completo
          const profile = await fetchUserProfile(session.user.id);

          if (isCancelled) return;

          if (profile) {
            console.log('✅ Perfil cargado:', profile.name);
            setUser(profile);
          } else {
            // Usar datos básicos de la sesión si falla el perfil
            console.log('⚠️ Usando perfil básico de sesión');
            setUser({
              id: session.user.id,
              email: session.user.email,
              username: session.user.email?.split('@')[0] || 'usuario',
              full_name: session.user.user_metadata?.full_name || 'Usuario',
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
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

      } catch (err) {
        console.error('❌ Error en inicialización:', err);
        if (!isCancelled) {
          setUser(null);
        }
      } finally {
        if (!isCancelled && mountedRef.current) {
          console.log('✅ Inicialización completada');
          setLoading(false);
          initializingRef.current = false;
        }
      }
    };

    initializeAuth();

    // Listener de cambios de auth
    console.log('🔗 Configurando listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isCancelled) return;
        
        console.log('📡 Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔑 Usuario signed in');
          const profile = await fetchUserProfile(session.user.id);
          if (!isCancelled && mountedRef.current) {
            setUser(profile || {
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
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Usuario signed out');
          if (!isCancelled && mountedRef.current) {
            setUser(null);
            setLoading(false);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Token refrescado');
          // Actualizar usuario silenciosamente sin cambiar loading
          if (!isCancelled && mountedRef.current) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
        }
      }
    );

    return () => {
      console.log('🧹 Limpiando AuthProvider...');
      isCancelled = true;
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

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
        
        const finalUser = profile || {
          id: data.session.user.id,
          email: data.session.user.email,
          username: data.session.user.email?.split('@')[0] || 'usuario',
          full_name: data.session.user.user_metadata?.full_name || 'Usuario',
          name: data.session.user.user_metadata?.full_name || 'Usuario',
          avatar_url: data.session.user.user_metadata?.avatar_url || null,
          points: 0,
          role: 'user',
          permissions: [],
          isAdmin: false,
          isActive: true,
          admin_role: null
        };

        setUser(finalUser);
        setError(null);
        setLoading(false);
        console.log('✅ SignIn exitoso:', finalUser.email);
        return { success: true, user: finalUser };
      }

      throw new Error('No se recibió sesión válida');
    } catch (err) {
      console.error('❌ Error en signIn:', err);
      const errorMessage = err.message || 'Error de conexión';
      setError(errorMessage);
      setLoading(false);
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
