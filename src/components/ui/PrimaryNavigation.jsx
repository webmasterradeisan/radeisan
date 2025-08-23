import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';

const PrimaryNavigation = () => {
  const location = useLocation();

  const navigationItems = [
    {
      label: 'Inicio',
      path: '/video-feed-dashboard',
      icon: 'Home',
      tooltip: 'Feed de videos y contenido'
    },
    {
      label: 'Crear',
      path: '/video-upload-studio',
      icon: 'Video',
      tooltip: 'Subir y gestionar videos'
    },
    {
      label: 'Tienda',
      path: '/business-marketplace',
      icon: 'ShoppingBag',
      tooltip: 'Marketplace y productos'
    },
    {
      label: 'Recompensas',
      path: '/points-rewards-store',
      icon: 'Gift',
      tooltip: 'Canjear puntos y recompensas'
    },
    {
      label: 'Perfil',
      path: '/user-profile-settings',
      icon: 'User',
      tooltip: 'Configuración de perfil'
    }
  ];

  const isActive = (path) => {
    return location?.pathname === path;
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-elevation-2 lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navigationItems?.map((item) => (
            <Link
              key={item?.path}
              to={item?.path}
              className={`flex flex-col items-center justify-center space-y-1 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive(item?.path)
                  ? 'text-primary bg-primary/10' :'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={item?.tooltip}
            >
              <Icon 
                name={item?.icon} 
                size={20} 
                color={isActive(item?.path) ? 'var(--color-primary)' : 'currentColor'} 
              />
              <span className="text-xs font-caption font-medium truncate">
                {item?.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
      {/* Desktop Horizontal Navigation */}
      <nav className="hidden lg:block fixed top-16 left-0 right-0 z-30 bg-card border-b border-border">
        <div className="flex items-center justify-center h-14 px-6">
          <div className="flex items-center space-x-8">
            {navigationItems?.map((item) => (
              <Link
                key={item?.path}
                to={item?.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive(item?.path)
                    ? 'text-primary bg-primary/10 font-medium' :'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title={item?.tooltip}
              >
                <Icon 
                  name={item?.icon} 
                  size={18} 
                  color={isActive(item?.path) ? 'var(--color-primary)' : 'currentColor'} 
                />
                <span className="font-body font-medium">
                  {item?.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
};

export default PrimaryNavigation;