// src/Routes.jsx - VERSIÓN HÍBRIDA SEGURA + SISTEMA DE VIDEOS + REELS FULLSCREEN
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";

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
import VideoPlayerPage from './pages/VideoPlayerPage';
import ReelsPage from './pages/reels'; // ✅ NUEVO: Página fullscreen de reels
import NotFound from "pages/NotFound";

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
// COMPONENTE DE RUTAS PRINCIPAL
// ===============================
const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
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

            {/* =================== SISTEMA DE VIDEOS (NUEVO) =================== */}
            
            {/* Página de reproducción individual de video */}
            <Route 
              path="/video/:videoId" 
              element={
                <UniversalRoute>
                  <VideoPlayerPage />
                </UniversalRoute>
              } 
            />

            {/* Alias para reels - redirige a la página de video */}
            <Route 
              path="/reel/:videoId" 
              element={
                <UniversalRoute>
                  <VideoPlayerPage />
                </UniversalRoute>
              } 
            />

            {/* =================== RUTAS PROTEGIDAS - CON MOBILELAYOUT =================== */}
            
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

            {/* ✅ REELS FULLSCREEN - SIN MOBILELAYOUT (Sin Header) */}
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

            {/* RUTAS NUEVAS CON PLACEHOLDERS */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <MobileLayoutWrapper>
                    <PlaceholderPage 
                      title="Mi Perfil" 
                      description="Gestiona tu perfil y ve tu actividad en RADEISAN" 
                    />
                  </MobileLayoutWrapper>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/marketplace" 
              element={
                <ProtectedRoute>
                  <MobileLayoutWrapper>
                    <PlaceholderPage 
                      title="Marketplace" 
                      description="Descubre negocios locales y oportunidades comerciales" 
                    />
                  </MobileLayoutWrapper>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/rewards" 
              element={
                <ProtectedRoute>
                  <MobileLayoutWrapper>
                    <PlaceholderPage 
                      title="Recompensas" 
                      description="Canjea tus puntos por increíbles premios" 
                    />
                  </MobileLayoutWrapper>
                </ProtectedRoute>
              } 
            />

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

            {/* =================== REDIRECTS =================== */}
            
            <Route path="/create" element={<Navigate to="/upload" replace />} />
            <Route path="/home" element={<Navigate to="/dashboard" replace />} />
            <Route path="/feed" element={<Navigate to="/dashboard" replace />} />
            <Route path="/watch/:videoId" element={<Navigate to="/video/:videoId" replace />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
