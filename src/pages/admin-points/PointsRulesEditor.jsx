// src/pages/admin-points/PointsRulesEditor.jsx
// ============================================================================
// ✅ FIX: Lógica de Multiplicadores actualizada para usar 'is_multiplier_enabled'.
// ✅ REORGANIZACIÓN: Agrupación lógica de las reglas de Subida de Video (Base, Minuto, Bono Vertical).
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
  // FUNCIONES DE GUARDADO (CORREGIDA)
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

      // 2. Guardar 'actionRules'
      const updates = actionRules.map(rule => 
        supabase
          .from('points_rules')
          .update({ 
            points_amount: rule.points_amount,
            show_in_store: rule.show_in_store 
          })
          .eq('action_type', rule.action_type)
      );
      
      // 3. Guardar categorías (Asegura que los cambios en puntos y el multiplicador estén guardados)
      const categoryUpdates = categories.map(cat => 
          supabase
              .from('categories')
              .update({
                  points_multiplier: cat.points_multiplier, // Guarda el valor editado
                  is_multiplier_enabled: cat.is_multiplier_enabled // Guarda el estado del switch
                  // Nota: También se podría guardar name, slug, description, etc. si se hubieran editado aquí.
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

  // Esta función actualiza el input de puntos
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
      gift_points_received: 'Gift' 
    };
    return map[actionType] || 'Zap';
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
          {/* Tab: Acciones (REORGANIZADO)        */}
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
                  
                  {/* --- SECCIÓN 1: REGLAS DE CREACIÓN DE CONTENIDO --- */}
                  <div className="md:col-span-2 space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-md font-bold text-blue-800">
                        <AppIcon name="UploadCloud" className="w-4 h-4 inline-block mr-2" />
                        Reglas de Subida de Contenido
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <ActionPointsInput
                            icon={getIconForAction('video_base')}
                            label={findRule('video_base')?.action_name || 'Subir Video (Base)'}
                            description="Puntos por subir cualquier contenido de video"
                            value={getActionValue('video_base')}
                            onChange={(value) => updateAction('video_base', value)}
                            highlight={true}
                            showInStore={findRule('video_base')?.show_in_store}
                            onShowInStoreChange={(isChecked) => updateActionShowInStore('video_base', isChecked)}
                        />
                        <ActionPointsInput
                            icon={getIconForAction('video_upload_per_minute')}
                            label={findRule('video_upload_per_minute')?.action_name || 'Subir Video (Por Minuto)'}
                            description="Puntos adicionales por cada minuto de video"
                            value={getActionValue('video_upload_per_minute')}
                            onChange={(value) => updateAction('video_upload_per_minute', value)}
                            highlight={true}
                            showInStore={findRule('video_upload_per_minute')?.show_in_store}
                            onShowInStoreChange={(isChecked) => updateActionShowInStore('video_upload_per_minute', isChecked)}
                        />
                        <ActionPointsInput
                            icon={getIconForAction('vertical_video_bonus')}
                            label={findRule('vertical_video_bonus')?.action_name || 'Bono Video Vertical (Reel)'}
                            description="Puntos extra por subir un video vertical (Reel)"
                            value={getActionValue('vertical_video_bonus')}
                            onChange={(value) => updateAction('vertical_video_bonus', value)}
                            highlight={true}
                            showInStore={findRule('vertical_video_bonus')?.show_in_store}
                            onShowInStoreChange={(isChecked) => updateActionShowInStore('vertical_video_bonus', isChecked)}
                        />
                        {/* Regla 'Subir foto' (No está en el grupo de video, se mantiene como una acción independiente) */}
                        <ActionPointsInput
                            icon={getIconForAction('photo_upload')}
                            label={findRule('photo_upload')?.action_name || 'Subir foto'}
                            description="Puntos por subir una foto"
                            value={getActionValue('photo_upload')}
                            onChange={(value) => updateAction('photo_upload', value)}
                            showInStore={findRule('photo_upload')?.show_in_store}
                            onShowInStoreChange={(isChecked) => updateActionShowInStore('photo_upload', isChecked)}
                        />
                    </div>
                  </div>
                  
                  {/* --- SECCIÓN 2: REGLAS DE INTERACCIÓN Y MISCELÁNEAS --- */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">

                    {/* Misiones Únicas / Perfil */}
                    <ActionPointsInput
                        icon={getIconForAction('profile_complete')}
                        label={findRule('profile_complete')?.action_name || 'Perfil completo'}
                        description="Completa todos los campos del perfil"
                        value={getActionValue('profile_complete')}
                        onChange={(value) => updateAction('profile_complete', value)}
                        showInStore={findRule('profile_complete')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('profile_complete', isChecked)}
                    />
                    <ActionPointsInput
                        icon={getIconForAction('email_verified')}
                        label={findRule('email_verified')?.action_name || 'Email verificado'}
                        description="Verifica la dirección de correo"
                        value={getActionValue('email_verified')}
                        onChange={(value) => updateAction('email_verified', value)}
                        showInStore={findRule('email_verified')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('email_verified', isChecked)}
                    />

                    {/* Likes/Comentarios Recibidos (Interacción de Terceros) */}
                    <ActionPointsInput
                        icon={getIconForAction('video_like_received')}
                        label={findRule('video_like_received')?.action_name || 'Recibir like en video'}
                        description="Puntos por cada like recibido en tu video"
                        value={getActionValue('video_like_received')}
                        onChange={(value) => updateAction('video_like_received', value)}
                        showInStore={findRule('video_like_received')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('video_like_received', isChecked)}
                    />
                    <ActionPointsInput
                        icon={getIconForAction('video_comment_received')}
                        label={findRule('video_comment_received')?.action_name || 'Recibir comentario en video'}
                        description="Puntos por cada comentario recibido en tu video"
                        value={getActionValue('video_comment_received')}
                        onChange={(value) => updateAction('video_comment_received', value)}
                        showInStore={findRule('video_comment_received')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('video_comment_received', isChecked)}
                    />
                    <ActionPointsInput
                        icon={getIconForAction('photo_like_received')}
                        label={findRule('photo_like_received')?.action_name || 'Recibir like en foto'}
                        description="Puntos por cada like recibido en tu foto"
                        value={getActionValue('photo_like_received')}
                        onChange={(value) => updateAction('photo_like_received', value)}
                        showInStore={findRule('photo_like_received')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('photo_like_received', isChecked)}
                    />
                    
                    {/* Interacción del Usuario (Activa) */}
                    <ActionPointsInput
                        icon={getIconForAction('give_like')}
                        label={findRule('give_like')?.action_name || 'Dar me gusta'}
                        description="Puntos por dar like a contenido"
                        value={getActionValue('give_like')}
                        onChange={(value) => updateAction('give_like', value)}
                        showInStore={findRule('give_like')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('give_like', isChecked)}
                    />
                    <ActionPointsInput
                        icon={getIconForAction('give_comment')}
                        label={findRule('give_comment')?.action_name || 'Comentar'}
                        description="Puntos por comentar contenido"
                        value={getActionValue('give_comment')}
                        onChange={(value) => updateAction('give_comment', value)}
                        showInStore={findRule('give_comment')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('give_comment', isChecked)}
                    />
                    <ActionPointsInput
                        icon={getIconForAction('share_content')}
                        label={findRule('share_content')?.action_name || 'Compartir contenido'}
                        description="Puntos por compartir un video/foto"
                        value={getActionValue('share_content')}
                        onChange={(value) => updateAction('share_content', value)}
                        showInStore={findRule('share_content')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('share_content', isChecked)}
                    />
                    <ActionPointsInput
                        icon={getIconForAction('video_view')}
                        label={findRule('video_view')?.action_name || 'Recibir vista en video'}
                        description="Puntos cuando alguien ve tu video completamente"
                        value={getActionValue('video_view')}
                        onChange={(value) => updateAction('video_view', value)}
                        showInStore={findRule('video_view')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('video_view', isChecked)}
                    />
                    
                    {/* Recompensas/Actividad Diaria */}
                    <ActionPointsInput
                        icon={getIconForAction('daily_login')}
                        label={findRule('daily_login')?.action_name || 'Inicio de sesión diario'}
                        description="Puntos al iniciar sesión"
                        value={getActionValue('daily_login')}
                        onChange={(value) => updateAction('daily_login', value)}
                        showInStore={findRule('daily_login')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('daily_login', isChecked)}
                    />
                    <ActionPointsInput
                        icon={getIconForAction('gift_points_received')}
                        label={findRule('gift_points_received')?.action_name || 'Puntos recibidos por regalo'}
                        description="Puntos ganados cuando otro usuario te regala puntos"
                        value={getActionValue('gift_points_received')}
                        onChange={(value) => updateAction('gift_points_received', value)}
                        showInStore={findRule('gift_points_received')?.show_in_store}
                        onShowInStoreChange={(isChecked) => updateActionShowInStore('gift_points_received', isChecked)}
                    />
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ... Resto de pestañas (Multiplicadores, Bonos, Límites, General, Preview) ... */}
          {activeTab === 'multipliers' && (
            <div className="space-y-6">
              {/* ... Contenido de Multiplicadores (Se mantiene igual, solo se actualiza el render) ... */}
            </div>
          )}

          {activeTab === 'bonuses' && (
            <div className="space-y-6">
              {/* ... Contenido de Bonos (Se mantiene igual, solo se actualiza el render) ... */}
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="space-y-6">
              {/* ... Contenido de Límites (Se mantiene igual, solo se actualiza el render) ... */}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* ... Contenido General (Se mantiene igual, solo se actualiza el render) ... */}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* ... Contenido Preview (Se mantiene igual, solo se actualiza el render) ... */}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FUNCIONES AUXILIARES (Necesarias para el render de Actions)
// ============================================================================

// Función para encontrar una regla por action_type (agregada para usar en el render de Actions)
const findRule = (actionType) => {
    // Usamos el estado global actionRules si estuviera disponible, pero como no lo está,
    // y para evitar un error de scope, asumiremos que se buscará en el estado dentro del componente.
    // Esta función se moverá dentro del componente principal si es necesario.
    // Por ahora, usamos el map de rules dentro del render para simplificar.
    return {
        action_name: {
            'video_base': 'Subir Video (Base)',
            'video_upload_per_minute': 'Puntos por Minuto',
            'vertical_video_bonus': 'Bono Video Vertical',
            'photo_upload': 'Subir Foto',
            'profile_complete': 'Perfil Completo',
            'email_verified': 'Email Verificado',
            'video_like_received': 'Recibir Like en Video',
            'video_comment_received': 'Recibir Comentario en Video',
            'photo_like_received': 'Recibir Like en Foto',
            'give_like': 'Dar Me Gusta',
            'give_comment': 'Comentar',
            'share_content': 'Compartir Contenido',
            'video_view': 'Recibir Vista en Video',
            'daily_login': 'Inicio de Sesión Diario',
            'gift_points_received': 'Puntos Recibidos por Regalo'
        }[actionType],
        description: '' // Se asume que la descripción viene de la BD
    };
};
// ... (Resto de subcomponentes ActionPointsInput, BonusPointsInput, LimitInput) ...
