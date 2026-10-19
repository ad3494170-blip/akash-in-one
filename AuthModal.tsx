import React, { useState, useEffect } from 'react';
import { api, authStorage } from '../services/api.ts';
import { User, Wallet } from '../types.ts';
import { X, Lock, Mail, User as UserIcon, ShieldAlert, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User, wallet: Wallet) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'admin_setup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean>(true);

  useEffect(() => {
    api.getSetupStatus()
      .then((res) => {
        setHasAdmin(res.hasAdmin);
        if (!res.hasAdmin) {
          // If no admin exists in the entire database, point them to admin setup
          setTab('admin_setup');
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await api.login({ email, password });
        authStorage.setToken(res.token);
        onSuccess(res.user, res.wallet);
      } else if (tab === 'register') {
        const res = await api.register({ email, username, password });
        authStorage.setToken(res.token);
        onSuccess(res.user, res.wallet);
      } else if (tab === 'admin_setup') {
        const res = await api.setupAdmin({ email, username, password });
        authStorage.setToken(res.token);
        // fetch initial wallet
        const wallet = await api.getWallet().catch(() => ({ userId: res.user.id, balance: 0, updatedAt: new Date().toISOString(), version: 1 }));
        onSuccess(res.user, wallet);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div>
            <h2 className="text-xl font-black text-white font-['Cinzel']">
              {tab === 'login' && 'Sign In to AKASH'}
              {tab === 'register' && 'Create Customer Account'}
              {tab === 'admin_setup' && 'Initial Administrator Setup'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {tab === 'login' && 'Access your wallet, orders, and instant Free Fire delivery.'}
              {tab === 'register' && 'Join thousands of Free Fire players boosting likes & glory.'}
              {tab === 'admin_setup' && 'Secure first-time administrator configuration.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1.5 gap-1.5">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'login' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'register' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Register
          </button>
          {!hasAdmin && (
            <button
              onClick={() => { setTab('admin_setup'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'admin_setup' ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              Setup Admin
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {tab === 'admin_setup' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                No administrator account exists yet. Create your secure administrator credentials now to unlock full dashboard privileges.
              </span>
            </div>
          )}

          {tab !== 'login' && (
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. DemonSlayer99"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'login' ? 'Your password' : 'At least 6 characters'}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              tab === 'admin_setup'
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
            }`}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                {tab === 'login' && 'Sign In'}
                {tab === 'register' && 'Create Account'}
                {tab === 'admin_setup' && 'Establish Administrator'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-2 text-zinc-400 text-[11px]">
            {tab === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('register'); setError(null); }}
                  className="text-red-400 font-bold hover:underline"
                >
                  Register here
                </button>
              </span>
            ) : tab === 'register' ? (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(null); }}
                  className="text-red-400 font-bold hover:underline"
                >
                  Sign in here
                </button>
              </span>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
};
