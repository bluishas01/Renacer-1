import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Flag,
  Heart,
  Loader2,
  Lock,
  MessageSquare,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import {
  createModeratedPost,
  createModeratedReply,
  deleteOwnCommunityPost,
  deleteOwnCommunityReply,
  fetchCommunityPosts,
  submitCommunityReport,
  toggleSupportReaction,
  withdrawCommunityReport,
} from '../services/communityService';
import type {
  CommunityPost,
  FinanceEntry,
  HabitItem,
  LifeGoal,
  RelationshipLog,
  SupportContact,
  UserVaultData,
} from '../types/renacer';
import {
  calculateDaysInRecovery,
  formatDateTime,
  formatShortDate,
  getLast7DateKeys,
  todayISO,
} from '../utils/recoveryMath';

interface ModulesViewProps {
  vault: UserVaultData;
  onUpdateVault: (updater: (prev: UserVaultData) => UserVaultData) => Promise<void>;
  initialModuleTab?: ModuleTab;
  onOpenHelp?: () => void;
}

export type ModuleTab = 'goals' | 'habits' | 'finances' | 'relationships' | 'community';

const HIDE_PHONES_KEY = 'renacer_privacy_hide_phones';

export const ModulesView: React.FC<ModulesViewProps> = ({
  vault,
  onUpdateVault,
  initialModuleTab = 'goals',
  onOpenHelp,
}) => {
  const [activeTab, setActiveTab] = useState<ModuleTab>(initialModuleTab);
  useEffect(() => {
    setActiveTab(initialModuleTab);
  }, [initialModuleTab]);
  const todayKey = todayISO();
  const last7 = getLast7DateKeys();

  // --- Habits state ---
  const [habitTitle, setHabitTitle] = useState('');
  const [habitCategory, setHabitCategory] = useState<HabitItem['category']>('mente');

  // --- Finances state ---
  const [finKind, setFinKind] = useState<'ahorro' | 'deuda' | 'ingreso' | 'gasto'>('ahorro');
  const [finDate, setFinDate] = useState(todayISO());
  const [finCategory, setFinCategory] = useState('Fondo de emergencia');
  const [finAmount, setFinAmount] = useState('');
  const [finNote, setFinNote] = useState('');
  const [finFilterType, setFinFilterType] = useState<'all' | 'ingreso' | 'gasto' | 'ahorro' | 'deuda'>('all');
  const [finDateFilter, setFinDateFilter] = useState<'all' | '30d' | 'month' | 'custom'>('all');
  const [finStartDate, setFinStartDate] = useState('');
  const [finEndDate, setFinEndDate] = useState('');
  const [finGoalTitle, setFinGoalTitle] = useState('');
  const [finGoalDate, setFinGoalDate] = useState(todayISO());
  const [finGoalStep, setFinGoalStep] = useState('');

  // --- Relationships state ---
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [relPerson, setRelPerson] = useState('');
  const [relAction, setRelAction] = useState<RelationshipLog['actionType']>('conversacion');
  const [relSummary, setRelSummary] = useState('');
  const [hidePhones, setHidePhones] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(HIDE_PHONES_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // --- Goals state ---
  const [goalTitle, setGoalTitle] = useState('');
  const [goalArea, setGoalArea] = useState<LifeGoal['area']>('Salud');
  const [goalDate, setGoalDate] = useState(todayISO());
  const [goalStep, setGoalStep] = useState('');

  // --- Community state ---
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [communityNotice, setCommunityNotice] = useState<string | null>(null);
  const [postCategory, setPostCategory] = useState<'logros' | 'apoyo' | 'estrategias'>('apoyo');
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [filterCat, setFilterCat] = useState<'all' | 'logros' | 'apoyo' | 'estrategias'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const loadPosts = async () => {
    setLoadingPosts(true);
    setCommunityError(null);
    try {
      const nextPosts = await fetchCommunityPosts(vault.profile.id);
      setPosts(nextPosts);
    } catch (err) {
      setCommunityError(
        err instanceof Error ? err.message : 'No se pudo cargar la comunidad desde Cloud Firestore.'
      );
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'community') {
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, vault.profile.id]);

  // --- Habit Handlers ---
  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = habitTitle.trim().slice(0, 80);
    if (!clean) return;
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        habits: [
          ...prev.habits,
          {
            id: `hab_${Date.now()}`,
            title: clean,
            category: habitCategory,
            completedDates: [],
          },
        ],
      }));
      setHabitTitle('');
    } catch {
      // Handled via App persistError banner; preserve input
    }
  };

  const toggleHabitDate = async (habitId: string, dateKey: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== habitId) return h;
          const exists = h.completedDates.includes(dateKey);
          return {
            ...h,
            completedDates: exists
              ? h.completedDates.filter((d) => d !== dateKey)
              : [...h.completedDates, dateKey],
          };
        }),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  const removeHabit = async (habitId: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        habits: prev.habits.filter((h) => h.id !== habitId),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  // --- Finance Handlers ---
  const handleFinanceKindChange = (nextKind: 'ahorro' | 'deuda' | 'ingreso' | 'gasto') => {
    setFinKind(nextKind);
    if (nextKind === 'ahorro') setFinCategory('Fondo de emergencia');
    else if (nextKind === 'deuda') setFinCategory('Pago de deuda');
    else if (nextKind === 'ingreso') setFinCategory('Salario o ingreso');
    else setFinCategory('Gasto esencial');
  };

  const addFinanceEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(finAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const mappedType: FinanceEntry['type'] =
      finKind === 'ingreso' ? 'ingreso' : finKind === 'gasto' ? 'gasto' : 'ahorro_deuda';
    const defaultCategory =
      finKind === 'deuda'
        ? 'Pago de deuda'
        : finKind === 'ahorro'
          ? 'Ahorro personal'
          : finKind === 'ingreso'
            ? 'Ingreso'
            : 'Gasto';
    let cleanCategory = finCategory.trim().slice(0, 50) || defaultCategory;
    if (finKind === 'deuda' && !/deud/i.test(cleanCategory)) {
      cleanCategory = `Deuda · ${cleanCategory}`.slice(0, 50);
    }
    const entry: FinanceEntry = {
      id: `fin_${Date.now()}`,
      date: /^\d{4}-\d{2}-\d{2}$/.test(finDate) ? finDate : todayKey,
      type: mappedType,
      category: cleanCategory,
      amount: Math.min(1_000_000_000, amt),
      note: finNote.trim().slice(0, 140),
    };
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        financeEntries: [entry, ...prev.financeEntries].slice(0, 200),
      }));
      setFinAmount('');
      setFinNote('');
    } catch {
      // Handled via App persistError banner; preserve input
    }
  };

  const removeFinanceEntry = async (id: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        financeEntries: prev.financeEntries.filter((f) => f.id !== id),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  const addFinanceGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = finGoalTitle.trim().slice(0, 90);
    if (!cleanTitle) return;
    const goal: LifeGoal = {
      id: `gol_${Date.now()}`,
      title: cleanTitle,
      area: 'Finanzas',
      targetDate: finGoalDate || todayKey,
      progress: 0,
      nextStep: finGoalStep.trim().slice(0, 120),
      completed: false,
    };
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        lifeGoals: [goal, ...prev.lifeGoals].slice(0, 40),
      }));
      setFinGoalTitle('');
      setFinGoalStep('');
    } catch {
      // Handled via App persistError banner; preserve input
    }
  };

  const toggleHidePhones = () => {
    setHidePhones((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(HIDE_PHONES_KEY, String(next));
      } catch {
        // Ignore restricted Safari private storage
      }
      return next;
    });
  };

  // --- Relationship Handlers ---
  const addSupportContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    const contact: SupportContact = {
      id: `cnt_${Date.now()}`,
      name: contactName.trim().slice(0, 60),
      relation: contactRelation.trim().slice(0, 40) || 'Persona de confianza',
      phone: contactPhone.trim().slice(0, 30),
      note: '',
    };
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        supportContacts: [...prev.supportContacts, contact].slice(0, 20),
      }));
      setContactName('');
      setContactRelation('');
      setContactPhone('');
    } catch {
      // Handled via App persistError banner; preserve input
    }
  };

  const removeContact = async (id: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        supportContacts: prev.supportContacts.filter((c) => c.id !== id),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  const addRelationshipLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relPerson.trim() || !relSummary.trim()) return;
    const entry: RelationshipLog = {
      id: `rel_${Date.now()}`,
      date: todayKey,
      personName: relPerson.trim().slice(0, 50),
      actionType: relAction,
      summary: relSummary.trim().slice(0, 240),
    };
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        relationshipLogs: [entry, ...prev.relationshipLogs].slice(0, 100),
      }));
      setRelPerson('');
      setRelSummary('');
    } catch {
      // Handled via App persistError banner; preserve input
    }
  };

  const removeRelationshipLog = async (id: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        relationshipLogs: prev.relationshipLogs.filter((l) => l.id !== id),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  // --- Goal Handlers ---
  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = goalTitle.trim().slice(0, 90);
    if (!cleanTitle) return;
    const goal: LifeGoal = {
      id: `gol_${Date.now()}`,
      title: cleanTitle,
      area: goalArea,
      targetDate: goalDate || todayKey,
      progress: 0,
      nextStep: goalStep.trim().slice(0, 120),
      completed: false,
    };
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        lifeGoals: [goal, ...prev.lifeGoals].slice(0, 40),
      }));
      setGoalTitle('');
      setGoalStep('');
    } catch {
      // Handled via App persistError banner; preserve input
    }
  };

  const updateGoalProgress = async (id: string, progress: number) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        lifeGoals: prev.lifeGoals.map((g) =>
          g.id === id ? { ...g, progress, completed: progress >= 100 } : g
        ),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  const removeGoal = async (id: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        lifeGoals: prev.lifeGoals.filter((g) => g.id !== id),
      }));
    } catch {
      // Handled via App persistError banner
    }
  };

  // --- Community Handlers (Firestore + Authenticated Moderation) ---
  const createCommunityPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommunityError(null);
    setCommunityNotice(null);
    setPosting(true);
    try {
      const newPost = await createModeratedPost({
        uid: vault.profile.id,
        authorAlias: vault.profile.alias,
        category: postCategory,
        content: postContent,
      });
      setPosts((prev) => [newPost, ...prev]);
      setPostContent('');
      setCommunityNotice('Tu mensaje pasó la moderación y se guardó en Cloud Firestore con tu alias.');
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : 'Error al publicar.');
    } finally {
      setPosting(false);
    }
  };

  const sendReply = async (postId: string) => {
    const content = (replyDrafts[postId] ?? '').trim();
    if (!content) return;
    setCommunityError(null);
    try {
      const reply = await createModeratedReply({
        postId,
        uid: vault.profile.id,
        authorAlias: vault.profile.alias,
        content,
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, reply] } : p))
      );
      setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : 'Error al responder.');
    }
  };

  const supportPost = async (postId: string) => {
    setCommunityError(null);
    try {
      const result = await toggleSupportReaction(postId, vault.profile.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, supportedByMe: result.supportedByMe, supportCount: result.supportCount }
            : p
        )
      );
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : 'No se pudo actualizar tu reacción.');
    }
  };

  const reportPost = async (postId: string, currentlyReported: boolean) => {
    setCommunityError(null);
    setCommunityNotice(null);
    try {
      if (currentlyReported) {
        const res = await withdrawCommunityReport(postId, vault.profile.id);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, reportedByMe: false, reportCount: res.reportCount, hidden: res.hidden }
              : p
          )
        );
        setCommunityNotice('Retiraste tu reporte sobre esta publicación.');
        return;
      }

      const res = await submitCommunityReport(postId, vault.profile.id);
      setCommunityNotice(
        res.hidden
          ? 'Publicación reportada y ocultada automáticamente para proteger a la comunidad.'
          : 'Reporte registrado en Firestore. Gracias por cuidar este espacio.'
      );
      if (res.hidden) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, reportedByMe: true, reportCount: res.reportCount, hidden: res.hidden }
              : p
          )
        );
      }
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : 'No se pudo procesar el reporte.');
    }
  };

  const removeOwnPost = async (postId: string) => {
    setCommunityError(null);
    try {
      await deleteOwnCommunityPost(postId, vault.profile.id);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setCommunityNotice('Tu publicación fue eliminada permanentemente de Firestore.');
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : 'No se pudo eliminar la publicación.');
    }
  };

  const removeOwnReply = async (postId: string, replyId: string) => {
    setCommunityError(null);
    try {
      await deleteOwnCommunityReply(postId, replyId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, replies: p.replies.filter((r) => r.id !== replyId) } : p
        )
      );
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : 'No se pudo eliminar la respuesta.');
    }
  };

  const blockAuthor = async (authorUid: string, alias: string) => {
    if (authorUid === vault.profile.id) return;
    const uidToken = `uid:${authorUid}::${alias.slice(0, 40)}`;
    const legacyUidToken = `uid:${authorUid}`;
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        blockedCommunityAliases: Array.from(
          new Set([
            ...prev.blockedCommunityAliases.filter(
              (entry) =>
                entry !== legacyUidToken &&
                !entry.startsWith(`${legacyUidToken}::`) &&
                entry !== alias
            ),
            uidToken,
          ])
        ).slice(-50),
      }));
      setCommunityNotice(`Silenciaste las publicaciones y respuestas de "${alias}".`);
    } catch {
      // Handled via App persistError banner
    }
  };

  const unblockEntry = async (entry: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        blockedCommunityAliases: prev.blockedCommunityAliases.filter((item) => item !== entry),
      }));
      setCommunityNotice('Usuario desbloqueado. Sus mensajes volverán a mostrarse al actualizar.');
    } catch {
      // Handled via App persistError banner
    }
  };

  const formatBlockedLabel = (entry: string) => {
    if (entry.startsWith('uid:')) {
      const sep = entry.indexOf('::');
      if (sep !== -1) {
        return entry.slice(sep + 2) || 'Usuario silenciado';
      }
      return `Usuario silenciado (${entry.slice(4, 10)}…)`;
    }
    return entry;
  };

  const isAuthorBlocked = (authorUid: string, authorAlias: string) =>
    vault.blockedCommunityAliases.some(
      (entry) =>
        entry === `uid:${authorUid}` ||
        entry.startsWith(`uid:${authorUid}::`) ||
        entry === authorAlias
    );

  // Calculations for finances
  const { days } = calculateDaysInRecovery(vault.profile.recoveryStartDate);
  const recoverySaved = days * (vault.profile.dailySpendEstimate || 0);
  const totalIncome = vault.financeEntries
    .filter((f) => f.type === 'ingreso')
    .reduce((acc, f) => acc + f.amount, 0);
  const totalExpense = vault.financeEntries
    .filter((f) => f.type === 'gasto')
    .reduce((acc, f) => acc + f.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const totalDebtPaid = vault.financeEntries
    .filter((f) => f.type === 'ahorro_deuda' && /deud/i.test(`${f.category} ${f.note}`))
    .reduce((acc, f) => acc + f.amount, 0);
  const totalPersonalSavings = vault.financeEntries
    .filter((f) => f.type === 'ahorro_deuda' && !/deud/i.test(`${f.category} ${f.note}`))
    .reduce((acc, f) => acc + f.amount, 0);

  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
  const thirtyDaysAgoKey = `${thirtyDaysAgoDate.getFullYear()}-${String(thirtyDaysAgoDate.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgoDate.getDate()).padStart(2, '0')}`;
  const currentMonthPrefix = todayKey.slice(0, 7);

  const filteredFinanceEntries = vault.financeEntries.filter((item) => {
    const isDebt = item.type === 'ahorro_deuda' && /deud/i.test(`${item.category} ${item.note}`);
    const matchesType =
      finFilterType === 'all' ||
      (finFilterType === 'ingreso' && item.type === 'ingreso') ||
      (finFilterType === 'gasto' && item.type === 'gasto') ||
      (finFilterType === 'deuda' && isDebt) ||
      (finFilterType === 'ahorro' && item.type === 'ahorro_deuda' && !isDebt);
    if (!matchesType) return false;

    if (finDateFilter === '30d') return item.date >= thirtyDaysAgoKey;
    if (finDateFilter === 'month') return item.date.startsWith(currentMonthPrefix);
    if (finDateFilter === 'custom') {
      if (finStartDate && item.date < finStartDate) return false;
      if (finEndDate && item.date > finEndDate) return false;
    }
    return true;
  });

  const filteredFinanceTotal = filteredFinanceEntries.reduce((acc, item) => acc + item.amount, 0);
  const financeGoals = vault.lifeGoals.filter((g) => g.area === 'Finanzas');

  const visiblePosts = posts
    .filter(
      (p) =>
        (filterCat === 'all' || p.category === filterCat) &&
        !isAuthorBlocked(p.authorUid, p.authorAlias)
    )
    .map((p) => ({
      ...p,
      replies: p.replies.filter((r) => !isAuthorBlocked(r.authorUid, r.authorAlias)),
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#E3DDD0] bg-white p-5 sm:p-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#14241C]">
            Reconstrucción integral de vida
          </h1>
          <p className="mt-1 text-sm text-[#4C5E54]">
            Cuida tu cuerpo, ordena tus finanzas, repara vínculos, construye metas y apóyate en comunidad.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'goals', label: 'Objetivos y progreso' },
            { id: 'habits', label: 'Bienestar y hábitos' },
            { id: 'finances', label: 'Finanzas personales' },
            { id: 'relationships', label: 'Relaciones y familia' },
            { id: 'community', label: 'Comunidad segura' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ModuleTab)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-medium transition sm:text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#1B4332] text-[#F7F4EC]'
                  : 'border border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C] hover:bg-[#EFEAE0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Bienestar y hábitos */}
      {activeTab === 'habits' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-4">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">Nuevo hábito diario</h2>
            <form onSubmit={addHabit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Hábito</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="Ej. Leer 15 minutos antes de dormir"
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Área</label>
                <select
                  value={habitCategory}
                  onChange={(e) => setHabitCategory(e.target.value as HabitItem['category'])}
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                >
                  <option value="descanso">Descanso</option>
                  <option value="cuerpo">Cuerpo y salud</option>
                  <option value="mente">Mente y calma</option>
                  <option value="entorno">Orden y entorno</option>
                </select>
              </div>
              <button
                type="submit"
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC]"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar hábito</span>
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-8">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Constancia últimos 7 días
            </h2>
            <div className="mt-4 space-y-3">
              {vault.habits.map((h) => {
                const done7 = last7.filter((d) => h.completedDates.includes(d)).length;
                return (
                  <div
                    key={h.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#14241C]">{h.title}</p>
                      <p className="text-xs text-[#4C5E54]">
                        {h.category} · <span className="font-mono tabular-nums">{done7}/7</span> días esta
                        semana
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {last7.map((d) => {
                        const checked = h.completedDates.includes(d);
                        const dayLabel = new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', {
                          weekday: 'narrow',
                        });
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleHabitDate(h.id, d)}
                            title={d}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium transition ${
                              checked
                                ? 'bg-[#1B4332] text-[#F7F4EC]'
                                : 'border border-[#D5CEBF] bg-white text-[#4C5E54]'
                            }`}
                          >
                            {dayLabel}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        aria-label="Eliminar hábito"
                        onClick={() => removeHabit(h.id)}
                        className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* 2. Finanzas personales */}
      {activeTab === 'finances' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-[#1B4332]/20 bg-[#EBF3EE] p-5">
              <p className="text-xs text-[#1B4332]">Ahorro estimado por recuperación</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#1B4332]">
                {vault.profile.currency} {recoverySaved.toLocaleString('es-ES')}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
              <p className="text-xs text-[#4C5E54]">Ingresos registrados</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#14241C]">
                {vault.profile.currency} {totalIncome.toLocaleString('es-ES')}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
              <p className="text-xs text-[#4C5E54]">Gastos registrados</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#14241C]">
                {vault.profile.currency} {totalExpense.toLocaleString('es-ES')}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
              <p className="text-xs text-[#4C5E54]">Balance neto (Ingresos − Gastos)</p>
              <p
                className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                  netBalance >= 0 ? 'text-[#1B4332]' : 'text-[#991B1B]'
                }`}
              >
                {vault.profile.currency} {netBalance.toLocaleString('es-ES')}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
              <p className="text-xs text-[#4C5E54]">Ahorro / Abonos a deuda</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#1B4332]">
                {vault.profile.currency} {totalPersonalSavings.toLocaleString('es-ES')}
              </p>
              <p className="mt-1 font-mono text-xs tabular-nums text-[#4C5E54]">
                Deudas abonadas: {vault.profile.currency} {totalDebtPaid.toLocaleString('es-ES')}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <form
              onSubmit={addFinanceEntry}
              className="space-y-3 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-5"
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#1B4332]" />
                <h2 className="font-display text-lg font-semibold text-[#14241C]">
                  Registrar movimiento
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Tipo</label>
                  <select
                    value={finKind}
                    onChange={(e) =>
                      handleFinanceKindChange(
                        e.target.value as 'ahorro' | 'deuda' | 'ingreso' | 'gasto'
                      )
                    }
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                  >
                    <option value="ahorro">Ahorro / Fondo personal</option>
                    <option value="deuda">Abono a deuda</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="gasto">Gasto necesario</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Fecha</label>
                  <input
                    type="date"
                    max={todayKey}
                    required
                    value={finDate}
                    onChange={(e) => setFinDate(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Categoría</label>
                  <input
                    type="text"
                    maxLength={50}
                    value={finCategory}
                    onChange={(e) => setFinCategory(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4C5E54]">
                    Monto ({vault.profile.currency})
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    max={1000000000}
                    step="0.01"
                    required
                    value={finAmount}
                    onChange={(e) => setFinAmount(e.target.value)}
                    placeholder="0.00"
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 font-mono text-sm tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Nota</label>
                <input
                  type="text"
                  maxLength={140}
                  value={finNote}
                  onChange={(e) => setFinNote(e.target.value)}
                  placeholder="Ej. Abono tarjeta, pago renta"
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
              </div>
              <button
                type="submit"
                className="min-h-[44px] w-full rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC]"
              >
                Guardar registro financiero
              </button>
            </form>

            <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#14241C]">
                    Movimientos recientes
                  </h2>
                  <p className="text-xs text-[#4C5E54]">
                    Mostrando{' '}
                    <span className="font-mono tabular-nums">{filteredFinanceEntries.length}</span> de{' '}
                    <span className="font-mono tabular-nums">{vault.financeEntries.length}</span>{' '}
                    registros · Suma filtrada:{' '}
                    <span className="font-mono font-semibold tabular-nums text-[#14241C]">
                      {vault.profile.currency} {filteredFinanceTotal.toLocaleString('es-ES')}
                    </span>
                  </p>
                </div>
                {(finFilterType !== 'all' || finDateFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFinFilterType('all');
                      setFinDateFilter('all');
                      setFinStartDate('');
                      setFinEndDate('');
                    }}
                    className="min-h-[36px] rounded-lg border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-xs font-medium text-[#14241C] hover:bg-[#EFEAE0]"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-2.5 rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="fin-filter-type" className="mb-1 block text-[11px] font-medium text-[#4C5E54]">
                    Filtrar por tipo
                  </label>
                  <select
                    id="fin-filter-type"
                    value={finFilterType}
                    onChange={(e) => setFinFilterType(e.target.value as typeof finFilterType)}
                    className="min-h-[40px] w-full rounded-lg border border-[#D5CEBF] bg-white px-2.5 text-xs"
                  >
                    <option value="all">Todos los movimientos</option>
                    <option value="ingreso">Ingresos</option>
                    <option value="gasto">Gastos</option>
                    <option value="ahorro">Ahorro</option>
                    <option value="deuda">Abonos a deuda</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fin-filter-date" className="mb-1 block text-[11px] font-medium text-[#4C5E54]">
                    Filtrar por fecha
                  </label>
                  <select
                    id="fin-filter-date"
                    value={finDateFilter}
                    onChange={(e) => setFinDateFilter(e.target.value as typeof finDateFilter)}
                    className="min-h-[40px] w-full rounded-lg border border-[#D5CEBF] bg-white px-2.5 text-xs"
                  >
                    <option value="all">Todo el historial</option>
                    <option value="month">Mes actual</option>
                    <option value="30d">Últimos 30 días</option>
                    <option value="custom">Rango personalizado</option>
                  </select>
                </div>
                {finDateFilter === 'custom' && (
                  <>
                    <div>
                      <label htmlFor="fin-start-date" className="mb-1 block text-[11px] font-medium text-[#4C5E54]">
                        Desde
                      </label>
                      <input
                        id="fin-start-date"
                        type="date"
                        max={todayKey}
                        value={finStartDate}
                        onChange={(e) => setFinStartDate(e.target.value)}
                        className="min-h-[40px] w-full rounded-lg border border-[#D5CEBF] bg-white px-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="fin-end-date" className="mb-1 block text-[11px] font-medium text-[#4C5E54]">
                        Hasta
                      </label>
                      <input
                        id="fin-end-date"
                        type="date"
                        max={todayKey}
                        value={finEndDate}
                        onChange={(e) => setFinEndDate(e.target.value)}
                        className="min-h-[40px] w-full rounded-lg border border-[#D5CEBF] bg-white px-2.5 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>

              {filteredFinanceEntries.length === 0 ? (
                <p className="mt-4 text-sm text-[#4C5E54]">
                  {vault.financeEntries.length === 0
                    ? 'Registra ingresos, gastos esenciales y abonos a deudas para recuperar claridad financiera.'
                    : 'No hay movimientos que coincidan con el filtro seleccionado.'}
                </p>
              ) : (
                <div className="mt-4 divide-y divide-[#E3DDD0]">
                  {filteredFinanceEntries.map((item) => {
                    const isDebt =
                      item.type === 'ahorro_deuda' && /deud/i.test(`${item.category} ${item.note}`);
                    const typeLabel =
                      item.type === 'ingreso'
                        ? 'Ingreso'
                        : item.type === 'gasto'
                          ? 'Gasto'
                          : isDebt
                            ? 'Abono a deuda'
                            : 'Ahorro';
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#14241C]">{item.category}</p>
                          <p className="truncate text-xs text-[#4C5E54]">
                            {formatShortDate(item.date)} · {typeLabel}
                            {item.note ? ` · ${item.note}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono text-sm font-semibold tabular-nums ${
                              item.type === 'gasto' ? 'text-[#991B1B]' : 'text-[#1B4332]'
                            }`}
                          >
                            {item.type === 'gasto' ? '−' : ''}
                            {vault.profile.currency} {item.amount.toLocaleString('es-ES')}
                          </span>
                          <button
                            type="button"
                            aria-label="Eliminar movimiento"
                            onClick={() => removeFinanceEntry(item.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Seguimiento de objetivos financieros */}
          <div className="grid gap-6 lg:grid-cols-12">
            <form
              onSubmit={addFinanceGoal}
              className="space-y-3 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-5"
            >
              <h2 className="font-display text-lg font-semibold text-[#14241C]">
                Nuevo objetivo financiero
              </h2>
              <p className="text-xs text-[#4C5E54]">
                Define metas concretas de ahorro, liquidación de deuda o estabilidad económica.
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Meta financiera</label>
                <input
                  type="text"
                  required
                  maxLength={90}
                  value={finGoalTitle}
                  onChange={(e) => setFinGoalTitle(e.target.value)}
                  placeholder="Ej. Liquidar tarjeta o juntar fondo de 3 meses"
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Fecha objetivo</label>
                  <input
                    type="date"
                    value={finGoalDate}
                    onChange={(e) => setFinGoalDate(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Próximo paso</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={finGoalStep}
                    onChange={(e) => setFinGoalStep(e.target.value)}
                    placeholder="Ej. Apartar cada viernes"
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="min-h-[44px] w-full rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC]"
              >
                Agregar objetivo financiero
              </button>
            </form>

            <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-[#14241C]">
                  Seguimiento de objetivos financieros
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('goals')}
                  className="text-xs font-medium text-[#1B4332] hover:underline"
                >
                  Ver todas mis metas
                </button>
              </div>
              {financeGoals.length === 0 ? (
                <p className="mt-4 text-sm text-[#4C5E54]">
                  Aún no tienes metas financieras. Crea una para medir tu avance de ahorro o pago de deudas.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {financeGoals.map((goal) => (
                    <div key={goal.id} className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {goal.completed ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4332]" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#4C5E54]" />
                          )}
                          <div>
                            <p className="font-medium text-[#14241C]">{goal.title}</p>
                            <p className="text-xs text-[#4C5E54]">
                              Meta {formatShortDate(goal.targetDate)}
                              {goal.nextStep ? ` · ${goal.nextStep}` : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Eliminar objetivo financiero"
                          onClick={() => removeGoal(goal.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={10}
                          value={goal.progress}
                          onChange={(e) => updateGoalProgress(goal.id, Number(e.target.value))}
                          aria-label={`Progreso de ${goal.title}`}
                          className="flex-1 accent-[#1B4332]"
                        />
                        <span className="font-mono text-xs font-semibold tabular-nums text-[#1B4332]">
                          {goal.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* 3. Relaciones y familia */}
      {activeTab === 'relationships' && (
        <div className="space-y-6">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1B4332]/20 bg-[#EBF3EE] p-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4332]" />
              <div>
                <h2 className="text-sm font-semibold text-[#1B4332]">
                  Opciones de privacidad y recursos por país
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-[#2D4A3B]">
                  Tus contactos de confianza y tu bitácora familiar permanecen privados bajo tu UID en Cloud
                  Firestore; nunca se envían a RENACER IA ni a la Comunidad.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleHidePhones}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#1B4332]/30 bg-white px-3.5 py-2 text-xs font-medium text-[#14241C] hover:bg-[#FAF8F3]"
              >
                {hidePhones ? <Eye className="h-4 w-4 text-[#1B4332]" /> : <EyeOff className="h-4 w-4 text-[#1B4332]" />}
                <span>{hidePhones ? 'Mostrar teléfonos' : 'Ocultar teléfonos en pantalla'}</span>
              </button>
              {onOpenHelp && (
                <button
                  type="button"
                  onClick={onOpenHelp}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#991B1B] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#7F1D1D]"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Líneas de emergencia por país</span>
                </button>
              )}
            </div>
          </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Círculo de apoyo y emergencia
            </h2>
            <p className="mt-1 text-xs text-[#4C5E54]">
              Estas personas aparecen en tu panel "Necesito ayuda ahora" para contactarlos con un toque.
            </p>
            <form onSubmit={addSupportContact} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nombre"
                  className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
                <input
                  type="text"
                  maxLength={40}
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  placeholder="Relación (Ej. Hermana, Padrino)"
                  className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="tel"
                  maxLength={30}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Teléfono (opcional)"
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-[#1B4332] px-4 text-sm font-medium text-[#F7F4EC]"
                >
                  Agregar
                </button>
              </div>
            </form>

            <div className="mt-5 divide-y divide-[#E3DDD0]">
              {vault.supportContacts.length === 0 ? (
                <p className="py-3 text-sm text-[#4C5E54]">Aún no agregas contactos de apoyo.</p>
              ) : (
                vault.supportContacts.map((c) => {
                  const dialable = c.phone.replace(/[^0-9+*#()-]/g, '');
                  const maskedPhone =
                    c.phone && hidePhones
                      ? `•••• ${c.phone.slice(-4)}`
                      : c.phone;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#14241C]">{c.name}</p>
                        <p className="truncate text-xs text-[#4C5E54]">
                          {c.relation} {maskedPhone ? `· ${maskedPhone}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {dialable.length > 0 && (
                          <a
                            href={`tel:${dialable}`}
                            aria-label={`Llamar a ${c.name}`}
                            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-[#EBF3EE] px-2.5 text-xs font-medium text-[#1B4332]"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>Llamar</span>
                          </a>
                        )}
                        <button
                          type="button"
                          aria-label="Eliminar contacto"
                          onClick={() => removeContact(c.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Bitácora de vínculos y límites sanos
            </h2>
            <p className="mt-1 text-xs text-[#4C5E54]">
              Registra conversaciones honestas, reparación de confianza o límites necesarios.
            </p>
            <form onSubmit={addRelationshipLog} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={relPerson}
                  onChange={(e) => setRelPerson(e.target.value)}
                  placeholder="Con quién"
                  className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
                <select
                  value={relAction}
                  onChange={(e) => setRelAction(e.target.value as RelationshipLog['actionType'])}
                  className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                >
                  <option value="conversacion">Conversación honesta</option>
                  <option value="limite_sano">Límite sano</option>
                  <option value="reparacion">Acción de reparación</option>
                  <option value="tiempo_calidad">Tiempo de calidad</option>
                </select>
              </div>
              <textarea
                rows={2}
                required
                maxLength={240}
                value={relSummary}
                onChange={(e) => setRelSummary(e.target.value)}
                placeholder="¿Qué paso diste o qué acuerdo alcanzaron?"
                className="w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] p-3 text-sm"
              />
              <button
                type="submit"
                className="min-h-[44px] w-full rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC]"
              >
                Guardar en bitácora familiar
              </button>
            </form>

            <div className="mt-5 divide-y divide-[#E3DDD0]">
              {vault.relationshipLogs.length === 0 ? (
                <p className="py-3 text-sm text-[#4C5E54]">
                  Aún no has registrado entradas en tu bitácora familiar.
                </p>
              ) : (
                vault.relationshipLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#4C5E54]">
                        <span className="font-semibold text-[#14241C]">{log.personName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatShortDate(log.date)}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#14241C]">{log.summary}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Eliminar registro de bitácora"
                      onClick={() => removeRelationshipLog(log.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        </div>
      )}

      {/* 4. Seguimiento de objetivos y progreso */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#1B4332]/20 bg-[#EBF3EE] p-5">
              <p className="text-xs text-[#1B4332]">Avance promedio en metas</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#1B4332]">
                {vault.lifeGoals.length === 0
                  ? '0%'
                  : `${Math.round(
                      vault.lifeGoals.reduce((acc, g) => acc + g.progress, 0) /
                        vault.lifeGoals.length
                    )}%`}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
              <p className="text-xs text-[#4C5E54]">Metas cumplidas</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#14241C]">
                {vault.lifeGoals.filter((g) => g.completed).length}/{vault.lifeGoals.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
              <p className="text-xs text-[#4C5E54]">Constancia plan diario (7d)</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#1B4332]">
                {vault.dailyPlan.filter((d) => d.active).length === 0
                  ? '0%'
                  : `${Math.round(
                      (vault.dailyPlan
                        .filter((d) => d.active)
                        .reduce(
                          (acc, item) =>
                            acc + last7.filter((k) => item.completedDates.includes(k)).length,
                          0
                        ) /
                        (vault.dailyPlan.filter((d) => d.active).length * 7)) *
                        100
                    )}%`}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
              <p className="text-xs text-[#4C5E54]">Constancia hábitos (7d)</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#14241C]">
                {vault.habits.length === 0
                  ? '0%'
                  : `${Math.round(
                      (vault.habits.reduce(
                        (acc, h) => acc + last7.filter((k) => h.completedDates.includes(k)).length,
                        0
                      ) /
                        (vault.habits.length * 7)) *
                        100
                    )}%`}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={addGoal}
            className="space-y-3 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-4"
          >
            <h2 className="font-display text-lg font-semibold text-[#14241C]">Nueva meta</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Objetivo</label>
              <input
                type="text"
                required
                maxLength={90}
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Ej. Retomar mis estudios técnicos"
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Área</label>
                <select
                  value={goalArea}
                  onChange={(e) => setGoalArea(e.target.value as LifeGoal['area'])}
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                >
                  <option>Salud</option>
                  <option>Trabajo y estudio</option>
                  <option>Hogar</option>
                  <option>Propósito</option>
                  <option>Finanzas</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Fecha objetivo</label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Próximo paso concreto</label>
              <input
                type="text"
                maxLength={120}
                value={goalStep}
                onChange={(e) => setGoalStep(e.target.value)}
                placeholder="Ej. Llamar para pedir requisitos"
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] w-full rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC]"
            >
              Crear meta
            </button>
          </form>

          <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-8">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              Tus proyectos de vida
            </h2>
            {vault.lifeGoals.length === 0 ? (
              <p className="mt-4 text-sm text-[#4C5E54]">
                Crea tu primera meta en salud, trabajo, hogar o propósito para dar dirección concreta a
                tu recuperación.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {vault.lifeGoals.map((goal) => (
                  <div key={goal.id} className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {goal.completed ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4332]" />
                        ) : (
                          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#4C5E54]" />
                        )}
                        <div>
                          <p className="font-medium text-[#14241C]">{goal.title}</p>
                          <p className="text-xs text-[#4C5E54]">
                            {goal.area} · Meta {formatShortDate(goal.targetDate)}
                            {goal.nextStep ? ` · Siguiente paso: ${goal.nextStep}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Eliminar meta"
                        onClick={() => removeGoal(goal.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={10}
                        value={goal.progress}
                        onChange={(e) => updateGoalProgress(goal.id, Number(e.target.value))}
                        aria-label={`Progreso de ${goal.title}`}
                        className="flex-1 accent-[#1B4332]"
                      />
                      <span className="font-mono text-xs font-semibold tabular-nums text-[#1B4332]">
                        {goal.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          </div>
        </div>
      )}

      {/* 5. Comunidad con moderación y protección */}
      {activeTab === 'community' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-[#1B4332]/20 bg-[#EBF3EE] p-5 text-xs leading-relaxed text-[#1B4332]">
              <div className="mb-1.5 flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Espacio protegido con moderación activa</span>
              </div>
              <p>
                Participas únicamente con tu alias (<strong>{vault.profile.alias}</strong>), nunca se
                muestra tu correo. La moderación automática bloquea datos de contacto, acoso y cualquier
                promoción de consumo o apuestas. Puedes reportar contenido o silenciar usuarios al instante.
              </p>
            </div>

            <form
              onSubmit={createCommunityPost}
              className="space-y-3 rounded-2xl border border-[#E3DDD0] bg-white p-5"
            >
              <h2 className="font-display text-lg font-semibold text-[#14241C]">
                Compartir con la comunidad
              </h2>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Tema</label>
                <select
                  value={postCategory}
                  onChange={(e) =>
                    setPostCategory(e.target.value as 'logros' | 'apoyo' | 'estrategias')
                  }
                  className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                >
                  <option value="apoyo">Busco o doy apoyo</option>
                  <option value="logros">Logro del día</option>
                  <option value="estrategias">Estrategia práctica</option>
                </select>
              </div>
              <textarea
                rows={4}
                required
                minLength={8}
                maxLength={800}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Comparte algo que hoy te dio fuerza o una pregunta respetuosa..."
                className="w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] p-3 text-sm"
              />
              <button
                type="submit"
                disabled={posting}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                <span>{posting ? 'Verificando seguridad...' : 'Publicar con moderación'}</span>
              </button>
            </form>

            {vault.blockedCommunityAliases.length > 0 && (
              <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#14241C]">
                    Usuarios silenciados ({vault.blockedCommunityAliases.length})
                  </h3>
                </div>
                <div className="divide-y divide-[#E3DDD0]">
                  {vault.blockedCommunityAliases.map((entry) => (
                    <div key={entry} className="flex items-center justify-between gap-2 py-2 text-xs">
                      <span className="truncate font-medium text-[#14241C]">
                        {formatBlockedLabel(entry)}
                      </span>
                      <button
                        type="button"
                        onClick={() => unblockEntry(entry)}
                        className="min-h-[34px] shrink-0 rounded-lg border border-[#D5CEBF] bg-[#FAF8F3] px-2.5 text-xs font-medium text-[#1B4332] hover:bg-[#EBF3EE]"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <section className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E3DDD0] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#14241C]">
                <Users className="h-4 w-4 text-[#1B4332]" />
                <span>Muro de acompañamiento</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'logros', label: 'Logros' },
                  { id: 'apoyo', label: 'Apoyo' },
                  { id: 'estrategias', label: 'Estrategias' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterCat(f.id as typeof filterCat)}
                    className={`min-h-[36px] rounded-lg px-3 text-xs font-medium ${
                      filterCat === f.id
                        ? 'bg-[#1B4332] text-[#F7F4EC]'
                        : 'bg-[#FAF8F3] text-[#4C5E54]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {communityError && (
              <div className="flex items-start gap-2 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3.5 text-sm text-[#991B1B]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{communityError}</span>
              </div>
            )}

            {communityNotice && (
              <div className="rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-3.5 text-sm text-[#1B4332]">
                {communityNotice}
              </div>
            )}

            {loadingPosts ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#E3DDD0] bg-white p-8 text-sm text-[#4C5E54]">
                <Loader2 className="h-4 w-4 animate-spin text-[#1B4332]" />
                <span>Cargando publicaciones...</span>
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="rounded-2xl border border-[#E3DDD0] bg-white p-8 text-center text-sm text-[#4C5E54]">
                Aún no hay publicaciones en esta categoría. Sé la primera persona en compartir un
                mensaje constructivo hoy.
              </div>
            ) : (
              visiblePosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-[#E3DDD0] bg-white p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4C5E54]">
                    <div>
                      <span className="font-semibold text-[#14241C]">{post.authorAlias}</span>
                      <span className="mx-1.5">·</span>
                      <span className="capitalize">{post.category}</span>
                      <span className="mx-1.5">·</span>
                      <span>{formatDateTime(post.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {post.authorUid === vault.profile.id ? (
                        <button
                          type="button"
                          onClick={() => removeOwnPost(post.id)}
                          title="Eliminar mi publicación"
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs text-[#4C5E54] hover:bg-[#FEF2F2] hover:text-[#991B1B]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Eliminar</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => reportPost(post.id, post.reportedByMe)}
                            title={post.reportedByMe ? 'Retirar mi reporte' : 'Reportar publicación'}
                            className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs ${
                              post.reportedByMe
                                ? 'bg-[#FEF2F2] font-medium text-[#991B1B]'
                                : 'text-[#4C5E54] hover:bg-[#FEF2F2] hover:text-[#991B1B]'
                            }`}
                          >
                            <Flag className="h-3.5 w-3.5" />
                            <span>{post.reportedByMe ? 'Reportado (retirar)' : 'Reportar'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => blockAuthor(post.authorUid, post.authorAlias)}
                            title="Silenciar usuario"
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs text-[#4C5E54] hover:bg-[#FAF8F3]"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Silenciar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-[#14241C] whitespace-pre-wrap">
                    {post.content}
                  </p>

                  <div className="flex items-center gap-4 border-t border-[#E3DDD0] pt-3">
                    <button
                      type="button"
                      onClick={() => supportPost(post.id)}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        post.supportedByMe
                          ? 'bg-[#1B4332] text-[#F7F4EC]'
                          : 'bg-[#FAF8F3] text-[#1B4332] hover:bg-[#EBF3EE]'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${post.supportedByMe ? 'fill-current' : ''}`} />
                      <span>
                        {post.supportedByMe ? 'Acompañando' : 'Acompaño'} (
                        <span className="font-mono tabular-nums">{post.supportCount}</span>)
                      </span>
                    </button>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#4C5E54]">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>
                        <span className="font-mono tabular-nums">{post.replies.length}</span> respuestas
                      </span>
                    </span>
                  </div>

                  {post.replies.length > 0 && (
                    <div className="space-y-2 border-t border-[#E3DDD0] pt-3">
                      {post.replies.map((rep) => (
                        <div key={rep.id} className="rounded-xl bg-[#FAF8F3] p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-[#14241C]">{rep.authorAlias}</span>{' '}
                              <span className="text-[#4C5E54]">· {formatDateTime(rep.createdAt)}</span>
                            </div>
                            {rep.authorUid === vault.profile.id && (
                              <button
                                type="button"
                                aria-label="Eliminar mi respuesta"
                                onClick={() => removeOwnReply(post.id, rep.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4C5E54] hover:text-[#991B1B]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-[#14241C]">{rep.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={500}
                      value={replyDrafts[post.id] ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      placeholder="Escribe una respuesta respetuosa..."
                      className="min-h-[40px] flex-1 rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => sendReply(post.id)}
                      className="min-h-[40px] rounded-xl bg-[#1B4332] px-3.5 text-xs font-medium text-[#F7F4EC]"
                    >
                      Responder
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
};
