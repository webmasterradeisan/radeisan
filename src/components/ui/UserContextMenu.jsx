import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import PointsBalanceIndicator from './PointsBalanceIndicator';

const UserContextMenu = ({ 
  user = {
    name: 'Usuario',
    email: 'usuario@ejemplo.com',
    avatar: null,
    points: 2847,
    isBusinessAccount: false
  },
  onLogout,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef?.current && !menuRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event?.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = (callback) => {
    setIsOpen(false);
    if (callback) callback();
  };

  const handleLogout = () => {
    handleMenuItemClick(() => {
      if (onLogout) {
        onLogout();
      } else {
        // Default logout behavior
        localStorage.removeItem('authToken');
        navigate('/login');
      }
    });
  };

  const menuItems = [
    {
      label: 'Mi Perfil',
      path: '/user-profile-settings',
      icon: 'User',
      description: 'Configuración personal'
    },
    ...(user?.isBusinessAccount ? [{
      label: 'Gestión de Negocio',
      path: '/business-profile-management',
      icon: 'Building2',
      description: 'Administrar productos y ventas'
    }] : [{
      label: 'Crear Negocio',
      path: '/business-profile-management',
      icon: 'Plus',
      description: 'Comenzar a vender productos'
    }]),
    {
      label: 'Mis Videos',
      path: '/video-upload-studio',
      icon: 'Video',
      description: 'Gestionar contenido subido'
    },
    {
      label: 'Historial de Recompensas',
      path: '/points-rewards-store',
      icon: 'History',
      description: 'Ver canjes anteriores'
    }
  ];

  const supportItems = [
    {
      label: 'Centro de Ayuda',
      icon: 'HelpCircle',
      action: () => window.open('/help', '_blank')
    },
    {
      label: 'Reportar Problema',
      icon: 'Flag',
      action: () => window.open('/report', '_blank')
    },
    {
      label: 'Términos y Privacidad',
      icon: 'FileText',
      action: () => window.open('/terms', '_blank')
    }
  ];

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* User Avatar Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMenu}
        className="rounded-full p-1 hover:bg-muted"
        aria-label="Menú de usuario"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
          {user?.avatar ? (
            <img 
              src={user?.avatar} 
              alt={user?.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <Icon name="User" size={16} color="white" />
        </div>
      </Button>
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-elevation-3 z-50 animate-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                {user?.avatar ? (
                  <img 
                    src={user?.avatar} 
                    alt={user?.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <Icon name="User" size={20} color="white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                {user?.isBusinessAccount && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Icon name="Building2" size={12} color="var(--color-accent)" />
                    <span className="text-xs text-accent font-medium">Cuenta Business</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Points Balance */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Puntos disponibles:</span>
              <PointsBalanceIndicator points={user?.points} size="sm" />
            </div>
          </div>
          
          {/* Main Menu Items */}
          <div className="py-2">
            {menuItems?.map((item, index) => (
              <Link
                key={index}
                to={item?.path}
                className="flex items-center space-x-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors group"
                onClick={() => handleMenuItemClick()}
              >
                <Icon 
                  name={item?.icon} 
                  size={16} 
                  className="text-muted-foreground group-hover:text-foreground transition-colors" 
                />
                <div className="flex-1">
                  <div className="font-medium">{item?.label}</div>
                  <div className="text-xs text-muted-foreground">{item?.description}</div>
                </div>
                <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
              </Link>
            ))}
          </div>

          {/* Support Section */}
          <div className="border-t border-border py-2">
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Soporte
              </span>
            </div>
            {supportItems?.map((item, index) => (
              <button
                key={index}
                onClick={() => handleMenuItemClick(item?.action)}
                className="flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors w-full text-left group"
              >
                <Icon 
                  name={item?.icon} 
                  size={16} 
                  className="text-muted-foreground group-hover:text-foreground transition-colors" 
                />
                <span>{item?.label}</span>
              </button>
            ))}
          </div>

          {/* Logout Section */}
          <div className="border-t border-border py-2">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 text-sm text-error hover:bg-muted transition-colors w-full text-left group"
            >
              <Icon 
                name="LogOut" 
                size={16} 
                className="text-error" 
              />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserContextMenu;