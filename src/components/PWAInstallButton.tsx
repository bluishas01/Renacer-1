import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="rounded-xl border border-[#D4DFD8] bg-[#EBF3EE] px-4 py-3 text-sm text-[#1B4332]">
          RENACER ya está instalada en modo aplicación independiente en este dispositivo.
        </div>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-4 py-2 text-sm font-medium text-[#F7F4EC] transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4" />
        <span>Instalar app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#D5CEBF] bg-white px-4 py-2 text-sm font-medium text-[#14241C] transition hover:bg-[#F7F4EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-4 w-4 text-[#1B4332]" />
          <span>Instalar en iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#E3DDD0] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#14241C]">
                    Instalar RENACER en iPhone o iPad
                  </h3>
                  <p className="mt-1 text-sm text-[#4C5E54]">
                    Úsala como aplicación nativa con acceso rápido y soporte sin conexión.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Cerrar guía"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#4C5E54] hover:bg-[#F7F4EC]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-[#14241C]">
                <li className="rounded-xl bg-[#F7F4EC] p-3">
                  1. Toca el botón <strong>Compartir</strong> (cuadro con flecha hacia arriba) en la barra de Safari.
                </li>
                <li className="rounded-xl bg-[#F7F4EC] p-3">
                  2. Desliza hacia abajo y selecciona <strong>Agregar a inicio</strong>.
                </li>
                <li className="rounded-xl bg-[#F7F4EC] p-3">
                  3. Pulsa <strong>Agregar</strong> en la esquina superior derecha.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (variant === 'full') {
    return (
      <div className="rounded-xl border border-[#E3DDD0] bg-[#F7F4EC] px-4 py-3 text-sm text-[#4C5E54]">
        Para instalar en Android o escritorio, abre el menú de Chrome/Edge y selecciona <strong>Instalar aplicación</strong>. En iPhone/iPad usa Safari → Compartir → <strong>Agregar a inicio</strong>.
      </div>
    );
  }

  return null;
};
