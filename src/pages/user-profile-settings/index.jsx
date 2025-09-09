// src/pages/user-profile-settings/index.jsx
// UserProfileSettings - VERSIÓN COMPLETAMENTE LIMPIA con nombres correctos de columnas
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import ProfileTabs from './components/ProfileTabs';
import PointsHistory from './components/PointsHistory';
import SettingsPanel from './components/SettingsPanel';
import PurchaseHistory from './components/PurchaseHistory';
import PhotoQuickUpload from '../../components/PhotoQuickUpload';
import ProfileImageEditor from '../../components/ProfileImageEditor';
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

// Hook para videos del usuario - COMPLETAMENTE LIMPIO CON NOMBRES CORRECTOS
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

      console.log('🎬 Fetching videos for user ID:', userId);

      // CONSULTA CON NOMBRES EXACTOS DE LA BASE DE DATOS
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
          likes_count,
          comments_count,
          points_earned,
          is_published,
          featured_until,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('❌ Error fetching videos:', fetchError);
        throw fetchError;
      }

      console.log('✅ Raw videos data from DB:', {
        count: data?.length || 0,
        sample: data?.[0] ? {
          id: data[0].id,
          title: data[0].title,
          views_count: data[0].views_count,
          likes_count: data[0].likes_count,
          duration_seconds: data[0].duration_seconds
        } : null
      });

      const videoData = data || [];
      setVideos(videoData);

      // Calcular estadísticas usando los nombres correctos de columnas
      const videoStats = videoData.reduce(
        (acc, video) => ({
          totalVideos: acc.totalVideos + 1,
          totalViews: acc.totalViews + (video.views_count || 0),
          totalLikes: acc.totalLikes + (video.likes_count || 0),
          totalComments: acc.totalComments + (video.comments_count || 0)
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

// Hook para fotos del usuario
const useUserPhotos = (userId) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPhotos = useCallback(async () => {
    if (!userId) {
      console.log('📸 No userId provided, skipping photos fetch');
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
          likes,
          comments_count,
          aspect_ratio,
          file_size,
          created_at,
          user_id
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('❌ Error fetching photos:', fetchError);
        throw fetchError;
      }

      console.log('✅ Photos fetched successfully:', data?.length || 0);
      setPhotos(data || []);

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

// Hook para historial de puntos - MOCK
const usePointsHistory = () => {
  const [transactions] = useState([]);
  const [summary] = useState({
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
          <div key={photo.id} className="group relative aspect-square">
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

// ===============================
// COMPONENTE DE VIDEO GRID - CON NOMBRES CORRECTOS DE COLUMNAS
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
      likes: videos[0].likes_count,
      duration: videos[0].duration_seconds
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
          <Icon name="Video" size={32} className="text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">{emptyMessage}</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">{emptyDescription}</p>
        {isOwner && onUploadClick && (
          <Button onClick={onUploadClick} size="lg">
            <Icon name="Plus" size={20} className="mr-2" />
            Subir tu primer video
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
            onClick={() => console.log('Click en video:', video.id)}
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

              {/* Duration usando duration_seconds */}
              {video.duration_seconds && video.duration_seconds > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
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
                {video.likes_count !== null && video.likes_count !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Icon name="Heart" size={14} />
                    <span>{video.likes_count}</span>
                  </div>
                )}
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
// COMPONENTE PRINCIPAL
// ===============================

const UserProfileSettings = () => {
  const { user, isAuthenticated, signOut } = useAuth();
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
    stats,
    loading: videosLoading,
    error: videosError,
    refresh: refreshVideos
  } = useUserVideos(user?.id);

  const {
    photos,
    loading: photosLoading,
    refresh: refreshPhotos
  } = useUserPhotos(user?.id);

  const { transactions, summary } = usePointsHistory();
  const { purchases } = usePurchaseHistory();

  // Formatear datos del usuario
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
      
      achievements: []
    };
  }, [profileData, videos, photos, stats]);

  // Calcular contadores para tabs
  const tabCounts = useMemo(() => ({
    videos: videos.length,
    photos: photos.length,
    purchases: purchases.length,
    points: transactions.length,
    liked: 0,
    playlists: 0
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
        console.log('🎬 Rendering videos tab with:', { 
          videosCount: videos.length, 
          loading: videosLoading,
          error: videosError,
          hasData: videos.length > 0,
          sampleVideo: videos[0]
        });
        
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
            emptyMessage="No tienes videos aún"
            emptyDescription="Los videos que subas aparecerán aquí. ¡Comienza a crear contenido!"
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
                        <div className="flex flex-wrap gap-6 text-sm">
                          <div className="flex items-center space-x-1">
                            <Icon name="Video" size={16} className="text-muted-foreground" />
                            <span className="font-semibold">{userData?.videosCount || 0}</span>
                            <span className="text-muted-foreground">videos</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Icon name="Image" size={16} className="text-muted-foreground" />
                            <span className="font-semibold">{userData?.photosCount || 0}</span>
                            <span className="text-muted-foreground">fotos</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Icon name="Eye" size={16} className="text-muted-foreground" />
                            <span className="font-semibold">{userData?.totalViews || 0}</span>
                            <span className="text-muted-foreground">views</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Icon name="Heart" size={16} className="text-muted-foreground" />
                            <span className="font-semibold">{userData?.totalLikes || 0}</span>
                            <span className="text-muted-foreground">likes</span>
                          </div>
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
                <nav className="flex space-x-8">
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
                        group relative flex items-center space-x-2 px-1 py-4 text-sm font-medium
                        border-b-2 transition-all duration-200 whitespace-nowrap
                        ${activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                        }
                      `}
                    >
                      <Icon name={tab.icon} size={16} />
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
    </>
  );
};

export default UserProfileSettings;
