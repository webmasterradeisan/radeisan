// src/pages/product-store/index.jsx
// ============================================================================
// TIENDA DE PRODUCTOS - SOPORTE HÍBRIDO (GRATIS & PREMIUM)
// ============================================================================
// ✅ Distinción visual entre productos Premium (Verde) y Gratis (Naranja).
// ✅ Validación inteligente de saldos según el tipo de producto.
// ✅ Checkout adaptado a la moneda.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { usePoints } from '../../contexts/PointsContext';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import PointsBalanceCard from '../points-rewards-store/components/PointsBalanceCard';

const ProductStorePage = () => {
  const { user } = useAuth();
  const { freePoints, premiumPoints, pointsEarnedToday, missions, loading: pointsLoading, refreshPoints } = usePoints();
  
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Estados Checkout
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({ address: '', city: '', phone: '', notes: '' });
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Cargar productos
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('shop_products')
          .select('*')
          .eq('is_active', true)
          .order('price_points', { ascending: true });
        if (error) throw error;
        setProducts(data || []);
      } catch (err) { console.error(err); } finally { setLoadingProducts(false); }
    };
    loadProducts();
  }, []);

  const handleRedeemClick = (product) => {
    setSelectedProduct(product);
    setOrderSuccess(false);
    setShowCheckoutModal(true);
  };

  const handleConfirmRedeem = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;
    setProcessingOrder(true);
    try {
      const { data, error } = await supabase.rpc('redeem_product', {
        p_product_id: selectedProduct.id,
        p_shipping_info: shippingInfo
      });
      if (error) throw error;
      if (data.success) {
        setOrderSuccess(true);
        refreshPoints();
        setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, stock: p.stock - 1 } : p));
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) { console.error(err); alert('Error en la transacción.'); } finally { setProcessingOrder(false); }
  };

  return (
    <>
      <Helmet><title>Tienda de Productos | Radeisan</title></Helmet>
      <Header />
      
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Tienda de Canje</h1>
            <p className="text-muted-foreground text-lg max-w-3xl">
              Canjea productos exclusivos usando tus Puntos Gratis o Premium.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 items-start">
            
            {/* SIDEBAR */}
            <aside className="space-y-6 lg:sticky lg:top-24">
                <PointsBalanceCard 
                    freePoints={freePoints}
                    premiumPoints={premiumPoints}
                    pointsEarnedToday={pointsEarnedToday}
                    missions={missions}
                    loading={pointsLoading}
                    className="shadow-md"
                />
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Icon name="Truck" size={20} /></div>
                    <div>
                      <h3 className="font-bold text-blue-900 text-sm">Envíos Físicos</h3>
                      <p className="text-xs text-blue-700 mt-1">Coordinamos el envío a tu domicilio al confirmar el canje.</p>
                    </div>
                  </div>
                </div>
            </aside>

            {/* CONTENIDO */}
            <main>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Icon name="ShoppingBag" className="text-primary" /> Catálogo
                  </h2>
                </div>

                {loadingProducts ? (
                  <div className="flex justify-center py-20 bg-card rounded-2xl border border-border"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : products.length === 0 ? (
                  <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border"><p>No hay productos.</p></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {products.map((product) => {
                      // ✅ LÓGICA HÍBRIDA
                      const isPremium = product.points_type === 'premium';
                      const userBalance = isPremium ? premiumPoints : freePoints;
                      const canAfford = userBalance >= product.price_points;
                      const hasStock = product.stock > 0;

                      // Estilos dinámicos según moneda
                      const priceColor = isPremium ? 'text-green-600' : 'text-orange-500';
                      const priceIcon = isPremium ? 'Award' : 'Star'; // Gema vs Estrella
                      const badgeBg = isPremium ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';

                      return (
                        <div key={product.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
                          <div className="aspect-square bg-white relative overflow-hidden border-b border-border/50">
                            <img src={product.image_url || '/placeholder-product.jpg'} alt={product.title} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                            {!hasStock && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><span className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-sm font-bold -rotate-12">AGOTADO</span></div>}
                            
                            {/* Badge de Precio */}
                            <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-md border border-border shadow-sm rounded-full px-3 py-1 flex items-center gap-1 z-20">
                                <Icon name={priceIcon} size={14} className={priceColor} />
                                <span className="text-sm font-bold text-foreground">{product.price_points.toLocaleString()}</span>
                            </div>
                            
                            {/* Etiqueta Premium/Gratis */}
                            <div className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm z-20 ${badgeBg}`}>
                                {isPremium ? 'Premium' : 'Gratis'}
                            </div>
                          </div>
                          
                          <div className="p-5 flex-1 flex flex-col">
                            <div className="mb-4 flex-1">
                              <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{product.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-border">
                              <div className="flex items-center justify-between mb-4 text-xs">
                                 <span className={hasStock ? 'text-green-600' : 'text-red-600'}>{hasStock ? 'Disponible' : 'Sin Stock'}</span>
                                 <span className="text-muted-foreground">{product.stock} unid.</span>
                              </div>
                              
                              <Button 
                                fullWidth 
                                size="lg"
                                variant={canAfford ? 'default' : 'outline'}
                                disabled={!hasStock || !canAfford}
                                onClick={() => handleRedeemClick(product)}
                                className={canAfford && hasStock ? "shadow-lg shadow-primary/20" : "opacity-70"}
                              >
                                {!hasStock ? 'Agotado' : canAfford ? 'Canjear' : `Faltan ${(product.price_points - userBalance).toLocaleString()} pts`}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </main>
          </div>
        </div>
      </div>

      {/* MODAL DE CHECKOUT */}
      {showCheckoutModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform scale-100">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg flex items-center gap-2"><Icon name="Package" className="text-primary" /> Confirmar Canje</h3>
              {!orderSuccess && <button onClick={() => setShowCheckoutModal(false)}><Icon name="X" size={24} /></button>}
            </div>

            {orderSuccess ? (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto"><Icon name="Check" size={40} className="text-green-600" /></div>
                <h2 className="text-2xl font-bold mb-2">¡Orden Exitosa!</h2>
                <p className="text-muted-foreground mb-6">Se han descontado los puntos. Enviaremos tu producto pronto.</p>
                <Button onClick={() => setShowCheckoutModal(false)} fullWidth>Cerrar</Button>
              </div>
            ) : (
              <form onSubmit={handleConfirmRedeem} className="p-6 space-y-5">
                <div className="flex gap-4 p-3 bg-muted/30 rounded-xl border border-border/50">
                    <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-border p-1"><img src={selectedProduct.image_url} className="w-full h-full object-contain" alt="" /></div>
                    <div>
                        <p className="font-bold text-sm line-clamp-1">{selectedProduct.title}</p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold mt-1 ${selectedProduct.points_type === 'premium' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            <Icon name={selectedProduct.points_type === 'premium' ? "Award" : "Star"} size={12} />
                            -{selectedProduct.price_points.toLocaleString()} Puntos
                        </div>
                    </div>
                </div>
                {/* Inputs de Envío */}
                <div className="space-y-3">
                    <input type="text" required className="w-full p-3 border rounded-xl bg-background" placeholder="Dirección Completa *" value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} />
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" required className="w-full p-3 border rounded-xl bg-background" placeholder="Ciudad *" value={shippingInfo.city} onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})} />
                        <input type="tel" required className="w-full p-3 border rounded-xl bg-background" placeholder="Teléfono *" value={shippingInfo.phone} onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})} />
                    </div>
                    <textarea className="w-full p-3 border rounded-xl bg-background" rows="2" placeholder="Notas adicionales (Opcional)" value={shippingInfo.notes} onChange={e => setShippingInfo({...shippingInfo, notes: e.target.value})} />
                </div>
                <Button type="submit" fullWidth disabled={processingOrder} size="lg" className="font-bold">{processingOrder ? 'Procesando...' : 'Confirmar Envío'}</Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductStorePage;
