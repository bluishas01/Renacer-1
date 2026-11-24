import { LEGAL_ENTITY_CONFIG } from '../../data/legalAndDocs';

/**
 * PROPUESTA SEPARADA DE CAMBIOS — NO INTEGRADA EN PRODUCCIÓN 1.0.0
 * Referencia normativa: Ley Federal de Protección de Datos Personales en Posesión de los Particulares
 * (publicada en el DOF el 20 de marzo de 2025, en vigor el 21 de marzo de 2025) y reforma al artículo 4
 * publicada en el DOF el 14 de noviembre de 2025 (supletoriedad del Código Nacional de Procedimientos
 * Civiles y Familiares y de la Ley Federal de Procedimiento Administrativo).
 *
 * ADVERTENCIA: Este módulo constituye una propuesta técnica y documental sujeta a validación formal
 * de un especialista mexicano en protección de datos antes de integrarse en una versión futura.
 * Ninguna casilla o flujo digital por sí solo garantiza cumplimiento legal.
 */

export const PROPOSAL_LEGAL_VERSIONS = {
  simplifiedNoticeVersion: '2026-11-lfpdppp2025-simp-v1',
  integralNoticeVersion: '2026-11-lfpdppp2025-int-v1',
  sensitiveHealthConsentVersion: '2026-11-lfpdppp2025-sens-v1',
  financialConsentVersion: '2026-11-lfpdppp2025-fin-v1',
  revocationPolicyVersion: '2026-11-lfpdppp2025-rev-v1',
  legalFrameworkReference:
    'LFPDPPP (DOF 20 de marzo de 2025) y reforma al Art. 4 (DOF 14 de noviembre de 2025)',
  supervisoryAuthority: 'Secretaría Anticorrupción y Buen Gobierno (México)',
} as const;

export interface CloudProcessorDisclosure {
  provider: string;
  service: string;
  role: string;
  location: string;
  dataProcessed: string;
  trainingAndAdsPolicy: string;
}

export const CLOUD_PROCESSORS_DISCLOSURE: CloudProcessorDisclosure[] = [
  {
    provider: 'Google LLC (Google Firebase)',
    service: 'Firebase Authentication',
    role: 'Encargado / proveedor de autenticación de identidad',
    location: 'Infraestructura global en la nube de Google (principalmente EE. UU.)',
    dataProcessed:
      'Correo electrónico verificado de Google, identificador único (UID) y tokens técnicos de sesión.',
    trainingAndAdsPolicy:
      'No se utiliza para publicidad, perfilado comercial ni entrenamiento de modelos generativos.',
  },
  {
    provider: 'Google LLC (Google Cloud / Firebase)',
    service: 'Cloud Firestore (proyecto gen-lang-client-0791565383)',
    role: 'Encargado / proveedor de almacenamiento de base de datos aislada por UID',
    location:
      'Infraestructura en la nube de Google Cloud fuera de México (región configurada en proyecto Firebase / us-east1 para entorno de aplicación)',
    dataProcessed:
      'Perfil, consentimientos, diario emocional, registros de recuperación, hábitos, metas, red de apoyo y, solo si otorgas consentimiento financiero expreso, registros financieros/patrimoniales.',
    trainingAndAdsPolicy:
      'Tus datos privados permanecen aislados por UID mediante reglas de seguridad; no se venden ni se usan para publicidad o entrenamiento de modelos.',
  },
  {
    provider: 'Google LLC (Google Cloud Run + Gemini API)',
    service: 'Servidor propio de RENACER + API de Google Gemini',
    role: 'Procesamiento automatizado bajo petición exclusiva del usuario',
    location: 'Servidor en Cloud Run (us-east1, EE. UU.) y endpoints de Google Gemini API',
    dataProcessed:
      'Únicamente cuando envías un mensaje en RENACER IA: texto de tu mensaje y contexto mínimo (alias, enfoque, días en etapa, pulso emocional reciente, metas y motivos de cambio). Nunca se envía tu correo electrónico, teléfono ni contactos familiares.',
    trainingAndAdsPolicy:
      'RENACER prohíbe usar tus datos para publicidad y no entrena modelos propios. Sujeto a validación jurídica de los términos comerciales vigentes de Gemini API respecto a retención cero / no entrenamiento.',
  },
  {
    provider: 'Dispositivo local del usuario (Navegador)',
    service: 'IndexedDB / localStorage (opcional y desactivable)',
    role: 'Caché local sin conexión controlada por el usuario',
    location: 'Exclusivamente dentro del dispositivo del usuario',
    dataProcessed:
      'Copia local temporal de tus registros para consulta sin conexión; puede desactivarse y limpiarse en "Perfil y seguridad".',
    trainingAndAdsPolicy:
      'Sin rastreadores publicitarios, sin cookies de terceros comerciales y sin analítica de venta.',
  },
];

export const SIMPLIFIED_PRIVACY_NOTICE_2025 = {
  version: PROPOSAL_LEGAL_VERSIONS.simplifiedNoticeVersion,
  title: 'Aviso de Privacidad Simplificado (Previo a la recopilación de datos)',
  legalBasis: 'Artículos 16 y 17 de la LFPDPPP (DOF 20 de marzo de 2025)',
  controllerIdentity: LEGAL_ENTITY_CONFIG.controllerName ?? 'José Andrés Martínez Colorado',
  controllerAddress:
    LEGAL_ENTITY_CONFIG.controllerAddressMexico ??
    'Sóstenes Rocha 45, Zona Centro, Acámbaro, Guanajuato, México',
  contactEmail: LEGAL_ENTITY_CONFIG.privacyAndArcoEmail ?? 'lift884@gmail.com',
  paragraphs: [
    `Responsable del tratamiento: ${LEGAL_ENTITY_CONFIG.controllerName ?? 'José Andrés Martínez Colorado'}, con domicilio en ${LEGAL_ENTITY_CONFIG.controllerAddressMexico ?? 'Sóstenes Rocha 45, Zona Centro, Acámbaro, Guanajuato, México'}.`,
    'RENACER es una plataforma 100% gratuita para acompañarte en tu proceso de reconstrucción personal, sin publicidad, sin suscripciones y sin venta de datos.',
    'Finalidades primarias necesarias: (1) autenticar tu acceso con Google y aislar tu espacio personal por UID; (2) operar herramientas de bienestar, diario emocional, hábitos, recuperación y prevención de recaídas (datos personales sensibles que requieren tu consentimiento expreso y separado); (3) de manera opcional e independiente, llevar control de ingresos, gastos, ahorros y deudas (datos financieros/patrimoniales que requieren un segundo consentimiento expreso separado); y (4) atender tus consultas voluntarias en RENACER IA sin supervisión humana en tiempo real.',
    'Finalidades secundarias: RENACER NO realiza finalidades secundarias publicitarias, mercadotécnicas ni de prospección comercial, ni utiliza tus datos personales para entrenar modelos de inteligencia artificial.',
    'Consulta el Aviso de Privacidad Integral antes de continuar para conocer el detalle de datos recabados, encargados en la nube (Firebase y Google Gemini), ubicación internacional del almacenamiento, mecanismos para limitar el uso, derechos ARCO y procedimiento de revocación del consentimiento.',
  ],
} as const;

export const INTEGRAL_PRIVACY_NOTICE_2025 = {
  version: PROPOSAL_LEGAL_VERSIONS.integralNoticeVersion,
  title: 'Aviso de Privacidad Integral (Propuesta sujeta a validación jurídica — México)',
  legalBasis:
    'LFPDPPP publicada en el DOF el 20 de marzo de 2025 (Arts. 7, 8, 15, 16, 17 y 35) y reforma al Art. 4 publicada en el DOF el 14 de noviembre de 2025',
  sections: [
    {
      heading: '1. Identidad, domicilio y canal de contacto del responsable',
      body: [
        `Responsable: ${LEGAL_ENTITY_CONFIG.controllerName ?? 'José Andrés Martínez Colorado'} (persona física).`,
        `Domicilio en México para oír y recibir notificaciones: ${LEGAL_ENTITY_CONFIG.controllerAddressMexico ?? 'Sóstenes Rocha 45, Zona Centro, Acámbaro, Guanajuato, México'}.`,
        `Correo oficial para privacidad, derechos ARCO, revocación de consentimiento y soporte técnico: ${LEGAL_ENTITY_CONFIG.privacyAndArcoEmail ?? 'lift884@gmail.com'}.`,
        `Horario de atención: ${LEGAL_ENTITY_CONFIG.supportHours ?? 'lunes a viernes, de 09:00 a 17:00 horas'} (${LEGAL_ENTITY_CONFIG.supportTimezone ?? 'America/Mexico_City'}) · Respuesta inicial: ${LEGAL_ENTITY_CONFIG.supportResponseSLA ?? 'máximo 3 días hábiles para una respuesta inicial'}.`,
        'El correo electrónico NO es un canal de emergencias y RENACER NO ofrece supervisión humana en tiempo real ni atención médica o de urgencias.',
      ],
    },
    {
      heading: '2. Categorías de datos personales recabados',
      body: [
        'a) Datos de identificación y acceso: correo electrónico verificado mediante Google, UID de Firebase Authentication y alias libre.',
        'b) Datos personales sensibles (salud, recuperación y bienestar — Art. 8 LFPDPPP): enfoque de recuperación, fecha de inicio, evaluación inicial, estado emocional diario (ánimo, energía, estrés), diario personal, registros de impulsos/deseos/consumo/apuestas/recaídas, estrategias de afrontamiento, contactos de confianza e historial de conversación con RENACER IA. Requieren consentimiento expreso y por escrito / mecanismo de autenticación equivalente.',
        'c) Datos financieros y patrimoniales (Art. 7 LFPDPPP): estimación de gasto diario, ingresos, gastos, ahorro, deudas y abonos registrados voluntariamente en el módulo de Finanzas. Requieren consentimiento expreso separado e independiente; si no lo otorgas, puedes utilizar el resto de RENACER sin habilitar el módulo financiero.',
        'd) Datos que NO recabamos: datos biométricos, expedientes médicos hospitalarios oficiales, credenciales bancarias conectadas automáticamente ni cookies o rastreadores publicitarios.',
      ],
    },
    {
      heading: '3. Finalidades del tratamiento y prohibición de publicidad o entrenamiento de IA',
      body: [
        'Finalidades primarias: (i) autenticar tu cuenta Google y aislar tus registros en Cloud Firestore bajo tu UID; (ii) proporcionar seguimiento de recuperación, bienestar y, si lo autorizas por separado, registro financiero personal; (iii) generar respuestas automatizadas en RENACER IA enviando contexto mínimo no identificable; y (iv) moderar la comunidad anónima por alias evitando fuga de datos de contacto.',
        'Prohibición expresa de uso comercial y entrenamiento: tus datos personales sensibles, financieros, diarios y conversaciones NO se venden, NO se alquilan, NO se utilizan para publicidad ni perfilado comercial y NO deben usarse para entrenar modelos propios ni de terceros.',
        'Gratuidad: RENACER es 100% gratuita; el tratamiento de datos no está condicionado a pagos ni suscripciones.',
      ],
    },
    {
      heading: '4. Proveedores encargados, ubicación en la nube y transferencias',
      body: [
        'Para operar técnicamente la plataforma se utilizan encargados de infraestructura tecnológica ubicados fuera de México (EE. UU.): Google Firebase (Authentication y Cloud Firestore en el proyecto gen-lang-client-0791565383) y servidor en Google Cloud Run conectado a Google Gemini API.',
        'La comunicación con Google Gemini API ocurre únicamente cuando solicitas respuesta en RENACER IA, omitiendo correo electrónico, teléfonos de contactos de apoyo y registros financieros detallados.',
        'Nota para validación jurídica (Art. 35 LFPDPPP 2025): confirmar con asesoría legal en México la redacción definitiva sobre remisiones a encargados tecnológicos vs. transferencias internacionales y verificar las condiciones empresariales de no retención/no entrenamiento aplicables a la clave de Gemini API en producción.',
      ],
    },
    {
      heading: '5. Mecanismos para limitar el uso o divulgación, exportación y eliminación',
      body: [
        'En cualquier momento puedes: (a) usar la aplicación sin otorgar o revocando el consentimiento financiero; (b) desactivar la caché local sin conexión (IndexedDB) en dispositivos compartidos; (c) ocultar en pantalla los teléfonos de tus contactos de apoyo; (d) exportar toda tu información en formato JSON portable desde Perfil y seguridad; y (e) eliminar definitivamente tu cuenta y registros desde Perfil y seguridad.',
      ],
    },
    {
      heading: '6. Derechos ARCO, revocación del consentimiento y autoridad competente',
      body: [
        'Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO), así como revocar tu consentimiento sin efectos retroactivos, mediante las herramientas directas dentro de RENACER o escribiendo a lift884@gmail.com.',
        'De conformidad con la LFPDPPP vigente (DOF 20 de marzo de 2025) y su reforma al artículo 4 (DOF 14 de noviembre de 2025, con supletoriedad del Código Nacional de Procedimientos Civiles y Familiares y la Ley Federal de Procedimiento Administrativo), la autoridad competente en México es la Secretaría Anticorrupción y Buen Gobierno.',
      ],
    },
    {
      heading: '7. Cambios al Aviso de Privacidad y advertencia de validación jurídica',
      body: [
        'Cualquier actualización relevante al Aviso de Privacidad se notificará dentro de la aplicación solicitando nueva lectura o aceptación cuando cambien las finalidades o categorías de datos.',
        'Advertencia: este texto es una propuesta técnica/jurídica para revisión de un especialista en protección de datos en México y no sustituye su dictamen profesional ni certifica cumplimiento automático.',
      ],
    },
  ],
} as const;

export interface SeparateConsentItem {
  id: 'privacyNoticeAck' | 'sensitiveHealthConsent' | 'financialDataConsent';
  requiredToCreateAccount: boolean;
  legalBasis: string;
  title: string;
  label: string;
  scopeDescription: string;
  initialChecked: false;
}

export const SEPARATE_CONSENT_CHECKBOXES_2025: SeparateConsentItem[] = [
  {
    id: 'privacyNoticeAck',
    requiredToCreateAccount: true,
    legalBasis: 'Arts. 15, 16 y 17 LFPDPPP (20 marzo 2025)',
    title: '1. Lectura del Aviso de Privacidad y condiciones gratuitas no clínicas',
    label:
      'Confirmo que leí el Aviso de Privacidad Simplificado y tuve acceso al Aviso de Privacidad Integral; comprendo que RENACER es gratuita, no presta servicios médicos ni de emergencias, no ofrece supervisión humana en tiempo real y no utiliza mis datos para publicidad ni entrenamiento de modelos.',
    scopeDescription:
      'Casilla obligatoria de conocimiento informado (inicialmente desmarcada; sin consentimiento tácito).',
    initialChecked: false,
  },
  {
    id: 'sensitiveHealthConsent',
    requiredToCreateAccount: true,
    legalBasis: 'Art. 8 LFPDPPP (20 marzo 2025) — Datos personales sensibles',
    title: '2. Consentimiento expreso para datos sensibles de salud, recuperación y bienestar',
    label:
      'Otorgo mi consentimiento expreso para el tratamiento y almacenamiento privado por UID en Cloud Firestore (EE. UU.) de mis datos sensibles relacionados con recuperación, estado emocional, diario personal, impulsos, recaídas, hábitos, red de apoyo y conversaciones opcionales con RENACER IA.',
    scopeDescription:
      'Necesario únicamente para habilitar tu bóveda de recuperación y bienestar. Puede revocarse en cualquier momento.',
    initialChecked: false,
  },
  {
    id: 'financialDataConsent',
    requiredToCreateAccount: false,
    legalBasis: 'Art. 7 LFPDPPP (20 marzo 2025) — Datos financieros y patrimoniales',
    title: '3. Consentimiento expreso e independiente para datos financieros y patrimoniales (Opcional)',
    label:
      'Otorgo mi consentimiento expreso para registrar y almacenar de forma privada mis datos financieros y patrimoniales (estimación de gasto diario, ingresos, gastos, ahorros, deudas y abonos) con la finalidad de calcular mis avances económicos dentro de RENACER.',
    scopeDescription:
      'Opcional e independiente: si dejas esta casilla desmarcada, podrás crear tu cuenta y usar RENACER sin el módulo financiero ni estimación económica.',
    initialChecked: false,
  },
];

export interface RevocationConsequenceOption {
  scope: 'financial_only' | 'sensitive_health' | 'full_account';
  title: string;
  mechanism: string;
  consequences: string[];
}

export const CONSENT_REVOCATION_PROCEDURES_2025: RevocationConsequenceOption[] = [
  {
    scope: 'financial_only',
    title: 'Revocar únicamente el consentimiento de datos financieros y patrimoniales',
    mechanism:
      'En "Perfil y seguridad > Privacidad y Consentimientos" (o escribiendo a lift884@gmail.com), desactiva el consentimiento financiero. Antes de confirmar, puedes exportar tus datos en JSON y elegir si deseas conservar solo para consulta/eliminación manual o borrar de inmediato tus entradas financieras y poner dailySpendEstimate en 0.',
    consequences: [
      'Se bloquean nuevas capturas en el módulo Finanzas y se desactiva el cálculo de ahorro por gasto diario.',
      'No afecta tus diarios emocionales, hábitos, metas de recuperación ni tu cuenta Google en RENACER.',
      'La revocación no tiene efectos retroactivos sobre tratamientos legítimos efectuados antes de tu solicitud.',
    ],
  },
  {
    scope: 'sensitive_health',
    title: 'Revocar el consentimiento de datos sensibles de salud, recuperación y bienestar',
    mechanism:
      'Desde "Perfil y seguridad > Privacidad y Consentimientos" o por correo a lift884@gmail.com (acreditando titularidad desde el correo Google registrado).',
    consequences: [
      'Dado que la función esencial de RENACER consiste en acompañar tu proceso de recuperación y bienestar, revocar este consentimiento impide seguir registrando emociones, diarios, impulsos, planes o consultas a RENACER IA.',
      'Podrás exportar previamente toda tu información en JSON y solicitar la cancelación/supresión de los registros sensibles o ejecutar la eliminación definitiva de tu cuenta.',
      'La revocación no tiene efectos retroactivos respecto a consultas o registros realizados antes de revocar.',
    ],
  },
  {
    scope: 'full_account',
    title: 'Revocación total mediante eliminación definitiva de cuenta y datos',
    mechanism:
      'Disponible de forma inmediata en "Perfil y seguridad > Eliminar cuenta y datos" (previa reautenticación reciente con Google y confirmación de correo) o mediante solicitud ARCO a lift884@gmail.com.',
    consequences: [
      'Elimina permanentemente de Cloud Firestore tus 15 subcolecciones privadas, perfil raíz, historial de consentimientos y publicaciones/respuestas propias en Comunidad.',
      'Limpia IndexedDB, sessionStorage y preferencias locales, y elimina tu usuario de Firebase Authentication.',
      'Es irreversible: tras eliminar la cuenta no será posible recuperar registros no exportados previamente.',
    ],
  },
];

export interface ConsentAcceptanceEvidence {
  evidenceId: string;
  authenticatedUid: string;
  authenticatedEmail: string;
  authProvider: 'google.com';
  emailVerified: boolean;
  acceptedAtIso: string;
  simplifiedNoticeVersion: string;
  integralNoticeVersion: string;
  sensitiveHealthConsentVersion: string;
  financialConsentVersion: string;
  privacyNoticeAck: boolean;
  sensitiveHealthConsent: boolean;
  financialDataConsent: boolean;
  mechanism: 'explicit_unchecked_checkboxes_post_google_oauth';
  checkboxInitialStateWasUnchecked: true;
  userAgentSummary: string;
  legalValidationStatus: 'pending_mexican_privacy_specialist_review';
}

export function buildConsentAcceptanceEvidence(params: {
  uid: string;
  email: string;
  emailVerified: boolean;
  privacyNoticeAck: boolean;
  sensitiveHealthConsent: boolean;
  financialDataConsent: boolean;
}): ConsentAcceptanceEvidence {
  const randomSuffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return {
    evidenceId: `consent_${Date.now()}_${randomSuffix}`,
    authenticatedUid: params.uid,
    authenticatedEmail: params.email,
    authProvider: 'google.com',
    emailVerified: params.emailVerified,
    acceptedAtIso: new Date().toISOString(),
    simplifiedNoticeVersion: PROPOSAL_LEGAL_VERSIONS.simplifiedNoticeVersion,
    integralNoticeVersion: PROPOSAL_LEGAL_VERSIONS.integralNoticeVersion,
    sensitiveHealthConsentVersion: PROPOSAL_LEGAL_VERSIONS.sensitiveHealthConsentVersion,
    financialConsentVersion: PROPOSAL_LEGAL_VERSIONS.financialConsentVersion,
    privacyNoticeAck: params.privacyNoticeAck,
    sensitiveHealthConsent: params.sensitiveHealthConsent,
    financialDataConsent: params.financialDataConsent,
    mechanism: 'explicit_unchecked_checkboxes_post_google_oauth',
    checkboxInitialStateWasUnchecked: true,
    userAgentSummary:
      typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : 'non-browser-environment',
    legalValidationStatus: 'pending_mexican_privacy_specialist_review',
  };
}
