export type RecoveryFocus =
  | 'Alcohol'
  | 'Sustancias'
  | 'Apuestas y juego'
  | 'Tabaco o nicotina'
  | 'Conductas compulsivas'
  | 'Reconstrucción integral';

export type MoodState =
  | 'Tranquilo'
  | 'Esperanzado'
  | 'Cansado'
  | 'Ansioso'
  | 'Vulnerable'
  | 'Abrumado';

export interface EmotionalLog {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  mood: MoodState;
  energyLevel: number; // 1-5
  stressLevel: number; // 1-5
  note: string;
}

export interface CravingLog {
  id: string;
  createdAt: string;
  intensity: number; // 1-10
  trigger: string;
  toolUsed: string;
  outcome: 'superado' | 'en_proceso' | 'recaida';
  note: string;
}

export interface ConsumptionLog {
  id: string;
  entryType: 'deseo' | 'consumo' | 'apuesta' | 'recaida';
  category: string;
  intensity: number; // 1-10
  amountSpent: number;
  trigger: string;
  locationContext: string;
  copingAction: string;
  resetApplied: boolean;
  occurredAt: string;
  note: string;
  createdAt: string;
}

export interface InitialAssessment {
  id: 'initial';
  primaryFocus: RecoveryFocus;
  secondaryAreas: string[];
  frequencyLevel: 'diaria' | 'semanal' | 'episodica' | 'en_abstinencia';
  severityScore: number; // 1-10
  readinessScore: number; // 1-10
  highRiskTimes: string[];
  mainTriggers: string[];
  supportLevel: 'alto' | 'moderado' | 'bajo' | 'aislado';
  clinicalAttentionFlag: boolean;
  notes: string;
  completedAt: string;
}

export interface DailyPlanItem {
  id: string;
  title: string;
  timeBlock: 'manana' | 'tarde' | 'noche';
  category: 'anclaje' | 'autocuidado' | 'prevencion' | 'conexion';
  completedDates: string[];
  active: boolean;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  mood: MoodState;
  energyLevel: number; // 1-5
  stressLevel: number; // 1-5
  content: string;
  gratitude: string;
  triggersNoticed: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelapseAlert {
  id: string;
  ruleKey: string;
  severity: 'baja' | 'media' | 'alta';
  title: string;
  message: string;
  recommendedAction: string;
  acknowledged: boolean;
  resolved: boolean;
  createdAt: string;
}

export interface RecoveryStage {
  id: string;
  startedAt: string;
  endedAt: string;
  daysCompleted: number;
  reflection: string;
}

export interface SupportContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  note: string;
}

export interface RecoveryPlan {
  reasonsToChange: string[];
  coreValues: string[];
  triggers: string[];
  warningSigns: string[];
  copingStrategies: string[];
  haltChecklistLastCheckedAt: string | null;
}

export interface HabitItem {
  id: string;
  title: string;
  category: 'descanso' | 'cuerpo' | 'mente' | 'entorno';
  completedDates: string[]; // YYYY-MM-DD
}

export interface FinanceEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'ingreso' | 'gasto' | 'ahorro_deuda';
  category: string;
  amount: number;
  note: string;
}

export interface RelationshipLog {
  id: string;
  date: string;
  personName: string;
  actionType: 'conversacion' | 'limite_sano' | 'reparacion' | 'tiempo_calidad';
  summary: string;
}

export interface LifeGoal {
  id: string;
  title: string;
  area: 'Salud' | 'Trabajo y estudio' | 'Hogar' | 'Propósito' | 'Finanzas';
  targetDate: string;
  progress: number; // 0-100
  nextStep: string;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  crisisDetected?: boolean;
  crisisType?: string | null;
}

export interface UserVaultData {
  profile: {
    id: string;
    email: string;
    alias: string;
    focus: RecoveryFocus;
    recoveryStartDate: string; // ISO string
    dailySpendEstimate: number;
    currency: string;
    personalMotto: string;
    consentAcceptedAt: string;
    consentVersion: string;
  };
  initialAssessment: InitialAssessment | null;
  recoveryPlan: RecoveryPlan;
  dailyPlan: DailyPlanItem[];
  recoveryHistory: RecoveryStage[];
  emotionalLogs: EmotionalLog[];
  journalEntries: JournalEntry[];
  cravingLogs: CravingLog[];
  consumptionLogs: ConsumptionLog[];
  alerts: RelapseAlert[];
  habits: HabitItem[];
  financeEntries: FinanceEntry[];
  supportContacts: SupportContact[];
  relationshipLogs: RelationshipLog[];
  lifeGoals: LifeGoal[];
  aiChatHistory: ChatMessage[];
  blockedCommunityAliases: string[];
}

export interface CommunityReply {
  id: string;
  postId: string;
  authorUid: string;
  authorAlias: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorUid: string;
  authorAlias: string;
  category: 'logros' | 'apoyo' | 'estrategias';
  content: string;
  createdAt: string;
  supportCount: number;
  reportCount: number;
  hidden: boolean;
  supportedByMe: boolean;
  reportedByMe: boolean;
  replies: CommunityReply[];
}
