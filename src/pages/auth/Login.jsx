// src/pages/auth/Login.jsx
// Componente Login COMPLETO - Con casilla "Recuérdame" funcional

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const Login = () => {
  const { signIn, loading, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determinar la ruta de redirección
  const from = location.state?.from || '/dashboard';

  // ===============================
  // GESTIÓN DE "RECUÉRDAME"
  // ===============================

  // Guardar datos en localStorage
  const saveRememberData = (email, remember) => {
    if (remember && email) {
      const rememberData = {
        email: email,
        rememberMe: true,
        savedAt: Date.now()
      };
      localStorage.setItem('radeisan_remember_user', JSON.stringify(rememberData));
      console.log('📝 Datos guardados para recordar usuario');
    } else {
      localStorage.removeItem('radeisan_remember_user');
      console.log('🗑️ Datos de usuario recordado eliminados');
    }
  };

  // Cargar datos guardados
  const loadRememberData = () => {
    try {
      const savedData = localStorage.getItem('radeisan_remember_user');
      if (savedData) {
        const rememberData = JSON.parse(savedData);
        
        // Verificar que no sea demasiado antiguo (30 días máximo)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (rememberData.savedAt && rememberData.savedAt > thirtyDaysAgo) {
          console.log('📥 Cargando datos recordados del usuario');
          return {
            email: rememberData.email || '',
            rememberMe: rememberData.rememberMe || false
          };
        } else {
          // Datos muy antiguos, eliminar
          localStorage.removeItem('radeisan_remember_user');
          console.log('🕐 Datos recordados expirados, eliminando');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error cargando datos recordados:', error);
      localStorage.removeItem('radeisan_remember_user');
    }
    
    return { email: '', rememberMe: false };
  };

  // ===============================
  // MANEJO DE FORMULARIO
  // ===============================

  // Limpiar errores cuando cambia el input
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar errores específicos del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Limpiar error de auth context
    if (authError) {
      clearError();
    }

    // Si se está cambiando rememberMe, actualizar localStorage inmediatamente
    if (field === 'rememberMe') {
      if (value && formData.email) {
        saveRememberData(formData.email, value);
      } else if (!value) {
        saveRememberData('', false);
      }
    }

    // Si se está cambiando email y rememberMe está activo, actualizar localStorage
    if (field === 'email' && formData.rememberMe) {
      saveRememberData(value, formData.rememberMe);
    }
  };

  // Validaciones del formulario
  const validateForm = () => {
    const newErrors = {};

    // Validar email
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    // Validar password
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar formulario
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔑 Intentando login con:', formData.email);

      // Llamar a la función signIn del AuthContext
      const result = await signIn(formData.email, formData.password);

      if (result.success) {
        console.log('✅ Login exitoso, redirigiendo a:', from);

        // Guardar o limpiar datos de "recuérdame" según la preferencia
        saveRememberData(formData.email, formData.rememberMe);

        // Redireccionar al destino
        navigate(from, { replace: true });

      } else {
        console.error('❌ Login falló:', result.error);
        setErrors({
          general: result.error || 'Error al iniciar sesión'
        });
      }

    } catch (err) {
      console.error('❌ Error crítico en login:', err);
      setErrors({
        general: 'Error de conexión. Verifica tu conexión a internet.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar olvido de contraseña
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({
        email: 'Ingresa tu email para recuperar la contraseña'
      });
      return;
    }

    try {
      const { resetPassword } = useAuth();
      if (resetPassword) {
        const result = await resetPassword(formData.email);
        if (result.success) {
          alert('Se ha enviado un enlace de recuperación a tu email');
        } else {
          setErrors({
            general: result.error || 'Error al enviar email de recuperación'
          });
        }
      } else {
        alert('Se enviará un enlace de recuperación a tu email (funcionalidad en desarrollo)');
      }
    } catch (error) {
      setErrors({
        general: 'Error al enviar email de recuperación'
      });
    }
  };

  // ===============================
  // EFECTOS
  // ===============================

  // Cargar datos recordados al montar el componente
  useEffect(() => {
    const rememberedData = loadRememberData();
    if (rememberedData.email || rememberedData.rememberMe) {
      setFormData(prev => ({
        ...prev,
        email: rememberedData.email,
        rememberMe: rememberedData.rememberMe
      }));
    }
  }, []);

  // Limpiar errores del AuthContext cuando se monte el componente
  useEffect(() => {
    if (authError) {
      clearError();
    }
  }, [authError, clearError]);

  // ===============================
  // RENDER
  // ===============================

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Icon name="Video" size={32} color="white" />
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Bienvenido a RADEISAN
          </h1>
          <p className="text-muted-foreground mt-2">
            Inicia sesión para acceder a tu cuenta
          </p>
        </div>

        {/* Formulario de Login */}
        <div className="bg-card rounded-lg shadow-elevation-2 p-6">
          
          {/* Error General */}
          {(errors.general || authError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} className="text-red-600" />
                <span className="text-sm text-red-600">
                  {errors.general || authError}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Input */}
            <div>
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                required
                disabled={loading || isSubmitting}
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  error={errors.password}
                  required
                  disabled={loading || isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading || isSubmitting}
                  tabIndex={-1}
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={formData.rememberMe}
                  onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                  disabled={loading || isSubmitting}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
                />
                <label 
                  htmlFor="remember" 
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Recordarme
                </label>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline transition-colors"
                disabled={loading || isSubmitting}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || isSubmitting}
            >
              {(loading || isSubmitting) ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Social Login - Opcional */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">O continúa con</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                onClick={() => alert('Login social próximamente')}
                disabled={loading || isSubmitting}
                className="w-full"
                type="button"
              >
                <Icon name="Mail" size={16} className="mr-2" />
                Google (Próximamente)
              </Button>
            </div>
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            ¿No tienes una cuenta?{' '}
            <Link
              to="/register"
              className="text-primary font-medium hover:underline transition-colors"
            >
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Debug Info - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <p><strong>Debug:</strong></p>
            <p>Email: {formData.email}</p>
            <p>Remember: {formData.rememberMe ? 'Sí' : 'No'}</p>
            <p>Loading: {loading ? 'Sí' : 'No'}</p>
            <p>Submitting: {isSubmitting ? 'Sí' : 'No'}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
