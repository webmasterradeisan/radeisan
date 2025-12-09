// src/components/ui/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { useBranding } from '../../hooks/useBranding';
import { useGiftNotifications } from '../../contexts/GiftNotificationContext'; // ✅ IMPORT
import { useShopPermissions } from '../../hooks/useShopPermissions'; // ✅ NUEVO: Para shop_manager
import AppIcon from '../AppIcon';
import Button from './Button';

// ============================================================================
// COMPONENTES INTERNOS (MANTENIDOS EXACTAMENTE IGUAL)
// ============================================================================

const AnimatedPointsCounter = ({ points, animation, colorType }) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);
  
  let textColor = 'text-accent'; // Default
  if (colorType === 'premium') textColor = 'text-green-600';
  else if (colorType === 'free') textColor = 'text-orange-400';

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
    <span className={`font-mono text-base font-bold ${textColor} transition-transform duration-300 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
      {displayPoints.toLocaleString()}
    </span>
  );
};

const FloatingPointsNotification = ({ animation }) => {
  if (!animation.show) return null;

  const isEarn = animation.type === 'earn';
  const isPremium = animation.pointType === 'premium';

  // Colores según tipo de punto
  const bgClasses = isPremium 
    ? (isEarn ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-600')
    : (isEarn ? 'from-orange-400 to-yellow-500' : 'from-red-500 to-orange-600');

  const messageText = isPremium ? 'Puntos Premium' : 'Puntos Gratis';

  return (
    <div className="fixed top-20 right-4 z-[9999] pointer-events-none animate-slide-in-fade"
         style={{ animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s' }}>
      <div className={`bg-gradient-to-r ${bgClasses} text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 border-2 border-white/20 backdrop-blur-sm`}>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
          <AppIcon name={isEarn ? 'TrendingUp' : 'TrendingDown'} size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-base">
            {isEarn ? '+' : '-'}{animation.amount} {messageText}
          </p>
          {animation.message && (
            <p className="text-xs text-white/90 font-medium">{animation.message}</p>
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
  const { freePoints, premiumPoints, pointsAnimation, loading: pointsLoading } = usePoints();
  const { branding } = useBranding();
  
  // ✅ HOOK DE NOTIFICACIONES DE REGALOS
  const { unreadGiftCount, giftNotifications, markGiftAsRead, markAllGiftsAsRead } = useGiftNotifications();
  
  // ✅ NUEVO: Hook para verificar permisos de shop_manager
  const { canManageShop, isAdmin } = useShopPermissions();
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMainMenuModalOpen, setIsMainMenuModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); // ✅ ESTADO PARA EL MENÚ DE NOTIFICACIONES
  
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null); // ✅ REF PARA EL BOTÓN DE NOTIFICACIONES
  const mainMenuModalRef = useRef(null);

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      // ✅ CERRAR NOTIFICACIONES AL CLICKEAR FUERA
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (isMainMenuModalOpen && mainMenuModalRef.current && !mainMenuModalRef.current.contains(event.target)) {
        if (!event.target.closest('#mobile-main-menu-toggle')) {
            setIsMainMenuModalOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMainMenuModalOpen]);

  // Cerrar menús al navegar
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMainMenuModalOpen(false);
    setIsNotifOpen(false); // ✅ CERRAR AL NAVEGAR
  }, [location.pathname]);

  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);
  const toggleMainMenuModal = () => setIsMainMenuModalOpen(!isMainMenuModalOpen);
  const toggleNotifMenu = () => setIsNotifOpen(!isNotifOpen); // ✅ TOGGLE NOTIFICACIONES

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleHomeNavigate = () => {
    navigate('/dashboard', { replace: true, state: { orientation: 'all' } });
  };

  const handleOrientationNavigate = (orientation) => {
    navigate('/dashboard', { 
      state: { orientation } 
    });
  };

  const isOrientationActive = (orientation) => {
    return location.pathname === '/dashboard' && location.state?.orientation === orientation;
  };

  // Helper para renderizar iconos de manera segura
  const Icon = ({ name, size = 20, color = "currentColor", className = "" }) => {
    return <AppIcon name={name} size={size} color={color} className={className} />;
  };

  // Determinar la ruta de configuración basada en el rol
  const configPath = user?.isAdmin ? '/admin/settings' : '/settings';

  return (
    <>
      <FloatingPointsNotification animation={pointsAnimation} />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* ------------------ IZQUIERDA: LOGO & MENU MOVIL ------------------ */}
            <div className="flex items-center space-x-2">
                {/* Botón Hamburguesa (Solo Móvil) */}
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

                <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
                  {/* Logo Personalizado */}
                  {branding.logo.primary ? (
                    <img 
                      src={branding.logo.primary} 
                      alt={branding.texts.appName} 
                      className="h-8 object-contain transition-opacity duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}

                  {/* Fallback Icono */}
                  <div 
                    className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center shadow-sm"
                    style={{ 
                      display: branding.logo.primary ? 'none' : 'flex',
                      backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`
                    }}
                  >
                    <Icon name="Video" size={20} color="white" />
                  </div>
                  
                  {/* Nombre App (Solo si no hay logo imagen) */}
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

            {/* ------------------ CENTRO: NAVEGACIÓN (Escritorio) ------------------ */}
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
                  to="/shop" 
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/shop'
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  <Icon name="ShoppingBag" size={18} />
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

                {/* ✅ NUEVO: Link Gestión Tienda (Shop Manager + Admin) */}
                {canManageShop() && (
                  <Link 
                    to="/shop/manage/orders" 
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/shop/manage')
                        ? 'bg-blue-500/10 text-blue-600 border border-blue-200' 
                        : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent'
                    }`}
                  >
                    <Icon name="Settings" size={18} />
                    <span>Gestionar Tienda</span>
                  </Link>
                )}

                {/* Link Admin (Solo Super Admins) */}
                {isAdmin() && (
                  <Link 
                    to="/admin" 
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-primary hover:bg-primary/5 border border-transparent'
                    }`}
                  >
                    <Icon name="Shield" size={18} />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            )}

            {/* ------------------ DERECHA: ACCIONES ------------------ */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {user ? (
                <>
                  {/* Puntos y Botones (Mostrar siempre) */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Puntos Gratis */}
                    <div className="flex flex-col items-center cursor-pointer group" title={`Puntos Gratis: ${freePoints.toLocaleString()}`}>
                    <div className="flex items-center space-x-1">
                      <Icon name="Star" size={18} className="text-orange-400 transition-transform group-hover:scale-110" />
                      {pointsLoading ? (
                        <span className="text-sm animate-pulse text-muted-foreground">...</span>
                      ) : (
                        <AnimatedPointsCounter 
                          points={freePoints} 
                          animation={pointsAnimation}
                          colorType="free"
                        />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium mt-[-2px]">Puntos Gratis</span>
                  </div>

                  {/* Puntos Premium */}
                  <div className="flex flex-col items-center" title={`Puntos Premium: ${premiumPoints.toLocaleString()}`}>
                    <AnimatedPointsCounter 
                       points={premiumPoints} 
                       animation={pointsAnimation}
                       colorType="premium"
                    />
                    <span className="text-xs font-medium mt-[-2px] text-green-600">Puntos Premium</span>
                  </div>
                  
                  {/* Botón Comprar Puntos */}
                  <Link 
                    to="/purchase-points" 
                    className="hidden md:flex items-center gap-2 text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow text-sm"
                  >
                    <span className='whitespace-nowrap'>Comprar Puntos</span>
                  </Link>

                  {/* Botón Subir (Solo escritorio) */}
                  <Button size="sm" asChild className="hidden md:flex bg-red-500 hover:bg-red-600 transition-colors shadow-sm hover:shadow">
                    <Link to="/upload">
                      <Icon name="Plus" size={16} className="mr-2" />
                      Subir
                    </Link>
                  </Button>

                  {/* ✅ CAMPANITA DE NOTIFICACIONES DE REGALOS */}
                  <div className="relative" ref={notifMenuRef}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative hover:bg-gray-100 rounded-full"
                      onClick={toggleNotifMenu}
                    >
                      <Icon name="Bell" size={20} className="text-gray-600" />
                      {unreadGiftCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-white shadow-sm"></span>
                      )}
                    </Button>

                    {/* DROPDOWN DE NOTIFICACIONES */}
                    {isNotifOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                          <span className="font-bold text-sm text-gray-700 flex items-center gap-2">
                             <Icon name="Gift" size={16} className="text-pink-500"/> Tus Regalos
                          </span>
                          {unreadGiftCount > 0 && (
                            <button onClick={markAllGiftsAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
                              Marcar leídos
                            </button>
                          )}
                        </div>
                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                          {giftNotifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center">
                              <Icon name="Gift" size={32} className="mb-2 opacity-20" />
                              No has recibido regalos recientes
                            </div>
                          ) : (
                            giftNotifications.map((notif) => (
                              <div 
                                key={notif.id} 
                                onClick={() => markGiftAsRead(notif.id)}
                                className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors ${!notif.is_read ? 'bg-blue-50/40' : ''}`}
                              >
                                {/* Icono/Imagen del Regalo */}
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-1">
                                   {notif.data?.gift_icon ? (
                                     <img src={notif.data.gift_icon} className="w-full h-full object-contain" alt="Gift" />
                                   ) : (
                                     <Icon name="Gift" size={18} className="text-pink-500" />
                                   )}
                                </div>
                                
                                {/* Contenido Texto */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-800 truncate">{notif.title}</p>
                                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                                  <p className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1">
                                    <Icon name="Star" size={10} className="fill-current"/> +{notif.data?.points_received || 0} Puntos
                                  </p>
                                </div>

                                {/* Indicador no leído */}
                                {!notif.is_read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MENÚ DE USUARIO */}
                  <div className="relative" ref={userMenuRef}>
                    <Button variant="ghost" size="icon" onClick={toggleUserMenu} className="rounded-full border border-transparent hover:border-border transition-all">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="User" size={18} color="white" />
                        )}
                      </div>
                    </Button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-60 bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="py-1">
                          {/* Info Usuario */}
                          <div className="px-4 py-3 border-b border-border bg-muted/30">
                            <div className="text-sm font-bold text-foreground truncate">{user.name || 'Usuario'}</div>
                            <div className="text-xs text-muted-foreground truncate font-medium">{user.email}</div>
                          </div>
                          
                          {/* Opciones */}
                          <div className="p-1">
                             <Link to="/profile" className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                               <Icon name="User" size={16} className="mr-3 text-muted-foreground" />
                               Mi Perfil
                             </Link>
                             
                             {user.is_business_account && (
                               <Link to="/business" className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                                 <Icon name="Building" size={16} className="mr-3 text-muted-foreground" />
                                 Mi Negocio
                               </Link>
                             )}
                             
                             <Link to="/rewards" className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                               <Icon name="Gift" size={16} className="mr-3 text-muted-foreground" />
                               Mis Recompensas
                             </Link>

                             {/* ✅ NUEVO: Link Gestión Tienda en menú usuario */}
                             {canManageShop() && (
                               <>
                                 <div className="border-t border-border my-1 mx-2"></div>
                                 <Link to="/shop/manage/orders" className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                                   <Icon name="Settings" size={16} className="mr-3" />
                                   Gestionar Tienda
                                 </Link>
                               </>
                             )}

                             {isAdmin() && (
                               <>
                                 <div className="border-t border-border my-1 mx-2"></div>
                                 <Link to="/admin" className="flex items-center px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                                   <Icon name="Shield" size={16} className="mr-3" />
                                   Panel Admin
                                 </Link>
                               </>
                             )}

                             <div className="border-t border-border my-1 mx-2"></div>
                             
                             <Link to={configPath} className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors" onClick={() => setIsUserMenuOpen(false)}>
                               <Icon name="Settings" size={16} className="mr-3 text-muted-foreground" />
                               Configuración
                             </Link>
                             
                             <div className="border-t border-border my-1 mx-2"></div>
                             
                             <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors" disabled={loading}>
                               <Icon name="LogOut" size={16} className="mr-3" />
                               {loading ? 'Cerrando...' : 'Cerrar Sesión'}
                             </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // NO AUTENTICADO
                <div className="flex items-center space-x-4">
                  <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    Iniciar Sesión
                  </Link>
                  <Button size="sm" asChild className="shadow-sm">
                    <Link to="/register">Registrarse</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* MODAL MENÚ MÓVIL */}
        {isMainMenuModalOpen && user && (
           <div className="fixed inset-0 z-[100] md:hidden">
              {/* Overlay */}
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={toggleMainMenuModal}
              ></div>

              {/* Sidebar */}
              <div 
                ref={mainMenuModalRef}
                className="fixed left-0 top-0 w-72 h-screen bg-background shadow-2xl transition-transform duration-300 ease-out transform"
                onClick={(e) => e.stopPropagation()}
              >
                 <div className="flex flex-col h-full overflow-y-auto p-5">
                    
                    {/* Header Móvil */}
                    <div className="flex justify-between items-center mb-8 flex-shrink-0">
                       <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2" onClick={() => setIsMainMenuModalOpen(false)}>
                          {branding.logo.primary ? (
                             <img src={branding.logo.primary} alt={branding.texts.appName} className="h-8 object-contain" />
                          ) : null}
                          
                          <div 
                             className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center shadow-sm"
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
                               style={{backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`}}
                             >
                               {branding.texts.appName || 'Radeisan'}
                             </span>
                          )}
                       </Link>
                       <Button variant="ghost" size="icon" onClick={toggleMainMenuModal} className="hover:bg-muted rounded-full">
                          <Icon name="X" size={24} />
                       </Button>
                    </div>

                    {/* Links Móvil */}
                    <nav className="flex flex-col space-y-2 flex-grow">
                       <button onClick={() => {handleHomeNavigate(); setIsMainMenuModalOpen(false);}} className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium w-full text-left transition-colors ${location.pathname === '/dashboard' && (!location.state?.orientation || location.state?.orientation === 'all') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
                          <Icon name="Home" size={20} /><span>Inicio</span>
                       </button>
                       
                       <button onClick={() => {handleOrientationNavigate('vertical'); setIsMainMenuModalOpen(false);}} className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium w-full text-left transition-colors ${isOrientationActive('vertical') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
                          <Icon name="Smartphone" size={20} /><span>Reels</span>
                       </button>
                       
                       <button onClick={() => {handleOrientationNavigate('horizontal'); setIsMainMenuModalOpen(false);}} className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium w-full text-left transition-colors ${isOrientationActive('horizontal') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
                          <Icon name="Monitor" size={20} /><span>Videos</span>
                       </button>

                      <Link 
                          to="/shop" 
                          onClick={() => setIsMainMenuModalOpen(false)} 
                          className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                            location.pathname === '/shop' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <Icon name="ShoppingBag" size={20} />
                          <span>Tienda</span>
                        </Link>
                       
                       <Link to="/rewards" onClick={() => setIsMainMenuModalOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${location.pathname === '/rewards' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
                          <Icon name="Gift" size={20} /><span>Recompensas</span>
                       </Link>

                       {/* ✅ NUEVO: Link Gestión Tienda (Móvil) */}
                       {canManageShop() && (
                          <Link to="/shop/manage/orders" onClick={() => setIsMainMenuModalOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-blue-600 hover:bg-blue-50 mt-2 bg-blue-50/50 border border-blue-200">
                             <Icon name="Settings" size={20} /><span>Gestionar Tienda</span>
                          </Link>
                       )}
                       
                       {isAdmin() && (
                          <Link to="/admin" onClick={() => setIsMainMenuModalOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-primary hover:bg-primary/10 mt-4 bg-primary/5">
                             <Icon name="Shield" size={20} /><span>Panel Admin</span>
                          </Link>
                       )}

                       <div className="border-t border-border mt-6 pt-6 flex-shrink-0">
                          <Link 
                             to="/purchase-points" 
                             onClick={() => setIsMainMenuModalOpen(false)} 
                             className="flex items-center justify-center gap-2 text-white bg-green-600 px-4 py-3 rounded-xl hover:bg-green-700 transition-colors font-bold shadow-sm w-full"
                          >
                             <Icon name="Sparkles" size={18} className="text-white" />
                             Comprar Puntos
                          </Link>
                          
                          <Link 
                             to="/upload" 
                             onClick={() => setIsMainMenuModalOpen(false)} 
                             className="flex items-center justify-center gap-2 text-white bg-red-500 px-4 py-3 rounded-xl hover:bg-red-600 transition-colors font-bold shadow-sm w-full mt-3"
                          >
                             <Icon name="Plus" size={18} className="text-white" />
                             Subir Contenido
                          </Link>
                       </div>
                    </nav>
                 </div>
              </div>
           </div>
        )}
      </header>
    </>
  );
};

export default Header;
