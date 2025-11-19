// src/components/notifications/GiftNotificationContainer.jsx
import React from 'react';
import { useGiftNotifications } from '../../contexts/GiftNotificationContext'; // ✅ Importa el nuevo contexto
import { X, Gift, Star } from 'lucide-react';

// Efecto Confeti (CSS Puro)
const Confetti = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: '1s'
        }}
      />
    ))}
  </div>
);

const GiftNotificationContainer = () => {
  const { latestGift, closeGiftModal } = useGiftNotifications();

  if (!latestGift) return null;

  const { data } = latestGift; // data trae: gift_name, sender_name, gift_icon, points_received

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full relative overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-300 border-4 border-yellow-400">
        
        {/* Fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-purple-50 opacity-50"></div>
        <Confetti />

        {/* Botón Cerrar */}
        <button 
          onClick={closeGiftModal}
          className="absolute top-3 right-3 p-1.5 bg-black/5 hover:bg-black/10 rounded-full transition-colors z-20"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="relative z-10 p-8 text-center flex flex-col items-center">
          
          {/* Título */}
          <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider shadow-sm">
            ¡Sorpresa!
          </div>

          {/* Imagen del Regalo */}
          <div className="w-32 h-32 mb-4 relative">
             <div className="absolute inset-0 bg-yellow-200 rounded-full blur-xl opacity-40 animate-pulse"></div>
             <img 
               src={data.gift_icon || "https://cdn-icons-png.flaticon.com/512/4213/4213958.png"} 
               alt="Regalo" 
               className="w-full h-full object-contain drop-shadow-xl animate-bounce-slow relative z-10" 
             />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">¡Te enviaron un regalo!</h2>
          
          <p className="text-gray-600 mb-6 text-sm">
            <span className="font-bold text-pink-600 text-base">@{data.sender_name}</span> te envió <br/>
            <span className="font-bold text-gray-800 text-lg">"{data.gift_name}"</span>
          </p>

          {/* Valor en Puntos */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-pink-200 flex items-center gap-2 transform hover:scale-105 transition-transform cursor-default">
            <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
            <span>+{data.points_received} Puntos</span>
          </div>
          
          <button 
            onClick={closeGiftModal}
            className="mt-6 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Guardar en mi balance
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftNotificationContainer;
