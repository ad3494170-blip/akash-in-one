import React, { useState, useEffect, useCallback } from 'react';
import { User, Wallet, StoreSettings, Plan, GloryPlan, BroadcastNotification } from './types.ts';
import { api, authStorage } from './services/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { BroadcastBanner } from './components/BroadcastBanner.tsx';
import { LikesStore } from './components/LikesStore.tsx';
import { GloryBot } from './components/GloryBot.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { WalletModal } from './components/WalletModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import {
  Flame,
  Bot,
  ShoppingBag,
  Wallet as WalletIcon,
  Shield,
  MessageCircle,
  Send,
  Zap,
  RefreshCw,
  Heart
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'likes' | 'glory' | 'orders' | 'admin' | 'transactions'>('likes');
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gloryPlans, setGloryPlans] = useState<GloryPlan[]>([]);
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Re-fetch all authoritative data from server database
  const refreshAll = useCallback(async () => {
    try {
      const [fetchedSettings, fetchedPlans, fetchedGloryPlans, fetchedNotifs] = await Promise.all([
        api.getSettings(),
        api.getPlans(),
        api.getGloryPlans(),
        api.getNotifications(),
      ]);

      setSettings(fetchedSettings);
      setPlans(fetchedPlans);
      setGloryPlans(fetchedGloryPlans);
      setNotifications(fetchedNotifs);

      // If user has token, revalidate profile & wallet
      if (authStorage.getToken()) {
        try {
          const me = await api.getMe();
          setUser(me.user);
          setWallet(me.wallet);
        } catch {
          // Token expired or invalid
          authStorage.clearToken();
          setUser(null);
          setWallet(null);
        }
      }
    } catch (err) {
      console.error('[AKASH] Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshWalletOnly = async () => {
    if (!user) return;
    try {
      const w = await api.getWallet();
      setWallet(w);
    } catch (err) {
      console.error('[AKASH] Wallet refresh failed:', err);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleLogout = () => {
    authStorage.clearToken();
    setUser(null);
    setWallet(null);
    if (currentTab === 'admin' || currentTab === 'orders') {
      setCurrentTab('likes');
    }
  };

  const handleAuthSuccess = (authenticatedUser: User, initialWallet: Wallet) => {
    setUser(authenticatedUser);
    setWallet(initialWallet);
    setAuthModalOpen(false);
    refreshAll();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 p-[2px] animate-pulse">
          <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
            <Flame className="w-8 h-8 text-red-500 animate-bounce" />
          </div>
        </div>
        <div className="text-xl font-black font-['Cinzel'] tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400">
          AKASH
        </div>
        <p className="text-xs text-zinc-400 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
          Loading authoritative database & live plans...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-['Outfit'] selection:bg-red-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        wallet={wallet}
        settings={settings}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenWallet={() => {
          if (!user) setAuthModalOpen(true);
          else setWalletModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Broadcast Announcements */}
      <BroadcastBanner notifications={notifications} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 md:pb-12">
        {currentTab === 'likes' && (
          <LikesStore
            plans={plans}
            user={user}
            wallet={wallet}
            settings={settings}
            onRefreshWallet={refreshWalletOnly}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenWallet={() => {
              if (!user) setAuthModalOpen(true);
              else setWalletModalOpen(true);
            }}
            onViewOrders={() => setCurrentTab('orders')}
          />
        )}

        {currentTab === 'glory' && (
          <GloryBot
            plans={gloryPlans}
            user={user}
            wallet={wallet}
            settings={settings}
            onRefreshWallet={refreshWalletOnly}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenWallet={() => {
              if (!user) setAuthModalOpen(true);
              else setWalletModalOpen(true);
            }}
            onViewOrders={() => setCurrentTab('orders')}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersView />
        )}

        {currentTab === 'admin' && user?.role === 'admin' && (
          <AdminDashboard onSettingsUpdated={refreshAll} />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setCurrentTab('likes')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
            currentTab === 'likes' ? 'text-red-500' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Flame className="w-5 h-5" />
          <span>Likes Store</span>
        </button>

        <button
          onClick={() => setCurrentTab('glory')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
            currentTab === 'glory' ? 'text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bot className="w-5 h-5" />
          <span>Glory Bot</span>
        </button>

        <button
          onClick={() => {
            if (!user) setAuthModalOpen(true);
            else setWalletModalOpen(true);
          }}
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-emerald-400"
        >
          <WalletIcon className="w-5 h-5" />
          <span>₹{wallet ? wallet.balance.toFixed(0) : '0'}</span>
        </button>

        {user && (
          <button
            onClick={() => setCurrentTab('orders')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
              currentTab === 'orders' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Orders</span>
          </button>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-10 px-4 sm:px-6 lg:px-8 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-white text-sm font-['Cinzel'] tracking-wider">
                {settings?.storeName || 'AKASH'}
              </span>
              <p className="text-[11px] text-zinc-500">
                Premium Free Fire Profile Likes & Automated Glory Bot Service
              </p>
            </div>
          </div>

          {/* Contacts */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {settings?.supportTelegram && (
              <a
                href={`https://t.me/${settings.supportTelegram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-zinc-300 hover:text-blue-400 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-blue-400" />
                Telegram Support
              </a>
            )}
            {settings?.supportWhatsapp && (
              <a
                href={`https://wa.me/${settings.supportWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-zinc-300 hover:text-emerald-400 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp Support
              </a>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 text-center md:text-right">
            <div>DB Config: v{settings?.version || 1} • 100% Anti-Ban Guarantee</div>
            <div className="mt-0.5">© {new Date().getFullYear()} AKASH. All Rights Reserved.</div>
          </div>
        </div>
      </footer>

      {/* Wallet Modal */}
      {walletModalOpen && (
        <WalletModal
          wallet={wallet}
          settings={settings}
          onClose={() => setWalletModalOpen(false)}
          onWalletUpdated={() => {
            refreshWalletOnly();
          }}
        />
      )}

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
