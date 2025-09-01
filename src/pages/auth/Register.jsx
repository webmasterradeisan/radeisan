// src/pages/auth/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Icon from '../../components/AppIcon';

const Register = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'personal',
    acceptTerms: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const accountTypeOptions = [
    { value: 'personal', label: 'Cuenta Personal' },
    { value: 'business', label: 'Cuenta de Negocio' }
  ];

  useEffect(() => {
    // Check if user is already authenticated
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate('/video-feed-dashboard', { replace: true });
      }
    };
    checkUser();
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un email válido';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'La contraseña debe contener al menos una mayúscula, una minúscula y un número';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    // Terms validation
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los términos y condiciones';
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

  // Handle checkbox change specifically
  const handleCheckboxChange = (e) => {
    const { checked } = e.target;
    handleInputChange('acceptTerms', checked);
  };

  const checkUsernameAvailability = async (username) => {
    if (username.length < 3) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (data) {
        setErrors(prev => ({
          ...prev,
          username: 'Este nombre de usuario ya está en uso'
        }));
      }
    } catch (error) {
      // Username is available (no record found)
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
      // Check username availability one more time
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', formData.username.toLowerCase())
        .single();

      if (existingUser) {
        setErrors({
          username: 'Este nombre de usuario ya está en uso'
        });
        return;
      }

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            username: formData.username.toLowerCase().trim(),
            account_type: formData.accountType
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setErrors({
            email: 'Este email ya está registrado. Intenta iniciar sesión.'
          });
        } else {
          setErrors({
            general: error.message
          });
        }
        return;
      }

      if (data.user) {
        // Show email confirmation message
        setEmailSent(true);
      }
      
    } catch (error) {
      setErrors({
        general: 'Error al crear la cuenta. Por favor intenta de nuevo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialRegister = async (provider) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/video-feed-dashboard`
        }
      });

      if (error) {
        setErrors({
          general: `Error al registrarse con ${provider}: ${error.message}`
        });
      }
      
    } catch (error) {
      setErrors({
        general: `Error al registrarse con ${provider}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Username availability check with debounce
  useEffect(() => {
    if (formData.username.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.username]);

  // Show email sent confirmation
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="bg-card rounded-lg shadow-elevation-2 p-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Mail" size={32} className="text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              ¡Revisa tu email!
            </h1>
            <p className="text-muted-foreground mb-6">
              Hemos enviado un enlace de confirmación a <strong>{formData.email}</strong>. 
              Haz clic en el enlace para activar tu cuenta.
            </p>
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full mb-4"
            >
              Cambiar email
            </Button>
            <Link to="/login">
              <Button className="w-full">
                Ir al Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Únete a Radeisan
          </h1>
          <p className="text-muted-foreground mt-2">
            Crea tu cuenta y comienza a ganar puntos
          </p>
        </div>

        {/* Register Form */}
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
            {/* Account Type */}
            <div>
              <Select
                label="Tipo de Cuenta"
                options={accountTypeOptions}
                value={formData.accountType}
                onChange={(value) => handleInputChange('accountType', value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.accountType === 'business' 
                  ? 'Perfecta para empresas que quieren vender productos'
                  : 'Ideal para crear y compartir contenido'
                }
              </p>
            </div>

            {/* Name Input */}
            <div>
              <Input
                label="Nombre Completo"
                type="text"
                placeholder="Tu nombre completo"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                required
                disabled={isLoading}
              />
            </div>

            {/* Username Input */}
            <div>
              <Input
                label="Nombre de Usuario"
                type="text"
                placeholder="usuario123"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                error={errors.username}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Solo letras, números y guiones bajos. Mínimo 3 caracteres.
              </p>
            </div>

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
                  placeholder="Mínimo 8 caracteres"
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
              <p className="text-xs text-muted-foreground mt-1">
                Debe incluir mayúscula, minúscula y número.
              </p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <div className="relative">
                <Input
                  label="Confirmar Contraseña"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirma tu contraseña"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  error={errors.confirmPassword}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  <Icon name={showConfirmPassword ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Terms and Conditions - SECCIÓN CORREGIDA */}
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                {/* Checkbox nativo HTML - garantizado que funcione */}
                <div className="flex items-center h-5 mt-1">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleCheckboxChange}
                    disabled={isLoading}
                    className="w-4 h-4 text-primary bg-card border-2 border-border rounded focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      accentColor: 'var(--color-primary)',
                      position: 'relative',
                      zIndex: 10
                    }}
                  />
                </div>
                
                {/* Label clickeable que también activa el checkbox */}
                <label 
                  htmlFor="acceptTerms" 
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none flex-1"
                >
                  Acepto los{' '}
                  <Link 
                    to="/terms" 
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    términos y condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link 
                    to="/privacy" 
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    política de privacidad
                  </Link>
                </label>
              </div>
              
              {/* Error del checkbox */}
              {errors.acceptTerms && (
                <div className="flex items-center space-x-1 text-error">
                  <Icon name="AlertCircle" size={12} />
                  <span className="text-sm">{errors.acceptTerms}</span>
                </div>
              )}
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          {/* Social Register */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">O regístrate con</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleSocialRegister('google')}
                disabled={isLoading}
                className="w-full"
              >
                <Icon name="Mail" size={16} className="mr-2" />
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialRegister('facebook')}
                disabled={isLoading}
                className="w-full"
              >
                <Icon name="Facebook" size={16} className="mr-2" />
                Facebook
              </Button>
            </div>
          </div>
        </div>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
