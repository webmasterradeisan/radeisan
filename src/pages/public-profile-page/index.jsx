// src/pages/public-profile-page/index.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/ui/Header';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import ProfileTabs from '../user-profile-settings/components/ProfileTabs'; // Reusamos las pestañas

// Importa los mismos hooks que UserProfileSettings, pero modificados para cargar por username
import { useAuth } from '../../../contexts/AuthContext';
import { useUserVideos, useUserReels, useUserPhotos } from '../user-profile-settings/index.jsx'; // Asumimos que los hooks de fetch están exportados en index.jsx

// ===============================
// HOOK PARA PERFIL PÚBLICO (Carga por username)
// ===============================
const usePublicProfile = (username) => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        if (!username) return;

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('username', username)
                .maybeSingle(); // Usamos maybeSingle para manejar el 404 de usuario

            if (fetchError) throw fetchError;
            
            setProfileData(data);

        } catch (err) {
            console.error(`Error fetching profile for ${username}:`, err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [username]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        profileData,
        loading,
        error,
        refreshProfile: fetchProfile
    };
};


const PublicProfilePage = () => {
    const { username } = useParams();
    const { user: currentUser } = useAuth(); // Usuario que está viendo la página
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('videos');

    // Carga los datos del perfil público
    const { profileData, loading: profileLoading, error: profileError } = usePublicProfile(username);
    
    // Si el perfil se cargó, obtenemos su ID para el resto de los fetches
    const profileUserId = profileData?.id; 

    // Reusamos los hooks de fetch de contenido (asumiendo que están exportados)
    const { videos, loading: videosLoading } = useUserVideos(profileUserId);
    const { reels, loading: reelsLoading } = useUserReels(profileUserId);
    const { photos, loading: photosLoading } = useUserPhotos(profileUserId); 
    
    // Verificamos si el usuario logueado es el dueño de este perfil
    const isOwnerViewing = currentUser?.id === profileUserId;

    // Redirección si el dueño accede a su perfil público:
    useEffect(() => {
        if (isOwnerViewing && profileUserId) {
            // Navegar a la página de configuración privada
            navigate('/settings/profile', { replace: true });
        }
    }, [isOwnerViewing, profileUserId, navigate]);


    // Formatear datos del usuario (similar al UserProfileSettings)
    const userData = useMemo(() => {
        if (!profileData) return null;

        return {
            name: profileData.full_name || 'Usuario',
            username: profileData.username || '',
            bio: profileData.bio || '',
            avatar: profileData.avatar_url,
            coverImage: profileData.cover_image_url,
            isVerified: profileData.is_verified || false,
            // Contadores de contenido
            videosCount: videos.length,
            reelsCount: reels.length,
            photosCount: photos.length,
            // ... (otras stats si las necesitas)
        };
    }, [profileData, videos.length, reels.length, photos.length]);
    

    // Calcular contadores para tabs públicos
    const tabCounts = useMemo(() => ({
        videos: videos.length,
        reels: reels.length,
        photos: photos.length,
    }), [videos.length, reels.length, photos.length]);


    // ===============================
    // RENDERIZADO
    // ===============================

    if (profileLoading) {
        return (
            // ... (Implementar spinner de carga)
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p>Cargando perfil...</p>
            </div>
        );
    }
    
    if (profileError || !profileData) {
        return (
            // 🚨 Mostrar el 404 si el usuario no existe o hubo error de fetch
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold">404</h1>
                    <p className="text-xl">Usuario "{username}" no encontrado.</p>
                </div>
            </div>
        );
    }

    // Función simple de renderizado de contenido
    const renderTabContent = () => {
        switch (activeTab) {
            case 'videos':
                // Se deben usar VideoGridComponent/ReelsGridComponent (asumimos que existen)
                return <p>Contenido de Videos de {username}</p>;
            case 'reels':
                return <p>Contenido de Reels de {username}</p>;
            case 'photos':
                return <p>Contenido de Fotos de {username}</p>;
            default:
                return null;
        }
    };


    return (
        <>
            <Helmet>
                <title>Perfil de @{username} | RADEISAN</title>
            </Helmet>

            <Header />
            <main className="pt-32 pb-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Header del Perfil Público */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden mb-8 shadow-sm">
                        
                        {/* Imagen de Portada (Placeholder) */}
                        <div className="h-60 bg-gradient-to-br from-gray-200 to-gray-400" />
                        
                        {/* Info Principal */}
                        <div className="px-6 py-6">
                            <div className="flex items-start space-x-6">
                                {/* Avatar */}
                                <div className="w-40 h-40 rounded-full border-4 border-card bg-background overflow-hidden shadow-lg -mt-20">
                                    <img src={userData.avatar} alt={userData.name} className="w-full h-full object-cover"/>
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-4">
                                    <h1 className="text-3xl font-bold text-foreground mb-1">
                                        {userData.name}
                                    </h1>
                                    <p className="text-muted-foreground mb-3">@{userData.username}</p>
                                    
                                    {userData.bio && (
                                        <p className="text-foreground mb-4 max-w-2xl">
                                            {userData.bio}
                                        </p>
                                    )}

                                    {/* Botón de Acción (Seguir) */}
                                    {currentUser?.id !== profileUserId && (
                                        <Button size="sm">
                                            <Icon name="UserPlus" size={16} className="mr-2" />
                                            Seguir
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Pestañas de Contenido */}
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
                                        <Icon name={tab.icon} size={16} className={activeTab === tab.id ? 'text-primary' : tab.color} />
                                        <span>{tab.label}</span>
                                        <span className={`
                                            px-2 py-1 rounded-full text-xs
                                            ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                                        `}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="min-h-[500px]">
                        {renderTabContent()}
                    </div>
                </div>
            </main>
        </>
    );
};

export default PublicProfilePage;
