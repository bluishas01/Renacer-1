import React, { useEffect, useState } from 'react';
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  Database,
  Download,
  KeyRound,
  LogOut,
  Palette,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { auth, FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID, googleProvider } from '../firebase';
import {
  deleteAllUserFirestoreData,
  isOfflineCacheEnabled,
  setOfflineCachePreference,
} from '../services/firebaseVault';
import type { RecoveryFocus, UserVaultData } from '../types/renacer';
import { formatDateTime } from '../utils/recoveryMath';
import { LegalDocsModal, type LegalCenterTab } from './LegalDocsModal';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileSecurityViewProps {
  vault: UserVaultData;
  onUpdateVault: (updater: (prev: UserVaultData) => UserVaultData) => Promise<void>;
  onLogout: () => Promise<void>;
  onAccountDeleted: () => void;
  onOpenAssessment?: () => void;
  onDeletingAccountChange?: (deleting: boolean) => void;
}

const COUNTRY_PREF_KEY = 'renacer_country_pref';
const EMERGENCY_COUNTRIES = [
  'Todos',
  'México',
  'España',
  'Estados Unidos',
  'Argentina',
  'Colombia',
  'Chile',
  'Perú',
] as const;

const FOCUS_OPTIONS: RecoveryFocus[] = [
  'Alcohol',
  'Sustancias',
  'Apuestas y juego',
  'Tabaco o nicotina',
  'Conductas compulsivas',
  'Reconstrucción integral',
];

export const ProfileSecurityView: React.FC<ProfileSecurityViewProps> = ({
  vault,
  onUpdateVault,
  onLogout,
  onAccountDeleted,
  onOpenAssessment,
  onDeletingAccountChange,
}) => {
  const [alias, setAlias] = useState(vault.profile.alias);
  const [focus, setFocus] = useState<RecoveryFocus>(vault.profile.focus);
  const [dailySpend, setDailySpend] = useState(String(vault.profile.dailySpendEstimate));
  const [currency, setCurrency] = useState(vault.profile.currency || 'USD');
  const [motto, setMotto] = useState(vault.profile.personalMotto || 'Un día a la vez');
  const [profileSaved, setProfileSaved] = useState(false);
  const [emergencyCountry, setEmergencyCountry] = useState<string>(() => {
    try {
      return window.localStorage.getItem(COUNTRY_PREF_KEY) || 'Todos';
    } catch {
      return 'Todos';
    }
  });
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [offlineCacheOn, setOfflineCacheOn] = useState<boolean>(() => isOfflineCacheEnabled());
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [legalCenterOpen, setLegalCenterOpen] = useState(false);
  const [legalCenterTab, setLegalCenterTab] = useState<LegalCenterTab>('legal');

  useEffect(() => {
    setAlias(vault.profile.alias);
    setFocus(vault.profile.focus);
    setDailySpend(String(vault.profile.dailySpendEstimate));
    setCurrency(vault.profile.currency || 'USD');
    setMotto(vault.profile.personalMotto || 'Un día a la vez');
  }, [
    vault.profile.alias,
    vault.profile.focus,
    vault.profile.dailySpendEstimate,
    vault.profile.currency,
    vault.profile.personalMotto,
  ]);

  // Password management for email/password accounts
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  // Account deletion confirmation
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);
  const [deleteEmailCheck, setDeleteEmailCheck] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [needsReauthPassword, setNeedsReauthPassword] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasPasswordProvider = Boolean(
    auth.currentUser?.providerData.some((p) => p.providerId === 'password')
  );
  const hasGoogleProvider = Boolean(
    auth.currentUser?.providerData.some((p) => p.providerId === 'google.com')
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAlias = alias.trim().slice(0, 40);
    const validAlias = cleanAlias.length >= 2 ? cleanAlias : vault.profile.alias;
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          alias: validAlias,
          focus,
          dailySpendEstimate: Math.max(0, Math.min(1_000_000, Number(dailySpend) || 0)),
          currency: currency.trim().toUpperCase().slice(0, 6) || 'USD',
          personalMotto: motto.trim().slice(0, 80) || 'Un día a la vez',
        },
      }));
      setAlias(validAlias);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {
      setProfileSaved(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setPwError(null);
    setPwMsg(null);
    setChangingPw(true);
    try {
      await updatePassword(auth.currentUser, newPw);
      setNewPw('');
      setPwMsg('Contraseña actualizada en Firebase Authentication.');
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/requires-recent-login') {
        setPwError('Por seguridad, cierra sesión y vuelve a iniciar antes de cambiar la contraseña.');
      } else {
        setPwError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
      }
    } finally {
      setChangingPw(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!vault.profile.email) return;
    setPwError(null);
    setPwMsg(null);
    try {
      await sendPasswordResetEmail(auth, vault.profile.email);
      setPwMsg(`Enviamos un correo de restablecimiento a ${vault.profile.email}.`);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'No se pudo enviar el correo.');
    }
  };

  const handleCountryPrefChange = (country: string) => {
    setEmergencyCountry(country);
    try {
      window.localStorage.setItem(COUNTRY_PREF_KEY, country);
    } catch {
      // Ignore restricted Safari private storage
    }
  };

  const handleToggleOfflineCache = async (enabled: boolean) => {
    setOfflineCacheOn(enabled);
    await setOfflineCachePreference(enabled, vault.profile.id);
    setCacheNotice(
      enabled
        ? 'Caché local sin conexión activada para consultar tus últimos registros sin internet.'
        : 'Caché local desactivada y limpiada en este navegador (recomendado si compartes dispositivo).'
    );
    window.setTimeout(() => setCacheNotice(null), 4000);
  };

  const handleExportAllData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      application: 'RENACER — Un día a la vez',
      firebaseProjectId: FIREBASE_PROJECT_ID,
      privacyNote: 'Respaldo personal exportado por el titular de la cuenta.',
      data: vault,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renacer-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setExportNotice('Respaldo descargado en formato JSON con todos tus registros.');
    window.setTimeout(() => setExportNotice(null), 4000);
  };

  const handleDeleteAll = async () => {
    if (!auth.currentUser) return;
    if (deleteEmailCheck.trim().toLowerCase() !== vault.profile.email.toLowerCase()) return;
    setDeleteError(null);
    setDeleting(true);
    onDeletingAccountChange?.(true);

    try {
      // Re-authenticate proactively BEFORE wiping Firestore if session is older than 4 minutes
      const lastSignInStr = auth.currentUser.metadata?.lastSignInTime;
      const lastSignInMs = lastSignInStr ? Date.parse(lastSignInStr) : 0;
      const isRecent = lastSignInMs > 0 && Date.now() - lastSignInMs < 4 * 60 * 1000;

      if (!isRecent) {
        if (hasPasswordProvider && auth.currentUser.email) {
          if (!deletePassword) {
            setNeedsReauthPassword(true);
            setDeleteError('Por seguridad, ingresa tu contraseña actual para confirmar la eliminación.');
            setDeleting(false);
            onDeletingAccountChange?.(false);
            return;
          }
          const cred = EmailAuthProvider.credential(auth.currentUser.email, deletePassword);
          await reauthenticateWithCredential(auth.currentUser, cred);
        } else if (hasGoogleProvider) {
          await reauthenticateWithPopup(auth.currentUser, googleProvider);
        }
      }

      await deleteAllUserFirestoreData(auth.currentUser.uid);
      await deleteUser(auth.currentUser);
      onDeletingAccountChange?.(false);
      onAccountDeleted();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      onDeletingAccountChange?.(false);
      if (code === 'auth/requires-recent-login') {
        if (hasPasswordProvider) setNeedsReauthPassword(true);
        setDeleteError(
          'Firebase requiere confirmar tu identidad reciente antes de eliminar la cuenta. Vuelve a iniciar sesión e inténtalo enseguida.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setDeleteError('Cancelaste la verificación de Google. No se eliminó ningún dato.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('La contraseña ingresada no es correcta. No se eliminó ningún dato.');
      } else {
        setDeleteError(err instanceof Error ? err.message : 'Error al eliminar la cuenta.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Personal Profile */}
        <form
          onSubmit={handleSaveProfile}
          className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-6"
        >
          <h1 className="font-display text-2xl font-semibold text-[#14241C]">Perfil personal</h1>
          <p className="text-xs text-[#4C5E54]">
            Firebase Auth · {vault.profile.email}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Nombre o alias</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={40}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Enfoque principal</label>
              <select
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">
                Gasto diario estimado previo
              </label>
              <input
                type="number"
                min={0}
                max={1000000}
                value={dailySpend}
                onChange={(e) => setDailySpend(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Moneda</label>
              <input
                type="text"
                maxLength={6}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm uppercase"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Lema personal</label>
              <input
                type="text"
                maxLength={80}
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-country" className="mb-1 block text-xs font-medium text-[#4C5E54]">
                País para líneas de emergencia
              </label>
              <select
                id="profile-country"
                value={emergencyCountry}
                onChange={(e) => handleCountryPrefChange(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
              >
                {EMERGENCY_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'Todos' ? 'Todos los países' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326]"
            >
              Guardar perfil en Firestore
            </button>
            {profileSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4332]">
                <Check className="h-4 w-4" />
                Sincronizado con Cloud Firestore
              </span>
            )}
          </div>

          <div className="border-t border-[#E3DDD0] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#14241C]">Evaluación inicial de recuperación</p>
                <p className="text-xs text-[#4C5E54]">
                  {vault.initialAssessment
                    ? `Completada · Impacto ${vault.initialAssessment.severityScore}/10 · Disposición ${vault.initialAssessment.readinessScore}/10`
                    : 'Pendiente de completar'}
                </p>
              </div>
              {onOpenAssessment && (
                <button
                  type="button"
                  onClick={onOpenAssessment}
                  className="min-h-[40px] rounded-xl border border-[#1B4332] bg-[#FAF8F3] px-3.5 text-xs font-medium text-[#1B4332] hover:bg-[#EBF3EE]"
                >
                  {vault.initialAssessment ? 'Ver o actualizar' : 'Completar ahora'}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Security & Firebase Connection */}
        <div className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#1B4332]" />
            <h2 className="font-display text-xl font-semibold text-[#14241C]">
              Estado de Firebase y acceso
            </h2>
          </div>

          <div className="rounded-xl border border-[#1B4332]/20 bg-[#EBF3EE] p-4 text-xs text-[#1B4332] space-y-1">
            <p className="font-semibold">Cloud Firestore y Firebase Authentication activos</p>
            <p className="font-mono text-[11px]">Proyecto: {FIREBASE_PROJECT_ID}</p>
            <p className="font-mono text-[11px]">Base de datos: {FIRESTORE_DATABASE_ID}</p>
            <p>Aislamiento por usuario: solo tu UID ({vault.profile.id.slice(0, 10)}…) tiene acceso.</p>
          </div>

          {hasPasswordProvider ? (
            <form onSubmit={handleChangePassword} className="space-y-3 border-t border-[#E3DDD0] pt-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#14241C]">
                <KeyRound className="h-4 w-4 text-[#1B4332]" />
                <span>Cambiar contraseña</span>
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Nueva contraseña (mínimo 8 caracteres)"
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
              />
              {pwError && <p className="text-xs text-[#991B1B]">{pwError}</p>}
              {pwMsg && <p className="text-xs text-[#1B4332]">{pwMsg}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={changingPw}
                  className="min-h-[44px] rounded-xl border border-[#1B4332] bg-[#FAF8F3] px-4 py-2 text-xs font-medium text-[#1B4332] hover:bg-[#EBF3EE]"
                >
                  {changingPw ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-white px-4 py-2 text-xs font-medium text-[#4C5E54] hover:text-[#14241C]"
                >
                  Enviar enlace de recuperación
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-[#4C5E54]">
              Tu cuenta inicia sesión mediante <strong>Google</strong> con verificación de identidad
              automática.
            </p>
          )}

          <div className="border-t border-[#E3DDD0] pt-4">
            <h3 className="text-sm font-semibold text-[#14241C]">Aplicación móvil (PWA)</h3>
            <p className="mt-1 mb-3 text-xs text-[#4C5E54]">
              Instala RENACER en Android, iPhone o escritorio para abrirla en pantalla completa.
            </p>
            <PWAInstallButton variant="full" />
          </div>
        </div>
      </div>

      {/* Privacy, Informed Consent, Export & Delete */}
      <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6 space-y-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4332]" />
          <div>
            <h2 className="font-display text-xl font-semibold text-[#14241C]">
              Privacidad, consentimiento informado y control de datos
            </h2>
            <p className="mt-1 text-xs text-[#4C5E54]">
              Consentimiento versión {vault.profile.consentVersion} · Aceptado el{' '}
              {formatDateTime(vault.profile.consentAcceptedAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 text-xs leading-relaxed text-[#4C5E54] sm:grid-cols-3">
          <div className="rounded-xl bg-[#FAF8F3] p-4">
            <p className="font-semibold text-[#14241C]">Reglas estrictas en Firestore</p>
            <p className="mt-1">
              Tus colecciones privadas exigen sesión verificada (`email_verified == true`) y coincidencia
              exacta con tu UID en cada lectura, escritura, listado y borrado.
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF8F3] p-4">
            <p className="font-semibold text-[#14241C]">100% gratuita, sin anuncios ni venta de datos</p>
            <p className="mt-1">
              RENACER es una plataforma gratuita para acompañarte en tu proceso de reconstrucción
              personal. Sin suscripciones, sin cobros ocultos, sin publicidad ni venta de información.
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF8F3] p-4">
            <p className="font-semibold text-[#14241C]">Límite clínico claro</p>
            <p className="mt-1">
              Esta aplicación acompaña la recuperación diaria y no sustituye valoración médica,
              urgencias hospitalarias ni tratamiento psicoterapéutico.
            </p>
          </div>
        </div>

        {/* Local offline cache privacy toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#14241C]">
              Caché local sin conexión en este navegador (IndexedDB)
            </p>
            <p className="mt-0.5 text-xs text-[#4C5E54]">
              Permite abrir tus registros recientes si pierdes señal. Desactívala si usas un equipo compartido
              o público; al cerrar sesión se limpia automáticamente.
            </p>
            {cacheNotice && <p className="mt-1.5 text-xs font-medium text-[#1B4332]">{cacheNotice}</p>}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={offlineCacheOn}
            onClick={() => handleToggleOfflineCache(!offlineCacheOn)}
            className={`min-h-[42px] shrink-0 rounded-xl px-4 text-xs font-medium transition ${
              offlineCacheOn
                ? 'bg-[#1B4332] text-[#F7F4EC]'
                : 'border border-[#D5CEBF] bg-white text-[#14241C]'
            }`}
          >
            {offlineCacheOn ? 'Activa (desactivar)' : 'Desactivada (activar)'}
          </button>
        </div>

        {/* Legal, Privacy, Quickstart, Crisis & Brand Center */}
        <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-[#14241C]">
              Documentación legal, privacidad, guías y soporte
            </p>
            <p className="mt-0.5 text-xs text-[#4C5E54]">
              Consulta el Aviso de Privacidad (México), Términos de Uso, Limitaciones de IA, Derechos ARCO,
              Guía de inicio y directorio oficial de emergencias.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setLegalCenterTab('legal');
                setLegalCenterOpen(true);
              }}
              className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#D5CEBF] bg-white px-3 text-xs font-medium text-[#14241C] hover:bg-[#EBF3EE]"
            >
              <Scale className="h-3.5 w-3.5 text-[#1B4332]" />
              <span>Privacidad y Legal (10)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLegalCenterTab('guides');
                setLegalCenterOpen(true);
              }}
              className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#D5CEBF] bg-white px-3 text-xs font-medium text-[#14241C] hover:bg-[#EBF3EE]"
            >
              <BookOpenCheck className="h-3.5 w-3.5 text-[#1B4332]" />
              <span>Guía rápida y FAQ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLegalCenterTab('crisis');
                setLegalCenterOpen(true);
              }}
              className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] px-3 text-xs font-medium text-[#991B1B] hover:bg-[#FEE2E2]"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Líneas oficiales</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLegalCenterTab('brand');
                setLegalCenterOpen(true);
              }}
              className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#D5CEBF] bg-white px-3 text-xs font-medium text-[#14241C] hover:bg-[#EBF3EE]"
            >
              <Palette className="h-3.5 w-3.5 text-[#1B4332]" />
              <span>Identidad RENACER</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3DDD0] pt-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportAllData}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D5CEBF] bg-white px-4 py-2 text-sm font-medium text-[#14241C] hover:bg-[#FAF8F3]"
            >
              <Download className="h-4 w-4" />
              <span>Exportar todos mis datos (.json)</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D5CEBF] bg-white px-4 py-2 text-sm font-medium text-[#14241C] hover:bg-[#FAF8F3]"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setConfirmDeleteStep((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#991B1B]/30 bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#991B1B] hover:bg-[#FEE2E2]"
          >
            <Trash2 className="h-4 w-4" />
            <span>Eliminar cuenta y datos</span>
          </button>
        </div>

        {exportNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-3 text-xs font-medium text-[#1B4332]">
            <Check className="h-4 w-4 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {confirmDeleteStep && (
          <div className="rounded-xl border border-[#991B1B]/30 bg-[#FEF2F2] p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-[#991B1B]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Esta acción eliminará de forma permanente todos tus documentos en Cloud Firestore y tu
                cuenta de Firebase Authentication. Expórtalos primero si deseas respaldo.
              </span>
            </div>
            {deleteError && <p className="text-xs font-medium text-[#991B1B]">{deleteError}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="email"
                value={deleteEmailCheck}
                onChange={(e) => setDeleteEmailCheck(e.target.value)}
                placeholder={`Escribe ${vault.profile.email} para confirmar`}
                className="min-h-[44px] flex-1 rounded-xl border border-[#991B1B]/30 bg-white px-3.5 text-sm"
              />
              {hasPasswordProvider && needsReauthPassword && (
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Contraseña actual para confirmar"
                  className="min-h-[44px] flex-1 rounded-xl border border-[#991B1B]/30 bg-white px-3.5 text-sm"
                />
              )}
              <button
                type="button"
                disabled={
                  deleting ||
                  deleteEmailCheck.trim().toLowerCase() !== vault.profile.email.toLowerCase()
                }
                onClick={handleDeleteAll}
                className="min-h-[44px] rounded-xl bg-[#991B1B] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Confirmar eliminación permanente'}
              </button>
            </div>
          </div>
        )}
      </section>

      <LegalDocsModal
        open={legalCenterOpen}
        onClose={() => setLegalCenterOpen(false)}
        initialTab={legalCenterTab}
      />
    </div>
  );
};
