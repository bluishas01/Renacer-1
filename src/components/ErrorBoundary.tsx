import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Sprout } from 'lucide-react';

export async function clearBrowserSwAndCacheAndReload(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
    }
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key).catch(() => false)));
    }
  } catch {
    // Proceed with reload even if browser storage APIs are restricted
  }
  window.location.reload();
}

export function formatReadableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '');
  if (!raw) {
    return 'Ocurrió un error inesperado al iniciar RENACER.';
  }
  try {
    const parsed = JSON.parse(raw) as { error?: string; operationType?: string };
    if (parsed.error) {
      return `Error de permisos o sincronización (${parsed.operationType ?? 'operación'}): ${parsed.error}`;
    }
  } catch {
    // Plain message
  }
  return raw;
}

interface RecoveryFallbackProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showCacheReset?: boolean;
}

export const AppRecoveryFallback: React.FC<RecoveryFallbackProps> = ({
  title = 'No se pudo completar la carga de RENACER',
  message,
  onRetry,
  showCacheReset = true,
}) => {
  const [clearing, setClearing] = React.useState(false);

  const handleClearCache = async () => {
    setClearing(true);
    await clearBrowserSwAndCacheAndReload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F4EC] p-6 text-[#14241C]">
      <div className="w-full max-w-md rounded-2xl border border-[#E3DDD0] bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#991B1B]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#1B4332]">
            <Sprout className="h-4 w-4" />
            <span>RENACER</span>
          </div>
        </div>

        <h1 className="mt-4 font-display text-xl font-semibold text-[#14241C]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#4C5E54]">
          {message}
        </p>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={onRetry ?? (() => window.location.reload())}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-4 py-2.5 text-sm font-medium text-[#F7F4EC] transition hover:bg-[#143326]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reintentar carga</span>
          </button>

          {showCacheReset && (
            <button
              type="button"
              disabled={clearing}
              onClick={handleClearCache}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-4 py-2.5 text-sm font-medium text-[#14241C] transition hover:bg-[#EFEAE0] disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{clearing ? 'Limpiando caché...' : 'Limpiar caché de la app y reintentar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: formatReadableError(error),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('RENACER ErrorBoundary:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppRecoveryFallback
          title="Algo interrumpió la pantalla de RENACER"
          message={
            this.state.message ||
            'Ocurrió un problema inesperado al mostrar la aplicación. Tus registros guardados en la nube permanecen seguros.'
          }
          onRetry={() => this.setState({ hasError: false, message: '' })}
          showCacheReset
        />
      );
    }
    return this.props.children;
  }
}
