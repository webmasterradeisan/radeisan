import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useNavigate, Link } from 'react-router-dom';

import { supabase } from 'lib/supabase';

import { addFreePoints } from 'services/pointsService';

import * as missionsService from 'services/missionsService';

import Icon from 'components/AppIcon';

import useIsMobile from 'hooks/useIsMobile';



// ===============================

// COMPONENTE DE NOTIFICACIÓN FLOTANTE DE PUNTOS

// ===============================

const FloatingPointsNotification = ({ points, message, show, onHide }) => {

  useEffect(() => {

    if (show) {

      console.log('🎉 Mostrando notificación de puntos:', points, message);

      const timer = setTimeout(onHide, 2500);

      return () => clearTimeout(timer);

    }

  }, [show, onHide]);



  if (!show) return null;



  return (

    <div 

      className="fixed top-20 right-4 animate-bounce pointer-events-none"

      style={{ 

        zIndex: 99999,

        position: 'fixed',

        top: '80px',

        right: '16px'

      }}

    >

      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 transform transition-all duration-300">

        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">

          <Icon name="Star" size={20} className="text-yellow-300" />

        </div>

        <div>

          <p className="font-bold text-lg">+{points} puntos</p>

          {message && <p className="text-xs text-purple-100">{message}</p>}

        </div>

      </div>

    </div>

  );

};



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



  // Estados principales

  const [currentIndex, setCurrentIndex] = useState(0);

  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const [mutedVideos, setMutedVideos] = new useState(new Set());

  const [likedVideos, setLikedVideos] = new useState(new Set());

  const [dislikedVideos, setDislikedVideos] = new useState(new Set());

  const [savedVideos, setSavedVideos] = new useState(new Set());

  const [followedCreators, setFollowedCreators] = new useState(new Set());

  const [enableTransition, setEnableTransition] = useState(false);

  const [loadingVideo, setLoadingVideo] = useState(true);

  

  // Estados de comentarios

  const [showCommentsModal, setShowCommentsModal] = useState(false);

  const [comments, setComments] = useState({});

  const [newComment, setNewComment] = useState('');

  const [replyingTo, setReplyingTo] = useState(null);

  const [showReplies, setShowReplies] = useState({});

  const [currentUser, setCurrentUser] = useState(null);



  // Estados de notificación de puntos

  const [pointsNotification, setPointsNotification] = useState({

    show: false,

    points: 0,

    message: ''

  });



  // Estados de tracking de misiones y acciones realizadas

  const [videoWatchedIds, setVideoWatchedIds] = useState(new Set());

  const [actionsPerformed, setActionsPerformed] = useState({

    likes: new Set(),

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



  console.log('🎬 ReelsContainer render:', {

    videosCount: videos.length,

    currentIndex,

    selectedReelId,

    enableTransition,

    hasPlayedInitial: hasPlayedInitial.current,

    isMobile,

    isDesktop,

    showCommentsModal

  });



  // ===============================

  // FUNCIÓN: Convertir ID del video a índice

  // ===============================

  const getInitialReelIndex = useCallback(() => {

    if (!selectedReelId) {

      console.log('🔍 No hay ID seleccionado, iniciando en índice 0');

      return 0;

    }

    

    const index = videos.findIndex(video => video.id === selectedReelId);

    

    console.log('🔍 Búsqueda de video por ID');

    console.log('   🆔 ID buscado:', selectedReelId);

    console.log('   📍 Índice encontrado:', index);

    console.log('   📹 Video:', index >= 0 ? videos[index]?.title : 'No encontrado');

    

    if (index < 0) {

      console.warn('⚠️ Video con ID', selectedReelId, 'no encontrado');

      return 0;

    }

    

    return index;

  }, [selectedReelId, videos]);



  // ===============================

  // SINCRONIZACIÓN INICIAL

  // ===============================

  useEffect(() => {

    if (videos.length === 0) return;

    

    const correctIndex = getInitialReelIndex();

    

    console.log('🎯 Sincronizando estado inicial');

    console.log('   🆔 selectedReelId:', selectedReelId);

    console.log('   🎯 Índice calculado:', correctIndex);

    console.log('   📹 Video a reproducir:', videos[correctIndex]?.title || 'No existe');

    

    if (isInitialMount.current) {

      setCurrentIndex(correctIndex);

      setEnableTransition(false);

      

      setTimeout(() => {

        setEnableTransition(true);

        isInitialMount.current = false;

        console.log('✅ Transiciones habilitadas');

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



          console.log('👤 Usuario actual cargado:', userProfile);

          setCurrentUser(userProfile);



          const { data: likesData } = await supabase

            .from('video_likes')

            .select('video_id')

            .eq('user_id', user.id);

          

          if (likesData) {

            const likedIds = new Set(likesData.map(l => l.video_id));

            setLikedVideos(likedIds);

            setActionsPerformed(prev => ({

              ...prev,

              likes: likedIds

            }));

          }



          const { data: savedData } = await supabase

            .from('saved_videos')

            .select('video_id')

            .eq('user_id', user.id);

          

          if (savedData) {

            const savedIds = new Set(savedData.map(s => s.video_id));

            setSavedVideos(savedIds);

            setActionsPerformed(prev => ({

              ...prev,

              saves: savedIds

            }));

          }



          const { data: followsData } = await supabase

            .from('follows')

            .select('following_id')

            .eq('follower_id', user.id);

          

          if (followsData) {

            const followedIds = new Set(followsData.map(f => f.following_id));

            setFollowedCreators(followedIds);

            setActionsPerformed(prev => ({

              ...prev,

              follows: followedIds

            }));

          }

        }

      } catch (error) {

        console.error('Error cargando usuario y acciones:', error);

      }

    };

    

    loadCurrentUserAndActions();

  }, []);



  // ===============================

  // FUNCIÓN PARA MOSTRAR NOTIFICACIÓN DE PUNTOS

  // ===============================

  const showPointsEarned = useCallback((points, message = '') => {

    console.log('🎉 Mostrando notificación de puntos:', points, message);

    setPointsNotification({ show: true, points, message });

    if (onPointsEarned) {

      onPointsEarned(points);

    }

  }, [onPointsEarned]);



  const hidePointsNotification = useCallback(() => {

    setPointsNotification({ show: false, points: 0, message: '' });

  }, []);



  // ===============================

  // FORZAR REPRODUCCIÓN DEL VIDEO INICIAL

  // ===============================

  useEffect(() => {

    if (hasPlayedInitial.current || videos.length === 0) return;



    console.log('🎬 Intentando reproducir video inicial:', currentIndex);

    

    const attemptPlay = () => {

      const currentVideo = videoRefs.current[currentIndex];

      

      if (!currentVideo) {

        console.log('⏳ Video no disponible aún, reintentando...');

        setTimeout(attemptPlay, 100);

        return;

      }



      console.log('🎮 Video encontrado, reproduciendo');



      videoRefs.current.forEach((video, index) => {

        if (video && index !== currentIndex) {

          video.pause();

        }

      });



      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);

      

      const playPromise = currentVideo.play();

      

      if (playPromise !== undefined) {

        playPromise

          .then(() => {

            console.log('✅ Video inicial reproduciendo correctamente');

            hasPlayedInitial.current = true;

            lastNavigationIndex.current = currentIndex;

          })

          .catch(err => {

            console.error('❌ Error autoplay inicial:', err);

            currentVideo.muted = true;

            currentVideo.play()

              .then(() => {

                console.log('✅ Video inicial reproduciendo (muted)');

                hasPlayedInitial.current = true;

                lastNavigationIndex.current = currentIndex;

              })

              .catch(e => console.error('❌ Error crítico:', e));

          });

      }

    };



    setTimeout(attemptPlay, 250);

  }, [videos, currentIndex, mutedVideos]);



  // ===============================

  // MOUSE WHEEL NAVIGATION (DESKTOP)

  // ===============================

  useEffect(() => {

    if (!isDesktop) return;



    const handleWheel = (e) => {

      e.preventDefault();

      

      clearTimeout(handleWheel.timeout);

      handleWheel.timeout = setTimeout(() => {

        if (e.deltaY > 0 && currentIndex < videos.length - 1) {

          setCurrentIndex(prev => prev + 1);

        } else if (e.deltaY < 0 && currentIndex > 0) {

          setCurrentIndex(prev => prev - 1);

        }

      }, 150);

    };



    const container = containerRef.current;

    if (container) {

      container.addEventListener('wheel', handleWheel, { passive: false });

      return () => container.removeEventListener('wheel', handleWheel);

    }

  }, [isDesktop, currentIndex, videos.length]);



  // ===============================

  // AUTOPLAY Y GESTIÓN DE VIDEOS (MANTIENE POSICIÓN AL PAUSAR)

  // ===============================

  useEffect(() => {

    if (videos.length === 0) return;

    

    const initialIndex = getInitialReelIndex();

    if (!hasPlayedInitial.current && currentIndex === initialIndex) {

      console.log('⏭️ Skipping autoplay - será manejado por useEffect dedicado');

      return;

    }



    const currentVideo = videoRefs.current[currentIndex];

    const isNavigationChange = lastNavigationIndex.current !== currentIndex;



    if (currentVideo) {

      // Pausar todos los otros videos

      videoRefs.current.forEach((video, index) => {

        if (video && index !== currentIndex) {

          video.pause();

        }

      });



      currentVideo.muted = mutedVideos.has(videos[currentIndex]?.id);

      

      // Si es cambio de navegación, SIEMPRE reproducir automáticamente

      if (isNavigationChange) {

        console.log('🔄 Cambio de navegación detectado, auto-reproduciendo video');

        currentVideo.currentTime = 0;

        lastNavigationIndex.current = currentIndex;

        

        const playPromise = currentVideo.play();

        

        if (playPromise !== undefined) {

          playPromise

            .then(() => {

              console.log('✅ Video auto-reproduciendo desde el inicio');

              setIsAutoPlaying(true);

            })

            .catch(err => {

              console.log('Autoplay bloqueado:', err);

              currentVideo.muted = true;

              currentVideo.play()

                .then(() => setIsAutoPlaying(true))

                .catch(e => console.log('Error:', e));

            });

        }

      } else if (isAutoPlaying) {

        // No es navegación, pero debe estar reproduciéndose (usuario no pausó)

        console.log('⚡ Play/Pause - continúa desde:', currentVideo.currentTime);

        

        const playPromise = currentVideo.play();

        

        if (playPromise !== undefined) {

          playPromise

            .then(() => {

              console.log('✅ Video reproduciendo desde:', currentVideo.currentTime);

            })

            .catch(err => {

              console.log('Autoplay bloqueado:', err);

              currentVideo.muted = true;

              currentVideo.play().catch(e => console.log('Error:', e));

            });

        }

      } else {

        // Usuario pausó manualmente

        console.log('⏸️ Video pausado por usuario en:', currentVideo.currentTime);

        currentVideo.pause();

      }

    }

  }, [currentIndex, isAutoPlaying, videos, mutedVideos, getInitialReelIndex]);



  // ===============================

  // TRACKING DE VISUALIZACIÓN

  // ===============================

  useEffect(() => {

    const currentVideo = videoRefs.current[currentIndex];

    const currentVideoData = videos[currentIndex];

    

    if (!currentVideo || !currentVideoData) return;



    const handleLoadStart = () => setLoadingVideo(true);

    const handleCanPlay = () => setLoadingVideo(false);

    const handleLoadedData = () => setLoadingVideo(false);



    const handleTimeUpdate = () => {

      const watchedPercent = (currentVideo.currentTime / currentVideo.duration) * 100;

      

      if (watchedPercent > 80 && !videoWatchedIds.has(currentVideoData.id)) {

        setVideoWatchedIds(prev => new Set([...prev, currentVideoData.id]));

        

        missionsService.trackWatchVideo(currentVideoData.id, currentVideo.currentTime)

          .then(result => {

            if (result.completed) {

              showPointsEarned(result.reward.points, result.message);

            }

          })

          .catch(error => console.error('Error tracking video:', error));

      }

    };



    currentVideo.addEventListener('loadstart', handleLoadStart);

    currentVideo.addEventListener('canplay', handleCanPlay);

    currentVideo.addEventListener('loadeddata', handleLoadedData);

    currentVideo.addEventListener('timeupdate', handleTimeUpdate);

    

    return () => {

      currentVideo.removeEventListener('loadstart', handleLoadStart);

      currentVideo.removeEventListener('canplay', handleCanPlay);

      currentVideo.removeEventListener('loadeddata', handleLoadedData);

      currentVideo.removeEventListener('timeupdate', handleTimeUpdate);

    };

  }, [currentIndex, videos, videoWatchedIds, showPointsEarned]);



  // ===============================

  // PLAY/PAUSE (MANTIENE POSICIÓN - NO REINICIA)

  // ===============================

  const handlePlayPause = (e) => {

    if (e.target.tagName === 'VIDEO') {

      const currentVideo = videoRefs.current[currentIndex];

      if (currentVideo) {

        if (currentVideo.paused) {

          console.log('▶️ Reproduciendo desde:', currentVideo.currentTime);

          currentVideo.play();

          setIsAutoPlaying(true);

        } else {

          console.log('⏸️ Pausando en:', currentVideo.currentTime);

          currentVideo.pause();

          setIsAutoPlaying(false);

        }

      }

    }

  };



  // ===============================

  // NAVEGACIÓN

  // ===============================

  const navigateNext = () => {

    if (currentIndex < videos.length - 1) {

      setEnableTransition(true);

      setCurrentIndex(prev => prev + 1);

      setIsAutoPlaying(true);

    }

  };



  const navigatePrevious = () => {

    if (currentIndex > 0) {

      setEnableTransition(true);

      setCurrentIndex(prev => prev - 1);

      setIsAutoPlaying(true);

    }

  };



  const handleTouchStart = (e) => {

    touchStartY.current = e.touches[0].clientY;

  };



  const handleTouchMove = (e) => {

    touchEndY.current = e.touches[0].clientY;

  };



  const handleTouchEnd = () => {

    const diff = touchStartY.current - touchEndY.current;

    if (Math.abs(diff) > 50) {

      if (diff > 0) navigateNext();

      else navigatePrevious();

    }

  };



  useEffect(() => {

    const handleKeyDown = (e) => {

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;



      if (e.key === 'ArrowDown') navigateNext();

      if (e.key === 'ArrowUp') navigatePrevious();

      if (e.key === ' ') {

        e.preventDefault();

        const currentVideo = videoRefs.current[currentIndex];

        if (currentVideo) {

          if (currentVideo.paused) {

            currentVideo.play();

            setIsAutoPlaying(true);

          } else {

            currentVideo.pause();

            setIsAutoPlaying(false);

          }

        }

      }

      if (e.key === 'Escape' && showCommentsModal) {

        handleCloseComments();

      }

    };



    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [currentIndex, videos.length, showCommentsModal]);



  // ===============================

  // ACCIONES

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

      const wasAlreadyLiked = actionsPerformed.likes.has(videoId);

      

      if (newLikedVideos.has(videoId)) {

        newLikedVideos.delete(videoId);

        await supabase

          .from('video_likes')

          .delete()

          .eq('video_id', videoId)

          .eq('user_id', user.id);



        await supabase.rpc('decrement_video_likes', { video_id: videoId });

      } else {

        newLikedVideos.add(videoId);

        newDislikedVideos.delete(videoId);



        await supabase

          .from('video_likes')

          .insert({ video_id: videoId, user_id: user.id });



        await supabase.rpc('increment_video_likes', { video_id: videoId });



        if (!wasAlreadyLiked) {

          try {

            await addFreePoints(5, 'Like en video', 'video', videoId);

            const missionResult = await missionsService.trackGiveLike('video', videoId);

            if (missionResult.completed) {

              showPointsEarned(missionResult.reward.points, missionResult.message);

            } else {

              showPointsEarned(5, 'Like en video');

            }

            

            setActionsPerformed(prev => ({

              ...prev,

              likes: new Set([...prev.likes, videoId])

            }));

          } catch (pointsError) {

            console.error('Error al otorgar puntos:', pointsError);

          }

        }

      }

      

      setLikedVideos(newLikedVideos);

      setDislikedVideos(newDislikedVideos);

    } catch (error) {

      console.error('Error en like:', error);

    }

  };



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

          newLikedVideos.delete(videoId);

          await supabase

            .from('video_likes')

            .delete()

            .eq('video_id', videoId)

            .eq('user_id', user.id);

          

          await supabase.rpc('decrement_video_likes', { video_id: videoId });

        }

      }

      

      setDislikedVideos(newDislikedVideos);

      setLikedVideos(newLikedVideos);

    } catch (error) {

      console.error('Error en dislike:', error);

    }

  };



  const handleSave = async (videoId, e) => {

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



      const newSavedVideos = new Set(savedVideos);

      const wasAlreadySaved = actionsPerformed.saves.has(videoId);

      

      if (newSavedVideos.has(videoId)) {

        newSavedVideos.delete(videoId);

        await supabase

          .from('saved_videos')

          .delete()

          .eq('video_id', videoId)

          .eq('user_id', user.id);

      } else {

        newSavedVideos.add(videoId);

        await supabase

          .from('saved_videos')

          .insert({ video_id: videoId, user_id: user.id });



        if (!wasAlreadySaved) {

          try {

            await addFreePoints(2, 'Guardar video', 'video', videoId);

            showPointsEarned(2, 'Video guardado');

            

            setActionsPerformed(prev => ({

              ...prev,

              saves: new Set([...prev.saves, videoId])

            }));

          } catch (pointsError) {

            console.error('Error al otorgar puntos:', pointsError);

          }

        }

      }

      

      setSavedVideos(newSavedVideos);

    } catch (error) {

      console.error('Error guardando video:', error);

    }

  };



  const handleFollow = async (creatorId, e) => {

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



      if (followedCreators.has(creatorId)) {

        return;

      }



      const wasAlreadyFollowed = actionsPerformed.follows.has(creatorId);



      const newFollowedCreators = new Set(followedCreators);

      newFollowedCreators.add(creatorId);

      setFollowedCreators(newFollowedCreators);



      await supabase

        .from('follows')

        .insert({ 

          follower_id: user.id, 

          following_id: creatorId 

        });



      if (!wasAlreadyFollowed) {

        try {

          await addFreePoints(10, 'Seguir creador', 'follow', creatorId);

          const missionResult = await missionsService.trackFollowUser(creatorId);

          if (missionResult.completed) {

            showPointsEarned(missionResult.reward.points, missionResult.message);

          } else {

            showPointsEarned(10, 'Seguiste a un creador');

          }

          

          setActionsPerformed(prev => ({

            ...prev,

            follows: new Set([...prev.follows, creatorId])

          }));

        } catch (pointsError) {

          console.error('Error al otorgar puntos:', pointsError);

        }

      }

    } catch (error) {

      console.error('Error siguiendo creador:', error);

    }

  };



  const handleShare = async (video, e) => {

    if (e) {

      e.stopPropagation();

      e.preventDefault();

    }

    

    try {

      const wasAlreadyShared = actionsPerformed.shares.has(video.id);



      if (navigator.share) {

        await navigator.share({

          title: video.title || 'Video',

          text: video.description || '',

          url: window.location.href

        });

      } else {

        navigator.clipboard.writeText(window.location.href);

        alert('Enlace copiado al portapapeles');

      }



      if (!wasAlreadyShared) {

        try {

          const { data: { user } } = await supabase.auth.getUser();

          if (user) {

            await addFreePoints(3, 'Compartir video', 'video', video.id);

            const missionResult = await missionsService.trackShareContent(

              'video', 

              video.id, 

              navigator.share ? 'native' : 'clipboard'

            );

            

            if (missionResult.completed) {

              showPointsEarned(missionResult.reward.points, missionResult.message);

            } else {

              showPointsEarned(3, 'Video compartido');

            }

            

            setActionsPerformed(prev => ({

              ...prev,

              shares: new Set([...prev.shares, video.id])

            }));

          }

        } catch (pointsError) {

          console.error('Error al otorgar puntos:', pointsError);

        }

      }

    } catch (error) {

      console.error('Error compartiendo:', error);

    }

  };



  const handleMuteToggle = (videoId, e) => {

    if (e) {

      e.stopPropagation();

      e.preventDefault();

    }

    

    const currentVideo = videoRefs.current[currentIndex];

    if (currentVideo) {

      const newMutedVideos = new Set(mutedVideos);

      if (newMutedVideos.has(videoId)) {

        newMutedVideos.delete(videoId);

        currentVideo.muted = false;

      } else {

        newMutedVideos.add(videoId);

        currentVideo.muted = true;

      }

      setMutedVideos(newMutedVideos);

    }

  };



  // ===============================

  // SISTEMA DE COMENTARIOS

  // ===============================

  

  const loadComments = async (videoId, retryCount = 0) => {

    try {

      let { data, error } = await supabase

        .from('video_comments')

        .select('id, video_id, user_id, content, parent_comment_id, created_at, updated_at')

        .eq('video_id', videoId)

        .order('created_at', { ascending: false });



      if (error) {

        if (retryCount < 2) {

          await new Promise(resolve => setTimeout(resolve, 1000));

          return loadComments(videoId, retryCount + 1);

        }

        throw error;

      }



      if (data && data.length > 0) {

        const userIds = [...new Set(data.map(comment => comment.user_id))];

        

        const { data: usersData, error: usersError } = await supabase

          .from('user_profiles')

          .select('id, name, avatar, username')

          .in('id', userIds);



        if (!usersError && usersData) {

          const usersMap = {};

          usersData.forEach(user => {

            usersMap[user.id] = user;

          });



          data = data.map(comment => {

            const userProfile = usersMap[comment.user_id];

            return {

              ...comment,

              user: userProfile ? {

                id: userProfile.id,

                name: userProfile.name || userProfile.username || 'Usuario',

                avatar: userProfile.avatar,

                username: userProfile.username || userProfile.name || 'usuario'

              } : {

                id: comment.user_id,

                name: 'Usuario',

                avatar: null,

                username: 'usuario'

              },

              replies: []

            };

          });



          const topLevelComments = [];

          const repliesMap = {};



          data.forEach(comment => {

            if (comment.parent_comment_id) {

              if (!repliesMap[comment.parent_comment_id]) {

                repliesMap[comment.parent_comment_id] = [];

              }

              repliesMap[comment.parent_comment_id].push(comment);

            } else {

              topLevelComments.push(comment);

            }

          });



          topLevelComments.forEach(comment => {

            comment.replies = repliesMap[comment.id] || [];

            comment.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

          });



          data = topLevelComments;

        }

      }



      setComments(prev => ({

        ...prev,

        [videoId]: data || []

      }));

    } catch (error) {

      console.error('Error cargando comentarios:', error);

      setComments(prev => ({

        ...prev,

        [videoId]: []

      }));

    }

  };



  const handleOpenComments = async (videoId, e) => {

    if (e) {

      e.stopPropagation();

      e.preventDefault();

    }

    

    console.log('🗨️ Abriendo modal de comentarios para video:', videoId);

    console.log('📹 Video debe SEGUIR reproduciéndose');

    setShowCommentsModal(true);

    setReplyingTo(null);

    setNewComment('');

    await loadComments(videoId);

    // ✅ NO pausar el video - continúa reproduciéndose

  };



  const handleCloseComments = () => {

    console.log('❌ Cerrando modal de comentarios');

    setShowCommentsModal(false);

    setReplyingTo(null);

    setNewComment('');

  };



  const handleAddComment = async (videoId) => {

    if (!newComment.trim()) {

      console.log('❌ Comentario vacío');

      return;

    }



    console.log('📝 ===== INICIANDO ENVÍO DE COMENTARIO =====');

    console.log('📝 VideoId:', videoId);

    console.log('📝 Contenido:', newComment.trim());

    console.log('📝 Respondiendo a:', replyingTo);



    try {

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {

        console.log('❌ Usuario no autenticado');

        navigate('/login');

        return;

      }



      console.log('👤 Usuario autenticado:', user.id);



      const commentData = {

        video_id: videoId,

        user_id: user.id,

        content: newComment.trim(),

        parent_comment_id: replyingTo

      };



      console.log('📤 Enviando a Supabase:', commentData);



      const { data: insertedComment, error } = await supabase

        .from('video_comments')

        .insert(commentData)

        .select()

        .single();



      if (error) {

        console.error('❌ Error de Supabase:', error);

        console.error('❌ Código:', error.code);

        console.error('❌ Mensaje:', error.message);

        console.error('❌ Detalles:', error.details);

        alert(`Error al comentar: ${error.message}`);

        throw error;

      }



      console.log('✅ Comentario insertado exitosamente:', insertedComment);



      if (!replyingTo) {

        console.log('📊 Incrementando contador de comentarios...');

        const { error: rpcError } = await supabase.rpc('increment_video_comments', { video_id: videoId });

        if (rpcError) {

          console.error('⚠️ Error al incrementar contador:', rpcError);

        } else {

          console.log('✅ Contador incrementado');

        }

      }



      const wasAlreadyCommented = actionsPerformed.comments.has(videoId);



      if (!wasAlreadyCommented) {

        try {

          console.log('🎁 Otorgando puntos...');

          await addFreePoints(3, replyingTo ? 'Responder comentario' : 'Comentar video', 'video', videoId);

          const missionResult = await missionsService.trackComment('video', videoId);

          if (missionResult.completed) {

            showPointsEarned(missionResult.reward.points, missionResult.message);

          } else {

            showPointsEarned(3, replyingTo ? 'Respuesta agregada' : 'Comentario agregado');

          }

          

          setActionsPerformed(prev => ({

            ...prev,

            comments: new Set([...prev.comments, videoId])

          }));

          console.log('✅ Puntos otorgados');

        } catch (pointsError) {

          console.error('⚠️ Error al otorgar puntos:', pointsError);

        }

      }



      setNewComment('
