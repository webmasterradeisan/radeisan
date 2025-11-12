// src/pages/VideoEditStudio/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
// Componentes que se reutilizan
import CategorySelector from '../video-upload-studio/components/CategorySelector'; 
import { calculateVideoPointsFull as calculateVideoPoints, addFreePoints } from '../../services/pointsService';

// =================================================================
// ESTADO INICIAL DEL FORMULARIO (para edición)
// =================================================================
const initialFormData = {
  title: '',
  description: '',
  category_id: '',
  tags: '',
  // Propiedades del video existente (solo para visualización y cálculo de puntos)
  video_url: null,
  thumbnail_url: null,
  duration_seconds: 0,
  orientation: 'horizontal', // 'horizontal' o 'vertical'
  points_multiplier: 1.0, // Multiplicador de la categoría
};

const VideoEditStudio = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [pointsPreview, setPointsPreview] = useState(0);

  // ===============================
  // FETCH DE DATOS DEL VIDEO EXISTENTE
  // ===============================
  const fetchVideoData = useCallback(async () => {
    if (!videoId) {
      console.log('⚠️ No hay videoId en la URL');
      setLoading(false);
      return;
    }

    if (!user) {
      console.log('⚠️ Usuario no está cargado aún, esperando...');
      return;
    }

    try {
      setLoading(true);
      console.log('🎬 Cargando datos del video:', videoId);

      // Primero intentamos cargar sin el JOIN para diagnosticar mejor
      const { data: videoData, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (fetchError) {
        console.error('❌ Error de Supabase:', fetchError);
        
        // Si el error es PGRST116, significa que no se encontró el registro
        if (fetchError.code === 'PGRST116') {
          console.error('❌ Video no encontrado con ID:', videoId);
          setErrors({ general: 'Video no encontrado.' });
          setLoading(false);
          // Solo redirigir a 404 si realmente no existe el video
          setTimeout(() => navigate('/profile', { replace: true }), 2000);
          return;
        }
        
        // Para otros errores, mostrar mensaje pero no redirigir
        throw fetchError;
      }

      if (!videoData) {
        console.error('❌ No se recibieron datos del video');
        setErrors({ general: 'Video no encontrado.' });
        setLoading(false);
        setTimeout(() => navigate('/profile', { replace: true }), 2000);
        return;
      }

      console.log('✅ Video cargado:', videoData);

      // 🛑 REGLA DE SEGURIDAD: Verificar si el usuario actual es el propietario
      if (user.id !== videoData.user_id) {
        console.warn('⚠️ Usuario no es propietario del video');
        alert('No tienes permiso para editar este video.');
        navigate('/profile', { replace: true });
        return;
      }

      // Cargar la categoría por separado (más seguro)
      let categoryMultiplier = 1.0;
      if (videoData.category_id) {
        const { data: categoryData } = await supabase
          .from('content_categories')
          .select('points_multiplier, is_multiplier_enabled')
          .eq('id', videoData.category_id)
          .single();

        if (categoryData && categoryData.is_multiplier_enabled !== false) {
          categoryMultiplier = categoryData.points_multiplier || 1.0;
        }
      }
      
      // Mapear los datos de la BD al estado del formulario
      setFormData({
        title: videoData.title || '',
        description: videoData.description || '',
        category_id: videoData.category_id || '', 
        tags: videoData.tags?.join(', ') || '',
        
        // Datos del video (solo lectura en esta página)
        video_url: videoData.video_url,
        thumbnail_url: videoData.thumbnail_url,
        duration_seconds: videoData.duration_seconds || 0,
        orientation: videoData.orientation || 'horizontal',

        // Multiplicador (usado para la previsualización de puntos)
        points_multiplier: categoryMultiplier,
      });

      console.log('✅ Formulario inicializado correctamente');
      setLoading(false);

    } catch (err) {
      console.error('❌ Error al cargar video para edición:', err);
      setErrors({ 
        general: 'Error al cargar el video. Por favor, intenta de nuevo.' 
      });
      setLoading(false);
      // No redirigir automáticamente, dejar que el usuario vea el error
    }
  }, [videoId, navigate, user]);

  // ===============================
  // HOOKS Y EFECTOS
  // ===============================

  useEffect(() => {
    // Solo intentar cargar el video cuando el usuario esté disponible
    if (user && videoId) {
      console.log('🔄 Usuario autenticado, cargando video...');
      fetchVideoData();
    } else if (!user) {
      console.log('⏳ Esperando autenticación del usuario...');
    }
  }, [fetchVideoData, user, videoId]);

  // Efecto para recalcular puntos cada vez que cambian los campos relevantes
  useEffect(() => {
    if (formData.duration_seconds > 0) {
      const calculatedPoints = calculateVideoPoints({
        duration_seconds: formData.duration_seconds,
        orientation: formData.orientation,
        points_multiplier: formData.points_multiplier,
      });
      setPointsPreview(calculatedPoints);
    } else {
      setPointsPreview(0);
    }
  }, [
    formData.duration_seconds, 
    formData.orientation, 
    formData.points_multiplier
  ]);


  // ===============================
  // MANEJO DE CAMBIOS Y VALIDACIÓN
  // ===============================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.length < 5) {
      newErrors.title = 'El título debe tener al menos 5 caracteres.';
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres.';
    }
    if (!formData.category_id) {
      newErrors.category_id = 'Debes seleccionar una categoría.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===============================
  // LÓGICA DE GUARDADO (ACTUALIZACIÓN)
  // ===============================
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const updateData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        updated_at: new Date().toISOString(),
      };

      // 1. Actualizar el registro de video
      const { error: updateError } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', videoId);

      if (updateError) throw updateError;
      
      // 2. Éxito
      alert('Video actualizado correctamente. Los puntos serán recalculados en el servidor si la categoría cambió.');
      // Usar el ID del usuario en el objeto 'user' o asumir una ruta de perfil genérica
      navigate(`/profile/${user?.id || ''}`); 

    } catch (error) {
      console.error('Error al actualizar video:', error);
      setErrors({ general: 'Error al actualizar. Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  // ===============================
  // RENDERIZADO
  // ===============================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader" size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Cargando editor de video...</p>
          <p className="text-sm text-muted-foreground mt-2">Video ID: {videoId}</p>
        </div>
      </div>
    );
  }

  // Mostrar error general si existe
  if (errors.general) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="AlertCircle" size={32} className="text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-6">{errors.general}</p>
          <Button onClick={() => navigate('/profile')}>
            <Icon name="Home" size={16} className="mr-2" />
            Volver al Perfil
          </Button>
        </div>
      </div>
    );
  }

  // Comprobación de que el video existe y se cargaron los datos.
  if (!formData.title && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Video" size={32} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Video no encontrado</h2>
          <p className="text-muted-foreground mb-6">
            Parece que el video que intentas editar no existe o no tienes permiso para editarlo.
          </p>
          <Button onClick={() => navigate('/profile')}>
            <Icon name="Home" size={16} className="mr-2" />
            Volver al Perfil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Editar Video - {formData.title}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />

        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <h1 className="text-3xl font-extrabold text-foreground">
              <Icon name="Edit" size={24} className="inline-block mr-2" />
              Editar Contenido: {formData.title}
            </h1>
            <p className="text-muted-foreground">
              Estás editando el video ID: {videoId}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Columna Izquierda: Vista Previa y Datos de Video (No editables) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 bg-card border border-border rounded-xl shadow-lg">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Vista Previa</h2>
                  
                  {/* Vista Previa del Video */}
                  <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-video">
                    {/* Usamos el thumbnail_url como placeholder y el video_url real */}
                    <div className="w-full h-full">
                       <img 
                          src={formData.thumbnail_url || '/placeholder.jpg'} 
                          alt="Miniatura del video" 
                          className="w-full h-full object-cover"
                        />
                    </div>
                    
                    {/* Capa de reproducción para indicar que es un video */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Icon name="PlayCircle" size={48} className="text-white/80" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      <Icon name="Link" size={14} className="inline-block mr-1" />
                      URL: <a href={formData.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">{formData.video_url}</a>
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      <Icon name="Clock" size={14} className="inline-block mr-1" />
                      Duración: {Math.floor(formData.duration_seconds / 60)}m {formData.duration_seconds % 60}s
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      <Icon name={formData.orientation === 'vertical' ? 'Smartphone' : 'Monitor'} size={14} className="inline-block mr-1" />
                      Formato: {formData.orientation === 'vertical' ? 'Vertical (Reel)' : 'Horizontal'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Columna Central: Formulario de Metadatos */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 bg-card border border-border rounded-xl shadow-lg space-y-6">
                  <h2 className="text-xl font-semibold text-foreground">Metadatos del Video</h2>
                  
                  {/* Título */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Título *</label>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Título llamativo para el video"
                      error={errors.title}
                    />
                    {errors.title && <p className="text-xs text-error mt-1">{errors.title}</p>}
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Descripción *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-primary focus:border-primary transition-all"
                      placeholder="Una descripción detallada ayuda a la visibilidad..."
                    />
                    {errors.description && <p className="text-xs text-error mt-1">{errors.description}</p>}
                  </div>
                  
                  {/* Categoría */}
                  <CategorySelector
                    // Cambiamos el valor a category_id para que el selector funcione con el UUID
                    value={formData.category_id} 
                    // Asegúrate de que CategorySelector esté usando 'category_id' en lugar de 'slug' para el valor del select.
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                  />
                  {errors.category_id && <p className="text-xs text-error mt-1">{errors.category_id}</p>}

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Tags (Separados por comas)</label>
                    <Input
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="Ej: tutorial, javascript, programación"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo 10 tags. Sepáralos con comas.
                    </p>
                  </div>
                  
                  {/* Botón de Guardar */}
                  <div className="pt-4 border-t border-border">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !user || !videoId}
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <Icon name="Loader" size={16} className="animate-spin mr-2" />
                          Guardando Cambios...
                        </>
                      ) : (
                        <>
                          <Icon name="Save" size={16} className="mr-2" />
                          Actualizar Metadatos
                        </>
                      )}
                    </Button>
                    {errors.general && <p className="text-sm text-error mt-2 text-center">{errors.general}</p>}
                  </div>
                </div>
                
                {/* Columna Derecha - Puntos y Reglas */}
                <div className="p-6 bg-card border border-border rounded-xl shadow-lg">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    Puntos Previsualizados
                  </h2>
                  <div className="flex items-center justify-between p-4 bg-background border border-primary/50 rounded-lg">
                    <p className="text-sm font-medium text-primary">Puntos Estimados</p>
                    <p className="text-3xl font-bold text-primary">
                      {pointsPreview} <span className="text-lg font-normal text-primary/80">pts</span>
                    </p>
                  </div>

                  <div className="mt-6 space-y-3 text-sm">
                    <h3 className="font-semibold text-foreground mb-3">Reglas de Ganancia</h3>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <Icon name="Trophy" size={16} color="var(--color-warning)" className="mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground">
                          Multiplicador de Categoría: <strong>{formData.points_multiplier}x</strong>
                        </p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Icon name="Smartphone" size={16} color="var(--color-success)" className="mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground">
                          Los Reels (videos verticales) reciben <strong>10 puntos bonus</strong>
                        </p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Icon name="Clock" size={16} color="var(--color-primary)" className="mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground">
                          Puntos por duración: <strong>{formData.duration_seconds} segundos</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default VideoEditStudio;
