// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - VERSIÓN FINAL CORREGIDA ✅
// ✅ FIX DUPLICACIÓN: Protección contra doble llamada a handleLike
// ✅ FIX PUNTOS EN TIEMPO REAL: Balance se actualiza inmediatamente
// ✅ FIX MISIONES: Progress se ve correctamente sin recargar
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from 'lib/supabase';
import { usePoints } from 'contexts/PointsContext';
import { useNotification } from 'contexts/NotificationContext'; 
import * as missionsService from 'services/missionsService';
import Icon from 'components/AppIcon';
import useIsMobile from 'hooks/useIsMobile';
import GiftPointsModal from 'components/GiftPointsModal'; 
import VideoActionButtons from './VideoActionButtons'; 

// ===============================
// COMPONENTE PRINCIPAL: REELS CONTAINER
// ===============================
const ReelsContainer = ({ 
  videos = [], 
  selectedReelId = null,
  onLoadMore,     
  hasMore = true, 
  loading = false 
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  // 1. LLAMADA A HOOKS Y CONTEXTOS
  const { 
    missions, 
    updateMissionOptimistic, 
    rollbackMission, 
    notifyMissionComplete,
    updateLocalBalance,
    refreshMissions // 🔥 NUEVO: Añadimos refresh para forzar actualización
  } = usePoints();

  const { success, error: notifyError, warning, info } = useNotification();

  // 2. DECLARACIÓN DE ESTADOS
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
  
  // Estados de Comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  
  const [showGiftModal, setShowGiftModal] = useState(false); 
  const [videoWatchedIds, setVideoWatchedIds] = useState(new Set());
  const [pointsRewardedIds, setPointsRewardedIds] = useState(new Set());
  
  // 🔥 NUEVO: Ref para evitar doble ejecución
  const processingLikes = useRef(new Set());
  
  // Refs
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isInitialMount = useRef(true);
  const hasPlayedInitial = useRef(false);
  const lastNavigationIndex = useRef(-1);

  // Helper de notificación
  const showPointsNotification = (message, videoId, type = 'success') => {
    if (type === 'success') success(message, { duration: 2500 });
    else if (type === 'error' || type === 'restriction') warning(message, { duration: 2500 });
    else info(message, { duration: 2500 });
  };

  // ===============================
  // 🚀 INFINITE SCROLL TRIGGER
  // ===============================
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return;

    // Si estamos viendo uno de los últimos 2 videos, cargamos más
    if (currentIndex >= videos.length - 2) {
        onLoadMore();
    }
  }, [currentIndex, videos.length, onLoadMore, hasMore, loading]);

  // ===============================
  // LÓGICA DE CARGA Y SINCRONIZACIÓN
  // ===============================
  const getInitialReelIndex = useCallback(() => {
    if (!selectedReelId) return 0;
    const index = videos.findIndex(video => video.id === selectedReelId);
    return index < 0 ? 0 : index;
  }, [selectedReelId, videos]);

  useEffect(() => {
    if (videos.length === 0) return;
    const correctIndex = getInitialReelIndex();
    if (isInitialMount.current) {
      setCurrentIndex(correctIndex);
      setEnableTransition(false);
      setTimeout(() => { setEnableTransition(true); isInitialMount.current = false; }, 100);
    } else { 
      if (videos.length <= 12 && currentIndex === 0) setCurrentIndex(correctIndex);
    }
  }, [selectedReelId, videos, getInitialReelIndex]);

  // Cargar datos del usuario
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: p } = await supabase.from('user_profiles').select('id, full_name, avatar_url, username').eq('id', user.id).single();
            setCurrentUser(p || { id: user.id, name: 'Usuario', avatar: null, username: 'usuario' });
            
            const { data: l } = await supabase.from('video_likes').select('video_id').eq('user_id', user.id);
            if (l) setLikedVideos(new Set(l.map(x => x.video_id)));
            
            const { data: s } = await supabase.from('saved_videos').select('video_id').eq('user_id', user.id);
            if (s) setSavedVideos(new Set(s.map(x => x.video_id)));
            
            const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
            if (f) setFollowedCreators(new Set(f.map(x => x.following_id)));
        }
      } catch (e) { console.error(e); }
    };
    loadData();
  }, [videos.length === 0]);

  // Inicializar contadores
  useEffect(() => {
      setVideoCounters(prev => {
          const newCounters = { ...prev };
          videos.forEach(v => {
              if (!newCounters[v.id]) {
                  newCounters[v.id] = { 
                      views: v.views_count || 0, 
                      likes: v.likes_count || 0, 
                      comments: v.comments_count || 0 
                  };
              }
          });
          return newCounters;
      });
  }, [videos]);

  // Cargar comentarios
  const loadComments = useCallback(async (videoId) => {
      const { data, error } = await supabase
          .from('comments')
          .select(`*, user:user_profiles!comments_user_id_fkey(id, full_name, avatar_url, username), replies:comments!parent_comment_id(*, user:user_profiles!comments_user_id_fkey(id, full_name, avatar_url, username))`)
          .eq('content_id', videoId)
          .eq('content_type', 'reel')
          .is('parent_comment_id', null)
          .order('created_at', { ascending: false });
      
      if (!error && data) {
          setComments(p => ({
              ...p, [videoId]: data.map(c => ({
                  ...c, user: { name: c.user?.full_name || 'Usuario', avatar: c.user?.avatar_url, username: c.user?.username || 'user' },
                  replies: (c.replies || []).map(r => ({ ...r, user: { name: r.user?.full_name || 'Usuario', avatar: r.user?.avatar_url } }))
              }))
          }));
      }
  }, []);

  const formatTimeAgo = (date) => {
      const s = Math.floor((new Date() - new Date(date)) / 1000);
      if (s < 60) return 'ahora'; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`;
  };

  const formatCount = (num) => {
      if (!num) return '0'; if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`; if (num >= 1000) return `${(num / 1000).toFixed(1)}K`; return num.toString();
  };

  useEffect(() => {
    const v = videoRefs.current[currentIndex];
    const d = videos[currentIndex];
    if (!v || !d) return;
    
    const attemptPlay = () => {
      setLoadingVideo(true);
      v.muted = mutedVideos.has(d.id);
      v.play()
        .then(() => { hasPlayedInitial.current = true; lastNavigationIndex.current = currentIndex; })
        .catch(() => { v.muted=true; v.play(); hasPlayedInitial.current=true; });
    };
    setTimeout(attemptPlay, 250);
  }, [videos, currentIndex, mutedVideos]);

  // Navegación
  useEffect(() => {
      if (!isDesktop) return;
      const handleWheel = (e) => {
          e.preventDefault();
          clearTimeout(handleWheel.timeout);
          handleWheel.timeout = setTimeout(() => {
              if (e.deltaY > 0 && currentIndex < videos.length - 1) setCurrentIndex(p => p + 1);
              else if (e.deltaY < 0 && currentIndex > 0) setCurrentIndex(p => p - 1);
          }, 150);
      };
      const c = containerRef.current;
      if (c) { c.addEventListener('wheel', handleWheel, {passive:false}); return () => c.removeEventListener('wheel', handleWheel); }
  }, [isDesktop, currentIndex, videos.length]);

  useEffect(() => {
      if (videos.length === 0) return;
      const v = videoRefs.current[currentIndex];
      if (v) {
          videoRefs.current.forEach((vid, i) => { if(vid && i !== currentIndex) vid.pause(); });
          v.muted = mutedVideos.has(videos[currentIndex]?.id);
          if (lastNavigationIndex.current !== currentIndex) {
              v.currentTime = 0; lastNavigationIndex.current = currentIndex;
              v.play().then(()=>setIsAutoPlaying(true)).catch(()=>{v.muted=true; v.play().then(()=>setIsAutoPlaying(true));});
          } else if (isAutoPlaying) {
              v.play().catch(()=>{}); 
          } else {
              v.pause();
          }
      }
  }, [currentIndex, isAutoPlaying, videos, mutedVideos]);

  // Tracking View
  useEffect(() => {
      const v = videoRefs.current[currentIndex];
      const d = videos[currentIndex];
      if (!v || !d) return;
      
      const handleTime = async () => {
          if ((v.currentTime / v.duration) * 100 > 30 && !videoWatchedIds.has(d.id + '_view')) {
             setVideoCounters(prev => ({
                ...prev,
                [d.id]: { ...prev[d.id], views: (prev[d.id]?.views || 0) + 1 }
             }));
             setVideoWatchedIds(p => new Set([...p, d.id + '_view']));
          }

          if ((v.currentTime / v.duration) * 100 > 80 && !videoWatchedIds.has(d.id)) {
              setVideoWatchedIds(p => new Set([...p, d.id]));
              missionsService.trackWatchVideo('reel', d.id, v.currentTime).then(res => {
                  if (res.result === 'success' && res.points_earned > 0) {
                      const earned = Number(res.points_earned);
                      if (updateLocalBalance) updateLocalBalance(earned);
                      showPointsNotification(`+${earned} PUNTOS por ver`, d.id, 'success');
                      // 🔥 Forzar refresh de misiones
                      if (refreshMissions) refreshMissions();
                  }
              });
          }
      };
      v.addEventListener('timeupdate', handleTime);
      return () => v.removeEventListener('timeupdate', handleTime);
  }, [currentIndex, videos, videoWatchedIds, updateLocalBalance, refreshMissions]);

  const handlePlayPause = useCallback((e) => {
      if (e && e.target.tagName !== 'VIDEO') return;
      const v = videoRefs.current[currentIndex];
      if (v) { if(v.paused) { v.play(); setIsAutoPlaying(true); } else { v.pause(); setIsAutoPlaying(false); } }
  }, [currentIndex]);
  
  const navigateNext = useCallback(() => { if(currentIndex < videos.length-1) { setEnableTransition(true); setCurrentIndex(p=>p+1); setIsAutoPlaying(true); } }, [currentIndex, videos.length]);
  const navigatePrevious = useCallback(() => { if(currentIndex > 0) { setEnableTransition(true); setCurrentIndex(p=>p-1); setIsAutoPlaying(true); } }, [currentIndex]);
  
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => { touchEndY.current = e.touches[0].clientY; };
  const handleTouchEnd = () => { if(Math.abs(touchStartY.current - touchEndY.current) > 50) touchStartY.current > touchEndY.current ? navigateNext() : navigatePrevious(); };

  useEffect(() => {
      const k = (e) => {
          if(e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
          if(e.key==='ArrowDown') navigateNext(); if(e.key==='ArrowUp') navigatePrevious(); if(e.key===' ') {e.preventDefault(); handlePlayPause();}
          if(e.key==='Escape' && showCommentsModal) handleCloseComments();
      };
      window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [navigateNext, navigatePrevious, handlePlayPause, showCommentsModal]);

  // ==========================================================================
  // 🔥 MANEJADOR DE LIKE - VERSIÓN FINAL CORREGIDA
  // ==========================================================================
  const handleLike = async (videoId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    
    // 🔥 PROTECCIÓN ANTI-DUPLICACIÓN
    if (processingLikes.current.has(videoId)) {
      console.log('⚠️ Like ya en proceso para:', videoId);
      return;
    }
    
    processingLikes.current.add(videoId);
    const snapshot = missions.map(m => ({ ...m })); 
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        processingLikes.current.delete(videoId);
        navigate('/login'); 
        return; 
      }
      
      const targetVideo = videos.find(v => v.id === videoId);
      if (targetVideo && targetVideo.creator?.id === user.id) {
          processingLikes.current.delete(videoId);
          showPointsNotification('No puedes dar like a tus propios videos', videoId, 'restriction');
          return;
      }

      const newLiked = new Set(likedVideos);
      const isLiked = newLiked.has(videoId);

      if (isLiked) {
          // UNLIKE
          newLiked.delete(videoId);
          setVideoCounters(p => ({ ...p, [videoId]: { ...p[videoId], likes: Math.max(0, (p[videoId]?.likes||0)-1)}}));
          await supabase.from('video_likes').delete().eq('video_id', videoId).eq('user_id', user.id); 
          showPointsNotification('Like removido', videoId, 'info'); 
          setLikedVideos(newLiked);
          processingLikes.current.delete(videoId);
      } else {
          // LIKE
          newLiked.add(videoId);
          setDislikedVideos(p => { const n = new Set(p); n.delete(videoId); return n; });
          
          const { error: likeInsertError } = await supabase.from('video_likes').insert({ 
            video_id: videoId, 
            user_id: user.id 
          });
          
          if (likeInsertError) {
             console.error('❌ Error inserción like:', likeInsertError);
             showPointsNotification(`Error: ${likeInsertError.message}`, videoId, 'error');
             newLiked.delete(videoId); 
             setLikedVideos(newLiked); 
             processingLikes.current.delete(videoId);
             return;
          }
          
          // ✅ Incremento visual DESPUÉS de inserción exitosa
          setVideoCounters(p => ({ 
            ...p, 
            [videoId]: { 
              ...p[videoId], 
              likes: (p[videoId]?.likes || 0) + 1
            }
          }));
          setLikedVideos(newLiked);

          // 🔥 TRACKING DE MISIÓN
          if (!pointsRewardedIds.has(videoId)) {
              const res = await missionsService.trackGiveLike('reel', videoId);
              console.log('📊 Respuesta track_mission:', res);
              
              // 🔥 ACTUALIZACIÓN CENTRALIZADA DE PUNTOS
              if (res.points_earned > 0) {
                  const earned = Number(res.points_earned);
                  
                  // 1. Actualizar balance visual INMEDIATAMENTE
                  if (updateLocalBalance) {
                    updateLocalBalance(earned);
                    console.log(`✅ Balance actualizado: +${earned} puntos`);
                  }
                  
                  // 2. Actualizar progreso de misión
                  updateMissionOptimistic('give_like', 1);
                  
                  // 3. Forzar refresh de misiones desde el servidor
                  if (refreshMissions) {
                    await refreshMissions();
                    console.log('🔄 Misiones refrescadas desde servidor');
                  }
                  
                  // 4. Mostrar notificación apropiada
                  if (res.result === 'success') {
                      // Misión completada
                      if (notifyMissionComplete) {
                          notifyMissionComplete(earned);
                      } else {
                          showPointsNotification(`🎉 ¡Misión Cumplida! +${earned} puntos`, videoId, 'success');
                      }
                  } else {
                      // Solo progreso
                      showPointsNotification(`✓ Like registrado (+${earned})`, videoId, 'success');
                  }
                  
                  setPointsRewardedIds(p => new Set([...p, videoId]));
                  
              } else {
                  // Sin puntos pero registrado
                  if (res.result === 'already_paid') {
                      showPointsNotification('Ya sumaste puntos por esto', videoId, 'info');
                  } else {
                      showPointsNotification('✓ Like registrado', videoId, 'info');
                      updateMissionOptimistic('give_like', 1);
                  }
                  setPointsRewardedIds(p => new Set([...p, videoId]));
              }
          } else {
              showPointsNotification('✓ Like registrado', videoId, 'info');
          }
          
          processingLikes.current.delete(videoId);
      }
    } catch (err) { 
        console.error('❌ Error en handleLike:', err);
        rollbackMission(snapshot); 
        showPointsNotification('Error de conexión', videoId, 'error');
        processingLikes.current.delete(videoId);
    }
  };

  const handleDislike = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const newD = new Set(dislikedVideos);
      if (newD.has(videoId)) newD.delete(videoId);
      else { newD.add(videoId); if (likedVideos.has(videoId)) handleLike(videoId, e); }
      setDislikedVideos(newD);
  };

  const handleSave = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const { data: { user } } = await supabase.auth.getUser();
      const newS = new Set(savedVideos);
      if (newS.has(videoId)) { newS.delete(videoId); await supabase.from('saved_videos').delete().eq('video_id', videoId).eq('user_id', user.id); }
      else { newS.add(videoId); await supabase.from('saved_videos').insert({ video_id: videoId, user_id: user.id }); }
      setSavedVideos(newS);
  };

  const handleShare = (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      if (navigator.share) {
          navigator.share({ title: 'Video', url: window.location.href }).catch(() => {});
      } else {
          navigator.clipboard.writeText(window.location.href);
          success('Link copiado');
      }
  };

  const handleMuteToggle = (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      setMutedVideos(p => { const n = new Set(p); n.has(videoId) ? n.delete(videoId) : n.add(videoId); return n; });
      const v = videoRefs.current[currentIndex];
      if (v) v.muted = !v.muted;
  };

  const handleFollow = async (creatorId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      if (user.id === creatorId) { showPointsNotification('No puedes seguirte a ti mismo', null, 'restriction'); return; }

      const newF = new Set(followedCreators);
      if (newF.has(creatorId)) {
          newF.delete(creatorId);
          await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', creatorId);
          success('Dejaste de seguir');
      } else {
          newF.add(creatorId);
          await supabase.from('follows').insert({ follower_id: user.id, following_id: creatorId });
          success('Siguiendo');
      }
      setFollowedCreators(newF);
  };

  const handleGiftClick = (e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      setShowGiftModal(true);
  };

  // COMENTARIOS
  const handleOpenComments = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      setShowCommentsModal(true);
      await loadComments(videoId);
  };

  const handleCloseComments = () => { setShowCommentsModal(false); setReplyingTo(null); setNewComment(''); };

  const handleAddComment = async (videoId) => {
      if (!newComment.trim() || !currentUser) return;
      const { error } = await supabase.from('comments').insert({
          content_id: videoId, content_type: 'reel', user_id: currentUser.id, content: newComment.trim(),
          parent_comment_id: replyingTo
      });
      if (!error) {
          setVideoCounters(p => ({ ...p, [videoId]: { ...p[videoId], comments: (p[videoId]?.comments || 0) + 1 } }));
          setNewComment(''); setReplyingTo(null); await loadComments(videoId);
      }
  };

  const handleReply = (commentId, username) => { setReplyingTo(commentId); setNewComment(`@${username} `); };
  const handleCancelReply = () => { setReplyingTo(null); setNewComment(''); };
  const toggleReplies = (commentId) => { setShowReplies(p => ({ ...p, [commentId]: !p[commentId] })); };

  const currentVideo = videos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < videos.length - 1;

  if (videos.length === 0) {
      return (
          <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="text-center">
                  <Icon name="Film" size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-xl text-gray-600">No hay reels disponibles</p>
              </div>
          </div>
      );
  }

  return (
    <div className={`relative w-full ${isMobile ? 'h-screen' : 'h-screen flex items-center justify-center bg-black'}`}>
      <div className={`${isDesktop ? 'flex items-center max-w-7xl mx-auto' : ''} h-full`}>
        {/* NAVEGACIÓN DESKTOP */}
        {isDesktop && (
          <>
            <button onClick={navigatePrevious} disabled={!hasPrev} className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all ${!hasPrev ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Icon name="ChevronUp" size={24} />
            </button>
            <button onClick={navigateNext} disabled={!hasNext && !hasMore} className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all ${(!hasNext && !hasMore) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Icon name="ChevronDown" size={24} />
            </button>
          </>
        )}

        {/* CONTENEDOR DE VIDEO */}
        <div className={`relative ${isDesktop ? 'w-[45%]' : 'w-full'} h-full bg-black`}>
          <div ref={containerRef} className="relative h-full overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <div className={`flex flex-col h-full ${enableTransition ? 'transition-transform duration-500 ease-out' : ''}`} style={{ transform: `translateY(-${currentIndex * 100}%)` }}>
              {videos.map((video, index) => (
                <div key={video.id} className="flex-shrink-0 relative w-full h-full" style={{ minHeight: '100vh' }}>
                  <video ref={el => videoRefs.current[index] = el} className="w-full h-full object-cover" src={video.video_url} playsInline webkit-playsinline="true" preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'metadata'} loop onClick={handlePlayPause} onLoadedData={() => { if (index === currentIndex) setLoadingVideo(false); }} />
                  
                  {loadingVideo && index === currentIndex && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent" style={{ paddingBottom: isMobile ? '120px' : '20px' }}>
                    <div className="flex items-center space-x-3 mb-2">
                      <Link to={`/profile/${video.creator?.username}`} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                        {video.creator?.avatar ? <img src={video.creator.avatar} alt={video.creator.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">{video.creator?.name?.charAt(0)}</div>}
                      </Link>
                      <div className="flex-1">
                        <Link to={`/profile/${video.creator?.username}`} className="font-semibold text-white hover:underline">{video.creator?.name}</Link>
                        <p className="text-xs text-white/80">@{video.creator?.username}</p>
                      </div>
                    </div>
                    
                    {video.description && (<p className="text-white text-sm mb-2 line-clamp-2">{video.description}</p>)}
                    
                    <div className="flex flex-wrap gap-2">
                      {video.hashtags?.map((tag, i) => (<Link key={i} to={`/explore?tag=${tag}`} className="text-xs text-blue-300 hover:text-blue-200">#{tag}</Link>))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && hasMore && currentIndex >= videos.length - 3 && (
                <div className="absolute bottom-20 left-0 right-0 p-4 bg-black/50 text-white">
                    <div className="text-center">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p>Cargando más reels...</p>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        {currentVideo && (
            <VideoActionButtons 
                video={currentVideo}
                isMobile={isMobile}
                currentUser={currentUser}
                isLiked={likedVideos.has(currentVideo.id)}
                isDisliked={dislikedVideos.has(currentVideo.id)}
                isSaved={savedVideos.has(currentVideo.id)}
                isMuted={mutedVideos.has(currentVideo.id)}
                isFollowed={followedCreators.has(currentVideo.creator?.id)}
                likesCount={formatCount(videoCounters[currentVideo.id]?.likes || 0)}
                commentsCount={formatCount(videoCounters[currentVideo.id]?.comments || 0)}
                onLike={handleLike}
                onDislike={handleDislike}
                onSave={handleSave}
                onShare={handleShare}
                onMute={handleMuteToggle}
                onComment={handleOpenComments}
                onFollow={handleFollow}
                onGift={handleGiftClick}
            />
        )}

        {/* MODAL DE COMENTARIOS - DESKTOP */}
        {showCommentsModal && currentVideo && isDesktop && (
          <div className="w-[45%] h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col ml-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comentarios ({formatCount(videoCounters[currentVideo.id]?.comments)})</h3>
              <button onClick={handleCloseComments} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Icon name="X" size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments[currentVideo.id]?.length > 0 ? (
                comments[currentVideo.id].map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                        {comment.user?.avatar ? <img src={comment.user.avatar} alt="Avatar" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-xs">{comment.user?.name?.charAt(0)}</div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2"><span className="font-semibold text-sm">{comment.user?.name}</span><span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span></div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <button onClick={() => handleReply(comment.id, comment.user?.username)} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Responder</button>
                        
                        {comment.replies?.length > 0 && (
                          <div className="mt-2">
                            <button onClick={() => toggleReplies(comment.id)} className="text-xs text-blue-600 hover:text-blue-700">
                              {showReplies[comment.id] ? 'Ocultar respuestas' : `Ver ${comment.replies.length} respuestas`}
                            </button>
                            {showReplies[comment.id] && (
                              <div className="space-y-2 pl-4 border-l-2 border-gray-200 mt-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                       {reply.user?.avatar ? <img src={reply.user.avatar} alt="Av" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-purple-400 flex items-center justify-center text-white text-[10px]">{reply.user?.name?.charAt(0)}</div>}
                                    </div>
                                    <div className="flex-1"><span className="font-semibold text-xs">{reply.user?.name}</span><p className="text-xs">{reply.content}</p></div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500"><Icon name="MessageCircle" size={48} className="mx-auto mb-2 text-gray-300"/><p>No hay comentarios aún. ¡Sé el primero!</p></div>
              )}
            </div>

            <div className="p-4 border-t">
              {replyingTo && (<div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded"><span className="text-sm text-blue-700">Respondiendo a @{videos.find(v=>v.id===currentVideo.id)?.creator?.username}...</span><button onClick={handleCancelReply} className="text-blue-600"><Icon name="X" size={16} /></button></div>)}
              <div className="flex space-x-2">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500" rows={1} />
                <button onClick={() => handleAddComment(currentVideo.id)} disabled={!newComment.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"><Icon name="Send" size={20} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* MODAL DE COMENTARIOS - MOBILE */}
      {showCommentsModal && currentVideo && isMobile && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={handleCloseComments}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comentarios ({formatCount(videoCounters[currentVideo.id]?.comments)})</h3>
              <button onClick={handleCloseComments} className="p-2 hover:bg-gray-100 rounded-full"><Icon name="X" size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {comments[currentVideo.id]?.length > 0 ? comments[currentVideo.id].map(comment => (
                  <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                             {comment.user?.avatar ? <img src={comment.user.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white text-xs">{comment.user?.name?.charAt(0)}</div>}
                          </div>
                          <div className="flex-1">
                              <div className="flex items-center gap-2"><span className="font-bold text-sm">{comment.user?.name}</span><span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span></div>
                              <p className="text-sm">{comment.content}</p>
                              <button onClick={()=>handleReply(comment.id, comment.user?.username)} className="text-xs text-gray-500 mt-1">Responder</button>
                              
                              {comment.replies?.length > 0 && (
                                <div className="mt-2 pl-4 border-l-2">
                                   <button onClick={()=>toggleReplies(comment.id)} className="text-xs text-blue-500">Ver respuestas</button>
                                   {showReplies[comment.id] && comment.replies.map(r => (
                                       <div key={r.id} className="flex gap-2 mt-2"><span className="font-bold text-xs">{r.user?.name}</span><p className="text-xs">{r.content}</p></div>
                                   ))}
                                </div>
                              )}
                          </div>
                      </div>
                  </div>
               )) : <div className="text-center text-gray-500 py-10">No hay comentarios aún</div>}
            </div>

            <div className="p-4 border-t">
              {replyingTo && <div className="text-xs text-blue-500 mb-1 flex justify-between"><span>Respondiendo...</span><button onClick={handleCancelReply}>X</button></div>}
              <div className="flex gap-2">
                  <input value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Comenta..." className="flex-1 border rounded px-3 py-2"/>
                  <button onClick={()=>handleAddComment(currentVideo.id)} className="bg-blue-600 text-white p-2 rounded"><Icon name="Send" size={18}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Regalo */}
      {showGiftModal && currentVideo && (
        <GiftPointsModal isOpen={showGiftModal} onClose={()=>setShowGiftModal(false)} receiverId={currentVideo.creator?.id} contentId={currentVideo.id} contentType="reel" onSuccess={()=>{}} />
      )}
    </div>
  );
};

export default ReelsContainer;
