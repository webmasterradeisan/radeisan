// src/pages/PublicProfilePage/index.jsx
// ✅ VERSIÓN CON CABECERA MEJORADA + 3 TABS

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import useIsMobile from '../../hooks/useIsMobile';

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

  // ===============================
  // FUNCIÓN PARA DETECTAR SI ES UUID
  // ===============================
  const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // ===============================
  // DETERMINAR ORIENTACIÓN
  // ===============================
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

  // ===============================
  // CARGAR PERFIL DEL USUARIO
  // ===============================
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      let profileQuery;

      if (isUUID(identifier)) {
        console.log('🔍 Buscando perfil por UUID:', identifier);
        profileQuery = supabase
          .from('user_profiles')
          .select('*')
          .eq('id', identifier)
          .single();
      } else {
        console.log('🔍 Buscando perfil por username:', identifier);
        profileQuery = supabase
          .from('user_profiles')
          .select('*')
          .eq('username', identifier)
          .single();
      }

      const { data: profile, error: profileError } = await profileQuery;

      if (profileError || !profile) {
        console.error('❌ Error al cargar perfil:', profileError);
        setError('Usuario no encontrado');
        setLoading(false);
        return;
      }

      console.log('✅ Perfil encontrado:', profile);

      const isOwn = currentUser?.id === profile.id;

      if (isOwn) {
        navigate('/profile');
        return;
      }

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

      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

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

      const totalPoints = (profile.free_points || 0) + (profile.premium_points || 0);

      setProfileData({
        ...profile,
        name: profile.full_name || profile.username,
        username: profile.username || `user_${profile.id.substring(0, 8)}`,
        avatar: avatarUrl,
        coverImage: profile.cover_image_url,
        bio: profile.bio || `Usuario de RADEISAN desde ${new Date(profile.created_at).toLocaleDateString()}`,
        followersCount: profile.followers_count || 0,
        followingCount: profile.following_count || 0,
        photosCount: profile.photos_count || 0,
        videosCount: horizontalOnly.length,
        reelsCount: verticalVideos.length,
        isVerified: profile.is_verified || false,
        isBusinessAccount: profile.is_business_account || false,
        totalPoints: totalPoints,
        freePoints: profile.free_points || 0,
        premiumPoints: profile.premium_points || 0
      });

      setUserPhotos(photosData || []);
      setLoading(false);

    } catch (err) {
      console.error('❌ Error al cargar perfil:', err);
      setError('Error al cargar el perfil');
      setLoading(false);
    }
  };

  // ===============================
  // SEGUIR/DEJAR DE SEGUIR
  // ===============================
  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!profileData?.id) return;

    try {
      if (following) {
        setFollowing(false);
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileData.id);

        setProfileData(prev => ({
          ...prev,
          followersCount: Math.max(0, prev.followersCount - 1)
        }));
      } else {
        setFollowing(true);
        await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profileData.id
          });

        setProfileData(prev => ({
          ...prev,
          followersCount: prev.followersCount + 1
        }));
      }
    } catch (err) {
      console.error('❌ Error al seguir/dejar de seguir:', err);
      setFollowing(!following);
    }
  };

  // ===============================
  // EFFECTS
  // ===============================
  useEffect(() => {
    if (identifier) {
      loadUserProfile();
    }
  }, [identifier, currentUser]);

  // ===============================
  // RENDER - LOADING
  // ===============================
  if (loading) {
    return (
      <>
        <Helmet>
          <title>Cargando perfil... | RADEISAN</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      </>
    );
  }

  // ===============================
  // RENDER - ERROR
  // ===============================
  if (error || !profileData) {
    return (
      <>
        <Helmet>
          <title>Usuario no encontrado | RADEISAN</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="UserX" size={32} className="text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Usuario no encontrado</h1>
            <p className="text-muted-foreground mb-6">
              El perfil que buscas no existe o no está disponible.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              <Icon name="Home" size={16} className="mr-2" />
              Volver al inicio
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ===============================
  // RENDER - PERFIL PÚBLICO
  // ===============================
  return (
    <>
      <Helmet>
        <title>{profileData.name} (@{profileData.username}) | RADEISAN</title>
        <meta name="description" content={profileData.bio} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-16">
          <div className="max-w-7xl mx-auto">
            {/* ✨ CABECERA MEJORADA */}
            <div className="bg-card">
              {/* Cover Image */}
              <div className="relative h-32 sm:h-48 md:h-64 bg-gradient-to-r from-primary/20 to-secondary/20 overflow-hidden">
                {profileData.coverImage ? (
                  <img 
                    src={profileData.coverImage} 
                    alt="Portada del perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
                )}
              </div>

              {/* Profile Info Container */}
              <div className="px-4 sm:px-6 lg:px-8">
                {/* Avatar */}
                <div className="flex justify-center sm:justify-start -mt-12 sm:-mt-16 mb-4">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-card bg-card overflow-hidden shadow-xl">
                    <img 
                      src={profileData.avatar} 
                      alt={profileData.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Info and Actions */}
                <div className="pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Left: User Info */}
                    <div className="flex-1 text-center sm:text-left">
                      {/* Name and Badges */}
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                          {profileData.name}
                        </h1>
                        {profileData.isVerified && (
                          <Icon name="BadgeCheck" size={24} color="var(--color-primary)" />
                        )}
                        {profileData.isBusinessAccount && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 rounded-full">
                            <Icon name="Building2" size={14} color="var(--color-accent)" />
                            <span className="text-xs font-medium text-accent">Business</span>
                          </div>
                        )}
                      </div>

                      {/* Username and Stats in one line */}
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
                        <span className="font-medium">@{profileData.username}</span>
                        <span>•</span>
                        <span>{profileData.followersCount?.toLocaleString()} seguidores</span>
                        <span>•</span>
                        <span>{profileData.videosCount + profileData.reelsCount} videos</span>
                        {profileData.photosCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{profileData.photosCount} fotos</span>
                          </>
                        )}
                      </div>

                      {/* Bio */}
                      {profileData.bio && (
                        <p className="text-sm text-foreground max-w-2xl mb-3">
                          {profileData.bio}
                        </p>
                      )}

                      {/* Member Since */}
                      <p className="text-xs text-muted-foreground">
                        Usuario de RADEISAN desde {new Date(profileData.created_at).toLocaleDateString('es-ES', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center justify-center sm:justify-end gap-2 flex-shrink-0">
                      <Button
                        variant={following ? "outline" : "default"}
                        size="default"
                        onClick={handleFollowToggle}
                        className="min-w-[120px]"
                      >
                        <Icon name={following ? "UserCheck" : "UserPlus"} size={18} className="mr-2" />
                        {following ? 'Siguiendo' : 'Seguir'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        title="Compartir perfil"
                      >
                        <Icon name="Share2" size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-border">
                <div className="px-4 sm:px-6 lg:px-8">
                  <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setActiveTab('videos')}
                      className={`px-6 py-4 font-medium text-sm transition-colors whitespace-nowrap border-b-2 ${
                        activeTab === 'videos' 
                          ? 'border-primary text-primary' 
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon name="Monitor" size={18} className="inline mr-2" />
                      Videos
                      <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                        {horizontalVideos.length}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('reels')}
                      className={`px-6 py-4 font-medium text-sm transition-colors whitespace-nowrap border-b-2 ${
                        activeTab === 'reels' 
                          ? 'border-primary text-primary' 
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon name="Smartphone" size={18} className="inline mr-2" />
                      Reels
                      <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                        {reels.length}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('photos')}
                      className={`px-6 py-4 font-medium text-sm transition-colors whitespace-nowrap border-b-2 ${
                        activeTab === 'photos' 
                          ? 'border-primary text-primary' 
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon name="Image" size={18} className="inline mr-2" />
                      Fotos
                      <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                        {userPhotos.length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              {/* Videos Horizontales */}
              {activeTab === 'videos' && (
                <div>
                  {horizontalVideos.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Monitor" size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Sin videos aún</h3>
                      <p className="text-sm text-muted-foreground">
                        Este usuario no ha publicado videos horizontales todavía.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {horizontalVideos.map((video) => (
                        <Link 
                          key={video.id}
                          to={`/video/${video.id}`}
                          className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                          <div className="relative aspect-video bg-muted">
                            <img 
                              src={video.thumbnail_url || '/placeholder-video.jpg'} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
                              {video.duration_seconds ? `${Math.floor(video.duration_seconds / 60)}:${String(video.duration_seconds % 60).padStart(2, '0')}` : '0:00'}
                            </div>
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-sm line-clamp-2 mb-2">{video.title}</h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Icon name="Eye" size={12} />
                                {video.views_count?.toLocaleString() || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Icon name="Heart" size={12} />
                                {video.likes_count?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reels Verticales */}
              {activeTab === 'reels' && (
                <div>
                  {reels.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Smartphone" size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Sin reels aún</h3>
                      <p className="text-sm text-muted-foreground">
                        Este usuario no ha publicado reels todavía.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {reels.map((reel) => (
                        <Link 
                          key={reel.id}
                          to={`/reels?id=${reel.id}`}
                          className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                          <div className="relative aspect-[9/16] bg-muted">
                            <img 
                              src={reel.thumbnail_url || '/placeholder-video.jpg'} 
                              alt={reel.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="flex items-center justify-between text-white text-xs">
                                <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
                                  <Icon name="Play" size={10} />
                                  <span className="font-medium">
                                    {reel.duration_seconds ? `${Math.floor(reel.duration_seconds / 60)}:${String(reel.duration_seconds % 60).padStart(2, '0')}` : '0:00'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="p-2">
                            <h3 className="font-semibold text-xs line-clamp-2 mb-1">{reel.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Icon name="Eye" size={10} />
                                {reel.views_count?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fotos */}
              {activeTab === 'photos' && (
                <div>
                  {userPhotos.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Image" size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Sin fotos aún</h3>
                      <p className="text-sm text-muted-foreground">
                        Este usuario no ha publicado fotos todavía.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {userPhotos.map((photo) => (
                        <div 
                          key={photo.id}
                          className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <div className="relative aspect-square bg-muted">
                            <img 
                              src={photo.image_url || '/placeholder-photo.jpg'} 
                              alt={photo.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
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
    </>
  );
};

export default PublicProfilePage;
