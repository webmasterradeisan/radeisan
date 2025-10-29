import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { addFreePoints } from 'services/pointsService';
import * as missionsService from 'services/missionsService';
import Icon from 'components/AppIcon';
import useIsMobile from 'hooks/useIsMobile';

// ===============================
// MOCK DATA Y HELPERS (Asegurar que el componente sea ejecutable)
// ===============================

// Función de ejemplo para formatear números
const formatCount = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
};

// Mock de la estructura de un video
const initialVideos = [
  {
    id: 1,
    url: 'https://example.com/video1.mp4',
    title: 'Mi primer Reel sobre React',
    description: 'Aprende a usar hooks en un minuto.',
    likes: 12500,
    comments: 345,
    music: 'Pista épica',
    creator: { id: 'u1', name: 'AlbaDev', avatar: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=AD' },
    is_liked: false,
    is_disliked: false,
    is_saved: false,
  },
  {
    id: 2,
    url: 'https://example.com/video2.mp4',
    title: 'Tailwind CSS Tips y Trucos',
    description: 'Clases que debes conocer para ser más rápido.',
    likes: 2500,
    comments: 89,
    music: 'Música chill',
    creator: { id: 'u2', name: 'FrontendPro', avatar: 'https://via.placeholder.com/150/007BFF/FFFFFF?text=FP' },
    is_liked: false,
    is_disliked: false,
    is_saved: false,
  },
];

// Mock de la estructura de un comentario
const mockComments = {
  1: [
    { id: 101, user: 'DevKing', comment: 'Excelente tutorial! Gracias.', date: '2025-10-25' },
    { id: 102, user: 'CodeQueen', comment: 'Muy útil para mi proyecto.', date: '2025-10-26' },
  ],
  2: [
    { id: 201, user: 'UXGeek', comment: 'Me encanta la rapidez de carga.', date: '2025-10-27' },
  ],
};

// ===============================
// COMPONENTE SECUNDARIO: REEL ITEM
// (Para evitar la duplicidad del mapeo)
// ===============================
const ReelItem = React.memo(({ video, index, isActive }) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    // Mobile Layout: Usa snap-start
    return (
      <div 
        id={`reel-mobile-${index}`}
        key={video.id}
        className="flex-shrink-0 relative w-full h-full snap-start"
      >
        <video 
          // ... (video ref y props) ...
          loop
          playsInline
          preload="auto"
          src={video.url}
          className="w-full h-full object-cover"
        />
        
        {/* INFO Y OVERLAY (Mobile) */}
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="text-white space-y-1 z-30">
                <Link to={`/profile/${video.creator.id}`} className="flex items-center space-x-2">
                    <img src={video.creator.avatar} alt={video.creator.name} className="w-8 h-8 rounded-full" />
                    <span className="font-bold text-lg hover:underline">{video.creator.name}</span>
                </Link>
                <p className="text-sm line-clamp-2">{video.description}</p>
                <div className="flex items-center space-x-2 text-xs">
                    <Icon name="Music" size={14} />
                    <span>{video.music}</span>
                </div>
            </div>

            {/* BOTONES DE ACCIÓN MOBILE (Lateral derecho) */}
            {/* ... (Implementación de botones mobile) ... */}
        </div>
        
      </div>
    );
  }
  
  // Desktop Layout (renderizado mínimo, la lógica de video y botones está en el padre)
  return (
    <div 
      id={`reel-${index}`}
      key={video.id}
      className={`
        flex-shrink-0 relative w-full max-w-[500px] h-full
        transition-opacity duration-300 ease-in-out
        ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 absolute top-0 left-0'}
      `}
      style={{ height: '80vh' }}
    >
      <video 
        // El ref del video se gestiona en el componente padre
        loop
        playsInline
        preload="auto"
        src={video.url}
        className="w-full h-full object-contain"
        // onLoadedData y onLoadStart se gestionan en el padre
      />

      {/* INFO DEL REEL (Desktop - Parte inferior izquierda) */}
      <div className="absolute bottom-0 left-0 p-6 z-30 text-white w-3/4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="space-y-2">
            <Link to={`/profile/${video.creator.id}`} className="flex items-center space-x-2 group">
                <span className="font-extrabold text-xl group-hover:underline">{video.creator.name}</span>
                <span className="text-sm text-gray-300">· hace 2h</span>
            </Link>
            <p className="text-base line-clamp-2">{video.description}</p>
            <div className="flex items-center space-x-2 text-sm font-semibold">
                <Icon name="Music" size={16} />
                <span>{video.music}</span>
            </div>
        </div>
      </div>
      
    </div>
  );
});
ReelItem.displayName = 'ReelItem';


// ===============================
// COMPONENTE PRINCIPAL: REELS CONTAINER
// ===============================
const ReelsContainer = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  
  // --- State Hooks ---
  const [videos, setVideos] = useState(initialVideos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState(mockComments);
  const [newComment, setNewComment] = useState('');
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [dislikedVideos, setDislikedVideos] = useState(new Set());
  const [savedVideos, setSavedVideos] = useState(new Set());
  const [followedCreators, setFollowedCreators] = useState(new Set());
  const [mutedVideos, setMutedVideos] = useState(new Set());
  const [enableTransition, setEnableTransition] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayTimeout, setOverlayTimeout] = useState(null);
  const [pointsNotification, setPointsNotification] = useState({ show: false, points: 0, message: '' });
  
  // --- Refs ---
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const touchStartY = useRef(0);
  
  // --- Computed Values ---
  const currentVideo = useMemo(() => videos[currentIndex], [videos, currentIndex]);
  
  // --- Effects and Handlers ---
  
  // Maneja la reproducción y mute
  const handlePlayPause = useCallback(() => {
    // ... (Lógica de play/pause y overlay) ...
  }, [currentIndex, mutedVideos]);

  useEffect(() => {
    // Lógica para reproducir el video actual y pausar los demás
    // ...
  }, [currentIndex, mutedVideos]);

  // Manejo de scroll para desktop
  const handleScroll = useCallback((e) => {
    // ... (Lógica de scroll wheel para desktop) ...
  }, [currentIndex, videos.length, isDesktop]);

  // Manejo de touch para mobile
  const handleTouchStart = useCallback((e) => {
    // ... (Lógica touch start mobile) ...
  }, []);

  const handleTouchMove = useCallback((e) => {
    // ... (Lógica touch move mobile) ...
  }, []);

  const handleTouchEnd = useCallback(() => {
    // ... (Lógica touch end mobile) ...
  }, [currentIndex, videos.length]);

  // Navegación con teclado (Desktop)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ... (Lógica keydown: ArrowUp/Down/Space) ...
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, handlePlayPause, videos.length]);
  
  // Funciones de acción
  const handleLike = (id, e) => {
    e.stopPropagation();
    // ... (Lógica de like/dislike) ...
  };

  const handleDislike = (id, e) => {
    e.stopPropagation();
    // ... (Lógica de dislike/like) ...
  };

  const handleFollow = (creatorId, e) => {
    e.stopPropagation();
    // ... (Lógica de follow) ...
  };

  const handleSave = (id, e) => {
    e.stopPropagation();
    // ... (Lógica de guardar) ...
  };

  const handleShare = (video, e) => {
    e.stopPropagation();
    // ... (Lógica de compartir) ...
  };

  const handleMuteToggle = (id, e) => {
    e.stopPropagation();
    // ... (Lógica de mute) ...
  };
  
  // Lógica de comentarios
  const handleOpenComments = (id, e) => {
    e.stopPropagation();
    setShowCommentsModal(true);
    if (isDesktop && videoRefs.current[currentIndex]) {
        videoRefs.current[currentIndex].pause();
    }
  };

  const handleCloseComments = useCallback(() => {
    setShowCommentsModal(false);
    if (isDesktop && videoRefs.current[currentIndex]) {
        videoRefs.current[currentIndex].play();
    }
  }, [currentIndex, isDesktop]);

  const handleAddComment = (videoId) => {
    if (!newComment.trim()) return;
    const newCommentObj = { 
      id: Date.now(), 
      user: 'UsuarioActual', // **NOTA:** Este se debe reemplazar por el nombre real del usuario logueado.
      comment: newComment.trim(), 
      date: new Date().toISOString().split('T')[0] 
    };
    
    setComments(prev => ({
      ...prev,
      [videoId]: [...(prev[videoId] || []), newCommentObj]
    }));
    setNewComment('');
  };
  
  // Notificación de puntos
  const showPointsNotification = useCallback((points, message) => {
    setPointsNotification({ show: true, points, message });
  }, []);

  const hidePointsNotification = useCallback(() => {
    setPointsNotification(prev => ({ ...prev, show: false }));
  }, []);


  // ===============================
  // RENDER PRINCIPAL DEL COMPONENTE
  // ===============================

  return (
    <>
      {/* NOTIFICACIÓN FLOTANTE DE PUNTOS */}
      <FloatingPointsNotification
        points={pointsNotification.points}
        message={pointsNotification.message}
        show={pointsNotification.show}
        onHide={hidePointsNotification}
      />
      
      <div className="relative w-full h-full bg-white overflow-hidden">
        {/* CONTENEDOR PRINCIPAL: CENTRA TODO EL SISTEMA (REELS + SIDEBARS) */}
        <div className="flex h-full w-full items-center justify-center">
        
          {/* ======================================================= */}
          {/* 1. REEL AND ACTIONS WRAPPER (ESTE ES EL QUE SE MUEVE)   */}
          {/* ======================================================= */}
          {isDesktop && (
            <div 
              className={`
                flex items-center justify-center h-[80vh] flex-shrink-0
                transition-transform duration-300 ease-in-out 
                ${showCommentsModal ? 'transform -translate-x-[200px]' : 'transform translate-x-0'} 
              `}
              onClick={handlePlayPause} // Click en el espacio vacío del wrapper para pausar/reproducir
            >
              {/* 1.1 CONTENEDOR DEL REEL (TAMAÑO FIJO: 500px) */}
              <div 
                className={`
                  relative overflow-hidden flex-shrink-0
                  w-full max-w-[500px] h-full bg-gray-900 rounded-xl shadow-2xl
                `}
              >
                
                {/* CONTENEDOR DE REELS (MOVIMIENTO VERTICAL) */}
                <div
                  ref={containerRef}
                  className={`flex flex-col h-full ease-out ${enableTransition ? 'transition-transform duration-500' : ''}`}
                  style={{
                    transform: `translateY(-${currentIndex * 80}vh)` // 80vh porque el wrapper mide 80vh
                  }}
                  onWheel={handleScroll}
                >
                  {videos.map((video, index) => (
                    // Aquí se renderizan los videos. El ReelItem gestiona el render del video y su info.
                    <ReelItem
                      key={video.id}
                      video={video}
                      index={index}
                      isActive={index === currentIndex}
                    />
                  ))}
                </div>

                {/* FLECHAS DE NAVEGACIÓN DESKTOP (dentro del Reel) */}
                {isDesktop && (
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none p-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => Math.max(0, prev - 1)); }}
                      disabled={currentIndex === 0}
                      className="p-2 pointer-events-auto text-white opacity-70 hover:opacity-100 disabled:opacity-30 transition-opacity"
                    >
                      <Icon name="ChevronUp" size={32} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => Math.min(videos.length - 1, prev + 1)); }}
                      disabled={currentIndex === videos.length - 1}
                      className="p-2 pointer-events-auto text-white opacity-70 hover:opacity-100 disabled:opacity-30 transition-opacity"
                    >
                      <Icon name="ChevronDown" size={32} />
                    </button>
                  </div>
                )}
                
                {/* INSTRUCCIONES (dentro del Reel) */}
                {currentIndex === 0 && (
                  <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-none z-40">
                    <p className="text-sm font-light bg-black/50 p-2 rounded-lg">Usa la rueda del ratón o las flechas para navegar.</p>
                  </div>
                )}
              </div>
              
              {/* 1.2 CONTROLES LATERALES - DESKTOP (FUERA DEL REEL, A SU DERECHA) */}
              {currentVideo && (
                <div 
                  className="flex flex-col items-center space-y-6 ml-6 z-50 flex-shrink-0" // ml-6 para separarse del Reel
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Avatar con nombre de usuario real */}
                  <div className="relative">
                    <Link 
                      to={`/profile/${currentVideo?.creator?.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-300 shadow-lg hover:scale-110 transition-transform bg-white">
                        {currentVideo?.creator?.avatar ? (
                          <img 
                            src={currentVideo.creator.avatar} 
                            alt={currentVideo.creator.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">
                              {currentVideo?.creator?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                    
                    {!followedCreators.has(currentVideo?.creator?.id) && (
                      <button
                        onClick={(e) => handleFollow(currentVideo?.creator?.id, e)}
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110"
                      >
                        <Icon name="Plus" size={18} color="white" />
                      </button>
                    )}
                  </div>

                  {/* Like */}
                  <button 
                    onClick={(e) => handleLike(currentVideo?.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${likedVideos.has(currentVideo?.id) ? 'bg-red-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-red-50'}`}>
                      <Icon name="ThumbsUp" size={28} className={likedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
                    </div>
                    <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                      {formatCount(currentVideo?.likes || 0)}
                    </span>
                  </button>

                  {/* Dislike */}
                  <button 
                    onClick={(e) => handleDislike(currentVideo?.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${dislikedVideos.has(currentVideo?.id) ? 'bg-gray-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-gray-50'}`}>
                      <Icon name="ThumbsDown" size={28} className={dislikedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
                    </div>
                  </button>

                  {/* Comentarios */}
                  <button 
                    onClick={(e) => handleOpenComments(currentVideo?.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-blue-50">
                      <Icon name="MessageCircle" size={28} />
                    </div>
                    <span className="font-bold text-sm text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm">
                      {formatCount(currentVideo?.comments || 0)}
                    </span>
                  </button>

                  {/* Guardar */}
                  <button 
                    onClick={(e) => handleSave(currentVideo?.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${savedVideos.has(currentVideo?.id) ? 'bg-yellow-500 text-white scale-110' : 'bg-white text-gray-800 hover:scale-110 group-hover:bg-yellow-50'}`}>
                      <Icon name="Bookmark" size={28} className={savedVideos.has(currentVideo?.id) ? 'fill-current' : ''} />
                    </div>
                  </button>

                  {/* Compartir */}
                  <button 
                    onClick={(e) => handleShare(currentVideo, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-green-50">
                      <Icon name="Share2" size={28} />
                    </div>
                  </button>

                  {/* Volumen */}
                  <button 
                    onClick={(e) => handleMuteToggle(currentVideo?.id, e)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white shadow-lg text-gray-800 group-hover:bg-purple-50">
                      <Icon name={mutedVideos.has(currentVideo?.id) ? 'VolumeX' : 'Volume2'} size={28} />
                    </div>
                  </button>

                  {/* Música */}
                  <button 
                    className="flex flex-col items-center mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg hover:scale-110 transition-transform">
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
                        <Icon name="Music" size={20} color="white" />
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 2. PANEL DE COMENTARIOS - DESKTOP (FIJO A LA DERECHA)   */}
          {/* ======================================================= */}
          {isDesktop && showCommentsModal && currentVideo && (
            <div 
              // Hermano del ReelAndActionsWrapper. Aparece a su derecha.
              className="w-[400px] h-[80vh] bg-white flex flex-col shadow-2xl rounded-xl flex-shrink-0 z-20"
              style={{ marginLeft: '20px' }} // Separación visual del ReelAndActionsWrapper
            >
              {/* === CONTENIDO DEL MODAL DE COMENTARIOS DESKTOP === */}
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold">Comentarios ({formatCount(currentVideo.comments)})</h3>
                <button onClick={handleCloseComments} className="p-1 rounded-full hover:bg-gray-100">
                  <Icon name="X" size={24} />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {(comments[currentVideo.id] || []).map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                      <Icon name="User" size={16} className="text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        {/* Nombre de usuario real del comentario */}
                        <span className="font-semibold text-sm">{comment.user}</span> 
                        <span className="text-xs text-gray-500">{comment.date}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.comment}</p>
                    </div>
                  </div>
                ))}
                {(!comments[currentVideo.id] || comments[currentVideo.id].length === 0) && (
                  <p className="text-center text-gray-500 mt-10">Sé el primero en comentar.</p>
                )}
              </div>
              
              <div className="p-4 border-t">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddComment(currentVideo.id);
                  }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Añade un comentario..."
                    className="w-full p-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className={`absolute right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      newComment.trim() 
                        ? 'bg-purple-500 hover:bg-purple-600 text-white cursor-pointer' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Icon name="Send" size={16} />
                  </button>
                </form>
              </div>
            </div>
          )}
          
          {/* ======================================================= */}
          {/* 3. LAYOUT MOBILE (Se renderiza si no es desktop)        */}
          {/* ======================================================= */}
          {isMobile && (
            <div
              ref={containerRef}
              className="w-full h-screen overflow-y-scroll snap-y snap-mandatory bg-black"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {videos.map((video, index) => (
                <ReelItem
                  key={video.id}
                  video={video}
                  index={index}
                  isActive={index === currentIndex}
                />
              ))}
            </div>
          )}

        </div>
        
        {/* ======================================================= */}
        {/* 4. MODAL DE COMENTARIOS MOBILE (Fijo en el viewport)    */}
        {/* ======================================================= */}
        {isMobile && showCommentsModal && currentVideo && (
          <div
            // Mobile: Modal que se desliza desde abajo
            className={`fixed inset-0 bg-black/50 z-50 transition-all duration-300 ${showCommentsModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={handleCloseComments}
          >
            <div
              className={`absolute bottom-0 left-0 right-0 h-[60vh] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
                showCommentsModal ? 'translate-y-0' : 'translate-y-full'
              } flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold">Comentarios</h3>
                <button onClick={handleCloseComments} className="p-1 rounded-full hover:bg-gray-100">
                  <Icon name="X" size={24} />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {/* ... (Contenido de comentarios mobile, igual que desktop) ... */}
              </div>
              <div className="p-4 border-t">
                <div className="relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Añade un comentario..."
                    rows={1}
                    className="w-full p-2 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                    onClick={(e) => e.stopPropagation()}
                    onInput={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(currentVideo.id);
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleAddComment(currentVideo.id);
                    }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!newComment.trim()}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      newComment.trim() 
                        ? 'bg-purple-500 hover:bg-purple-600 text-white cursor-pointer' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Icon name="Send" size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReelsContainer;
