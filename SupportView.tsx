import React, { useState, useEffect } from 'react';
import { User, StoreSettings, SupportTicket, TicketCategory, TicketStatus } from '../types.ts';
import { api } from '../services/api.ts';
import {
  HelpCircle,
  MessageCircle,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  MessageSquare,
  Sparkles,
  User as UserIcon,
  Search,
  Check,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SupportViewProps {
  user: User | null;
  settings: StoreSettings | null;
  initialOrderRef?: string;
  initialCategory?: TicketCategory;
  onOpenAuth: () => void;
  onViewOrders?: () => void;
}

const CATEGORIES: TicketCategory[] = [
  'Payment/QR Problem',
  'Payment Verification',
  'Wallet Balance',
  'Order Problem',
  'Likes Store',
  'Glory Bot',
  'Other'
];

export const SupportView: React.FC<SupportViewProps> = ({
  user,
  settings,
  initialOrderRef = '',
  initialCategory = 'Payment/QR Problem',
  onOpenAuth,
  onViewOrders,
}) => {
  // Form State
  const [customerName, setCustomerName] = useState(user?.username || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [orderReference, setOrderReference] = useState(initialOrderRef);
  const [category, setCategory] = useState<TicketCategory>(initialCategory);
  const [description, setDescription] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);

  // Tickets History State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Update inputs if user logs in or initial props change
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.username);
      if (!customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (initialOrderRef) {
      setOrderReference(initialOrderRef);
    }
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialOrderRef, initialCategory]);

  // Fetch user tickets
  const fetchTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const res = await api.getSupportTickets();
      setTickets(res);
    } catch (err) {
      console.error('[SUPPORT] Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = customerName.trim();
    if (!cleanName) {
      setFormError('Please enter your full name.');
      return;
    }

    const cleanEmail = customerEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setFormError('Please enter a valid email address so we can reach you.');
      return;
    }

    const cleanDesc = description.trim();
    if (!cleanDesc || cleanDesc.length < 10) {
      setFormError('Please provide a detailed explanation of your issue (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createSupportTicket({
        customerName: cleanName,
        customerEmail: cleanEmail,
        orderReference: orderReference.trim() || undefined,
        category,
        description: cleanDesc,
      });

      setSubmittedTicket(res.ticket);
      setDescription('');
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // confetti fallback
      }

      // Add to ticket list locally and refetch
      setTickets((prev) => [res.ticket, ...prev]);
      if (user) {
        fetchTickets();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            In Progress
          </span>
        );
      case 'waiting_for_customer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
            <Clock className="w-3.5 h-3.5" />
            Waiting for Info
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-400">
            Closed
          </span>
        );
      case 'open':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            Open (Under Review)
          </span>
        );
    }
  };

  // Configured contact methods
  const hasWhatsapp = Boolean(settings?.supportWhatsappNumber && settings.supportWhatsappNumber.trim());
  const whatsappUrl = hasWhatsapp ? `https://wa.me/${settings!.supportWhatsappNumber!.trim()}` : '';

  const hasEmail = Boolean(settings?.supportEmail && settings.supportEmail.trim());
  const emailUrl = hasEmail ? `mailto:${settings!.supportEmail!.trim()}?subject=AKASH%20Store%20Customer%20Support` : '';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border border-zinc-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold tracking-wider uppercase mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            Customer Helpdesk
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white font-['Cinzel'] tracking-wide">
            CONTACT SUPPORT
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400">
            Have a question about Free Fire Likes delivery, Glory Bot boost, UPI QR payment, or wallet balance?
            Our support team provides fast, authoritative assistance.
          </p>

          {/* Direct channels (if configured) */}
          {(hasWhatsapp || hasEmail) && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {hasWhatsapp && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  Chat on WhatsApp
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              )}

              {hasEmail && (
                <a
                  href={emailUrl}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                  Email Support ({settings?.supportEmail})
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher: Create Ticket vs View My Tickets */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Submit New Ticket
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              if (user) fetchTickets();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            My Tickets {tickets.length > 0 && `(${tickets.length})`}
          </button>
        </div>

        {user && activeTab === 'history' && (
          <button
            onClick={fetchTickets}
            disabled={loadingTickets}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl transition-colors"
            title="Refresh Tickets"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTickets ? 'animate-spin text-red-500' : ''}`} />
          </button>
        )}
      </div>

      {/* TAB 1: SUBMIT NEW TICKET */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-red-500" />
                Submit a Support Ticket
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Fill in the details below. Our team reviews all tickets in real-time and logs official responses in your account.
              </p>
            </div>

            {/* Success Banner if just submitted */}
            {submittedTicket && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Ticket Created Successfully!
                </div>
                <p className="text-xs text-emerald-200/90">
                  Your ticket ID is <strong className="font-mono text-white bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">{submittedTicket.id}</strong>.
                  You can track admin replies in the "My Tickets" tab.
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-bold text-emerald-300 underline hover:text-emerald-100 flex items-center gap-1"
                  >
                    View your ticket status <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Form Error */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>

                {/* Registered Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Registered Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. yourname@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Issue Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${
                        category === cat
                          ? 'bg-red-600/20 border-red-500 text-white shadow-sm'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Reference */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Order Reference / Payment ID
                  </label>
                  <span className="text-[11px] text-zinc-500">Optional for general queries</span>
                </div>
                <input
                  type="text"
                  value={orderReference}
                  onChange={(e) => setOrderReference(e.target.value)}
                  placeholder="e.g. AKZ-123456-ABC, ORD-..., or UPI UTR"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* Problem Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Problem Description <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">Min 10 characters</span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what happened in detail. Include your Free Fire UID, exact amount paid, UPI reference/UTR if any, or any error messages received."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors leading-relaxed"
                />
              </div>

              {/* Privacy / Security Notice */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Never share account passwords or UPI MPIN in support tickets. Our team will never ask for your confidential banking credentials.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Submitting Ticket to Database...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Support Ticket</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Side Info & FAQ (1 col) */}
          <div className="space-y-6">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Common Resolution Tips
              </h3>

              <div className="space-y-3 text-xs text-zinc-300">
                <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1">
                  <div className="font-bold text-amber-300">UPI Payment Not Credited?</div>
                  <p className="text-zinc-400 text-[11px]">
                    UPI transactions can take 1-3 minutes for server sync. In the Wallet modal, click <strong>"I Have Paid — Verify My Payment"</strong> to force an authoritative check with FamGateway.
                  </p>
                </div>

                <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1">
                  <div className="font-bold text-red-300">Likes Delivery Time</div>
                  <p className="text-zinc-400 text-[11px]">
                    Likes orders are queued immediately and usually complete in 5–15 minutes. Check the <strong>My Orders</strong> page for real-time status updates.
                  </p>
                </div>

                <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1">
                  <div className="font-bold text-purple-300">Glory Bot Activation</div>
                  <p className="text-zinc-400 text-[11px]">
                    Guild Glory orders start automatically upon order placement. Ensure your Guild ID is accurate for automated room matching.
                  </p>
                </div>
              </div>
            </div>

            {/* Account Link Banner if not logged in */}
            {!user && (
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-red-900/30 rounded-3xl p-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center mx-auto">
                  <UserIcon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Have an AKASH Account?</h4>
                <p className="text-xs text-zinc-400">
                  Sign in before creating tickets to automatically view your ticket history and receive real-time admin replies in your dashboard.
                </p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold border border-zinc-700 transition-colors"
                >
                  Sign In / Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY TICKETS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {!user ? (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <UserIcon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Sign In to View Your Tickets</h3>
              <p className="text-xs text-zinc-400">
                To view your ticket history, track resolution status, and see replies from administrators, please sign in to your registered account.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all"
              >
                Sign In Now
              </button>
            </div>
          ) : loadingTickets ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-red-500 mx-auto" />
              <p className="text-xs text-zinc-400">Loading your support tickets from database...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="font-bold text-white text-base">No Support Tickets Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                You haven't submitted any support requests. If you run into any issues with orders or payments, feel free to open a ticket!
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Create Your First Ticket
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg hover:border-zinc-700/80 transition-colors"
                >
                  {/* Top Bar: Ticket ID, Date, Category, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs sm:text-sm text-red-400 bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-800/40">
                        {t.id}
                      </span>
                      <button
                        onClick={() => handleCopy(t.id, t.id)}
                        className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="Copy Ticket ID"
                      >
                        {copiedId === t.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-xs text-zinc-500">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {t.category}
                      </span>
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  {/* Order Reference if present */}
                  {t.orderReference && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">Associated Reference:</span>
                      <span className="font-mono font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        {t.orderReference}
                      </span>
                    </div>
                  )}

                  {/* Customer Problem Description */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Issue Description:
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/60 leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  {/* Admin Reply Card (Requirement 6 & 7) */}
                  {t.adminReply ? (
                    <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-red-950/40 to-zinc-900 border border-red-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-red-600/30 flex items-center justify-center text-red-400 text-xs font-black">
                            A
                          </div>
                          <span className="text-xs font-bold text-red-300">
                            AKASH Official Support Reply
                          </span>
                          {t.adminRepliedBy && (
                            <span className="text-[10px] text-zinc-500 hidden sm:inline">
                              by {t.adminRepliedBy}
                            </span>
                          )}
                        </div>
                        {t.adminReplyAt && (
                          <span className="text-[10px] text-zinc-400">
                            {new Date(t.adminReplyAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed pl-7">
                        {t.adminReply}
                      </p>

                      {t.status === 'resolved' && (
                        <div className="pt-2 pl-7 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Marked as resolved by administrator.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex items-center gap-2 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Our support team has received your ticket and is preparing a response.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
