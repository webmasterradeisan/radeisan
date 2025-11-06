// src/contexts/AuthContext.jsx
// AuthContext ESTABLE - Fix para evitar errores de 'reading user' en la inicialización
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
  const initializingRef = useRef(false);
  const sessionCheckedRef = useRef(false);
  
  const isAuthenticated = !!user;

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  // Crear usuario desde sesión (fallback rápido)
  const createUserFromSession = useCallback((session) => {
    // Asegura que session.user y user_metadata existen antes de acceder a ellos
    const userData = session?.user;
    const metadata = userData?.user_metadata;
    
    if (!userData) return null;

    const emailParts = userData.email?.split('@');
    const defaultUsername = emailParts ? emailParts[0] : 'usuario';

    return {
      id: userData.id,
      email: userData.email,
      username: metadata?.username || defaultUsername,
      full_name: metadata?.full_name || 'Usuario',
      name: metadata?.full_name || defaultUsername || 'Usuario',
      avatar_url: metadata?.avatar_url || null,
      points: 0, // Esto será actualizado por PointsContext
      role: 'user',
      permissions: [],
      isAdmin: false,
      isActive: true,
      admin_role: null,
      profile_completed: metadata?.profile_completed || false,
    };
  }, []);
  
  // Obtener perfil completo desde Supabase
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 = No row found
        console.error('❌ Error fetching user profile:', error);
        return null;
      }
      
      // Combinar datos de auth y profile
      if (profile) {
        return {
          id: userId,
          email: profile.email,
          username: profile.username,
          full_name: profile.full_name,
          name: profile.full_name || profile.username,
          avatar_url: profile.avatar_url,
          points: profile.points,
          role: profile.role,
          permissions: profile.permissions || [],
          isAdmin: profile.admin_role !== null,
          isActive: profile.is_active,
          admin_role: profile.admin_role,
          profile_completed: profile.profile_completed,
        };
      }
      return null;
    } catch (err) {
      console.error('❌ Excepción al buscar perfil:', err);
      return null;
    }
  }, []);

  // ===========================================================================
  // EFECTO PRINCIPAL DE AUTENTICACIÓN
  // ===========================================================================
  
  useEffect(() => {
    if (initializingRef.current) return;
    
    // Función para manejar el estado inicial de la sesión
    const handleInitialSession = async () => {
      if (sessionCheckedRef.current) return;
      
      initializingRef.current = true;
      setLoading(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const basicUser = createUserFromSession(session);
          if (basicUser) {
            setUser(basicUser); // Establecer el usuario básico rápidamente
            
            // Luego, intentar obtener el perfil completo
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile); // Sobrescribir con el perfil completo
            }
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('❌ Error en getSession:', err);
        // Si hay un error, aún debemos dejar de cargar
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          initializingRef.current = false;
          sessionCheckedRef.current = true;
        }
      }
    };
    
    // Ejecutar el chequeo inicial
    handleInitialSession();
    
    // Suscripción a cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
        // No sobrescribir si estamos en medio de la inicialización
        if (initializingRef.current) return;
        
        setLoading(true);

        if (session?.user) {
          const basicUser = createUserFromSession(session);
          if (basicUser) {
            setUser(basicUser);
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
        } else {
          // Si el evento es SIGN_OUT, limpiamos el estado
          if (event === 'SIGNED_OUT') {
             setUser(null);
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, [createUserFromSession, fetchUserProfile]);

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
      setUser(null);
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
      // 1. Actualizar metadatos de auth (para nombre/avatar en Supabase)
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
          // otros metadatos que desees guardar en auth.users
        }
      });
      
      if (authError) {
        throw authError;
      }
      
      // 2. Actualizar la tabla 'profiles'
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name,
          username: updates.username,
          avatar_url: updates.avatar_url,
          profile_completed: true, // Asumimos que al actualizar el perfil, se considera completado
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      // 3. Actualizar el estado local con los datos combinados
      const updatedUser = {
        ...user,
        ...profileData, // Usar los datos de la tabla profiles
        ...authData?.user?.user_metadata, // Usar metadatos actualizados
        name: profileData.full_name || profileData.username,
        full_name: profileData.full_name,
        username: profileData.username,
        avatar_url: profileData.avatar_url,
        profile_completed: profileData.profile_completed,
      };
      
      setUser(updatedUser);
      return { success: true, data: updatedUser };
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      return { success: false, error: `Error de conexión: ${err.message}` };
    }
  }, [user]);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const basicUser = createUserFromSession(session);
        if (basicUser) {
          setUser(basicUser);
          
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUser(profile);
          }
        }
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
