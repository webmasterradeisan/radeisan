// src/components/MissionCompletedModal.jsx
import React from 'react';
import AppIcon from './AppIcon'; // Asegúrate de tener este componente o usa lucide-react
import Button from './ui/Button';

const MissionCompletedModal = ({ isOpen, points, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl transform scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        
        {/* Efecto de fondo (Brillo) */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-50 to-transparent opacity-50 pointer-events-none"></div>

        {/* Icono Animado */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner animate-bounce">
          <AppIcon name="CheckCircle" className="w-10 h-10 text-green-600" />
        </div>

        <h2 className="text-2xl font-black text-gray-800 mb-2">¡MISIÓN CUMPLIDA!</h2>
        <p className="text-gray-500 mb-6">
          Has completado el objetivo de hoy.
        </p>

        {/* Tarjeta de Puntos */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-700 font-bold uppercase tracking-wider mb-1">Recompensa</p>
          <div className="flex items-center justify-center gap-2">
             <AppIcon name="Gift" className="w-6 h-6 text-orange-500 animate-pulse" />
             <span className="text-4xl font-black text-orange-500">{points}</span>
             <span className="text-lg font-bold text-orange-400">PTS</span>
          </div>
        </div>

        {/* Botón de Acción - ESTE ES EL GATILLO DE RECARGA */}
        <Button 
          onClick={onClose} 
          className="w-full py-4 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform transition hover:-translate-y-1"
        >
          ¡RECLAMAR PUNTOS!
        </Button>
      </div>
    </div>
  );
};

export default MissionCompletedModal;
