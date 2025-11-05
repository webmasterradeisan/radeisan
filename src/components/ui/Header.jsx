// src/components/ui/Header.jsx
// ============================================================================
// HEADER - Diseño ORIGINAL RESTAURADO con Menú Principal Móvil (MODAL FINAL CORREGIDO)
// ============================================================================
// ✅ Base: Copia del Header (1).jsx (Puntos duales con etiquetas).
// ✅ Solución UX FINAL: Modal a PANTALLA COMPLETA con Overlay OSCURO para TAPAR TODO el contenido.
// ✅ Logo en el encabezado del modal.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { useBranding } from '../../hooks/useBranding';
import AppIcon from '../AppIcon';
import Button from './Button';

// ============================================================================
// COMPONENTE: CONTADOR DE PUNTOS ANIMADO (Tomado de la base)
// ============================================================================
const AnimatedPointsCounter = ({ points, animation, colorType }) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Establecer el color basado en el tipo
  let textColor = '';
  if (colorType === 'premium') {
    textColor = 'text-green-600'; // Verde
  } else if (colorType === 'free') {
    textColor = 'text-orange-400'; // Amarillo/Naranja para la estrella
  } else {
    textColor = 'text-accent'; 
  }


  useEffect(() => {
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
    <span
      className={`font-mono text-base font-bold ${textColor} transition-transform duration-300 ${
        isAnimating ? 'scale-110' : 'scale-100'
      }`}
    >
      {displayPoints.toLocaleString()}
    </span>
  );
};

// ============================================================================
// COMPONENTE: NOTIFICACIÓN FLOTANTE DE PUNTOS (Tomado de la base)
// ============================================================================
const FloatingPointsNotification = ({ animation }) => {
  if (!animation.show) return null;

  const isEarn = animation.type === 'earn';
  const isPremium = animation.pointType === 'premium';

  // Clases de color para el fondo de la notificación
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
  // ✅ Estado para el modal del menú principal
  const [isMainMenuModalOpen, setIsMainMenuModalOpen] = useState(false); 
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const mainMenuModalRef = useRef(null); // Ref para el modal del menú principal


  // ============================================================================
  // EFECTOS
  // ============================================================================

  // Cerrar menús/modals al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      // ✅ Cerrar modal de menú principal al hacer click fuera
      if (isMainMenuModalOpen && mainMenuModalRef.current && !mainMenuModalRef.current.contains(event.target)) {
        // Excluir el botón de toggle del menú principal
        if (!event.target.closest('#mobile-main-menu-toggle')) {
            setIsMainMenuModalOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMainMenuModalOpen]); // Dependencia agregada para re-evaluar el cierre del modal

  // Cerrar menús/modals al cambiar de ruta
  useEffect(() => {
    setIsUserMenuOpen(false);
    // ✅ Cerrar modal del menú principal al cambiar de ruta
    setIsMainMenuModalOpen(false);
  }, [location.pathname]);

  // ============================================================================
  // FUNCIONES
  // ============================================================================

  const toggleUserMenu = () => {
    setIsUserMenuOpen(prev => !prev);
    // Cierra el menú principal si está abierto
    if (isMainMenuModalOpen) setIsMainMenuModalOpen(false);
  };
  
  // ✅ Nueva función para abrir/cerrar el modal del menú principal
  const toggleMainMenuModal = () => {
    setIsMainMenuModalOpen(prev => !prev);
    // Cierra el menú de usuario si está abierto
    if (isUserMenuOpen) setIsUserMenuOpen(false);
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
                LOGO Y BOTÓN MENÚ MÓVIL (Izquierda)
                =============================== */}
            <div className="flex items-center space-x-2">
                {/* ✅ Botón "Menú" principal - Visible solo en móvil (Texto) */}
                {user && (
                    <Button 
                        id="mobile-main-menu-toggle" 
                        variant="ghost" 
                        size="sm" 
                        onClick={toggleMainMenuModal}
                        className="md:hidden text-muted-foreground hover:text-primary"
                    >
                        <span className="text-sm font-medium">Menú</span>
                    </Button>
                )}
                
                {/* Logo original */}
                <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
                  {branding.logo.primary ? (
                    <img 
                      src={branding.logo.primary} 
                      alt={branding.texts.appName || 'Logo'} 
                      className="h-8 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  <div 
                    className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center"
                    style={{ 
                      display: branding.logo.primary ? 'none' : 'flex',
                      backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`
                    }}
                  >
                    <Icon name="Video" size={20} color="white" />
                  </div>
                  
                  {!branding.logo.primary && (
                    <span 
                      className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`
                      }}
                    >
                      {branding.texts.appName || 'Radeisan'}
                    </span>
                  )}
                </Link>
            </div>


            {/* ===============================
                NAVEGACIÓN CENTRAL (SOLO USUARIOS AUTENTICADOS - Escritorio)
                =============================== */}
            {user && (
              <nav className="hidden md:flex items-center space-x-1">
                <button
                  onClick={handleHomeNavigate}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/dashboard' && (!location.state?.orientation || location.state?.orientation === 'all')
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  <Icon name="Home" size={18} />
                  <span>Inicio</span>
                </button>

                <button
                  onClick={() => handleOrientationNavigate('vertical')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isOrientationActive('vertical')
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  <Icon name="Smartphone" size={18} />
                  <span>Reels</span>
                </button>

                <button
                  onClick={() => handleOrientationNavigate('horizontal')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isOrientationActive('horizontal')
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  <Icon name="Monitor" size={18} />
                  <span>Videos</span>
                </button>

                <Link
                  to="/marketplace"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/marketplace' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  <Icon name="Store" size={18} />
                  <span>Tienda</span>
                </Link>

                <Link
                  to="/rewards"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/rewards' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  <Icon name="Gift" size={18} />
                  <span>Recompensas</span>
                </Link>

                {/* PANEL ADMIN - Solo para administradores */}
                {user.isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                    }`}
                  >
                    <Icon name="Shield" size={18} />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            )}

            {/* ===============================
                SECCIÓN DERECHA
                =============================== */}
            <div className="flex items-center space-x-4">
              
              {user ? (
                // ============= USUARIO AUTENTICADO =============
                <>
                  {/* ZONA DE PUNTOS GRATIS (Estrella + Saldo + Label) */}
                  <div 
                    className="hidden lg:flex flex-col items-center cursor-pointer group"
                    title={`Puntos Gratis: ${freePoints.toLocaleString()}`} 
                  >
                    {/* Fila 1: Icono y Saldo */}
                    <div className="flex items-center space-x-1">
                      <Icon 
                        name="Star" 
                        size={18} 
                        className="text-orange-400" 
                      />
                      {pointsLoading ? (
                        <span className="text-sm text-muted-foreground animate-pulse">Cargando...</span>
                      ) : (
                        <AnimatedPointsCounter 
                          points={freePoints} 
                          animation={pointsAnimation}
                          colorType="free"
                        />
                      )}
                    </div>
                    {/* Fila 2: Etiqueta */}
                    <span className="text-xs text-muted-foreground font-medium mt-[-2px] whitespace-nowrap">
                      Puntos Gratis
                    </span>
                  </div>

                  {/* ZONA DE PUNTOS PREMIUM (Saldo + Label) */}
                  <div
                    className="hidden lg:flex flex-col items-center"
                    title={`Puntos Premium: ${premiumPoints.toLocaleString()}`}
                  >
                    {/* Fila 1: Saldo */}
                    <AnimatedPointsCounter 
                      points={premiumPoints}
                      animation={pointsAnimation}
                      colorType="premium" // Pasa el tipo para el color Verde
                    />
                    {/* Fila 2: Etiqueta */}
                    <span className="text-xs font-medium mt-[-2px] whitespace-nowrap text-green-600">
                      Puntos Premium
                    </span>
                  </div>
                  
                  {/* Botón Comprar Puntos (Verde, diseño de la imagen) */}
                  <Link 
                    to="/purchase-points"
                    className="hidden md:flex items-center gap-2 text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <span className='whitespace-nowrap'>Comprar Puntos</span>
                  </Link>


                  {/* Botón de Subir Contenido (Rojo, diseño de la imagen) */}
                  <Button size="sm" asChild className="hidden md:flex bg-red-500 hover:bg-red-600 transition-colors">
                    <Link to="/upload">
                      <Icon name="Plus" size={16} className="mr-2" />
                      Subir
                    </Link>
                  </Button>

                  {/* Notificaciones */}
                  <Button variant="ghost" size="icon" className="relative">
                    <Icon name="Bell" size={20} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                  </Button>

                  {/* Menú de Usuario */}
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

                    {/* Dropdown Menu */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                        <div className="py-1">
                          {/* Información del Usuario */}
                          <div className="px-4 py-3 border-b border-border">
                            <div className="text-sm font-medium text-popover-foreground truncate">
                              {user.name || 'Usuario'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                            
                            {/* Balance de puntos en el menú (Dual) */}
                            <div className="mt-2 flex flex-col gap-1">
                                {/* Puntos Gratis */}
                                <div className="flex items-center gap-2">
                                    <Icon name="Star" size={14} className="text-orange-400" />
                                    <AnimatedPointsCounter 
                                        points={freePoints} 
                                        animation={pointsAnimation}
                                        colorType="free"
                                    />
                                    <span className="text-xs text-muted-foreground">Gratis</span>
                                </div>
                                {/* Puntos Premium */}
                                <div className="flex items-center gap-2">
                                    <Icon name="Sparkles" size={14} className="text-green-600" />
                                    <AnimatedPointsCounter 
                                        points={premiumPoints} 
                                        animation={pointsAnimation}
                                        colorType="premium"
                                    />
                                    <span className="text-xs text-muted-foreground">Premium</span>
                                </div>
                            </div>
                            
                            {/* Badge de Admin */}
                            {user.isAdmin && (
                              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                <Icon name="Shield" size={12} className="mr-1" />
                                {user.role === 'super_admin' ? 'Super Admin' : 
                                 user.role === 'admin' ? 'Admin' : 'Moderador'}
                              </div>
                            )}
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

                          {user.is_business_account && (
                            <Link
                              to="/business"
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Icon name="Building" size={16} className="mr-2" />
                              Mi Negocio
                            </Link>
                          )}

                          <Link
                            to="/rewards"
                            className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="Gift" size={16} className="mr-2" />
                            Mis Recompensas
                          </Link>

                          {/* PANEL ADMIN en el menú */}
                          {user.isAdmin && (
                            <>
                              <div className="border-t border-border my-1"></div>
                              <Link
                                to="/admin"
                                className="flex items-center px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors font-medium"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                <Icon name="Shield" size={16} className="mr-2" />
                                Panel de Administración
                              </Link>
                            </>
                          )}

                          <div className="border-t border-border my-1"></div>

                          {/* Configuración */}
                          <Link
                            to="/settings"
                            className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="Settings" size={16} className="mr-2" />
                            Configuración
                          </Link>

                          <button className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                            <Icon name="HelpCircle" size={16} className="mr-2" />
                            Ayuda
                          </button>

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
        
        {/* ===============================
            ✅ MODAL DE NAVEGACIÓN PRINCIPAL MÓVIL (PANTALLA COMPLETA - SOLUCIÓN UX)
            =============================== */}
        {isMainMenuModalOpen && user && (
            <div 
                className="fixed inset-0 z-[100] md:hidden" // Z-index alto para superponer
            >
                {/* Overlay oscuro que se cierra al clickar */}
                <div 
                    className="absolute inset-0 bg-black/70" // Fondo oscuro para opacar contenido
                    onClick={toggleMainMenuModal}
                ></div>

                {/* ✅ Contenido del Modal (Panel Lateral) con fondo blanco y H-FULL (cubre toda la pantalla) */}
                <div 
                    ref={mainMenuModalRef}
                    className="absolute left-0 top-0 w-64 h-full bg-white shadow-2xl p-4 transition-transform duration-300 ease-out" // W-64 para el panel, H-FULL para cubrir
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6">
                        {/* ✅ TÍTULO REEMPLAZADO POR EL LOGO */}
                        <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
                          {branding.logo.primary ? (
                            <img 
                              src={branding.logo.primary} 
                              alt={branding.texts.appName || 'Logo'} 
                              className="h-8 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          
                          <div 
                            className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center"
                            style={{ 
                              display: branding.logo.primary ? 'none' : 'flex',
                              backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`
                            }}
                          >
                            <Icon name="Video" size={20} color="white" />
                          </div>
                          
                          {!branding.logo.primary && (
                            <span 
                              className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                              style={{
                                backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`
                              }}
                            >
                              {branding.texts.appName || 'Radeisan'}
                            </span>
                          )}
                        </Link>
                        {/* FIN LOGO */}
                        <Button variant="ghost" size="icon" onClick={toggleMainMenuModal}>
                            <Icon name="X" size={24} />
                        </Button>
                    </div>

                    <nav className="flex flex-col space-y-2">
                        {[
                            { name: 'Inicio', path: '/dashboard', icon: 'Home', orientation: 'all' },
                            { name: 'Reels', path: '/dashboard', icon: 'Smartphone', orientation: 'vertical' },
                            { name: 'Videos', path: '/dashboard', icon: 'Monitor', orientation: 'horizontal' },
                            { name: 'Tienda', path: '/marketplace', icon: 'Store' },
                            { name: 'Recompensas', path: '/rewards', icon: 'Gift' },
                        ].map((item) => {
                            const isActive = item.orientation 
                                ? isOrientationActive(item.orientation)
                                : location.pathname === item.path;
                            
                            const handleClick = () => {
                                if (item.orientation) {
                                    handleOrientationNavigate(item.orientation);
                                } else {
                                    navigate(item.path);
                                }
                                setIsMainMenuModalOpen(false);
                            };

                            return (
                                <button
                                    key={item.name}
                                    onClick={handleClick}
                                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors w-full text-left ${
                                        isActive
                                            ? 'bg-primary/10 text-primary' 
                                            : 'text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <Icon name={item.icon} size={20} />
                                    <span>{item.name}</span>
                                </button>
                            );
                        })}

                        {/* Botón de Admin (si es aplicable) */}
                        {user.isAdmin && (
                            <Link
                                to="/admin"
                                onClick={() => setIsMainMenuModalOpen(false)}
                                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors text-primary hover:bg-primary/10"
                            >
                                <Icon name="Shield" size={20} />
                                <span>Panel Admin</span>
                            </Link>
                        )}
                        
                        <div className="border-t border-border mt-4 pt-4">
                            {/* Botón Comprar Puntos Móvil en el modal */}
                            <Link 
                                to="/purchase-points"
                                onClick={() => setIsMainMenuModalOpen(false)}
                                className="flex items-center justify-center gap-2 text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium mt-2"
                            >
                                <Icon name="Sparkles" size={18} className="text-white" />
                                Comprar Puntos
                            </Link>
                        </div>

                    </nav>
                </div>
            </div>
        )}
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
