// src/components/EmailVerificationBanner.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Icon from './AppIcon';
import Button from './ui/Button';

const EmailVerificationBanner = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('email_verified, created_at')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      
      // Calcular días desde el registro
      const daysPassed = Math.floor(
        (Date.now() - new Date(data.created_at)) / (1000 * 60 * 60 * 24)
      );
      setDaysRemaining(Math.max(0, 30 - daysPassed));
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke('resend-verification-email', {
        body: { 
          email: user.email,
          name: profile?.name || user.user_metadata?.name || 'Usuario'
        }
      });

      if (error) throw error;

      alert('✅ Email de verificación enviado. Revisa tu bandeja de entrada y carpeta de spam.');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al enviar email. Intenta de nuevo en unos momentos.');
    }
    setIsResending(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Guardar en localStorage para no mostrar por 24 horas
    localStorage.setItem('emailBannerDismissed', Date.now().toString());
  };

  // Verificar si fue dismisseado recientemente
  useEffect(() => {
    const dismissedTime = localStorage.getItem('emailBannerDismissed');
    if (dismissedTime) {
      const hoursPassed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursPassed < 24) {
        setIsDismissed(true);
      }
    }
  }, []);

  // No mostrar si ya está verificado o fue dismisseado (excepto si quedan menos de 10 días)
  if (!profile || profile.email_verified || (isDismissed && daysRemaining > 10)) {
    return null;
  }

  // Determinar el estilo según los días restantes
  const getPhaseStyle = () => {
    if (daysRemaining > 20) {
      // Fase 1: Días 1-10 (Azul - Informativo)
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-800 dark:text-blue-200',
        iconColor: 'text-blue-600 dark:text-blue-400',
        icon: 'Mail',
        dismissible: true
      };
    } else if (daysRemaining > 10) {
      // Fase 2: Días 11-20 (Amarillo - Recordatorio)
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-800 dark:text-yellow-200',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        icon: 'AlertCircle',
        dismissible: true
      };
    } else {
      // Fase 3: Días 21-30 (Rojo - Urgente)
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-800 dark:text-red-200',
        iconColor: 'text-red-600 dark:text-red-400',
        icon: 'AlertTriangle',
        dismissible: false // No se puede cerrar si es urgente
      };
    }
  };

  const style = getPhaseStyle();

  const getMessage = () => {
    if (daysRemaining > 20) {
      return {
        title: '💌 Verifica tu email para desbloquear todas las funciones',
        desc: 'Tu cuenta funciona normalmente, pero te recomendamos verificar tu correo.',
        showDays: false
      };
    } else if (daysRemaining > 10) {
      return {
        title: '📧 Aún no has verificado tu email',
        desc: `Te quedan ${daysRemaining} días para verificar tu cuenta antes de que sea suspendida.`,
        showDays: true
      };
    } else if (daysRemaining > 0) {
      return {
        title: '⚠️ IMPORTANTE: Verifica tu email urgentemente',
        desc: `Tu cuenta será suspendida en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} si no verificas tu correo.`,
        showDays: true
      };
    } else {
      return {
        title: '🚫 Tu cuenta será suspendida hoy',
        desc: 'Verifica tu email ahora para evitar la suspensión de tu cuenta.',
        showDays: false
      };
    }
  };

  const message = getMessage();

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-4 mb-6 shadow-sm`}>
      <div className="flex items-start gap-4">
        {/* Icono */}
        <div className="flex-shrink-0 mt-1">
          <div className={`w-10 h-10 rounded-full ${style.bg} border ${style.border} flex items-center justify-center`}>
            <Icon name={style.icon} size={20} className={style.iconColor} />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className={`font-semibold ${style.text} text-sm md:text-base`}>
              {message.title}
            </h3>
            
            {/* Botón cerrar (solo si es dismissible) */}
            {style.dismissible && (
              <button
                onClick={handleDismiss}
                className={`${style.text} hover:opacity-70 transition-opacity flex-shrink-0`}
                title="Cerrar"
              >
                <Icon name="X" size={18} />
              </button>
            )}
          </div>

          <p className={`text-sm ${style.text} mb-3 opacity-90`}>
            {message.desc}
          </p>

          {/* Días restantes (visual) */}
          {message.showDays && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className={style.text}>Días restantes:</span>
                <span className={`font-bold ${style.text}`}>{daysRemaining}/30</span>
              </div>
              <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    daysRemaining > 20
                      ? 'bg-blue-500'
                      : daysRemaining > 10
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(daysRemaining / 30) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleResendEmail}
              disabled={isResending}
              className="text-xs"
            >
              {isResending ? (
                <>
                  <Icon name="Loader2" size={14} className="mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Icon name="Mail" size={14} className="mr-1" />
                  Reenviar email
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`mailto:${user.email}`, '_blank')}
              className="text-xs"
            >
              <Icon name="ExternalLink" size={14} className="mr-1" />
              Abrir mi correo
            </Button>
          </div>
        </div>
      </div>

      {/* Información adicional (solo en fase urgente) */}
      {daysRemaining <= 10 && (
        <div className={`mt-3 pt-3 border-t ${style.border}`}>
          <p className={`text-xs ${style.text} opacity-75`}>
            💡 <strong>Nota:</strong> Después de la suspensión, podrás reactivar tu cuenta simplemente verificando tu email.
            No perderás tus datos ni tu contenido.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailVerificationBanner;
