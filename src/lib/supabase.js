// src/lib/supabase.js - TEMPORAL MOCK
console.log('⚠️ USANDO SUPABASE MOCK - Configura las credenciales reales');

export const supabase = {
  auth: {
    signInWithPassword: () => ({ data: null, error: { message: 'Mock Supabase' } }),
    signUp: () => ({ data: null, error: { message: 'Mock Supabase' } }),
    signOut: () => ({ error: null }),
    getUser: () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: () => ({ data: null, error: { message: 'Mock Supabase' } }),
    resetPasswordForEmail: () => ({ data: null, error: null })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => ({ data: null, error: { code: 'PGRST116' } })
      })
    }),
    insert: () => ({
      select: () => ({
        single: () => ({ data: null, error: { message: 'Mock Supabase' } })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => ({ data: null, error: { message: 'Mock Supabase' } })
        })
      })
    })
  })
};
