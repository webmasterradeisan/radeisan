// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Componente de loading mejorado con timeout
const AuthLoadingScreen = () => {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    // Si después de 8 segundos sigue cargando, mostrar opción de recargar
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground mb-2">Verificando autenticación...</p>
        
        {showTimeout && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-3">
              La carga está tomando más tiempo de lo esperado.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
              Recargar página
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Ruta protegida - requiere autenticación
export const ProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute:', { 
    loading, 
    isAuthenticated, 
    hasUser: !!user,
    path: location.pathname 
  });

  // Mostrar loading solo mientras se verifica
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated || !user) {
    console.log('❌ No autenticado, redirigiendo a /login');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Usuario autenticado, mostrar contenido
  console.log('✅ Acceso permitido:', user.email);
  return children;
};

// Ruta pública - solo para usuarios NO autenticados
export const PublicRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  console.log('🌐 PublicRoute:', { 
    loading, 
    isAuthenticated, 
    hasUser: !!user 
  });

  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated && user) {
    console.log('✅ Ya autenticado, redirigiendo a /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // No autenticado, mostrar página pública (login/register)
  return children;
};

// Ruta universal - accesible con o sin autenticación
export const UniversalRoute = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return children;
};

export default ProtectedRoute;
