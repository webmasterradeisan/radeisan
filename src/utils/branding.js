// src/utils/branding.js
/**
 * Aplica la configuración de branding al DOM (variables CSS, favicon, título).
 * @param {object} brandingConfig - El objeto de configuración de branding.
 */
export const applyBrandingToDOM = (brandingConfig) => {
    if (!brandingConfig) return;

    const root = document.documentElement;

    // 1. Aplicar colores como variables CSS
    if (brandingConfig.colors) {
        Object.entries(brandingConfig.colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
    }

    // 2. Aplicar tipografía
    if (brandingConfig.typography) {
        root.style.setProperty('--font-family', brandingConfig.typography.fontFamily);
        root.style.setProperty('--heading-font', brandingConfig.typography.headingFont);
    }
    
    // 3. Aplicar favicon
    if (brandingConfig.logo && brandingConfig.logo.favicon) {
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            // Crear el elemento si no existe (aunque debería)
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = brandingConfig.logo.favicon;
    }

    // 4. Aplicar título
    if (brandingConfig.texts && brandingConfig.texts.appName) {
        document.title = brandingConfig.texts.appName;
    }
};

/**
 * Configuración de branding por defecto para usar si la carga falla.
 */
export const DEFAULT_BRANDING_FALLBACK = {
    // Definiciones mínimas necesarias para evitar errores
    logo: { favicon: '' },
    texts: { appName: 'Radeisan' },
    colors: {
        primary: '#3B82F6', 
        secondary: '#8B5CF6',
        accent: '#10B981',
        background: '#FFFFFF',
        foreground: '#1F2937',
        muted: '#6B7280',
        border: '#E5E7EB'
    },
    typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingFont: 'Inter, system-ui, sans-serif',
    },
};
