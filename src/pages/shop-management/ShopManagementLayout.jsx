// src/pages/shop-management/ShopManagementLayout.jsx
import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import { useShopPermissions } from '../../hooks/useShopPermissions';

const ShopManagementLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useShopPermissions();

  const navItems = [
    { path: '/shop/manage/orders', label: 'Pedidos', icon: 'Package' },
    { path: '/shop/manage/inventory', label: 'Inventario', icon: 'ShoppingBag' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/shop')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Icon name="ArrowLeft" size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gestión de Tienda</h1>
                <p className="text-sm text-gray-500">
                  {userRole === 'admin' ? '🛡️ Administrador' : '🏪 Shop Manager'}
                </p>
              </div>
            </div>

            {/* Badge de Rol */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              userRole === 'admin' 
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}>
              {userRole === 'admin' ? 'SUPER ADMIN' : 'SHOP MANAGER'}
            </div>
          </div>

          {/* Navegación Tabs */}
          <nav className="flex gap-6 -mb-px">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                    isActive
                      ? 'border-blue-600 text-blue-600 font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default ShopManagementLayout;
