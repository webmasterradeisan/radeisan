// AuthContext.jsx - ACTUALIZADO para tu estructura de admin_roles
// Tu admin_roles tiene: role_name, permissions (array), is_active
// Ruta: src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================
  // FUNCIÓN LOADUSER - AJUSTADA A TU ESTRUCTURA
  // ============================================
  
  const loadUser = async (session) => {
    try {
      setLoading(true);
      
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Obtener perfil con JOIN a admin_roles
      // IMPORTANTE: Incluir is_active para verificar si el rol está activo
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          admin_role:admin_roles(
            id,
            role_name,
            permissions,
            is_active,
            granted_by,
            granted_at,
            revoked_at,
            revoked_by
          )
        `)
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        // Si hay error, al menos cargar el usuario básico de auth
        setUser({
          ...session.user,
          role: 'user'
        });
        setLoading(false);
        return;
      }

      // Construir objeto de usuario completo
      const userData = {
        // Datos de auth
        ...session.user,
        // Datos del perfil
        ...profile,
        // Datos de admin_role
        role: profile?.admin_role?.role_name || 'user',
        permissions: profile?.admin_role?.permissions || [],
        isActive: profile?.admin_role?.is_active !== false,
        admin_role: profile?.admin_role,
        // Helpers
        isAdmin: ['super_admin', 'admin', 'moderator'].includes(
          profile?.admin_role?.role_name
        ) && profile?.admin_role?.is_active !== false
      };

      console.log('✅ Usuario cargado:', {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        permissions: userData.permissions,
        isActive: userData.isActive,
        isAdmin: userData.isAdmin
      });

      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error in loadUser:', error);
      setUser(null);
      setLoading(false);
    }
  };

  // ============================================
  // SUSCRIPCIÓN A CAMBIOS DE AUTENTICACIÓN
  // ============================================
  
  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📍 Sesión inicial:', session ? 'Existe' : 'No existe');
      loadUser(session);
    });

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
          console.log('✅ Usuario inició sesión');
          await loadUser(session);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refrescado');
          await loadUser(session);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Usuario cerró sesión');
          setUser(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // ============================================
  // FUNCIÓN DE LOGIN
  // ============================================
  
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('✅ Login exitoso');
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error signing in:', error);
      return { success: false, error: error.message };
    }
  };

  // ============================================
  // FUNCIÓN DE REGISTRO
  // ============================================
  
  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      console.log('✅ Registro exitoso');
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error signing up:', error);
      return { success: false, error: error.message };
    }
  };

  // ============================================
  // FUNCIÓN DE LOGOUT
  // ============================================
  
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      console.log('✅ Logout exitoso');
      return { success: true };
    } catch (error) {
      console.error('❌ Error signing out:', error);
      return { success: false, error: error.message };
    }
  };

  // ============================================
  // ACTUALIZAR PERFIL
  // ============================================
  
  const updateProfile = async (updates) => {
    try {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      setUser(prev => ({ ...prev, ...data }));

      console.log('✅ Perfil actualizado');
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  // ============================================
  // VALOR DEL CONTEXTO
  // ============================================
  
  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

// ============================================
// NOTAS DE IMPLEMENTACIÓN
// ============================================

/*
Este AuthContext está optimizado para tu estructura específica de admin_roles:

✅ Lee: role_name, permissions (array), is_active
✅ Construye: user.role, user.permissions, user.isAdmin
✅ Verifica: is_active = true antes de considerar admin
✅ Logs: Muestra información útil en consola

ESTRUCTURA ESPERADA DE admin_roles:
{
  id: uuid,
  user_id: uuid,
  role_name: 'super_admin' | 'admin' | 'moderator' | 'editor',
  permissions: ['all'] | ['manage_users', 'view_analytics', ...],
  is_active: boolean,
  granted_by: uuid,
  granted_at: timestamp,
  revoked_at: timestamp | null,
  revoked_by: uuid | null
}

DATOS DEL USUARIO FINAL:
{
  id: uuid,
  email: string,
  username: string,
  role: 'super_admin',           ← De admin_roles.role_name
  permissions: ['all'],           ← De admin_roles.permissions
  isActive: true,                 ← De admin_roles.is_active
  isAdmin: true,                  ← Calculado
  admin_role: { ... }             ← Objeto completo
}
*/
