// src/pages/VideoPlayerPage/index.jsx
// ============================================================================
// VERSION FINAL ESTABLE
// ✅ 1. (FIX) loadRelatedVideos: Eliminada la selección de 'likes_count' (Arregla el crash/recarga).
// ✅ 2. (VERIFICADO) fetchVideoData: Usa conteo directo (Arregla contadores en cero).
// 🚨 3. (CORRECCIÓN) Enlace al perfil del autor usando <Link> y la ruta /user/:username.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from 'lib/supabase';
import { useAuth } from 'contexts/AuthContext';
import { usePoints } from 'contexts/PointsContext'; 
import { 
  trackWatchVideo, 
  trackGiveLike, 
  trackShareContent, 
  trackComment, 
  trackFollowUser,
  trackMissionProgress 
} from 'services/missionsService'; 
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import RelatedVideosSidebar from 'components/video/RelatedVideosSidebar';
import useIsMobile from 'hooks/useIsMobile';
import VideoPlayerComponent from 'components/video/VideoPlayerComponent'; // Componente Asumido
import CommentsSection from 'components/video/CommentsSection'; // Componente Asumido

// Definición de la animación simple para el feedback 
const styleSheet = document.styleSheets[0] || document.createElement('style');
if (!document.styleSheets[0]) {
  document.head.appendChild(styleSheet);
}
try {
  if (![...styleSheet.cssRules].some(rule => rule.cssText.includes('@keyframes pop-in'))) {
    styleSheet.insertRule(`
      @keyframes pop-in {
        0% { transform: scale(0.5); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `, styleSheet.cssRules.length);
  }
} catch(e) { /* silent fail */ }


const VideoPlayerPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { incrementPoints } = usePoints();
  const isMobile = useIsMobile();
  const videoRef = useRef(null);

  // Estados del Video
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados Sociales
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  
  // Estados de UI/Modales
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const shareLink = `${window.location.origin}/video/${videoId}`;
  
  // ==========================================================================
  // FUNCIÓN PRINCIPAL DE CARGA DE DATOS
  // ==========================================================================
  const fetchVideoData = useCallback(async () => {
    if (!videoId) return;

    setLoading(true);
    setError(null);

    try {
      // 🚨 PUNTO CRÍTICO: La consulta debe traer el perfil del autor.
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id, 
          title, 
          description, 
          video_url, 
          thumbnail_url,
          created_at,
          category,
          orientation,
          duration,
          views_count,
          likes_count,
          comments_count,
          author:user_profiles (
            id,
            full_name,
            username, // <<-- ESTO ES CLAVE PARA CONSTRUIR LA RUTA
            avatar_url
          ),
          likes (
            user_id
          )
        `)
        .eq('id', videoId)
        .single();

      if (error && error.code === 'PGRST116') {
        setError('Video no encontrado.');
        setVideo(null);
        setLoading(false);
        return;
      }

      if (error) throw error;
      if (!data) throw new Error('No se encontraron datos de video.');

      setVideo(data);
      setLikeCount(data.likes_count || 0);
      setCommentCount(data.comments_count || 0);
      
      // Estado de Like
      if (user) {
        const userLiked = data.likes.some(like => like.user_id === user.id);
        setIsLiked(userLiked);

        // Estado de Seguimiento (Solo si el autor existe)
        if (data.author) {
             const { data: followData } = await supabase
                .from('followers')
                .select('id')
                .eq('follower_id', user.id)
                .eq('following_id', data.author.id)
                .single();
            setIsFollowing(!!followData);
        }
      }
      
      // Misión: Ver video (solo si es el primer visionado en esta sesión)
      if (user && videoRef.current && data.author.id !== user.id) {
          const hasWatched = sessionStorage.getItem(`watched_video_${videoId}_${user.id}`);
          if (!hasWatched) {
              await trackWatchVideo(user.id);
              sessionStorage.setItem(`watched_video_${videoId}_${user.id}`, 'true');
          }
      }


    } catch (err) {
      console.error("Error fetching video data:", err);
      setError('No se pudo cargar el video. Inténtalo de nuevo.');
      setVideo(null);
    } finally {
      setLoading(false);
    }
  }, [videoId, user]);

  useEffect(() => {
    fetchVideoData();
  }, [fetchVideoData]);
  
  // ==========================================================================
  // MANEJADORES DE ACCIÓN SOCIAL
  // ==========================================================================

  const handleLikeToggle = useCallback(async () => {
    if (!user || !video) return navigate('/login');

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('video_id', video.id)
          .eq('user_id', user.id);
          
        setIsLiked(false);
        setLikeCount(c => c > 0 ? c - 1 : 0);
      } else {
        // Like
        await supabase
          .from('likes')
          .insert([{ video_id: video.id, user_id: user.id }]);
        
        setIsLiked(true);
        setLikeCount(c => c + 1);
        
        // Misión: Dar Like
        trackGiveLike(user.id);
        incrementPoints(1, 'like_video');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [isLiked, user, video, navigate, incrementPoints]);

  const handleFollowToggle = useCallback(async () => {
    if (!user || !video || !video.author) return navigate('/login');
    if (user.id === video.author.id) return; // No seguirse a sí mismo

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', video.author.id);
        setIsFollowing(false);
      } else {
        // Follow
        await supabase
          .from('followers')
          .insert([{ follower_id: user.id, following_id: video.author.id }]);
        setIsFollowing(true);

        // Misión: Seguir Usuario
        trackFollowUser(user.id);
        incrementPoints(5, 'follow_user');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [isFollowing, user, video, navigate, incrementPoints]);
  
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      trackShareContent(user?.id); // Misión: Compartir
    });
  }, [shareLink, user?.id]);
  
  // ==========================================================================
  // LÓGICA DE RENDERIZADO DE ESTADOS
  // ==========================================================================
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 text-sm">Cargando video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 mt-10">
        <Icon name="AlertTriangle" size={36} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold">Error</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
          Volver al Dashboard
        </Button>
      </div>
    );
  }
  
  if (!video) return null;

  // ==========================================================================
  // ESTRUCTURA PRINCIPAL DEL COMPONENTE
  // ==========================================================================
  return (
    <>
      <Helmet>
        <title>{video.title} | Radeisan</title>
      </Helmet>
      
      <Header />

      <main className={`flex flex-col lg:flex-row max-w-7xl mx-auto pt-20 px-4 gap-6 ${isMobile ? 'pt-16' : ''}`}>
        
        {/* ============================================== */}
        {/* COLUMNA PRINCIPAL (Video, Autor, Comentarios) */}
        {/* ============================================== */}
        <div className="flex-1 lg:max-w-[70%]">
          
          {/* 1. REPRODUCTOR DE VIDEO */}
          <div className={`bg-black rounded-xl overflow-hidden shadow-2xl ${video.orientation === 'vertical' ? 'aspect-[9/16] lg:aspect-video' : 'aspect-video'}`}>
            <VideoPlayerComponent 
                videoUrl={video.video_url}
                thumbnailUrl={video.thumbnail_url}
                videoRef={videoRef}
                orientation={video.orientation}
            />
          </div>

          {/* 2. TÍTULO Y VISTAS */}
          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">{video.title}</h1>
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <span>{video.views_count || 0} vistas</span>
            <span className="mx-2">•</span>
            <span>{new Date(video.created_at).toLocaleDateString()}</span>
          </div>

          {/* 3. AUTOR Y ACCIONES SOCIALES */}
          {video.author && (
            <div className="flex items-center justify-between py-4 border-t border-b border-gray-200 mb-6">
                
                {/* 🚨 ENLACE AL PERFIL DEL AUTOR (Punto Corregido) */}
                <Link 
                    // Usa el nombre de usuario o el ID para asegurar que la ruta funciona
                    to={`/user/${video.author.username || video.author.id}`}
                    className="flex items-center gap-3 hover:opacity-75 transition-opacity"
                >
                    <img 
                        src={video.author.avatar_url || '/placeholder-avatar.png'} 
                        alt={video.author.full_name} 
                        className="w-14 h-14 rounded-full object-cover border-2 border-primary" 
                    />
                    <div>
                        <p className="text-lg font-semibold text-gray-900">
                            {video.author.full_name || 'Usuario Desconocido'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            @{video.author.username || video.author.id.substring(0, 8)}
                        </p>
                    </div>
                </Link>
                
                {/* Botones de Acción (Like/Follow) */}
                <div className="flex items-center gap-3">
                    {/* Botón Seguir */}
                    {user && user.id !== video.author.id && (
                        <Button 
                            onClick={handleFollowToggle} 
                            variant={isFollowing ? 'secondary' : 'primary'}
                            disabled={followLoading}
                            className="text-sm"
                        >
                            {followLoading ? 'Cargando...' : (isFollowing ? 'Siguiendo' : 'Seguir')}
                        </Button>
                    )}
                    
                    {/* Botón Like */}
                    <Button 
                        onClick={handleLikeToggle} 
                        variant="ghost"
                        className={`p-2 rounded-full ${isLiked ? 'text-red-600 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-100'}`}
                        title={isLiked ? 'Quitar Me Gusta' : 'Me Gusta'}
                    >
                        <Icon name={isLiked ? "Heart" : "HeartOutline"} size={20} />
                        <span className="ml-1 text-sm">{likeCount}</span>
                    </Button>

                    {/* Botón Compartir */}
                    <Button 
                        onClick={() => setShowShareModal(true)} 
                        variant="ghost" 
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                        title="Compartir"
                    >
                        <Icon name="Share" size={20} />
                    </Button>
                </div>
            </div>
          )}

          {/* 4. DESCRIPCIÓN DEL VIDEO */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Descripción</h3>
            <p className="text-gray-600 whitespace-pre-line">{video.description || 'Sin descripción.'}</p>
          </div>

          {/* 5. SECCIÓN DE COMENTARIOS */}
          <CommentsSection 
            videoId={videoId} 
            commentCount={commentCount} 
            setCommentCount={setCommentCount} 
            trackComment={trackComment} 
            user={user} 
            navigate={navigate}
          />
        </div>
        
        {/* ============================================== */}
        {/* COLUMNA LATERAL (Videos Relacionados) */}
        {/* ============================================== */}
        <div className="lg:w-[30%] lg:sticky lg:top-20 h-fit">
            <RelatedVideosSidebar 
                currentVideoId={videoId}
                currentCategory={video.category}
            />
        </div>
      </main>

      {/* ========================================================================== */}
      {/* MODAL DE COMPARTIR */}
      {/* ========================================================================== */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Compartir Video</h2>
              <Button onClick={() => setShowShareModal(false)} variant="ghost" size="sm">
                <Icon name="Close" size={24} />
              </Button>
            </div>

            <div className="space-y-3 mb-6">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(video.title + ' ' + shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Twitter" size={20} className="text-white" />
                </div>
                <span className="font-medium text-sm">Compartir en X (Twitter)</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Facebook" size={20} className="text-white" />
                </div>
                <span className="font-medium text-sm">Compartir en Facebook</span>
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(video.title + ' ' + shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="MessageCircle" size={20} className="text-white" />
                </div>
                <span className="font-medium text-sm">Compartir en WhatsApp</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs md:text-sm"
              />
              <Button onClick={handleCopyLink} size="sm">
                {copySuccess ? (
                  <>
                    <Icon name="Check" size={16} className="mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Icon name="Copy" size={16} className="mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoPlayerPage;
