// src/pages/auth/Login.jsx
// Login CORREGIDO - Elimina bucles de redirección y simplifica autenticación
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Obtener ruta de redirección o usar dashboard por defecto
  const redirectTo = location.state?.from || '/dashboard';

  // Si ya está autenticado, redirigir inmediatamente
  useEffect(() => {
    if (user && !authLoading) {
      console.log('✅ Usuario ya autenticado, redirigiendo a:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, redirectTo, navigate]);

  // Auto-completar email si se recordó
  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberUser');
    if (rememberedUser) {
      try {
        const userData = JSON.parse(rememberedUser);
        if (userData.email && userData.rememberMe) {
          setFormData(prev => ({
            ...prev,
            email: userData.email,
            rememberMe: true
          }));
        }
      } catch (error) {
        console.log('Error parsing remembered user:', error);
        localStorage.removeItem('rememberUser');
      }
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Validación de email
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Por favor ingresa un email válido';
    }

    // Validación de contraseña
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Limpiar error general
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔐 Iniciando proceso de login...');

    if (!validateForm()) {
      console.log('❌ Formulario inválido');
      return;
    }

    if (isSubmitting) {
      console.log('⚠️ Ya hay un submit en proceso');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      console.log('📡 Llamando a signIn con:', formData.email);
      
      const result = await signIn(formData.email.trim(), formData.password);
      
      console.log('📄 Resultado de signIn:', result);

      if (result?.success) {
        console.log('✅ Login exitoso, procesando...');
        
        // Guardar preferencia de recordar usuario
        if (formData.rememberMe) {
          localStorage.setItem('rememberUser', JSON.stringify({
            email: formData.email.trim(),
            rememberMe: true
          }));
        } else {
          localStorage.removeItem('rememberUser');
        }

        // Limpiar intentos de login
        setLoginAttempts(0);
        
        console.log('🎯 Redirigiendo a:', redirectTo);
        
        // Redirigir después de un pequeño delay para asegurar que el estado se actualice
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 100);

      } else {
        console.error('❌ Login falló:', result?.error);
        
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        let errorMessage = result?.error || 'Error de autenticación';
        
        // Personalizar mensajes de error comunes
        if (errorMessage.includes('Invalid login credentials') || 
            errorMessage.includes('Email o contraseña incorrectos')) {
          errorMessage = 'Email o contraseña incorrectos';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Por favor verifica tu email antes de iniciar sesión';
        } else if (errorMessage.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Espera unos minutos e intenta de nuevo';
        }
        
        setErrors({
          general: errorMessage
        });

        // Si hay muchos intentos fallidos, sugerir reset de contraseña
        if (newAttempts >= 3) {
          setErrors({
            general: `${errorMessage}. Después de ${newAttempts} intentos, ¿necesitas recuperar tu contraseña?`
          });
        }
      }

    } catch (error) {
      console.error('💥 Error crítico en handleSubmit:', error);
      
      setErrors({
        general: 'Error de conexión. Verifica tu internet e intenta de nuevo.'
      });
      
      setLoginAttempts(prev => prev + 1);

    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    if (formData.email.trim()) {
      navigate('/auth/forgot-password', { 
        state: { email: formData.email.trim() } 
      });
    } else {
      alert('Por favor ingresa tu email primero');
    }
  };

  // Mostrar loading si está verificando autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si ya está autenticado, no mostrar el form (evita flash)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Iniciar Sesión | RADEISAN</title>
        <meta name="description" content="Inicia sesión en RADEISAN y conecta con la comunidad de creadores de contenido" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          
          {/* Header */}
          <div className="text-center mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
            >
              <Icon name="PlayCircle" size={32} className="mr-2" />
              RADEISAN
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-foreground">
              Iniciar Sesión
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Accede a tu cuenta y continúa creando
            </p>
            
            {/* Mostrar ruta de redirección si existe */}
            {location.state?.from && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  📍 Serás redirigido a: <span className="font-mono">{location.state.from}</span>
                </p>
              </div>
            )}
          </div>

          {/* Login Form */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-8">
            
            {/* Error General */}
            {errors.general && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertCircle" size={20} className="text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive font-medium">{errors.general}</p>
                </div>
                
                {/* Link de ayuda si hay muchos intentos fallidos */}
                {loginAttempts >= 3 && (
                  <div className="mt-3 pt-3 border-t border-destructive/20">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-destructive hover:underline"
                    >
                      🔑 Recuperar contraseña
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Input */}
              <div>
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                  autoFocus
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
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                  disabled={isSubmitting}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || (!formData.email.trim() || !formData.password)}
              >
                {isSubmitting ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <Icon name="LogIn" size={16} className="mr-2" />
                    Iniciar Sesión
                  </>
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <p className="text-xs font-semibold text-gray-700 mb-2">🔧 Credenciales de prueba:</p>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <button
                      type="button"
                      onClick={() => handleInputChange('email', 'admin@radeisan.com')}
                      className="text-blue-600 hover:underline font-mono"
                    >
                      admin@radeisan.com
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contraseña:</span>
                    <button
                      type="button"
                      onClick={() => handleInputChange('password', '123456')}
                      className="text-blue-600 hover:underline font-mono"
                    >
                      123456
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                  disabled={isSubmitting}
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
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono">
              <p><strong>🔍 Debug Info:</strong></p>
              <p>AuthLoading: {authLoading ? 'Sí' : 'No'}</p>
              <p>User: {user ? 'Autenticado' : 'No autenticado'}</p>
              <p>Submitting: {isSubmitting ? 'Sí' : 'No'}</p>
              <p>Attempts: {loginAttempts}</p>
              <p>Redirect: {redirectTo}</p>
              {location.state?.from && <p>From: {location.state.from}</p>}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Login;
