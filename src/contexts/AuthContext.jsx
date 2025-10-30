// src/contexts/AuthContext.jsx
// AuthContext ESTABLE - Fix para timeout de perfil y compatibilidad con sistema de puntos
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  // =============================================
  // SIGN IN / SIGN UP / SIGN OUT
  // =============================================

  // 🔹 Iniciar sesión
  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("❌ Error en signIn:", err.message);
      throw err;
    }
  }, []);

  // 🔹 Registro de usuario
  const signUp = useCallback(async (email, password, extraData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: extraData },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("❌ Error en signUp:", err.message);
      throw err;
    }
  }, []);

  // 🔹 Cerrar sesión
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error("❌ Error en signOut:", err.message);
    }
  }, []);

  // =============================================
  // PERFIL DE USUARIO (tabla user_profiles)
  // =============================================

  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("❌ Error cargando perfil:", error);
        return null;
      }

      setProfile(data || null);
      return data;
    } catch (err) {
      console.error("❌ Error en fetchUserProfile:", err.message);
      return null;
    }
  }, []);

  // 🔹 Actualizar perfil
  const updateProfile = useCallback(
    async (updates) => {
      if (!user) throw new Error("No hay usuario autenticado");
      try {
        const { error } = await supabase
          .from("user_profiles")
          .update(updates)
          .eq("id", user.id);
        if (error) throw error;
        await fetchUserProfile(user.id);
      } catch (err) {
        console.error("❌ Error al actualizar perfil:", err.message);
      }
    },
    [user, fetchUserProfile]
  );

  // =============================================
  // ESCUCHAR SESIONES DE SUPABASE
  // =============================================
  useEffect(() => {
    let active = true;
    setLoading(true);

    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (session?.user && active) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }, 250);
    });

    return () => {
      active = false;
      clearTimeout(timeoutRef.current);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // =============================================
  // RESTABLECER CONTRASEÑA
  // =============================================
  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("❌ Error en resetPassword:", err.message);
      return false;
    }
  }, []);

  // =============================================
  // ACTUALIZAR CONTRASEÑA (una vez logueado)
  // =============================================
  const updatePassword = useCallback(async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("❌ Error al actualizar contraseña:", err.message);
      return false;
    }
  }, []);

  // =============================================
  // VERIFICACIÓN DE EMAIL
  // =============================================
  const sendEmailVerification = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) throw error;

      return true;
    } catch (err) {
      console.error("❌ Error en sendEmailVerification:", err.message);
      return false;
    }
  }, []);

  // =============================================
  // CONTEXTO FINAL
  // =============================================
  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
    fetchUserProfile,
    resetPassword,
    updatePassword,
    sendEmailVerification,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// =============================================
// HOOK DE USO
// =============================================
export const useAuth = () => useContext(AuthContext);
