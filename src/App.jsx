// src/App.jsx
// ============================================================================
// APP - Componente Principal con Mini-Player Persistente
// ============================================================================
// Integra el contexto global del video player y el mini-player flotante
// El mini-player persiste al navegar entre páginas
// ============================================================================

import React from "react";
import Routes from "./Routes";
import GlobalMiniPlayer from "./components/GlobalMiniPlayer";
import { VideoPlayerProvider } from "./contexts/VideoPlayerContext";

function App() {
  return (
    <VideoPlayerProvider>
      {/* Todas las rutas de la aplicación */}
      <Routes />
      
      {/* Mini-player flotante global - visible en todas las páginas */}
      <GlobalMiniPlayer />
    </VideoPlayerProvider>
  );
}

export default App;
