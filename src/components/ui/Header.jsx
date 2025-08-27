// src/components/ui/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppIcon from '../AppIcon';
import Button from './Button';

const Header = () => {
  const { user, logout, loading } = useAuth();
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
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const Icon = ({ name, size = 20, color = "currentColor", className = "" }) => {
    return <AppIcon name={name} size={size} color={color} className={className} />;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Video" size={20} color="white" />
            </div>
            <span className="text-xl font-bold text-foreground">Radeisan</span>
          </Link>

          {/* Center Navigation - Only for authenticated users */}
          {user && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/video-feed-dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/video-feed-dashboard' 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                Inicio
              </Link>
              <Link
                to="/business-marketplace"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/business-marketplace' 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                Marketplace
              </Link>
              <Link
                to="/points-rewards-store"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/points-rewards-store' 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                Tienda
              </Link>
            </nav>
          )}

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            
            {user ? (
              // Authenticated User Section
              <>
                {/* Points Balance */}
                <div className="hidden sm:flex items-center space-x-2 bg-accent/10 px-3 py-1.5 rounded-full">
                  <Icon name="Star" size={16} color="var(--color-accent)" />
                  <span className="font-mono text-sm font-medium text-accent">
                    {user.points?.toLocaleString() || '0'}
                  </span>
                </div>

                {/* Upload Button */}
                <Button size="sm" asChild className="hidden md:flex">
                  <Link to="/video-upload-studio">
                    <Icon name="Plus" size={16} className="mr-2" />
                    Subir
                  </Link>
                </Button>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                  <Icon name="Bell" size={20} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                </Button>

                {/* User Menu */}
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
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon name="User" size={20} color="white" />
                      )}
                    </div>
                  </Button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-lg shadow-elevation-3 z-50 animate-in slide-in-from-top-2 duration-200">
                      
                      {/* User Info Header */}
                      <div className="p-4 border-b border-border">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Icon name="User" size={24} color="white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-foreground truncate">
                                {user.name || 'Usuario'}
                              </p>
                              {user.is_business_account && (
                                <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium">
                                  Business
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {user.email || ''}
                            </p>
                          </div>
                        </div>
                        
                        {/* Points Balance Mobile */}
                        <div className="mt-3 flex items-center justify-between sm:hidden">
                          <span className="text-sm text-muted-foreground">Puntos:</span>
                          <div className="flex items-center space-x-1">
                            <Icon name="Star" size={14} color="var(--color-accent)" />
                            <span className="font-mono text-sm font-medium text-accent">
                              {user.points?.toLocaleString() || '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/user-profile-settings"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Icon name="User" size={16} />
                          <span>Mi Perfil</span>
                        </Link>
                        
                        <Link
                          to="/video-upload-studio"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Icon name="Video" size={16} />
                          <span>Mis Videos</span>
                        </Link>
                        
                        {user.is_business_account ? (
                          <Link
                            to="/business-profile-management"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="Building2" size={16} />
                            <span>Gestión de Negocio</span>
                          </Link>
                        ) : (
                          <Link
                            to="/business-profile-management"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="Plus" size={16} />
                            <span>Crear Negocio</span>
                          </Link>
                        )}
                        
                        <Link
                          to="/points-rewards-store"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Icon name="Gift" size={16} />
                          <span>Tienda de Recompensas</span>
                        </Link>
                        
                        <Link
                          to="/user-profile-settings"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Icon name="Settings" size={16} />
                          <span>Configuración</span>
                        </Link>
                        
                        <button 
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors w-full text-left"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            // TODO: Open help modal or navigate to help page
                            window.open('/help', '_blank');
                          }}
                        >
                          <Icon name="HelpCircle" size={16} />
                          <span>Ayuda</span>
                        </button>
                      </div>
                      
                      {/* Logout Section */}
                      <div className="border-t border-border pt-2">
                        <button 
                          onClick={handleLogout}
                          disabled={loading}
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icon name="LogOut" size={16} />
                          <span>
                            {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Non-Authenticated User Section
              <div className="flex items-center space-x-3">
                <Button variant="ghost" asChild>
                  <Link to="/login">Iniciar Sesión</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Registrarse</Link>
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
