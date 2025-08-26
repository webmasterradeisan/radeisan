// src/Routes.jsx
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Main App Pages
import NotFound from "pages/NotFound";
import PointsRewardsStore from './pages/points-rewards-store';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import BusinessProfileManagement from './pages/business-profile-management';
import BusinessMarketplace from './pages/business-marketplace';
import UserProfileSettings from './pages/user-profile-settings';
import VideoUploadStudio from './pages/video-upload-studio';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  // Since we always have demo user fallback, all routes are accessible
  // This component is here for future enhancement if needed
  return children;
};

// Public Route Component (for auth pages)
const PublicRoute = ({ children }) => {
  // These routes should be accessible whether user is logged in or not
  // Could add logic here to redirect logged-in users away from login/register
  return children;
};

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <RouterRoutes>
            {/* Authentication Routes */}
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

            {/* Main App Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Navigate to="/video-feed-dashboard" replace />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/video-feed-dashboard" 
              element={
                <ProtectedRoute>
                  <VideoFeedDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/video-upload-studio" 
              element={
                <ProtectedRoute>
                  <VideoUploadStudio />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/business-marketplace" 
              element={
                <ProtectedRoute>
                  <BusinessMarketplace />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/points-rewards-store" 
              element={
                <ProtectedRoute>
                  <PointsRewardsStore />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/user-profile-settings" 
              element={
                <ProtectedRoute>
                  <UserProfileSettings />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/business-profile-management" 
              element={
                <ProtectedRoute>
                  <BusinessProfileManagement />
                </ProtectedRoute>
              } 
            />

            {/* Legacy Routes (for backward compatibility) */}
            <Route 
              path="/marketplace" 
              element={<Navigate to="/business-marketplace" replace />} 
            />
            
            <Route 
              path="/rewards" 
              element={<Navigate to="/points-rewards-store" replace />} 
            />
            
            <Route 
              path="/profile" 
              element={<Navigate to="/user-profile-settings" replace />} 
            />
            
            <Route 
              path="/upload" 
              element={<Navigate to="/video-upload-studio" replace />} 
            />

            {/* Utility Routes */}
            <Route 
              path="/auth/callback" 
              element={
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Procesando autenticación...</p>
                  </div>
                </div>
              } 
            />

            {/* Terms and Privacy (placeholder routes) */}
            <Route 
              path="/terms" 
              element={
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                  <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8">
                    <h1 className="text-3xl font-bold text-foreground mb-6">Términos y Condiciones</h1>
                    <div className="prose prose-neutral dark:prose-invert max-w-none">
                      <p className="text-muted-foreground">
                        Los términos y condiciones de Radeisan serán implementados próximamente.
                        Por ahora, al usar la plataforma aceptas nuestras políticas de uso responsable.
                      </p>
                      <div className="mt-8">
                        <a 
                          href="/login" 
                          className="text-primary hover:underline"
                        >
                          ← Volver al Login
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              } 
            />
            
            <Route 
              path="/privacy" 
              element={
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                  <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8">
                    <h1 className="text-3xl font-bold text-foreground mb-6">Política de Privacidad</h1>
                    <div className="prose prose-neutral dark:prose-invert max-w-none">
                      <p className="text-muted-foreground">
                        Nuestra política de privacidad será publicada próximamente.
                        Nos comprometemos a proteger tu información personal y usarla responsablemente.
                      </p>
                      <div className="mt-8">
                        <a 
                          href="/register" 
                          className="text-primary hover:underline"
                        >
                          ← Volver al Registro
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              } 
            />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
