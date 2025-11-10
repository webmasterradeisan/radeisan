// src/components/PhotoDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Icon from './AppIcon'; // Asumiendo que AppIcon es el componente de iconos
import Button from './ui/Button'; // Asumiendo que Button es el componente UI
import { supabase } from '../lib/supabase'; 
// 🚨 INTEGRACIÓN DE PUNTOS: Importar las funciones de tracking
import { trackGiveLike, trackComment, trackShareContent, MISSION_TYPES } from '../services/missionsService'; 
import { useAuth } from '../contexts/AuthContext'; // Para obtener el user.id

// El componente ahora recibe el array de fotos completo y el índice actual.
const PhotoDetailModal = ({ 
    photos,
    currentPhotoIndex,
    photoData, 
    onClose, 
    onNavigate, // Nuevo prop para navegación
    refreshParentData,
    totalPhotos
}) => {
    const { user } = useAuth();
    
    // 🚨 ESTADOS TEMPORALES DE INTERACCIÓN (DEBEN SINCRONIZARSE CON LA BD)
    // Sincronización Mock: Usamos el ID de la foto como base para simular likes
    const [likeCount, setLikeCount] = useState(0); 
    const [isLiking, setIsLiking] = useState(false);
    const [userHasLiked, setUserHasLiked] = useState(false);
    const [commentText, setCommentText] = useState('');

    // ===================================
    // LÓGICA DE SINCRONIZACIÓN DE INTERACCIONES
    // ===================================
    
    useEffect(() => {
        if (!photoData?.id) return;
        
        // 🚨 MOCK DE CARGA DE LIKES (REEMPLAZAR CON FETCH REAL)
        // Simulamos un conteo basado en el ID y si el usuario ya dio like
        const idLastDigits = photoData.id.slice(-3).match(/\d+/g)?.[0] || '10';
        const mockLikes = parseInt(idLastDigits) + 5;
        const mockUserLiked = mockLikes % 2 === 0; // Alternamos si el usuario dio like

        setLikeCount(mockLikes); 
        setUserHasLiked(mockUserLiked);
        
        // Aquí iría el fetch real:
        /*
        const fetchInteractions = async () => {
             // Fetch de conteo de likes y si el usuario dio like
             // Fetch de comentarios
        };
        fetchInteractions();
        */
        
    }, [photoData]);


    // ===================================
    // INTEGRACIÓN DE PUNTOS: Like
    // ===================================

    const handleLikeToggle = useCallback(async () => {
        if (!MISSION_TYPES?.GIVE_LIKE || isLiking) return;

        setIsLiking(true);
        const actionType = userHasLiked ? 'unlike' : 'like';

        try {
            // Lógica de Supabase: Tu RPC trackGiveLike DEBE manejar el toggle (insert/delete)
            const trackingResult = await trackGiveLike('photo', photoData.id);

            if (trackingResult.result === 'success') {
                // Nuevo like -> +1 al contador y puntos
                setLikeCount(prev => prev + 1);
                setUserHasLiked(true);
                console.log(`✅ Puntos ganados por like: ${trackingResult.points_earned}`);
            } else if (trackingResult.result === 'already_paid' && actionType === 'like') {
                // Si intenta dar like de nuevo (anti-farming) y el sistema de likes es solo toggle,
                // la lógica real de tu RPC debería devolver un 'unlike' o manejar el error.
                console.log('Anti-Farming: Puntos ya ganados. Asumiendo que se intentó dar like dos veces.');
            } else if (trackingResult.result === 'unlike_success') {
                 // Si trackGiveLike maneja el unlike (suposición)
                 setLikeCount(prev => Math.max(0, prev - 1));
                 setUserHasLiked(false);
            }
            
            // Refrescar el perfil principal (para actualizar el total de puntos)
            refreshParentData(); 

        } catch (error) {
            console.error('💥 Error al dar like y trackear misión:', error);
        } finally {
            setIsLiking(false);
        }
    }, [photoData, isLiking, userHasLiked, refreshParentData]);

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Comentario
    // ===================================
    const handleCommentSubmit = useCallback(async () => {
        if (commentText.trim() === '') return;
        
        // 1. Lógica de inserción de comentario (DB)
        console.log(`Comentario enviado: "${commentText}"`);
        setCommentText(''); // Limpiar input

        // 2. Lógica de tracking de puntos
        if (MISSION_TYPES?.COMMENT) {
             try {
                const trackingResult = await trackComment('photo', photoData.id);
                if (trackingResult.result === 'success') {
                    console.log(`✅ Puntos ganados por comentario: ${trackingResult.points_earned}`);
                    refreshParentData(); 
                }
             } catch (error) {
                console.error('💥 Error al trackear comentario:', error);
             }
        }
    }, [commentText, photoData, refreshParentData]);

    // ===================================
    // INTEGRACIÓN DE PUNTOS: Compartir
    // ===================================
    const handleShare = useCallback(async () => {
        alert("Compartiendo foto..."); // Simulación de la apertura del diálogo de compartir
        
        if (MISSION_TYPES?.SHARE_CONTENT) {
             try {
                const trackingResult = await trackShareContent('photo', photoData.id);
                if (trackingResult.result === 'success') {
                    console.log(`✅ Puntos ganados por compartir: ${trackingResult.points_earned}`);
                    refreshParentData(); 
                }
             } catch (error) {
                console.error('💥 Error al trackear compartir:', error);
             }
        }
    }, [photoData, refreshParentData]);


    // Asignamos datos para la UI usando photoData real
    const photoUrl = photoData.image_url || photoData.thumbnail_url; 
    const photoCaption = photoData.caption || 'Foto sin descripción';
    
    // Obtenemos la descripción del objeto (que ya viene del fetch)
    const photoDescription = photoData.description; 
    
    const userDisplayName = user?.user_metadata?.full_name || `@${user?.email?.split('@')[0] || 'UsuarioDetalle'}`;
    const photoDate = new Date(photoData.created_at).toLocaleDateString();

    const isFirstPhoto = currentPhotoIndex === 0;
    const isLastPhoto = currentPhotoIndex === totalPhotos - 1;

    // Estructura del Modal 
    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-0 sm:p-4">
            
            {/* 🚨 Botón de Flecha Izquierda */}
            {!isFirstPhoto && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 ml-4"
                    onClick={() => onNavigate('prev')}
                >
                    <Icon name="ChevronLeft" size={32} />
                </Button>
            )}

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

                {/* Columna Izquierda: Imagen */}
                <div className="flex-1 flex items-center justify-center relative bg-black">
                    <img 
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
                            <h4 className="font-semibold text-foreground truncate">{userDisplayName}</h4>
                            <p className="text-xs text-muted-foreground">{photoDate}</p>
                        </div>
                    </div>

                    {/* Contenido/Comentarios */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        {/* Título/Caption */}
                        {photoCaption && (
                            <p className="font-semibold text-sm text-foreground">{photoCaption}</p> 
                        )}
                        
                        {/* 🚨 DESCRIPCIÓN CORREGIDA: Se muestra si existe y es diferente al título */}
                        {photoDescription && photoDescription !== photoCaption && (
                            <p className="text-sm text-foreground mt-1">{photoDescription}</p>
                        )}
                        
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
                                className={`
                                    text-red-500 
                                    hover:bg-red-500/10 
                                    ${isLiking ? 'opacity-50' : ''}
                                `}
                                onClick={handleLikeToggle}
                                disabled={isLiking}
                            >
                                <Icon name={userHasLiked ? "Heart" : "Heart"} size={18} className="mr-2" />
                                Me Gusta ({likeCount})
                            </Button>

                            {/* Botón de Compartir */}
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={handleShare}
                            >
                                <Icon name="Share2" size={18} className="mr-2" />
                                Compartir
                            </Button>
                        </div>
                        
                        <div className="flex space-x-2">
                            <input 
                                type="text" 
                                placeholder="Añade un comentario..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2 text-sm focus:ring-primary focus:border-primary"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && commentText.trim() !== '') {
                                        handleCommentSubmit();
                                    }
                                }}
                            />
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleCommentSubmit}
                                disabled={commentText.trim() === ''}
                            >
                                <Icon name="Send" size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🚨 Botón de Flecha Derecha */}
             {!isLastPhoto && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 mr-4"
                    onClick={() => onNavigate('next')}
                >
                    <Icon name="ChevronRight" size={32} />
                </Button>
            )}
        </div>
    );
};

export default PhotoDetailModal;
