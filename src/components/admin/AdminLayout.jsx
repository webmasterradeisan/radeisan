// ============================================
// COMPONENTE: AdminLayout
// ============================================
// Layout principal del panel de administración
// Incluye sidebar colapsable, header y área de contenido
// ============================================

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// Componentes Admin
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

// Hooks
import { useAdminRole } from '../../hooks/useAdminRole';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

/**
 * Layout principal del panel de administración
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar (opcional, usa Outlet si no se provee)
 * @returns {React.ReactElement}
 */
const AdminLayout = ({ children }) => {
  const location = useLocation();
  const { isAdmin, loading } = useAdminRole();

  // ============================================
  // ESTADO LOCAL
  // ============================================

  // Estado del sidebar (colapsado o expandido)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Recuperar estado del localStorage
    const saved = localStorage.getItem('adminSidebarOpen');
    // En desktop por defecto abierto, en mobile cerrado
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth >= 1024; // lg breakpoint
  });

  // Estado para mobile (sidebar como overlay)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // ============================================
  // EFECTOS
  // ============================================

  // Guardar estado del sidebar en localStorage
  useEffect(() => {
    localStorage.setItem('adminSidebarOpen', sidebarOpen);
  }, [sidebarOpen]);

  // Detectar cambios de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // En mobile, cerrar sidebar al cambiar de tamaño
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Cerrar sidebar en mobile al cambiar de ruta
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================
  // FUNCIONES
  // ============================================

  /**
   * Toggle del sidebar
   */
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  /**
   * Cerrar sidebar (usado en mobile al hacer clic en overlay)
   */
  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  /**
   * Generar breadcrumbs basados en la ruta actual
   */
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    
    // Mapeo de rutas a nombres legibles
    const pathNames = {
      'admin': 'Panel Admin',
      'users': 'Usuarios',
      'categories': 'Categorías',
      'points': 'Sistema de Puntos',
      'missions': 'Misiones Diarias',
      'rewards': 'Recompensas',
      'moderation': 'Moderación',
      'analytics': 'Analytics',
      'settings': 'Configuración',
      'logs': 'Logs de Admin'
    };

    return paths.map((path, index) => ({
      name: pathNames[path] || path.charAt(0).toUpperCase() + path.slice(1),
      path: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  // ============================================
  // ESTADOS DE CARGA
  // ============================================

  // Mostrar loading mientras verifica permisos
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 text-sm">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  // Si no es admin, no renderizar nada (ProtectedAdminRoute se encargará)
  if (!isAdmin) {
    return null;
  }

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================ */}
      {/* SIDEBAR */}
      {/* ============================================ */}
      
      {/* Overlay para mobile cuando sidebar está abierto */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Component */}
      <AdminSidebar
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={closeSidebar}
      />

      {/* ============================================ */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ============================================ */}

      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen && !isMobile ? 'lg:ml-64' : 'lg:ml-0'
        }`}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        
        <AdminHeader
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
          breadcrumbs={breadcrumbs}
        />

        {/* ============================================ */}
        {/* ÁREA DE CONTENIDO */}
        {/* ============================================ */}

        <main className="min-h-[calc(100vh-4rem)]">
          {/* Container con padding */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumbs móvil (opcional, ya están en header en desktop) */}
            {breadcrumbs.length > 1 && (
              <nav className="mb-4 lg:hidden" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.path} className="flex items-center">
                      {index > 0 && (
                        <svg
                          className="h-4 w-4 text-gray-400 mx-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {crumb.isLast ? (
                        <span className="font-medium text-gray-900">
                          {crumb.name}
                        </span>
                      ) : (
                        <a
                          href={crumb.path}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {crumb.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Contenido de la página */}
            <div className="bg-white rounded-lg shadow-sm">
              {/* Renderizar children si se proveen, sino usar Outlet para rutas anidadas */}
              {children || <Outlet />}
            </div>
          </div>
        </main>

        {/* ============================================ */}
        {/* FOOTER (opcional) */}
        {/* ============================================ */}

        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
              <p>
                &copy; {new Date().getFullYear()} Radeisan. Todos los derechos reservados.
              </p>
              <p className="mt-2 sm:mt-0">
                Panel de Administración v1.0
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
