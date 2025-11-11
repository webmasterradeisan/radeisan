// src/pages/PublicProfilePage/index.jsx
// ✅ VERSIÓN CORREGIDA: Info al lado derecho del avatar

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

  const loadUserProfile = async () => {
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
      });

      setUserPhotos(photosData || []);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error al cargar perfil:', err);
      setError('Error al cargar el perfil');
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (identifier) {
      loadUserProfile();
    }
  }, [identifier, currentUser]);

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

  return (
    <>
      <Helmet>
        <title>{profileData.name} (@{profileData.username}) | RADEISAN</title>
        <meta name="description" content={profileData.bio} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-16">
          <div className="max-w-6xl mx-auto">
            {/* ✅ CABECERA: Portada + Avatar + Info al lado */}
            <div className="bg-card border-b border-border">
              {/* Cover Image - SIN CAMBIOS */}
              <div className="relative h-32 sm:h-48 bg-gradient-to-r from-primary/20 to-secondary/20 overflow-hidden">
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

              {/* ✅ LAYOUT: Avatar a la izquierda, Info a la derecha */}
              <div className="px-4 sm:px-6 pb-6">
                <div className="flex flex-col sm:flex-row gap-4 -mt-12 sm:-mt-16">
                  {/* Avatar - SIN CAMBIOS */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-card overflow-hidden shadow-lg">
                      <img 
                        src={profileData.avatar} 
                        alt={profileData.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* ✅ Info al lado derecho del avatar */}
                  <div className="flex-1 min-w-0 pt-0 sm:pt-16">
                    {/* Nombre y badges */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                        {profileData.name}
                      </h1>
                      {profileData.isVerified && (
                        <Icon name="BadgeCheck" size={20} color="var(--color-primary)" />
                      )}
                      {profileData.isBusinessAccount && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 rounded-full">
                          <Icon name="Building2" size={12} color="var(--color-accent)" />
                          <span className="text-xs font-medium text-accent">Business</span>
                        </div>
                      )}
                    </div>

                    {/* Username y stats */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                      <span>@{profileData.username}</span>
                      <span>•</span>
                      <span>{profileData.followersCount?.toLocaleString()} seguidores</span>
                      <span>•</span>
                      <span>{profileData.videosCount + profileData.reelsCount} videos</span>
                    </div>

                    {/* Bio */}
                    {profileData.bio && (
                      <p className="text-sm text-foreground mb-2">
                        {profileData.bio}
                      </p>
                    )}

                    {/* Fecha de registro */}
                    <p className="text-xs text-muted-foreground mb-3">
                      Usuario de RADEISAN desde {new Date(profileData.created_at).toLocaleDateString('es-ES', { 
                        day: 'numeric',
                        month: 'numeric', 
                        year: 'numeric'
                      })}
                    </p>

                    {/* Botones */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={following ? "outline" : "default"}
                        size="sm"
                        onClick={handleFollowToggle}
                      >
                        <Icon name={following ? "UserCheck" : "UserPlus"} size={16} className="mr-2" />
                        {following ? 'Siguiendo' : 'Seguir'}
                      </Button>
                      
                      <Button variant="outline" size="icon">
                        <Icon name="Share2" size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-4 sm:px-6 py-6">
              <div className="flex border-b border-border mb-6 overflow-x-auto">
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
                <div>
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
                <div>
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
                <div>
                  {userPhotos.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Image" size={32} className="text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Sin fotos aún</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {userPhotos.map((photo) => (
                        <div 
                          key={photo.id}
                          className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                        >
                          <div className="relative aspect-square bg-muted">
                            <img 
                              src={photo.image_url || '/placeholder-photo.jpg'} 
                              alt={photo.title}
                              className="w-full h-full object-cover"
                            />
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
