// src/contexts/AuthContext.jsx - VERSIÓN SIMPLE
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const navigate = useNavigate();

  // Demo user para mantener la app funcionando
  const demoUser = {
    id: 'demo-user-id',
    name: 'Usuario Demo',
    email: 'usuario@demo.com',
    username: 'usuario_demo',
    points: 2847,
    avatar: null,
    isBusinessAccount: false,
    created_at: new Date().toISOString()
  };

  // Inicializar con demo user
  useEffect(() => {
    setUser(demoUser);
    setIsAuthenticated(true);
    setLoading(false);
    console.log('✅ AuthContext iniciado en modo demo');
  }, []);

  // Funciones básicas (demo por ahora)
  const signIn = async (email, password) => {
    console.log('Demo signIn llamado');
    return { user: demoUser, error: null };
  };

  const signUp = async (userData) => {
    console.log('Demo signUp llamado');
    return { user: demoUser, error: null };
  };

  const signOut = async () => {
    console.log('Demo signOut llamado');
    setUser(demoUser); // Mantener demo user
    setIsAuthenticated(true);
    navigate('/');
  };

  const signInWithProvider = async (provider) => {
    console.log(`Demo signInWithProvider: ${provider}`);
    return { user: demoUser, error: null };
  };

  const clearAuthData = () => {
    console.log('Demo clearAuthData llamado');
    setUser(demoUser);
    setIsAuthenticated(true);
  };

  const updateUserPoints = async (newPoints) => {
    console.log('Demo updateUserPoints:', newPoints);
    const updatedUser = { ...user, points: newPoints };
    setUser(updatedUser);
  };

  const updateUserProfile = async (updates) => {
    console.log('Demo updateUserProfile:', updates);
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
  };

  const resetPassword = async (email) => {
    console.log('Demo resetPassword:', email);
    return { success: true, error: null };
  };

  const checkAuthStatus = async () => {
    console.log('Demo checkAuthStatus llamado');
    setLoading(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    updateUserPoints,
    updateUserProfile,
    resetPassword,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
