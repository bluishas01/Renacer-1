import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Lock,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  buildConsentAcceptanceEvidence,
  CLOUD_PROCESSORS_DISCLOSURE,
  CONSENT_REVOCATION_PROCEDURES_2025,
  INTEGRAL_PRIVACY_NOTICE_2025,
  PROPOSAL_LEGAL_VERSIONS,
  SEPARATE_CONSENT_CHECKBOXES_2025,
  SIMPLIFIED_PRIVACY_NOTICE_2025,
  type ConsentAcceptanceEvidence,
} from './lfpdppp2025LegalTexts';

interface GranularConsentProposalPanelProps {
  previewUid?: string;
  previewEmail?: string;
  previewEmailVerified?: boolean;
}

/**
 * COMPONENTE DE PROPUESTA SEPARADA — NO CONECTADO A LA VERSIÓN PUBLICADA 1.0.0.
 * Demuestra el flujo propuesto para cumplimiento de LFPDPPP (20 marzo 2025 y reforma 14 nov 2025):
 * - Aviso Simplificado previo + acceso al Integral y detalle de encargados.
 * - Tres casillas separadas inicialmente desmarcadas (`false`), sin consentimiento implícito.
 * - Generación de evidencia auditable y vista de revocación granular con consecuencias.
 */
export const GranularConsentProposalPanel: React.FC<GranularConsentProposalPanelProps> = ({
  previewUid = 'uid_ejemplo_autenticado_google',
  previewEmail = 'persona.usuaria@ejemplo.mx',
  previewEmailVerified = true,
}) => {
  const [privacyNoticeAck, setPrivacyNoticeAck] = useState(false);
  const [sensitiveHealthConsent, setSensitiveHealthConsent] = useState(false);
  const [financialDataConsent, setFinancialDataConsent] = useState(false);
  const [showIntegralNotice, setShowIntegralNotice] = useState(false);
  const [showProcessors, setShowProcessors] = useState(false);
  const [showRevocationPanel, setShowRevocationPanel] = useState(false);
  const [generatedEvidence, setGeneratedEvidence] = useState<ConsentAcceptanceEvidence | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const checkboxStateMap: Record<
    'privacyNoticeAck' | 'sensitiveHealthConsent' | 'financialDataConsent',
    { checked: boolean; setChecked: (val: boolean) => void }
  > = {
    privacyNoticeAck: { checked: privacyNoticeAck, setChecked: setPrivacyNoticeAck },
    sensitiveHealthConsent: { checked: sensitiveHealthConsent, setChecked: setSensitiveHealthConsent },
    financialDataConsent: { checked: financialDataConsent, setChecked: setFinancialDataConsent },
  };

  const handleSimulateEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!privacyNoticeAck) {
      setValidationError(
        'Debes confirmar la lectura del Aviso de Privacidad Simplificado y acceso al Aviso Integral.'
      );
      return;
    }
    if (!sensitiveHealthConsent) {
      setValidationError(
        'Para crear la bóveda de recuperación es necesario tu consentimiento expreso para datos sensibles de salud y bienestar.'
      );
      return;
    }

    const evidence = buildConsentAcceptanceEvidence({
      uid: previewUid,
      email: previewEmail,
      emailVerified: previewEmailVerified,
      privacyNoticeAck,
      sensitiveHealthConsent,
      financialDataConsent,
    });
    setGeneratedEvidence(evidence);
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-[#D5CEBF] bg-[#FAF8F3] p-6 text-[#14241C]">
      <div className="rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
        <div className="flex items-start gap-2 font-semibold">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            PROPUESTA DE CAMBIOS SEPARADA PARA REVISIÓN JURÍDICA (NO INTEGRADA EN 1.0.0 NI EN AIS-PRE)
          </span>
        </div>
        <p className="mt-1.5 leading-relaxed text-[#7F1D1D]">
          Referencia: {PROPOSAL_LEGAL_VERSIONS.legalFrameworkReference}. Autoridad competente:{' '}
          {PROPOSAL_LEGAL_VERSIONS.supervisoryAuthority}. Una casilla digital por sí sola{' '}
          <strong>no</strong> garantiza cumplimiento legal definitivo; todo el mecanismo queda sujeto a
          validación de un especialista mexicano en protección de datos personales.
        </p>
      </div>

      {/* 1. Aviso de Privacidad Simplificado previo a la recopilación */}
      <div className="space-y-3 rounded-2xl border border-[#E3DDD0] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-[#14241C]">
            {SIMPLIFIED_PRIVACY_NOTICE_2025.title}
          </h2>
          <span className="rounded-lg bg-[#EBF3EE] px-2.5 py-1 font-mono text-[11px] text-[#1B4332]">
            {SIMPLIFIED_PRIVACY_NOTICE_2025.version}
          </span>
        </div>
        <p className="text-[11px] text-[#4C5E54]">{SIMPLIFIED_PRIVACY_NOTICE_2025.legalBasis}</p>
        <div className="space-y-2 text-xs leading-relaxed text-[#2D4A3B]">
          {SIMPLIFIED_PRIVACY_NOTICE_2025.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowIntegralNotice((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#1B4332] bg-[#FAF8F3] px-3.5 text-xs font-medium text-[#1B4332]"
          >
            <FileText className="h-4 w-4" />
            <span>
              {showIntegralNotice ? 'Ocultar Aviso Integral' : 'Leer Aviso de Privacidad Integral'}
            </span>
            {showIntegralNotice ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowProcessors((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#D5CEBF] bg-white px-3.5 text-xs font-medium text-[#14241C]"
          >
            <Lock className="h-4 w-4 text-[#1B4332]" />
            <span>
              {showProcessors
                ? 'Ocultar encargados y ubicación'
                : 'Ver Firebase, Gemini, ubicación y uso'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowRevocationPanel((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#D5CEBF] bg-white px-3.5 text-xs font-medium text-[#14241C]"
          >
            <ShieldAlert className="h-4 w-4 text-[#991B1B]" />
            <span>Procedimiento de revocación y consecuencias</span>
          </button>
        </div>

        {showIntegralNotice && (
          <div className="mt-4 space-y-4 rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#14241C]">
                {INTEGRAL_PRIVACY_NOTICE_2025.title}
              </h3>
              <p className="text-[11px] text-[#4C5E54]">
                Versión {INTEGRAL_PRIVACY_NOTICE_2025.version} · {INTEGRAL_PRIVACY_NOTICE_2025.legalBasis}
              </p>
            </div>
            {INTEGRAL_PRIVACY_NOTICE_2025.sections.map((sec) => (
              <div key={sec.heading} className="space-y-1">
                <h4 className="text-xs font-semibold text-[#14241C]">{sec.heading}</h4>
                {sec.body.map((line, idx) => (
                  <p key={idx} className="text-xs leading-relaxed text-[#4C5E54]">
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        {showProcessors && (
          <div className="mt-4 space-y-2.5 rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#1B4332]">
              Encargados tecnológicos, ubicación y política de no entrenamiento / cero publicidad
            </h3>
            {CLOUD_PROCESSORS_DISCLOSURE.map((item) => (
              <div key={item.service} className="rounded-lg border border-[#E3DDD0] bg-white p-3 text-xs">
                <p className="font-semibold text-[#14241C]">
                  {item.provider} — {item.service}
                </p>
                <p className="mt-1 text-[#4C5E54]">
                  <strong>Rol:</strong> {item.role} · <strong>Ubicación:</strong> {item.location}
                </p>
                <p className="mt-1 text-[#4C5E54]">
                  <strong>Tratamiento:</strong> {item.dataProcessed}
                </p>
                <p className="mt-1 text-[#1B4332]">
                  <strong>Política:</strong> {item.trainingAndAdsPolicy}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Tres casillas separadas, inicialmente desmarcadas */}
      <form onSubmit={handleSimulateEvidence} className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-5">
        <div>
          <h3 className="font-display text-base font-semibold text-[#14241C]">
            Consentimientos expresos separados (inicialmente desmarcados, sin consentimiento tácito)
          </h3>
          <p className="mt-1 text-xs text-[#4C5E54]">
            Cada autorización es explícita e independiente. Puedes decidir libremente si habilitas o no el
            módulo financiero.
          </p>
        </div>

        {validationError && (
          <div className="rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
            {validationError}
          </div>
        )}

        <div className="space-y-3">
          {SEPARATE_CONSENT_CHECKBOXES_2025.map((item) => {
            const state = checkboxStateMap[item.id];
            return (
              <div
                key={item.id}
                className="rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] p-3.5 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-[#1B4332]">{item.title}</span>
                  <span className="rounded bg-white px-2 py-0.5 font-mono text-[#4C5E54]">
                    {item.legalBasis}
                  </span>
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#14241C]">
                  <input
                    type="checkbox"
                    checked={state.checked}
                    onChange={(e) => state.setChecked(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#B7B0A0] accent-[#1B4332]"
                  />
                  <span>{item.label}</span>
                </label>
                <p className="pl-8 text-[11px] text-[#4C5E54]">{item.scopeDescription}</p>
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          className="min-h-[44px] rounded-xl bg-[#1B4332] px-5 text-xs font-medium text-[#F7F4EC] hover:bg-[#143326]"
        >
          Validar selección y generar evidencia propuesta (sin escribir en Firestore)
        </button>

        {generatedEvidence && (
          <div className="rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Evidencia estructurada de consentimiento (propuesta para registro en Firestore)</span>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-white p-3 font-mono text-[11px] text-[#14241C]">
              {JSON.stringify(generatedEvidence, null, 2)}
            </pre>
          </div>
        )}
      </form>

      {/* 3. Procedimiento de revocación y consecuencias + exportación/eliminación */}
      {showRevocationPanel && (
        <div className="space-y-3 rounded-2xl border border-[#E3DDD0] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-[#14241C]">
              Revocación del consentimiento y consecuencias operativas
            </h3>
            <div className="flex gap-2 text-xs text-[#1B4332]">
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#EBF3EE] px-2.5 py-1">
                <Download className="h-3.5 w-3.5" /> Exportación JSON mantenida
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#FEF2F2] px-2.5 py-1 text-[#991B1B]">
                <Trash2 className="h-3.5 w-3.5" /> Eliminación de cuenta mantenida
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {CONSENT_REVOCATION_PROCEDURES_2025.map((opt) => (
              <div key={opt.scope} className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3.5 text-xs">
                <h4 className="font-semibold text-[#14241C]">{opt.title}</h4>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#2D4A3B]">
                  <strong>Mecanismo:</strong> {opt.mechanism}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-[#4C5E54]">
                  {opt.consequences.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
