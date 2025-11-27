// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - VERSIÓN CON REFRESH MISSIONS ✅
// ✅ Fix: refreshMissions para sincronización en tiempo real
// ✅ Fix Visual: Suma puntos al balance SIEMPRE que la acción pague.
// ✅ Integración de Modal de Celebración (notifyMissionComplete).
// ✅ FIX DOBLE CONTEO: El incremento local de 'likes' se mueve a después de la 
//    inserción exitosa en la DB para evitar el doble conteo visual.
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
    refreshMissions  // 🔥 AGREGADO: Para sincronización real
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
          videos.forEach(v => { if (!newCounters[v.id]) newCounters[v.id] = { likes: v.likes_count || 0, comments: v.comments_count || 0, views: v.views_count || 0 }; });
          return newCounters;
      });
  }, [videos]);

  // Formatear números
  const formatCount = (count) => {
      if (!count || count === 0) return '0';
      if (count < 1000) return count.toString();
      if (count < 1000000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  };

  const formatTimeAgo = (date) => {
      if (!date) return '';
      const now = new Date();
      const past = new Date(date);
      const diff = Math.floor((now - past) / 1000);
      if (diff < 60) return 'ahora';
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
      return `${Math.floor(diff / 604800)}sem`;
  };

  // Auto-play del primer video
  useEffect(() => {
    if (videos.length === 0 || hasPlayedInitial.current) return;
    const attemptPlay = () => {
      const v = videoRefs.current[currentIndex];
      if (!v) return;
      v.muted = mutedVideos.has(videos[currentIndex]?.id) || !mutedVideos.size;
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
                  }
              });
          }
      };
      v.addEventListener('timeupdate', handleTime);
      return () => v.removeEventListener('timeupdate', handleTime);
  }, [currentIndex, videos, videoWatchedIds, updateLocalBalance]);

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
  // MANEJADORES DE ACCIONES (LIKES, FOLLOW, ETC.)
  // ==========================================================================

  // 🔥 LÓGICA ACTUALIZADA: COBERTURA TOTAL DE PUNTOS + REFRESH MISSIONS
  const handleLike = async (videoId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    
    const snapshot = missions.map(m => ({ ...m })); 
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      
      const targetVideo = videos.find(v => v.id === videoId);
      if (targetVideo && targetVideo.creator?.id === user.id) {
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
      } else {
          // LIKE
          newLiked.add(videoId);
          setDislikedVideos(p => { const n = new Set(p); n.delete(videoId); return n; });
          
          const { error: likeInsertError } = await supabase.from('video_likes').insert({ video_id: videoId, user_id: user.id });
          
          if (likeInsertError) {
             showPointsNotification(`❌ Fallo de Inserción: ${likeInsertError.message}`, videoId, 'error');
             newLiked.delete(videoId); 
             setLikedVideos(newLiked); 
             return;
          }
          
          // ✅ Incremento local después de la inserción exitosa
          setVideoCounters(p => ({ ...p, [videoId]: { ...p[videoId], likes: (p[videoId]?.likes||0)+1}}));

          if (pointsRewardedIds.has(videoId)) {
              showPointsNotification('Like registrado', videoId, 'info');
          } else {
              // Llamada al servidor (Paga en DB)
              const res = await missionsService.trackGiveLike('reel', videoId);
              
              // 🔥 REFRESCAR PROGRESO DESDE SERVIDOR
              if (refreshMissions) {
                await refreshMissions();
              }
              
              // 🔥 FIX: Si hay puntos ganados, ACTUALIZA SIEMPRE EL BALANCE VISUAL
              if (res.points_earned > 0) {
                  const earned = Number(res.points_earned);
                  if (updateLocalBalance) updateLocalBalance(earned);
              }

              if (res.result === 'success' && res.points_earned > 0) {
                  // CASO: MISIÓN CUMPLIDA
                  const earned = Number(res.points_earned);
                  if (notifyMissionComplete) {
                      notifyMissionComplete(earned); // Modal
                  } else {
                      showPointsNotification(`🎉 ¡Misión Cumplida! +${earned} puntos`, videoId, 'success');
                  }

                  setPointsRewardedIds(p => new Set([...p, videoId]));
                  updateMissionOptimistic('give_like', 1); 

              } else if (res.result === 'progress_updated' || res.result === 'registered') {
                  // CASO: SOLO REGISTRO (Puntos normales)
                  setPointsRewardedIds(p => new Set([...p, videoId]));
                  updateMissionOptimistic('give_like', 1); 
                  
                  // 🔥 MOSTRAR PROGRESO EXPLÍCITO
                  const match = res.message?.match(/(\d+)\/(\d+)/);
                  if (match) {
                    showPointsNotification(`✓ Progreso: ${match[1]}/${match[2]}`, videoId, 'success');
                  } else {
                    showPointsNotification('✓ Like registrado', videoId, 'info');
                  }

              } else if (res.result === 'already_paid' || res.result === 'already_completed') {
                  rollbackMission(snapshot); 
                  showPointsNotification('Ya sumaste puntos por esto hoy', videoId, 'warning'); 
              } else {
                  rollbackMission(snapshot); 
              }
          }
          setLikedVideos(newLiked);
      }
    } catch (err) { 
        console.error('Error like:', err);
        rollbackMission(snapshot); 
        showPointsNotification('Error de conexión', videoId, 'error');
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

  const handleShare = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const url = `${window.location.origin}/reel/${videoId}`;
      if (navigator.share) await navigator.share({ title: 'Mira este reel', url }).catch(()=>{});
      else { navigator.clipboard.writeText(url); success('Enlace copiado', {duration: 2000}); }
  };

  const handleMuteToggle = (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const newM = new Set(mutedVideos);
      if (newM.has(videoId)) newM.delete(videoId); else newM.add(videoId);
      setMutedVideos(newM);
      const v = videoRefs.current[currentIndex];
      if (v && videos[currentIndex]?.id === videoId) v.muted = newM.has(videoId);
  };

  const handleFollow = async (creatorId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      const { data: { user } } = await supabase.auth.getUser();
      const newF = new Set(followedCreators);
      if (newF.has(creatorId)) {
          newF.delete(creatorId);
          await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', creatorId);
      } else {
          newF.add(creatorId);
          await supabase.from('follows').insert({ follower_id: user.id, following_id: creatorId });
      }
      setFollowedCreators(newF);
  };

  const handleGiftClick = (e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      setShowGiftModal(true);
  };

  // Comentarios
  const handleOpenComments = async (videoId, e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      setShowCommentsModal(true);
      if (!comments[videoId]) {
          const { data } = await supabase.from('comments').select('*, user:user_profiles(id, full_name, avatar_url, username), replies:comments(*, user:user_profiles(id, full_name, avatar_url, username))').eq('video_id', videoId).is('parent_id', null).order('created_at', { ascending: false });
          setComments(prev => ({ ...prev, [videoId]: data?.map(c => ({ ...c, user: { id: c.user.id, name: c.user.full_name || 'Usuario', avatar: c.user.avatar_url, username: c.user.username }, replies: c.replies?.map(r => ({ ...r, user: { id: r.user.id, name: r.user.full_name || 'Usuario', avatar: r.user.avatar_url, username: r.user.username }})) || [] })) || [] }));
      }
  };

  const handleCloseComments = (e) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      setShowCommentsModal(false);
  };

  const handleAddComment = async (videoId) => {
      if (!newComment.trim()) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: newC } = await supabase.from('comments').insert({ video_id: videoId, user_id: user.id, content: newComment.trim(), parent_id: replyingTo }).select('*, user:user_profiles(id, full_name, avatar_url, username)').single();
      if (newC) {
          const formattedComment = { ...newC, user: { id: newC.user.id, name: newC.user.full_name || 'Usuario', avatar: newC.user.avatar_url, username: newC.user.username }, replies: [] };
          setComments(prev => ({ ...prev, [videoId]: replyingTo ? prev[videoId].map(c => c.id === replyingTo ? { ...c, replies: [...c.replies, formattedComment] } : c) : [formattedComment, ...prev[videoId]] }));
          setVideoCounters(prev => ({ ...prev, [videoId]: { ...prev[videoId], comments: (prev[videoId]?.comments||0)+1 }}));
      }
      setNewComment('');
      setReplyingTo(null);
  };

  const handleReply = (commentId, username) => { setReplyingTo(commentId); };
  const handleCancelReply = () => { setReplyingTo(null); };
  const toggleReplies = (commentId) => { setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] })); };

  const currentVideo = videos[currentIndex];

  return (
    <div ref={containerRef} className={`relative h-screen overflow-hidden ${isMobile ? 'w-full' : 'flex items-center justify-center'} bg-black`} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className={`${isMobile ? 'w-full h-full' : 'flex'} relative`}>
        {/* CONTENEDOR DE VIDEOS */}
        <div className={`${isMobile ? 'w-full h-full' : 'w-[45%] h-[90vh] max-w-lg'} relative overflow-hidden bg-black rounded-xl shadow-2xl`}>
          <div className="relative w-full h-full" style={{transition: enableTransition ? 'transform 0.3s ease' : 'none', transform: `translateY(-${currentIndex * 100}%)`}}>
            {videos.map((video, index) => (
              <div key={video.id} className="absolute inset-0 w-full h-full flex items-center justify-center bg-black" style={{top: `${index * 100}%`}}>
                <video ref={el => videoRefs.current[index] = el} src={video.video_url} className="w-full h-full object-contain" playsInline loop onClick={handlePlayPause} onLoadedData={()=>setLoadingVideo(false)} />
                
                {loadingVideo && index === currentIndex && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {!isAutoPlaying && index === currentIndex && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                      <Icon name="Play" size={40} className="text-white ml-1" />
                    </div>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-20 text-white z-10">
                  <Link to={`/profile/${video.creator?.id}`} className="flex items-center space-x-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
                      {video.creator?.avatar ? <img src={video.creator.avatar} alt={video.creator.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-bold">{video.creator?.name?.charAt(0)}</div>}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{video.creator?.name || 'Usuario'}</p>
                      <p className="text-xs text-gray-300">@{video.creator?.username || 'usuario'}</p>
                    </div>
                  </Link>
                  <p className="text-sm line-clamp-2">{video.title || video.description}</p>
                </div>
              </div>
            ))}
            
            {hasMore && currentIndex >= videos.length - 2 && (
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-8 text-white text-center">
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
