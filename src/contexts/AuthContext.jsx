// src/contexts/AuthContext.jsx - TEMPORAL
import React, { createContext, useContext, useState } from 'react';
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
  const [user, setUser] = useState({
    id: 'temp-user-id',
    name: 'Usuario Demo',
    email: 'usuario@demo.com',
    username: 'usuario_demo',
    points: 2847,
    avatar: null,
    isBusinessAccount: false,
    created_at: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const navigate = useNavigate();

  const signIn = async (email, password) => {
    console.log('Demo signIn - Supabase no configurado aún');
    return { user: user, error: null };
  };

  const signUp = async (userData) => {
    console.log('Demo signUp - Supabase no configurado aún');
    return { user: user, error: null };
  };

  const signOut = async () => {
    console.log('Demo signOut');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  const signInWithProvider = async (provider) => {
    console.log(`Demo signInWithProvider: ${provider}`);
    return { user: user, error: null };
  };

  const clearAuthData = () => {
    localStorage.removeItem('userData');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUserPoints = async (newPoints) => {
    if (!user) return;
    const updatedUser = { ...user, points: newPoints };
    setUser(updatedUser);
    console.log('Demo updateUserPoints:', newPoints);
  };

  const updateUserProfile = async (updates) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    console.log('Demo updateUserProfile:', updates);
  };

  const resetPassword = async (email) => {
    console.log('Demo resetPassword:', email);
    return { success: true, error: null };
  };

  const checkAuthStatus = async () => {
    console.log('Demo checkAuthStatus');
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
