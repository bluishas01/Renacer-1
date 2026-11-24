import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  HeartHandshake,
  MessageCircleHeart,
  Phone,
  ShieldAlert,
  Square,
  Timer,
  Wind,
  X,
} from 'lucide-react';
import {
  VERIFIED_CRISIS_DIRECTORY,
  VERIFIED_EMERGENCY_REVIEW_DATE,
} from '../data/legalAndDocs';
import type { SupportContact } from '../types/renacer';

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
  supportContacts: SupportContact[];
  onGoToAI: () => void;
  onOpenSupport?: () => void;
}

const COUNTRY_PREF_KEY = 'renacer_country_pref';

const COUNTRY_OPTIONS = [
  'Todos',
  'México',
  'España',
  'Estados Unidos',
  'Argentina',
  'Colombia',
  'Chile',
  'Perú',
] as const;

const GROUNDING_STEPS = [
  { id: '5', label: '5 cosas que puedes ver a tu alrededor en este momento' },
  { id: '4', label: '4 cosas que puedes tocar o sentir con tus manos' },
  { id: '3', label: '3 sonidos suaves o lejanos que puedes escuchar' },
  { id: '2', label: '2 olores que percibes o recuerdas con calma' },
  { id: '1', label: '1 verdad compasiva: este impulso pasará sin tener que ceder' },
];

const CRISIS_LINES = VERIFIED_CRISIS_DIRECTORY;

export const HelpDrawer: React.FC<HelpDrawerProps> = ({
  open,
  onClose,
  supportContacts,
  onGoToAI,
  onOpenSupport,
}) => {
  const [activeTool, setActiveTool] = useState<'breath' | 'urge' | 'grounding' | 'crisis'>('breath');
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    try {
      return window.localStorage.getItem(COUNTRY_PREF_KEY) || 'Todos';
    } catch {
      return 'Todos';
    }
  });

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    try {
      window.localStorage.setItem(COUNTRY_PREF_KEY, country);
    } catch {
      // Ignore Safari private storage limits
    }
  };

  // 4-7-8 Breathing Timer
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathTick, setBreathTick] = useState(0); // 0..18 (19s cycle: 4 inhale, 7 hold, 8 exhale)

  // 10-min Urge Surfing Timer
  const [urgeRunning, setUrgeRunning] = useState(false);
  const [urgeSecondsLeft, setUrgeSecondsLeft] = useState(600);

  // Grounding checklist
  const [checkedGrounding, setCheckedGrounding] = useState<string[]>([]);

  useEffect(() => {
    if (!breathRunning) return;
    const id = window.setInterval(() => {
      setBreathTick((t) => (t + 1) % 19);
    }, 1000);
    return () => window.clearInterval(id);
  }, [breathRunning]);

  useEffect(() => {
    if (!urgeRunning) return;
    const id = window.setInterval(() => {
      setUrgeSecondsLeft((s) => {
        if (s <= 1) {
          setUrgeRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [urgeRunning]);

  useEffect(() => {
    if (!open) return;
    try {
      const saved = window.localStorage.getItem(COUNTRY_PREF_KEY);
      if (saved) setSelectedCountry(saved);
    } catch {
      // Ignore Safari private storage limits
    }
  }, [open]);

  if (!open) return null;

  const visibleCrisisLines =
    selectedCountry === 'Todos'
      ? CRISIS_LINES
      : [
          ...CRISIS_LINES.filter((line) => line.region === selectedCountry),
          ...CRISIS_LINES.filter((line) => line.region === 'Emergencias generales'),
        ];

  const breathPhase =
    breathTick < 4
      ? { label: 'Inhala suave por la nariz', seconds: 4 - breathTick, scale: 'scale-110' }
      : breathTick < 11
        ? { label: 'Mantén el aire con calma', seconds: 11 - breathTick, scale: 'scale-110' }
        : { label: 'Exhala lento por la boca', seconds: 19 - breathTick, scale: 'scale-90' };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-drawer-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[#E3DDD0] bg-[#FAF8F3] p-5 shadow-2xl sm:rounded-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#E3DDD0] pb-4">
          <div>
            <p className="text-xs font-medium text-[#1B4332]">Apoyo inmediato · Un día a la vez</p>
            <h2 id="help-drawer-title" className="font-display text-2xl font-semibold text-[#14241C]">
              No estás solo en este momento
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de ayuda"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E3DDD0] bg-white text-[#4C5E54] hover:text-[#14241C]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tool selector tabs */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTool('breath')}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
              activeTool === 'breath'
                ? 'bg-[#1B4332] text-[#F7F4EC]'
                : 'border border-[#E3DDD0] bg-white text-[#14241C]'
            }`}
          >
            <Wind className="h-4 w-4" />
            <span>Respiración 4-7-8</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('urge')}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
              activeTool === 'urge'
                ? 'bg-[#1B4332] text-[#F7F4EC]'
                : 'border border-[#E3DDD0] bg-white text-[#14241C]'
            }`}
          >
            <Timer className="h-4 w-4" />
            <span>Pausa 10 min</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('grounding')}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
              activeTool === 'grounding'
                ? 'bg-[#1B4332] text-[#F7F4EC]'
                : 'border border-[#E3DDD0] bg-white text-[#14241C]'
            }`}
          >
            <HeartHandshake className="h-4 w-4" />
            <span>Anclaje 5-4-3-2-1</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('crisis')}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
              activeTool === 'crisis'
                ? 'bg-[#991B1B] text-white'
                : 'border border-[#991B1B]/30 bg-[#FEF2F2] text-[#991B1B]'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Líneas de urgencia</span>
          </button>
        </div>

        {/* Tool content */}
        <div className="mt-5 rounded-2xl border border-[#E3DDD0] bg-white p-5">
          {activeTool === 'breath' && (
            <div className="flex flex-col items-center text-center">
              <div
                className={`flex h-36 w-36 items-center justify-center rounded-full border-2 border-[#1B4332]/25 bg-[#EBF3EE] transition-transform duration-1000 ${
                  breathRunning ? breathPhase.scale : 'scale-100'
                }`}
              >
                <span className="font-mono text-3xl font-semibold tabular-nums text-[#1B4332]">
                  {breathRunning ? breathPhase.seconds : '4·7·8'}
                </span>
              </div>
              <p className="mt-4 text-base font-medium text-[#14241C]">
                {breathRunning ? breathPhase.label : 'Regula tu sistema nervioso en 90 segundos'}
              </p>
              <p className="mt-1 text-xs text-[#4C5E54]">
                Inhala 4 segundos · Mantén 7 segundos · Exhala lento 8 segundos.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (breathRunning) {
                      setBreathRunning(false);
                      setBreathTick(0);
                    } else {
                      setBreathTick(0);
                      setBreathRunning(true);
                    }
                  }}
                  className="min-h-[44px] rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
                >
                  {breathRunning ? 'Detener' : 'Comenzar respiración'}
                </button>
              </div>
            </div>
          )}

          {activeTool === 'urge' && (
            <div className="text-center">
              <p className="text-sm text-[#4C5E54]">
                Los impulsos intensos suelen alcanzar su pico y disminuir como una ola en pocos minutos. No
                tienes que decidir para siempre: solo espera estos 10 minutos sin actuar.
              </p>
              <div className="my-5 font-mono text-4xl font-semibold tabular-nums text-[#1B4332]">
                {formatTimer(urgeSecondsLeft)}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setUrgeRunning((v) => !v)}
                  className="min-h-[44px] rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
                >
                  {urgeRunning ? 'Pausar temporizador' : urgeSecondsLeft === 600 ? 'Iniciar pausa de 10 min' : 'Continuar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUrgeRunning(false);
                    setUrgeSecondsLeft(600);
                  }}
                  className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-white px-4 py-2.5 text-sm font-medium text-[#14241C] hover:bg-[#F7F4EC]"
                >
                  Reiniciar reloj
                </button>
              </div>
            </div>
          )}

          {activeTool === 'grounding' && (
            <div className="space-y-2.5">
              <p className="mb-3 text-sm text-[#4C5E54]">
                Vuelve al presente paso a paso tocando cada sentido conforme lo identifiques:
              </p>
              {GROUNDING_STEPS.map((step) => {
                const done = checkedGrounding.includes(step.id);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() =>
                      setCheckedGrounding((prev) =>
                        prev.includes(step.id) ? prev.filter((x) => x !== step.id) : [...prev, step.id]
                      )
                    }
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                      done
                        ? 'border-[#1B4332]/30 bg-[#EBF3EE] text-[#1B4332]'
                        : 'border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C]'
                    }`}
                  >
                    {done ? (
                      <CheckSquare className="h-5 w-5 shrink-0 text-[#1B4332]" />
                    ) : (
                      <Square className="h-5 w-5 shrink-0 text-[#4C5E54]" />
                    )}
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTool === 'crisis' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3.5 text-sm text-[#991B1B]">
                <strong>Emergencia médica o riesgo vital:</strong> ante sobredosis, convulsiones, alucinaciones
                por abstinencia o ideación suicida, llama de inmediato a emergencias locales o acude a urgencias.
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] px-3 py-2">
                <label htmlFor="help-country-select" className="text-xs font-medium text-[#14241C]">
                  Recursos según tu país
                </label>
                <select
                  id="help-country-select"
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="min-h-[38px] rounded-lg border border-[#D5CEBF] bg-white px-2.5 text-xs font-medium text-[#14241C]"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c === 'Todos' ? 'Todos los países' : c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="divide-y divide-[#E3DDD0]">
                {visibleCrisisLines.map((line) => (
                  <div key={`${line.region}-${line.institution}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#14241C]">
                        {line.region} · {line.institution}
                      </p>
                      <p className="text-xs text-[#4C5E54]">{line.detail}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                      {line.dialNumbers.map((dial) => (
                        <a
                          key={`${line.region}-${line.institution}-${dial.label}`}
                          href={`tel:${dial.tel}`}
                          aria-label={`Llamar a ${line.institution} (${line.region}) al ${dial.label}`}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#991B1B]/25 bg-[#FEF2F2] px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#991B1B] transition hover:bg-[#FEE2E2]"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{dial.label}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="pt-1 text-[11px] text-[#4C5E54]">
                Directorio verificado el {VERIFIED_EMERGENCY_REVIEW_DATE} · Fuentes oficiales (911 México,
                CONASAMA Línea de la Vida, SAPTEL, LOCATEL y ministerios nacionales).
              </p>
            </div>
          )}
        </div>

        {/* Personal contacts + AI direct action */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-[#E3DDD0] bg-white p-4">
            <div>
              <h3 className="text-sm font-semibold text-[#14241C]">
                Tu círculo de apoyo{supportContacts.length > 0 ? ` (${supportContacts.length})` : ''}
              </h3>
              {supportContacts.length === 0 ? (
                <p className="mt-1.5 text-xs text-[#4C5E54]">
                  Aún no has agregado contactos de confianza. Añade personas seguras para llamarlas con un toque.
                </p>
              ) : (
                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {supportContacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#14241C]">{c.name}</p>
                        <p className="truncate text-xs text-[#4C5E54]">{c.relation}</p>
                      </div>
                      {c.phone && c.phone.replace(/[^0-9+*#()-]/g, '').length > 0 && (
                        <a
                          href={`tel:${c.phone.replace(/[^0-9+*#()-]/g, '')}`}
                          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-[#EBF3EE] px-3 py-1.5 text-xs font-medium text-[#1B4332]"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>Llamar</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {supportContacts.length === 0 && onOpenSupport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSupport();
                }}
                className="mt-3 min-h-[40px] w-full rounded-xl border border-[#1B4332] bg-[#FAF8F3] px-3 py-2 text-xs font-medium text-[#1B4332] hover:bg-[#EBF3EE]"
              >
                Agregar contacto en Red de apoyo
              </button>
            )}
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[#1B4332]/20 bg-[#EBF3EE] p-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1B4332]">Hablar con RENACER IA (asistente)</h3>
              <p className="mt-1 text-xs text-[#2D4A3B]">
                Asistente automatizado sin supervisión humana en tiempo real para ordenar lo que sientes y
                elegir tu próximo paso seguro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToAI();
              }}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-4 py-2 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
            >
              <MessageCircleHeart className="h-4 w-4" />
              <span>Abrir RENACER IA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
