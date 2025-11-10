// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; // Se mantiene la ruta relativa
import Button from './ui/Button'; // Se mantiene la ruta relativa
import { supabase } from '../lib/supabase'; // Se mantiene la ruta relativa
// 🚨 Nota: La ruta de missionsService.js se asume correcta como '../services/missionsService'
import { trackGiveLike, MISSION_TYPES } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; // Se mantiene la ruta relativa

// El componente ahora recibe photoData en lugar de solo photoId
const PhotoDetailModal = ({ photoData, onClose, refreshParentData }) => {
    const { user } = useAuth();
    const [isLiking, setIsLiking] = useState(false);
    // 🚨 Usamos un estado mock para los likes. DEBE SER REEMPLAZADO por un fetch real.
    const [likeCount, setLikeCount] = useState(12); // Mock: '12' es el valor inicial de la simulación
    const [loading, setLoading] = useState(false); 

    // **VALIDACIÓN CRÍTICA**
    if (!photoData) {
        console.error("PhotoDetailModal: photoData es null o undefined.");
        return null;
    }

    // Asignamos datos para la UI
    const photoId = photoData.id;
    // Usamos la URL real
    const photoUrl = photoData.image_url; 
    // Usamos profileData (si está disponible) o el usuario autenticado
    const userDisplayName = photoData.username || user?.user_metadata?.full_name || `@UsuarioDetalle`;
    const photoDate = new Date(photoData.created_at).toLocaleDateString();

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Like
    // ===================================

    const handleLike = useCallback(async () => {
        // Validación de existencia de MISSION_TYPES antes de usarlo
        if (!MISSION_TYPES?.GIVE_LIKE) {
            console.error("MISSION_TYPES no está disponible. No se puede trackear el like.");
            return;
        }
        if (isLiking) return;

        setIsLiking(true);

        try {
            const trackingResult = await trackGiveLike('photo', photoId);

            if (trackingResult.result === 'success') {
                setLikeCount(prev => prev + 1);
                console.log(`Puntos ganados por like: ${trackingResult.points_earned}`);
            } else if (trackingResult.result === 'already_paid') {
                console.log('Ya se habían otorgado puntos por este like (Anti-Farming).');
            }
            
            refreshParentData(); 

        } catch (error) {
            console.error('Error al dar like y trackear misión:', error);
        } finally {
            setIsLiking(false);
        }
    }, [photoId, isLiking, refreshParentData]);

    const handleComment = () => {
        // Lógica de comentarios aquí...
        alert('Comentario enviado! (Llamar a trackComment)');
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                <div className="text-white">Cargando foto...</div>
            </div>
        );
    }
    

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
                        // Usamos la URL REAL de la foto seleccionada
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
                            <h4 className="font-semibold text-foreground truncate">@{userDisplayName}</h4>
                            <p className="text-xs text-muted-foreground">{photoDate}</p>
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
