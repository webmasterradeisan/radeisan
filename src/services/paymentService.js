/**
 * RADEISAN - Payment Service (Versión Simplificada)
 * Sin Edge Functions - Solo RPCs
 */

import { supabase } from '../lib/supabase.js';

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

const PAYMENT_CONFIG = {
  mercadopago: {
    scriptUrl: 'https://sdk.mercadopago.com/js/v2',
  },
  webhookUrls: {
    mercadopago: `${window.location.origin}/api/webhooks/mercadopago`,
  }
};

// ==========================================
// CLASE PRINCIPAL - PAYMENT SERVICE
// ==========================================

class PaymentService {
  constructor() {
    this.mercadopagoInstance = null;
    this.activeGateways = [];
    this.defaultGateway = null;
    this.initialized = false;
  }

  /**
   * Inicializar el servicio de pagos
   */
  async initialize() {
    try {
      console.log('🔧 [PaymentService] Iniciando inicialización...');
      
      console.log('📡 [PaymentService] Llamando a supabase.rpc("get_active_gateways")...');
      const { data, error } = await supabase.rpc('get_active_gateways');
      
      if (error) {
        console.error('❌ [PaymentService] Error en RPC get_active_gateways:', error);
        throw error;
      }
      
      console.log('✅ [PaymentService] Respuesta de RPC recibida:', {
        data,
        tipo: typeof data,
        esArray: Array.isArray(data),
        cantidad: data?.length || 0
      });
      
      this.activeGateways = Array.isArray(data) ? data : [];
      console.log(`📊 [PaymentService] Pasarelas activas cargadas: ${this.activeGateways.length}`);
      
      if (this.activeGateways.length > 0) {
        console.log('📋 [PaymentService] Lista de pasarelas:', 
          this.activeGateways.map(g => ({
            name: g.gateway_name,
            display: g.display_name,
            active: g.is_active,
            default: g.is_default
          }))
        );
      } else {
        console.warn('⚠️ [PaymentService] No se encontraron pasarelas activas');
      }
      
      this.defaultGateway = this.activeGateways.find(g => g.is_default) || this.activeGateways[0] || null;
      if (this.defaultGateway) {
        console.log('✅ [PaymentService] Pasarela predeterminada:', this.defaultGateway.display_name);
      }
      
      // Inicializar MercadoPago si está disponible
      const mpGateway = this.activeGateways.find(g => g.gateway_name === 'mercadopago');
      if (mpGateway) {
        await this.initializeMercadoPago(mpGateway);
      }
      
      this.initialized = true;
      console.log('🎉 [PaymentService] Servicio completamente inicializado');
      
      return { 
        success: true, 
        gateways: this.activeGateways,
        count: this.activeGateways.length
      };
      
    } catch (error) {
      console.error('❌ [PaymentService] Error fatal al inicializar:', error);
      this.initialized = false;
      this.activeGateways = [];
      this.defaultGateway = null;
      
      return { 
        success: false, 
        error: error.message || 'Error desconocido',
        details: error
      };
    }
  }

  /**
   * Obtener pasarelas activas
   */
  getActiveGateways() {
    if (!this.initialized) {
      console.warn('⚠️ [PaymentService] getActiveGateways() llamado antes de inicializar');
      return [];
    }
    
    console.log('📊 [PaymentService] getActiveGateways() retornando:', this.activeGateways.length, 'pasarelas');
    return this.activeGateways;
  }

  /**
   * Obtener pasarela predeterminada
   */
  getDefaultGateway() {
    if (!this.initialized) {
      console.warn('⚠️ [PaymentService] getDefaultGateway() llamado antes de inicializar');
      return null;
    }
    
    return this.defaultGateway;
  }

  // ==========================================
  // MERCADOPAGO - INTEGRACIÓN SIMPLIFICADA
  // ==========================================

  /**
   * Inicializar MercadoPago
   */
  async initializeMercadoPago(gateway) {
    try {
      console.log('🔧 [MercadoPago] Iniciando inicialización...');
      
      if (!window.MercadoPago) {
        console.log('📥 [MercadoPago] Cargando SDK...');
        await this.loadScript(PAYMENT_CONFIG.mercadopago.scriptUrl);
      } else {
        console.log('✅ [MercadoPago] SDK ya estaba cargado');
      }

      console.log('✅ [MercadoPago] Inicializado exitosamente');
      return true;
      
    } catch (error) {
      console.error('❌ [MercadoPago] Error al inicializar:', error);
      return false;
    }
  }

  /**
   * Crear preferencia de pago (SIMPLIFICADO - sin Edge Function)
   */
  async createMercadoPagoPreference(packageData, userId) {
    try {
      console.log('🔧 [MercadoPago] Creando preferencia de pago...');
      
      // Llamar a función RPC en lugar de Edge Function
      const { data, error } = await supabase.rpc('create_mercadopago_preference', {
        p_user_id: userId,
        p_package_id: packageData.id,
        p_gateway_name: 'mercadopago'
      });

      if (error) {
        console.error('❌ [MercadoPago] Error en RPC:', error);
        throw error;
      }

      console.log('✅ [MercadoPago] Preferencia creada:', data);

      if (!data || !data.success) {
        throw new Error(data?.error || 'Error al crear preferencia');
      }

      return {
        success: true,
        purchaseId: data.purchase_id,
        packageData: data
      };
      
    } catch (error) {
      console.error('❌ [MercadoPago] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar compra con MercadoPago (SIMPLIFICADO)
   */
  async processMercadoPagoPurchase(packageData, userId) {
    try {
      console.log('🔧 [MercadoPago] Procesando compra...');
      
      // Crear preferencia
      const preference = await this.createMercadoPagoPreference(packageData, userId);
      
      if (!preference.success) {
        throw new Error(preference.error);
      }

      // FLUJO SIMPLIFICADO: Mostrar información al usuario
      const message = `
Compra registrada exitosamente!

Paquete: ${packageData.name}
Puntos: ${packageData.points_amount}
Precio: $${this.calculateDiscountedPrice(packageData.price_cop, packageData.discount_percentage).toLocaleString()} COP

ID de compra: ${preference.purchaseId}

NOTA: Este es un flujo simplificado de desarrollo.
Para completar el pago en producción, necesitarás:
1. Configurar credenciales de MercadoPago
2. Implementar Edge Functions
3. Configurar webhooks

Por ahora, la compra se ha registrado como PENDIENTE en la base de datos.
      `;

      alert(message);
      
      // Redirigir a página de confirmación
      window.location.href = `/purchase/pending?purchase_id=${preference.purchaseId}`;

      return {
        success: true,
        purchaseId: preference.purchaseId,
        gateway: 'mercadopago'
      };
      
    } catch (error) {
      console.error('❌ [MercadoPago] Error procesando:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==========================================
  // FUNCIONES PRINCIPALES
  // ==========================================

  /**
   * Iniciar proceso de compra
   */
  async purchasePackage(packageData, gatewayName = null) {
    try {
      console.log('🛒 [PaymentService] Iniciando compra...');
      
      // Verificar autenticación
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Determinar pasarela
      const gateway = gatewayName 
        ? this.activeGateways.find(g => g.gateway_name === gatewayName)
        : this.getDefaultGateway();

      if (!gateway) {
        throw new Error('No hay pasarelas de pago disponibles');
      }

      console.log('🏦 [PaymentService] Usando pasarela:', gateway.display_name);

      // Procesar según la pasarela
      if (gateway.gateway_name === 'mercadopago') {
        return await this.processMercadoPagoPurchase(packageData, user.id);
      }

      throw new Error('Pasarela no soportada');
      
    } catch (error) {
      console.error('❌ [PaymentService] Error en purchasePackage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar estado de una compra
   */
  async checkPurchaseStatus(purchaseId) {
  try {
    const { data, error } = await supabase.rpc('get_purchase_status', {
      p_purchase_id: purchaseId
    });

    if (error) throw error;

    if (!data || !data.success) {
      throw new Error(data?.error || 'Error al obtener estado de compra');
    }

    return {
      success: true,
      purchase: data.purchase
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
      p_limit: limit
    });

    if (error) throw error;

    if (!data || !data.success) {
      throw new Error(data?.error || 'Error al obtener historial');
    }

    return {
      success: true,
      purchases: data.purchases || []
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
