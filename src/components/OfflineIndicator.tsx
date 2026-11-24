import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { isOfflineCacheEnabled } from '../services/firebaseVault';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  const cacheEnabled = isOfflineCacheEnabled();

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl border border-[#D97706]/30 bg-[#FEF3C7] px-3.5 py-2 text-xs font-medium text-[#78350F] shadow-md lg:bottom-5"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        {cacheEnabled
          ? 'Sin conexión — caché local de respaldo activa; sincronizará al reconectar.'
          : 'Sin conexión — caché local desactivada en este dispositivo.'}
      </span>
    </div>
  );
};
