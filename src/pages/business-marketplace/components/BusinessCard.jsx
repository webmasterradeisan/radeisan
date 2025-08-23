import React from 'react';
import { Link } from 'react-router-dom';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BusinessCard = ({ business, onFollow, isFollowing = false }) => {
  const handleFollow = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (onFollow) {
      onFollow(business?.id);
    }
  };

  const getBusinessTypeIcon = (type) => {
    switch (type) {
      case 'verified_store':
        return 'BadgeCheck';
      case 'artist':
        return 'Palette';
      case 'small_business':
        return 'Store';
      default:
        return 'User';
    }
  };

  const getBusinessTypeBadge = (type) => {
    switch (type) {
      case 'verified_store':
        return { label: 'Verificado', color: 'text-success bg-success/10' };
      case 'artist':
        return { label: 'Artista', color: 'text-accent bg-accent/10' };
      case 'small_business':
        return { label: 'Negocio', color: 'text-secondary bg-secondary/10' };
      default:
        return { label: 'Individual', color: 'text-muted-foreground bg-muted' };
    }
  };

  const badge = getBusinessTypeBadge(business?.type);

  return (
    <Link
      to={`/business-profile/${business?.id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:shadow-elevation-2 transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Business Avatar */}
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {business?.avatar ? (
              <Image
                src={business?.avatar}
                alt={business?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon
                name={getBusinessTypeIcon(business?.type)}
                size={20}
                color="white"
              />
            )}
          </div>

          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {business?.name}
              </h3>
              {business?.type === 'verified_store' && (
                <Icon name="BadgeCheck" size={16} color="var(--color-success)" />
              )}
            </div>
            
            <div className="flex items-center space-x-2 mb-1">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge?.color}`}>
                {badge?.label}
              </span>
              <div className="flex items-center space-x-1">
                <Icon name="Star" size={12} color="var(--color-accent)" />
                <span className="text-xs text-muted-foreground">
                  {business?.rating} ({business?.reviewCount})
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Icon name="MapPin" size={12} />
              <span className="truncate">{business?.location}</span>
            </div>
          </div>
        </div>

        {/* Follow Button */}
        <Button
          variant={isFollowing ? "secondary" : "outline"}
          size="sm"
          onClick={handleFollow}
          iconName={isFollowing ? "UserCheck" : "UserPlus"}
          iconPosition="left"
          iconSize={14}
          className="flex-shrink-0"
        >
          {isFollowing ? 'Siguiendo' : 'Seguir'}
        </Button>
      </div>
      {/* Business Description */}
      {business?.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {business?.description}
        </p>
      )}
      {/* Product Preview */}
      {business?.featuredProducts && business?.featuredProducts?.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Package" size={14} color="var(--color-muted-foreground)" />
            <span className="text-xs text-muted-foreground">Productos destacados</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {business?.featuredProducts?.slice(0, 3)?.map((product, index) => (
              <div key={index} className="aspect-square rounded-md overflow-hidden bg-muted">
                <Image
                  src={product?.image}
                  alt={product?.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Business Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Icon name="Package" size={12} />
            <span>{business?.productCount} productos</span>
          </div>
          <div className="flex items-center space-x-1">
            <Icon name="Users" size={12} />
            <span>{business?.followerCount} seguidores</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Icon name="Clock" size={12} />
          <span>Activo hace {business?.lastActive}</span>
        </div>
      </div>
      {/* Special Badges */}
      <div className="flex items-center space-x-2 mt-3">
        {business?.hasNewProducts && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            Productos nuevos
          </span>
        )}
        {business?.hasDiscount && (
          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
            Ofertas activas
          </span>
        )}
        {business?.fastShipping && (
          <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
            Envío rápido
          </span>
        )}
      </div>
    </Link>
  );
};

export default BusinessCard;