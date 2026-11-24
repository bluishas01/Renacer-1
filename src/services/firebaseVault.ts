import localforage from 'localforage';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  ChatMessage,
  ConsumptionLog,
  CravingLog,
  DailyPlanItem,
  EmotionalLog,
  FinanceEntry,
  HabitItem,
  InitialAssessment,
  JournalEntry,
  LifeGoal,
  RecoveryFocus,
  RecoveryStage,
  RelapseAlert,
  RelationshipLog,
  SupportContact,
  UserVaultData,
} from '../types/renacer';

export const CONSENT_VERSION = '2026-11-v1';
export const OFFLINE_CACHE_PREF_KEY = 'renacer_offline_cache_enabled';

export function isOfflineCacheEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(OFFLINE_CACHE_PREF_KEY) !== 'false';
  } catch {
    return true;
  }
}

export async function setOfflineCachePreference(enabled: boolean, uid?: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(OFFLINE_CACHE_PREF_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore restricted Safari private storage limits
    }
  }
  if (!enabled && uid) {
    await clearOfflineCacheForUser(uid);
  }
}

let offlineCacheStoreInstance: LocalForage | null = null;

function getOfflineCacheStore(): LocalForage | null {
  if (offlineCacheStoreInstance) return offlineCacheStoreInstance;
  if (typeof window === 'undefined') return null;
  try {
    offlineCacheStoreInstance = localforage.createInstance({
      name: 'renacer_firestore_cache',
      storeName: 'vault_snapshots',
      driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
      description: 'Caché local sin conexión de los registros sincronizados con Cloud Firestore',
    });
    return offlineCacheStoreInstance;
  } catch {
    return null;
  }
}

function tsToIso(val: unknown, fallback?: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return fallback ?? new Date().toISOString();
}

export async function checkUserProfileExists(uid: string): Promise<boolean> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfileAndVault(input: {
  uid: string;
  email: string;
  alias: string;
  focus: RecoveryFocus;
  recoveryStartDate: string;
  dailySpendEstimate: number;
  consentAccepted: boolean;
}): Promise<void> {
  if (!input.consentAccepted) {
    throw new Error('Debes aceptar el consentimiento informado y las condiciones de privacidad.');
  }
  const cleanAlias = input.alias.trim().slice(0, 40);
  if (cleanAlias.length < 2) {
    throw new Error('El nombre o alias debe tener al menos 2 caracteres.');
  }

  const nowIso = new Date().toISOString();
  const userPath = `users/${input.uid}`;
  const planPath = `users/${input.uid}/plan/main`;

  try {
    // Write root profile first so userExists(userId) in firestore.rules evaluates true for subcollections
    await setDoc(doc(db, 'users', input.uid), {
      uid: input.uid,
      email: input.email.trim().slice(0, 160),
      alias: cleanAlias,
      focus: input.focus,
      recoveryStartDate: input.recoveryStartDate.slice(0, 40),
      dailySpendEstimate: Math.max(0, Math.min(1_000_000, Number(input.dailySpendEstimate) || 0)),
      currency: 'USD',
      personalMotto: 'Un día a la vez',
      consentAcceptedAt: nowIso,
      consentVersion: CONSENT_VERSION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  const batch = writeBatch(db);

  batch.set(doc(db, 'users', input.uid, 'plan', 'main'), {
    ownerId: input.uid,
    reasonsToChange: [],
    coreValues: [],
    triggers: [],
    warningSigns: [],
    copingStrategies: [
      'Respiración 4-7-8 durante 2 minutos',
      'Esperar 10 minutos observando el impulso sin actuar',
      'Llamar o escribir a alguien de mi círculo de apoyo',
    ],
    haltChecklistLastCheckedAt: null,
    blockedCommunityAliases: [],
    updatedAt: serverTimestamp(),
  });

  const starterHabits: Array<{ id: string; title: string; category: HabitItem['category'] }> = [
    { id: 'hab_sleep', title: 'Dormir al menos 7 horas', category: 'descanso' },
    { id: 'hab_water', title: 'Hidratación constante durante el día', category: 'cuerpo' },
    { id: 'hab_walk', title: 'Caminar o mover el cuerpo 20 minutos', category: 'cuerpo' },
    { id: 'hab_checkin', title: 'Pausa consciente y registro emocional', category: 'mente' },
  ];

  for (const h of starterHabits) {
    batch.set(doc(db, 'users', input.uid, 'habits', h.id), {
      ownerId: input.uid,
      title: h.title,
      category: h.category,
      completedDates: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const starterDailyPlan: Array<{
    id: string;
    title: string;
    timeBlock: DailyPlanItem['timeBlock'];
    category: DailyPlanItem['category'];
  }> = [
    {
      id: 'dp_morning_anchor',
      title: 'Intención del día: un paso realista hoy',
      timeBlock: 'manana',
      category: 'anclaje',
    },
    {
      id: 'dp_afternoon_halt',
      title: 'Chequeo HALT y pausa de hidratación',
      timeBlock: 'tarde',
      category: 'prevencion',
    },
    {
      id: 'dp_night_journal',
      title: 'Cierre del día en mi diario emocional',
      timeBlock: 'noche',
      category: 'autocuidado',
    },
  ];

  for (const item of starterDailyPlan) {
    batch.set(doc(db, 'users', input.uid, 'dailyPlan', item.id), {
      ownerId: input.uid,
      title: item.title,
      timeBlock: item.timeBlock,
      category: item.category,
      completedDates: [],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    await deleteDoc(doc(db, 'users', input.uid)).catch(() => {});
    handleFirestoreError(error, OperationType.WRITE, `${userPath} + ${planPath}`);
  }
}

export function subscribeToUserVault(
  uid: string,
  onVault: (vault: UserVaultData | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  let active = true;

  const state: Partial<UserVaultData> & {
    profileReady?: boolean;
    planReady?: boolean;
  } = {
    initialAssessment: null,
    dailyPlan: [],
    recoveryHistory: [],
    emotionalLogs: [],
    journalEntries: [],
    cravingLogs: [],
    consumptionLogs: [],
    alerts: [],
    habits: [],
    financeEntries: [],
    supportContacts: [],
    relationshipLogs: [],
    lifeGoals: [],
    aiChatHistory: [],
    blockedCommunityAliases: [],
  };

  const cacheStore = isOfflineCacheEnabled() ? getOfflineCacheStore() : null;
  if (cacheStore) {
    cacheStore.getItem<UserVaultData>(uid).then((cached) => {
      if (active && cached && !state.profileReady && isOfflineCacheEnabled()) {
        onVault({
          ...cached,
          initialAssessment: cached.initialAssessment ?? null,
          dailyPlan: cached.dailyPlan ?? [],
          journalEntries: cached.journalEntries ?? [],
          consumptionLogs: cached.consumptionLogs ?? [],
          alerts: cached.alerts ?? [],
        });
      }
    }).catch(() => {});
  }

  const emitIfReady = () => {
    if (!active || !state.profile) return;
    const vault: UserVaultData = {
      profile: state.profile,
      initialAssessment: state.initialAssessment ?? null,
      recoveryPlan: state.recoveryPlan ?? {
        reasonsToChange: [],
        coreValues: [],
        triggers: [],
        warningSigns: [],
        copingStrategies: [],
        haltChecklistLastCheckedAt: null,
      },
      dailyPlan: state.dailyPlan ?? [],
      recoveryHistory: state.recoveryHistory ?? [],
      emotionalLogs: state.emotionalLogs ?? [],
      journalEntries: state.journalEntries ?? [],
      cravingLogs: state.cravingLogs ?? [],
      consumptionLogs: state.consumptionLogs ?? [],
      alerts: state.alerts ?? [],
      habits: state.habits ?? [],
      financeEntries: state.financeEntries ?? [],
      supportContacts: state.supportContacts ?? [],
      relationshipLogs: state.relationshipLogs ?? [],
      lifeGoals: state.lifeGoals ?? [],
      aiChatHistory: state.aiChatHistory ?? [],
      blockedCommunityAliases: state.blockedCommunityAliases ?? [],
    };
    if (isOfflineCacheEnabled()) {
      getOfflineCacheStore()?.setItem(uid, vault).catch(() => {});
    }
    onVault(vault);
  };

  const unsubs: Unsubscribe[] = [];

  const handleSubError = (err: unknown, op: OperationType, path: string) => {
    try {
      handleFirestoreError(err, op, path);
    } catch (wrapped) {
      onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
    }
  };

  // 1. User Profile
  const userPath = `users/${uid}`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) {
          state.profileReady = true;
          state.profile = undefined;
          onVault(null);
          return;
        }
        const d = snap.data();
        state.profileReady = true;
        state.profile = {
          id: uid,
          email: String(d.email ?? ''),
          alias: String(d.alias ?? 'Usuario'),
          focus: (d.focus as RecoveryFocus) ?? 'Reconstrucción integral',
          recoveryStartDate: String(d.recoveryStartDate ?? new Date().toISOString()),
          dailySpendEstimate: Number(d.dailySpendEstimate ?? 0),
          currency: String(d.currency ?? 'USD'),
          personalMotto: String(d.personalMotto ?? 'Un día a la vez'),
          consentAcceptedAt: String(d.consentAcceptedAt ?? new Date().toISOString()),
          consentVersion: String(d.consentVersion ?? CONSENT_VERSION),
        };
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.GET, userPath)
    )
  );

  // 2. Plan
  const planPath = `users/${uid}/plan/main`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid, 'plan', 'main'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          state.recoveryPlan = {
            reasonsToChange: Array.isArray(d.reasonsToChange) ? d.reasonsToChange : [],
            coreValues: Array.isArray(d.coreValues) ? d.coreValues : [],
            triggers: Array.isArray(d.triggers) ? d.triggers : [],
            warningSigns: Array.isArray(d.warningSigns) ? d.warningSigns : [],
            copingStrategies: Array.isArray(d.copingStrategies) ? d.copingStrategies : [],
            haltChecklistLastCheckedAt: d.haltChecklistLastCheckedAt ?? null,
          };
          state.blockedCommunityAliases = Array.isArray(d.blockedCommunityAliases)
            ? d.blockedCommunityAliases
            : [];
        }
        state.planReady = true;
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.GET, planPath)
    )
  );

  // 3. Initial Assessment
  const assessmentPath = `users/${uid}/assessment/initial`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid, 'assessment', 'initial'),
      (snap) => {
        if (!snap.exists()) {
          state.initialAssessment = null;
        } else {
          const d = snap.data();
          state.initialAssessment = {
            id: 'initial',
            primaryFocus: (d.primaryFocus as RecoveryFocus) ?? 'Reconstrucción integral',
            secondaryAreas: Array.isArray(d.secondaryAreas) ? d.secondaryAreas : [],
            frequencyLevel: d.frequencyLevel ?? 'semanal',
            severityScore: Number(d.severityScore ?? 5),
            readinessScore: Number(d.readinessScore ?? 7),
            highRiskTimes: Array.isArray(d.highRiskTimes) ? d.highRiskTimes : [],
            mainTriggers: Array.isArray(d.mainTriggers) ? d.mainTriggers : [],
            supportLevel: d.supportLevel ?? 'moderado',
            clinicalAttentionFlag: Boolean(d.clinicalAttentionFlag),
            notes: String(d.notes ?? ''),
            completedAt: String(d.completedAt ?? tsToIso(d.updatedAt)),
          };
        }
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.GET, assessmentPath)
    )
  );

  const subColQuery = (colName: string) =>
    query(collection(db, 'users', uid, colName), where('ownerId', '==', uid));

  // 4. Emotional Logs
  unsubs.push(
    onSnapshot(
      subColQuery('emotionalLogs'),
      (snap) => {
        state.emotionalLogs = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              date: String(d.date),
              createdAt: tsToIso(d.createdAt),
              mood: d.mood,
              energyLevel: Number(d.energyLevel),
              stressLevel: Number(d.stressLevel),
              note: String(d.note ?? ''),
            } as EmotionalLog;
          })
          .sort((a, b) => b.date.localeCompare(a.date));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/emotionalLogs`)
    )
  );

  // 5. Journal Entries
  unsubs.push(
    onSnapshot(
      subColQuery('journalEntries'),
      (snap) => {
        state.journalEntries = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              date: String(d.date),
              title: String(d.title ?? 'Entrada personal'),
              mood: d.mood,
              energyLevel: Number(d.energyLevel ?? 3),
              stressLevel: Number(d.stressLevel ?? 3),
              content: String(d.content ?? ''),
              gratitude: String(d.gratitude ?? ''),
              triggersNoticed: String(d.triggersNoticed ?? ''),
              createdAt: tsToIso(d.createdAt),
              updatedAt: tsToIso(d.updatedAt),
            } as JournalEntry;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/journalEntries`)
    )
  );

  // 6. Craving Logs
  unsubs.push(
    onSnapshot(
      subColQuery('cravingLogs'),
      (snap) => {
        state.cravingLogs = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              createdAt: tsToIso(d.createdAt),
              intensity: Number(d.intensity),
              trigger: String(d.trigger),
              toolUsed: String(d.toolUsed ?? ''),
              outcome: d.outcome,
              note: String(d.note ?? ''),
            } as CravingLog;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/cravingLogs`)
    )
  );

  // 7. Consumption, Gambling & Relapse Logs
  unsubs.push(
    onSnapshot(
      subColQuery('consumptionLogs'),
      (snap) => {
        state.consumptionLogs = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              entryType: d.entryType,
              category: String(d.category ?? ''),
              intensity: Number(d.intensity ?? 5),
              amountSpent: Number(d.amountSpent ?? 0),
              trigger: String(d.trigger ?? ''),
              locationContext: String(d.locationContext ?? ''),
              copingAction: String(d.copingAction ?? ''),
              resetApplied: Boolean(d.resetApplied),
              occurredAt: String(d.occurredAt ?? tsToIso(d.createdAt)),
              note: String(d.note ?? ''),
              createdAt: tsToIso(d.createdAt),
            } as ConsumptionLog;
          })
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/consumptionLogs`)
    )
  );

  // 8. Daily Plan Items
  unsubs.push(
    onSnapshot(
      subColQuery('dailyPlan'),
      (snap) => {
        const order: Record<DailyPlanItem['timeBlock'], number> = {
          manana: 0,
          tarde: 1,
          noche: 2,
        };
        state.dailyPlan = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              title: String(d.title ?? ''),
              timeBlock: d.timeBlock ?? 'manana',
              category: d.category ?? 'anclaje',
              completedDates: Array.isArray(d.completedDates) ? d.completedDates : [],
              active: Boolean(d.active ?? true),
            } as DailyPlanItem;
          })
          .sort((a, b) => order[a.timeBlock] - order[b.timeBlock]);
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/dailyPlan`)
    )
  );

  // 9. Relapse Alerts
  unsubs.push(
    onSnapshot(
      subColQuery('alerts'),
      (snap) => {
        state.alerts = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              ruleKey: String(d.ruleKey ?? ''),
              severity: d.severity ?? 'media',
              title: String(d.title ?? ''),
              message: String(d.message ?? ''),
              recommendedAction: String(d.recommendedAction ?? ''),
              acknowledged: Boolean(d.acknowledged),
              resolved: Boolean(d.resolved),
              createdAt: tsToIso(d.createdAt),
            } as RelapseAlert;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/alerts`)
    )
  );

  // 10. Recovery Stages
  unsubs.push(
    onSnapshot(
      subColQuery('recoveryStages'),
      (snap) => {
        state.recoveryHistory = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              startedAt: String(d.startedAt),
              endedAt: String(d.endedAt),
              daysCompleted: Number(d.daysCompleted),
              reflection: String(d.reflection ?? ''),
            } as RecoveryStage;
          })
          .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/recoveryStages`)
    )
  );

  // 11. Habits
  unsubs.push(
    onSnapshot(
      subColQuery('habits'),
      (snap) => {
        state.habits = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: String(d.title),
            category: d.category,
            completedDates: Array.isArray(d.completedDates) ? d.completedDates : [],
          } as HabitItem;
        });
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/habits`)
    )
  );

  // 12. Finance Entries
  unsubs.push(
    onSnapshot(
      subColQuery('financeEntries'),
      (snap) => {
        state.financeEntries = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              date: String(d.date),
              type: d.type,
              category: String(d.category),
              amount: Number(d.amount),
              note: String(d.note ?? ''),
            } as FinanceEntry;
          })
          .sort((a, b) => b.date.localeCompare(a.date));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/financeEntries`)
    )
  );

  // 13. Support Contacts
  unsubs.push(
    onSnapshot(
      subColQuery('supportContacts'),
      (snap) => {
        state.supportContacts = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: String(d.name),
            relation: String(d.relation ?? ''),
            phone: String(d.phone ?? ''),
            note: String(d.note ?? ''),
          } as SupportContact;
        });
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/supportContacts`)
    )
  );

  // 14. Relationship Logs
  unsubs.push(
    onSnapshot(
      subColQuery('relationshipLogs'),
      (snap) => {
        state.relationshipLogs = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              date: String(d.date),
              personName: String(d.personName),
              actionType: d.actionType,
              summary: String(d.summary),
            } as RelationshipLog;
          })
          .sort((a, b) => b.date.localeCompare(a.date));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/relationshipLogs`)
    )
  );

  // 15. Life Goals
  unsubs.push(
    onSnapshot(
      subColQuery('lifeGoals'),
      (snap) => {
        state.lifeGoals = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: String(d.title),
            area: d.area,
            targetDate: String(d.targetDate),
            progress: Number(d.progress),
            nextStep: String(d.nextStep ?? ''),
            completed: Boolean(d.completed),
          } as LifeGoal;
        });
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/lifeGoals`)
    )
  );

  // 16. AI Messages
  unsubs.push(
    onSnapshot(
      subColQuery('aiMessages'),
      (snap) => {
        state.aiChatHistory = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              role: d.role,
              content: String(d.content),
              createdAt: tsToIso(d.createdAt),
              crisisDetected: Boolean(d.crisisDetected),
              crisisType: d.crisisType ?? null,
            } as ChatMessage;
          })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        emitIfReady();
      },
      (err) => handleSubError(err, OperationType.LIST, `users/${uid}/aiMessages`)
    )
  );

  return () => {
    active = false;
    unsubs.forEach((u) => u());
  };
}

export async function syncVaultChanges(
  uid: string,
  prev: UserVaultData,
  next: UserVaultData
): Promise<void> {
  // 1. Profile updates (strictly partitioned per rule action branches)
  const pPrev = prev.profile;
  const pNext = next.profile;
  if (pPrev.recoveryStartDate !== pNext.recoveryStartDate) {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        recoveryStartDate: pNext.recoveryStartDate.slice(0, 40),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
  if (
    pPrev.alias !== pNext.alias ||
    pPrev.focus !== pNext.focus ||
    pPrev.dailySpendEstimate !== pNext.dailySpendEstimate ||
    pPrev.currency !== pNext.currency ||
    pPrev.personalMotto !== pNext.personalMotto
  ) {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        alias: pNext.alias.trim().slice(0, 40) || 'Usuario',
        focus: pNext.focus,
        dailySpendEstimate: Math.max(0, Math.min(1_000_000, Number(pNext.dailySpendEstimate) || 0)),
        currency: pNext.currency.trim().slice(0, 6) || 'USD',
        personalMotto: pNext.personalMotto.trim().slice(0, 80) || 'Un día a la vez',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  // 2. Initial Assessment
  if (JSON.stringify(prev.initialAssessment) !== JSON.stringify(next.initialAssessment) && next.initialAssessment) {
    const a = next.initialAssessment;
    const assessmentDocRef = doc(db, 'users', uid, 'assessment', 'initial');
    const assessmentPath = `users/${uid}/assessment/initial`;
    const baseFields = {
      primaryFocus: a.primaryFocus,
      secondaryAreas: a.secondaryAreas.slice(0, 6).map((s) => s.slice(0, 200)),
      frequencyLevel: a.frequencyLevel,
      severityScore: Math.max(1, Math.min(10, Math.round(a.severityScore))),
      readinessScore: Math.max(1, Math.min(10, Math.round(a.readinessScore))),
      highRiskTimes: a.highRiskTimes.slice(0, 8).map((s) => s.slice(0, 200)),
      mainTriggers: a.mainTriggers.slice(0, 10).map((s) => s.slice(0, 200)),
      supportLevel: a.supportLevel,
      clinicalAttentionFlag: Boolean(a.clinicalAttentionFlag),
      notes: a.notes.slice(0, 500),
      completedAt: a.completedAt.slice(0, 40),
      updatedAt: serverTimestamp(),
    };
    try {
      const existingSnap = prev.initialAssessment
        ? { exists: () => true }
        : await getDoc(assessmentDocRef);
      if (!existingSnap.exists()) {
        await setDoc(assessmentDocRef, {
          ownerId: uid,
          ...baseFields,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(assessmentDocRef, baseFields);
      }
    } catch (error) {
      handleFirestoreError(
        error,
        prev.initialAssessment ? OperationType.UPDATE : OperationType.CREATE,
        assessmentPath
      );
    }
  }

  // 3. Plan & Blocked Aliases updates
  const planPath = `users/${uid}/plan/main`;
  const planDoc = doc(db, 'users', uid, 'plan', 'main');
  const planKeys = [
    'reasonsToChange',
    'coreValues',
    'triggers',
    'warningSigns',
    'copingStrategies',
    'haltChecklistLastCheckedAt',
  ] as const;
  for (const key of planKeys) {
    if (JSON.stringify(prev.recoveryPlan[key]) !== JSON.stringify(next.recoveryPlan[key])) {
      try {
        await updateDoc(planDoc, {
          [key]: next.recoveryPlan[key],
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, planPath);
      }
    }
  }
  if (JSON.stringify(prev.blockedCommunityAliases) !== JSON.stringify(next.blockedCommunityAliases)) {
    try {
      await updateDoc(planDoc, {
        blockedCommunityAliases: next.blockedCommunityAliases.slice(0, 50),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, planPath);
    }
  }

  // 4. Emotional Logs
  await diffSubcollection(
    uid,
    'emotionalLogs',
    prev.emotionalLogs,
    next.emotionalLogs,
    (item) => ({
      ownerId: uid,
      date: item.date.slice(0, 16),
      mood: item.mood,
      energyLevel: Math.round(item.energyLevel),
      stressLevel: Math.round(item.stressLevel),
      note: item.note.slice(0, 400),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    (item) => ({
      mood: item.mood,
      energyLevel: Math.round(item.energyLevel),
      stressLevel: Math.round(item.stressLevel),
      note: item.note.slice(0, 400),
      updatedAt: serverTimestamp(),
    })
  );

  // 5. Personal Journal Entries
  await diffSubcollection(
    uid,
    'journalEntries',
    prev.journalEntries,
    next.journalEntries,
    (item) => ({
      ownerId: uid,
      date: item.date.slice(0, 16),
      title: item.title.trim().slice(0, 100) || 'Entrada personal',
      mood: item.mood,
      energyLevel: Math.max(1, Math.min(5, Math.round(item.energyLevel))),
      stressLevel: Math.max(1, Math.min(5, Math.round(item.stressLevel))),
      content: item.content.trim().slice(0, 2000) || 'Sin contenido',
      gratitude: item.gratitude.slice(0, 400),
      triggersNoticed: item.triggersNoticed.slice(0, 240),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    (item) => ({
      date: item.date.slice(0, 16),
      title: item.title.trim().slice(0, 100) || 'Entrada personal',
      mood: item.mood,
      energyLevel: Math.max(1, Math.min(5, Math.round(item.energyLevel))),
      stressLevel: Math.max(1, Math.min(5, Math.round(item.stressLevel))),
      content: item.content.trim().slice(0, 2000) || 'Sin contenido',
      gratitude: item.gratitude.slice(0, 400),
      triggersNoticed: item.triggersNoticed.slice(0, 240),
      updatedAt: serverTimestamp(),
    })
  );

  // 6. Craving Logs (create / delete)
  await diffSubcollection(uid, 'cravingLogs', prev.cravingLogs, next.cravingLogs, (item) => ({
    ownerId: uid,
    intensity: Math.round(item.intensity),
    trigger: item.trigger.slice(0, 80) || 'Otro',
    toolUsed: item.toolUsed.slice(0, 120),
    outcome: item.outcome,
    note: item.note.slice(0, 400),
    createdAt: serverTimestamp(),
  }));

  // 7. Consumption / Gambling / Relapse Logs (create / delete)
  await diffSubcollection(
    uid,
    'consumptionLogs',
    prev.consumptionLogs,
    next.consumptionLogs,
    (item) => ({
      ownerId: uid,
      entryType: item.entryType,
      category: item.category.trim().slice(0, 60) || 'General',
      intensity: Math.max(1, Math.min(10, Math.round(item.intensity))),
      amountSpent: Math.max(0, Math.min(100_000_000, Number(item.amountSpent) || 0)),
      trigger: item.trigger.trim().slice(0, 100) || 'Otro',
      locationContext: item.locationContext.slice(0, 80),
      copingAction: item.copingAction.slice(0, 120),
      resetApplied: Boolean(item.resetApplied),
      occurredAt: item.occurredAt.slice(0, 40),
      note: item.note.slice(0, 500),
      createdAt: serverTimestamp(),
    })
  );

  // 8. Daily Plan Items (branch updates to match strict affectedKeys)
  await diffDailyPlan(uid, prev.dailyPlan, next.dailyPlan);

  // 9. Relapse Alerts
  await diffSubcollection(
    uid,
    'alerts',
    prev.alerts,
    next.alerts,
    (item) => ({
      ownerId: uid,
      ruleKey: item.ruleKey.slice(0, 60),
      severity: item.severity,
      title: item.title.slice(0, 100),
      message: item.message.slice(0, 400),
      recommendedAction: item.recommendedAction.slice(0, 200),
      acknowledged: Boolean(item.acknowledged),
      resolved: Boolean(item.resolved),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    (item) => ({
      acknowledged: Boolean(item.acknowledged),
      resolved: Boolean(item.resolved),
      updatedAt: serverTimestamp(),
    })
  );

  // 10. Recovery Stages (create / delete)
  await diffSubcollection(uid, 'recoveryStages', prev.recoveryHistory, next.recoveryHistory, (item) => ({
    ownerId: uid,
    startedAt: item.startedAt.slice(0, 40),
    endedAt: item.endedAt.slice(0, 40),
    daysCompleted: Math.max(0, Math.round(item.daysCompleted)),
    reflection: item.reflection.slice(0, 400),
    createdAt: serverTimestamp(),
  }));

  // 11. Habits
  await diffSubcollection(
    uid,
    'habits',
    prev.habits,
    next.habits,
    (item) => ({
      ownerId: uid,
      title: item.title.slice(0, 80),
      category: item.category,
      completedDates: item.completedDates.slice(-400),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    (item) => ({
      completedDates: item.completedDates.slice(-400),
      updatedAt: serverTimestamp(),
    })
  );

  // 12. Finance Entries
  await diffSubcollection(uid, 'financeEntries', prev.financeEntries, next.financeEntries, (item) => ({
    ownerId: uid,
    date: item.date.slice(0, 16),
    type: item.type,
    category: item.category.slice(0, 50) || 'General',
    amount: Math.max(0.01, Math.min(1_000_000_000, Number(item.amount) || 0.01)),
    note: item.note.slice(0, 140),
    createdAt: serverTimestamp(),
  }));

  // 13. Support Contacts
  await diffSubcollection(uid, 'supportContacts', prev.supportContacts, next.supportContacts, (item) => ({
    ownerId: uid,
    name: item.name.slice(0, 60),
    relation: item.relation.slice(0, 40),
    phone: item.phone.slice(0, 30),
    note: item.note.slice(0, 160),
    createdAt: serverTimestamp(),
  }));

  // 14. Relationship Logs
  await diffSubcollection(uid, 'relationshipLogs', prev.relationshipLogs, next.relationshipLogs, (item) => ({
    ownerId: uid,
    date: item.date.slice(0, 16),
    personName: item.personName.slice(0, 50),
    actionType: item.actionType,
    summary: item.summary.slice(0, 240),
    createdAt: serverTimestamp(),
  }));

  // 15. Life Goals
  await diffSubcollection(
    uid,
    'lifeGoals',
    prev.lifeGoals,
    next.lifeGoals,
    (item) => ({
      ownerId: uid,
      title: item.title.slice(0, 90),
      area: item.area,
      targetDate: item.targetDate.slice(0, 20),
      progress: Math.round(item.progress),
      nextStep: item.nextStep.slice(0, 120),
      completed: Boolean(item.completed),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    (item) => ({
      progress: Math.round(item.progress),
      completed: Boolean(item.completed),
      updatedAt: serverTimestamp(),
    })
  );

  // 16. AI Messages
  await diffSubcollection(uid, 'aiMessages', prev.aiChatHistory, next.aiChatHistory, (item) => ({
    ownerId: uid,
    role: item.role,
    content: item.content.slice(0, 4000),
    crisisDetected: Boolean(item.crisisDetected),
    crisisType: item.crisisType ? String(item.crisisType).slice(0, 32) : null,
    createdAt: serverTimestamp(),
  }));
}

async function diffDailyPlan(
  uid: string,
  prevList: DailyPlanItem[],
  nextList: DailyPlanItem[]
): Promise<void> {
  const prevMap = new Map(prevList.map((i) => [i.id, i]));
  const nextMap = new Map(nextList.map((i) => [i.id, i]));

  for (const item of nextList) {
    const old = prevMap.get(item.id);
    const docPath = `users/${uid}/dailyPlan/${item.id}`;
    if (!old) {
      try {
        await setDoc(doc(db, 'users', uid, 'dailyPlan', item.id), {
          ownerId: uid,
          title: item.title.trim().slice(0, 100) || 'Acción diaria',
          timeBlock: item.timeBlock,
          category: item.category,
          completedDates: item.completedDates.slice(-400),
          active: Boolean(item.active),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath);
      }
    } else {
      if (JSON.stringify(old.completedDates) !== JSON.stringify(item.completedDates)) {
        try {
          await updateDoc(doc(db, 'users', uid, 'dailyPlan', item.id), {
            completedDates: item.completedDates.slice(-400),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, docPath);
        }
      }
      if (
        old.title !== item.title ||
        old.timeBlock !== item.timeBlock ||
        old.category !== item.category ||
        old.active !== item.active
      ) {
        try {
          await updateDoc(doc(db, 'users', uid, 'dailyPlan', item.id), {
            title: item.title.trim().slice(0, 100) || 'Acción diaria',
            timeBlock: item.timeBlock,
            category: item.category,
            active: Boolean(item.active),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, docPath);
        }
      }
    }
  }

  for (const old of prevList) {
    if (!nextMap.has(old.id)) {
      const docPath = `users/${uid}/dailyPlan/${old.id}`;
      try {
        await deleteDoc(doc(db, 'users', uid, 'dailyPlan', old.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    }
  }
}

async function diffSubcollection<T extends { id: string }>(
  uid: string,
  colName: string,
  prevList: T[],
  nextList: T[],
  buildCreate: (item: T) => Record<string, unknown>,
  buildUpdate?: (item: T) => Record<string, unknown>
): Promise<void> {
  const prevMap = new Map(prevList.map((item) => [item.id, item]));
  const nextMap = new Map(nextList.map((item) => [item.id, item]));

  for (const item of nextList) {
    const oldItem = prevMap.get(item.id);
    const docPath = `users/${uid}/${colName}/${item.id}`;
    if (!oldItem) {
      try {
        await setDoc(doc(db, 'users', uid, colName, item.id), buildCreate(item));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath);
      }
    } else if (buildUpdate && JSON.stringify(oldItem) !== JSON.stringify(item)) {
      try {
        await updateDoc(doc(db, 'users', uid, colName, item.id), buildUpdate(item));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    }
  }

  for (const oldItem of prevList) {
    if (!nextMap.has(oldItem.id)) {
      const docPath = `users/${uid}/${colName}/${oldItem.id}`;
      try {
        await deleteDoc(doc(db, 'users', uid, colName, oldItem.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    }
  }
}

export async function deleteAllUserFirestoreData(uid: string): Promise<void> {
  const subcollections = [
    'plan',
    'assessment',
    'emotionalLogs',
    'journalEntries',
    'cravingLogs',
    'consumptionLogs',
    'dailyPlan',
    'alerts',
    'recoveryStages',
    'habits',
    'financeEntries',
    'supportContacts',
    'relationshipLogs',
    'lifeGoals',
    'aiMessages',
  ];

  for (const colName of subcollections) {
    const colPath = `users/${uid}/${colName}`;
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, colName), where('ownerId', '==', uid))
      );
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, colPath);
    }
  }

  // Clean up user's replies, reactions, and reports on other visible community posts (atomic counters preserved)
  try {
    const visiblePostsSnap = await getDocs(
      query(collection(db, 'communityPosts'), where('hidden', '==', false))
    );
    for (const postDoc of visiblePostsSnap.docs) {
      if (postDoc.data().authorUid === uid) continue;
      const postId = postDoc.id;

      const ownRepliesOnOtherSnap = await getDocs(
        query(
          collection(db, 'communityPosts', postId, 'replies'),
          where('authorUid', '==', uid)
        )
      ).catch(() => null);
      if (ownRepliesOnOtherSnap) {
        for (const rDoc of ownRepliesOnOtherSnap.docs) {
          await deleteDoc(rDoc.ref).catch(() => {});
        }
      }

      const postRef = doc(db, 'communityPosts', postId);
      const reactionRef = doc(db, 'communityPosts', postId, 'reactions', uid);
      await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        const rSnap = await tx.get(reactionRef);
        if (!pSnap.exists() || !rSnap.exists() || pSnap.data().hidden === true) return;
        const curr = Number(pSnap.data().supportCount ?? 0);
        tx.delete(reactionRef);
        tx.update(postRef, {
          supportCount: Math.max(0, curr - 1),
          updatedAt: serverTimestamp(),
        });
      }).catch(() => {});

      const reportRef = doc(db, 'communityPosts', postId, 'reports', uid);
      await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        const repSnap = await tx.get(reportRef);
        if (!pSnap.exists() || !repSnap.exists()) return;
        const curr = Number(pSnap.data().reportCount ?? 0);
        const nextRep = Math.max(0, curr - 1);
        tx.delete(reportRef);
        tx.update(postRef, {
          reportCount: nextRep,
          hidden: nextRep >= 2,
          updatedAt: serverTimestamp(),
        });
      }).catch(() => {});
    }
  } catch {
    // Non-blocking cleanup for third-party community threads
  }

  try {
    const myPostsSnap = await getDocs(
      query(collection(db, 'communityPosts'), where('authorUid', '==', uid))
    );
    for (const d of myPostsSnap.docs) {
      const ownRepliesSnap = await getDocs(
        query(
          collection(db, 'communityPosts', d.id, 'replies'),
          where('authorUid', '==', uid)
        )
      );
      for (const rDoc of ownRepliesSnap.docs) {
        await deleteDoc(rDoc.ref);
      }
      await deleteDoc(d.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'communityPosts');
  }

  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }

  await clearOfflineCacheForUser(uid, true);
}

export async function clearOfflineCacheForUser(uid: string, wipeAllLocalPrefs = false): Promise<void> {
  const store = getOfflineCacheStore();
  if (store) {
    await store.removeItem(uid).catch(() => {});
    await store.clear().catch(() => {});
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('renacer_pending_profile');
    }
    if (wipeAllLocalPrefs && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('renacer_country_pref');
      window.localStorage.removeItem('renacer_privacy_hide_phones');
      window.localStorage.removeItem(OFFLINE_CACHE_PREF_KEY);
    }
  } catch {
    // Ignore restricted browser storage errors
  }
}
