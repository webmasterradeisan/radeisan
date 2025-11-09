// src/pages/user-profile-settings/index.jsx
// UserProfileSettings - ✅ INTEGRADO CON SISTEMA DE PUNTOS Y FOTOS
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
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

// ===============================
// CONSTANTES
// ===============================

const VIDEO_ORIENTATIONS = {
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal',
  SQUARE: 'square'
};

const PAGE_TABS = {
  VIDEOS: 'videos',
  REELS: 'reels',
  PHOTOS: 'photos', // ✅ Nuevo: Tab para fotos
  POINTS: 'points',
  HISTORY: 'history',
  SETTINGS: 'settings'
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
  
  // ✅ NUEVOS ESTADOS PARA DATOS DE CONTENIDO
  const [photos, setPhotos] = useState([]); 
  const [videos, setVideos] = useState([]); 
  const [reels, setReels] = useState([]); 

  const generateUsername = (email) => {
    if (!email) return `user_${Math.random().toString(36).substring(2, 9)}`;
    return email.split('@')[0];
  };

  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener datos de perfil (user_profiles)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_points(total_balance)
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      // Asegurar que el perfil tiene un username
      if (!profile.username) {
        profile.username = generateUsername(user.email);
      }
      
      setProfileData(profile);
      
      // ✅ 2. Obtener fotos del usuario
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select(`
            id, 
            image_url, 
            caption, 
            likes_count, 
            comments_count
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;
      setPhotos(photosData);

      // 3. Obtener videos/reels (ejemplo: si usas una tabla 'videos' para ambos)
      // Aquí se cargaría el contenido de videos y reels si existiera la lógica.
      
    } catch (err) {
      console.error('Error fetching profile or content:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Las funciones de subida de avatar/cover (handleAvatarUpload, handleCoverUpload)
  // deben ser implementadas en el componente o importadas, aquí solo retornamos las que afectan la UI.
  const handleAvatarUpload = async (file) => {
    // Lógica para subir el avatar
    // ...
    // Después de una subida exitosa, se llama a refetch
    // refetch(); 
  };
  
  const handleCoverUpload = async (file) => {
    // Lógica para subir la portada
    // ...
    // Después de una subida exitosa, se llama a refetch
    // refetch();
  };


  return {
    profileData,
    photos, // ✅ EXPORTAR FOTOS
    videos,
    reels,
    loading,
    error,
    refetch: fetchUserProfile, // Para recargar después de una subida (o edición)
    handleAvatarUpload,
    handleCoverUpload,
  };
};

// ===============================
// COMPONENTE DE GALERÍA DE FOTOS (NUEVO)
// ===============================

const PhotoGallery = ({ photos }) => {
    if (photos.length === 0) {
        return (
            <div className="text-center py-12">
                <Icon name="ImageOff" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                    ¡Aún no hay fotos!
                </h3>
                <p className="text-muted-foreground">
                    Sube tu primera foto desde el Photo Studio.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => (
                <div 
                    key={photo.id} 
                    className="relative aspect-square rounded-lg overflow-hidden shadow-md cursor-pointer group"
                    // Puedes agregar un onClick para ver la foto en grande
                >
                    <img
                        src={photo.image_url}
                        alt={photo.caption || 'Foto de usuario'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-semibold flex items-center space-x-1">
                            <Icon name="Heart" size={16} />
                            <span>{photo.likes_count || 0}</span>
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};


// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const UserProfileSettings = () => {
  const { isAuthenticated } = useAuth();
  const { pointsData } = usePoints();
  // ✅ Establecer el tab 'photos' como predeterminado
  const [activeTab, setActiveTab] = useState(PAGE_TABS.PHOTOS); 
  const [showImageEditor, setShowImageEditor] = useState(false);
  
  const {
    profileData,
    photos, // ✅ Desestructuramos fotos
    videos,
    reels,
    loading,
    error,
    refetch, 
    handleAvatarUpload,
    handleCoverUpload,
  } = useUserProfile();

  const totalPoints = useMemo(() => {
    // Usamos el total_balance de pointsData si está disponible, si no, del perfil, si no, 0.
    return pointsData?.total_balance || profileData?.user_points?.[0]?.total_balance || 0;
  }, [pointsData, profileData]);


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !isAuthenticated || !profileData) {
    return (
      <div className="min-h-screen bg-background p-8 pt-32 text-center">
        <h1 className="text-2xl font-bold text-destructive">Error de Carga</h1>
        <p className="text-muted-foreground">No se pudo cargar el perfil del usuario. {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
            Recargar
        </Button>
      </div>
    );
  }

  // Lógica de conteo de contenido
  const videoContentCount = videos.length + reels.length;
  const photoContentCount = photos.length;
  
  // En este punto, 'photos' contendrá las fotos del usuario cargadas desde Supabase.

  return (
    <>
      <Helmet>
        <title>Perfil de {profileData.username} | RADEISAN</title>
        <meta name="description" content={`Perfil de usuario de ${profileData.username}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        {/* Asumo que ProfileTabs está en PrimaryNavigation, si no, se agrega aquí */}
        
        <main className="pt-24 sm:pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* -------------------- PROFILE HEADER -------------------- */}
            <div className="bg-card rounded-xl shadow-lg mb-8 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                
                {/* Info de Usuario */}
                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                  <div 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted border-4 border-card overflow-hidden cursor-pointer"
                    onClick={() => setShowImageEditor(true)}
                  >
                    {/* Se usa el avatar o un placeholder */}
                    <img 
                      src={profileData.avatar || 'https://via.placeholder.com/150/007bff/ffffff?text=U'} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {profileData.display_name || profileData.username}
                    </h1>
                    <p className="text-sm text-muted-foreground">@{profileData.username}</p>
                    <p className="mt-1 text-sm text-secondary-foreground">{profileData.bio}</p>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="flex space-x-6 text-center">
                  <div>
                    <p className="text-xl font-bold text-primary">{totalPoints}</p>
                    <p className="text-sm text-muted-foreground">Puntos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{videoContentCount}</p>
                    <p className="text-sm text-muted-foreground">Videos</p>
                  </div>
                  <div>
                    {/* ✅ CONTEO REAL DE FOTOS */}
                    <p className="text-xl font-bold text-foreground">{photoContentCount}</p>
                    <p className="text-sm text-muted-foreground">Fotos</p>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                 <Button 
                    variant="outline" 
                    onClick={() => setActiveTab(PAGE_TABS.SETTINGS)}
                >
                    <Icon name="Settings" size={16} className="mr-2" />
                    Configuración
                </Button>
                <Button onClick={() => window.location.href = '/photo-upload-studio'}>
                    <Icon name="Plus" size={16} className="mr-2" />
                    Subir Contenido
                </Button>
              </div>
            </div>
            {/* ------------------ FIN PROFILE HEADER ------------------ */}

            
            {/* TABS DE NAVEGACIÓN */}
            <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />


            {/* CONTENIDO DE TABS */}
            <div className="py-8">
              
              {/* ✅ TAB DE FOTOS: Muestra la galería */}
              {activeTab === PAGE_TABS.PHOTOS && (
                <PhotoGallery photos={photos} />
              )}
              
              {/* TAB DE VIDEOS (Horizontal) */}
              {activeTab === PAGE_TABS.VIDEOS && (
                <div className="text-center py-12">
                   <h3 className="text-lg font-medium">Contenido de Videos</h3>
                   <p className="text-muted-foreground">Aquí irían tus videos horizontales.</p>
                </div>
              )}
              
              {/* TAB DE REELS (Vertical) */}
              {activeTab === PAGE_TABS.REELS && (
                <div className="text-center py-12">
                   <h3 className="text-lg font-medium">Contenido de Reels</h3>
                   <p className="text-muted-foreground">Aquí irían tus videos verticales/reels.</p>
                </div>
              )}

              {/* TAB DE PUNTOS */}
              {activeTab === PAGE_TABS.POINTS && (
                <PointsHistory userId={profileData.id} />
              )}
              
              {/* TAB DE HISTORIAL DE COMPRAS */}
              {activeTab === PAGE_TABS.HISTORY && (
                <PurchaseHistory userId={profileData.id} />
              )}
              
              {/* TAB DE CONFIGURACIÓN */}
              {activeTab === PAGE_TABS.SETTINGS && (
                <SettingsPanel 
                  profile={profileData} 
                  onProfileUpdate={refetch} 
                />
              )}

            </div>
          </div>
        </main>
      </div>

      {/* Modal de Edición de Imagen de Perfil/Portada */}
      {showImageEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
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
                currentAvatar={profileData?.avatar}
                currentCover={profileData?.coverImage}
                onAvatarChange={handleAvatarUpload}
                onCoverChange={handleCoverUpload}
                onClose={() => setShowImageEditor(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Debug Info - Solo en development */}
      {/*
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
      */}
    </>
  );
};

export default UserProfileSettings;
