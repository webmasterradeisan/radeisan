// src/components/SuspendedAccountGuard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import Icon from './AppIcon';

const SuspendedAccountGuard = ({ user, children }) => {
  const [profile, setProfile] = useState(null);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkAccountStatus();
    }
  }, [user]);

  const checkAccountStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email_verified, created_at, account_suspended')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        // Calcular días desde el registro
        const daysPassed = Math.floor(
          (Date.now() - new Date(data.created_at)) / (1000 * 60 * 60 * 24)
        );

        // Si no está verificado y pasaron 30 días, suspender automáticamente
        if (!data.email_verified && daysPassed >= 30 && !data.account_suspended) {
          await supabase
            .from('user_profiles')
            .update({
              account_suspended: true,
              suspension_reason: 'Email no verificado después de 30 días'
            })
            .eq('id', user.id);
          
          setProfile({ ...data, account_suspended: true });
        } else {
          setProfile(data);
        }
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke('resend-verification-email', {
        body: { 
          email: user.email,
          name: user.user_metadata?.name || 'Usuario'
        }
      });

      if (error) throw error;

      alert('✅ Email de verificación enviado exitosamente. Revisa tu bandeja de entrada y carpeta de spam.');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al enviar email. Por favor intenta de nuevo.');
    }
    setIsResending(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleCheckVerification = async () => {
    // Refrescar el estado de verificación del usuario
    const { data: { user: updatedUser } } = await supabase.auth.getUser();
    
    if (updatedUser?.email_confirmed_at) {
      // Actualizar en la base de datos
      await supabase
        .from('user_profiles')
        .update({
          email_verified: true,
          account_suspended: false,
          suspension_reason: null
        })
        .eq('id', user.id);

      // Recargar la página para reflejar los cambios
      window.location.reload();
    } else {
      alert('⚠️ Aún no hemos detectado la verificación. Asegúrate de hacer clic en el link del email.');
    }
  };

  // Mostrar loading mientras verifica
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Icon name="Loader2" size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando tu cuenta...</p>
        </div>
      </div>
    );
  }

  // Si la cuenta está suspendida, mostrar pantalla de bloqueo
  if (profile?.account_suspended) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-lg">
          {/* Icono de suspensión */}
          <div className="w-20 h-20 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="ShieldAlert" size={40} className="text-red-600 dark:text-red-400" />
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-foreground mb-3 text-center">
            Cuenta Suspendida Temporalmente
          </h1>

          {/* Mensaje principal */}
          <p className="text-muted-foreground mb-6 text-center">
            Tu cuenta ha sido suspendida porque no verificaste tu email en los últimos 30 días.
            Para continuar usando Radeisan, debes verificar tu correo electrónico.
          </p>

          {/* Información del email */}
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-2 text-center">
              Email registrado:
            </p>
            <p className="font-medium text-foreground text-center break-all">
              {user.email}
            </p>
          </div>

          {/* Instrucciones */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <Icon name="Info" size={16} />
              ¿Cómo reactivar tu cuenta?
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-decimal">
              <li>Haz clic en "Reenviar email de verificación"</li>
              <li>Revisa tu bandeja de entrada (y spam)</li>
              <li>Haz clic en el botón "Verificar mi Email" del correo</li>
              <li>Vuelve aquí y haz clic en "Ya verifiqué mi email"</li>
            </ol>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleResendEmail}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                  Enviando email...
                </>
              ) : (
                <>
                  <Icon name="Mail" size={18} className="mr-2" />
                  Reenviar email de verificación
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCheckVerification}
            >
              <Icon name="CheckCircle" size={18} className="mr-2" />
              Ya verifiqué mi email
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={handleLogout}
            >
              <Icon name="LogOut" size={18} className="mr-2" />
              Cerrar sesión
            </Button>
          </div>

          {/* Ayuda adicional */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              ¿No recibes el email?{' '}
              <a 
                href="mailto:soporte@radeisan.com" 
                className="text-primary hover:underline font-medium"
              >
                Contacta a soporte
              </a>
            </p>
            <p className="text-xs text-muted-foreground text-center mt-2">
              💡 No olvides revisar tu carpeta de spam o correo no deseado
            </p>
          </div>

          {/* Tranquilidad */}
          <div className="mt-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-800 dark:text-green-200 text-center">
              ✅ <strong>Tus datos están seguros:</strong> No perderás tu contenido, puntos ni seguidores.
              Todo estará disponible una vez que verifiques tu email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si no está suspendida, renderizar el contenido normalmente
  return <>{children}</>;
};

export default SuspendedAccountGuard;
