// src/components/MobileBottomNavigation.jsx
// Menú de navegación inferior para móviles (como en la imagen)

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Video, ShoppingBag, Gift, User } from 'lucide-react';

const MobileBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: Home,
      path: '/',
      activeColor: 'text-red-500',
      inactiveColor: 'text-gray-500'
    },
    {
      id: 'crear',
      label: 'Crear',
      icon: Video,
      path: '/crear',
      activeColor: 'text-red-500',
      inactiveColor: 'text-gray-500'
    },
    {
      id: 'tienda',
      label: 'Tienda',
      icon: ShoppingBag,
      path: '/tienda',
      activeColor: 'text-red-500',
      inactiveColor: 'text-gray-500'
    },
    {
      id: 'recompensas',
      label: 'Recompensas',
      icon: Gift,
      path: '/recompensas',
      activeColor: 'text-red-500',
      inactiveColor: 'text-gray-500'
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: User,
      path: '/perfil',
      activeColor: 'text-red-500',
      inactiveColor: 'text-gray-500'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className="flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors"
            >
              <Icon 
                size={24} 
                className={active ? item.activeColor : item.inactiveColor}
                strokeWidth={active ? 2.5 : 2}
              />
              <span 
                className={`text-xs font-medium ${
                  active ? item.activeColor : item.inactiveColor
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNavigation;
