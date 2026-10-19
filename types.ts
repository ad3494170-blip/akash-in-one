export type UserRole = 'admin' | 'customer';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  likesQuantity: number;
  price: number;
  description: string;
  inStock: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface GloryPlan {
  id: string;
  name: string;
  gloryQuantity: number;
  price: number;
  description: string;
  inStock: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface StoreSettings {
  storeName: string;
  maintenanceMode: boolean;
  minDepositINR: number;
  maxDepositINR: number;
  likesServiceNotice: string;
  gloryBotServiceNotice: string;
  supportTelegram: string;
  supportWhatsapp: string;
  supportWhatsappNumber?: string;
  supportEmail?: string;
  famGatewayConfigured: boolean;
  famGatewayEnabled?: boolean;
  famGatewayUpiId?: string;
  updatedAt: string;
  version: number;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'processing' | 'completed' | 'rejected' | 'cancelled';
export type ProductType = 'likes' | 'glory_bot';

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  productType: ProductType;
  planId: string;
  planName: string;
  quantitySnapshot: number;
  priceSnapshot: number;
  freeFireUid: string;
  guildId?: string;
  status: OrderStatus;
  paymentMethod: 'wallet' | 'direct_upi';
  paymentReference?: string;
  adminCompletionMessage?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  updatedAt: string;
  version: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  type: 'deposit' | 'order_purchase' | 'refund' | 'admin_adjustment';
  referenceId: string;
  status: 'success' | 'pending' | 'failed';
  reason?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  provider: 'famgateway';
  providerOrderId?: string;
  qrUrl?: string;
  upiIntent?: string;
  paymentUrl?: string;
  merchantName?: string;
  merchantUpi?: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  creditedToWallet: boolean;
  creditedAt?: string;
  utr?: string;
  failureReason?: string;
  idempotencyKey: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  active: boolean;
  createdAt: string;
  createdByAdmin: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetEntity: string;
  targetId: string;
  previousValue?: any;
  newValue?: any;
  timestamp: string;
}

export interface IntegrationError {
  id: string;
  provider: string;
  endpoint: string;
  errorDetails: string;
  timestamp: string;
  resolved: boolean;
}

export type TicketCategory =
  | 'Payment/QR Problem'
  | 'Payment Verification'
  | 'Wallet Balance'
  | 'Order Problem'
  | 'Likes Store'
  | 'Glory Bot'
  | 'Other';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  orderReference?: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  adminReply?: string;
  adminReplyAt?: string;
  adminRepliedBy?: string;
  createdAt: string;
  updatedAt: string;
}
