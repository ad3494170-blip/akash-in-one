import React from 'react';
import { BroadcastNotification } from '../types.ts';
import { Bell, Info, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface BroadcastBannerProps {
  notifications: BroadcastNotification[];
}

export const BroadcastBanner: React.FC<BroadcastBannerProps> = ({ notifications }) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-950/70 via-zinc-900 to-amber-950/70 border-b border-red-900/40">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm text-zinc-200"
            >
              <div className="p-1 rounded-md bg-red-600/20 text-red-400 shrink-0 mt-0.5 sm:mt-0">
                {item.type === 'alert' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {item.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {item.type === 'info' && <Bell className="w-4 h-4 text-red-400" />}
                {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-400" />}
              </div>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-bold text-red-300 shrink-0">{item.title}:</span>
                <span className="text-zinc-300 text-xs sm:text-sm">{item.message}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
