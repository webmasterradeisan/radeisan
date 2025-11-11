// src/pages/UserProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// Componentes y Contextos
import { supabase } from '../lib/supabase'; 
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/ui/Header';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';

// ===============================
// HOOK SIMPLIFICADO PARA OBTENER PERFIL
// ===============================

const usePublicProfile = (userIdOrUsername) => {
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
                // Seleccionamos solo las columnas básicas necesarias para la cabecera
                .select('id, full_name, username, avatar_url, cover_image_url, is_verified, bio') 

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

        } catch (err) {
            console.error('Error fetching public profile:', err);
            setError('Error al cargar perfil.'); 
        } finally {
            setLoading(false);
        }
    }, [userIdOrUsername]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return { profileData, loading, error, refresh: fetchProfile };
};


// ===============================
// COMPONENTE PRINCIPAL (Simplificado)
// ===============================

const UserProfilePage = () => {
    const { userIdOrUsername } = useParams(); 
    const navigate = useNavigate();
    
    // Solo necesitamos los datos básicos y el estado de carga
    const { profileData, loading: profileLoading, error: profileError } = usePublicProfile(userIdOrUsername);

    if (profileLoading) {
        // Loader simple inline
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                <p className="text-gray-600 text-sm">Cargando perfil...</p>
              </div>
            </div>
        );
    }

    if (profileError || !profileData) {
        return (
            <div className="text-center p-8 mt-10">
                <Icon name="AlertTriangle" size={36} className="text-red-500 mb-4" />
                <h1 className="text-xl font-bold">{profileError || 'Perfil no encontrado.'}</h1>
                <Button onClick={() => navigate('/dashboard')} className="mt-4">
                    Volver al Dashboard
                </Button>
            </div>
        );
    }

    // ------------------------------------------
    // Renderizado Únicamente de Portada, Avatar y Nombre
    // ------------------------------------------
    return (
        <>
            <Helmet>
                <title>{profileData.username || profileData.full_name} | Perfil Público</title>
            </Helmet>
            
            <Header />

            <main className="max-w-4xl mx-auto pt-24 pb-8 px-4 md:px-0">
                <div className="bg-white rounded-xl shadow-lg mb-8">
                    
                    {/* 1. SECCIÓN DE PORTADA */}
                    <div className="relative">
                        <div className="h-48 rounded-t-xl overflow-hidden bg-gray-200">
                            {profileData.cover_image_url ? (
                                <img 
                                    src={profileData.cover_image_url} 
                                    alt="Portada del perfil" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center">
                                    <span className="text-white font-bold">PORTADA</span>
                                </div>
                            )}
                        </div>
                        
                        {/* 2. AVATAR (POSICIONADO SOBRE LA PORTADA) */}
                        <div className="absolute left-6 -bottom-12">
                            <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-gray-500 overflow-hidden">
                                {profileData.avatar_url ? (
                                    <img 
                                        src={profileData.avatar_url} 
                                        alt={profileData.full_name} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Icon name="User" size={40} className="w-full h-full p-4 text-white" />
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* 3. NOMBRE Y USERNAME */}
                    <div className="p-6 pt-16">
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            {profileData.full_name}
                            {profileData.is_verified && <Icon name="CheckCircle" size={24} className="text-blue-500" title="Verificado" />}
                        </h1>
                        <p className="text-muted-foreground text-lg mb-4">@{profileData.username}</p>
                        
                        {/* Mensaje de prueba */}
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                           ✅ **PRUEBA EXITOSA:** Se cargó la información básica del perfil `{profileData.username}`.
                        </div>
                    </div>
                </div>

                {/* Este es el punto donde el resto de la página iría */}
            </main>
        </>
    );
};

export default UserProfilePage;
