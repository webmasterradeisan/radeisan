// src/components/ui/Header.jsx
// ============================================================================
// HEADER - Diseño Restaurado (Basado en la imagen) con Puntos DUALES
// ============================================================================
// ✅ Diseño visual de la imagen RESTAURADO.
// ✅ Funcionalidad: Muestra freePoints (Amarillo) y premiumPoints (Verde) sincronizados.
// ✅ Notificación flotante ajustada al diseño.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { useBranding } from '../../hooks/useBranding';
import AppIcon from '../AppIcon';
import Button from './Button';

// ============================================================================
// COMPONENTE: CONTADOR DE PUNTOS ANIMADO (Acepta 'free' o 'premium' para el color)
// ============================================================================
const AnimatedPointsCounter = ({ points, animation, colorType, sizeClass = 'text-base' }) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Establecer el color basado en el tipo: Amarillo/Naranja para Gratis, Verde para Premium
  const textColor = colorType === 'free' ? 'text-orange-400' : 'text-green-600';
  const iconName = colorType === 'free' ? 'Star' : 'Zap'; // Estrella para Gratis, Zap/Rayo para Premium

  useEffect(() => {
    // Sincroniza el contador con el saldo real
    setDisplayPoints(points);
  }, [points]);

  useEffect(() => {
    if (animation.show && animation.type === 'earn' && animation.pointType === colorType) {
      setIsAnimating(true);
      
      const start = displayPoints;
      const end = points;
      const duration = 800;
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        
        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        
        setDisplayPoints(Math.round(start + (end - start) * eased));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    } else {
      setDisplayPoints(points);
    }
  }, [points, animation.show, animation.type, animation.pointType, colorType]);

  return (
    <div className={`flex items-center space-x-1 font-bold transition-transform duration-300 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
      <AppIcon name={iconName} size={16} className={textColor} />
      <span className={`${sizeClass} ${textColor}`}>
        {displayPoints.toLocaleString()}
      </span>
    </div>
  );
};

// ============================================================================
// COMPONENTE: NOTIFICACIÓN FLOTANTE DE PUNTOS (Adaptada al sistema dual)
// ============================================================================
const FloatingPointsNotification = ({ animation }) => {
  if (!animation.show) return null;

  const isEarn = animation.type === 'earn';
  const isPremium = animation.pointType === 'premium';
  
  // Clases de color basadas en el tipo de punto
  const bgClasses = isPremium 
    ? (isEarn ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-600')
    : (isEarn ? 'from-orange-400 to-yellow-500' : 'from-red-500 to-orange-600');
    
  const messageText = isPremium ? 'Puntos Premium' : 'Puntos Gratis';

  return (
    <div
      className="fixed top-20 right-4 z-[9999] pointer-events-none animate-slide-in-fade"
      style={{
        animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s'
      }}
    >
      <div
        className={`bg-gradient-to-r ${bgClasses} text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3`}
      >
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
          <AppIcon 
            name={isEarn ? 'TrendingUp' : 'TrendingDown'} 
            size={18} 
            className="text-white" 
          />
        </div>
        <div>
          <p className="font-bold text-base">
            {isEarn ? '+' : '-'}
            {animation.amount} {messageText}
          </p>
          {animation.message && (
            <p className="text-xs text-white/90">{animation.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: HEADER
// ============================================================================
const Header = () => {
  const { user, signOut, loading } = useAuth();
  // ✅ Puntos necesarios: freePoints y premiumPoints
  const { freePoints, premiumPoints, pointsAnimation, loading: pointsLoading } = usePoints(); 
  const { branding } = useBranding();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  // ============================================================================
  // FUNCIONES
  // ============================================================================

  const toggleUserMenu = () => {
    setIsUserMenuOpen(prev => !prev);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
      navigate('/', { replace: true });
    }
  };

  const handleOrientationNavigate = (orientation) => {
    navigate('/dashboard', { state: { orientation } });
  };

  const handleHomeNavigate = () => {
    navigate('/dashboard', { 
      replace: true,
      state: { orientation: 'all' } 
    });
  };

  const isOrientationActive = (orientation) => {
    return location.pathname === '/dashboard' && location.state?.orientation === orientation;
  };

  // Componente Icono simplificado
  const Icon = ({ name, size = 20, color = "currentColor", className = "" }) => {
    return <AppIcon name={name} size={size} color={color} className={className} />;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <FloatingPointsNotification animation={pointsAnimation} />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* ===============================
                LOGO (El logo de la imagen es más simple)
                =============================== */}
            <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
                {/* Usando el logo simple visto en la imagen */}
                <span 
                    className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                    style={{
                        backgroundImage: `linear-gradient(to right, #FFD700, #FFA500)` // Colores aproximados al logo de la imagen
                    }}
                >
                    {branding.texts.appName || 'Radeisan'}
                </span>
            </Link>

            {/* ===============================
                NAVEGACIÓN CENTRAL (Adaptada al estilo de la imagen)
                =============================== */}
            {user && (
              <nav className="hidden md:flex items-center space-x-4">
                {/* Elementos de Navegación de la imagen: Inicio, Reels, Videos, Tienda, Recompensas */}
                
                {/* Inicio */}
                <button 
                  onClick={handleHomeNavigate}
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                    location.pathname === '/dashboard' && (!location.state?.orientation || location.state?.orientation === 'all')
                      ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                    <Icon name="Home" size={18} />
                    <span>Inicio</span>
                </button>
                
                {/* Reels */}
                <button
                  onClick={() => handleOrientationNavigate('vertical')}
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                    isOrientationActive('vertical') ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  <Icon name="Smartphone" size={18} />
                  <span>Reels</span>
                </button>

                {/* Videos */}
                <button
                  onClick={() => handleOrientationNavigate('horizontal')}
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                    isOrientationActive('horizontal') ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  <Icon name="Monitor" size={18} />
                  <span>Videos</span>
                </button>

                {/* Tienda */}
                <Link
                  to="/marketplace"
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                    location.pathname === '/marketplace' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  <Icon name="Store" size={18} />
                  <span>Tienda</span>
                </Link>

                {/* Recompensas */}
                <Link
                  to="/rewards"
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                    location.pathname === '/rewards' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  <Icon name="Gift" size={18} />
                  <span>Recompensas</span>
                </Link>
                
                {/* PANEL ADMIN - Oculto si no es admin */}
                {user.isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    <Icon name="Shield" size={18} />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            )}

            {/* ===============================
                SECCIÓN DERECHA (PUNTOS Y BOTONES DE ACCIÓN)
                =============================== */}
            <div className="flex items-center space-x-3 md:space-x-4">
              
              {user ? (
                // ============= USUARIO AUTENTICADO =============
                <>
                  {/* ZONA DE PUNTOS GRATIS (Estrella + Saldo) */}
                  <div 
                    className="flex items-center space-x-1"
                    title={`Puntos Gratis: ${freePoints.toLocaleString()}`}
                  >
                    {pointsLoading ? (
                      <span className="text-xs text-muted-foreground animate-pulse">
                        Cargando...
                      </span>
                    ) : (
                      <AnimatedPointsCounter 
                        points={freePoints} 
                        animation={pointsAnimation}
                        colorType="free" // Amarillo/Naranja para Gratis
                        sizeClass="text-base"
                      />
                    )}
                  </div>

                  {/* Botón Comprar Puntos (Verde, con puntos Premium incluidos) */}
                  <Link 
                    to="/purchase-points"
                    // El saldo de premium se muestra *dentro* del botón de compra o justo al lado
                    className="flex items-center gap-1.5 text-white bg-green-600 px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                    title={`Puntos Premium: ${premiumPoints.toLocaleString()}`}
                  >
                    {/* El color de los puntos premium es Verde, igual al fondo del botón */}
                    {pointsLoading ? (
                      <span className="text-xs text-white/80 animate-pulse">
                        Cargando...
                      </span>
                    ) : (
                      <span className="text-base font-bold">
                        {premiumPoints.toLocaleString()}
                      </span>
                    )}
                    <Icon name="Sparkles" size={18} className="text-white" />
                    <span className='hidden md:inline'>Comprar Puntos</span>
                  </Link>


                  {/* Botón de Subir (Rojo, como en la imagen) */}
                  <Button 
                    size="sm" 
                    asChild 
                    className="bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    <Link to="/upload">
                      <Icon name="Plus" size={16} className="mr-1" />
                      Subir
                    </Link>
                  </Button>

                  {/* Notificaciones */}
                  <Button variant="ghost" size="icon" className="relative hidden sm:flex">
                    <Icon name="Bell" size={20} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </Button>

                  {/* Avatar de Usuario */}
                  <div className="relative" ref={userMenuRef}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleUserMenu}
                      className="rounded-full"
                    >
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.name || 'Avatar'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon name="User" size={18} color="white" />
                        )}
                      </div>
                    </Button>

                    {/* Dropdown Menu (Mantenemos la estructura simplificada) */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                        <div className="py-1">
                          {/* Información del Usuario */}
                          <div className="px-4 py-3 border-b border-border">
                            <div className="text-sm font-medium text-popover-foreground truncate">
                              {user.name || 'Usuario'}
                            </div>
                            
                            {/* Balance de puntos en el menú (Ambos saldos) */}
                            <div className="mt-2 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <AnimatedPointsCounter 
                                        points={freePoints} 
                                        animation={pointsAnimation}
                                        colorType="free"
                                        sizeClass="text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground">Gratis</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <AnimatedPointsCounter 
                                        points={premiumPoints} 
                                        animation={pointsAnimation}
                                        colorType="premium"
                                        sizeClass="text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground">Premium</span>
                                </div>
                            </div>
                          </div>

                          {/* Enlaces del Menú */}
                          <Link
                            to="/profile"
                            className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="User" size={16} className="mr-2" />
                            Mi Perfil
                          </Link>

                          <Link
                            to="/rewards"
                            className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="Gift" size={16} className="mr-2" />
                            Recompensas
                          </Link>

                          <div className="border-t border-border my-1"></div>

                          <Link
                            to="/settings"
                            className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="Settings" size={16} className="mr-2" />
                            Configuración
                          </Link>

                          <div className="border-t border-border my-1"></div>

                          {/* Cerrar Sesión */}
                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            disabled={loading}
                          >
                            <Icon name="LogOut" size={16} className="mr-2" />
                            {loading ? 'Cerrando...' : 'Cerrar Sesión'}
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
        
        .animate-slide-in-fade {
          animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s;
        }
      `}</style>
    </>
  );
};

export default Header;
