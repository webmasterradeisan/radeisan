// src/components/ui/Header.jsx
// ============================================================================
// HEADER - Con Sistema de Puntos DUAL (Gratis y Premium)
// ============================================================================
// ✅ Muestra freePoints (Blanco) y premiumPoints (Verde).
// ✅ Ambos puntos leen y se actualizan con el contexto persistente.
// ✅ Sigue mostrando el contador de puntos animado.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { useBranding } from '../../hooks/useBranding';
import AppIcon from '../AppIcon';
import Button from './Button';

// ============================================================================
// COMPONENTE: CONTADOR DE PUNTOS ANIMADO
// ============================================================================
const AnimatedPointsCounter = ({ points, animation, colorClass }) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Sincroniza el contador con el saldo real
    setDisplayPoints(points);
  }, [points]);

  useEffect(() => {
    // Si la animación de ganar puntos está activa, actualiza el contador con transición
    if (animation.show && animation.type === 'earn' && animation.pointType === colorClass) {
      setIsAnimating(true);
      
      const start = displayPoints;
      const end = points;
      const duration = 800; // 0.8 segundos de animación
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(start + (end - start) * progress);
        
        setDisplayPoints(value);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setDisplayPoints(end);
        }
      };

      requestAnimationFrame(animate);
      
      // Cleanup
      return () => {
        setIsAnimating(false);
      };
    }
  }, [points, animation, colorClass]);

  // Clase de color basada en el requisito del cliente
  let textColor = 'text-gray-400'; // Default para Free Points (Blanco/Gris claro)
  if (colorClass === 'premium') {
    textColor = 'text-green-500'; // Verde para Premium
  }

  return (
    <div className={`flex items-center gap-1 font-bold transition-all duration-300 ${isAnimating ? 'scale-105' : 'scale-100'}`}>
      <AppIcon name="Zap" size={18} className={textColor} />
      <span className={`text-sm ${textColor}`}>
        {displayPoints.toLocaleString()}
      </span>
    </div>
  );
};


// ============================================================================
// COMPONENTE PRINCIPAL: HEADER
// ============================================================================
const Header = () => {
  const { user, profile } = useAuth();
  const { freePoints, premiumPoints, pointsAnimation } = usePoints();
  const { branding } = useBranding();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef(null);

  // Cierra el menú en navegación
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Manejo de clicks fuera del menú
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [headerRef]);
  
  // ============================================================================
  // LÓGICA DE NOTIFICACIÓN FLOTANTE (PUNTOS GANADOS)
  // ============================================================================
  const FloatingNotification = () => {
    if (!pointsAnimation.show) return null;

    const baseClasses = "fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-lg transition-all duration-300 transform flex items-center gap-3";
    
    // Asigna color y mensaje basado en el tipo de punto de la animación
    let notifClasses = pointsAnimation.pointType === 'premium' 
        ? 'bg-green-600 text-white animate-slide-in-fade' 
        : 'bg-white text-gray-800 border border-gray-200 animate-slide-in-fade';
        
    const iconName = pointsAnimation.type === 'earn' ? 'CheckCircle' : 'ArrowDownCircle';
    const message = pointsAnimation.type === 'earn' 
        ? `¡Ganaste ${pointsAnimation.amount} ${pointsAnimation.pointType === 'free' ? 'Gratis' : 'Premium'}!`
        : `Gastaste ${pointsAnimation.amount} ${pointsAnimation.pointType === 'free' ? 'Gratis' : 'Premium'}.`;

    return (
      <div className={`${baseClasses} ${notifClasses}`}>
        <AppIcon name={iconName} size={24} />
        <span className="font-semibold text-sm">{message}</span>
      </div>
    );
  };
  

  return (
    <>
      <FloatingNotification />
      <header 
        ref={headerRef}
        className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="container px-4 md:px-6">
          <div className="flex h-14 items-center justify-between">
            {/* ============= LOGO / BRANDING ============= */}
            <Link to="/" className="flex items-center space-x-2">
              <AppIcon name="Zap" size={24} className="text-primary" />
              <span className="font-bold text-lg hidden sm:block">
                {branding.appName}
              </span>
            </Link>

            {/* ============= BUSCADOR (Oculto en móvil por ahora) ============= */}
            <div className="flex-1 max-w-xs mx-4 hidden md:block">
              {/* Aquí iría tu componente de búsqueda */}
            </div>

            {/* ============= ACCIONES DE USUARIO ============= */}
            <div className="flex items-center space-x-4">
              {user ? (
                // ============= USUARIO AUTENTICADO =============
                <>
                  {/* === ZONA DE PUNTOS DUAL === */}
                  <div className="flex items-center space-x-3 pr-2 border-r border-border/80">
                    {/* Puntos Premium (Verde) */}
                    <AnimatedPointsCounter 
                      points={premiumPoints} 
                      animation={pointsAnimation}
                      colorClass="premium"
                    />
                    {/* Puntos Gratis (Blanco/Gris) */}
                    <AnimatedPointsCounter 
                      points={freePoints} 
                      animation={pointsAnimation}
                      colorClass="free"
                    />
                    {/* Botón de Comprar Puntos */}
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => navigate('/points/buy')}
                        title="Comprar Puntos Premium"
                    >
                        <AppIcon name="PlusCircle" size={20} className="text-green-500 hover:text-green-400" />
                    </Button>
                  </div>
                  {/* === FIN ZONA DE PUNTOS DUAL === */}

                  {/* Icono de Misiones Diarias (Placeholder) */}
                  <Button size="icon" variant="ghost" title="Misiones Diarias">
                      <AppIcon name="Target" size={20} className="text-muted-foreground hover:text-primary" />
                  </Button>
                  
                  {/* Menú y Perfil */}
                  <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors"
                    >
                      <img
                        src={profile?.avatar_url || profile?.avatar || 'ruta/default/avatar.jpg'}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover border border-primary/50"
                      />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl z-50">
                        <div className="p-1">
                          <Link
                            to={`/profile/${profile?.username || user.id}`}
                            className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <AppIcon name="User" size={16} className="mr-2" />
                            Mi Perfil
                          </Link>
                          <Link
                            to="/settings"
                            className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <AppIcon name="Settings" size={16} className="mr-2" />
                            Configuración
                          </Link>
                          <div className="my-1 border-t border-border/80"></div>
                          <button
                            onClick={() => {
                              navigate('/logout');
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <AppIcon name="LogOut" size={16} className="mr-2" />
                            Cerrar Sesión
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // ============= USUARIO NO AUTENTICADO =============
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    Iniciar Sesión
                  </Link>
                  <Button size="sm" asChild>
                    <Link to="/register">
                      Registrarse
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===============================
          CSS PARA ANIMACIONES
          =============================== */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        /* Ajustada la duración para la animación de notificación */
        .animate-slide-in-fade {
          animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s;
        }
      `}</style>
    </>
  );
};

export default Header;
