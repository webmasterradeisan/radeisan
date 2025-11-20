// src/pages/product-store/index.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { usePoints } from '../../contexts/PointsContext';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
// Reutilizamos la tarjeta de puntos para mostrar el saldo
import PointsBalanceCard from '../points-rewards-store/components/PointsBalanceCard';

const ProductStorePage = () => {
  const { user } = useAuth();
  // Usamos el contexto para saber si puede comprar y para refrescar el saldo al comprar
  const { freePoints, premiumPoints, pointsEarnedToday, missions, loading: pointsLoading, refreshPoints } = usePoints();
  
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Estados para el Modal de Envío (Checkout)
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    address: '',
    city: '',
    phone: '',
    notes: ''
  });
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Cargar el catálogo
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
      } catch (err) {
        console.error('Error cargando la tienda:', err);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  // Abrir el formulario de envío
  const handleRedeemClick = (product) => {
    setSelectedProduct(product);
    setOrderSuccess(false);
    setShowCheckoutModal(true);
  };

  // Enviar la orden
  const handleConfirmRedeem = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;

    setProcessingOrder(true);

    try {
      // Llamamos a la función SQL segura
      const { data, error } = await supabase.rpc('redeem_product', {
        p_product_id: selectedProduct.id,
        p_shipping_info: shippingInfo
      });

      if (error) throw error;

      if (data.success) {
        setOrderSuccess(true);
        refreshPoints(); // Actualizar el saldo visualmente
        // Bajar el stock visualmente
        setProducts(prev => prev.map(p => 
            p.id === selectedProduct.id ? { ...p, stock: p.stock - 1 } : p
        ));
      } else {
        alert(`No se pudo canjear: ${data.message}`);
      }
    } catch (err) {
      console.error('Error en transacción:', err);
      alert('Ocurrió un error al procesar tu solicitud.');
    } finally {
      setProcessingOrder(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Tienda de Productos | Radeisan</title>
      </Helmet>
      <Header />
      
      <div className="min-h-screen bg-background pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Encabezado de la Tienda */}
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">Tienda de Canje</h1>
              <p className="text-muted-foreground">
                Usa tus puntos acumulados para recibir productos reales en la puerta de tu casa.
              </p>
              
              <div className="mt-4 bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-start gap-3 max-w-2xl">
                <Icon name="Truck" className="mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-bold text-sm">Envíos Físicos</p>
                  <p className="text-sm">Al canjear, te pediremos tu dirección y teléfono para que el equipo de mensajería te entregue tu recompensa.</p>
                </div>
              </div>
            </div>
            
            {/* Tarjeta de Saldo (Reutilizada) */}
            <div className="w-full md:w-[350px] flex-shrink-0">
                 <PointsBalanceCard 
                    freePoints={freePoints}
                    premiumPoints={premiumPoints}
                    pointsEarnedToday={pointsEarnedToday}
                    missions={missions}
                    loading={pointsLoading}
                 />
            </div>
          </div>

          {/* Grid de Productos */}
          {loadingProducts ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
              <Icon name="ShoppingBag" size={64} className="mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-bold text-muted-foreground">No hay productos disponibles</h3>
              <p className="text-sm text-muted-foreground">Vuelve pronto para ver nuevas recompensas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const canAfford = freePoints >= product.price_points;
                const hasStock = product.stock > 0;

                return (
                  <div key={product.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                    {/* Imagen */}
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <img 
                        src={product.image_url || '/placeholder-product.jpg'} 
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {!hasStock && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <span className="bg-red-600 text-white px-4 py-2 rounded-full font-bold tracking-wider shadow-lg transform -rotate-12">AGOTADO</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="mb-4">
                        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {product.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                            {product.description || 'Sin descripción disponible.'}
                        </p>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex flex-col">
                               <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Precio</span>
                               <div className="flex items-center gap-1 text-orange-500 font-bold text-xl">
                                  <Icon name="Star" size={20} className="fill-current" />
                                  {product.price_points.toLocaleString()}
                               </div>
                           </div>
                           <div className="text-right">
                               <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Disponibles</span>
                               <p className="font-mono text-sm text-foreground">{product.stock}</p>
                           </div>
                        </div>
                        
                        <Button 
                          fullWidth 
                          size="lg"
                          variant={canAfford ? 'default' : 'outline'}
                          disabled={!hasStock || !canAfford}
                          onClick={() => handleRedeemClick(product)}
                          className={canAfford && hasStock ? "shadow-lg shadow-primary/20" : "opacity-70"}
                        >
                          {!hasStock ? 'Sin Stock' : canAfford ? 'Canjear Ahora' : `Te faltan ${product.price_points - freePoints}`}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================== */}
      {/* MODAL DE CHECKOUT (ENVÍO) */}
      {/* ========================== */}
      {showCheckoutModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all scale-100">
            
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Icon name="Package" /> Datos de Envío
              </h3>
              {!orderSuccess && (
                <button onClick={() => setShowCheckoutModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Icon name="X" size={24} />
                </button>
              )}
            </div>

            {orderSuccess ? (
              <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <Icon name="Check" size={48} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">¡Orden Recibida!</h2>
                <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                  Tu canje por <strong>{selectedProduct.title}</strong> ha sido procesado. Te contactaremos pronto para el envío.
                </p>
                <Button onClick={() => setShowCheckoutModal(false)} size="lg" className="min-w-[200px]">
                  Volver a la Tienda
                </Button>
              </div>
            ) : (
              <form onSubmit={handleConfirmRedeem} className="p-6 space-y-5">
                {/* Resumen Producto */}
                <div className="flex gap-4 p-3 bg-muted/50 rounded-xl border border-border">
                    <div className="w-16 h-16 bg-background rounded-lg overflow-hidden flex-shrink-0 border border-border">
                        <img src={selectedProduct.image_url} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                        <p className="font-bold text-sm line-clamp-1">{selectedProduct.title}</p>
                        <p className="text-orange-500 font-bold text-sm flex items-center gap-1 mt-1">
                            -{selectedProduct.price_points.toLocaleString()} Puntos
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 ml-1">Dirección Completa *</label>
                        <input 
                            type="text" required
                            className="w-full p-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="Calle, Carrera, Número, Apto..."
                            value={shippingInfo.address}
                            onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 ml-1">Ciudad *</label>
                            <input 
                                type="text" required
                                className="w-full p-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                                placeholder="Tu ciudad"
                                value={shippingInfo.city}
                                onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 ml-1">Teléfono *</label>
                            <input 
                                type="tel" required
                                className="w-full p-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                                placeholder="Celular para contacto"
                                value={shippingInfo.phone}
                                onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 ml-1">Notas / Referencias</label>
                        <textarea 
                            className="w-full p-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                            rows="2"
                            placeholder="Ej: Dejar en portería, casa de rejas blancas..."
                            value={shippingInfo.notes}
                            onChange={e => setShippingInfo({...shippingInfo, notes: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <Button type="submit" fullWidth disabled={processingOrder} size="lg" className="font-bold">
                        {processingOrder ? (
                           <><Icon name="Loader" className="animate-spin mr-2" /> Procesando...</>
                        ) : 'Confirmar Envío'}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground mt-3">
                        Al confirmar, tus puntos serán descontados inmediatamente.
                    </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductStorePage;
