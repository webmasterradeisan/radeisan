// src/pages/user-profile-settings/hooks/useUserPhotos.js
// Hook personalizado para gestionar fotos del usuario
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

// ===============================
// HOOK PRINCIPAL
// ===============================

const useUserPhotos = (userId = null, options = {}) => {
  const { user } = useAuth();
  const {
    autoLoad = true,
    pageSize = 20,
    includePrivate = false,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;

  // Estados
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // ID del usuario objetivo (puede ser diferente al usuario actual)
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  // ===============================
  // FUNCIONES DE CARGA
  // ===============================

  // Cargar fotos
  const loadPhotos = useCallback(async (pageNumber = 0, reset = false) => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      setError(null);

      // Construir query base
      let query = supabase
        .from('photos')
        .select(`
          *,
          user_profiles!photos_user_id_fkey (
            id,
            name,
            username,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('user_id', targetUserId);

      // Filtros de privacidad
      if (!isOwnProfile || !includePrivate) {
        query = query.eq('is_published', true);
        if (!isOwnProfile) {
          query = query.neq('privacy', 'private');
        }
      }

      // Ordenamiento
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Paginación
      const from = pageNumber * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      // Actualizar estados
      if (reset || pageNumber === 0) {
        setPhotos(data || []);
        setPage(0);
      } else {
        setPhotos(prev => [...prev, ...(data || [])]);
      }

      setTotalCount(count || 0);
      setHasMore((data?.length || 0) === pageSize);
      setPage(pageNumber);

      return { success: true, data, count };

    } catch (err) {
      console.error('Error loading photos:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOwnProfile, includePrivate, sortBy, sortOrder, pageSize]);

  // Cargar más fotos (paginación)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await loadPhotos(page + 1, false);
  }, [loadPhotos, loading, hasMore, page]);

  // Refrescar fotos
  const refresh = useCallback(async () => {
    await loadPhotos(0, true);
  }, [loadPhotos]);

  // ===============================
  // FUNCIONES DE MANIPULACIÓN
  // ===============================

  // Dar like a una foto
  const likePhoto = useCallback(async (photoId, isLiked = false) => {
    if (!user?.id) return { success: false, error: 'Usuario no autenticado' };

    try {
      // TODO: Implementar tabla de likes
      // Por ahora, actualizar contador directamente
      const { data: photo } = await supabase
        .from('photos')
        .select('likes_count')
        .eq('id', photoId)
        .single();

      if (photo) {
        const newCount = Math.max(0, (photo.likes_count || 0) + (isLiked ? -1 : 1));
        
        const { error: updateError } = await supabase
          .from('photos')
          .update({ likes_count: newCount })
          .eq('id', photoId);

        if (updateError) throw updateError;

        // Actualizar estado local
        setPhotos(prev => prev.map(p => 
          p.id === photoId 
            ? { ...p, likes_count: newCount, isLiked: !isLiked }
            : p
        ));

        return { success: true, newCount };
      }

      return { success: false, error: 'Foto no encontrada' };

    } catch (err) {
      console.error('Error liking photo:', err);
      return { success: false, error: err.message };
    }
  }, [user?.id]);

  // Eliminar foto
  const deletePhoto = useCallback(async (photoId) => {
    if (!user?.id || !isOwnProfile) {
      return { success: false, error: 'No autorizado' };
    }

    try {
      // Obtener datos de la foto para eliminar archivos
      const { data: photo } = await supabase
        .from('photos')
        .select('image_url, thumbnail_url')
        .eq('id', photoId)
        .single();

      if (!photo) {
        return { success: false, error: 'Foto no encontrada' };
      }

      // Eliminar archivos de Storage
      const imagePath = photo.image_url.split('/').pop();
      const thumbnailPath = photo.thumbnail_url?.split('/').pop();

      if (imagePath) {
        await supabase.storage
          .from('photos')
          .remove([`${user.id}/${imagePath}`]);
      }

      if (thumbnailPath) {
        await supabase.storage
          .from('photos')
          .remove([`${user.id}/${thumbnailPath}`]);
      }

      // Eliminar registro de la base de datos
      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)
        .eq('user_id', user.id); // Seguridad adicional

      if (deleteError) throw deleteError;

      // Actualizar estado local
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setTotalCount(prev => Math.max(0, prev - 1));

      return { success: true };

    } catch (err) {
      console.error('Error deleting photo:', err);
      return { success: false, error: err.message };
    }
  }, [user?.id, isOwnProfile]);

  // Actualizar foto
  const updatePhoto = useCallback(async (photoId, updates) => {
    if (!user?.id || !isOwnProfile) {
      return { success: false, error: 'No autorizado' };
    }

    try {
      const { data, error: updateError } = await supabase
        .from('photos')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', photoId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar estado local
      setPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, ...data } : p
      ));

      return { success: true, data };

    } catch (err) {
      console.error('Error updating photo:', err);
      return { success: false, error: err.message };
    }
  }, [user?.id, isOwnProfile]);

  // Cambiar privacidad de foto
  const updatePhotoPrivacy = useCallback(async (photoId, privacy) => {
    return updatePhoto(photoId, { privacy });
  }, [updatePhoto]);

  // Publicar/despublicar foto
  const togglePhotoPublication = useCallback(async (photoId, isPublished) => {
    return updatePhoto(photoId, { is_published: !isPublished });
  }, [updatePhoto]);

  // ===============================
  // FUNCIONES DE ESTADÍSTICAS
  // ===============================

  // Obtener estadísticas del usuario
  const getPhotoStats = useCallback(async () => {
    if (!targetUserId) return null;

    try {
      const { data, error } = await supabase
        .from('photos')
        .select('likes_count, comments_count, views_count, is_published, privacy')
        .eq('user_id', targetUserId);

      if (error) throw error;

      const stats = {
        totalPhotos: data.length,
        publishedPhotos: data.filter(p => p.is_published).length,
        draftPhotos: data.filter(p => !p.is_published).length,
        privatePhotos: data.filter(p => p.privacy === 'private').length,
        totalLikes: data.reduce((sum, p) => sum + (p.likes_count || 0), 0),
        totalComments: data.reduce((sum, p) => sum + (p.comments_count || 0), 0),
        totalViews: data.reduce((sum, p) => sum + (p.views_count || 0), 0)
      };

      return stats;

    } catch (err) {
      console.error('Error getting photo stats:', err);
      return null;
    }
  }, [targetUserId]);

  // ===============================
  // EFECTOS
  // ===============================

  // Cargar fotos automáticamente
  useEffect(() => {
    if (autoLoad && targetUserId) {
      loadPhotos(0, true);
    }
  }, [autoLoad, targetUserId, loadPhotos]);

  // ===============================
  // RETORNO DEL HOOK
  // ===============================

  return {
    // Datos
    photos,
    loading,
    error,
    hasMore,
    page,
    totalCount,
    isOwnProfile,

    // Funciones de carga
    loadPhotos,
    loadMore,
    refresh,

    // Funciones de manipulación
    likePhoto,
    deletePhoto,
    updatePhoto,
    updatePhotoPrivacy,
    togglePhotoPublication,

    // Estadísticas
    getPhotoStats,

    // Utilidades
    clearError: () => setError(null),
    resetPagination: () => {
      setPage(0);
      setHasMore(true);
    }
  };
};

// ===============================
// HOOK PARA FOTO INDIVIDUAL
// ===============================

export const usePhoto = (photoId) => {
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPhoto = useCallback(async () => {
    if (!photoId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('photos')
        .select(`
          *,
          user_profiles!photos_user_id_fkey (
            id,
            name,
            username,
            avatar_url
          )
        `)
        .eq('id', photoId)
        .single();

      if (queryError) throw queryError;

      setPhoto(data);
      return { success: true, data };

    } catch (err) {
      console.error('Error loading photo:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    loadPhoto();
  }, [loadPhoto]);

  return {
    photo,
    loading,
    error,
    reload: loadPhoto
  };
};

// ===============================
// HOOK PARA FOTOS POR CATEGORÍA
// ===============================

export const usePhotosByCategory = (category, options = {}) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPhotosByCategory = useCallback(async () => {
    if (!category) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('photos')
        .select(`
          *,
          user_profiles!photos_user_id_fkey (
            id,
            name,
            username,
            avatar_url
          )
        `)
        .eq('category', category)
        .eq('is_published', true)
        .neq('privacy', 'private')
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setPhotos(data || []);
      return { success: true, data };

    } catch (err) {
      console.error('Error loading photos by category:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [category, options.limit]);

  useEffect(() => {
    loadPhotosByCategory();
  }, [loadPhotosByCategory]);

  return {
    photos,
    loading,
    error,
    reload: loadPhotosByCategory
  };
};

export default useUserPhotos;
