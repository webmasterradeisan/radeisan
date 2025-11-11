// src/pages/UserProfilePage.jsx
// ============================================================================
// PÁGINA: UserProfilePage - Vista pública del perfil de cualquier usuario
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppIcon from '../components/AppIcon'; // Componente de Iconos asumido
import Button from '../components/ui/Button'; // Componente de Botones asumido
// Importa cualquier otro hook o componente que necesites (ej. useAuth para verificar si sigues al usuario)

const Icon = ({ name, size = 20, className = "" }) => {
    return <AppIcon name={name} size={size} className={className} />;
};

const UserProfilePage = () => {
    // 1. Obtener el parámetro de la URL
    // El valor será el ID o Username de la URL: /user/VALOR_AQUI
    const { userIdOrUsername } = useParams();

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 2. Lógica para cargar los datos del usuario
    useEffect(() => {
        setLoading(true);
        setError(null);
        setUserData(null);
        
        // *****************************************************************
        // 🚨 AQUÍ ES DONDE HARÍAS LA LLAMADA API REAL
        // Ejemplo: api.getUserProfile(userIdOrUsername)
        // *****************************************************************

        const simulateDataFetch = () => {
            if (userIdOrUsername === '404_not_found') {
                setError('El perfil solicitado no existe.');
                setLoading(false);
                return;
            }

            // Simulación de datos exitosa
            const simulatedData = {
                id: userIdOrUsername,
                name: userIdOrUsername.charAt(0).toUpperCase() + userIdOrUsername.slice(1) + ' Oficial',
                username: userIdOrUsername,
                bio: `¡Hola! Soy ${userIdOrUsername}. Comparto mis mejores clips y reels sobre desarrollo web y tecnología.`,
                followers: 125000,
                contentCount: 42,
                isFollowing: Math.random() > 0.5, // Simula si el usuario logueado lo sigue
                avatar: `https://ui-avatars.com/api/?name=${userIdOrUsername.charAt(0)}&background=10b981&color=fff&size=128`, // Color verde (Emerald)
                isVerified: true
            };
            
            setUserData(simulatedData);
            setLoading(false);
        };

        const timer = setTimeout(simulateDataFetch, 1000); // Retraso de 1s para simular carga

        return () => clearTimeout(timer);
    }, [userIdOrUsername]);
    
    // 3. Renderizado Condicional
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen pt-16">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !userData) {
        return (
            <div className="text-center pt-32 p-4">
                <h1 className="text-2xl font-bold text-red-500">Error de Perfil</h1>
                <p className="text-muted-foreground mt-2">{error || 'No se pudo cargar el perfil.'}</p>
            </div>
        );
    }
    
    // 4. Renderizar el Perfil
    return (
        // Se añade un padding superior para compensar el header FIXED
        <div className="pt-20 pb-20 p-4 max-w-4xl mx-auto"> 
            
            {/* CABECERA DEL PERFIL */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-8 mb-8 border-b pb-6">
                <img 
                    src={userData.avatar} 
                    alt={userData.username} 
                    className="w-28 h-28 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-primary shadow-lg mb-4 sm:mb-0"
                />
                
                <div className="text-center sm:text-left flex-grow">
                    <h1 className="text-3xl font-extrabold text-foreground flex items-center justify-center sm:justify-start space-x-2">
                        <span>{userData.name}</span>
                        {userData.isVerified && (
                            <Icon name="CheckCircle" size={24} className="text-blue-500" title="Verificado" />
                        )}
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">@{userData.username}</p>
                    
                    <div className="flex justify-center sm:justify-start space-x-6 mt-3 text-sm">
                        <p className="font-medium text-foreground">
                            <span className="font-bold text-primary">{userData.contentCount}</span> Contenido
                        </p>
                        <p className="font-medium text-foreground">
                            <span className="font-bold text-primary">{userData.followers.toLocaleString()}</span> Seguidores
                        </p>
                    </div>
                    
                    <div className="mt-4 flex justify-center sm:justify-start space-x-3">
                        {/* Botón de Seguir/Dejar de Seguir */}
                        <Button 
                            variant={userData.isFollowing ? "outline" : "default"}
                            onClick={() => console.log('Toggle Follow API Call')}
                        >
                            <Icon 
                                name={userData.isFollowing ? 'UserMinus' : 'UserPlus'} 
                                size={16} 
                                className="mr-2"
                            />
                            {userData.isFollowing ? 'Dejar de Seguir' : 'Seguir'}
                        </Button>
                        
                        {/* Botón de Mensaje */}
                        <Button 
                            variant="secondary"
                            onClick={() => console.log('Navigate to Chat with ' + userData.username)}
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
                <p className="text-muted-foreground">{userData.bio}</p>
            </div>
            
            {/* CONTENIDO DEL USUARIO */}
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Contenido Reciente</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Repetición de tarjetas de contenido (simulado) */}
                {Array.from({ length: 6 }).map((_, index) => (
                    <div 
                        key={index} 
                        className="group relative aspect-[3/4] bg-muted rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                    >
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-all">
                            <Icon name="Play" size={40} className="text-white opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="absolute bottom-2 left-2 text-xs font-medium text-white bg-black/50 px-2 py-1 rounded-full">
                            {index % 2 === 0 ? 'Reel' : 'Video'}
                        </span>
                    </div>
                ))}
            </div>
            
            <p className="text-center text-sm text-muted-foreground mt-6">
                Fin del contenido visible.
            </p>

            <div className="mt-10 p-4 bg-primary/10 border border-primary/20 text-sm rounded-lg text-primary">
                <p className="font-bold">Información de la Ruta:</p>
                <p>La página se cargó para el usuario con el identificador: **`{userIdOrUsername}`**.</p>
                <p className="mt-2">
                    **AVISO:** Esta ruta está protegida por `ProtectedRoute` en `Routes.jsx`, lo que asegura que solo usuarios logueados puedan acceder a ella.
                </p>
            </div>
        </div>
    );
};

export default UserProfilePage;
