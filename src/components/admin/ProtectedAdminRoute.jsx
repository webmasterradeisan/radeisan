// ============================================
// COMPONENTE: ProtectedAdminRoute
// ============================================
// Protege las rutas del panel de administración
// verificando permisos y roles de usuario
// ============================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Contextos y Hooks
import { useAuth } from '../../contexts/AuthContext';
import { useAdminRole } from '../../hooks/useAdminRole';

// Componentes
import { AppIcon } from '../AppIcon';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

/**
 * Componente para proteger rutas del panel de administración
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar si tiene permisos
 * @param {string} props.requiredPermission - Permiso específico requerido (opcional)
 * @param {string} props.requiredRole - Rol específico requerido (opcional)
 * @returns {React.ReactElement}
 */
const ProtectedAdminRoute = ({ 
  children, 
  requiredPermission = null,
  requiredRole = null 
}) => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { 
    isAdmin, 
    loading: roleLoading, 
    error,
    canAccess,
    isRoleType,
    roleType
  } = useAdminRole();

  // ============================================
  // ESTADOS DE CARGA
  // ============================================

  // Mostrar loading mientras verifica autenticación o permisos
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 text-sm">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // VERIFICACIONES DE SEGURIDAD
  // ============================================

  // 1. Verificar autenticación
  if (!user) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 2. Verificar si es admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {/* Icono de advertencia */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <AppIcon 
                name="ShieldAlert" 
                className="h-8 w-8 text-red-600" 
              />
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Acceso No Autorizado
            </h2>

            {/* Mensaje */}
            <p className="text-gray-600 mb-6">
              No tienes permisos de administrador para acceder a esta sección.
            </p>

            {/* Mensaje de error si existe */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Botón para volver */}
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <AppIcon name="Home" className="h-5 w-5 mr-2" />
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Verificar permiso específico si se requiere
  if (requiredPermission && !canAccess(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {/* Icono de bloqueo */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <AppIcon 
                name="Lock" 
                className="h-8 w-8 text-yellow-600" 
              />
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Permiso Insuficiente
            </h2>

            {/* Mensaje */}
            <p className="text-gray-600 mb-4">
              Tu rol <span className="font-semibold text-blue-600">{roleType}</span> no tiene acceso a esta funcionalidad.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Se requiere el permiso: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{requiredPermission}</span>
            </p>

            {/* Botón para volver */}
            <button
              onClick={() => window.location.href = '/admin'}
              className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <AppIcon name="ArrowLeft" className="h-5 w-5 mr-2" />
              Volver al Panel Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Verificar rol específico si se requiere
  if (requiredRole && !isRoleType(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {/* Icono de advertencia */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
              <AppIcon 
                name="UserX" 
                className="h-8 w-8 text-orange-600" 
              />
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Rol Insuficiente
            </h2>

            {/* Mensaje */}
            <p className="text-gray-600 mb-4">
              Esta sección requiere el rol de <span className="font-semibold text-blue-600">{requiredRole}</span>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Tu rol actual es: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{roleType}</span>
            </p>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start">
                <AppIcon name="Info" className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Si necesitas acceso a esta funcionalidad, contacta a un administrador superior.
                </p>
              </div>
            </div>

            {/* Botón para volver */}
            <button
              onClick={() => window.location.href = '/admin'}
              className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <AppIcon name="ArrowLeft" className="h-5 w-5 mr-2" />
              Volver al Panel Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDERIZAR CONTENIDO PROTEGIDO
  // ============================================

  // Si todas las verificaciones pasaron, renderizar el contenido
  return <>{children}</>;
};

export default ProtectedAdminRoute;
