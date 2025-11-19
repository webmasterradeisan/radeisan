/**
 * RADEISAN - Payment Service (Corregido para Producción)
 * Integra redirección real a Mercado Pago
 */

import { supabase } from '../lib/supabase.js';

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

const PAYMENT_CONFIG = {
  mercadopago: {
    scriptUrl: 'https://sdk.mercadopago.com/js/v2',
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
      
      const { data, error } = await supabase.rpc('get_active_gateways');
      
      if (error) {
        console.error('❌ [PaymentService] Error en RPC get_active_gateways:', error);
        throw error;
      }
      
      this.activeGateways = Array.isArray(data) ? data : [];
      console.log(`📊 [PaymentService] Pasarelas activas cargadas: ${this.activeGateways.length}`);
      
      this.defaultGateway = this.activeGateways.find(g => g.is_default) || this.activeGateways[0] || null;
      
      // Inicializar MercadoPago si está activo y tiene credenciales
      const mpGateway = this.activeGateways.find(g => g.gateway_name === 'mercadopago');
      if (mpGateway) {
        await this.initializeMercadoPago(mpGateway);
      }
      
      this.initialized = true;
      return { 
        success: true, 
        gateways: this.activeGateways
      };
      
    } catch (error) {
      console.error('❌ [PaymentService] Error fatal al inicializar:', error);
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
    return this.defaultGateway;
  }

  // ==========================================
  // MERCADOPAGO - INTEGRACIÓN REAL
  // ==========================================

  /**
   * Inicializar SDK de MercadoPago
   */
  async initializeMercadoPago(gateway) {
    try {
      if (!window.MercadoPago) {
        await this.loadScript(PAYMENT_CONFIG.mercadopago.scriptUrl);
      }

      // Intentar obtener la Public Key del objeto gateway
      // Asumimos que el RPC retorna un campo 'public_key' o 'credentials'
      const publicKey = gateway.public_key || (gateway.credentials && gateway.credentials.public_key);

      if (publicKey) {
        console.log('🔑 [MercadoPago] Inicializando instancia con Public Key...');
        this.mercadopagoInstance = new window.MercadoPago(publicKey, {
          locale: 'es-CO'
        });
      } else {
        console.warn('⚠️ [MercadoPago] No se encontró Public Key en la configuración del gateway');
      }

      return true;
    } catch (error) {
      console.error('❌ [MercadoPago] Error al inicializar:', error);
      return false;
    }
  }

  /**
   * Crear preferencia de pago (Llamada al Backend)
   */
  async createMercadoPagoPreference(packageData, userId) {
    try {
      console.log('🔧 [MercadoPago] Solicitando preferencia al servidor...');
      
      // Llamamos al RPC que debe encargarse de generar el link
      const { data, error } = await supabase.rpc('create_mercadopago_preference', {
        p_user_id: userId,
        p_package_id: packageData.id,
        p_gateway_name: 'mercadopago'
      });

      if (error) throw error;

      console.log('✅ [MercadoPago] Respuesta del servidor:', data);

      if (!data || !data.success) {
        throw new Error(data?.error || 'Error al crear preferencia en el servidor');
      }

      return {
        success: true,
        purchaseId: data.purchase_id,
        packageData: data // Aquí debe venir init_point o preference_id
      };
      
    } catch (error) {
      console.error('❌ [MercadoPago] Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesar compra con MercadoPago (REDIRECCIÓN REAL)
   */
  async processMercadoPagoPurchase(packageData, userId) {
    try {
      console.log('🚀 [MercadoPago] Iniciando flujo de compra...');
      
      // 1. Crear preferencia en el backend
      const preference = await this.createMercadoPagoPreference(packageData, userId);
      
      if (!preference.success) {
        throw new Error(preference.error);
      }

      const responseData = preference.packageData;

      // 2. LÓGICA DE REDIRECCIÓN (Prioridad: URL directa)
      
      // A. Si el backend devolvió una URL de inicio (init_point)
      if (responseData.init_point || responseData.sandbox_init_point) {
        const url = responseData.init_point || responseData.sandbox_init_point;
        console.log('🔗 [MercadoPago] Redirigiendo a checkout:', url);
        
        // Retornamos la URL para que el componente haga la redirección 
        // o la hacemos aquí directamente.
        return {
          success: true,
          paymentUrl: url, // El componente PurchasePointsPage usará esto
          purchaseId: preference.purchaseId,
          gateway: 'mercadopago'
        };
      }
      
      // B. Si el backend devolvió solo un ID de preferencia (Checkout Pro frontend)
      if (responseData.preference_id && this.mercadopagoInstance) {
        console.log('💳 [MercadoPago] Abriendo Checkout Pro con ID:', responseData.preference_id);
        
        // Opción: Retornar para que el componente use el objeto checkout
        // O usar el método .checkout() si está disponible en esta versión del SDK
        const checkout = this.mercadopagoInstance.checkout({
          preference: {
            id: responseData.preference_id
          },
          autoOpen: true
        });
        
        return {
            success: true,
            checkoutOpened: true,
            purchaseId: preference.purchaseId,
            gateway: 'mercadopago'
        };
      }

      // C. Fallback: Si no hay URL, mantenemos el comportamiento "Pendiente" 
      // pero avisamos en consola que falta configuración en el backend.
      console.warn('⚠️ [MercadoPago] El backend no devolvió "init_point". Se usará flujo manual.');
      
      return {
        success: true,
        // Al no haber URL, el componente PurchasePointsPage usará su lógica fallback 
        // de redirección manual a /purchase/pending
        purchaseId: preference.purchaseId,
        gateway: 'mercadopago'
      };
      
    } catch (error) {
      console.error('❌ [MercadoPago] Error procesando:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // FUNCIONES PRINCIPALES DE COMPRA
  // ==========================================

  async purchasePackage(packageData, gatewayName = null) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) throw new Error('Usuario no autenticado');

      const gateway = gatewayName 
        ? this.activeGateways.find(g => g.gateway_name === gatewayName)
        : this.getDefaultGateway();

      if (!gateway) throw new Error('No hay pasarelas disponibles');

      if (gateway.gateway_name === 'mercadopago') {
        return await this.processMercadoPagoPurchase(packageData, user.id);
      }

      throw new Error('Pasarela no soportada');
      
    } catch (error) {
      console.error('❌ [PaymentService] Error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // UTILIDADES Y OTROS MÉTODOS
  // ==========================================

  async checkPurchaseStatus(purchaseId) {
    try {
      const { data, error } = await supabase.rpc('get_purchase_status', {
        p_purchase_id: purchaseId
      });

      if (error) throw error;
      if (!data || !data.success) throw new Error(data?.error || 'Error desconocido');

      return { success: true, purchase: data.purchase };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getUserPurchaseHistory(userId, limit = 20) {
    try {
      const { data, error } = await supabase.rpc('get_user_purchases', { p_limit: limit });
      if (error) throw error;
      return { success: true, purchases: data.purchases || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.body.appendChild(script);
    });
  }

  validatePackage(packageData) {
    if (!packageData || !packageData.is_active) return { valid: false, error: 'Paquete no disponible' };
    if (!packageData.price_cop || packageData.price_cop <= 0) return { valid: false, error: 'Precio inválido' };
    return { valid: true };
  }
}

const paymentService = new PaymentService();
export default paymentService;
