// src/contexts/AuthContext.jsx
// AuthContext ESTABLE - Fix para timeout de perfil (CON CORRECCIÓN CRÍTICA PARA 'user_metadata')
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
  const sessionCheckedRef = useRef(false);
  
  const isAuthenticated = !!user;

  // Crear usuario desde sesión (fallback rápido)
  const createUserFromSession = useCallback((session) => {
    // 🛑 CORRECCIÓN: Si session o session.user es nulo/undefined, devolvemos null.
    if (!session || !session.user) {
        return null;
    }
    
    // 🛑 CORRECCIÓN CRÍTICA: Garantizar que user_metadata sea un objeto, incluso si es null.
    const metadata = session.user.user_metadata || {};
    
    return {
      id: session.user.id,
      email: session.user.email,
      username: session.user.email?.split('@')[0] || 'usuario',
      
      // Usamos el objeto 'metadata' seguro para evitar el crash 'reading full_name'
      full_name: metadata.full_name || 'Usuario', 
      name: metadata.full_name || session.user.email?.split('@')[0] || 'Usuario',
      
      avatar_url: metadata.avatar_url || null,
      points: 0,
      role: 'user',
      permissions: [],
      isAdmin: false,
      isActive: true,
      admin_role: null
    };
  }, []);

  // Función para obtener perfil (en background, no bloqueante)
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId || !mountedRef.current) return null;

    try {
      console.log('🔍 Obteniendo perfil para:', userId);
      
      // Timeout para query de perfil
      const profilePromise = supabase
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

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 4000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Error obteniendo perfil:', error.message);
        return null;
      }

      if (data) {
        console.log('✅ Perfil completo cargado');
        
        // 🛑 LÓGICA DE FUSIÓN Y ASIGNACIÓN DE ROLES (MANTENIDA DE TU CÓDIGO)
        return {
          id: data.id,
          email: data.email,
          username: data.username || data.email?.split('@')[0] || 'usuario',
          full_name: data.full_name || data.username || 'Usuario',
          name: data.full_name || data.username || data.email?.split('@')[0] || 'Usuario',
          avatar_url: data.avatar_url,
          points: 0,
          role: data.admin_role?.role_name || 'user', // Esto carga el rol correcto (Super Admin o Moderador)
          permissions: data.admin_role?.permissions || [],
          isActive: data.admin_role?.is_active !== false,
          admin_role: data.admin_role,
          isAdmin: ['super_admin', 'admin', 'moderator'].includes(data.admin_role?.role_name) && 
                   data.admin_role?.is_active !== false
        };
      }

      return null;

    } catch (err) {
      console.warn('⚠️ Error en fetchUserProfile:', err.message);
      return null;
    }
  }, []);

  // Inicializar autenticación
  useEffect(() => {
    let isCancelled = false;

    const initializeAuth = async () => {
      if (initializingRef.current) {
        console.log('⏭️ Ya inicializando, skipping...');
        return;
      }

      initializingRef.current = true;
      console.log('🚀 Inicializando autenticación...');

      try {
        // Obtener sesión primero (rápido)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        sessionCheckedRef.current = true;

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
          
          // CRÍTICO: Usar la función de creación segura
          const basicUser = createUserFromSession(session);
          
          // Si por alguna razón la sesión es válida pero el basicUser es null (ej. datos mínimos faltantes)
          if (!basicUser) {
             setUser(null);
             setLoading(false);
             initializingRef.current = false;
             return;
          }
          
          // 🛑 CRÍTICO para PointsContext: Establecer usuario básico INMEDIATAMENTE
          setUser(basicUser);
          setLoading(false); // ⬅️ Terminar loading AHORA para desbloquear PointsContext
          
          console.log('👤 Usuario básico establecido, cargando perfil completo en background...');

          // Intentar obtener perfil completo en BACKGROUND (no bloqueante)
          fetchUserProfile(session.user.id).then(profile => {
            if (profile && !isCancelled && mountedRef.current) {
              console.log('✅ Perfil completo cargado, actualizando usuario');
              // Mantener el email del basicUser si el profile no lo trae
              setUser({ ...basicUser, ...profile });
            } else {
              console.log('ℹ️ Usando perfil básico');
            }
          }).catch(err => {
            console.warn('⚠️ No se pudo cargar perfil completo:', err.message);
          });

        } else {
          console.log('ℹ️ No hay sesión activa');
          setUser(null);
          setLoading(false);
        }

        setError(null);

      } catch (err) {
        console.error('❌ Error en inicialización:', err);
        sessionCheckedRef.current = true;
        if (!isCancelled) {
          setUser(null);
          setError(err.message);
          setLoading(false);
        }
      } finally {
        if (!isCancelled && mountedRef.current) {
          initializingRef.current = false;
          console.log('✅ Inicialización completada');
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

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              console.log('🔑 Usuario signed in');
              
              const basicUser = createUserFromSession(session);
              if (!basicUser) return; // Si falla la creación, no hacer nada

              // Establecer usuario básico inmediatamente
              setUser(basicUser);
              setLoading(false);
              
              // Cargar perfil completo en background
              fetchUserProfile(session.user.id).then(profile => {
                if (profile && !isCancelled && mountedRef.current) {
                  setUser({ ...basicUser, ...profile });
                }
              });
            }
            break;

          case 'SIGNED_OUT':
            console.log('🚪 Usuario signed out');
            if (!isCancelled && mountedRef.current) {
              setUser(null);
              setLoading(false);
              setError(null);
            }
            break;

          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            console.log(`🔄 Evento: ${event}`);
            if (session?.user && !isCancelled && mountedRef.current) {
              fetchUserProfile(session.user.id).then(profile => {
                if (profile) {
                  const basicUser = createUserFromSession(session);
                   setUser({ ...basicUser, ...profile }); // Fusión segura
                }
              });
            }
            break;

          default:
            break;
        }
      }
    );

    return () => {
      console.log('🧹 Limpiando AuthProvider...');
      isCancelled = true;
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, createUserFromSession]);

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

      // 🛑 SIGNED_IN es manejado por el listener de AuthStateChange, que es más seguro.
      // Solo necesitamos confirmar que la promesa se completó.
      if (data.session) {
        return { success: true, user: data.user };
      }

      throw new Error('No se recibió sesión válida');
    } catch (err) {
      console.error('❌ Error en signIn:', err);
      const errorMessage = err.message || 'Error de conexión';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [createUserFromSession, fetchUserProfile]);


  // ... (el resto de las funciones: signUp, signOut, resetPassword, updateProfile, refreshAuth, clearError) ...
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
      console.log('🚪 Cerrando sesión...');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Error en signOut:', error);
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      // setUser(null) es manejado por el listener
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
        full_name: updates.full_name || user.full_name,
        bio: updates.bio || user.bio || ''
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
        const basicUser = createUserFromSession(session);
        setUser(basicUser);
        
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          setUser({ ...basicUser, ...profile });
        }
        
        console.log('✅ Auth refrescado');
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('❌ Error en refresh:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, createUserFromSession]);

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
