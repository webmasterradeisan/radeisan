// src/components/ui/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { useNotification } from '../../contexts/NotificationContext'; // ✅ Importamos el contexto de notificaciones
import Icon from '../AppIcon';
import Button from './Button';
import PointsBalanceIndicator from './PointsBalanceIndicator';

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { totalPoints, freePoints, premiumPoints, loading: pointsLoading } = usePoints();
  
  // ✅ Consumimos el contexto de notificaciones
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    loading: notificationsLoading 
  } = useNotification();

  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Detectar scroll para cambiar estilo del header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && 
          !event.target.closest('button[aria-label="Menu"]')) {
        setIsMobileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target) &&
          !event.target.closest('button[aria-label="Notificaciones"]')) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsNotificationsOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const mainNavItems = [
    { name: 'Inicio', path: '/dashboard', icon: 'Home' },
    { name: 'Reels', path: '/reels', icon: 'Smartphone' },
    { name: 'Videos', path: '/explore', icon: 'Monitor' },
    { name: 'Recompensas', path: '/rewards', icon: 'Gift' },
    { name: 'Tienda', path: '/shop', icon: 'ShoppingBag' }, // ✅ AGREGADO: Tienda (ShoppingBag)
  ];

  // Si es admin, agregamos el link al panel
  if (isAdmin) {
    mainNavItems.push({ name: 'Admin', path: '/admin', icon: 'Shield' });
  }

  const userMenuItems = [
    { name: 'Mi Perfil', path: '/profile', icon: 'User' },
    { name: 'Subir Video', path: '/upload', icon: 'Upload' },
    { name: 'Configuración', path: '/settings', icon: 'Settings' },
  ];

  if (isAdmin) {
    userMenuItems.splice(2, 0, { name: 'Panel Admin', path: '/admin', icon: 'LayoutDashboard' });
  }

  const handleNotificationClick = async (notification) => {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Cerrar el menú
    setIsNotificationsOpen(false);
    
    // Navegación inteligente según el tipo
    if (notification.data?.url) {
        navigate(notification.data.url);
    } else if (notification.type === 'like_video' || notification.type === 'comment_video') {
        navigate(`/video/${notification.data.video_id}`);
    } else if (notification.type === 'follow') {
        navigate(`/profile/${notification.data.follower_id}`);
    } else if (notification.type === 'system') {
        // Si es sistema, quizás ir a notificaciones o nada
    } else if (notification.type === 'gift_received') {
        navigate('/rewards'); // O al historial de puntos
    }
  };

  return (
    <header 
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b
        ${scrolled ? 'bg-background/95 backdrop-blur-md border-border shadow-sm py-2' : 'bg-background border-transparent py-3'}
      `}
    >
      <div className="max-w-[1800px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">R</span>
          </div>
          <span className="font-heading font-bold text-xl hidden sm:block">Radeisan</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                <Icon name={item.icon} size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          
          {user ? (
            <>
              {/* Points Indicator (Desktop) */}
              <div className="hidden lg:block mr-2">
                <PointsBalanceIndicator 
                  points={totalPoints} // Usamos totalPoints para retrocompatibilidad visual
                  showAnimation={true}
                  variant="minimal"
                />
              </div>

              {/* Mobile Points (Simplified) */}
              <div className="lg:hidden mr-1">
                 <div className="flex flex-col items-end leading-none">
                    <span className="text-xs font-bold text-orange-500 flex items-center">
                        <Icon name="Star" size={10} className="mr-0.5 fill-current" />
                        {freePoints?.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-green-600 flex items-center">
                         <Icon name="Award" size={10} className="mr-0.5" />
                         {premiumPoints?.toLocaleString()}
                    </span>
                 </div>
              </div>

              {/* Botón Comprar Puntos */}
              <Link to="/purchase-points" className="hidden sm:flex">
                  <Button variant="success" size="sm" className="h-8 text-xs font-bold shadow-sm">
                      Comprar Puntos
                  </Button>
              </Link>

              {/* Botón Subir (Mobile/Tablet) */}
              <Link to="/upload" className="md:hidden">
                 <Button size="sm" variant="danger" className="h-8 w-8 p-0 rounded-full">
                    <Icon name="Plus" size={18} />
                 </Button>
              </Link>

              <Link to="/upload" className="hidden md:flex">
                 <Button size="sm" variant="danger" className="h-8">
                    <Icon name="Plus" size={16} className="mr-1.5" />
                    Subir
                 </Button>
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
                  aria-label="Notificaciones"
                >
                  <Icon name="Bell" size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
                  )}
                </button>

                {isNotificationsOpen && (
                  <div 
                    ref={notificationsRef}
                    className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                  >
                    <div className="p-3 border-b border-border flex justify-between items-center bg-muted/30">
                      <h3 className="font-semibold text-sm">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:underline"
                        >
                          Marcar todo leídos
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notificationsLoading ? (
                         <div className="p-8 text-center text-muted-foreground text-sm">
                             <Icon name="Loader" className="animate-spin mx-auto mb-2" />
                             Cargando...
                         </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Icon name="BellOff" size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No tienes notificaciones nuevas</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {notifications.map((notification) => (
                            <div 
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`
                                p-3 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3
                                ${!notification.is_read ? 'bg-primary/5' : ''}
                              `}
                            >
                              <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                ${notification.type === 'gift_received' ? 'bg-yellow-100 text-yellow-600' : 
                                  notification.type === 'system' ? 'bg-blue-100 text-blue-600' :
                                  notification.type === 'like_video' ? 'bg-red-100 text-red-600' :
                                  'bg-gray-100 text-gray-600'}
                              `}>
                                <Icon 
                                    name={
                                        notification.type === 'gift_received' ? 'Gift' :
                                        notification.type === 'like_video' ? 'Heart' :
                                        notification.type === 'comment_video' ? 'MessageCircle' :
                                        notification.type === 'follow' ? 'UserPlus' :
                                        'Bell'
                                    } 
                                    size={16} 
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground line-clamp-2">
                                  {notification.content || notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(notification.created_at).toLocaleDateString()} • {new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link 
                        to="/notifications" 
                        onClick={() => setIsNotificationsOpen(false)}
                        className="block p-2 text-center text-xs font-medium text-muted-foreground hover:text-primary bg-muted/30 border-t border-border"
                    >
                        Ver todas las notificaciones
                    </Link>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <img
                    src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-3 border-b border-border bg-muted/30">
                      <p className="font-medium text-sm truncate">
                        {user.user_metadata?.full_name || 'Usuario'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="p-1">
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-muted transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Icon name={item.icon} size={16} />
                          {item.name}
                        </Link>
                      ))}
                      <div className="h-px bg-border my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Icon name="LogOut" size={16} />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">Iniciar Sesión</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Registrarse</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            <Icon name={isMobileMenuOpen ? 'X' : 'Menu'} size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="md:hidden absolute top-14 left-0 right-0 bg-background border-b border-border shadow-xl animate-in slide-in-from-top-5 duration-200"
        >
          <nav className="p-4 space-y-1">
            {mainNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon name={item.icon} size={20} />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Mobile Balance Display in Menu */}
            {user && (
                <div className="mt-4 pt-4 border-t border-border px-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Mis Puntos</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted p-2 rounded-lg text-center">
                            <Icon name="Star" className="mx-auto mb-1 text-orange-500" size={16} />
                            <span className="text-sm font-bold">{freePoints?.toLocaleString()}</span>
                        </div>
                        <div className="bg-muted p-2 rounded-lg text-center">
                            <Icon name="Award" className="mx-auto mb-1 text-green-600" size={16} />
                            <span className="text-sm font-bold">{premiumPoints?.toLocaleString()}</span>
                        </div>
                    </div>
                    <Link 
                        to="/purchase-points" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block mt-3"
                    >
                        <Button variant="success" fullWidth size="sm">Comprar Puntos</Button>
                    </Link>
                </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
