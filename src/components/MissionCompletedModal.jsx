// src/components/MissionCompletedModal.jsx
import React from 'react';
import AppIcon from './AppIcon'; 
import Button from './ui/Button';

const MissionCompletedModal = ({ isOpen, points, onClose }) => {
  // Si no está abierto, no renderiza nada
  if (!isOpen) return null;

  return (
    // 1. FONDO OSCURO Y Z-INDEX MÁXIMO (Para tapar todo lo demás)
    <div 
      className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose} // Cierra al hacer clic en el fondo
    >
      {/* 2. TARJETA PRINCIPAL (Efecto Neon/Glow) */}
      <div 
        className="relative w-full max-w-sm bg-gray-900 rounded-2xl p-1 shadow-2xl transform scale-100 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()} // Evita cierre accidental
      >
        
        {/* BORDE BRILLANTE ANIMADO (El efecto de regalo) */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl opacity-75 blur-md animate-pulse"></div>

        {/* CONTENIDO INTERNO (Fondo Negro) */}
        <div className="relative bg-gray-950 rounded-xl p-6 text-center border border-gray-800 h-full flex flex-col items-center">

          {/* Botón Cerrar (X) */}
          <button 
            onClick={onClose} 
            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors p-1"
          >
            <AppIcon name="X" size={20} />
          </button>

          {/* ICONO CENTRAL (Trofeo o Regalo Gigante) */}
          <div className="mb-5 relative mt-2">
            {/* Luz detrás del icono */}
            <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 rounded-full"></div>
            <div className="relative z-10 animate-bounce">
                <AppIcon 
                    name="Trophy" 
                    size={64} 
                    className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" 
                />
            </div>
          </div>

          {/* TÍTULO IMPACTANTE */}
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-500 mb-2 uppercase tracking-wider">
            ¡MISIÓN CUMPLIDA!
          </h2>

          <p className="text-gray-400 text-sm mb-6 font-medium">
            Has completado el objetivo diario.
          </p>

          {/* CAJA DE RECOMPENSA (Estilo Gaming) */}
          <div className="bg-gray-900/80 border border-yellow-500/30 rounded-xl p-4 mb-6 w-full flex items-center justify-between px-6 shadow-inner">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <AppIcon name="Gift" className="text-yellow-500" size={24} />
                 </div>
                 <div className="text-left">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">PREMIO</p>
                    <p className="text-gray-200 text-xs font-medium">Puntos Gratis</p>
                 </div>
             </div>
             <div className="text-right">
                <span className="text-3xl font-black text-white leading-none drop-shadow-md">+{points}</span>
             </div>
          </div>

          {/* BOTÓN DE ACCIÓN */}
          <Button 
            onClick={onClose} 
            className="w-full py-3.5 text-base font-bold text-black bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 shadow-[0_0_20px_rgba(234,179,8,0.2)] border-none transition-all hover:scale-[1.02]"
          >
            RECLAMAR AHORA
          </Button>

        </div>
      </div>
    </div>
  );
};

export default MissionCompletedModal;
