// src/contexts/AuthContext.jsx
// ======================================================
// ✅ Contexto de Autenticación con Supabase
// Integrado con sistema de puntos (sin romper nada existente)
// ======================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef(null);

  // ======================================================
  // 🔐 Cargar sesión y perfil inicial
  // ======================================================
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error cargando perfil:', error.message);
      return null;
    }

    return data;
  }, []);

  const loadUserSession = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session || null;
      sessionRef.current = session;
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser?.id) {
        const profileData = await fetchUserProfile(currentUser.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('💥 Error cargando sesión:', err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  // ======================================================
  // ♻️ Suscribirse a cambios de sesión (login/logout)
  // ======================================================
  useEffect(() => {
    loadUserSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session;
      setUser(session?.user || null);

      if (session?.user) {
        fetchUserProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserSession, fetchUserProfile]);

  // ======================================================
  // 🚪 Funciones de autenticación pública
  // ======================================================
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('❌ Error cerrando sesión:', err.message);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const updated = await fetchUserProfile(user.id);
    setProfile(updated);
  }, [user, fetchUserProfile]);

  // ======================================================
  // ✅ Contexto listo
  // ======================================================
  const value = {
    user,
    profile,
    loading,
    refreshProfile,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ======================================================
// Hook para acceder fácilmente al AuthContext
// ======================================================
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  return ctx;
};
