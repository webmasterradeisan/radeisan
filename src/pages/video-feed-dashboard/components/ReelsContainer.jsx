// src/pages/video-feed-dashboard/components/ReelsContainer.jsx
// ============================================================================
// REELS CONTAINER - VERSIÓN FINAL SIN DOBLE CONTEO 🛡️
// ✅ FIX DOBLE CONTEO: Se eliminó 'updateMissionOptimistic'. La UI ahora espera
//    a la DB para actualizarse, garantizando que 1 like sea siempre 1 punto.
// ✅ SINCRONIZACIÓN: Usa refetchMissionsInstant para actualizarse al instante.
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
    // updateMissionOptimistic, // ❌ ELIMINADO para evitar doble conteo
    rollbackMission, 
    notifyMissionComplete,
    updateLocalBalance,
    refetchMissionsInstant // ✅ AGREGADO para sincronización real
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
          let changed = false;
          videos.forEach(v => {
              if (!newCounters[v.id]) {
                  newCounters[v.id] = { 
                      likes: v.likes || v.likes_count || 0, 
                      comments: v.comments || v.comments_count || 0, 
                      views: v.views || v.views_count || 0 
                  };
                  changed = true;
              }
          });
          return changed ? newCounters : prev;
      });
  }, [videos]);

  // Contadores Real-Time
  useEffect(() => {
    const loadRealTimeCounters = async () => {
      if (videos.length === 0) return;
      const currentVideo = videos[currentIndex];
      if (!currentVideo) return;

      try {
        const { count: likesCount } = await supabase.from('video_likes').select('*', { count: 'exact', head: true }).eq('video_id', currentVideo.id);
        const { count: commentsCount } = await supabase.from('video_comments').select('*', { count: 'exact', head: true }).eq('video_id', currentVideo.id);
        
        setVideoCounters(prev => ({
          ...prev,
          [currentVideo.id]: { 
            ...prev[currentVideo.id], 
            likes: likesCount || 0, 
            comments: commentsCount || 0 
          }
        }));
      } catch (error) { console.error('Error counters:', error); }
    };
    loadRealTimeCounters();
  }, [currentIndex, videos]);

  // ===============================
  // LÓGICA DEL REPRODUCTOR
  // ===============================
  useEffect(() => {
    if (hasPlayedInitial.current || videos.length === 0) return;
    const attemptPlay = () => {
      const v = videoRefs.current[currentIndex];
      if (!v) { setTimeout(attemptPlay, 100); return; }
      videoRefs.current.forEach((vid, i) => { if (vid && i !== currentIndex) vid.pause(); });
      v.muted = mutedVideos.has(videos[currentIndex]?.id);
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
                      
                      // ✅ SINCRONIZACIÓN REAL
                      if (typeof refetchMissionsInstant === 'function') {
                          refetchMissionsInstant();
                      }
                  }
              });
          }
      };
      v.addEventListener('timeupdate', handleTime);
      return () => v.removeEventListener('timeupdate', handleTime);
  }, [currentIndex, videos, videoWatchedIds, updateLocalBalance, refetchMissionsInstant]);

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
          
          if (typeof refetchMissionsInstant === 'function') {
              refetchMissionsInstant();
          }

      } else {
          // LIKE
          newLiked.add(videoId);
          setDislikedVideos(p => { const n = new Set(p); n.delete(videoId); return n; });
          
          // 1. INSERCIÓN DE LIKE
          const { error: likeInsertError } = await supabase.from('video_likes').insert({ video_id: videoId, user_id: user.id });
          
          if (likeInsertError) {
             showPointsNotification(`❌ Fallo de Inserción: ${likeInsertError.message}`, videoId, 'error');
             newLiked.delete(videoId); 
             setLikedVideos(newLiked); 
             return;
          }
          
          // 2. INCREMENTO LOCAL DE CONTADOR (Visual)
          setVideoCounters(p => ({ ...p, [videoId]: { ...p[videoId], likes: (p[videoId]?.likes||0)+1}}));

          // 3. LÓGICA DE PUNTOS Y MISIONES
          if (pointsRewardedIds.has(videoId)) {
              showPointsNotification('Like registrado', videoId, 'info');
          } else {
              // Llamada al servidor (Paga en DB)
              const res = await missionsService.trackGiveLike('reel', videoId);
              
              if (res.result === 'success' && res.points_earned > 0) {
                  // CASO: MISIÓN CUMPLIDA
                  const earned = Number(res.points_earned);
                  if (updateLocalBalance) updateLocalBalance(earned);
                  
                  if (notifyMissionComplete) {
                      notifyMissionComplete(earned, res.message); 
                  } else {
                      showPointsNotification(`🎉 ¡Misión Cumplida! +${earned} puntos`, videoId, 'success');
                  }

                  setPointsRewardedIds(p => new Set([...p, videoId]));
                  
                  // 🚫 ELIMINADO: updateMissionOptimistic (Causa del doble conteo)
                  
                  // ✅ REVALIDACIÓN INSTANTÁNEA (ÚNICA FUENTE DE VERDAD)
                  if (typeof refetchMissionsInstant === 'function') {
                      refetchMissionsInstant();
                  }

              } else if (res.result === 'progress_updated' || res.result === 'registered') {
                  // CASO: SOLO REGISTRO
                  setPointsRewardedIds(p => new Set([...p, videoId]));
                  
                  // 🚫 ELIMINADO: updateMissionOptimistic
                  
                  showPointsNotification('✓ Like registrado', videoId, 'info');

                  // ✅ REVALIDACIÓN INSTANTÁNEA
                  if (typeof refetchMissionsInstant === 'function') {
                      refetchMissionsInstant();
                  }

              } else if (res.result === 'already_paid' || res.result === 'already_completed') {
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

  const handleFollow = async (creatorId, e) => {
      if(e) {e.stopPropagation(); e.preventDefault();}
      const { data: { user } } = await supabase.auth.getUser();
      if(user.id === creatorId) return;
      const newF = new Set(followedCreators);
      if(newF.has(creatorId)) {
          newF.delete(creatorId); await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', creatorId);
          showPointsNotification('Dejaste de seguir', videos[currentIndex]?.id, 'info');
          
          if (typeof refetchMissionsInstant === 'function') {
              refetchMissionsInstant();
          }
          
      } else {
          newF.add(creatorId); await supabase.from('follows').insert({follower_id: user.id, following_id: creatorId});
          missionsService.trackFollowUser(creatorId).then(r => {
             if(r.result==='success') { 
                 const earned = Number(r.points_earned);
                 if (updateLocalBalance) updateLocalBalance(earned);
                 showPointsNotification(`+${earned} por seguir`, videos[currentIndex]?.id, 'success'); 
                 
                 // ✅ REVALIDACIÓN INSTANTÁNEA
                 if (typeof refetchMissionsInstant === 'function') {
                    refetchMissionsInstant();
                 }
             }
          });
      }
      setFollowedCreators(newF);
  };
  
  const handleMuteToggle = (videoId, e) => {
      if(e) {e.stopPropagation(); e.preventDefault();}
      const v = videoRefs.current[currentIndex];
      const newM = new Set(mutedVideos);
      if(newM.has(videoId)) { newM.delete(videoId); if(v) v.muted=false; } else { newM.add(videoId); if(v) v.muted=true; }
      setMutedVideos(newM);
  };

  const handleShare = async (video, e) => {
     if(e) {e.stopPropagation(); e.preventDefault();}
     if (navigator.share) await navigator.share({title: video.title, url: window.location.href});
     else { await navigator.clipboard.writeText(window.location.href); showPointsNotification('Link copiado', video.id, 'info'); }
     
     missionsService.trackShareContent('reel', video.id).then(r => {
         if(r.result==='success' && r.points_earned > 0 && updateLocalBalance) {
            updateLocalBalance(Number(r.points_earned));
            
            if (typeof refetchMissionsInstant === 'function') {
                refetchMissionsInstant();
            }
         }
     });
  };

  const handleGiftClick = (video, e) => {
      if(e) {e.stopPropagation(); e.preventDefault();}
      setShowGiftModal(true);
  };

  // ===============================
  // LÓGICA DE COMENTARIOS
  // ===============================
  const loadComments = async (videoId, retryCount = 0) => {
    try {
      let { data, error } = await supabase.from('video_comments').select('id, video_id, user_id, content, parent_comment_id, created_at, updated_at').eq('video_id', videoId).order('created_at', { ascending: false });
      if (error) { if (retryCount < 2) { await new Promise(resolve => setTimeout(resolve, 1000)); return loadComments(videoId, retryCount + 1); } throw error; }
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(comment => comment.user_id))];
        const { data: usersData } = await supabase.from('user_profiles').select('id, full_name, avatar_url, username').in('id', userIds);
        if (usersData) {
          const usersMap = {}; usersData.forEach(user => { usersMap[user.id] = user; });
          data = data.map(comment => {
            const userProfile = usersMap[comment.user_id];
            return { ...comment, user: userProfile ? { id: userProfile.id, name: userProfile.full_name || userProfile.username || 'Usuario', avatar: userProfile.avatar_url, username: userProfile.username || userProfile.full_name || 'usuario' } : { id: comment.user_id, name: 'Usuario', avatar: null, username: 'usuario' }, replies: [] };
          });
          const topLevelComments = []; const repliesMap = {};
          data.forEach(comment => { if (comment.parent_comment_id) { if (!repliesMap[comment.parent_comment_id]) repliesMap[comment.parent_comment_id] = []; repliesMap[comment.parent_comment_id].push(comment); } else { topLevelComments.push(comment); } });
          topLevelComments.forEach(comment => { comment.replies = repliesMap[comment.id] || []; comment.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); });
          data = topLevelComments;
        }
      }
      setComments(prev => ({ ...prev, [videoId]: data || [] }));
    } catch (error) { setComments(prev => ({ ...prev, [videoId]: [] })); }
  };

  const handleOpenComments = async (videoId, e) => { 
      if(e) {e.stopPropagation(); e.preventDefault();} 
      setShowCommentsModal(true); 
      setReplyingTo(null); 
      setNewComment(''); 
      await loadComments(videoId); 
  };
  
  const handleCloseComments = () => { setShowCommentsModal(false); setReplyingTo(null); setNewComment(''); };
  
  const handleAddComment = async (videoId) => {
    if (!newComment.trim()) { showPointsNotification('⚠️ Escribe algo antes de comentar', videoId, 'warning'); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) { navigate('/login'); return; }
      const commentData = { video_id: videoId, user_id: user.id, content: newComment.trim(), parent_comment_id: replyingTo };
      const { error } = await supabase.from('video_comments').insert(commentData).single(); if (error) throw error;
      
      if (!replyingTo) {
        try {
          const result = await missionsService.trackComment('reel', videoId);
          
          if (result.points_earned > 0 && updateLocalBalance) {
             updateLocalBalance(Number(result.points_earned));
          }

          if (result.result === 'success' && result.points_earned > 0) { 
              const earned = Number(result.points_earned);
              showPointsNotification(`🎉 +${earned} puntos por comentar`, videoId, 'success'); 
              
              // ✅ REVALIDACIÓN INSTANTÁNEA
              if (typeof refetchMissionsInstant === 'function') {
                  refetchMissionsInstant();
              }
          } 
          else { showPointsNotification('✓ Comentario agregado', videoId, 'info'); }
          setVideoCounters(prev => ({ ...prev, [videoId]: { ...prev[videoId], comments: (prev[videoId]?.comments || 0) + 1 } }));
        } catch (err) { console.error(err); }
      } else { showPointsNotification('✓ Respuesta agregada', videoId, 'info'); }
      
      setNewComment(''); setReplyingTo(null); await loadComments(videoId);
    } catch (error) { showPointsNotification('Error al comentar', videoId, 'error'); }
  };

  const handleReply = (commentId, username) => { setReplyingTo(commentId); setNewComment(`@${username || 'Usuario'} `); setTimeout(() => { const input = document.querySelector('textarea[placeholder*="comentario"]'); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }, 100); };
  const handleCancelReply = () => { setReplyingTo(null); setNewComment(''); };
  const toggleReplies = (commentId) => { setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] })); };
  const formatTimeAgo = (date) => { const now = new Date(); const diff = Math.floor((now - new Date(date)) / 1000); if (diff < 60) return 'Ahora'; if (diff < 3600) return `${Math.floor(diff/60)}m`; if (diff < 86400) return `${Math.floor(diff/3600)}h`; return `${Math.floor(diff/86400)}d`; };


  // ==========================================================================
  // RENDER PRINCIPAL
  // ==========================================================================
  const currentVideo = videos[currentIndex];
  const formatCount = (n) => n >= 1000 ? (n/1000).toFixed(1)+'K' : (n || 0);

  if (videos.length === 0 && !loading) return <div className="flex flex-col items-center justify-center h-screen text-white"><Icon name="Video" size={48} className="mb-4"/><p>No hay videos disponibles</p></div>;

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      <div className="flex h-full w-full items-center justify-center">
        {/* CONTENEDOR DE VIDEO */}
        <div className={`relative overflow-hidden flex-shrink-0 ${isDesktop ? showCommentsModal ? 'w-[55%]' : 'w-full max-w-[500px]' : 'w-full'} ${isDesktop ? 'h-[80vh] rounded-xl shadow-2xl' : 'h-full'}`}>
          
          <div ref={containerRef} className="w-full h-full relative transition-transform duration-500" 
               style={{ transform: `translateY(${-currentIndex * 100}%)`, transition: enableTransition ? 'transform 0.5s' : 'none' }}
               onClick={handlePlayPause}
               onTouchStart={isMobile ? handleTouchStart : undefined}
               onTouchMove={isMobile ? handleTouchMove : undefined}
               onTouchEnd={isMobile ? handleTouchEnd : undefined}>
               
            {videos.map((video, index) => (
              <div key={video.id} className="w-full h-full flex-shrink-0 relative bg-black snap-start">
                <video ref={el => videoRefs.current[index] = el} className="absolute w-full h-full object-cover" src={video.video_url || video.videoUrl} loop playsInline preload="auto" onLoadedData={()=>setLoadingVideo(false)} />
                
                {/* Loading Spinner específico */}
                {loadingVideo && index===currentIndex && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"><div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div></div>}

                {/* Info Overlay */}
                <div className={`absolute z-10 ${isMobile ? 'bottom-8 left-4 right-24' : 'bottom-4 left-4 right-4'}`} onClick={(e) => e.stopPropagation()}>
                   <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                      <Link to={`/profile/${video.creator?.id}`} className="font-bold text-white hover:underline text-base shadow-black drop-shadow-md">@{video.creator?.username || video.creator?.name}</Link>
                      <p className="text-sm text-white mt-2 line-clamp-2 drop-shadow-md">{video.description}</p>
                      {video.tags && <div className="flex flex-wrap gap-2 mt-2">{video.tags.slice(0,3).map((tag,i)=><span key={i} className="text-xs font-bold text-white">#{tag}</span>)}</div>}
                   </div>
                </div>
                
                {/* Botón Play Central */}
                {!isAutoPlaying && index === currentIndex && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"><Icon name="Play" size={32} color="white"/></div>
                    </div>
                )}
                
                {/* Barra Progreso */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                   <div className="h-full bg-red-500 transition-all" style={{ width: index===currentIndex ? '100%' : '0%', transitionDuration: index===currentIndex ? `${video.duration||30}s` : '0s', transitionTimingFunction:'linear' }} />
                </div>
              </div>
            ))}

            {/* INDICADOR DE CARGA FINAL (INFINITE SCROLL) */}
            {loading && hasMore && (
                <div className="w-full h-full flex-shrink-0 flex items-center justify-center bg-black text-white snap-start">
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
