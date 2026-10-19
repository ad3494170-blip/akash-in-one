import React, { useState, useEffect } from 'react';
import { Wallet, WalletTransaction, StoreSettings } from '../types.ts';
import { api } from '../services/api.ts';
import {
  X,
  Wallet as WalletIcon,
  QrCode,
  ArrowUpRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  History,
  Clock,
  ShieldCheck,
  ExternalLink,
  Copy,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WalletModalProps {
  wallet: Wallet | null;
  settings: StoreSettings | null;
  onClose: () => void;
  onWalletUpdated: () => void;
  onOpenSupport?: (orderRef?: string, category?: any) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  wallet,
  settings,
  onClose,
  onWalletUpdated,
  onOpenSupport,
}) => {
  const [activeTab, setActiveTab] = useState<'recharge' | 'history'>('recharge');
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Payment Session
  const [paymentSession, setPaymentSession] = useState<{
    paymentId: string;
    providerOrderId: string;
    amount: number;
    qrUrl: string;
    upiIntent?: string;
    paymentUrl?: string;
    merchantName?: string;
    merchantUpi?: string;
    expiresAt: string;
  } | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number>(600); // in seconds
  const [qrImageError, setQrImageError] = useState(false);

  // Ledger history
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch transactions when history tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      setLoadingHistory(true);
      api.getTransactions()
        .then(setTransactions)
        .catch(console.error)
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab]);

  // Countdown timer for payment session
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (paymentSession && countdown > 0 && !paymentSuccess) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paymentSession, countdown, paymentSuccess]);

  // Auto-polling status checker every 6 seconds while session is active and not expired
  useEffect(() => {
    let poller: NodeJS.Timeout;
    if (paymentSession && !paymentSuccess && countdown > 0) {
      poller = setInterval(async () => {
        try {
          const res = await api.verifyPayment({
            paymentId: paymentSession.paymentId,
            providerOrderId: paymentSession.providerOrderId,
          });
          if (res.status === 'SUCCESS') {
            setPaymentSuccess(true);
            setVerifyMessage('Payment verified successfully! Your wallet has been credited.');
            try {
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
            } catch {}
            onWalletUpdated();
          }
        } catch {
          // silent in background poll
        }
      }, 6000);
    }
    return () => clearInterval(poller);
  }, [paymentSession, paymentSuccess, countdown, onWalletUpdated]);

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmount(String(val));
    setError(null);
  };

  const handleCustomChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setCustomAmount(clean);
    setAmount(clean ? parseInt(clean, 10) : 0);
    setError(null);
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please select or enter a valid amount.');
      return;
    }

    const min = settings?.minDepositINR || 10;
    const max = settings?.maxDepositINR || 20000;
    if (amount < min) {
      setError(`Minimum deposit is ₹${min}.`);
      return;
    }
    if (amount > max) {
      setError(`Maximum deposit is ₹${max}.`);
      return;
    }

    setLoading(true);
    setError(null);
    setVerifyMessage(null);
    setQrImageError(false);

    try {
      const res = await api.createPaymentIntent(amount);
      if (!res.qrUrl && !res.upiIntent && !res.paymentUrl) {
        throw new Error('Payment provider did not return valid QR payment instructions. Please retry.');
      }
      setPaymentSession({
        paymentId: res.paymentId,
        providerOrderId: res.providerOrderId,
        amount: res.amount,
        qrUrl: res.qrUrl,
        upiIntent: res.upiIntent,
        paymentUrl: res.paymentUrl,
        merchantName: res.merchantName,
        merchantUpi: res.merchantUpi,
        expiresAt: res.expiresAt,
      });
      setCountdown(res.expiresIn || 600);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment with FamGateway');
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    if (!paymentSession) return;
    if (countdown <= 0) {
      setError('Payment order has expired. Please initiate a new deposit.');
      return;
    }

    setVerifying(true);
    setVerifyMessage(null);
    setError(null);

    try {
      const res = await api.verifyPayment({
        paymentId: paymentSession.paymentId,
        providerOrderId: paymentSession.providerOrderId,
      });
      if (res.status === 'SUCCESS') {
        setPaymentSuccess(true);
        setVerifyMessage(res.message || 'Payment confirmed! Wallet credited.');
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
        onWalletUpdated();
      } else if (res.status === 'EXPIRED') {
        setError('Payment session has expired. If money was deducted, contact support with reference ID.');
        setCountdown(0);
      } else if (res.status === 'FAILED') {
        setError('Payment was marked as failed or rejected by payment provider.');
      } else {
        setVerifyMessage(res.message || 'Payment is still awaiting confirmation from your UPI app. Complete the transaction in your UPI app and click verify again.');
      }
    } catch (err: any) {
      setError(err.message || 'Status check failed.');
    } finally {
      setVerifying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <WalletIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Cinzel']">
                AKASH WALLET
              </h2>
              <div className="text-xs text-zinc-400">
                Current Balance:{' '}
                <span className="font-mono font-bold text-emerald-400">
                  ₹{wallet ? wallet.balance.toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSupport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSupport(paymentSession?.providerOrderId || paymentSession?.paymentId, 'Wallet Balance');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Contact</span> Support
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('recharge')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'recharge'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            Add Funds (UPI)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-4 h-4 text-zinc-400" />
            Ledger History
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'recharge' && (
            <>
              {!paymentSession ? (
                <form onSubmit={handleInitiatePayment} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">
                      Select Amount (INR)
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[50, 100, 250, 500, 1000, 2000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`py-3 rounded-xl font-mono text-sm font-bold transition-all border ${
                            amount === preset
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm'
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          ₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="custom-amount-input" className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">
                      Or Enter Custom Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold font-mono text-lg">
                        ₹
                      </span>
                      <input
                        id="custom-amount-input"
                        type="text"
                        value={customAmount}
                        onChange={(e) => handleCustomChange(e.target.value)}
                        placeholder="100"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400 flex justify-between">
                      <span>Min: ₹{settings?.minDepositINR || 10}</span>
                      <span>Max: ₹{settings?.maxDepositINR || 20000}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800/80 space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      FamGateway 24/7 Automated UPI Verification
                    </div>
                    <p className="text-[11px]">
                      Instant wallet top-up via GPay, PhonePe, Paytm, BHIM, or any UPI banking app. Verified directly by server.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || amount <= 0}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Payment QR...
                      </>
                    ) : (
                      <>
                        Proceed to Pay ₹{amount || 0}
                        <ArrowUpRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Active Payment Screen with Real Provider QR Code and UPI Intent */
                <div className="space-y-4 text-center">
                  {paymentSuccess ? (
                    <div className="py-6 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-white font-['Cinzel']">
                        Payment Successful!
                      </h3>
                      <p className="text-sm text-zinc-300">
                        ₹{paymentSession.amount.toFixed(2)} has been added to your AKASH wallet.
                      </p>
                      <button
                        onClick={() => {
                          setPaymentSession(null);
                          setPaymentSuccess(false);
                        }}
                        className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        Add More Funds
                      </button>
                    </div>
                  ) : countdown <= 0 ? (
                    /* Expired Order View */
                    <div className="py-8 space-y-4 text-center">
                      <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
                        <Clock className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-black text-white font-['Cinzel']">
                        Order Reference Expired
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                        This payment session has timed out. To protect your funds and ensure accurate automated crediting, please start a fresh deposit order.
                      </p>
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400">
                        Order Ref: {paymentSession.providerOrderId}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <button
                          onClick={() => {
                            setPaymentSession(null);
                            setError(null);
                          }}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                        >
                          Start New Deposit
                        </button>
                        {onOpenSupport && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenSupport(paymentSession.providerOrderId, 'Payment/QR Problem');
                            }}
                            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-blue-300 text-xs font-bold rounded-xl border border-blue-900/40 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                            Contact Support with this Order
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Real Order details banner */}
                      <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 text-xs space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Payable Amount:</span>
                          <span className="font-mono font-black text-emerald-400 text-base">
                            ₹{paymentSession.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Merchant:</span>
                          <span className="font-semibold text-zinc-200">
                            {paymentSession.merchantName || settings?.storeName || 'AKASH Store'}
                          </span>
                        </div>
                        {paymentSession.merchantUpi && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Merchant UPI:</span>
                            <span className="font-mono text-zinc-300">
                              {paymentSession.merchantUpi}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">FamGateway Order ID:</span>
                          <span className="font-mono font-bold text-amber-400">
                            {paymentSession.providerOrderId}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                          <span className="text-zinc-400">Internal Ref:</span>
                          <span className="font-mono text-zinc-400 text-[11px]">
                            {paymentSession.paymentId}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                          <span className="text-zinc-400">Session Expiry:</span>
                          <span className={`font-mono font-bold flex items-center gap-1 ${countdown < 120 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(countdown)}
                          </span>
                        </div>
                      </div>

                      {/* Real Provider QR Display */}
                      {paymentSession.qrUrl ? (
                        <div className="bg-white p-3.5 rounded-2xl inline-block shadow-xl mx-auto border-4 border-zinc-700">
                          <img
                            src={paymentSession.qrUrl}
                            alt={`UPI Payment QR for ${paymentSession.providerOrderId}`}
                            className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto"
                            onError={() => {
                              setQrImageError(true);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-red-950/40 border border-red-800 rounded-2xl text-xs text-red-300">
                          Payment provider did not return valid QR image data. Please use direct UPI intent below or retry.
                        </div>
                      )}

                      {qrImageError && (
                        <div className="p-2.5 bg-amber-950/50 border border-amber-800 rounded-xl text-[11px] text-amber-300">
                          Unable to render QR image from provider. Please click the button below to pay directly with your UPI app.
                        </div>
                      )}

                      <div className="text-xs font-semibold text-zinc-300">
                        Scan QR with Google Pay, PhonePe, Paytm, BHIM, or any UPI App
                      </div>

                      {/* Direct UPI Intent Button for Mobile Devices */}
                      {paymentSession.upiIntent && (
                        <a
                          href={paymentSession.upiIntent}
                          className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Pay Directly with UPI App (Mobile)
                        </a>
                      )}

                      {/* Official Provider Payment URL Link if available */}
                      {paymentSession.paymentUrl && (
                        <a
                          href={paymentSession.paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open FamGateway Hosted Payment Page
                        </a>
                      )}

                      {/* Authoritative Verification Button */}
                      <button
                        onClick={handleManualVerify}
                        disabled={verifying || countdown <= 0}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {verifying ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Querying FamGateway Authoritative Status...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            I Have Paid — Verify My Payment
                          </>
                        )}
                      </button>

                      {verifyMessage && (
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300">
                          {verifyMessage}
                        </div>
                      )}

                      {error && (
                        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2 text-left">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Payment Page: Clearly visible Contact Support */}
                      {onOpenSupport && (
                        <div className="p-3 bg-zinc-950/90 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                          <div className="text-xs text-zinc-400">
                            Payment or QR issue with order <span className="font-mono text-white font-bold">{paymentSession.providerOrderId}</span>?
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenSupport(paymentSession.providerOrderId, 'Payment/QR Problem');
                            }}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            Contact Support
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setPaymentSession(null);
                          setError(null);
                          setVerifyMessage(null);
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        Cancel this payment session
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Tab 2: Ledger History */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="text-center py-10 text-zinc-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-500" />
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs bg-zinc-950 rounded-2xl border border-zinc-800/80">
                  No wallet transactions recorded yet.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-sm ${
                            tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {tx.amount > 0 ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {tx.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-300 mt-1 line-clamp-1">
                        {tx.reason || tx.referenceId}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400">Balance:</div>
                      <div className="font-mono font-bold text-zinc-200">
                        ₹{tx.balanceAfter.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {onOpenSupport && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSupport(undefined, 'Wallet Balance');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Question about your wallet ledger or balance? Contact Support
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
