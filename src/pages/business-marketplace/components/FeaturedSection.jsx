import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FeaturedSection = ({ className = '' }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const featuredItems = [
    {
      id: 1,
      type: 'product',
      title: 'iPhone 14 Pro Max - Como nuevo',
      description: 'Smartphone premium en excelente estado con todos los accesorios originales',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=600&fit=crop',
      price: 899,
      originalPrice: 1199,
      businessName: 'TechStore Madrid',
      badge: 'Oferta especial',
      badgeColor: 'bg-error text-error-foreground'
    },
    {
      id: 2,
      type: 'business',
      title: 'Artesanías Luna - Nuevo vendedor',
      description: 'Descubre productos únicos hechos a mano por artistas locales',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
      businessName: 'Artesanías Luna',
      badge: 'Nuevo vendedor',
      badgeColor: 'bg-success text-success-foreground',
      stats: { products: 45, rating: 4.9, followers: 234 }
    },
    {
      id: 3,
      type: 'category',
      title: 'Moda de Temporada',
      description: 'Las últimas tendencias en ropa y accesorios para esta temporada',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
      badge: 'Tendencia',
      badgeColor: 'bg-accent text-accent-foreground',
      stats: { products: 156, discount: '30%' }
    },
    {
      id: 4,
      type: 'product',
      title: 'Set de Herramientas Profesional',
      description: 'Kit completo de herramientas para profesionales y aficionados',
      image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&h=600&fit=crop',
      price: 149,
      originalPrice: 199,
      businessName: 'Ferretería Central',
      badge: 'Más vendido',
      badgeColor: 'bg-primary text-primary-foreground'
    }
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredItems?.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, featuredItems?.length]);

  const handleSlideChange = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredItems?.length) % featuredItems?.length);
    setIsAutoPlaying(false);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredItems?.length);
    setIsAutoPlaying(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    })?.format(price);
  };

  const currentItem = featuredItems?.[currentSlide];

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden shadow-elevation-1 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Icon name="Star" size={20} color="var(--color-accent)" />
          <h2 className="text-lg font-bold text-foreground">Destacados</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevSlide}
            className="w-8 h-8"
          >
            <Icon name="ChevronLeft" size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextSlide}
            className="w-8 h-8"
          >
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      </div>
      {/* Carousel Content */}
      <div className="relative">
        <div className="aspect-[16/9] lg:aspect-[21/9] relative overflow-hidden">
          <Image
            src={currentItem?.image}
            alt={currentItem?.title}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          
          {/* Content Overlay */}
          <div className="absolute inset-0 flex items-center">
            <div className="p-6 lg:p-8 max-w-2xl">
              {/* Badge */}
              <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium mb-3 ${currentItem?.badgeColor}`}>
                <Icon name="Zap" size={14} />
                <span>{currentItem?.badge}</span>
              </div>

              {/* Title */}
              <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                {currentItem?.title}
              </h3>

              {/* Description */}
              <p className="text-white/90 mb-4 text-sm lg:text-base">
                {currentItem?.description}
              </p>

              {/* Stats/Price */}
              <div className="flex items-center space-x-4 mb-4">
                {currentItem?.type === 'product' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-white">
                        {formatPrice(currentItem?.price)}
                      </span>
                      {currentItem?.originalPrice && (
                        <span className="text-white/60 line-through">
                          {formatPrice(currentItem?.originalPrice)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-white/80">
                      <Icon name="Store" size={14} />
                      <span className="text-sm">{currentItem?.businessName}</span>
                    </div>
                  </>
                )}

                {currentItem?.type === 'business' && currentItem?.stats && (
                  <div className="flex items-center space-x-4 text-white/80 text-sm">
                    <div className="flex items-center space-x-1">
                      <Icon name="Package" size={14} />
                      <span>{currentItem?.stats?.products} productos</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="Star" size={14} />
                      <span>{currentItem?.stats?.rating}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="Users" size={14} />
                      <span>{currentItem?.stats?.followers}</span>
                    </div>
                  </div>
                )}

                {currentItem?.type === 'category' && currentItem?.stats && (
                  <div className="flex items-center space-x-4 text-white/80 text-sm">
                    <div className="flex items-center space-x-1">
                      <Icon name="Package" size={14} />
                      <span>{currentItem?.stats?.products} productos</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="Percent" size={14} />
                      <span>Hasta {currentItem?.stats?.discount} descuento</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <Button
                variant="secondary"
                size="lg"
                iconName={currentItem?.type === 'product' ? 'ShoppingCart' : 'ArrowRight'}
                iconPosition="right"
                asChild
              >
                <Link to={
                  currentItem?.type === 'product' 
                    ? `/product/${currentItem?.id}`
                    : currentItem?.type === 'business'
                    ? `/business-profile/${currentItem?.id}`
                    : `/category/${currentItem?.id}`
                }>
                  {currentItem?.type === 'product' ? 'Ver producto' : 'Explorar'}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {featuredItems?.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentSlide
                  ? 'bg-white w-6' :'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      </div>
      {/* Quick Navigation */}
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {featuredItems?.map((item, index) => (
            <button
              key={item?.id}
              onClick={() => handleSlideChange(index)}
              className={`flex items-center space-x-2 p-2 rounded-lg text-left transition-colors ${
                index === currentSlide
                  ? 'bg-primary/10 text-primary' :'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={item?.image}
                  alt={item?.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{item?.title}</div>
                <div className="text-xs opacity-75 truncate">{item?.businessName || item?.badge}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedSection;