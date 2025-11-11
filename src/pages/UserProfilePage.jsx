// src/pages/UserProfilePage.jsx
// ============================================================================
// PÁGINA: UserProfilePage - Vista pública/protegida del perfil de otro usuario
// BASADO EN: user-profile-settings/index.jsx (Reutilizando Hooks y Lógica de Contenido)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';

// 🚨 REUSO DE COMPONENTES Y LÓGICA DE CONTENIDO DESDE user-profile-settings/index.jsx
// Asumo que estos componentes están disponibles en las rutas relativas adecuadas:
import { 
    useUserVideos, 
    useUserReels, 
    useUserPhotos, 
    VideoGridComponent, 
    ReelsGridComponent, 
    PhotoGrid 
} from '../pages/user-profile-settings/index.jsx'; // Importamos los componentes y hooks de contenido

// ===============================
// HOOK PERSONALIZADO PARA PERFIL PÚBLICO
// ===============================

const usePublicProfile = (userIdOrUsername) => {
    const { user: currentUser } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        if (!userIdOrUsername) return;

        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('user_profiles')
                .select('*, followers_count, following_count, videos_count, photos_count') 

            // Determinar si el input es un UUID (ID) o un string (USERNAME)
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername);

            if (isUUID) {
                query = query.eq('id', userIdOrUsername);
            } else {
                query = query.eq('username', userIdOrUsername);
            }

            const { data, error: fetchError } = await query.single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    setError('Perfil no encontrado (404).');
                } else {
                    throw fetchError;
                }
            }
            
            if (!data) {
                 setError('Perfil no encontrado.');
            }
            
            // 🚨 Añadir si el usuario actual sigue a este perfil
            let isFollowing = false;
            if (currentUser?.id && data) {
                const { count } = await supabase
                    .from('user_follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('follower_id', currentUser.id)
                    .eq('following_id', data.id);
                isFollowing = count > 0;
            }

            setProfileData({ ...data, isFollowing });

        } catch (err) {
            console.error('Error fetching public profile:', err);
            setError(err.message || 'Error desconocido al cargar el perfil.');
        } finally {
            setLoading(false);
        }
    }, [userIdOrUsername, currentUser]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        profileData,
        loading,
        error,
        refresh: fetchProfile,
    };
};

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const UserProfilePage = () => {
    const { userIdOrUsername } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState('videos');

    // 1. Cargar datos del perfil de la URL
    const { 
        profileData: publicProfile, 
        loading: profileLoading, 
        error: profileError,
        refresh: refreshProfile 
    } = usePublicProfile(userIdOrUsername);

    const isOwner = currentUser?.id === publicProfile?.id;
    const targetUserId = publicProfile?.id;
    
    // 🚨 Redirección si el usuario logueado está viendo su propio perfil
    useEffect(() => {
        if (isOwner && isAuthenticated) {
            // Redirige al perfil de configuración propio para consistencia
            navigate('/profile', { replace: true });
        }
    }, [isOwner, isAuthenticated, navigate]);

    // 2. Reutilizar hooks de contenido (usando targetUserId)
    const {
        videos,
        stats: videoStats,
        loading: videosLoading,
        error: videosError,
        refresh: refreshVideos
    } = useUserVideos(targetUserId);

    const {
        reels,
        stats: reelStats,
        loading: reelsLoading,
        error: reelsError,
        refresh: refreshReels
    } = useUserReels(targetUserId);

    const {
        photos,
        loading: photosLoading,
        error: photosError,
        refresh: refreshPhotos
    } = useUserPhotos(targetUserId);

    // 3. Handlers de interacción (Seguir/Mensaje)
    
    const handleToggleFollow = useCallback(async () => {
        if (!currentUser || !targetUserId) return;
        
        try {
            if (publicProfile.isFollowing) {
                // Dejar de seguir (Optimista)
                publicProfile.isFollowing = false; 
                await supabase.from('user_follows').delete()
                    .eq('follower_id', currentUser.id).eq('following_id', targetUserId);
            } else {
                // Seguir (Optimista)
                publicProfile.isFollowing = true; 
                await supabase.from('user_follows').insert([
                    { follower_id: currentUser.id, following_id: targetUserId }
                ]);
            }
            refreshProfile(); // Refrescar para obtener conteos actualizados
        } catch (error) {
            console.error('Error al seguir/dejar de seguir:', error);
            alert('Error al procesar la acción de seguir.');
        }
    }, [currentUser, targetUserId, publicProfile, refreshProfile]);

    const handleMessage = () => {
        // Lógica de navegación a la sala de chat
        console.log(`Navegando al chat con ${publicProfile.username}`);
        alert(`Implementar navegación al chat con @${publicProfile.username}`);
    };

    // 4. Mapeo de datos para el render
    const userData = useMemo(() => {
        if (!publicProfile) return null;

        const totalViews = (videoStats.totalViews || 0) + (reelStats.totalViews || 0);
        // Asignamos 0 a likes/comments por simplicidad, la DB real calcularía esto.
        const totalLikes = 0; 
        const totalComments = 0; 

        return {
            ...publicProfile,
            videosCount: videos.length,
            reelsCount: reels.length,
            photosCount: photos.length,
            totalViews,
            totalLikes,
            totalComments,
        };
    }, [publicProfile, videos, reels, photos, videoStats, reelStats]);


    const tabCounts = useMemo(() => ({
        videos: videos.length,
        reels: reels.length,
        photos: photos.length,
    }), [videos.length, reels.length, photos.length]);


    // 5. Renderizado de Contenido de Pestañas
    const renderTabContent = () => {
        switch (activeTab) {
            case 'videos':
                return (
                    <VideoGridComponent
                        videos={videos} 
                        loading={videosLoading}
                        isOwner={false} // Siempre es false en vista pública
                        showActions={false}
                        emptyMessage="El usuario no tiene videos"
                        emptyDescription="Contenido de video horizontal"
                        // Pasamos el error del fetcher de videos
                        fetchError={videosError} 
                    />
                );
            case 'reels':
                return (
                    <ReelsGridComponent
                        reels={reels} 
                        loading={reelsLoading}
                        isOwner={false}
                        showActions={false}
                        emptyMessage="El usuario no tiene reels"
                        emptyDescription="Contenido de video vertical (Reels)"
                        // Pasamos el error del fetcher de reels
                        fetchError={reelsError}
                    />
                );
            case 'photos':
                return (
                    <PhotoGrid
                        photos={photos}
                        loading={photosLoading}
                        isOwner={false}
                        showUploadButton={false}
                        fetchError={photosError}
                        onPhotoClick={(photoId) => console.log('Click en foto de otro usuario:', photoId)} // Sin modal de detalle en esta versión
                    />
                );
            default:
                return null;
        }
    };

    // ===============================
    // RENDER PRINCIPAL
    // ===============================

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen pt-16">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground ml-3">Cargando perfil...</p>
            </div>
        );
    }
    
    if (profileError || !userData) {
        return (
            <div className="text-center pt-32 p-4">
                <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-red-500">Error al cargar perfil</h1>
                <p className="text-muted-foreground mt-2">{profileError || 'El perfil no fue encontrado.'}</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-6">
                    Volver al Dashboard
                </Button>
            </div>
        );
    }
    
    // Si el usuario ve su propio perfil, ya fue redirigido por el useEffect.
    // Si sigue aquí, es la vista pública/protegida de otro usuario.

    return (
        <>
            <Helmet>
                <title>{userData.name} (@{userData.username}) | RADEISAN</title>
                <meta name="description" content={`Perfil de ${userData.name}. Sigue a @${userData.username} para ver sus ${userData.videosCount} videos y ${userData.reelsCount} reels.`} />
            </Helmet>
            
            <div className="pt-20 pb-20 p-4 max-w-4xl mx-auto"> 
                
                {/* CABECERA DEL PERFIL PÚBLICO */}
                <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-8 mb-8 border-b pb-6">
                    <img 
                        src={userData.avatar || '/default-avatar.png'} 
                        alt={userData.username} 
                        className="w-28 h-28 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-border shadow-lg mb-4 sm:mb-0"
                    />
                    
                    <div className="text-center sm:text-left flex-grow">
                        <h1 className="text-3xl font-extrabold text-foreground flex items-center justify-center sm:justify-start space-x-2">
                            <span>{userData.name}</span>
                            {userData.is_verified && (
                                <Icon name="CheckCircle" size={24} className="text-blue-500" title="Verificado" />
                            )}
                        </h1>
                        <p className="text-muted-foreground text-lg mt-1">@{userData.username}</p>
                        
                        {/* Contadores */}
                        <div className="flex justify-center sm:justify-start space-x-6 mt-3 text-sm">
                            <p className="font-medium text-foreground">
                                <span className="font-bold text-primary">{userData.videosCount + userData.reelsCount + userData.photosCount}</span> Contenido
                            </p>
                            <p className="font-medium text-foreground">
                                <span className="font-bold text-primary">{userData.followers_count?.toLocaleString() || 0}</span> Seguidores
                            </p>
                            <p className="font-medium text-foreground">
                                <span className="font-bold text-primary">{userData.following_count?.toLocaleString() || 0}</span> Siguiendo
                            </p>
                        </div>
                        
                        {/* Botones de Acción */}
                        <div className="mt-4 flex justify-center sm:justify-start space-x-3">
                            {/* Botón Seguir/Dejar de Seguir */}
                            <Button 
                                variant={userData.isFollowing ? "outline" : "default"}
                                onClick={handleToggleFollow}
                            >
                                <Icon 
                                    name={userData.isFollowing ? 'UserMinus' : 'UserPlus'} 
                                    size={16} 
                                    className="mr-2"
                                />
                                {userData.isFollowing ? 'Siguiendo' : 'Seguir'}
                            </Button>
                            
                            {/* Botón de Mensaje */}
                            <Button 
                                variant="secondary"
                                onClick={handleMessage}
                            >
                                <Icon name="MessageSquare" size={16} className="mr-2" />
                                Mensaje
                            </Button>
                        </div>
                    </div>
                </div>
                
                {/* BIOGRAFÍA */}
                <div className="mb-8 p-4 bg-muted/50 rounded-lg">
                    <p className="text-foreground font-medium mb-1">Acerca de</p>
                    <p className="text-muted-foreground">{userData.bio || 'Este usuario aún no ha escrito una biografía.'}</p>
                </div>
                
                {/* PESTAÑAS DE CONTENIDO */}
                <div className="mb-8">
                    <div className="border-b border-border">
                        <nav className="flex space-x-8 overflow-x-auto">
                            {[
                                { id: 'videos', label: 'Videos', icon: 'Monitor', count: tabCounts.videos, color: 'text-blue-600' },
                                { id: 'reels', label: 'Reels', icon: 'Smartphone', count: tabCounts.reels, color: 'text-pink-600' },
                                { id: 'photos', label: 'Fotos', icon: 'Image', count: tabCounts.photos, color: 'text-green-600' },
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
                                    <Icon 
                                        name={tab.icon} 
                                        size={16} 
                                        className={activeTab === tab.id ? 'text-primary' : tab.color}
                                    />
                                    <span>{tab.label}</span>
                                    <span className={`
                                        px-2 py-1 rounded-full text-xs
                                        ${activeTab === tab.id 
                                            ? 'bg-primary/10 text-primary' 
                                            : 'bg-muted text-muted-foreground'
                                        }
                                    `}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
                
                {/* CONTENIDO DE LA PESTAÑA */}
                <div className="min-h-[400px]">
                    {renderTabContent()}
                </div>
                
                {/* Información de la Ruta (DEBUG) */}
                <div className="mt-10 p-4 bg-primary/10 border border-primary/20 text-sm rounded-lg text-primary">
                    <p className="font-bold">Información de la Ruta (DEBUG):</p>
                    <p>La página se cargó para el usuario con el identificador: **`{userIdOrUsername}`**.</p>
                    <p>ID de usuario cargado: **`{targetUserId || 'N/A'}`**</p>
                    <p className="mt-2 text-xs">
                        **AVISO:** Esta ruta está protegida por `ProtectedRoute` en `Routes.jsx`, lo que asegura que solo usuarios logueados puedan acceder a ella.
                    </p>
                </div>

            </div>
        </>
    );
};

export default UserProfilePage;
