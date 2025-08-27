// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/AppIcon';

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">Verificando autenticación...</p>
    </div>
  </div>
);

// ProtectedRoute: Solo usuarios autenticados pueden acceder
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras verifica la sesión
  if (loading) {
    return <LoadingSpinner />;
  }

  // Si no hay usuario, redirigir a login guardando la ruta actual
  if (!user) {
    console.log('🚫 Access denied to protected route:', location.pathname);
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Usuario autenticado, mostrar contenido
  console.log('✅ Access granted to protected route:', location.pathname);
  return children;
};

// PublicRoute: Solo usuarios NO autenticados (para login/register)
export const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Mostrar loading mientras verifica la sesión
  if (loading) {
    return <LoadingSpinner />;
  }

  // Si hay usuario autenticado, redirigir al dashboard
  if (user) {
    console.log('🔄 Redirecting authenticated user from auth page to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Usuario no autenticado, puede acceder a páginas públicas
  return children;
};

// UniversalRoute: Accesible para todos (para páginas como landing, about, etc)
export const UniversalRoute = ({ children }) => {
  const { loading } = useAuth();

  // Mostrar loading solo si es necesario
  if (loading) {
    return <LoadingSpinner />;
  }

  return children;
};

// AuthGuard: Componente de alto orden para proteger rutas
export const withAuthGuard = (Component, requireAuth = true) => {
  return (props) => {
    if (requireAuth) {
      return (
        <ProtectedRoute>
          <Component {...props} />
        </ProtectedRoute>
      );
    } else {
      return (
        <PublicRoute>
          <Component {...props} />
        </PublicRoute>
      );
    }
  };
};

// Hook personalizado para verificar autenticación en componentes
export const useRequireAuth = (redirectTo = '/login') => {
  const { user, loading } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (!loading && !user) {
      // Podrías hacer una redirección programática aquí si fuera necesario
      console.log('🚫 User not authenticated in useRequireAuth');
    }
  }, [user, loading]);

  return { user, loading, isAuthenticated: !!user };
};

export default ProtectedRoute;
