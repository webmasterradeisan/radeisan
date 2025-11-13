// src/pages/user-profile-settings/index.jsx
// UserProfileSettings - ✅ INTEGRADO CON SISTEMA DE PUNTOS
// ✅ CORREGIDO: El historial de puntos ahora usa el componente 'TransactionHistory'
//    de la página de recompensas, con filtros y paginación.
// ✅ CORREGIDO: Añadido 'useEffect' para leer el hash de la URL (#historial-puntos)
//    y activar la pestaña de Puntos automáticamente.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
// Importación corregida a la ruta original
import { useAuth } from '../../contexts/AuthContext'; 
import { usePoints } from '../../contexts/PointsContext'; 
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import ProfileTabs from './components/ProfileTabs';
// ❌ Componente de historial simple eliminado
// import PointsHistory from './components/PointsHistory'; 
// ✅ Componente de historial avanzado (de /rewards) importado
import TransactionHistory from '../points-rewards-store/components/TransactionHistory'; 
import SettingsPanel from './components/SettingsPanel';
import PurchaseHistory from './components/PurchaseHistory';
import PhotoQuickUpload from '../../components/PhotoQuickUpload';
import ProfileImageEditor from '../../components/ProfileImageEditor';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// 🚨 IMPORTACIÓN DEL MODAL REAL
import PhotoDetailModal from '../../components/PhotoDetailModal';

// ⭐️ IMPORTACIÓN REQUERIDA PARA EL SISTEMA DE PUNTOS ⭐️
import { trackUploadVideo } from '../../services/missionsService';
// ✅ Importación del servicio de historial paginado
import { getUserPointsHistory } from '../../services/pointsService'; 

// ===============================
// CONSTANTES
// ===============================

const VIDEO_ORIENTATIONS = {
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal',
  SQUARE: 'square'
};

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para datos del perfil del usuario
export const useUserProfile = () => { 
  const { user, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const generateUsername = (email) => {
    if (!email) return `user${Date.now()}`;
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const random = Math.floor(Math.random() * 1000);
    return `${base}${random}`;
  };

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
              username: generateUsername(user.email),
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url,
              cover_image_url: null,
              photos_count: 0,
              videos_count: 0,
              bio: '',
              website: '',
              location: '',
              points: 0,
              is_business_account: false,
              is_verified: false,
              followers_count: 0,
              following_count: 0,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) throw createError;
          setProfileData(newProfile);
        } else {
          throw fetchError;
        }
      } else {
        setProfileData(data);
      }

    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshProfile = useCallback(() => {
    return fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profileData,
    loading,
    error,
    refreshProfile,
    updateProfile
  };
};

// Hook para videos horizontales
export const useUserVideos = (userId) => { 
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0
  });

  const fetchVideos = useCallback(async () => {
    if (!userId) {
      console.log('🎬 No userId provided, setting empty state');
      setVideos([]);
      setStats({ totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0 });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🎬 Fetching HORIZONTAL videos for user ID:', userId);

      // CORRECCIÓN: Eliminado 'likes_count' y 'comments_count'
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select(`
          id,
          user_id,
          title,
          description,
          video_url,
          thumbnail_url,
          category,
          tags,
          duration_seconds,
          file_size_bytes,
          views_count,
          points_earned,
          is_published,
          featured_until,
          created_at,
          updated_at,
          orientation,
          aspect_ratio,
          video_width,
          video_height
        `)
        .eq('user_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error('❌ Error fetching videos:', fetchError);
        throw fetchError;
      }

      console.log('🔍 Filtrando videos por orientación REAL de BD...');
      
      const allVideos = data || [];
      const horizontalVideos = allVideos.filter(video => {
        const realOrientation = video.orientation || VIDEO_ORIENTATIONS.HORIZONTAL;
        const isHorizontal = realOrientation === VIDEO_ORIENTATIONS.HORIZONTAL;
        
        console.log(`📹 "${video.title}": orientación BD="${realOrientation}" → ${isHorizontal ? 'INCLUIR' : 'FILTRAR'}`);
        
        return isHorizontal;
      });

      console.log('✅ Filtrado de videos horizontales completado:', {
        total: allVideos.length,
        horizontal: horizontalVideos.length,
        filtered_out: allVideos.length - horizontalVideos.length
      });

      setVideos(horizontalVideos);

      const videoStats = horizontalVideos.reduce(
        (acc, video) => ({
          totalVideos: acc.totalVideos + 1,
          totalViews: acc.totalViews + (video.views_count || 0),
          // CORRECCIÓN: Usar 0 ya que estas columnas no existen en BD
          totalLikes: acc.totalLikes + 0, 
          totalComments: acc.totalComments + 0
        }),
        { totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0 }
      );

      setStats(videoStats);
      console.log('📊 Video stats calculated:', videoStats);

    } catch (err) {
      console.error('💥 Error in fetchVideos:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      setError(err.message);
      setVideos([]);
      setStats({ totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0 });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos,
    stats,
    loading,
    error,
    totalCount: videos.length,
    refresh: fetchVideos
  };
};

// Hook para reels (videos verticales)
export const useUserReels = (userId) => { 
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalReels: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0
  });

  const fetchReels = useCallback(async () => {
    if (!userId) {
      console.log('📱 No userId provided, setting empty state');
      setReels([]);
      setStats({ totalReels: 0, totalViews: 0, totalLikes: 0, totalComments: 0 });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📱 Fetching VERTICAL videos (reels) for user ID:', userId);

      // CORRECCIÓN: Eliminado 'likes_count' y 'comments_count'
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select(`
          id,
          user_id,
          title,
          description,
          video_url,
          thumbnail_url,
          category,
          tags,
          duration_seconds,
          file_size_bytes,
          views_count,
          points_earned,
          is_published,
          featured_until,
          created_at,
          updated_at,
          orientation,
          aspect_ratio,
          video_width,
          video_height
        `)
        .eq('user_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error('❌ Error fetching reels:', fetchError);
        throw fetchError;
      }

      console.log('🔍 Filtrando reels por orientación REAL de BD...');

      const allVideos = data || [];
      const verticalVideos = allVideos.filter(video => {
        const realOrientation = video.orientation || VIDEO_ORIENTATIONS.HORIZONTAL;
        const isVertical = realOrientation === VIDEO_ORIENTATIONS.VERTICAL;
        
        console.log(`📱 "${video.title}": orientación BD="${realOrientation}" → ${isVertical ? 'INCLUIR' : 'FILTRAR'}`);
        
        return isVertical;
      });

      console.log('✅ Filtrado de reels completado:', {
        total: allVideos.length,
        vertical: verticalVideos.length,
        filtered_out: allVideos.length - verticalVideos.length
      });

      setReels(verticalVideos);

      const reelStats = verticalVideos.reduce(
        (acc, reel) => ({
          totalReels: acc.totalReels + 1,
          totalViews: acc.totalViews + (reel.views_count || 0),
          // CORRECCIÓN: Usar 0 ya que estas columnas no existen en BD
          totalLikes: acc.totalLikes + 0, 
          totalComments: acc.totalComments + 0
        }),
        { totalReels: 0, totalViews: 0, totalLikes: 0, totalComments: 0 }
      );

      setStats(reelStats);
      console.log('📊 Reel stats calculated:', reelStats);

    } catch (err) {
      console.error('💥 Error in fetchReels:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      setError(err.message);
      setReels([]);
      setStats({ totalReels: 0, totalViews: 0, totalLikes: 0, totalComments: 0 });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  return {
    reels,
    stats,
    loading,
    error,
    totalCount: reels.length,
    refresh: fetchReels
  };
};

// Hook para fotos del usuario
export const useUserPhotos = (userId) => { 
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPhotos = useCallback(async () => {
    if (!userId) {
      console.log('📸 DIAGNÓSTICO FOTOS: No userId provided, skipping photos fetch');
      setPhotos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📸 Fetching photos for user:', userId);

      const { data, error: fetchError } = await supabase
        .from('photos')
        .select(`
          id,
          image_url,
          thumbnail_url,
          caption,
          category,
          tags,
          aspect_ratio,
          created_at,
          user_id,
          description 
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('❌ Error fetching photos:', fetchError);
        setError(`Error de Supabase: ${fetchError.message}`);
        setPhotos([]);
      } else {
        console.log(`✅ DIAGNÓSTICO FOTOS: Fotos obtenidas exitosamente. Cantidad: ${data?.length || 0}`);
        setPhotos(data || []);
      }

    } catch (err) {
      console.error('💥 Error in fetchPhotos:', err);
      setError(err.message);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return {
    photos,
    loading,
    error,
    totalCount: photos.length,
    refresh: fetchPhotos
  };
};

// Hook para compras - MOCK
const usePurchaseHistory = () => {
  const [purchases] = useState([]);
  
  return {
    purchases,
    loading: false,
    error: null
  };
};

// ===============================
// COMPONENTE DE GRID DE FOTOS
// ===============================

export const PhotoGrid = ({ 
  photos = [], 
  loading = false, 
  onQuickUpload,
  onPhotoAction, // Nuevo prop para acciones (Editar/Eliminar)
  isOwner = false,
  showUploadButton = true,
  fetchError = null, // Se añade el error del fetcher para mostrarlo
  onPhotoClick // Nuevo prop para manejar el click
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Nuevo bloque para mostrar error si existe
  if (fetchError) {
    return (
      <div className="text-center py-16">
        <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-3">Error al cargar las fotos</h3>
        <p className="text-muted-foreground mb-4 text-sm font-mono bg-muted/
