// ============================================================================
// POINTS RULES EDITOR - Editor de Reglas de Puntos
// ============================================================================
// Componente de administración para configurar todo el sistema de puntos:
// - Multiplicadores por categoría
// - Puntos por acción (watch, upload, like, etc.)
// - Bonos especiales y promociones
// - Límites y restricciones
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import AppIcon from '../../components/AppIcon';

// ============================================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================================

const DEFAULT_POINTS_CONFIG = {
  // Puntos por acciones básicas
  actions: {
    watch_video: 5,
    upload_video: 50,
    upload_photo: 30,
    give_like: 2,
    receive_like: 3,
    comment: 5,
    share: 10,
    follow_user: 5,
    daily_login: 10
  },
  
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
  // FUNCIONES DE CARGA
  // ============================================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Cargar configuración guardada
      const { data: configData, error: configError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'points_rules_config')
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;

      if (configData) {
        setConfig(JSON.parse(configData.setting_value));
      }

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FUNCIONES DE GUARDADO
  // ============================================================================

  const saveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Guardar en system_settings
      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'points_rules_config',
          setting_value: JSON.stringify(config),
          updated_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;

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
    if (window.confirm('¿Estás seguro de restaurar la configuración por defecto?')) {
      setConfig(DEFAULT_POINTS_CONFIG);
      setHasChanges(true);
    }
  };

  // ============================================================================
  // FUNCIONES DE ACTUALIZACIÓN
  // ============================================================================

  const updateAction = (action, value) => {
    setConfig(prev => ({
      ...prev,
      actions: {
        ...prev.actions,
        [action]: parseInt(value) || 0
      }
    }));
    setHasChanges(true);
  };

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

  const updateCategoryMultiplier = async (categoryId, multiplier) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ points_multiplier: parseFloat(multiplier) })
        .eq('id', categoryId);

      if (error) throw error;

      // Actualizar estado local
      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId
            ? { ...cat, points_multiplier: parseFloat(multiplier) }
            : cat
        )
      );

      setSuccessMessage('Multiplicador actualizado');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Error actualizando multiplicador:', err);
      setError(err.message);
    }
  };

  // ============================================================================
  // FUNCIONES DE PREVIEW
  // ============================================================================

  const calculatePreview = () => {
    const category = categories.find(c => c.slug === 'gaming') || categories[0];
    const multiplier = category?.points_multiplier || 1.0;

    const preview = {
      uploadVideo: {
        base: config.actions.upload_video,
        withMultiplier: Math.round(config.actions.upload_video * multiplier),
        withBonus: Math.round(config.actions.upload_video * multiplier + config.bonuses.first_upload_day)
      },
      watchVideo: {
        base: config.actions.watch_video,
        withMultiplier: Math.round(config.actions.watch_video * multiplier),
        dailyLimit: config.daily_limits.max_watch_points
      },
      giveLike: {
        base: config.actions.give_like,
        dailyLimit: config.daily_limits.max_like_points
      },
      category: category?.name || 'Categoría'
    };

    setPreviewData(preview);
  };

  useEffect(() => {
    if (categories.length > 0) {
      calculatePreview();
    }
  }, [config, categories]);

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
              onClick={saveConfig}
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
          {/* Tab: Acciones */}
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
                  {/* Ver Video */}
                  <ActionPointsInput
                    icon="Play"
                    label="Ver un video"
                    description="Completar al menos 30 segundos"
                    value={config.actions.watch_video}
                    onChange={(value) => updateAction('watch_video', value)}
                  />

                  {/* Subir Video */}
                  <ActionPointsInput
                    icon="Upload"
                    label="Subir un video"
                    description="Video aprobado y publicado"
                    value={config.actions.upload_video}
                    onChange={(value) => updateAction('upload_video', value)}
                    highlight
                  />

                  {/* Subir Foto */}
                  <ActionPointsInput
                    icon="Image"
                    label="Subir una foto"
                    description="Foto aprobada y publicada"
                    value={config.actions.upload_photo}
                    onChange={(value) => updateAction('upload_photo', value)}
                  />

                  {/* Dar Like */}
                  <ActionPointsInput
                    icon="Heart"
                    label="Dar un like"
                    description="Like en video o foto"
                    value={config.actions.give_like}
                    onChange={(value) => updateAction('give_like', value)}
                  />

                  {/* Recibir Like */}
                  <ActionPointsInput
                    icon="HeartHandshake"
                    label="Recibir un like"
                    description="En tu contenido"
                    value={config.actions.receive_like}
                    onChange={(value) => updateAction('receive_like', value)}
                  />

                  {/* Comentar */}
                  <ActionPointsInput
                    icon="MessageCircle"
                    label="Hacer un comentario"
                    description="Comentario en contenido"
                    value={config.actions.comment}
                    onChange={(value) => updateAction('comment', value)}
                  />

                  {/* Compartir */}
                  <ActionPointsInput
                    icon="Share2"
                    label="Compartir contenido"
                    description="Compartir en redes sociales"
                    value={config.actions.share}
                    onChange={(value) => updateAction('share', value)}
                  />

                  {/* Seguir Usuario */}
                  <ActionPointsInput
                    icon="UserPlus"
                    label="Seguir un usuario"
                    description="Nuevo seguidor"
                    value={config.actions.follow_user}
                    onChange={(value) => updateAction('follow_user', value)}
                  />

                  {/* Login Diario */}
                  <ActionPointsInput
                    icon="LogIn"
                    label="Login diario"
                    description="Primera vez del día"
                    value={config.actions.daily_login}
                    onChange={(value) => updateAction('daily_login', value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Multiplicadores */}
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
                    <div
                      key={category.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      {/* Icono y color de categoría */}
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

                      {/* Info de categoría */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">
                          {category.name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          {category.description}
                        </p>
                      </div>

                      {/* Input de multiplicador */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={category.points_multiplier}
                          onChange={(e) => updateCategoryMultiplier(category.id, e.target.value)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                        />
                        <span className="text-gray-600 font-medium">x</span>
                      </div>

                      {/* Preview de puntos */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm text-gray-600">
                          {config.actions.upload_video} pts
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          {Math.round(config.actions.upload_video * category.points_multiplier)} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info adicional */}
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

          {/* Tab: Bonos */}
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
                  {/* Primera subida del día */}
                  <BonusPointsInput
                    icon="Sunrise"
                    label="Primera subida del día"
                    description="Bonus por primera vez que sube contenido hoy"
                    value={config.bonuses.first_upload_day}
                    onChange={(value) => updateBonus('first_upload_day', value)}
                    color="orange"
                  />

                  {/* Video trending */}
                  <BonusPointsInput
                    icon="TrendingUp"
                    label="Video trending"
                    description="Cuando un video llega a trending"
                    value={config.bonuses.trending_video}
                    onChange={(value) => updateBonus('trending_video', value)}
                    color="red"
                  />

                  {/* 100 vistas */}
                  <BonusPointsInput
                    icon="Eye"
                    label="100 vistas"
                    description="Video alcanza 100 visualizaciones"
                    value={config.bonuses.video_milestone_100_views}
                    onChange={(value) => updateBonus('video_milestone_100_views', value)}
                    color="blue"
                  />

                  {/* 1,000 vistas */}
                  <BonusPointsInput
                    icon="Eye"
                    label="1,000 vistas"
                    description="Video alcanza 1,000 visualizaciones"
                    value={config.bonuses.video_milestone_1000_views}
                    onChange={(value) => updateBonus('video_milestone_1000_views', value)}
                    color="purple"
                  />

                  {/* 10,000 vistas */}
                  <BonusPointsInput
                    icon="Trophy"
                    label="10,000 vistas"
                    description="Video alcanza 10,000 visualizaciones"
                    value={config.bonuses.video_milestone_10000_views}
                    onChange={(value) => updateBonus('video_milestone_10000_views', value)}
                    color="yellow"
                  />

                  {/* Perfil completo */}
                  <BonusPointsInput
                    icon="UserCheck"
                    label="Perfil completo"
                    description="Usuario completa su perfil 100%"
                    value={config.bonuses.complete_profile}
                    onChange={(value) => updateBonus('complete_profile', value)}
                    color="green"
                  />

                  {/* Email verificado */}
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

          {/* Tab: Límites */}
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
                  {/* Límite ver videos */}
                  <LimitInput
                    icon="Play"
                    label="Ver videos"
                    description="Máximo de puntos por ver videos al día"
                    value={config.daily_limits.max_watch_points}
                    onChange={(value) => updateDailyLimit('max_watch_points', value)}
                    basePoints={config.actions.watch_video}
                  />

                  {/* Límite dar likes */}
                  <LimitInput
                    icon="Heart"
                    label="Dar likes"
                    description="Máximo de puntos por dar likes al día"
                    value={config.daily_limits.max_like_points}
                    onChange={(value) => updateDailyLimit('max_like_points', value)}
                    basePoints={config.actions.give_like}
                  />

                  {/* Límite comentarios */}
                  <LimitInput
                    icon="MessageCircle"
                    label="Comentarios"
                    description="Máximo de puntos por comentar al día"
                    value={config.daily_limits.max_comment_points}
                    onChange={(value) => updateDailyLimit('max_comment_points', value)}
                    basePoints={config.actions.comment}
                  />

                  {/* Límite compartir */}
                  <LimitInput
                    icon="Share2"
                    label="Compartir"
                    description="Máximo de puntos por compartir al día"
                    value={config.daily_limits.max_share_points}
                    onChange={(value) => updateDailyLimit('max_share_points', value)}
                    basePoints={config.actions.share}
                  />
                </div>
              </div>

              {/* Info */}
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

          {/* Tab: General */}
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
                  {/* Toggle: Multiplicadores */}
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

                  {/* Toggle: Bonos */}
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

                  {/* Toggle: Límites */}
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

                  {/* Tasa de cambio Premium -> Free */}
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

          {/* Tab: Preview */}
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
                    {/* Ejemplo: Subir Video */}
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
                          <span className="font-semibold text-blue-600">
                            {previewData.uploadVideo.withMultiplier} pts
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

                    {/* Ejemplo: Ver Videos */}
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
                            {Math.ceil(previewData.watchVideo.dailyLimit / previewData.watchVideo.base)} videos
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

                    {/* Ejemplo: Dar Likes */}
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
                            {Math.ceil(previewData.giveLike.dailyLimit / previewData.giveLike.base)} likes
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

                    {/* Resumen General */}
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-300 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AppIcon name="BarChart3" className="w-5 h-5 text-gray-600" />
                        Resumen General
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Estado del Sistema</div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${config.general.enable_multipliers ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              Multiplicadores: {config.general.enable_multipliers ? 'Activos' : 'Inactivos'}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${config.general.enable_bonuses ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              Bonos: {config.general.enable_bonuses ? 'Activos' : 'Inactivos'}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${config.general.enable_daily_limits ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              Límites: {config.general.enable_daily_limits ? 'Activos' : 'Inactivos'}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Acciones Configuradas</div>
                          <div className="text-2xl font-bold text-gray-900">
                            {Object.keys(config.actions).length}
                          </div>
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
// SUB-COMPONENTES
// ============================================================================

/**
 * Input para configurar puntos de una acción
 */
function ActionPointsInput({ icon, label, description, value, onChange, highlight = false }) {
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
        </div>
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
  const maxActions = Math.ceil(value / basePoints);

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
