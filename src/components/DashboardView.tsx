import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Compass,
  MessageCircleHeart,
  Plus,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type {
  ConsumptionLog,
  EmotionalLog,
  MoodState,
  UserVaultData,
} from '../types/renacer';
import { evaluateRelapseRisk, mergeDetectedAlerts } from '../utils/alertEngine';
import {
  calculateDaysInRecovery,
  formatDateTime,
  formatShortDate,
  getLast7DateKeys,
  getNextMilestone,
  todayISO,
} from '../utils/recoveryMath';
import type { RecoverySubTab } from './RecoveryView';
import type { ModuleTab } from './ModulesView';

interface DashboardViewProps {
  vault: UserVaultData;
  onUpdateVault: (updater: (prev: UserVaultData) => UserVaultData) => Promise<void>;
  onOpenHelp: () => void;
  onNavigate: (
    tab: 'dashboard' | 'recovery' | 'journal' | 'ai' | 'modules' | 'profile',
    subTab?: RecoverySubTab | ModuleTab
  ) => void;
}

const MOODS: MoodState[] = ['Tranquilo', 'Esperanzado', 'Cansado', 'Ansioso', 'Vulnerable', 'Abrumado'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  vault,
  onUpdateVault,
  onOpenHelp,
  onNavigate,
}) => {
  const { days, hours } = calculateDaysInRecovery(vault.profile.recoveryStartDate);
  const milestone = getNextMilestone(days);
  const milestoneProgress = Math.min(100, Math.round((days / Math.max(1, milestone.target)) * 100));
  const todayKey = todayISO();

  const todayEmotion = vault.emotionalLogs.find((e) => e.date === todayKey);
  const riskSummary = evaluateRelapseRisk(vault);

  // Emotion check-in state
  const [mood, setMood] = useState<MoodState>(todayEmotion?.mood ?? 'Tranquilo');
  const [energyLevel, setEnergyLevel] = useState<number>(todayEmotion?.energyLevel ?? 3);
  const [stressLevel, setStressLevel] = useState<number>(todayEmotion?.stressLevel ?? 2);
  const [emotionNote, setEmotionNote] = useState<string>(todayEmotion?.note ?? '');
  const [savingEmotion, setSavingEmotion] = useState(false);
  const [emotionSavedMsg, setEmotionSavedMsg] = useState(false);

  useEffect(() => {
    if (todayEmotion) {
      setMood(todayEmotion.mood);
      setEnergyLevel(todayEmotion.energyLevel);
      setStressLevel(todayEmotion.stressLevel);
      setEmotionNote(todayEmotion.note);
    }
  }, [todayEmotion?.id, todayEmotion?.createdAt, todayEmotion?.mood, todayEmotion?.energyLevel, todayEmotion?.stressLevel, todayEmotion?.note]);

  // Quick Consumption / Craving / Gambling / Relapse inline form
  const [showLogForm, setShowLogForm] = useState(false);
  const [entryType, setEntryType] = useState<ConsumptionLog['entryType']>('deseo');
  const [cravingIntensity, setCravingIntensity] = useState(5);
  const [cravingTrigger, setCravingTrigger] = useState('Estrés o tensión');
  const [cravingTool, setCravingTool] = useState('Respiración 4-7-8');
  const [amountSpent, setAmountSpent] = useState('0');
  const [cravingNote, setCravingNote] = useState('');
  const [savingCraving, setSavingCraving] = useState(false);

  const handleSaveEmotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmotion(true);
    try {
      const newLog: EmotionalLog = {
        id: todayEmotion?.id ?? `emo_${Date.now()}`,
        date: todayKey,
        createdAt: new Date().toISOString(),
        mood,
        energyLevel,
        stressLevel,
        note: emotionNote.trim().slice(0, 400),
      };
      await onUpdateVault((prev) => {
        const nextVault: UserVaultData = {
          ...prev,
          emotionalLogs: [
            newLog,
            ...prev.emotionalLogs.filter((item) => item.date !== todayKey),
          ].slice(0, 90),
        };
        nextVault.alerts = mergeDetectedAlerts(prev.alerts, evaluateRelapseRisk(nextVault));
        return nextVault;
      });
      setEmotionSavedMsg(true);
      setTimeout(() => setEmotionSavedMsg(false), 2500);
    } catch {
      setEmotionSavedMsg(false);
    } finally {
      setSavingEmotion(false);
    }
  };

  const handleSaveQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCraving(true);
    try {
      const nowIso = new Date().toISOString();
      const entry: ConsumptionLog = {
        id: `con_${Date.now()}`,
        entryType,
        category: vault.profile.focus,
        intensity: cravingIntensity,
        amountSpent: Math.max(0, Math.min(100_000_000, Number(amountSpent) || 0)),
        trigger: cravingTrigger,
        locationContext: 'Registro rápido en panel',
        copingAction: cravingTool,
        resetApplied: false,
        occurredAt: nowIso,
        note: cravingNote.trim().slice(0, 500),
        createdAt: nowIso,
      };
      await onUpdateVault((prev) => {
        const nextVault: UserVaultData = {
          ...prev,
          consumptionLogs: [entry, ...prev.consumptionLogs].slice(0, 200),
        };
        nextVault.alerts = mergeDetectedAlerts(prev.alerts, evaluateRelapseRisk(nextVault));
        return nextVault;
      });
      setCravingNote('');
      setAmountSpent('0');
      setShowLogForm(false);
    } catch {
      // Error surfaced globally via App persistError banner; preserve inputs
    } finally {
      setSavingCraving(false);
    }
  };

  const toggleDailyPlanToday = async (itemId: string) => {
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
      // Handled via App persistError banner and rollback
    }
  };

  const toggleHabitToday = async (habitId: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== habitId) return h;
          const done = h.completedDates.includes(todayKey);
          return {
            ...h,
            completedDates: done
              ? h.completedDates.filter((d) => d !== todayKey)
              : [...h.completedDates, todayKey],
          };
        }),
      }));
    } catch {
      // Handled via App persistError banner and rollback
    }
  };

  const completedTodayCount = vault.habits.filter((h) => h.completedDates.includes(todayKey)).length;
  const activeDailyPlan = vault.dailyPlan.filter((i) => i.active);
  const completedDailyToday = activeDailyPlan.filter((i) => i.completedDates.includes(todayKey)).length;

  const recentConsumption = vault.consumptionLogs.slice(0, 3);
  const desiresResisted = vault.consumptionLogs.filter((c) => c.entryType === 'deseo').length +
    vault.cravingLogs.filter((c) => c.outcome === 'superado').length;
  const estimatedSaved = days * (vault.profile.dailySpendEstimate || 0);
  const activeGoals = vault.lifeGoals.filter((g) => !g.completed).slice(0, 3);
  const last7Keys = getLast7DateKeys();
  const activeAlertCount = vault.alerts.filter((a) => !a.resolved).length;

  return (
    <div className="space-y-6">
      {/* Contextual Banners: Initial Assessment & Preventive Risk Alert */}
      {!vault.initialAssessment && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1B4332]/25 bg-[#EBF3EE] p-5">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4332]" />
            <div>
              <h2 className="font-display text-base font-semibold text-[#14241C]">
                Completa tu Evaluación Inicial de Recuperación
              </h2>
              <p className="mt-0.5 text-xs text-[#2D4A3B]">
                Toma 2 minutos definir tus horarios vulnerables y detonantes para personalizar tu plan diario.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('recovery', 'assessment')}
            className="min-h-[44px] rounded-xl bg-[#1B4332] px-4 py-2 text-xs font-medium text-[#F7F4EC] hover:bg-[#143326] whitespace-nowrap shrink-0"
          >
            Hacer evaluación ahora
          </button>
        </section>
      )}

      {(riskSummary.level !== 'bajo' || activeAlertCount > 0) && (
        <section
          className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
            riskSummary.level === 'alto'
              ? 'border-[#991B1B]/30 bg-[#FEF2F2]'
              : 'border-[#D97706]/30 bg-[#FEF3C7]/55'
          }`}
        >
          <div className="flex items-start gap-3">
            <BellRing
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                riskSummary.level === 'alto' ? 'text-[#991B1B]' : 'text-[#92400E]'
              }`}
            />
            <div>
              <h2 className="font-display text-base font-semibold text-[#14241C]">
                Alerta preventiva: {riskSummary.label}
              </h2>
              <p className="mt-0.5 text-xs text-[#4C5E54]">{riskSummary.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('recovery', 'alerts')}
              className="min-h-[40px] rounded-xl border border-[#14241C]/20 bg-white px-3.5 py-2 text-xs font-medium text-[#14241C] whitespace-nowrap"
            >
              Ver alertas y chequeo HALT
            </button>
            <button
              type="button"
              onClick={onOpenHelp}
              className="min-h-[40px] rounded-xl bg-[#991B1B] px-3.5 py-2 text-xs font-medium text-white whitespace-nowrap"
            >
              Ayuda inmediata
            </button>
          </div>
        </section>
      )}

      {/* Hero Recovery Summary Strip */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl border border-[#1B4332]/20 bg-[#1B4332] p-6 text-[#F7F4EC] lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#D8E8DF]">
            <span>{vault.profile.focus}</span>
            <span aria-hidden="true">·</span>
            <span>{vault.profile.personalMotto || 'Un día a la vez'}</span>
          </div>

          <div className="my-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-[#D8E8DF]">Tiempo en esta etapa</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-white">
                  {days}
                </span>
                <span className="text-base text-[#D8E8DF]">
                  {days === 1 ? 'día' : 'días'} · <span className="font-mono tabular-nums">{hours}h</span>
                </span>
              </div>
            </div>

            {vault.profile.dailySpendEstimate > 0 && (
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-right">
                <p className="text-xs text-[#D8E8DF]">Ahorro estimado</p>
                <p className="font-mono text-xl font-semibold tabular-nums text-white">
                  {vault.profile.currency} {estimatedSaved.toLocaleString('es-ES')}
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-[#D8E8DF]">
              <span>Próximo hito: {milestone.label}</span>
              <span className="font-mono tabular-nums">{days}/{milestone.target} días</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#B7E4C7] transition-all"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Immediate Help & AI Quick Access */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#14241C]">
              Acceso rápido a ayuda
            </h2>
            <p className="mt-1 text-sm text-[#4C5E54]">
              Si sientes un impulso fuerte, ansiedad o riesgo de recaída, activa una pausa guiada ahora.
            </p>
          </div>

          <div className="grid gap-2.5">
            <button
              type="button"
              onClick={onOpenHelp}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#991B1B] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#7F1D1D]"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Necesito ayuda ahora</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('ai')}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] px-4 py-2.5 text-sm font-medium text-[#1B4332] transition hover:bg-[#DDECE3]"
            >
              <MessageCircleHeart className="h-4 w-4" />
              <span>Conversar con RENACER IA (asistente)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main 2-Column Interactive Workspace */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Daily Emotional Check-In */}
        <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#14241C]">
                Estado emocional diario
              </h2>
              <p className="mt-0.5 text-xs text-[#4C5E54]">
                {todayEmotion
                  ? `Último registro hoy · ${todayEmotion.mood}`
                  : 'Tómate 30 segundos para observar cómo te sientes hoy.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('journal')}
                className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-[#1B4332] hover:underline whitespace-nowrap"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Abrir diario</span>
              </button>
              <div className="flex items-center gap-1.5">
                {last7Keys.map((k) => {
                  const logged = vault.emotionalLogs.some((e) => e.date === k);
                  return (
                    <span
                      key={k}
                      title={`${k}: ${logged ? 'Registrado' : 'Sin registro'}`}
                      className={`h-2.5 w-2.5 rounded-full ${
                        logged ? 'bg-[#1B4332]' : 'bg-[#E3DDD0]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveEmotion} className="mt-5 space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-[#4C5E54]">¿Cómo te sientes principalmente hoy?</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-medium transition sm:text-sm ${
                      mood === m
                        ? 'border-[#1B4332] bg-[#1B4332] text-[#F7F4EC]'
                        : 'border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C] hover:border-[#1B4332]/40'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3.5">
                <div className="flex items-center justify-between text-xs font-medium text-[#14241C]">
                  <span>Energía física</span>
                  <span className="font-mono tabular-nums">{energyLevel}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  aria-label="Nivel de energía"
                  className="mt-2 w-full accent-[#1B4332]"
                />
              </div>

              <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3.5">
                <div className="flex items-center justify-between text-xs font-medium text-[#14241C]">
                  <span>Nivel de estrés o tensión</span>
                  <span className="font-mono tabular-nums">{stressLevel}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={stressLevel}
                  onChange={(e) => setStressLevel(Number(e.target.value))}
                  aria-label="Nivel de estrés"
                  className="mt-2 w-full accent-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="emotion-note" className="mb-1.5 block text-xs font-medium text-[#4C5E54]">
                Nota breve (opcional)
              </label>
              <textarea
                id="emotion-note"
                rows={2}
                maxLength={400}
                value={emotionNote}
                onChange={(e) => setEmotionNote(e.target.value)}
                placeholder="¿Qué ayudó o qué pesó más hoy?"
                className="w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 py-2.5 text-sm text-[#14241C] focus:border-[#1B4332] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={savingEmotion}
                className="min-h-[44px] rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-medium text-[#F7F4EC] transition hover:bg-[#143326] disabled:opacity-60"
              >
                {savingEmotion ? 'Guardando...' : todayEmotion ? 'Actualizar estado de hoy' : 'Guardar estado de hoy'}
              </button>
              {emotionSavedMsg && (
                <span className="text-xs font-medium text-[#1B4332]">
                  Guardado en Cloud Firestore.
                </span>
              )}
            </div>
          </form>
        </section>

        {/* Consumption / Cravings / Gambling / Relapse Tracker */}
        <section className="flex flex-col justify-between rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#14241C]">
                  Deseos, consumo y apuestas
                </h2>
                <p className="mt-0.5 text-xs text-[#4C5E54]">
                  Registra un impulso o episodio para observar detonantes sin juzgarte.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogForm((v) => !v)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#1B4332] px-3 py-2 text-xs font-medium text-[#1B4332] hover:bg-[#EBF3EE] whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>{showLogForm ? 'Cerrar' : 'Registrar'}</span>
              </button>
            </div>

            {showLogForm ? (
              <form onSubmit={handleSaveQuickLog} className="mt-4 space-y-3 border-t border-[#E3DDD0] pt-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'deseo', label: 'Deseo / Impulso' },
                    { id: 'consumo', label: 'Consumo' },
                    { id: 'apuesta', label: 'Apuesta' },
                    { id: 'recaida', label: 'Recaída' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEntryType(opt.id as ConsumptionLog['entryType'])}
                      className={`min-h-[40px] rounded-lg border px-2.5 text-xs font-medium ${
                        entryType === opt.id
                          ? 'border-[#1B4332] bg-[#1B4332] text-[#F7F4EC]'
                          : 'border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-[#14241C]">
                    <span>Intensidad</span>
                    <span className="font-mono tabular-nums">{cravingIntensity}/10</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={cravingIntensity}
                    onChange={(e) => setCravingIntensity(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#1B4332]"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Detonante</label>
                    <select
                      value={cravingTrigger}
                      onChange={(e) => setCravingTrigger(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-xs text-[#14241C]"
                    >
                      <option>Estrés o tensión</option>
                      <option>Soledad o aislamiento</option>
                      <option>Cansancio físico</option>
                      <option>Discusión o conflicto</option>
                      <option>Dinero o ansiedad financiera</option>
                      <option>Entorno social / disponibilidad</option>
                      <option>Aburrimiento</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#4C5E54]">
                      Gasto ({vault.profile.currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100000000}
                      step="0.01"
                      value={amountSpent}
                      onChange={(e) => setAmountSpent(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 font-mono text-xs tabular-nums text-[#14241C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Herramienta o respuesta</label>
                  <input
                    type="text"
                    value={cravingTool}
                    onChange={(e) => setCravingTool(e.target.value)}
                    placeholder="Ej. Respiración 4-7-8, salir a caminar"
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-xs text-[#14241C]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Nota breve</label>
                  <input
                    type="text"
                    maxLength={240}
                    value={cravingNote}
                    onChange={(e) => setCravingNote(e.target.value)}
                    placeholder="¿Qué ayudó o qué aprendiste?"
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-xs text-[#14241C]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingCraving}
                  className="min-h-[44px] w-full rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
                >
                  {savingCraving ? 'Guardando...' : 'Guardar registro'}
                </button>
              </form>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 border-y border-[#E3DDD0] py-3 text-sm">
                  <div>
                    <p className="text-xs text-[#4C5E54]">Deseos registrados</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums text-[#1B4332]">
                      {desiresResisted}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#4C5E54]">Total registros</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums text-[#14241C]">
                      {vault.consumptionLogs.length + vault.cravingLogs.length}
                    </p>
                  </div>
                </div>

                {recentConsumption.length === 0 && vault.cravingLogs.length === 0 ? (
                  <p className="py-4 text-sm text-[#4C5E54]">
                    Si aparece un impulso, consumo o apuesta, regístralo aquí para identificar tus patrones.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E3DDD0]">
                    {recentConsumption.map((c) => (
                      <div key={c.id} className="py-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-[#14241C] capitalize">
                            {c.entryType} · {c.trigger} · <span className="font-mono tabular-nums">{c.intensity}/10</span>
                          </span>
                          <span className="text-[#4C5E54]">{formatDateTime(c.occurredAt)}</span>
                        </div>
                        {c.copingAction && (
                          <p className="mt-0.5 text-xs text-[#4C5E54]">{c.copingAction}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('recovery', 'logs')}
            className="mt-4 flex min-h-[44px] items-center justify-between rounded-xl bg-[#FAF8F3] px-4 py-2.5 text-xs font-medium text-[#1B4332] hover:bg-[#EFEAE0]"
          >
            <span>Abrir historial de consumo, apuestas y alertas</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>

      {/* Middle Section: Daily Recovery Plan Summary */}
      <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#14241C]">
              Plan diario de recuperación
            </h2>
            <p className="mt-0.5 text-xs text-[#4C5E54]">
              <span className="font-mono tabular-nums">
                {completedDailyToday}/{activeDailyPlan.length}
              </span>{' '}
              acciones protectoras completadas hoy
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('recovery', 'daily')}
            className="min-h-[40px] text-xs font-medium text-[#1B4332] hover:underline"
          >
            Editar plan diario
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeDailyPlan.slice(0, 6).map((item) => {
            const done = item.completedDates.includes(todayKey);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleDailyPlanToday(item.id)}
                className={`flex min-h-[56px] items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  done
                    ? 'border-[#1B4332]/25 bg-[#EBF3EE]'
                    : 'border-[#E3DDD0] bg-[#FAF8F3] hover:border-[#1B4332]/40'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4332]" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#9CA3AF]" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm ${done ? 'text-[#4C5E54] line-through' : 'font-medium text-[#14241C]'}`}>
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[#4C5E54] capitalize">
                    {item.timeBlock === 'manana' ? 'Mañana' : item.timeBlock} · {item.category}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bottom 2-Column Grid: Habits + Life Goals */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#14241C]">Hábitos de hoy</h2>
              <p className="mt-0.5 text-xs text-[#4C5E54]">
                <span className="font-mono tabular-nums">
                  {completedTodayCount}/{vault.habits.length}
                </span>{' '}
                completados hoy
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('modules', 'habits')}
              className="min-h-[40px] text-xs font-medium text-[#1B4332] hover:underline"
            >
              Gestionar hábitos
            </button>
          </div>

          <div className="mt-4 divide-y divide-[#E3DDD0]">
            {vault.habits.length === 0 ? (
              <p className="py-4 text-sm text-[#4C5E54]">No tienes hábitos configurados aún.</p>
            ) : (
              vault.habits.map((habit) => {
                const done = habit.completedDates.includes(todayKey);
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => toggleHabitToday(habit.id)}
                    className="flex min-h-[52px] w-full items-center justify-between gap-3 py-2.5 text-left transition hover:bg-[#FAF8F3]"
                  >
                    <div className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1B4332]" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
                      )}
                      <span
                        className={`text-sm ${
                          done ? 'text-[#4C5E54] line-through' : 'font-medium text-[#14241C]'
                        }`}
                      >
                        {habit.title}
                      </span>
                    </div>
                    <span className="text-xs text-[#4C5E54] capitalize">{habit.category}</span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#14241C]">
                Objetivos y progreso
              </h2>
              <p className="mt-0.5 text-xs text-[#4C5E54]">
                Metas concretas para construir estabilidad y propósito
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('modules', 'goals')}
              className="min-h-[40px] text-xs font-medium text-[#1B4332] hover:underline"
            >
              Ver todas
            </button>
          </div>

          {activeGoals.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-[#D5CEBF] bg-[#FAF8F3] p-5 text-center">
              <Compass className="mx-auto h-6 w-6 text-[#1B4332]" />
              <p className="mt-2 text-sm font-medium text-[#14241C]">
                Define tu primera meta personal
              </p>
              <p className="mt-1 text-xs text-[#4C5E54]">
                Pequeños pasos en salud, finanzas o relaciones consolidan tu recuperación.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('modules', 'goals')}
                className="mt-3 min-h-[44px] rounded-xl bg-[#1B4332] px-4 py-2 text-xs font-medium text-[#F7F4EC]"
              >
                Crear primera meta
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {activeGoals.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#14241C]">{goal.title}</span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#1B4332]">
                      {goal.progress}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#4C5E54]">
                    {goal.area} · Próximo paso: {goal.nextStep || 'Definir acción'} · Meta{' '}
                    {formatShortDate(goal.targetDate)}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E3DDD0]">
                    <div
                      className="h-full rounded-full bg-[#1B4332]"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-[#E3DDD0] pt-3 text-xs text-[#4C5E54]">
            <TrendingUp className="h-4 w-4 text-[#1B4332]" />
            <span>
              {vault.journalEntries.length} entradas de diario · {vault.emotionalLogs.length} registros
              emocionales · {vault.supportContacts.length} contactos
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
