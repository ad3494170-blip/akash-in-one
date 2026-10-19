import React from 'react';
import { User, Wallet, StoreSettings } from '../types.ts';
import { Flame, ShieldCheck, Wallet as WalletIcon, ShoppingBag, ShieldAlert, LogOut, User as UserIcon, PlusCircle, Menu, X, Bot, HelpCircle } from 'lucide-react';

interface NavbarProps {
  currentTab: 'likes' | 'glory' | 'orders' | 'support' | 'admin' | 'transactions';
  setCurrentTab: (tab: 'likes' | 'glory' | 'orders' | 'support' | 'admin' | 'transactions') => void;
  user: User | null;
  wallet: Wallet | null;
  settings: StoreSettings | null;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  wallet,
  settings,
  onOpenAuth,
  onOpenWallet,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div 
            onClick={() => { setCurrentTab('likes'); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 p-[2px] shadow-lg shadow-red-600/30 group-hover:shadow-red-500/50 transition-all duration-300">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-6 h-6 text-red-500 fill-red-500/20 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-300 font-['Cinzel']">
                  {settings?.storeName || 'AKASH'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 border border-red-700/60 text-red-400 tracking-wider">
                  OFFICIAL
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-medium tracking-widest uppercase">
                Likes Store • Glory Bot
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800/60">
            <button
              onClick={() => setCurrentTab('likes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'likes'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
              }`}
            >
              <Flame className="w-4 h-4" />
              Likes Store
            </button>

            <button
              onClick={() => setCurrentTab('glory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'glory'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
              }`}
            >
              <Bot className="w-4 h-4" />
              Glory Bot
            </button>

            {user && (
              <button
                onClick={() => setCurrentTab('orders')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  currentTab === 'orders'
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                My Orders
              </button>
            )}

            <button
              onClick={() => setCurrentTab('support')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'support'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              Support
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  currentTab === 'admin'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Admin Panel
              </button>
            )}
          </nav>

          {/* Right Actions: Wallet & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                {/* Wallet Balance Pill */}
                <div 
                  onClick={onOpenWallet}
                  className="flex items-center gap-2 bg-gradient-to-r from-zinc-900 to-zinc-900/90 hover:from-zinc-850 hover:to-zinc-800 border border-zinc-700/80 px-2.5 sm:px-3.5 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm group"
                  title="Click to recharge or view ledger"
                >
                  <WalletIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-[10px] text-zinc-400 font-medium leading-none">Wallet</div>
                    <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono leading-tight">
                      ₹{wallet ? wallet.balance.toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onOpenWallet(); }}
                    className="ml-1 p-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Add</span>
                  </button>
                </div>

                {/* User Profile Badge & Logout */}
                <div className="hidden sm:flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-red-600/20 flex items-center justify-center text-red-400 text-xs font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-zinc-200 max-w-[90px] truncate">
                    {user.username}
                  </span>
                  {user.role === 'admin' && (
                    <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded font-black">
                      ADMIN
                    </span>
                  )}
                  <button
                    onClick={onLogout}
                    title="Sign Out"
                    className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-red-600/25 active:scale-95 transition-all"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-800 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => { setCurrentTab('likes'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${
              currentTab === 'likes' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-300'
            }`}
          >
            <Flame className="w-5 h-5" />
            Likes Store
          </button>
          <button
            onClick={() => { setCurrentTab('glory'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${
              currentTab === 'glory' ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-300'
            }`}
          >
            <Bot className="w-5 h-5" />
            Glory Bot
          </button>
          {user && (
            <>
              <button
                onClick={() => { setCurrentTab('orders'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${
                  currentTab === 'orders' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-300'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                My Orders
              </button>
              <button
                onClick={() => { setCurrentTab('support'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${
                  currentTab === 'support' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-300'
                }`}
              >
                <HelpCircle className="w-5 h-5 text-blue-400" />
                Contact Support
              </button>
              <button
                onClick={() => { onOpenWallet(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold bg-zinc-900 text-emerald-400 border border-emerald-900/40"
              >
                <span className="flex items-center gap-3">
                  <WalletIcon className="w-5 h-5" />
                  Wallet Balance: ₹{wallet?.balance.toFixed(2) || '0.00'}
                </span>
                <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded font-bold">Recharge</span>
              </button>
            </>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => { setCurrentTab('admin'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${
                currentTab === 'admin' ? 'bg-amber-500 text-zinc-950' : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              Admin Dashboard
            </button>
          )}
          {user && (
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-950/30 border border-red-900/40"
            >
              <LogOut className="w-4 h-4" />
              Sign Out ({user.username})
            </button>
          )}
        </div>
      )}
    </header>
  );
};
