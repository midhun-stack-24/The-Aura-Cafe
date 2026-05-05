import React from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase.ts';
import { motion } from 'motion/react';
import { Coffee, Lock, Mail, LogIn } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        setError('Network Connection Blocked: 1) Disable Ad-blockers. 2) Open in a "New Tab". 3) Disable Brave Shields.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No admin account found. Please run "First Time Setup" below.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || 'Authentication failed');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cafe-cream px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full luxury-card p-8 space-y-8 shadow-xl"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-cafe-caramel/10 rounded-full text-cafe-caramel mb-2">
            <Coffee size={32} />
          </div>
          <h2 className="text-3xl font-display font-bold text-cafe-espresso">Admin Portal</h2>
          <p className="text-cafe-caramel">Please sign in to manage your cafe</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-cafe-caramel/50" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-cafe-caramel/20 focus:ring-2 focus:ring-cafe-caramel/50 outline-none transition-all"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-cafe-caramel/50" size={18} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-cafe-caramel/20 focus:ring-2 focus:ring-cafe-caramel/50 outline-none transition-all"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cafe-espresso text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-cafe-cream"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-cafe-caramel">
              <span className="bg-white px-4">OR</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-cafe-espresso border border-cafe-cream py-4 rounded-xl font-bold flex items-center justify-center space-x-3 shadow-sm hover:bg-cafe-cream transition-all"
          >
            <LogIn size={18} className="text-cafe-caramel" />
            <span>Sign in with Google</span>
          </button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-xs text-cafe-caramel/70 font-display italic">
            "Taste the perfection in every brew"
          </p>
          <div className="pt-4 border-t border-cafe-cream">
            <a 
              href="/admin/setup" 
              className="text-[10px] font-black uppercase tracking-widest text-cafe-caramel/50 hover:text-cafe-caramel transition-colors"
            >
              First Time Setup? Initialize Server
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
