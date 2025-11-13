// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// ... (otros comentarios)
// 🟢 SINCRONIZADO: 'loadCurrentUserAndActions' ahora consulta 'user_mission_progress'
//    para el anti-farming diario (en lugar de 'user_video_points').
// 🟢 SINCRONIZADO: 'handleLike' ahora maneja 'progress_updated' y 'already_completed'.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { usePoints } from 'contexts/PointsContext';
import * as missionsService from 'services/missionsService';
import Icon from 'components/AppIcon';
import useIsMobile from 'hooks/useIsMobile';
import GiftPointsModal from 'components/GiftPointsModal'; 

// ===============================
// COMPONENTE PRINCIPAL: REELS CONTAINER
// ===============================
const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null,
  onLoadMore, 
  onPointsEarned,
  hasMore = true,
  loading = false 
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const { addPoints } = usePoints();

  // Estados principales
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [dislikedVideos, setDislikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followedCreators, setFollowedCreators] = useState(new Set());
  const [enableTransition, setEnableTransition] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [videoCounters, setVideoCounters] = useState({});
  
  // Estados de comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  
  // Estado para el Modal de Regalo
  const [showGiftModal, setShowGiftModal] = useState(false); 

  // Estado para notificaciones de puntos
  const [pointsNotification, setPointsNotification] = useState({
    show: false,
    message: '',
    videoId: null,
    type: 'success'
  });

  // Estados de tracking de misiones y acciones realizadas
  const [videoWatchedIds, setVideoWatchedIds] = useState(new Set());
  const [actionsPerformed, setActionsPerformed] = useState({
    likes: new Set(), // Esto ahora significa "misión de like completa hoy"
    saves: new Set(),
    follows: new Set(),
    comments: new Set(),
    shares: new Set()
  });

  // Refs
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isInitialMount = useRef(true);
  const hasPlayedInitial = useRef(false);
  const lastNavigationIndex = useRef(-1);

  // Función para mostrar notificación de puntos
  const showPointsNotification = (message, videoId, type = 'success') => {
    setPointsNotification({
      show: true,
      message,
      videoId,
      type
    });
    
    setTimeout(() => {
      setPointsNotification({
        show: false,
        message: '',
        videoId: null,
        type: 'success'
      });
    }, 2000);
  };

  // ===============================
  // FUNCIÓN: Convertir ID del video a índice
  // ===============================
  const getInitialReelIndex = useCallback(() => {
    if (!selectedReelId) return 0;
    const index = videos.findIndex(video => video.id === selectedReelId);
    if (index < 0) return 0;
    return index;
  }, [selectedReelId, videos]);

  // ===============================
  // SINCRONIZACIÓN INICIAL
  // ===============================
  useEffect(() => {
    if (videos.length === 0) return;
    const correctIndex = getInitialReelIndex();
    
    if (isInitialMount.current) {
      setCurrentIndex(correctIndex);
      setEnableTransition(false);
      setTimeout(() => {
        setEnableTransition(true);
        isInitialMount.current = false;
      }, 100);
    } else {
      setCurrentIndex(correctIndex);
    }
  }, [selectedReelId, videos, getInitialReelIndex]);

  // ===============================
  // CARGAR USUARIO ACTUAL Y ACCIONES PREVIAS
  // ===============================
  useEffect(() => {
    const loadCurrentUserAndActions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, name, avatar, username')
            .eq('id', user.id)
            .single();
          
          const userProfile = profile || { 
            id: user.id, 
            name: user.email?.split('@')[0] || 'Usuario', 
            avatar: null, 
            username: user.email?.split('@')[0] || 'usuario'
          };
          setCurrentUser(userProfile);

          // 1. CARGAR LIKES ACTUALES (para UI)
          const { data: likesData } = await supabase
            .from('video_likes')
            .select('video_id')
            .eq('user_id', user.id);
          
          if (likesData) {
            const likedIds = new Set(likesData.map(l => l.video_id));
            setLikedVideos(likedIds);
          }

          // ================================================================
          // ✅ 2. SINCRONIZACIÓN: Cargar 'user_mission_progress' para anti-farming
          //    Revisamos si la misión 'like_videos' ya se completó HOY.
          // ================================================================
          try {
            const today = new Date().toISOString().split('T')[0];
            
            // 2a. Buscar el ID de la misión 'like_videos'
            const { data: mission } = await supabase
              .from('daily_missions')
              .select('id')
              .eq('mission_type', 'like_videos')
              .single();

            if (mission) {
              // 2b. Buscar si el usuario ya completó esa misión HOY
              const { data: progressData, error: progressError } = await supabase
                .from('user_mission_progress')
                .select('is_completed')
                .eq('user_id', user.id)
                .eq('mission_id', mission.id)
                .eq('date', today)
                .single();

              if (progressError && progressError.code !== 'PGRST116') {
                throw progressError; // Lanzar error si no es "fila no encontrada"
              }

              if (progressData && progressData.is_completed) {
                // Si la misión de "like_videos" está completa HOY,
                // marcamos TODOS los videos como 'hasEarnedPointsBefore'
                const allVideoIds = videos.map(v => v.id);
                setActionsPerformed(prev => ({
                  ...prev,
                  likes: new Set(allVideoIds) // Activamos anti-farming para todos
                }));
              } else {
                // Aún no completa la misión de like hoy
                setActionsPerformed(prev => ({ ...prev, likes: new Set() }));
              }
            } else {
              // No existe la misión 'like_videos', desactivamos anti-farming
              setActionsPerformed(prev => ({ ...prev, likes: new Set() }));
            }
          } catch (err) {
            console.error("Error al verificar progreso de misión 'like_videos':", err);
            setActionsPerformed(prev => ({ ...prev, likes: new Set() })); // Ser permisivo
          }
          
          // ... (Resto de la carga de 'saves', 'follows', 'comments'...)
          
        }
      } catch (error) {
        console.error('Error cargando usuario y acciones:', error);
      }
    };
    
    loadCurrentUserAndActions();
  }, [videos]); // Dependencia de 'videos' para actualizar el set de 'likes'

  // ... (Hooks de Efecto: inicializar contadores, autoplay, tracking de vistas) ...
  // ... (Se omite por brevedad)

  // ===============================
  // ACCIONES (PLAY/PAUSE, NAVEGACIÓN)
  // ===============================
  
  // ... (handlePlayPause, navigateNext, navigatePrevious, touch handlers, keydown) ...
  // ... (Se omite por brevedad)

  // ===============================
  // ✅✅✅ ACCIÓN DE LIKE (SINCRONIZADA)
  // ===============================
  
  const handleLike = async (videoId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newLikedVideos = new Set(likedVideos);
      const newDislikedVideos = new Set(dislikedVideos);
      
      // ✅ VERIFICAR SI YA COMPLETÓ LA MISIÓN DE LIKES HOY
      const hasEarnedPointsBefore = actionsPerformed.likes.has(videoId);
      
      // ✅ VERIFICAR SI TIENE LIKE ACTUALMENTE
      const isCurrentlyLiked = newLikedVideos.has(videoId);
      
      if (isCurrentlyLiked) {
        // ==============================
        // QUITAR LIKE
        // ==============================
        newLikedVideos.delete(videoId);
        
        setVideoCounters(prev => ({
          ...prev,
          [videoId]: {
            ...prev[videoId],
            likes: Math.max(0, (prev[videoId]?.likes || 0) - 1)
          }
        }));
        
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_video_likes', { video_id: videoId });
        
      } else {
        // ==============================
        // DAR LIKE
        // ==============================
        newLikedVideos.add(videoId);
        if (newDislikedVideos.has(videoId)) {
            newDislikedVideos.delete(videoId);
            // (Aquí faltaba la lógica para quitar el dislike de la BD)
        }

        setVideoCounters(prev => ({
          ...prev,
          [videoId]: {
            ...prev[videoId],
            likes: (prev[videoId]?.likes || 0) + 1
          }
        }));

        await supabase
          .from('video_likes')
          .insert({ video_id: videoId, user_id: user.id });

        await supabase.rpc('increment_video_likes', { video_id: videoId });

        // ✅ VERIFICAR SI YA GANÓ PUNTOS CON ESTE VIDEO
        if (!hasEarnedPointsBefore) {
          // ==============================
          // PRIMERA VEZ (O MISIÓN NO COMPLETA)
          // ==============================
          try {
            // ✅ Llamamos a la función SQL (que ya no falla)
            const missionResult = await missionsService.trackGiveLike('video', videoId);
            
            // ================================================================
            // ✅ INICIO: LÓGICA DE NOTIFICACIONES SINCRONIZADA
            // ================================================================
            if (missionResult.result === 'success' && missionResult.points_earned > 0) { 
              // 1. MISIÓN COMPLETA
              const pointsEarned = missionResult.points_earned; 
              await addPoints(pointsEarned, missionResult.message || 'Misión de Likes completada', 'free'); 
              showPointsNotification(`Misión Completa: +${pointsEarned} puntos 🎉`, videoId, 'success');
              
              // Marcar TODOS los videos como 'hechos' para hoy
              const allVideoIds = videos.map(v => v.id);
              setActionsPerformed(prev => ({ ...prev, likes: new Set(allVideoIds) }));

            } else if (missionResult.result === 'progress_updated') {
              // 2. PROGRESO REGISTRADO
              showPointsNotification(`Acción registrada. Sigue dando Likes!`, videoId, 'success');
                 
            } else if (missionResult.result === 'already_completed') {
              // 3. ANTI-FARMING (Misión ya completada hoy)
              showPointsNotification(`Ya completaste la misión de Likes hoy.`, videoId, 'restriction');
               // Marcar TODOS los videos como 'hechos' para hoy
              const allVideoIds = videos.map(v => v.id);
              setActionsPerformed(prev => ({ ...prev, likes: new Set(allVideoIds) }));
            }
            // ================================================================
            // ✅ FIN: LÓGICA DE NOTIFICACIONES
            // ================================================================

          } catch (pointsError) {
            console.error('❌ Error al procesar puntos o misión:', pointsError);
          }
        } else {
          // ==============================
          // YA GANÓ PUNTOS HOY
          // ==============================
          console.log('ℹ️ El usuario ya completó la misión de likes hoy.');
          showPointsNotification('Ya completaste esta misión hoy', videoId, 'restriction');
        }
      }
      
      setLikedVideos(newLikedVideos);
      setDislikedVideos(newDislikedVideos);
    } catch (error) {
      console.error('❌ Error en like:', error);
    }
  };
  
  // ... (handleDislike - modificado para llamar a handleLike si es necesario)
  
  const handleDislike = async (videoId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const newDislikedVideos = new Set(dislikedVideos);
      const newLikedVideos = new Set(likedVideos);
      
      if (newDislikedVideos.has(videoId)) {
        newDislikedVideos.delete(videoId);
      } else {
        newDislikedVideos.add(videoId);
        
        if (newLikedVideos.has(videoId)) {
          // Si tenía like, llamamos a handleLike para quitarlo
          await handleLike(videoId, e);
        }
      }
      
      setDislikedVideos(newDislikedVideos);
    } catch (error) {
      console.error('Error en dislike:', error);
    }
  };

  
  // ... (El resto del archivo: handleSave, handleGiftClick,
  //      sistema de comentarios, JSX de renderizado, etc.)
  // ...
  
  // (Dentro del JSX de renderizado)
            // ...
            {/* ✅ BOTÓN DE LIKE CON NOTIFICACIÓN */}
            <div className="relative flex flex-col items-center space-y-1">
              <button 
                onClick={(e) => handleLike(currentVideo.id, e)} 
                className="flex flex-col items-center space-y-1"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${likedVideos.has(currentVideo.id) ? 'text-red-500' : 'text-white hover:scale-110'}`}>
                  <Icon name="ThumbsUp" size={26} className={likedVideos.has(currentVideo.id) ? 'fill-current' : ''} />
                </div>
                <span className="font-semibold text-xs text-white">{formatCount(getVideoCounter(currentVideo.id, 'likes'))}</span>
              </button>

              {/* ================================================== */}
              {/* ✅ NOTIFICACIÓN DE PUNTOS (CON ESTILO DINÁMICO)   */}
              {/* ================================================== */}
              {pointsNotification.show && pointsNotification.videoId === currentVideo.id && (
                <div className={`absolute -left-32 top-0 px-3 py-2 rounded-lg shadow-xl animate-bounce font-bold text-xs whitespace-nowrap
                  ${pointsNotification.type === 'success' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                  }
                `}>
                  {pointsNotification.message}
                </div>
              )}
            </div>
            {/* ... (resto del JSX) ... */}
  
}; // Fin del componente ReelsContainer

export default ReelsContainer;
