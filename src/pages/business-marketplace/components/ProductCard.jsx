import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ProductCard = ({ product, onAddToCart, onToggleFavorite, isFavorite = false }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [showQuickView, setShowQuickView] = useState(false);

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleAddToCart = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (onAddToCart && product?.status === 'available') {
      onAddToCart(product);
    }
  };

  const handleToggleFavorite = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product?.id);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    })?.format(price);
  };

  const getStatusBadge = () => {
    switch (product?.status) {
      case 'sold':
        return (
          <div className="absolute top-2 left-2 bg-error text-error-foreground px-2 py-1 rounded-md text-xs font-medium">
            Vendido
          </div>
        );
      case 'reserved':
        return (
          <div className="absolute top-2 left-2 bg-warning text-warning-foreground px-2 py-1 rounded-md text-xs font-medium">
            Reservado
          </div>
        );
      case 'limited':
        return (
          <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-2 py-1 rounded-md text-xs font-medium">
            Últimas unidades
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="group relative bg-card border border-border rounded-lg overflow-hidden shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        <Image
          src={product?.image}
          alt={product?.title}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            product?.status === 'sold' ? 'opacity-60 grayscale' : ''
          }`}
          onLoad={handleImageLoad}
        />

        {/* Status Badge */}
        {getStatusBadge()}

        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-2 right-2 w-8 h-8 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-card"
        >
          <Icon
            name={isFavorite ? "Heart" : "Heart"}
            size={16}
            color={isFavorite ? "var(--color-error)" : "var(--color-muted-foreground)"}
            className={isFavorite ? "fill-current" : ""}
          />
        </button>

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
                setShowQuickView(true);
              }}
            >
              <Icon name="Eye" size={16} />
              Vista rápida
            </Button>
          </div>
        </div>

        {/* Sold Overlay */}
        {product?.status === 'sold' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-error/90 text-error-foreground px-4 py-2 rounded-lg font-bold text-lg transform -rotate-12">
              VENDIDO
            </div>
          </div>
        )}
      </div>
      {/* Product Info */}
      <div className="p-4">
        {/* Business Info */}
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
            <Icon name="Store" size={12} color="white" />
          </div>
          <Link
            to={`/business-profile/${product?.businessId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
            onClick={(e) => e?.stopPropagation()}
          >
            {product?.businessName}
          </Link>
        </div>

        {/* Product Title */}
        <h3 className={`font-medium text-foreground mb-2 line-clamp-2 ${
          product?.status === 'sold' ? 'line-through opacity-60' : ''
        }`}>
          {product?.title}
        </h3>

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className={`text-lg font-bold text-primary ${
              product?.status === 'sold' ? 'line-through opacity-60' : ''
            }`}>
              {formatPrice(product?.price)}
            </span>
            {product?.originalPrice && product?.originalPrice > product?.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product?.originalPrice)}
              </span>
            )}
          </div>
          
          {product?.stock !== undefined && product?.stock > 0 && product?.status !== 'sold' && (
            <span className="text-xs text-muted-foreground">
              {product?.stock} disponibles
            </span>
          )}
        </div>

        {/* Product Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Icon name="Eye" size={12} />
              <span>{product?.views || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Icon name="Heart" size={12} />
              <span>{product?.likes || 0}</span>
            </div>
          </div>
          <span>{product?.location}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            disabled={product?.status === 'sold'}
            onClick={handleAddToCart}
            iconName="ShoppingCart"
            iconPosition="left"
            iconSize={14}
          >
            {product?.status === 'sold' ? 'Vendido' : 'Añadir'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e?.preventDefault();
              e?.stopPropagation();
              // Handle share functionality
            }}
          >
            <Icon name="Share2" size={14} />
          </Button>
        </div>
      </div>
      {/* Quick View Modal */}
      {showQuickView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Vista rápida</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQuickView(false)}
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="aspect-square">
                  <Image
                    src={product?.image}
                    alt={product?.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-bold mb-2">{product?.title}</h3>
                  <p className="text-2xl font-bold text-primary mb-4">
                    {formatPrice(product?.price)}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {product?.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>Vendedor:</span>
                      <span className="font-medium">{product?.businessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ubicación:</span>
                      <span>{product?.location}</span>
                    </div>
                    {product?.stock && (
                      <div className="flex justify-between">
                        <span>Stock:</span>
                        <span>{product?.stock} unidades</span>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="default"
                    fullWidth
                    disabled={product?.status === 'sold'}
                    onClick={handleAddToCart}
                  >
                    {product?.status === 'sold' ? 'Producto vendido' : 'Añadir al carrito'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;