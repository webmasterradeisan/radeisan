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
    
    // 🛑 CORRECCIÓN 1: Comprobación de seguridad para evitar 'reading id' de null
    if (!session || !session.user) {
      return null;
    }

    // 🛑 CORRECCIÓN 2: Garantizar que user_metadata no sea null antes de usarlo
    // Esto resuelve el error 'Cannot read properties of null (reading 'user_metadata')'
    const userSession = session.user;
    const metadata = userSession.user_metadata || {}; // <-- Si es null, usa objeto vacío {}
    
    return {
      id: userSession.id,
      email: userSession.email,
      username: userSession.email?.split('@')[0] || 'usuario',
      
      // Se utiliza el objeto 'metadata' seguro
      full_name: metadata.full_name || 'Usuario',
      name: metadata.full_name || userSession.email?.split('@')[0] || 'Usuario',
      avatar_url: metadata.avatar_url || null,

      points: 0,
      role: 'user',
      permissions: [],
      isAdmin: false,
      isActive: true,
      admin_role: null,
      profile_completed: false,
    };
  }, []);

  // Fetch perfil completo (incluye roles administrativos y puntos)
  const fetchUserProfile = useCallback(async (userId) => {
    // ... Lógica existente ...
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
      }

      if (!data) {
        // En caso de que no se encuentre el perfil, devolvemos null para que se use el basicUser
        return null;
      }
      
      // Combinar data de auth (que es profileData, pero aquí ya está filtrado)
      // Se necesita la sesión para el email, pero asumiremos que el `basicUser` ya tiene la info básica.
      
      const userProfile = {
        // Asume que esta función se llama DENTRO del flujo principal, donde ya se creó un basicUser
        // y se le pasó el email y ID. Aquí solo se combinan los datos del perfil de la tabla 'profiles'.
        
        // La lógica de asignación final DEBE priorizar el rol administrativo
        id: data.id,
        username: data.username || 'usuario',
        full_name: data.full_name || 'Usuario',
        avatar_url: data.avatar_url || null,
        points: data.points || 0,
        permissions: data.permissions || [],
        isActive: data.is_active ?? true,
        profile_completed: data.profile_completed ?? false,
        
        // 🛑 Lógica Crítica de Roles:
        // El rol principal (role) debe ser el admin_role si existe, de lo contrario el role de profiles.
        admin_role: data.admin_role || null, // 'Super Admin'
        isAdmin: !!data.admin_role,
        role: data.admin_role || data.role || 'user', // Prioriza Super Admin sobre Moderador si ambos existen
      };
      
      return userProfile;

    } catch (error) {
      console.error('Error en fetchUserProfile:', error);
      return null;
    }
  }, []);


  useEffect(() => {
    // Función de manejo de estado de autenticación (login, logout, refresh)
    const handleAuthChange = async (event, session) => {
        if (!mountedRef.current) return;
        
        // En caso de ser SIGNED_OUT o no haber sesión, limpiamos el estado
        if (!session) {
            setUser(null);
            setLoading(false);
            sessionCheckedRef.current = true;
            return;
        }

        // Si ya estamos inicializando, evitamos la recursión
        if (initializingRef.current && event === 'INITIAL_SESSION') return;
        initializingRef.current = true;
        setLoading(true);

        try {
            // 1. Crear el usuario básico de forma rápida y segura (ya corregida)
            const basicUser = createUserFromSession(session);
            
            // Si el basicUser es null, no hay sesión válida
            if (!basicUser) {
              setUser(null);
              return;
            }

            // Establecer el usuario básico temporalmente para que los contextos hijos no fallen (CRÍTICO para PointsContext)
            setUser(basicUser); 
            
            // 2. Obtener el perfil completo de la base de datos
            const fullProfile = await fetchUserProfile(basicUser.id);
            
            if (mountedRef.current) {
                if (fullProfile) {
                    // Combinar el basicUser (que tiene el email) con el fullProfile
                    // La lógica del userProfile ya prioriza el admin_role
                    setUser({ ...basicUser, ...fullProfile });
                    console.log('✅ Sesión y Perfil completo cargados');
                } else {
                    // Si falla la carga de perfil, al menos mantenemos el basicUser
                    console.warn('⚠️ No se pudo cargar el perfil completo, usando datos básicos.');
                    // user ya es basicUser, no se hace nada
                }
            }

        } catch (err) {
            console.error('❌ Error durante la gestión de Auth:', err);
            setUser(null);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                initializingRef.current = false;
                sessionCheckedRef.current = true;
            }
        }
    };
    
    // ... el resto de tu useEffect original (supabase.auth.onAuthStateChange) ...
    // ...
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Asegurarse de que el check inicial se haya realizado
    if (!sessionCheckedRef.current) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleAuthChange('INITIAL_SESSION', session);
      });
    }


    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, [createUserFromSession, fetchUserProfile]);

  // ===========================================================================
  // FUNCIONES DE AUTENTICACIÓN (sin cambios)
  // ===========================================================================

  const signIn = useCallback(async (credentials) => { /* ... tu código ... */ }, []);
  const signUp = useCallback(async (credentials) => { /* ... tu código ... */ }, []);
  const signOut = useCallback(async () => { /* ... tu código ... */ }, []);
  const resetPassword = useCallback(async (email) => { /* ... tu código ... */ }, []);
  const updateProfile = useCallback(async (updates) => { /* ... tu código ... */ }, []);

  const refreshAuth = useCallback(async () => {
    console.log('🔄 Refresh manual iniciado');
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // ✅ Usar el mismo flujo de manejo que el useEffect para la consistencia
      await handleAuthChange('SIGNED_IN', session); 
      
      console.log('✅ Auth refrescado');
    } catch (err) {
      console.error('❌ Error en refresh:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [handleAuthChange]); // <-- Dependencia de handleAuthChange

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
