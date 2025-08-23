import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import Input from './Input';

const Header = () => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userPoints] = useState(2847);
  const location = useLocation();

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    console.log('Search query:', searchQuery);
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-elevation-1">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Logo */}
        <Link to="/video-feed-dashboard" className="flex items-center space-x-3 flex-shrink-0">
          <img 
            src="/assets/images/image-1755367785072.png" 
            alt="Radeisan" 
            className="h-8 w-auto"
          />
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
          {/* Points Balance */}
          <div className="hidden sm:flex items-center space-x-2 bg-accent/10 px-3 py-1.5 rounded-full">
            <Icon name="Star" size={16} color="var(--color-accent)" />
            <span className="font-mono text-sm font-medium text-accent">
              {userPoints?.toLocaleString()}
            </span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Icon name="Bell" size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
          </Button>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleUserMenu}
              className="rounded-full"
            >
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <Icon name="User" size={16} color="white" />
              </div>
            </Button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-elevation-2 z-50">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                        <Icon name="User" size={20} color="white" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Usuario</p>
                        <p className="text-sm text-muted-foreground">usuario@ejemplo.com</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Puntos:</span>
                      <div className="flex items-center space-x-1">
                        <Icon name="Star" size={14} color="var(--color-accent)" />
                        <span className="font-mono text-sm font-medium text-accent">
                          {userPoints?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <Link
                      to="/user-profile-settings"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Icon name="Settings" size={16} />
                      <span>Configuración</span>
                    </Link>
                    <Link
                      to="/business-profile-management"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Icon name="Building2" size={16} />
                      <span>Perfil de Negocio</span>
                    </Link>
                    <button className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors w-full text-left">
                      <Icon name="HelpCircle" size={16} />
                      <span>Ayuda</span>
                    </button>
                    <div className="border-t border-border mt-2 pt-2">
                      <button className="flex items-center space-x-3 px-4 py-2 text-sm text-error hover:bg-muted transition-colors w-full text-left">
                        <Icon name="LogOut" size={16} />
                        <span>Cerrar Sesión</span>
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