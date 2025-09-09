// src/pages/user-profile-settings/index.jsx
// UserProfileSettings con PhotoQuickUpload integrado para UX simple
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
import PhotoQuickUpload from '../../components/PhotoQuickUpload'; // NUEVO: Sistema simple
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// ===============================
// PHOTO GRID CON QUICK UPLOAD
// ===============================

const PhotoGrid = ({ 
  photos = [], 
  loading = false, 
  onQuickUpload, // Cambio: usar modal en lugar de navegación
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
      {/* Botón de subida rápida cuando hay fotos */}
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
              />
            </div>
            
            {/* Overlay con info */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-end">
              <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.caption && (
                  <p className="text-sm font-medium truncate">{photo.caption}</p>
                )}
                <p className="text-xs opacity-75">
                  {new Date(photo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===============================
// HOOK PARA FOTOS DE USUARIO
// ===============================

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
        .select('*')
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
// HOOK PARA PERFIL DE USUARIO
// ===============================

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

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const UserProfileSettings = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('videos');
  const [editingProfile, setEditingProfile] = useState(false);
  
  // NUEVO: Estado para Quick Upload
  const [showQuickUpload, setShowQuickUpload] = useState(false);

  // Hooks de datos
  const {
    profileData,
    loading: profileLoading,
    error: profileError,
    refreshProfile
  } = useUserProfile();

  const {
    photos,
    loading: photosLoading,
    totalCount: photosCount,
    refresh: refreshPhotos
  } = useUserPhotos(user?.id);

  // Datos simulados para otros tabs
  const [videos] = useState([]);
  const [purchases] = useState([]);
  const [transactions] = useState([]);

  // Calcular contadores para tabs
  const tabCounts = useMemo(() => ({
    videos: videos.length,
    photos: photosCount,
    purchases: purchases.length,
    points: transactions.length
  }), [videos.length, photosCount, purchases.length, transactions.length]);

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
      if (result.success) {
        setEditingProfile(false);
        console.log('Profile updated successfully');
      } else {
        console.error('Failed to update profile:', result.error);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, []);

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

  // NUEVO: Handlers para Quick Upload
  const handleQuickUploadOpen = useCallback(() => {
    setShowQuickUpload(true);
  }, []);

  const handleQuickUploadSuccess = useCallback(async () => {
    // Refrescar fotos y perfil
    await Promise.all([refreshPhotos(), refreshProfile()]);
    console.log('Photos uploaded successfully');
  }, [refreshPhotos, refreshProfile]);

  // Verificar autenticación
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated]);

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
        <title>Mi Perfil - {profileData?.full_name || 'Usuario'} | RADEISAN</title>
        <meta name="description" content="Gestiona tu perfil, contenido y configuración en RADEISAN" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Profile Header */}
            <ProfileHeader 
              user={profileData}
              isOwner={true}
              onEditProfile={handleEditProfile}
              onAvatarChange={handleAvatarUpload}
              onCoverChange={handleCoverUpload}
            />

            {/* Profile Tabs */}
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
            />

            {/* Tab Content */}
            <div className="mt-8">
              {activeTab === 'videos' && (
                <VideoGrid
                  videos={videos}
                  loading={false}
                  onUploadClick={() => window.location.href = '/video-upload'}
                  isOwner={true}
                />
              )}

              {activeTab === 'photos' && (
                <PhotoGrid
                  photos={photos}
                  loading={photosLoading}
                  onQuickUpload={handleQuickUploadOpen} // CAMBIO: usar modal
                  isOwner={true}
                />
              )}

              {activeTab === 'purchases' && (
                <PurchaseHistory purchases={purchases} />
              )}

              {activeTab === 'points' && (
                <PointsHistory transactions={transactions} />
              )}

              {activeTab === 'settings' && (
                <SettingsPanel
                  user={profileData}
                  isEditing={editingProfile}
                  onSave={handleUpdateSettings}
                  onCancel={() => setEditingProfile(false)}
                  onAvatarChange={handleAvatarUpload}
                  onCoverChange={handleCoverUpload}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* NUEVO: Quick Upload Modal */}
      <PhotoQuickUpload
        isOpen={showQuickUpload}
        onClose={() => setShowQuickUpload(false)}
        onSuccess={handleQuickUploadSuccess}
      />
    </>
  );
};

export default UserProfileSettings;
