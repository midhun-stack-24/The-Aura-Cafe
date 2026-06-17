import React from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  where,
  orderBy
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../lib/firebase.ts';
import { Order, OrderStatus } from '../../types.ts';
import { formatCurrency } from '../../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  FileText, 
  Settings, 
  LogOut,
  CheckCircle,
  Clock,
  Printer,
  Search,
  Plus,
  Minus,
  X,
  ShieldCheck,
  ChefHat,
  History,
  Info,
  Coffee,
  Volume2,
  Monitor,
  Bell,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { auth } from '../../lib/firebase.ts';
import { signOut } from 'firebase/auth';
import { forceResetAndSeed, seedDatabase } from '../../lib/seedData.ts';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function AdminDashboard() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [activeTab, setActiveTab] = React.useState<'orders' | 'menu' | 'billing' | 'reports' | 'tables' | 'kitchen' | 'settings'>('orders');
  const [printData, setPrintData] = React.useState<any>(null);
  const [isAdminUser, setIsAdminUser] = React.useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const [paperSize, setPaperSize] = React.useState<'80mm' | '58mm'>(() => {
    return (localStorage.getItem('admin_printer_paper') as '80mm' | '58mm') || '80mm';
  });
  const [printerFontSize, setPrinterFontSize] = React.useState<string>(() => {
    return localStorage.getItem('admin_printer_font_size') || '11px';
  });
  const [preferredPrinter, setPreferredPrinter] = React.useState<string>(() => {
    return localStorage.getItem('admin_printer_name') || 'TVS RP-3150 Gold (Wired USB)';
  });
  const [preferredKitchenPrinter, setPreferredKitchenPrinter] = React.useState<string>(() => {
    return localStorage.getItem('admin_kitchen_printer_name') || 'Epson TM-T82X (Wired USB)';
  });

  React.useEffect(() => {
    localStorage.setItem('admin_printer_paper', paperSize);
  }, [paperSize]);

  React.useEffect(() => {
    localStorage.setItem('admin_printer_font_size', printerFontSize);
  }, [printerFontSize]);

  React.useEffect(() => {
    localStorage.setItem('admin_printer_name', preferredPrinter);
  }, [preferredPrinter]);

  React.useEffect(() => {
    localStorage.setItem('admin_kitchen_printer_name', preferredKitchenPrinter);
  }, [preferredKitchenPrinter]);

  // Sync state values to mutable refs so the subscription callback always reads the latest values
  const soundEnabledRef = React.useRef(soundEnabled);

  React.useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playNotification = () => {
    if (!soundEnabledRef.current) return;
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed:", e));
    } catch (e) {
      console.log("Audio error", e);
    }
  };

  React.useEffect(() => {
    const check = async () => {
      try {
        await seedDatabase();
      } catch (err) {
        console.error("Initial seeding checked/failed", err);
      }

      if (auth.currentUser) {
        try {
           const { getDoc } = await import('firebase/firestore');
           const snap = await getDoc(doc(db, 'admins', auth.currentUser.uid));
           setIsAdminUser(snap.exists());
        } catch (e) {
           console.error("Admin check failed", e);
           setIsAdminUser(false);
        }
      } else {
        setIsAdminUser(false);
      }
      setCheckingAdmin(false);
    };
    check();
  }, [auth.currentUser]);

  const triggerPrint = (data: any, type: 'KOT' | 'BILL') => {
    setPrintData({ ...data, type });
    // Small delay to ensure React renders the hidden thermal receipt before print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  React.useEffect(() => {
    const q = query(collection(db, 'orders'));
    let isInitial = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
       const sorted = snapshot.docs
         .map(d => ({ id: d.id, ...d.data() } as Order))
         .sort((a,b) => {
            const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return db_.getTime() - da.getTime();
         });
       
      // Play sound notification on new incoming orders (skipped on initial load)
      if (!isInitial) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const orderData = { id: change.doc.id, ...change.doc.data() } as Order;
            if (orderData.status === OrderStatus.RECEIVED) {
              playNotification();
              console.log('🔔 New Order Received (Manual print ready):', orderData.id);
            }
          }
        });
      } else {
        isInitial = false;
      }

      setOrders(sorted);
    }, (error) => {
      console.error("Dashboard error:", error);
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { id: 'orders', icon: LayoutDashboard, label: 'Live Orders' },
    { id: 'kitchen', icon: UtensilsCrossed, label: 'Kitchen' },
    { id: 'menu', icon: Settings, label: 'Menu' },
    { id: 'billing', icon: Plus, label: 'Billing' },
    { id: 'tables', icon: CheckCircle, label: 'Tables' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  const handleSignOut = () => signOut(auth);

  const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-6 py-4 rounded-xl transition-all ${
        activeTab === id 
          ? 'bg-aura-green text-aura-gold shadow-xl scale-105 transform' 
          : 'text-aura-green/70 hover:bg-aura-green/5 hover:text-aura-green'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-aura-cream overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-cafe-cream p-6 flex-col shrink-0">
        <div className="flex items-center space-x-3 mb-12 px-2">
          <div className="w-12 h-12 bg-aura-green rounded-xl flex items-center justify-center shadow-lg border border-aura-gold/30 overflow-hidden relative group">
            <img src="/logo.png" alt="Aura Logo" className="w-full h-full object-contain p-1" onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-aura-gold"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coffee"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg></div>';
            }} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-tight uppercase tracking-tight text-aura-green">THE AURA</h1>
            <p className="text-[10px] text-aura-gold font-black uppercase tracking-[0.2em]">Cafe & Cakes</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <SidebarItem key={item.id} id={item.id as any} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-cafe-cream">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-6 py-4 rounded-xl text-cafe-espresso/70 hover:bg-red-50 hover:text-red-500 transition-all font-bold"
          >
            <LogOut size={20} />
            <div className="text-left">
              <p className="text-sm">Sign Out</p>
              <p className="text-[10px] uppercase font-black text-cafe-caramel">
                {checkingAdmin ? 'Checking...' : (isAdminUser ? 'Admin Active' : 'No Access')}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-cafe-cream z-[90] px-4 py-3 pb-safe flex justify-between items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center space-y-1 transition-all ${
                isActive ? 'text-aura-green' : 'text-aura-green/30'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-aura-green/10' : ''}`}>
                <Icon size={20} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Security Overlay */}
        {!checkingAdmin && isAdminUser === false && (
          <div className="absolute inset-0 z-[100] bg-cafe-cream/95 flex items-center justify-center p-6 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md w-full bg-white p-10 rounded-[2.5rem] text-center space-y-8 shadow-2xl border border-cafe-cream"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck size={40} />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-display font-black text-cafe-espresso">Admin Access Required</h3>
                <p className="text-aura-green/70 font-medium leading-relaxed">
                  Your email <span className="font-bold text-aura-green">{(auth.currentUser?.email || 'Logged In Account')}</span> is authenticated but not authorized as an administrator.
                </p>
              </div>
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={() => window.location.href = '/admin/setup'}
                  className="w-full bg-cafe-espresso text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl"
                >
                  Configure New Admin
                </button>
                <button 
                  onClick={handleSignOut}
                  className="text-sm font-bold text-red-500 uppercase tracking-widest"
                >
                  Log Out & Try Another
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-10 overflow-y-auto pb-24 lg:pb-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <div>
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-cafe-espresso leading-tight">
              {activeTab === 'orders' && 'Live Kitchen'}
              {activeTab === 'kitchen' && 'Kitchen Tickets'}
              {activeTab === 'menu' && 'Menu Manager'}
              {activeTab === 'billing' && 'Billing Station'}
              {activeTab === 'reports' && 'Sales Intel'}
              {activeTab === 'tables' && 'Table Matrix'}
            </h2>
            <p className="text-cafe-caramel font-medium text-xs sm:text-sm mt-1 uppercase tracking-widest">Administrator Portal</p>
          </div>

          <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="bg-white px-4 py-2 rounded-xl border border-cafe-cream shadow-sm flex items-center space-x-4">
              <div className="flex items-center space-x-2 border-r border-cafe-cream pr-4">
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-lg transition-colors ${soundEnabled ? 'text-aura-gold hover:bg-aura-gold/10' : 'text-gray-300 hover:bg-gray-100'}`}
                  title={soundEnabled ? "Sound On" : "Sound Off"}
                >
                  <Volume2 size={16} />
                </button>
              </div>
              <div className="flex items-center space-x-2 border-r border-cafe-cream pr-4">
                <Printer size={14} className="text-cafe-caramel" />
                <span className="text-[9px] font-black uppercase tracking-widest text-cafe-espresso">Manual Print Mode</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-cafe-espresso uppercase tracking-widest">Live</span>
              </div>
            </div>
            <button onClick={handleSignOut} className="lg:hidden p-2 text-red-500 bg-red-50 rounded-xl">
              <LogOut size={20} />
            </button>
          </div>
        </header>
 
        {activeTab === 'orders' && <OrderFeed orders={orders} onPrint={(data) => triggerPrint(data, 'KOT')} />}
        {activeTab === 'kitchen' && <KitchenKDS orders={orders} onPrint={(data) => triggerPrint(data, 'KOT')} />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'billing' && <BillingPOS onPrint={(data) => triggerPrint(data, 'BILL')} orders={orders} />}
        {activeTab === 'tables' && <TableManager />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <AdminSettings 
              sound={soundEnabled}
              setSound={setSoundEnabled}
              onTestPrint={(data) => triggerPrint(data, 'KOT')}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
              printerFontSize={printerFontSize}
              setPrinterFontSize={setPrinterFontSize}
              preferredPrinter={preferredPrinter}
              setPreferredPrinter={setPreferredPrinter}
              preferredKitchenPrinter={preferredKitchenPrinter}
              setPreferredKitchenPrinter={setPreferredKitchenPrinter}
            />
          </div>
        )}

        {/* Hidden Thermal Receipt for Printing (Configurable width and size) */}
        {printData && createPortal(
          <div 
            id="thermal-receipt" 
            className={`font-mono leading-tight text-left text-black bg-white size-${paperSize}`}
            style={{ fontSize: printerFontSize }}
          >
            {printData.type === 'BILL' ? (
              <div className="border-b border-dashed border-black pb-4 mb-4 text-center">
                <h2 className="text-lg font-black uppercase tracking-tighter">THE AURA CAFE</h2>
                <p className="text-[10px]">No : 70 , Collector Sivakumar Street</p>
                <p className="text-[10px]">K.K Pudur, Saibaba Colony, Coimbatore</p>
                <p className="text-[10px]">Phone: +91 98765 43210</p>
              </div>
            ) : (
              <div className="border-b border-dashed border-black pb-3 mb-3 text-center">
                <h2 className="text-sm font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block rounded mb-1">KITCHEN ORDER (KOT)</h2>
                <p className="text-[9px] font-bold opacity-75">Target Kitchen Printer: {preferredKitchenPrinter}</p>
              </div>
            )}

            <div className="flex justify-between font-bold mb-2">
              <span className="uppercase">{printData.type === 'BILL' ? 'INVOICE' : 'KOT'}</span>
              {!(printData.type === 'BILL' && printData.hideTableNumber) && (
                <span className="uppercase">TABLE: {printData.tableNumber}</span>
              )}
            </div>
            
            <div className="border-b border-dashed border-black pb-2 mb-2">
              <p className="text-[10px]">DATE: {printData.createdAt ? new Date(printData.createdAt).toLocaleString() : new Date().toLocaleString()}</p>
              {printData.id && <p className="text-[10px]">TXN ID: #{printData.id.slice(-6).toUpperCase()}</p>}
              {printData.type === 'BILL' && printData.paymentMethod && (
                <p className="text-[10px] font-bold">PAYMENT MODE: {String(printData.paymentMethod).toUpperCase()}</p>
              )}
            </div>

            <table className="w-full text-left mb-4">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1 uppercase text-[10px]">ITEM</th>
                  <th className="py-1 text-right uppercase text-[10px]">QTY</th>
                  {printData.type === 'BILL' && <th className="py-1 text-right uppercase text-[10px]">PRICE</th>}
                </tr>
              </thead>
              <tbody>
                {printData.items.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-black/5 last:border-0">
                    <td className="py-1.5 align-top">
                      <div className="font-bold">{item.name}</div>
                      {item.variant && <div className="text-[9px] opacity-70">({item.variant})</div>}
                    </td>
                    <td className="py-1.5 text-right align-top font-bold">x{item.quantity}</td>
                    {printData.type === 'BILL' && (
                      <td className="py-1.5 text-right align-top">{formatCurrency(item.price * item.quantity)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {printData.type === 'BILL' && (
              <div className="border-t border-black pt-2 space-y-1">
                <div className="flex justify-between font-black text-sm pt-2">
                  <span>TOTAL AMOUNT:</span>
                  <span>{formatCurrency(printData.total)}</span>
                </div>
                <div className="text-right text-[10px] font-black tracking-wider text-black mt-1">
                  GST INCLUDED
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-dashed border-black pt-4 text-center">
               <p className="font-bold underline mb-1 uppercase tracking-widest">{printData.type === 'BILL' ? 'THANK YOU! VISIT AGAIN' : 'PROCEED TO COOKING'}</p>
               <p className="text-[9px] opacity-60">Generated via Aura Cafe POS Cloud</p>
            </div>
          </div>,
          document.body
        )}
        </main>
      </div>
    </div>
  );
}

function MenuManager() {
  const [items, setItems] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [editingItem, setEditingItem] = React.useState<any>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [showCatForm, setShowCatForm] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'menuItems'), (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCats = onSnapshot(query(collection(db, 'menuCategories'), orderBy('sortOrder', 'asc')), (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubItems(); unsubCats(); };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // ~800KB limit to stay safe with Firestore 1MB doc limit
        alert("Image is too large. Please select an image smaller than 800KB.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'menuItems', id), { available: !current });
  };

  const deleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'menuItems', id));
    }
  };

  const deleteCategory = async (id: string) => {
    // Check if items use this category
    const hasItems = items.some(item => item.categoryId === id);
    if (hasItems) {
      alert("Cannot delete category while it has items. Move or delete the items first.");
      return;
    }
    if (confirm('Delete this category?')) {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'menuCategories', id));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    await addDoc(collection(db, 'menuCategories'), {
      name: newCatName.trim(),
      sortOrder: categories.length + 1,
      icon: 'Coffee'
    });
    setNewCatName('');
    setShowCatForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const itemData = {
      name: formData.get('name'),
      price: Number(formData.get('price')),
      categoryId: formData.get('categoryId'),
      description: formData.get('description'),
      image: imagePreview || formData.get('image'), // Use uploaded image if exists
      available: true
    };

    if (editingItem) {
      await updateDoc(doc(db, 'menuItems', editingItem.id), itemData);
    } else {
      await addDoc(collection(db, 'menuItems'), itemData);
    }
    setShowForm(false);
    setEditingItem(null);
    setImagePreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-cafe-cream shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black uppercase tracking-widest text-cafe-caramel">Menu Categories</h3>
          <button 
            onClick={() => setShowCatForm(true)}
            className="flex items-center space-x-2 text-aura-green hover:text-aura-gold transition-colors font-bold text-xs"
          >
            <Plus size={14} />
            <span>Manage Categories</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
           {categories.map(c => (
             <div key={c.id} className="group bg-cafe-cream px-4 py-2 rounded-xl text-[10px] font-bold text-cafe-caramel uppercase tracking-widest flex items-center space-x-3">
               <span>{c.name}</span>
               <button onClick={() => deleteCategory(c.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                 <X size={12} />
               </button>
             </div>
           ))}
        </div>
        <div className="pt-6 border-t border-cafe-cream flex justify-between items-center">
          <p className="text-xs text-cafe-caramel italic">Manage your culinary offerings and categories here.</p>
          <div className="flex space-x-3">
            <button 
              onClick={() => { setEditingItem(null); setShowForm(true); }}
              className="flex items-center space-x-2 bg-cafe-espresso text-white px-6 py-3 rounded-xl font-bold hover:bg-cafe-espresso/90 transition-all shadow-lg active:scale-95"
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.id} className="luxury-card p-4 flex flex-col group relative">
            <div className="w-full aspect-square bg-cafe-cream rounded-xl mb-4 overflow-hidden relative">
              {item.image ? (
                <img src={item.image} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-cafe-caramel/20 scale-150">
                  <UtensilsCrossed size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                <button 
                  onClick={() => { setEditingItem(item); setImagePreview(item.image); setShowForm(true); }}
                  className="p-3 bg-white rounded-xl text-cafe-espresso hover:bg-cafe-cream transition-colors"
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="p-3 bg-red-500 rounded-xl text-white hover:bg-red-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <h4 className="font-bold text-cafe-espresso">{item.name}</h4>
            <p className="text-[10px] uppercase font-black tracking-widest text-cafe-caramel mt-1">
              {categories.find(c => c.id === item.categoryId)?.name || 'Misc'}
            </p>
            <div className="mt-4 pt-4 border-t border-cafe-cream flex justify-between items-center">
              <span className="font-bold text-lg">{formatCurrency(item.price)}</span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-cafe-caramel uppercase">Stock</span>
                <div 
                  onClick={() => toggleAvailability(item.id, item.available)}
                  className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${item.available ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${item.available ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Item Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl"
            >
              <h3 className="text-2xl font-display font-black text-cafe-espresso mb-6">
                {editingItem ? 'Edit Culinary Delight' : 'New Menu Addition'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-cafe-caramel mb-1 block">Item Name</label>
                    <input name="name" defaultValue={editingItem?.name} required className="w-full px-4 py-3 rounded-xl border border-cafe-cream bg-cafe-cream/30 focus:ring-2 focus:ring-cafe-caramel outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-cafe-caramel mb-1 block">Price (₹)</label>
                    <input name="price" type="number" defaultValue={editingItem?.price} required className="w-full px-4 py-3 rounded-xl border border-cafe-cream bg-cafe-cream/30 focus:ring-2 focus:ring-cafe-caramel outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-cafe-caramel mb-1 block">Category</label>
                    <select name="categoryId" defaultValue={editingItem?.categoryId} className="w-full px-4 py-3 rounded-xl border border-cafe-cream bg-cafe-cream/30 focus:ring-2 focus:ring-cafe-caramel outline-none font-bold">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[10px] font-black uppercase text-cafe-caramel block">Product Image</label>
                      <div className="flex space-x-2">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[9px] font-bold text-cafe-espresso bg-cafe-cream px-2 py-0.5 rounded-md hover:bg-cafe-caramel hover:text-white transition-colors"
                        >
                          Upload File
                        </button>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*"
                    />
                    <div className="flex items-center space-x-3 bg-cafe-cream/30 p-2 rounded-xl border border-cafe-cream">
                      <div className="w-12 h-12 bg-white rounded-lg flex-shrink-0 overflow-hidden border border-cafe-cream">
                        {imagePreview ? (
                          <img src={imagePreview} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-cafe-caramel opacity-20">
                            <UtensilsCrossed size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <input 
                          name="image" 
                          value={imagePreview || (editingItem?.image || '')} 
                          onChange={(e) => setImagePreview(e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 font-bold text-xs p-0" 
                          placeholder="Image URL or Base64..." 
                        />
                      </div>
                      {imagePreview && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setImagePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1.5 bg-red-50 text-red-500 rounded-lg"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-cafe-caramel mt-1 italic">Note: High resolution photos may be large for database storage.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-cafe-caramel mb-1 block">Description</label>
                    <textarea name="description" defaultValue={editingItem?.description} className="w-full px-4 py-3 rounded-xl border border-cafe-cream bg-cafe-cream/30 focus:ring-2 focus:ring-cafe-caramel outline-none font-medium h-24" />
                  </div>
                </div>
                <div className="flex space-x-3 pt-6">
                  <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setImagePreview(null); }} className="flex-1 py-4 font-bold text-cafe-espresso uppercase tracking-widest text-xs">Cancel</button>
                  <button type="submit" className="flex-1 bg-cafe-espresso text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                    {editingItem ? 'Save Changes' : 'Add to Menu'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Manager Modal */}
      <AnimatePresence>
        {showCatForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-black text-cafe-espresso">Administer Categories</h3>
                <button onClick={() => setShowCatForm(false)} className="p-2 bg-cafe-cream rounded-xl text-cafe-espresso">
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-cafe-caramel mb-1 block">New category Name</label>
                  <div className="flex space-x-2">
                    <input 
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g. Desserts"
                      className="flex-1 px-4 py-3 rounded-xl border border-cafe-cream bg-cafe-cream/30 focus:ring-2 focus:ring-cafe-caramel outline-none font-bold text-sm" 
                    />
                    <button type="submit" className="px-4 py-3 bg-cafe-espresso text-white rounded-xl shadow-lg active:scale-95 transition-all">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-8 space-y-2 max-h-60 overflow-y-auto pr-2 creative-scroll">
                <p className="text-[10px] font-black uppercase text-cafe-caramel mb-2">Existing Categories</p>
                {categories.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-cafe-cream/30 rounded-xl border border-cafe-cream/50">
                    <span className="text-xs font-bold text-cafe-espresso">{cat.name}</span>
                    <button 
                      onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BillingPOS({ onPrint, orders: propOrders }: { onPrint: (data: any) => void, orders: Order[] }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [cart, setCart] = React.useState<any[]>([]);
  const [table, setTable] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [activeOrders, setActiveOrders] = React.useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [hideTableNo, setHideTableNo] = React.useState(false);
  const [useCustomDate, setUseCustomDate] = React.useState(false);
  const [billingDate, setBillingDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethodSelected, setPaymentMethodSelected] = React.useState<'cash' | 'upi'>('upi');

  React.useEffect(() => {
    onSnapshot(collection(db, 'menuItems'), snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch existing orders for the selected table or Order ID
  const fetchTableOrders = async () => {
    setLoading(true);
    const userInput = table.trim();
    if (!userInput) {
      alert("Please enter Table Number or Order ID first");
      setLoading(false);
      return;
    }
    const cleanInput = userInput.replace('#', '').toUpperCase();
    console.log("Fetching orders for Input:", userInput);

    try {
      let matchedOrders: Order[] = [];

      // 1. Try local search in propOrders first (includes suffix matching for short IDs)
      if (propOrders.length > 0) {
        console.log("Searching in-memory orders...");
        matchedOrders = propOrders.filter(o => 
          o.tableNumber.toString().toUpperCase() === cleanInput ||
          o.id.toUpperCase().endsWith(cleanInput)
        );
      }

      // 2. Fallback to direct DB query if no local matches or to be absolutely sure
      if (matchedOrders.length === 0) {
        console.log("No local matches, performing DB query...");
        // Search by exact table number
        const q1 = query(collection(db, 'orders'), where('tableNumber', '==', userInput));
        const snap1 = await getDocs(q1);
        matchedOrders = snap1.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        
        // Try numeric query
        if (matchedOrders.length === 0 && !isNaN(Number(userInput)) && userInput !== '') {
          const q2 = query(collection(db, 'orders'), where('tableNumber', '==', Number(userInput)));
          const snap2 = await getDocs(q2);
          matchedOrders = snap2.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        }

        // Try direct ID if it's a long string
        if (matchedOrders.length === 0 && cleanInput.length > 10) {
          const { getDoc } = await import('firebase/firestore');
          const docSnap = await getDoc(doc(db, 'orders', cleanInput.toLowerCase()));
          if (docSnap.exists()) {
            matchedOrders = [{ id: docSnap.id, ...docSnap.data() } as Order];
          }
        }
      }

      console.log("Found Raw Orders:", matchedOrders.length);
      
      // Filter locally for active/served orders (billable)
      const active = matchedOrders.filter(o => 
        [OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED].includes(o.status)
      );

      console.log("Active Orders for Billing:", active.length);
      
      if (active.length === 0) {
        // Check if maybe it was already completed
        const completed = matchedOrders.find(o => o.status === OrderStatus.COMPLETED);
        if (completed) {
          alert(`Order ${userInput} is already billed/completed.`);
        } else {
          alert(`No active orders found for: ${userInput}`);
        }
        setLoading(false);
        return;
      }

      setActiveOrders(active);
      
      // Merge all items from active orders into the billing cart
      const mergedItems: any[] = [];
      active.forEach(order => {
        order.items.forEach(item => {
          const key = `${item.id}-${item.variant || ''}`;
          const existing = mergedItems.find(i => `${i.id}-${i.variant || ''}` === key);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            mergedItems.push({ ...item });
          }
        });
      });
      setCart(mergedItems);
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("Failed to fetch orders. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    
    setLoading(true);
    try {
      const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
      const total = subtotal; // Tax removed

      let finalCreatedAt = new Date().toISOString();
      if (useCustomDate && billingDate) {
        const currentDate = new Date();
        const selectedDate = new Date(billingDate);
        selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
        finalCreatedAt = selectedDate.toISOString();
      }

      const billData = {
        tableNumber: table.trim() || 'Takeaway',
        items: cart,
        subtotal,
        tax: 0,
        total,
        paymentMethod: paymentMethodSelected, 
        createdAt: finalCreatedAt,
        orderIds: activeOrders.map(o => o.id),
        hideTableNumber: hideTableNo
      };

      await addDoc(collection(db, 'bills'), billData);
      
      // Trigger Thermal Print
      onPrint(billData);
      
      // Update orders to a final state
      for (const order of activeOrders) {
        await updateDoc(doc(db, 'orders', order.id), { status: OrderStatus.COMPLETED });
      }

      setCart([]);
      setActiveOrders([]);
      setTable('');
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((s, i) => s + ((Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);
  const total = subtotal;

  const itemsWithBillableStatus = filteredItems.map(item => {
    const billableOrdersCount = propOrders.filter(o => 
      [OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED].includes(o.status) &&
      o.items.some(oi => oi.id === item.id)
    ).length;
    return { ...item, activeOrders: billableOrdersCount };
  });

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-full lg:h-[calc(100vh-140px)] min-h-0 overflow-visible lg:overflow-hidden">
      <div className="order-2 lg:order-none lg:col-span-8 flex flex-col space-y-6 overflow-visible lg:overflow-hidden lg:h-full">
         <div className="flex flex-col sm:flex-row gap-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-caramel/50" size={18} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-cafe-cream shadow-sm font-bold text-sm" 
              placeholder="Search dishes..." 
            />
          </div>
          <button 
            onClick={fetchTableOrders}
            disabled={loading}
            className="w-full sm:w-auto px-10 py-4 bg-cafe-caramel text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? <Clock className="animate-spin" size={16} /> : <FileText size={16} />}
            <span>Fetch Orders</span>
          </button>
        </div>
        <div className="flex-1 lg:overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8 pb-32 lg:pb-8 pr-2 content-start">
          {itemsWithBillableStatus.map(item => {
            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  const key = `${item.id}-`;
                  const existing = cart.find(c => `${c.id}-${c.variant || ''}` === key);
                  if (existing) setCart(cart.map(c => `${c.id}-${c.variant || ''}` === key ? { ...c, quantity: c.quantity + 1 } : c));
                  else setCart([...cart, { ...item, quantity: 1, variant: '' }]);
                }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white p-3 sm:p-5 lg:p-6 rounded-[2rem] border border-cafe-cream hover:border-cafe-caramel hover:shadow-2xl transition-all group text-left relative overflow-hidden flex flex-col min-h-[180px] sm:min-h-[220px] lg:min-h-[340px] shadow-sm"
              >
                {item.image ? (
                  <div className="h-24 sm:h-32 lg:h-48 -mx-3 sm:-mx-5 lg:-mx-6 -mt-3 sm:-mt-5 lg:-mt-6 mb-3 sm:mb-5 overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                ) : (
                  <div className="h-24 sm:h-32 lg:h-48 -mx-3 sm:-mx-5 lg:-mx-6 -mt-3 sm:-mt-5 lg:-mt-6 mb-3 sm:mb-5 bg-cafe-cream/50 flex items-center justify-center text-cafe-caramel/20">
                    <UtensilsCrossed size={32} />
                  </div>
                )}
                
                <h4 className="font-bold text-cafe-espresso text-[11px] sm:text-xs lg:text-base leading-tight mb-2 uppercase tracking-wide">{item.name}</h4>
                
                <div className="flex lg:flex-col justify-between lg:justify-start items-center lg:items-start mt-auto pt-2 lg:gap-2">
                  <span className="text-cafe-caramel font-black text-xs sm:text-sm lg:text-xl">{formatCurrency(item.price || 0)}</span>
                  {item.activeOrders > 0 && (
                    <div className="flex items-center space-x-1 bg-cafe-caramel/10 text-cafe-caramel px-2 py-1 rounded-full border border-cafe-caramel/20 shadow-sm">
                       <span className="w-1.5 h-1.5 bg-cafe-caramel rounded-full animate-pulse" />
                       <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-tighter sm:tracking-normal">{item.activeOrders} ORDERED</span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="order-1 lg:order-none lg:col-span-4 h-full min-h-[400px] lg:min-h-0">
        <div className="bg-white rounded-[2.5rem] lg:rounded-3xl border border-cafe-cream flex flex-col h-full shadow-2xl relative overflow-hidden">
           <div className="p-6 bg-cafe-espresso text-white">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <h4 className="font-display font-bold text-xl leading-none">Checkout</h4>
                 <p className="text-[10px] uppercase font-bold text-cafe-cream/50 mt-1 tracking-widest">Billing Station</p>
               </div>
               {activeOrders.length > 0 && (
                 <div className="bg-cafe-caramel/20 border border-cafe-caramel/40 px-3 py-1 rounded-full flex items-center space-x-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">{activeOrders.length} order(s)</span>
                 </div>
               )}
             </div>
             <div className="relative">
               <input 
                value={table} 
                onChange={e => setTable(e.target.value)} 
                className="bg-white/20 rounded-xl px-4 py-3 text-white font-bold w-full outline-none border border-white/10 focus:border-white/40 placeholder:text-white/30 text-sm" 
                placeholder="Table No. or Order ID..."
               />
             </div>
           </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 creative-scroll">
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
              <div className="w-12 h-12 bg-cafe-cream rounded-full flex items-center justify-center text-cafe-caramel mb-3">
                <FileText size={24} />
              </div>
              <p className="font-bold text-xs text-cafe-espresso uppercase tracking-widest">No Selection</p>
              <p className="text-[10px] text-cafe-caramel mt-2 font-medium">Add items manually or fetch orders for Table {table}</p>
            </div>
          )}
          {cart.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex justify-between items-center p-2 rounded-xl hover:bg-cafe-cream/30 transition-colors animate-in fade-in slide-in-from-right-4">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-bold text-xs text-cafe-espresso truncate">{item.name}</p>
                <p className="text-[10px] text-cafe-caramel font-bold">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button 
                  onClick={() => {
                    if (item.quantity > 1) setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1 } : c));
                    else setCart(cart.filter((_, i) => i !== idx));
                  }}
                  className="p-1 bg-cafe-cream rounded-lg text-cafe-espresso hover:bg-cafe-espresso hover:text-white transition-colors"
                ><Minus size={12} /></button>
                <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                <button 
                  onClick={() => setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c))}
                  className="p-1 bg-cafe-espresso text-white rounded-lg hover:shadow-md transition-all"
                ><Plus size={12} /></button>
              </div>
              <p className="w-16 text-right font-black text-xs text-cafe-espresso ml-2">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        
        <div className="p-5 bg-cafe-cream/30 border-t border-cafe-cream space-y-3 shrink-0 text-cafe-espresso">
           {/* Receipt Options and Custom Billing Date */}
           <div className="bg-white p-3 rounded-xl border border-cafe-cream space-y-2">
             <p className="text-[10px] uppercase font-bold tracking-wider text-cafe-caramel">Receipt & Date Options</p>
             
             {/* Toggle to Omit table details */}
             <div className="flex items-center space-x-2">
               <input 
                 type="checkbox" 
                 id="posHideTable"
                 checked={hideTableNo}
                 onChange={e => setHideTableNo(e.target.checked)}
                 className="rounded text-cafe-caramel focus:ring-cafe-caramel border-cafe-cream w-4 h-4 cursor-pointer"
               />
               <label htmlFor="posHideTable" className="text-xs font-bold text-cafe-espresso select-none cursor-pointer">
                 Omit Table No. on Receipt
               </label>
             </div>

             {/* Backdating / Custom Date Selector */}
             <div className="space-y-1 pt-1 border-t border-cafe-cream/55">
               <div className="flex items-center justify-between">
                 <span className="text-xs font-bold text-cafe-espresso font-semibold">Custom Bill Date</span>
                 <input 
                   type="checkbox" 
                   id="posCustomDateCheck"
                   checked={useCustomDate}
                   onChange={e => {
                     setUseCustomDate(e.target.checked);
                     if (!e.target.checked) {
                       setBillingDate(new Date().toISOString().split('T')[0]);
                     }
                   }}
                   className="rounded text-cafe-caramel focus:ring-cafe-caramel border-cafe-cream w-3.5 h-3.5 cursor-pointer"
                 />
               </div>
               
               {useCustomDate && (
                 <input 
                   type="date"
                   value={billingDate}
                   max={new Date().toISOString().split('T')[0]} // restrict future dates
                   onChange={e => setBillingDate(e.target.value)}
                   className="w-full bg-cafe-cream/40 px-2 py-1.5 rounded-lg border border-cafe-cream font-bold text-xs text-cafe-espresso focus:ring-1 focus:ring-cafe-caramel"
                 />
               )}
             </div>
           </div>

           {/* Payment Mode Segmented Selector */}
           <div className="bg-white p-3 rounded-xl border border-cafe-cream space-y-1.5 mb-3">
             <span className="text-[10px] uppercase font-bold tracking-wider text-cafe-caramel block mb-1">Select Payment Mode</span>
             <div className="grid grid-cols-2 gap-2">
               <button
                 type="button"
                 onClick={() => setPaymentMethodSelected('cash')}
                 className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                   paymentMethodSelected === 'cash'
                     ? 'bg-cafe-caramel text-white border-cafe-caramel shadow-sm'
                     : 'bg-white text-cafe-caramel border-cafe-cream hover:bg-cafe-cream/20'
                 }`}
               >
                 <span>💵 CASH</span>
               </button>
               <button
                 type="button"
                 onClick={() => setPaymentMethodSelected('upi')}
                 className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                   paymentMethodSelected === 'upi'
                     ? 'bg-cafe-caramel text-white border-cafe-caramel shadow-sm'
                     : 'bg-white text-cafe-caramel border-cafe-cream hover:bg-cafe-cream/20'
                 }`}
               >
                 <span>📱 UPI</span>
               </button>
             </div>
           </div>

           <div className="flex justify-between text-cafe-espresso font-black text-xl pt-2">
             <span>TOTAL</span>
             <span>{formatCurrency(total)}</span>
           </div>
           <button 
            onClick={handleGenerateBill}
            disabled={loading || cart.length === 0}
            className="w-full bg-cafe-caramel text-white py-4 rounded-2xl font-bold mt-4 shadow-xl shadow-cafe-caramel/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs"
           >
             {loading ? 'Processing...' : 'Generate Bill & Print'}
           </button>
        </div>
      </div>
    </div>
  </div>
);
}

function ReportsView() {
  const [bills, setBills] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterType, setFilterType] = React.useState<'day' | 'month' | 'custom'>('day');
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);

  const [editingBillId, setEditingBillId] = React.useState<string | null>(null);
  const [editDateValue, setEditDateValue] = React.useState<string>('');
  const [isSavingDate, setIsSavingDate] = React.useState(false);

  const handleUpdateBillDate = async (billId: string, originalCreatedAt: string) => {
    if (!editDateValue) return;
    setIsSavingDate(true);
    try {
      const originalDate = new Date(originalCreatedAt || new Date());
      const [year, month, day] = editDateValue.split('-');
      const newDate = new Date(originalDate);
      newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'bills', billId), {
        createdAt: newDate.toISOString()
      });
      setEditingBillId(null);
    } catch (err: any) {
      alert("Failed to update bill date: " + err.message);
    } finally {
      setIsSavingDate(false);
    }
  };

  React.useEffect(() => {
    if (filterType === 'month' && selectedDate.length > 7) {
      setSelectedDate(selectedDate.slice(0, 7));
    } else if (filterType === 'day' && selectedDate.length === 7) {
      setSelectedDate(`${selectedDate}-01`);
    }
  }, [filterType]);

  React.useEffect(() => {
    const q = query(collection(db, 'bills'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const allBills = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setBills(allBills);
      setLoading(false);
    }, (err) => {
      console.error("Reports Fetch Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredBills = React.useMemo(() => {
    if (!bills.length) return [];
    
    const processed = bills.map(bill => {
      const dateStr = typeof bill.createdAt === 'string' 
        ? bill.createdAt 
        : (bill.createdAt?.toDate ? bill.createdAt.toDate().toISOString() : '');
      return { ...bill, dateStr };
    }).filter(bill => {
      if (!bill.dateStr) return false;

      if (filterType === 'day') {
        return bill.dateStr.startsWith(selectedDate);
      } else if (filterType === 'month') {
        // Handle both YYYY-MM and YYYY-MM-DD from selectedDate
        const monthMatch = selectedDate.slice(0, 7); 
        return bill.dateStr.startsWith(monthMatch);
      }
      return true;
    });

    return processed.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [bills, filterType, selectedDate]);

  const stats = React.useMemo(() => {
    const totalEarnings = filteredBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
    return {
      count: filteredBills.length,
      revenue: totalEarnings
    };
  }, [filteredBills]);

  const chartData = React.useMemo(() => {
    if (filterType !== 'month') return [];
    const daysInMonth = 30; // Simplified
    return Array.from({ length: daysInMonth }).map((_, i) => {
      const day = i + 1;
      const dayStr = String(day).padStart(2, '0');
      const dayRev = filteredBills
        .filter(b => b.dateStr.includes(`-${dayStr}T`))
        .reduce((sum, b) => sum + Number(b.total), 0);
      return { name: dayStr, revenue: dayRev };
    });
  }, [filteredBills, filterType]);

  const renderRevenueChart = () => {
    if (filterType !== 'month' || !filteredBills.length) return null;
    return (
      <div className="luxury-card p-6 bg-white overflow-hidden h-80 hidden lg:block border border-cafe-cream">
        <h4 className="font-display font-bold text-lg mb-6 text-cafe-espresso">Daily Revenue Performance</h4>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EBE3" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#3B1F0E', fontWeight: 600 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#3B1F0E', fontWeight: 600 }}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip 
                cursor={{ fill: '#F2EBE3', radius: 4 }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.revenue > 0 ? '#C68642' : '#F2EBE3'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.text('AURA CAFE SALES REPORT', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Period: ${selectedDate} (${filterType.toUpperCase()})`, 105, 30, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 35, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text('Performance Summary', 20, 50);
      doc.setFontSize(11);
      doc.text(`Gross Revenue: Rs. ${stats.revenue.toLocaleString()}`, 20, 60);
      doc.text(`Total Transactions: ${stats.count}`, 20, 65);

      doc.setFontSize(14);
      doc.text('Transaction Details', 20, 85);
      
      let y = 95;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('ID', 20, y);
      doc.text('Table', 60, y);
      doc.text('Amount (Rs)', 150, y, { align: 'right' });
      doc.text('Date', 160, y);
      doc.line(20, y + 2, 190, y + 2);
      
      y += 10;
      doc.setFont('helvetica', 'normal');
      
      filteredBills.slice(0, 100).forEach(bill => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(bill.id || '').slice(-6).toUpperCase(), 20, y);
        doc.text(String(bill.tableNumber || ''), 60, y);
        doc.text(Number(bill.total || 0).toLocaleString(), 150, y, { align: 'right' });
        doc.text(String(bill.createdAt || '').split('T')[0], 160, y);
        y += 7;
      });

      doc.save(`Aura_Report_${selectedDate}.pdf`);
    } catch (err: any) {
      alert("PDF Export failed");
    }
  };

  const exportCSV = () => {
    const headers = ['Bill ID', 'Table', 'Amount', 'Date'];
    const rows = filteredBills.map(b => [
      (b.id || '').toUpperCase(),
      b.tableNumber || '',
      b.total || 0,
      String(b.createdAt || '')
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aura_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-20 text-center font-bold animate-pulse">LOADING REPORTS...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-cafe-cream shadow-sm flex flex-col xl:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-4">
          <select 
            value={filterType} 
            onChange={(e: any) => setFilterType(e.target.value)}
            className="bg-cafe-cream px-4 py-3 rounded-xl font-bold text-cafe-espresso outline-none text-sm w-full sm:w-auto"
          >
            <option value="day">Daily Report</option>
            <option value="month">Monthly Report</option>
            <option value="custom">All Time</option>
          </select>
          {filterType !== 'custom' && (
            <input 
              type={filterType === 'day' ? 'date' : 'month'}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-cafe-cream px-4 py-3 rounded-xl font-bold text-cafe-espresso outline-none border-2 border-transparent focus:border-cafe-caramel text-sm w-full sm:w-auto"
            />
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
          <button onClick={exportCSV} className="flex-1 sm:flex-none justify-center bg-white border border-cafe-cream px-4 sm:px-6 py-3 rounded-xl font-bold flex items-center space-x-2 text-xs sm:text-sm">
            <FileText size={16} className="shrink-0"/>
            <span>CSV</span>
          </button>
          <button onClick={exportPDF} className="flex-1 sm:flex-none justify-center bg-cafe-espresso text-white px-4 sm:px-6 py-3 rounded-xl font-bold flex items-center space-x-2 shadow-lg text-xs sm:text-sm whitespace-nowrap">
            <Printer size={16} className="shrink-0"/>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        <div className="luxury-card p-6 sm:p-8 bg-white text-center flex flex-col justify-center border-t-4 border-t-cafe-espresso">
          <p className="text-[10px] font-black uppercase tracking-widest text-cafe-caramel mb-2">Total Transactions</p>
          <p className="text-4xl sm:text-5xl font-display font-black text-cafe-espresso">{stats.count}</p>
        </div>
        <div className="luxury-card p-6 sm:p-8 bg-white text-center flex flex-col justify-center border-t-4 border-t-cafe-caramel">
          <p className="text-[10px] font-black uppercase tracking-widest text-cafe-caramel mb-2">Total Net Revenue</p>
          <p className="text-4xl sm:text-5xl font-display font-black text-cafe-caramel">{formatCurrency(stats.revenue)}</p>
        </div>
      </div>

      {renderRevenueChart()}

      <div className="luxury-card bg-white border border-cafe-cream overflow-hidden">
        <div className="p-6 border-b border-cafe-cream flex justify-between items-center">
          <h4 className="font-display font-bold text-lg">Detailed Sales Ledger</h4>
          <span className="text-[10px] font-bold text-cafe-caramel bg-cafe-cream px-3 py-1 rounded-full uppercase">Top 100 entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-cafe-cream/30 text-[10px] font-black uppercase tracking-widest text-cafe-caramel">
              <tr>
                <th className="p-6">Bill ID</th>
                <th className="p-6">Table</th>
                <th className="p-6">Date</th>
                <th className="p-6">Method</th>
                <th className="p-6 text-right">Amount</th>
                <th className="p-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredBills.slice(0, 100).map(bill => {
                const isEditing = editingBillId === bill.id;
                return (
                  <tr key={bill.id} className="border-b border-cafe-cream/20 hover:bg-cafe-cream/10">
                    <td className="p-6 font-mono text-xs uppercase">#{bill.id.slice(-6)}</td>
                    <td className="p-6 font-bold">{bill.tableNumber}</td>
                    <td className="p-6 text-cafe-caramel">
                      {isEditing ? (
                        <input 
                          type="date"
                          value={editDateValue}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={e => setEditDateValue(e.target.value)}
                          className="px-2 py-1 bg-cafe-cream border border-cafe-cream rounded font-bold text-xs outline-none focus:ring-1 focus:ring-cafe-caramel text-cafe-espresso"
                        />
                      ) : (
                        <span>{String(bill.createdAt || '').split('T')[0]}</span>
                      )}
                    </td>
                    <td className="p-6">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        (bill.paymentMethod || 'upi').toLowerCase() === 'upi'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200/50'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200/50'
                      }`}>
                        {bill.paymentMethod || 'upi'}
                      </span>
                    </td>
                    <td className="p-6 text-right font-black text-cafe-espresso">{formatCurrency(bill.total)}</td>
                    <td className="p-6 text-center">
                      {isEditing ? (
                        <div className="flex justify-center space-x-2">
                          <button
                            disabled={isSavingDate}
                            onClick={() => handleUpdateBillDate(bill.id, bill.createdAt)}
                            className="bg-green-600 hover:bg-green-700 text-white font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-wider shadow active:scale-95 transition-all"
                          >
                            Save
                          </button>
                          <button
                            disabled={isSavingDate}
                            onClick={() => setEditingBillId(null)}
                            className="bg-gray-400 hover:bg-gray-500 text-white font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-wider active:scale-95 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingBillId(bill.id);
                            setEditDateValue(String(bill.createdAt || '').split('T')[0]);
                          }}
                          className="bg-cafe-caramel/10 hover:bg-cafe-caramel/20 text-cafe-caramel font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all"
                        >
                          Change Date
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TableManager() {
  const [tables, setTables] = React.useState<any[]>([]);
  const [newTable, setNewTable] = React.useState('');

  React.useEffect(() => {
    return onSnapshot(collection(db, 'tables'), (snap) => setTables(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const addTable = async () => {
    if (!newTable) return;
    await addDoc(collection(db, 'tables'), { number: newTable, status: 'available' });
    setNewTable('');
  };

  return (
    <div className="space-y-8">
      <div className="luxury-card p-6 sm:p-8 bg-white max-w-2xl shadow-lg border-t-8 border-t-cafe-caramel">
        <h4 className="font-display font-bold text-xl mb-4 sm:mb-6">Table Management</h4>
        <div className="flex flex-col sm:flex-row gap-4">
           <input 
             value={newTable} 
             onChange={e => setNewTable(e.target.value)}
             className="w-full sm:flex-1 px-5 py-4 rounded-xl border border-cafe-cream outline-none focus:ring-2 focus:ring-cafe-caramel/20 bg-cafe-cream/30 font-bold"
             placeholder="Table Number (e.g. 15)"
           />
           <button 
            onClick={addTable} 
            className="w-full sm:w-auto bg-cafe-espresso text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all"
           >
            Add Table
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8">
        {tables.map(table => (
          <div key={table.id} className="bg-white rounded-[2.5rem] p-6 lg:p-10 border border-cafe-cream shadow-xl flex flex-col items-center hover:shadow-2xl transition-all group overflow-hidden relative">
            <h3 className="font-display font-black text-4xl sm:text-5xl text-cafe-espresso mb-8 sm:mb-10">Table {table.number}</h3>
            
            <div id={`qr-container-${table.id}`} className="bg-white p-3 rounded-2xl border-2 border-cafe-cream mb-8 sm:mb-10 transform group-hover:scale-105 transition-transform duration-500 shadow-lg">
              <QRCodeSVG 
                id={`qr-svg-${table.id}`}
                value={`${window.location.origin}/menu?table=${table.number}`} 
                size={180}
                fgColor="#000000"
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="w-full space-y-3 sm:space-y-4">
              <button 
                onClick={() => {
                  const svg = document.getElementById(`qr-svg-${table.id}`);
                  if (!svg) return;
                  const svgData = new XMLSerializer().serializeToString(svg);
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  const img = new Image();
                  img.onload = () => {
                    // Maximum Quality: 2500x2500
                    canvas.width = 2500;
                    canvas.height = 2500;
                    if (ctx) {
                      ctx.fillStyle = "white";
                      ctx.fillRect(0, 0, 2500, 2500);
                      ctx.drawImage(img, 0, 0, 2500, 2500);
                      const pngFile = canvas.toDataURL("image/png", 1.0);
                      const downloadLink = document.createElement("a");
                      downloadLink.download = `AURA_TABLE_${table.number}_HD_QR.png`;
                      downloadLink.href = pngFile;
                      downloadLink.click();
                    }
                  };
                  img.src = "data:image/svg+xml;base64," + btoa(svgData);
                }}
                className="w-full bg-cafe-caramel text-white py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-lg hover:bg-cafe-espresso transition-all flex items-center justify-center space-x-3 active:scale-95"
              >
                <Printer size={16} />
                <span>Download Print QR</span>
              </button>

              <button 
                onClick={() => window.open(`${window.location.origin}/menu?table=${table.number}`, '_blank')}
                className="w-full bg-cafe-cream text-cafe-espresso py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] sm:text-[11px] hover:bg-cafe-espresso hover:text-white transition-all flex items-center justify-center space-x-3"
              >
                <Search size={16} />
                <span>Open View</span>
              </button>

              <button 
                onClick={async () => {
                  if(confirm(`Permanentely remove Table ${table.number}?`)) {
                    const { deleteDoc, doc } = await import('firebase/firestore');
                    await deleteDoc(doc(db, 'tables', table.id));
                  }
                }}
                className="w-full text-red-400 font-bold uppercase tracking-[0.2em] text-[9px] pt-4 opacity-40 hover:opacity-100 transition-opacity hover:text-red-600"
              >
                Remove Table
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderFeed({ orders, onPrint }: { orders: Order[], onPrint: (data: any) => void }) {
  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.RECEIVED: return 'bg-blue-100 text-blue-600';
      case OrderStatus.PREPARING: return 'bg-orange-100 text-orange-600';
      case OrderStatus.READY: return 'bg-green-100 text-green-600';
      case OrderStatus.SERVED: return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 pb-20 lg:pb-0">
      <AnimatePresence>
        {orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED).map((order) => (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="luxury-card p-6 border-l-4 border-l-cafe-caramel flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cafe-caramel">
                  {order.tableNumber === 'Takeaway' ? 'Takeaway' : `Table ${order.tableNumber}`}
                </span>
                <h3 className="text-lg font-bold text-cafe-espresso">Order #{order.id.slice(-4).toUpperCase()}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>

            {(order as any).customerNote && (
              <div className="mb-4 p-3 bg-cafe-caramel/5 rounded-xl border border-cafe-caramel/10">
                <p className="text-[10px] font-black uppercase text-cafe-caramel mb-1 tracking-widest flex items-center">
                  <FileText size={10} className="mr-1" />
                  Order Instructions
                </p>
                <p className="text-xs font-bold text-cafe-espresso italic">"{(order as any).customerNote}"</p>
              </div>
            )}

            <div className="flex-1 space-y-3 my-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm border-b border-cafe-cream pb-2 last:border-0 last:pb-0">
                  <div className="flex space-x-3">
                    <span className="font-bold text-cafe-caramel">x{item.quantity}</span>
                    <div>
                      <p className="font-medium text-cafe-espresso">{item.name}</p>
                      {item.variant && <p className="text-[10px] text-cafe-caramel/70">Size: {item.variant}</p>}
                      {item.addOns && item.addOns.length > 0 && (
                        <p className="text-[10px] text-cafe-caramel/70">Add-ons: {item.addOns.join(', ')}</p>
                      )}
                      {item.note && <p className="text-[10px] italic text-red-400 mt-1">Note: {item.note}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-cafe-cream flex justify-between items-center bg-cafe-cream/30 -mx-6 px-6 -mb-6 pb-6">
              <span className="font-display font-bold text-xl">{formatCurrency(order.total)}</span>
              <div className="flex space-x-2">
                {order.status === OrderStatus.RECEIVED && (
                  <button 
                    onClick={() => updateStatus(order.id, OrderStatus.PREPARING)}
                    className="p-2 bg-cafe-caramel text-white rounded-lg hover:bg-cafe-caramel/90 transition-all shadow-sm"
                    title="Mark as Preparing"
                  >
                    <Clock size={18} />
                  </button>
                )}
                {order.status === OrderStatus.PREPARING && (
                  <button 
                    onClick={() => updateStatus(order.id, OrderStatus.READY)}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm"
                    title="Mark as Ready"
                  >
                    <CheckCircle size={18} />
                  </button>
                )}
                {order.status === OrderStatus.READY && (
                  <button 
                    onClick={() => updateStatus(order.id, OrderStatus.SERVED)}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"
                    title="Mark as Served"
                  >
                    <CheckCircle size={18} />
                  </button>
                )}
                <button 
                  onClick={() => onPrint(order)}
                  className="p-2 bg-white border border-cafe-cream text-cafe-espresso rounded-lg hover:bg-cafe-cream transition-all shadow-sm"
                  title="Print KOT"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AdminSettings({ 
  sound, 
  setSound,
  onTestPrint,
  paperSize,
  setPaperSize,
  printerFontSize,
  setPrinterFontSize,
  preferredPrinter,
  setPreferredPrinter,
  preferredKitchenPrinter,
  setPreferredKitchenPrinter
}: { 
  sound: boolean,
  setSound: (v: boolean) => void,
  onTestPrint: (data: any) => void,
  paperSize: '80mm' | '58mm',
  setPaperSize: (v: '80mm' | '58mm') => void,
  printerFontSize: string,
  setPrinterFontSize: (v: string) => void,
  preferredPrinter: string,
  setPreferredPrinter: (v: string) => void,
  preferredKitchenPrinter: string,
  setPreferredKitchenPrinter: (v: string) => void
}) {
  const WIRED_PRINTERS_PRESETS = [
    'TVS RP-3150 Gold (Wired USB)',
    'TVS RP-3200 Star (Wired USB)',
    'Epson TM-T82X (Wired USB)',
    'POS-80 series (Generic Wired USB)',
    'POS-58 series (Generic Wired USB)'
  ];

  const [isClearing, setIsClearing] = React.useState(false);
  const [clearStatus, setClearStatus] = React.useState<string | null>(null);
  const [clearSuccess, setClearSuccess] = React.useState(false);

  const handleClearAllCollections = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all live orders, kitchen tickets, tables active states, and billing history? \n\nNo menu categories or dishes will be deleted. This action is irreversible.")) {
      return;
    }
    
    setIsClearing(true);
    setClearStatus("Wiping Orders...");
    try {
      // 1. Clear orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      for (const d of ordersSnap.docs) {
        await deleteDoc(doc(db, 'orders', d.id));
      }
      
      setClearStatus("Wiping Bills...");
      // 2. Clear bills
      const billsSnap = await getDocs(collection(db, 'bills'));
      for (const d of billsSnap.docs) {
        await deleteDoc(doc(db, 'bills', d.id));
      }

      setClearStatus("Resetting Tables...");
      // 3. Reset tables status to available
      const tablesSnap = await getDocs(collection(db, 'tables'));
      for (const d of tablesSnap.docs) {
        await updateDoc(doc(db, 'tables', d.id), { status: 'available' });
      }

      setClearSuccess(true);
      setTimeout(() => {
        setClearSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to reset database: " + err.message);
    } finally {
      setIsClearing(false);
      setClearStatus(null);
    }
  };

  const [isResettingMenu, setIsResettingMenu] = React.useState(false);
  const [resetMenuSuccess, setResetMenuSuccess] = React.useState(false);

  const handleResetMenuCatalog = async () => {
    if (!window.confirm("Are you sure you want to completely RESET the menu catalog? \n\nAll existing menu items and categories will be permanently deleted and replaced with the updated ones from your official menu (including Cakes with 0.5kg/1kg sizes, Hot/Cold Beverages, Cocktails/Mojitos, Pastas, Sweets, Snacks, and Fresh Juices). This is highly recommended to update your products, pricing, and category structures.")) {
      return;
    }

    setIsResettingMenu(true);
    try {
      await forceResetAndSeed();
      setResetMenuSuccess(true);
      setTimeout(() => {
        setResetMenuSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to reset menu catalog: " + err.message);
    } finally {
      setIsResettingMenu(false);
    }
  };

  // Billing (Cashier) custom configuration states
  const [billingPreset, setBillingPreset] = React.useState<string>(() => {
    if (WIRED_PRINTERS_PRESETS.includes(preferredPrinter)) {
      return preferredPrinter;
    }
    return 'Custom';
  });

  const [billingCustomName, setBillingCustomName] = React.useState<string>(() => {
    return WIRED_PRINTERS_PRESETS.includes(preferredPrinter) ? '' : preferredPrinter;
  });

  // Kitchen (KOT) custom configuration states
  const [kitchenPreset, setKitchenPreset] = React.useState<string>(() => {
    if (WIRED_PRINTERS_PRESETS.includes(preferredKitchenPrinter)) {
      return preferredKitchenPrinter;
    }
    return 'Custom';
  });

  const [kitchenCustomName, setKitchenCustomName] = React.useState<string>(() => {
    return WIRED_PRINTERS_PRESETS.includes(preferredKitchenPrinter) ? '' : preferredKitchenPrinter;
  });

  const [usbDeviceName, setUsbDeviceName] = React.useState<string | null>(() => {
    return localStorage.getItem('paired_usb_device_name');
  });

  const [usbError, setUsbError] = React.useState<string | null>(null);

  const handlePairUSB = async (target: 'BILL' | 'KOT') => {
    setUsbError(null);
    try {
      const nav = navigator as any;
      if (!nav.usb) {
        setUsbError("WebUSB is not supported in this browser. Try opening the dashboard in a new tab (click ↗ icon on the top right) to grant physical USB permissions.");
        return;
      }
      const device = await nav.usb.requestDevice({ filters: [] });
      const name = device.productName || `USB Device (${device.vendorId.toString(16).padStart(4, '0')}:${device.productId.toString(16).padStart(4, '0')})`;
      setUsbDeviceName(name);
      localStorage.setItem('paired_usb_device_name', name);
      
      if (target === 'BILL') {
        setPreferredPrinter(name);
        setBillingPreset('Custom');
        setBillingCustomName(name);
      } else {
        setPreferredKitchenPrinter(name);
        setKitchenPreset('Custom');
        setKitchenCustomName(name);
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotFoundError') {
        setUsbError("Wired hardware search cancelled. No device was selected.");
      } else if (err.name === 'SecurityError') {
        setUsbError("Security permission blocked. Please open dashboard in a separate tab to pair USB device.");
      } else {
        setUsbError(err.message || "Failed to scan for USB devices.");
      }
    }
  };

  const handleBillingPresetChange = (val: string) => {
    setBillingPreset(val);
    if (val !== 'Custom') {
      setPreferredPrinter(val);
    } else {
      setPreferredPrinter(billingCustomName || 'TVS RP-3150 Gold (Wired USB)');
    }
  };

  const handleBillingCustomNameChange = (val: string) => {
    setBillingCustomName(val);
    setPreferredPrinter(val);
  };

  const handleKitchenPresetChange = (val: string) => {
    setKitchenPreset(val);
    if (val !== 'Custom') {
      setPreferredKitchenPrinter(val);
    } else {
      setPreferredKitchenPrinter(kitchenCustomName || 'Epson TM-T82X (Wired USB)');
    }
  };

  const handleKitchenCustomNameChange = (val: string) => {
    setKitchenCustomName(val);
    setPreferredKitchenPrinter(val);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="space-y-2">
        <h2 className="text-3xl font-display font-black text-cafe-espresso">Terminal Settings</h2>
        <p className="text-aura-green/60 font-medium">Configure network/USB kitchen printers and automation preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Billing Printer Config Card */}
        <div className="bg-white p-8 rounded-[2rem] border border-cafe-cream shadow-sm hover:shadow-md transition-all space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-aura-gold/15 text-aura-gold rounded-2xl flex items-center justify-center">
              <Printer size={24} />
            </div>
            <div>
              <h3 className="font-bold text-cafe-espresso">Billing Printer</h3>
              <p className="text-[10px] text-cafe-caramel uppercase font-black tracking-widest">Receipts & Invoices</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-cafe-cream">
            {/* Preferred Printer Selector Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-cafe-caramel tracking-widest">
                Select Connected Device
              </label>
              
              <select
                value={billingPreset}
                onChange={(e) => handleBillingPresetChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-cafe-cream bg-white text-cafe-espresso text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aura-gold focus:border-transparent transition-all"
              >
                {WIRED_PRINTERS_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="Custom">Custom / Pair Other USB Printer...</option>
              </select>

              {/* Show text input ONLY if Custom is chosen */}
              {billingPreset === 'Custom' && (
                <div className="mt-3 space-y-2">
                  <span className="block text-[10px] font-black uppercase text-cafe-caramel tracking-wider">
                    Enter Custom Device Name
                  </span>
                  <input
                    type="text"
                    value={billingCustomName}
                    onChange={(e) => handleBillingCustomNameChange(e.target.value)}
                    placeholder="e.g. TVS Wired Receipt Printer"
                    className="w-full px-4 py-3 rounded-xl border border-cafe-cream text-cafe-espresso text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aura-gold focus:border-transparent transition-all"
                  />
                </div>
              )}
            </div>

            {/* Hardware-level WebUSB Scanner Option */}
            <div className="p-4 bg-cafe-cream/25 rounded-2xl border border-cafe-cream/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black uppercase text-cafe-caramel tracking-widest">
                    Direct WebUSB Sync
                  </span>
                  <p className="text-[10px] text-cafe-espresso/70 mt-0.5">
                    Trigger direct browser pairing for TVS Billing printer.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePairUSB('BILL')}
                className="w-full py-2.5 px-4 bg-cafe-espresso text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cafe-espresso/90 active:scale-95 transition-all text-center"
              >
                🔍 Pair Billing USB Printer
              </button>
            </div>
            
            <p className="text-[11px] font-mono font-bold text-cafe-caramel bg-cafe-cream/10 p-2.5 rounded-xl border border-cafe-cream">
              📍 ACTIVE DEVICE: {preferredPrinter}
            </p>
          </div>
        </div>

        {/* Kitchen KOT Printer Config Card */}
        <div className="bg-white p-8 rounded-[2rem] border border-cafe-cream shadow-sm hover:shadow-md transition-all space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-aura-green/15 text-aura-green rounded-2xl flex items-center justify-center">
              <UtensilsCrossed size={22} className="text-aura-green" />
            </div>
            <div>
              <h3 className="font-bold text-cafe-espresso">Kitchen KOT Printer</h3>
              <p className="text-[10px] text-cafe-caramel uppercase font-black tracking-widest">Food Order Slips</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-cafe-cream">
            {/* Preferred Printer Selector Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-cafe-caramel tracking-widest">
                Select Connected Device
              </label>
              
              <select
                value={kitchenPreset}
                onChange={(e) => handleKitchenPresetChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-cafe-cream bg-white text-cafe-espresso text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aura-gold focus:border-transparent transition-all"
              >
                {WIRED_PRINTERS_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="Custom">Custom / Pair Other USB Printer...</option>
              </select>

              {/* Show text input ONLY if Custom is chosen */}
              {kitchenPreset === 'Custom' && (
                <div className="mt-3 space-y-2">
                  <span className="block text-[10px] font-black uppercase text-cafe-caramel tracking-wider">
                    Enter Custom Device Name
                  </span>
                  <input
                    type="text"
                    value={kitchenCustomName}
                    onChange={(e) => handleKitchenCustomNameChange(e.target.value)}
                    placeholder="e.g. Kitchen Thermal Printer"
                    className="w-full px-4 py-3 rounded-xl border border-cafe-cream text-cafe-espresso text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aura-gold focus:border-transparent transition-all"
                  />
                </div>
              )}
            </div>

            {/* Hardware-level WebUSB Scanner Option */}
            <div className="p-4 bg-cafe-cream/25 rounded-2xl border border-cafe-cream/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black uppercase text-cafe-caramel tracking-widest">
                    Direct WebUSB Sync
                  </span>
                  <p className="text-[10px] text-cafe-espresso/70 mt-0.5">
                    Trigger direct browser pairing for Kitchen printer.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePairUSB('KOT')}
                className="w-full py-2.5 px-4 bg-cafe-espresso text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cafe-espresso/90 active:scale-95 transition-all text-center"
              >
                🔍 Pair Kitchen USB Printer
              </button>
            </div>

            <p className="text-[11px] font-mono font-bold text-aura-green bg-white p-2.5 rounded-xl border border-cafe-cream">
              🍳 ACTIVE DEVICE: {preferredKitchenPrinter}
            </p>
          </div>
        </div>

        {/* General Printing Card */}
        <div className="bg-white p-8 rounded-[2rem] border border-cafe-cream shadow-sm hover:shadow-md transition-all space-y-6 md:col-span-2">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-cafe-cream/40 text-cafe-espresso rounded-2xl flex items-center justify-center">
              <Settings size={22} />
            </div>
            <div>
              <h3 className="font-bold text-cafe-espresso">General Printing & Workflow Settings</h3>
              <p className="text-[10px] text-cafe-caramel uppercase font-black tracking-widest">Styles, Sounds & Media Widths</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-cafe-cream">
            {/* Paper Width Option */}
            <div className="space-y-2">
              <span className="block text-xs font-black uppercase text-cafe-caramel tracking-widest mb-1">
                Paper Size Width
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaperSize('80mm')}
                  className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all ${
                    paperSize === '80mm'
                      ? 'bg-cafe-espresso text-white shadow-md'
                      : 'bg-cafe-cream/30 text-cafe-caramel hover:bg-cafe-cream/50'
                  }`}
                >
                  80mm (3")
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('58mm')}
                  className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all ${
                    paperSize === '58mm'
                      ? 'bg-cafe-espresso text-white shadow-md'
                      : 'bg-cafe-cream/30 text-cafe-caramel hover:bg-cafe-cream/50'
                  }`}
                >
                  58mm (2")
                </button>
              </div>
            </div>

            {/* Font Sizer Option */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-cafe-caramel tracking-widest">
                Print Font Density
              </label>
              <select
                value={printerFontSize}
                onChange={(e) => setPrinterFontSize(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-cafe-cream bg-white text-cafe-espresso text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-aura-gold focus:border-transparent transition-all"
              >
                <option value="9px">9px (Extra Small)</option>
                <option value="10px">10px (Small)</option>
                <option value="11px">11px (Normal)</option>
                <option value="12px">12px (Medium)</option>
                <option value="13px">13px (Large)</option>
              </select>
            </div>

            {/* Sound Notification option */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-cafe-caramel tracking-widest mb-1">
                Workflow Audio Alert
              </label>
              <div className="flex items-center justify-between p-2 px-3 border border-cafe-cream rounded-xl bg-cafe-cream/10">
                <span className="text-[11px] font-bold text-cafe-espresso">Incoming Sound Alarm</span>
                <button 
                  onClick={() => setSound(!sound)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${sound ? 'bg-aura-gold' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${sound ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
          
          {usbError && (
            <p className="text-[10px] text-red-600 font-bold leading-normal mt-2 bg-red-50 p-2.5 rounded-lg border border-red-200">
              ⚠️ {usbError}
            </p>
          )}
        </div>

        {/* Maintenance / Reset Database Card */}
        <div className="bg-red-50/40 p-8 rounded-[2rem] border border-red-200/50 shadow-sm hover:shadow-md transition-all space-y-6 md:col-span-2 animate-in fade-in duration-300">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100/80 text-red-600 rounded-2xl flex items-center justify-center">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-cafe-espresso">Database Maintenance (Wipe & Clean)</h3>
              <p className="text-[10px] text-red-700/80 uppercase font-black tracking-widest">Fresh Start Terminal Reset</p>
            </div>
          </div>

          <div className="pt-4 border-t border-red-200/50 space-y-4">
            <div className="space-y-3">
              <p className="text-xs text-cafe-espresso/80 leading-relaxed">
                If you want to clear old sales test data, cancel active bills, and start with a completely pristine café billing dashboard, click below to wipe order documents, reset active table booking flags, and clean current performance logs.
                <br />
                <strong className="text-red-700 font-bold">⚠️ Warning: This will delete files inside the 'orders' and 'bills' collections permanently. Menu item catalogs and recipes are safe.</strong>
              </p>

              <div className="flex flex-wrap gap-3 items-center pt-1">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={handleClearAllCollections}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>{clearStatus || 'Wiping...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Wipe All Orders & Start Fresh</span>
                    </>
                  )}
                </button>

                {clearSuccess && (
                  <span className="text-xs font-bold text-green-700 bg-green-100/90 border border-green-200 px-4 py-2 rounded-xl animate-pulse">
                    🎉 Database reset successful! Dashboard is now 100% fresh!
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-red-200/50 pt-4 space-y-3">
              <p className="text-xs text-cafe-espresso/80 leading-relaxed">
                If you wish to update the menu items, pricing, and category divisions with the official, newly updated digital catalog (consisting of Cakes with 0.5kg/1kg sizes, Snacks & Sides, Burgers, Sandwiches, Desserts, Pasta, Beverages, Juices, Frappes, Avil Milk, and Mojitos), trigger a clean catalog reset.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  type="button"
                  disabled={isResettingMenu}
                  onClick={handleResetMenuCatalog}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-aura-gold hover:bg-aura-gold/90 disabled:bg-aura-gold/50 text-cafe-espresso font-bold uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 cursor-pointer"
                >
                  {isResettingMenu ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Resetting Menu...</span>
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed size={13} />
                      <span>Reset & Seed Menu Category & Product Pricing</span>
                    </>
                  )}
                </button>

                {resetMenuSuccess && (
                  <span className="text-xs font-bold text-green-700 bg-green-100/90 border border-green-200 px-4 py-2 rounded-xl animate-pulse">
                    🎉 Menu update successful! Entire official menu catalog seeded!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Card */}
      <div className="bg-cafe-espresso text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Settings size={160} />
        </div>
        <div className="relative z-10 space-y-6 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-aura-gold/20 text-aura-gold px-4 py-2 rounded-full border border-aura-gold/30">
            <Bell size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Silent Wired / USB Print Setup</span>
          </div>
          <h3 className="text-3xl font-display font-black">How to select your TVS Wired Printer here?</h3>
          <p className="text-white/70 leading-relaxed font-semibold">
            Since web browsers cannot communicate directly with local physical USB or Ethernet hardware ports due to browser security sandboxes, your billing machine routes prints perfectly using local system print properties:
          </p>
          <ul className="space-y-5">
            <li className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-aura-gold text-aura-green rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-1">1</div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Connect the Cable & Install the Printer Driver</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Plug the USB / Wired LAN cable from your TVS thermal printer directly into your Billing Machine. Go to your computer's settings (<b>Printers & Scanners</b>) to ensure the printer is added, installed with correct drivers, and shows as <b>Online / Ready</b>.
                </p>
              </div>
            </li>
            <li className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-aura-gold text-aura-green rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-1">2</div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Select TVS Printer under Destinations</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Click the <b>Print Test Ticket</b> button below. When the browser's print dialog opens, click the <b>Destination</b> option and select your wired TVS Printer from the dropdown list.
                </p>
              </div>
            </li>
            <li className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-aura-gold text-aura-green rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-1">3</div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Activate Automatic "Silent Mode" (Recommended)</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  To completely bypass the printer dialogue popup and print <b>automatically on order arrival</b> with no clicks:
                </p>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 mt-2">
                  <p className="text-[10px] text-white font-black mb-1">PRO-TIP: CHROME SILENT MODE</p>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Set your TVS printer as your computer's "Default Printer", close Chrome completely, then re-launch it with the flag: <code>--kiosk-printing</code>. 
                    Now, any "Print" action in the billing app will print immediately on your wired roll with zero popups!
                  </p>
                </div>
              </div>
            </li>
          </ul>
          <div className="pt-4 flex flex-wrap gap-4">
            <button 
              onClick={() => {
                const testData = {
                  type: 'KOT',
                  tableNumber: 'TEST',
                  items: [{ name: 'Test - Smiley Fries', quantity: 1, price: 0 }, { name: 'Test - Filter Coffee', quantity: 2, price: 0 }],
                  total: 0,
                  id: 'TEST-' + Math.random().toString(36).substring(7).toUpperCase()
                };
                onTestPrint(testData);
              }}
              className="bg-aura-gold text-aura-green px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white hover:text-cafe-espresso transition-all shadow-xl"
            >
              Print Test Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KitchenKDS({ orders, onPrint }: { orders: Order[], onPrint: (data: any) => void }) {
  const activeOrders = orders.filter(o => [OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.READY].includes(o.status));
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 pb-20 lg:pb-0 content-start">
        {activeOrders.length === 0 && (
          <div className="col-span-full py-32 text-center">
            <div className="w-24 h-24 bg-cafe-cream rounded-full flex items-center justify-center mx-auto mb-6 text-cafe-caramel">
              <ChefHat size={48} />
            </div>
            <h3 className="text-2xl font-display font-bold text-cafe-espresso">No Orders Fire</h3>
            <p className="text-cafe-caramel">The kitchen is currently all clear.</p>
          </div>
        )}
        {activeOrders.map((order) => (
          <div key={order.id} className={`luxury-card p-0 flex flex-col overflow-hidden border-t-8 ${
            order.status === OrderStatus.RECEIVED ? 'border-t-blue-500' : 
            order.status === OrderStatus.PREPARING ? 'border-t-orange-500' : 'border-t-green-500'
          }`}>
            <div className="p-4 bg-cafe-cream/30 border-b border-cafe-cream flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cafe-caramel">Table {order.tableNumber}</span>
                <h4 className="font-bold text-lg leading-none">#{order.id.slice(-4).toUpperCase()}</h4>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-bold text-cafe-espresso flex items-center justify-end">
                   <Clock size={10} className="mr-1" />
                   {new Date(order.createdAt as any).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
              </div>
            </div>

            {(order as any).customerNote && (
              <div className="bg-cafe-caramel text-white px-5 py-2 text-[10px] font-black uppercase tracking-widest flex items-center">
                <Info size={12} className="mr-2 shrink-0" />
                <span className="truncate">Note: {(order as any).customerNote}</span>
              </div>
            )}
            
            <div className="flex-1 p-5 space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cafe-espresso text-white flex items-center justify-center font-black shrink-0">
                    {item.quantity}
                  </div>
                  <div>
                    <p className="font-bold text-cafe-espresso uppercase text-sm">{item.name}</p>
                    {item.variant && <p className="text-[10px] font-black text-cafe-caramel">SIZE: {item.variant}</p>}
                    {item.addOns && item.addOns.length > 0 && (
                       <div className="flex flex-wrap gap-1 mt-1">
                         {item.addOns.map((a, j) => (
                           <span key={j} className="text-[8px] bg-white border border-cafe-cream px-1.5 py-0.5 rounded uppercase font-bold">{a}</span>
                         ))}
                       </div>
                    )}
                    {item.note && <div className="mt-2 text-xs bg-red-50 text-red-600 p-2 rounded-lg font-bold border border-red-100">NOTE: {item.note}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-cafe-cream/10 border-t border-cafe-cream flex gap-2">
              <button 
                onClick={() => onPrint(order)}
                className="p-3 bg-white border border-cafe-cream text-cafe-espresso rounded-xl hover:bg-cafe-cream transition-all shadow-md active:scale-95"
                title="Print KOT"
              >
                <Printer size={16} />
              </button>
              {order.status === OrderStatus.RECEIVED ? (
                 <button 
                  onClick={() => updateDoc(doc(db, 'orders', order.id), { status: OrderStatus.PREPARING })}
                  className="flex-1 bg-cafe-espresso text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all"
                 >
                   Start Cooking
                 </button>
              ) : (
                <button 
                  onClick={() => updateDoc(doc(db, 'orders', order.id), { status: OrderStatus.READY })}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all"
                 >
                   Order Ready
                 </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
