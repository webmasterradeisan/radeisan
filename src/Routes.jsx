// src/Routes.jsx
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";

// ===============================
// NUEVOS COMPONENTES CON MOBILE LAYOUT INTEGRADO
// ===============================
import { 
  MobileProtectedRoute as ProtectedRoute,
  MobilePublicRoute as PublicRoute, 
  MobileUniversalRoute as UniversalRoute 
} from "components/ui/MobileLayout";

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
          <h3 className="font-semibold text-foreground mb-2">📸 Galería de Fotos</h3>
          <p className="text-muted-foreground">Comparte y descubre momentos increíbles en imágenes</p>
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
// NUEVO: Sistema de Fotos
import PhotoUploadStudio from './pages/photo-upload-studio';

import BusinessMarketplace from './pages/business-marketplace';
import PointsRewardsStore from './pages/points-rewards-store';
import UserProfileSettings from './pages/user-profile-settings';
import BusinessProfileManagement from './pages/business-profile-management';

// ===============================
// NUEVA PÁGINA DE REELS FULLSCREEN
// ===============================
const ReelsPage = () => {
  // Esta página será específicamente para la sección de reels fullscreen
  // Similar a VideoFeedDashboard pero forzando layout='reels' y orientation='vertical'
  const ReelsPageComponent = () => {
    return (
      <VideoFeedDashboard 
        forceLayout="reels" 
        forceOrientation="vertical"
        hideHeader={true}
        fullscreen={true}
      />
    );
  };

  return (
    <ProtectedRoute>
      <ReelsPageComponent />
    </ProtectedRoute>
  );
};

// ===============================
// PÁGINAS TEMPORALES PARA RUTAS DEL BOTTOM NAVIGATION
// ===============================

// Página de contenido guardado
const SavedContentPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-4">Contenido Guardado</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Aquí encontrarás todos los videos y fotos que has guardado.
      </p>
      <p className="text-sm text-muted-foreground">
        Próximamente implementaremos esta funcionalidad.
      </p>
    </div>
  </div>
);

// Página de notificaciones
const NotificationsPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-6a4 4 0 118 0v6z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-4">Notificaciones</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Mantente al día con toda la actividad de tu cuenta.
      </p>
      <p className="text-sm text-muted-foreground">
        Próximamente implementaremos el sistema de notificaciones.
      </p>
    </div>
  </div>
);

// Página de estadísticas/analytics
const AnalyticsPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-4">Estadísticas</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Analiza el rendimiento de tu contenido y perfil.
      </p>
      <p className="text-sm text-muted-foreground">
        Dashboard de analytics próximamente disponible.
      </p>
    </div>
  </div>
);

// Página de ayuda
const HelpPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-4">Centro de Ayuda</h1>
      <p className="text-lg text-muted-foreground mb-6">
        ¿Tienes preguntas? Estamos aquí para ayudarte.
      </p>
      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">📧 Contacto</h3>
          <p className="text-sm text-muted-foreground">support@radeisan.com</p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">💬 FAQ</h3>
          <p className="text-sm text-muted-foreground">Preguntas frecuentes próximamente</p>
        </div>
      </div>
    </div>
  </div>
);

// ===============================
// PÁGINAS TEMPORALES PARA SISTEMA DE FOTOS
// ===============================

// Página temporal para Photo Feed (hasta crear la real en Fase 5)
const PhotoFeedDashboard = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-4xl w-full bg-card rounded-lg shadow-elevation-2 p-8 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-4">Feed de Fotos</h1>
      <p className="text-lg text-muted-foreground mb-6">
        El feed de fotos estará disponible próximamente en la Fase 5.
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        Por ahora puedes subir fotos desde el estudio y verlas en tu perfil.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a 
          href="/photo-upload" 
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Subir Fotos
        </a>
        <a 
          href="/profile" 
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Ver Mi Perfil
        </a>
      </div>
    </div>
  </div>
);

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

            {/* =================== NUEVA SECCIÓN REELS FULLSCREEN =================== */}
            
            {/* Página de Reels dedicada */}
            <Route 
              path="/reels" 
              element={<ReelsPage />}
            />
            
            {/* Reel individual con ID */}
            <Route 
              path="/reel/:id" 
              element={<ReelsPage />}
            />
            
            {/* Estudio de creación de videos */}
            <Route 
              path="/upload" 
              element={
                <ProtectedRoute>
                  <VideoUploadStudio />
                </ProtectedRoute>
              } 
            />

            {/* =================== SISTEMA DE FOTOS (EXISTENTE) =================== */}
            
            {/* Estudio de subida de fotos */}
            <Route 
              path="/photo-upload" 
              element={
                <ProtectedRoute>
                  <PhotoUploadStudio />
                </ProtectedRoute>
              } 
            />
            
            {/* Feed de fotos (temporal hasta Fase 5) */}
            <Route 
              path="/photo-feed" 
              element={
                <UniversalRoute>
                  <PhotoFeedDashboard />
                </UniversalRoute>
              } 
            />
            
            {/* Alias para fotos */}
            <Route 
              path="/photos" 
              element={<Navigate to="/photo-feed" replace />} 
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

            {/* =================== RUTAS ADICIONALES PARA BOTTOM NAVIGATION =================== */}
            
            {/* Contenido guardado */}
            <Route 
              path="/saved" 
              element={
                <ProtectedRoute>
                  <SavedContentPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Notificaciones */}
            <Route 
              path="/notifications" 
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Analytics/Estadísticas */}
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Centro de ayuda */}
            <Route 
              path="/help" 
              element={
                <UniversalRoute>
                  <HelpPage />
                </UniversalRoute>
              } 
            />

            {/* Configuración (alias a profile por ahora) */}
            <Route 
              path="/settings" 
              element={<Navigate to="/profile" replace />} 
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
            {/* NUEVO: Redirecciones del sistema de fotos */}
            <Route 
              path="/photo-upload-studio" 
              element={<Navigate to="/photo-upload" replace />} 
            />
            <Route 
              path="/photo-feed-dashboard" 
              element={<Navigate to="/photo-feed" replace />} 
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
