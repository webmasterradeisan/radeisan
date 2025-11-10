// src/Routes.jsx - VERSIÓN CORREGIDA Y FUNCIONAL (Solucionado error de importación final)
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

// ✅ NUEVA IMPORTACIÓN DE FOTOS
import PhotoUploadStudio from './pages/photo-upload-studio/index.jsx';

// ✅ PÁGINAS REALES DE USUARIO
import UserProfileSettings from './pages/user-profile-settings';
import BusinessMarketplace from './pages/business-marketplace';
import PointsRewardsStore from './pages/points-rewards-store';

// ✅ NUEVO - SISTEMA DE COMPRA DE PUNTOS PREMIUM
// 🚨 FIX FINAL: Corregida la ruta de importación
import PurchasePointsPage from './pages/PurchasePointsPage.jsx'; 

// 🚨 COMPONENTE NUEVO: Perfil Público
import PublicProfilePage from './pages/public-profile-page/index.jsx';

// ADMIN PANEL
import AdminDashboard from "pages/admin-panel/AdminDashboard";
import AdminUsers from "pages/admin-panel/AdminUsers";
import AdminVideos from "pages/admin-panel/AdminVideos";
import AdminPoints from "pages/admin-panel/AdminPoints";
import AdminBlogs from "pages/admin-panel/AdminBlogs";

// Otras Páginas (asumidas)
import PricingPage from './pages/PricingPage';
import PrivacyPolicy from "pages/PrivacyPolicy";
import TermsOfService from "pages/TermsOfService";
import Unauthorized from "pages/Unauthorized";


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
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              
              {/* 🚨 PERFIL PÚBLICO: Ruta dinámica accesible por cualquier usuario/visitante */}
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

              {/* 🚨 PERFIL DEL DUEÑO: Ruta estática para la configuración del usuario logueado */}
              <Route path="/settings/profile" element={
                <ProtectedRoute>
                  <UserProfileSettings />
                </ProtectedRoute>
              } />
              
              {/* Redirects de rutas antiguas o comunes a /settings/profile */}
              <Route path="/user-profile-settings" element={<Navigate to="/settings/profile" replace />} />
              <Route path="/user/profile" element={<Navigate to="/settings/profile" replace />} />
              <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />


              {/* =================== RUTAS ADMIN =================== */}
              
              <Route path="/admin" element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }>
                <Route path="users" element={
                  <ProtectedAdminRoute>
                    <AdminUsers />
                  </ProtectedAdminRoute>
                } />
                <Route path="videos" element={
                  <ProtectedAdminRoute>
                    <AdminVideos />
                  </ProtectedAdminRoute>
                } />
                <Route path="points" element={
                  <ProtectedAdminRoute>
                    <AdminPoints />
                  </ProtectedAdminRoute>
                } />
                <Route path="blogs" element={
                  <ProtectedAdminRoute>
                    <AdminBlogs />
                  </ProtectedAdminRoute>
                } />
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
