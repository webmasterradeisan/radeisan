// ============================================================================
// BRANDING SETTINGS - Configuración de Marca
// ============================================================================
// Componente de administración para personalizar el branding de la plataforma:
// - Logo y favicon
// - Esquema de colores
// - Tipografía
// - Textos y mensajes personalizados
// - Preview en tiempo real
// - Aplicación global de cambios
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppIcon from '../../components/AppIcon';

// ============================================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================================

const DEFAULT_BRANDING = {
  // Logos e imágenes
  logo: {
    primary: '', // URL del logo principal
    secondary: '', // URL del logo alternativo (para fondos oscuros)
    favicon: '', // URL del favicon
    icon: '' // Icono cuadrado para apps
  },

  // Esquema de colores
  colors: {
    primary: '#3B82F6', // Azul principal
    secondary: '#8B5CF6', // Púrpura
    accent: '#10B981', // Verde
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    background: '#FFFFFF',
    foreground: '#1F2937',
    muted: '#6B7280',
    border: '#E5E7EB'
  },

  // Tipografía
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFont: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    }
  },

  // Textos personalizados
  texts: {
    appName: 'Radeisan',
    tagline: 'Conecta, Comparte, Gana',
    welcomeMessage: '¡Bienvenido a nuestra comunidad!',
    footerText: '© 2025 Radeisan. Todos los derechos reservados.',
    pointsLabel: 'Puntos',
    premiumPointsLabel: 'Puntos Premium',
    rewardsTitle: 'Tienda de Recompensas',
    uploadVideoText: 'Subir Video',
    uploadPhotoText: 'Subir Foto'
  },

  // Configuración adicional
  settings: {
    darkModeEnabled: false,
    roundedCorners: 'medium', // 'none', 'small', 'medium', 'large', 'full'
    shadowStyle: 'medium', // 'none', 'small', 'medium', 'large'
    buttonStyle: 'solid', // 'solid', 'outline', 'ghost'
    animationsEnabled: true
  }
};

const PRESET_COLORS = [
  { name: 'Azul Océano', primary: '#3B82F6', secondary: '#0EA5E9' },
  { name: 'Púrpura Real', primary: '#8B5CF6', secondary: '#A78BFA' },
  { name: 'Verde Esmeralda', primary: '#10B981', secondary: '#34D399' },
  { name: 'Rojo Carmesí', primary: '#EF4444', secondary: '#F87171' },
  { name: 'Naranja Vibrante', primary: '#F97316', secondary: '#FB923C' },
  { name: 'Rosa Fucsia', primary: '#EC4899', secondary: '#F472B6' },
  { name: 'Índigo Profundo', primary: '#6366F1', secondary: '#818CF8' },
  { name: 'Teal Aqua', primary: '#14B8A6', secondary: '#2DD4BF' }
];

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function BrandingSettings() {
  // ============================================================================
  // ESTADO
  // ============================================================================

  const [activeTab, setActiveTab] = useState('logos');
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    loadBranding();
  }, []);

  // Aplicar cambios en preview
  useEffect(() => {
    if (previewMode) {
      applyBrandingToDOM(branding);
    }
  }, [branding, previewMode]);

  // ============================================================================
  // FUNCIONES DE CARGA
  // ============================================================================

  const loadBranding = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'branding_config')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (data) {
        setBranding(JSON.parse(data.setting_value));
      }
    } catch (err) {
      console.error('Error cargando branding:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FUNCIONES DE GUARDADO
  // ============================================================================

  const saveBranding = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Guardar en system_settings
      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'branding_config',
          setting_value: JSON.stringify(branding),
          updated_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;

      // Aplicar branding al DOM
      applyBrandingToDOM(branding);

      setSuccessMessage('Branding guardado exitosamente');
      setHasChanges(false);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error guardando branding:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('¿Estás seguro de restaurar el branding por defecto?')) {
      setBranding(DEFAULT_BRANDING);
      setHasChanges(true);
    }
  };

  // ============================================================================
  // FUNCIONES DE ACTUALIZACIÓN
  // ============================================================================

  const updateLogo = (key, value) => {
    setBranding(prev => ({
      ...prev,
      logo: {
        ...prev.logo,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const updateColor = (key, value) => {
    setBranding(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const applyColorPreset = (preset) => {
    setBranding(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        primary: preset.primary,
        secondary: preset.secondary
      }
    }));
    setHasChanges(true);
  };

  const updateTypography = (key, value) => {
    if (key === 'fontFamily' || key === 'headingFont') {
      setBranding(prev => ({
        ...prev,
        typography: {
          ...prev.typography,
          [key]: value
        }
      }));
    } else {
      setBranding(prev => ({
        ...prev,
        typography: {
          ...prev.typography,
          fontSize: {
            ...prev.typography.fontSize,
            [key]: value
          }
        }
      }));
    }
    setHasChanges(true);
  };

  const updateText = (key, value) => {
    setBranding(prev => ({
      ...prev,
      texts: {
        ...prev.texts,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const updateSetting = (key, value) => {
    setBranding(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  // ============================================================================
  // FUNCIONES DE APLICACIÓN
  // ============================================================================

  const applyBrandingToDOM = (brandingConfig) => {
    const root = document.documentElement;

    // Aplicar colores
    Object.entries(brandingConfig.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Aplicar tipografía
    root.style.setProperty('--font-family', brandingConfig.typography.fontFamily);
    root.style.setProperty('--font-family-heading', brandingConfig.typography.headingFont);

    Object.entries(brandingConfig.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    // Aplicar favicon
    if (brandingConfig.logo.favicon) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = brandingConfig.logo.favicon;
    }

    // Aplicar título
    if (brandingConfig.texts.appName) {
      document.title = brandingConfig.texts.appName;
    }
  };

  const togglePreview = () => {
    if (previewMode) {
      // Desactivar preview - recargar branding original
      loadBranding();
    }
    setPreviewMode(!previewMode);
  };

  // ============================================================================
  // RENDER - LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Configuración de Marca
            </h1>
            <p className="text-gray-600 mt-1">
              Personaliza la apariencia y textos de la plataforma
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePreview}
              className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
                previewMode
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AppIcon name="Eye" className="w-4 h-4" />
              {previewMode ? 'Modo Preview' : 'Preview'}
            </button>

            <button
              onClick={resetToDefaults}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <AppIcon name="RotateCcw" className="w-4 h-4" />
              Restaurar
            </button>

            <button
              onClick={saveBranding}
              disabled={!hasChanges || saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <AppIcon name={saving ? "Loader2" : "Save"} className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {hasChanges && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
            <AppIcon name="AlertTriangle" className="w-4 h-4" />
            Tienes cambios sin guardar
          </div>
        )}

        {previewMode && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-800">
            <AppIcon name="Info" className="w-4 h-4" />
            Modo preview activo - Los cambios se aplican en tiempo real
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-800">
            <AppIcon name="CheckCircle" className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-800">
            <AppIcon name="AlertCircle" className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Configuración */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-1 p-2">
                {[
                  { id: 'logos', label: 'Logos', icon: 'Image' },
                  { id: 'colors', label: 'Colores', icon: 'Palette' },
                  { id: 'typography', label: 'Tipografía', icon: 'Type' },
                  { id: 'texts', label: 'Textos', icon: 'FileText' },
                  { id: 'settings', label: 'Ajustes', icon: 'Settings' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                      ${activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <AppIcon name={tab.icon} className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Tab: Logos */}
              {activeTab === 'logos' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Logos e Imágenes
                    </h3>

                    <div className="space-y-4">
                      {/* Logo Principal */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Logo Principal
                        </label>
                        <input
                          type="url"
                          value={branding.logo.primary}
                          onChange={(e) => updateLogo('primary', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://ejemplo.com/logo.png"
                        />
                        {branding.logo.primary && (
                          <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                            <img
                              src={branding.logo.primary}
                              alt="Logo"
                              className="h-12 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Logo Secundario */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Logo Secundario (para fondos oscuros)
                        </label>
                        <input
                          type="url"
                          value={branding.logo.secondary}
                          onChange={(e) => updateLogo('secondary', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://ejemplo.com/logo-dark.png"
                        />
                        {branding.logo.secondary && (
                          <div className="mt-2 p-4 bg-gray-900 rounded-lg">
                            <img
                              src={branding.logo.secondary}
                              alt="Logo secundario"
                              className="h-12 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Favicon */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Favicon
                        </label>
                        <input
                          type="url"
                          value={branding.logo.favicon}
                          onChange={(e) => updateLogo('favicon', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://ejemplo.com/favicon.ico"
                        />
                        {branding.logo.favicon && (
                          <div className="mt-2 p-4 bg-gray-50 rounded-lg flex items-center gap-3">
                            <img
                              src={branding.logo.favicon}
                              alt="Favicon"
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <span className="text-sm text-gray-600">32x32 px recomendado</span>
                          </div>
                        )}
                      </div>

                      {/* Icono de App */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Icono de App (cuadrado)
                        </label>
                        <input
                          type="url"
                          value={branding.logo.icon}
                          onChange={(e) => updateLogo('icon', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://ejemplo.com/icon.png"
                        />
                        {branding.logo.icon && (
                          <div className="mt-2 p-4 bg-gray-50 rounded-lg flex items-center gap-3">
                            <img
                              src={branding.logo.icon}
                              alt="Icono"
                              className="w-16 h-16 object-contain rounded-lg"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <span className="text-sm text-gray-600">512x512 px recomendado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Colores */}
              {activeTab === 'colors' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Esquema de Colores
                    </h3>

                    {/* Presets de colores */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Presets de Colores
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {PRESET_COLORS.map((preset, index) => (
                          <button
                            key={index}
                            onClick={() => applyColorPreset(preset)}
                            className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-6 h-6 rounded"
                                style={{ backgroundColor: preset.primary }}
                              ></div>
                              <div
                                className="w-6 h-6 rounded"
                                style={{ backgroundColor: preset.secondary }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-700">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colores individuales */}
                    <div className="space-y-4">
                      {Object.entries(branding.colors).map(([key, value]) => (
                        <ColorInput
                          key={key}
                          label={key.charAt(0).toUpperCase() + key.slice(1)}
                          value={value}
                          onChange={(newValue) => updateColor(key, newValue)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Tipografía */}
              {activeTab === 'typography' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Tipografía
                    </h3>

                    <div className="space-y-4">
                      {/* Fuente principal */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fuente Principal
                        </label>
                        <select
                          value={branding.typography.fontFamily}
                          onChange={(e) => updateTypography('fontFamily', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {FONT_FAMILIES.map(font => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-sm" style={{ fontFamily: branding.typography.fontFamily }}>
                          Ejemplo: El rápido zorro marrón salta sobre el perro perezoso
                        </p>
                      </div>

                      {/* Fuente de encabezados */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fuente de Encabezados
                        </label>
                        <select
                          value={branding.typography.headingFont}
                          onChange={(e) => updateTypography('headingFont', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {FONT_FAMILIES.map(font => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                        <h3 className="mt-2" style={{ fontFamily: branding.typography.headingFont }}>
                          Ejemplo de Encabezado
                        </h3>
                      </div>

                      {/* Tamaños de fuente */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Tamaños de Fuente
                        </label>
                        <div className="space-y-2">
                          {Object.entries(branding.typography.fontSize).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-4">
                              <span className="w-16 text-sm text-gray-600">{key}:</span>
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => updateTypography(key, e.target.value)}
                                className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                              <span
                                className="text-gray-700"
                                style={{ fontSize: value }}
                              >
                                Aa
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Textos */}
              {activeTab === 'texts' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Textos Personalizados
                    </h3>

                    <div className="space-y-4">
                      {Object.entries(branding.texts).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {key.split(/(?=[A-Z])/).join(' ').charAt(0).toUpperCase() + 
                             key.split(/(?=[A-Z])/).join(' ').slice(1)}
                          </label>
                          {key === 'welcomeMessage' || key === 'footerText' ? (
                            <textarea
                              value={value}
                              onChange={(e) => updateText(key, e.target.value)}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateText(key, e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Ajustes */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Ajustes de Estilo
                    </h3>

                    <div className="space-y-4">
                      {/* Modo oscuro */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">Modo Oscuro</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Habilitar tema oscuro en la plataforma
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={branding.settings.darkModeEnabled}
                            onChange={(e) => updateSetting('darkModeEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Esquinas redondeadas */}
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <label className="block font-medium text-gray-900 mb-3">
                          Esquinas Redondeadas
                        </label>
                        <select
                          value={branding.settings.roundedCorners}
                          onChange={(e) => updateSetting('roundedCorners', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">Sin redondeo</option>
                          <option value="small">Pequeño</option>
                          <option value="medium">Medio</option>
                          <option value="large">Grande</option>
                          <option value="full">Completo</option>
                        </select>
                      </div>

                      {/* Estilo de sombras */}
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <label className="block font-medium text-gray-900 mb-3">
                          Estilo de Sombras
                        </label>
                        <select
                          value={branding.settings.shadowStyle}
                          onChange={(e) => updateSetting('shadowStyle', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">Sin sombras</option>
                          <option value="small">Pequeñas</option>
                          <option value="medium">Medianas</option>
                          <option value="large">Grandes</option>
                        </select>
                      </div>

                      {/* Estilo de botones */}
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <label className="block font-medium text-gray-900 mb-3">
                          Estilo de Botones
                        </label>
                        <select
                          value={branding.settings.buttonStyle}
                          onChange={(e) => updateSetting('buttonStyle', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="solid">Sólido</option>
                          <option value="outline">Contorno</option>
                          <option value="ghost">Fantasma</option>
                        </select>
                      </div>

                      {/* Animaciones */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">Animaciones</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Habilitar transiciones y animaciones
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={branding.settings.animationsEnabled}
                            onChange={(e) => updateSetting('animationsEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel de Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-6">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AppIcon name="Eye" className="w-4 h-4" />
                Vista Previa
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview de logo */}
              {branding.logo.primary && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <img
                    src={branding.logo.primary}
                    alt="Logo"
                    className="h-10 mx-auto object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Preview de colores */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Colores</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div
                      className="w-full h-12 rounded mb-1"
                      style={{ backgroundColor: branding.colors.primary }}
                    ></div>
                    <span className="text-xs text-gray-600">Primary</span>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-full h-12 rounded mb-1"
                      style={{ backgroundColor: branding.colors.secondary }}
                    ></div>
                    <span className="text-xs text-gray-600">Secondary</span>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-full h-12 rounded mb-1"
                      style={{ backgroundColor: branding.colors.accent }}
                    ></div>
                    <span className="text-xs text-gray-600">Accent</span>
                  </div>
                </div>
              </div>

              {/* Preview de botón */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Botón</h4>
                <button
                  className="w-full px-4 py-2 rounded-lg font-medium"
                  style={{
                    backgroundColor: branding.colors.primary,
                    color: 'white',
                    fontFamily: branding.typography.fontFamily
                  }}
                >
                  Botón de Ejemplo
                </button>
              </div>

              {/* Preview de tipografía */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tipografía</h4>
                <div style={{ fontFamily: branding.typography.fontFamily }}>
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ fontFamily: branding.typography.headingFont }}
                  >
                    {branding.texts.appName}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {branding.texts.tagline}
                  </p>
                </div>
              </div>

              {/* Preview de card */}
              <div
                className="p-4 border rounded-lg"
                style={{
                  borderColor: branding.colors.border,
                  fontFamily: branding.typography.fontFamily
                }}
              >
                <h3 className="font-semibold mb-2" style={{ fontFamily: branding.typography.headingFont }}>
                  Card de Ejemplo
                </h3>
                <p className="text-sm" style={{ color: branding.colors.muted }}>
                  Este es un ejemplo de cómo se verán las tarjetas con tu branding personalizado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

/**
 * Input de color con picker
 */
function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-32 text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex-1 flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>
      <div
        className="w-10 h-10 rounded border border-gray-300"
        style={{ backgroundColor: value }}
      ></div>
    </div>
  );
}
