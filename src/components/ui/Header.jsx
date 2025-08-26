// src/components/ui/Header.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';
import Button from './Button';
import Input from './Input';

const Header = () => {
  const { user, isAuthenticated, signOut, loading, isDemoUser } = useAuth();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      console.log('Search query:', searchQuery);
      // TODO: Implement search functionality
      // navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSearchToggle = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded) {
      setSearchQuery('');
    }
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = async () => {
    try {
      setIsUserMenuOpen(false);
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-elevation-1">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-muted rounded"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-8 w-8 bg-muted rounded-full"></div>
          </div>
        </div>
      </header>
    );
  }

  // Show login state if not authenticated (shouldn't happen with new system, but keeping as fallback)
  if (!isAuthenticated) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-elevation-1">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <Link to="/" className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Icon name="Video" size={20} color="white" />
            </div>
            <span className="text-xl font-heading font-bold text-foreground hidden sm:block">
              Radeisan
            </span>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Registrarse</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-elevation-1">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Logo */}
        <Link to="/video-feed-dashboard" className="flex items-center space-x-3 flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Icon name="Video" size={20} color="white" />
          </div>
          <span className="text-xl font-heading font-bold text-foreground hidden sm:block">
            Radeisan
          </span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-4 lg:mx-8">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className={`flex items-center transition-all duration-300 ${
              isSearchExpanded ? 'w-full' : 'w-full lg:w-96'
            }`}>
              <Input
                type="search"
                placeholder="Buscar videos, productos, creadores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e?.target?.value)}
                className="w-full pr-12"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
              >
                <Icon name="Search" size={20} />
              </Button>
            </div>
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Points Balance with Demo indicator */}
          <div className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full ${
            isDemoUser ? 'bg-warning/10' : 'bg-accent/10'
          }`}>
            <Icon name="Star" size={16} color={isDemoUser ? "var(--color-warning)" : "var(--color-accent)"} />
            <span className={`font-mono text-sm font-medium ${
              isDemoUser ? 'text-warning' : 'text-accent'
            }`}>
              {user?.points?.toLocaleString() || '0'}
            </span>
            {isDemoUser && (
              <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-medium">
                DEMO
              </span>
            )}
          </div>

          {/* Login/Register buttons for demo user */}
          {isDemoUser && (
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Registrarse</Link>
              </Button>
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Icon name="Bell" size={20} />
            {!isDemoUser && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
            )}
          </Button>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleUserMenu}
              className={`rounded-full relative ${isDemoUser ? 'ring-2 ring-warning/50' : ''}`}
            >
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <Icon name="User" size={16} color="white" />
              </div>
              {isDemoUser && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">D</span>
                </div>
              )}
            </Button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-elevation-3 z-50">
                  {/* User Info */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center overflow-hidden relative">
                        {user?.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon name="User" size={20} color="white" />
                        )}
                        {isDemoUser && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">D</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-foreground truncate">
                            {user?.name || 'Usuario'}
                          </p>
                          {isDemoUser && (
                            <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-medium">
                              DEMO
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {user?.email || ''}
                        </p>
                        {user?.is_business_account && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Icon name="Building2" size={12} color="var(--color-accent)" />
                            <span className="text-xs text-accent font-medium">Business</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Points Balance Mobile */}
                    <div className="mt-3 flex items-center justify-between sm:hidden">
                      <span className="text-sm text-muted-foreground">Puntos:</span>
                      <div className="flex items-center space-x-1">
                        <Icon name="Star" size={14} color={isDemoUser ? "var(--color-warning)" : "var(--color-accent)"} />
                        <span className={`font-mono text-sm font-medium ${
                          isDemoUser ? 'text-warning' : 'text-accent'
                        }`}>
                          {user?.points?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </div>

                    {/* Demo user upgrade section */}
                    {isDemoUser && (
                      <div className="mt-3 p-2 bg-primary/5 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">
                          ¡Crea tu cuenta real para guardar tu progreso!
                        </p>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" asChild className="flex-1 text-xs">
                            <Link to="/login" onClick={() => setIsUserMenuOpen(false)}>
                              Iniciar Sesión
                            </Link>
                          </Button>
                          <Button size="sm" asChild className="flex-1 text-xs">
                            <Link to="/register" onClick={() => setIsUserMenuOpen(false)}>
                              Registrarse
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/user-profile-settings"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Icon name="Settings" size={16} />
                      <span>Configuración</span>
                    </Link>
                    
                    {user?.is_business_account ? (
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
                      to="/video-upload-studio"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Icon name="Video" size={16} />
                      <span>Mis Videos</span>
                    </Link>
                    
                    <Link
                      to="/points-rewards-store"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Icon name="Gift" size={16} />
                      <span>Tienda de Recompensas</span>
                    </Link>
                    
                    <button 
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors w-full text-left"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        // TODO: Open help modal or navigate to help page
                        console.log('Opening help...');
                      }}
                    >
                      <Icon name="HelpCircle" size={16} />
                      <span>Ayuda</span>
                    </button>
                    
                    {/* Demo-specific menu items */}
                    {isDemoUser && (
                      <>
                        <div className="border-t border-border mt-2 pt-2">
                          <Link
                            to="/login"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="LogIn" size={16} />
                            <span>Iniciar Sesión Real</span>
                          </Link>
                          <Link
                            to="/register"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon name="UserPlus" size={16} />
                            <span>Crear Cuenta Real</span>
                          </Link>
                        </div>
                      </>
                    )}
                    
                    {/* Logout Section */}
                    <div className="border-t border-border mt-2 pt-2">
                      <button 
                        onClick={handleLogout}
                        disabled={loading}
                        className={`flex items-center space-x-3 px-4 py-2 text-sm transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDemoUser ? 'text-warning hover:bg-warning/10' : 'text-error hover:bg-error/10'
                        }`}
                      >
                        <Icon name="LogOut" size={16} />
                        <span>
                          {loading ? 'Cerrando...' : isDemoUser ? 'Reiniciar Demo' : 'Cerrar Sesión'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
