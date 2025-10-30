// src/components/ui/Header.jsx
// ✅ Versión Final Integrada con PointsContext (100% funcional)
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { useBranding } from '../../hooks/useBranding';
import AppIcon from '../AppIcon';
import Button from './Button';

const AnimatedPointsCounter = ({ points, animation }) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (animation.show) {
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
  }, [points, animation.show]);

  return (
    <span
      className={`font-mono text-sm font-medium text-accent transition-transform ${
        isAnimating ? 'scale-110' : 'scale-100'
      }`}
    >
      {displayPoints.toLocaleString()}
    </span>
  );
};

const FloatingPointsNotification = ({ animation }) => {
  if (!animation.show) return null;
  const isEarn = animation.type === 'earn';
  return (
    <div
      className="fixed top-20 right-4 z-[9999] pointer-events-none animate-slide-in-right"
      style={{
        animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s',
      }}
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

const Header = () => {
  const { user, signOut, loading } = useAuth();
  const { points, pointsAnimation, totalPoints, loading: pointsLoading } = usePoints();
  const { branding } = useBranding();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => setIsUserMenuOpen(false), [location.pathname]);

  const toggleUserMenu = () => setIsUserMenuOpen((prev) => !prev);

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

  const isOrientationActive = (orientation) =>
    location.pathname === '/dashboard' && location.state?.orientation === orientation;

  const Icon = ({ name, size = 20, color = 'currentColor', className = '' }) => (
    <AppIcon name={name} size={size} color={color} className={className} />
  );

  return (
    <>
      <FloatingPointsNotification animation={pointsAnimation} />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={user ? '/dashboard' : '/'} className="flex items-center space-x-2">
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
                  backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`,
                }}
              >
                <Icon name="Video" size={20} color="white" />
              </div>
              {!branding.logo.primary && (
                <span
                  className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`,
                  }}
                >
                  {branding.texts.appName || 'Radeisan'}
                </span>
              )}
            </Link>

            {/* NAVEGACIÓN */}
            {user && (
              <nav className="hidden md:flex items-center space-x-1">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/dashboard' && !location.state?.orientation
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
              </nav>
            )}

            {/* SECCIÓN DERECHA */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div
                    className="hidden lg:flex items-center space-x-2 bg-accent/10 px-3 py-1.5 rounded-full hover:bg-accent/20 transition-colors cursor-pointer group"
                    title={`Total: ${totalPoints}`}
                  >
                    <Icon
                      name="Star"
                      size={16}
                      color="var(--color-accent)"
                      className="group-hover:scale-110 transition-transform"
                    />
                    {pointsLoading ? (
                      <span className="text-xs text-muted-foreground">Cargando...</span>
                    ) : (
                      <AnimatedPointsCounter points={totalPoints} animation={pointsAnimation} />
                    )}
                  </div>

                  <Button size="sm" asChild className="hidden md:flex">
                    <Link to="/upload">
                      <Icon name="Plus" size={16} className="mr-2" />
                      Subir
                    </Link>
                  </Button>

                  <Button variant="ghost" size="icon" className="relative">
                    <Icon name="Bell" size={20} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  </Button>

                  <div className="relative" ref={userMenuRef}>
                    <Button variant="ghost" size="icon" onClick={toggleUserMenu} className="rounded-full">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name || 'Avatar'} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="User" size={18} color="white" />
                        )}
                      </div>
                    </Button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
                        <div className="py-1">
                          <div className="px-4 py-2 border-b border-border">
                            <div className="text-sm font-medium truncate">{user.name || 'Usuario'}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                            <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-accent/10 rounded-md">
                              <Icon name="Star" size={14} color="var(--color-accent)" />
                              <span className="text-sm font-mono font-bold text-accent">
                                {totalPoints.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">pts</span>
                            </div>
                          </div>
                          <Link
                            to="/profile"
                            className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="User" size={16} className="mr-2" />
                            Mi Perfil
                          </Link>
                          <Link
                            to="/rewards"
                            className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="Gift" size={16} className="mr-2" />
                            Mis Recompensas
                          </Link>
                          <div className="border-t border-border my-1" />
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
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    Iniciar Sesión
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
      `}</style>
    </>
  );
};

export default Header;
