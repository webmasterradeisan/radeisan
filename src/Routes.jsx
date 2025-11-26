// src/Routes.jsx - FINAL VERSION CON PERSISTENCIA DE BRANDING Y LÓGICA PWA
import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate, Link } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";
import { PointsProvider } from "contexts/PointsContext";
import { NotificationProvider } from "contexts/NotificationContext"; 
import NotificationContainer from "components/notifications/NotificationContainer"; 

// ✅ CONTEXTO Y CONTENEDOR DE REGALOS
import { GiftNotificationProvider } from "contexts/GiftNotificationContext";
import GiftNotificationContainer from "components/notifications/GiftNotificationContainer";

// ✅ NUEVO: CONTENEDOR DE NOTIFICACIONES DE MISIONES (FIX VISUAL)
import MissionNotificationContainer from "components/notifications/MissionNotificationContainer";

// SISTEMA ORIGINAL MANTENIDO
import { ProtectedRoute, PublicRoute, UniversalRoute } from "components/ProtectedRoute";

// MOBILE LAYOUT PARA APLICAR GRADUALMENTE
import MobileLayout from "components/ui/MobileLayout";

// ==================================================================
// ✅ IMPORTACIÓN DE LÓGICA GLOBAL DE BRANDING Y SUPABASE
// ==================================================================
// Asegúrate de que esta ruta sea correcta para tu proyecto
import { supabase } from './lib/supabase'; 
// ✅ CORRECCIÓN: Importamos DEFAULT_BRANDING_FALLBACK y lo renombramos a DEFAULT_BRANDING
import { applyBrandingToDOM, DEFAULT_BRANDING_FALLBACK as DEFAULT_BRANDING } from './utils/branding';
// ==================================================================

// ===============================
// ✅ NUEVO: CONTEXTO PWA
// ===============================
/**
 * Proporciona el objeto de evento PWA diferido para disparar la instalación.
 */
const InstallPromptContext = createContext(null);
export const useInstallPrompt = () => useContext(InstallPromptContext);

// ===============================
// PÁGINAS DE APLICACIÓN
// ===============================
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import VideoUploadStudio from './pages/video-upload-studio';
import VideoEditStudio from './pages/VideoEditStudio';
import VideoPlayerPage from './pages/VideoPlayerPage';
import ReelsPage from './pages/reels';
import NotFound from "pages/NotFound";

// ✅ PÁGINAS REALES DE USUARIO
import UserProfileSettings from './pages/user-profile-settings';
import BusinessMarketplace from './pages/business-marketplace';
import PointsRewardsStore from './pages/points-rewards-store';

// ✅ NUEVO - TIENDA DE PRODUCTOS FÍSICOS
import ProductStorePage from './pages/product-store';

// ✅ NUEVO - PERFIL PÚBLICO
import PublicProfilePage from './pages/PublicProfilePage';

// ✅ CORRECCIÓN 1: Importar componente de subida de fotos
import PhotoUploadStudio from './pages/photo-upload-studio'; 

// ✅ NUEVO - SISTEMA DE COMPRA DE PUNTOS PREMIUM
import PurchasePointsPage from './pages/PurchasePointsPage';
import PurchaseSuccess from './pages/purchase-points/PurchaseSuccess';
import PurchaseFailure from './pages/purchase-points/PurchaseFailure';
import PurchasePending from './pages/purchase-points/PurchasePending';

// ===============================
// COMPONENTES DEL PANEL ADMIN
// ===============================
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import AdminLayout from './components/admin/AdminLayout';

// ✅ PÁGINAS DE ADMINISTRACIÓN - TODAS REALES
import AdminDashboard from './pages/admin-dashboard';
import UserManagement from './pages/admin-users/UserManagement';
import CategoryManagement from './pages/admin-categories/CategoryManagement';
import PointsRulesEditor from './pages/admin-points/PointsRulesEditor';
import MissionsManagement from './pages/admin/MissionsManagement';
import RewardsManagement from './pages/admin-rewards/RewardsManagement';
import BrandingSettings from './pages/admin-settings/BrandingSettings';
import ContentModeration from './pages/admin-moderation/ContentModeration';
import AdvancedAnalytics from './pages/admin-analytics/AdvancedAnalytics';

// ✅ NUEVO - GESTIÓN DE PUNTOS PREMIUM (ADMIN)
import PremiumPointsConfig from './pages/admin-premium-points/PremiumPointsConfig';

// ✅ NUEVO - GESTIÓN DE TRANSACCIONES (ADMIN)
import TransactionsManagement from './pages/admin/TransactionsManagement';

// ✅ NUEVO - GESTIÓN DE PEDIDOS DE TIENDA (ADMIN)
import OrdersManagement from './pages/admin-shop/OrdersManagement';

// ✅ NUEVO - GESTIÓN DE INVENTARIO DE TIENDA (ADMIN)
import ShopInventory from './pages/admin-shop/ShopInventory';


// ===============================
// WRAPPER PARA MOBILELAYOUT
// ===============================
/**
 * Wrapper que envuelve el MobileLayout y permite al componente acceder al contexto PWA.
 */
const MobileLayoutWrapper = ({ children }) => (
  // MobileLayout puede usar useInstallPrompt() para el botón de instalación
  <MobileLayout>{children}</MobileLayout>
);

// ===============================
// COMPONENTES AUXILIARES (Mantenidos)
// ===============================
const AuthCallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso No Autorizado
        </h2>
        <p className="text-gray-600 mb-6">
          No tienes permisos suficientes para acceder a esta sección.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  </div>
);

const AdminPlaceholder = ({ title, description, requiredPermission }) => (
  <div className="p-6">
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
          <p className="text-gray-600 mb-6">{description}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Esta sección se implementará próximamente.
            </p>
            {requiredPermission && (
              <p className="text-xs text-blue-600 mt-2 font-mono">
                Permiso requerido: {requiredPermission}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);


// ===============================
// COMPONENTE DE RUTAS PRINCIPAL
// ===============================
const Routes = () => {
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null); // Para el PWA

  // ===============================
  // EFECTO 1: CARGA INICIAL Y PERSISTENCIA DE BRANDING
  // ===============================
  useEffect(() => {
    const loadAndApplyBranding = async () => {
      try {
        console.log('🔍 Routes: Cargando branding inicial y aplicándolo al DOM...');
        const { data, error: fetchError } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'branding_config')
          .single();

        let brandingData = DEFAULT_BRANDING; // Usar el default renombrado
        
        // PGRST116 significa "no rows found", que es esperado si no se ha guardado nada
        if (!fetchError && data && data.setting_value) {
           brandingData = typeof data.setting_value === 'string' 
             ? JSON.parse(data.setting_value)
             : data.setting_value;
        } else if (fetchError && fetchError.code !== 'PGRST116') {
             console.error('❌ Error fetching branding:', fetchError);
        }

        applyBrandingToDOM(brandingData); // ✅ APLICACIÓN GLOBAL (Favicon, Título, CSS Vars)
        setBrandingLoaded(true);

      } catch (err) {
        console.error('❌ Routes: Error crítico al cargar branding, usando defaults.', err);
        applyBrandingToDOM(DEFAULT_BRANDING);
        setBrandingLoaded(true);
      }
    };
    loadAndApplyBranding();
  }, []);

  // ===============================
  // EFECTO 2: GESTIÓN DE PWA INSTALL PROMPT
  // ===============================
  useEffect(() => {
    const handler = (e) => {
        // Previene que el navegador muestre el banner automáticamente
        e.preventDefault();
        // Guarda el evento para poder dispararlo con un botón personalizado
        console.log('🌐 PWA: beforeinstallprompt capturado. Botón de instalación disponible.');
        setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);


  // Mostrar loading mientras el branding es crítico para el render inicial
  if (!brandingLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Preparando la App con tu Marca...</p>
        </div>
      </div>
    );
  }

  return (
    // ✅ WRAPPER DEL CONTEXTO PWA
    <InstallPromptContext.Provider value={deferredPrompt}> 
      <BrowserRouter>
        <AuthProvider>
          <PointsProvider>
            <NotificationProvider>
              {/* ✅ WRAPPER DE REGALOS */}
              <GiftNotificationProvider> 
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

                    {/* =================== RUTAS PROTEGIDAS PRINCIPALES =================== */}

                    {/* DASHBOARD (Feed Principal) - ✅ REAL */}
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

                    {/* REELS - ✅ REAL */}
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

                    {/* VIDEO PLAYER - ✅ REAL */}
                    <Route 
                      path="/video/:videoId" 
                      element={
                        <ProtectedRoute>
                          <MobileLayoutWrapper>
                            <VideoPlayerPage />
                          </MobileLayoutWrapper>
                        </ProtectedRoute>
                      } 
                    />

                    {/* UPLOAD VIDEO - ✅ REAL */}
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

                    {/* UPLOAD PHOTO - ✅ REAL */}
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

                    {/* EDIT VIDEO - ✅ REAL */}
                    <Route 
                      path="/edit/:videoId" 
                      element={
                        <ProtectedRoute>
                          <MobileLayoutWrapper>
                            <VideoEditStudio />
                          </MobileLayoutWrapper>
                        </ProtectedRoute>
                      } 
                    />

                    {/* PERFIL - ✅ REAL (PROPIO) */}
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

                    {/* PERFIL - ✅ REAL (PÚBLICO) */}
                    <Route 
                      path="/profile/:identifier" 
                      element={
                        <ProtectedRoute>
                          <MobileLayoutWrapper>
                            <PublicProfilePage />
                          </MobileLayoutWrapper>
                        </ProtectedRoute>
                      } 
                    />

                    {/* MARKETPLACE - ✅ REAL */}
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

                    {/* 🎁 TIENDA DE RECOMPENSAS - ✅ REAL */}
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

                    {/* 🛍️ NUEVA TIENDA DE PRODUCTOS FÍSICOS - ✅ NUEVO */}
                    <Route 
                      path="/shop" 
                      element={
                        <ProtectedRoute>
                          <MobileLayoutWrapper>
                            <ProductStorePage />
                          </MobileLayoutWrapper>
                        </ProtectedRoute>
                      } 
                    />

                    {/* 💎 COMPRA DE PUNTOS PREMIUM - ✅ REAL */}
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

                    {/* Resultados de compra */}
                    <Route path="/purchase/success" element={<ProtectedRoute><MobileLayoutWrapper><PurchaseSuccess /></MobileLayoutWrapper></ProtectedRoute>} />
                    <Route path="/purchase/failure" element={<ProtectedRoute><MobileLayoutWrapper><PurchaseFailure /></MobileLayoutWrapper></ProtectedRoute>} />
                    <Route path="/purchase/pending" element={<ProtectedRoute><MobileLayoutWrapper><PurchasePending /></MobileLayoutWrapper></ProtectedRoute>} />

                    {/* =================== PLACEHOLDERS TEMPORALES =================== */}

                    <Route path="/explore" element={<ProtectedRoute><MobileLayoutWrapper><PlaceholderPage title="Explorar Contenido" description="Descubre nuevo contenido popular" /></MobileLayoutWrapper></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><MobileLayoutWrapper><PlaceholderPage title="Notificaciones" description="Mantente al día con tu actividad" /></MobileLayoutWrapper></ProtectedRoute>} />
                    <Route path="/saved" element={<ProtectedRoute><MobileLayoutWrapper><PlaceholderPage title="Contenido Guardado" description="Accede a todo el contenido que has guardado" /></MobileLayoutWrapper></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Navigate to="/profile" replace /></ProtectedRoute>} />

                    {/* =================== PANEL DE ADMINISTRACIÓN =================== */}
                    
                    <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="users" element={<ProtectedAdminRoute requiredPermission="manage_users"><UserManagement /></ProtectedAdminRoute>} />
                      <Route path="categories" element={<ProtectedAdminRoute requiredPermission="manage_categories"><CategoryManagement /></ProtectedAdminRoute>} />
                      <Route path="points" element={<ProtectedAdminRoute requiredPermission="manage_points"><PointsRulesEditor /></ProtectedAdminRoute>} />
                      <Route path="premium-points" element={<ProtectedAdminRoute requiredPermission="manage_points"><PremiumPointsConfig /></ProtectedAdminRoute>} />
                      <Route path="transactions" element={<ProtectedAdminRoute requiredPermission="manage_transactions"><TransactionsManagement /></ProtectedAdminRoute>} />
                      <Route path="shop-orders" element={<ProtectedAdminRoute requiredPermission="manage_rewards"><OrdersManagement /></ProtectedAdminRoute>} />
                      <Route path="shop-inventory" element={<ProtectedAdminRoute requiredPermission="manage_rewards"><ShopInventory /></ProtectedAdminRoute>} />
                      <Route path="missions" element={<ProtectedAdminRoute requiredPermission="manage_missions"><MissionsManagement /></ProtectedAdminRoute>} />
                      <Route path="rewards" element={<ProtectedAdminRoute requiredPermission="manage_rewards"><RewardsManagement /></ProtectedAdminRoute>} />
                      <Route path="moderation" element={<ProtectedAdminRoute requiredPermission="moderate_content"><ContentModeration /></ProtectedAdminRoute>} />
                      <Route path="analytics" element={<ProtectedAdminRoute requiredPermission="view_analytics"><AdvancedAnalytics /></ProtectedAdminRoute>} />
                      <Route path="settings" element={<ProtectedAdminRoute requiredPermission="manage_settings"><BrandingSettings /></ProtectedAdminRoute>} />
                      <Route path="logs" element={<ProtectedAdminRoute requiredPermission="view_logs"><AdminPlaceholder title="Logs de Administración" description="Auditoría de acciones administrativas" requiredPermission="view_logs" /></ProtectedAdminRoute>} />
                    </Route>

                    {/* Acceso no autorizado */}
                    <Route path="/unauthorized" element={<UniversalRoute><Unauthorized /></UniversalRoute>} />

                    {/* =================== REDIRECTS & 404 =================== */}
                    
                    <Route path="/create" element={<Navigate to="/upload" replace />} />
                    <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/feed" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/watch/:videoId" element={<Navigate to="/video/:videoId" replace />} />
                    <Route path="/buy-points" element={<Navigate to="/purchase-points" replace />} />
                    <Route path="*" element={<UniversalRoute><NotFound /></UniversalRoute>} />
                    
                  </RouterRoutes>
                </ErrorBoundary>
                
                <NotificationContainer /> 
                
                {/* ✅ RENDERIZADOR DE REGALOS (MODAL SORPRESA) */}
                <GiftNotificationContainer />

                {/* ✅ NUEVO: RENDERIZADOR DE MISIONES (FLOTA SOBRE TODO) */}
                <MissionNotificationContainer /> 
                
              </GiftNotificationProvider>
            </NotificationProvider>
          </PointsProvider>
        </AuthProvider>
      </BrowserRouter>
    </InstallPromptContext.Provider>
  );
};

export default Routes;
