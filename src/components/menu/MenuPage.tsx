import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase.ts';
import { MenuItem, MenuCategory, OrderStatus as OS } from '../../types.ts';
import { formatCurrency, cn } from '../../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  ChevronRight, 
  X,
  Coffee,
  Info,
  CheckCircle
} from 'lucide-react';

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = React.useState(searchParams.get('table') || '');
  const [orderType, setOrderType] = React.useState<'dining' | 'takeaway'>(searchParams.get('table') ? 'dining' : 'dining');
  const [isEditingTable, setIsEditingTable] = React.useState(false);
  
  const [categories, setCategories] = React.useState<MenuCategory[]>([]);
  const [items, setItems] = React.useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  const [cart, setCart] = React.useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const [customerNote, setCustomerNote] = React.useState('');

  React.useEffect(() => {
    const unsubCat = onSnapshot(collection(db, 'menuCategories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuCategory)));
    });
    const unsubItems = onSnapshot(collection(db, 'menuItems'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    });
    return () => { unsubCat(); unsubItems(); };
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCat = activeCategory === 'all' || item.categoryId === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && item.available;
  });

  const cartTotal = cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    return sum + (price * quantity);
  }, 0);

  const addToCart = (item: MenuItem, variant?: string, addOns: string[] = [], note: string = '') => {
    const cartId = `${item.id}-${variant || ''}-${addOns.sort().join(',')}`;
    const existing = cart.find(i => i.cartId === cartId);
    
    if (existing) {
      setCart(cart.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { 
        ...item, 
        cartId, 
        quantity: 1, 
        selectedVariant: variant,
        selectedAddOns: addOns,
        note 
      }]);
    }
    setSelectedItem(null);
  };

  const removeFromCart = (cartId: string) => {
    const existing = cart.find(i => i.cartId === cartId);
    if (!existing) return;
    if (existing.quantity > 1) {
      setCart(cart.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity - 1 } : i));
    } else {
      setCart(cart.filter(i => i.cartId !== cartId));
    }
  };

  const handleFirestoreError = (error: any, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const placeOrder = async () => {
    if (cart.length === 0 || isPlacingOrder) return;
    
    if (orderType === 'dining' && !tableNumber.trim()) {
      alert("Please enter your table number in your feast summary first.");
      setIsCartOpen(true);
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);
    const path = 'orders';
    try {
      const orderData = {
        tableNumber: orderType === 'takeaway' ? 'Takeaway' : tableNumber.trim(),
        orderType: orderType,
        customerNote: customerNote.trim(),
        items: cart.map(i => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          variant: i.selectedVariant || null,
          addOns: i.selectedAddOns || [],
          note: orderType === 'takeaway' ? `[TAKEAWAY] ${i.note || ''}` : (i.note || '')
        })),
        status: OS.RECEIVED,
        total: cartTotal,
        createdAt: serverTimestamp()
      };
      console.log("Placing Order:", orderData);
      const docRef = await addDoc(collection(db, path), orderData);
      setCart([]);
      setCustomerNote('');
      setIsCartOpen(false);
      navigate(`/order-status/${docRef.id}`);
    } catch (error: any) {
      try {
        handleFirestoreError(error, 'write', path);
      } catch (wrappedError: any) {
        setOrderError(wrappedError.message);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-aura-cream pb-24">
      {/* Header */}
      <header className="bg-aura-green px-6 pt-10 pb-6 rounded-b-[2rem] shadow-xl sticky top-0 z-40 border-b border-aura-gold/10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-aura-gold/30 overflow-hidden relative group">
               <img src="/logo.png" alt="Aura Logo" className="w-full h-full object-contain p-1" onError={(e) => {
                 (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-aura-gold"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coffee"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg></div>';
               }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-aura-gold font-bold uppercase tracking-[0.4em] leading-none mb-1">THE AURA CAFE & CAKES</p>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <h1 className="font-display font-bold text-2xl text-white truncate">
                    {orderType === 'dining' ? (tableNumber ? `Table ${tableNumber}` : 'Dining') : 'Takeaway'}
                  </h1>
                </div>
                <div className="flex bg-white/5 backdrop-blur-sm p-1 rounded-full border border-white/10 shadow-inner mt-2 w-fit">
                  <button 
                    onClick={() => {
                      setOrderType('dining');
                      if (tableNumber === 'Takeaway') setTableNumber('');
                    }}
                    className={cn(
                      "text-[8px] px-4 py-1.5 rounded-full font-sans uppercase tracking-[0.2em] font-black transition-all duration-300",
                      orderType === 'dining' ? "bg-aura-gold text-aura-green shadow-[0_4px_12px_rgba(212,175,55,0.4)]" : "text-white/40 hover:text-white/70"
                    )}
                  >
                    Dining
                  </button>
                  <button 
                    onClick={() => {
                      setOrderType('takeaway');
                      setTableNumber('Takeaway');
                    }}
                    className={cn(
                      "text-[8px] px-4 py-1.5 rounded-full font-sans uppercase tracking-[0.2em] font-black transition-all duration-300",
                      orderType === 'takeaway' ? "bg-aura-gold text-aura-green shadow-[0_4px_12px_rgba(212,175,55,0.4)]" : "text-white/40 hover:text-white/70"
                    )}
                  >
                    Takeaway
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-12 h-12 bg-aura-gold rounded-2xl flex items-center justify-center text-aura-green relative shadow-[0_8px_20px_rgba(212,175,55,0.3)] transform active:scale-90 transition-transform"
          >
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-aura-green text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-aura-gold shadow-md">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
          <input 
            type="text" 
            placeholder="Search for delights..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/10 focus:ring-2 focus:ring-aura-gold/30 outline-none transition-all placeholder:text-white/40 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Categories */}
      <div className="px-6 py-8 overflow-x-auto creative-scroll">
        <div className="flex space-x-3 pb-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all shadow-sm",
              activeCategory === 'all' ? "bg-aura-green text-aura-gold shadow-xl scale-105 border border-aura-gold/30" : "bg-white text-aura-green hover:bg-aura-green/5 border border-transparent"
            )}
          >
            All Delights
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all shadow-sm flex items-center space-x-2",
                activeCategory === cat.id ? "bg-aura-green text-aura-gold shadow-xl scale-105 border border-aura-gold/30" : "bg-white text-aura-green hover:bg-aura-green/5 border border-transparent"
              )}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-6 grid grid-cols-1 gap-6">
        {filteredItems.map((item) => (
          <motion.div 
            layout
            key={item.id} 
            className="luxury-card flex p-4 shadow-md group active:scale-[0.98] transition-transform"
            onClick={() => setSelectedItem(item)}
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-inner bg-cafe-cream flex-shrink-0">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-cafe-caramel/20">
                  <Coffee size={40} />
                </div>
              )}
            </div>
            <div className="flex-1 ml-4 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-cafe-espresso">{item.name}</h3>
                <p className="text-xs text-cafe-caramel line-clamp-2 mt-1 italic font-medium">{item.description}</p>
              </div>
              <div className="flex justify-between items-end mt-2">
                <span className="font-bold text-lg text-cafe-caramel">{formatCurrency(item.price)}</span>
                <div className="p-2 bg-cafe-caramel/10 text-cafe-caramel rounded-xl group-hover:bg-cafe-caramel group-hover:text-white transition-all">
                  <Plus size={18} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredItems.length === 0 && (
          <div className="py-20 text-center text-cafe-caramel/50">
            <Coffee size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-display italic">No items found in this category</p>
          </div>
        )}
      </div>

      {/* Item Customization Drawer (Dialog-ish) */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 pb-12 z-[60] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-cafe-cream rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-display font-black text-cafe-espresso">{selectedItem.name}</h2>
                  <p className="text-cafe-caramel font-semibold text-lg mt-1">{formatCurrency(selectedItem.price)}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-3 bg-cafe-cream rounded-2xl text-cafe-espresso">
                  <X size={20} />
                </button>
              </div>

              {selectedItem.description && (
                <p className="text-cafe-espresso/70 text-sm mb-8 italic leading-relaxed border-l-4 border-cafe-caramel/20 pl-4">
                  {selectedItem.description}
                </p>
              )}

              {/* Real implementation would have variants/addons UI here */}
              <button 
                onClick={() => addToCart(selectedItem)}
                className="w-full bg-cafe-espresso text-white py-5 rounded-2xl font-bold shadow-xl shadow-cafe-espresso/20 flex items-center justify-center space-x-3 transition-transform active:scale-[0.97]"
              >
                <Plus size={24} />
                <span>Add to My Order</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-cafe-espresso/40 backdrop-blur-md z-[50]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-[60] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-cafe-cream flex justify-between items-center bg-cafe-cream/30">
                <div className="pr-4">
                  <h2 className="text-2xl font-display font-black text-cafe-espresso">Your Feast</h2>
                  <div className="flex flex-col space-y-2 mt-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex bg-cafe-cream/50 rounded-xl p-1 border border-cafe-cream">
                        <button 
                          onClick={() => {
                            setOrderType('dining');
                            if (tableNumber === 'Takeaway') setTableNumber('');
                          }}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            orderType === 'dining' ? "bg-white text-cafe-espresso shadow-sm" : "text-cafe-caramel"
                          )}
                        >
                          Dining
                        </button>
                        <button 
                          onClick={() => {
                            setOrderType('takeaway');
                            setTableNumber('Takeaway');
                          }}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            orderType === 'takeaway' ? "bg-white text-cafe-espresso shadow-sm" : "text-cafe-caramel"
                          )}
                        >
                          Takeaway
                        </button>
                      </div>
                      
                      {orderType === 'dining' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-cafe-caramel font-black uppercase tracking-widest">Table</span>
                          <input 
                            type="text"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            className={cn(
                              "bg-white border rounded-lg px-2 py-0.5 text-xs font-black text-cafe-espresso w-14 text-center outline-none transition-all shadow-sm",
                              !tableNumber.trim() ? "border-red-400 animate-pulse ring-2 ring-red-100" : "border-cafe-caramel/20 focus:border-cafe-caramel"
                            )}
                            placeholder="Enter"
                          />
                        </div>
                      )}
                    </div>
                    {orderType === 'takeaway' && (
                      <p className="text-[10px] text-cafe-caramel font-bold italic">Note: Order will be marked as Takeaway</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white rounded-2xl shadow-sm">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-cafe-caramel/40">
                    <ShoppingCart size={64} className="mb-4 opacity-10" />
                    <p className="font-display italic text-lg text-center">Your basket is waiting for<br/>something delicious</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.cartId} className="flex justify-between items-center animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex-1 pr-4">
                        <h4 className="font-bold text-cafe-espresso">{item.name}</h4>
                        <p className="text-xs text-cafe-caramel font-bold">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center space-x-4 bg-cafe-cream/50 p-2 rounded-2xl border border-cafe-cream">
                        <button onClick={() => removeFromCart(item.cartId)} className="p-1.5 bg-white rounded-xl shadow-sm text-cafe-espresso">
                          <Minus size={14} />
                        </button>
                        <span className="font-black text-cafe-espresso min-w-[1.5rem] text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item)} className="p-1.5 bg-cafe-espresso text-white rounded-xl shadow-sm">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-8 pb-4 border-t border-cafe-cream">
                  <p className="text-[10px] text-cafe-caramel font-black uppercase tracking-widest mb-3">Special Instructions</p>
                  <textarea 
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="E.g. No spice, extra napkins, allergy notes..."
                    className="w-full bg-cafe-cream/30 border border-cafe-cream rounded-xl p-4 text-xs font-medium text-cafe-espresso outline-none focus:border-cafe-caramel focus:ring-1 focus:ring-cafe-caramel/20 transition-all resize-none h-24"
                  />
                </div>
              )}

              {cart.length > 0 && (
                <div className="p-8 bg-cafe-cream/20 border-t border-cafe-cream pb-12">
                  {orderError && (
                    <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100 flex items-center space-x-2">
                       <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                       <span>{orderError}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-cafe-caramel font-bold uppercase tracking-wider text-sm">Estimated Total</span>
                    <span className="text-3xl font-display font-black text-cafe-espresso">{formatCurrency(cartTotal)}</span>
                  </div>
                  <button 
                    onClick={placeOrder}
                    disabled={isPlacingOrder}
                    className="w-full bg-cafe-espresso text-white py-5 rounded-2xl font-bold shadow-2xl flex items-center justify-center space-x-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{isPlacingOrder ? 'Sending to Kitchen...' : 'Place Order'}</span>
                    {!isPlacingOrder && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fixed Bottom UI */}
      <div className="fixed bottom-6 left-6 right-6 z-40">
        {/* Floating Cart Quick View */}
        {cart.length > 0 && !isCartOpen && (
          <motion.button 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-aura-gold text-aura-green p-5 rounded-2xl shadow-2xl flex justify-between items-center shadow-black/30 border border-white/20"
          >
            <div className="flex items-center space-x-4">
               <div className="bg-aura-green text-white px-3 py-1 rounded-lg text-xs font-black">{cart.length}</div>
               <span className="font-black text-sm uppercase tracking-widest">Cart Total</span>
            </div>
            <span className="font-display font-black text-xl">{formatCurrency(cartTotal)}</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
