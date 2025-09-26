// src/Routes.jsx - VERSIÓN TEMPORAL PARA DEBUGGING
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";
import { ProtectedRoute, PublicRoute, UniversalRoute } from "components/ProtectedRoute";

// ===============================
// PÁGINAS DE APLICACIÓN
// ===============================
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import VideoUploadStudio from './pages/video-upload-studio';
import NotFound from "pages/NotFound";

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
// COMPONENTE DE RUTAS PRINCIPAL - VERSIÓN SIMPLE
// ===============================
const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <RouterRoutes>
            
            {/* Landing Page */}
            <Route 
              path="/" 
              element={
                <UniversalRoute>
                  <LandingPage />
                </UniversalRoute>
              } 
            />
            
            {/* Autenticación */}
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

            {/* Dashboard principal */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <VideoFeedDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Upload */}
            <Route 
              path="/upload" 
              element={
                <ProtectedRoute>
                  <VideoUploadStudio />
                </ProtectedRoute>
              } 
            />

            {/* 404 */}
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
