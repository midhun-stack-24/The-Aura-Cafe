import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { Order, OrderStatus } from '../../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Utensils, 
  ChefHat, 
  PartyPopper,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils.ts';

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orderId) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() } as Order);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-cafe-cream">
      <RefreshCw className="animate-spin text-cafe-caramel" size={48} />
    </div>
  );

  if (!order) return (
    <div className="h-screen flex flex-col items-center justify-center bg-cafe-cream p-6 text-center">
      <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
        <PartyPopper size={48} />
      </div>
      <h1 className="text-3xl font-display font-bold text-cafe-espresso mb-4">Order Not Found</h1>
      <button 
        onClick={() => navigate('/menu')}
        className="bg-cafe-espresso text-white px-8 py-3 rounded-xl font-bold"
      >
        Go to Menu
      </button>
    </div>
  );

  const getStatusStage = () => {
    switch (order.status) {
      case OrderStatus.RECEIVED: return 1;
      case OrderStatus.PREPARING: return 2;
      case OrderStatus.READY: return 3;
      case OrderStatus.SERVED: return 4;
      default: return 0;
    }
  };

  const stage = getStatusStage();

  return (
    <div className="min-h-screen bg-cafe-cream px-6 py-12">
      <header className="flex items-center space-x-4 mb-12">
        <button 
          onClick={() => navigate('/menu')}
          className="p-3 bg-white rounded-2xl shadow-sm text-cafe-espresso"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display font-black text-2xl text-cafe-espresso">Order Details</h1>
          <p className="text-xs text-cafe-caramel font-bold uppercase tracking-widest">Table {order.tableNumber} • ID: #{order.id.slice(-6).toUpperCase()}</p>
        </div>
      </header>

      <div className="luxury-card p-10 mb-8 border-t-8 border-t-cafe-caramel relative overflow-hidden">
        <div className="text-center mb-10">
          <AnimatePresence mode="wait">
            {stage === 1 && (
              <motion.div key="stage1" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Clock size={48} />
                </div>
                <h2 className="text-3xl font-display font-black text-cafe-espresso mb-2">Order Received</h2>
                <p className="text-cafe-caramel font-medium">The kitchen is about to start its magic!</p>
              </motion.div>
            )}
            {stage === 2 && (
              <motion.div key="stage2" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-6">
                  <ChefHat size={48} className="animate-bounce" />
                </div>
                <h2 className="text-3xl font-display font-black text-cafe-espresso mb-2">Crafting your Feast</h2>
                <p className="text-cafe-caramel font-medium">Our chefs are preparing your delicious choices.</p>
              </motion.div>
            )}
            {stage === 3 && (
              <motion.div key="stage3" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-display font-black text-cafe-espresso mb-2">Ready to Serve!</h2>
                <p className="text-cafe-caramel font-medium italic underline underline-offset-4">Your order is being sent to your table now.</p>
              </motion.div>
            )}
            {stage === 4 && (
              <motion.div key="stage4" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                <div className="w-24 h-24 bg-cafe-espresso/10 text-cafe-espresso rounded-full flex items-center justify-center mb-6">
                  <Utensils size={48} />
                </div>
                <h2 className="text-3xl font-display font-black text-cafe-espresso mb-2">Bon Appétit!</h2>
                <p className="text-cafe-caramel font-medium italic">We hope you enjoy the experience at Aura.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Tracker */}
        <div className="flex justify-between relative mt-12 mb-6">
           <div className="absolute top-1/2 left-0 right-0 h-1 bg-cafe-cream -translate-y-1/2 -z-10" />
           <div 
             className="absolute top-1/2 left-0 h-1 bg-cafe-caramel -translate-y-1/2 -z-10 transition-all duration-1000" 
             style={{ width: `${(stage - 1) * 33.33}%` }}
           />
           {[1, 2, 3, 4].map((s) => (
             <div 
               key={s} 
               className={cn(
                 "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                 stage >= s ? "bg-cafe-caramel border-cafe-caramel text-white shadow-lg" : "bg-white border-cafe-cream text-cafe-caramel/30"
               )}
             >
               {s === 1 && <Clock size={16} />}
               {s === 2 && <ChefHat size={16} />}
               {s === 3 && <CheckCircle2 size={16} />}
               {s === 4 && <Utensils size={16} />}
             </div>
           ))}
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-cafe-caramel/60">
           <span>Received</span>
           <span>Cooking</span>
           <span className="mr-4">Ready</span>
           <span>Served</span>
        </div>
      </div>

      <div className="luxury-card p-8">
        <h3 className="font-display font-bold text-xl text-cafe-espresso mb-6 border-b border-cafe-cream pb-4">Order Summary</h3>
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 rounded-lg bg-cafe-cream/50 flex items-center justify-center font-black text-xs text-cafe-caramel">
                  {item.quantity}
                </span>
                <span className="font-medium text-cafe-espresso">{item.name}</span>
              </div>
              <span className="font-bold text-cafe-caramel">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t-2 border-dashed border-cafe-cream flex justify-between items-center">
          <span className="font-display font-black text-2xl text-cafe-espresso">Grand Total</span>
          <span className="font-black text-2xl text-cafe-caramel">{formatCurrency(order.total)}</span>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-cafe-caramel/60 text-xs italic font-medium">
          Feeling like another cup? <br/>
          <button onClick={() => navigate('/menu')} className="mt-2 text-cafe-espresso font-black uppercase tracking-widest underline decoration-cafe-caramel underline-offset-4">
            Add more items
          </button>
        </p>
      </div>
    </div>
  );
}
