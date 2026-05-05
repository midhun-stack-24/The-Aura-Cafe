import React from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase.ts';
import { motion } from 'motion/react';
import { ShieldCheck, ChevronLeft, AlertCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminSetup() {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [errorDetails, setErrorDetails] = React.useState<string | null>(null);
  const navigate = useNavigate();

  const EMAIL = 'midhunas0624@gmail.com';
  const PASSWORD = 'Theauracafe@2026';

  const initializeAdminProfile = async (uid: string, email: string) => {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        email: email,
        role: 'superadmin',
        name: 'Aura Admin',
        createdAt: new Date().toISOString()
      });
      console.log("Profile created successfully!");
    }
  };

  const setupWithGoogle = async () => {
    setLoading(true);
    setErrorDetails(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await initializeAdminProfile(result.user.uid, result.user.email!);
      setDone(true);
    } catch (err: any) {
      console.error("Setup Error:", err);
      setErrorDetails(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupWithEmail = async () => {
    setLoading(true);
    setErrorDetails(null);
    try {
      let uid = '';
      try {
        const userCred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
        uid = userCred.user.uid;
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use' || err.code === 'auth/operation-not-allowed') {
          // If already exists or provider disabled, we suggest Google
          if (err.code === 'auth/operation-not-allowed') {
            throw new Error("Email/Password is disabled in Firebase Console. Please use Google Sign-In below.");
          }
          const userCred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
          uid = userCred.user.uid;
        } else {
          throw err;
        }
      }
      await initializeAdminProfile(uid, EMAIL);
      setDone(true);
    } catch (err: any) {
      console.error("Setup Error:", err);
      if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        setErrorDetails('Network Error: Firebase is being blocked. 1) Disable Ad-blockers. 2) Open this app in a "New Tab" using the button at the top right of the preview. 3) Disable Brave Shields if using Brave.');
      } else {
        setErrorDetails(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cafe-cream p-6 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full luxury-card p-10 text-center space-y-8 shadow-2xl"
      >
        <div className="w-20 h-20 bg-cafe-caramel/10 text-cafe-caramel rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck size={40} />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-display font-black text-cafe-espresso leading-tight">Admin Config</h1>
          <p className="text-sm text-cafe-caramel font-medium leading-relaxed">
            Initialize your cafe management session. Google login is recommended for the first setup.
          </p>
        </div>

        {errorDetails && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs flex items-start space-x-3 text-left border border-red-100">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorDetails}</span>
          </div>
        )}

        {done ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
             <div className="p-4 bg-green-50 text-green-600 border border-green-100 rounded-xl font-bold text-sm">
                Administration active!
             </div>
             <button 
               onClick={() => navigate('/admin')}
               className="w-full bg-cafe-espresso text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg"
             >
               Enter Dashboard
             </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              disabled={loading}
              onClick={setupWithGoogle}
              className="w-full bg-white text-cafe-espresso border border-cafe-cream py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 shadow-sm hover:bg-cafe-cream transition-all group"
            >
              <LogIn size={20} className="text-cafe-caramel" />
              <span>Initialize via Google</span>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-cafe-cream"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-cafe-caramel"><span className="bg-white px-4">OR USE EMAIL</span></div>
            </div>

            <button 
              disabled={loading}
              onClick={setupWithEmail}
              className="w-full bg-cafe-espresso text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl opacity-80 hover:opacity-100 transition-all"
            >
              {loading ? 'Processing...' : 'Register as Master Admin'}
            </button>
          </div>
        )}

        <button 
          onClick={() => navigate('/admin/login')}
          className="flex items-center justify-center space-x-2 text-cafe-caramel font-bold text-xs uppercase tracking-widest hover:text-cafe-espresso transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Back to Login</span>
        </button>
      </motion.div>
    </div>
  );
}
