// src/pages/public-profile-page/index.jsx
// PublicProfilePage - Vista pública del perfil de cualquier usuario
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/ui/Header';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// Asumimos que los hooks de fetch existen en user-profile-settings/index.jsx
import { useAuth } from '../../../contexts/AuthContext';
import { useUserVideos, useUserReels, useUserPhotos } from '../user-profile-settings'; 

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
                .select('id, full_name, username, avatar_url, cover_image_url, bio, is_verified, followers_count, following_count')
                .eq('username', username)
                .maybeSingle(); 

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
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('videos');

    // Carga los datos del perfil público
    const { profileData, loading: profileLoading, error: profileError } = usePublicProfile(username);
    
    // Si el perfil se cargó, obtenemos su ID para el resto de los fetches
    const profileUserId = profileData?.id; 

    // Reusamos los hooks de fetch de contenido
    // NOTA: Se debe asegurar que 'user-profile-settings/index.jsx' exporte estos hooks
    const { videos, loading: videosLoading } = useUserVideos(profileUserId);
    const { reels, loading: reelsLoading } = useUserReels(profileUserId);
    const { photos, loading: photosLoading } = useUserPhotos(profileUserId); 
    
    // Verificamos si el usuario logueado es el dueño de este perfil
    const isOwnerViewing = currentUser?.id === profileUserId;

    // Redirección si el dueño accede a su perfil público:
    useEffect(() => {
        if (isOwnerViewing && profileUserId) {
            // Redirigir a la página de configuración privada que se mapea a /profile
            navigate('/profile', { replace: true });
        }
    }, [isOwnerViewing, profileUserId, navigate]);


    // Formatear datos del usuario
    const userData = useMemo(() => {
        if (!profileData) return null;

        return {
            name: profileData.full_name || 'Usuario',
            username: profileData.username || '',
            bio: profileData.bio || '',
            avatar: profileData.avatar_url,
            coverImage: profileData.cover_image_url,
            isVerified: profileData.is_verified || false,
            followersCount: profileData.followers_count || 0,
            followingCount: profileData.following_count || 0,
            // Contadores de contenido
            videosCount: videos.length,
            reelsCount: reels.length,
            photosCount: photos.length,
        };
    }, [profileData, videos.length, reels.length, photos.length]);
    

    // Calcular contadores para tabs públicos
    const tabCounts = useMemo(() => ({
        videos: videos.length,
        reels: reels.length,
        photos: photos.length,
    }), [videos.length, reels.length, photos.length]);


    // Función simple de renderizado de contenido
    const renderTabContent = () => {
        switch (activeTab) {
            case 'videos':
                return <div className="p-8 text-center text-muted-foreground">Videos cargando... (Usar VideoGridComponent)</div>;
            case 'reels':
                return <div className="p-8 text-center text-muted-foreground">Reels cargando... (Usar ReelsGridComponent)</div>;
            case 'photos':
                return <div className="p-8 text-center text-muted-foreground">Fotos cargando... (Usar PhotoGrid)</div>;
            default:
                return null;
        }
    };


    // ===============================
    // RENDERIZADO PRINCIPAL
    // ===============================

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Cargando perfil de @{username}...</p>
            </div>
        );
    }
    
    if (profileError || !profileData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center py-16">
                    <Icon name="Frown" size={48} className="text-destructive mx-auto mb-4" />
                    <h1 className="text-3xl font-bold">404 - Usuario No Encontrado</h1>
                    <p className="text-muted-foreground text-xl">El usuario @{username} no existe o fue eliminado.</p>
                    <Button onClick={() => navigate('/dashboard')} className="mt-6">
                        Volver al Dashboard
                    </Button>
                </div>
            </div>
        );
    }


    return (
        <>
            <Helmet>
                <title>Perfil de @{username} | RADEISAN</title>
            </Helmet>

            <Header />
            <main className="pt-16 md:pt-32 pb-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Header del Perfil Público */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden mb-8 shadow-sm">
                        
                        {/* Imagen de Portada */}
                        <div className="h-48 md:h-60 relative bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 overflow-hidden">
                            {userData.coverImage && (
                                <img 
                                    src={userData.coverImage} 
                                    alt="Portada del perfil"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        
                        {/* Info Principal */}
                        <div className="px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
                                {/* Avatar */}
                                <div className="relative flex-shrink-0 -mt-20 mb-4 sm:mb-0">
                                    <div className="w-32 h-32 rounded-full border-4 border-card bg-background overflow-hidden shadow-lg">
                                        <img src={userData.avatar} alt={userData.name} className="w-full h-full object-cover"/>
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-4">
                                    <h1 className="text-3xl font-bold text-foreground mb-1">
                                        {userData.name}
                                    </h1>
                                    <div className="flex items-center space-x-2 mb-3">
                                        <p className="text-muted-foreground">@{userData.username}</p>
                                        {userData.isVerified && (
                                            <Icon name="BadgeCheck" size={18} className="text-primary" />
                                        )}
                                    </div>

                                    {userData.bio && (
                                        <p className="text-foreground mb-4 max-w-2xl">
                                            {userData.bio}
                                        </p>
                                    )}

                                    {/* Stats Públicas */}
                                    <div className="flex flex-wrap gap-6 text-sm mb-4">
                                        <div className="flex items-center space-x-1">
                                            <span className="font-semibold">{userData.followersCount}</span>
                                            <span className="text-muted-foreground">seguidores</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="font-semibold">{userData.followingCount}</span>
                                            <span className="text-muted-foreground">siguiendo</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="font-semibold">{userData.videosCount + userData.reelsCount}</span>
                                            <span className="text-muted-foreground">videos/reels</span>
                                        </div>
                                    </div>
                                    
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
