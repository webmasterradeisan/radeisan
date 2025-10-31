// ============================================
// COMPONENTE: AdminSidebar
// ============================================
// NavegaciÃ³n lateral del panel de administraciÃ³n
// Con menÃº dinÃ¡mico basado en permisos
// ============================================

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// Hooks
import { useAdminRole } from '../../hooks/useAdminRole';

// Componentes
import AppIcon from '../AppIcon';

// ============================================
// CONFIGURACIÃ“N DEL MENÃš
// ============================================

/**
 * Obtiene los items del menÃº con sus permisos requeridos
 */
const getMenuItems = () => [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/admin',
    icon: 'LayoutDashboard',
    description: 'EstadÃ­sticas generales',
    requiredPermission: null, // Todos los admins pueden ver
    badge: null
  },
  {
    id: 'users',
    name: 'Usuarios',
    path: '/admin/users',
    icon: 'Users',
    description: 'GestiÃ³n de usuarios',
    requiredPermission: 'manage_users',
    badge: null
  },
  {
    id: 'categories',
    name: 'CategorÃ­as',
    path: '/admin/categories',
    icon: 'FolderTree',
    description: 'GestiÃ³n de categorÃ­as',
    requiredPermission: 'manage_categories',
    badge: null
  },
  {
    id: 'points',
    name: 'Sistema de Puntos',
    path: '/admin/points',
    icon: 'Coins',
    description: 'ConfiguraciÃ³n de puntos',
    requiredPermission: 'manage_points',
    badge: null
  },
  {
    id: 'premium-points',
    name: 'Puntos Premium',
    path: '/admin/premium-points',
    icon: 'Sparkles',
    description: 'Gestión de paquetes y pasarelas de pago',
    requiredPermission: 'manage_points',
    badge: null
  },
  {
    id: 'missions',
    name: 'Misiones Diarias',
    path: '/admin/missions',
    icon: 'Target',
    description: 'GestiÃ³n de misiones',
    requiredPermission: 'manage_missions',
    badge: null
  },
  {
    id: 'rewards',
    name: 'Recompensas',
    path: '/admin/rewards',
    icon: 'Gift',
    description: 'GestiÃ³n de recompensas',
    requiredPermission: 'manage_rewards',
    badge: null
  },
  {
    id: 'moderation',
    name: 'ModeraciÃ³n',
    path: '/admin/moderation',
    icon: 'Shield',
    description: 'Reportes y moderaciÃ³n',
    requiredPermission: 'moderate_content',
    badge: null
  },
  {
    id: 'analytics',
    name: 'Analytics',
    path: '/admin/analytics',
    icon: 'BarChart3',
    description: 'EstadÃ­sticas avanzadas',
    requiredPermission: 'view_analytics',
    badge: null
  },
  {
    id: 'settings',
    name: 'ConfiguraciÃ³n',
    path: '/admin/settings',
    icon: 'Settings',
    description: 'Branding y ajustes',
    requiredPermission: 'manage_settings',
    badge: null
  },
  {
    id: 'logs',
    name: 'Logs de Admin',
    path: '/admin/logs',
    icon: 'FileText',
    description: 'Historial de acciones',
    requiredPermission: 'view_logs',
    badge: null
  }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

/**
 * Sidebar del panel de administraciÃ³n
 * @param {Object} props
 * @param {boolean} props.isOpen - Estado del sidebar (abierto/cerrado)
 * @param {boolean} props.isMobile - Si estÃ¡ en vista mobile
 * @param {Function} props.onClose - Callback para cerrar el sidebar
 * @returns {React.ReactElement}
 */
const AdminSidebar = ({ isOpen, isMobile, onClose }) => {
  const location = useLocation();
  const { canAccess, roleType, roleName } = useAdminRole();

  // ============================================
  // FUNCIONES
  // ============================================

  /**
   * Filtrar items del menÃº segÃºn permisos
   */
  const getFilteredMenuItems = () => {
    const items = getMenuItems();
    return items.filter(item => {
      // Si no requiere permiso, mostrar a todos los admins
      if (!item.requiredPermission) return true;
      
      // Verificar si tiene el permiso requerido
      return canAccess(item.requiredPermission);
    });
  };

  /**
   * Verificar si una ruta estÃ¡ activa
   */
  const isActiveRoute = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const filteredItems = getFilteredMenuItems();

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <>
      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isMobile ? '' : 'lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* ============================================ */}
        {/* HEADER DEL SIDEBAR */}
        {/* ============================================ */}

        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          {/* Logo y Nombre */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
              <AppIcon name="Shield" className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">Radeisan</span>
              <span className="text-xs text-gray-500">Admin Panel</span>
            </div>
          </div>

          {/* BotÃ³n cerrar (solo mobile) */}
          {isMobile && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Cerrar menÃº"
            >
              <AppIcon name="X" className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* ============================================ */}
        {/* ROL DEL USUARIO */}
        {/* ============================================ */}

        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className={`
              px-2.5 py-1 rounded-full text-xs font-medium
              ${roleType === 'super_admin' ? 'bg-purple-100 text-purple-700' : ''}
              ${roleType === 'admin' ? 'bg-blue-100 text-blue-700' : ''}
              ${roleType === 'moderator' ? 'bg-green-100 text-green-700' : ''}
              ${roleType === 'editor' ? 'bg-yellow-100 text-yellow-700' : ''}
            `}>
              {roleName}
            </div>
            {roleType === 'super_admin' && (
              <AppIcon name="Crown" className="w-4 h-4 text-purple-600" />
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* NAVEGACIÃ“N */}
        {/* ============================================ */}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const isActive = isActiveRoute(item.path);

              return (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    onClick={isMobile ? onClose : undefined}
                    className={`
                      group flex items-center justify-between px-3 py-2.5 rounded-lg
                      transition-all duration-200 ease-in-out
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                    title={item.description}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Icono */}
                      <AppIcon
                        name={item.icon}
                        className={`
                          w-5 h-5 flex-shrink-0
                          ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}
                        `}
                      />

                      {/* Nombre */}
                      <span className="truncate text-sm">
                        {item.name}
                      </span>
                    </div>

                    {/* Badge de notificaciones (si existe) */}
                    {item.badge && (
                      <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-medium">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}

                    {/* Indicador de activo */}
                    {isActive && (
                      <div className="ml-2 w-1 h-6 bg-blue-600 rounded-full" />
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ============================================ */}
        {/* FOOTER DEL SIDEBAR */}
        {/* ============================================ */}

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-2">
            {/* Indicador de accesos */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <AppIcon name="CheckCircle2" className="w-4 h-4 text-green-600" />
              <span>{filteredItems.length} secciones disponibles</span>
            </div>

            {/* Volver al sitio */}
            <a
              href="/dashboard"
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <AppIcon name="ArrowLeft" className="w-4 h-4" />
              <span>Volver al sitio</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
