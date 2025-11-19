import { supabase } from '../lib/supabase.js';

// Configuración básica
const PAYMENT_CONFIG = {
  mercadopago: {
    scriptUrl: 'https://sdk.mercadopago.com/js/v2',
  }
};

class PaymentService {
  constructor() {
    this.activeGateways = [];
    this.initialized = false;
  }

  async initialize() {
    try {
      const { data, error } = await supabase.rpc('get_active_gateways');
      if (error) throw error;
      this.activeGateways = data || [];
      this.initialized = true;
      return { success: true };
    } catch (error) {
      console.error('Error init:', error);
      return { success: false };
    }
  }

  getActiveGateways() { return this.activeGateways; }
  getDefaultGateway() { return this.activeGateways.find(g => g.is_default) || this.activeGateways[0]; }
  
  validatePackage(pkg) {
    if (!pkg || !pkg.is_active) return { valid: false, error: 'Paquete no disponible' };
    return { valid: true };
  }

  async getUserPurchaseHistory(userId, limit = 10) {
      const { data } = await supabase.rpc('get_user_purchases', { p_limit: limit });
      return { success: true, purchases: data?.purchases || [] };
  }

  /**
   * PROCESO DE COMPRA CORREGIDO (Vía Edge Function)
   */
  async purchasePackage(packageData, gatewayName) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      console.log('🚀 Llamando a Edge Function: create-preference...');

      // Llamada segura a la Edge Function que creamos
      const { data, error } = await supabase.functions.invoke('create-preference', {
        body: {
          packageId: packageData.id,
          userId: user.id,
          gatewayName: 'mercadopago'
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      console.log('✅ Link recibido:', data.init_point);

      // Retornamos la URL para que la página redirija
      return {
        success: true,
        paymentUrl: data.init_point, // O data.sandbox_init_point si estás probando
        purchaseId: data.purchase_id
      };

    } catch (error) {
      console.error('❌ Error en compra:', error);
      return { success: false, error: error.message || 'Error al procesar el pago' };
    }
  }
}

const paymentService = new PaymentService();
export default paymentService;
