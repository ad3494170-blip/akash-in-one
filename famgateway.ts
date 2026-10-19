import crypto from 'crypto';
import QRCode from 'qrcode';
import { db } from './db.ts';

const FAMGATEWAY_BASE_URL = 'https://famgateway.in';

export interface FamGatewayCreateOrderResponse {
  status: boolean;
  message?: string;
  order_id?: string;
  orderId?: string;
  qr_url?: string;
  qr_code?: string;
  upi_intent?: string;
  upi_link?: string;
  payment_url?: string;
  checkout_url?: string;
  amount?: number | string;
  merchant_name?: string;
  merchant_upi?: string;
  upi_id?: string;
  expires_in?: number;
  data?: any;
}

export interface FamGatewayStatusResponse {
  status: 'SUCCESS' | 'PENDING' | 'EXPIRED' | 'FAILED' | boolean | string;
  order_id?: string;
  amount?: number | string;
  utr?: string;
  txn_id?: string;
  message?: string;
}

export class FamGatewayService {
  private getApiKey(): string | null {
    const key = process.env.FAMGATEWAY_API_KEY;
    if (!key || key.trim() === '' || key.includes('YOUR_FAMGATEWAY_API_KEY')) {
      return null;
    }
    return key.trim();
  }

  public isConfigured(): boolean {
    return this.getApiKey() !== null;
  }

  /**
   * Create payment order with FamGateway provider API.
   * Strictly validates provider response and guarantees a real, scannable QR code.
   * Never generates fake or placeholder QR codes.
   */
  public async createOrder(params: {
    amount: number;
    customerName: string;
    customerEmail: string;
    merchantOrderId: string;
    redirectUrl?: string;
  }): Promise<{
    providerOrderId: string;
    qrUrl: string;
    upiIntent?: string;
    paymentUrl?: string;
    amount: number;
    merchantName?: string;
    merchantUpi?: string;
    expiresIn: number;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(
        'FamGateway is not configured yet. Live UPI payments require a valid FAMGATEWAY_API_KEY in server secrets.'
      );
    }

    const payload = {
      amount: params.amount,
      customer_name: params.customerName || 'AKASH Customer',
      customer_email: params.customerEmail,
      merchant_order_id: params.merchantOrderId,
      redirect_url: params.redirectUrl || '',
      remarks: `AKASH Wallet Deposit - ${params.merchantOrderId}`,
    };

    let response: Response;
    try {
      response = await fetch(`${FAMGATEWAY_BASE_URL}/api/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr: any) {
      db.logIntegrationError('famgateway', '/api/create-order', networkErr.message || 'Network error');
      throw new Error(`FamGateway gateway is currently unreachable: ${networkErr.message}`);
    }

    if (!response.ok) {
      const errText = await response.text();
      db.logIntegrationError('famgateway', '/api/create-order', `Status: ${response.status}, Body: ${errText}`);
      throw new Error(`FamGateway API rejected order creation (${response.status}): ${errText}`);
    }

    const data: FamGatewayCreateOrderResponse = await response.json();
    const rootData = data.data || data;

    const providerOrderId = rootData.order_id || rootData.orderId || data.order_id || data.orderId;
    if (!providerOrderId) {
      const msg = data.message || rootData.message || 'FamGateway returned an unsuccessful response without an order ID';
      db.logIntegrationError('famgateway', '/api/create-order', msg);
      throw new Error(msg);
    }

    const rawQrUrl = rootData.qr_url || rootData.qr_code || data.qr_url || data.qr_code;
    const upiIntent = rootData.upi_intent || rootData.upi_link || data.upi_intent || data.upi_link;
    const paymentUrl = rootData.payment_url || rootData.checkout_url || data.payment_url || data.checkout_url;
    const merchantName = rootData.merchant_name || data.merchant_name || 'AKASH Store';
    const merchantUpi = rootData.merchant_upi || rootData.upi_id || data.merchant_upi || data.upi_id;
    const expiresIn = rootData.expires_in || data.expires_in || 600;

    const parsedAmount = typeof rootData.amount === 'number'
      ? rootData.amount
      : (rootData.amount ? parseFloat(rootData.amount) : params.amount);

    // Validate that real payment instructions were provided
    if (!rawQrUrl && !upiIntent && !paymentUrl) {
      const msg = 'Payment provider returned incomplete payment instructions: missing QR code, UPI intent, and payment URL.';
      db.logIntegrationError('famgateway', '/api/create-order', msg);
      throw new Error(msg);
    }

    // Determine authentic QR image:
    // If provider gave a direct image URL or data URI, use it.
    // Otherwise, generate an exact authentic QR code encoding the real UPI intent URI or payment URL.
    let finalQrUrl: string;
    if (rawQrUrl && (rawQrUrl.startsWith('http://') || rawQrUrl.startsWith('https://') || rawQrUrl.startsWith('data:image/'))) {
      finalQrUrl = rawQrUrl;
    } else if (upiIntent || paymentUrl || rawQrUrl) {
      const qrPayload = upiIntent || paymentUrl || rawQrUrl;
      try {
        finalQrUrl = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 300,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
      } catch (qrErr: any) {
        throw new Error(`Failed to encode real payment instructions into QR code: ${qrErr.message}`);
      }
    } else {
      throw new Error('No valid payment instructions to generate UPI QR code.');
    }

    return {
      providerOrderId,
      qrUrl: finalQrUrl,
      upiIntent,
      paymentUrl,
      amount: parsedAmount,
      merchantName,
      merchantUpi,
      expiresIn,
    };
  }

  /**
   * Check real status from FamGateway API.
   * Tries documented endpoints: GET /api/checkout-status.php?order_id=...
   */
  public async checkOrderStatus(providerOrderId: string): Promise<{
    status: 'SUCCESS' | 'PENDING' | 'EXPIRED' | 'FAILED';
    amount?: number;
    utr?: string;
    raw: any;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('FamGateway is not configured in server secrets.');
    }

    // Try status endpoint with bounded retry
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `${FAMGATEWAY_BASE_URL}/api/checkout-status.php?order_id=${encodeURIComponent(providerOrderId)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`FamGateway status API returned HTTP ${response.status}`);
        }

        const data: any = await response.json();
        
        let normalizedStatus: 'SUCCESS' | 'PENDING' | 'EXPIRED' | 'FAILED' = 'PENDING';
        const rawStatus = String(data.status || data.order_status || '').toUpperCase();

        if (rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED' || rawStatus === 'PAID' || data.status === true) {
          normalizedStatus = 'SUCCESS';
        } else if (rawStatus === 'FAILED') {
          normalizedStatus = 'FAILED';
        } else if (rawStatus === 'EXPIRED') {
          normalizedStatus = 'EXPIRED';
        } else {
          normalizedStatus = 'PENDING';
        }

        return {
          status: normalizedStatus,
          amount: typeof data.amount === 'number' ? data.amount : (data.amount ? parseFloat(data.amount) : undefined),
          utr: data.utr || data.txn_id || data.rrn || '',
          raw: data,
        };
      } catch (err: any) {
        lastError = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    db.logIntegrationError('famgateway', '/api/checkout-status.php', lastError?.message || 'Status check failed');
    throw lastError || new Error('Status verification failed');
  }

  /**
   * Verify FamGateway Webhook Signature:
   * Header: X-FamGateway-Signature
   * Uses HMAC SHA-256 with the merchant API key.
   */
  public verifyWebhookSignature(payloadRaw: string, signature: string | undefined): boolean {
    const apiKey = this.getApiKey();
    if (!apiKey || !signature) return false;

    try {
      const computed = crypto.createHmac('sha256', apiKey).update(payloadRaw).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch (err) {
      console.error('[FAMGATEWAY] Signature verification failed:', err);
      return false;
    }
  }
}

export const famGateway = new FamGatewayService();
