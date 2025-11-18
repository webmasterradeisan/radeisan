// src/pages/PublicProfilePage/index.jsx
// ✅ DISEÑO EXACTO SEGÚN LA IMAGEN
// ✅ CORREGIDO: Lógica de carga de fotos defensiva para evitar errores de JOIN en Supabase.
// ✅ CORREGIDO: Agregado useEffect y handlers faltantes

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import Image from '../../components/AppImage';
import useIsMobile from '../../hooks/useIsMobile';
import PhotoDetailModal from '../../components/PhotoDetailModal'; 

const PublicProfilePage = () => {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isMobile = useIsMobile();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState(false);
  const [allVideos, setAllVideos] = useState([]);
  const [reels, setReels] = useState([]);
  const [horizontalVideos, setHorizontalVideos] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('videos');
  
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null); 
  const [showPhotoModal, setShowPhotoModal] = useState(false); 

  const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const determineOrientation = (video) => {
    if (video.orientation) return video.orientation;
    if (video.width && video.height) {
      const aspectRatio = video.width / video.height;
      if (aspectRatio <= 0.8) return 'vertical';
      if (aspectRatio >= 1.3) return 'horizontal'; 
      return 'square';
    }
    if (video.video_width && video.video_height) {
      const aspectRatio = video.video_width / video.video_height;
      if (aspectRatio <= 0.8) return 'vertical';
      if (aspectRatio >= 1.3) return 'horizontal'; 
      return 'square';
    }
    return 'horizontal';
  };

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let profileQuery;
      if (isUUID(identifier)) {
        profileQuery = supabase.from('user_profiles').select('*').eq('id', identifier).single();
      } else {
        profileQuery = supabase.from('user_profiles').select('*').eq('username', identifier).single();
      }

      const { data: profile, error: profileError } = await profileQuery;
      if (profileError || !profile) {
        setError('Usuario no encontrado');
        setLoading(false);
        return;
      }

      const isOwn = currentUser?.id === profile.id;
      if (isOwn) {
        navigate('/profile');
        return;
      }
      
      // =========================================================================
      // ✅ CORRECCIÓN DE LA CARGA DE FOTOS (Simplificación de consulta)
      // =========================================================================
      const { data: rawPhotosData, error: photosError } = await supabase
        .from('photos')
        .select('*') // Consulta más simple para evitar el error de JOIN/RLS
        .eq('user_id', profile.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;
      
      // Manualmente adjuntamos los datos del perfil a cada foto 
      // para que el PhotoDetailModal funcione correctamente.
      const photosWithProfile = (rawPhotosData || []).map(photo => ({
          ...photo,
          user_profiles: {
              id: profile.id,
              username: profile.username,
              full_name: profile.full_name,
          }
      }));

      setUserPhotos(photosWithProfile);
      // =========================================================================

      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const processedVideos = (videosData || []).map(video => ({
        ...video,
        orientation: determineOrientation(video)
      }));

      const verticalVideos = processedVideos.filter(v => v.orientation === 'vertical');
      const horizontalOnly = processedVideos.filter(v => v.orientation === 'horizontal' || v.orientation === 'square');
      
      setAllVideos(processedVideos);
      setReels(verticalVideos);
      setHorizontalVideos(horizontalOnly);

      if (currentUser) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
          .single();
        setFollowing(!!followData);
      }

      const avatarUrl = profile.avatar_url || profile.avatar || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username || 'User')}&background=6366f1&color=ffffff&size=128`;

      // Calcular vistas totales
      const totalViews = processedVideos.reduce((sum, v) => sum + (v.views_count || 0), 0);
      const totalLikes = processedVideos.reduce((sum, v) => sum + (v.likes_count || 0), 0);

      setProfileData({
        ...profile,
        name: profile.full_name || profile.username,
        username: profile.username || `user_${profile.id.substring(0, 8)}`,
        avatar: avatarUrl,
        coverImage: profile.cover_image_url,
        bio: profile.bio,
        followersCount: profile.followers_count || 0,
        followingCount: profile.following_count || 0,
        photosCount: (photosWithProfile || []).length, // Usar el conteo corregido
        videosCount: horizontalOnly.length,
        reelsCount: verticalVideos.length,
        totalViews: totalViews,
        totalLikes: totalLikes,
        isVerified: profile.is_verified || false,
        isBusinessAccount: profile.is_business_account || false,
        created_at: profile.created_at,
      });

      setLoading(false);
    } catch (err) {
      console.error('❌ Error al cargar perfil:', err);
      // Cambiamos el mensaje a uno más genérico si el error no es "Usuario no encontrado"
      setError(err.message === 'Usuario no encontrado' ? 'Usuario no encontrado' : 'Error al cargar el perfil');
      setLoading(false);
    }
  }, [identifier, currentUser, navigate]);

  // ✅ useEffect PRINCIPAL - esto es lo que faltaba!
  useEffect(() => {
    if (identifier) {
      loadUserProfile();
    }
  }, [identifier, loadUserProfile]);

  // ✅ Handlers para el modal de fotos
  const handlePhotoClick = useCallback((index) => {
    setSelectedPhotoIndex(index);
    setShowPhotoModal(true);
  }, []);

  const handlePhotoModalClose = useCallback(() => {
    setShowPhotoModal(false);
    setSelectedPhotoIndex(null);
  }, []);

  const handlePhotoNavigation = useCallback((newIndex) => {
    setSelectedPhotoIndex(newIndex);
  }, []);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!profileData?.id) return;

    try {
      if (following) {
        await supabase.from('user_follows').delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileData.id);
        setFollowing(false);
        setProfileData(prev => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }));
      } else {
        await supabase.from('user_follows').insert({
          follower_id: currentUser.id,
          following_id: profileData.id,
        });
        setFollowing(true);
        setProfileData(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
      }
    } catch (err) {
      console.error('Error en follow/unfollow:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="AlertCircle" size={32} className="text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{error}</h2>
            <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <>
      <Helmet>
        <title>{profileData.name} (@{profileData.username}) - Perfil</title>
        <meta name="description" content={profileData.bio || `Perfil de ${profileData.name}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Cover Image */}
          <div className="bg-card rounded-lg overflow-hidden shadow-sm mb-6">
            <div className="relative h-48 sm:h-64 bg-gradient-to-r from-primary/20 to-accent/20">
              {profileData.coverImage && (
                <Image 
                  src={profileData.coverImage} 
                  alt="Portada" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Profile Header */}
            <div className="relative px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-5 -mt-12 sm:-mt-16">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-muted overflow-hidden">
                    <Image 
                      src={profileData.avatar} 
                      alt={profileData.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {profileData.isVerified && (
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                      <Icon name="CheckCircle" size={20} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="mt-4 sm:mt-0 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-4 sm:mb-0">
                      <h1 className="text-2xl font-bold flex items-center space-x-2">
                        <span>{profileData.name}</span>
                      </h1>
                      <p className="text-muted-foreground">@{profileData.username}</p>
                      {profileData.bio && (
                        <p className="mt-2 text-sm text-foreground max-w-2xl">{profileData.bio}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {currentUser ? (
                        <>
                          <Button
                            onClick={handleFollowToggle}
                            variant={following ? 'outline' : 'default'}
                            size="sm"
                            className="min-w-[100px]"
                          >
                            {following ? (
                              <>
                                <Icon name="UserMinus" size={16} className="mr-2" />
                                Siguiendo
                              </>
                            ) : (
                              <>
                                <Icon name="UserPlus" size={16} className="mr-2" />
                                Seguir
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Icon name="MessageCircle" size={16} className="mr-2" />
                            Mensaje
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => navigate('/login')} size="sm">
                          <Icon name="UserPlus" size={16} className="mr-2" />
                          Seguir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {profileData.followersCount?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Seguidores</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {profileData.followingCount?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Siguiendo</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {profileData.videosCount?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Videos</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {profileData.reelsCount?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Reels</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {profileData.photosCount?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Fotos</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {profileData.totalViews?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Vistas</div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="bg-card rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-border">
              <div className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'videos' 
                      ? 'border-b-2 border-primary text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name="Monitor" size={16} className="inline mr-2" />
                  Videos ({horizontalVideos.length})
                </button>
                <button
                  onClick={() => setActiveTab('reels')}
                  className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'reels' 
                      ? 'border-b-2 border-primary text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name="Smartphone" size={16} className="inline mr-2" />
                  Reels ({reels.length})
                </button>
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'photos' 
                      ? 'border-b-2 border-primary text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name="Image" size={16} className="inline mr-2" />
                  Fotos ({userPhotos.length})
                </button>
              </div>

              {/* Content - Videos */}
              {activeTab === 'videos' && (
                <div className="p-6">
                  {horizontalVideos.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Monitor" size={32} className="text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Sin videos aún</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {horizontalVideos.map((video) => (
                        <Link 
                          key={video.id}
                          to={`/video/${video.id}`}
                          className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="relative aspect-video bg-muted">
                            <img 
                              src={video.thumbnail_url || '/placeholder-video.jpg'} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {video.duration_seconds ? `${Math.floor(video.duration_seconds / 60)}:${String(video.duration_seconds % 60).padStart(2, '0')}` : '0:00'}
                            </div>
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-sm line-clamp-2 mb-1">{video.title}</h3>
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <Icon name="Eye" size={12} />
                                <span>{video.views_count?.toLocaleString() || 0}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Icon name="Heart" size={12} />
                                <span>{video.likes_count?.toLocaleString() || 0}</span>
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Content - Reels */}
              {activeTab === 'reels' && (
                <div className="p-6">
                  {reels.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Smartphone" size={32} className="text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Sin reels aún</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {reels.map((reel) => (
                        <Link 
                          key={reel.id}
                          to={`/reels?id=${reel.id}`}
                          className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="relative aspect-[9/16] bg-muted">
                            <img 
                              src={reel.thumbnail_url || '/placeholder-video.jpg'} 
                              alt={reel.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                              <Icon name="Play" size={10} />
                              <span>{reel.duration_seconds ? `${Math.floor(reel.duration_seconds / 60)}:${String(reel.duration_seconds % 60).padStart(2, '0')}` : '0:00'}</span>
                            </div>
                          </div>
                          <div className="p-2">
                            <h3 className="font-semibold text-xs line-clamp-2 mb-1">{reel.title}</h3>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <Icon name="Eye" size={10} />
                                <span>{reel.views_count?.toLocaleString() || 0}</span>
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Content - Fotos */}
              {activeTab === 'photos' && (
                <div className="p-6">
                  {userPhotos.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Image" size={32} className="text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Sin fotos aún</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {userPhotos.map((photo, index) => (
                        <div 
                          key={photo.id}
                          onClick={() => handlePhotoClick(index)} 
                          className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group relative"
                        >
                          <div className="relative aspect-square bg-muted">
                            <img 
                              src={photo.image_url || '/placeholder-photo.jpg'} 
                              alt={photo.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Icon name="Maximize" size={24} className="text-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* RENDERIZADO DEL MODAL DE FOTOS */}
      {showPhotoModal && selectedPhotoIndex !== null && userPhotos.length > 0 && (
          <PhotoDetailModal 
              photos={userPhotos}
              currentPhotoIndex={selectedPhotoIndex}
              photoData={userPhotos[selectedPhotoIndex]}
              onClose={handlePhotoModalClose}
              onNavigate={handlePhotoNavigation}
              refreshParentData={loadUserProfile} 
              totalPhotos={userPhotos.length}
          />
      )}
    </>
  );
};

export default PublicProfilePage;
