// src/hooks/useBranding.jsx
// ============================================================================
// Hook para acceder a la configuración de branding
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_BRANDING = {
  logo: {
    primary: '',
    secondary: '',
    favicon: '',
    icon: ''
  },
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#10B981',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    background: '#FFFFFF',
    foreground: '#1F2937',
    muted: '#6B7280',
    border: '#E5E7EB'
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFont: 'Inter, system-ui, sans-serif'
  },
  texts: {
    appName: 'Radeisan',
    tagline: 'Conecta, Comparte, Gana',
    welcomeMessage: '¡Bienvenido a nuestra comunidad!',
    footerText: '© 2025 Radeisan. Todos los derechos reservados.',
    pointsLabel: 'Puntos',
    premiumPointsLabel: 'Puntos Premium'
  },
  settings: {
    darkModeEnabled: false,
    roundedCorners: 'medium',
    shadowStyle: 'medium',
    buttonStyle: 'solid',
    animationsEnabled: true
  }
};

export const useBranding = () => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        setLoading(true);
        
        const { data, error: fetchError } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'branding_config')
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (data && data.setting_value) {
          const brandingData = typeof data.setting_value === 'string' 
            ? JSON.parse(data.setting_value)
            : data.setting_value;
          
          setBranding(brandingData);
        }
      } catch (err) {
        console.error('Error cargando branding:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('branding-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'setting_key=eq.branding_config'
        },
        (payload) => {
          if (payload.new && payload.new.setting_value) {
            const brandingData = typeof payload.new.setting_value === 'string'
              ? JSON.parse(payload.new.setting_value)
              : payload.new.setting_value;
            
            setBranding(brandingData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { branding, loading, error };
};

export default useBranding;
