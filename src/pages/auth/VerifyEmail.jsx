// src/pages/auth/VerifyEmail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Obtener el email de la URL (?token=email@ejemplo.com)
  const emailFromUrl = searchParams.get('token');

  const [formData, setFormData] = useState({
    email: emailFromUrl || '',
    otp: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [timer, setTimer] = useState(0); // Para el cooldown del reenvío

  // Efecto para el temporizador de reenvío
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // ✅ VERIFICAR CÓDIGO (OTP)
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!formData.otp || formData.otp.length < 6) {
      setError('Por favor ingresa el código de 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.otp,
        type: 'signup'
      });

      if (error) throw error;

      console.log('✅ Verificación exitosa:', data);
      setSuccessMessage('¡Email verificado correctamente! Redirigiendo...');
      
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);

    } catch (err) {
      console.error('❌ Error de verificación:', err.message);
      setError(err.message === 'Token has expired or is invalid' 
        ? 'El código es inválido o ha expirado.' 
        : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 REENVIAR CÓDIGO
  const handleResendCode = async () => {
    if (timer > 0) return;
    
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      setSuccessMessage('Nuevo código enviado. Revisa tu bandeja de entrada.');
      setTimer(60); // 60 segundos de espera

    } catch (err) {
      console.error('❌ Error al reenviar:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full bg-card rounded-lg shadow-elevation-2 p-8">
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="Mail" size={32} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verifica tu Email</h1>
          <p className="text-muted-foreground mt-2">
            Ingresa el código de 6 dígitos que enviamos a: <br/>
            <span className="font-medium text-foreground">{formData.email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-md flex items-center gap-2 text-error text-sm">
            <Icon name="AlertCircle" size={16} />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-md flex items-center gap-2 text-success-dark text-sm">
            <Icon name="Check" size={16} />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <Input 
              label="Código de Verificación"
              placeholder="123456"
              value={formData.otp}
              onChange={(e) => handleInputChange('otp', e.target.value)}
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              disabled={isLoading || !!successMessage}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !!successMessage}
          >
            {isLoading ? 'Verificando...' : 'Verificar Cuenta'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            ¿No recibiste el código?
          </p>
          <button
            onClick={handleResendCode}
            disabled={timer > 0 || isLoading}
            className={`text-sm font-medium ${
              timer > 0 
                ? 'text-muted-foreground cursor-not-allowed' 
                : 'text-primary hover:underline'
            }`}
          >
            {timer > 0 ? `Reenviar en ${timer}s` : 'Reenviar código'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
             <button 
                onClick={() => navigate('/login')}
                className="text-sm text-muted-foreground hover:text-foreground"
             >
                 Volver al inicio de sesión
             </button>
        </div>

      </div>
    </div>
  );
};

export default VerifyEmail;
