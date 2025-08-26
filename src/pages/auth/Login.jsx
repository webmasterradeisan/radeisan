// src/pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import Icon from '../../components/AppIcon';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Get redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/video-feed-dashboard';

  useEffect(() => {
    // Check if user is already authenticated
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate(from, { replace: true });
      }
    };
    checkUser();
  }, [navigate, from]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un email válido';
    }

    // Password validation
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

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({
            general: 'Email o contraseña incorrectos'
          });
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({
            general: 'Por favor verifica tu email antes de iniciar sesión'
          });
        } else {
          setErrors({
            general: error.message
          });
        }
        return;
      }

      if (data.user) {
        // Save remember me preference
        if (formData.rememberMe) {
          localStorage.setItem('rememberUser', JSON.stringify({
            email: formData.email,
            rememberMe: true
          }));
        }

        // Navigate to intended page
        navigate(from, { replace: true });
      }
      
    } catch (error) {
      setErrors({
        general: 'Error de conexión. Por favor intenta de nuevo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}${from}`
        }
      });

      if (error) {
        setErrors({
          general: `Error al iniciar sesión con ${provider}: ${error.message}`
        });
      }
      
    } catch (error) {
      setErrors({
        general: `Error al iniciar sesión con ${provider}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({
        email: 'Ingresa tu email para recuperar la contraseña'
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        setErrors({
          general: error.message
        });
      } else {
        alert('Revisa tu email para restablecer tu contraseña');
      }
    } catch (error) {
      setErrors({
        general: 'Error al enviar email de recuperación'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered user data
  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberUser');
    if (rememberedUser) {
      const userData = JSON.parse(rememberedUser);
      setFormData(prev => ({
        ...prev,
        email: userData.email,
        rememberMe: userData.rememberMe
      }));
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Icon name="Video" size={32} color="white" />
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Bienvenido a Radeisan
          </h1>
          <p className="text-muted-foreground mt-2">
            Inicia sesión para acceder a tu cuenta
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-lg shadow-elevation-2 p-6">
          {/* General Error */}
          {errors.general && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-md">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} className="text-error" />
                <span className="text-sm text-error">{errors.general}</span>
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
                disabled={isLoading}
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
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) => handleInputChange('rememberMe', checked)}
                  disabled={isLoading}
                />
                <label 
                  htmlFor="remember" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Recordarme
                </label>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
                disabled={isLoading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Social Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">O continúa con</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                className="w-full"
              >
                <Icon name="Mail" size={16} className="mr-2" />
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={isLoading}
                className="w-full"
              >
                <Icon name="Facebook" size={16} className="mr-2" />
                Facebook
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
              className="text-primary font-medium hover:underline"
            >
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
