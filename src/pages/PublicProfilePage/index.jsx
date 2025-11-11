// src/pages/PublicProfilePage/index.jsx
// ✅ ACTUALIZADO con estructura REAL de user_profiles y sistema de follows

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import ProfileTabs from '../../components/profile/ProfileTabs';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import useIsMobile from '../../hooks/useIsMobile';

const PublicProfilePage = () => {
  const { identifier } = useParams(); // Puede ser username o UUID
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isMobile = useIsMobile();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [following, setFollowing] = useState(false);
  const [userVideos, setUserVideos] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);

  // ===============================
  // FUNCIÓN PARA DETECTAR SI ES UUID
  // ===============================
  const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // ===============================
  // CARGAR PERFIL DEL USUARIO
  // ===============================
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      let profileQuery;

      // Determinar si buscar por username o por UUID
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

      // Verificar si es el perfil del usuario actual
      const isOwn = currentUser?.id === profile.id;
      setIsOwnProfile(isOwn);

      // Si es el perfil propio, redirigir a /profile
      if (isOwn) {
        navigate('/profile');
        return;
      }

      // ✅ Cargar videos del usuario
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // ✅ Cargar fotos del usuario
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // ✅ Verificar si el usuario actual sigue a este perfil (usar user_follows)
      if (currentUser) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
          .single();

        setFollowing(!!followData);
      }

      // ✅ Contar videos (si no está en la BD)
      const videosCount = videosData?.length || 0;

      // ✅ Generar avatar con fallback
      const avatarUrl = profile.avatar_url || profile.avatar || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username || 'User')}&background=6366f1&color=ffffff&size=128`;

      // ✅ Calcular puntos totales (free_points + premium_points)
      const totalPoints = (profile.free_points || 0) + (profile.premium_points || 0);

      setProfileData({
        ...profile,
        // Normalizar campos para compatibilidad
        name: profile.full_name || profile.username,
        username: profile.username || `user_${profile.id.substring(0, 8)}`,
        avatar: avatarUrl,
        coverImage: profile.cover_image_url,
        bio: profile.bio || `Usuario de RADEISAN desde ${new Date(profile.created_at).toLocaleDateString()}`,
        
        // Stats ya vienen de la BD
        followersCount: profile.followers_count || 0,
        followingCount: profile.following_count || 0,
        photosCount: profile.photos_count || 0,
        videosCount: videosCount,
        
        // Flags
        isVerified: profile.is_verified || false,
        isBusinessAccount: profile.is_business_account || false,
        
        // Puntos
        totalPoints: totalPoints,
        freePoints: profile.free_points || 0,
        premiumPoints: profile.premium_points || 0
      });

      setUserVideos(videosData || []);
      setUserPhotos(photosData || []);
      setLoading(false);

    } catch (err) {
      console.error('❌ Error al cargar perfil:', err);
      setError('Error al cargar el perfil');
      setLoading(false);
    }
  };

  // ===============================
  // SEGUIR/DEJAR DE SEGUIR (igual que VideoPlayerPage)
  // ===============================
  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!profileData?.id) return;

    try {
      if (following) {
        // Dejar de seguir
        setFollowing(false);
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileData.id);

        // Actualizar contador localmente
        setProfileData(prev => ({
          ...prev,
          followersCount: Math.max(0, prev.followersCount - 1)
        }));
      } else {
        // Seguir
        setFollowing(true);
        await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profileData.id
          });

        // Actualizar contador localmente
        setProfileData(prev => ({
          ...prev,
          followersCount: prev.followersCount + 1
        }));

        // Opcional: rastrear misión si tienes ese sistema
        // try {
        //   trackFollowUser(profileData.id);
        // } catch (missionError) {
        //   console.error('Error al registrar misión:', missionError);
        // }
      }
    } catch (err) {
      console.error('❌ Error al seguir/dejar de seguir:', err);
      // Revertir estado en caso de error
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
          <div className="max-w-6xl mx-auto">
            {/* Header del Perfil */}
            <div className="bg-card border-b border-border">
              {/* Cover Image */}
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

              {/* Profile Info */}
              <div className="px-4 sm:px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-12 sm:-mt-16">
                  {/* Avatar and Basic Info */}
                  <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4">
                    <div className="relative mb-4 sm:mb-0">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-card overflow-hidden shadow-elevation-2">
                        <img 
                          src={profileData.avatar} 
                          alt={profileData.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">
                          {profileData.name}
                        </h1>
                        {profileData.isVerified && (
                          <Icon name="BadgeCheck" size={20} color="var(--color-primary)" />
                        )}
                        {profileData.isBusinessAccount && (
                          <div className="flex items-center space-x-1 px-2 py-0.5 bg-accent/10 rounded-full">
                            <Icon name="Building2" size={12} color="var(--color-accent)" />
                            <span className="text-xs font-medium text-accent">Business</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">@{profileData.username}</p>
                      
                      {profileData.bio && (
                        <p className="text-sm text-foreground mb-3 max-w-md">
                          {profileData.bio}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-foreground">{profileData.followersCount?.toLocaleString()}</span>
                          <span className="text-muted-foreground">seguidores</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-foreground">{profileData.followingCount?.toLocaleString()}</span>
                          <span className="text-muted-foreground">siguiendo</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-foreground">{profileData.videosCount}</span>
                          <span className="text-muted-foreground">videos</span>
                        </div>
                        {profileData.photosCount > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className="font-medium text-foreground">{profileData.photosCount}</span>
                            <span className="text-muted-foreground">fotos</span>
                          </div>
                        )}
                      </div>

                      {/* Mostrar puntos totales si hay */}
                      {profileData.totalPoints > 0 && (
                        <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                          <Icon name="Coins" size={14} color="var(--color-accent)" />
                          <span>{profileData.totalPoints.toLocaleString()} puntos</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                    <Button
                      variant={following ? "outline" : "default"}
                      size="sm"
                      onClick={handleFollowToggle}
                      iconName={following ? "UserMinus" : "UserPlus"}
                      iconPosition="left"
                    >
                      {following ? 'Siguiendo' : 'Seguir'}
                    </Button>

                    {/* Botón de mensaje (placeholder para futuro) */}
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="MessageCircle"
                      iconPosition="left"
                      onClick={() => {
                        // TODO: Implementar sistema de mensajes
                        alert('Sistema de mensajes próximamente');
                      }}
                    >
                      {isMobile ? '' : 'Mensaje'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs con contenido del usuario */}
            <div className="px-4 sm:px-6 py-6">
              {/* Mensaje si no hay contenido */}
              {userVideos.length === 0 && userPhotos.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="Image" size={32} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Sin contenido aún
                  </h3>
                  <p className="text-muted-foreground">
                    {profileData.name} no ha publicado ningún contenido todavía.
                  </p>
                </div>
              )}

              {/* Tabs de contenido (si existen) */}
              {(userVideos.length > 0 || userPhotos.length > 0) && (
                <ProfileTabs
                  videos={userVideos}
                  photos={userPhotos}
                  isOwnProfile={false}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default PublicProfilePage;
