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

  const accountTypeOptions = [
    { value: 'personal', label: 'Cuenta Personal' },
    { value: 'business', label: 'Cuenta de Negocio' }
  ];

  useEffect(() => {
    // Check if user is already authenticated
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate('/dashboard', { replace: true });
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

  // ✅ VERSIÓN SIMPLIFICADA - Sin verificación de username ni creación manual de perfil
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      console.log('🚀 Iniciando registro para:', formData.email);

      // ✅ SOLO REGISTRAR - El trigger handle_new_user() hace TODO el resto
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name.trim(),
            username: formData.username.toLowerCase().trim(),
            account_type: formData.accountType
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error('❌ Error en registro:', error);
        
        if (error.message.includes('User already registered')) {
          setErrors({
            email: 'Este email ya está registrado. Intenta iniciar sesión.'
          });
        } else {
          setErrors({
            general: error.message
          });
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        console.log('✅ Usuario registrado exitosamente:', data.user.email);
        console.log('✅ ID del usuario:', data.user.id);

        // ✅ Enviar email de bienvenida (NO BLOQUEANTE - en segundo plano)
        supabase.functions
          .invoke('send-welcome-email', {
            body: {
              email: formData.email,
              name: formData.name.trim(),
              username: formData.username.toLowerCase().trim()
            }
          })
          .then(({ error }) => {
            if (error) {
              console.warn('⚠️ Email de bienvenida no enviado:', error.message);
            } else {
              console.log('✅ Email de bienvenida enviado correctamente');
            }
          })
          .catch(err => {
            console.warn('⚠️ Error al enviar email de bienvenida:', err.message);
          });

        // ✅ Redirigir inmediatamente al dashboard
        console.log('✅ Redirigiendo al dashboard...');
        navigate('/dashboard', { replace: true });
      }
      
    } catch (error) {
      console.error('❌ Error inesperado en registro:', error);
      setErrors({
        general: 'Error al crear la cuenta. Por favor intenta de nuevo.'
      });
      setIsLoading(false);
    }
  };

  const handleSocialRegister = async (provider) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Icon name="logo" className="w-10 h-10 text-white" />
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Crear cuenta</h1>
          <p className="text-muted-foreground">
            Únete a nuestra comunidad
          </p>
        </div>

        {/* Social Register Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialRegister('google')}
            disabled={isLoading}
          >
            <Icon name="google" className="w-5 h-5 mr-2" />
            Continuar con Google
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialRegister('facebook')}
            disabled={isLoading}
          >
            <Icon name="facebook" className="w-5 h-5 mr-2" />
            Continuar con Facebook
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-muted-foreground">O regístrate con email</span>
          </div>
        </div>

        {/* Error Message */}
        {errors.general && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-6">
            <p className="text-sm">{errors.general}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type */}
          <Select
            label="Tipo de cuenta"
            value={formData.accountType}
            onChange={(value) => handleInputChange('accountType', value)}
            options={accountTypeOptions}
            disabled={isLoading}
          />

          {/* Name */}
          <Input
            label="Nombre completo"
            type="text"
            value={formData.name}
            onChange={(value) => handleInputChange('name', value)}
            error={errors.name}
            placeholder="Tu nombre completo"
            disabled={isLoading}
            required
          />

          {/* Username */}
          <Input
            label="Nombre de usuario"
            type="text"
            value={formData.username}
            onChange={(value) => handleInputChange('username', value)}
            error={errors.username}
            placeholder="usuario123"
            disabled={isLoading}
            required
          />

          {/* Email */}
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => handleInputChange('email', value)}
            error={errors.email}
            placeholder="tu@email.com"
            disabled={isLoading}
            required
          />

          {/* Password */}
          <Input
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(value) => handleInputChange('password', value)}
            error={errors.password}
            placeholder="Mínimo 8 caracteres"
            disabled={isLoading}
            required
            icon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} className="w-5 h-5" />
              </button>
            }
          />

          {/* Confirm Password */}
          <Input
            label="Confirmar contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(value) => handleInputChange('confirmPassword', value)}
            error={errors.confirmPassword}
            placeholder="Repite tu contraseña"
            disabled={isLoading}
            required
            icon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} className="w-5 h-5" />
              </button>
            }
          />

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleCheckboxChange}
                disabled={isLoading}
                className="w-4 h-4 border border-input rounded bg-background focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="acceptTerms" className="text-sm text-foreground">
                Acepto los{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  términos y condiciones
                </Link>
                {' '}y la{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  política de privacidad
                </Link>
              </label>
              {errors.acceptTerms && (
                <p className="text-sm text-destructive mt-1">{errors.acceptTerms}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
