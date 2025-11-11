// src/Routes.jsx - VERSIÓN CORREGIDA FINAL (Eliminación de la declaración duplicada)
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate, Link } from "react-router-dom";

// 🚨 FIX: Todas las importaciones de componentes base se hacen relativas para evitar errores de alias de módulo.
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { PointsProvider } from "./contexts/PointsContext";

// SISTEMA ORIGINAL MANTENIDO
// 🚨 MANTENER: ProtectedAdminRoute se importa desde aquí
import { ProtectedRoute, PublicRoute, UniversalRoute, ProtectedAdminRoute } from "./components/ProtectedRoute";

// MOBILE LAYOUT PARA APLICAR GRADUALMENTE
import MobileLayout from "./components/ui/MobileLayout";

// ===============================
// PÁGINAS DE APLICACIÓN
// ===============================
// 🚨 FIX: Path exacto confirmado por el usuario
import LandingPage from './pages/LandingPage/index.jsx'; 
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import VideoUploadStudio from './pages/video-upload-studio';
import VideoPlayerPage from './pages/VideoPlayerPage';
import ReelsPage from './pages/reels';
import NotFound from "./pages/NotFound"; 

// ✅ NUEVA IMPORTACIÓN DE FOTOS
import PhotoUploadStudio from './pages/photo-upload-studio/index.jsx';

// ✅ PÁGINAS REALES DE USUARIO
import UserProfileSettings from './pages/user-profile-settings';
import BusinessMarketplace from './pages/business-marketplace';
import PointsRewardsStore from './pages/points-rewards-store';

// ✅ NUEVO - SISTEMA DE COMPRA DE PUNTOS PREMIUM
import PurchasePointsPage from './pages/PurchasePointsPage.jsx'; 

// 🚨 PERFIL PÚBLICO
import PublicProfilePage from './pages/public-profile-page/index.jsx';

// ADMIN PANEL
// 🚨 FIX CRÍTICO: Reemplazar alias por rutas relativas explícitas
import AdminDashboard from './pages/admin-panel/AdminDashboard.jsx'; 
import AdminUsers from './pages/admin-panel/AdminUsers.jsx';
import AdminVideos from './pages/admin-panel/AdminVideos.jsx';
import AdminPoints from './pages/admin-panel/AdminPoints.jsx';
import AdminBlogs from './pages/admin-panel/AdminBlogs.jsx';

// 🛑 ELIMINADA LA DECLARACIÓN DUPLICADA DE ProtectedAdminRoute 🛑
import AdminLayout from './components/admin/AdminLayout';
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
              
              {/* =================== RUTAS UNIVERSALES (Cualquier usuario) =================== */}
              
              <Route path="/dashboard" element={<VideoFeedDashboard />} />
              <Route path="/video/:videoId" element={<VideoPlayerPage />} />
              <Route path="/reels" element={<ReelsPage />} />
              
              {/* FIX: Redirige /pricing a la página de compra de puntos */}
              <Route path="/pricing" element={<Navigate to="/purchase-points" replace />} />
              
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              
              {/* 🚨 PERFIL PÚBLICO: La funcionalidad solicitada */}
              <Route 
                path="/profile/:username" 
                element={
                  <UniversalRoute>
                    <PublicProfilePage />
                  </UniversalRoute>
                } 
              />

              {/* =================== RUTAS PROTEGIDAS (Requiere login) =================== */}

              <Route path="/upload" element={
                <ProtectedRoute>
                  <VideoUploadStudio />
                </ProtectedRoute>
              } />
              
              <Route path="/photo-upload" element={
                <ProtectedRoute>
                  <PhotoUploadStudio />
                </ProtectedRoute>
              } />

              <Route path="/points-store" element={
                <ProtectedRoute>
                  <PointsRewardsStore />
                </ProtectedRoute>
              } />

              <Route path="/purchase-points" element={
                <ProtectedRoute>
                  <PurchasePointsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/marketplace" element={
                <ProtectedRoute>
                  <BusinessMarketplace />
                </ProtectedRoute>
              } />

              {/* 🏆 PERFIL DEL DUEÑO: Ruta funcional confirmada */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <UserProfileSettings />
                </ProtectedRoute>
              } />
              
              {/* Redirects para rutas de perfil antiguo */}
              <Route path="/user-profile-settings" element={<Navigate to="/profile" replace />} />
              <Route path="/user/profile" element={<Navigate to="/profile" replace />} />
              <Route path="/settings/profile" element={<Navigate to="/profile" replace />} />


              {/* =================== RUTAS ADMIN =================== */}
              
              <Route path="/admin" element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }>
                <Route index element={<AdminDashboard />} />

                <Route path="users" element={
                  <ProtectedAdminRoute requiredPermission="manage_users">
                    <AdminUsers />
                  </ProtectedAdminRoute>
                } />
                <Route path="videos" element={
                  <ProtectedAdminRoute>
                    <AdminVideos />
                  </ProtectedAdminRoute>
                } />
                <Route path="points" element={
                  <ProtectedAdminRoute requiredPermission="manage_points">
                    <AdminPoints />
                  </ProtectedAdminRoute>
                } />
                <Route path="blogs" element={
                  <ProtectedAdminRoute>
                    <AdminBlogs />
                  </ProtectedAdminRoute>
                } />
                
                {/* 🚨 RESTO DE RUTAS DE ADMINISTRACIÓN (De la versión funcional original) */}
                <Route path="categories" element={<ProtectedAdminRoute requiredPermission="manage_categories"><CategoryManagement /></ProtectedAdminRoute>} />
                <Route path="missions" element={<ProtectedAdminRoute requiredPermission="manage_missions"><MissionsManagement /></ProtectedAdminRoute>} />
                <Route path="rewards" element={<ProtectedAdminRoute requiredPermission="manage_rewards"><RewardsManagement /></ProtectedAdminRoute>} />
                <Route path="settings" element={<ProtectedAdminRoute requiredPermission="manage_settings"><BrandingSettings /></ProtectedAdminRoute>} />
                <Route path="moderation" element={<ProtectedAdminRoute requiredPermission="moderate_content"><ContentModeration /></ProtectedAdminRoute>} />
                <Route path="analytics" element={<ProtectedAdminRoute requiredPermission="view_analytics"><AdvancedAnalytics /></ProtectedAdminRoute>} />
                <Route path="premium-points" element={<ProtectedAdminRoute requiredPermission="manage_points"><PremiumPointsConfig /></ProtectedAdminRoute>} />
                <Route path="transactions" element={<ProtectedAdminRoute requiredPermission="manage_transactions"><TransactionsManagement /></ProtectedAdminRoute>} />

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
