// AdminHeader.jsx - Header del panel de administración
// Ruta: src/components/admin/AdminHeader.jsx
// Incluye breadcrumbs, búsqueda y menú de usuario

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Contextos y Hooks
import { useAuth } from '../../contexts/AuthContext';

// Componentes
import Icon from '../AppIcon';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

/**
 * Header del panel de administración
 * @param {Object} props
 * @param {Function} props.onToggleSidebar - Callback para toggle del sidebar
 * @param {boolean} props.sidebarOpen - Estado del sidebar
 * @param {Array} props.breadcrumbs - Array de breadcrumbs para navegación
 * @returns {React.ReactElement}
 */
const AdminHeader = ({ onToggleSidebar, sidebarOpen, breadcrumbs = [] }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // ============================================
  // ESTADO LOCAL
  // ============================================

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  // ============================================
  // EFECTOS
  // ============================================

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  // Cerrar búsqueda al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [searchOpen]);

  // Focus en input de búsqueda al abrir
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      const input = searchRef.current.querySelector('input');
      if (input) input.focus();
    }
  }, [searchOpen]);

  // ============================================
  // FUNCIONES
  // ============================================

  /**
   * Toggle del menú de usuario
   */
  const toggleUserMenu = () => {
    setUserMenuOpen(prev => !prev);
  };

  /**
   * Toggle de la búsqueda
   */
  const toggleSearch = () => {
    setSearchOpen(prev => !prev);
    if (!searchOpen) {
      setSearchQuery('');
    }
  };

  /**
   * Manejar búsqueda
   */
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implementar búsqueda global
      console.log('Buscando:', searchQuery);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  /**
   * Manejar cierre de sesión
   */
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  /**
   * Obtener iniciales del usuario
   */
  const getUserInitials = () => {
    if (!user?.full_name) return 'AD';
    const names = user.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  /**
   * Obtener nombre del rol formateado
   */
  const getRoleName = () => {
    const role = user?.role || 'user';
    const roleNames = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      moderator: 'Moderador',
      editor: 'Editor',
      user: 'Usuario'
    };
    return roleNames[role] || 'Usuario';
  };

  /**
   * Obtener color del badge según rol
   */
  const getRoleBadgeColor = () => {
    const role = user?.role || 'user';
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'moderator':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'editor':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        
        {/* ============================================ */}
        {/* LADO IZQUIERDO: Toggle Sidebar + Breadcrumbs */}
        {/* ============================================ */}

        <div className="flex items-center flex-1 min-w-0">
          {/* Botón Toggle Sidebar */}
          <button
            onClick={onToggleSidebar}
            className="p-2 mr-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={sidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
          >
            <Icon 
              name={sidebarOpen ? 'PanelLeftClose' : 'Menu'} 
              size={20}
              className="text-gray-600" 
            />
          </button>

          {/* Breadcrumbs (Desktop) */}
          {breadcrumbs.length > 0 && (
            <nav className="hidden md:flex items-center space-x-2 ml-4" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={`${crumb.path}-${index}`}>
                  {index > 0 && (
                    <Icon name="ChevronRight" size={16} className="text-gray-400" />
                  )}
                  {crumb.isLast ? (
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {crumb.name}
                    </span>
                  ) : (
                    <Link
                      to={crumb.path}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors truncate max-w-[150px]"
                    >
                      {crumb.name}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Título Mobile (sin breadcrumbs) */}
          {breadcrumbs.length > 0 && (
            <div className="md:hidden ml-2">
              <h1 className="text-sm font-semibold text-gray-900 truncate">
                {breadcrumbs[breadcrumbs.length - 1]?.name || 'Admin Panel'}
              </h1>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* LADO DERECHO: Búsqueda + Notificaciones + Usuario */}
        {/* ============================================ */}

        <div className="flex items-center space-x-2 sm:space-x-4">
          
          {/* ============================================ */}
          {/* BÚSQUEDA (Desktop y Mobile) */}
          {/* ============================================ */}

          <div ref={searchRef} className="relative">
            {/* Botón de búsqueda (Mobile) */}
            <button
              onClick={toggleSearch}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors sm:hidden"
              aria-label="Buscar"
            >
              <Icon name="Search" size={20} className="text-gray-600" />
            </button>

            {/* Input de búsqueda (Desktop) */}
            <form onSubmit={handleSearch} className="hidden sm:block">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Icon 
                  name="Search" 
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
              </div>
            </form>

            {/* Búsqueda Mobile (Overlay) */}
            {searchOpen && (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-50 sm:hidden" onClick={toggleSearch}>
                <div 
                  className="absolute top-0 left-0 right-0 bg-white p-4 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <form onSubmit={handleSearch} className="flex items-center space-x-2">
                    <Icon name="Search" size={20} className="text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar..."
                      className="flex-1 py-2 text-sm border-0 focus:outline-none focus:ring-0"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={toggleSearch}
                      className="p-2 text-gray-600 hover:text-gray-900"
                    >
                      <Icon name="X" size={20} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* ============================================ */}
          {/* NOTIFICACIONES (Placeholder) */}
          {/* ============================================ */}

          <button
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors hidden sm:block"
            aria-label="Notificaciones"
          >
            <Icon name="Bell" size={20} className="text-gray-600" />
            {/* Badge de notificaciones no leídas */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* ============================================ */}
          {/* MENÚ DE USUARIO */}
          {/* ============================================ */}

          <div ref={userMenuRef} className="relative">
            {/* Botón de Usuario */}
            <button
              onClick={toggleUserMenu}
              className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Menú de usuario"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || 'Usuario'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {getUserInitials()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info del usuario (Desktop) */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-tight max-w-[120px] truncate">
                  {user?.full_name || user?.username || 'Usuario'}
                </p>
                <div className="flex items-center space-x-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor()}`}>
                    {getRoleName()}
                  </span>
                </div>
              </div>

              {/* Icono de dropdown */}
              <Icon 
                name={userMenuOpen ? 'ChevronUp' : 'ChevronDown'} 
                size={16}
                className="text-gray-500 hidden md:block" 
              />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* Info del usuario */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.full_name || user?.username || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {user?.email}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-flex text-xs px-2 py-1 rounded-full border ${getRoleBadgeColor()}`}>
                      {getRoleName()}
                    </span>
                  </div>
                </div>

                {/* Opciones del menú */}
                <div className="py-1">
                  <Link
                    to="/profile" // ✅ CORREGIDO: Ruta de perfil de usuario
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Icon name="User" size={16} className="text-gray-500" />
                    <span>Ver perfil</span>
                  </Link>

                  <Link
                    to="settings" // ✅ CORREGIDO: Ruta relativa para navegación dentro del AdminLayout
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Icon name="Settings" size={16} className="text-gray-500" />
                    <span>Configuración</span>
                  </Link>

                  <Link
                    to="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Icon name="ArrowLeft" size={16} className="text-gray-500" />
                    <span>Volver al sitio</span>
                  </Link>
                </div>

                {/* Cerrar sesión */}
                <div className="border-t border-gray-100 py-1 mt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Icon name="LogOut" size={16} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
