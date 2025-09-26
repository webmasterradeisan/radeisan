// src/components/ui/BottomNavigation.jsx
// Navegación inferior para móvil tipo YouTube

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // ===============================
  // DETECCIÓN DE DISPOSITIVO MÓVIL
  // ===============================

  useEffect(() => {
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth <= 768;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(isMobileWidth || (isMobileUserAgent && isTouchDevice));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ===============================
  // CONFIGURACIÓN DE TABS
  // ===============================

  const navigationTabs = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: 'Home',
      activeIcon: 'Home',
      path: '/dashboard',
      matchPaths: ['/', '/dashboard']
    },
    {
      id: 'reels',
      label: 'Reels',
      icon: 'Smartphone',
      activeIcon: 'Smartphone',
      path: '/reels',
      matchPaths: ['/reels', '/reel']
    },
    {
      id: 'crear',
      label: 'Crear',
      icon: 'Plus',
      activeIcon: 'Plus',
      path: '/upload',
      matchPaths: ['/upload', '/create'],
      isSpecial: true // Botón central destacado
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: 'User',
      activeIcon: 'User',
      path: '/profile',
      matchPaths: ['/profile', '/settings']
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: 'Menu',
      activeIcon: 'Menu',
      path: null, // No navega, abre menu
      matchPaths: [],
      action: () => setShowMenu(true)
    }
  ];

  // ===============================
  // OPCIONES DEL MENU DESPLEGABLE
  // ===============================

  const menuOptions = [
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: 'Store',
      path: '/marketplace',
      description: 'Descubre negocios locales'
    },
    {
      id: 'rewards',
      label: 'Recompensas',
      icon: 'Gift',
      path: '/rewards',
      description: 'Canjea tus puntos'
    },
    {
      id: 'photo-feed',
      label: 'Fotos',
      icon: 'Camera',
      path: '/photo-feed',
      description: 'Galería de fotos'
    },
    {
      id: 'favorites',
      label: 'Guardados',
      icon: 'Bookmark',
      path: '/saved',
      description: 'Contenido guardado'
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: 'Bell',
      path: '/notifications',
      description: 'Actividad reciente'
    },
    {
      id: 'analytics',
      label: 'Estadísticas',
      icon: 'BarChart3',
      path: '/analytics',
      description: 'Tu rendimiento'
    },
    {
      id: 'help',
      label: 'Ayuda',
      icon: 'HelpCircle',
      path: '/help',
      description: 'Soporte y preguntas'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'Settings',
      path: '/settings',
      description: 'Ajustes de la app'
    }
  ];

  // ===============================
  // HELPERS
  // ===============================

  const isTabActive = (tab) => {
    if (tab.matchPaths.length === 0) return false;
    return tab.matchPaths.some(path => 
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
  };

  const handleTabClick = (tab) => {
    if (tab.action) {
      tab.action();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  const handleMenuOptionClick = (option) => {
    setShowMenu(false);
    navigate(option.path);
  };

  // ===============================
  // NO MOSTRAR EN DESKTOP
  // ===============================

  if (!isMobile) {
    return null;
  }

  // ===============================
  // COMPONENTE TAB
  // ===============================

  const NavigationTab = ({ tab }) => {
    const isActive = isTabActive(tab);
    
    if (tab.isSpecial) {
      // Botón central "Crear" destacado
      return (
        <button
          onClick={() => handleTabClick(tab)}
          className="
            relative flex flex-col items-center justify-center
            -mt-2 w-14 h-14 rounded-full
            bg-primary hover:bg-primary/90
            text-primary-foreground
            shadow-lg transform transition-all duration-200
            hover:scale-105 active:scale-95
          "
        >
          <Icon name={tab.icon} size={24} />
        </button>
      );
    }

    return (
      <button
        onClick={() => handleTabClick(tab)}
        className={`
          flex flex-col items-center justify-center py-2 px-1 min-w-0 flex-1
          transition-colors duration-200
          ${isActive 
            ? 'text-primary' 
            : 'text-muted-foreground hover:text-foreground'
          }
        `}
      >
        <Icon 
          name={isActive ? tab.activeIcon : tab.icon} 
          size={20}
          className={isActive ? 'text-primary' : ''}
        />
        <span className={`
          text-xs font-medium mt-1 truncate w-full text-center leading-tight
          ${isActive ? 'text-primary' : ''}
        `}>
          {tab.label}
        </span>
      </button>
    );
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  return (
    <>
      {/* BOTTOM NAVIGATION BAR */}
      <nav className="
        fixed bottom-0 left-0 right-0 z-40
        bg-background/95 backdrop-blur-lg
        border-t border-border
        px-2 pb-2 pt-1
        safe-area-inset-bottom
      ">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navigationTabs.map((tab) => (
            <NavigationTab key={tab.id} tab={tab} />
          ))}
        </div>
      </nav>

      {/* MENU OVERLAY */}
      {showMenu && (
        <div className="
          fixed inset-0 z-50 bg-black/50 
          flex items-end justify-center
          animate-in fade-in duration-200
        ">
          {/* MENU CONTENT */}
          <div className="
            w-full max-w-md bg-background rounded-t-xl
            transform transition-all duration-300
            animate-in slide-in-from-bottom
          ">
            {/* MENU HEADER */}
            <div className="
              flex items-center justify-between 
              px-6 py-4 border-b border-border
            ">
              <h3 className="text-lg font-semibold text-foreground">
                Menu
              </h3>
              <button
                onClick={() => setShowMenu(false)}
                className="
                  w-8 h-8 rounded-full bg-muted
                  flex items-center justify-center
                  hover:bg-muted/80 transition-colors
                "
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* MENU OPTIONS */}
            <div className="px-4 py-2 max-h-[60vh] overflow-y-auto">
              {menuOptions.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => handleMenuOptionClick(option)}
                  className="
                    w-full flex items-center space-x-4 p-3 rounded-lg
                    hover:bg-muted/50 transition-colors duration-200
                    text-left group
                  "
                >
                  <div className="
                    w-10 h-10 rounded-full bg-primary/10
                    flex items-center justify-center
                    group-hover:bg-primary/20 transition-colors
                  ">
                    <Icon 
                      name={option.icon} 
                      size={20} 
                      className="text-primary"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground">
                      {option.label}
                    </h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {option.description}
                    </p>
                  </div>
                  
                  <Icon 
                    name="ChevronRight" 
                    size={16} 
                    className="text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </button>
              ))}
            </div>

            {/* MENU FOOTER */}
            <div className="px-4 py-4 border-t border-border bg-muted/20">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  RADEISAN v1.0
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu red social de contenido
                </p>
              </div>
            </div>
          </div>

          {/* CLOSE ON BACKDROP CLICK */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={() => setShowMenu(false)}
          />
        </div>
      )}

      {/* SPACER PARA EVITAR OVERLAP */}
      <div className="h-16 md:h-0" />
    </>
  );
};

export default BottomNavigation;
