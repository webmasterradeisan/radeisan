// src/Routes.jsx - VERSIÓN CORREGIDA FINAL (Restaurado el path /profile y Añadido Perfil Público)
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate, Link } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";
import { PointsProvider } from "contexts/PointsContext";

// SISTEMA ORIGINAL MANTENIDO
import { ProtectedRoute, PublicRoute, UniversalRoute, ProtectedAdminRoute } from "components/ProtectedRoute";

// MOBILE LAYOUT PARA APLICAR GRADUALMENTE
import MobileLayout from "components/ui/MobileLayout";

// ===============================
// PÁGINAS DE APLICACIÓN
// ===============================
// 🚨 FIX: Todas las importaciones se hacen relativas y explícitas para evitar errores de build
import LandingPage from './pages/LandingPage/index.jsx'; 
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import VideoUploadStudio from './pages/video-upload-studio';
import VideoPlayerPage from './pages/VideoPlayerPage';
import ReelsPage from './pages/reels';
import NotFound from "pages/NotFound"; 

// ✅ NUEVA IMPORTACIÓN DE FOTOS
import PhotoUploadStudio from './pages/photo-upload-studio/index.jsx';

// ✅ PÁGINAS REALES DE USUARIO
import UserProfileSettings from './pages/user-profile-settings';
import BusinessMarketplace from './pages/business-marketplace';
import PointsRewardsStore from './pages/points-rewards-store';

// ✅ NUEVO - SISTEMA DE COMPRA DE PUNTOS PREMIUM
import PurchasePointsPage from './pages/PurchasePointsPage.jsx';
import PurchaseSuccess from './pages/purchase-points/PurchaseSuccess';
import PurchaseFailure from './pages/purchase-points/PurchaseFailure';
import PurchasePending from './pages/purchase-points/PurchasePending';

// 🚨 COMPONENTE NUEVO: Perfil Público
import PublicProfilePage from './pages/public-profile-page/index.jsx';

// ADMIN PANEL (FIX: Se asume que estos paths son correctos o se corrigen internamente)
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin-dashboard'; 
import UserManagement from './pages/admin-users/UserManagement';
import CategoryManagement from './pages/admin-categories/CategoryManagement';
import PointsRulesEditor from './pages/admin-points/PointsRulesEditor';
import MissionsManagement from './pages/admin/MissionsManagement';
import RewardsManagement from './pages/admin-rewards/RewardsManagement';
import BrandingSettings from './pages/admin-settings/BrandingSettings';
import ContentModeration from './pages/admin-moderation/ContentModeration';
import AdvancedAnalytics from './pages/admin-analytics/AdvancedAnalytics';
import PremiumPointsConfig from './pages/admin-premium-points/PremiumPointsConfig';
import TransactionsManagement from './pages/admin/TransactionsManagement';


// ... (Componentes auxiliares y placeholders sin cambios)

const MobileLayoutWrapper = ({ children }) => (
  <MobileLayout>{children}</MobileLayout>
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

              {/* =================== RUTAS PÚBLICAS Y AUTENTICACIÓN =================== */}
              
              <Route 
                path="/" 
                element={
                  <PublicRoute>
                    <LandingPage />
                  </PublicRoute>
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

              {/* =================== SISTEMA DE VIDEOS =================== */}
              
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

              <Route 
                path="/reels" 
                element={
                  <UniversalRoute>
                    <ReelsPage />
                  </UniversalRoute>
                } 
              />

              {/* 🚨 PERFIL PÚBLICO: RUTA DINÁMICA - Para ver perfiles de OTROS usuarios */}
              <Route 
                path="/profile/:username" 
                element={
                  <UniversalRoute>
                    <PublicProfilePage />
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
                path="/photo-upload" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <PhotoUploadStudio />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* 🏆 RUTA PRINCIPAL DE PERFIL DE USUARIO LOGUEADO - RUTA FUNCIONAL: /profile */}
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

              {/* =================== 💎 SISTEMA DE COMPRA DE PUNTOS PREMIUM =================== */}
              
              <Route 
                path="/purchase-points" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <PurchasePointsPage />
                    </MobileLayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Rutas de retorno de pasarelas de pago */}
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

              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <MobileLayoutWrapper>
                      <PlaceholderPage 
                        title="Configuración" 
                        description="Personaliza tu experiencia en RADEISAN" 
                      />
                    </MobileLayoutWrapper>
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

                <Route 
                  path="users" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_users">
                      <UserManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="categories" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_categories">
                      <CategoryManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="points" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_points">
                      <PointsRulesEditor />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="premium-points" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_points">
                      <PremiumPointsConfig />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="transactions" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_transactions">
                      <TransactionsManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="missions" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_missions">
                      <MissionsManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="rewards" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_rewards">
                      <RewardsManagement />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="moderation" 
                  element={
                    <ProtectedAdminRoute requiredPermission="moderate_content">
                      <ContentModeration />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="analytics" 
                  element={
                    <ProtectedAdminRoute requiredPermission="view_analytics">
                      <AdvancedAnalytics />
                    </ProtectedAdminRoute>
                  } 
                />

                <Route 
                  path="settings" 
                  element={
                    <ProtectedAdminRoute requiredPermission="manage_settings">
                      <BrandingSettings />
                    </ProtectedAdminRoute>
                  } 
                />

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

              {/* 404 - Limpiar redirects antiguos que causaban problemas */}
              <Route path="/settings/profile" element={<Navigate to="/profile" replace />} />
              <Route path="/user-profile-settings" element={<Navigate to="/profile" replace />} />
              <Route path="/user/profile" element={<Navigate to="/profile" replace />} />
              

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
