// src/pages/VideoPlayerPage/index.jsx
// ============================================================================
// VERSION FINAL ESTABLE
// ✅ 1. (FIX) loadRelatedVideos: Eliminada la selección de 'likes_count' (Arregla el crash/recarga).
// ✅ 2. (VERIFICADO) fetchVideoData: Usa conteo directo (Arregla contadores en cero).
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
        60% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1); }
      }
    `, 0);
  }
} catch (e) {
  console.warn("Could not insert CSS rule (might be running in a restricted environment):", e);
}


// Componente de Like Animado
const AnimatedLikeButton = ({ isActive, onClick }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleClick = () => {
    setIsAnimating(true);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onAnimationEnd={() => setIsAnimating(false)}
      className={`p-2 rounded-full transition-colors relative ${
        isActive ? 'text-red-500 bg-red-100' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <Icon 
        name={isActive ? 'HeartFill' : 'Heart'} 
        size={24} 
        className={isActive && isAnimating ? 'animate-pop-in' : ''}
        style={isActive && isAnimating ? { animation: 'pop-in 0.3s ease-out' } : {}}
      />
    </button>
  );
};


// Constantes de puntos (Ajusta estos valores a tu backend real)
const POINTS_WATCH_VIDEO = 5;
const POINTS_LIKE_CONTENT = 10;

const VideoPlayerPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showPointsEarned } = usePoints(); 
  const isMobile = useIsMobile();

  // Estados de los datos del video
  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de interacción del usuario
  const [isLiked, setIsLiked] = useState(false);
  const [videoStats, setVideoStats] = useState({ likes: 0, views: 0, comments: 0 });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const videoRef = useRef(null);

  // URL para compartir
  const shareLink = `${window.location.origin}/video/${videoId}`;

  // =========================================================================
  // HOOKS DE EFECTO Y CARGA DE DATOS
  // =========================================================================

  const fetchVideoData = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener datos del video y del autor
      const { data, error: videoError } = await supabase
        .from('videos')
        .select(`
          *,
          author:user_id (id, username, name, avatar_url, is_verified, subscribers_count, is_following)
        `)
        .eq('id', id)
        .single();

      if (videoError) throw videoError;
      if (!data) {
        setError("El video no fue encontrado.");
        setLoading(false);
        return;
      }

      setVideo(data);
      setVideoStats({ 
        likes: data.likes_count || 0, // Usar conteo directo
        views: data.views_count || 0, // Usar conteo directo
        comments: data.comments_count || 0
      });

      // 2. Cargar estado de "Me gusta"
      if (user) {
        const { count, error: likeError } = await supabase
          .from('video_likes')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', id)
          .eq('user_id', user.id);

        if (likeError) throw likeError;
        setIsLiked(count > 0);
      }
      
      // 3. Registrar vista y otorgar puntos
      if (user && data.user_id !== user.id) {
        // Ejecutar estas acciones en segundo plano
        await supabase.rpc('increment_video_view', { video_id: id });
        
        // Registrar misión de ver video
        trackWatchVideo(user.id, id, POINTS_WATCH_VIDEO)
          .then(() => {
            // Mostrar notificación de puntos ganados
            showPointsEarned(POINTS_WATCH_VIDEO, 'free', 'Por ver contenido');
          })
          .catch(console.error);

      } else {
        // Solo incrementar la vista para usuarios no logueados o creador propio
        await supabase.rpc('increment_video_view', { video_id: id });
      }

      setLoading(false);
      
    } catch (e) {
      console.error("Error al cargar datos del video:", e);
      setError("Error al cargar el video. Inténtalo de nuevo.");
      setLoading(false);
    }
  }, [user, showPointsEarned]);

  const loadRelatedVideos = useCallback(async (currentVideoId) => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id, title, thumbnail_url, views_count, duration,
          author:user_id (name, username)
        `)
        .neq('id', currentVideoId)
        .order('created_at', { ascending: false })
        .limit(10); // Límite de videos relacionados

      if (error) throw error;
      setRelatedVideos(data || []);
    } catch (e) {
      console.error("Error loading related videos:", e);
    }
  }, []);

  useEffect(() => {
    if (videoId) {
      fetchVideoData(videoId);
      loadRelatedVideos(videoId);
    }
  }, [videoId, fetchVideoData, loadRelatedVideos]);

  // =========================================================================
  // MANEJADORES DE INTERACCIÓN
  // =========================================================================

  const handleToggleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Estado optimista
    const newLikedStatus = !isLiked;
    const newLikeCount = videoStats.likes + (newLikedStatus ? 1 : -1);
    
    setIsLiked(newLikedStatus);
    setVideoStats(prev => ({ ...prev, likes: Math.max(0, newLikeCount) }));

    try {
      if (newLikedStatus) {
        // INSERTAR like
        const { error } = await supabase
          .from('video_likes')
          .insert([{ video_id: videoId, user_id: user.id }]);
          
        if (error) throw error;
        
        // Registrar misión de dar like
        trackGiveLike(user.id, videoId, POINTS_LIKE_CONTENT)
            .then(() => {
                showPointsEarned(POINTS_LIKE_CONTENT, 'free', 'Por dar Me Gusta');
            })
            .catch(console.error);

      } else {
        // ELIMINAR like
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
          
        if (error) throw error;
      }
      
      // Actualizar conteo en la base de datos (trigger o rpc)
      await supabase.rpc('update_video_like_count', { video_id: videoId });

    } catch (e) {
      console.error("Error toggling like:", e);
      // Revertir estado si hay error
      setIsLiked(!newLikedStatus);
      setVideoStats(prev => ({ ...prev, likes: newLikeCount - (newLikedStatus ? 2 : -2) }));
      alert("Error al procesar el Me Gusta. Inténtalo de nuevo.");
    }
  };

  const handleFollow = async (authorId, isCurrentlyFollowing) => {
    if (!user) {
        navigate('/login');
        return;
    }
    
    // Evitar seguirse a sí mismo
    if (authorId === user.id) {
        alert("No puedes seguirte a ti mismo.");
        return;
    }
    
    // Estado optimista: Actualiza el estado local del video
    const newIsFollowing = !isCurrentlyFollowing;
    setVideo(prev => ({
        ...prev,
        author: {
            ...prev.author,
            is_following: newIsFollowing
        }
    }));
    
    try {
        if (newIsFollowing) {
            // Seguir
            const { error } = await supabase
                .from('user_followers')
                .insert([{ follower_id: user.id, following_id: authorId }]);
            if (error) throw error;
            
            trackFollowUser(user.id, authorId, 25)
                .then(() => showPointsEarned(25, 'free', 'Por seguir a un usuario'))
                .catch(console.error);
        } else {
            // Dejar de Seguir
            const { error } = await supabase
                .from('user_followers')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', authorId);
            if (error) throw error;
        }

        // Actualizar el conteo de seguidores del autor (asumiendo un RPC o Trigger)
        // await supabase.rpc('update_follower_count', { user_id: authorId });

    } catch (e) {
        console.error("Error al seguir/dejar de seguir:", e);
        // Revertir estado si hay error
        setVideo(prev => ({
            ...prev,
            author: {
                ...prev.author,
                is_following: !newIsFollowing
            }
        }));
        alert("Error al actualizar el estado de seguimiento.");
    }
  };


  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopySuccess(true);
      trackShareContent(user?.id, videoId, 5)
        .then(() => showPointsEarned(5, 'free', 'Por compartir contenido'))
        .catch(console.error);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };
  
  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };
  
  const handleCommentClick = () => {
    if (!user) {
        navigate('/login');
        return;
    }
    // Lógica para abrir modal/sección de comentarios (Placeholder)
    alert("Funcionalidad de comentarios pendiente");
    trackComment(user.id, videoId, 15)
        .then(() => showPointsEarned(15, 'free', 'Por comentar contenido'))
        .catch(console.error);
  };
  
  // =========================================================================
  // RENDERIZADO
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-16">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="text-center pt-32 p-4">
        <h1 className="text-2xl font-bold text-red-500">Error de Carga</h1>
        <p className="text-muted-foreground mt-2">{error || 'El video no pudo ser cargado o no existe.'}</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Volver a Inicio
        </Button>
      </div>
    );
  }
  
  // URL de descarga simulada
  const downloadLink = video.video_url.replace('/stream/', '/download/');

  return (
    <>
      <Helmet>
        <title>{video.title} | RADEISAN</title>
        <meta name="description" content={video.description?.substring(0, 150) || `Mira el video ${video.title} en RADEISAN.`} />
        <meta property="og:title" content={video.title} />
        <meta property="og:image" content={video.thumbnail_url} />
      </Helmet>

      {/* Main Content Layout */}
      <div className="pt-16 pb-16 min-h-screen bg-background md:pt-20 md:pb-0">
        <div className="container mx-auto flex flex-col md:flex-row gap-8 px-4">
          
          {/* Columna Izquierda (Video Player y Descripción) */}
          <div className="flex-1 w-full md:max-w-[70%]">
            
            {/* 1. Video Player */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-xl">
              <video 
                ref={videoRef}
                src={video.video_url} 
                poster={video.thumbnail_url}
                controls 
                autoPlay 
                playsInline 
                className="w-full h-full object-contain"
              >
                Tu navegador no soporta el tag de video.
              </video>
            </div>
            
            {/* 2. Título y Stats (Móvil/Desktop) */}
            <h1 className="text-2xl font-extrabold text-foreground mt-4 mb-2">
              {video.title}
            </h1>
            
            {/* Stats - Vistas y Fecha */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground border-b pb-3 mb-3">
              <span>{videoStats.views.toLocaleString()} vistas</span>
              <span>•</span>
              <span>{new Date(video.created_at).toLocaleDateString()}</span>
              {video.is_live && (
                <>
                  <span>•</span>
                  <span className="text-red-500 font-bold flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    EN VIVO
                  </span>
                </>
              )}
            </div>
            
            {/* 3. Panel de Interacción (Solo Desktop) */}
            <div className="hidden md:flex items-center justify-between pb-4 border-b">
              
              {/* INFORMACIÓN DEL AUTOR */}
              <div className="flex items-center space-x-3">
                
                <div className="flex items-center space-x-3">
                  {/* AVATAR Y NOMBRE DEL AUTOR */}
                  <Link 
                    to={`/user/${video.author.username}`} // ✅ CORRECCIÓN A LA RUTA PÚBLICA /user/
                    className="flex items-center space-x-3"
                  >
                    <div className="w-12 h-12 flex-shrink-0 bg-gray-200 rounded-full overflow-hidden">
                      {video.author.avatar_url ? (
                        <img src={video.author.avatar_url} alt={video.author.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="User" size={24} className="text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-base hover:text-primary transition-colors">
                        {video.author.name}
                        {video.author.is_verified && <Icon name="CheckCircle" size={16} className="text-blue-500 ml-1 inline" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {video.author.subscribers_count.toLocaleString()} seguidores
                      </p>
                    </div>
                  </Link>
                </div>

                {/* BOTÓN SEGUIR/DEJAR DE SEGUIR */}
                {user && video.author.id !== user.id && (
                    <Button 
                        variant={video.author.is_following ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleFollow(video.author.id, video.author.is_following)}
                        className="text-sm font-medium"
                    >
                        <Icon 
                            name={video.author.is_following ? 'UserMinus' : 'UserPlus'} 
                            size={16} 
                            className="mr-2"
                        />
                        {video.author.is_following ? 'Siguiendo' : 'Seguir'}
                    </Button>
                )}
              </div>
              
              {/* BOTONES DE ACCIÓN */}
              <div className="flex items-center space-x-2">
                
                {/* Like */}
                <div className="flex items-center bg-gray-100 rounded-full p-1">
                  <AnimatedLikeButton isActive={isLiked} onClick={handleToggleLike} />
                  <span className="text-sm font-bold text-foreground pr-3">
                    {videoStats.likes.toLocaleString()}
                  </span>
                </div>
                
                {/* Comentar */}
                <Button variant="ghost" className="rounded-full p-2" onClick={handleCommentClick}>
                  <Icon name="MessageCircle" size={24} className="mr-2" />
                  <span className="text-sm font-bold">{videoStats.comments.toLocaleString()}</span>
                </Button>
                
                {/* Compartir */}
                <Button variant="ghost" className="rounded-full p-2" onClick={handleShareClick}>
                  <Icon name="Share" size={24} className="mr-2" />
                  <span className="text-sm font-bold">Compartir</span>
                </Button>

                {/* Descargar (Opcional) */}
                <a href={downloadLink} download={`${video.title}.mp4`} className="text-sm">
                  <Button variant="ghost" className="rounded-full p-2">
                    <Icon name="Download" size={24} />
                  </Button>
                </a>
              </div>
            </div>
            
            {/* 4. Descripción del Video */}
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-foreground whitespace-pre-line">
                {video.description || 'El autor no proporcionó una descripción para este contenido.'}
              </p>
              
              {video.tags && video.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  {video.tags.map(tag => (
                    <span key={tag} className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* 5. Sección de Comentarios (Placeholder) */}
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">{videoStats.comments.toLocaleString()} Comentarios</h2>
              <div className="text-muted-foreground p-8 bg-muted rounded-lg text-center">
                <Icon name="MessageSquare" size={32} className="mx-auto mb-2" />
                <p className="text-sm">La sección de comentarios está siendo cargada...</p>
              </div>
            </div>

          </div>
          
          {/* Columna Derecha (Videos Relacionados) */}
          <div className="w-full md:w-[30%] md:max-w-[300px] flex-shrink-0">
            <RelatedVideosSidebar 
              videos={relatedVideos} 
              currentVideoId={videoId} 
            />
          </div>
        </div>
      </div>
      
      {/* =========================================================================
          PANEL DE ACCIONES (Mobile Fixed Bottom)
          ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border p-3 md:hidden">
        <div className="flex items-center justify-around">
          
          {/* Like */}
          <div className="flex flex-col items-center">
             <AnimatedLikeButton isActive={isLiked} onClick={handleToggleLike} />
             <span className="text-xs mt-1 text-foreground font-medium">{videoStats.likes.toLocaleString()}</span>
          </div>

          {/* Comentar */}
          <button className="flex flex-col items-center p-2 text-gray-500 hover:text-primary transition-colors" onClick={handleCommentClick}>
            <Icon name="MessageCircle" size={24} />
            <span className="text-xs mt-1 font-medium">{videoStats.comments.toLocaleString()}</span>
          </button>
          
          {/* Compartir */}
          <button className="flex flex-col items-center p-2 text-gray-500 hover:text-primary transition-colors" onClick={handleShareClick}>
            <Icon name="Share" size={24} />
            <span className="text-xs mt-1 font-medium">Compartir</span>
          </button>
          
          {/* Seguir/Dejar de Seguir (Si no es su propio video) */}
          {user && video.author.id !== user.id && (
            <button
                className={`flex flex-col items-center p-2 transition-colors ${
                    video.author.is_following ? 'text-primary' : 'text-green-500 hover:text-green-600'
                }`}
                onClick={() => handleFollow(video.author.id, video.author.is_following)}
            >
                <Icon name={video.author.is_following ? 'UserCheck' : 'UserPlus'} size={24} />
                <span className="text-xs mt-1 font-medium">{video.author.is_following ? 'Siguiendo' : 'Seguir'}</span>
            </button>
          )}

          {/* Más Opciones */}
          <button className="flex flex-col items-center p-2 text-gray-500 hover:text-primary transition-colors">
            <Icon name="MoreHorizontal" size={24} />
            <span className="text-xs mt-1 font-medium">Más</span>
          </button>

        </div>
      </div>


      {/* =========================================================================
          MODAL DE COMPARTIR
          ========================================================================= */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setIsShareModalOpen(false)}>
          <div className="bg-background rounded-lg shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="text-xl font-bold">Compartir Video</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsShareModalOpen(false)}>
                <Icon name="X" size={24} />
              </Button>
            </div>
            
            <div className="flex flex-col space-y-3 mb-6">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(video.title)}&url=${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
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
                <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
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
