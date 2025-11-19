// src/components/ui/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { useGiftNotifications } from '../../contexts/GiftNotificationContext'; // ✅ NUEVO IMPORT CON NOMBRE ÚNICO
import { useBranding } from '../../hooks/useBranding';
import AppIcon from '../AppIcon';
import Button from './Button';

// ... (Tus componentes AnimatedPointsCounter y FloatingPointsNotification se mantienen IGUAL) ...
// ... (Asumiré que están aquí arriba tal cual me los diste) ...

const AnimatedPointsCounter = ({ points, animation, colorType }) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);
  let textColor = colorType === 'premium' ? 'text-green-600' : colorType === 'free' ? 'text-orange-400' : 'text-accent';
  useEffect(() => { setDisplayPoints(points); }, [points]);
  useEffect(() => {
    if (animation.show && animation.type === 'earn' && animation.pointType === colorType) {
      setIsAnimating(true);
      const start = displayPoints; const end = points; const duration = 800; const startTime = Date.now();
      const animate = () => {
        const now = Date.now(); const progress = Math.min((now - startTime) / duration, 1); const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayPoints(Math.round(start + (end - start) * eased));
        if (progress < 1) requestAnimationFrame(animate); else setIsAnimating(false);
      };
      requestAnimationFrame(animate);
    } else { setDisplayPoints(points); }
  }, [points, animation.show, animation.type, animation.pointType, colorType]);
  return <span className={`font-mono text-base font-bold ${textColor} transition-transform duration-300 ${isAnimating ? 'scale-110' : 'scale-100'}`}>{displayPoints.toLocaleString()}</span>;
};

const FloatingPointsNotification = ({ animation }) => {
  if (!animation.show) return null;
  const isEarn = animation.type === 'earn'; const isPremium = animation.pointType === 'premium';
  const bgClasses = isPremium ? (isEarn ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-600') : (isEarn ? 'from-orange-400 to-yellow-500' : 'from-red-500 to-orange-600');
  const messageText = isPremium ? 'Puntos Premium' : 'Puntos Gratis';
  return (
    <div className="fixed top-20 right-4 z-[9999] pointer-events-none animate-slide-in-fade" style={{ animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s' }}>
      <div className={`bg-gradient-to-r ${bgClasses} text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3`}>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce"><AppIcon name={isEarn ? 'TrendingUp' : 'TrendingDown'} size={18} className="text-white" /></div>
        <div><p className="font-bold text-base">{isEarn ? '+' : '-'}{animation.amount} {messageText}</p>{animation.message && <p className="text-xs text-white/90">{animation.message}</p>}</div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: HEADER (CON NOTIFICACIONES DE REGALOS)
// ============================================================================
const Header = () => {
  const { user, signOut, loading } = useAuth();
  const { freePoints, premiumPoints, pointsAnimation, loading: pointsLoading } = usePoints();
  const { branding } = useBranding();
  
  // ✅ Usamos el contexto ESPECÍFICO DE REGALOS
  const { unreadGiftCount, giftNotifications, markGiftAsRead, markAllGiftsAsRead } = useGiftNotifications(); 
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMainMenuModalOpen, setIsMainMenuModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const mainMenuModalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) setIsNotifOpen(false);
      if (isMainMenuModalOpen && mainMenuModalRef.current && !mainMenuModalRef.current.contains(event.target)) {
        if (!event.target.closest('#mobile-main-menu-toggle')) setIsMainMenuModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMainMenuModalOpen]);

  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
    setIsMainMenuModalOpen(false);
  }, [location.pathname]);

  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);
  const toggleMainMenuModal = () => setIsMainMenuModalOpen(!isMainMenuModalOpen);
  const toggleNotifMenu = () => setIsNotifOpen(!isNotifOpen);

  const handleLogout = async () => { try { await signOut(); navigate('/', { replace: true }); } catch (e) { console.error(e); } };
  const handleHomeNavigate = () => navigate('/dashboard', { replace: true, state: { orientation: 'all' } });
  const handleOrientationNavigate = (o) => navigate('/dashboard', { state: { orientation: o } });
  const isOrientationActive = (o) => location.pathname === '/dashboard' && location.state?.orientation === o;
  const Icon = ({ name, size = 20, color = "currentColor", className = "" }) => <AppIcon name={name} size={size} color={color} className={className} />;
  const configPath = user?.isAdmin ? '/admin/settings' : '/settings';

  return (
    <>
      <FloatingPointsNotification animation={pointsAnimation} />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* IZQUIERDA: LOGO & MENU MOVIL */}
            <div className="flex items-center space-x-2">
                {user && (
                    <Button id="mobile-main-menu-toggle" variant="ghost" size="sm" onClick={toggleMainMenuModal} className="md:hidden text-muted-foreground hover:text-primary">
                        <span className="text-sm font-medium">Menú</span>
                    </Button>
                )}
                <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
                  {branding.logo.primary ? <img src={branding.logo.primary} alt={branding.texts.appName} className="h-8 object-contain" onError={(e)=>{e.target.style.display='none';e.target.nextElementSibling.style.display='flex'}} /> : null}
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center" style={{ display: branding.logo.primary ? 'none' : 'flex', backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})` }}>
                    <Icon name="Video" size={20} color="white" />
                  </div>
                  {!branding.logo.primary && <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" style={{backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`}}>{branding.texts.appName || 'Radeisan'}</span>}
                </Link>
            </div>

            {/* CENTRO: NAVEGACIÓN */}
            {user && (
              <nav className="hidden md:flex items-center space-x-1">
                <button onClick={handleHomeNavigate} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/dashboard' && (!location.state?.orientation || location.state?.orientation === 'all') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}><Icon name="Home" size={18} /><span>Inicio</span></button>
                <button onClick={() => handleOrientationNavigate('vertical')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isOrientationActive('vertical') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}><Icon name="Smartphone" size={18} /><span>Reels</span></button>
                <button onClick={() => handleOrientationNavigate('horizontal')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isOrientationActive('horizontal') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}><Icon name="Monitor" size={18} /><span>Videos</span></button>
                <Link to="/rewards" className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/rewards' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}><Icon name="Gift" size={18} /><span>Recompensas</span></Link>
                {user.isAdmin && <Link to="/admin" className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname.startsWith('/admin') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}><Icon name="Shield" size={18} /><span>Admin</span></Link>}
              </nav>
            )}

            {/* DERECHA: PUNTOS & PERFIL */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex flex-col items-center cursor-pointer group" title={`Puntos Gratis: ${freePoints.toLocaleString()}`}>
                    <div className="flex items-center space-x-1"><Icon name="Star" size={18} className="text-orange-400" />{pointsLoading ? <span className="text-sm animate-pulse">...</span> : <AnimatedPointsCounter points={freePoints} animation={pointsAnimation} colorType="free" />}</div>
                    <span className="text-xs text-muted-foreground font-medium mt-[-2px]">Puntos Gratis</span>
                  </div>

                  <div className="flex flex-col items-center" title={`Puntos Premium: ${premiumPoints.toLocaleString()}`}>
                    <AnimatedPointsCounter points={premiumPoints} animation={pointsAnimation} colorType="premium" />
                    <span className="text-xs font-medium mt-[-2px] text-green-600">Puntos Premium</span>
                  </div>
                  
                  <Link to="/purchase-points" className="hidden md:flex items-center gap-2 text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"><span className='whitespace-nowrap'>Comprar Puntos</span></Link>
                  <Button size="sm" asChild className="hidden md:flex bg-red-500 hover:bg-red-600 transition-colors"><Link to="/upload"><Icon name="Plus" size={16} className="mr-2" />Subir</Link></Button>

                  {/* ✅ CAMPANITA DE NOTIFICACIONES DE REGALOS */}
                  <div className="relative" ref={notifMenuRef}>
                    <Button variant="ghost" size="icon" className="relative" onClick={toggleNotifMenu}>
                      <Icon name="Bell" size={20} />
                      {unreadGiftCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      )}
                    </Button>

                    {/* MENÚ DESPLEGABLE */}
                    {isNotifOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-popover border border-border rounded-md shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center px-4 py-2 border-b border-border bg-muted/30">
                           <span className="text-sm font-bold">Tus Regalos</span>
                           {unreadGiftCount > 0 && <button onClick={markAllGiftsAsRead} className="text-xs text-primary hover:underline">Marcar leídos</button>}
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                           {giftNotifications.length === 0 ? (
                              <div className="p-4 text-center text-xs text-muted-foreground">No tienes regalos recientes</div>
                           ) : (
                              giftNotifications.map(notif => (
                                 <div key={notif.id} onClick={() => markGiftAsRead(notif.id)} className={`p-3 border-b border-border hover:bg-muted/50 cursor-pointer flex gap-3 ${!notif.is_read ? 'bg-primary/5' : ''}`}>
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                       <img src={notif.data.gift_icon} className="w-6 h-6 object-contain" alt="Icono" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-medium text-foreground">{notif.title}</p>
                                       <p className="text-xs text-muted-foreground">{notif.message}</p>
                                       <span className="text-[10px] text-green-600 font-bold">+{notif.data.points_received} Puntos</span>
                                    </div>
                                 </div>
                              ))
                           )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MENÚ DE USUARIO (MANTENIDO) */}
                  <div className="relative" ref={userMenuRef}>
                    <Button variant="ghost" size="icon" onClick={toggleUserMenu} className="rounded-full">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden">{user.avatar_url ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover"/> : <Icon name="User" size={18} color="white" />}</div>
                    </Button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                        <div className="py-1">
                          <div className="px-4 py-3 border-b border-border">
                            <div className="text-sm font-medium text-popover-foreground truncate">{user.name || 'Usuario'}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                          </div>
                          <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted" onClick={()=>setIsUserMenuOpen(false)}><Icon name="User" size={16} className="mr-2" />Mi Perfil</Link>
                          {user.is_business_account && <Link to="/business" className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted" onClick={()=>setIsUserMenuOpen(false)}><Icon name="Building" size={16} className="mr-2" />Mi Negocio</Link>}
                          <Link to="/rewards" className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted" onClick={()=>setIsUserMenuOpen(false)}><Icon name="Gift" size={16} className="mr-2" />Mis Recompensas</Link>
                          {user.isAdmin && <><div className="border-t border-border my-1"></div><Link to="/admin" className="flex items-center px-4 py-2 text-sm text-primary hover:bg-primary/10 font-medium" onClick={()=>setIsUserMenuOpen(false)}><Icon name="Shield" size={16} className="mr-2" />Panel Admin</Link></>}
                          <div className="border-t border-border my-1"></div>
                          <Link to={configPath} className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted" onClick={()=>setIsUserMenuOpen(false)}><Icon name="Settings" size={16} className="mr-2" />Configuración</Link>
                          <div className="border-t border-border my-1"></div>
                          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10" disabled={loading}><Icon name="LogOut" size={16} className="mr-2" />{loading ? 'Cerrando...' : 'Cerrar Sesión'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Iniciar Sesión</Link>
                  <Button size="sm" asChild><Link to="/register">Registrarse</Link></Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* MODAL MENÚ MÓVIL (MANTENIDO) */}
        {isMainMenuModalOpen && user && (
           <div className="fixed inset-0 z-[100] md:hidden">
              <div className="absolute inset-0 bg-black/70" onClick={toggleMainMenuModal}></div>
              <div ref={mainMenuModalRef} className="fixed left-0 top-0 w-64 h-screen bg-white shadow-2xl transition-transform duration-300 ease-out" onClick={(e) => e.stopPropagation()}>
                 <div className="flex flex-col h-full overflow-y-auto p-4">
                    <div className="flex justify-between items-center mb-6 flex-shrink-0">
                       <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
                          {branding.logo.primary ? <img src={branding.logo.primary} alt={branding.texts.appName} className="h-8 object-contain" /> : null}
                          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center" style={{display: branding.logo.primary ? 'none' : 'flex', backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`}}><Icon name="Video" size={20} color="white" /></div>
                          {!branding.logo.primary && <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" style={{backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`}}>{branding.texts.appName || 'Radeisan'}</span>}
                       </Link>
                       <Button variant="ghost" size="icon" onClick={toggleMainMenuModal}><Icon name="X" size={24} /></Button>
                    </div>
                    <nav className="flex flex-col space-y-2 flex-grow">
                       <button onClick={() => {handleHomeNavigate(); setIsMainMenuModalOpen(false);}} className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium w-full text-left ${location.pathname === '/dashboard' && (!location.state?.orientation || location.state?.orientation === 'all') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}><Icon name="Home" size={20} /><span>Inicio</span></button>
                       <button onClick={() => {handleOrientationNavigate('vertical'); setIsMainMenuModalOpen(false);}} className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium w-full text-left ${isOrientationActive('vertical') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}><Icon name="Smartphone" size={20} /><span>Reels</span></button>
                       <button onClick={() => {handleOrientationNavigate('horizontal'); setIsMainMenuModalOpen(false);}} className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium w-full text-left ${isOrientationActive('horizontal') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}><Icon name="Monitor" size={20} /><span>Videos</span></button>
                       <Link to="/rewards" onClick={() => setIsMainMenuModalOpen(false)} className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium ${location.pathname === '/rewards' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}><Icon name="Gift" size={20} /><span>Recompensas</span></Link>
                       {user.isAdmin && <Link to="/admin" onClick={() => setIsMainMenuModalOpen(false)} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium text-primary hover:bg-primary/10"><Icon name="Shield" size={20} /><span>Panel Admin</span></Link>}
                       <div className="border-t border-border mt-4 pt-4 flex-shrink-0">
                          <Link to="/purchase-points" onClick={() => setIsMainMenuModalOpen(false)} className="flex items-center justify-center gap-2 text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium mt-2"><Icon name="Sparkles" size={18} className="text-white" />Comprar Puntos</Link>
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
