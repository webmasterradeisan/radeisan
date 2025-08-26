// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (event === 'SIGNED_IN') {
        await handleUserSignedIn(session.user);
      } else if (event === 'SIGNED_OUT') {
        handleUserSignedOut();
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
      
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error checking auth status:', error);
        clearAuthData();
        return;
      }

      if (user) {
        await handleUserSignedIn(user);
      } else {
        clearAuthData();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const handleUserSignedIn = async (supabaseUser) => {
    try {
      // Get or create user profile
      let { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      // If profile doesn't exist, create one
      if (error && error.code === 'PGRST116') {
        const newProfile = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuario',
          username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0],
          points: 0,
          avatar_url: supabaseUser.user_metadata?.avatar_url || null,
          is_business_account: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          profile = { ...newProfile, points: 0 };
        } else {
          profile = createdProfile;
        }
      } else if (error) {
        console.error('Error fetching profile:', error);
        profile = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name || 'Usuario',
          username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0],
          points: 0,
          avatar_url: null,
          is_business_account: false
        };
      }

      const userData = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        username: profile.username,
        points: profile.points || 0,
        avatar: profile.avatar_url,
        isBusinessAccount: profile.is_business_account || false,
        created_at: profile.created_at
      };

      localStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('Error handling signed in user:', error);
    }
  };

  const handleUserSignedOut = () => {
    clearAuthData();
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: data.user, error: null };

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

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: userData.username
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        return { 
          user: data.user, 
          error: null, 
          message: 'Por favor revisa tu email para confirmar tu cuenta.' 
        };
      }

      return { user: data.user, error: null };

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

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }

      clearAuthData();
      navigate('/login');

    } catch (error) {
      console.error('Error signing out:', error);
      clearAuthData();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase(),
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: data, error: null };

    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      return { user: null, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('rememberUser');
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('cartItems');
    
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUserPoints = async (newPoints) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating points:', error);
        return;
      }

      const updatedUser = { ...user, points: newPoints };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));

    } catch (error) {
      console.error('Error updating user points:', error);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      const updatedUser = { 
        ...user, 
        name: data.name,
        username: data.username,
        avatar: data.avatar_url,
        isBusinessAccount: data.is_business_account
      };
      
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));

    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };

    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }
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
