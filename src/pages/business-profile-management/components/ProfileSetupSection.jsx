import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ProfileSetupSection = ({ businessData, onUpdate }) => {
  const [formData, setFormData] = useState({
    businessName: businessData?.businessName || '',
    description: businessData?.description || '',
    category: businessData?.category || '',
    phone: businessData?.phone || '',
    email: businessData?.email || '',
    website: businessData?.website || '',
    address: businessData?.address || '',
    city: businessData?.city || '',
    country: businessData?.country || '',
    logo: businessData?.logo || '',
    banner: businessData?.banner || '',
    isVerified: businessData?.isVerified || false
  });

  const [logoPreview, setLogoPreview] = useState(formData?.logo);
  const [bannerPreview, setBannerPreview] = useState(formData?.banner);

  const categoryOptions = [
    { value: 'fashion', label: 'Moda y Accesorios' },
    { value: 'electronics', label: 'Electrónicos' },
    { value: 'home', label: 'Hogar y Jardín' },
    { value: 'beauty', label: 'Belleza y Cuidado Personal' },
    { value: 'sports', label: 'Deportes y Fitness' },
    { value: 'books', label: 'Libros y Medios' },
    { value: 'food', label: 'Alimentos y Bebidas' },
    { value: 'art', label: 'Arte y Manualidades' },
    { value: 'automotive', label: 'Automotriz' },
    { value: 'other', label: 'Otros' }
  ];

  const countryOptions = [
    { value: 'es', label: 'España' },
    { value: 'mx', label: 'México' },
    { value: 'ar', label: 'Argentina' },
    { value: 'co', label: 'Colombia' },
    { value: 'pe', label: 'Perú' },
    { value: 'cl', label: 'Chile' },
    { value: 'other', label: 'Otro país' }
  ];

  const handleInputChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate(updatedData);
  };

  const handleImageUpload = (type, event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e?.target?.result;
        if (type === 'logo') {
          setLogoPreview(imageUrl);
          handleInputChange('logo', imageUrl);
        } else {
          setBannerPreview(imageUrl);
          handleInputChange('banner', imageUrl);
        }
      };
      reader?.readAsDataURL(file);
    }
  };

  const handleVerificationRequest = () => {
    // Mock verification request
    alert('Solicitud de verificación enviada. Revisaremos tu perfil en 24-48 horas.');
  };

  return (
    <div className="space-y-8">
      {/* Business Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Building2" size={20} color="var(--color-primary)" />
          <h3 className="text-lg font-semibold text-foreground">Información del Negocio</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Input
            label="Nombre del Negocio"
            type="text"
            placeholder="Ej: Mi Tienda Online"
            value={formData?.businessName}
            onChange={(e) => handleInputChange('businessName', e?.target?.value)}
            required
          />

          <Select
            label="Categoría Principal"
            options={categoryOptions}
            value={formData?.category}
            onChange={(value) => handleInputChange('category', value)}
            placeholder="Selecciona una categoría"
            required
          />

          <Input
            label="Teléfono de Contacto"
            type="tel"
            placeholder="+34 600 000 000"
            value={formData?.phone}
            onChange={(e) => handleInputChange('phone', e?.target?.value)}
          />

          <Input
            label="Email de Contacto"
            type="email"
            placeholder="contacto@minegocio.com"
            value={formData?.email}
            onChange={(e) => handleInputChange('email', e?.target?.value)}
            required
          />

          <Input
            label="Sitio Web"
            type="url"
            placeholder="https://www.minegocio.com"
            value={formData?.website}
            onChange={(e) => handleInputChange('website', e?.target?.value)}
          />

          <Select
            label="País"
            options={countryOptions}
            value={formData?.country}
            onChange={(value) => handleInputChange('country', value)}
            placeholder="Selecciona tu país"
            required
          />
        </div>

        <div className="mt-6">
          <Input
            label="Descripción del Negocio"
            type="text"
            placeholder="Describe tu negocio, productos y servicios..."
            value={formData?.description}
            onChange={(e) => handleInputChange('description', e?.target?.value)}
            description="Máximo 500 caracteres"
          />
        </div>

        <div className="mt-6">
          <Input
            label="Dirección Completa"
            type="text"
            placeholder="Calle, número, código postal, ciudad"
            value={formData?.address}
            onChange={(e) => handleInputChange('address', e?.target?.value)}
          />
        </div>
      </div>
      {/* Visual Identity */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Palette" size={20} color="var(--color-primary)" />
          <h3 className="text-lg font-semibold text-foreground">Identidad Visual</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Logo del Negocio
            </label>
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Icon name="ImagePlus" size={32} color="var(--color-muted-foreground)" />
                    <p className="text-xs text-muted-foreground mt-2">Logo</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('logo', e)}
                className="hidden"
                id="logo-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('logo-upload')?.click()}
                iconName="Upload"
                iconPosition="left"
              >
                Subir Logo
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Recomendado: 200x200px, formato PNG o JPG
              </p>
            </div>
          </div>

          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Banner del Perfil
            </label>
            <div className="flex flex-col items-center space-y-4">
              <div className="w-full h-32 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                {bannerPreview ? (
                  <Image
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Icon name="ImagePlus" size={32} color="var(--color-muted-foreground)" />
                    <p className="text-xs text-muted-foreground mt-2">Banner</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('banner', e)}
                className="hidden"
                id="banner-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('banner-upload')?.click()}
                iconName="Upload"
                iconPosition="left"
              >
                Subir Banner
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Recomendado: 1200x300px, formato PNG o JPG
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Verification */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Icon name="Shield" size={20} color="var(--color-primary)" />
            <h3 className="text-lg font-semibold text-foreground">Verificación del Negocio</h3>
          </div>
          {formData?.isVerified && (
            <div className="flex items-center space-x-2 bg-success/10 px-3 py-1 rounded-full">
              <Icon name="CheckCircle" size={16} color="var(--color-success)" />
              <span className="text-sm font-medium text-success">Verificado</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            La verificación de tu negocio aumenta la confianza de los clientes y mejora tu visibilidad en la plataforma.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
              <Icon name="FileText" size={20} color="var(--color-accent)" />
              <div>
                <h4 className="font-medium text-foreground">Documentación</h4>
                <p className="text-sm text-muted-foreground">
                  Registro mercantil o licencia comercial
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
              <Icon name="MapPin" size={20} color="var(--color-accent)" />
              <div>
                <h4 className="font-medium text-foreground">Ubicación</h4>
                <p className="text-sm text-muted-foreground">
                  Dirección física verificable
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
              <Icon name="Phone" size={20} color="var(--color-accent)" />
              <div>
                <h4 className="font-medium text-foreground">Contacto</h4>
                <p className="text-sm text-muted-foreground">
                  Teléfono y email verificados
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
              <Icon name="Star" size={20} color="var(--color-accent)" />
              <div>
                <h4 className="font-medium text-foreground">Reputación</h4>
                <p className="text-sm text-muted-foreground">
                  Historial de ventas positivo
                </p>
              </div>
            </div>
          </div>

          {!formData?.isVerified && (
            <div className="pt-4">
              <Button
                variant="default"
                onClick={handleVerificationRequest}
                iconName="Send"
                iconPosition="left"
                disabled={!formData?.businessName || !formData?.email || !formData?.phone}
              >
                Solicitar Verificación
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupSection;