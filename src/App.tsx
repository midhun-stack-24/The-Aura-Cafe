import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useSearchParams,
  Navigate
} from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './lib/firebase.ts';
import MenuPage from './components/menu/MenuPage.tsx';
import AdminDashboard from './components/admin/AdminDashboard.tsx';
import AdminLogin from './components/admin/AdminLogin.tsx';
import AdminSetup from './components/admin/AdminSetup.tsx';
import OrderStatus from './components/menu/OrderStatus.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Validate Connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration and internet connection.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-cafe-cream">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-cafe-caramel border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<Navigate to="/menu" replace />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/order-status/:orderId" element={<OrderStatus />} />

          {/* Admin Routes */}
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/admin/login" element={user ? <Navigate to="/admin" replace /> : <AdminLogin />} />
          <Route path="/admin/*" element={user ? <AdminDashboard /> : <Navigate to="/admin/login" replace />} />
        </Routes>
      </AnimatePresence>
      <SpeedInsights />
    </Router>
  );
}
