// src/components/ui/PrimaryNavigation.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';

const PrimaryNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Solo mostrar navegación si el usuario está autenticado
  if (!user) {
    return null;
  }

  const navigationItems = [
    {
      label: 'Inicio',
      path: '/dashboard',
      icon: 'Home',
      tooltip: 'Feed de videos y contenido principal'
    },
    {
      label: 'Crear',
      path: '/upload',
      icon: 'Video',
      tooltip: 'Subir y gestionar tu contenido'
    },
    {
      label: 'Tienda',
      path: '/marketplace',
      icon: 'ShoppingBag',
      tooltip: 'Marketplace de productos y servicios'
    },
    {
      label: 'Recompensas',
      path: '/rewards',
      icon: 'Gift',
      tooltip: 'Canjear puntos por premios exclusivos'
    },
    {
      label: 'Perfil',
      path: '/profile',
      icon: 'User',
      tooltip: 'Configuración de tu perfil'
    }
  ];

  const isActive = (path) => {
    return location?.pathname === path;
  };

  return (
    <>
      {/* ===============================
          NAVEGACIÓN MÓVIL (BOTTOM BAR)
          =============================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-elevation-2 lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navigationItems?.map((item) => (
            <Link
              key={item?.path}
              to={item?.path}
              className={`flex flex-col items-center justify-center space-y-1 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive(item?.path)
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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

      {/* ===============================
          NAVEGACIÓN DESKTOP (HORIZONTAL)
          =============================== */}
      <nav className="hidden lg:block fixed top-16 left-0 right-0 z-30 bg-card border-b border-border">
        <div className="flex items-center justify-center h-14 px-6">
          <div className="flex items-center space-x-8">
            {navigationItems?.map((item) => (
              <Link
                key={item?.path}
                to={item?.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive(item?.path)
                    ? 'text-primary bg-primary/10 font-medium' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
