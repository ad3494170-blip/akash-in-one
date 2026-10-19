import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types.ts';
import { api } from '../services/api.ts';
import {
  ShoppingBag,
  Flame,
  Bot,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Copy,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'likes' | 'glory_bot'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    api.getOrders()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredOrders = orders.filter((o) => {
    if (filterType === 'all') return true;
    return o.productType === filterType;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            In Queue / Processing
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Clock className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case 'rejected':
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Cinzel']">
            MY ORDER HISTORY
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Track Free Fire Likes delivery and Glory Bot automation status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilterType('likes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                filterType === 'likes' ? 'bg-red-600/30 text-red-400 border border-red-500/40' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Likes
            </button>
            <button
              onClick={() => setFilterType('glory_bot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                filterType === 'glory_bot' ? 'bg-purple-600/30 text-purple-400 border border-purple-500/40' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Glory Bot
            </button>
          </div>

          <button
            onClick={fetchOrders}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-16 bg-zinc-900/40 rounded-3xl border border-zinc-800">
          <RefreshCw className="w-8 h-8 text-zinc-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-zinc-400">Loading your orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/40 rounded-3xl border border-zinc-800 space-y-3">
          <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto" />
          <h3 className="text-base font-bold text-zinc-300">No orders found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            You haven't placed any orders in this category yet. Browse our Likes Store or Glory Bot to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isLikes = order.productType === 'likes';

            return (
              <div
                key={order.id}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 shadow-lg transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isLikes
                          ? 'bg-red-500/10 border border-red-500/30 text-red-500'
                          : 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                      }`}
                    >
                      {isLikes ? <Flame className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                          {order.id}
                        </span>
                        <button
                          onClick={() => handleCopy(order.id, order.id)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                          title="Copy Order ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedId === order.id && (
                          <span className="text-[10px] text-emerald-400 font-semibold">Copied!</span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Placed on {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/60 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Product:</span>
                    <span className="font-bold text-zinc-200">{order.planName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Target UID:</span>
                    <span className="font-mono font-bold text-white">{order.freeFireUid}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Quantity:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{order.quantitySnapshot.toLocaleString()}{' '}
                      {isLikes ? 'Likes' : 'Glory'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Price Paid:</span>
                    <span className="font-mono font-bold text-zinc-200">
                      ₹{order.priceSnapshot.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Admin Completion Message / Fulfillment Note */}
                {order.adminCompletionMessage && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-300">
                    <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-400">Delivery Confirmation Note:</div>
                      <p className="mt-0.5 text-emerald-200/90 whitespace-pre-wrap">
                        {order.adminCompletionMessage}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
