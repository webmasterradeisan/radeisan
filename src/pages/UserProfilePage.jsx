// src/pages/UserProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// Componentes y Contextos (rutas verificadas)
import { supabase } from '../lib/supabase'; 
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/ui/Header';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';

// ===============================
// HOOK DE PERFIL MINIMALISTA
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
                // 🚨 CONSULTA MÍNIMA: Solo necesitamos full_name y username para mostrar.
                .select('full_name, username') 

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername);

            if (isUUID) {
                query = query.eq('id', userIdOrUsername);
            } else {
                query = query.eq('username', userIdOrUsername);
            }

            const { data, error: fetchError } = await query.single();

            if (fetchError && fetchError.code === 'PGRST116') {
                setError('Perfil no encontrado.');
                setProfileData(null);
                return;
            }
            if (fetchError) throw new Error(fetchError.message); 
            
            setProfileData(data);

        } catch (err) {
            console.error('Error fetching public profile:', err);
            setError(`Error al cargar perfil: ${err.message || 'Error desconocido'}`); 
        } finally {
            setLoading(false);
        }
    }, [userIdOrUsername]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return { profileData, loading, error };
};


// ===============================
// COMPONENTE PRINCIPAL (Mínimo)
// ===============================

const UserProfilePage = () => {
    const { userIdOrUsername } = useParams(); 
    const navigate = useNavigate();
    
    const { profileData, loading: profileLoading, error: profileError } = usePublicProfile(userIdOrUsername);

    if (profileLoading) {
        // Loader inline
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
                <h1 className="text-xl font-bold">Error al cargar perfil</h1>
                <p className="text-muted-foreground mt-2">{profileError || 'Perfil no encontrado.'}</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-4">
                    Volver al Dashboard
                </Button>
            </div>
        );
    }

    // ------------------------------------------
    // Renderizado MÍNIMO: Solo el Nombre del Usuario
    // ------------------------------------------
    return (
        <>
            <Helmet>
                <title>{profileData.username || profileData.full_name} | Perfil</title>
            </Helmet>
            
            <Header />

            <main className="max-w-4xl mx-auto pt-24 pb-8 px-4 md:px-0">
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 text-center">
                    
                    <h1 className="text-4xl font-extrabold text-primary mb-2">
                        {profileData.full_name || 'Nombre Desconocido'}
                    </h1>
                    <p className="text-xl text-muted-foreground">@{profileData.username}</p>
                    
                    <div className="mt-8 bg-green-50 border border-green-200 p-4 rounded text-sm text-green-800">
                       ✅ **PRUEBA MÍNIMA EXITOSA:** Se ha cargado el nombre del usuario.
                    </div>
                </div>
            </main>
        </>
    );
};

export default UserProfilePage;
