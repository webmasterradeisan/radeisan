// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; // Asumiendo que AppIcon es el componente de iconos
import Button from './ui/Button'; // Asumiendo que Button es el componente UI
import { supabase } from '../lib/supabase'; 
// 🚨 INTEGRACIÓN DE PUNTOS: Importar las funciones de tracking
import { trackGiveLike, MISSION_TYPES } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; // Para obtener el user.id

// El componente ahora recibe el objeto de la foto (photoData)
const PhotoDetailModal = ({ photoData, onClose, refreshParentData }) => {
    const { user } = useAuth();
    
    // 🚨 ESTADOS TEMPORALES: Estos deben sincronizarse con la BD.
    // Usamos el ID de la foto como clave para el useEffect de carga de likes.
    const [likeCount, setLikeCount] = useState(0); 
    const [isLiking, setIsLiking] = useState(false);

    // ===================================
    // LÓGICA DE CARGA DE LIKES (Real / Mocked)
    // ===================================
    
    // **NOTA:** Aquí se debe hacer un fetch real a la tabla 'photo_likes' para 
    // obtener el número de likes y si el usuario actual ya dio like.
    useEffect(() => {
        // Mock de sincronización de likes (Debe ser reemplazado por un fetch)
        // Usamos un número fijo (12) y el caption para simular el nombre de usuario
        const mockLikes = photoData.id.slice(-2).match(/\d+/g)?.[0] || 5; 
        setLikeCount(parseInt(mockLikes) + 10); 
    }, [photoData]);


    // **VALIDACIÓN CRÍTICA** (Se movió al padre, pero la mantenemos aquí por seguridad)
    if (!photoData) {
        console.error("PhotoDetailModal: photoData es null o undefined.");
        return null;
    }

    // Asignamos datos para la UI usando photoData real
    const photoId = photoData.id;
    const photoUrl = photoData.image_url || photoData.thumbnail_url; 
    const photoCaption = photoData.caption || 'Foto sin descripción';
    
    // El usuario que subió la foto es el usuario actual, por lo que usamos userData
    const userDisplayName = user?.user_metadata?.full_name || `@${user?.email?.split('@')[0] || 'UsuarioDesconocido'}`;
    const photoDate = new Date(photoData.created_at).toLocaleDateString();

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Like
    // ===================================

    const handleLike = useCallback(async () => {
        if (!MISSION_TYPES?.GIVE_LIKE) {
            console.error("MISSION_TYPES no está disponible. No se puede trackear el like.");
            return;
        }
        if (isLiking) return;

        setIsLiking(true);

        try {
            // Llama a la misión de dar like para la referencia 'photo'
            const trackingResult = await trackGiveLike('photo', photoId);

            if (trackingResult.result === 'success') {
                // Si el like fue nuevo y otorgó puntos
                setLikeCount(prev => prev + 1);
                console.log(`Puntos ganados por like: ${trackingResult.points_earned}`);
            } else if (trackingResult.result === 'already_paid') {
                // Lógica de UNLIKE (Si tu función trackGiveLike maneja el toggle, ¡perfecto!)
                console.log('Anti-Farming: Puntos ya ganados. Acción registrada, pero sin recompensa.');
            }
            
            // Refrescar el perfil principal (para actualizar el total de puntos)
            refreshParentData(); 

        } catch (error) {
            console.error('Error al dar like y trackear misión:', error);
        } finally {
            setIsLiking(false);
        }
    }, [photoId, isLiking, refreshParentData]);

    const handleComment = () => {
        // Lógica de comentarios aquí...
        // Aquí se llamaría a trackComment('photo', photoId)
        alert('Comentario enviado! (Llamar a trackComment)');
    };
    

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
                        // 🚨 Usamos la URL REAL de la foto seleccionada
                        src={photoUrl}
                        alt={`Foto de ${userDisplayName}`}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
                
                {/* Columna Derecha: Interacciones */}
                <div className="w-96 flex flex-col border-l border-border bg-background flex-shrink-0">
                    
                    {/* Header del Post/Usuario */}
                    <div className="p-4 border-b border-border flex items-center space-x-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" /> 
                        <div className="flex-1 min-w-0">
                            {/* 🚨 Usamos el nombre de usuario real */}
                            <h4 className="font-semibold text-foreground truncate">{userDisplayName}</h4>
                            <p className="text-xs text-muted-foreground">{photoDate}</p>
                        </div>
                    </div>

                    {/* Contenido/Comentarios */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <p className="text-sm text-foreground">{photoCaption}</p>
                        
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
