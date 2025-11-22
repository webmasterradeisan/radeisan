// src/components/ui/MobileLayout.jsx
// Layout wrapper que maneja la navegación móvil automáticamente

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Navigate } from 'react-router-dom'; // ✅ Importamos Navigate
import { useAuth } from '../../contexts/AuthContext';
import BottomNavigation from './BottomNavigation';
import AppIcon from '../AppIcon'; // Componente de icono
// ✅ Importar el hook PWA desde Routes (asumimos la ruta)
import { useInstallPrompt } from '../../Routes'; 


// ============================================================================
// SUB-COMPONENTE: PROMPT DE INSTALACIÓN PWA
// ============================================================================
/**
 * Muestra el botón flotante para instalar la aplicación.
 */
const PWAInstallPrompt = () => {
  // Obtenemos el evento deferredPrompt del contexto
  const deferredPrompt = useInstallPrompt();
  
  // Si el evento ya se usó o el navegador no lo soporta, no mostrar nada
  if (!deferredPrompt) return null;

  // Utilizamos el color primario de branding si está disponible
  const accentColor = 'var(--color-accent, #10B981)';

  const handleInstallClick = async () => {
    // 1. Mostrar el prompt del navegador
    deferredPrompt.prompt();

    // 2. Esperar la elección del usuario y loguear
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA: Usuario aceptó la instalación.');
    } else {
      console.log('PWA: Usuario rechazó la instalación.');
    }
    
    // NOTA: El contexto debe actualizarse a 'null' en Routes.jsx para ocultar el botón
    // después de que el usuario interactúa.
  };

  return (
    <div 
      className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 p-3 rounded-full shadow-2xl transition-all duration-300 animate-slide-up"
      style={{ backgroundColor: accentColor }}
    >
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-4 py-2 text-white font-semibold rounded-full focus:outline-none focus:ring-4 focus:ring-white/50"
      >
        <AppIcon name="Download" className="w-5 h-5" />
        Instalar App
      </button>
    </div>
  );
};


// ============================================================================
// COMPONENTE PRINCIPAL: MOBILE LAYOUT
// ============================================================================

const MobileLayout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const deferredPrompt = useInstallPrompt(); // Para el botón PWA

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
      
      // ✅ Lógica de decisión mejorada
      // Si la pantalla es estrecha, o si el UserAgent es móvil y soporta toque
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
    '/privacy',
    '/admin' // ✅ Añadido para excluir las rutas de administración
  ];

  // Rutas fullscreen que necesitan tratamiento especial
  const fullscreenRoutes = [
    '/reels',
    '/reel',
    '/video' // ✅ Añadido: Asumimos que el reproductor de video es fullscreen
  ];
  
  const isFullscreenRoute = useCallback(() => {
    // Verifica rutas directas o rutas con parámetro (e.g., /video/123)
    return fullscreenRoutes.some(route => 
      location.pathname.startsWith(route) || (location.pathname.includes('/video/') && route === '/video')
    );
  }, [location.pathname]);


  const shouldShowBottomNav = useCallback(() => {
    // No mostrar en desktop
    if (!isMobile) return false;
    
    // No mostrar en rutas que comienzan con rutas sin nav (incluye /admin)
    if (routesWithoutBottomNav.some(route => location.pathname.startsWith(route))) return false;
    
    // No mostrar si es una ruta fullscreen
    if (isFullscreenRoute()) return false;

    return true;
  }, [isMobile, location.pathname, isFullscreenRoute]);


  // ===============================
  // CLASES DE CONTENEDOR
  // ===============================

  const getContainerClasses = () => {
    let classes = '';
    
    if (isMobile) {
      // ✅ FIX CRÍTICO: Aplicamos la restricción de ancho SOLO en móvil
      classes += ' max-w-lg mx-auto shadow-lg bg-white'; 
      
      if (isFullscreenRoute()) {
        classes += ' min-h-screen';
      } else if (shouldShowBottomNav()) {
        // Rutas normales con bottom navigation - agregar padding bottom
        classes += ' min-h-screen pb-20';
      } else {
        // Rutas móviles sin bottom navigation (e.g., login, perfil propio)
        classes += ' min-h-screen';
      }
    } else {
      // ✅ DESKTOP: Mantenemos el ancho completo para no romper el layout de 3 columnas
      classes = 'min-h-screen w-full'; 
    }
    
    // Clases base que aplican a ambos (desktop y móvil) si no están sobrescritas
    return classes + ' relative';
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================

  return (
    <div className="relative">
      {/* CONTENIDO PRINCIPAL */}
      {/* Nota: quitamos 'max-w-lg mx-auto' de aquí y lo pusimos en getContainerClasses condicionalmente */}
      <div className={getContainerClasses()}>
        {children}
      </div>

      {/* BOTTOM NAVIGATION - Solo en móvil y rutas apropiadas */}
      {shouldShowBottomNav() && <BottomNavigation />}

      {/* ✅ NUEVO: PROMPT DE INSTALACIÓN PWA */}
      {isMobile && deferredPrompt && !isFullscreenRoute() && (
        <PWAInstallPrompt />
      )}
    </div>
  );
};

// ============================================================================
// HOC Y RUTAS MODIFICADAS
// ============================================================================

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
// COMPONENTE PROTECTED ROUTE ACTUALIZADO (Usando Navigate)
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
    // ✅ CORREGIDO: Usar el componente Navigate de react-router-dom
    return <Navigate to="/login" replace />;
  }

  return (
    <MobileLayout>
      {children}
    </MobileLayout>
  );
};

// ===============================
// COMPONENTE PUBLIC ROUTE ACTUALIZADO (Usando Navigate)
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
    // ✅ CORREGIDO: Usar el componente Navigate de react-router-dom
    return <Navigate to="/dashboard" replace />;
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
