import type {
  DailyPlanItem,
  InitialAssessment,
  RelapseAlert,
  UserVaultData,
} from '../types/renacer';
import { todayISO } from './recoveryMath';

export interface RiskSummary {
  level: 'bajo' | 'moderado' | 'alto';
  label: string;
  description: string;
  signals: Array<{
    ruleKey: string;
    severity: 'baja' | 'media' | 'alta';
    title: string;
    message: string;
    recommendedAction: string;
  }>;
}

/**
 * Evaluates real protective and vulnerability indicators from Firestore-synced user records.
 * Never fabricates alerts; every signal corresponds directly to user-logged events.
 */
export function evaluateRelapseRisk(vault: UserVaultData): RiskSummary {
  const today = todayISO();
  const signals: RiskSummary['signals'] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Clinical flag from initial assessment
  if (vault.initialAssessment?.clinicalAttentionFlag) {
    signals.push({
      ruleKey: 'assessment_clinical_flag',
      severity: 'alta',
      title: 'Atención médica o profesional recomendada',
      message:
        'En tu evaluación inicial marcaste síntomas físicos o emocionales intensos. El acompañamiento médico presencial protege tu seguridad.',
      recommendedAction: 'Consultar con un profesional de salud o abrir líneas de ayuda',
    });
  }

  // 2. High stress or vulnerable mood logged today
  const todayEmotion = vault.emotionalLogs.find((e) => e.date === today);
  const latestJournal = vault.journalEntries[0];
  const highStressToday =
    (todayEmotion && (todayEmotion.stressLevel >= 4 || todayEmotion.mood === 'Abrumado' || todayEmotion.mood === 'Vulnerable')) ||
    (latestJournal && latestJournal.date === today && (latestJournal.stressLevel >= 4 || latestJournal.mood === 'Abrumado'));

  if (highStressToday) {
    signals.push({
      ruleKey: 'high_stress_today',
      severity: 'media',
      title: 'Estrés o vulnerabilidad emocional elevada hoy',
      message:
        'Tu registro emocional de hoy muestra sobrecarga o vulnerabilidad. Conviene reducir exigencias y aplicar una pausa preventiva.',
      recommendedAction: 'Hacer respiración 4-7-8 (2 min) o chequeo HALT',
    });
  }

  // 3. Intense cravings or recent consumption/gambling/relapse in last 72h
  const recentHighCravings = vault.cravingLogs.filter(
    (c) => c.intensity >= 7 && now - new Date(c.createdAt).getTime() <= 3 * dayMs
  );
  const recentConsumptionOrRelapse = vault.consumptionLogs.filter(
    (c) =>
      (c.entryType === 'consumo' || c.entryType === 'apuesta' || c.entryType === 'recaida') &&
      now - new Date(c.occurredAt).getTime() <= 3 * dayMs
  );

  if (recentConsumptionOrRelapse.length > 0) {
    signals.push({
      ruleKey: 'recent_incident_72h',
      severity: 'alta',
      title: 'Episodio reciente registrado (últimas 72 horas)',
      message:
        'Tras un episodio de consumo, apuesta o recaída aumenta el riesgo de efecto cascada. Activar tu red de apoyo hoy corta la inercia sin culpa.',
      recommendedAction: 'Conversar con RENACER IA o contactar a tu círculo de apoyo',
    });
  } else if (recentHighCravings.length > 0) {
    signals.push({
      ruleKey: 'severe_craving_72h',
      severity: 'media',
      title: `Impulsos intensos recientes (${recentHighCravings[0].intensity}/10)`,
      message:
        'Has atravesado deseos fuertes en los últimos días. Ten a mano tus estrategias de los primeros 10 minutos.',
      recommendedAction: 'Abrir pausa de 10 minutos (Surfing del impulso)',
    });
  }

  // 4. Low support isolation indicator
  if (
    vault.supportContacts.length === 0 &&
    (vault.initialAssessment?.supportLevel === 'aislado' ||
      vault.initialAssessment?.supportLevel === 'bajo')
  ) {
    signals.push({
      ruleKey: 'low_support_network',
      severity: 'baja',
      title: 'Círculo de apoyo pendiente de configurar',
      message:
        'Indicaste bajo apoyo cercano y aún no tienes contactos de emergencia guardados para momentos difíciles.',
      recommendedAction: 'Agregar al menos 1 contacto seguro o usar Comunidad Segura',
    });
  }

  // 5. Daily plan adherence check (if plan exists and 0 completed today after midday)
  const activePlan = vault.dailyPlan.filter((i) => i.active);
  const completedToday = activePlan.filter((i) => i.completedDates.includes(today)).length;
  const currentHour = new Date().getHours();
  if (activePlan.length >= 3 && completedToday === 0 && currentHour >= 15) {
    signals.push({
      ruleKey: 'daily_plan_pending',
      severity: 'baja',
      title: 'Plan diario sin acciones completadas aún',
      message:
        'Completar aunque sea una acción breve de tu plan diario ayuda a mantener estructura y estabilidad emocional.',
      recommendedAction: 'Elegir una acción rápida de tu Plan Diario',
    });
  }

  const hasHigh = signals.some((s) => s.severity === 'alta');
  const hasMedium = signals.some((s) => s.severity === 'media');

  if (hasHigh) {
    return {
      level: 'alto',
      label: 'Atención prioritaria',
      description:
        'Hay señales recientes que requieren cuidado extra hoy. Apóyate en tus herramientas y no enfrentes el día en aislamiento.',
      signals,
    };
  }

  if (hasMedium || signals.length >= 2) {
    return {
      level: 'moderado',
      label: 'Precaución activa',
      description:
        'Tu seguimiento muestra factores de vulnerabilidad manejables si aplicas pausas preventivas a tiempo.',
      signals,
    };
  }

  return {
    level: 'bajo',
    label: 'Estable hoy',
    description:
      'Tus registros recientes mantienen buen equilibrio. Sigue sosteniendo tu rutina un día a la vez.',
    signals,
  };
}

/**
 * Generates starter daily plan recommendations tailored to a user's initial assessment.
 */
export function buildRecommendedDailyPlanFromAssessment(
  assessment: InitialAssessment
): DailyPlanItem[] {
  const items: DailyPlanItem[] = [
    {
      id: `dp_${Date.now()}_1`,
      title: 'Definir intención del día y revisar motivos personales (2 min)',
      timeBlock: 'manana',
      category: 'anclaje',
      completedDates: [],
      active: true,
    },
    {
      id: `dp_${Date.now()}_2`,
      title: 'Desayuno, hidratación y evitar largas horas sin comer',
      timeBlock: 'manana',
      category: 'autocuidado',
      completedDates: [],
      active: true,
    },
    {
      id: `dp_${Date.now()}_3`,
      title: 'Chequeo preventivo HALT a mitad del día',
      timeBlock: 'tarde',
      category: 'prevencion',
      completedDates: [],
      active: true,
    },
    {
      id: `dp_${Date.now()}_4`,
      title: 'Caminar o mover el cuerpo 20 minutos para descargar tensión',
      timeBlock: 'tarde',
      category: 'autocuidado',
      completedDates: [],
      active: true,
    },
    {
      id: `dp_${Date.now()}_5`,
      title: 'Escribir estado emocional y gratitud en mi Diario personal',
      timeBlock: 'noche',
      category: 'anclaje',
      completedDates: [],
      active: true,
    },
  ];

  if (assessment.primaryFocus === 'Apuestas y juego') {
    items.push({
      id: `dp_${Date.now()}_6`,
      title: 'Mantener bloqueadores activos y revisar límites financieros',
      timeBlock: 'tarde',
      category: 'prevencion',
      completedDates: [],
      active: true,
    });
  }

  if (assessment.supportLevel === 'bajo' || assessment.supportLevel === 'aislado') {
    items.push({
      id: `dp_${Date.now()}_7`,
      title: 'Enviar un mensaje breve a alguien de confianza o leer la comunidad',
      timeBlock: 'noche',
      category: 'conexion',
      completedDates: [],
      active: true,
    });
  }

  return items;
}

/**
 * Syncs newly detected alerts against existing persisted alerts without duplicating active ones.
 */
export function mergeDetectedAlerts(
  existingAlerts: RelapseAlert[],
  risk: RiskSummary
): RelapseAlert[] {
  const existingRuleKeys = new Set(
    existingAlerts.filter((a) => !a.resolved).map((a) => a.ruleKey)
  );
  const nowIso = new Date().toISOString();
  const additions: RelapseAlert[] = [];

  for (const sig of risk.signals) {
    if (!existingRuleKeys.has(sig.ruleKey)) {
      additions.push({
        id: `alt_${sig.ruleKey}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
        ruleKey: sig.ruleKey,
        severity: sig.severity,
        title: sig.title,
        message: sig.message,
        recommendedAction: sig.recommendedAction,
        acknowledged: false,
        resolved: false,
        createdAt: nowIso,
      });
    }
  }

  if (additions.length === 0) return existingAlerts;
  return [...additions, ...existingAlerts].slice(0, 40);
}
