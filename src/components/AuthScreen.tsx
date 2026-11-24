import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MailCheck,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { createUserProfileAndVault } from '../services/firebaseVault';
import type { RecoveryFocus } from '../types/renacer';
import { todayISO } from '../utils/recoveryMath';
import { LegalDocsModal, type LegalCenterTab } from './LegalDocsModal';
import {
  APP_VERSION,
  IS_PUBLIC_LAUNCH_LEGAL_READY,
  LEGAL_ENTITY_CONFIG,
  type LegalDocumentItem,
} from '../data/legalAndDocs';
import { PWAInstallButton } from './PWAInstallButton';

const HERO_IMAGE = '/src/assets/images/renacer_sanctuary_hero_1795465214434.jpg';
const JOURNAL_PREVIEW_IMAGE = '/src/assets/images/renacer_editorial_journal_1795549112370.jpg';

const FOCUS_OPTIONS: RecoveryFocus[] = [
  'Alcohol',
  'Sustancias',
  'Apuestas y juego',
  'Tabaco o nicotina',
  'Conductas compulsivas',
  'Reconstrucción integral',
];

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'El acceso oficial de RENACER es mediante "Continuar con Google". Utiliza el botón verde superior para entrar de forma segura.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con ese correo electrónico.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 8 caracteres.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido.';
    case 'auth/popup-closed-by-user':
      return 'Cerraste la ventana de Google antes de completar el acceso.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes e intenta de nuevo.';
    case 'auth/unauthorized-domain':
      return 'Este dominio aún no está autorizado en Firebase Authentication (Settings > Authorized domains).';
    case 'auth/network-request-failed':
      return 'No pudimos conectar con Firebase Authentication. Revisa tu conexión a internet e intenta de nuevo.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos seguidos. Espera un momento e intenta de nuevo.';
    default:
      return err instanceof Error ? err.message : 'No fue posible completar la autenticación.';
  }
}

interface AuthScreenProps {
  pendingOnboardingUser: FirebaseUser | null;
  pendingVerificationUser: FirebaseUser | null;
  onOnboardingComplete: () => void;
  onVerificationRefresh: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  pendingOnboardingUser,
  pendingVerificationUser,
  onOnboardingComplete,
  onVerificationRefresh,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [heroError, setHeroError] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  // Onboarding / Profile setup state (used both during email register or after Google sign-in)
  const [alias, setAlias] = useState(pendingOnboardingUser?.displayName?.split(' ')[0] ?? '');
  const [focus, setFocus] = useState<RecoveryFocus>('Reconstrucción integral');
  const [startDate, setStartDate] = useState(todayISO());
  const [dailySpend, setDailySpend] = useState('0');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showConsentDetails, setShowConsentDetails] = useState(false);

  useEffect(() => {
    if (pendingOnboardingUser) {
      const suggested = pendingOnboardingUser.displayName?.split(' ')[0]?.trim() ?? '';
      if (suggested.length >= 2) {
        setAlias((prev) => (prev.trim() ? prev : suggested.slice(0, 40)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOnboardingUser?.uid]);

  // Recovery email reset state
  const [recEmail, setRecEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalCenterTab>('legal');
  const [legalDocId, setLegalDocId] = useState<LegalDocumentItem['id']>('aviso_privacidad');

  const openLegalCenter = (tab: LegalCenterTab, docId: LegalDocumentItem['id'] = 'aviso_privacidad') => {
    setLegalModalTab(tab);
    setLegalDocId(docId);
    setLegalModalOpen(true);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consentAccepted) {
      setError('Debes aceptar el consentimiento informado y las condiciones de privacidad.');
      return;
    }
    if (alias.trim().length < 2) {
      setError('Ingresa un nombre o alias de al menos 2 caracteres.');
      return;
    }
    if (regPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      await sendEmailVerification(cred.user);
      // Save pending onboarding preferences temporarily in memory/session until verified if needed
      try {
        sessionStorage.setItem(
          'renacer_pending_profile',
          JSON.stringify({
            alias: alias.trim(),
            focus,
            recoveryStartDate: new Date(`${startDate}T08:00:00`).toISOString(),
            dailySpendEstimate: Number(dailySpend) || 0,
            consentAccepted: true,
          })
        );
      } catch {
        // Ignore restricted sessionStorage errors
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingOnboardingUser) return;
    setError(null);
    const cleanAlias = (alias.trim() || pendingOnboardingUser.displayName || 'Usuario').slice(0, 40);
    if (cleanAlias.length < 2) {
      setError('Ingresa un nombre o alias de al menos 2 caracteres.');
      return;
    }
    if (!consentAccepted) {
      setError('Debes aceptar el consentimiento informado y las condiciones de privacidad.');
      return;
    }
    setLoading(true);
    try {
      await createUserProfileAndVault({
        uid: pendingOnboardingUser.uid,
        email: pendingOnboardingUser.email ?? '',
        alias: cleanAlias,
        focus,
        recoveryStartDate: startDate ? new Date(`${startDate}T08:00:00`).toISOString() : new Date().toISOString(),
        dailySpendEstimate: Number(dailySpend) || 0,
        consentAccepted,
      });
      try {
        sessionStorage.removeItem('renacer_pending_profile');
      } catch {
        // Ignore restricted sessionStorage errors
      }
      onOnboardingComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu perfil en Firestore.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRecoverySuccess(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, recEmail.trim());
      setRecoverySuccess(
        'Enviamos un enlace de recuperación a tu correo electrónico desde Firebase Authentication.'
      );
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationUser) return;
    setError(null);
    setVerificationMsg(null);
    setLoading(true);
    try {
      await sendEmailVerification(pendingVerificationUser);
      setVerificationMsg('Correo de verificación reenviado. Revisa tu bandeja o spam.');
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!pendingVerificationUser) return;
    setError(null);
    setLoading(true);
    try {
      await reload(pendingVerificationUser);
      if (pendingVerificationUser.emailVerified) {
        onVerificationRefresh();
      } else {
        setError('Tu correo aún aparece sin verificar. Abre el enlace que enviamos a tu correo.');
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#14241C]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-12">
        {/* Left editorial forest sanctuary column */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#1B4332] p-6 text-[#F7F4EC] sm:p-10 lg:col-span-5 lg:min-h-screen">
          {!heroError ? (
            <img
              src={HERO_IMAGE}
              alt="Sendero sereno entre árboles verdes con luz de mañana"
              referrerPolicy="no-referrer"
              onError={() => setHeroError(true)}
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1B4332] via-[#234E3C] to-[#132E22]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#132E22] via-[#1B4332]/70 to-[#1B4332]/50" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F4EC]/15 backdrop-blur-sm">
                <Sprout className="h-5 w-5 text-[#F7F4EC]" />
              </div>
              <span className="font-display text-2xl font-semibold tracking-tight">RENACER</span>
            </div>
            <PWAInstallButton />
          </div>

          <div className="relative z-10 my-10 space-y-5 lg:my-0">
            <p className="text-sm font-medium text-[#D8E8DF]">Una nueva oportunidad comienza contigo</p>
            <h1 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl [text-wrap:balance]">
              Reconstruye tus hábitos. Recupera el control. Avanza un día a la vez.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-[#E3EDE7] sm:text-base">
              RENACER es una plataforma gratuita para acompañarte en tu proceso de reconstrucción
              personal. Registra tus emociones, maneja impulsos, ordena tus finanzas y apóyate en
              herramientas sin suscripciones, publicidad ni vigilancia comercial.
            </p>
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/20">
              <img
                src={JOURNAL_PREVIEW_IMAGE}
                alt="Cuaderno abierto, té herbal y luz cálida de mañana"
                referrerPolicy="no-referrer"
                className="h-36 w-full object-cover opacity-90 sm:h-40"
              />
              <div className="px-4 py-2.5 text-xs text-[#E3EDE7]">
                <strong className="text-white">Apoyo general no clínico:</strong> herramienta privada de
                acompañamiento diario. En México emergencias: <strong className="font-mono">911</strong> · Línea
                de la Vida: <strong className="font-mono">800 911 2000</strong>.
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-2 border-t border-white/15 pt-5 text-xs text-[#D8E8DF]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#B7E4C7]" />
              <span>Autenticación con Firebase Auth y datos aislados por usuario en Cloud Firestore.</span>
            </div>
            <p className="text-[#C6DDD0]">
              100% gratuita · Todas las funciones incluidas · Sin publicidad ni venta de datos · Exportación y eliminación total cuando lo decidas.
            </p>
          </div>
        </div>

        {/* Right authentication & onboarding workspace */}
        <div className="flex flex-col justify-center px-5 py-8 sm:px-10 lg:col-span-7 lg:px-16">
          <div className="mx-auto w-full max-w-lg">
            {/* Case A: Pending Email Verification */}
            {pendingVerificationUser ? (
              <div className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EBF3EE] text-[#1B4332]">
                  <MailCheck className="h-5 w-5" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-[#14241C]">
                  Verifica tu correo electrónico
                </h2>
                <p className="text-sm leading-relaxed text-[#4C5E54]">
                  Por seguridad, las reglas de Firestore exigen que tu correo esté verificado antes de
                  crear o leer tus registros. Enviamos un enlace a{' '}
                  <strong className="text-[#14241C]">{pendingVerificationUser.email}</strong>.
                </p>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {verificationMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-3 text-sm text-[#1B4332]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{verificationMsg}</span>
                  </div>
                )}

                <div className="grid gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCheckVerified}
                    className="min-h-[48px] w-full rounded-xl bg-[#1B4332] py-3 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
                  >
                    {loading ? 'Comprobando...' : 'Ya verifiqué mi correo — Continuar'}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResendVerification}
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-white py-2.5 text-sm font-medium text-[#14241C] hover:bg-[#FAF8F3]"
                  >
                    Reenviar correo de verificación
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    className="min-h-[40px] text-xs font-medium text-[#4C5E54] hover:text-[#14241C]"
                  >
                    Usar otra cuenta
                  </button>
                </div>
              </div>
            ) : pendingOnboardingUser ? (
              /* Case B: Authenticated user completing initial Firestore profile & consent */
              <form
                onSubmit={handleCompleteOnboarding}
                className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 sm:p-8"
              >
                <div>
                  <p className="text-xs font-medium text-[#1B4332]">
                    Conectado como {pendingOnboardingUser.email}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-[#14241C]">
                    Configura tu espacio en RENACER
                  </h2>
                  <p className="mt-1 text-sm text-[#4C5E54]">
                    Guardaremos tu perfil y plan personal protegidos en Cloud Firestore solo para tu
                    usuario.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="onb-alias" className="block text-sm font-medium text-[#14241C]">
                    Nombre o alias
                  </label>
                  <input
                    id="onb-alias"
                    type="text"
                    required
                    minLength={2}
                    maxLength={40}
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Ej. Elena o CaminoVerde"
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="onb-focus" className="block text-sm font-medium text-[#14241C]">
                      Enfoque principal
                    </label>
                    <select
                      id="onb-focus"
                      value={focus}
                      onChange={(e) => setFocus(e.target.value as RecoveryFocus)}
                      className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                    >
                      {FOCUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="onb-start" className="block text-sm font-medium text-[#14241C]">
                      Inicio de esta etapa
                    </label>
                    <input
                      id="onb-start"
                      type="date"
                      max={todayISO()}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="onb-spend" className="block text-sm font-medium text-[#14241C]">
                    Gasto diario estimado que buscas ahorrar (opcional)
                  </label>
                  <input
                    id="onb-spend"
                    type="number"
                    min={0}
                    max={1000000}
                    value={dailySpend}
                    onChange={(e) => setDailySpend(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 font-mono text-sm tabular-nums"
                  />
                </div>

                <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3.5 space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#14241C]">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#B7B0A0] accent-[#1B4332]"
                    />
                    <span>
                      Acepto el <strong>Consentimiento Informado, Aviso de Privacidad y Términos de Uso</strong>:
                      entiendo que RENACER ofrece apoyo general (no sustituye atención médica, psiquiátrica ni
                      emergencias), que mis datos están aislados por usuario en Cloud Firestore y que no se
                      venden ni usan para publicidad.
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-3 pl-8 text-xs">
                    <button
                      type="button"
                      onClick={() => openLegalCenter('legal', 'consentimiento_informado')}
                      className="font-medium text-[#1B4332] hover:underline"
                    >
                      Leer consentimiento completo
                    </button>
                    <button
                      type="button"
                      onClick={() => openLegalCenter('legal', 'aviso_privacidad')}
                      className="font-medium text-[#1B4332] hover:underline"
                    >
                      Ver Aviso de Privacidad
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="min-h-[48px] w-full rounded-xl bg-[#1B4332] py-3 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326] disabled:opacity-60"
                  >
                    {loading ? 'Creando espacio en Firestore...' : 'Guardar y entrar a RENACER'}
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    className="min-h-[40px] text-xs font-medium text-[#4C5E54] hover:text-[#14241C]"
                  >
                    Cancelar y cerrar sesión
                  </button>
                </div>
              </form>
            ) : (
              /* Case C: Normal Sign-In / Register / Recover */
              <>
                <div
                  role="tablist"
                  aria-label="Acceso a RENACER"
                  className="mb-6 grid grid-cols-3 gap-1 rounded-xl border border-[#E3DDD0] bg-[#EFEAE0] p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setRecoverySuccess(null);
                    }}
                    className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm whitespace-nowrap ${
                      mode === 'login'
                        ? 'bg-white text-[#14241C] shadow-sm'
                        : 'text-[#4C5E54] hover:text-[#14241C]'
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'register'}
                    onClick={() => {
                      setMode('register');
                      setError(null);
                      setRecoverySuccess(null);
                    }}
                    className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm whitespace-nowrap ${
                      mode === 'register'
                        ? 'bg-white text-[#14241C] shadow-sm'
                        : 'text-[#4C5E54] hover:text-[#14241C]'
                    }`}
                  >
                    Crear cuenta
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'recover'}
                    onClick={() => {
                      setMode('recover');
                      setError(null);
                      setRecoverySuccess(null);
                    }}
                    className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm whitespace-nowrap ${
                      mode === 'recover'
                        ? 'bg-white text-[#14241C] shadow-sm'
                        : 'text-[#4C5E54] hover:text-[#14241C]'
                    }`}
                  >
                    Recuperar
                  </button>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3.5 text-sm text-[#991B1B]"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {recoverySuccess && (
                  <div
                    role="status"
                    className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-3.5 text-sm text-[#1B4332]"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{recoverySuccess}</span>
                  </div>
                )}

                {/* Primary Google Sign-In CTA (configured automatically by Firebase provisioning) */}
                <div className="mb-5 rounded-2xl border border-[#E3DDD0] bg-white p-5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleSignIn}
                    className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-[#1B4332] px-5 py-3 text-sm font-medium text-[#F7F4EC] transition hover:bg-[#143326] disabled:opacity-60"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                      />
                    </svg>
                    <span>{loading ? 'Conectando...' : 'Continuar con Google'}</span>
                  </button>
                  <p className="mt-2 text-center text-xs text-[#4C5E54]">
                    Acceso verificado y sincronización inmediata en Cloud Firestore
                  </p>
                </div>

                {mode === 'login' && (
                  <form
                    onSubmit={handleLogin}
                    className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6"
                  >
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#14241C]">
                        O entra con correo y contraseña
                      </h2>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="login-email" className="block text-sm font-medium text-[#14241C]">
                        Correo electrónico
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="login-password" className="block text-sm font-medium text-[#14241C]">
                        Contraseña
                      </label>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showLoginPw ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Tu contraseña"
                          className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 pr-11 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPw((v) => !v)}
                          aria-label={showLoginPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#4C5E54]"
                        >
                          {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#1B4332] bg-[#FAF8F3] px-5 py-2.5 text-sm font-medium text-[#1B4332] hover:bg-[#EBF3EE] disabled:opacity-60"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Iniciar sesión con correo</span>
                    </button>
                  </form>
                )}

                {mode === 'register' && (
                  <form
                    onSubmit={handleRegister}
                    className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6"
                  >
                    <h2 className="font-display text-lg font-semibold text-[#14241C]">
                      Crear cuenta con correo y contraseña
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="reg-alias" className="block text-sm font-medium text-[#14241C]">
                          Nombre o alias
                        </label>
                        <input
                          id="reg-alias"
                          type="text"
                          required
                          minLength={2}
                          maxLength={40}
                          value={alias}
                          onChange={(e) => setAlias(e.target.value)}
                          placeholder="Ej. Elena"
                          className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="reg-email" className="block text-sm font-medium text-[#14241C]">
                          Correo electrónico
                        </label>
                        <input
                          id="reg-email"
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="tu@correo.com"
                          className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="reg-password" className="block text-sm font-medium text-[#14241C]">
                        Contraseña (mínimo 8 caracteres)
                      </label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          type={showRegPw ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 pr-11 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw((v) => !v)}
                          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#4C5E54]"
                        >
                          {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="reg-focus" className="block text-sm font-medium text-[#14241C]">
                          Enfoque principal
                        </label>
                        <select
                          id="reg-focus"
                          value={focus}
                          onChange={(e) => setFocus(e.target.value as RecoveryFocus)}
                          className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
                        >
                          {FOCUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="reg-start" className="block text-sm font-medium text-[#14241C]">
                          Inicio de etapa
                        </label>
                        <input
                          id="reg-start"
                          type="date"
                          max={todayISO()}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3.5">
                      <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#14241C]">
                        <input
                          type="checkbox"
                          checked={consentAccepted}
                          onChange={(e) => setConsentAccepted(e.target.checked)}
                          className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#B7B0A0] accent-[#1B4332]"
                        />
                        <span>
                          Acepto el <strong>Consentimiento Informado y Privacidad</strong> (apoyo general
                          sin diagnóstico clínico, datos privados protegidos por usuario en Firestore y cero
                          uso publicitario).
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowConsentDetails((v) => !v)}
                        className="mt-2 text-xs font-medium text-[#1B4332] hover:underline"
                      >
                        {showConsentDetails ? 'Ocultar detalles' : 'Leer detalles'}
                      </button>
                      {showConsentDetails && (
                        <p className="mt-2 border-t border-[#E3DDD0] pt-2 text-xs text-[#4C5E54]">
                          Cada usuario solo puede leer y modificar sus propios documentos en Cloud
                          Firestore mediante reglas de seguridad verificadas. Puedes exportar o eliminar
                          tu cuenta en cualquier momento.
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="min-h-[44px] w-full rounded-xl border border-[#1B4332] bg-[#FAF8F3] py-2.5 text-sm font-medium text-[#1B4332] hover:bg-[#EBF3EE] disabled:opacity-60"
                    >
                      {loading ? 'Creando cuenta...' : 'Registrarme con correo'}
                    </button>
                  </form>
                )}

                {mode === 'recover' && (
                  <form
                    onSubmit={handlePasswordReset}
                    className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6"
                  >
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#14241C]">
                        Recuperar contraseña
                      </h2>
                      <p className="mt-1 text-xs text-[#4C5E54]">
                        Firebase Authentication enviará un enlace oficial de restablecimiento a tu
                        correo.
                      </p>
                    </div>
                    <input
                      type="email"
                      required
                      value={recEmail}
                      onChange={(e) => setRecEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#1B4332] bg-[#FAF8F3] py-2.5 text-sm font-medium text-[#1B4332] hover:bg-[#EBF3EE]"
                    >
                      <KeyRound className="h-4 w-4" />
                      <span>Enviar correo de recuperación</span>
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Presentation / Trust / Legal Footer */}
            <div className="mt-6 rounded-2xl border border-[#E3DDD0] bg-white p-4 text-xs text-[#4C5E54] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#14241C]">
                  Transparencia, guías y ayuda verificada
                </span>
                <span className="font-mono text-[11px] text-[#4C5E54]">
                  v{APP_VERSION} · Acceso con Google
                </span>
              </div>
              {!IS_PUBLIC_LAUNCH_LEGAL_READY && (
                <p className="rounded-lg bg-[#FEF3C7]/70 px-2.5 py-1.5 text-[11px] text-[#78350F]">
                  Aviso informativo: los documentos legales incluyen los datos publicados del responsable y están sujetos a revisión jurídica profesional en México (sin certificación legal definitiva).
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                <button
                  type="button"
                  onClick={() => openLegalCenter('legal', 'aviso_privacidad')}
                  className="font-medium text-[#1B4332] hover:underline"
                >
                  Aviso de Privacidad {IS_PUBLIC_LAUNCH_LEGAL_READY ? '' : '(en revisión)'}
                </button>
                <button
                  type="button"
                  onClick={() => openLegalCenter('legal', 'terminos_condiciones')}
                  className="font-medium text-[#1B4332] hover:underline"
                >
                  Términos de Uso
                </button>
                <button
                  type="button"
                  onClick={() => openLegalCenter('legal', 'contacto_soporte')}
                  className="font-medium text-[#1B4332] hover:underline"
                >
                  Contacto y Soporte
                </button>
                <button
                  type="button"
                  onClick={() => openLegalCenter('legal', 'limitaciones_ia')}
                  className="font-medium text-[#1B4332] hover:underline"
                >
                  Limitaciones de IA
                </button>
                <button
                  type="button"
                  onClick={() => openLegalCenter('guides')}
                  className="font-medium text-[#1B4332] hover:underline"
                >
                  Guía de inicio y FAQ
                </button>
                <button
                  type="button"
                  onClick={() => openLegalCenter('crisis')}
                  className="font-medium text-[#991B1B] hover:underline"
                >
                  Emergencias (911 / 800 911 2000)
                </button>
              </div>
              <p className="border-t border-[#E3DDD0] pt-2 text-[11px] leading-relaxed text-[#4C5E54]">
                Soporte y ARCO: <span className="font-medium text-[#14241C]">{LEGAL_ENTITY_CONFIG.supportEmail}</span> ·{' '}
                {LEGAL_ENTITY_CONFIG.supportHours} ({LEGAL_ENTITY_CONFIG.supportTimezone}) · Respuesta inicial:{' '}
                {LEGAL_ENTITY_CONFIG.supportResponseSLA}.{' '}
                <span className="text-[#991B1B]">
                  Este correo no es un canal de emergencias y RENACER no ofrece supervisión humana en tiempo real.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <LegalDocsModal
        open={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
        initialDocId={legalDocId}
      />
    </div>
  );
};
