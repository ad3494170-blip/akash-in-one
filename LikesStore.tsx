import React, { useState } from 'react';
import { Plan, User, Wallet, StoreSettings } from '../types.ts';
import { api } from '../services/api.ts';
import { Flame, Heart, Check, AlertCircle, ShoppingCart, Sparkles, Shield, Clock, Zap, ArrowRight, Wallet as WalletIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LikesStoreProps {
  plans: Plan[];
  user: User | null;
  wallet: Wallet | null;
  settings: StoreSettings | null;
  onRefreshWallet: () => void;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onViewOrders: () => void;
}

export const LikesStore: React.FC<LikesStoreProps> = ({
  plans,
  user,
  wallet,
  settings,
  onRefreshWallet,
  onOpenAuth,
  onOpenWallet,
  onViewOrders,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [freeFireUid, setFreeFireUid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setError(null);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!selectedPlan) {
      setError('Please select a likes package.');
      return;
    }

    const cleanUid = freeFireUid.trim();
    if (!cleanUid || cleanUid.length < 6 || cleanUid.length > 15) {
      setError('Please enter a valid Free Fire UID (typically 7 to 12 digits).');
      return;
    }

    const currentBalance = wallet ? wallet.balance : 0;
    if (currentBalance < selectedPlan.price) {
      setError(`Insufficient wallet balance. You have ₹${currentBalance.toFixed(2)}, but this plan costs ₹${selectedPlan.price.toFixed(2)}. Please recharge your wallet.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.createLikesOrder({
        planId: selectedPlan.id,
        freeFireUid: cleanUid,
      });

      // Celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore if canvas-confetti is not loaded
      }

      setSuccessOrder(response.order);
      onRefreshWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to place likes order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border border-zinc-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold tracking-wider uppercase mb-4">
            <Zap className="w-3.5 h-3.5 fill-red-400" />
            Fastest Delivery in India
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-['Cinzel']">
            FREE FIRE LIKES BOOST
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
            Boost your profile reputation with authentic Free Fire likes. Instant queue processing, 100% anti-ban security, and automated server-side delivery.
          </p>

          {/* Trust Badges */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-xl">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200">100% Safe UID</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200">5-15 Mins Speed</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-xl">
              <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200">Real High Rank</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-xl">
              <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200">Cheapest INR Rates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {settings?.likesServiceNotice && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
          <Zap className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{settings.likesServiceNotice}</span>
        </div>
      )}

      {/* Free Fire UID Input Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <label htmlFor="ff-uid-input" className="block text-sm font-bold text-zinc-200 mb-2">
          Step 1: Enter your Free Fire UID
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="ff-uid-input"
              type="text"
              value={freeFireUid}
              onChange={(e) => setFreeFireUid(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1234567890"
              maxLength={15}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-3 text-white placeholder-zinc-500 font-mono text-base tracking-wider focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) setFreeFireUid(text.trim().replace(/\D/g, ''));
              } catch {
                // Clipboard permission fallback
              }
            }}
            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs sm:text-sm font-semibold border border-zinc-700 transition-colors"
          >
            Paste UID
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
          Where to find: Open Free Fire &gt; Click Profile Banner &gt; Copy your 8-10 digit Player ID.
        </p>
      </div>

      {/* Plans Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Cinzel']">
              Step 2: Choose Likes Package
            </h2>
            <p className="text-xs text-zinc-400">Database-backed prices in INR. Updated live.</p>
          </div>
          <span className="text-xs bg-zinc-800/80 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            {plans.length} Packages Available
          </span>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-zinc-800">
            <Flame className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No active likes packages found at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {plans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              const isBestSeller = plan.likesQuantity >= 1000 && plan.likesQuantity <= 2500;

              return (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-300 border ${
                    isSelected
                      ? 'bg-gradient-to-b from-red-950/60 to-zinc-900 border-red-500 shadow-xl shadow-red-600/10 scale-[1.02]'
                      : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {isBestSeller && (
                    <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-rose-500 text-zinc-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                      Popular
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-red-500">
                        <Heart className="w-5 h-5 fill-red-500" />
                        <span className="text-2xl font-black text-white font-mono">
                          +{plan.likesQuantity.toLocaleString()}
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
                    {plan.description || 'Fast Free Fire delivery directly to your profile.'}
                  </p>

                  <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      In Stock
                    </span>

                    <button
                      type="button"
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
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
        )}
      </div>

      {/* Bottom Sticky / Checkout Drawer */}
      {selectedPlan && (
        <div className="sticky bottom-4 z-30 bg-zinc-900/95 backdrop-blur-md border border-red-900/60 rounded-2xl p-4 sm:p-5 shadow-2xl">
          <form onSubmit={handleCheckout} className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-400">Order Summary:</div>
                <div className="text-base font-bold text-white">
                  {selectedPlan.name} ({selectedPlan.likesQuantity.toLocaleString()} Likes)
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  Target UID: <span className="text-red-400 font-bold">{freeFireUid || 'Not entered yet'}</span>
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
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/30 transition-all"
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
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-sm font-black shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    'Processing Order...'
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Buy Now with Wallet
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
          <div className="bg-zinc-900 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h3 className="text-2xl font-black text-white font-['Cinzel']">
              Order Placed Successfully!
            </h3>
            <p className="text-sm text-zinc-300">
              Your Free Fire Likes boost request has been registered in the system.
            </p>

            <div className="bg-zinc-950 rounded-2xl p-4 text-left space-y-2 border border-zinc-800 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Order ID:</span>
                <span className="font-mono font-bold text-red-400">{successOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Target UID:</span>
                <span className="font-mono font-bold text-white">{successOrder.freeFireUid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Package:</span>
                <span className="text-zinc-200 font-semibold">{successOrder.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Amount Deducted:</span>
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
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
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
