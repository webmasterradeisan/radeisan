// src/Routes.jsx - VERSIÓN COMPLETA CON MOBILELAYOUT
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";

// ===============================
// COMPONENTES MÓVILES ACTUALIZADOS
// ===============================
import { 
  MobileProtectedRoute, 
  MobilePublicRoute, 
  MobileUniversalRoute 
} from "components/ui/MobileLayout";

// ===============================
// PÁGINAS DE APLICACIÓN
// ===============================

// Páginas públicas
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Páginas principales
import VideoFeedDashboard from './pages/video-feed-dashboard';
import VideoUploadStudio from './pages/video-upload-studio';

// Error y páginas especiales
import NotFound from "pages/NotFound";

// ===============================
// COMPONENTES AUXILIARES
// ===============================

// Auth Callback para OAuth
const AuthCallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">Procesando autenticación...</p>
    </div>
  </div>
);

// Placeholder para páginas no implementadas
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

// Crear componentes placeholder para páginas faltantes
const ReelsPageComponent = ReelsPage || (() => (
  <PlaceholderPage 
    title="Reels" 
    description="Explora videos verticales increíbles en formato fullscreen" 
  />
));

const ProfilePageComponent = ProfilePage || (() => (
  <PlaceholderPage 
    title="Mi Perfil" 
    description="Gestiona tu perfil y ve tu actividad en RADEISAN" 
  />
));

const MarketplacePageComponent = MarketplacePage || (() => (
  <PlaceholderPage 
    title="Marketplace" 
    description="Descubre negocios locales y oportunidades comerciales" 
  />
));

const RewardsPageComponent = RewardsPage || (() => (
  <PlaceholderPage 
    title="Recompensas" 
    description="Canjea tus puntos por increíbles premios" 
  />
));

const PhotoFeedPageComponent = PhotoFeedPage || (() => (
  <PlaceholderPage 
    title="Galería de Fotos" 
    description="Explora y comparte fotografías con la comunidad" 
  />
));

const SavedPageComponent = SavedPage || (() => (
  <PlaceholderPage 
    title="Contenido Guardado" 
    description="Accede a todo el contenido que has guardado" 
  />
));

const NotificationsPageComponent = NotificationsPage || (() => (
  <PlaceholderPage 
    title="Notificaciones" 
    description="Mantente al día con toda tu actividad reciente" 
  />
));

const AnalyticsPageComponent = AnalyticsPage || (() => (
  <PlaceholderPage 
    title="Estadísticas" 
    description="Analiza el rendimiento de tu contenido" 
  />
));

const HelpPageComponent = HelpPage || (() => (
  <PlaceholderPage 
    title="Centro de Ayuda" 
    description="Encuentra respuestas a tus preguntas frecuentes" 
  />
));

const SettingsPageComponent = SettingsPage || (() => (
  <PlaceholderPage 
    title="Configuración" 
    description="Personaliza tu experiencia en RADEISAN" 
  />
));

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
            
            {/* ===============================
                RUTAS PÚBLICAS
            =============================== */}
            
            {/* Landing Page */}
            <Route 
              path="/" 
              element={
                <MobileUniversalRoute>
                  <LandingPage />
                </MobileUniversalRoute>
              } 
            />
            
            {/* Autenticación */}
            <Route 
              path="/login" 
              element={
                <MobilePublicRoute>
                  <Login />
                </MobilePublicRoute>
              } 
            />
            
            <Route 
              path="/register" 
              element={
                <MobilePublicRoute>
                  <Register />
                </MobilePublicRoute>
              } 
            />
            
            <Route 
              path="/auth/callback" 
              element={
                <MobileUniversalRoute>
                  <AuthCallback />
                </MobileUniversalRoute>
              } 
            />

            {/* ===============================
                RUTAS PRINCIPALES PROTEGIDAS
            =============================== */}
            
            {/* Dashboard - Página principal con feed */}
            <Route 
              path="/dashboard" 
              element={
                <MobileProtectedRoute>
                  <VideoFeedDashboard />
                </MobileProtectedRoute>
              } 
            />

            {/* Reels - Sección fullscreen para videos verticales */}
            <Route 
              path="/reels" 
              element={
                <MobileProtectedRoute>
                  <ReelsPageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* Reel individual - Para enlaces directos */}
            <Route 
              path="/reel/:id" 
              element={
                <MobileProtectedRoute>
                  <ReelsPageComponent />
                </MobileProtectedRoute>
              } 
            />
            
            {/* Upload - Estudio de creación */}
            <Route 
              path="/upload" 
              element={
                <MobileProtectedRoute>
                  <VideoUploadStudio />
                </MobileProtectedRoute>
              } 
            />

            {/* Crear - Alias para upload */}
            <Route 
              path="/create" 
              element={
                <Navigate to="/upload" replace />
              } 
            />

            {/* ===============================
                RUTAS DE PERFIL Y USUARIO
            =============================== */}
            
            {/* Perfil del usuario */}
            <Route 
              path="/profile" 
              element={
                <MobileProtectedRoute>
                  <ProfilePageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* Perfil de otro usuario */}
            <Route 
              path="/user/:username" 
              element={
                <MobileProtectedRoute>
                  <ProfilePageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* ===============================
                RUTAS DE FUNCIONALIDADES
            =============================== */}
            
            {/* Marketplace */}
            <Route 
              path="/marketplace" 
              element={
                <MobileProtectedRoute>
                  <MarketplacePageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* Recompensas */}
            <Route 
              path="/rewards" 
              element={
                <MobileProtectedRoute>
                  <RewardsPageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* Galería de fotos */}
            <Route 
              path="/photo-feed" 
              element={
                <MobileProtectedRoute>
                  <PhotoFeedPageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* Contenido guardado */}
            <Route 
              path="/saved" 
              element={
                <MobileProtectedRoute>
                  <SavedPageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* ===============================
                RUTAS DE GESTIÓN
            =============================== */}
            
            {/* Notificaciones */}
            <Route 
              path="/notifications" 
              element={
                <MobileProtectedRoute>
                  <NotificationsPageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* Estadísticas */}
            <Route 
              path="/analytics" 
              element={
                <MobileProtectedRoute>
                  <AnalyticsPageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* Centro de ayuda */}
            <Route 
              path="/help" 
              element={
                <MobileProtectedRoute>
                  <HelpPageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* Configuración */}
            <Route 
              path="/settings" 
              element={
                <MobileProtectedRoute>
                  <SettingsPageComponent />
                </MobileProtectedRoute>
              } 
            />

            {/* ===============================
                REDIRECTS Y COMPATIBILIDAD
            =============================== */}
            
            {/* Redirect de home a dashboard para usuarios autenticados */}
            <Route 
              path="/home" 
              element={
                <Navigate to="/dashboard" replace />
              } 
            />

            {/* Redirect de feed a dashboard */}
            <Route 
              path="/feed" 
              element={
                <Navigate to="/dashboard" replace />
              } 
            />

            {/* Redirect de shorts a reels */}
            <Route 
              path="/shorts" 
              element={
                <Navigate to="/reels" replace />
              } 
            />

            {/* ===============================
                ERROR HANDLING
            =============================== */}
            
            {/* 404 - Página no encontrada */}
            <Route 
              path="*" 
              element={
                <MobileUniversalRoute>
                  <NotFound />
                </MobileUniversalRoute>
              } 
            />
            
          </RouterRoutes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
