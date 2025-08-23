import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import PointsBalanceIndicator from '../../../components/ui/PointsBalanceIndicator';

const ProfileHeader = ({ user, onEditProfile, onUpgradeAccount }) => {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
  };

  return (
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
        
        {/* Edit Cover Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm text-white hover:bg-black/30"
          onClick={() => console.log('Edit cover')}
        >
          <Icon name="Camera" size={18} />
        </Button>
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
              </div>
              
              {/* Edit Avatar Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full shadow-elevation-1"
                onClick={() => console.log('Edit avatar')}
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

              {/* Stats */}
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
              >
                Upgrade
              </Button>
            )}
          </div>
        </div>

        {/* Achievement Badges */}
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
  );
};

export default ProfileHeader;