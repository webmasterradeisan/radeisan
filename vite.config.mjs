// vite.config.mjs - Configuración completa para SPA con routing
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 2000,
  },
  
  plugins: [
    tsconfigPaths(), 
    react(), 
    tagger()
  ],
  
  server: {
    port: 4028,
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: ['.amazonaws.com', '.builtwithrockit.net'],
    // Fallback para desarrollo local
    open: true,
  },

  // CRÍTICO: Configuración para preview (producción local)
  preview: {
    port: 4028,
    host: "0.0.0.0",
    strictPort: false,
    open: true,
  },
});
