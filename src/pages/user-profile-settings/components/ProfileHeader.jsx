import React, { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import PointsBalanceIndicator from '../../../components/ui/PointsBalanceIndicator';
import ProfileImageEditor from '../../../components/ProfileImageEditor'; // 🆕 Import del editor

const ProfileHeader = ({ 
  user, 
  onEditProfile, 
  onUpgradeAccount, 
  onUploadAvatar,   // 🆕 Prop para upload de avatar
  onUploadCover,    // 🆕 Prop para upload de cover
  loading = false,  // 🆕 Prop para estado de carga
  stats = {}        // 🆕 Prop para estadísticas adicionales
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false); // 🆕 Estado para mostrar editor
  const [editingType, setEditingType] = useState(null); // 🆕 'avatar' o 'cover'
  
  // 🆕 Referencias para inputs de archivo
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
  };

  // 🆕 Handler para abrir editor de avatar
  const handleEditAvatar = () => {
    setEditingType('avatar');
    setShowImageEditor(true);
  };

  // 🆕 Handler para abrir editor de cover
  const handleEditCover = () => {
    setEditingType('cover');
    setShowImageEditor(true);
  };

  // 🆕 Handler para cambio de avatar desde el editor
  const handleAvatarChange = async (url) => {
    if (onUploadAvatar && url) {
      console.log('Avatar updated:', url);
      setShowImageEditor(false);
      setEditingType(null);
    }
  };

  // 🆕 Handler para cambio de cover desde el editor
  const handleCoverChange = async (url) => {
    if (onUploadCover && url) {
      console.log('Cover updated:', url);
      setShowImageEditor(false);
      setEditingType(null);
    }
  };

  // 🆕 Handler para cerrar el editor
  const handleCloseEditor = () => {
    setShowImageEditor(false);
    setEditingType(null);
  };

  return (
    <>
      <div className="bg-card border-b border-border">
        {/* Cover Image */}
        <div className="relative h-32 sm:h-48 bg-gradient-to-r from-primary/20 to-secondary/20 overflow-hidden">
          {user?.coverImage ? (
            <Image 
              src={user?.coverImage} 
              alt="Portada del perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
          )}
          
          {/* 🆕 Loading overlay para cover */}
          {loading && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <div className="flex items-center space-x-2 text-white">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Actualizando portada...</span>
              </div>
            </div>
          )}
          
          {/* Edit Cover Button - 🆕 ACTUALIZADO */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm text-white hover:bg-black/30"
            onClick={handleEditCover}
            disabled={loading}
          >
            <Icon name="Camera" size={18} />
          </Button>

          {/* 🆕 Botón adicional para cambiar cover rápido */}
          <div className="absolute bottom-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              className="bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 text-xs"
              onClick={handleEditCover}
              disabled={loading}
            >
              <Icon name="ImageIcon" size={14} className="mr-1" />
              Cambiar portada
            </Button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-12 sm:-mt-16">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4">
              <div className="relative mb-4 sm:mb-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-card overflow-hidden shadow-elevation-2">
                  <Image 
                    src={user?.avatar} 
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* 🆕 Loading overlay para avatar */}
                  {loading && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                {/* Edit Avatar Button - 🆕 ACTUALIZADO */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full shadow-elevation-1"
                  onClick={handleEditAvatar}
                  disabled={loading}
                >
                  <Icon name="Camera" size={14} />
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">
                    {user?.name}
                  </h1>
                  {user?.isVerified && (
                    <Icon name="BadgeCheck" size={20} color="var(--color-primary)" />
                  )}
                  {user?.isBusinessAccount && (
                    <div className="flex items-center space-x-1 px-2 py-0.5 bg-accent/10 rounded-full">
                      <Icon name="Building2" size={12} color="var(--color-accent)" />
                      <span className="text-xs font-medium text-accent">Business</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">@{user?.username}</p>
                
                {user?.bio && (
                  <p className="text-sm text-foreground mb-3 max-w-md">
                    {user?.bio}
                  </p>
                )}

                {/* Stats - 🆕 MEJORADAS con más información */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-foreground">{user?.followersCount?.toLocaleString()}</span>
                    <span className="text-muted-foreground">seguidores</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-foreground">{user?.followingCount?.toLocaleString()}</span>
                    <span className="text-muted-foreground">siguiendo</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-foreground">{user?.videosCount}</span>
                    <span className="text-muted-foreground">videos</span>
                  </div>
                  {/* 🆕 Añadir contador de fotos cuando esté disponible */}
                  {user?.photosCount > 0 && (
                    <div className="flex items-center space-x-1">
                      <span className="font-medium text-foreground">{user?.photosCount}</span>
                      <span className="text-muted-foreground">fotos</span>
                    </div>
                  )}
                </div>

                {/* 🆕 Stats adicionales en mobile */}
                <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1 sm:hidden">
                  {stats?.totalViews > 0 && (
                    <span>{stats.totalViews.toLocaleString()} visualizaciones</span>
                  )}
                  {stats?.totalLikes > 0 && (
                    <span>{stats.totalLikes.toLocaleString()} likes</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <PointsBalanceIndicator 
                points={user?.totalPoints} 
                size="default"
                variant="prominent"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={onEditProfile}
                iconName="Edit"
                iconPosition="left"
                disabled={loading}
              >
                Editar Perfil
              </Button>

              {!user?.isBusinessAccount && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onUpgradeAccount}
                  iconName="Zap"
                  iconPosition="left"
                  disabled={loading}
                >
                  Upgrade
                </Button>
              )}
            </div>
          </div>

          {/* 🆕 Progress indicator durante uploads */}
          {loading && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="flex-1">
                  <p className="text-sm text-primary font-medium">Subiendo imagen...</p>
                  <p className="text-xs text-muted-foreground">Esto puede tardar unos segundos</p>
                </div>
              </div>
            </div>
          )}

          {/* Achievement Badges - MANTENER IGUAL */}
          {user?.achievements && user?.achievements?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Icon name="Award" size={16} color="var(--color-accent)" />
                <span className="text-sm font-medium text-foreground">Logros</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {user?.achievements?.slice(0, 5)?.map((achievement) => (
                  <div
                    key={achievement?.id}
                    className="flex items-center space-x-1 px-2 py-1 bg-accent/10 rounded-full"
                    title={achievement?.description}
                  >
                    <Icon name={achievement?.icon} size={12} color="var(--color-accent)" />
                    <span className="text-xs font-medium text-accent">{achievement?.name}</span>
                  </div>
                ))}
                {user?.achievements?.length > 5 && (
                  <div className="flex items-center px-2 py-1 bg-muted rounded-full">
                    <span className="text-xs text-muted-foreground">
                      +{user?.achievements?.length - 5} más
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🆕 Modal del ProfileImageEditor */}
      {showImageEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg shadow-elevation-3 m-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-foreground">
                  {editingType === 'avatar' ? 'Editar Foto de Perfil' : 'Editar Imagen de Portada'}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseEditor}
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>

              <ProfileImageEditor
                currentAvatar={editingType === 'avatar' ? user?.avatar : null}
                currentCover={editingType === 'cover' ? user?.coverImage : null}
                onAvatarChange={editingType === 'avatar' ? handleAvatarChange : null}
                onCoverChange={editingType === 'cover' ? handleCoverChange : null}
                loading={loading}
                mode={editingType} // 🆕 Prop para mostrar solo avatar o cover
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileHeader;
