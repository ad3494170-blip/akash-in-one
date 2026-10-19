import React, { useState, useEffect } from 'react';
import {
  Plan,
  GloryPlan,
  StoreSettings,
  Order,
  PaymentRecord,
  User,
  Wallet,
  AdminAuditLog,
  IntegrationError,
  BroadcastNotification,
  OrderStatus,
  SupportTicket,
  TicketCategory,
  TicketStatus
} from '../types.ts';
import { api } from '../services/api.ts';
import {
  ShieldAlert,
  Settings,
  Flame,
  Bot,
  ShoppingBag,
  CreditCard,
  Users,
  FileText,
  AlertOctagon,
  Bell,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Send,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface AdminDashboardProps {
  onSettingsUpdated: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSettingsUpdated }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'likes_plans' | 'glory_plans' | 'orders' | 'payments' | 'users' | 'support' | 'settings' | 'audit' | 'errors' | 'broadcasts'
  >('overview');

  // Overview Data
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Likes Plans
  const [likesPlans, setLikesPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

  // Glory Plans
  const [gloryPlans, setGloryPlans] = useState<GloryPlan[]>([]);
  const [editingGloryPlan, setEditingGloryPlan] = useState<Partial<GloryPlan> | null>(null);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFulfillment, setOrderFulfillment] = useState<{
    orderId: string;
    status: OrderStatus;
    completionMessage: string;
    notes: string;
  } | null>(null);

  // Payments
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [reconcilingPayment, setReconcilingPayment] = useState<{ id: string; reason: string; utr: string } | null>(null);

  // Users & Wallets
  const [usersList, setUsersList] = useState<(User & { wallet: Wallet })[]>([]);
  const [walletAdjustment, setWalletAdjustment] = useState<{ userId: string; amount: string; reason: string } | null>(null);

  // Store Settings
  const [settingsData, setSettingsData] = useState<StoreSettings | null>(null);
  const [resetConfirmation, setResetConfirmation] = useState('');

  // Audit Logs & Errors
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [errorsList, setErrorsList] = useState<IntegrationError[]>([]);

  // Broadcasts
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([]);
  const [newBroadcast, setNewBroadcast] = useState<{ title: string; message: string; type: string }>({
    title: '',
    message: '',
    type: 'info',
  });

  // Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportStatusFilter, setSupportStatusFilter] = useState<string>('all');
  const [supportCategoryFilter, setSupportCategoryFilter] = useState<string>('all');
  const [replyingTicket, setReplyingTicket] = useState<{
    id: string;
    customerName: string;
    customerEmail: string;
    category: string;
    description: string;
    orderReference?: string;
    adminReply: string;
    status: TicketStatus;
  } | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Fetch data based on active tab
  const refreshCurrentTab = () => {
    setLoading(true);
    if (activeTab === 'overview') {
      api.getAdminOverview()
        .then(setOverview)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'likes_plans') {
      api.getAdminPlans()
        .then(setLikesPlans)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'glory_plans') {
      api.getAdminGloryPlans()
        .then(setGloryPlans)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'orders') {
      api.getAdminOrders()
        .then(setOrders)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'payments') {
      api.getAdminPayments()
        .then(setPayments)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'users') {
      api.getAdminUsers()
        .then(setUsersList)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'support') {
      api.getAdminSupportTickets()
        .then(setSupportTickets)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'settings') {
      api.getAdminSettings()
        .then(setSettingsData)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'audit') {
      api.getAdminAuditLogs()
        .then(setAuditLogs)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'errors') {
      api.getAdminErrors()
        .then(setErrorsList)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'broadcasts') {
      api.getNotifications()
        .then(setBroadcasts)
        .catch((e) => showFeedback('error', e.message))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    refreshCurrentTab();
  }, [activeTab]);

  // --- Handlers: Support Tickets ---
  const handleAdminTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTicket || !replyingTicket.adminReply.trim()) {
      showFeedback('error', 'Reply message is required.');
      return;
    }
    setReplySubmitting(true);
    try {
      await api.replyAdminSupportTicket(replyingTicket.id, {
        adminReply: replyingTicket.adminReply.trim(),
        status: replyingTicket.status,
      });
      showFeedback('success', `Reply sent and ticket ${replyingTicket.id} updated!`);
      setReplyingTicket(null);
      refreshCurrentTab();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleQuickTicketStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      await api.updateAdminSupportTicketStatus(ticketId, status);
      showFeedback('success', `Ticket ${ticketId} status changed to ${status}.`);
      refreshCurrentTab();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers: Likes Plans ---
  const handleSaveLikesPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !editingPlan.name || !editingPlan.likesQuantity || editingPlan.price === undefined) {
      showFeedback('error', 'Name, quantity, and price are required.');
      return;
    }

    try {
      if (editingPlan.id) {
        await api.updatePlan(editingPlan.id, editingPlan);
        showFeedback('success', `Plan "${editingPlan.name}" updated and verified in database!`);
      } else {
        await api.createPlan(editingPlan);
        showFeedback('success', 'New Likes plan created and stored in database!');
      }
      setEditingPlan(null);
      refreshCurrentTab();
      onSettingsUpdated();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteLikesPlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan? If orders exist, it cannot be deleted.')) return;
    try {
      await api.deletePlan(id);
      showFeedback('success', 'Plan deleted successfully.');
      refreshCurrentTab();
      onSettingsUpdated();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers: Glory Plans ---
  const handleSaveGloryPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGloryPlan || !editingGloryPlan.name || !editingGloryPlan.gloryQuantity || editingGloryPlan.price === undefined) {
      showFeedback('error', 'Name, quantity, and price are required.');
      return;
    }

    try {
      if (editingGloryPlan.id) {
        await api.updateGloryPlan(editingGloryPlan.id, editingGloryPlan);
        showFeedback('success', `Glory Plan "${editingGloryPlan.name}" updated and verified in database!`);
      } else {
        await api.createGloryPlan(editingGloryPlan);
        showFeedback('success', 'New Glory Bot plan created and stored in database!');
      }
      setEditingGloryPlan(null);
      refreshCurrentTab();
      onSettingsUpdated();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteGloryPlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Glory Bot plan?')) return;
    try {
      await api.deleteGloryPlan(id);
      showFeedback('success', 'Glory plan deleted successfully.');
      refreshCurrentTab();
      onSettingsUpdated();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers: Order Fulfillment ---
  const handleSaveOrderFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderFulfillment) return;

    try {
      await api.updateOrderStatus(orderFulfillment.orderId, {
        status: orderFulfillment.status,
        adminCompletionMessage: orderFulfillment.completionMessage,
        adminNotes: orderFulfillment.notes,
      });
      showFeedback('success', `Order ${orderFulfillment.orderId} updated to ${orderFulfillment.status}. Completion message saved!`);
      setOrderFulfillment(null);
      refreshCurrentTab();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers: Payment Reconciliation ---
  const handleReconcilePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingPayment || !reconcilingPayment.reason.trim()) {
      showFeedback('error', 'Please provide a valid reason for manual reconciliation.');
      return;
    }

    try {
      await api.reconcilePayment(reconcilingPayment.id, {
        reason: reconcilingPayment.reason,
        utr: reconcilingPayment.utr,
      });
      showFeedback('success', `Payment ${reconcilingPayment.id} reconciled and credited to customer wallet.`);
      setReconcilingPayment(null);
      refreshCurrentTab();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers: Wallet Adjustment ---
  const handleWalletAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAdjustment || !walletAdjustment.amount || !walletAdjustment.reason.trim()) {
      showFeedback('error', 'Amount and reason are required.');
      return;
    }

    const amt = parseFloat(walletAdjustment.amount);
    if (isNaN(amt) || amt === 0) {
      showFeedback('error', 'Enter a valid non-zero amount (+ to credit, - to debit).');
      return;
    }

    try {
      await api.adjustUserWallet(walletAdjustment.userId, {
        amount: amt,
        reason: walletAdjustment.reason,
      });
      showFeedback('success', `Wallet adjusted successfully by ₹${amt > 0 ? '+' : ''}${amt.toFixed(2)}.`);
      setWalletAdjustment(null);
      refreshCurrentTab();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // --- Handlers: Settings Save ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsData) return;

    try {
      const res = await api.updateAdminSettings(settingsData);
      setSettingsData(res.settings);
      showFeedback('success', `Settings permanently saved to database! Current Version: ${res.settings.version}`);
      onSettingsUpdated();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleRestoreDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmation !== 'CONFIRM_RESET_AKASH_STORE' && resetConfirmation !== 'CONFIRM_RESET_AKAZA_STORE') {
      showFeedback('error', 'Type CONFIRM_RESET_AKASH_STORE to confirm default restoration.');
      return;
    }

    try {
      await api.restoreDefaults(resetConfirmation);
      showFeedback('success', 'Defaults restored and logged in audit trail.');
      setResetConfirmation('');
      refreshCurrentTab();
      onSettingsUpdated();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 rounded-3xl border border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-['Cinzel']">
                ADMINISTRATION CONSOLE
              </h1>
              <span className="text-[10px] bg-red-950/80 border border-red-700/60 text-red-400 px-2 py-0.5 rounded-full font-bold">
                SECURE
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Authoritative database management for AKASH Likes Store & Glory Bot.
            </p>
          </div>
        </div>

        <button
          onClick={refreshCurrentTab}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Global Feedback Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-red-950/80 border-red-800 text-red-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-zinc-800 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: ShieldAlert },
          { id: 'likes_plans', label: 'Likes Packages', icon: Flame },
          { id: 'glory_plans', label: 'Glory Bot Packages', icon: Bot },
          { id: 'orders', label: 'Orders & Fulfillment', icon: ShoppingBag },
          { id: 'payments', label: 'FamGateway Payments', icon: CreditCard },
          { id: 'users', label: 'Customers & Wallets', icon: Users },
          { id: 'support', label: 'Support Tickets', icon: MessageSquare },
          { id: 'settings', label: 'Store Settings & Version', icon: Settings },
          { id: 'audit', label: 'Audit Change History', icon: FileText },
          { id: 'broadcasts', label: 'Announcements', icon: Bell },
          { id: 'errors', label: 'System Logs', icon: AlertOctagon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-md'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4 text-amber-400" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-[11px] text-zinc-400 block">Total Customers</span>
              <span className="text-2xl font-black text-white font-mono">{overview.metrics.totalUsers}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-[11px] text-zinc-400 block">Total Orders</span>
              <span className="text-2xl font-black text-white font-mono">{overview.metrics.totalOrders}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-[11px] text-zinc-400 block">Pending Queue</span>
              <span className="text-2xl font-black text-amber-400 font-mono">{overview.metrics.pendingOrders}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-[11px] text-zinc-400 block">Completed</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{overview.metrics.completedOrders}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-[11px] text-zinc-400 block">Revenue (INR)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">₹{overview.metrics.totalRevenueINR.toFixed(2)}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-[11px] text-zinc-400 block">DB Version</span>
              <span className="text-2xl font-black text-blue-400 font-mono">v{overview.system.settingsVersion}</span>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Database Persistence Status
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              All settings, plans, and wallet transactions are persistently stored on the server filesystem in <code className="text-amber-300">/data/store.json</code> with atomic sync. Prices and quantities survive server restarts and browser reloads.
            </p>
            <div className="text-[11px] text-zinc-400">
              FamGateway Status: {overview.system.famGatewayConfigured ? (
                <span className="text-emerald-400 font-bold">API Key Loaded & Configured</span>
              ) : (
                <span className="text-amber-400 font-bold">FAMGATEWAY_API_KEY awaiting configuration in Secrets</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIKES PLANS MANAGEMENT */}
      {activeTab === 'likes_plans' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-white font-['Cinzel']">Free Fire Likes Packages</h2>
              <p className="text-xs text-zinc-400">Changes save directly to database and revalidate immediately.</p>
            </div>
            <button
              onClick={() =>
                setEditingPlan({
                  name: '',
                  likesQuantity: 500,
                  price: 50,
                  description: '',
                  inStock: true,
                  enabled: true,
                  sortOrder: likesPlans.length + 1,
                })
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Likes Plan
            </button>
          </div>

          {/* Edit / Create Form Modal */}
          {editingPlan && (
            <div className="bg-zinc-900 border border-red-500/40 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white">
                  {editingPlan.id ? 'Edit Plan' : 'Create New Likes Plan'}
                </h3>
                <button onClick={() => setEditingPlan(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLikesPlan} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Plan Name *</label>
                  <input
                    type="text"
                    value={editingPlan.name || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="e.g. 500 Free Fire Likes"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Likes Quantity *</label>
                  <input
                    type="number"
                    value={editingPlan.likesQuantity || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, likesQuantity: parseInt(e.target.value, 10) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Price (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPlan.price !== undefined ? editingPlan.price : 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1 font-semibold">Description</label>
                  <input
                    type="text"
                    value={editingPlan.description || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    placeholder="Delivery speed or features note"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Sort Order</label>
                  <input
                    type="number"
                    value={editingPlan.sortOrder || 1}
                    onChange={(e) => setEditingPlan({ ...editingPlan, sortOrder: parseInt(e.target.value, 10) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-6 sm:col-span-3 pt-2">
                  <label className="flex items-center gap-2 text-zinc-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.inStock !== false}
                      onChange={(e) => setEditingPlan({ ...editingPlan, inStock: e.target.checked })}
                      className="rounded bg-zinc-950 text-red-600 focus:ring-0"
                    />
                    In Stock
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.enabled !== false}
                      onChange={(e) => setEditingPlan({ ...editingPlan, enabled: e.target.checked })}
                      className="rounded bg-zinc-950 text-red-600 focus:ring-0"
                    />
                    Enabled (Visible to Customers)
                  </label>
                </div>

                <div className="sm:col-span-3 flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Save & Verify to DB
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Likes Plans Table */}
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Plan Name</th>
                  <th className="p-3">Likes</th>
                  <th className="p-3">Price (INR)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Version</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/60">
                {likesPlans.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-850/50">
                    <td className="p-3 font-mono text-zinc-400">#{p.sortOrder}</td>
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 font-mono text-red-400">+{p.likesQuantity.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">₹{p.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {p.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-zinc-400">v{p.version}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setEditingPlan(p)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg"
                        title="Edit Plan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLikesPlan(p.id)}
                        className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GLORY PLANS MANAGEMENT */}
      {activeTab === 'glory_plans' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-white font-['Cinzel']">Glory Bot Packages</h2>
              <p className="text-xs text-zinc-400">Manage guild booster packages and rates.</p>
            </div>
            <button
              onClick={() =>
                setEditingGloryPlan({
                  name: '',
                  gloryQuantity: 10000,
                  price: 89,
                  description: '',
                  inStock: true,
                  enabled: true,
                  sortOrder: gloryPlans.length + 1,
                })
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Glory Plan
            </button>
          </div>

          {editingGloryPlan && (
            <div className="bg-zinc-900 border border-purple-500/40 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white">
                  {editingGloryPlan.id ? 'Edit Glory Plan' : 'Create New Glory Plan'}
                </h3>
                <button onClick={() => setEditingGloryPlan(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveGloryPlan} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Plan Name *</label>
                  <input
                    type="text"
                    value={editingGloryPlan.name || ''}
                    onChange={(e) => setEditingGloryPlan({ ...editingGloryPlan, name: e.target.value })}
                    placeholder="e.g. 10,000 Guild Glory"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Glory Quantity *</label>
                  <input
                    type="number"
                    value={editingGloryPlan.gloryQuantity || 0}
                    onChange={(e) => setEditingGloryPlan({ ...editingGloryPlan, gloryQuantity: parseInt(e.target.value, 10) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Price (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingGloryPlan.price !== undefined ? editingGloryPlan.price : 0}
                    onChange={(e) => setEditingGloryPlan({ ...editingGloryPlan, price: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1 font-semibold">Description</label>
                  <input
                    type="text"
                    value={editingGloryPlan.description || ''}
                    onChange={(e) => setEditingGloryPlan({ ...editingGloryPlan, description: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Sort Order</label>
                  <input
                    type="number"
                    value={editingGloryPlan.sortOrder || 1}
                    onChange={(e) => setEditingGloryPlan({ ...editingGloryPlan, sortOrder: parseInt(e.target.value, 10) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingGloryPlan(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Save & Verify to DB
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Plan Name</th>
                  <th className="p-3">Glory</th>
                  <th className="p-3">Price (INR)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/60">
                {gloryPlans.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-850/50">
                    <td className="p-3 font-mono text-zinc-400">#{p.sortOrder}</td>
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 font-mono text-purple-400">+{p.gloryQuantity.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">₹{p.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                        {p.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setEditingGloryPlan(p)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGloryPlan(p.id)}
                        className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ORDERS & FULFILLMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-white font-['Cinzel']">Customer Orders & Fulfillment</h2>
            <p className="text-xs text-zinc-400">Process orders and send custom completion messages to customers.</p>
          </div>

          {/* Fulfillment Editor Modal */}
          {orderFulfillment && (
            <div className="bg-zinc-900 border border-emerald-500/40 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white">
                  Update Order Status & Send Delivery Note ({orderFulfillment.orderId})
                </h3>
                <button onClick={() => setOrderFulfillment(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveOrderFulfillment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Change Order Status *</label>
                  <select
                    value={orderFulfillment.status}
                    onChange={(e) => setOrderFulfillment({ ...orderFulfillment, status: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="processing">Processing (In Queue)</option>
                    <option value="completed">Completed (Delivered Successfully)</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">
                    Customer Completion Message (Visible on Customer's Order Tracker)
                  </label>
                  <textarea
                    rows={2}
                    value={orderFulfillment.completionMessage}
                    onChange={(e) => setOrderFulfillment({ ...orderFulfillment, completionMessage: e.target.value })}
                    placeholder="e.g. Delivered successfully! Likes have been boosted on your profile. Thank you for choosing AKASH."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Internal Admin Notes</label>
                  <input
                    type="text"
                    value={orderFulfillment.notes}
                    onChange={(e) => setOrderFulfillment({ ...orderFulfillment, notes: e.target.value })}
                    placeholder="e.g. Verified Free Fire API response 200"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setOrderFulfillment(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    Save Status & Notify Customer
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Target UID</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Delivery Note</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/60">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-850/50">
                    <td className="p-3 font-mono font-bold text-white">{o.id}</td>
                    <td className="p-3 text-zinc-400">{o.userEmail}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.productType === 'likes' ? 'bg-red-950 text-red-400' : 'bg-purple-950 text-purple-400'}`}>
                        {o.productType === 'likes' ? 'Likes' : 'Glory Bot'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-zinc-200">{o.freeFireUid}</td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">₹{o.priceSnapshot.toFixed(2)}</td>
                    <td className="p-3">
                      <span className="font-bold text-[11px] uppercase text-amber-400">{o.status}</span>
                    </td>
                    <td className="p-3 text-zinc-400 max-w-xs truncate">
                      {o.adminCompletionMessage || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() =>
                          setOrderFulfillment({
                            orderId: o.id,
                            status: o.status,
                            completionMessage: o.adminCompletionMessage || '',
                            notes: o.adminNotes || '',
                          })
                        }
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FAMGATEWAY PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-white font-['Cinzel']">FamGateway UPI Payment Records</h2>
            <p className="text-xs text-zinc-400">Authoritative payment sessions, UTRs, and manual reconciliation.</p>
          </div>

          {reconcilingPayment && (
            <div className="bg-zinc-900 border border-amber-500/40 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">
                Manual Authoritative Reconciliation ({reconcilingPayment.id})
              </h3>
              <form onSubmit={handleReconcilePayment} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Bank UTR / Transaction ID</label>
                  <input
                    type="text"
                    value={reconcilingPayment.utr}
                    onChange={(e) => setReconcilingPayment({ ...reconcilingPayment, utr: e.target.value })}
                    placeholder="e.g. 412389102837"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Authoritative Audit Reason *</label>
                  <input
                    type="text"
                    value={reconcilingPayment.reason}
                    onChange={(e) => setReconcilingPayment({ ...reconcilingPayment, reason: e.target.value })}
                    placeholder="e.g. Verified UPI statement on bank portal"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReconcilingPayment(null)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-black"
                  >
                    Confirm Reconcile & Credit
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Provider Ref</th>
                  <th className="p-3">UTR</th>
                  <th className="p-3">Credited</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-850/50">
                    <td className="p-3 font-mono font-bold text-white">{p.id}</td>
                    <td className="p-3 text-zinc-400">{p.userEmail}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">₹{p.amount.toFixed(2)}</td>
                    <td className="p-3 font-mono text-zinc-400">{p.providerOrderId || '—'}</td>
                    <td className="p-3 font-mono text-zinc-300">{p.utr || '—'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.creditedToWallet ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {p.creditedToWallet ? 'Yes' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {!p.creditedToWallet && (
                        <button
                          onClick={() => setReconcilingPayment({ id: p.id, reason: '', utr: '' })}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold"
                        >
                          Reconcile
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: CUSTOMERS & WALLETS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-white font-['Cinzel']">Customer Accounts & Ledger</h2>
            <p className="text-xs text-zinc-400">Inspect user accounts and perform audited manual wallet adjustments.</p>
          </div>

          {walletAdjustment && (
            <div className="bg-zinc-900 border border-emerald-500/40 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Manual Wallet Adjustment</h3>
              <form onSubmit={handleWalletAdjust} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">
                    Amount to Adjust (INR) — Use positive for credit (+50), negative for deduction (-50)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={walletAdjustment.amount}
                    onChange={(e) => setWalletAdjustment({ ...walletAdjustment, amount: e.target.value })}
                    placeholder="e.g. 100 or -50"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Ledger Reason (Mandatory) *</label>
                  <input
                    type="text"
                    value={walletAdjustment.reason}
                    onChange={(e) => setWalletAdjustment({ ...walletAdjustment, reason: e.target.value })}
                    placeholder="e.g. Promotional bonus or manual refund for order #123"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setWalletAdjustment(null)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Wallet Balance</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-850/50">
                    <td className="p-3 font-mono text-zinc-400">{u.id}</td>
                    <td className="p-3 font-bold text-white">{u.username}</td>
                    <td className="p-3 text-zinc-300">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      ₹{u.wallet ? u.wallet.balance.toFixed(2) : '0.00'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setWalletAdjustment({ userId: u.id, amount: '', reason: '' })}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold"
                      >
                        Adjust Wallet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: SUPPORT TICKETS & RESOLUTION */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white font-['Cinzel'] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                Customer Support Tickets
              </h2>
              <p className="text-xs text-zinc-400">
                View customer issues, post official admin responses, and resolve queries.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold">
                Open: {supportTickets.filter(t => t.status === 'open').length}
              </span>
              <span className="px-3 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold">
                In Progress: {supportTickets.filter(t => t.status === 'in_progress' || t.status === 'waiting_for_customer').length}
              </span>
              <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold">
                Resolved: {supportTickets.filter(t => t.status === 'resolved').length}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-zinc-500 text-[11px] font-bold mr-1">STATUS:</span>
              {(['all', 'open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSupportStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    supportStatusFilter === st
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {st.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[11px] font-bold">CATEGORY:</span>
              <select
                value={supportCategoryFilter}
                onChange={(e) => setSupportCategoryFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Categories</option>
                <option value="Payment/QR Problem">Payment/QR Problem</option>
                <option value="Payment Verification">Payment Verification</option>
                <option value="Wallet Balance">Wallet Balance</option>
                <option value="Order Problem">Order Problem</option>
                <option value="Likes Store">Likes Store</option>
                <option value="Glory Bot">Glory Bot</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Admin Reply Drawer / Modal */}
          {replyingTicket && (
            <div className="bg-zinc-900 border-2 border-amber-500/50 p-6 rounded-3xl space-y-4 shadow-2xl animate-in fade-in">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-400" />
                    Reply to Support Ticket: <span className="font-mono text-amber-400">{replyingTicket.id}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Customer: <strong>{replyingTicket.customerName}</strong> ({replyingTicket.customerEmail}) • Category: {replyingTicket.category}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTicket(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {replyingTicket.orderReference && (
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>Order Reference:</span>
                  <span className="font-mono font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    {replyingTicket.orderReference}
                  </span>
                </div>
              )}

              {/* Original Customer Message */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">Customer Inquiry:</span>
                <p className="text-xs text-zinc-200 bg-zinc-950 p-3 rounded-xl border border-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {replyingTicket.description}
                </p>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleAdminTicketReply} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">
                    Official Admin Reply <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={replyingTicket.adminReply}
                    onChange={(e) => setReplyingTicket({ ...replyingTicket, adminReply: e.target.value })}
                    placeholder="Type official response clearly explaining resolution, instructions, or status update..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-zinc-300">Set New Status:</label>
                    <select
                      value={replyingTicket.status}
                      onChange={(e) => setReplyingTicket({ ...replyingTicket, status: e.target.value as TicketStatus })}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="resolved">Resolved (Default)</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_for_customer">Waiting for Customer</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setReplyingTicket(null)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={replySubmitting}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {replySubmitting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Send Reply & Update Status
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Tickets List */}
          {supportTickets.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-xs text-zinc-400">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              No support tickets found in the database.
            </div>
          ) : (
            <div className="space-y-3">
              {supportTickets
                .filter((t) => {
                  if (supportStatusFilter !== 'all' && t.status !== supportStatusFilter) return false;
                  if (supportCategoryFilter !== 'all' && t.category !== supportCategoryFilter) return false;
                  return true;
                })
                .map((t) => (
                  <div
                    key={t.id}
                    className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl space-y-3 text-xs hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
                          {t.id}
                        </span>
                        <span className="font-bold text-white">{t.customerName}</span>
                        <span className="text-zinc-400">({t.customerEmail})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold text-[11px]">
                          {t.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            t.status === 'resolved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : t.status === 'in_progress'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : t.status === 'waiting_for_customer'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : t.status === 'closed'
                              ? 'bg-zinc-800 text-zinc-500'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {t.status.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {new Date(t.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {t.orderReference && (
                      <div className="text-[11px] text-zinc-400">
                        Associated Order / Ref: <strong className="font-mono text-white bg-zinc-950 px-1.5 py-0.5 rounded">{t.orderReference}</strong>
                      </div>
                    )}

                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {t.description}
                    </div>

                    {/* Existing Admin Reply */}
                    {t.adminReply && (
                      <div className="p-3 rounded-xl bg-zinc-950/50 border border-amber-900/30 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                          <span>Admin Response:</span>
                          <span className="text-zinc-500 font-normal">
                            {t.adminReplyAt ? new Date(t.adminReplyAt).toLocaleString() : ''} {t.adminRepliedBy && `by ${t.adminRepliedBy}`}
                          </span>
                        </div>
                        <p className="text-zinc-300 whitespace-pre-wrap">{t.adminReply}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {t.status !== 'resolved' && (
                        <button
                          onClick={() => handleQuickTicketStatus(t.id, 'resolved')}
                          className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Resolved
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setReplyingTicket({
                            id: t.id,
                            customerName: t.customerName,
                            customerEmail: t.customerEmail,
                            category: t.category,
                            description: t.description,
                            orderReference: t.orderReference,
                            adminReply: t.adminReply || '',
                            status: t.status === 'resolved' ? 'resolved' : 'resolved',
                          })
                        }
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        {t.adminReply ? 'Update Reply / Status' : 'Reply to Customer'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: STORE SETTINGS & VERSION VERIFICATION */}
      {activeTab === 'settings' && settingsData && (
        <div className="space-y-6 max-w-3xl">
          <div>
            <h2 className="text-lg font-black text-white font-['Cinzel']">Persistent Store Configuration</h2>
            <p className="text-xs text-zinc-400">
              Settings version: <strong className="text-amber-400">v{settingsData.version}</strong> (Last updated: {new Date(settingsData.updatedAt).toLocaleString()})
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Store Brand Name</label>
              <input
                type="text"
                value={settingsData.storeName}
                onChange={(e) => setSettingsData({ ...settingsData, storeName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Minimum Deposit (INR)</label>
                <input
                  type="number"
                  value={settingsData.minDepositINR}
                  onChange={(e) => setSettingsData({ ...settingsData, minDepositINR: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Maximum Deposit (INR)</label>
                <input
                  type="number"
                  value={settingsData.maxDepositINR}
                  onChange={(e) => setSettingsData({ ...settingsData, maxDepositINR: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Likes Service Notice</label>
              <textarea
                rows={2}
                value={settingsData.likesServiceNotice}
                onChange={(e) => setSettingsData({ ...settingsData, likesServiceNotice: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Glory Bot Service Notice</label>
              <textarea
                rows={2}
                value={settingsData.gloryBotServiceNotice}
                onChange={(e) => setSettingsData({ ...settingsData, gloryBotServiceNotice: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Support Telegram Handle</label>
                <input
                  type="text"
                  value={settingsData.supportTelegram}
                  onChange={(e) => setSettingsData({ ...settingsData, supportTelegram: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Support WhatsApp Number</label>
                <input
                  type="text"
                  value={settingsData.supportWhatsapp}
                  onChange={(e) => setSettingsData({ ...settingsData, supportWhatsapp: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-lg"
            >
              Save Configuration to Database
            </button>
          </form>

          {/* Protected Danger Zone */}
          <div className="bg-red-950/20 border border-red-900/60 p-5 rounded-2xl space-y-3 text-xs">
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Protected Default Reset (Audit Protected)
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              To prevent accidental resets, you must type <code className="text-white font-mono bg-zinc-950 px-1 py-0.5 rounded">CONFIRM_RESET_AKASH_STORE</code> below.
            </p>
            <form onSubmit={handleRestoreDefaults} className="flex gap-2">
              <input
                type="text"
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                placeholder="Type CONFIRM_RESET_AKASH_STORE"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-bold whitespace-nowrap"
              >
                Restore Defaults
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-white font-['Cinzel']">Admin Change Audit Log</h2>
            <p className="text-xs text-zinc-400">Complete record of all setting edits, plan price changes, and manual adjustments.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Admin</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Old Value</th>
                  <th className="p-3">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-850/50">
                    <td className="p-3 font-mono text-zinc-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-white font-bold">{log.adminEmail}</td>
                    <td className="p-3 font-mono text-amber-400">{log.action}</td>
                    <td className="p-3 text-zinc-400">{log.targetEntity}:{log.targetId}</td>
                    <td className="p-3 font-mono text-[10px] text-zinc-400 max-w-xs truncate">
                      {log.previousValue ? JSON.stringify(log.previousValue) : '—'}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-emerald-400 max-w-xs truncate">
                      {log.newValue ? JSON.stringify(log.newValue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: ANNOUNCEMENTS */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-white font-['Cinzel']">Store Announcements</h2>
            <p className="text-xs text-zinc-400">Post announcements displayed to all customers at top of page.</p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newBroadcast.title || !newBroadcast.message) return;
              try {
                await api.createBroadcast(newBroadcast);
                setNewBroadcast({ title: '', message: '', type: 'info' });
                showFeedback('success', 'Broadcast announcement posted.');
                refreshCurrentTab();
              } catch (err: any) {
                showFeedback('error', err.message);
              }
            }}
            className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-3 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Title (e.g. Free Fire Tournament Special)"
                value={newBroadcast.title}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                required
              />
              <input
                type="text"
                placeholder="Message details"
                value={newBroadcast.message}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                className="w-full sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold"
            >
              Publish Broadcast
            </button>
          </form>

          <div className="space-y-2">
            {broadcasts.map((b) => (
              <div
                key={b.id}
                className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{b.title}</div>
                  <div className="text-zinc-300 mt-0.5">{b.message}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await api.toggleBroadcast(b.id);
                      refreshCurrentTab();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      b.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {b.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={async () => {
                      await api.deleteBroadcast(b.id);
                      refreshCurrentTab();
                    }}
                    className="p-1 text-red-400 hover:bg-red-950 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 10: SYSTEM ERROR LOGS */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-white font-['Cinzel']">Integration & Server Logs</h2>
            <p className="text-xs text-zinc-400">View network or external API errors from FamGateway.</p>
          </div>

          {errorsList.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-xs text-zinc-400">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              All systems healthy. No integration errors recorded.
            </div>
          ) : (
            <div className="space-y-2">
              {errorsList.map((err) => (
                <div
                  key={err.id}
                  className="bg-zinc-900 border border-red-900/60 p-4 rounded-xl text-xs space-y-1"
                >
                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="font-mono text-red-400 font-bold">{err.provider} ({err.endpoint})</span>
                    <span>{new Date(err.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-zinc-200 font-mono text-[11px] bg-zinc-950 p-2 rounded border border-zinc-800 break-words">
                    {err.errorDetails}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
