import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldAlert } from 'lucide-react';
import type { InitialAssessment, RecoveryFocus, UserVaultData } from '../types/renacer';
import { buildRecommendedDailyPlanFromAssessment } from '../utils/alertEngine';
import { formatDateTime } from '../utils/recoveryMath';

interface AssessmentViewProps {
  vault: UserVaultData;
  onUpdateVault: (updater: (prev: UserVaultData) => UserVaultData) => Promise<void>;
  onOpenHelp: () => void;
  onCompleted?: () => void;
}

const FOCUS_OPTIONS: RecoveryFocus[] = [
  'Alcohol',
  'Sustancias',
  'Apuestas y juego',
  'Tabaco o nicotina',
  'Conductas compulsivas',
  'Reconstrucción integral',
];

const SECONDARY_AREA_OPTIONS = [
  'Alcohol',
  'Sustancias',
  'Apuestas y juego',
  'Tabaco o nicotina',
  'Ansiedad o insomnio',
  'Aislamiento social',
];

const HIGH_RISK_TIME_OPTIONS = [
  'Madrugada',
  'Mañanas sin estructura',
  'Tardes al salir del trabajo',
  'Noches en casa',
  'Fines de semana',
  'Al recibir dinero o pago',
  'Después de discusiones',
  'Reuniones sociales',
];

const TRIGGER_OPTIONS = [
  'Estrés o sobrecarga',
  'Soledad o aburrimiento',
  'Cansancio acumulado',
  'Conflicto familiar o de pareja',
  'Presión económica',
  'Disponibilidad o amistades de riesgo',
  'Tristeza o vacío',
  'Celebración o exceso de confianza',
];

export const AssessmentView: React.FC<AssessmentViewProps> = ({
  vault,
  onUpdateVault,
  onOpenHelp,
  onCompleted,
}) => {
  const existing = vault.initialAssessment;

  const [primaryFocus, setPrimaryFocus] = useState<RecoveryFocus>(
    existing?.primaryFocus ?? vault.profile.focus
  );
  const [secondaryAreas, setSecondaryAreas] = useState<string[]>(existing?.secondaryAreas ?? []);
  const [frequencyLevel, setFrequencyLevel] = useState<InitialAssessment['frequencyLevel']>(
    existing?.frequencyLevel ?? 'semanal'
  );
  const [severityScore, setSeverityScore] = useState<number>(existing?.severityScore ?? 5);
  const [readinessScore, setReadinessScore] = useState<number>(existing?.readinessScore ?? 8);
  const [highRiskTimes, setHighRiskTimes] = useState<string[]>(
    existing?.highRiskTimes ?? ['Noches en casa']
  );
  const [mainTriggers, setMainTriggers] = useState<string[]>(
    existing?.mainTriggers ?? ['Estrés o sobrecarga']
  );
  const [supportLevel, setSupportLevel] = useState<InitialAssessment['supportLevel']>(
    existing?.supportLevel ?? 'moderado'
  );
  const [clinicalAttentionFlag, setClinicalAttentionFlag] = useState<boolean>(
    existing?.clinicalAttentionFlag ?? false
  );
  const [notes, setNotes] = useState<string>(existing?.notes ?? '');
  const [applyRecommendations, setApplyRecommendations] = useState<boolean>(!existing);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleBounded = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    max: number
  ) => {
    if (list.includes(value)) {
      setter(list.filter((item) => item !== value));
    } else if (list.length < max) {
      setter([...list, value]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);
    setSaving(true);

    try {
      const nowIso = new Date().toISOString();
      const assessment: InitialAssessment = {
        id: 'initial',
        primaryFocus,
        secondaryAreas: secondaryAreas.slice(0, 6),
        frequencyLevel,
        severityScore,
        readinessScore,
        highRiskTimes: highRiskTimes.slice(0, 8),
        mainTriggers: mainTriggers.slice(0, 10),
        supportLevel,
        clinicalAttentionFlag,
        notes: notes.trim().slice(0, 500),
        completedAt: nowIso,
      };

      await onUpdateVault((prev) => {
        const mergedTriggers = applyRecommendations
          ? Array.from(new Set([...prev.recoveryPlan.triggers, ...mainTriggers])).slice(0, 20)
          : prev.recoveryPlan.triggers;

        const existingTitles = new Set(prev.dailyPlan.map((d) => d.title.toLowerCase()));
        const generatedItems = applyRecommendations
          ? buildRecommendedDailyPlanFromAssessment(assessment).filter(
              (item) => !existingTitles.has(item.title.toLowerCase())
            )
          : [];

        return {
          ...prev,
          profile: {
            ...prev.profile,
            focus: primaryFocus,
          },
          initialAssessment: assessment,
          recoveryPlan: {
            ...prev.recoveryPlan,
            triggers: mergedTriggers,
          },
          dailyPlan:
            generatedItems.length > 0 ? [...prev.dailyPlan, ...generatedItems] : prev.dailyPlan,
        };
      });

      setSavedMsg(
        applyRecommendations
          ? 'Evaluación guardada en Firestore y aplicada a tus detonantes y plan diario.'
          : 'Evaluación inicial actualizada en Cloud Firestore.'
      );
      if (onCompleted) {
        onCompleted();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar la evaluación en Cloud Firestore.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF3EE] text-[#1B4332]">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#14241C]">
                Evaluación inicial de recuperación
              </h2>
              <p className="mt-1 text-sm text-[#4C5E54]">
                Establece tu punto de partida real para adaptar tu plan diario, tus alertas preventivas y el
                acompañamiento de RENACER IA.
              </p>
              {existing && (
                <p className="mt-1 text-xs text-[#1B4332]">
                  Última actualización: {formatDateTime(existing.completedAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3.5 text-sm text-[#991B1B]">
            {error}
          </div>
        )}

        {savedMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-3.5 text-sm text-[#1B4332]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#14241C]">
              Área principal que deseas atender
            </label>
            <select
              value={primaryFocus}
              onChange={(e) => setPrimaryFocus(e.target.value as RecoveryFocus)}
              className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
            >
              {FOCUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#14241C]">
              Frecuencia reciente antes de iniciar esta etapa
            </label>
            <select
              value={frequencyLevel}
              onChange={(e) =>
                setFrequencyLevel(e.target.value as InitialAssessment['frequencyLevel'])
              }
              className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
            >
              <option value="diaria">Diaria o casi diaria</option>
              <option value="semanal">Varias veces por semana</option>
              <option value="episodica">Episódica o por rachas</option>
              <option value="en_abstinencia">Ya llevo tiempo sin consumo y busco sostenerme</option>
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4">
            <div className="flex items-center justify-between text-sm font-medium text-[#14241C]">
              <span>Impacto actual en tu vida diaria</span>
              <span className="font-mono tabular-nums text-[#1B4332]">{severityScore}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={severityScore}
              onChange={(e) => setSeverityScore(Number(e.target.value))}
              className="mt-2 w-full accent-[#1B4332]"
            />
            <p className="mt-1 text-xs text-[#4C5E54]">
              1 = impacto leve · 10 = afectación muy intensa en salud, finanzas o vínculos
            </p>
          </div>

          <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4">
            <div className="flex items-center justify-between text-sm font-medium text-[#14241C]">
              <span>Disposición actual al cambio</span>
              <span className="font-mono tabular-nums text-[#1B4332]">{readinessScore}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={readinessScore}
              onChange={(e) => setReadinessScore(Number(e.target.value))}
              className="mt-2 w-full accent-[#1B4332]"
            />
            <p className="mt-1 text-xs text-[#4C5E54]">
              1 = aún con dudas · 10 = decisión firme de dar pasos hoy
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-[#14241C]">
            Áreas secundarias relacionadas (opcional, máximo 6)
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {SECONDARY_AREA_OPTIONS.map((area) => {
              const active = secondaryAreas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleBounded(secondaryAreas, setSecondaryAreas, area, 6)}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                    active
                      ? 'border-[#1B4332] bg-[#1B4332] text-[#F7F4EC]'
                      : 'border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C] hover:border-[#1B4332]/40'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-[#14241C]">
              Horarios o momentos de mayor vulnerabilidad (máx. 8)
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {HIGH_RISK_TIME_OPTIONS.map((slot) => {
                const active = highRiskTimes.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleBounded(highRiskTimes, setHighRiskTimes, slot, 8)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                      active
                        ? 'border-[#1B4332] bg-[#EBF3EE] text-[#1B4332]'
                        : 'border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C]'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#14241C]">
              Principales detonantes identificados (máx. 10)
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TRIGGER_OPTIONS.map((trig) => {
                const active = mainTriggers.includes(trig);
                return (
                  <button
                    key={trig}
                    type="button"
                    onClick={() => toggleBounded(mainTriggers, setMainTriggers, trig, 10)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                      active
                        ? 'border-[#1B4332] bg-[#EBF3EE] text-[#1B4332]'
                        : 'border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C]'
                    }`}
                  >
                    {trig}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#14241C]">
              Nivel de red de apoyo cercana hoy
            </label>
            <select
              value={supportLevel}
              onChange={(e) => setSupportLevel(e.target.value as InitialAssessment['supportLevel'])}
              className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
            >
              <option value="alto">Alto — tengo personas seguras con quienes hablar</option>
              <option value="moderado">Moderado — cuento con alguien pero me cuesta pedir ayuda</option>
              <option value="bajo">Bajo — pocas personas saben lo que atravieso</option>
              <option value="aislado">Aislado — siento que no tengo con quién apoyarme ahora</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#14241C]">
              Contexto adicional (opcional)
            </label>
            <input
              type="text"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Busco recuperar orden financiero y descanso nocturno"
              className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
            />
          </div>
        </div>

        {/* Clinical / Safety Flag */}
        <div className="mt-5 rounded-xl border border-[#D97706]/30 bg-[#FEF3C7]/45 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#14241C]">
            <input
              type="checkbox"
              checked={clinicalAttentionFlag}
              onChange={(e) => setClinicalAttentionFlag(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#991B1B]"
            />
            <span>
              <strong>Verificación de seguridad física:</strong> presento síntomas intensos al suspender
              el consumo (temblores severos, sudoración extrema, confusión, taquicardia) o riesgo médico /
              crisis emocional grave.
            </span>
          </label>

          {clinicalAttentionFlag && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3.5 text-xs text-[#991B1B]">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  RENACER no indica desintoxicaciones caseras ni sustituye valoración médica. Ante
                  abstinencia severa, busca atención médica presencial o acude a urgencias.
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenHelp}
                className="min-h-[40px] rounded-lg bg-[#991B1B] px-3 py-1.5 font-medium text-white whitespace-nowrap shrink-0"
              >
                Ver líneas de urgencia
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs text-[#4C5E54]">
            <input
              type="checkbox"
              checked={applyRecommendations}
              onChange={(e) => setApplyRecommendations(e.target.checked)}
              className="h-4 w-4 accent-[#1B4332]"
            />
            <span>
              Sincronizar automáticamente mis detonantes y sugerir acciones personalizadas en mi Plan Diario
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3DDD0] pt-4">
          <div className="flex items-center gap-2 text-xs text-[#4C5E54]">
            <AlertTriangle className="h-4 w-4 text-[#1B4332]" />
            <span>Tus respuestas se guardan de forma privada en Cloud Firestore.</span>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-xl bg-[#1B4332] px-6 py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326] disabled:opacity-60"
          >
            {saving ? 'Guardando evaluación...' : existing ? 'Actualizar evaluación' : 'Guardar evaluación inicial'}
          </button>
        </div>
      </section>
    </form>
  );
};
