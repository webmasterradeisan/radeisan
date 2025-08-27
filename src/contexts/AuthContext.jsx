// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          // No session - user not authenticated
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        await fetchUserProfile(session.user);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch user profile from database
  const fetchUserProfile = async (authUser) => {
    try {
      setLoading(true);
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          await createUserProfile(authUser);
          return;
        }
        
        // On any error, use auth user data as fallback
        const fallbackUser = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email.split('@')[0],
          username: authUser.user_metadata?.username || authUser.email.split('@')[0],
          points: 1000, // Initial points for new users
          avatar_url: authUser.user_metadata?.avatar_url || null,
          is_business_account: authUser.user_metadata?.account_type === 'business',
          created_at: authUser.created_at,
          updated_at: new Date().toISOString()
        };
        
        setUser(fallbackUser);
        setIsAuthenticated(true);
        return;
      }

      setUser(profile);
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Create user profile in database
  const createUserProfile = async (authUser) => {
    try {
      const newProfile = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email.split('@')[0],
        username: authUser.user_metadata?.username || authUser.email.split('@')[0],
        points: 1000, // Initial welcome points
        avatar_url: authUser.user_metadata?.avatar_url || null,
        is_business_account: authUser.user_metadata?.account_type === 'business',
        created_at: authUser.created_at,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        // Use the profile data we tried to insert as fallback
        setUser(newProfile);
      } else {
        setUser(data);
      }
      
      setIsAuthenticated(true);
      
      // Award registration points
      console.log('✅ User registered! Awarded 1000 welcome points');
      
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      // User profile will be fetched by auth state change listener
      return { user: data.user, error: null };
      
    } catch (error) {
      console.error('Error in signIn:', error);
      return { user: null, error: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (userData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: userData.username,
            account_type: userData.accountType || 'personal'
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: data.user, error: null };
      
    } catch (error) {
      console.error('Error in signUp:', error);
      return { user: null, error: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Clear user state
      setUser(null);
      setIsAuthenticated(false);
      
    } catch (error) {
      console.error('Error in logout:', error);
      // Even on error, clear user state
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with OAuth provider
  const signInWithProvider = async (provider) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/video-feed-dashboard`
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: data.user, error: null };
      
    } catch (error) {
      console.error(`Error in signInWithProvider (${provider}):`, error);
      return { user: null, error: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  // Update user points
  const updateUserPoints = async (newPoints) => {
    if (!user || !isAuthenticated) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      // Update local state immediately for better UX
      setUser(prev => ({ ...prev, points: newPoints }));

      // Update in database
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating points:', error);
        // Revert local state on error
        setUser(prev => ({ ...prev, points: prev.points }));
        return { success: false, error: error.message };
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error in updateUserPoints:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Add points (helper function)
  const addPoints = async (pointsToAdd, reason = 'Activity') => {
    if (!user || !isAuthenticated) {
      return { success: false, error: 'Usuario no autenticado' };
    }
    
    const newPoints = (user.points || 0) + pointsToAdd;
    const result = await updateUserPoints(newPoints);
    
    if (result.success) {
      console.log(`✅ Added ${pointsToAdd} points for: ${reason}`);
    }
    
    return result;
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    if (!user || !isAuthenticated) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      // Update local state immediately
      setUser(prev => ({ ...prev, ...updates, updated_at: new Date().toISOString() }));

      // Update in database
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        // Revert local state on error
        await fetchUserProfile({ id: user.id });
        return { success: false, error: error.message };
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error checking auth status:', error);
        return;
      }

      if (authUser && (!user || user.id !== authUser.id)) {
        await fetchUserProfile(authUser);
      } else if (!authUser) {
        setUser(null);
        setIsAuthenticated(false);
      }
      
    } catch (error) {
      console.error('Error in checkAuthStatus:', error);
    }
  };

  // Get current user session
  const getCurrentSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }
      
      return session;
      
    } catch (error) {
      console.error('Error in getCurrentSession:', error);
      return null;
    }
  };

  // Award points for specific activities
  const awardActivityPoints = async (activity) => {
    if (!user || !isAuthenticated) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const pointsMap = {
      registration: 1000,
      daily_login: 25,
      video_watch_complete: 20,
      video_watch_50: 10,
      video_watch_25: 5,
      video_upload: 50,
      photo_upload: 30,
      like_given: 2,
      share: 3,
      comment: 5,
      first_business_setup: 100,
      profile_complete: 50
    };

    const points = pointsMap[activity];
    if (!points) return { success: false, error: 'Unknown activity' };

    return await addPoints(points, activity);
  };

  const value = {
    // State
    user,
    loading,
    isAuthenticated,
    
    // Auth functions
    signIn,
    signUp,
    logout,
    signInWithProvider,
    resetPassword,
    checkAuthStatus,
    getCurrentSession,
    
    // Profile functions
    updateUserProfile,
    fetchUserProfile: () => user ? fetchUserProfile({ id: user.id }) : null,
    
    // Points functions
    updateUserPoints,
    addPoints,
    awardActivityPoints
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
