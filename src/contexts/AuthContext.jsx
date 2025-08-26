// src/contexts/AuthContext.jsx
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
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Initialize Supabase client (you'll need to install @supabase/supabase-js)
  // import { createClient } from '@supabase/supabase-js'
  // const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY)

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // Check localStorage first for immediate UI feedback
      const storedUser = localStorage.getItem('userData');
      const storedToken = localStorage.getItem('authToken');
      
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      }

      // TODO: Replace with actual Supabase auth check
      // const { data: { user }, error } = await supabase.auth.getUser()
      // if (error) throw error;
      // if (user) {
      //   const userData = await getUserProfile(user.id);
      //   setUser(userData);
      //   setIsAuthenticated(true);
      // } else {
      //   clearAuthData();
      // }

    } catch (error) {
      console.error('Error checking auth status:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);

      // TODO: Replace with actual Supabase auth
      // const { data, error } = await supabase.auth.signInWithPassword({
      //   email,
      //   password,
      // })
      // if (error) throw error;

      // Mock authentication for development
      const mockUsers = [
        { 
          id: '1',
          email: 'admin@radeisan.com', 
          password: '123456',
          name: 'Admin Usuario',
          username: 'admin',
          points: 5000,
          avatar: null,
          isBusinessAccount: true,
          created_at: new Date().toISOString()
        },
        { 
          id: '2',
          email: 'usuario@ejemplo.com', 
          password: '123456',
          name: 'Usuario Demo',
          username: 'usuario_demo',
          points: 2847,
          avatar: null,
          isBusinessAccount: false,
          created_at: new Date().toISOString()
        }
      ];

      const user = mockUsers.find(u => 
        u.email === email && u.password === password
      );

      if (!user) {
        throw new Error('Credenciales incorrectas');
      }

      // Create session data
      const authData = {
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          points: user.points,
          avatar: user.avatar,
          isBusinessAccount: user.isBusinessAccount,
          created_at: user.created_at
        },
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      // Store authentication data
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('userData', JSON.stringify(authData.user));
      localStorage.setItem('authExpires', authData.expiresAt.toString());

      setUser(authData.user);
      setIsAuthenticated(true);

      return { user: authData.user, error: null };

    } catch (error) {
      console.error('Error signing in:', error);
      return { user: null, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData) => {
    try {
      setLoading(true);

      // TODO: Replace with actual Supabase auth
      // const { data, error } = await supabase.auth.signUp({
      //   email: userData.email,
      //   password: userData.password,
      //   options: {
      //     data: {
      //       name: userData.name,
      //       username: userData.username
      //     }
      //   }
      // })
      // if (error) throw error;

      // Mock registration
      const newUser = {
        id: Date.now().toString(),
        name: userData.name,
        email: userData.email,
        username: userData.username,
        points: 0,
        avatar: null,
        isBusinessAccount: false,
        created_at: new Date().toISOString()
      };

      // Auto sign in after registration
      const authData = {
        token: 'mock-jwt-token-' + Date.now(),
        user: newUser,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      };

      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('userData', JSON.stringify(authData.user));
      localStorage.setItem('authExpires', authData.expiresAt.toString());

      setUser(authData.user);
      setIsAuthenticated(true);

      return { user: authData.user, error: null };

    } catch (error) {
      console.error('Error signing up:', error);
      return { user: null, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual Supabase auth
      // const { error } = await supabase.auth.signOut()
      // if (error) throw error;

      clearAuthData();
      navigate('/login');

    } catch (error) {
      console.error('Error signing out:', error);
      // Force clear even if there's an error
      clearAuthData();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const clearAuthData = () => {
    // Clear all auth-related data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('authExpires');
    localStorage.removeItem('rememberUser');
    
    // Clear any other app-specific data
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('cartItems');
    
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUserPoints = (newPoints) => {
    if (user) {
      const updatedUser = { ...user, points: newPoints };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  };

  const updateUserProfile = (updates) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  };

  // Check if token is expired
  useEffect(() => {
    const checkTokenExpiry = () => {
      const expires = localStorage.getItem('authExpires');
      if (expires && Date.now() > parseInt(expires)) {
        console.log('Token expired, signing out...');
        clearAuthData();
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    updateUserPoints,
    updateUserProfile,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
