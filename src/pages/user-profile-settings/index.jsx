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
      console.log('📸 DIAGNÓSTICO FOTOS: No userId proporcionado al hook.');
      setPhotos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📸 DIAGNÓSTICO FOTOS: Fetching photos for user ID:', userId);

      // Eliminadas las referencias a 'likes', 'comments_count' y 'file_size'
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
          user_id
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('❌ DIAGNÓSTICO FOTOS: Error al obtener fotos:', fetchError);
        setError(`Error de Supabase: ${fetchError.message}`);
        setPhotos([]);
      } else {
        console.log(`✅ DIAGNÓSTICO FOTOS: Fotos obtenidas exitosamente. Cantidad: ${data?.length || 0}`);
        setPhotos(data || []);
      }

    } catch (err) {
      console.error('💥 DIAGNÓSTICO FOTOS: Error inesperado en fetchPhotos:', err);
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
          <Button onClick={onQuickUpload}>
            <Icon name="Plus" size={16} className="mr-2" />
            Subir Más
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/photo-upload'}
          >
            <Icon name="Settings" size={16} className="mr-2" />
            Studio
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ... (omitted VideoGridComponent, ReelsGridComponent, etc.)

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

  // 🚨 ESTADOS PARA EL MODAL DE DETALLE DE FOTO
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  // Usamos el índice para facilitar la navegación del carrusel
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null); 

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

  // 🚨 OBTENER LOS DATOS COMPLETOS DE LA FOTO SELECCIONADA
  const currentPhotoData = useMemo(() => {
    if (selectedPhotoIndex === null || !photos || selectedPhotoIndex >= photos.length) return null;
    return photos[selectedPhotoIndex];
  }, [selectedPhotoIndex, photos]);

  // Formatear datos del usuario
  const userData = useMemo(() => {
    if (!profileData) return null;

    const totalViews = (videoStats.totalViews || 0) + (reelStats.totalViews || 0);
    // Asignamos 0 a likes/comments de fotos ya que no tienen columna en la tabla `photos`
    const totalLikes = 0; 
    const totalComments = 0;

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
    liked: 0,
    playlists: 0
  }), [videos.length, reels.length, photos.length, purchases.length, transactions.length]);

  // ===============================
  // EVENT HANDLERS
  // ===============================

  // MANEJADOR DE CLIC DE FOTO
  const handlePhotoClick = useCallback((photoId) => {
    const index = photos.findIndex(p => p.id === photoId);
    if (index !== -1) {
        setSelectedPhotoIndex(index);
        setShowPhotoModal(true);
    }
  }, [photos]);
  
  const handleClosePhotoModal = useCallback(() => {
    setShowPhotoModal(false);
    setSelectedPhotoIndex(null);
    refreshProfile(); 
  }, [refreshProfile]);

  // 🚨 MANEJADOR DE NAVEGACIÓN ENTRE FOTOS
  const handleNavigatePhoto = useCallback((direction) => {
    if (photos.length === 0 || selectedPhotoIndex === null) return;

    let newIndex = selectedPhotoIndex;
    if (direction === 'next' && newIndex < photos.length - 1) {
        newIndex += 1;
    } else if (direction === 'prev' && newIndex > 0) {
        newIndex -= 1;
    } else {
        return; // No hay más fotos
    }
    setSelectedPhotoIndex(newIndex);
  }, [photos, selectedPhotoIndex]);


  // [Resto de event handlers sin cambios funcionales]
  
  const handleEditProfile = useCallback(() => {
    setActiveTab('settings');
    setEditingProfile(true);
  }, []);
  // ... (otros handlers omitidos para brevedad)

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
      // ... (código para videos)
      case 'reels':
      // ... (código para reels)
      case 'photos':
        return (
          <PhotoGrid
            photos={photos}
            loading={photosLoading}
            onQuickUpload={handleQuickUploadOpen}
            isOwner={true}
            fetchError={photosError} // Pasa el error para visualización
            onPhotoClick={handlePhotoClick} // Pasa el manejador de clic
          />
        );
      case 'liked':
      // ... (código para liked)
      case 'playlists':
      // ... (código para playlists)
      case 'purchases':
      // ... (código para purchases)
      case 'points':
      // ... (código para points)
      case 'settings':
      // ... (código para settings)
      default:
        return null;
    }
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  // ... (código de loading y error state omitido para brevedad)

  return (
    <>
      <Helmet>
        <title>Mi Perfil - {userData?.name || 'Usuario'} | RADEISAN</title>
        {/* ... (meta tags omitidas) */}
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-32 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Profile Header (omitido) */}
            
            {/* Profile Tabs (omitido) */}
            
            {/* Tab Content */}
            <div className="min-h-[500px]">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Photo Quick Upload Modal (omitido) */}
      <PhotoQuickUpload
        isOpen={showQuickUpload}
        onClose={() => setShowQuickUpload(false)}
        onSuccess={handleQuickUploadSuccess}
      />

      {/* Profile Image Editor Modal (omitido) */}
      {/* ... */}

      {/* 🚨 MODAL DE DETALLE DE FOTO */}
      {showPhotoModal && currentPhotoData && (
          <PhotoDetailModal
              photos={photos} // Array completo para navegación
              currentPhotoIndex={selectedPhotoIndex} // Índice actual
              photoData={currentPhotoData} // Objeto de datos de la foto actual
              onClose={handleClosePhotoModal}
              onNavigate={handleNavigatePhoto} // Manjeador de navegación
              refreshParentData={refreshProfile}
              totalPhotos={photos.length}
          />
      )}
      
      {/* Debug Info (omitido) */}
      {/* ... */}
    </>
  );
};

export default UserProfileSettings;
