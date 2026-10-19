import fs from 'fs';
import path from 'path';
import {
  DatabaseSchema,
  Plan,
  GloryPlan,
  StoreSettings,
  User,
  Order,
  PaymentRecord,
  Wallet,
  WalletTransaction,
  AdminAuditLog,
  BroadcastNotification,
  IntegrationError,
  OrderStatus,
  ProductType,
  SupportTicket,
  TicketCategory,
  TicketStatus
} from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
const TMP_FILE = path.join(DATA_DIR, 'store.json.tmp');

const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'AKASH',
  maintenanceMode: false,
  minDepositINR: 10,
  maxDepositINR: 20000,
  likesServiceNotice: '⚡ Likes delivery usually takes 5 - 15 minutes after order placement. Free Fire UID must be valid.',
  gloryBotServiceNotice: '🛡️ Glory Bot processes guild requests during active battle hours. Enter valid Guild ID and Leader UID.',
  supportTelegram: '@AkashLikesSupport',
  supportWhatsapp: '+91 98765 43210',
  famGatewayEnabled: true,
  famGatewayUpiId: '',
  updatedAt: new Date().toISOString(),
  updatedByAdminId: 'system',
  version: 1,
};

const INITIAL_LIKES_PLANS: Plan[] = [
  {
    id: 'plan_likes_100',
    name: '100 Free Fire Likes',
    likesQuantity: 100,
    price: 15,
    description: 'Quick profile boost. Delivery in 5-10 minutes.',
    inStock: true,
    enabled: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_likes_500',
    name: '500 Free Fire Likes',
    likesQuantity: 500,
    price: 65,
    description: 'Popular starter pack. Fast delivery with 100% safety guarantee.',
    inStock: true,
    enabled: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_likes_1000',
    name: '1,000 Free Fire Likes',
    likesQuantity: 1000,
    price: 120,
    description: 'Pro player badge booster. High retention and verified accounts.',
    inStock: true,
    enabled: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_likes_2500',
    name: '2,500 Free Fire Likes',
    likesQuantity: 2500,
    price: 280,
    description: 'Grandmaster special. Rapid continuous delivery.',
    inStock: true,
    enabled: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_likes_5000',
    name: '5,000 Free Fire Likes',
    likesQuantity: 5000,
    price: 540,
    description: 'VIP Demon Slayer pack. Top profile rank within 1 hour.',
    inStock: true,
    enabled: true,
    sortOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_likes_10000',
    name: '10,000 Free Fire Likes',
    likesQuantity: 10000,
    price: 999,
    description: 'Ultimate AKASH Upper Moon Pack. Priority express queue.',
    inStock: true,
    enabled: true,
    sortOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
];

const INITIAL_GLORY_PLANS: GloryPlan[] = [
  {
    id: 'plan_glory_5000',
    name: '5,000 Guild Glory Boost',
    gloryQuantity: 5000,
    price: 49,
    description: 'Daily guild target booster. Safe automated matches.',
    inStock: true,
    enabled: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_glory_10000',
    name: '10,000 Guild Glory Boost',
    gloryQuantity: 10000,
    price: 89,
    description: 'Fast weekly guild leveling. Continuous automated bot execution.',
    inStock: true,
    enabled: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_glory_25000',
    name: '25,000 Guild Glory Boost',
    gloryQuantity: 25000,
    price: 199,
    description: 'Guild Tournament Special. Unlock full guild rewards easily.',
    inStock: true,
    enabled: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_glory_50000',
    name: '50,000 Guild Glory Boost',
    gloryQuantity: 50000,
    price: 379,
    description: 'Regional Top Guild Pack. Guaranteed slot in leaderboard.',
    inStock: true,
    enabled: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'plan_glory_100000',
    name: '100,000 Guild Glory Mega Bot',
    gloryQuantity: 100000,
    price: 699,
    description: 'AKASH Demon King Guild Dominance. Automated 24/7 dedicated bot farm.',
    inStock: true,
    enabled: true,
    sortOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
];

class Database {
  private data: DatabaseSchema;
  private isLoaded: boolean = false;
  private writeLock: Promise<void> = Promise.resolve();

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * CRITICAL BUG FIX REQUIREMENT:
   * "Do not seed default settings over existing production data during application startup."
   * If store.json exists on disk, load it faithfully. Never overwrite!
   */
  private loadOrInitialize(): DatabaseSchema {
    this.ensureDir();

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        // Validate basic integrity
        if (parsed && parsed.plans && Array.isArray(parsed.plans)) {
          // Ensure all required collections exist even if from an earlier migration
          if (!parsed.gloryPlans) parsed.gloryPlans = INITIAL_GLORY_PLANS;
          if (!parsed.orders) parsed.orders = [];
          if (!parsed.payments) parsed.payments = [];
          if (!parsed.wallets) parsed.wallets = {};
          if (!parsed.transactions) parsed.transactions = [];
          if (!parsed.auditLogs) parsed.auditLogs = [];
          if (!parsed.notifications) parsed.notifications = [];
          if (!parsed.integrationErrors) parsed.integrationErrors = [];
          if (!parsed.supportTickets) parsed.supportTickets = [];
          if (!parsed.settings) parsed.settings = INITIAL_SETTINGS;

          console.log(`[DB] Successfully loaded existing database from ${DB_FILE}. (Version: ${parsed.version || 1}, Plans: ${parsed.plans.length}, GloryPlans: ${parsed.gloryPlans.length})`);
          this.isLoaded = true;
          return parsed;
        }
      } catch (err) {
        console.error(`[DB] Error parsing existing database file at ${DB_FILE}:`, err);
      }
    }

    // Fresh setup only when file doesn't exist
    console.log(`[DB] No existing database found at ${DB_FILE}. Initializing initial schema.`);
    const initialSchema: DatabaseSchema = {
      version: 1,
      settings: INITIAL_SETTINGS,
      users: [],
      plans: INITIAL_LIKES_PLANS,
      gloryPlans: INITIAL_GLORY_PLANS,
      orders: [],
      payments: [],
      wallets: {},
      transactions: [],
      auditLogs: [],
      notifications: [
        {
          id: 'notif_welcome',
          title: '🔥 Welcome to AKASH — Likes Store & Glory Bot',
          message: 'Get the cheapest & fastest Free Fire Likes and automated Guild Glory! Recharge your wallet with UPI anytime.',
          type: 'info',
          active: true,
          createdAt: new Date().toISOString(),
          createdByAdmin: 'system',
        }
      ],
      integrationErrors: [],
      supportTickets: [],
    };

    this.data = initialSchema;
    this.saveSync(initialSchema);
    this.isLoaded = true;
    return initialSchema;
  }

  /**
   * Atomic file persistence with fsync:
   * Writes to temporary file, syncs to disk, then atomically renames to store.json.
   * This guarantees no corrupted or half-written states even during crashes or restarts.
   */
  private saveSync(data: DatabaseSchema): void {
    this.ensureDir();
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(TMP_FILE, jsonStr, 'utf-8');
    const fd = fs.openSync(TMP_FILE, 'r+');
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(TMP_FILE, DB_FILE);
  }

  /**
   * Serialized persistence via lock queue to prevent concurrent write collisions
   */
  public async persist(): Promise<void> {
    this.writeLock = this.writeLock.then(() => {
      try {
        this.saveSync(this.data);
      } catch (err) {
        console.error('[DB] Persistence error:', err);
        throw err;
      }
    });
    return this.writeLock;
  }

  // Reload from disk if needed for verification
  public reloadFromDisk(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      this.data = parsed;
    }
    return this.data;
  }

  // --- Audit Logging ---
  public logAudit(
    adminId: string,
    adminEmail: string,
    action: string,
    targetEntity: string,
    targetId: string,
    previousValue?: any,
    newValue?: any
  ): AdminAuditLog {
    const entry: AdminAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      adminId,
      adminEmail,
      action,
      targetEntity,
      targetId,
      previousValue: previousValue !== undefined ? JSON.parse(JSON.stringify(previousValue)) : null,
      newValue: newValue !== undefined ? JSON.parse(JSON.stringify(newValue)) : null,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.length = 500; // Keep recent 500 audit events
    }
    return entry;
  }

  public getAuditLogs(): AdminAuditLog[] {
    return this.data.auditLogs;
  }

  // --- Integration Error Logging ---
  public logIntegrationError(provider: string, endpoint: string, errorDetails: string): IntegrationError {
    const err: IntegrationError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider,
      endpoint,
      errorDetails,
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    this.data.integrationErrors.unshift(err);
    if (this.data.integrationErrors.length > 200) {
      this.data.integrationErrors.length = 200;
    }
    return err;
  }

  public getIntegrationErrors(): IntegrationError[] {
    return this.data.integrationErrors;
  }

  public resolveIntegrationError(errorId: string): boolean {
    const err = this.data.integrationErrors.find(e => e.id === errorId);
    if (err) {
      err.resolved = true;
      return true;
    }
    return false;
  }

  // --- Settings ---
  public getSettings(): StoreSettings {
    return { ...this.data.settings };
  }

  public async updateSettings(
    newSettings: Partial<StoreSettings>,
    adminId: string,
    adminEmail: string
  ): Promise<StoreSettings> {
    const prev = { ...this.data.settings };
    const updated: StoreSettings = {
      ...this.data.settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
      updatedByAdminId: adminId,
      version: (this.data.settings.version || 1) + 1,
    };

    this.data.settings = updated;
    this.logAudit(adminId, adminEmail, 'UPDATE_STORE_SETTINGS', 'storeSettings', 'global', prev, updated);
    await this.persist();

    // Verify after saving
    const reloaded = this.reloadFromDisk();
    if (reloaded.settings.version !== updated.version) {
      throw new Error('Database write verification failed: reloaded version mismatch.');
    }

    return reloaded.settings;
  }

  // Protected reset defaults (ONLY with explicit confirmation keyword)
  public async restoreDefaults(adminId: string, adminEmail: string, confirmation: string): Promise<boolean> {
    if (confirmation !== 'CONFIRM_RESET_AKASH_STORE' && confirmation !== 'CONFIRM_RESET_AKAZA_STORE') {
      throw new Error('Invalid reset confirmation token. Type CONFIRM_RESET_AKASH_STORE to proceed.');
    }
    const prev = {
      settings: this.data.settings,
      plansCount: this.data.plans.length,
      gloryPlansCount: this.data.gloryPlans.length,
    };
    this.data.settings = { ...INITIAL_SETTINGS, updatedAt: new Date().toISOString(), updatedByAdminId: adminId, version: (this.data.settings.version || 1) + 1 };
    this.data.plans = JSON.parse(JSON.stringify(INITIAL_LIKES_PLANS));
    this.data.gloryPlans = JSON.parse(JSON.stringify(INITIAL_GLORY_PLANS));

    this.logAudit(adminId, adminEmail, 'RESTORE_DEFAULT_SETTINGS', 'system', 'all', prev, { reset: true });
    await this.persist();
    return true;
  }

  // --- Likes Plans ---
  public getPlans(includeDisabled: boolean = false): Plan[] {
    if (includeDisabled) {
      return [...this.data.plans].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return this.data.plans
      .filter(p => p.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public getPlanById(id: string): Plan | undefined {
    return this.data.plans.find(p => p.id === id);
  }

  public async createPlan(planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'version'>, adminId: string, adminEmail: string): Promise<Plan> {
    const newPlan: Plan = {
      ...planData,
      id: `plan_likes_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    this.data.plans.push(newPlan);
    this.logAudit(adminId, adminEmail, 'CREATE_LIKES_PLAN', 'plans', newPlan.id, null, newPlan);
    await this.persist();
    return newPlan;
  }

  public async updatePlan(id: string, updates: Partial<Plan>, adminId: string, adminEmail: string): Promise<Plan> {
    const index = this.data.plans.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Plan with ID ${id} not found.`);
    }
    const prev = { ...this.data.plans[index] };
    const updated: Plan = {
      ...prev,
      ...updates,
      id: prev.id, // prevent id mutation
      updatedAt: new Date().toISOString(),
      version: (prev.version || 1) + 1,
    };
    this.data.plans[index] = updated;
    this.logAudit(adminId, adminEmail, 'UPDATE_LIKES_PLAN', 'plans', id, prev, updated);
    await this.persist();

    // Verify written plan from disk
    const reloaded = this.reloadFromDisk();
    const check = reloaded.plans.find(p => p.id === id);
    if (!check || check.price !== updated.price || check.likesQuantity !== updated.likesQuantity) {
      throw new Error('Database write verification failed: reloaded plan values did not match submitted values.');
    }
    return check;
  }

  public async deletePlan(id: string, adminId: string, adminEmail: string): Promise<boolean> {
    const plan = this.getPlanById(id);
    if (!plan) throw new Error('Plan not found.');
    // Check if orders exist for this plan
    const hasOrders = this.data.orders.some(o => o.planId === id);
    if (hasOrders) {
      throw new Error('Cannot delete plan: orders exist with this plan. Disable the plan instead to prevent new purchases.');
    }
    this.data.plans = this.data.plans.filter(p => p.id !== id);
    this.logAudit(adminId, adminEmail, 'DELETE_LIKES_PLAN', 'plans', id, plan, null);
    await this.persist();
    return true;
  }

  // --- Glory Bot Plans ---
  public getGloryPlans(includeDisabled: boolean = false): GloryPlan[] {
    if (includeDisabled) {
      return [...this.data.gloryPlans].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return this.data.gloryPlans
      .filter(p => p.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public getGloryPlanById(id: string): GloryPlan | undefined {
    return this.data.gloryPlans.find(p => p.id === id);
  }

  public async createGloryPlan(planData: Omit<GloryPlan, 'id' | 'createdAt' | 'updatedAt' | 'version'>, adminId: string, adminEmail: string): Promise<GloryPlan> {
    const newPlan: GloryPlan = {
      ...planData,
      id: `plan_glory_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    this.data.gloryPlans.push(newPlan);
    this.logAudit(adminId, adminEmail, 'CREATE_GLORY_PLAN', 'gloryPlans', newPlan.id, null, newPlan);
    await this.persist();
    return newPlan;
  }

  public async updateGloryPlan(id: string, updates: Partial<GloryPlan>, adminId: string, adminEmail: string): Promise<GloryPlan> {
    const index = this.data.gloryPlans.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Glory Plan with ID ${id} not found.`);
    }
    const prev = { ...this.data.gloryPlans[index] };
    const updated: GloryPlan = {
      ...prev,
      ...updates,
      id: prev.id,
      updatedAt: new Date().toISOString(),
      version: (prev.version || 1) + 1,
    };
    this.data.gloryPlans[index] = updated;
    this.logAudit(adminId, adminEmail, 'UPDATE_GLORY_PLAN', 'gloryPlans', id, prev, updated);
    await this.persist();

    // Verify written plan from disk
    const reloaded = this.reloadFromDisk();
    const check = reloaded.gloryPlans.find(p => p.id === id);
    if (!check || check.price !== updated.price || check.gloryQuantity !== updated.gloryQuantity) {
      throw new Error('Database write verification failed: reloaded glory plan values did not match submitted values.');
    }
    return check;
  }

  public async deleteGloryPlan(id: string, adminId: string, adminEmail: string): Promise<boolean> {
    const plan = this.getGloryPlanById(id);
    if (!plan) throw new Error('Glory plan not found.');
    const hasOrders = this.data.orders.some(o => o.planId === id);
    if (hasOrders) {
      throw new Error('Cannot delete plan: orders exist with this plan. Disable the plan instead to prevent new purchases.');
    }
    this.data.gloryPlans = this.data.gloryPlans.filter(p => p.id !== id);
    this.logAudit(adminId, adminEmail, 'DELETE_GLORY_PLAN', 'gloryPlans', id, plan, null);
    await this.persist();
    return true;
  }

  // --- Users & Roles ---
  public getUsers(): Omit<User, 'passwordHash'>[] {
    return this.data.users.map(({ passwordHash, ...rest }) => rest);
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public async createUser(userData: { email: string; username: string; passwordHash: string; role: 'admin' | 'customer' }): Promise<User> {
    const existing = this.getUserByEmail(userData.email);
    if (existing) {
      throw new Error('A user with this email address already exists.');
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: userData.email.toLowerCase().trim(),
      username: userData.username.trim(),
      passwordHash: userData.passwordHash,
      role: userData.role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    // Initialize wallet
    this.data.wallets[newUser.id] = {
      userId: newUser.id,
      balance: 0,
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    await this.persist();
    return newUser;
  }

  public async updateUserLastLogin(id: string): Promise<void> {
    const user = this.getUserById(id);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      await this.persist();
    }
  }

  public getAdminCount(): number {
    return this.data.users.filter(u => u.role === 'admin').length;
  }

  // --- Wallets & Financial Ledger (Atomic) ---
  public getWallet(userId: string): Wallet {
    if (!this.data.wallets[userId]) {
      this.data.wallets[userId] = {
        userId,
        balance: 0,
        updatedAt: new Date().toISOString(),
        version: 1,
      };
      this.saveSync(this.data);
    }
    return { ...this.data.wallets[userId] };
  }

  public getTransactions(userId?: string): WalletTransaction[] {
    if (userId) {
      return this.data.transactions.filter(t => t.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.data.transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Authoritative Atomic Payment Crediting:
   * Checks idempotency. If already credited, returns safely without double crediting.
   */
  public async creditWalletWithVerifiedPayment(
    paymentId: string,
    verifiedAmount: number,
    utr: string,
    providerOrderId: string
  ): Promise<{ success: boolean; alreadyCredited: boolean; transaction?: WalletTransaction; wallet?: Wallet }> {
    const payment = this.data.payments.find(p => p.id === paymentId);
    if (!payment) {
      throw new Error(`Payment record ${paymentId} not found.`);
    }

    if (payment.creditedToWallet) {
      console.warn(`[WALLET] Payment ${paymentId} already credited. Idempotency triggered.`);
      return {
        success: true,
        alreadyCredited: true,
        wallet: this.getWallet(payment.userId),
      };
    }

    if (payment.amount !== verifiedAmount) {
      const err = `Payment amount mismatch: Expected ₹${payment.amount}, provider verified ₹${verifiedAmount}`;
      payment.status = 'failed';
      payment.failureReason = err;
      this.logIntegrationError('famgateway', 'verify', err);
      await this.persist();
      throw new Error(err);
    }

    const wallet = this.getWallet(payment.userId);
    const newBalance = wallet.balance + verifiedAmount;

    wallet.balance = newBalance;
    wallet.updatedAt = new Date().toISOString();
    wallet.version = (wallet.version || 1) + 1;
    this.data.wallets[payment.userId] = wallet;

    payment.status = 'success';
    payment.creditedToWallet = true;
    payment.creditedAt = new Date().toISOString();
    payment.utr = utr;
    payment.providerOrderId = providerOrderId;
    payment.updatedAt = new Date().toISOString();

    const transaction: WalletTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: payment.userId,
      amount: verifiedAmount,
      balanceAfter: newBalance,
      type: 'deposit',
      referenceId: payment.id,
      status: 'success',
      reason: `UPI Deposit via FamGateway (UTR: ${utr || 'N/A'})`,
      createdAt: new Date().toISOString(),
    };

    this.data.transactions.unshift(transaction);
    await this.persist();

    return {
      success: true,
      alreadyCredited: false,
      transaction,
      wallet,
    };
  }

  /**
   * Authoritative Atomic Wallet Debit for Order Checkout
   */
  public async debitWalletForOrder(
    userId: string,
    amount: number,
    orderDetails: {
      productType: ProductType;
      planId: string;
      planName: string;
      quantity: number;
      freeFireUid: string;
      guildId?: string;
    }
  ): Promise<{ order: Order; transaction: WalletTransaction; newBalance: number }> {
    const wallet = this.getWallet(userId);
    if (wallet.balance < amount) {
      throw new Error(`Insufficient wallet balance. You have ₹${wallet.balance.toFixed(2)}, required ₹${amount.toFixed(2)}. Please recharge your wallet first.`);
    }

    const user = this.getUserById(userId);
    const newBalance = wallet.balance - amount;
    wallet.balance = newBalance;
    wallet.updatedAt = new Date().toISOString();
    wallet.version = (wallet.version || 1) + 1;
    this.data.wallets[userId] = wallet;

    const orderId = `AKZ-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const order: Order = {
      id: orderId,
      userId,
      userEmail: user?.email || '',
      productType: orderDetails.productType,
      planId: orderDetails.planId,
      planName: orderDetails.planName,
      quantitySnapshot: orderDetails.quantity,
      priceSnapshot: amount,
      freeFireUid: orderDetails.freeFireUid,
      guildId: orderDetails.guildId,
      status: 'processing',
      paymentMethod: 'wallet',
      paymentReference: `WALLET_DEDUCTION_${orderId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.orders.unshift(order);

    const transaction: WalletTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      amount: -amount,
      balanceAfter: newBalance,
      type: 'order_purchase',
      referenceId: order.id,
      status: 'success',
      reason: `Purchased ${orderDetails.planName} (${orderDetails.quantity} ${orderDetails.productType === 'likes' ? 'Likes' : 'Glory'})`,
      createdAt: new Date().toISOString(),
    };
    this.data.transactions.unshift(transaction);

    await this.persist();
    return { order, transaction, newBalance };
  }

  // Admin Manual Wallet Adjustment
  public async adjustUserWallet(
    userId: string,
    amount: number,
    reason: string,
    adminId: string,
    adminEmail: string
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const wallet = this.getWallet(userId);
    const prevBalance = wallet.balance;
    const newBalance = prevBalance + amount;

    if (newBalance < 0) {
      throw new Error(`Adjustment would result in negative balance (₹${newBalance.toFixed(2)}). Operation rejected.`);
    }

    wallet.balance = newBalance;
    wallet.updatedAt = new Date().toISOString();
    wallet.version = (wallet.version || 1) + 1;
    this.data.wallets[userId] = wallet;

    const transaction: WalletTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      amount,
      balanceAfter: newBalance,
      type: 'admin_adjustment',
      referenceId: `ADMIN_${adminId}`,
      status: 'success',
      reason: `Admin adjustment: ${reason}`,
      createdAt: new Date().toISOString(),
    };
    this.data.transactions.unshift(transaction);

    this.logAudit(adminId, adminEmail, 'MANUAL_WALLET_ADJUSTMENT', 'wallets', userId, { balance: prevBalance }, { balance: newBalance, adjustment: amount, reason });
    await this.persist();
    return { wallet, transaction };
  }

  // --- Payments ---
  public getPayments(userId?: string): PaymentRecord[] {
    if (userId) {
      return this.data.payments.filter(p => p.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.data.payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getPaymentById(id: string): PaymentRecord | undefined {
    return this.data.payments.find(p => p.id === id);
  }

  public getPaymentByProviderOrderId(providerOrderId: string): PaymentRecord | undefined {
    return this.data.payments.find(p => p.providerOrderId === providerOrderId);
  }

  public async createPaymentRecord(paymentData: {
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
    idempotencyKey: string;
    expiresAt?: string;
  }): Promise<PaymentRecord> {
    const id = `PAY-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const payment: PaymentRecord = {
      id,
      userId: paymentData.userId,
      userEmail: paymentData.userEmail,
      amount: paymentData.amount,
      provider: paymentData.provider,
      providerOrderId: paymentData.providerOrderId,
      qrUrl: paymentData.qrUrl,
      upiIntent: paymentData.upiIntent,
      paymentUrl: paymentData.paymentUrl,
      merchantName: paymentData.merchantName,
      merchantUpi: paymentData.merchantUpi,
      status: 'pending',
      creditedToWallet: false,
      idempotencyKey: paymentData.idempotencyKey,
      expiresAt: paymentData.expiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.payments.unshift(payment);
    await this.persist();
    return payment;
  }

  public async updatePaymentStatus(id: string, status: PaymentRecord['status'], failureReason?: string): Promise<PaymentRecord> {
    const payment = this.getPaymentById(id);
    if (!payment) throw new Error('Payment record not found.');
    payment.status = status;
    if (failureReason) payment.failureReason = failureReason;
    payment.updatedAt = new Date().toISOString();
    await this.persist();
    return payment;
  }

  // --- Orders ---
  public getOrders(userId?: string): Order[] {
    if (userId) {
      return this.data.orders.filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.data.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id);
  }

  public async updateOrderStatus(
    id: string,
    status: OrderStatus,
    adminCompletionMessage?: string,
    adminNotes?: string,
    adminId?: string,
    adminEmail?: string
  ): Promise<Order> {
    const order = this.getOrderById(id);
    if (!order) throw new Error('Order not found.');
    const prev = { ...order };

    order.status = status;
    if (adminCompletionMessage !== undefined) order.adminCompletionMessage = adminCompletionMessage;
    if (adminNotes !== undefined) order.adminNotes = adminNotes;
    order.updatedAt = new Date().toISOString();

    if (adminId && adminEmail) {
      this.logAudit(adminId, adminEmail, 'UPDATE_ORDER_STATUS', 'orders', id, prev, { status, adminCompletionMessage, adminNotes });
    }

    await this.persist();
    return order;
  }

  // --- Broadcast Notifications ---
  public getNotifications(activeOnly: boolean = false): BroadcastNotification[] {
    if (activeOnly) {
      return this.data.notifications.filter(n => n.active).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.data.notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createNotification(
    notif: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'alert' },
    adminId: string,
    adminEmail: string
  ): Promise<BroadcastNotification> {
    const item: BroadcastNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      active: true,
      createdAt: new Date().toISOString(),
      createdByAdmin: adminEmail,
    };
    this.data.notifications.unshift(item);
    this.logAudit(adminId, adminEmail, 'CREATE_BROADCAST', 'notifications', item.id, null, item);
    await this.persist();
    return item;
  }

  public async toggleNotification(id: string, adminId: string, adminEmail: string): Promise<BroadcastNotification> {
    const item = this.data.notifications.find(n => n.id === id);
    if (!item) throw new Error('Notification not found.');
    item.active = !item.active;
    this.logAudit(adminId, adminEmail, 'TOGGLE_BROADCAST', 'notifications', id, { active: !item.active }, { active: item.active });
    await this.persist();
    return item;
  }

  public async deleteNotification(id: string, adminId: string, adminEmail: string): Promise<boolean> {
    const index = this.data.notifications.findIndex(n => n.id === id);
    if (index === -1) throw new Error('Notification not found.');
    const item = this.data.notifications[index];
    this.data.notifications.splice(index, 1);
    this.logAudit(adminId, adminEmail, 'DELETE_BROADCAST', 'notifications', id, item, null);
    await this.persist();
    return true;
  }

  // --- Support Tickets ---
  public async createSupportTicket(ticketData: {
    userId: string;
    customerName: string;
    customerEmail: string;
    orderReference?: string;
    category: TicketCategory;
    description: string;
  }): Promise<SupportTicket> {
    const id = `TCK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const newTicket: SupportTicket = {
      id,
      userId: ticketData.userId,
      customerName: ticketData.customerName.trim(),
      customerEmail: ticketData.customerEmail.trim(),
      orderReference: ticketData.orderReference ? ticketData.orderReference.trim() : undefined,
      category: ticketData.category,
      description: ticketData.description.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.data.supportTickets) {
      this.data.supportTickets = [];
    }

    this.data.supportTickets.unshift(newTicket);
    await this.persist();
    return newTicket;
  }

  public getSupportTickets(userId?: string, userEmail?: string): SupportTicket[] {
    if (!this.data.supportTickets) {
      this.data.supportTickets = [];
    }
    if (userId || userEmail) {
      const emailLower = userEmail?.toLowerCase();
      return this.data.supportTickets
        .filter(t => (userId && t.userId === userId) || (emailLower && t.customerEmail?.toLowerCase() === emailLower))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.data.supportTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getSupportTicketById(id: string): SupportTicket | undefined {
    if (!this.data.supportTickets) {
      this.data.supportTickets = [];
    }
    return this.data.supportTickets.find(t => t.id === id);
  }

  public async updateSupportTicketReply(
    id: string,
    status: TicketStatus,
    adminReply: string,
    adminId: string,
    adminEmail: string
  ): Promise<SupportTicket> {
    const ticket = this.getSupportTicketById(id);
    if (!ticket) throw new Error(`Support ticket ${id} not found.`);

    const prev = { status: ticket.status, adminReply: ticket.adminReply };
    ticket.status = status;
    ticket.adminReply = adminReply.trim();
    ticket.adminReplyAt = new Date().toISOString();
    ticket.adminRepliedBy = adminEmail;
    ticket.updatedAt = new Date().toISOString();

    this.logAudit(adminId, adminEmail, 'REPLY_SUPPORT_TICKET', 'supportTickets', id, prev, { status, adminReply: ticket.adminReply });
    await this.persist();
    return ticket;
  }

  public async updateSupportTicketStatus(
    id: string,
    status: TicketStatus,
    adminId: string,
    adminEmail: string
  ): Promise<SupportTicket> {
    const ticket = this.getSupportTicketById(id);
    if (!ticket) throw new Error(`Support ticket ${id} not found.`);

    const prev = { status: ticket.status };
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();

    this.logAudit(adminId, adminEmail, 'UPDATE_SUPPORT_TICKET_STATUS', 'supportTickets', id, prev, { status });
    await this.persist();
    return ticket;
  }
}

export const db = new Database();
