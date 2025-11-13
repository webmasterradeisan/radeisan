// src/pages/admin-points/PointsRulesEditor.jsx
// ============================================================================
// ✅ FIX: Lógica de Multiplicadores actualizada para usar 'is_multiplier_enabled'.
// ✅ NUEVO: INTEGRACIÓN DE REGLA DINÁMICA DE REEMBOLSO DE PUNTOS
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppIcon from '../../components/AppIcon';

// ============================================================================
// CONFIGURACIÓN POR DEFECTO (Para Bonos, Límites, General)
// ============================================================================

const DEFAULT_POINTS_CONFIG = {
  // Las 'actions' ya no se definen aquí, se cargan desde la DB
  actions: {}, 
  
  // Bonos especiales
  bonuses: {
    first_upload_day: 100,
    trending_video: 50,
    video_milestone_100_views: 25,
    video_milestone_1000_views: 100,
    video_milestone_10000_views: 500,
    complete_profile: 200,
    verify_email: 50
  },
  
  // Límites diarios
  daily_limits: {
    max_watch_points: 100,
    max_like_points: 50,
    max_comment_points: 100,
    max_share_points: 200
  },
  
  // Configuración general
  general: {
    enable_multipliers: true,
    enable_bonuses: true,
    enable_daily_limits: true,
    premium_to_free_exchange_rate: 0.5
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function PointsRulesEditor() {
  // ============================================================================
  // ESTADO
  // ============================================================================

  const [activeTab, setActiveTab] = useState('actions');
  
  const [actionRules, setActionRules] = useState([]);
  
  const [config, setConfig] = useState(DEFAULT_POINTS_CONFIG); 
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================================
  // FUNCIONES DE CARGA (CORREGIDA)
  // ============================================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasChanges(false);

      // 1. Cargar categorías (incluyendo la nueva columna is_multiplier_enabled)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // 2. Cargar reglas de acción desde 'public.points_rules'
      const { data: rulesData, error: rulesError } = await supabase
        .from('points_rules')
        .select('*') 
        .order('action_name');
        
      if (rulesError) throw rulesError;
      setActionRules(rulesData || []);

      // 3. Cargar el RESTO de la config (Bonos, Límites, General) desde 'system_settings'
      const { data: configData, error: configError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'points_rules_config')
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;

      if (configData) {
        const savedConfig = JSON.parse(configData.setting_value);
        setConfig(prev => ({
          ...prev,
          bonuses: savedConfig.bonuses || prev.bonuses,
          daily_limits: savedConfig.daily_limits || prev.daily_limits,
          general: savedConfig.general || prev.general,
          actions: {}
        }));
      }

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FUNCIONES DE GUARDADO (CORREGIDA para manejar metadata)
  // ============================================================================

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // 1. Guardar Bonos, Límites, General en 'system_settings' (Sin cambios)
      const otherConfig = {
        bonuses: config.bonuses,
        daily_limits: config.daily_limits,
        general: config.general,
        actions: {}
      };
      
      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'points_rules_config',
          setting_value: JSON.stringify(otherConfig),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (upsertError) throw upsertError;

      // 2. Guardar 'actionRules' (incluyendo points_amount, show_in_store, y metadata)
      const updates = actionRules.map(rule => {
        const updatePayload = { 
            points_amount: rule.points_amount,
            show_in_store: rule.show_in_store 
        };
        
        // ✅ AÑADIDO: Guarda el objeto metadata completo si existe
        if (rule.metadata) {
            updatePayload.metadata = rule.metadata; 
        }

        return supabase
          .from('points_rules')
          .update(updatePayload)
          .eq('action_type', rule.action_type);
      });
      
      // 3. Guardar categorías (Asegura que los cambios en puntos y el multiplicador estén guardados)
      const categoryUpdates = categories.map(cat => 
          supabase
              .from('categories')
              .update({
                  points_multiplier: cat.points_multiplier, 
                  is_multiplier_enabled: cat.is_multiplier_enabled 
              })
              .eq('id', cat.id)
      );


      const results = await Promise.all([...updates, ...categoryUpdates]);
      
      for (const res of results) {
        if (res.error) throw res.error;
      }

      setSuccessMessage('Configuración guardada exitosamente');
      setHasChanges(false);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('¿Estás seguro de restaurar los Bonos, Límites y Opciones Generales a sus valores por defecto? (Esto no afectará a los Puntos por Acción)')) {
      setConfig(prev => ({
        ...prev,
        bonuses: DEFAULT_POINTS_CONFIG.bonuses,
        daily_limits: DEFAULT_POINTS_CONFIG.daily_limits,
        general: DEFAULT_POINTS_CONFIG.general
      }));
      setHasChanges(true);
    }
  };

  // ============================================================================
  // FUNCIONES DE ACTUALIZACIÓN (ADAPTADAS)
  // ============================================================================

  // Esta función actualiza el input de puntos (points_amount)
  const updateAction = (actionType, value) => {
    setActionRules(prev =>
      prev.map(rule =>
        rule.action_type === actionType
          ? { ...rule, points_amount: parseInt(value) || 0 }
          : rule
      )
    );
    setHasChanges(true);
  };
  
  // ✅ NUEVA FUNCIÓN: Actualiza valores dentro del objeto metadata
  const updateRuleMetadata = (actionType, key, value) => {
    setActionRules(prev =>
        prev.map(rule =>
            rule.action_type === actionType
                ? { 
                    ...rule, 
                    metadata: { 
                        ...rule.metadata, 
                        [key]: parseInt(value) || 0 
                    } 
                  }
                : rule
        )
    );
    setHasChanges(true);
  };


  // Función para manejar el estado del checkbox de 'show_in_store'
  const updateActionShowInStore = (actionType, isChecked) => {
    setActionRules(prev =>
      prev.map(rule =>
        rule.action_type === actionType
          ? { ...rule, show_in_store: isChecked }
          : rule
      )
    );
    setHasChanges(true);
  };
  
  // (Las siguientes funciones no cambian)
  const updateBonus = (bonus, value) => {
    setConfig(prev => ({
      ...prev,
      bonuses: {
        ...prev.bonuses,
        [bonus]: parseInt(value) || 0
      }
    }));
    setHasChanges(true);
  };

  const updateDailyLimit = (limit, value) => {
    setConfig(prev => ({
      ...prev,
      daily_limits: {
        ...prev.daily_limits,
        [limit]: parseInt(value) || 0
      }
    }));
    setHasChanges(true);
  };

  const updateGeneral = (key, value) => {
    setConfig(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  // ✅ CORREGIDA: Actualiza el valor numérico del multiplicador en el estado local
  const updateCategoryMultiplier = (categoryId, multiplier) => {
      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId
            ? { ...cat, points_multiplier: parseFloat(multiplier) }
            : cat
        )
      );
      setHasChanges(true);
  };

  // ✅ NUEVA FUNCIÓN: Maneja el estado de activación/desactivación del multiplicador
  const toggleCategoryMultiplier = (categoryId, isEnabled) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, is_multiplier_enabled: isEnabled }
          : cat
      )
    );
    setHasChanges(true);
  };

  // ============================================================================
  // FUNCIONES DE PREVIEW (CORREGIDAS: Alineación de action_type)
  // ============================================================================

  const getActionValue = (actionType) => {
    return actionRules.find(r => r.action_type === actionType)?.points_amount || 0;
  };

  const calculatePreview = () => {
    // Usamos 'gaming' como ejemplo para el preview
    const category = categories.find(c => c.slug === 'gaming') || categories[0];
    const multiplier = category?.points_multiplier || 1.0;
    
    // Obtener el estado de activación del multiplicador
    const isMultiplierEnabled = category?.is_multiplier_enabled ?? true; // Default TRUE

    const uploadVideoPoints = getActionValue('video_base'); 
    const watchVideoPoints = getActionValue('video_view');
    const giveLikePoints = getActionValue('give_like');

    // Calcular el multiplicador final (0 si está desactivado)
    const finalMultiplier = isMultiplierEnabled ? multiplier : 1.0;
    const pointsWithMultiplier = isMultiplierEnabled 
        ? Math.round(uploadVideoPoints * finalMultiplier) 
        : uploadVideoPoints;

    const preview = {
      uploadVideo: {
        base: uploadVideoPoints,
        withMultiplier: pointsWithMultiplier,
        withBonus: Math.round(pointsWithMultiplier + config.bonuses.first_upload_day),
        isMultiplierEnabled: isMultiplierEnabled
      },
      watchVideo: {
        base: watchVideoPoints,
        withMultiplier: Math.round(watchVideoPoints * finalMultiplier),
        dailyLimit: config.daily_limits.max_watch_points
      },
      giveLike: {
        base: giveLikePoints,
        dailyLimit: config.daily_limits.max_like_points
      },
      category: category?.name || 'Categoría'
    };

    setPreviewData(preview);
  };

  useEffect(() => {
    if (categories.length > 0 && actionRules.length > 0) {
      calculatePreview();
    }
  }, [config, categories, actionRules]);
  
  const getIconForAction = (actionType) => {
    // Leemos el ícono desde la metadata si existe, si no, usamos el mapa
    const rule = actionRules.find(r => r.action_type === actionType);
    if (rule?.metadata?.icon) {
      return rule.metadata.icon;
    }
    
    // Mapa de fallback
    const map = {
      daily_login: 'LogIn',
      profile_complete: 'UserCheck',
      email_verified: 'Mail',
      video_base: 'Upload', 
      video_upload_per_minute: 'Clock',
      vertical_video_bonus: 'Smartphone',
      video_view: 'Play',
      video_like_received: 'HeartHandshake',
      video_comment_received: 'MessageCircle',
      photo_upload: 'Image',
      photo_like_received: 'HeartHandshake',
      give_like: 'Heart',
      give_comment: 'MessageCircle',
      share_content: 'Share2',
      gift_points_received: 'Gift',
      gift_rebate_config: 'BadgeDollarSign', // ✅ NUEVO ÍCONO DE CONFIGURACIÓN
    };
    return map[actionType] || 'Zap';
  };

  // Función auxiliar para obtener las reglas de interacción/misceláneas que no son de subida de video
  const getInteractionRules = () => {
    const creationRules = [
        'video_base', 'video_upload_per_minute', 'vertical_video_bonus', 'photo_upload'
    ];
    return actionRules.filter(rule => !creationRules.includes(rule.action_type));
  };
  
  const rulesByActionType = actionRules.reduce((acc, rule) => {
    acc[rule.action_type] = rule;
    return acc;
  }, {});

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
              Editor de Reglas de Puntos
            </h1>
            <p className="text-gray-600 mt-1">
              Configura cómo los usuarios ganan puntos en la plataforma
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <AppIcon name="RotateCcw" className="w-4 h-4" />
              Restaurar
            </button>

            <button
              onClick={handleSave}
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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2">
            {[
              { id: 'actions', label: 'Acciones', icon: 'Zap' },
              { id: 'multipliers', label: 'Multiplicadores', icon: 'TrendingUp' },
              { id: 'bonuses', label: 'Bonos', icon: 'Gift' },
              { id: 'limits', label: 'Límites', icon: 'Shield' },
              { id: 'general', label: 'General', icon: 'Settings' },
              { id: 'preview', label: 'Preview', icon: 'Eye' }
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
          {/* =================================== */}
          {/* Tab: Acciones (REORGANIZADO SEGURO) */}
          {/* =================================== */}
          {activeTab === 'actions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AppIcon name="Zap" className="w-5 h-5 text-blue-600" />
                  Puntos por Acción
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Define cuántos puntos gratis ganan los usuarios por cada acción
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* --- SECCIÓN 1: REGLAS DE CREACIÓN DE CONTENIDO (Agrupadas) --- */}
                  <div className="md:col-span-2 space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-md font-bold text-blue-800">
                        <AppIcon name="UploadCloud" className="w-4 h-4 inline-block mr-2" />
                        Reglas de Subida de Contenido
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Subir Video (Base) */}
                        {rulesByActionType['video_base'] && (
                            <ActionPointsInput
                                icon={getIconForAction('video_base')}
                                label={rulesByActionType['video_base'].action_name || 'Subir Video (Base)'}
                                description="Puntos por subir cualquier contenido de video"
                                value={getActionValue('video_base')}
                                onChange={(value) => updateAction('video_base', value)}
                                highlight={true}
                                showInStore={rulesByActionType['video_base'].show_in_store}
                                onShowInStoreChange={(isChecked) => updateActionShowInStore('video_base', isChecked)}
                            />
                        )}
                        {/* Subir Video (Por Minuto) */}
                        {rulesByActionType['video_upload_per_minute'] && (
                            <ActionPointsInput
                                icon={getIconForAction('video_upload_per_minute')}
                                label={rulesByActionType['video_upload_per_minute'].action_name || 'Subir Video (Por Minuto)'}
                                description="Puntos adicionales por cada minuto de video"
                                value={getActionValue('video_upload_per_minute')}
                                onChange={(value) => updateAction('video_upload_per_minute', value)}
                                highlight={true}
                                showInStore={rulesByActionType['video_upload_per_minute'].show_in_store}
                                onShowInStoreChange={(isChecked) => updateActionShowInStore('video_upload_per_minute', isChecked)}
                            />
                        )}
                        {/* Bono Video Vertical */}
                        {rulesByActionType['vertical_video_bonus'] && (
                            <ActionPointsInput
                                icon={getIconForAction('vertical_video_bonus')}
                                label={rulesByActionType['vertical_video_bonus'].action_name || 'Bono Video Vertical (Reel)'}
                                description="Puntos extra por subir un video vertical (Reel)"
                                value={getActionValue('vertical_video_bonus')}
                                onChange={(value) => updateAction('vertical_video_bonus', value)}
                                highlight={true}
                                showInStore={rulesByActionType['vertical_video_bonus'].show_in_store}
                                onShowInStoreChange={(isChecked) => updateActionShowInStore('vertical_video_bonus', isChecked)}
                            />
                        )}
                        {/* Subir Foto */}
                        {rulesByActionType['photo_upload'] && (
                            <ActionPointsInput
                                icon={getIconForAction('photo_upload')}
                                label={rulesByActionType['photo_upload'].action_name || 'Subir foto'}
                                description="Puntos por subir una foto"
                                value={getActionValue('photo_upload')}
                                onChange={(value) => updateAction('photo_upload', value)}
                                highlight={true}
                                showInStore={rulesByActionType['photo_upload'].show_in_store}
                                onShowInStoreChange={(isChecked) => updateActionShowInStore('photo_upload', isChecked)}
                            />
                        )}
                    </div>
                  </div>
                  
                  {/* --- SECCIÓN 2: OTRAS ACCIONES (Interacciones/General/Configuración) --- */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">
                    {getInteractionRules().map(rule => {
                        
                        // ✅ RENDERIZAR COMPONENTE DE CONFIGURACIÓN DE REEMBOLSO
                        if (rule.action_type === 'gift_rebate_config') {
                            return (
                                <RebateConfigInput
                                    key={rule.action_type}
                                    rule={rule}
                                    // points_amount (monto de activación)
                                    onActivationChange={(value) => updateAction(rule.action_type, value)}
                                    // metadata.rebate_amount (monto de reembolso)
                                    onRebateChange={(value) => updateRuleMetadata(rule.action_type, 'rebate_amount', value)}
                                    // show_in_store
                                    onShowInStoreChange={(isChecked) => updateActionShowInStore(rule.action_type, isChecked)}
                                />
                            );
                        }
                        
                        // RENDERIZAR ACCIONES ESTÁNDAR
                        return (
                            <ActionPointsInput
                                key={rule.action_type}
                                icon={getIconForAction(rule.action_type)}
                                label={rule.action_name || rule.action_type}
                                description={rule.description || `ID: ${rule.action_type}`}
                                value={getActionValue(rule.action_type)}
                                onChange={(value) => updateAction(rule.action_type, value)}
                                showInStore={rule.show_in_store}
                                onShowInStoreChange={(isChecked) => updateActionShowInStore(rule.action_type, isChecked)}
                            />
                        );
                    })}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* =================================== */}
          {/* Tab: Multiplicadores (MODIFICADA)   */}
          {/* =================================== */}
          {activeTab === 'multipliers' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AppIcon name="TrendingUp" className="w-5 h-5 text-purple-600" />
                  Multiplicadores por Categoría
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Los multiplicadores se aplican a los puntos ganados por subir contenido
                </p>

                <div className="space-y-3">
                  {categories.map(category => (
                    // Usamos category.is_multiplier_enabled para determinar el estado del multiplicador
                    <div
                      key={category.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                        category.is_multiplier_enabled // ✅ Usa la nueva columna
                          ? 'border-blue-300 bg-blue-50/50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <AppIcon
                          name={category.icon || 'Folder'}
                          className="w-6 h-6"
                          style={{ color: category.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">
                          {category.name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          {category.description}
                        </p>
                      </div>
                      
                      {/* ✅ Checkbox para activar/desactivar el multiplicador */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-24">
                          <label className="text-xs font-semibold text-gray-700">Multiplicador</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!category.is_multiplier_enabled} // ✅ Usa la nueva columna
                              onChange={(e) => toggleCategoryMultiplier(category.id, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-xs font-medium text-gray-900">{category.is_multiplier_enabled ? 'ON' : 'OFF'}</span>
                          </label>
                      </div>


                      <div className="flex items-center gap-3 flex-shrink-0">
                        <input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={category.points_multiplier}
                          onChange={(e) => updateCategoryMultiplier(category.id, e.target.value)}
                          className={`w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold ${
                            category.is_multiplier_enabled ? '' : 'bg-gray-200 text-gray-500 cursor-not-allowed' // ✅ Deshabilita si está OFF
                          }`}
                          disabled={!category.is_multiplier_enabled} // ✅ Deshabilita si está OFF
                        />
                        <span className="text-gray-600 font-medium">x</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm text-gray-600">
                          {getActionValue('video_base')} pts
                        </div>
                        <div className={`text-lg font-bold ${category.is_multiplier_enabled ? 'text-blue-600' : 'text-gray-400'}`}>
                          {category.is_multiplier_enabled // ✅ Muestra el resultado final o Desactivado
                            ? `${Math.round(getActionValue('video_base') * category.points_multiplier)} pts`
                            : `Desactivado`
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <AppIcon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">¿Cómo funcionan los multiplicadores?</p>
                    <p className="text-blue-800">
                      Los multiplicadores se aplican solo a los puntos ganados por subir contenido.
                      Por ejemplo, si un video de Gaming (x1.5) vale 50 puntos base, el usuario recibirá 75 puntos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================== */}
          {/* Tab: Bonos (Sin cambios)            */}
          {/* =================================== */}
          {activeTab === 'bonuses' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AppIcon name="Gift" className="w-5 h-5 text-orange-600" />
                  Bonos Especiales
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Puntos extra que se otorgan al cumplir ciertos logros o hitos
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BonusPointsInput
                    icon="Sunrise"
                    label="Primera subida del día"
                    description="Bonus por primera vez que sube contenido hoy"
                    value={config.bonuses.first_upload_day}
                    onChange={(value) => updateBonus('first_upload_day', value)}
                    color="orange"
                  />
                  <BonusPointsInput
                    icon="TrendingUp"
                    label="Video trending"
                    description="Cuando un video llega a trending"
                    value={config.bonuses.trending_video}
                    onChange={(value) => updateBonus('trending_video', value)}
                    color="red"
                  />
                  <BonusPointsInput
                    icon="Eye"
                    label="100 vistas"
                    description="Video alcanza 100 visualizaciones"
                    value={config.bonuses.video_milestone_100_views}
                    onChange={(value) => updateBonus('video_milestone_100_views', value)}
                    color="blue"
                  />
                  <BonusPointsInput
                    icon="Eye"
                    label="1,000 vistas"
                    description="Video alcanza 1,000 visualizaciones"
                    value={config.bonuses.video_milestone_1000_views}
                    onChange={(value) => updateBonus('video_milestone_1000_views', value)}
                    color="purple"
                  />
                  <BonusPointsInput
                    icon="Trophy"
                    label="10,000 vistas"
                    description="Video alcanza 10,000 visualizaciones"
                    value={config.bonuses.video_milestone_10000_views}
                    onChange={(value) => updateBonus('video_milestone_10000_views', value)}
                    color="yellow"
                  />
                  <BonusPointsInput
                    icon="UserCheck"
                    label="Perfil completo"
                    description="Usuario completa su perfil 100%"
                    value={config.bonuses.complete_profile}
                    onChange={(value) => updateBonus('complete_profile', value)}
                    color="green"
                  />
                  <BonusPointsInput
                    icon="Mail"
                    label="Email verificado"
                    description="Usuario verifica su email"
                    value={config.bonuses.verify_email}
                    onChange={(value) => updateBonus('verify_email', value)}
                    color="indigo"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =================================== */}
          {/* Tab: Límites (Corregida)            */}
          {/* =================================== */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AppIcon name="Shield" className="w-5 h-5 text-red-600" />
                  Límites Diarios
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Establece límites máximos de puntos que se pueden ganar por día en ciertas acciones
                </p>

                <div className="space-y-4">
                  <LimitInput
                    icon="Play"
                    label="Ver videos"
                    description="Máximo de puntos por ver videos al día"
                    value={config.daily_limits.max_watch_points}
                    onChange={(value) => updateDailyLimit('max_watch_points', value)}
                    basePoints={getActionValue('video_view')}
                  />
                  <LimitInput
                    icon="Heart"
                    label="Dar likes"
                    description="Máximo de puntos por dar likes al día"
                    value={config.daily_limits.max_like_points}
                    onChange={(value) => updateDailyLimit('max_like_points', value)}
                    basePoints={getActionValue('give_like')}
                  />
                  <LimitInput
                    icon="MessageCircle"
                    label="Comentarios"
                    description="Máximo de puntos por comentar al día"
                    value={config.daily_limits.max_comment_points}
                    onChange={(value) => updateDailyLimit('max_comment_points', value)}
                    basePoints={getActionValue('give_comment')}
                  />
                  <LimitInput
                    icon="Share2"
                    label="Compartir"
                    description="Máximo de puntos por compartir al día"
                    value={config.daily_limits.max_share_points}
                    onChange={(value) => updateDailyLimit('max_share_points', value)}
                    basePoints={getActionValue('share_content')}
                  />
                </div>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-3">
                  <AppIcon name="AlertTriangle" className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-medium mb-1">Nota sobre límites</p>
                    <p className="text-yellow-800">
                      Los límites diarios ayudan a prevenir abuso del sistema. Se resetean automáticamente a medianoche.
                      No aplican a subida de contenido para fomentar la creación.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================== */}
          {/* Tab: General (Sin cambios)          */}
          {/* =================================== */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AppIcon name="Settings" className="w-5 h-5 text-gray-600" />
                  Configuración General
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Opciones generales del sistema de puntos
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <AppIcon name="TrendingUp" className="w-4 h-4" />
                        Habilitar Multiplicadores
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Aplicar multiplicadores por categoría al subir contenido
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.general.enable_multipliers}
                        onChange={(e) => updateGeneral('enable_multipliers', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <AppIcon name="Gift" className="w-4 h-4" />
                        Habilitar Bonos
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Otorgar bonos especiales por logros y hitos
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.general.enable_bonuses}
                        onChange={(e) => updateGeneral('enable_bonuses', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <AppIcon name="Shield" className="w-4 h-4" />
                        Habilitar Límites Diarios
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Aplicar límites máximos de puntos por día
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.general.enable_daily_limits}
                        onChange={(e) => updateGeneral('enable_daily_limits', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <AppIcon name="RefreshCw" className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          Tasa de Cambio Premium → Gratis
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Proporción de conversión de puntos premium a puntos gratis
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={config.general.premium_to_free_exchange_rate}
                        onChange={(e) => updateGeneral('premium_to_free_exchange_rate', parseFloat(e.target.value))}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-sm text-gray-600">
                        1 premium = {config.general.premium_to_free_exchange_rate} gratis
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================== */}
          {/* Tab: Preview (Corregida)            */}
          {/* =================================== */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AppIcon name="Eye" className="w-5 h-5 text-green-600" />
                  Preview de Reglas
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Ejemplos de cómo funcionan las reglas actuales
                </p>

                {previewData && (
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AppIcon name="Upload" className="w-5 h-5 text-blue-600" />
                        Ejemplo: Subir un Video de {previewData.category}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Puntos base:</span>
                          <span className="font-semibold text-gray-900">
                            {previewData.uploadVideo.base} pts
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Con multiplicador de categoría:</span>
                          <span className={`font-semibold ${previewData.uploadVideo.isMultiplierEnabled ? 'text-blue-600' : 'text-gray-400'}`}>
                            {previewData.uploadVideo.isMultiplierEnabled 
                                ? `${previewData.uploadVideo.withMultiplier} pts`
                                : `Desactivado`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                          <span className="text-gray-700">Primera subida del día (con bonus):</span>
                          <span className="font-bold text-lg text-purple-600">
                            {previewData.uploadVideo.withBonus} pts
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AppIcon name="Play" className="w-5 h-5 text-green-600" />
                        Ejemplo: Ver Videos
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Puntos por video (30+ seg):</span>
                          <span className="font-semibold text-gray-900">
                            {previewData.watchVideo.base} pts
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Videos necesarios para límite diario:</span>
                          <span className="font-semibold text-green-600">
                            {Math.ceil(previewData.watchVideo.dailyLimit / (previewData.watchVideo.base || 1))} videos
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-green-200">
                          <span className="text-gray-700">Máximo por día:</span>
                          <span className="font-bold text-lg text-green-600">
                            {previewData.watchVideo.dailyLimit} pts
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AppIcon name="Heart" className="w-5 h-5 text-pink-600" />
                        Ejemplo: Dar Likes
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Puntos por like:</span>
                          <span className="font-semibold text-gray-900">
                            {previewData.giveLike.base} pts
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Likes necesarios para límite diario:</span>
                          <span className="font-semibold text-pink-600">
                            {Math.ceil(previewData.giveLike.dailyLimit / (previewData.giveLike.base || 1))} likes
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-pink-200">
                          <span className="text-gray-700">Máximo por día:</span>
                          <span className="font-bold text-lg text-pink-600">
                            {previewData.giveLike.dailyLimit} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES DE CONFIGURACIÓN
// ============================================================================

/**
 * Input para configurar puntos de una acción estándar
 */
function ActionPointsInput({ 
  icon, 
  label, 
  description, 
  value, 
  onChange, 
  highlight = false,
  showInStore,
  onShowInStoreChange
}) {
  return (
    <div className={`p-4 border rounded-lg transition-colors ${
      highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          highlight ? 'bg-blue-100' : 'bg-gray-100'
        }`}>
          <AppIcon name={icon} className={`w-5 h-5 ${highlight ? 'text-blue-600' : 'text-gray-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block font-medium text-gray-900 mb-1">
            {label}
          </label>
          <p className="text-xs text-gray-600 mb-2">
            {description}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
            />
            <span className="text-sm text-gray-600 font-medium">puntos</span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!showInStore} 
                onChange={(e) => onShowInStoreChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Mostrar en la Tienda</span>
            </label>
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * ✅ NUEVO COMPONENTE: Input para configurar la regla de Reembolso Dinámico
 */
function RebateConfigInput({ 
  rule, 
  onActivationChange, 
  onRebateChange,
  onShowInStoreChange
}) {
    const activationAmount = rule.points_amount || 5;
    const rebateAmount = rule.metadata?.rebate_amount || 2;
    const icon = 'BadgeDollarSign';

    return (
        <div className="p-4 border rounded-lg transition-colors border-purple-300 bg-purple-50/50 md:col-span-2">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-100">
                    <AppIcon name={icon} className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <label className="block font-medium text-gray-900 mb-1">
                        Configuración de Reembolso por Regalo
                    </label>
                    <p className="text-xs text-gray-600">
                        Define la regla: "Si un usuario regala **X** puntos, gana **Y** puntos de reembolso."
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-purple-200 pt-4">
                {/* Monto de Activación (X puntos) */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                        1. Monto de Regalo que Activa el Reembolso (X)
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            value={activationAmount}
                            onChange={(e) => onActivationChange(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-semibold"
                        />
                        <span className="text-sm text-gray-600 font-medium">puntos</span>
                    </div>
                    <p className="text-xs text-gray-500">El usuario debe regalar exactamente esta cantidad.</p>
                </div>
                
                {/* Monto de Reembolso (Y puntos) */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                        2. Puntos Ganados por Reembolso (Y)
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="0"
                            value={rebateAmount}
                            onChange={(e) => onRebateChange(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-semibold"
                        />
                        <span className="text-sm text-gray-600 font-medium">puntos</span>
                    </div>
                     <p className="text-xs text-gray-500">Cantidad que el usuario recupera.</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-purple-200">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!rule.show_in_store} 
                        onChange={(e) => onShowInStoreChange(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Mostrar Reembolso en Tienda/Reglas Públicas</span>
                </label>
            </div>
        </div>
    );
}

/**
 * Input para configurar puntos de un bonus
 */
function BonusPointsInput({ icon, label, description, value, onChange, color = 'blue' }) {
  const colorClasses = {
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600'
  };

  const iconColor = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`p-4 border rounded-lg ${iconColor.split(' ')[0]} ${iconColor.split(' ')[1]}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor.split(' ')[0]}`}>
          <AppIcon name={icon} className={`w-5 h-5 ${iconColor.split(' ')[2]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block font-medium text-gray-900 mb-1">
            {label}
          </label>
          <p className="text-xs text-gray-600 mb-2">
            {description}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">+</span>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
            />
            <span className="text-sm text-gray-600 font-medium">bonus</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Input para configurar límites diarios
 */
function LimitInput({ icon, label, description, value, onChange, basePoints }) {
  const maxActions = Math.ceil(value / (basePoints || 1)); // Evitar división por cero

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-red-200 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <AppIcon name={icon} className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <label className="block font-medium text-gray-900 mb-1">
            {label}
          </label>
          <p className="text-xs text-gray-600 mb-3">
            {description}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="10"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-center font-semibold"
              />
              <span className="text-sm text-gray-600 font-medium">pts/día</span>
            </div>
            <div className="flex-1 text-sm text-gray-600">
              ≈ {maxActions} acciones máx.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
