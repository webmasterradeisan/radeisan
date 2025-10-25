// src/components/ui/Header.jsx
// ACTUALIZADO: Con Panel Admin integrado
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppIcon from '../AppIcon';
import Button from './Button';

const Header = () => {
  const { user, signOut, loading } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // Close menu when clicking outside
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

  // Close menu on route change
  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [location.pathname]);

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

  // ✅ NUEVA FUNCIÓN: Navegar al dashboard con orientación específica
  const handleOrientationNavigate = (orientation) => {
    navigate('/dashboard', { 
      state: { orientation } 
    });
  };

  // ✅ NUEVA FUNCIÓN: Navegar al inicio (dashboard sin filtros)
  const handleHomeNavigate = () => {
    navigate('/dashboard', { 
      replace: true,
      state: { orientation: 'all' } 
    });
  };

  // ✅ FUNCIÓN AUXILIAR: Verificar si estamos en dashboard con orientación activa
  const isOrientationActive = (orientation) => {
    return location.pathname === '/dashboard' && location.state?.orientation === orientation;
  };

  const Icon = ({ name, size = 20, color = "currentColor", className = "" }) => {
    return <AppIcon name={name} size={size} color={color} className={className} />;
  };

  // ⭐ NUEVO: Log para verificar datos del usuario (quitar en producción)
  console.log('Header - User Data:', {
    email: user?.email,
    role: user?.role,
    isAdmin: user?.isAdmin,
    admin_role: user?.admin_role
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
              <Icon name="Video" size={20} color="white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Radeisan
            </span>
          </Link>

          {/* NAVEGACIÓN CENTRAL (SOLO USUARIOS AUTENTICADOS) */}
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

              {/* ✅ ACTUALIZADO: Reels ahora navega al dashboard con orientación vertical */}
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

              {/* ✅ ACTUALIZADO: Videos ahora navega al dashboard con orientación horizontal */}
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

              <Link
                to="/profile"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/profile' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                }`}
              >
                <Icon name="User" size={18} />
                <span>Perfil</span>
              </Link>

              {/* ⭐ NUEVO: PANEL ADMIN - Solo para administradores */}
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

          {/* SECCIÓN DERECHA */}
          <div className="flex items-center space-x-4">
            
            {user ? (
              <>
                {/* Balance de Puntos */}
                <div className="hidden lg:flex items-center space-x-2 bg-accent/10 px-3 py-1.5 rounded-full">
                  <Icon name="Star" size={16} color="var(--color-accent)" />
                  <span className="font-mono text-sm font-medium text-accent">
                    {user.points?.toLocaleString() || '0'}
                  </span>
                </div>

                {/* Botón de Subir Contenido */}
                <Button size="sm" asChild className="hidden md:flex">
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
                    <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
                      <div className="py-1">
                        {/* Información del Usuario */}
                        <div className="px-4 py-2 border-b border-border">
                          <div className="text-sm font-medium text-popover-foreground truncate">
                            {user.name || 'Usuario'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                          {/* ⭐ NUEVO: Badge mostrando el rol de admin */}
                          {user.isAdmin && (
                            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
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

                        {/* ⭐ NUEVO: PANEL ADMIN en el menú - Solo para administradores */}
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
  );
};

export default Header;
