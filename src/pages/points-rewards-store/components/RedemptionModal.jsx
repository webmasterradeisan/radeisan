import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Image from '../../../components/AppImage';

const RedemptionModal = ({ 
  reward, 
  userPoints, 
  isOpen, 
  onClose, 
  onConfirm 
}) => {
  const [step, setStep] = useState(1); // 1: Confirmation, 2: Delivery Details, 3: Success
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    specialInstructions: ''
  });

  if (!isOpen || !reward) return null;

  const handleInputChange = (field, value) => {
    setDeliveryDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfirmRedemption = async () => {
    setIsLoading(true);
    
    try {
      if (reward?.type === 'physical') {
        setStep(2);
      } else {
        await onConfirm(reward, deliveryDetails);
        setStep(3);
      }
    } catch (error) {
      console.error('Redemption error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    
    try {
      await onConfirm(reward, deliveryDetails);
      setStep(3);
    } catch (error) {
      console.error('Redemption error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setDeliveryDetails({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      specialInstructions: ''
    });
    onClose();
  };

  const renderStep1 = () => (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-bold text-foreground">
          Confirmar Canje
        </h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <Icon name="X" size={20} />
        </Button>
      </div>

      {/* Reward Details */}
      <div className="flex space-x-4 mb-6">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={reward?.image}
            alt={reward?.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">{reward?.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{reward?.description}</p>
          <div className="flex items-center space-x-1">
            <Icon name="Star" size={16} color="var(--color-accent)" />
            <span className="font-mono font-bold text-accent">
              {reward?.pointsCost?.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">puntos</span>
          </div>
        </div>
      </div>

      {/* Balance Check */}
      <div className="bg-muted rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Puntos actuales:</span>
          <span className="font-mono font-medium text-foreground">
            {userPoints?.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Costo del canje:</span>
          <span className="font-mono font-medium text-accent">
            -{reward?.pointsCost?.toLocaleString()}
          </span>
        </div>
        <div className="border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Puntos restantes:</span>
            <span className="font-mono font-bold text-foreground">
              {(userPoints - reward?.pointsCost)?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Delivery Info */}
      {reward?.type === 'physical' && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Icon name="Truck" size={20} color="var(--color-primary)" />
            <div>
              <h4 className="font-medium text-foreground mb-1">Envío Físico</h4>
              <p className="text-sm text-muted-foreground">
                Este producto será enviado a tu dirección. El tiempo de entrega es de 5-7 días hábiles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button variant="outline" fullWidth onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          variant="default" 
          fullWidth 
          loading={isLoading}
          onClick={handleConfirmRedemption}
          iconName="Gift"
          iconPosition="left"
        >
          Confirmar Canje
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-bold text-foreground">
          Detalles de Envío
        </h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <Icon name="X" size={20} />
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre Completo"
            type="text"
            required
            value={deliveryDetails?.fullName}
            onChange={(e) => handleInputChange('fullName', e?.target?.value)}
            placeholder="Tu nombre completo"
          />
          <Input
            label="Correo Electrónico"
            type="email"
            required
            value={deliveryDetails?.email}
            onChange={(e) => handleInputChange('email', e?.target?.value)}
            placeholder="tu@email.com"
          />
        </div>

        <Input
          label="Teléfono"
          type="tel"
          required
          value={deliveryDetails?.phone}
          onChange={(e) => handleInputChange('phone', e?.target?.value)}
          placeholder="+34 600 000 000"
        />

        <Input
          label="Dirección Completa"
          type="text"
          required
          value={deliveryDetails?.address}
          onChange={(e) => handleInputChange('address', e?.target?.value)}
          placeholder="Calle, número, piso, puerta"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Ciudad"
            type="text"
            required
            value={deliveryDetails?.city}
            onChange={(e) => handleInputChange('city', e?.target?.value)}
            placeholder="Madrid"
          />
          <Input
            label="Código Postal"
            type="text"
            required
            value={deliveryDetails?.postalCode}
            onChange={(e) => handleInputChange('postalCode', e?.target?.value)}
            placeholder="28001"
          />
        </div>

        <Input
          label="Instrucciones Especiales (Opcional)"
          type="text"
          value={deliveryDetails?.specialInstructions}
          onChange={(e) => handleInputChange('specialInstructions', e?.target?.value)}
          placeholder="Dejar en portería, timbre específico, etc."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button variant="outline" onClick={() => setStep(1)}>
          Atrás
        </Button>
        <Button 
          variant="default" 
          fullWidth 
          loading={isLoading}
          onClick={handleFinalSubmit}
          disabled={!deliveryDetails?.fullName || !deliveryDetails?.email || !deliveryDetails?.phone || !deliveryDetails?.address}
          iconName="Check"
          iconPosition="left"
        >
          Completar Canje
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="p-6 text-center">
      {/* Success Icon */}
      <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon name="Check" size={32} color="white" />
      </div>

      {/* Success Message */}
      <h2 className="text-xl font-heading font-bold text-foreground mb-2">
        ¡Canje Exitoso!
      </h2>
      <p className="text-muted-foreground mb-6">
        {reward?.type === 'physical' 
          ? `Tu ${reward?.title} será enviado a la dirección proporcionada en 5-7 días hábiles.`
          : `Tu ${reward?.title} ha sido activado y está disponible en tu cuenta.`
        }
      </p>

      {/* Reward Details */}
      <div className="bg-muted rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden">
            <Image
              src={reward?.image}
              alt={reward?.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-foreground">{reward?.title}</h3>
            <p className="text-sm text-muted-foreground">
              Canjeado por {reward?.pointsCost?.toLocaleString()} puntos
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button variant="default" fullWidth onClick={handleClose}>
          Continuar Navegando
        </Button>
        <Button 
          variant="outline" 
          fullWidth 
          iconName="Share2" 
          iconPosition="left"
        >
          Compartir Logro
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-elevation-3 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default RedemptionModal;