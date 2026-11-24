import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import {
  BookOpen,
  Compass,
  HeartPulse,
  LayoutDashboard,
  MessageCircleHeart,
  ShieldAlert,
  Sprout,
  User,
} from 'lucide-react';
import { auth, firebaseInitError, testConnection } from './firebase';
import {
  clearOfflineCacheForUser,
  createUserProfileAndVault,
  subscribeToUserVault,
  syncVaultChanges,
} from './services/firebaseVault';
import type { RecoveryFocus, UserVaultData } from './types/renacer';
import { AuthScreen } from './components/AuthScreen';
import { AppRecoveryFallback } from './components/ErrorBoundary';
import { DashboardView } from './components/DashboardView';
import { RecoveryView, type RecoverySubTab } from './components/RecoveryView';
import { JournalView } from './components/JournalView';
import { RenacerAIView } from './components/RenacerAIView';
import { ModulesView, type ModuleTab } from './components/ModulesView';
import { ProfileSecurityView } from './components/ProfileSecurityView';
import { HelpDrawer } from './components/HelpDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';

type AppTab = 'dashboard' | 'recovery' | 'journal' | 'ai' | 'modules' | 'profile';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);

  const [vault, setVault] = useState<UserVaultData | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loadingVault, setLoadingVault] = useState(false);

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [recoverySubTab, setRecoverySubTab] = useState<RecoverySubTab>('daily');
  const [moduleSubTab, setModuleSubTab] = useState<ModuleTab>('goals');
  const [helpOpen, setHelpOpen] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(firebaseInitError);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const vaultRef = useRef<UserVaultData | null>(null);
  vaultRef.current = vault;
  const deletingAccountRef = useRef(false);
  deletingAccountRef.current = deletingAccount;

  useEffect(() => {
    if (firebaseInitError) {
      setBootError(firebaseInitError);
      return;
    }
    testConnection()
      .then((res) => {
        if (!res.reachable && res.error) {
          setConnectionWarning(res.error);
        }
      })
      .catch(() => {
        setConnectionWarning('No se pudo verificar la conexión inicial con Cloud Firestore.');
      });
  }, []);

  useEffect(() => {
    if (firebaseInitError || !auth) {
      setBootError(firebaseInitError ?? 'No se pudo inicializar Firebase Authentication.');
      return;
    }

    let settled = false;
    const authTimeout = window.setTimeout(() => {
      if (!settled) {
        setBootError(
          'Firebase Authentication tardó demasiado en responder en este navegador. Verifica tu conexión o limpia la caché de la app.'
        );
      }
    }, 10000);

    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        settled = true;
        window.clearTimeout(authTimeout);
        setBootError(null);
        setFirebaseUser(user);
        setAuthReady(true);
        if (!user) {
          setVault(null);
          setNeedsOnboarding(false);
          setLoadingVault(false);
        }
      },
      (err) => {
        settled = true;
        window.clearTimeout(authTimeout);
        setBootError(
          err instanceof Error
            ? `No pudimos verificar tu sesión de Firebase: ${err.message}`
            : 'No pudimos verificar tu sesión de Firebase.'
        );
      }
    );

    return () => {
      window.clearTimeout(authTimeout);
      unsub();
    };
  }, [authRefreshTick]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    setLoadingVault(true);
    setNeedsOnboarding(false);
    setPersistError(null);

    let receivedFirstSnapshot = false;
    const vaultTimeout = window.setTimeout(() => {
      if (!receivedFirstSnapshot && !vaultRef.current) {
        setLoadingVault(false);
        setPersistError(
          'Cloud Firestore está tardando más de lo normal en cargar tus datos. Revisa tu conexión o reintenta.'
        );
      }
    }, 12000);

    const unsubVault = subscribeToUserVault(
      firebaseUser.uid,
      async (nextVault) => {
        receivedFirstSnapshot = true;
        window.clearTimeout(vaultTimeout);
        if (nextVault === null) {
          let pendingRaw: string | null = null;
          try {
            pendingRaw = sessionStorage.getItem('renacer_pending_profile');
          } catch {
            pendingRaw = null;
          }
          if (pendingRaw) {
            try {
              const pending = JSON.parse(pendingRaw) as {
                alias: string;
                focus: RecoveryFocus;
                recoveryStartDate: string;
                dailySpendEstimate: number;
                consentAccepted: boolean;
              };
              await createUserProfileAndVault({
                uid: firebaseUser.uid,
                email: firebaseUser.email ?? '',
                ...pending,
              });
              try {
                sessionStorage.removeItem('renacer_pending_profile');
              } catch {
                // ignore
              }
              return;
            } catch {
              // Fall through to manual onboarding
            }
          }
          if (deletingAccountRef.current) {
            return;
          }
          setVault(null);
          setNeedsOnboarding(true);
          setLoadingVault(false);
        } else {
          setVault(nextVault);
          setNeedsOnboarding(false);
          setLoadingVault(false);
        }
      },
      (err) => {
        receivedFirstSnapshot = true;
        window.clearTimeout(vaultTimeout);
        setLoadingVault(false);
        setPersistError(err.message);
      }
    );

    return () => {
      window.clearTimeout(vaultTimeout);
      unsubVault();
    };
  }, [authReady, firebaseUser, authRefreshTick]);

  const handleUpdateVault = useCallback(
    async (updater: (prev: UserVaultData) => UserVaultData) => {
      const currentVault = vaultRef.current;
      if (!firebaseUser || !currentVault) return;
      setPersistError(null);
      const nextVault = updater(currentVault);
      vaultRef.current = nextVault;
      setVault(nextVault);
      try {
        await syncVaultChanges(firebaseUser.uid, currentVault, nextVault);
      } catch (err) {
        vaultRef.current = currentVault;
        setVault(currentVault);
        const msg =
          err instanceof Error
            ? err.message
            : 'No se pudo sincronizar con Cloud Firestore.';
        setPersistError(msg);
        throw err instanceof Error ? err : new Error(msg);
      }
    },
    [firebaseUser]
  );

  const navigateTo = useCallback(
    (tab: AppTab, subTab?: RecoverySubTab | ModuleTab) => {
      setActiveTab(tab);
      if (tab === 'recovery' && subTab) {
        setRecoverySubTab(subTab as RecoverySubTab);
      } else if (tab === 'modules' && subTab) {
        setModuleSubTab(subTab as ModuleTab);
      }
    },
    []
  );

  const handleLogout = async () => {
    if (firebaseUser) {
      await clearOfflineCacheForUser(firebaseUser.uid);
    } else {
      try {
        sessionStorage.removeItem('renacer_pending_profile');
      } catch {
        // ignore
      }
    }
    await signOut(auth);
    vaultRef.current = null;
    setVault(null);
    setPersistError(null);
    setActiveTab('dashboard');
  };

  const handleAccountDeleted = () => {
    try {
      sessionStorage.removeItem('renacer_pending_profile');
    } catch {
      // ignore
    }
    deletingAccountRef.current = false;
    setDeletingAccount(false);
    vaultRef.current = null;
    setVault(null);
    setFirebaseUser(null);
    setPersistError(null);
    setActiveTab('dashboard');
  };

  if (bootError) {
    return (
      <AppRecoveryFallback
        title="No pudimos conectar con Firebase"
        message={bootError}
        onRetry={() => {
          setBootError(null);
          setAuthRefreshTick((t) => t + 1);
        }}
        showCacheReset
      />
    );
  }

  if (!authReady || (firebaseUser && firebaseUser.emailVerified && loadingVault && !vault)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EC] p-6 text-center text-[#14241C]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B4332] text-[#F7F4EC]">
          <Sprout className="h-6 w-6" />
        </div>
        <p className="mt-4 font-display text-lg font-medium">
          Conectando con Cloud Firestore...
        </p>
        <p className="mt-1 text-xs text-[#4C5E54]">
          Verificando sesión segura en este dispositivo
        </p>
      </div>
    );
  }

  if (firebaseUser && firebaseUser.emailVerified && !loadingVault && !vault && !needsOnboarding && persistError) {
    return (
      <AppRecoveryFallback
        title="No se pudo cargar tu bóveda en Firestore"
        message={persistError}
        onRetry={() => {
          setPersistError(null);
          setAuthRefreshTick((t) => t + 1);
        }}
        showCacheReset
      />
    );
  }

  if (!firebaseUser || !firebaseUser.emailVerified || needsOnboarding || !vault) {
    return (
      <>
        <AuthScreen
          pendingOnboardingUser={
            firebaseUser && firebaseUser.emailVerified && needsOnboarding ? firebaseUser : null
          }
          pendingVerificationUser={
            firebaseUser && !firebaseUser.emailVerified ? firebaseUser : null
          }
          onOnboardingComplete={() => setAuthRefreshTick((t) => t + 1)}
          onVerificationRefresh={() => setAuthRefreshTick((t) => t + 1)}
        />
        <OfflineIndicator />
      </>
    );
  }

  const desktopNavItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Panel principal', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'recovery', label: 'Recuperación', icon: <HeartPulse className="h-5 w-5" /> },
    { id: 'journal', label: 'Diario emocional', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'ai', label: 'RENACER IA', icon: <MessageCircleHeart className="h-5 w-5" /> },
    { id: 'modules', label: 'Metas y vida', icon: <Compass className="h-5 w-5" /> },
    { id: 'profile', label: 'Perfil y seguridad', icon: <User className="h-5 w-5" /> },
  ];

  const mobileNavItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Panel', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'recovery', label: 'Proceso', icon: <HeartPulse className="h-5 w-5" /> },
    { id: 'journal', label: 'Diario', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'ai', label: 'Asistente IA', icon: <MessageCircleHeart className="h-5 w-5" /> },
    { id: 'modules', label: 'Metas', icon: <Compass className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#14241C]">
      {/* Desktop Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-[#E3DDD0] bg-white p-5 lg:flex">
        <div>
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B4332] text-[#F7F4EC]">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-xl font-semibold tracking-tight text-[#14241C]">
                RENACER
              </span>
              <p className="text-[11px] text-[#4C5E54]">Un día a la vez</p>
            </div>
          </div>

          <nav aria-label="Navegación principal" className="mt-8 space-y-1.5">
            {desktopNavItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-[#1B4332] text-[#F7F4EC]'
                      : 'text-[#4C5E54] hover:bg-[#FAF8F3] hover:text-[#14241C]'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-[#E3DDD0] pt-4">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#991B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7F1D1D]"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Necesito ayuda ahora</span>
          </button>
          <div className="px-1 text-xs text-[#4C5E54]">
            <p className="truncate font-medium text-[#14241C]">{vault.profile.alias}</p>
            <p className="truncate">{vault.profile.focus}</p>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[#E3DDD0] bg-[#FAF8F3]/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Sprout className="h-5 w-5 text-[#1B4332]" />
            <span className="font-display text-lg font-semibold text-[#14241C] whitespace-nowrap">
              RENACER
            </span>
          </div>

          <p className="hidden text-xs font-medium text-[#4C5E54] lg:block">
            Hola, <strong className="text-[#14241C]">{vault.profile.alias}</strong> · Un día a la vez
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => navigateTo('profile')}
              aria-label="Perfil y seguridad"
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-2.5 text-xs font-medium lg:hidden ${
                activeTab === 'profile'
                  ? 'border-[#1B4332] bg-[#1B4332] text-[#F7F4EC]'
                  : 'border-[#D5CEBF] bg-white text-[#14241C]'
              }`}
            >
              <User className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#991B1B] px-3.5 py-2 text-xs font-medium text-white lg:hidden whitespace-nowrap"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Ayuda</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:py-8 lg:pb-10">
          {connectionWarning && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-[#D97706]/30 bg-[#FEF3C7] p-3.5 text-xs text-[#78350F]"
            >
              {connectionWarning} Tus cambios se sincronizarán cuando vuelva la conexión.
            </div>
          )}

          {persistError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3.5 text-sm text-[#991B1B]"
            >
              {persistError}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              vault={vault}
              onUpdateVault={handleUpdateVault}
              onOpenHelp={() => setHelpOpen(true)}
              onNavigate={navigateTo}
            />
          )}

          {activeTab === 'recovery' && (
            <RecoveryView
              vault={vault}
              onUpdateVault={handleUpdateVault}
              onOpenHelp={() => setHelpOpen(true)}
              onGoToAI={() => navigateTo('ai')}
              initialSubTab={recoverySubTab}
            />
          )}

          {activeTab === 'journal' && (
            <JournalView vault={vault} onUpdateVault={handleUpdateVault} />
          )}

          {activeTab === 'ai' && (
            <RenacerAIView
              vault={vault}
              onUpdateVault={handleUpdateVault}
              onOpenHelp={() => setHelpOpen(true)}
            />
          )}

          {activeTab === 'modules' && (
            <ModulesView
              vault={vault}
              onUpdateVault={handleUpdateVault}
              initialModuleTab={moduleSubTab}
              onOpenHelp={() => setHelpOpen(true)}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileSecurityView
              vault={vault}
              onUpdateVault={handleUpdateVault}
              onLogout={handleLogout}
              onAccountDeleted={handleAccountDeleted}
              onOpenAssessment={() => navigateTo('recovery', 'assessment')}
              onDeletingAccountChange={setDeletingAccount}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E3DDD0] bg-white/95 backdrop-blur-md pb-safe lg:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center">
          {mobileNavItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 transition ${
                  active ? 'text-[#1B4332]' : 'text-[#4C5E54]'
                }`}
              >
                {item.icon}
                <span className={`text-[10px] tracking-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        supportContacts={vault.supportContacts}
        onGoToAI={() => navigateTo('ai')}
        onOpenSupport={() => navigateTo('modules', 'relationships')}
      />

      <OfflineIndicator />
    </div>
  );
}
