// src/pages/video-feed-dashboard/components/VideoActionButtons.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon'; // Asegúrate que la ruta sea correcta

const VideoActionButtons = ({
  video,
  isMobile,
  currentUser,
  // Estados
  isLiked,
  isDisliked,
  isSaved,
  isMuted,
  isFollowed,
  // Contadores
  likesCount,
  commentsCount,
  // Handlers (Funciones)
  onLike,
  onDislike,
  onSave,
  onShare,
  onMute,
  onComment,
  onFollow,
  onGift,
  // Estilos opcionales
  className = ''
}) => {
  if (!video) return null;

  // Configuración de estilos según el dispositivo
  const containerClass = isMobile
    ? "absolute bottom-20 right-4 flex flex-col items-center space-y-5 z-10"
    : "flex flex-col items-center space-y-6 ml-6 z-50";

  const avatarSize = isMobile ? "w-12 h-12" : "w-14 h-14";
  const buttonSize = isMobile ? "w-11 h-11" : "w-14 h-14";
  const iconSize = isMobile ? 26 : 28;
  const textSize = isMobile ? "text-xs" : "text-sm";

  // Renderizado del Avatar
  const renderAvatar = () => (
    <div className="relative">
      <Link to={`/profile/${video.creator?.id}`} onClick={(e) => e.stopPropagation()}>
        <div className={`${avatarSize} rounded-full overflow-hidden border-2 ${isMobile ? 'border-white' : 'border-gray-300'} shadow-lg bg-white transition-transform hover:scale-105`}>
          {video.creator?.avatar ? (
            <img src={video.creator.avatar} alt={video.creator.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{video.creator?.name?.charAt(0) || 'U'}</span>
            </div>
          )}
        </div>
      </Link>
      {!isFollowed && currentUser?.id !== video.creator?.id && (
        <button
          onClick={(e) => onFollow(video.creator?.id, e)}
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg hover:scale-110 z-20"
        >
          <Icon name="Plus" size={14} color="white" />
        </button>
      )}
    </div>
  );

  // Helper para botón genérico
  const ActionButton = ({ onClick, active, activeColor, icon, label, color = "text-white", bgDesktop = "bg-white" }) => {
    // Clases dinámicas para desktop (efecto hover y fondo blanco)
    const desktopClasses = !isMobile 
      ? `shadow-lg ${active ? `${activeColor} text-white scale-110` : `${bgDesktop} text-gray-800 hover:scale-110 group-hover:${activeColor.replace('bg-', 'bg-').replace('500', '50')}`}` 
      : `${active ? activeColor.replace('bg-', 'text-') : 'text-white hover:scale-110'}`; // Mobile solo cambia color de texto o escala

    return (
      <button onClick={onClick} className={`flex flex-col items-center space-y-1 group ${className}`}>
        <div className={`${buttonSize} rounded-full flex items-center justify-center transition-all ${desktopClasses}`}>
          <Icon name={icon} size={iconSize} className={active ? 'fill-current' : ''} />
        </div>
        {label && (
          <span className={`font-semibold ${textSize} ${isMobile ? 'text-white' : 'text-gray-800 bg-white px-2 py-0.5 rounded-full shadow-sm'}`}>
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={containerClass} onClick={(e) => e.stopPropagation()}>
      {/* 1. Avatar y Follow */}
      {renderAvatar()}

      {/* 2. Like */}
      <ActionButton 
        onClick={(e) => onLike(video.id, e)}
        active={isLiked}
        activeColor="bg-red-500" // En mobile se convierte a text-red-500 por la lógica arriba
        icon="ThumbsUp"
        label={likesCount}
      />

      {/* 3. Dislike */}
      <ActionButton 
        onClick={(e) => onDislike(video.id, e)}
        active={isDisliked}
        activeColor="bg-gray-500"
        icon="ThumbsDown"
      />

      {/* 4. Regalo (Gift) */}
      {currentUser && currentUser.id !== video.creator?.id && (
        <button onClick={(e) => onGift(video, e)} className="flex flex-col items-center space-y-1 group">
           <div className={`${buttonSize} rounded-full flex items-center justify-center hover:scale-110 transition-transform ${isMobile ? 'text-yellow-500 bg-white/20' : 'bg-white shadow-lg text-yellow-600 group-hover:bg-yellow-50'}`}>
             <span className="text-xl font-extrabold mr-0.5 leading-none">R</span>
             <Icon name="Gift" size={isMobile ? 20 : 24} className="fill-current" />
           </div>
        </button>
      )}

      {/* 5. Comentarios */}
      <ActionButton 
        onClick={(e) => onComment(video.id, e)}
        icon="MessageCircle"
        label={commentsCount}
        activeColor="bg-blue-500" // Solo para hover effect
      />

      {/* 6. Guardar */}
      <ActionButton 
        onClick={(e) => onSave(video.id, e)}
        active={isSaved}
        activeColor="bg-yellow-500"
        icon="Bookmark"
      />

      {/* 7. Compartir */}
      <ActionButton 
        onClick={(e) => onShare(video, e)}
        icon="Share2"
        activeColor="bg-green-500"
      />

      {/* 8. Mute */}
      <ActionButton 
        onClick={(e) => onMute(video.id, e)}
        icon={isMuted ? 'VolumeX' : 'Volume2'}
        activeColor="bg-purple-500"
      />

      {/* 9. Icono Música (Animación) */}
      <button className="flex flex-col items-center mt-2" onClick={(e) => e.stopPropagation()}>
        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg overflow-hidden ${isMobile ? 'border-2 border-white' : 'border-2 border-gray-300'} shadow-lg`}>
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-spin-slow">
            <Icon name="Music" size={isMobile ? 18 : 20} color="white" />
          </div>
        </div>
      </button>
    </div>
  );
};

export default VideoActionButtons;
