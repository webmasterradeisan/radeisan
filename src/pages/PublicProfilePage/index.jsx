// src/pages/PublicProfilePage/index.jsx
// ✅ DISEÑO EXACTO SEGÚN LA IMAGEN
// ✅ CORREGIDO: Navegación de Reels para imitar el comportamiento del Dashboard (usando navigate)
// ✅ CORREGIDO: Supabase Query Error (400 Bad Request) y JS Error (Assignment to constant variable)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import Image from '../../components/AppImage'; // Asumiendo AppImage es un componente de imagen optimizado
import useIsMobile from '../../hooks/useIsMobile';

// ===========================================
// FUNCIONES HELPER
// ===========================================
const formatCount = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num;
};

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================
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

  // ===========================================
  // EFECTO: Carga de Datos del Perfil
  // ===========================================
  useEffect(() => {
    const fetchProfileAndContent = async () => {
      setLoading(true);
      setError(null);
      setProfileData(null);

      // 1. Obtener el ID de usuario (UUID)
      let userId = identifier;
      if (!isUUID(identifier)) {
        // Si no es un UUID, asumimos que es un username y lo buscamos
        const { data, error: userError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('username', identifier)
          .single();

        if (userError || !data) {
          setError('Perfil no encontrado.');
          setLoading(false);
          return;
        }
        userId = data.id;
      }

      // 2. Obtener datos del perfil y contenido
      // ✅ CORRECCIÓN 1: Usamos 'let' en la destructuración para permitir reasignación
      let [{ data: profileData, error: profileError }, { data: videosData, error: videosError }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('videos')
          // ✅ CORRECCIÓN 2: Eliminamos el JOIN fallido y volvemos a un SELECT simple
          .select('*') 
          .eq('user_id', userId) // Asumiendo que la columna de enlace es user_id
          .eq('is_published', true) // Filtro de publicación
          .order('created_at', { ascending: false }),
      ]);

      if (profileError || !profileData) {
        setError('Error al cargar los datos del perfil.');
        setLoading(false);
        return;
      }

      if (videosError) {
        console.error('Error fetching videos:', videosError);
        // ✅ Corregido: Ahora videosData es 'let' y se puede reasignar
        videosData = [];
      }

      setProfileData(profileData);
      setAllVideos(videosData);
      
      // Separar Reels (vertical) de Videos (horizontal)
      setReels(videosData.filter(v => v.orientation === 'vertical'));
      setHorizontalVideos(videosData.filter(v => v.orientation === 'horizontal'));
      
      // Simular fotos (en un sistema real se haría otra query)
      setUserPhotos(videosData.filter(v => v.type === 'image' || v.orientation === 'horizontal').slice(0, 8));


      // 3. Chequear estado de seguimiento (si el usuario actual está logueado)
      if (currentUser) {
        const { data: followData } = await supabase
          .from('followers')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('followed_id', userId);

        setFollowing(followData && followData.length > 0);
      }
      
      setLoading(false);
    };

    fetchProfileAndContent();
  }, [identifier, currentUser]);

  // ===========================================
  // HANDLERS
  // ===========================================
  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setFollowing(prev => !prev);
    
    // Optimistic UI update
    setProfileData(prev => ({
      ...prev,
      followers_count: prev.followers_count + (following ? -1 : 1)
    }));

    if (following) {
      // Unfollow
      await supabase
        .from('followers')
        .delete()
        .match({ follower_id: currentUser.id, followed_id: profileData.id });
    } else {
      // Follow
      await supabase
        .from('followers')
        .insert([{ follower_id: currentUser.id, followed_id: profileData.id }]);
    }
  };
  
  // ===========================================
  // RENDER
  // ===========================================
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">Error</h1>
          <p className="text-muted-foreground">{error || 'El perfil solicitado no existe.'}</p>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }
  
  const isOwner = currentUser?.id === profileData.id;

  return (
    <>
      <Helmet>
        <title>{profileData.name} (@{profileData.username}) | RADEISAN</title>
        <meta name="description" content={profileData.bio} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* ======================= HEADER DEL PERFIL ======================= */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-12 pb-8 border-b border-border">
              
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-muted shadow-lg overflow-hidden flex items-center justify-center">
                  {profileData.avatar_url ? (
                    <img 
                      src={profileData.avatar_url} 
                      alt={profileData.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon name="User" size={48} className="text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {/* Información y Botones */}
              <div className="flex-grow text-center sm:text-left">
                {/* Nombre y Username */}
                <h1 className="text-3xl font-bold text-foreground mb-1">{profileData.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">@{profileData.username}</p>
                
                {/* Estadísticas */}
                <div className="flex justify-center sm:justify-start space-x-8 mb-4">
                  <div className="text-center">
                    <span className="font-bold text-lg">{formatCount(allVideos.length)}</span>
                    <p className="text-sm text-muted-foreground">Videos</p>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-lg">{formatCount(profileData.followers_count || 0)}</span>
                    <p className="text-sm text-muted-foreground">Seguidores</p>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-lg">{formatCount(profileData.following_count || 0)}</span>
                    <p className="text-sm text-muted-foreground">Siguiendo</p>
                  </div>
                </div>
                
                {/* Bio */}
                <p className="text-foreground max-w-lg mx-auto sm:mx-0 mb-6">{profileData.bio || '¡Hola! Este es mi perfil.'}</p>

                {/* Acciones */}
                <div className="flex justify-center sm:justify-start space-x-4">
                  {isOwner ? (
                    <Button 
                      onClick={() => navigate('/profile')}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Icon name="Edit" size={16} className="mr-2" />
                      Editar Perfil
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={handleFollowToggle}
                        variant={following ? 'outline' : 'default'}
                        className="w-full sm:w-auto"
                      >
                        <Icon name={following ? 'UserCheck' : 'UserPlus'} size={16} className="mr-2" />
                        {following ? 'Siguiendo' : 'Seguir'}
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="w-full sm:w-auto"
                      >
                        <Icon name="Send" size={16} className="mr-2" />
                        Mensaje
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ======================= TABS DE CONTENIDO ======================= */}
            <div className="mt-8">
              <div className="flex justify-center border-b border-border space-x-6 sm:space-x-12">
                
                {/* Pestaña Videos (Horizontal) */}
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`py-3 text-sm font-semibold transition-colors ${
                    activeTab === 'videos'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="hidden sm:inline">Videos</span>
                  <span className="sm:hidden"><Icon name="Monitor" size={18} /></span>
                </button>
                
                {/* Pestaña Reels (Vertical) */}
                <button
                  onClick={() => setActiveTab('reels')}
                  className={`py-3 text-sm font-semibold transition-colors ${
                    activeTab === 'reels'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="hidden sm:inline">Reels</span>
                  <span className="sm:hidden"><Icon name="Smartphone" size={18} /></span>
                </button>
                
                {/* Pestaña Fotos (Ejemplo) */}
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`py-3 text-sm font-semibold transition-colors ${
                    activeTab === 'photos'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="hidden sm:inline">Fotos</span>
                  <span className="sm:hidden"><Icon name="Image" size={18} /></span>
                </button>
              </div>

              {/* ======================= CONTENIDO DE LAS PESTAÑAS ======================= */}
              <div className="space-y-6 mt-6">
                
                {/* Content - Reels (Vertical Videos) */}
                {activeTab === 'reels' && (
                  <div>
                    {reels.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Icon name="Smartphone" size={32} className="text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">Sin Reels aún</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {reels.map((reel) => (
                          <div 
                            key={reel.id}
                            // Usamos onClick + navigate para replicar la navegación imperativa a la vista de reproducción.
                            onClick={() => navigate(`/reels?id=${reel.id}`)}
                            className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                            role="button"
                            tabIndex={0}
                          >
                            <div className="relative aspect-[9/16] bg-muted">
                              {/* Usamos el componente Image para optimización */}
                              <Image 
                                src={reel.thumbnail_url || '/placeholder-reel.jpg'} 
                                alt={reel.title}
                                className="w-full h-full object-cover"
                              />
                              {/* Overlay con datos (views) */}
                              <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-2 text-white/90">
                                <div className="flex items-center space-x-1 text-sm font-semibold">
                                  <Icon name="Eye" size={14} />
                                  <span>{formatCount(reel.views_count || 0)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Content - Videos (Horizontal Videos) */}
                {activeTab === 'videos' && (
                  <div>
                    {horizontalVideos.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Icon name="Monitor" size={32} className="text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">Sin videos largos aún</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {horizontalVideos.map((video) => (
                          <Link 
                            key={video.id}
                            to={`/video/${video.id}`}
                            className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow block"
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
                              <h3 className="font-semibold text-base line-clamp-2 mb-1">{video.title}</h3>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span className="flex items-center space-x-1">
                                  <Icon name="Eye" size={14} />
                                  <span>{formatCount(video.views_count || 0)}</span>
                                </span>
                                <span className="text-xs">•</span>
                                <span className="text-xs">{new Date(video.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Content - Fotos (Placeholder) */}
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
                                src={photo.thumbnail_url || '/placeholder-photo.jpg'} 
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
          </div>
        </main>
      </div>
    </>
  );
};

export default PublicProfilePage;
