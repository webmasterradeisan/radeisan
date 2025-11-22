// src/components/ui/MobileLayout.jsx
// Layout wrapper que maneja la navegación móvil automáticamente

import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom'; // ✅ Importamos Navigate
import { useAuth } from '../../contexts/AuthContext';
import BottomNavigation from './BottomNavigation';
// ✅ IMPORTAR CONTEXTO PWA Y COMPONENTES NECESARIOS
import { useInstallPrompt } from '../../Routes'; // Asume que Routes exporta useInstallPrompt
import AppIcon from '../AppIcon'; // Asume que AppIcon está en components/AppIcon


// ============================================================================
// SUB-COMPONENTE: PROMPT DE INSTALACIÓN PWA
// ============================================================================
const PWAInstallPrompt = ({ deferredPrompt, setDeferredPrompt }) => {
  if (!deferredPrompt) return null;

  const handleInstallClick = async () => {
    // 1. Mostrar el prompt del navegador
    deferredPrompt.prompt();

    // 2. Esperar la elección del usuario
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA: Usuario aceptó la instalación.');
    } else {
      console.log('PWA: Usuario rechazó la instalación.');
    }
    
    // 3. Limpiar el prompt para que no se muestre de nuevo
    setDeferredPrompt(null);
  };
  
  // Puedes usar colores primarios de branding aquí si estuvieran disponibles
  const primaryColor = 'var(--color-primary, #3B82F6)'; 
  const accentColor = 'var(--color-accent, #10B981)';

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
        Instalar App (PWA)
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
  
  // ✅ CONTEXTO PWA: Obtenemos el evento deferredPrompt y la función para limpiarlo si es necesario
  // Nota: Dado que useInstallPrompt solo retorna el prompt, usaremos un estado local
  // o modificaremos el contexto en Routes.jsx para retornar el setter. 
  // Por ahora, asumiremos que useInstallPrompt devuelve el evento.
  const deferredPrompt = useInstallPrompt(); 
  
  // Para simplificar, si Routes.jsx no retorna el setter, creamos un estado local aquí
  // y lo inicializamos con el valor del contexto, para que el subcomponente pueda limpiarlo.
  const [installPrompt, setInstallPrompt] = useState(deferredPrompt);

  useEffect(() => {
    // Sincronizar el estado local si el contexto cambia (aunque en teoría solo debería ser al inicio)
    setInstallPrompt(deferredPrompt);
  }, [deferredPrompt]);


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
    '/privacy',
    '/admin' // ✅ Añadido para rutas de administración
  ];

  // Rutas fullscreen que necesitan tratamiento especial
  const fullscreenRoutes = [
    '/reels',
    '/reel',
    '/video' // ✅ Añadido para el reproductor de video
  ];

  const shouldShowBottomNav = () => {
    // No mostrar en desktop
    if (!isMobile) return false;
    
    // No mostrar en rutas públicas y administración
    if (routesWithoutBottomNav.some(route => location.pathname.startsWith(route))) return false;
    
    // No mostrar si la ruta comienza con alguna de las rutas sin nav
    if (routesWithoutBottomNav.some(route => location.pathname.startsWith(route))) return false;
    
    // No mostrar si es una ruta fullscreen
    if (isFullscreenRoute()) return false;

    return true;
  };

  const isFullscreenRoute = () => {
    // Usa un método más robusto para verificar rutas con parámetros
    return fullscreenRoutes.some(route => 
      location.pathname.startsWith(route) || (location.pathname.includes('/video/') && route === '/video')
    );
  };


  // ===============================
  // CLASES DE CONTENEDOR
  // ===============================

  const getContainerClasses = () => {
    let classes = '';
    
    if (isMobile) {
      if (isFullscreenRoute()) {
        // Rutas fullscreen (reels, video) ocupan toda la pantalla
        classes = 'min-h-screen';
      } else if (shouldShowBottomNav()) {
        // Rutas normales con bottom navigation - agregar padding bottom
        // Nota: pb-20 asume que BottomNavigation tiene unos 5rem de altura.
        classes = 'min-h-screen pb-20'; 
      } else {
        // Rutas móviles sin bottom navigation (e.g., login, admin)
        classes = 'min-h-screen';
      }
    } else {
      // Desktop - Contenido centrado o sin cambios estructurales
      classes = 'min-h-screen';
    }
    
    return classes + ' max-w-lg mx-auto bg-white shadow-lg lg:min-h-screen'; 
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
      
      {/* ✅ NUEVO: PROMPT DE INSTALACIÓN PWA */}
      {isMobile && !isFullscreenRoute() && deferredPrompt && (
        <PWAInstallPrompt 
          deferredPrompt={installPrompt} 
          setDeferredPrompt={setInstallPrompt}
        />
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
    return <Navigate to="/login" replace />; // ✅ Usar Navigate de react-router
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
    return <Navigate to="/dashboard" replace />; // ✅ Usar Navigate de react-router
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
