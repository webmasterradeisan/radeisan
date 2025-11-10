// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; // <-- CORREGIDO: "react-react" a "react"
import Icon from './AppIcon'; // Asumiendo que AppIcon es el componente de iconos
import Button from './ui/Button'; // Asumiendo que Button es el componente UI
import { supabase } from '../lib/supabase'; // Para cargar los datos de la foto
// 🚨 INTEGRACIÓN DE PUNTOS: Importar las funciones de tracking
import { trackGiveLike, MISSION_TYPES } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; // Para obtener el user.id

const PhotoDetailModal = ({ photoId, onClose, refreshParentData }) => {
    const { user } = useAuth();
    const [photoData, setPhotoData] = useState(null);
    const [isLiking, setIsLiking] = useState(false);
    const [likeCount, setLikeCount] = useState(0); // Debe ser cargado desde BD o tabla separada
    const [loading, setLoading] = useState(true);

    // ===================================
    // LÓGICA DE CARGA DE DATOS (MOCK)
    // ===================================

    useEffect(() => {
        if (!photoId) return;

        // 🚨 NOTA: La carga de datos REAL debería hacerse aquí.
        // Por ahora, simulamos los datos para que el modal se vea funcional.
        setLoading(true);
        setTimeout(() => {
            // Simular datos obtenidos (deberías hacer un fetch JOIN en la tabla photos y photo_likes)
            setPhotoData({
                id: photoId,
                // Usamos una URL genérica para simular la carga de imagen
                image_url: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/800/1200`,
                caption: "Foto de mi perfil subida hoy.",
                user_name: user?.user_metadata?.full_name || "@UsuarioDetalle",
                created_at: new Date().toLocaleDateString(),
                // Estos valores DEBEN ser obtenidos de las tablas separadas (photo_likes)
                initial_likes: 12, 
                user_liked: false, 
            });
            setLikeCount(12);
            setLoading(false);
        }, 500);

        // Si necesitas datos reales, el fetch sería:
        /*
        const fetchPhoto = async () => {
             const { data, error } = await supabase
                 .from('photos')
                 // Aquí deberías usar una función RPC para contar likes
                 .select(`*, likes_count:photo_likes(count)`) 
                 .eq('id', photoId)
                 .single();
             if (data) {
                 setPhotoData(data);
                 setLikeCount(data.likes_count?.[0]?.count || 0);
             }
             setLoading(false);
        };
        fetchPhoto();
        */
        
    }, [photoId, user]);

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Like
    // ===================================

    const handleLike = useCallback(async () => {
        if (!photoData || isLiking || !MISSION_TYPES.GIVE_LIKE) return;

        setIsLiking(true);

        try {
            // Asumimos que trackGiveLike maneja la inserción/eliminación del like
            // y el tracking de puntos en la base de datos (PostgreSQL RPC)
            const trackingResult = await trackGiveLike('photo', photoId);

            if (trackingResult.result === 'success') {
                // Si el like fue nuevo y otorgó puntos
                setLikeCount(prev => prev + 1);
                console.log(`Puntos ganados por like: ${trackingResult.points_earned}`);
            } else if (trackingResult.result === 'already_paid') {
                // Si ya había dado like, la lógica real debería hacer un UNLIKE y decrementar
                // Por ahora, solo informamos que no ganó puntos (Anti-Farming)
                console.log('Ya se habían otorgado puntos por este like (Anti-Farming).');
            }
            
            // Refrescar el perfil principal (para actualizar el total de puntos)
            refreshParentData(); 

        } catch (error) {
            console.error('Error al dar like y trackear misión:', error);
        } finally {
            setIsLiking(false);
        }
    }, [photoData, photoId, isLiking, refreshParentData]);

    const handleComment = () => {
        // Lógica de comentarios aquí...
        // Aquí se llamaría a trackComment('photo', photoId)
        alert('Comentario enviado! (Llamar a trackComment)');
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                <div className="text-white">Cargando foto...</div>
            </div>
        );
    }
    
    if (!photoData) return null;

    // Estructura del Modal (Similar a la imagen de Facebook)
    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-0 sm:p-4">
            <div className="flex w-full max-w-7xl h-full sm:h-[95vh] bg-card sm:rounded-lg overflow-hidden shadow-2xl">
                
                {/* Botón de Cierre (esquina superior izquierda) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 left-0 m-4 text-white hover:bg-white/20 z-50"
                    onClick={onClose}
                >
                    <Icon name="X" size={24} />
                </Button>

                {/* Columna Izquierda: Imagen (Ocupa el espacio restante) */}
                <div className="flex-1 flex items-center justify-center relative bg-black">
                    <img 
                        // Usar la URL real de la imagen completa
                        src={photoData.image_url}
                        alt={`Foto de ${photoData.user_name}`}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
                
                {/* Columna Derecha: Interacciones */}
                <div className="w-96 flex flex-col border-l border-border bg-background flex-shrink-0">
                    
                    {/* Header del Post/Usuario */}
                    <div className="p-4 border-b border-border flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{photoData.user_name}</h4>
                            <p className="text-xs text-muted-foreground">{photoData.created_at}</p>
                        </div>
                        {/* Aquí iría el botón de 'Seguir' o acciones del dueño del post */}
                    </div>

                    {/* Contenido/Comentarios */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <p className="text-sm text-foreground">{photoData.caption}</p>
                        
                        <div className="text-sm text-muted-foreground border-t border-border pt-4 mt-4">
                            <p className="font-semibold mb-2">Comentarios:</p>
                            {/* Placeholder de Comentarios */}
                            <div className="space-y-2">
                                <p className="text-xs italic">Todavía no hay comentarios.</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Pie de Interacciones (Likes, Comentar Input) */}
                    <div className="p-4 border-t border-border">
                        <div className="flex justify-between items-center mb-4">
                            {/* Botón de Like */}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`text-red-500 hover:bg-red-500/10 ${isLiking ? 'opacity-50' : ''}`}
                                onClick={handleLike}
                                disabled={isLiking}
                            >
                                <Icon name="Heart" size={18} className="mr-2" />
                                Me Gusta ({likeCount})
                            </Button>

                            {/* Botón de Compartir */}
                            <Button variant="ghost" size="sm">
                                <Icon name="Share2" size={18} className="mr-2" />
                                Compartir
                            </Button>
                        </div>
                        
                        <div className="flex space-x-2">
                            <input 
                                type="text" 
                                placeholder="Añade un comentario..."
                                className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2 text-sm focus:ring-primary focus:border-primary"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim() !== '') {
                                        handleComment();
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <Button size="sm" variant="ghost" onClick={handleComment}>
                                <Icon name="Send" size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotoDetailModal;
