// src/Routes.jsx - CORREGIDO: Importación de AdminUserManagement
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
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import VideoUploadStudio from './pages/video-upload-studio';
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

// ===============================
// PÁGINAS DE ADMINISTRACIÓN
// ===============================
import AdminDashboard from './pages/admin-dashboard';
// 🛠️ CORRECCIÓN: Ajuste de ruta para resolver './pages/admin-user-management'
import AdminUserManagement from './pages/admin-user-management/index.jsx'; 
import CategoryManagement from './pages/admin-categories/CategoryManagement';
import PointsRulesEditor from './pages/admin-points/PointsRulesEditor';
import AdminLogs from './pages/admin-logs';

// ✅ NUEVO - COMPONENTE DE EDICIÓN DE VIDEO
import VideoEditStudio from './pages/VideoEditStudio'; 

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PointsProvider>
          <ScrollToTop />
          <ErrorBoundary>
            <RouterRoutes>

              {/* =================== RUTAS PÚBLICAS Y DE AUTENTICACIÓN =================== */}
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

              {/* =================== RUTAS DE USUARIO (RESTRINGIDAS) =================== */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <UniversalRoute>
                      <VideoFeedDashboard />
                    </UniversalRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <UniversalRoute>
                      <VideoUploadStudio />
                    </UniversalRoute>
                  </ProtectedRoute>
                } 
              />

              {/* ✅ RUTA DE EDICIÓN DE VIDEO - Resuelve el Error 404 */}
              <Route 
                path="/video-edit/:videoId" 
                element={
                  <ProtectedRoute>
                    <UniversalRoute>
                      <VideoEditStudio /> 
                    </UniversalRoute>
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
                path="/reels" 
                element={
                  <UniversalRoute>
                    <ReelsPage />
                  </UniversalRoute>
                } 
              />
              <Route 
                path="/profile/:identifier" 
                element={
                  <UniversalRoute>
                    <PublicProfilePage />
                  </UniversalRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <UniversalRoute>
                      <UserProfileSettings />
                    </UniversalRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/marketplace" 
                element={
                  <ProtectedRoute>
                    <UniversalRoute>
                      <BusinessMarketplace />
                    </UniversalRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/rewards" 
                element={
                  <ProtectedRoute>
                    <UniversalRoute>
                      <PointsRewardsStore />
                    </UniversalRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/purchase-points" 
                element={
                  <ProtectedRoute>
                    <UniversalRoute>
                      <PurchasePointsPage />
                    </UniversalRoute>
                  </ProtectedRoute>
                } 
              />

              {/* =================== RUTAS DE ADMINISTRADOR =================== */}
              <Route path="/admin" element={<ProtectedAdminRoute><UniversalRoute /></ProtectedAdminRoute>}>
                <Route 
                  index 
                  element={
                    <ProtectedAdminRoute>
                      <UniversalRoute>
                        <AdminDashboard />
                      </UniversalRoute>
                    </ProtectedAdminRoute>
                  } 
                />
                <Route 
                  path="users" 
                  element={
                    <ProtectedAdminRoute>
                      <UniversalRoute>
                        <AdminUserManagement />
                      </UniversalRoute>
                    </ProtectedAdminRoute>
                  } 
                />
                <Route 
                  path="categories" 
                  element={
                    <ProtectedAdminRoute>
                      <UniversalRoute>
                        <CategoryManagement />
                      </UniversalRoute>
                    </ProtectedAdminRoute>
                  } 
                />
                <Route 
                  path="points-rules" 
                  element={
                    <ProtectedAdminRoute>
                      <UniversalRoute>
                        <PointsRulesEditor />
                      </UniversalRoute>
                    </ProtectedAdminRoute>
                  } 
                />
                <Route 
                  path="logs" 
                  element={
                    <ProtectedAdminRoute>
                      <UniversalRoute>
                        <AdminLogs />
                      </UniversalRoute>
                    </ProtectedAdminRoute>
                  } 
                />
              </Route>

              {/* Acceso no autorizado */}
              <Route 
                path="/unauthorized" 
                element={
                  <UniversalRoute>
                    <NotFound /> 
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
