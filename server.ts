import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './server/db.ts';
import { famGateway } from './server/famgateway.ts';
import { User, UserRole, OrderStatus, ProductType, TicketCategory, TicketStatus } from './server/types.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'AKAZA_SECRET_KEY_CHANGE_IN_PRODUCTION';

// Parse JSON & raw body for webhooks
app.use(cors());
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Anti-stale cache middleware for all API routes
app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Extend Express Request for authenticated user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
  };
}

// Authentication middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err || !decoded || !decoded.id) {
      res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
      return;
    }
    const user = db.getUserById(decoded.id);
    if (!user) {
      res.status(403).json({ error: 'User account no longer exists.' });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    next();
  });
}

// Admin authorization middleware
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access denied. Insufficient privileges.' });
    return;
  }
  next();
}

// -----------------------------------------------------------------------------
// PUBLIC & AUTH ROUTES
// -----------------------------------------------------------------------------

// Store Health & System Diagnostic
app.get('/api/health', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storeName: settings.storeName,
    settingsVersion: settings.version,
    famGatewayConfigured: famGateway.isConfigured(),
    adminCount: db.getAdminCount(),
  });
});

// Initial Admin Setup (ONLY available if NO admin account exists yet)
app.get('/api/auth/setup-status', (_req: Request, res: Response) => {
  const adminCount = db.getAdminCount();
  res.json({
    hasAdmin: adminCount > 0,
    adminCount,
  });
});

app.post('/api/auth/setup-admin', async (req: Request, res: Response) => {
  try {
    const adminCount = db.getAdminCount();
    if (adminCount > 0) {
      res.status(400).json({ error: 'Admin account already exists. Setup is locked.' });
      return;
    }

    const { email, username, password } = req.body;
    if (!email || !username || !password || password.length < 8) {
      res.status(400).json({ error: 'Email, username, and password (at least 8 chars) are required.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await db.createUser({
      email,
      username,
      passwordHash,
      role: 'admin',
    });

    db.logAudit(admin.id, admin.email, 'INITIAL_ADMIN_SETUP', 'users', admin.id, null, { email: admin.email, role: 'admin' });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Initial administrator successfully configured.',
      token,
      user: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error creating administrator' });
  }
});

// Customer Registration (Strictly creates 'customer' role; cannot create admin)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'Please provide email, username, and password.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.createUser({
      email,
      username,
      passwordHash,
      role: 'customer', // Always customer
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
      },
      wallet: db.getWallet(newUser.id),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// User Login (Customer or Admin)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Please enter your email and password.' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    await db.updateUserLastLogin(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      wallet: db.getWallet(user.id),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login error' });
  }
});

// Current User Profile & Balance Check
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const wallet = db.getWallet(user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    wallet,
  });
});

// -----------------------------------------------------------------------------
// PUBLIC STOREFRONT ENDPOINTS
// -----------------------------------------------------------------------------

// Public Store Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    storeName: settings.storeName,
    maintenanceMode: settings.maintenanceMode,
    minDepositINR: settings.minDepositINR,
    maxDepositINR: settings.maxDepositINR,
    likesServiceNotice: settings.likesServiceNotice,
    gloryBotServiceNotice: settings.gloryBotServiceNotice,
    supportTelegram: settings.supportTelegram,
    supportWhatsapp: settings.supportWhatsapp,
    supportWhatsappNumber: process.env.SUPPORT_WHATSAPP_NUMBER ? process.env.SUPPORT_WHATSAPP_NUMBER.replace(/\+/g, '').trim() : '',
    supportEmail: process.env.SUPPORT_EMAIL ? process.env.SUPPORT_EMAIL.trim() : '',
    famGatewayConfigured: famGateway.isConfigured(),
    updatedAt: settings.updatedAt,
    version: settings.version,
  });
});

// Public Active Likes Plans
app.get('/api/plans', (_req: Request, res: Response) => {
  const plans = db.getPlans(false);
  res.json(plans);
});

// Public Active Glory Plans
app.get('/api/glory-plans', (_req: Request, res: Response) => {
  const plans = db.getGloryPlans(false);
  res.json(plans);
});

// Public Broadcast Notifications
app.get('/api/notifications', (_req: Request, res: Response) => {
  const notifications = db.getNotifications(true);
  res.json(notifications);
});

// -----------------------------------------------------------------------------
// CUSTOMER AUTHENTICATED ENDPOINTS
// -----------------------------------------------------------------------------

// Customer Wallet & Transactions
app.get('/api/wallet', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const wallet = db.getWallet(req.user!.id);
  res.json(wallet);
});

app.get('/api/wallet/transactions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const transactions = db.getTransactions(req.user!.id);
  res.json(transactions);
});

// Customer Order: Likes Store
app.post('/api/orders/likes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, freeFireUid } = req.body;
    if (!planId || !freeFireUid) {
      res.status(400).json({ error: 'Plan ID and Free Fire UID are required.' });
      return;
    }

    const cleanUid = String(freeFireUid).trim();
    if (cleanUid.length < 6 || cleanUid.length > 15) {
      res.status(400).json({ error: 'Please enter a valid Free Fire UID (typically 7-12 digits).' });
      return;
    }

    // Server-side authoritative price and plan check! NEVER trust client price!
    const plan = db.getPlanById(planId);
    if (!plan || !plan.enabled) {
      res.status(404).json({ error: 'This likes plan is currently unavailable or disabled.' });
      return;
    }

    if (!plan.inStock) {
      res.status(400).json({ error: 'This plan is currently out of stock. Please check back later.' });
      return;
    }

    const result = await db.debitWalletForOrder(req.user!.id, plan.price, {
      productType: 'likes',
      planId: plan.id,
      planName: plan.name,
      quantity: plan.likesQuantity,
      freeFireUid: cleanUid,
    });

    res.status(201).json({
      message: 'Likes order successfully placed and queued for delivery!',
      order: result.order,
      transaction: result.transaction,
      newBalance: result.newBalance,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Order creation failed' });
  }
});

// Customer Order: Glory Bot
app.post('/api/orders/glory', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, freeFireUid, guildId } = req.body;
    if (!planId || !freeFireUid) {
      res.status(400).json({ error: 'Plan ID and Free Fire UID are required.' });
      return;
    }

    const cleanUid = String(freeFireUid).trim();
    const cleanGuildId = guildId ? String(guildId).trim() : cleanUid;

    // Server-side authoritative price and plan check!
    const plan = db.getGloryPlanById(planId);
    if (!plan || !plan.enabled) {
      res.status(404).json({ error: 'This Glory Bot plan is currently unavailable or disabled.' });
      return;
    }

    if (!plan.inStock) {
      res.status(400).json({ error: 'This Glory Bot package is currently out of stock.' });
      return;
    }

    const result = await db.debitWalletForOrder(req.user!.id, plan.price, {
      productType: 'glory_bot',
      planId: plan.id,
      planName: plan.name,
      quantity: plan.gloryQuantity,
      freeFireUid: cleanUid,
      guildId: cleanGuildId,
    });

    res.status(201).json({
      message: 'Glory Bot boost order successfully initiated and assigned!',
      order: result.order,
      transaction: result.transaction,
      newBalance: result.newBalance,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Glory order creation failed' });
  }
});

// Customer Orders List
app.get('/api/orders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const orders = db.getOrders(req.user!.id);
  res.json(orders);
});

// -----------------------------------------------------------------------------
// CUSTOMER CONTACT SUPPORT ENDPOINTS
// -----------------------------------------------------------------------------

// Create Support Ticket
app.post('/api/support/tickets', async (req: Request, res: Response) => {
  try {
    // Optional token auth to auto-associate with logged-in user
    let authenticatedUser: any = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        authenticatedUser = jwt.verify(token, JWT_SECRET);
      } catch {
        // Token invalid or expired, continue
      }
    }

    const { customerName, customerEmail, orderReference, category, description } = req.body;

    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      res.status(400).json({ error: 'Customer name is required.' });
      return;
    }

    const cleanEmail = String(customerEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: 'A valid email address is required so we can reply to you.' });
      return;
    }

    const validCategories: TicketCategory[] = [
      'Payment/QR Problem',
      'Payment Verification',
      'Wallet Balance',
      'Order Problem',
      'Likes Store',
      'Glory Bot',
      'Other'
    ];

    if (!category || !validCategories.includes(category as TicketCategory)) {
      res.status(400).json({
        error: `Please select a valid category: ${validCategories.join(', ')}`
      });
      return;
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      res.status(400).json({ error: 'Please provide a detailed problem description (at least 10 characters).' });
      return;
    }

    // Security: sanitize description to prevent storing or exposing API keys, passwords, or tokens
    const sanitizedDescription = description.trim()
      .replace(/ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[REDACTED_TOKEN]')
      .replace(/(password|passwd|api_key|secret|token)\s*[:=]\s*[^\s,]+/gi, '$1=[REDACTED]');

    const userId = authenticatedUser?.id || (db.getUserByEmail(cleanEmail)?.id) || `guest_${Date.now()}`;

    const ticket = await db.createSupportTicket({
      userId,
      customerName: customerName.trim(),
      customerEmail: cleanEmail,
      orderReference: orderReference ? String(orderReference).trim() : undefined,
      category: category as TicketCategory,
      description: sanitizedDescription,
    });

    res.status(201).json({
      message: 'Support ticket submitted successfully. Our team will review and reply shortly.',
      ticket,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit support ticket.' });
  }
});

// Customer Ticket History
app.get('/api/support/tickets', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tickets = db.getSupportTickets(req.user!.id, req.user!.email);
  res.json(tickets);
});

// Customer View Specific Ticket (Access restrictions: owner or admin only)
app.get('/api/support/tickets/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const ticket = db.getSupportTicketById(id);
  if (!ticket) {
    res.status(404).json({ error: 'Support ticket not found.' });
    return;
  }

  const isOwner = ticket.userId === req.user!.id || ticket.customerEmail.toLowerCase() === req.user!.email.toLowerCase();
  const isAdmin = req.user!.role === 'admin';
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: 'Access denied: You do not have permission to view this support ticket.' });
    return;
  }

  res.json(ticket);
});

// -----------------------------------------------------------------------------
// REAL FAMGATEWAY PAYMENT INTEGRATION
// -----------------------------------------------------------------------------

// Initiate Real UPI Payment Session via FamGateway
app.post('/api/payments/create-intent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      res.status(400).json({ error: 'Please enter a valid deposit amount in INR.' });
      return;
    }

    const settings = db.getSettings();
    if (depositAmount < settings.minDepositINR) {
      res.status(400).json({ error: `Minimum deposit amount is ₹${settings.minDepositINR}.` });
      return;
    }

    if (depositAmount > settings.maxDepositINR) {
      res.status(400).json({ error: `Maximum deposit amount is ₹${settings.maxDepositINR}.` });
      return;
    }

    if (!famGateway.isConfigured()) {
      res.status(503).json({
        error: 'FamGateway UPI Payment Gateway is not configured yet on this server. Please add your FAMGATEWAY_API_KEY in server secrets.',
        isConfigured: false,
      });
      return;
    }

    const idempotencyKey = `PAY_IDEMP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const merchantOrderId = `ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Call real FamGateway API
    const providerResult = await famGateway.createOrder({
      amount: depositAmount,
      customerName: req.user!.username,
      customerEmail: req.user!.email,
      merchantOrderId,
    });

    const expiresInSeconds = providerResult.expiresIn || 600;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // Create persistent payment record
    const payment = await db.createPaymentRecord({
      userId: req.user!.id,
      userEmail: req.user!.email,
      amount: providerResult.amount,
      provider: 'famgateway',
      providerOrderId: providerResult.providerOrderId,
      qrUrl: providerResult.qrUrl,
      upiIntent: providerResult.upiIntent,
      paymentUrl: providerResult.paymentUrl,
      merchantName: providerResult.merchantName,
      merchantUpi: providerResult.merchantUpi,
      expiresAt,
      idempotencyKey,
    });

    res.status(201).json({
      message: 'FamGateway UPI payment session initiated.',
      paymentId: payment.id,
      providerOrderId: providerResult.providerOrderId,
      amount: providerResult.amount,
      qrUrl: providerResult.qrUrl,
      upiIntent: providerResult.upiIntent,
      paymentUrl: providerResult.paymentUrl,
      merchantName: providerResult.merchantName,
      merchantUpi: providerResult.merchantUpi,
      expiresAt: payment.expiresAt,
      expiresIn: expiresInSeconds,
      status: payment.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment initiation failed' });
  }
});

// Authoritative Status Verification (Customer or periodic check)
app.post('/api/payments/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId, providerOrderId } = req.body;
    let payment = paymentId ? db.getPaymentById(paymentId) : (providerOrderId ? db.getPaymentByProviderOrderId(providerOrderId) : undefined);

    if (!payment) {
      res.status(404).json({ error: 'Payment record not found.' });
      return;
    }

    // Ensure customer can only verify their own payment
    if (payment.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: payment order belongs to another customer.' });
      return;
    }

    // If already credited, return idempotent success
    if (payment.creditedToWallet) {
      res.json({
        status: 'SUCCESS',
        message: 'Payment has already been verified and credited to your wallet.',
        alreadyCredited: true,
        wallet: db.getWallet(payment.userId),
        payment,
      });
      return;
    }

    // Check expiry
    const isExpired = payment.status === 'expired' || (payment.expiresAt && new Date() > new Date(payment.expiresAt));

    if (!famGateway.isConfigured()) {
      res.status(503).json({ error: 'FamGateway API key is not configured.' });
      return;
    }

    const orderIdToQuery = payment.providerOrderId || payment.id;
    let providerCheck: any;
    try {
      providerCheck = await famGateway.checkOrderStatus(orderIdToQuery);
    } catch (checkErr: any) {
      if (isExpired) {
        await db.updatePaymentStatus(payment.id, 'expired', 'Payment session timed out.');
        res.status(400).json({
          status: 'EXPIRED',
          error: 'This payment order has expired. Please initiate a new recharge order.',
          payment: db.getPaymentById(payment.id),
        });
        return;
      }
      res.status(502).json({
        error: `Failed to query payment status with FamGateway: ${checkErr.message}`,
        status: 'PENDING',
      });
      return;
    }

    if (providerCheck.status === 'SUCCESS') {
      // Authoritative Provider verified success! Credit wallet atomically.
      const creditResult = await db.creditWalletWithVerifiedPayment(
        payment.id,
        providerCheck.amount || payment.amount,
        providerCheck.utr || 'VERIFIED_BY_API',
        orderIdToQuery
      );

      res.json({
        status: 'SUCCESS',
        message: 'Payment successfully verified! Your wallet has been credited.',
        wallet: creditResult.wallet,
        transaction: creditResult.transaction,
        alreadyCredited: creditResult.alreadyCredited,
        payment: db.getPaymentById(payment.id),
      });
      return;
    } else if (providerCheck.status === 'FAILED') {
      await db.updatePaymentStatus(payment.id, 'failed', 'Provider reported payment failed.');
      res.json({
        status: 'FAILED',
        message: 'Payment verification failed at payment provider.',
        payment: db.getPaymentById(payment.id),
      });
      return;
    } else if (providerCheck.status === 'EXPIRED' || isExpired) {
      await db.updatePaymentStatus(payment.id, 'expired', 'Payment session expired.');
      res.json({
        status: 'EXPIRED',
        message: 'Payment session has expired. If you made the payment, please contact support with the reference ID.',
        payment: db.getPaymentById(payment.id),
      });
      return;
    } else {
      res.json({
        status: 'PENDING',
        message: 'Payment is still awaiting confirmation from your UPI app. Please complete the transaction in your UPI app and click verify.',
        payment: db.getPaymentById(payment.id),
      });
      return;
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
});

// FamGateway Webhook Handler with HMAC signature validation
app.post('/api/payments/webhook', async (req: any, res: Response) => {
  try {
    const signature = req.headers['x-famgateway-signature'] as string | undefined;
    const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);

    if (famGateway.isConfigured() && signature) {
      const isValid = famGateway.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[WEBHOOK] Invalid signature rejected from FamGateway.');
        res.status(401).json({ error: 'Invalid webhook signature.' });
        return;
      }
    }

    const { order_id, orderId, status, amount, utr } = req.body;
    const targetOrderId = order_id || orderId;

    if (!targetOrderId) {
      res.status(400).json({ error: 'Missing order_id in webhook payload.' });
      return;
    }

    const payment = db.getPaymentByProviderOrderId(targetOrderId) || db.getPaymentById(targetOrderId);
    if (!payment) {
      console.warn(`[WEBHOOK] Payment record for order ${targetOrderId} not found.`);
      res.status(404).json({ error: 'Payment record not found.' });
      return;
    }

    const statusUpper = String(status).toUpperCase();
    if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED' || status === true) {
      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      const creditResult = await db.creditWalletWithVerifiedPayment(
        payment.id,
        parsedAmount || payment.amount,
        utr || 'WEBHOOK_UTR',
        targetOrderId
      );
      res.json({ success: true, processed: true, alreadyCredited: creditResult.alreadyCredited });
      return;
    } else {
      res.json({ success: true, acknowledged: true });
      return;
    }
  } catch (err: any) {
    console.error('[WEBHOOK ERROR]', err);
    res.status(500).json({ error: err.message || 'Webhook processing error' });
  }
});

// -----------------------------------------------------------------------------
// ADMIN MANAGEMENT ENDPOINTS (Strictly requires user.role === 'admin')
// -----------------------------------------------------------------------------

// Admin Overview Metrics
app.get('/api/admin/overview', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers();
  const orders = db.getOrders();
  const payments = db.getPayments();
  const settings = db.getSettings();

  const totalRevenue = payments
    .filter(p => p.status === 'success' && p.creditedToWallet)
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingOrders = orders.filter(o => o.status === 'processing' || o.status === 'pending_payment').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;

  res.json({
    metrics: {
      totalUsers: users.length,
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      totalRevenueINR: totalRevenue,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
    },
    system: {
      settingsVersion: settings.version,
      updatedAt: settings.updatedAt,
      famGatewayConfigured: famGateway.isConfigured(),
    },
  });
});

// Likes Plans Management
app.get('/api/admin/plans', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json(db.getPlans(true));
});

app.post('/api/admin/plans', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, likesQuantity, price, description, inStock, enabled, sortOrder } = req.body;
    if (!name || !likesQuantity || price === undefined) {
      res.status(400).json({ error: 'Name, likes quantity, and price are required.' });
      return;
    }

    const plan = await db.createPlan(
      {
        name: String(name).trim(),
        likesQuantity: parseInt(likesQuantity, 10),
        price: parseFloat(price),
        description: description ? String(description).trim() : '',
        inStock: inStock !== false,
        enabled: enabled !== false,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 1,
      },
      req.user!.id,
      req.user!.email
    );

    res.status(201).json({ message: 'Likes plan created successfully.', plan });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create plan' });
  }
});

app.put('/api/admin/plans/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, likesQuantity, price, description, inStock, enabled, sortOrder } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (likesQuantity !== undefined) updates.likesQuantity = parseInt(likesQuantity, 10);
    if (price !== undefined) updates.price = parseFloat(price);
    if (description !== undefined) updates.description = String(description).trim();
    if (inStock !== undefined) updates.inStock = Boolean(inStock);
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (sortOrder !== undefined) updates.sortOrder = parseInt(sortOrder, 10);

    const updated = await db.updatePlan(id, updates, req.user!.id, req.user!.email);
    res.json({ message: 'Plan updated and verified in database.', plan: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update plan' });
  }
});

app.delete('/api/admin/plans/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.deletePlan(id, req.user!.id, req.user!.email);
    res.json({ message: 'Plan deleted successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete plan' });
  }
});

// Glory Bot Plans Management
app.get('/api/admin/glory-plans', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json(db.getGloryPlans(true));
});

app.post('/api/admin/glory-plans', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, gloryQuantity, price, description, inStock, enabled, sortOrder } = req.body;
    if (!name || !gloryQuantity || price === undefined) {
      res.status(400).json({ error: 'Name, glory quantity, and price are required.' });
      return;
    }

    const plan = await db.createGloryPlan(
      {
        name: String(name).trim(),
        gloryQuantity: parseInt(gloryQuantity, 10),
        price: parseFloat(price),
        description: description ? String(description).trim() : '',
        inStock: inStock !== false,
        enabled: enabled !== false,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 1,
      },
      req.user!.id,
      req.user!.email
    );

    res.status(201).json({ message: 'Glory Bot plan created successfully.', plan });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create glory plan' });
  }
});

app.put('/api/admin/glory-plans/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, gloryQuantity, price, description, inStock, enabled, sortOrder } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (gloryQuantity !== undefined) updates.gloryQuantity = parseInt(gloryQuantity, 10);
    if (price !== undefined) updates.price = parseFloat(price);
    if (description !== undefined) updates.description = String(description).trim();
    if (inStock !== undefined) updates.inStock = Boolean(inStock);
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (sortOrder !== undefined) updates.sortOrder = parseInt(sortOrder, 10);

    const updated = await db.updateGloryPlan(id, updates, req.user!.id, req.user!.email);
    res.json({ message: 'Glory plan updated and verified in database.', plan: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update glory plan' });
  }
});

app.delete('/api/admin/glory-plans/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.deleteGloryPlan(id, req.user!.id, req.user!.email);
    res.json({ message: 'Glory plan deleted successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete glory plan' });
  }
});

// Admin Store Settings
app.get('/api/admin/settings', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json(db.getSettings());
});

app.put('/api/admin/settings', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      storeName,
      maintenanceMode,
      minDepositINR,
      maxDepositINR,
      likesServiceNotice,
      gloryBotServiceNotice,
      supportTelegram,
      supportWhatsapp,
      famGatewayEnabled,
      famGatewayUpiId,
    } = req.body;

    const updates: any = {};
    if (storeName !== undefined) updates.storeName = String(storeName).trim();
    if (maintenanceMode !== undefined) updates.maintenanceMode = Boolean(maintenanceMode);
    if (minDepositINR !== undefined) updates.minDepositINR = parseFloat(minDepositINR);
    if (maxDepositINR !== undefined) updates.maxDepositINR = parseFloat(maxDepositINR);
    if (likesServiceNotice !== undefined) updates.likesServiceNotice = String(likesServiceNotice).trim();
    if (gloryBotServiceNotice !== undefined) updates.gloryBotServiceNotice = String(gloryBotServiceNotice).trim();
    if (supportTelegram !== undefined) updates.supportTelegram = String(supportTelegram).trim();
    if (supportWhatsapp !== undefined) updates.supportWhatsapp = String(supportWhatsapp).trim();
    if (famGatewayEnabled !== undefined) updates.famGatewayEnabled = Boolean(famGatewayEnabled);
    if (famGatewayUpiId !== undefined) updates.famGatewayUpiId = String(famGatewayUpiId).trim();

    const saved = await db.updateSettings(updates, req.user!.id, req.user!.email);
    res.json({ message: 'Store settings saved and verified in database.', settings: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update store settings' });
  }
});

// Explicit Protected Default Restoration
app.post('/api/admin/settings/restore-defaults', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { confirmation } = req.body;
    await db.restoreDefaults(req.user!.id, req.user!.email, confirmation);
    res.json({ message: 'Defaults successfully restored with audit trail logged.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to restore defaults' });
  }
});

// Admin Orders Management & Custom Completion Message
app.get('/api/admin/orders', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json(db.getOrders());
});

app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminCompletionMessage, adminNotes } = req.body;

    const validStatuses: OrderStatus[] = ['pending_payment', 'paid', 'processing', 'completed', 'rejected', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Valid options are: ${validStatuses.join(', ')}` });
      return;
    }

    const updated = await db.updateOrderStatus(
      id,
      status,
      adminCompletionMessage,
      adminNotes,
      req.user!.id,
      req.user!.email
    );

    res.json({ message: 'Order status updated successfully.', order: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update order' });
  }
});

// Admin Payments Management & Manual Reconciliation
app.get('/api/admin/payments', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json(db.getPayments());
});

app.post('/api/admin/payments/:id/reconcile', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, utr } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'A valid authoritative reconciliation reason is required for audit.' });
      return;
    }

    const payment = db.getPaymentById(id);
    if (!payment) {
      res.status(404).json({ error: 'Payment record not found.' });
      return;
    }

    if (payment.creditedToWallet) {
      res.status(400).json({ error: 'Payment is already credited. Cannot reconcile again.' });
      return;
    }

    const creditResult = await db.creditWalletWithVerifiedPayment(
      payment.id,
      payment.amount,
      utr || `MANUAL_RECON_BY_${req.user!.email}`,
      payment.providerOrderId || payment.id
    );

    db.logAudit(req.user!.id, req.user!.email, 'MANUAL_PAYMENT_RECONCILIATION', 'payments', payment.id, null, {
      amount: payment.amount,
      reason,
      utr,
    });

    res.json({
      message: 'Payment manually reconciled and wallet credited.',
      payment: db.getPaymentById(payment.id),
      wallet: creditResult.wallet,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reconcile payment' });
  }
});

// Admin Customers & Wallet Ledger
app.get('/api/admin/users', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers();
  const result = users.map(u => ({
    ...u,
    wallet: db.getWallet(u.id),
  }));
  res.json(result);
});

app.post('/api/admin/users/:id/adjust-wallet', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      res.status(400).json({ error: 'Adjustment amount must be a non-zero number in INR.' });
      return;
    }

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'Adjustment reason is required for the financial audit ledger.' });
      return;
    }

    const user = db.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const result = await db.adjustUserWallet(id, parsedAmount, reason.trim(), req.user!.id, req.user!.email);
    res.json({
      message: `User wallet successfully adjusted by ₹${parsedAmount > 0 ? '+' : ''}${parsedAmount.toFixed(2)}.`,
      wallet: result.wallet,
      transaction: result.transaction,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to adjust wallet' });
  }
});

// Admin Audit Logs & Error Logs
app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json(db.getAuditLogs());
});

app.get('/api/admin/errors', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json(db.getIntegrationErrors());
});

app.put('/api/admin/errors/:id/resolve', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const success = db.resolveIntegrationError(id);
  res.json({ success });
});

// Admin Broadcast Announcements
app.post('/api/admin/broadcasts', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: 'Title and message are required.' });
      return;
    }
    const notif = await db.createNotification(
      { title, message, type: type || 'info' },
      req.user!.id,
      req.user!.email
    );
    res.status(201).json({ message: 'Broadcast notification published.', notification: notif });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create broadcast' });
  }
});

app.put('/api/admin/broadcasts/:id/toggle', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notif = await db.toggleNotification(id, req.user!.id, req.user!.email);
    res.json({ message: 'Broadcast status toggled.', notification: notif });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to toggle broadcast' });
  }
});

app.delete('/api/admin/broadcasts/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.deleteNotification(id, req.user!.id, req.user!.email);
    res.json({ message: 'Broadcast notification deleted.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete broadcast' });
  }
});

// Admin Support Tickets Management
app.get('/api/admin/support/tickets', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const tickets = db.getSupportTickets();
  res.json(tickets);
});

app.put('/api/admin/support/tickets/:id/reply', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { adminReply, status } = req.body;

    if (!adminReply || typeof adminReply !== 'string' || !adminReply.trim()) {
      res.status(400).json({ error: 'Admin reply message cannot be empty.' });
      return;
    }

    const validStatuses: TicketStatus[] = ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'];
    const chosenStatus: TicketStatus = (status && validStatuses.includes(status)) ? status : 'resolved';

    // Security check: ensure admin reply does not leak sensitive keys or credentials
    const sanitizedReply = adminReply.trim()
      .replace(/ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[REDACTED_TOKEN]')
      .replace(/(password|passwd|api_key|secret|token)\s*[:=]\s*[^\s,]+/gi, '$1=[REDACTED]');

    const updated = await db.updateSupportTicketReply(
      id,
      chosenStatus,
      sanitizedReply,
      req.user!.id,
      req.user!.email
    );

    res.json({ message: 'Support ticket updated with admin reply.', ticket: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update support ticket' });
  }
});

app.put('/api/admin/support/tickets/:id/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: TicketStatus[] = ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Valid options are: ${validStatuses.join(', ')}` });
      return;
    }

    const updated = await db.updateSupportTicketStatus(id, status, req.user!.id, req.user!.email);
    res.json({ message: `Ticket status updated to ${status}.`, ticket: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update ticket status' });
  }
});

// -----------------------------------------------------------------------------
// FRONTEND INTEGRATION (Vite in development / Static in production)
// -----------------------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AKASH] Server running at http://0.0.0.0:${PORT} (Mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
