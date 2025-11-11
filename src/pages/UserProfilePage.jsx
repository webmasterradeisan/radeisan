// src/pages/UserProfilePage/index.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// ✅ Contextos y Supabase
import { supabase } from '../lib/supabase'; 
import { useAuth } from '../contexts/AuthContext';

// ✅ Componentes UI
import Header from '../components/ui/Header';
import Button from '../components/ui/Button';
import Icon from '../components/AppIcon';
import Loader from '../components/ui/Loader'; 

// 🚨 CORRECCIÓN FINAL DE RUTA: Asumiendo que ProfileTabs.jsx está directamente en user-profile-settings/
import ProfileTabs from '../user-profile-settings/ProfileTabs'; 

// ===============================
// HOOKS DE CONTENIDO (PLACEHOLDERS REUTILIZADOS)
// ===============================

// Función genérica de conteo de contenido (solo para simular)
const useUserContent = (userId, type) => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Función para obtener el título correcto para la simulación
    const getContentTitle = (index) => {
        if (type === 'videos') return `Video Horizontal #${index + 1}`;
        if (type === 'reels') return `Reel Viral #${index + 1}`;
        if (type === 'photos') return `Foto de Perfil #${index + 1}`;
        return 'Contenido';
    };

    const fetchContent = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            // Simulación de datos:
            const simulationLength = type === 'photos' ? 6 : 4;
            const simulatedData = Array.from({ length: simulationLength }).map((_, index) => ({
                id: `${type}-${userId.slice(0, 8)}-${index}`,
                user_id: userId,
                title: getContentTitle(index),
                views_count: Math.floor(Math.random() * 10000)
            }));
            
            setContent(simulatedData);

        } catch (error) {
             console.error(`Error fetching ${type}:`, error);
             setContent([]);
        } finally {
            setLoading(false);
        }
    }, [userId, type]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    return { content, loading, refresh: fetchContent };
};

const useUserVideos = (userId) => useUserContent(userId, 'videos');
const useUserReels = (userId) => useUserContent(userId, 'reels');
const useUserPhotos = (userId) => useUserContent(userId, 'photos');


// ===============================
// HOOK PERSONALIZADO PARA PERFIL PÚBLICO
// ===============================

const usePublicProfile = (userIdOrUsername) => {
    const { user: currentUser } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!userIdOrUsername) return;

        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('user_profiles')
                // Consulta asumiendo las columnas añadidas
                .select('*, followers_count, following_count') 

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername);

            if (isUUID) {
                query = query.eq('id', userIdOrUsername);
            } else {
                query = query.eq('username', userIdOrUsername);
            }

            const { data, error: fetchError } = await query.single();

            if (fetchError && fetchError.code === 'PGRST116') {
                setError('Perfil no encontrado (404).');
                setProfileData(null);
                return;
            }
            if (fetchError) throw fetchError;
            
            setProfileData(data);
            
            // Comprobar si el usuario actual ya sigue a este perfil
            if (currentUser?.id && data?.id) {
                const { count } = await supabase
                    .from('user_follows')
                    .select('id', { count: 'exact', head: true })
                    .eq('follower_id', currentUser.id)
                    .eq('following_id', data.id);
                setIsFollowing(count > 0);
            }

        } catch (err) {
            console.error('Error fetching public profile:', err);
            setError('Error al cargar perfil.'); 
        } finally {
            setLoading(false);
        }
    }, [userIdOrUsername, currentUser]);
    
    // Función para manejar el seguimiento (usada por el botón)
    const toggleFollow = useCallback(async () => {
        if (!currentUser || !profileData) return;

        try {
            if (isFollowing) {
                // Dejar de seguir
                const { error: unfollowError } = await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', currentUser.id)
                    .eq('following_id', profileData.id);

                if (unfollowError) throw unfollowError;
                
            } else {
                // Seguir
                const { error: followError } = await supabase
                    .from('user_follows')
                    .insert({
                        follower_id: currentUser.id,
                        following_id: profileData.id
                    });
                
                if (followError) throw followError;
            }
            
            // Invertir el estado
            setIsFollowing(!isFollowing);
            
            // Refrescar los datos para actualizar el contador
            await fetchProfile(); 

        } catch (err) {
            console.error('Error toggling follow:', err);
            // Manejo de errores
        }
    }, [currentUser, profileData, isFollowing, fetchProfile]);


    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        profileData,
        loading,
        error,
        isFollowing,
        toggleFollow,
        refresh: fetchProfile,
    };
};


// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const UserProfilePage = () => {
    // Obtener el ID/Username del perfil a ver desde la URL
    const { userIdOrUsername } = useParams(); 
    const { user: currentUser, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    
    // Custom hook para obtener los datos del perfil
    const { 
        profileData, 
        loading: profileLoading, 
        error: profileError, 
        isFollowing, 
        toggleFollow,
        refresh: refreshProfile 
    } = usePublicProfile(userIdOrUsername);
    
    const [activeTab, setActiveTab] = useState('videos');

    // Usar los hooks de contenido
    const { content: videos, loading: videosLoading, refresh: refreshVideos } = useUserVideos(profileData?.id);
    const { content: reels, loading: reelsLoading, refresh: refreshReels } = useUserReels(profileData?.id);
    const { content: photos, loading: photosLoading, refresh: refreshPhotos } = useUserPhotos(profileData?.id);

    // Contadores de contenido
    const videosCount = videos.length;
    const reelsCount = reels.length;
    const photosCount = photos.length;

    // Determinar si es el perfil del usuario logueado
    const isOwnProfile = currentUser && profileData && currentUser.id === profileData.id;

    if (profileLoading) {
        // 🚨 LOADER INLINE
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                <p className="text-gray-600 text-sm">Cargando perfil...</p>
              </div>
            </div>
        );
    }

    if (profileError) {
        return (
            <div className="text-center p-8 mt-10">
                <Icon name="AlertTriangle" size={36} className="text-red-500 mb-4" />
                <h1 className="text-xl font-bold">{profileError}</h1>
                <p className="text-muted-foreground">Verifica la URL o si el perfil es público.</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-4">
                    Volver al Dashboard
                </Button>
            </div>
        );
    }
    
    if (!profileData) {
        return (
            <div className="text-center p-8 mt-10">
                <h1 className="text-xl font-bold">Perfil no encontrado.</h1>
            </div>
        );
    }


    return (
        <>
            <Helmet>
                <title>{profileData.username || profileData.full_name} | Perfil</title>
            </Helmet>
            
            <Header />

            <main className="max-w-4xl mx-auto py-8 px-4 md:px-0">
                {/* Cabecera del Perfil */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        
                        {/* Avatar y Cover */}
                        <div className="relative w-full h-40 md:w-32 md:h-32 flex-shrink-0">
                            <div className="w-full h-full rounded-lg overflow-hidden bg-gray-200">
                                {/* Imagen de portada o placeholder */}
                                {profileData.cover_image_url ? (
                                    <img 
                                        src={profileData.cover_image_url} 
                                        alt="Cover" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500">
                                        <Icon name="Image" size={30} />
                                    </div>
                                )}
                            </div>
                            {/* Avatar sobre la imagen de portada (posicionamiento absoluto) */}
                            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-20 md:h-20 rounded-full border-4 border-white shadow-md bg-gray-500 overflow-hidden">
                                {profileData.avatar_url ? (
                                    <img 
                                        src={profileData.avatar_url} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Icon name="User" size={30} className="w-full h-full p-4 text-white" />
                                )}
                            </div>
                        </div>

                        {/* Información del Usuario */}
                        <div className="flex-1 text-center md:text-left pt-6 md:pt-0">
                            <h1 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
                                {profileData.full_name}
                                {profileData.is_verified && <Icon name="CheckCircle" size={20} className="text-blue-500" title="Verificado" />}
                            </h1>
                            <p className="text-muted-foreground text-lg mb-2">@{profileData.username}</p>
                            
                            {/* Botón Seguir/Editar */}
                            <div className="mt-3">
                                {isOwnProfile ? (
                                    <Link to="/profile" className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                                        <Icon name="Edit" size={18} />
                                        Editar Perfil
                                    </Link>
                                ) : isAuthenticated ? (
                                    <Button 
                                        onClick={toggleFollow}
                                        variant={isFollowing ? 'outline' : 'primary'}
                                        className="min-w-[120px]"
                                    >
                                        {isFollowing ? 'Siguiendo' : 'Seguir'}
                                    </Button>
                                ) : (
                                    <Link to="/login" className="text-blue-500 hover:underline">Inicia sesión para seguir</Link>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Estadísticas */}
                    <div className="mt-6 border-t pt-4 flex justify-around">
                        <div className="text-center">
                            <p className="text-2xl font-bold">
                                {profileData.followers_count !== undefined ? profileData.followers_count : 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Seguidores</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">
                                {profileData.following_count !== undefined ? profileData.following_count : 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Siguiendo</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">
                                {videosCount + reelsCount + photosCount}
                            </p>
                            <p className="text-sm text-muted-foreground">Contenido</p>
                        </div>
                    </div>
                </div>

                {/* Pestañas de Contenido */}
                <ProfileTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    counts={{
                        videos: videosCount,
                        reels: reelsCount,
                        photos: photosCount,
                    }}
                    content={{
                        videos: { data: videos, loading: videosLoading, refresh: refreshVideos },
                        reels: { data: reels, loading: reelsLoading, refresh: refreshReels },
                        photos: { data: photos, loading: photosLoading, refresh: refreshPhotos },
                    }}
                    userId={profileData.id}
                    isOwnProfile={isOwnProfile}
                />

            </main>
        </>
    );
};

export default UserProfilePage;
