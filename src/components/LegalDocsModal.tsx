import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  ExternalLink,
  HelpCircle,
  Palette,
  Phone,
  Scale,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  BRAND_IDENTITY,
  FAQ_ITEMS,
  LEGAL_DOCUMENTS,
  QUICKSTART_STEPS,
  VERIFIED_CRISIS_DIRECTORY,
  VERIFIED_EMERGENCY_REVIEW_DATE,
  type LegalDocumentItem,
} from '../data/legalAndDocs';

export type LegalCenterTab = 'legal' | 'guides' | 'crisis' | 'brand';

interface LegalDocsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: LegalCenterTab;
  initialDocId?: LegalDocumentItem['id'];
}

export const LegalDocsModal: React.FC<LegalDocsModalProps> = ({
  open,
  onClose,
  initialTab = 'legal',
  initialDocId = 'aviso_privacidad',
}) => {
  const [activeTab, setActiveTab] = useState<LegalCenterTab>(initialTab);
  const [selectedDocId, setSelectedDocId] = useState<LegalDocumentItem['id']>(initialDocId);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      if (initialDocId) setSelectedDocId(initialDocId);
    }
  }, [open, initialTab, initialDocId]);

  if (!open) return null;

  const selectedDoc =
    LEGAL_DOCUMENTS.find((d) => d.id === selectedDocId) ?? LEGAL_DOCUMENTS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-center-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-[#E3DDD0] bg-[#FAF8F3] shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E3DDD0] bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-medium text-[#1B4332]">
              RENACER 1.0 · Transparencia, privacidad y ayuda verificada
            </p>
            <h2 id="legal-center-title" className="font-display text-xl font-semibold text-[#14241C] sm:text-2xl">
              Centro Legal, Privacidad y Guías
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar centro legal y guías"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] text-[#4C5E54] hover:text-[#14241C]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-[#E3DDD0] bg-[#FAF8F3] px-5 py-3 sm:px-7">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveTab('legal')}
              className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition ${
                activeTab === 'legal'
                  ? 'bg-[#1B4332] text-[#F7F4EC]'
                  : 'border border-[#E3DDD0] bg-white text-[#14241C]'
              }`}
            >
              <Scale className="h-4 w-4 shrink-0" />
              <span>Privacidad y Legal (10)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guides')}
              className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition ${
                activeTab === 'guides'
                  ? 'bg-[#1B4332] text-[#F7F4EC]'
                  : 'border border-[#E3DDD0] bg-white text-[#14241C]'
              }`}
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span>Guía y FAQ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('crisis')}
              className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition ${
                activeTab === 'crisis'
                  ? 'bg-[#991B1B] text-white'
                  : 'border border-[#991B1B]/25 bg-[#FEF2F2] text-[#991B1B]'
              }`}
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Líneas Oficiales</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('brand')}
              className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition ${
                activeTab === 'brand'
                  ? 'bg-[#1B4332] text-[#F7F4EC]'
                  : 'border border-[#E3DDD0] bg-white text-[#14241C]'
              }`}
            >
              <Palette className="h-4 w-4 shrink-0" />
              <span>Identidad RENACER</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {activeTab === 'legal' && (
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="space-y-1.5 lg:col-span-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4C5E54]">
                  Documentos integrados
                </p>
                {LEGAL_DOCUMENTS.map((docItem) => {
                  const active = docItem.id === selectedDoc.id;
                  return (
                    <button
                      key={docItem.id}
                      type="button"
                      onClick={() => setSelectedDocId(docItem.id)}
                      className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                        active
                          ? 'border-[#1B4332] bg-[#1B4332] text-[#F7F4EC]'
                          : 'border-[#E3DDD0] bg-white text-[#14241C] hover:bg-[#FAF8F3]'
                      }`}
                    >
                      <span className="truncate">{docItem.title}</span>
                      {docItem.requiresLegalReview && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}
                        >
                          Revisión legal
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <article className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-5 sm:p-6 lg:col-span-8">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#14241C] sm:text-xl">
                    {selectedDoc.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#4C5E54]">
                    Estado: {selectedDoc.lastUpdated}
                  </p>
                  <p className="mt-2 rounded-xl bg-[#FAF8F3] p-3 text-xs leading-relaxed text-[#2D4A3B]">
                    {selectedDoc.summary}
                  </p>
                </div>

                {selectedDoc.requiresLegalReview && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#D97706]/30 bg-[#FEF3C7]/60 p-3 text-xs text-[#78350F]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#92400E]" />
                    <span>
                      Este documento contiene campos marcados como{' '}
                      <strong>[PENDIENTE DE DEFINICIÓN LEGAL]</strong> (razón social, domicilio en México,
                      correo ARCO/soporte y plazos jurídicos) que deben completarse y validarse antes del
                      lanzamiento público.
                    </span>
                  </div>
                )}

                <div className="space-y-4 border-t border-[#E3DDD0] pt-4">
                  {selectedDoc.sections.map((sec) => (
                    <section key={sec.heading} className="space-y-1.5">
                      <h4 className="text-sm font-semibold text-[#14241C]">{sec.heading}</h4>
                      {sec.body.map((paragraph, idx) => (
                        <p key={idx} className="text-xs leading-relaxed text-[#4C5E54] sm:text-[13px]">
                          {paragraph}
                        </p>
                      ))}
                    </section>
                  ))}
                </div>
              </article>
            </div>
          )}

          {activeTab === 'guides' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#E3DDD0] bg-white p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="h-5 w-5 text-[#1B4332]" />
                  <h3 className="font-display text-lg font-semibold text-[#14241C]">
                    Guía de inicio rápido
                  </h3>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {QUICKSTART_STEPS.map((item) => (
                    <div key={item.step} className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-4">
                      <span className="font-mono text-xs font-semibold text-[#1B4332]">
                        PASO {item.step}
                      </span>
                      <h4 className="mt-1 text-sm font-semibold text-[#14241C]">{item.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#4C5E54]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#E3DDD0] bg-white p-5 sm:p-6">
                <h3 className="font-display text-lg font-semibold text-[#14241C]">
                  Preguntas frecuentes (FAQ)
                </h3>
                <div className="mt-4 divide-y divide-[#E3DDD0]">
                  {FAQ_ITEMS.map((item) => (
                    <div key={item.q} className="py-3.5 first:pt-0 last:pb-0">
                      <h4 className="text-sm font-semibold text-[#14241C]">{item.q}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#4C5E54] sm:text-[13px]">
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'crisis' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#991B1B]/25 bg-[#FEF2F2] p-4 text-xs leading-relaxed text-[#991B1B] sm:text-sm">
                <strong>Límite clínico y emergencias:</strong> RENACER no brinda atención médica ni
                supervisión humana continua 24/7. Ante sobredosis, intoxicación severa, síndrome de
                abstinencia físico (convulsiones, alucinaciones, fiebre alta) o riesgo suicida, llama de
                inmediato a los servicios oficiales o acude a urgencias.
              </div>

              <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#E3DDD0] pb-3">
                  <h3 className="font-display text-lg font-semibold text-[#14241C]">
                    Directorio oficial de emergencias y crisis
                  </h3>
                  <span className="text-xs text-[#4C5E54]">
                    Última verificación documental: {VERIFIED_EMERGENCY_REVIEW_DATE}
                  </span>
                </div>

                <div className="divide-y divide-[#E3DDD0]">
                  {VERIFIED_CRISIS_DIRECTORY.map((line) => (
                    <div
                      key={`${line.region}-${line.institution}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#14241C]">
                          {line.region} · {line.institution}
                        </p>
                        <p className="mt-0.5 text-xs text-[#4C5E54]">{line.detail}</p>
                        <a
                          href={line.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#1B4332] hover:underline"
                        >
                          <span>Fuente oficial</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {line.dialNumbers.map((dial) => (
                          <a
                            key={`${line.institution}-${dial.label}`}
                            href={`tel:${dial.tel}`}
                            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#991B1B] hover:bg-[#FEE2E2]"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{dial.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'brand' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1B4332]">
                  Identidad y posicionamiento
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-[#14241C]">
                  {BRAND_IDENTITY.sloganPrimary}
                </h3>
                <p className="mt-1 text-sm font-medium text-[#2D4A3B]">
                  {BRAND_IDENTITY.sloganSecondary}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#4C5E54]">
                  {BRAND_IDENTITY.longDescription}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
                  <h4 className="font-display text-base font-semibold text-[#14241C]">
                    Paleta cromática oficial
                  </h4>
                  <div className="mt-3 space-y-2.5">
                    {BRAND_IDENTITY.palette.map((c) => (
                      <div key={c.hex} className="flex items-center gap-3">
                        <span
                          className="h-9 w-9 shrink-0 rounded-lg border border-[#D5CEBF]"
                          style={{ backgroundColor: c.hex }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#14241C]">
                            {c.name} <span className="font-mono text-[#4C5E54]">{c.hex}</span>
                          </p>
                          <p className="text-[11px] text-[#4C5E54]">{c.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E3DDD0] bg-white p-5">
                  <h4 className="font-display text-base font-semibold text-[#14241C]">
                    Sistema tipográfico
                  </h4>
                  <div className="mt-3 space-y-3">
                    {BRAND_IDENTITY.typography.map((t) => (
                      <div key={t.family} className="rounded-xl bg-[#FAF8F3] p-3">
                        <p className="text-xs font-semibold text-[#14241C]">{t.family}</p>
                        <p className="mt-0.5 text-xs text-[#4C5E54]">{t.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
