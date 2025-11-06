// src/contexts/AuthContext.jsx
// ============================================================================
// AuthContext FINAL ESTABLE - Fix para Carrera de Contextos y Roles Administrativos
// ============================================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // ⚠️ Si ves este error, DEBES envolver tu componente principal (<Routes />) en <AuthProvider> en App.jsx
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const mountedRef = useRef(true);
  const isAuthenticated = !!user;

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  // Función unificada para obtener y construir el objeto de usuario final
  const getAndProcessUserProfile = useCallback(async (session) => {
    const userId = session?.user?.id;
    if (!userId) return null;

    try {
      // 1. Obtener perfil de la tabla 'profiles'
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = No row found
        console.error('❌ Error fetching user profile:', profileError);
      }
      
      const userData = session.user;
      const metadata = userData.user_metadata || {};
      
      // Construir el objeto de usuario final combinando Auth, Metadata y Profile
      const finalUser = {
        id: userId,
        email: userData.email,
        username: profile?.username || metadata?.username || userData.email?.split('@')[0] || 'usuario',
        full_name: profile?.full_name || metadata?.full_name || 'Usuario',
        avatar_url: profile?.avatar_url || metadata?.avatar_url || null,
        points: profile?.points || 0, // Asignar 0 si no está en profile o es nulo
        permissions: profile?.permissions || [],
        isActive: profile?.is_active ?? true,
        profile_completed: profile?.profile_completed ?? false,
        
        // 🛑 CORRECCIÓN CRÍTICA PARA EL ROL DE ADMINISTRADOR:
        // El rol principal es el admin_role si existe. Si no, usa profile.role, sino 'user'.
        admin_role: profile?.admin_role || null, // 'Super Admin'
        isAdmin: profile?.admin_role !== null,
        role: profile?.admin_role || profile?.role || 'user', // Soluciona la degradación de rol
        
        // Campo de display
        name: profile?.full_name || profile?.username || userData.email?.split('@')[0] || 'Usuario',
      };
      
      return finalUser;

    } catch (err) {
      console.error('❌ Excepción al buscar/procesar perfil:', err);
      return null;
    }
  }, []);

  // ===========================================================================
  // EFECTO PRINCIPAL DE AUTENTICACIÓN
  // ===========================================================================
  
  useEffect(() => {
    // Función para manejar la sesión (Inicial y Cambios de Estado)
    const handleAuthEvent = async (currentSession) => {
      setLoading(true); // Siempre cargar al inicio de un evento de autenticación

      try {
        if (currentSession) {
          // 🛑 CORRECCIÓN CLAVE: Esperar el perfil completo antes de actualizar el estado
          const fullProfile = await getAndProcessUserProfile(currentSession);

          if (mountedRef.current && fullProfile) {
             setUser(fullProfile);
          } else if (mountedRef.current) {
             // Si hay sesión pero falla la carga del perfil, solo usar los datos básicos
             // En un caso real, esto requeriría una función separada robusta, pero por ahora, forzamos un log.
             console.warn('⚠️ No se pudo obtener el perfil completo. La sesión es válida, pero el estado de usuario puede ser básico.');
             setUser(null); // O forzar un estado 'básico' si es necesario
          }
        } else {
          // No hay sesión
          setUser(null);
        }
      } catch (err) {
        console.error('❌ Error general en la gestión de Auth:', err);
        setUser(null);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    // 1. Manejar la sesión inicial de forma síncrona/esperada
    const checkInitialSession = async () => {
      if (mountedRef.current) {
          const { data: { session } } = await supabase.auth.getSession();
          // Este initial check manejará la primera carga del contexto
          await handleAuthEvent(session); 
      }
    };
    
    checkInitialSession();
    
    // 2. Suscripción a cambios de estado (LOGIN, LOGOUT, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;
        
        // Si hay un cambio de sesión (ej. SIGNED_IN), lo manejamos
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
           // Usamos el session object que nos da el evento para manejar el cambio de estado
           handleAuthEvent(session);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, [getAndProcessUserProfile]);

  // ===========================================================================
  // FUNCIONES DE AUTENTICACIÓN
  // ===========================================================================

  const signIn = useCallback(async (credentials) => {
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(credentials);
      if (authError) {
        throw authError;
      }
      // El onAuthStateChange manejará la actualización del estado de 'user'
      return { success: true, data: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const signUp = useCallback(async (credentials) => {
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp(credentials);
      if (authError) {
        throw authError;
      }
      // El onAuthStateChange manejará la actualización del estado de 'user'
      return { success: true, data: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) {
        throw authError;
      }
      // El onAuthStateChange manejará el setUser(null)
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (authError) {
        throw authError;
      }
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);
  
  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }
    
    try {
      // Actualizar la tabla 'profiles'
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name,
          username: updates.username,
          avatar_url: updates.avatar_url,
          profile_completed: true,
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      // Actualizar el estado local con los datos combinados (simplificado)
      const updatedUser = {
        ...user,
        ...profileData, 
        name: profileData.full_name || profileData.username,
        full_name: profileData.full_name,
        username: profileData.username,
        avatar_url: profileData.avatar_url,
        profile_completed: profileData.profile_completed,
      };
      
      setUser(updatedUser);
      // Opcional: Llamar a refreshAuth() aquí para sincronizar el auth.users metadata si es necesario
      return { success: true, data: updatedUser };
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      return { success: false, error: `Error de conexión: ${err.message}` };
    }
  }, [user]);

  const refreshAuth = useCallback(async () => {
    console.log('🔄 Refresh manual iniciado');
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 🛑 Usar la función robusta para obtener el perfil completo
        const profile = await getAndProcessUserProfile(session);
        if (profile) {
          setUser(profile);
          console.log('✅ Auth refrescado con perfil completo');
        } else {
          setUser(null); // Si la sesión existe pero el perfil no se puede cargar
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('❌ Error en refresh:', err);
    } finally {
      setLoading(false);
    }
  }, [getAndProcessUserProfile]);

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
