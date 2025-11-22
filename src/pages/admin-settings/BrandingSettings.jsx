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
// ✅ IMPORTACIÓN DE UTILIDADES: Usamos la definición global de DEFAULT_BRANDING y la función de aplicación.
import { DEFAULT_BRANDING, applyBrandingToDOM } from '../../utils/branding';


// ============================================================================
// CONFIGURACIÓN POR DEFECTO (MOVIDA A utils/branding.js)
// ============================================================================
// El código original de DEFAULT_BRANDING ha sido eliminado aquí.

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
    // La función applyBrandingToDOM ahora se importa y se usa para el preview
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

      console.log('🔍 Cargando branding...');

      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'branding_config')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching:', fetchError);
        throw fetchError;
      }

      if (data) {
        console.log('✅ Data recibida:', data);
        console.log('📦 Tipo de setting_value:', typeof data.setting_value);
        
        // ✅ CORRECCIÓN: Supabase ya devuelve JSONB como objeto, no necesita parse
        const brandingData = typeof data.setting_value === 'string' 
          ? JSON.parse(data.setting_value)
          : data.setting_value;
        
        console.log('✅ Branding cargado:', brandingData);
        setBranding(brandingData);
      } else {
        console.log('⚠️ No hay data, usando defaults');
      }
    } catch (err) {
      console.error('❌ Error cargando branding:', err);
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

      console.log('💾 Iniciando guardado de branding...');
      console.log('📦 Datos a guardar:', branding);
      console.log('🔑 Tipo de datos:', typeof branding);

      // Guardar en system_settings con timeout
      const { data, error: upsertError } = await Promise.race([
        supabase
          .from('system_settings')
          .upsert({
            setting_key: 'branding_config',
            setting_value: branding,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          })
          .select(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: La operación tardó más de 10 segundos')), 10000)
        )
      ]);

      if (upsertError) {
        console.error('❌ Error en upsert:', upsertError);
        console.error('❌ Detalles del error:', JSON.stringify(upsertError, null, 2));
        throw upsertError;
      }

      console.log('✅ Respuesta de Supabase:', data);
      console.log('✅ Branding guardado exitosamente');

      // Aplicar branding al DOM (Ahora importada)
      applyBrandingToDOM(branding);

      setSuccessMessage('Branding guardado exitosamente');
      setHasChanges(false);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('❌ Error completo:', err);
      console.error('❌ Stack:', err.stack);
      
      let errorMessage = 'Error al guardar: ';
      if (err.message.includes('Timeout')) {
        errorMessage += 'La operación tardó demasiado. Verifica tu conexión.';
      } else if (err.code) {
        errorMessage += `${err.code} - ${err.message}`;
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('¿Estás seguro de restaurar el branding por defecto?')) {
      // ✅ Usa el DEFAULT_BRANDING importado
      setBranding(DEFAULT_BRANDING);
      setHasChanges(true);
    }
  };

  // ============================================================================
  // FUNCIONES DE ACTUALIZACIÓN
  // ============================================================================
  // ... (funciones updateLogo, updateColor, etc. se mantienen igual)
  
  const updateLogo = (key, value) => {
    setBranding(prev => ({
      ...prev,
      logo: { ...prev.logo, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateColor = (key, value) => {
    setBranding(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateTypography = (key, value) => {
    setBranding(prev => ({
      ...prev,
      typography: { ...prev.typography, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateText = (key, value) => {
    setBranding(prev => ({
      ...prev,
      texts: { ...prev.texts, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateSetting = (key, value) => {
    setBranding(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
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

  // ============================================================================
  // APLICAR BRANDING AL DOM (ELIMINADA: Ahora se importa de ../../utils/branding)
  // ============================================================================

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configuración de Marca
        </h1>
        <p className="text-gray-600">
          Personaliza la apariencia y textos de la plataforma
        </p>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AppIcon name="AlertCircle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <AppIcon name="X" className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <AppIcon name="CheckCircle" className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-900">Éxito</p>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-500 hover:text-green-700"
          >
            <AppIcon name="X" className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="mb-6 flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              previewMode
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AppIcon name="Eye" className="w-4 h-4 inline mr-2" />
            {previewMode ? 'Preview Activo' : 'Activar Preview'}
          </button>
          
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <AppIcon name="RotateCcw" className="w-4 h-4 inline mr-2" />
            Restaurar Defaults
          </button>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-2">
              <AppIcon name="AlertCircle" className="w-4 h-4" />
              Cambios sin guardar
            </span>
          )}
          
          <button
            onClick={saveBranding}
            disabled={saving || !hasChanges}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <AppIcon name="Loader" className="w-4 h-4 inline mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <AppIcon name="Save" className="w-4 h-4 inline mr-2" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de configuración */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                {[
                  { id: 'logos', label: 'Logos', icon: 'Image' },
                  { id: 'colors', label: 'Colores', icon: 'Palette' },
                  { id: 'typography', label: 'Tipografía', icon: 'Type' },
                  { id: 'texts', label: 'Textos', icon: 'FileText' },
                  { id: 'settings', label: 'Ajustes', icon: 'Settings' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <AppIcon name={tab.icon} className="w-4 h-4 inline mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Contenido de tabs */}
            <div className="p-6">
              {/* TAB: Logos */}
              {activeTab === 'logos' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Logos e Imágenes
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Logo Principal
                        </label>
                        <input
                          type="text"
                          value={branding.logo.primary}
                          onChange={(e) => updateLogo('primary', e.target.value)}
                          placeholder="URL del logo principal"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Logo para fondos claros
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Logo Secundario
                        </label>
                        <input
                          type="text"
                          value={branding.logo.secondary}
                          onChange={(e) => updateLogo('secondary', e.target.value)}
                          placeholder="URL del logo secundario"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Logo para fondos oscuros
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Favicon
                        </label>
                        <input
                          type="text"
                          value={branding.logo.favicon}
                          onChange={(e) => updateLogo('favicon', e.target.value)}
                          placeholder="URL del favicon"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Icono que aparece en la pestaña del navegador
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Icono de App
                        </label>
                        <input
                          type="text"
                          value={branding.logo.icon}
                          onChange={(e) => updateLogo('icon', e.target.value)}
                          placeholder="URL del icono"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Icono cuadrado para aplicaciones móviles
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Colores */}
              {activeTab === 'colors' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Esquema de Colores
                    </h3>

                    {/* Presets de colores */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Paletas Predefinidas
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {PRESET_COLORS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => applyColorPreset(preset)}
                            className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                          >
                            <div className="flex gap-2 mb-2">
                              <div
                                className="w-8 h-8 rounded"
                                style={{ backgroundColor: preset.primary }}
                              ></div>
                              <div
                                className="w-8 h-8 rounded"
                                style={{ backgroundColor: preset.secondary }}
                              ></div>
                            </div>
                            <p className="text-xs font-medium text-gray-900">
                              {preset.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colores individuales */}
                    <div className="space-y-4">
                      <ColorInput
                        label="Primary"
                        value={branding.colors.primary}
                        onChange={(value) => updateColor('primary', value)}
                      />
                      <ColorInput
                        label="Secondary"
                        value={branding.colors.secondary}
                        onChange={(value) => updateColor('secondary', value)}
                      />
                      <ColorInput
                        label="Accent"
                        value={branding.colors.accent}
                        onChange={(value) => updateColor('accent', value)}
                      />
                      <ColorInput
                        label="Success"
                        value={branding.colors.success}
                        onChange={(value) => updateColor('success', value)}
                      />
                      <ColorInput
                        label="Warning"
                        value={branding.colors.warning}
                        onChange={(value) => updateColor('warning', value)}
                      />
                      <ColorInput
                        label="Error"
                        value={branding.colors.error}
                        onChange={(value) => updateColor('error', value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Tipografía */}
              {activeTab === 'typography' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Tipografía
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fuente Principal
                        </label>
                        <select
                          value={branding.typography.fontFamily}
                          onChange={(e) => updateTypography('fontFamily', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {FONT_FAMILIES.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fuente para Títulos
                        </label>
                        <select
                          value={branding.typography.headingFont}
                          onChange={(e) => updateTypography('headingFont', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {FONT_FAMILIES.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Preview de tipografía */}
                      <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                        <div style={{ fontFamily: branding.typography.fontFamily }}>
                          <h1
                            className="text-3xl font-bold mb-2"
                            style={{ fontFamily: branding.typography.headingFont }}
                          >
                            Título de Ejemplo
                          </h1>
                          <h2
                            className="text-2xl font-semibold mb-2"
                            style={{ fontFamily: branding.typography.headingFont }}
                          >
                            Subtítulo de Ejemplo
                          </h2>
                          <p className="text-base text-gray-700 mb-2">
                            Este es un párrafo de texto de ejemplo. La tipografía seleccionada
                            afectará cómo se ve todo el texto en la plataforma.
                          </p>
                          <p className="text-sm text-gray-600">
                            Texto más pequeño para descripciones y detalles secundarios.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Textos */}
              {activeTab === 'texts' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Textos Personalizados
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre de la App
                        </label>
                        <input
                          type="text"
                          value={branding.texts.appName}
                          onChange={(e) => updateText('appName', e.target.value)}
                          placeholder="Nombre de la aplicación"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Eslogan
                        </label>
                        <input
                          type="text"
                          value={branding.texts.tagline}
                          onChange={(e) => updateText('tagline', e.target.value)}
                          placeholder="Eslogan de la aplicación"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mensaje de Bienvenida
                        </label>
                        <textarea
                          value={branding.texts.welcomeMessage}
                          onChange={(e) => updateText('welcomeMessage', e.target.value)}
                          placeholder="Mensaje que verán los nuevos usuarios"
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Texto del Footer
                        </label>
                        <input
                          type="text"
                          value={branding.texts.footerText}
                          onChange={(e) => updateText('footerText', e.target.value)}
                          placeholder="Texto del pie de página"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Etiqueta Puntos
                          </label>
                          <input
                            type="text"
                            value={branding.texts.pointsLabel}
                            onChange={(e) => updateText('pointsLabel', e.target.value)}
                            placeholder="Puntos"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Etiqueta Puntos Premium
                          </label>
                          <input
                            type="text"
                            value={branding.texts.premiumPointsLabel}
                            onChange={(e) => updateText('premiumPointsLabel', e.target.value)}
                            placeholder="Puntos Premium"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Ajustes */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Ajustes de Interfaz
                    </h3>

                    <div className="space-y-4">
                      {/* Modo oscuro */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">Modo Oscuro</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Habilitar tema oscuro automático
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

                      {/* Bordes redondeados */}
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <label className="block font-medium text-gray-900 mb-3">
                          Bordes Redondeados
                        </label>
                        <select
                          value={branding.settings.roundedCorners}
                          onChange={(e) => updateSetting('roundedCorners', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">Sin redondeo</option>
                          <option value="small">Pequeño</option>
                          <option value="medium">Mediano</option>
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
