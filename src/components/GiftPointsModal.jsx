// src/components/GiftPointsModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext'; 
// Asumimos que existe un contexto de puntos para obtener y actualizar el saldo.
import { usePoints } from '../contexts/PointsContext'; 
import { giftPoints } from '../services/pointsService'; 
import AppIcon from './AppIcon'; 
import Button from './ui/Button'; // Asumimos que existe este componente

// Montos sugeridos
const GIFT_AMOUNTS = [10, 50, 100, 500];

const GiftPointsModal = ({ 
    isOpen, 
    onClose, 
    receiverId, 
    receiverUsername, 
    contentId, 
    contentType, 
    onSuccess 
}) => {
    const { user } = useAuth();
    // Usamos usePoints para obtener el saldo actual y actualizarlo.
    const { points, refreshPoints } = usePoints(); 
    
    const [amount, setAmount] = useState(GIFT_AMOUNTS[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    const isGiftingToSelf = user?.id === receiverId;
    const senderFreePoints = points?.free || 0;

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setSuccessMessage(null);
            // Asegurarse de que el saldo del usuario esté actualizado
            if (user) {
                refreshPoints(); 
            }
            // Si el monto actual es mayor que el saldo, resetear al monto más bajo
            if (amount > senderFreePoints) {
                 setAmount(GIFT_AMOUNTS[0]);
            }
        }
    }, [isOpen, user, refreshPoints]);

    const handleGift = useCallback(async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!user || !receiverId || !contentId) {
            setError('Debes iniciar sesión y el contenido debe ser válido.');
            return;
        }

        if (isGiftingToSelf) {
            setError('❌ No puedes regalar puntos a tu propio contenido.');
            return;
        }

        if (amount <= 0 || amount % 1 !== 0) {
            setError('El monto debe ser un número entero positivo.');
            return;
        }
        
        if (amount > senderFreePoints) {
            setError(`¡Saldo insuficiente! Solo tienes ${senderFreePoints} puntos.`);
            return;
        }

        setLoading(true);

        try {
            const result = await giftPoints(
                user.id,
                receiverId,
                amount,
                contentType,
                contentId
            );

            if (result.success) {
                // Actualizar contexto de puntos con el nuevo saldo del emisor
                refreshPoints(); 
                
                setSuccessMessage(`✅ ¡${amount} puntos enviados a @${receiverUsername || 'el creador'}!`);
                
                // Llamar al callback de éxito si se proporciona
                if (onSuccess) {
                    onSuccess(amount);
                }
                
                // Cerrar el modal después de un tiempo
                setTimeout(onClose, 2500); 

            } else {
                // El RPC devuelve un error (ej: "Saldo insuficiente" si la validación falla a nivel de DB)
                setError(`❌ Error de transacción: ${result.message}`);
            }

        } catch (err) {
            console.error('Error al regalar puntos:', err);
            setError('💥 Error inesperado en la transacción.');
        } finally {
            setLoading(false);
        }
    }, [user, receiverId, amount, contentId, contentType, senderFreePoints, isGiftingToSelf, onClose, onSuccess, receiverUsername, refreshPoints]);


    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-card rounded-xl max-w-sm w-full p-6 shadow-2xl transition-all transform duration-300"
                onClick={(e) => e.stopPropagation()} // Previene el cierre al hacer clic dentro
            >
                <div className="flex items-start justify-between mb-4 border-b pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                             {/* Icono de Regalo Grande */}
                            <AppIcon name="Gift" className="w-5 h-5 text-yellow-600 fill-current" /> 
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Regalar Puntos</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
                    >
                        <AppIcon name="X" className="w-5 h-5" />
                    </button>
                </div>

                {successMessage ? (
                    <div className="text-center py-6">
                        <AppIcon name="CheckCircle" className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-green-600">{successMessage}</p>
                    </div>
                ) : (
                    <form onSubmit={handleGift} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Envía puntos a **@{receiverUsername}** por su excelente contenido.
                            Tus puntos gratis disponibles: <span className="font-bold text-primary">{senderFreePoints}</span>
                        </p>
                        
                        {/* Selector de Monto */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Seleccionar Monto:</label>
                            <div className="grid grid-cols-4 gap-2">
                                {GIFT_AMOUNTS.map(a => (
                                    <button
                                        key={a}
                                        type="button"
                                        onClick={() => setAmount(a)}
                                        className={`
                                            px-3 py-2 rounded-lg font-semibold transition-colors text-sm
                                            ${amount === a 
                                                ? 'bg-primary text-white shadow-md' 
                                                : 'bg-muted text-foreground hover:bg-primary/10'
                                            }
                                        `}
                                    >
                                        {a} Pts
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={amount}
                                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                                placeholder="Otro monto"
                                className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-primary focus:border-primary text-sm"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700 flex items-center gap-2">
                                <AppIcon name="AlertTriangle" className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            disabled={loading || amount <= 0 || amount > senderFreePoints || isGiftingToSelf}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <AppIcon name="Loader2" className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <span className="text-lg font-extrabold mr-0.5">R</span>
                                    <AppIcon name="Gift" className="w-4 h-4 fill-current" />
                                </>
                            )}
                            {loading ? 'Enviando...' : `Regalar ${amount} Puntos`}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground pt-2">
                            La transacción es final y los puntos se deducirán de tu saldo gratis.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default GiftPointsModal;
