// src/Routes.jsx
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";
import { ProtectedRoute, PublicRoute, UniversalRoute } from "components/ProtectedRoute";

// ===============================
// PÁGINAS PÚBLICAS
// ===============================

// Landing Page profesional
import LandingPage from './pages/LandingPage';

// Páginas de información pública
const AboutPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Sobre Radeisan</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-4">
          Radeisan es una plataforma social innovadora que conecta creadores de contenido 
          y empresas a través de videos engaging y un sistema de recompensas.
        </p>
        <p className="text-muted-foreground">
          Nuestra misión es empoderar a los creadores mientras ayudamos a las empresas 
          a conectar con su audiencia de manera auténtica.
        </p>
      </div>
    </div>
  </div>
);

const FeaturesPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Características</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">🎥 Feed de Videos</h3>
          <p className="text-muted-foreground">Descubre contenido increíble y gana puntos viendo videos</p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">🏪 Marketplace</h3>
          <p className="text-muted-foreground">Conecta con empresas y descubre productos únicos</p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">🎁 Sistema de Recompensas</h3>
          <p className="text-muted-foreground">Canjea tus puntos por premios y beneficios exclusivos</p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">💼 Perfil de Negocio</h3>
          <p className="text-muted-foreground">Herramientas profesionales para empresas</p>
        </div>
      </div>
    </div>
  </div>
);

const TermsPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Términos y Condiciones</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p className="text-muted-foreground">
          Los términos y condiciones de Radeisan serán implementados próximamente.
          Por ahora, al usar la plataforma aceptas nuestras políticas de uso responsable.
        </p>
      </div>
    </div>
  </div>
);

const PrivacyPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Política de Privacidad</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p className="text-muted-foreground">
          La política de privacidad de Radeisan será implementada próximamente.
          Nos comprometemos a proteger tu información personal y datos.
        </p>
      </div>
    </div>
  </div>
);

// ===============================
// PÁGINAS DE AUTENTICACIÓN  
// ===============================
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Auth Callback para OAuth
const AuthCallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">Procesando autenticación...</p>
    </div>
  </div>
);

// ===============================
// HERRAMIENTAS DE DEBUGGING (TEMPORAL)
// ===============================
import SupabaseDebugChecker from './components/SupabaseDebugChecker';

// ===============================
// PÁGINAS PROTEGIDAS (APLICACIÓN)
// ===============================
import VideoFeedDashboard from './pages/video-feed-dashboard';
import VideoUploadStudio from './pages/video-upload-studio';
import BusinessMarketplace from './pages/business-marketplace';
import PointsRewardsStore from './pages/points-rewards-store';
import UserProfileSettings from './pages/user-profile-settings';
import BusinessProfileManagement from './pages/business-profile-management';

// ===============================
// OTRAS PÁGINAS
// ===============================
import NotFound from "pages/NotFound";

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
            
            {/* =================== PÁGINAS PÚBLICAS =================== */}
            
            {/* Landing Page */}
            <Route 
              path="/" 
              element={
                <UniversalRoute>
                  <LandingPage />
                </UniversalRoute>
              } 
            />
            
            {/* Páginas de información */}
            <Route 
              path="/about" 
              element={
                <UniversalRoute>
                  <AboutPage />
                </UniversalRoute>
              } 
            />
            <Route 
              path="/features" 
              element={
                <UniversalRoute>
                  <FeaturesPage />
                </UniversalRoute>
              } 
            />
            <Route 
              path="/terms" 
              element={
                <UniversalRoute>
                  <TermsPage />
                </UniversalRoute>
              } 
            />
            <Route 
              path="/privacy" 
              element={
                <UniversalRoute>
                  <PrivacyPage />
                </UniversalRoute>
              } 
            />

            {/* =================== AUTENTICACIÓN =================== */}
            
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

            {/* =================== HERRAMIENTAS DE DEBUGGING (TEMPORAL) =================== */}
            
            {/* Herramienta de debugging para Supabase */}
            <Route 
              path="/debug" 
              element={
                <UniversalRoute>
                  <SupabaseDebugChecker />
                </UniversalRoute>
              } 
            />

            {/* =================== APLICACIÓN PROTEGIDA =================== */}
            
            {/* Dashboard principal */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <VideoFeedDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Estudio de creación */}
            <Route 
              path="/upload" 
              element={
                <ProtectedRoute>
                  <VideoUploadStudio />
                </ProtectedRoute>
              } 
            />
            
            {/* Marketplace de negocios */}
            <Route 
              path="/marketplace" 
              element={
                <ProtectedRoute>
                  <BusinessMarketplace />
                </ProtectedRoute>
              } 
            />
            
            {/* Tienda de recompensas */}
            <Route 
              path="/rewards" 
              element={
                <ProtectedRoute>
                  <PointsRewardsStore />
                </ProtectedRoute>
              } 
            />
            
            {/* Perfil de usuario */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <UserProfileSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Gestión de negocio */}
            <Route 
              path="/business" 
              element={
                <ProtectedRoute>
                  <BusinessProfileManagement />
                </ProtectedRoute>
              } 
            />

            {/* =================== REDIRECCIONES DE URLs ANTIGUAS =================== */}
            
            {/* Redirigir URLs antiguas a nuevas */}
            <Route 
              path="/video-feed-dashboard" 
              element={<Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/video-upload-studio" 
              element={<Navigate to="/upload" replace />} 
            />
            <Route 
              path="/business-marketplace" 
              element={<Navigate to="/marketplace" replace />} 
            />
            <Route 
              path="/points-rewards-store" 
              element={<Navigate to="/rewards" replace />} 
            />
            <Route 
              path="/user-profile-settings" 
              element={<Navigate to="/profile" replace />} 
            />
            <Route 
              path="/business-profile-management" 
              element={<Navigate to="/business" replace />} 
            />

            {/* =================== 404 - PÁGINA NO ENCONTRADA =================== */}
            
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
