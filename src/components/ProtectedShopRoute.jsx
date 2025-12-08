// src/components/ProtectedShopRoute.jsx
import { Navigate } from 'react-router-dom';
import { useShopPermissions } from '../hooks/useShopPermissions';
import Icon from './AppIcon';

export const ProtectedShopRoute = ({ children }) => {
  const { canManageShop, loading } = useShopPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Icon name="Loader" className="animate-spin mx-auto mb-3 text-blue-600" size={40} />
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!canManageShop()) {
    return <Navigate to="/shop" replace />;
  }

  return children;
};

export const AdminOnlyRoute = ({ children }) => {
  const { isAdmin, loading } = useShopPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Icon name="Loader" className="animate-spin mx-auto mb-3 text-red-600" size={40} />
          <p className="text-gray-600">Verificando acceso admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
};
