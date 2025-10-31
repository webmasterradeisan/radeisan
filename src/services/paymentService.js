/**
 * RADEISAN - Payment Service
 * Integración completa con MercadoPago y Bold.co
 * Para compra de puntos premium en Colombia
 */

import { supabase } from '../supabase';

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

const PAYMENT_CONFIG = {
  mercadopago: {
    scriptUrl: 'https://sdk.mercadopago.com/js/v2',
    checkoutUrl: 'https://api.mercadopago.com/checkout/preferences',
  },
  bold: {
    scriptUrl: 'https://checkout.bold.co/library/boldPaymentButton.js',
    apiUrl: 'https://api.bold.co/v1',
  },
  webhookUrls: {
    mercadopago: `${window.location.origin}/api/webhooks/mercadopago`,
    bold: `${window.location.origin}/api/webhooks/bold`,
  }
};

// ==========================================
// CLASE PRINCIPAL - PAYMENT SERVICE
// ==========================================

class PaymentService {
  constructor() {
    this.mercadopagoInstance = null;
    this.boldInstance = null;
    this.activeGateways = [];
    this.initialized = false;
  }

  /**
   * Inicializar el servicio de pagos
   */
  async initialize() {
    try {
      // Cargar pasarelas activas desde Supabase
      const { data, error } = await supabase.rpc('get_active_gateways');
      
      if (error) throw error;
      
      this.activeGateways = data || [];
      
      // Inicializar cada pasarela activa
      for (const gateway of this.activeGateways) {
        if (gateway.gateway_name === 'mercadopago') {
          await this.initializeMercadoPago(gateway);
        } else if (gateway.gateway_name === 'bold') {
          await this.initializeBold(gateway);
        }
      }
      
      this.initialized = true;
      return { success: true, gateways: this.activeGateways };
    } catch (error) {
      console.error('Error initializing payment service:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener pasarelas activas
   */
  getActiveGateways() {
    return this.activeGateways;
  }

  /**
   * Obtener pasarela predeterminada
   */
  getDefaultGateway() {
    return this.activeGateways.find(g => g.is_default) || this.activeGateways[0];
  }

  // ==========================================
  // MERCADOPAGO - INTEGRACIÓN
  // ==========================================

  /**
   * Inicializar MercadoPago
   */
  async initializeMercadoPago(gateway) {
    try {
      // Cargar SDK de MercadoPago
      if (!window.MercadoPago) {
        await this.loadScript(PAYMENT_CONFIG.mercadopago.scriptUrl);
      }

      // Obtener credenciales desde admin
      const { data: config, error } = await supabase.rpc('get_gateways_config_admin');
      
      if (error) throw error;

      const mercadopagoConfig = config?.find(g => g.gateway_name === 'mercadopago');
      
      if (!mercadopagoConfig?.credentials?.public_key) {
        throw new Error('MercadoPago public key no configurada');
      }

      // Inicializar instancia de MercadoPago
      this.mercadopagoInstance = new window.MercadoPago(
        mercadopagoConfig.credentials.public_key,
        {
          locale: 'es-CO'
        }
      );

      console.log('✅ MercadoPago inicializado');
      return true;
    } catch (error) {
      console.error('Error initializing MercadoPago:', error);
      return false;
    }
  }

  /**
   * Crear preferencia de pago en MercadoPago
   */
  async createMercadoPagoPreference(packageData, userId) {
    try {
      // 1. Crear compra pendiente en la base de datos
      const { data: purchaseId, error: purchaseError } = await supabase.rpc(
        'create_pending_purchase',
        {
          p_user_id: userId,
          p_package_id: packageData.id,
          p_gateway_name: 'mercadopago',
          p_ip_address: null, // Se puede obtener del cliente si es necesario
          p_user_agent: navigator.userAgent
        }
      );

      if (purchaseError) throw purchaseError;

      // 2. Crear preferencia en MercadoPago (esto debe hacerse en el backend por seguridad)
      // Llamar a tu función Edge de Supabase
      const { data: preference, error: preferenceError } = await supabase.functions.invoke(
        'create-mercadopago-preference',
        {
          body: {
            purchase_id: purchaseId,
            package_data: {
              title: packageData.name,
              description: packageData.description,
              quantity: 1,
              currency_id: 'COP',
              unit_price: parseFloat(packageData.price_cop)
            },
            payer: {
              email: userId // Se debe obtener el email del usuario
            },
            back_urls: {
              success: `${window.location.origin}/purchase/success`,
              failure: `${window.location.origin}/purchase/failure`,
              pending: `${window.location.origin}/purchase/pending`
            },
            auto_return: 'approved',
            notification_url: PAYMENT_CONFIG.webhookUrls.mercadopago,
            metadata: {
              purchase_id: purchaseId,
              user_id: userId
            }
          }
        }
      );

      if (preferenceError) throw preferenceError;

      return {
        success: true,
        preferenceId: preference.id,
        purchaseId: purchaseId
      };
    } catch (error) {
      console.error('Error creating MercadoPago preference:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Abrir checkout de MercadoPago
   */
  async openMercadoPagoCheckout(preferenceId) {
    try {
      if (!this.mercadopagoInstance) {
        throw new Error('MercadoPago no está inicializado');
      }

      // Abrir modal de checkout
      this.mercadopagoInstance.checkout({
        preference: {
          id: preferenceId
        },
        autoOpen: true
      });

      return { success: true };
    } catch (error) {
      console.error('Error opening MercadoPago checkout:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // BOLD.CO - INTEGRACIÓN
  // ==========================================

  /**
   * Inicializar Bold.co
   */
  async initializeBold(gateway) {
    try {
      // Cargar SDK de Bold
      if (!window.BoldCheckout) {
        await this.loadScript(PAYMENT_CONFIG.bold.scriptUrl);
      }

      console.log('✅ Bold.co inicializado');
      return true;
    } catch (error) {
      console.error('Error initializing Bold:', error);
      return false;
    }
  }

  /**
   * Crear intención de pago en Bold.co
   */
  async createBoldPaymentIntent(packageData, userId) {
    try {
      // 1. Crear compra pendiente en la base de datos
      const { data: purchaseId, error: purchaseError } = await supabase.rpc(
        'create_pending_purchase',
        {
          p_user_id: userId,
          p_package_id: packageData.id,
          p_gateway_name: 'bold',
          p_ip_address: null,
          p_user_agent: navigator.userAgent
        }
      );

      if (purchaseError) throw purchaseError;

      // 2. Crear intención de pago en Bold (debe hacerse en el backend)
      const { data: intent, error: intentError } = await supabase.functions.invoke(
        'create-bold-payment-intent',
        {
          body: {
            purchase_id: purchaseId,
            amount: parseFloat(packageData.price_cop),
            currency: 'COP',
            description: `${packageData.name} - ${packageData.points_amount} puntos`,
            redirect_url: `${window.location.origin}/purchase/success`,
            metadata: {
              purchase_id: purchaseId,
              user_id: userId,
              package_id: packageData.id
            }
          }
        }
      );

      if (intentError) throw intentError;

      return {
        success: true,
        intentId: intent.id,
        checkoutUrl: intent.checkout_url,
        purchaseId: purchaseId
      };
    } catch (error) {
      console.error('Error creating Bold payment intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Abrir checkout de Bold.co
   */
  async openBoldCheckout(checkoutUrl) {
    try {
      // Opción 1: Redirigir a la URL de checkout
      window.location.href = checkoutUrl;

      // Opción 2: Abrir en nueva ventana (descomentar si prefieres esto)
      // window.open(checkoutUrl, '_blank', 'width=800,height=600');

      return { success: true };
    } catch (error) {
      console.error('Error opening Bold checkout:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // FUNCIONES PRINCIPALES DE COMPRA
  // ==========================================

  /**
   * Iniciar proceso de compra con la pasarela especificada
   */
  async purchasePackage(packageData, gatewayName = null) {
    try {
      // Verificar que el usuario esté autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Determinar qué pasarela usar
      const gateway = gatewayName 
        ? this.activeGateways.find(g => g.gateway_name === gatewayName)
        : this.getDefaultGateway();

      if (!gateway) {
        throw new Error('No hay pasarelas de pago disponibles');
      }

      // Procesar según la pasarela
      if (gateway.gateway_name === 'mercadopago') {
        return await this.processMercadoPagoPurchase(packageData, user.id);
      } else if (gateway.gateway_name === 'bold') {
        return await this.processBoldPurchase(packageData, user.id);
      }

      throw new Error('Pasarela no soportada');
    } catch (error) {
      console.error('Error in purchasePackage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar compra con MercadoPago
   */
  async processMercadoPagoPurchase(packageData, userId) {
    try {
      // 1. Crear preferencia
      const preference = await this.createMercadoPagoPreference(packageData, userId);
      
      if (!preference.success) {
        throw new Error(preference.error);
      }

      // 2. Abrir checkout
      const checkout = await this.openMercadoPagoCheckout(preference.preferenceId);
      
      if (!checkout.success) {
        throw new Error(checkout.error);
      }

      return {
        success: true,
        purchaseId: preference.purchaseId,
        gateway: 'mercadopago'
      };
    } catch (error) {
      console.error('Error processing MercadoPago purchase:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar compra con Bold.co
   */
  async processBoldPurchase(packageData, userId) {
    try {
      // 1. Crear intención de pago
      const intent = await this.createBoldPaymentIntent(packageData, userId);
      
      if (!intent.success) {
        throw new Error(intent.error);
      }

      // 2. Abrir checkout
      const checkout = await this.openBoldCheckout(intent.checkoutUrl);
      
      if (!checkout.success) {
        throw new Error(checkout.error);
      }

      return {
        success: true,
        purchaseId: intent.purchaseId,
        gateway: 'bold'
      };
    } catch (error) {
      console.error('Error processing Bold purchase:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==========================================
  // VERIFICACIÓN DE ESTADO DE COMPRA
  // ==========================================

  /**
   * Verificar estado de una compra
   */
  async checkPurchaseStatus(purchaseId) {
    try {
      const { data, error } = await supabase
        .from('premium_purchases')
        .select('*')
        .eq('id', purchaseId)
        .single();

      if (error) throw error;

      return {
        success: true,
        purchase: data
      };
    } catch (error) {
      console.error('Error checking purchase status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener historial de compras del usuario
   */
  async getUserPurchaseHistory(userId, limit = 20) {
    try {
      const { data, error } = await supabase.rpc('get_user_purchases', {
        p_user_id: userId,
        p_limit: limit
      });

      if (error) throw error;

      return {
        success: true,
        purchases: data || []
      };
    } catch (error) {
      console.error('Error getting purchase history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================

  /**
   * Cargar script externo
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Verificar si el script ya está cargado
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        console.log(`✅ Script cargado: ${src}`);
        resolve();
      };
      
      script.onerror = () => {
        console.error(`❌ Error cargando script: ${src}`);
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.body.appendChild(script);
    });
  }

  /**
   * Formatear precio en COP
   */
  formatCOP(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Calcular precio con descuento
   */
  calculateDiscountedPrice(price, discountPercentage) {
    return price * (1 - discountPercentage / 100);
  }

  /**
   * Validar paquete antes de compra
   */
  validatePackage(packageData) {
    if (!packageData) {
      return { valid: false, error: 'Paquete no encontrado' };
    }

    if (!packageData.is_active) {
      return { valid: false, error: 'Este paquete no está disponible' };
    }

    if (!packageData.points_amount || packageData.points_amount <= 0) {
      return { valid: false, error: 'Cantidad de puntos inválida' };
    }

    if (!packageData.price_cop || packageData.price_cop <= 0) {
      return { valid: false, error: 'Precio inválido' };
    }

    return { valid: true };
  }

  /**
   * Obtener información de métodos de pago disponibles
   */
  getAvailablePaymentMethods() {
    const methods = [];

    for (const gateway of this.activeGateways) {
      if (gateway.supported_methods && Array.isArray(gateway.supported_methods)) {
        methods.push({
          gateway: gateway.gateway_name,
          display_name: gateway.display_name,
          methods: gateway.supported_methods,
          logo_url: gateway.logo_url
        });
      }
    }

    return methods;
  }
}

// ==========================================
// EXPORTAR INSTANCIA SINGLETON
// ==========================================

const paymentService = new PaymentService();

export default paymentService;

// ==========================================
// EXPORTAR FUNCIONES ADICIONALES
// ==========================================

/**
 * Hook para usar el servicio de pagos en componentes React
 */
export const usePaymentService = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const initialize = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await paymentService.initialize();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const purchase = async (packageData, gatewayName = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await paymentService.purchasePackage(packageData, gatewayName);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    paymentService,
    loading,
    error,
    initialize,
    purchase
  };
};

// ==========================================
// CONSTANTES EXPORTADAS
// ==========================================

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

export const PAYMENT_METHODS = {
  PSE: 'pse',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  EFECTY: 'efecty',
  BALOTO: 'baloto',
  CORRESPONSAL: 'corresponsal'
};

export const GATEWAYS = {
  MERCADOPAGO: 'mercadopago',
  BOLD: 'bold'
};
