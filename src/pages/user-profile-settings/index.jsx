// src/pages/user-profile-settings/index.jsx
// UserProfileSettings con integración completa y problemas corregidos
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import ProfileHeader from './components/ProfileHeader';
import ProfileTabs from './components/ProfileTabs';
import VideoGrid from './components/VideoGrid';
import PointsHistory from './components/PointsHistory';
import SettingsPanel from './components/SettingsPanel';
import PurchaseHistory from './components/PurchaseHistory';
import PhotoQuickUpload from '../../components/PhotoQuickUpload';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// ===============================
// HOOKS PERSONALIZADOS CORREGIDOS
// ===============================

// Hook para datos del perfil del usuario
const useUserProfile = () => {
  const { user, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState(null);

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
          // Crear perfil si no existe
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
    uploading,
    coverUploading,
    coverError,
    refreshProfile,
    updateProfile
  };
};

// Hook para videos del usuario - CORREGIDO
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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🎬 Cargando videos para usuario:', userId);

      const { data, error: fetchError } = await supabase
        .from('videos')
        .select(`
          *,
          user_profiles!videos_user_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error cargando videos:', fetchError);
        throw fetchError;
      }

      console.log('✅ Videos cargados:', data?.length || 0);
      setVideos(data || []);

      // Calcular estadísticas
      const videoStats = (data || []).reduce(
        (acc, video) => ({
          totalVideos: acc.totalVideos + 1,
          totalViews: acc.totalViews + (video.views || 0),
          totalLikes: acc.totalLikes + (video.likes || 0),
          totalComments: acc.totalComments + (video.comments_count || 0)
        }),
        { totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0 }
      );

      setStats(videoStats);

    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message);
      setVideos([]);
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

// Hook para fotos del usuario - CORREGIDO
const useUserPhotos = (userId) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPhotos = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📸 Cargando fotos para usuario:', userId);

      const { data, error: fetchError } = await supabase
        .from('photos')
        .select(`
          *,
          user_profiles!photos_user_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error cargando fotos:', fetchError);
        throw fetchError;
      }

      console.log('✅ Fotos cargadas:', data?.length || 0);
      setPhotos(data || []);

    } catch (err) {
      console.error('Error fetching photos:', err);
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

// Hook para historial de puntos - MOCK SIMPLIFICADO
const usePointsHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    currentBalance: 0,
    totalEarned: 0,
    totalSpent: 0
  });

  return {
    transactions,
    summary,
    loading: false,
    error: null
  };
};

// Hook para compras - MOCK SIMPLIFICADO
const usePurchaseHistory = () => {
  const [purchases, setPurchases] = useState([]);
  
  return {
    purchases,
    loading: false,
    error: null
  };
};

// ===============================
// COMPONENTE DE GRID DE FOTOS MEJORADO
// ===============================

const PhotoGrid = ({ 
  photos = [], 
  loading = false, 
  onQuickUpload,
  isOwner = false,
  showUploadButton = true 
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
            <Button onClick={onQuickUpload} size="lg">
              <Icon name="Zap" size={20} className="mr-2" />
              Subida Rápida
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => window.location.href = '/photo-upload'}
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
      {/* Botón de subida cuando hay fotos */}
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

      {/* Grid de fotos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square">
            <div className="w-full h-full bg-muted rounded-lg overflow-hidden">
              <img
                src={photo.thumbnail_url || photo.image_url}
                alt={photo.caption || 'Foto'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            
            {/* Overlay con información */}
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

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const UserProfileSettings = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('videos');
  const [editingProfile, setEditingProfile] = useState(false);
  const [showQuickUpload, setShowQuickUpload] = useState(false);

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
    stats,
    loading: videosLoading,
    refresh: refreshVideos
  } = useUserVideos(user?.id);

  const {
    photos,
    loading: photosLoading,
    refresh: refreshPhotos
  } = useUserPhotos(user?.id);

  const { transactions, summary } = usePointsHistory();
  const { purchases } = usePurchaseHistory();

  // Formatear datos del usuario para ProfileHeader
  const userData = useMemo(() => {
    if (!profileData) return null;

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
      points: profileData.points || 0,
      isBusinessAccount: profileData.is_business_account || false,
      isVerified: profileData.is_verified || false,
      joinedAt: profileData.created_at,
      
      // Contadores
      videosCount: videos.length,
      photosCount: photos.length,
      followersCount: profileData.followers_count || 0,
      followingCount: profileData.following_count || 0,
      
      // Stats calculadas
      totalViews: stats.totalViews,
      totalLikes: stats.totalLikes + photos.reduce((acc, photo) => acc + (photo.likes || 0), 0),
      totalComments: stats.totalComments,
      
      // Para mostrar estadísticas
      achievements: [] // TODO: Implementar sistema de logros
    };
  }, [profileData, videos, photos, stats]);

  // Calcular contadores para tabs
  const tabCounts = useMemo(() => ({
    videos: videos.length,
    photos: photos.length,
    purchases: purchases.length,
    points: transactions.length,
    liked: 0, // TODO: Implementar
    playlists: 0 // TODO: Implementar
  }), [videos.length, photos.length, purchases.length, transactions.length]);

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

  const handleAvatarUpload = useCallback(async (url) => {
    if (url) {
      await refreshProfile();
      console.log('✅ Avatar updated, profile refreshed');
    }
  }, [refreshProfile]);

  const handleCoverUpload = useCallback(async (url) => {
    if (url) {
      await refreshProfile();
      console.log('✅ Cover updated, profile refreshed');
    }
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
              await refreshVideos();
            }
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error with video action:', error);
    }
  }, [refreshVideos]);

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
        return (
          <VideoGrid 
            videos={videos} 
            loading={videosLoading}
            onVideoAction={handleVideoAction}
            showActions={true}
            isOwner={true}
            onUploadClick={() => window.location.href = '/video-upload'}
          />
        );
      
      case 'photos':
        return (
          <PhotoGrid
            photos={photos}
            loading={photosLoading}
            onQuickUpload={handleQuickUploadOpen}
            isOwner={true}
          />
        );

      case 'liked':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Videos que te gustaron</h3>
              <div className="text-center py-8">
                <Icon name="Heart" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No has dado like a ningún video aún</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Fotos que te gustaron</h3>
              <div className="text-center py-8">
                <Icon name="Heart" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No has dado like a ninguna foto aún</p>
              </div>
            </div>
          </div>
        );

      case 'playlists':
        return (
          <div className="text-center py-16">
            <Icon name="List" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-3">No has creado listas aún</h3>
            <p className="text-muted-foreground mb-6">Organiza tus videos favoritos en listas de reproducción</p>
            <Button variant="outline">
              <Icon name="Plus" size={16} className="mr-2" />
              Crear primera lista
            </Button>
          </div>
        );

      case 'purchases':
        return <PurchaseHistory purchases={purchases} />;

      case 'points':
        return (
          <PointsHistory 
            transactions={transactions}
            summary={summary}
            loading={false}
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

  return (
    <>
      <Helmet>
        <title>Mi Perfil - {userData?.name || 'Usuario'} | RADEISAN</title>
        <meta name="description" content={`Perfil de ${userData?.name || 'Usuario'}${userData?.bio ? ` - ${userData.bio}` : ''}. ${userData?.videosCount || 0} videos, ${userData?.photosCount || 0} fotos.`} />
        <meta name="keywords" content="perfil, usuario, configuración, contenido, videos, fotos, RADEISAN" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Profile Header - CORREGIDO: Cover image más alta y nombre sin cortar */}
            <div className="bg-card border-b border-border mb-8">
              {/* Cover Image - ASPECT RATIO CORREGIDO */}
              <div className="relative h-48 sm:h-64 md:h-72 bg-gradient-to-r from-primary/20 to-secondary/20 overflow-hidden">
                {userData?.coverImage ? (
                  <img 
                    src={userData.coverImage} 
                    alt="Portada del perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
                )}
                
                {/* Botón de cambiar cover */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm text-white hover:bg-black/30"
                  onClick={() => {/* TODO: Implementar cambio de cover */}}
                >
                  <Icon name="Camera" size={16} className="mr-2" />
                  Cambiar portada
                </Button>
              </div>

              {/* Profile Info - LAYOUT MEJORADO PARA EVITAR CORTE DEL NOMBRE */}
              <div className="px-4 sm:px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20">
                  {/* Avatar and Basic Info */}
                  <div className="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-card bg-muted overflow-hidden">
                        {userData?.avatar ? (
                          <img 
                            src={userData.avatar} 
                            alt={userData?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon name="User" size={48} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {/* TODO: Implementar cambio de avatar */}}
                      >
                        <Icon name="Camera" size={14} />
                      </Button>
                    </div>

                    {/* User Info - SIN RESTRICCIÓN DE ANCHO PARA EVITAR CORTE */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-3">
                        <div className="min-w-0 flex-1">
                          <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
                            {userData?.name}
                          </h1>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-muted-foreground">@{userData?.username}</p>
                            {userData?.isVerified && (
                              <Icon name="BadgeCheck" size={16} className="text-primary" />
                            )}
                            {userData?.isBusinessAccount && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                Negocio
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      {userData?.bio && (
                        <p className="text-foreground mb-3 max-w-lg break-words">
                          {userData.bio}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Icon name="Video" size={14} className="text-muted-foreground" />
                          <span className="font-medium">{userData?.videosCount || 0}</span>
                          <span className="text-muted-foreground">videos</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icon name="Image" size={14} className="text-muted-foreground" />
                          <span className="font-medium">{userData?.photosCount || 0}</span>
                          <span className="text-muted-foreground">fotos</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icon name="Eye" size={14} className="text-muted-foreground" />
                          <span className="font-medium">{userData?.totalViews || 0}</span>
                          <span className="text-muted-foreground">views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icon name="Heart" size={14} className="text-muted-foreground" />
                          <span className="font-medium">{userData?.totalLikes || 0}</span>
                          <span className="text-muted-foreground">likes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 mt-4 sm:mt-0 flex-shrink-0">
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

            {/* Profile Tabs - SIN SCROLL HORIZONTAL */}
            <div className="mb-8">
              <div className="border-b border-border">
                <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'videos', label: 'Videos', icon: 'Video', count: tabCounts.videos },
                    { id: 'photos', label: 'Fotos', icon: 'Image', count: tabCounts.photos },
                    { id: 'liked', label: 'Me Gusta', icon: 'Heart', count: tabCounts.liked },
                    { id: 'playlists', label: 'Listas', icon: 'List', count: tabCounts.playlists },
                    { id: 'purchases', label: 'Compras', icon: 'ShoppingBag', count: tabCounts.purchases },
                    { id: 'points', label: 'Puntos', icon: 'Star', count: null },
                    { id: 'settings', label: 'Configuración', icon: 'Settings', count: null }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        group relative flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                        border-b-2 transition-all duration-200 flex-shrink-0
                        ${activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                        }
                      `}
                    >
                      <Icon name={tab.icon} size={16} />
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className={`
                          ml-2 px-2 py-1 rounded-full text-xs
                          ${activeTab === tab.id 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/10'
                          }
                        `}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Quick Upload Modal */}
      <PhotoQuickUpload
        isOpen={showQuickUpload}
        onClose={() => setShowQuickUpload(false)}
        onSuccess={handleQuickUploadSuccess}
      />
    </>
  );
};

export default UserProfileSettings;
