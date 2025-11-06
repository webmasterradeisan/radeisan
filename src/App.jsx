import React from "react";
import Routes from "./Routes";
import { AuthProvider } from './contexts/AuthContext';
import { PointsProvider } from './contexts/PointsContext';

function App() {
  return (
    // 1. AuthProvider debe ser el más externo
    <AuthProvider>
      {/* 2. PointsProvider debe ir dentro, ya que usa useAuth() */}
      <PointsProvider>
        {/* 3. Tus rutas y toda la aplicación van dentro */}
        <Routes />
      </PointsProvider>
    </AuthProvider>
  );
}

export default App;
