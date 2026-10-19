import React, { useState } from 'react';
import { GloryPlan, User, Wallet, StoreSettings } from '../types.ts';
import { api } from '../services/api.ts';
import { Bot, Shield, Zap, Check, AlertCircle, ShoppingCart, Sparkles, Trophy, Users, ArrowRight, Wallet as WalletIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GloryBotProps {
  plans: GloryPlan[];
  user: User | null;
  wallet: Wallet | null;
  settings: StoreSettings | null;
  onRefreshWallet: () => void;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onViewOrders: () => void;
}

export const GloryBot: React.FC<GloryBotProps> = ({
  plans,
  user,
  wallet,
  settings,
  onRefreshWallet,
  onOpenAuth,
  onOpenWallet,
  onViewOrders,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<GloryPlan | null>(null);
  const [freeFireUid, setFreeFireUid] = useState('');
  const [guildId, setGuildId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!selectedPlan) {
      setError('Please select a Glory Bot boost package.');
      return;
    }

    const cleanUid = freeFireUid.trim();
    if (!cleanUid || cleanUid.length < 6 || cleanUid.length > 15) {
      setError('Please enter a valid Free Fire Leader or Member UID.');
      return;
    }

    const currentBalance = wallet ? wallet.balance : 0;
    if (currentBalance < selectedPlan.price) {
      setError(`Insufficient wallet balance. You have ₹${currentBalance.toFixed(2)}, required ₹${selectedPlan.price.toFixed(2)}. Please recharge your wallet.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.createGloryOrder({
        planId: selectedPlan.id,
        freeFireUid: cleanUid,
        guildId: guildId.trim() || undefined,
      });

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      setSuccessOrder(response.order);
      onRefreshWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to submit Glory Bot order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950/70 via-zinc-950 to-zinc-950 border border-indigo-900/40 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold tracking-wider uppercase mb-4">
            <Bot className="w-3.5 h-3.5" />
            Automated Guild Glory Engine
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-['Cinzel']">
            GLORY BOT SYSTEM
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
            Maximize your Free Fire Guild Tournament scores and unlock full Friday custom room cards. Dedicated bot farms ensure seamless glory progression with no manual grinding required.
          </p>

          {/* Badges */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-xl">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200">Guild Level Max</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-xl">
              <Users className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200">Friday Cards Unlocked</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-xl">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200">Safe Auto-Queue</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-xl">
              <Zap className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200">Express Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {settings?.gloryBotServiceNotice && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
          <Bot className="w-5 h-5 text-purple-400 shrink-0" />
          <span>{settings.gloryBotServiceNotice}</span>
        </div>
      )}

      {/* Guild Details Input Form */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <h2 className="text-sm font-bold text-zinc-200 mb-3">
          Step 1: Enter Guild and Player Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="glory-ff-uid-input" className="block text-xs text-zinc-400 font-semibold mb-1">
              Free Fire UID (Leader or Member) *
            </label>
            <input
              id="glory-ff-uid-input"
              type="text"
              value={freeFireUid}
              onChange={(e) => setFreeFireUid(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 192837465"
              maxLength={15}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-3 text-white placeholder-zinc-500 font-mono text-sm tracking-wider focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="glory-guild-id-input" className="block text-xs text-zinc-400 font-semibold mb-1">
              Guild ID (Optional if same as leader UID)
            </label>
            <input
              id="glory-guild-id-input"
              type="text"
              value={guildId}
              onChange={(e) => setGuildId(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 30192837"
              maxLength={15}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-3 text-white placeholder-zinc-500 font-mono text-sm tracking-wider focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Glory Packages Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Cinzel']">
              Step 2: Choose Glory Bot Package
            </h2>
            <p className="text-xs text-zinc-400">Database-backed prices in INR. Updated live.</p>
          </div>
          <span className="text-xs bg-zinc-800/80 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            {plans.length} Glory Packages
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => { setSelectedPlan(plan); setError(null); }}
                className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-300 border ${
                  isSelected
                    ? 'bg-gradient-to-b from-purple-950/60 to-zinc-900 border-purple-500 shadow-xl shadow-purple-600/10 scale-[1.02]'
                    : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-purple-400">
                      <Trophy className="w-5 h-5" />
                      <span className="text-2xl font-black text-white font-mono">
                        +{plan.gloryQuantity.toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-200 mt-1">{plan.name}</h3>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      ₹{plan.price}
                    </div>
                    <div className="text-[10px] text-zinc-400">Total INR</div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-zinc-400 min-h-[32px] line-clamp-2">
                  {plan.description || 'Continuous automated Glory boost for your Free Fire guild.'}
                </p>

                <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    Automated Queue
                  </span>

                  <button
                    type="button"
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky Action Drawer */}
      {selectedPlan && (
        <div className="sticky bottom-4 z-30 bg-zinc-900/95 backdrop-blur-md border border-purple-900/60 rounded-2xl p-4 sm:p-5 shadow-2xl">
          <form onSubmit={handleCheckout} className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-zinc-400">Glory Order Summary:</div>
                <div className="text-base font-bold text-white">
                  {selectedPlan.name} ({selectedPlan.gloryQuantity.toLocaleString()} Glory)
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  UID: <span className="text-purple-400 font-bold">{freeFireUid || 'Not entered yet'}</span>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
              <div className="text-left sm:text-right">
                <div className="text-xs text-zinc-400">Total Price:</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  ₹{selectedPlan.price.toFixed(2)}
                </div>
              </div>

              {!user ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-600/30 transition-all"
                >
                  Sign In to Purchase
                </button>
              ) : wallet && wallet.balance < selectedPlan.price ? (
                <button
                  type="button"
                  onClick={onOpenWallet}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-sm font-black shadow-lg shadow-amber-500/20 transition-all"
                >
                  <WalletIcon className="w-4 h-4" />
                  Recharge Wallet (Needs ₹{(selectedPlan.price - wallet.balance).toFixed(2)})
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-black shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    'Initiating Glory Bot...'
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Buy Glory Boost
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Success Modal */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-purple-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto">
              <Bot className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-white font-['Cinzel']">
              Glory Bot Activated!
            </h3>
            <p className="text-sm text-zinc-300">
              Your guild boost order has been submitted to the automated queue.
            </p>

            <div className="bg-zinc-950 rounded-2xl p-4 text-left space-y-2 border border-zinc-800 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Order ID:</span>
                <span className="font-mono font-bold text-purple-400">{successOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Guild/Member UID:</span>
                <span className="font-mono font-bold text-white">{successOrder.freeFireUid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Glory Package:</span>
                <span className="text-zinc-200 font-semibold">{successOrder.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-400">₹{successOrder.priceSnapshot.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span className="text-amber-400 font-bold uppercase">{successOrder.status}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSuccessOrder(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => { setSuccessOrder(null); onViewOrders(); }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Track in My Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
