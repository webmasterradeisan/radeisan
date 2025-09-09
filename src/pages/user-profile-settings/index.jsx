// src/pages/user-profile-settings/index.jsx
// Página de perfil perfeccionada con todas las funcionalidades integradas
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
// HOOKS PERSONALIZADOS
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
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
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

// Hook para videos del usuario
const useUserVideos = (userId) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVideos = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

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
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setVideos(data || []);

    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos,
    loading,
    error,
    totalCount: videos.length,
    refresh: fetchVideos
  };
};

// Hook para fotos del usuario
const useUserPhotos = (userId) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPhotos = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

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

      if (fetchError) throw fetchError;
      setPhotos(data || []);

    } catch (err) {
      console.error('Error fetching photos:', err);
      setError(err.message);
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

// ===============================
// COMPONENTE DE GRID DE FOTOS
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
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="ImagePlus" size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isOwner ? 'Comparte tus primeras fotos' : 'No hay fotos publicadas'}
        </h3>
        <p className="text-muted-foreground mb-6">
          {isOwner 
            ? 'Sube fotos rápidamente y comparte tus mejores momentos'
            : 'Este usuario no ha compartido fotos aún'
          }
        </p>
        {isOwner && showUploadButton && (
          <div className="flex justify-center space-x-3">
            <Button onClick={onQuickUpload}>
              <Icon name="Zap" size={16} className="mr-2" />
              Subida Rápida
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/photo-upload'}
            >
              <Icon name="Settings" size={16} className="mr-2" />
              Studio Avanzado
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botón de subida cuando hay fotos */}
      {isOwner && showUploadButton && (
        <div className="flex justify-end space-x-2">
          <Button size="sm" onClick={onQuickUpload}>
            <Icon name="Plus" size={16} className="mr-2" />
            Subir Más
          </Button>
          <Button 
            size="sm"
            variant="outline" 
            onClick={() => window.location.href = '/photo-upload'}
          >
            <Icon name="Settings" size={16} className="mr-2" />
            Studio
          </Button>
        </div>
      )}

      {/* Grid de fotos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              <img
                src={photo.thumbnail_url || photo.image_url}
                alt={photo.caption || 'Foto'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </div>
            
            {/* Overlay con información */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-end">
              <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.caption && (
                  <p className="text-sm font-medium truncate">{photo.caption}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs opacity-75">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                  {photo.category && (
                    <span className="text-xs bg-black/50 px-2 py-1 rounded-full">
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
  const { user, isAuthenticated } = useAuth();
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
    loading: videosLoading,
    refresh: refreshVideos
  } = useUserVideos(user?.id);

  const {
    photos,
    loading: photosLoading,
    refresh: refreshPhotos
  } = useUserPhotos(user?.id);

  // Mock data para otros tabs
  const [purchases] = useState([]);
  const [transactions] = useState([]);

  // Calcular contadores para tabs
  const tabCounts = useMemo(() => ({
    videos: videos.length,
    photos: photos.length,
    purchases: purchases.length,
    points: transactions.length
  }), [videos.length, photos.length, purchases.length, transactions.length]);

  // Formatear datos del usuario para ProfileHeader
  const userData = useMemo(() => {
    if (!profileData) return null;

    return {
      id: profileData.id,
      name: profileData.full_name || profileData.username || 'Usuario',
      username: profileData.username || '',
      email: profileData.email || '',
      bio: profileData.bio || '',
      avatar: profileData.avatar_url,
      coverImage: profileData.cover_image_url,
      website: profileData.website || '',
      location: profileData.location || '',
      points: profileData.points || 0,
      isBusinessAccount: profileData.is_business_account || false,
      joinedAt: profileData.created_at,
      
      // Contadores
      videosCount: videos.length,
      photosCount: photos.length,
      followersCount: profileData.followers_count || 0,
      followingCount: profileData.following_count || 0,
      
      // Stats calculadas
      totalViews: videos.reduce((acc, video) => acc + (video.views || 0), 0),
      totalLikes: videos.reduce((acc, video) => acc + (video.likes || 0), 0) + 
                  photos.reduce((acc, photo) => acc + (photo.likes || 0), 0),
    };
  }, [profileData, videos, photos]);

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
        console.log('Profile updated successfully');
      } else {
        console.error('Failed to update profile:', result?.error);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [updateProfile, refreshProfile]);

  const handleAvatarUpload = useCallback(async (url) => {
    if (url) {
      await refreshProfile();
      console.log('Avatar updated, profile refreshed');
    }
  }, [refreshProfile]);

  const handleCoverUpload = useCallback(async (url) => {
    if (url) {
      await refreshProfile();
      console.log('Cover updated, profile refreshed');
    }
  }, [refreshProfile]);

  const handleQuickUploadOpen = useCallback(() => {
    setShowQuickUpload(true);
  }, []);

  const handleQuickUploadSuccess = useCallback(async () => {
    await Promise.all([refreshPhotos(), refreshProfile()]);
    console.log('Photos uploaded successfully');
  }, [refreshPhotos, refreshProfile]);

  const handleVideoAction = useCallback(async (action, video, data = {}) => {
    try {
      switch (action) {
        case 'like':
          // Implementar like/unlike
          console.log('Like video:', video.id);
          break;
        case 'edit':
          // Navegar a editor
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

  // Verificar autenticación
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated]);

  // ===============================
  // RENDER
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
        <div className="text-center">
          <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Error al cargar perfil</h2>
          <p className="text-muted-foreground mb-4">{profileError}</p>
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
        <meta name="description" content="Gestiona tu perfil, contenido y configuración en RADEISAN" />
        <meta name="keywords" content="perfil, usuario, configuración, contenido, videos, fotos" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Profile Header */}
            <ProfileHeader 
              user={userData}
              loading={false}
              onEditProfile={handleEditProfile}
              onUpgradeAccount={() => window.location.href = '/business'}
              onUploadAvatar={handleAvatarUpload}
              onUploadCover={handleCoverUpload}
              stats={{
                videos: videos.length,
                photos: photos.length,
                views: userData?.totalViews || 0,
                likes: userData?.totalLikes || 0,
                followers: userData?.followersCount || 0,
                following: userData?.followingCount || 0
              }}
            />

            {/* Profile Tabs - SIN SCROLL HORIZONTAL */}
            <div className="bg-card border-b border-border sticky top-16 z-20 mb-8">
              <ProfileTabs 
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabCounts={tabCounts}
                user={userData}
                showPhotosTab={true}
              />
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'videos' && (
                <VideoGrid
                  videos={videos}
                  loading={videosLoading}
                  onVideoAction={handleVideoAction}
                  showActions={true}
                  isOwner={true}
                  onUploadClick={() => window.location.href = '/video-upload'}
                />
              )}

              {activeTab === 'photos' && (
                <PhotoGrid
                  photos={photos}
                  loading={photosLoading}
                  onQuickUpload={handleQuickUploadOpen}
                  isOwner={true}
                />
              )}

              {activeTab === 'liked' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Videos que te gustaron</h3>
                    <VideoGrid 
                      videos={[]} // TODO: Implementar videos liked
                      loading={false}
                      emptyMessage="No has dado like a ningún video aún"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Fotos que te gustaron</h3>
                    <PhotoGrid
                      photos={[]} // TODO: Implementar fotos liked
                      loading={false}
                      showUploadButton={false}
                      isOwner={false}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'playlists' && (
                <div className="text-center py-12">
                  <Icon name="List" size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No has creado listas aún</h3>
                  <p className="text-muted-foreground mb-6">Organiza tus videos favoritos en listas de reproducción</p>
                  <Button variant="outline">
                    <Icon name="Plus" size={16} className="mr-2" />
                    Crear primera lista
                  </Button>
                </div>
              )}

              {activeTab === 'purchases' && (
                <PurchaseHistory purchases={purchases} />
              )}

              {activeTab === 'points' && (
                <PointsHistory 
                  transactions={transactions}
                  summary={{
                    total: userData?.points || 0,
                    pending: 0,
                    redeemed: 0
                  }}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsPanel
                  user={userData}
                  loading={false}
                  onUpdateSettings={handleUpdateSettings}
                  onUploadAvatar={handleAvatarUpload}
                  onUploadCover={handleCoverUpload}
                  editing={editingProfile}
                  onCancelEdit={() => setEditingProfile(false)}
                />
              )}
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
