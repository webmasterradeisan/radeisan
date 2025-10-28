// src/hooks/useBranding.js
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
    tagline: 'Conecta, Comparte, Gana',
    welcomeMessage: '¡Bienvenido a nuestra comunidad!'
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
      console.log('🔍 useBranding: Cargando configuración...');
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'branding_config')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ useBranding: Error:', error);
        return;
      }

      if (data?.setting_value) {
        const brandingData = typeof data.setting_value === 'string'
          ? JSON.parse(data.setting_value)
          : data.setting_value;
        
        console.log('✅ useBranding: Branding cargado:', brandingData);
        setBranding(brandingData);
      } else {
        console.log('⚠️ useBranding: No hay datos, usando defaults');
      }
    } catch (err) {
      console.error('❌ useBranding: Error en catch:', err);
    } finally {
      setLoading(false);
    }
  };

  return { branding, loading };
};
```

### Paso 3: Recarga la aplicación

Una vez creado el archivo, recarga el Login y abre la consola (F12).

---

## 📊 ¿Qué deberías ver en la consola?
```
🔍 useBranding: Cargando configuración...
✅ useBranding: Branding cargado: {logo: {...}, colors: {...}}
