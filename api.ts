import {
  User,
  Plan,
  GloryPlan,
  StoreSettings,
  Order,
  Wallet,
  WalletTransaction,
  PaymentRecord,
  BroadcastNotification,
  AdminAuditLog,
  IntegrationError,
  OrderStatus,
  SupportTicket,
  TicketCategory,
  TicketStatus
} from '../types.ts';

const TOKEN_KEY = 'akash_auth_token';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});

  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Add cache buster query param for GET requests
  let url = endpoint;
  if (!options.method || options.method === 'GET') {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}_t=${Date.now()}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch {
      const text = await response.text();
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // --- Public ---
  getSettings: () => fetchApi<StoreSettings>('/api/settings'),
  getPlans: () => fetchApi<Plan[]>('/api/plans'),
  getGloryPlans: () => fetchApi<GloryPlan[]>('/api/glory-plans'),
  getNotifications: () => fetchApi<BroadcastNotification[]>('/api/notifications'),
  getHealth: () => fetchApi<{ status: string; storeName: string; settingsVersion: number; famGatewayConfigured: boolean; adminCount: number }>('/api/health'),
  getSetupStatus: () => fetchApi<{ hasAdmin: boolean; adminCount: number }>('/api/auth/setup-status'),

  // --- Auth ---
  register: (payload: { email: string; username: string; password: string }) =>
    fetchApi<{ token: string; user: User; wallet: Wallet }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    fetchApi<{ token: string; user: User; wallet: Wallet }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  setupAdmin: (payload: { email: string; username: string; password: string }) =>
    fetchApi<{ token: string; user: User; message: string }>('/api/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => fetchApi<{ user: User; wallet: Wallet }>('/api/auth/me'),

  // --- Customer Operations ---
  getWallet: () => fetchApi<Wallet>('/api/wallet'),
  getTransactions: () => fetchApi<WalletTransaction[]>('/api/wallet/transactions'),
  getOrders: () => fetchApi<Order[]>('/api/orders'),

  createLikesOrder: (payload: { planId: string; freeFireUid: string }) =>
    fetchApi<{ message: string; order: Order; transaction: WalletTransaction; newBalance: number }>('/api/orders/likes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createGloryOrder: (payload: { planId: string; freeFireUid: string; guildId?: string }) =>
    fetchApi<{ message: string; order: Order; transaction: WalletTransaction; newBalance: number }>('/api/orders/glory', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createPaymentIntent: (amount: number) =>
    fetchApi<{
      message: string;
      paymentId: string;
      providerOrderId: string;
      amount: number;
      qrUrl: string;
      upiIntent?: string;
      paymentUrl?: string;
      merchantName?: string;
      merchantUpi?: string;
      expiresAt: string;
      expiresIn: number;
      status: string;
    }>('/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  verifyPayment: (payload: { paymentId?: string; providerOrderId?: string }) =>
    fetchApi<{
      status: 'SUCCESS' | 'PENDING' | 'EXPIRED' | 'FAILED';
      message: string;
      wallet?: Wallet;
      transaction?: WalletTransaction;
      alreadyCredited?: boolean;
      payment?: PaymentRecord;
    }>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // --- Admin Operations ---
  getAdminOverview: () =>
    fetchApi<{
      metrics: {
        totalUsers: number;
        totalOrders: number;
        pendingOrders: number;
        completedOrders: number;
        totalRevenueINR: number;
        pendingPayments: number;
      };
      system: {
        settingsVersion: number;
        updatedAt: string;
        famGatewayConfigured: boolean;
      };
    }>('/api/admin/overview'),

  getAdminPlans: () => fetchApi<Plan[]>('/api/admin/plans'),
  createPlan: (data: Partial<Plan>) =>
    fetchApi<{ message: string; plan: Plan }>('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePlan: (id: string, data: Partial<Plan>) =>
    fetchApi<{ message: string; plan: Plan }>(`/api/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePlan: (id: string) =>
    fetchApi<{ message: string }>(`/api/admin/plans/${id}`, {
      method: 'DELETE',
    }),

  getAdminGloryPlans: () => fetchApi<GloryPlan[]>('/api/admin/glory-plans'),
  createGloryPlan: (data: Partial<GloryPlan>) =>
    fetchApi<{ message: string; plan: GloryPlan }>('/api/admin/glory-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateGloryPlan: (id: string, data: Partial<GloryPlan>) =>
    fetchApi<{ message: string; plan: GloryPlan }>(`/api/admin/glory-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteGloryPlan: (id: string) =>
    fetchApi<{ message: string }>(`/api/admin/glory-plans/${id}`, {
      method: 'DELETE',
    }),

  getAdminSettings: () => fetchApi<StoreSettings>('/api/admin/settings'),
  updateAdminSettings: (data: Partial<StoreSettings>) =>
    fetchApi<{ message: string; settings: StoreSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  restoreDefaults: (confirmation: string) =>
    fetchApi<{ message: string }>('/api/admin/settings/restore-defaults', {
      method: 'POST',
      body: JSON.stringify({ confirmation }),
    }),

  getAdminOrders: () => fetchApi<Order[]>('/api/admin/orders'),
  updateOrderStatus: (id: string, payload: { status: OrderStatus; adminCompletionMessage?: string; adminNotes?: string }) =>
    fetchApi<{ message: string; order: Order }>(`/api/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getAdminPayments: () => fetchApi<PaymentRecord[]>('/api/admin/payments'),
  reconcilePayment: (id: string, payload: { reason: string; utr?: string }) =>
    fetchApi<{ message: string; payment: PaymentRecord; wallet: Wallet }>(`/api/admin/payments/${id}/reconcile`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdminUsers: () => fetchApi<(User & { wallet: Wallet })[]>('/api/admin/users'),
  adjustUserWallet: (id: string, payload: { amount: number; reason: string }) =>
    fetchApi<{ message: string; wallet: Wallet; transaction: WalletTransaction }>(`/api/admin/users/${id}/adjust-wallet`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdminAuditLogs: () => fetchApi<AdminAuditLog[]>('/api/admin/audit-logs'),
  getAdminErrors: () => fetchApi<IntegrationError[]>('/api/admin/errors'),
  resolveAdminError: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/admin/errors/${id}/resolve`, {
      method: 'PUT',
    }),

  createBroadcast: (data: { title: string; message: string; type: string }) =>
    fetchApi<{ message: string; notification: BroadcastNotification }>('/api/admin/broadcasts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleBroadcast: (id: string) =>
    fetchApi<{ message: string; notification: BroadcastNotification }>(`/api/admin/broadcasts/${id}/toggle`, {
      method: 'PUT',
    }),
  deleteBroadcast: (id: string) =>
    fetchApi<{ message: string }>(`/api/admin/broadcasts/${id}`, {
      method: 'DELETE',
    }),

  // --- Customer Contact Support ---
  createSupportTicket: (data: {
    customerName: string;
    customerEmail: string;
    orderReference?: string;
    category: TicketCategory;
    description: string;
  }) =>
    fetchApi<{ message: string; ticket: SupportTicket }>('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSupportTickets: () => fetchApi<SupportTicket[]>('/api/support/tickets'),
  getSupportTicketById: (id: string) => fetchApi<SupportTicket>(`/api/support/tickets/${id}`),

  // --- Admin Support Management ---
  getAdminSupportTickets: () => fetchApi<SupportTicket[]>('/api/admin/support/tickets'),
  replyAdminSupportTicket: (id: string, payload: { adminReply: string; status?: TicketStatus }) =>
    fetchApi<{ message: string; ticket: SupportTicket }>(`/api/admin/support/tickets/${id}/reply`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateAdminSupportTicketStatus: (id: string, status: TicketStatus) =>
    fetchApi<{ message: string; ticket: SupportTicket }>(`/api/admin/support/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

