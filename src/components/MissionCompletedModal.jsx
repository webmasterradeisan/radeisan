import React from 'react';
// Asegúrate de que estas rutas sean correctas en tu proyecto
import AppIcon from './AppIcon'; 
import Button from './ui/Button';

const MissionCompletedModal = ({ isOpen, points, onClose }) => {
  // 1. Protección básica: Si no debe abrirse, no renderiza nada (DOM vacío)
  if (!isOpen) return null;

  return (
    // 2. CAPA SUPERIOR ABSOLUTA (Z-INDEX MÁXIMO)
    // Usamos z-[2147483647] para asegurar que esté encima del reproductor de video, header, y todo lo demás.
    <div 
      className="fixed inset-0 bg-black/90 z-[2147483647] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm"
      onClick={onClose} // Permite cerrar al hacer clic en lo negro
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} // Refuerzo de posición
    >
      {/* CONTENEDOR DEL MODAL */}
      <div 
        className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl transform scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Evita que el clic dentro cierre el modal
      >
        
        {/* Efecto de luz de fondo */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-50 to-transparent opacity-50 pointer-events-none"></div>

        {/* Icono Animado */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner animate-bounce relative z-10">
          <AppIcon name="CheckCircle" className="w-10 h-10 text-green-600" />
        </div>

        {/* Textos */}
        <h2 className="text-2xl font-black text-gray-800 mb-2 relative z-10">¡MISIÓN CUMPLIDA!</h2>
        <p className="text-gray-500 mb-6 relative z-10">
          Has completado el objetivo de hoy.
        </p>

        {/* Tarjeta de Puntos */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 relative z-10 transform hover:scale-105 transition-transform duration-300">
          <p className="text-xs text-yellow-700 font-bold uppercase tracking-wider mb-1">Recompensa</p>
          <div className="flex items-center justify-center gap-2">
             <AppIcon name="Gift" className="w-6 h-6 text-orange-500 animate-pulse" />
             <span className="text-4xl font-black text-orange-500">{points}</span>
             <span className="text-lg font-bold text-orange-400">PTS</span>
          </div>
        </div>

        {/* Botón de Acción - EL GATILLO DE RECARGA */}
        <Button 
          onClick={onClose} 
          className="w-full py-4 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform transition hover:-translate-y-1 relative z-10"
        >
          ¡RECLAMAR PUNTOS!
        </Button>
      </div>
    </div>
  );
};

export default MissionCompletedModal;
