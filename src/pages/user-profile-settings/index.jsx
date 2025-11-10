// src/pages/user-profile-settings/index.jsx
// UserProfileSettings - ✅ INTEGRADO CON SISTEMA DE PUNTOS
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
// Importación corregida a la ruta original
import { useAuth } from '../../contexts/AuthContext'; 
import { usePoints } from '../../contexts/PointsContext'; 
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import ProfileTabs from './components/ProfileTabs';
import PointsHistory from './components/PointsHistory';
import SettingsPanel from './components/SettingsPanel';
import PurchaseHistory from './components/PurchaseHistory';
import PhotoQuickUpload from '../../components/PhotoQuickUpload';
import ProfileImageEditor from '../../components/ProfileImageEditor';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// 🚨 IMPORTACIÓN DEL MODAL REAL
import PhotoDetailModal from '../../components/PhotoDetailModal';

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
const useUserProfile = () => {
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
const useUserVideos = (userId) => {
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
const useUserReels = (userId) => {
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
const useUserPhotos = (userId) => {
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

// Hook para historial de puntos REAL
const usePointsHistory = (userId) => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    currentBalance: 0,
    totalEarned: 0,
    totalSpent: 0,
    freePoints: 0,
    premiumPoints: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPointsHistory = useCallback(async () => {
    if (!userId) {
      console.log('💰 No userId provided for points history');
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('💰 Fetching points history for user:', userId);

      // Obtener transacciones
      const { data: transactionsData, error: transError } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (transError) {
        console.error('❌ Error fetching transactions:', transError);
        throw transError;
      }

      // Obtener balance actual
      const { data: pointsData, error: pointsError } = await supabase
        .from('points_types')
        .select('free_points, premium_points')
        .eq('user_id', userId)
        .single();

      if (pointsError && pointsError.code !== 'PGRST116') {
        console.error('❌ Error fetching points balance:', pointsError);
      }

      const freePoints = pointsData?.free_points || 0;
      const premiumPoints = pointsData?.premium_points || 0;
      const currentBalance = freePoints + premiumPoints;

      // Calcular totales
      const totalEarned = transactionsData
        ?.filter(t => t.points_change > 0)
        .reduce((sum, t) => sum + t.points_change, 0) || 0;

      const totalSpent = Math.abs(
        transactionsData
          ?.filter(t => t.points_change < 0)
          .reduce((sum, t) => sum + t.points_change, 0) || 0
      );

      console.log('✅ Points history fetched:', {
        transactions: transactionsData?.length || 0,
        currentBalance,
        totalEarned,
        totalSpent
      });

      setTransactions(transactionsData || []);
      setSummary({
        currentBalance,
        totalEarned,
        totalSpent,
        freePoints,
        premiumPoints
      });

    } catch (err) {
      console.error('💥 Error in fetchPointsHistory:', err);
      setError(err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPointsHistory();
  }, [fetchPointsHistory]);

  return {
    transactions,
    summary,
    loading,
    error,
    refresh: fetchPointsHistory
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

const PhotoGrid = ({ 
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
        <p className="text-muted-foreground mb-4 text-sm font-mono bg-muted/50 px-4 py-2 rounded max-w-lg mx-auto">
          {fetchError}
        </p>
        <Button onClick={() => window.location.reload()}>
          <Icon name="RefreshCw" size={16} className="mr-2" />
          Reintentar Carga
        </Button>
      </div>
    );
  }
  
  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="ImagePlus" size={32} className="text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">
          {isOwner ? 'Comparte tus primeras fotos' : 'No hay fotos publicadas'}
        </h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {isOwner 
            ? 'Sube fotos rápidamente y comparte tus mejores momentos con la comunidad'
            : 'Este usuario no ha compartido fotos aún'
          }
        </p>
        {isOwner && showUploadButton && (
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => window.location.href = '/photo-upload'} 
              size="lg"
            >
              <Icon name="Settings" size={20} className="mr-2" />
              Studio Avanzado
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOwner && showUploadButton && (
        <div className="flex justify-end gap-3">
          {/* Único botón de subida, con estilo principal y texto "Subir Fotos" */}
          <Button 
            onClick={() => window.location.href = '/photo-upload'} 
            size="sm" 
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Subir Fotos
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div 
            key={photo.id} 
            className="group relative aspect-square cursor-pointer" // Añadir cursor-pointer
            onClick={() => onPhotoClick(photo.id)} // Añadir manejador de clic
          >
            <div className="w-full h-full bg-muted rounded-lg overflow-hidden">
              <img
                src={photo.thumbnail_url || photo.image_url}
                alt={photo.caption || 'Foto'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            
            {/* Overlay de Interacciones y Edición */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex flex-col justify-end p-4">
              <div className="text-white">
                {photo.caption && (
                  <p className="text-sm font-medium mb-1 truncate">{photo.caption}</p>
                )}
                <div className="flex items-center justify-between text-xs opacity-90">
                  <span>{new Date(photo.created_at).toLocaleDateString()}</span>
                  {photo.category && photo.category !== 'general' && (
                    <span className="bg-black/50 px-2 py-1 rounded-full capitalize">
                      {photo.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de Editar/Eliminar */}
              {isOwner && onPhotoAction && (
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white bg-black/50 hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPhotoAction('edit', photo);
                    }}
                  >
                    <Icon name="Edit" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 bg-black/50 hover:bg-black/70 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPhotoAction('delete', photo);
                    }}
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===============================
// COMPONENTE DE VIDEO GRID HORIZONTAL
// ===============================

const VideoGridComponent = ({ 
  videos = [], 
  loading = false,
  onVideoAction,
  showActions = true,
  isOwner = false,
  onUploadClick,
  emptyMessage = "No hay videos",
  emptyDescription = "Los videos que subas aparecerán aquí"
}) => {
  console.log('🎬 VideoGridComponent render:', { 
    videosCount: videos.length, 
    loading,
    hasVideos: videos.length > 0,
    firstVideoSample: videos[0] ? {
      id: videos[0].id,
      title: videos[0].title,
      views: videos[0].views_count,
      duration: videos[0].duration_seconds,
      orientation: videos[0].orientation,
      aspect_ratio: videos[0].aspect_ratio,
      classified_as: 'HORIZONTAL VIDEO'
    } : null
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-video bg-muted rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="Monitor" size={32} className="text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">{emptyMessage}</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">{emptyDescription}</p>
        {isOwner && onUploadClick && (
          <Button onClick={onUploadClick} size="lg">
            <Icon name="Plus" size={20} className="mr-2" />
            Subir video horizontal
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOwner && onUploadClick && (
        <div className="flex justify-end">
          <Button onClick={onUploadClick}>
            <Icon name="Plus" size={16} className="mr-2" />
            Subir video
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div 
            key={video.id} 
            className="group cursor-pointer"
            onClick={() => console.log('Click en video horizontal:', video.id)}
          >
            <div className="relative">
              {/* Thumbnail */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      console.log('Error loading thumbnail for video:', video.id);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <Icon name="Play" size={48} className="text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 bg-black/70 rounded-full flex items-center justify-center">
                  <Icon name="Play" size={24} className="text-white ml-1" />
                </div>
              </div>

              {/* Duration */}
              {video.duration_seconds && video.duration_seconds > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
                </div>
              )}

              {/* Horizontal Badge */}
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                VIDEO
              </div>

              {/* Debug Info - Solo en development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-1 py-0.5 rounded">
                  {video.orientation || 'no-orient'}
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="mt-3 space-y-2">
              <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {video.title || 'Video sin título'}
              </h4>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {video.views_count !== null && video.views_count !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Icon name="Eye" size={14} />
                    <span>{video.views_count}</span>
                  </div>
                )}
                {/* Nota: Se han eliminado las referencias a likes_count y comments_count */}
                <span>{new Date(video.created_at).toLocaleDateString()}</span>
              </div>

              {/* Actions */}
              {showActions && isOwner && onVideoAction && (
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVideoAction('edit', video);
                    }}
                  >
                    <Icon name="Edit" size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVideoAction('delete', video);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Icon name="Trash2" size={14} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===============================
// COMPONENTE DE REELS GRID
// ===============================

const ReelsGridComponent = ({ 
  reels = [], 
  loading = false,
  onReelAction,
  showActions = true,
  isOwner = false,
  onUploadClick,
  emptyMessage = "No hay reels",
  emptyDescription = "Los reels que subas aparecerán aquí"
}) => {
  console.log('📱 ReelsGridComponent render:', { 
    reelsCount: reels.length, 
    loading,
    hasReels: reels.length > 0,
    firstReelSample: reels[0] ? {
      id: reels[0].id,
      title: reels[0].title,
      views: reels[0].views_count,
      duration: reels[0].duration_seconds,
      orientation: reels[0].orientation,
      aspect_ratio: reels[0].aspect_ratio,
      classified_as: 'VERTICAL REEL'
    } : null
  });

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[9/16] bg-muted rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded animate-pulse" />
              <div className="h-2 bg-muted rounded w-3/4 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="Smartphone" size={32} className="text-pink-600" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">{emptyMessage}</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">{emptyDescription}</p>
        {isOwner && onUploadClick && (
          <Button onClick={onUploadClick} size="lg">
            <Icon name="Plus" size={20} className="mr-2" />
            Crear reel vertical
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOwner && onUploadClick && (
        <div className="flex justify-end">
          <Button onClick={onUploadClick}>
            <Icon name="Plus" size={16} className="mr-2" />
            Crear reel
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {reels.map((reel) => (
          <div 
            key={reel.id} 
            className="group cursor-pointer"
            onClick={() => console.log('Click en reel vertical:', reel.id)}
          >
            <div className="relative">
              {/* Thumbnail - Aspecto vertical 9:16 */}
              <div className="aspect-[9/16] bg-muted rounded-lg overflow-hidden">
                {reel.thumbnail_url ? (
                  <img
                    src={reel.thumbnail_url}
                    alt={reel.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      console.log('Error loading thumbnail for reel:', reel.id);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <Icon name="Play" size={24} className="text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 bg-black/70 rounded-full flex items-center justify-center">
                  <Icon name="Play" size={16} className="text-white ml-1" />
                </div>
              </div>

              {/* Duration */}
              {reel.duration_seconds && reel.duration_seconds > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded text-center">
                  {reel.duration_seconds < 60 ? `${reel.duration_seconds}s` : 
                   `${Math.floor(reel.duration_seconds / 60)}:${String(reel.duration_seconds % 60).padStart(2, '0')}`}
                </div>
              )}

              {/* Reel Badge */}
              <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                REEL
              </div>

              {/* Debug Info - Solo en development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-2 right-2 bg-pink-600 text-white text-xs px-1 py-0.5 rounded">
                  {reel.orientation || 'no-orient'}
                </div>
              )}
            </div>

            {/* Reel Info */}
            <div className="mt-2 space-y-1">
              <h4 className="font-medium text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {reel.title || 'Reel sin título'}
              </h4>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  {reel.views_count !== null && reel.views_count !== undefined && (
                    <div className="flex items-center space-x-1">
                      <Icon name="Eye" size={12} />
                      <span>{reel.views_count}</span>
                    </div>
                  )}
                  {/* Nota: Se han eliminado las referencias a likes_count y comments_count */}
                </div>
              </div>

              {/* Actions */}
              {showActions && isOwner && onReelAction && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReelAction('edit', reel);
                    }}
                  >
                    <Icon name="Edit" size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReelAction('delete', reel);
                    }}
                  >
                    <Icon name="Trash2" size={12} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Hook para fotos del usuario, usePointsHistory, usePurchaseHistory y PhotoGrid
// ... (omitted for brevity, they remain as provided in the last complete corrected version)


// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const UserProfileSettings = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  
  const { 
    totalPoints, 
    freePoints, 
    premiumPoints, 
    loading: pointsLoading 
  } = usePoints();
  
  const [activeTab, setActiveTab] = useState('videos');
  const [editingProfile, setEditingProfile] = useState(false);
  const [showQuickUpload, setShowQuickUpload] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);

  // Hooks de datos
  const {
    profileData,
    loading: profileLoading,
    error: profileError,
    refreshProfile,
    updateProfile
  } = useUserProfile();

  const {
    videos,
    stats: videoStats,
    loading: videosLoading,
    error: videosError,
    refresh: refreshVideos
  } = useUserVideos(user?.id);

  const {
    reels,
    stats: reelStats,
    loading: reelsLoading,
    error: reelsError,
    refresh: refreshReels
  } = useUserReels(user?.id);

  const {
    photos,
    loading: photosLoading,
    refresh: refreshPhotos,
    error: photosError // Captura el error de fotos
  } = useUserPhotos(user?.id);

  const { 
    transactions, 
    summary,
    loading: pointsHistoryLoading,
    refresh: refreshPointsHistory
  } = usePointsHistory(user?.id);
  
  const { purchases } = usePurchaseHistory();

  // Formatear datos del usuario
  const userData = useMemo(() => {
    if (!profileData) return null;

    const totalViews = (videoStats.totalViews || 0) + (reelStats.totalViews || 0);
    // CORRECCIÓN FINAL: Usar 0 para likes y comments de videos/reels para evitar errores de columna
    const totalLikes = (0) + (0) + 
                      photos.reduce((acc, photo) => acc + (photo.likes || 0), 0);
    const totalComments = (0) + (0); // Usar 0 ya que no existe comments_count

    return {
      id: profileData.id,
      name: profileData.full_name || 'Usuario',
      username: profileData.username || '',
      email: profileData.email || '',
      bio: profileData.bio || '',
      avatar: profileData.avatar_url,
      coverImage: profileData.cover_image_url,
      website: profileData.website || '',
      location: profileData.location || '',
      
      points: totalPoints,
      freePoints: freePoints,
      premiumPoints: premiumPoints,
      
      isBusinessAccount: profileData.is_business_account || false,
      isVerified: profileData.is_verified || false,
      joinedAt: profileData.created_at,
      
      // Contadores
      videosCount: videos.length,
      reelsCount: reels.length,
      photosCount: photos.length,
      followersCount: profileData.followers_count || 0,
      followingCount: profileData.following_count || 0,
      
      // Stats calculadas
      totalViews,
      totalLikes,
      totalComments,
      
      achievements: []
    };
  }, [profileData, videos, reels, photos, videoStats, reelStats, totalPoints, freePoints, premiumPoints]);

  // Calcular contadores para tabs
  const tabCounts = useMemo(() => ({
    videos: videos.length,
    reels: reels.length,
    photos: photos.length,
    purchases: purchases.length,
    points: transactions.length,
    // Eliminamos las pestañas "Me Gusta" y "Listas"
    // liked: 0, 
    // playlists: 0
  }), [videos.length, reels.length, photos.length, purchases.length, transactions.length]);

  // ===============================
  // EVENT HANDLERS
  // ===============================
  
  const handleEditProfile = useCallback(() => {
    setActiveTab('settings');
    setEditingProfile(true);
  }, []);

  const handleUpdateSettings = useCallback(async (newSettings) => {
    try {
      const result = await updateProfile(newSettings);
      if (result?.success) {
        setEditingProfile(false);
        await refreshProfile();
        console.log('✅ Profile updated successfully');
      } else {
        console.error('❌ Failed to update profile:', result?.error);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [updateProfile, refreshProfile]);

  const handleEditAvatar = useCallback(() => {
    setShowImageEditor(true);
  }, []);

  const handleEditCover = useCallback(() => {
    setShowImageEditor(true);
  }, []);

  const handleAvatarUpload = useCallback(async (url) => {
    console.log('✅ Avatar updated to:', url);
    await refreshProfile();
    setShowImageEditor(false);
  }, [refreshProfile]);

  const handleCoverUpload = useCallback(async (url) => {
    console.log('✅ Cover updated to:', url);
    await refreshProfile();
    setShowImageEditor(false);
  }, [refreshProfile]);

  const handleQuickUploadOpen = useCallback(() => {
    setShowQuickUpload(true);
  }, []);

  const handleQuickUploadSuccess = useCallback(async () => {
    await Promise.all([refreshPhotos(), refreshProfile()]);
    console.log('✅ Photos uploaded successfully');
  }, [refreshPhotos, refreshProfile]);

  const handleVideoAction = useCallback(async (action, video) => {
    try {
      switch (action) {
        case 'like':
          console.log('Like video:', video.id);
          break;
        case 'edit':
          window.location.href = `/video-edit/${video.id}`;
          break;
        case 'delete':
          if (window.confirm('¿Estás seguro de que quieres eliminar este video?')) {
            const { error } = await supabase
              .from('videos')
              .delete()
              .eq('id', video.id);
            
            if (!error) {
              await Promise.all([refreshVideos(), refreshReels()]);
            }
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error with video action:', error);
    }
  }, [refreshVideos, refreshReels]);

  const handleReelAction = useCallback(async (action, reel) => {
    try {
      switch (action) {
        case 'like':
          console.log('Like reel:', reel.id);
          break;
        case 'edit':
          window.location.href = `/video-edit/${reel.id}`;
          break;
        case 'delete':
          if (window.confirm('¿Estás seguro de que quieres eliminar este reel?')) {
            const { error } = await supabase
              .from('videos')
              .delete()
              .eq('id', reel.id);
            
            if (!error) {
              await Promise.all([refreshVideos(), refreshReels()]);
            }
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error with reel action:', error);
    }
  }, [refreshVideos, refreshReels]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    window.location.href = '/';
  }, [signOut]);

  // Verificar autenticación
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated]);

  // ===============================
  // RENDER FUNCTIONS
  // ===============================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'videos':
        // ... (omitted rendering logic)
        if (videosError) {
          return (
            <div className="text-center py-16">
              <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Error al cargar videos</h3>
              <p className="text-muted-foreground mb-4 text-sm font-mono bg-muted/50 px-4 py-2 rounded">
                {videosError}
              </p>
              <Button onClick={refreshVideos}>
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Reintentar
              </Button>
            </div>
          );
        }
        
        return (
          <VideoGridComponent
            videos={videos} 
            loading={videosLoading}
            onVideoAction={handleVideoAction}
            showActions={true}
            isOwner={true}
            onUploadClick={() => window.location.href = '/upload'}
            emptyMessage="No tienes videos horizontales aún"
            emptyDescription="Los videos en formato horizontal (16:9) que subas aparecerán aquí. Ideal para tutoriales, vlogs y contenido de escritorio."
          />
        );

      case 'reels':
        // ... (omitted rendering logic)
        if (reelsError) {
          return (
            <div className="text-center py-16">
              <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Error al cargar reels</h3>
              <p className="text-muted-foreground mb-4 text-sm font-mono bg-muted/50 px-4 py-2 rounded">
                {reelsError}
              </p>
              <Button onClick={refreshReels}>
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Reintentar
              </Button>
            </div>
          );
        }
        
        return (
          <ReelsGridComponent
            reels={reels} 
            loading={reelsLoading}
            onReelAction={handleReelAction}
            showActions={true}
            isOwner={true}
            onUploadClick={() => window.location.href = '/upload'}
            emptyMessage="No tienes reels aún"
            emptyDescription="Los videos en formato vertical (9:16) que subas aparecerán aquí. Ideal para contenido móvil, stories y videos virales."
          />
        );
      
      case 'photos':
        return (
          <PhotoGrid
            photos={photos}
            loading={photosLoading}
            onQuickUpload={handleQuickUploadOpen}
            onPhotoAction={handlePhotoAction} // PASAMOS EL HANDLER DE ACCIONES
            isOwner={true}
            fetchError={photosError} // Pasa el error para visualización
            onPhotoClick={handlePhotoClick} // Pasa el manejador de clic
          />
        );

      // 🚨 PESTAÑAS ELIMINADAS (Me Gusta y Listas)
      /*
      case 'liked':
        return ( // ...
        );
      case 'playlists':
        return ( // ...
        );
      */
      
      case 'purchases':
        return <PurchaseHistory purchases={purchases} />;

      case 'points':
        return (
          <PointsHistory 
            transactions={transactions}
            summary={summary}
            loading={pointsHistoryLoading}
          />
        );

      case 'settings':
        return (
          <SettingsPanel
            user={userData}
            loading={profileLoading}
            onUpdateSettings={handleUpdateSettings}
            onUploadAvatar={handleAvatarUpload}
            onUploadCover={handleCoverUpload}
            onSignOut={handleSignOut}
            editing={editingProfile}
            onCancelEdit={() => setEditingProfile(false)}
          />
        );

      default:
        return null;
    }
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  // Loading state
  if (!isAuthenticated || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Error al cargar perfil</h2>
          <p className="text-muted-foreground mb-6">{profileError}</p>
          <Button onClick={refreshProfile}>
            <Icon name="RefreshCw" size={16} className="mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // 🚨 COMPONENTE DE EDICIÓN DE FOTO (Inline para simplicidad)
  const PhotoEditModal = ({ photo, onClose, onSave }) => {
    // Usar valores iniciales de la foto
    const [caption, setCaption] = useState(photo.caption || '');
    // Usamos el valor real de la columna 'description'
    const [description, setDescription] = useState(photo.description || ''); 
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Validar si los datos realmente cambiaron antes de guardar (Opcional)
      if (caption === (photo.caption || '') && description === (photo.description || '')) {
        onClose();
        return;
      }
      
      setIsSaving(true);
      // Llamamos a la función de guardado con los estados actuales
      await onSave(photo.id, caption, description);
      // La función onSave se encarga de cerrar el modal y refrescar la lista.
    };

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg border max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Editar Metadatos de Foto</h2>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
              <Icon name="X" size={20} />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            {`Editando foto ID: ${photo.id.slice(0, 8)}...`}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Título/Caption */}
            <input
              type="text"
              placeholder="Título/Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full border p-2 rounded bg-input text-foreground"
              maxLength={150}
            />
            {/* Campo Descripción */}
            <textarea
              placeholder="Descripción (Opcional)"
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border p-2 rounded bg-input text-foreground"
              maxLength={500}
            />
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </form>
          
        </div>
      </div>
    );
  };


  return (
    <>
      <Helmet>
        <title>Mi Perfil - {userData?.name || 'Usuario'} | RADEISAN</title>
        <meta name="description" content={`Perfil de ${userData?.name || 'Usuario'}${userData?.bio ? ` - ${userData.bio}` : ''}. ${userData?.videosCount || 0} videos, ${userData?.reelsCount || 0} reels, ${userData?.photosCount || 0} fotos.`} />
        <meta name="keywords" content="perfil, usuario, configuración, contenido, videos, reels, fotos, RADEISAN" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-32 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Profile Header */}
            <div className="bg-card border border-border rounded-lg overflow-hidden mb-8 shadow-sm">
              {/* Cover Image Container */}
              <div className="relative">
                {/* Cover Image */}
                <div className="h-60 sm:h-72 md:h-80 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 overflow-hidden">
                  {userData?.coverImage ? (
                    <img 
                      src={userData.coverImage} 
                      alt="Portada del perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400" />
                  )}
                  
                  {/* Botón cambiar cover */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 border-0 shadow-md"
                    onClick={handleEditCover}
                  >
                    <Icon name="Camera" size={16} className="mr-2" />
                    Cambiar portada
                  </Button>
                </div>
              </div>

              {/* Profile Info Section */}
              <div className="px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
                  
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 -mt-20 mb-4 sm:mb-0">
                    <div className="w-40 h-40 rounded-full border-4 border-card bg-background overflow-hidden shadow-lg">
                      {userData?.avatar ? (
                        <img 
                          src={userData.avatar} 
                          alt={userData?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Icon name="User" size={60} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Botón cambiar avatar */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white hover:bg-gray-50 text-gray-800 border-0 shadow-md p-0"
                      onClick={handleEditAvatar}
                    >
                      <Icon name="Camera" size={20} />
                    </Button>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        {/* Nombre y username */}
                        <h1 className="text-3xl font-bold text-foreground mb-2 break-words">
                          {userData?.name}
                        </h1>
                        <div className="flex items-center space-x-3 mb-3">
                          <p className="text-muted-foreground">@{userData?.username}</p>
                          {userData?.isVerified && (
                            <Icon name="BadgeCheck" size={18} className="text-primary" />
                          )}
                          {userData?.isBusinessAccount && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              Negocio
                            </span>
                          )}
                        </div>

                        {/* Bio */}
                        {userData?.bio && (
                          <p className="text-foreground mb-4 max-w-2xl">
                            {userData.bio}
                          </p>
                        )}

                        {/* Información adicional */}
                        {(userData?.location || userData?.website) && (
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            {userData?.location && (
                              <div className="flex items-center space-x-1">
                                <Icon name="MapPin" size={14} />
                                <span>{userData.location}</span>
                              </div>
                            )}
                            {userData?.website && (
                              <div className="flex items-center space-x-1">
                                <Icon name="Link" size={14} />
                                <a 
                                  href={userData.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {userData.website.replace(/^https?:\/\//, '')}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex flex-wrap gap-6 text-sm mb-4">
                          <div className="flex items-center space-x-1">
                            <Icon name="Monitor" size={16} className="text-blue-600" />
                            <span className="font-semibold">{userData?.videosCount || 0}</span>
                            <span className="text-muted-foreground">videos</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Icon name="Smartphone" size={16} className="text-pink-600" />
                            <span className="font-semibold">{userData?.reelsCount || 0}</span>
                            <span className="text-muted-foreground">reels</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Icon name="Image" size={16} className="text-green-600" />
                            <span className="font-semibold">{userData?.photosCount || 0}</span>
                            <span className="text-muted-foreground">fotos</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Icon name="Eye" size={16} className="text-muted-foreground" />
                            <span className="font-semibold">{userData?.totalViews || 0}</span>
                            <span className="text-muted-foreground">views</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Icon name="Heart" size={16} className="text-red-500" />
                            <span className="font-semibold">{userData?.totalLikes || 0}</span>
                            <span className="text-muted-foreground">likes</span>
                          </div>
                        </div>

                        {/* Tarjeta de Balance de Puntos */}
                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-md">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                                Balance de Puntos
                              </p>
                              {pointsLoading ? (
                                <div className="h-8 w-32 bg-yellow-200/50 dark:bg-yellow-800/50 animate-pulse rounded" />
                              ) : (
                                <>
                                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                                    {totalPoints.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span className="text-green-600 dark:text-green-600 font-medium">
                                      {freePoints.toLocaleString()} gratis
                                    </span>
                                    {' + '}
                                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                                      {premiumPoints.toLocaleString()} premium
                                    </span>
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                                <Icon name="Star" size={32} className="text-white" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Link a tab de puntos */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-3 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                            onClick={() => setActiveTab('points')}
                          >
                            <Icon name="TrendingUp" size={14} className="mr-2" />
                            Ver historial de puntos
                          </Button>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center space-x-3 mt-6 sm:mt-0 flex-shrink-0">
                        <Button onClick={handleEditProfile}>
                          <Icon name="Edit" size={16} className="mr-2" />
                          Editar Perfil
                        </Button>
                        <Button variant="outline">
                          <Icon name="Crown" size={16} className="mr-2" />
                          Upgrade
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="mb-8">
              <div className="border-b border-border">
                <nav className="flex space-x-8 overflow-x-auto">
                  {[
                    { id: 'videos', label: 'Videos', icon: 'Monitor', count: tabCounts.videos, color: 'text-blue-600' },
                    { id: 'reels', label: 'Reels', icon: 'Smartphone', count: tabCounts.reels, color: 'text-pink-600' },
                    { id: 'photos', label: 'Fotos', icon: 'Image', count: tabCounts.photos, color: 'text-green-600' },
                    // 🚨 PESTAÑAS ELIMINADAS (Me Gusta y Listas)
                    /*{ id: 'liked', label: 'Me Gusta', icon: 'Heart', count: tabCounts.liked, color: 'text-red-500' },
                    { id: 'playlists', label: 'Listas', icon: 'List', count: tabCounts.playlists, color: 'text-purple-600' },*/
                    { id: 'purchases', label: 'Compras', icon: 'ShoppingBag', count: tabCounts.purchases, color: 'text-orange-600' },
                    { id: 'points', label: 'Puntos', icon: 'Star', count: null, color: 'text-yellow-600' },
                    { id: 'settings', label: 'Configuración', icon: 'Settings', count: null, color: 'text-gray-600' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        group relative flex items-center space-x-2 px-1 py-4 text-sm font-medium
                        border-b-2 transition-all duration-200 whitespace-nowrap
                        ${activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                        }
                      `}
                    >
                      <Icon 
                        name={tab.icon} 
                        size={16} 
                        className={activeTab === tab.id ? 'text-primary' : tab.color}
                      />
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className={`
                          px-2 py-1 rounded-full text-xs
                          ${activeTab === tab.id 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Photo Quick Upload Modal */}
      <PhotoQuickUpload
        isOpen={showQuickUpload}
        onClose={() => setShowQuickUpload(false)}
        onSuccess={handleQuickUploadSuccess}
      />

      {/* Profile Image Editor Modal */}
      {showImageEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              {/* Header del Modal */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Editar Imágenes de Perfil
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Cambia tu imagen de perfil o portada
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowImageEditor(false)}
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>

              {/* Profile Image Editor dentro del Modal */}
              <ProfileImageEditor
                currentAvatar={userData?.avatar}
                currentCover={userData?.coverImage}
                onAvatarChange={handleAvatarUpload}
                onCoverChange={handleCoverUpload}
                onClose={() => setShowImageEditor(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Debug Info - Solo en development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs font-mono max-w-xs z-50">
          <div className="space-y-1">
            <div>Videos H: {videos.length}</div>
            <div>Reels V: {reels.length}</div>
            <div>Fotos: {photos.length}</div>
            <div>Puntos: {totalPoints}</div>
            <div>Tab: {activeTab}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfileSettings;
