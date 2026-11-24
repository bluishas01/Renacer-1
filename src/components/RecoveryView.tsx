import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Circle,
  HeartHandshake,
  Plus,
  RefreshCw,
  Shield,
  Sun,
  Sunset,
  Moon,
  Trash2,
} from 'lucide-react';
import type {
  ConsumptionLog,
  DailyPlanItem,
  RecoveryPlan,
  UserVaultData,
} from '../types/renacer';
import { evaluateRelapseRisk, mergeDetectedAlerts } from '../utils/alertEngine';
import {
  calculateDaysInRecovery,
  formatDateTime,
  formatShortDate,
  getLast7DateKeys,
  localDateTimeInputValue,
  todayISO,
} from '../utils/recoveryMath';
import { AssessmentView } from './AssessmentView';

const LEAF_IMAGE = '/src/assets/images/renacer_breathing_leaf_1795465215721.jpg';

export type RecoverySubTab =
  | 'daily'
  | 'logs'
  | 'alerts'
  | 'plan'
  | 'assessment'
  | 'reset';

interface RecoveryViewProps {
  vault: UserVaultData;
  onUpdateVault: (updater: (prev: UserVaultData) => UserVaultData) => Promise<void>;
  onOpenHelp: () => void;
  onGoToAI: () => void;
  initialSubTab?: RecoverySubTab;
}

export const RecoveryView: React.FC<RecoveryViewProps> = ({
  vault,
  onUpdateVault,
  onOpenHelp,
  onGoToAI,
  initialSubTab = 'daily',
}) => {
  const [subTab, setSubTab] = useState<RecoverySubTab>(initialSubTab);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const todayKey = todayISO();
  const last7Keys = getLast7DateKeys();
  const { days } = calculateDaysInRecovery(vault.profile.recoveryStartDate);
  const riskSummary = evaluateRelapseRisk(vault);

  // --- Daily Recovery Plan state ---
  const [dpTitle, setDpTitle] = useState('');
  const [dpBlock, setDpBlock] = useState<DailyPlanItem['timeBlock']>('manana');
  const [dpCategory, setDpCategory] = useState<DailyPlanItem['category']>('anclaje');
  const [addingDp, setAddingDp] = useState(false);

  // --- Consumption / Gambling / Relapse Log state ---
  const [logType, setLogType] = useState<ConsumptionLog['entryType']>('deseo');
  const [logCategory, setLogCategory] = useState<string>(vault.profile.focus || 'Alcohol');
  const [logIntensity, setLogIntensity] = useState<number>(6);
  const [logAmount, setLogAmount] = useState<string>('0');
  const [logTrigger, setLogTrigger] = useState<string>('Estrés o sobrecarga');
  const [logLocation, setLogLocation] = useState<string>('En casa');
  const [logCoping, setLogCoping] = useState<string>('Respiración 4-7-8');
  const [logOccurredAt, setLogOccurredAt] = useState<string>(() => localDateTimeInputValue());
  const [logNote, setLogNote] = useState<string>('');
  const [applyCompassionateReset, setApplyCompassionateReset] = useState<boolean>(false);
  const [savingLog, setSavingLog] = useState(false);
  const [logFeedback, setLogFeedback] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | ConsumptionLog['entryType']>('all');

  // --- Plan editable items ---
  const [newReason, setNewReason] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newWarningSign, setNewWarningSign] = useState('');
  const [newStrategy, setNewStrategy] = useState('');

  // --- HALT interactive check ---
  const [haltState, setHaltState] = useState({
    hungry: false,
    angry: false,
    lonely: false,
    tired: false,
  });
  const [haltFeedback, setHaltFeedback] = useState<string | null>(null);

  // --- Compassionate reset flow ---
  const [resetReflection, setResetReflection] = useState('');
  const [resetDate, setResetDate] = useState(todayISO());
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetDoneMsg, setResetDoneMsg] = useState(false);

  // Daily Plan Handlers
  const handleAddDailyItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = dpTitle.trim().slice(0, 100);
    if (!clean) return;
    setAddingDp(true);
    try {
      const newItem: DailyPlanItem = {
        id: `dp_${Date.now()}`,
        title: clean,
        timeBlock: dpBlock,
        category: dpCategory,
        completedDates: [],
        active: true,
      };
      await onUpdateVault((prev) => ({
        ...prev,
        dailyPlan: [...prev.dailyPlan, newItem],
      }));
      setDpTitle('');
    } catch {
      // Handled via App persistError banner; preserve input
    } finally {
      setAddingDp(false);
    }
  };

  const toggleDailyItemToday = async (itemId: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        dailyPlan: prev.dailyPlan.map((item) => {
          if (item.id !== itemId) return item;
          const done = item.completedDates.includes(todayKey);
          return {
            ...item,
            completedDates: done
              ? item.completedDates.filter((d) => d !== todayKey)
              : [...item.completedDates, todayKey].slice(-400),
          };
        }),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  const removeDailyItem = async (itemId: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        dailyPlan: prev.dailyPlan.filter((item) => item.id !== itemId),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  // Consumption / Gambling / Relapse Handler
  const handleSaveConsumptionLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLog(true);
    setLogFeedback(null);

    try {
      const parsedAmount = Math.max(0, Math.min(100_000_000, Number(logAmount) || 0));
      const parsedDate = logOccurredAt ? new Date(logOccurredAt) : new Date();
      const occurredIso = Number.isNaN(parsedDate.getTime())
        ? new Date().toISOString()
        : parsedDate.toISOString();

      const shouldReset =
        applyCompassionateReset &&
        (logType === 'consumo' || logType === 'apuesta' || logType === 'recaida');

      const entry: ConsumptionLog = {
        id: `con_${Date.now()}`,
        entryType: logType,
        category: logCategory.trim().slice(0, 60) || vault.profile.focus,
        intensity: logIntensity,
        amountSpent: parsedAmount,
        trigger: logTrigger.trim().slice(0, 100) || 'Otro',
        locationContext: logLocation.trim().slice(0, 80),
        copingAction: logCoping.trim().slice(0, 120),
        resetApplied: shouldReset,
        occurredAt: occurredIso,
        note: logNote.trim().slice(0, 500),
        createdAt: new Date().toISOString(),
      };

      await onUpdateVault((prev) => {
        const nextVault: UserVaultData = {
          ...prev,
          consumptionLogs: [entry, ...prev.consumptionLogs].slice(0, 200),
        };

        if (shouldReset) {
          const prevDays = calculateDaysInRecovery(prev.profile.recoveryStartDate).days;
          nextVault.recoveryHistory = [
            {
              id: `stg_${Date.now()}`,
              startedAt: prev.profile.recoveryStartDate,
              endedAt: new Date().toISOString(),
              daysCompleted: prevDays,
              reflection:
                logNote.trim().slice(0, 400) ||
                `Etapa cerrada tras registro (${logType}) con enfoque compasivo.`,
            },
            ...prev.recoveryHistory,
          ];
          nextVault.profile = {
            ...prev.profile,
            recoveryStartDate: new Date().toISOString(),
          };
        }

        const updatedRisk = evaluateRelapseRisk(nextVault);
        nextVault.alerts = mergeDetectedAlerts(prev.alerts, updatedRisk);
        return nextVault;
      });

      setLogNote('');
      setLogAmount('0');
      setLogOccurredAt(localDateTimeInputValue());
      setApplyCompassionateReset(false);
      setLogFeedback(
        shouldReset
          ? 'Registro guardado en Firestore. Tu etapa previa se conservó y abriste un nuevo comienzo hoy.'
          : 'Registro guardado en Cloud Firestore.'
      );
    } catch (err) {
      setLogFeedback(
        err instanceof Error ? err.message : 'No se pudo guardar el registro en Cloud Firestore.'
      );
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteConsumptionLog = async (id: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        consumptionLogs: prev.consumptionLogs.filter((c) => c.id !== id),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  // Alert Handlers
  const handleSyncAlertsNow = async () => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        alerts: mergeDetectedAlerts(prev.alerts, evaluateRelapseRisk(prev)),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  const handleUpdateAlertStatus = async (
    alertId: string,
    patch: { acknowledged?: boolean; resolved?: boolean }
  ) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, ...patch } : a)),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  // Personal Plan Handlers
  const addPlanItem = async (
    field: keyof Pick<
      RecoveryPlan,
      'reasonsToChange' | 'triggers' | 'warningSigns' | 'copingStrategies'
    >,
    value: string,
    clear: () => void
  ) => {
    const clean = value.trim().slice(0, 140);
    if (!clean) return;
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        recoveryPlan: {
          ...prev.recoveryPlan,
          [field]: [...prev.recoveryPlan[field], clean].slice(0, 20),
        },
      }));
      clear();
    } catch {
      // Handled via App persistError banner; preserve input
    }
  };

  const removePlanItem = async (
    field: keyof Pick<
      RecoveryPlan,
      'reasonsToChange' | 'triggers' | 'warningSigns' | 'copingStrategies'
    >,
    index: number
  ) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        recoveryPlan: {
          ...prev.recoveryPlan,
          [field]: prev.recoveryPlan[field].filter((_, i) => i !== index),
        },
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  const handleSaveHaltCheck = async () => {
    const activeFlags = Object.entries(haltState)
      .filter(([, v]) => v)
      .map(([k]) =>
        k === 'hungry'
          ? 'Hambre o sed'
          : k === 'angry'
            ? 'Enojo o frustración'
            : k === 'lonely'
              ? 'Soledad o aislamiento'
              : 'Cansancio acumulado'
      );

    try {
      await onUpdateVault((prev) => {
        const hasOpenHaltAlert = prev.alerts.some(
          (a) => !a.resolved && a.ruleKey === 'halt_vulnerability'
        );
        const nextAlerts =
          activeFlags.length >= 2 && !hasOpenHaltAlert
            ? [
                {
                  id: `alt_halt_${Date.now()}`,
                  ruleKey: 'halt_vulnerability',
                  severity: 'media' as const,
                  title: 'Alerta HALT: vulnerabilidad básica detectada',
                  message: `Marcaste ${activeFlags.join(', ')}. Atiende primero esta necesidad básica antes de tomar decisiones.`,
                  recommendedAction: 'Comer/hidratarte, descansar o contactar a alguien seguro',
                  acknowledged: false,
                  resolved: false,
                  createdAt: new Date().toISOString(),
                },
                ...prev.alerts,
              ].slice(0, 40)
            : prev.alerts;

        return {
          ...prev,
          recoveryPlan: {
            ...prev.recoveryPlan,
            haltChecklistLastCheckedAt: new Date().toISOString(),
          },
          alerts: nextAlerts,
        };
      });

      if (activeFlags.length === 0) {
        setHaltFeedback('Tu chequeo HALT está equilibrado hoy. Sigue cuidando tus rutinas básicas.');
      } else {
        setHaltFeedback(
          `Detectaste vulnerabilidad en: ${activeFlags.join(', ')}. Prioriza atender primero esa necesidad básica.`
        );
      }
    } catch {
      setHaltFeedback(null);
    }
  };

  const handleCompassionateReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentDays = days;
    const prevStart = vault.profile.recoveryStartDate;
    const parsedReset = resetDate ? new Date(`${resetDate}T08:00:00`) : new Date();
    const newStartIso = Number.isNaN(parsedReset.getTime())
      ? new Date().toISOString()
      : parsedReset.toISOString();

    try {
      await onUpdateVault((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          recoveryStartDate: newStartIso,
        },
        recoveryHistory: [
          {
            id: `stg_${Date.now()}`,
            startedAt: prevStart,
            endedAt: new Date().toISOString(),
            daysCompleted: currentDays,
            reflection:
              resetReflection.trim().slice(0, 400) ||
              'Etapa cerrada con aprendizaje y autocompasión.',
          },
          ...prev.recoveryHistory,
        ],
      }));

      setResetReflection('');
      setConfirmResetOpen(false);
      setResetDoneMsg(true);
      setTimeout(() => setResetDoneMsg(false), 5000);
    } catch {
      setResetDoneMsg(false);
    }
  };

  const activeDailyPlan = vault.dailyPlan.filter((i) => i.active);
  const completedDailyToday = activeDailyPlan.filter((i) => i.completedDates.includes(todayKey)).length;
  const visibleConsumptionLogs = vault.consumptionLogs.filter(
    (item) => logFilter === 'all' || item.entryType === logFilter
  );
  const openAlerts = vault.alerts.filter((a) => !a.resolved);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="grid overflow-hidden rounded-2xl border border-[#E3DDD0] bg-white lg:grid-cols-12">
        <div className="flex flex-col justify-between p-6 lg:col-span-8">
          <div>
            <p className="text-xs font-medium text-[#1B4332]">Módulo de recuperación · Un día a la vez</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-[#14241C] sm:text-3xl">
              Plan diario, registro y prevención de recaídas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4C5E54]">
              Organiza tu rutina protectora, registra deseos o episodios sin culpa, evalúa señales de
              riesgo a tiempo y conserva cada etapa de tu camino.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { id: 'daily', label: 'Plan diario' },
              { id: 'logs', label: 'Consumo y recaídas' },
              {
                id: 'alerts',
                label: openAlerts.length > 0 ? `Alertas (${openAlerts.length})` : 'Alertas y HALT',
              },
              { id: 'plan', label: 'Plan personal' },
              { id: 'assessment', label: 'Evaluación inicial' },
              { id: 'reset', label: 'Etapas y reinicio' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as RecoverySubTab)}
                className={`min-h-[44px] rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm whitespace-nowrap shrink-0 ${
                  subTab === t.id
                    ? 'bg-[#1B4332] text-[#F7F4EC]'
                    : 'border border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C] hover:bg-[#EFEAE0]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-[150px] bg-[#EFEAE0] lg:col-span-4">
          {!imgError ? (
            <img
              src={LEAF_IMAGE}
              alt="Hoja verde fresca y piedra lisa sobre lino crema"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#EBF3EE] p-6 text-center text-sm text-[#1B4332]">
              Pausa consciente · Un día a la vez
            </div>
          )}
        </div>
      </section>

      {/* SUBTAB 1: Plan Diario de Recuperación */}
      {subTab === 'daily' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-5 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3DDD0] pb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#14241C]">
                  Plan diario de recuperación
                </h2>
                <p className="mt-0.5 text-xs text-[#4C5E54]">
                  Marca tus acciones protectoras de hoy por bloque del día.
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold tabular-nums text-[#1B4332]">
                  {completedDailyToday}/{activeDailyPlan.length}
                </p>
                <p className="text-xs text-[#4C5E54]">completadas hoy</p>
              </div>
            </div>

            {(['manana', 'tarde', 'noche'] as const).map((block) => {
              const items = activeDailyPlan.filter((i) => i.timeBlock === block);
              const blockMeta =
                block === 'manana'
                  ? { label: 'Mañana', icon: <Sun className="h-4 w-4 text-[#1B4332]" /> }
                  : block === 'tarde'
                    ? { label: 'Tarde', icon: <Sunset className="h-4 w-4 text-[#1B4332]" /> }
                    : { label: 'Noche', icon: <Moon className="h-4 w-4 text-[#1B4332]" /> };

              return (
                <div key={block} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#14241C]">
                    {blockMeta.icon}
                    <span>{blockMeta.label}</span>
                  </div>

                  {items.length === 0 ? (
                    <p className="rounded-xl bg-[#FAF8F3] px-4 py-3 text-xs text-[#4C5E54]">
                      Sin acciones asignadas para este bloque.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#E3DDD0] rounded-xl border border-[#E3DDD0] bg-[#FAF8F3]">
                      {items.map((item) => {
                        const done = item.completedDates.includes(todayKey);
                        const weekCount = last7Keys.filter((d) =>
                          item.completedDates.includes(d)
                        ).length;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <button
                              type="button"
                              onClick={() => toggleDailyItemToday(item.id)}
                              className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
                            >
                              {done ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1B4332]" />
                              ) : (
                                <Circle className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
                              )}
                              <div>
                                <p
                                  className={`text-sm ${
                                    done ? 'text-[#4C5E54] line-through' : 'font-medium text-[#14241C]'
                                  }`}
                                >
                                  {item.title}
                                </p>
                                <p className="text-xs text-[#4C5E54]">
                                  {item.category} ·{' '}
                                  <span className="font-mono tabular-nums">{weekCount}/7</span> esta semana
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              aria-label="Eliminar acción del plan diario"
                              onClick={() => removeDailyItem(item.id)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <form
            onSubmit={handleAddDailyItem}
            className="h-fit space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-4"
          >
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Agregar acción al plan diario
            </h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Acción concreta</label>
              <input
                type="text"
                required
                maxLength={100}
                value={dpTitle}
                onChange={(e) => setDpTitle(e.target.value)}
                placeholder="Ej. Llamar a mi hermana al salir del trabajo"
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Momento del día</label>
              <select
                value={dpBlock}
                onChange={(e) => setDpBlock(e.target.value as DailyPlanItem['timeBlock'])}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
              >
                <option value="manana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Propósito</label>
              <select
                value={dpCategory}
                onChange={(e) => setDpCategory(e.target.value as DailyPlanItem['category'])}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
              >
                <option value="anclaje">Anclaje y claridad</option>
                <option value="autocuidado">Autocuidado físico</option>
                <option value="prevencion">Prevención de riesgo</option>
                <option value="conexion">Conexión y apoyo</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={addingDp}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
            >
              <Plus className="h-4 w-4" />
              <span>{addingDp ? 'Agregando...' : 'Agregar al plan diario'}</span>
            </button>

            {!vault.initialAssessment && (
              <div className="border-t border-[#E3DDD0] pt-4 text-xs text-[#4C5E54]">
                <p>
                  ¿Quieres sugerencias adaptadas a tu caso? Completa tu{' '}
                  <button
                    type="button"
                    onClick={() => setSubTab('assessment')}
                    className="font-semibold text-[#1B4332] hover:underline"
                  >
                    Evaluación inicial
                  </button>
                  .
                </p>
              </div>
            )}
          </form>
        </div>
      )}

      {/* SUBTAB 2: Registro de Consumo, Apuestas y Recaídas */}
      {subTab === 'logs' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleSaveConsumptionLog}
            className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-5"
          >
            <div>
              <h2 className="font-display text-xl font-semibold text-[#14241C]">
                Registro de consumo, apuestas y recaídas
              </h2>
              <p className="mt-1 text-xs text-[#4C5E54]">
                Registrar con honestidad sin castigo permite detectar patrones, horarios y detonantes reales.
              </p>
            </div>

            {logFeedback && (
              <div className="flex items-start gap-2 rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-3 text-xs text-[#1B4332]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{logFeedback}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'deseo', label: 'Deseo / Impulso' },
                { id: 'consumo', label: 'Consumo' },
                { id: 'apuesta', label: 'Apuesta / Juego' },
                { id: 'recaida', label: 'Recaída' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLogType(t.id as ConsumptionLog['entryType'])}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    logType === t.id
                      ? 'border-[#1B4332] bg-[#1B4332] text-[#F7F4EC]'
                      : 'border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Sustancia o conducta</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value)}
                  placeholder="Ej. Alcohol, Apuesta deportiva"
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">
                  Gasto asociado ({vault.profile.currency})
                </label>
                <input
                  type="number"
                  min={0}
                  max={100000000}
                  step="0.01"
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 font-mono text-sm tabular-nums"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[#14241C]">
                <span>Intensidad del impulso o episodio</span>
                <span className="font-mono tabular-nums">{logIntensity}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={logIntensity}
                onChange={(e) => setLogIntensity(Number(e.target.value))}
                className="mt-1.5 w-full accent-[#1B4332]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Detonante principal</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={logTrigger}
                  onChange={(e) => setLogTrigger(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Contexto o lugar</label>
                <input
                  type="text"
                  maxLength={80}
                  value={logLocation}
                  onChange={(e) => setLogLocation(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={logOccurredAt}
                  onChange={(e) => setLogOccurredAt(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Respuesta o apoyo</label>
                <input
                  type="text"
                  maxLength={120}
                  value={logCoping}
                  onChange={(e) => setLogCoping(e.target.value)}
                  placeholder="Ej. Salí a caminar, llamé a apoyo"
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Nota de aprendizaje</label>
              <textarea
                rows={2}
                maxLength={500}
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder="¿Qué pasó antes y qué puedes cuidar la próxima vez?"
                className="w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] p-3 text-sm"
              />
            </div>

            {(logType === 'consumo' || logType === 'apuesta' || logType === 'recaida') && (
              <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3 text-xs text-[#14241C]">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={applyCompassionateReset}
                    onChange={(e) => setApplyCompassionateReset(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#1B4332]"
                  />
                  <span>
                    Cerrar esta etapa conservando mis <strong className="font-mono tabular-nums">{days}</strong> días
                    en el historial y reiniciar el contador desde hoy sin culpa.
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={savingLog}
              className="min-h-[44px] w-full rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326] disabled:opacity-60"
            >
              {savingLog ? 'Guardando en Firestore...' : 'Guardar registro'}
            </button>
          </form>

          <section className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#14241C]">
                  Historial de registros
                </h2>
                <p className="text-xs text-[#4C5E54]">
                  Total registrados: <span className="font-mono tabular-nums">{vault.consumptionLogs.length}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'deseo', label: 'Deseos' },
                  { id: 'consumo', label: 'Consumo' },
                  { id: 'apuesta', label: 'Apuestas' },
                  { id: 'recaida', label: 'Recaídas' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setLogFilter(f.id as typeof logFilter)}
                    className={`min-h-[36px] rounded-lg px-3 text-xs font-medium ${
                      logFilter === f.id
                        ? 'bg-[#1B4332] text-[#F7F4EC]'
                        : 'bg-[#FAF8F3] text-[#4C5E54]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleConsumptionLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D5CEBF] bg-[#FAF8F3] p-6 text-center text-sm text-[#4C5E54]">
                No hay registros en esta categoría todavía.
              </div>
            ) : (
              <div className="divide-y divide-[#E3DDD0]">
                {visibleConsumptionLogs.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 py-3.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#4C5E54]">
                        <span
                          className={`font-semibold uppercase tracking-wide ${
                            item.entryType === 'deseo' ? 'text-[#1B4332]' : 'text-[#991B1B]'
                          }`}
                        >
                          {item.entryType}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#14241C]">{item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">Intensidad {item.intensity}/10</span>
                        {item.amountSpent > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {vault.profile.currency} {item.amountSpent.toLocaleString('es-ES')}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-[#4C5E54]">
                        {formatDateTime(item.occurredAt)} · Detonante: {item.trigger}
                        {item.locationContext ? ` · ${item.locationContext}` : ''}
                      </p>
                      {item.note && <p className="text-sm text-[#14241C]">{item.note}</p>}
                      {item.copingAction && (
                        <p className="text-xs text-[#1B4332]">Respuesta: {item.copingAction}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Eliminar registro"
                      onClick={() => handleDeleteConsumptionLog(item.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* SUBTAB 3: Sistema de Alertas y Prevención de Recaídas (HALT + Risk Engine) */}
      {subTab === 'alerts' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    riskSummary.level === 'alto'
                      ? 'bg-[#FEF2F2] text-[#991B1B]'
                      : riskSummary.level === 'moderado'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#EBF3EE] text-[#1B4332]'
                  }`}
                >
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#4C5E54]">Estado preventivo actual</p>
                  <h2 className="font-display text-2xl font-semibold text-[#14241C]">
                    {riskSummary.label}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-[#4C5E54]">{riskSummary.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSyncAlertsNow}
                  className="min-h-[44px] rounded-xl border border-[#1B4332] bg-[#FAF8F3] px-4 py-2 text-xs font-medium text-[#1B4332] hover:bg-[#EBF3EE] whitespace-nowrap"
                >
                  Evaluar alertas ahora
                </button>
                <button
                  type="button"
                  onClick={onOpenHelp}
                  className="min-h-[44px] rounded-xl bg-[#991B1B] px-4 py-2 text-xs font-medium text-white hover:bg-[#7F1D1D] whitespace-nowrap"
                >
                  Activar ayuda inmediata
                </button>
              </div>
            </div>

            {openAlerts.length > 0 || riskSummary.signals.length > 0 ? (
              <div className="mt-5 space-y-3 border-t border-[#E3DDD0] pt-5">
                <h3 className="text-sm font-semibold text-[#14241C]">
                  Alertas y señales preventivas activas
                </h3>
                {openAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 ${
                      alert.severity === 'alta'
                        ? 'border-[#991B1B]/30 bg-[#FEF2F2]'
                        : alert.severity === 'media'
                          ? 'border-[#D97706]/30 bg-[#FEF3C7]/45'
                          : 'border-[#E3DDD0] bg-[#FAF8F3]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[#14241C]">{alert.title}</p>
                        <p className="text-xs leading-relaxed text-[#4C5E54]">{alert.message}</p>
                        <p className="text-xs font-medium text-[#1B4332]">
                          Acción sugerida: {alert.recommendedAction}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!alert.acknowledged && (
                          <button
                            type="button"
                            onClick={() => handleUpdateAlertStatus(alert.id, { acknowledged: true })}
                            className="min-h-[38px] rounded-lg border border-[#D5CEBF] bg-white px-3 text-xs font-medium text-[#14241C]"
                          >
                            Entendido
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateAlertStatus(alert.id, { acknowledged: true, resolved: true })
                          }
                          className="min-h-[38px] rounded-lg bg-[#1B4332] px-3 text-xs font-medium text-[#F7F4EC]"
                        >
                          Marcar atendida
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {openAlerts.length === 0 &&
                  riskSummary.signals.map((sig) => (
                    <div
                      key={sig.ruleKey}
                      className="rounded-xl border border-[#D97706]/30 bg-[#FEF3C7]/40 p-4"
                    >
                      <p className="text-sm font-semibold text-[#14241C]">{sig.title}</p>
                      <p className="mt-1 text-xs text-[#4C5E54]">{sig.message}</p>
                      <p className="mt-1 text-xs font-medium text-[#1B4332]">
                        Sugerencia: {sig.recommendedAction}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-5 border-t border-[#E3DDD0] pt-4 text-sm text-[#4C5E54]">
                No hay alertas activas pendientes. Mantén tu chequeo HALT y tu plan diario al día.
              </p>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-12">
            <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-7">
              <div className="flex items-start gap-3">
                <Shield className="mt-1 h-5 w-5 shrink-0 text-[#1B4332]" />
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#14241C]">
                    Chequeo preventivo HALT
                  </h2>
                  <p className="mt-1 text-sm text-[#4C5E54]">
                    Antes de que crezca un deseo, revisa si estás en Hambre, Enojo, Soledad o Cansancio.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'hungry', title: 'H — Hambre o sed', desc: '¿Llevas horas sin comer o hidratarte bien?' },
                  { key: 'angry', title: 'A — Enojo o tensión', desc: '¿Sientes frustración o conflicto sin expresar?' },
                  { key: 'lonely', title: 'L — Soledad', desc: '¿Te has aislado de personas seguras hoy?' },
                  { key: 'tired', title: 'T — Cansancio', desc: '¿Dormiste poco o estás sobrecargado?' },
                ].map((item) => {
                  const checked = haltState[item.key as keyof typeof haltState];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setHaltState((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key as keyof typeof haltState],
                        }))
                      }
                      className={`min-h-[84px] rounded-xl border p-4 text-left transition ${
                        checked
                          ? 'border-[#1B4332] bg-[#EBF3EE]'
                          : 'border-[#E3DDD0] bg-[#FAF8F3] hover:border-[#1B4332]/40'
                      }`}
                    >
                      <p className="text-sm font-semibold text-[#14241C]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#4C5E54]">{item.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveHaltCheck}
                  className="min-h-[44px] rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
                >
                  Evaluar chequeo HALT
                </button>
                {vault.recoveryPlan.haltChecklistLastCheckedAt && (
                  <span className="text-xs text-[#4C5E54]">
                    Último chequeo: {formatDateTime(vault.recoveryPlan.haltChecklistLastCheckedAt)}
                  </span>
                )}
              </div>

              {haltFeedback && (
                <div className="mt-4 rounded-xl border border-[#1B4332]/20 bg-[#EBF3EE] p-4 text-sm text-[#14241C]">
                  {haltFeedback}
                </div>
              )}
            </section>

            <section className="flex flex-col justify-between rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#14241C]">
                  Kit inmediato ante impulsos
                </h2>
                <p className="mt-1 text-sm text-[#4C5E54]">
                  Herramientas interactivas listas incluso sin conexión.
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-[#14241C]">
                  <li className="rounded-xl bg-[#FAF8F3] p-3">
                    1. <strong>Respiración 4-7-8</strong>: reduce activación física en menos de 2 minutos.
                  </li>
                  <li className="rounded-xl bg-[#FAF8F3] p-3">
                    2. <strong>Surfing de la ola (10 min)</strong>: posterga cualquier decisión mientras el pico baja.
                  </li>
                  <li className="rounded-xl bg-[#FAF8F3] p-3">
                    3. <strong>Anclaje 5-4-3-2-1</strong>: regresa al presente con los cinco sentidos.
                  </li>
                </ul>
              </div>

              <div className="mt-5 grid gap-2.5">
                <button
                  type="button"
                  onClick={onOpenHelp}
                  className="min-h-[44px] w-full rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
                >
                  Abrir herramientas interactivas
                </button>
                <button
                  type="button"
                  onClick={onGoToAI}
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-white py-2.5 text-sm font-medium text-[#14241C] hover:bg-[#FAF8F3]"
                >
                  Hablar con RENACER IA
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Plan Personal */}
      {subTab === 'plan' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Mis motivos profundos para cambiar
            </h2>
            <p className="mt-1 text-xs text-[#4C5E54]">
              Lo que quieres cuidar y recuperar. RENACER IA los recuerda para animarte en días difíciles.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Ej. Recuperar mi tranquilidad y mi salud"
                className="min-h-[44px] flex-1 rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
              />
              <button
                type="button"
                onClick={() => addPlanItem('reasonsToChange', newReason, () => setNewReason(''))}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#1B4332] px-4 text-sm font-medium text-[#F7F4EC]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-4 divide-y divide-[#E3DDD0]">
              {vault.recoveryPlan.reasonsToChange.length === 0 ? (
                <li className="py-3 text-xs text-[#4C5E54]">Agrega al menos 1 motivo personal hoy.</li>
              ) : (
                vault.recoveryPlan.reasonsToChange.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>{item}</span>
                    <button
                      type="button"
                      aria-label="Eliminar motivo"
                      onClick={() => removePlanItem('reasonsToChange', idx)}
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Detonantes y situaciones de riesgo
            </h2>
            <p className="mt-1 text-xs text-[#4C5E54]">
              Lugares, horarios, emociones o personas que suelen disparar el deseo.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder="Ej. Viernes por la noche al llegar cansado"
                className="min-h-[44px] flex-1 rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
              />
              <button
                type="button"
                onClick={() => addPlanItem('triggers', newTrigger, () => setNewTrigger(''))}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#1B4332] px-4 text-sm font-medium text-[#F7F4EC]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-4 divide-y divide-[#E3DDD0]">
              {vault.recoveryPlan.triggers.length === 0 ? (
                <li className="py-3 text-xs text-[#4C5E54]">Aún no has listado detonantes personales.</li>
              ) : (
                vault.recoveryPlan.triggers.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>{item}</span>
                    <button
                      type="button"
                      aria-label="Eliminar detonante"
                      onClick={() => removePlanItem('triggers', idx)}
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Señales tempranas de alerta
            </h2>
            <p className="mt-1 text-xs text-[#4C5E54]">
              Cambios sutiles antes de un impulso fuerte (aislarse, dejar de dormir, justificarse).
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newWarningSign}
                onChange={(e) => setNewWarningSign(e.target.value)}
                placeholder="Ej. Dejar de contestar mensajes de mi familia"
                className="min-h-[44px] flex-1 rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
              />
              <button
                type="button"
                onClick={() => addPlanItem('warningSigns', newWarningSign, () => setNewWarningSign(''))}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#1B4332] px-4 text-sm font-medium text-[#F7F4EC]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-4 divide-y divide-[#E3DDD0]">
              {vault.recoveryPlan.warningSigns.length === 0 ? (
                <li className="py-3 text-xs text-[#4C5E54]">Anota tus primeras señales de alerta.</li>
              ) : (
                vault.recoveryPlan.warningSigns.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>{item}</span>
                    <button
                      type="button"
                      aria-label="Eliminar señal"
                      onClick={() => removePlanItem('warningSigns', idx)}
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Herramientas que sí me funcionan
            </h2>
            <p className="mt-1 text-xs text-[#4C5E54]">
              Acciones concretas para aplicar en los primeros 10 minutos de un impulso.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newStrategy}
                onChange={(e) => setNewStrategy(e.target.value)}
                placeholder="Ej. Salir de casa sin cartera ni tarjetas 20 min"
                className="min-h-[44px] flex-1 rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
              />
              <button
                type="button"
                onClick={() => addPlanItem('copingStrategies', newStrategy, () => setNewStrategy(''))}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#1B4332] px-4 text-sm font-medium text-[#F7F4EC]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-4 divide-y divide-[#E3DDD0]">
              {vault.recoveryPlan.copingStrategies.map((item, idx) => (
                <li key={`${item}-${idx}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span>{item}</span>
                  <button
                    type="button"
                    aria-label="Eliminar estrategia"
                    onClick={() => removePlanItem('copingStrategies', idx)}
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* SUBTAB 5: Evaluación Inicial de Recuperación */}
      {subTab === 'assessment' && (
        <AssessmentView
          vault={vault}
          onUpdateVault={onUpdateVault}
          onOpenHelp={onOpenHelp}
        />
      )}

      {/* SUBTAB 6: Reinicio compasivo & etapas conservadas */}
      {subTab === 'reset' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF3EE] text-[#1B4332]">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#14241C]">
                  Reiniciar seguimiento sin culpa
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#4C5E54]">
                  Un tropiezo o recaída no borra lo que ya aprendiste. Guardamos tus{' '}
                  <strong className="font-mono tabular-nums">{days}</strong> días previos en tu historial
                  de etapas con tu reflexión, y abrimos un nuevo comienzo hoy.
                </p>
              </div>
            </div>

            {resetDoneMsg && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-4 text-sm text-[#1B4332]">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>
                  Nuevo comienzo registrado con respeto. Tu etapa anterior quedó guardada en tu historial.
                </span>
              </div>
            )}

            {!confirmResetOpen ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="min-h-[44px] rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
                >
                  Iniciar una nueva etapa hoy
                </button>
                <button
                  type="button"
                  onClick={onGoToAI}
                  className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-white px-5 py-2.5 text-sm font-medium text-[#14241C] hover:bg-[#FAF8F3]"
                >
                  Hablar primero con RENACER IA
                </button>
              </div>
            ) : (
              <form onSubmit={handleCompassionateReset} className="mt-6 space-y-4 border-t border-[#E3DDD0] pt-5">
                <div>
                  <label htmlFor="reset-date" className="mb-1.5 block text-sm font-medium text-[#14241C]">
                    Fecha de inicio de esta nueva etapa
                  </label>
                  <input
                    id="reset-date"
                    type="date"
                    max={todayISO()}
                    value={resetDate}
                    onChange={(e) => setResetDate(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="reset-reflection" className="mb-1.5 block text-sm font-medium text-[#14241C]">
                    ¿Qué aprendizaje te llevas para cuidarte mejor esta vez?
                  </label>
                  <textarea
                    id="reset-reflection"
                    rows={3}
                    maxLength={400}
                    value={resetReflection}
                    onChange={(e) => setResetReflection(e.target.value)}
                    placeholder="Ej. Noté que aislarme cuando estoy agotado aumenta el riesgo; pediré ayuda antes."
                    className="w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    className="min-h-[44px] rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
                  >
                    Confirmar nuevo comienzo
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-white px-4 py-2.5 text-sm font-medium text-[#14241C]"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="flex items-center gap-2 text-xs text-[#4C5E54]">
                  <AlertTriangle className="h-4 w-4 text-[#A16207]" />
                  <span>Si sientes malestar físico intenso o riesgo médico, busca atención profesional presencial.</span>
                </p>
              </form>
            )}
          </section>

          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-5">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-[#1B4332]" />
              <h2 className="font-display text-xl font-semibold text-[#14241C]">
                Etapas conservadas
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#4C5E54]">
              Cada día vivido en recuperación suma experiencia real.
            </p>
            {vault.recoveryHistory.length === 0 ? (
              <p className="mt-4 text-sm text-[#4C5E54]">
                Actualmente estás construyendo tu etapa activa (<span className="font-mono tabular-nums">{days}</span>{' '}
                días).
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#E3DDD0]">
                {vault.recoveryHistory.map((stg) => (
                  <div key={stg.id} className="py-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1B4332]">
                        <span className="font-mono tabular-nums">{stg.daysCompleted}</span> días recorridos
                      </span>
                      <span className="text-[#4C5E54]">
                        {formatShortDate(stg.startedAt)} – {formatShortDate(stg.endedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#14241C]">{stg.reflection}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
