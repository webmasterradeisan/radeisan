// src/hooks/useBranding.js
// Hook para cargar y usar la configuración de branding
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
    accent: '#10B981'
  },
  texts: {
    appName: 'Radeisan',
    tagline: 'Conecta, Comparte, Gana'
  }
};

export const useBranding = () => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'branding_config')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading branding:', error);
        return;
      }

      if (data?.setting_value) {
        const brandingData = typeof data.setting_value === 'string'
          ? JSON.parse(data.setting_value)
          : data.setting_value;
        
        setBranding(brandingData);
      }
    } catch (err) {
      console.error('Error in useBranding:', err);
    } finally {
      setLoading(false);
    }
  };

  return { branding, loading };
};
