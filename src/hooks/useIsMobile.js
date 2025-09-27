// src/hooks/useIsMobile.js
import { useState, useEffect } from 'react';

/**
 * 📱 Hook para detectar dispositivos móviles
 * Combina detección por User Agent y ancho de pantalla
 * 
 * @param {number} breakpoint - Ancho máximo para considerar móvil (default: 768px)
 * @returns {boolean} true si es dispositivo móvil
 */
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Detección por User Agent - Dispositivos móviles reales
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /iphone|ipad|ipod|android|blackberry|windows phone|webos/g.test(userAgent);
      
      // Detección por ancho de pantalla - Para DevTools y responsive
      const isMobileScreen = window.innerWidth <= breakpoint;
      
      // Es móvil si cumple cualquiera de las dos condiciones
      const mobile = isMobileUA || isMobileScreen;
      
      console.log('📱 useIsMobile check:', {
        userAgent: navigator.userAgent,
        isMobileUA,
        screenWidth: window.innerWidth,
        isMobileScreen,
        finalResult: mobile
      });
      
      setIsMobile(mobile);
    };

    // Verificar al montar el componente
    checkDevice();

    // Verificar cuando cambia el tamaño de ventana
    // Importante para DevTools y cambios de orientación
    window.addEventListener('resize', checkDevice);
    
    // Cleanup del event listener
    return () => window.removeEventListener('resize', checkDevice);
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;
