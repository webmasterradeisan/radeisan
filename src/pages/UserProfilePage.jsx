// src/pages/UserProfilePage.jsx

// ===============================
// HOOK SIMPLIFICADO PARA OBTENER PERFIL (CORREGIDO)
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
                // 🚨 CORRECCIÓN: SOLO SELECCIONAMOS COLUMNAS BÁSICAS VERIFICADAS
                .select('id, full_name, username, avatar_url, cover_image_url, is_verified') 

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
            // 🚨 El error que vimos en la consola es el error fetchError.message.
            if (fetchError) throw new Error(fetchError.message); 
            
            setProfileData(data);

        } catch (err) {
            console.error('Error fetching public profile:', err);
            // Mostrar el mensaje de error de la DB
            setError(`Error al cargar perfil: ${err.message || 'Error desconocido'}`); 
        } finally {
            setLoading(false);
        }
    }, [userIdOrUsername]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return { profileData, loading, error, refresh: fetchProfile };
};
