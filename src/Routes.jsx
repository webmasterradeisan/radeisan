// src/Routes.jsx - ACTUALIZADO CON PERFIL PÚBLICO
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate, Link } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";
import { PointsProvider } from "contexts/PointsContext";

// SISTEMA ORIGINAL MANTENIDO
import { ProtectedRoute, PublicRoute, UniversalRoute } from "components/ProtectedRoute";

// MOBILE LAYOUT PARA APLICAR GRADUALMENTE
import MobileLayout from "components/ui/MobileLayout";

// ===============================
// PÁGINAS DE APLICACIÓN
// ===============================
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import VideoUploadStudio from './pages/video-upload-studio';
import VideoEditStudio from './pages/VideoEditStudio';
import VideoPlayerPage from './pages/VideoPlayerPage';
import ReelsPage from './pages/reels';
import NotFound from "pages/NotFound";

// ✅ PÁGINAS REALES DE USUARIO
import UserProfileSettings from './pages/user-profile-settings';
import BusinessMarketplace from './pages/business-marketplace';
import PointsRewardsStore from './pages/points-rewards-store';

// ✅ NUEVO - PERFIL PÚBLICO
import PublicProfilePage from './pages/PublicProfilePage';

// ✅ NUEVO - SISTEMA DE COMPRA DE PUNTOS PREMIUM
import PurchasePointsPage from './pages/PurchasePointsPage';
import PurchaseSuccess from './pages/purchase-points/PurchaseSuccess';
import PurchaseFailure from './pages/purchase-points/PurchaseFailure';
import PurchasePending from './pages/purchase-points/PurchasePending';

// ===============================
// COMPONENTES DEL PANEL ADMIN
// ===============================
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import AdminLayout from './components/admin/AdminLayout';

// ✅ PÁGINAS DE ADMINISTRACIÓN - TODAS REALES
import AdminDashboard from './pages/admin-dashboard';
import UserManagement from './pages/admin-users/UserManagement';
import CategoryManagement from './pages/admin-categories/CategoryManagement';
import PointsRulesEditor from './pages/admin-points/PointsRulesEditor';
import MissionsManagement from './pages/admin/MissionsManagement';
import RewardsManagement from './pages/admin-rewards/RewardsManagement';
import BrandingSettings from './pages/admin-settings/BrandingSettings';
import ContentModeration from './pages/admin-moderation/ContentModeration';
import AdvancedAnalytics from './pages/admin-analytics/AdvancedAnalytics';

// ✅ NUEVO - GESTIÓN DE PUNTOS PREMIUM (ADMIN)
import PremiumPointsConfig from './pages/admin-premium-points/PremiumPointsConfig';

// ✅ NUEVO - GESTIÓN DE TRANSACCIONES (ADMIN)
import TransactionsManagement from './pages/admin/TransactionsManagement';

// ===============================
// WRAPPER PARA MOBILELAYOUT
// ===============================
const MobileLayoutWrapper = ({ children }) => (
  <MobileLayout>{children}</MobileLayout>
);

// ===============================
// COMPONENTES AUXILIARES
// ===============================
const AuthCallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">Procesando autenticación...</p>
    </div>
  </div>
);

const PlaceholderPage = ({ title, description }) => (
  <div className="min-h-screen bg-background">
    <div className="max-w-2xl mx-auto px-4 pt-32 pb-16">
      <div className="text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">{title}</h1>
        <p className="text-muted-foreground mb-8">{description}</p>
        <div className="bg-muted/50 rounded-lg p-6">
          <p className="text-sm text-muted-foreground">
            Esta página está en desarrollo. Pronto estará disponible con todas las funcionalidades.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ===============================
// PÁGINA DE ACCESO NO AUTORIZADO
// ===============================
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso No Autorizado
        </h2>
        <p className="text-gray-600 mb-6">
          No tienes permisos suficientes para acceder a esta sección.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  </div>
);

// ===============================
// PLACEHOLDER SOLO PARA LOGS
// ===============================
const AdminPlaceholder = ({ title, description, requiredPermission }) => (
  <div className="p-6">
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
          <p className="text-gray-600 mb-6">{description}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Esta sección se implementará próximamente.
            </p>
            {requiredPermission && (
              <p className="text-xs text-blue-600 mt-2 font-mono">
                Permiso requerido: {requiredPermission}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ===============================
// COMPONENTE DE RUTAS PRINCIPAL
// ===============================
const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PointsProvider>
          <ErrorBoundary>
            <ScrollToTop />
            <RouterRoutes>
              
              {/* =================== RUTAS PÚBLICAS =================== */}
              
              <Route 
                path="/" 
                element={
                  <UniversalRoute>
                    <LandingPage />
                  </UniversalRoute>
                } 
              />
              
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } 
              />
              
              <Route 
                path="/auth/callback" 
                element={
                  <UniversalRoute>
                    <AuthCallback />
                  </UniversalRoute>
                } 
              />

              {/* =================== RUTAS PROTEGIDAS =================== */}
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <VideoFeedDashboard />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <VideoUploadStudio />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/edit/:videoId" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <VideoEditStudio />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/reels" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <ReelsPage />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/video/:videoId" 
                element={
                  <UniversalRoute>
                    <VideoPlayerPage />
                  </UniversalRoute>
                } 
              />

              <Route 
                path="/reel/:videoId" 
                element={
                  <UniversalRoute>
                    <VideoPlayerPage />
                  </UniversalRoute>
                } 
              />

              {/* =================== PERFIL =================== */}
              
              {/* Perfil propio del usuario autenticado */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <UserProfileSettings />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* ✅ NUEVO - Perfil público (acepta username o UUID) */}
              <Route 
                path="/profile/:identifier" 
                element={
                  <UniversalRoute>
                    <PublicProfilePage />
                  </UniversalRoute>
                } 
              />

              {/* =================== MARKETPLACE Y REWARDS =================== */}

              <Route 
                path="/marketplace" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <BusinessMarketplace />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/rewards" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <PointsRewardsStore />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* =================== COMPRA DE PUNTOS PREMIUM =================== */}

              <Route 
                path="/purchase-points" 
                element={
                  <ProtectedRoute>
                    <PurchasePointsPage />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/purchase/success" 
                element={
                  <ProtectedRoute>
                    <PurchaseSuccess />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/purchase/failure" 
                element={
                  <ProtectedRoute>
                    <PurchaseFailure />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/purchase/pending" 
                element={
                  <ProtectedRoute>
                    <PurchasePending />
                  </ProtectedRoute>
                } 
              />

              {/* =================== OTRAS RUTAS PROTEGIDAS =================== */}

              <Route 
                path="/saved" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <PlaceholderPage 
                        title="Contenido Guardado" 
                        description="Accede a todo el contenido que has guardado" 
                      />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* CONFIGURACIÓN - REDIRECCIÓN A /PROFILE (Implementación lista) */}
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Navigate to="/profile" replace />
                  </ProtectedRoute>
                } 
              />

              {/* =================== PANEL DE ADMINISTRACIÓN =================== */}
              
              <Route 
                path="/admin" 
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                }
              >
                {/* Dashboard - ✅ REAL (Sprint 4) */}
                <Route index element={<AdminDashboard />} />

                {/* Usuarios - ✅ REAL (Sprint 4) */}
                <Route 
                  path="users" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_users">
                      <UserManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* Categorías - ✅ REAL (Sprint 4) */}
                <Route 
                  path="categories" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_categories">
                      <CategoryManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* Puntos - ✅ REAL (Sprint 5) */}
                <Route 
                  path="points" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_points">
                      <PointsRulesEditor />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* 💎 NUEVO - Puntos Premium - ✅ REAL */}
                <Route 
                  path="premium-points" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_points">
                      <PremiumPointsConfig />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* 💰 NUEVO - Gestión de Transacciones - ✅ REAL */}
                <Route 
                  path="transactions" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_transactions">
                      <TransactionsManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* Misiones - ✅ REAL (NUEVO) */}
                <Route 
                  path="missions" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_missions">
                      <MissionsManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* Recompensas - ✅ REAL (Sprint 5) */}
                <Route 
                  path="rewards" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_rewards">
                      <RewardsManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* Moderación - ✅ REAL (Sprint 6) */}
                <Route 
                  path="moderation" 
                  element={
                    <ProtectedAdminRoute requiredPermission="moderate_content">
                      <ContentModeration />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* Analytics - ✅ REAL (Sprint 6) */}
                <Route 
                  path="analytics" 
                  element={
                    <ProtectedAdminRoute requiredPermission="view_analytics">
                      <AdvancedAnalytics />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* Branding - ✅ REAL (Sprint 5) */}
                <Route 
                  path="settings" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_settings">
                      <BrandingSettings />
                    </ProtectedAdminRoute>
                  } 
                />

                {/* Logs - ⏳ PLACEHOLDER */}
                <Route 
                  path="logs" 
                  element={
                    <ProtectedAdminRoute requiredPermission="view_logs">
                      <AdminPlaceholder 
                        title="Logs de Administración"
                        description="Auditoría de acciones administrativas"
                        requiredPermission="view_logs"
                      />
                    </ProtectedAdminRoute>
                  } 
                />
              </Route>

              {/* Acceso no autorizado */}
              <Route 
                path="/unauthorized" 
                element={
                  <UniversalRoute>
                    <Unauthorized />
                  </UniversalRoute>
                } 
              />

              {/* =================== REDIRECTS =================== */}
              
              <Route path="/create" element={<Navigate to="/upload" replace />} />
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="/feed" element={<Navigate to="/dashboard" replace />} />
              <Route path="/watch/:videoId" element={<Navigate to="/video/:videoId" replace />} />
              
              {/* Redirect de compra (por si alguien usa /buy-points) */}
              <Route path="/buy-points" element={<Navigate to="/purchase-points" replace />} />

              {/* =================== 404 =================== */}
              
              <Route 
                path="*" 
                element={
                  <UniversalRoute>
                    <NotFound />
                  </UniversalRoute>
                } 
              />
              
            </RouterRoutes>
          </ErrorBoundary>
        </PointsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
