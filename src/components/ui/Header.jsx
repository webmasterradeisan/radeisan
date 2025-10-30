// src/components/ui/Header.jsx
// VERSIÓN FINAL: Diseño original + sistema de puntos sin romper nada

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { useBranding } from '../../hooks/useBranding';
import AppIcon from '../AppIcon';
import Button from './Button';

// -------------------- COMPONENTE DE CONTADOR DE PUNTOS --------------------
const AnimatedPointsCounter = ({ points, animation }) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (animation?.show) {
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
        if (progress < 1) requestAnimationFrame(animate);
        else setIsAnimating(false);
      };
      requestAnimationFrame(animate);
    } else {
      setDisplayPoints(points);
    }
  }, [points, animation]);

  return (
    <span
      className={`font-mono text-sm font-medium text-accent transition-all duration-300 ${
        isAnimating ? 'scale-110' : 'scale-100'
      }`}
    >
      {displayPoints.toLocaleString()}
    </span>
  );
};

// -------------------- NOTIFICACIÓN DE PUNTOS --------------------
const FloatingPointsNotification = ({ animation }) => {
  if (!animation?.show) return null;
  const isEarn = animation.type === 'earn';
  return (
    <div
      className="fixed top-20 right-4 z-[9999] pointer-events-none animate-slide-in-right"
      style={{ animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s' }}
    >
      <div
        className={`${
          isEarn
            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
            : 'bg-gradient-to-r from-red-500 to-orange-600'
        } text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3`}
      >
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
          <AppIcon name={isEarn ? 'TrendingUp' : 'TrendingDown'} size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-base">
            {isEarn ? '+' : '-'}
            {animation.amount} puntos
          </p>
          {animation.message && <p className="text-xs text-white/90">{animation.message}</p>}
        </div>
      </div>
    </div>
  );
};

// -------------------- HEADER PRINCIPAL --------------------
const Header = () => {
  const { user, signOut, loading } = useAuth();
  const { points, totalPoints, pointsAnimation, loading: pointsLoading, refreshPoints } = usePoints();
  const { branding } = useBranding();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (user?.id) refreshPoints(user.id);
  }, [user, refreshPoints]);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => setIsUserMenuOpen(false), [location.pathname]);

  const toggleUserMenu = () => setIsUserMenuOpen((prev) => !prev);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  const handleHomeNavigate = () => navigate('/dashboard', { replace: true, state: { orientation: 'all' } });
  const handleOrientationNavigate = (o) => navigate('/dashboard', { state: { orientation: o } });
  const isOrientationActive = (o) =>
    location.pathname === '/dashboard' && location.state?.orientation === o;

  const Icon = ({ name, size = 20, className = '' }) => (
    <AppIcon name={name} size={size} className={className} />
  );

  return (
    <>
      <FloatingPointsNotification animation={pointsAnimation} />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* LOGO */}
            <Link to={user ? '/dashboard' : '/'} className="flex items-center space-x-2">
              {branding.logo.primary ? (
                <img
                  src={branding.logo.primary}
                  alt="Logo"
                  className="h-8 object-contain"
                  onError={(e) => (e.target.style.display = 'none')}
                />
              ) : (
                <div
                  className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`,
                  }}
                >
                  <Icon name="Video" size={20} className="text-white" />
                </div>
              )}
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {branding.texts.appName || 'Radeisan'}
              </span>
            </Link>

            {/* NAV CENTRAL */}
            {user && (
              <nav className="hidden md:flex items-center space-x-1">
                <button
                  onClick={handleHomeNavigate}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm ${
                    location.pathname === '/dashboard' &&
                    (!location.state?.orientation || location.state?.orientation === 'all')
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  <Icon name="Home" size={18} />
                  <span>Inicio</span>
                </button>

                <button
                  onClick={() => handleOrientationNavigate('vertical')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm ${
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm ${
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm ${
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm ${
                    location.pathname === '/rewards'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  <Icon name="Gift" size={18} />
                  <span>Recompensas</span>
                </Link>
              </nav>
            )}

            {/* DERECHA */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* PUNTOS */}
                  <div
                    className="hidden lg:flex items-center space-x-2 bg-accent/10 px-3 py-1.5 rounded-full hover:bg-accent/20 transition-colors cursor-pointer"
                    title={`Total: ${totalPoints}`}
                  >
                    <Icon name="Star" size={16} className="text-accent" />
                    {pointsLoading ? (
                      <span className="text-xs text-muted-foreground">Cargando...</span>
                    ) : (
                      <AnimatedPointsCounter points={totalPoints} animation={pointsAnimation} />
                    )}
                  </div>

                  <Button size="sm" asChild className="hidden md:flex">
                    <Link to="/upload">
                      <Icon name="Plus" size={16} className="mr-2" /> Subir
                    </Link>
                  </Button>

                  <Button variant="ghost" size="icon">
                    <Icon name="Bell" size={20} />
                  </Button>

                  {/* USUARIO */}
                  <div className="relative" ref={userMenuRef}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleUserMenu}
                      className="rounded-full"
                    >
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-full h-full" />
                        ) : (
                          <Icon name="User" size={18} className="text-white" />
                        )}
                      </div>
                    </Button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
                        <div className="py-1">
                          <div className="px-4 py-2 border-b border-border">
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                          >
                            Cerrar sesión
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-muted-foreground hover:text-primary"
                  >
                    Iniciar sesión
                  </Link>
                  <Button size="sm" asChild>
                    <Link to="/register">Registrarse</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Animaciones CSS cerradas correctamente */}
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
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
      `}</style>
    </>
  );
};

export default Header;
