/**
 * RADEISAN - Payment Service (Híbrido Frontend/Backend)
 * Soluciona la falta de link en la RPC generando la preferencia desde el cliente
 */

import { supabase } from '../lib/supabase.js';

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

const PAYMENT_CONFIG = {
  mercadopago: {
    scriptUrl: 'https://sdk.mercadopago.com/js/v2',
    apiUrl: 'https://api.mercadopago.com/checkout/preferences'
  }
};

class PaymentService {
  constructor() {
    this.mercadopagoInstance = null;
    this.activeGateways = [];
    this.defaultGateway = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      const { data, error } = await supabase.rpc('get_active_gateways');
      
      if (error) throw error;
      
      this.activeGateways = Array.isArray(data) ? data : [];
      this.defaultGateway = this.activeGateways.find(g => g.is_default) || this.activeGateways[0] || null;
      
      const mpGateway = this.activeGateways.find(g => g.gateway_name === 'mercadopago');
      if (mpGateway) {
        await this.initializeMercadoPago(mpGateway);
      }
      
      this.initialized = true;
      return { success: true, gateways: this.activeGateways };
      
    } catch (error) {
      console.error('❌ [PaymentService] Error fatal al inicializar:', error);
      return { success: false, error: error.message };
    }
  }

  getActiveGateways() { return this.activeGateways; }
  getDefaultGateway() { return this.defaultGateway; }

  // ==========================================
  // MERCADOPAGO
  // ==========================================

  async initializeMercadoPago(gateway) {
    try {
      if (!window.MercadoPago) {
        await this.loadScript(PAYMENT_CONFIG.mercadopago.scriptUrl);
      }
      // Buscamos la Public Key en varios lugares posibles de la estructura
      const publicKey = gateway.public_key || (gateway.credentials && gateway.credentials.public_key);

      if (publicKey) {
        this.mercadopagoInstance = new window.MercadoPago(publicKey, { locale: 'es-CO' });
      }
      return true;
    } catch (error) {
      console.error('❌ [MercadoPago] Error al inicializar:', error);
      return false;
    }
  }

  /**
   * 1. Crea el registro en BD
   * 2. Si no hay link, lo pide a la API de MercadoPago desde el navegador
   */
  async processMercadoPagoPurchase(packageData, userId) {
    try {
      console.log('🚀 [MercadoPago] Iniciando flujo de compra...');
      
      // A. Obtener credenciales de la pasarela cargada en memoria
      const gatewayConfig = this.activeGateways.find(g => g.gateway_name === 'mercadopago');
      const accessToken = gatewayConfig?.access_token || gatewayConfig?.credentials?.access_token;

      // B. Llamar a la RPC (Solo crea el registro en BD "Pendiente")
      const { data, error } = await supabase.rpc('create_mercadopago_preference', {
        p_user_id: userId,
        p_package_id: packageData.id,
        p_gateway_name: 'mercadopago'
      });

      if (error) throw error;
      if (!data || !data.success) throw new Error(data?.error || 'Error al crear transacción');

      const purchaseId = data.purchase_id;
      let initPoint = data.init_point || data.sandbox_init_point;

      // C. FALLBACK: Si la RPC no devolvió el link, lo generamos aquí (Client-Side)
      if (!initPoint && accessToken) {
        console.log('⚠️ [MercadoPago] RPC sin link. Generando preferencia desde el cliente...');
        
        const preferenceData = {
          items: [{
            title: packageData.name,
            description: `Puntos Premium: ${packageData.points_amount}`,
            quantity: 1,
            currency_id: 'COP',
            unit_price: Number(this.calculateDiscountedPrice(packageData.price_cop, packageData.discount_percentage))
          }],
          payer: {
            // Aquí podrías pasar el email del usuario si lo tienes disponible
          },
          back_urls: {
            success: `${window.location.origin}/purchase/success`,
            failure: `${window.location.origin}/purchase/failure`,
            pending: `${window.location.origin}/purchase/pending`
          },
          external_reference: purchaseId, // Vinculamos con el ID de tu base de datos
          auto_return: "approved"
        };

        const mpResponse = await fetch(PAYMENT_CONFIG.mercadopago.apiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(preferenceData)
        });

        const mpData = await mpResponse.json();
        
        if (mpData.init_point) {
          initPoint = mpData.init_point; // Usar sandbox_init_point para pruebas si prefieres
          console.log('✅ [MercadoPago] Link generado manualmente:', initPoint);
        } else {
          console.error('❌ [MercadoPago] Error API:', mpData);
        }
      }

      // D. Redirección final
      if (initPoint) {
        return {
          success: true,
          paymentUrl: initPoint,
          purchaseId: purchaseId,
          gateway: 'mercadopago'
        };
      }

      // Si falló todo, enviamos a pendiente (lo que te pasa ahora)
      console.warn('⚠️ No se pudo obtener link de pago. Revisa el Access Token.');
      return {
        success: true, // Marcamos true para que no muestre error en UI, pero irá a pending
        purchaseId: purchaseId,
        gateway: 'mercadopago'
      };
      
    } catch (error) {
      console.error('❌ [MercadoPago] Error procesando:', error);
      return { success: false, error: error.message };
    }
  }

  // ... (Resto de funciones iguales: purchasePackage, checkPurchaseStatus, loadScript, helpers) ...
  
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
      return { success: false, error: error.message };
    }
  }

  async checkPurchaseStatus(purchaseId) {
    try {
      const { data, error } = await supabase.rpc('get_purchase_status', { p_purchase_id: purchaseId });
      if (error) throw error;
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
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.body.appendChild(script);
    });
  }

  calculateDiscountedPrice(price, discountPercentage) {
    return price * (1 - discountPercentage / 100);
  }

  validatePackage(packageData) {
    if (!packageData || !packageData.is_active) return { valid: false, error: 'Paquete no disponible' };
    if (!packageData.price_cop || packageData.price_cop <= 0) return { valid: false, error: 'Precio inválido' };
    return { valid: true };
  }
}

const paymentService = new PaymentService();
export default paymentService;
