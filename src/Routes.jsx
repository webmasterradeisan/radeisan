import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import { AuthProvider } from "contexts/AuthContext";
import NotFound from "pages/NotFound";
import PointsRewardsStore from './pages/points-rewards-store';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import BusinessProfileManagement from './pages/business-profile-management';
import BusinessMarketplace from './pages/business-marketplace';
import UserProfileSettings from './pages/user-profile-settings';
import VideoUploadStudio from './pages/video-upload-studio';

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <RouterRoutes>
            {/* Define your route here */}
            <Route path="/" element={<BusinessMarketplace />} />
            <Route path="/points-rewards-store" element={<PointsRewardsStore />} />
            <Route path="/video-feed-dashboard" element={<VideoFeedDashboard />} />
            <Route path="/business-profile-management" element={<BusinessProfileManagement />} />
            <Route path="/business-marketplace" element={<BusinessMarketplace />} />
            <Route path="/user-profile-settings" element={<UserProfileSettings />} />
            <Route path="/video-upload-studio" element={<VideoUploadStudio />} />
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
