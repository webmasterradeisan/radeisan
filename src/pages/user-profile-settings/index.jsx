// src/pages/user-profile-settings/index.jsx
// UserProfileSettings con integración real de Supabase + Sistema de Fotos
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
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// ===============================
// HOOKS PERSONALIZADOS
// ===============================

// Hook para manejar datos del perfil de usuario + Sistema de Fotos
const useUserProfile = () => {
  const { user, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // 🆕 Estados específicos para cover image
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState(null);

  // Obtener datos completos del perfil
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
        // Si el perfil no existe, crearlo
        if (fetchError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              username: generateUsername(user.email),
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url,
              cover_image_url: null, // 🆕 Inicializar cover image
              photos_count: 0,       // 🆕 Inicializar contador de fotos
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
  }, [user?.id, user?.email, user?.user_metadata]);

  // Actualizar perfil
  const updateUserProfile = useCallback(async (updates) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfileData(data);
      return { success: true, data };

    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Upload de avatar (MANTENER EXACTAMENTE IGUAL)
  const uploadAvatar = useCallback(async (file) => {
    if (!user?.id || !file) return { success: false, error: 'Invalid parameters' };

    try {
      setUploading(true);
      
      // Validar archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB max
        throw new Error('La imagen debe ser menor a 5MB');
      }

      // Generar nombre único
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExtension}`;

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Actualizar perfil con nueva URL
      const result = await updateUserProfile({ avatar_url: urlData.publicUrl });
      
      return { success: true, url: urlData.publicUrl };

    } catch (err) {
      console.error('Error uploading avatar:', err);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  }, [user?.id, updateUserProfile]);

  // 🆕 Upload de cover image
  const uploadCover = useCallback(async (file) => {
    if (!user?.id || !file) return { success: false, error: 'Invalid parameters' };

    try {
      setCoverUploading(true);
      setCoverError(null);
      
      // Validar archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB max para covers (mayor que avatars)
        throw new Error('La imagen debe ser menor a 10MB');
      }

      // Generar nombre único para cover
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.id}/cover_${Date.now()}.${fileExtension}`;

      // Subir a Supabase Storage - bucket 'covers'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('covers')
        .getPublicUrl(fileName);

      // Actualizar perfil con nueva cover URL
      const result = await updateUserProfile({ cover_image_url: urlData.publicUrl });
      
      return { success: true, url: urlData.publicUrl };

    } catch (err) {
      console.error('Error uploading cover:', err);
      setCoverError(err.message);
      return { success: false, error: err.message };
    } finally {
      setCoverUploading(false);
    }
  }, [user?.id, updateUserProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profileData,
    loading,
    error,
    uploading,
    updateProfile: updateUserProfile,
    uploadAvatar,
    refreshProfile: fetchProfile,
    
    // 🆕 Cover image functionality
    coverUploading,
    coverError,
    uploadCover
  };
};

// Hook para videos del usuario (MANTENER EXACTAMENTE IGUAL)
const useUserVideos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0
  });

  const fetchUserVideos = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedVideos = data?.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail_url || '/default-thumbnail.jpg',
        videoUrl: video.video_url,
        duration: video.duration_seconds,
        views: video.views_count,
        likes: video.likes_count,
        comments: video.comments_count,
        type: video.duration_seconds <= 60 ? 'short' : 'long',
        uploadedAt: formatTimeAgo(video.created_at),
        isPublished: video.is_published,
        category: video.category,
        tags: video.tags || []
      })) || [];

      // Calcular estadísticas
      const totalStats = data?.reduce((acc, video) => ({
        totalVideos: acc.totalVideos + 1,
        totalViews: acc.totalViews + video.views_count,
        totalLikes: acc.totalLikes + video.likes_count,
        totalComments: acc.totalComments + video.comments_count
      }), { totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0 }) || {};

      setVideos(transformedVideos);
      setStats(totalStats);

    } catch (err) {
      console.error('Error fetching user videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const deleteVideo = useCallback(async (videoId) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
        .eq('user_id', user.id); // Seguridad adicional

      if (error) throw error;

      // Actualizar estado local
      setVideos(prev => prev.filter(video => video.id !== videoId));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting video:', error);
      return { success: false, error: error.message };
    }
  }, [user?.id]);

  const updateVideo = useCallback(async (videoId, updates) => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', videoId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      setVideos(prev => prev.map(video => 
        video.id === videoId 
          ? { ...video, ...updates, uploadedAt: formatTimeAgo(data.updated_at) }
          : video
      ));

      return { success: true, data };
    } catch (error) {
      console.error('Error updating video:', error);
      return { success: false, error: error.message };
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserVideos();
  }, [fetchUserVideos]);

  return {
    videos,
    stats,
    loading,
    error,
    refreshVideos: fetchUserVideos,
    deleteVideo,
    updateVideo
  };
};

// Hook para historial de puntos (MANTENER EXACTAMENTE IGUAL)
const usePointsHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    currentBalance: 0,
    totalEarned: 0,
    totalSpent: 0,
    thisMonth: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchPointsHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Obtener balance actual
      const { data: balanceData } = await supabase
        .rpc('get_user_points_balance', { target_user_id: user.id });

      const currentBalance = balanceData || 0;

      // Obtener transacciones
      const { data: transactionsData, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const transformedTransactions = transactionsData?.map(transaction => ({
        id: transaction.id,
        points: transaction.points_change,
        type: transaction.transaction_type,
        description: transaction.description,
        date: transaction.created_at,
        balanceAfter: transaction.points_balance_after,
        isPositive: transaction.points_change > 0,
        icon: getTransactionIcon(transaction.transaction_type)
      })) || [];

      // Calcular resumen
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      const totalEarned = transactionsData
        ?.filter(t => t.points_change > 0)
        ?.reduce((sum, t) => sum + t.points_change, 0) || 0;

      const totalSpent = Math.abs(transactionsData
        ?.filter(t => t.points_change < 0)
        ?.reduce((sum, t) => sum + t.points_change, 0) || 0);

      const thisMonth = transactionsData
        ?.filter(t => new Date(t.created_at) >= thisMonthStart && t.points_change > 0)
        ?.reduce((sum, t) => sum + t.points_change, 0) || 0;

      setTransactions(transformedTransactions);
      setSummary({
        currentBalance,
        totalEarned,
        totalSpent,
        thisMonth
      });

    } catch (error) {
      console.error('Error fetching points history:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPointsHistory();
  }, [fetchPointsHistory]);

  return {
    transactions,
    summary,
    loading,
    refreshHistory: fetchPointsHistory
  };
};

// Hook para historial de compras/canjes (MANTENER EXACTAMENTE IGUAL)
const usePurchaseHistory = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Por ahora usar datos mock ya que no tenemos tabla de purchases implementada
  useEffect(() => {
    const mockPurchases = [
      {
        id: 1,
        type: 'reward_redemption',
        title: 'Descuento 10% en Marketplace',
        image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400',
        pointsUsed: 500,
        status: 'redeemed',
        redeemedAt: '2025-01-20T10:30:00Z',
        code: 'RADEISAN10OFF'
      },
      {
        id: 2,
        type: 'reward_redemption',
        title: 'Destacar Video 24h',
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400',
        pointsUsed: 1000,
        status: 'used',
        redeemedAt: '2025-01-18T15:45:00Z'
      }
    ];

    setTimeout(() => {
      setPurchases(mockPurchases);
      setLoading(false);
    }, 1000);
  }, [user?.id]);

  return {
    purchases,
    loading
  };
};

// ===============================
// UTILIDADES (MANTENER EXACTAMENTE IGUAL)
// ===============================

// Generar username único
const generateUsername = (email) => {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  const random = Math.floor(Math.random() * 1000);
  return `${base}${random}`;
};

// Formatear tiempo relativo
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'hace un momento';
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)}d`;
  return `hace ${Math.floor(diffInSeconds / 2592000)}m`;
};

// Obtener icono según tipo de transacción
const getTransactionIcon = (type) => {
  const icons = {
    'video_upload': 'Upload',
    'video_view': 'Eye',
    'video_like': 'Heart',
    'daily_login': 'Calendar',
    'referral': 'Users',
    'reward_redemption': 'Gift',
    'admin_adjustment': 'Settings',
    'bonus': 'Award',
    'contest_win': 'Trophy',
    'other': 'Plus'
  };
  return icons[type] || 'Plus';
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const UserProfileSettings = () => {
  const { user, signOut } = useAuth();
  const { 
    profileData, 
    loading: profileLoading, 
    error: profileError,
    uploading,
    updateProfile,
    uploadAvatar,
    refreshProfile, // 🆕 Función para refresh
    
    // 🆕 Cover image states
    coverUploading,
    coverError,
    uploadCover
  } = useUserProfile();
  const { videos, stats, loading: videosLoading, deleteVideo, updateVideo } = useUserVideos();
  const { transactions, summary, loading: pointsLoading } = usePointsHistory();
  const { purchases, loading: purchasesLoading } = usePurchaseHistory();

  const [activeTab, setActiveTab] = useState('videos');
  const [editingProfile, setEditingProfile] = useState(false);

  // ===============================
  // COMPUTED VALUES (EXTENDER LIGERAMENTE)
  // ===============================

  // Combinar datos del auth y perfil
  const userData = useMemo(() => {
    if (!profileData) return null;

    return {
      id: profileData.id,
      name: profileData.full_name,
      username: profileData.username,
      email: profileData.email,
      bio: profileData.bio,
      avatar: profileData.avatar_url,
      coverImage: profileData.cover_image_url, // ✅ Ya existía
      isVerified: profileData.is_verified || false,
      isBusinessAccount: !!profileData.business_name,
      businessName: profileData.business_name,
      businessType: profileData.business_type,
      location: profileData.business_location,
      website: profileData.website,
      phoneNumber: profileData.phone_number,
      
      // 🆕 Añadir contador de fotos
      photosCount: profileData.photos_count || 0,
      
      // Estadísticas calculadas
      followersCount: 0, // TODO: Implementar sistema de follows
      followingCount: 0, // TODO: Implementar sistema de follows
      videosCount: stats.totalVideos,
      totalViews: stats.totalViews,
      totalLikes: stats.totalLikes,
      totalPoints: summary.currentBalance,
      
      // Fechas
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at
    };
  }, [profileData, stats, summary]);

  // Contadores para tabs (MANTENER IGUAL)
  const tabCounts = useMemo(() => ({
    videos: videos.length,
    liked: 0, // TODO: Implementar videos liked
    playlists: 0, // TODO: Implementar playlists
    purchases: purchases.length,
    points: transactions.length
  }), [videos.length, purchases.length, transactions.length]);

  // ===============================
  // EVENT HANDLERS (CORREGIDOS PARA REFRESH)
  // ===============================

  const handleEditProfile = useCallback(() => {
    setActiveTab('settings');
    setEditingProfile(true);
  }, []);

  const handleUpgradeAccount = useCallback(() => {
    // Redirigir a página de business
    window.location.href = '/business';
  }, []);

  const handleUpdateSettings = useCallback(async (newSettings) => {
    try {
      const result = await updateProfile(newSettings);
      if (result.success) {
        setEditingProfile(false);
        // TODO: Mostrar mensaje de éxito
        console.log('Profile updated successfully');
      } else {
        // TODO: Mostrar mensaje de error
        console.error('Failed to update profile:', result.error);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [updateProfile]);

  // 🔧 HANDLERS CORREGIDOS - Usa callbacks del ProfileImageEditor
  const handleAvatarUpload = useCallback(async (url) => {
    // El ProfileImageEditor ya subió y actualizó la BD
    // Solo necesitamos refrescar el perfil para ver los cambios
    if (url) {
      await refreshProfile();
      console.log('Avatar updated, profile refreshed');
    }
  }, [refreshProfile]);

  const handleCoverUpload = useCallback(async (url) => {
    // El ProfileImageEditor ya subió y actualizó la BD
    // Solo necesitamos refrescar el perfil para ver los cambios
    if (url) {
      await refreshProfile();
      console.log('Cover updated, profile refreshed');
    }
  }, [refreshProfile]);

  const handleVideoAction = useCallback(async (action, videoId, data = {}) => {
    switch (action) {
      case 'delete':
        if (window.confirm('¿Estás seguro de que quieres eliminar este video?')) {
          const result = await deleteVideo(videoId);
          if (result.success) {
            // TODO: Mostrar mensaje de éxito
            console.log('Video deleted successfully');
          }
        }
        break;
      case 'update':
        const result = await updateVideo(videoId, data);
        if (result.success) {
          console.log('Video updated successfully');
        }
        break;
      default:
        break;
    }
  }, [deleteVideo, updateVideo]);

  const handleSignOut = useCallback(async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      await signOut();
      window.location.href = '/';
    }
  }, [signOut]);

  // ===============================
  // RENDER HELPERS
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
          />
        );
      case 'liked':
        return (
          <VideoGrid 
            videos={[]} // TODO: Implementar videos liked
            loading={false}
            emptyMessage="No has dado like a ningún video aún"
          />
        );
      case 'playlists':
        return (
          <VideoGrid 
            videos={[]} // TODO: Implementar playlists
            loading={false}
            emptyMessage="No has creado playlists aún"
          />
        );
      case 'purchases':
        return (
          <PurchaseHistory 
            purchases={purchases} 
            loading={purchasesLoading} 
          />
        );
      case 'points':
        return (
          <PointsHistory 
            transactions={transactions}
            summary={summary}
            loading={pointsLoading}
          />
        );
      case 'settings':
        return (
          <SettingsPanel 
            user={userData}
            loading={profileLoading || uploading || coverUploading}
            onUpdateSettings={handleUpdateSettings}
            onUploadAvatar={handleAvatarUpload}
            onUploadCover={handleCoverUpload}
            onSignOut={handleSignOut}
            editing={editingProfile}
            onCancelEdit={() => setEditingProfile(false)}
          />
        );
      default:
        return (
          <VideoGrid 
            videos={videos} 
            loading={videosLoading}
            onVideoAction={handleVideoAction}
            showActions={true}
          />
        );
    }
  };

  // Loading state (MANTENER IGUAL)
  if (profileLoading && !profileData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        <main className="pt-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando perfil...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state (MANTENER IGUAL)
  if (profileError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        <main className="pt-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <Icon name="AlertCircle" size={32} color="var(--color-destructive)" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Error al cargar el perfil
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md text-center">
                {profileError}
              </p>
              <Button onClick={() => window.location.reload()}>
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  // ===============================
  // RENDER (MANTENER EXACTAMENTE IGUAL)
  // ===============================
  return (
    <>
      <Helmet>
        <title>{userData.name} - Mi Perfil | RADEISAN</title>
        <meta name="description" content={`Perfil de ${userData.name}${userData.bio ? ` - ${userData.bio}` : ''}. ${userData.videosCount} videos, ${userData.totalViews} visualizaciones.`} />
        <meta name="keywords" content={`perfil, usuario, videos, ${userData.name}, creador de contenido`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Profile Header */}
            <ProfileHeader 
              user={userData}
              loading={uploading || coverUploading}
              onEditProfile={handleEditProfile}
              onUpgradeAccount={handleUpgradeAccount}
              onUploadAvatar={handleAvatarUpload}
              onUploadCover={handleCoverUpload}
              stats={{
                videos: stats.totalVideos,
                views: stats.totalViews,
                likes: stats.totalLikes,
                comments: stats.totalComments
              }}
            />

            {/* Profile Tabs */}
            <ProfileTabs 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabCounts={tabCounts}
              user={userData}
            />

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {renderTabContent()}
            </div>
          </div>
        </main>

        {/* Floating Action Button - Upload Video */}
        {activeTab === 'videos' && (
          <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
            <Button
              size="lg"
              className="rounded-full shadow-lg"
              onClick={() => window.location.href = '/upload'}
            >
              <Icon name="Plus" size={16} className="mr-2" />
              Subir Video
            </Button>
          </div>
        )}

        {/* Profile Stats Summary */}
        {activeTab === 'videos' && userData && (
          <div className="fixed bottom-4 left-4 max-w-sm bg-card border rounded-lg p-4 shadow-lg z-50 hidden lg:block">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="BarChart3" size={20} color="var(--color-primary)" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Estadísticas del perfil</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>{stats.totalVideos} videos • {stats.totalViews.toLocaleString()} views</div>
                  <div>{stats.totalLikes.toLocaleString()} likes • {summary.currentBalance.toLocaleString()} puntos</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserProfileSettings;
