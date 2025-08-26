// src/Routes.jsx
import React from "react";
import { Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import PointsRewardsStore from './pages/points-rewards-store';
import VideoFeedDashboard from './pages/video-feed-dashboard';
import BusinessProfileManagement from './pages/business-profile-management';
import BusinessMarketplace from './pages/business-marketplace';
import UserProfileSettings from './pages/user-profile-settings';
import VideoUploadStudio from './pages/video-upload-studio';
import UserLogin from './pages/user-login'; // Si tienes la página de login

const Routes = () => {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        <Route path="/" element={<BusinessMarketplace />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/points-rewards-store" element={<PointsRewardsStore />} />
        <Route path="/video-feed-dashboard" element={<VideoFeedDashboard />} />
        <Route path="/business-profile-management" element={<BusinessProfileManagement />} />
        <Route path="/business-marketplace" element={<BusinessMarketplace />} />
        <Route path="/user-profile-settings" element={<UserProfileSettings />} />
        <Route path="/video-upload-studio" element={<VideoUploadStudio />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
    </ErrorBoundary>
  );
};

export default Routes;
