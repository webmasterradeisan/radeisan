// src/components/ui/MobileLayout.jsx
// Layout wrapper que maneja la navegación móvil automáticamente

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BottomNavigation from './BottomNavigation';

const MobileLayout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

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
  // RUTAS QUE NO NECESITAN BOTTOM NAVIGATION
  // ===============================

  const routesWithoutBottomNav = [
    '/login',
    '/register',
    '/auth/callback',
    '/debug',
    '/',
    '/about',
    '/features',
    '/terms',
    '/privacy'
  ];

  // Rutas fullscreen que necesitan tratamiento especial
  const fullscreenRoutes = [
    '/reels',
    '/reel'
  ];

  const shouldShowBottomNav = () => {
    // No mostrar en desktop
    if (!isMobile) return false;
    
    // No mostrar en rutas públicas
    if (routesWithoutBottomNav.includes(location.pathname)) return false;
    
    // No mostrar si la ruta comienza con alguna de las rutas sin nav
    if (routesWithoutBottomNav.some(route => location.pathname.startsWith(route))) return false;
    
    return true;
  };

  const isFullscreenRoute = () => {
    return fullscreenRoutes.some(route => location.pathname.startsWith(route));
  };

  // ===============================
  // CLASES DE CONTENEDOR
  // ===============================

  const getContainerClasses = () => {
    let classes = '';
    
    if (isMobile) {
      if (isFullscreenRoute()) {
        // Rutas fullscreen (reels) ocupan toda la pantalla
        classes = 'min-h-screen';
      } else if (shouldShowBottomNav()) {
        // Rutas normales con bottom navigation - agregar padding bottom
        classes = 'min-h-screen pb-20';
      } else {
        // Rutas móviles sin bottom navigation
        classes = 'min-h-screen';
      }
    } else {
      // Desktop - sin cambios
      classes = 'min-h-screen';
    }
    
    return classes;
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  return (
    <div className="relative">
      {/* CONTENIDO PRINCIPAL */}
      <div className={getContainerClasses()}>
        {children}
      </div>

      {/* BOTTOM NAVIGATION - Solo en móvil y rutas apropiadas */}
      {shouldShowBottomNav() && <BottomNavigation />}
    </div>
  );
};

// ===============================
// HOC PARA INTEGRACIÓN FÁCIL
// ===============================

// Higher Order Component para aplicar el layout automáticamente
export const withMobileLayout = (Component) => {
  const WrappedComponent = (props) => (
    <MobileLayout>
      <Component {...props} />
    </MobileLayout>
  );
  
  WrappedComponent.displayName = `withMobileLayout(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// ===============================
// COMPONENTE PROTECTED ROUTE ACTUALIZADO
// ===============================

export const MobileProtectedRoute = ({ children, requireAuth = true }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    // Redirigir a login - esto debería usar Navigate de react-router
    window.location.href = '/login';
    return null;
  }

  return (
    <MobileLayout>
      {children}
    </MobileLayout>
  );
};

// ===============================
// COMPONENTE PUBLIC ROUTE ACTUALIZADO  
// ===============================

export const MobilePublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Redirigir a dashboard si ya está autenticado
    window.location.href = '/dashboard';
    return null;
  }

  return (
    <MobileLayout>
      {children}
    </MobileLayout>
  );
};

// ===============================
// COMPONENTE UNIVERSAL ROUTE ACTUALIZADO
// ===============================

export const MobileUniversalRoute = ({ children }) => {
  return (
    <MobileLayout>
      {children}
    </MobileLayout>
  );
};

export default MobileLayout;
