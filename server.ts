import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

interface FirebaseAppletConfig {
  projectId?: string;
}

function getFirebaseProjectId(): string {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  const raw = fs.readFileSync(cfgPath, 'utf-8');
  const parsed = JSON.parse(raw) as FirebaseAppletConfig;
  const projectId = typeof parsed.projectId === 'string' ? parsed.projectId.trim() : '';
  if (!projectId || projectId === 'remixed-project-id') {
    throw new Error('FIREBASE_PROJECT_ID_NOT_CONFIGURED');
  }
  return projectId;
}

const firebaseProjectId = getFirebaseProjectId();
const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseProjectId });
const adminAuth = getAuth(adminApp);

interface AuthenticatedRequest extends Request {
  authUser?: {
    uid: string;
    emailVerified: boolean;
  };
}

async function requireVerifiedFirebaseUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Autenticación requerida. Inicia sesión para acceder a este servicio.',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token.length > 8192) {
    res.status(401).json({
      error: 'Token de autenticación inválido.',
    });
    return;
  }

  try {
    // verifyIdToken(token) verifies signature, aud, iss, and exp using public Google keys (no IAM required).
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.uid) {
      res.status(401).json({ error: 'Token de usuario inválido.' });
      return;
    }
    if (decoded.email_verified !== true) {
      res.status(403).json({
        error: 'Debes verificar tu correo electrónico antes de usar esta función.',
      });
      return;
    }
    req.authUser = {
      uid: decoded.uid,
      emailVerified: true,
    };
    next();
  } catch {
    res.status(401).json({
      error: 'Tu sesión expiró o no pudo verificarse. Vuelve a iniciar sesión.',
    });
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// --- Per-UID Sliding-Window Rate Limiter (Abuse & Quota Protection) ---
interface RateLimitBucket {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitBucket>();

function checkUidRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(bucketKey);
  const cutoff = now - windowMs;
  const recent = existing ? existing.timestamps.filter((ts) => ts > cutoff) : [];

  if (recent.length >= maxRequests) {
    const oldestInWindow = recent[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    rateLimitStore.set(bucketKey, { timestamps: recent });
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  rateLimitStore.set(bucketKey, { timestamps: recent });

  // Bound memory size in long-lived server processes
  if (rateLimitStore.size > 5000) {
    for (const [key, bucket] of rateLimitStore.entries()) {
      const active = bucket.timestamps.filter((ts) => ts > now - 24 * 60 * 60 * 1000);
      if (active.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, { timestamps: active });
      }
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}

// --- Crisis Detection & Clinical Safety Classifier ---
type CrisisType = 'suicide' | 'overdose' | 'dangerous_withdrawal' | null;

const SUICIDE_PATTERNS = [
  /\bsuicid[a-záéíóúñ]*\b/i,
  /\b(quitarme\s+la\s+vida|me\s+quiero\s+matar|quiero\s+matarme|matarme|no\s+quiero\s+vivir|acabar\s+con\s+todo|hacerme\s+da[ñn]o|cortarme(?:\s+las\s+venas)?|autolesi[oó]n[a-z]*|despedirme\s+para\s+siempre|no\s+vale\s+la\s+pena\s+vivir|preferir[ií]a\s+morir)\b/i,
];

const OVERDOSE_PATTERNS = [
  /\bdesmay[a-záéíóúñ]*\b/i,
  /\bconvulsi[oó]n[a-záéíóúñ]*\b/i,
  /\b(sobredosis|coma\s+et[ií]lico|intoxicaci[oó]n\s+(?:grave|severa|aguda)|vomitando\s+sangre|no\s+despierta|dejar\s+de\s+respirar|tom[eé]\s+demasiado|me\s+pas[eé]\s+con\s+la\s+dosis|no\s+puedo\s+respirar|labios\s+morados|p[eé]rdida\s+de\s+conocimiento)\b/i,
];

const WITHDRAWAL_PATTERNS = [
  /\b(delirium\s+tremens|alucinaciones\s+por\s+abstinencia|temblores\s+severos|convulsiones\s+por\s+dejar|dejar\s+el\s+alcohol\s+de\s+golpe|abstinencia\s+peligrosa|v[oó]mitos\s+constantes|dolor\s+en\s+el\s+pecho|taquicardia\s+extrema|fiebre\s+alta\s+por\s+abstinencia)\b/i,
];

function detectCrisis(text: string): CrisisType {
  if (SUICIDE_PATTERNS.some((re) => re.test(text))) return 'suicide';
  if (WITHDRAWAL_PATTERNS.some((re) => re.test(text))) return 'dangerous_withdrawal';
  if (OVERDOSE_PATTERNS.some((re) => re.test(text))) return 'overdose';
  return null;
}

function buildCrisisResponse(type: Exclude<CrisisType, null>): string {
  if (type === 'suicide') {
    return [
      'Lo que estás sintiendo importa muchísimo y no tienes que atravesar este momento en soledad.',
      '',
      'Por tu seguridad inmediata: RENACER IA es una herramienta automatizada sin supervisión humana en tiempo real y NO sustituye atención médica ni psicológica de urgencia. Por favor comunícate ahora mismo con un servicio de emergencia o línea oficial de crisis:',
      '• Emergencias médicas / Riesgo vital: 911 (México / América) o 112 (España / Europa)',
      '• México — Línea de la Vida (CONASAMA): 800 911 2000 (gratuita 24/7)',
      '• México — SAPTEL Apoyo Psicológico 24/7: 55 5259 8121 · LOCATEL CDMX: *0311 / 55 5658 1111',
      '• España: 024 (Línea de atención a la conducta suicida)',
      '• Argentina: 135 (CABA) / (011) 5275-1135 · Colombia: 106 · Chile: *4141 · Perú: 113',
      '• Estados Unidos: 988 (atención en español disponible)',
      '',
      'Si puedes, acércate a una persona de confianza en este instante o acude a la sala de urgencias más cercana para recibir atención humana presencial.',
    ].join('\n');
  }

  if (type === 'overdose') {
    return [
      'Esta situación requiere atención médica de emergencia inmediata. No esperes a que los síntomas pasen solos.',
      '',
      '• Llama ahora mismo al 911 (México/América) o al 112 (Europa), o pide a alguien cercano que lo haga.',
      '• Si hay sospecha de sobredosis por opioides y dispones de naloxona, aplícala siguiendo las indicaciones mientras llega la ambulancia.',
      '• Si la persona está inconsciente pero respira, colócala de lado en posición lateral de seguridad y no le des líquidos ni alimentos.',
      '',
      'RENACER IA es un asistente automatizado sin supervisión médica ni monitoreo humano en tiempo real. Busca atención médica presencial ahora mismo.',
    ].join('\n');
  }

  return [
    'Los síntomas de abstinencia intensos (temblores graves, alucinaciones, confusión, fiebre alta, convulsiones o dolor torácico) pueden representar un riesgo médico serio.',
    '',
    'No intentes realizar una desintoxicación en casa sin supervisión médica. Por favor:',
    '• Acude hoy mismo a urgencias médicas o llama al 911 / 112 si los síntomas son intensos.',
    '• En México también puedes recibir orientación inicial 24/7 en la Línea de la Vida (CONASAMA): 800 911 2000.',
    '• Habla con un médico o equipo clínico especializado para recibir un manejo seguro y supervisado.',
    '',
    'RENACER IA no brinda atención médica ni supervisión clínica. Proteger tu vida y tu salud física es prioridad.',
  ].join('\n');
}

// --- Community Content Moderation (PII & Safety Rules, Persistence in Cloud Firestore) ---
function containsPhoneNumber(text: string): boolean {
  const candidates = text.match(/(?:\+?\d[\d\s().-]{6,18}\d)/g) ?? [];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(trimmed) || /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
      continue;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) {
      return true;
    }
  }
  return false;
}

const PII_OR_UNSAFE_PATTERNS = [
  { pattern: /[A-Z0-9._%+-]+\s*@\s*[A-Z0-9.-]+\.[A-Z]{2,}/i, reason: 'Por tu privacidad, no incluyas correos electrónicos en la comunidad pública.' },
  { pattern: /\b(whatsapp|telegram|instagram|tiktok|facebook|snapchat|dm\s+me|m[aá]ndame\s+mensaje\s+privado|mi\s+n[uú]mero\s+es|escr[ií]beme\s+al)\b/i, reason: 'Por seguridad y protección de identidad, no compartas redes sociales ni datos de contacto en la comunidad.' },
  { pattern: /(^|\s)@[A-Z0-9_.]{3,}\b/i, reason: 'Por tu privacidad, evita publicar usuarios o identificadores de contacto (@usuario).' },
  { pattern: /\b(vendo|compro|conseguir\s+droga|dealer|enlace\s+de\s+apuestas|casino\s+online|c[oó]digo\s+promo\s+apuesta)\b/i, reason: 'Este espacio está libre de venta, promoción de sustancias o enlaces de apuestas.' },
  { pattern: /\bsuicid[a-záéíóúñ]*\b/i, reason: 'El contenido que describe o fomenta autolesión se bloquea para proteger a la comunidad. Si necesitas apoyo urgente, usa el botón "Necesito ayuda ahora".' },
  { pattern: /\b(m[aá]tate|hazte\s+da[ñn]o|c[oó]rtate|qu[ií]tate\s+la\s+vida|autolesi[oó]n[a-z]*)\b/i, reason: 'El contenido que describe o fomenta autolesión se bloquea para proteger a la comunidad. Si necesitas apoyo urgente, usa el botón "Necesito ayuda ahora".' },
];

async function moderateCommunityText(text: string): Promise<{ allowed: boolean; reason?: string }> {
  if (containsPhoneNumber(text)) {
    return {
      allowed: false,
      reason: 'Por seguridad y protección de identidad, no compartas números de teléfono en publicaciones públicas.',
    };
  }

  for (const rule of PII_OR_UNSAFE_PATTERNS) {
    if (rule.pattern.test(text)) {
      return { allowed: false, reason: rule.reason };
    }
  }

  // Optional Gemini moderation check when API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = getGeminiClient();
      const modRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Evalúa si este mensaje para una comunidad de recuperación de adicciones es seguro para publicar. Debe rechazarse SOLO si contiene: (1) acoso, insultos o humillación, (2) promoción o venta de drogas/alcohol/apuestas, (3) instrucciones de autolesión o suicidio, (4) datos personales de contacto (teléfonos, direcciones, redes sociales). Responde ÚNICAMENTE en JSON válido con {"allowed": boolean, "reason": string}.\n\nMensaje:\n"""${text.slice(0, 1200)}"""`,
        config: {
          responseMimeType: 'application/json',
        },
      });
      const parsed = JSON.parse((modRes.text ?? '{"allowed":true}').trim());
      if (typeof parsed.allowed === 'boolean' && !parsed.allowed) {
        return {
          allowed: false,
          reason: typeof parsed.reason === 'string' && parsed.reason.trim()
            ? parsed.reason.trim()
            : 'El mensaje no cumple con las normas de seguridad y cuidado mutuo de la comunidad.',
        };
      }
    } catch {
      // Deterministic rules already block phones, emails, contact handles, self-harm, and substance/gambling sales
    }
  }

  return { allowed: true };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // --- Healthcheck ---
  app.get('/api/health', (_req: Request, res: Response) => {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    res.json({
      status: 'ok',
      aiConfigured: hasGemini,
      authVerifierConfigured: true,
      communityStorage: 'cloud_firestore',
    });
  });

  // --- RENACER IA Endpoint (Authenticated & Verified Firebase ID Token Required) ---
  app.post('/api/ai/chat', requireVerifiedFirebaseUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const uid = req.authUser?.uid ?? 'anonymous';
      const shortWindow = checkUidRateLimit(`ai_15m:${uid}`, 20, 15 * 60 * 1000);
      if (!shortWindow.allowed) {
        res.setHeader('Retry-After', String(shortWindow.retryAfterSec));
        res.status(429).json({
          error:
            'Has enviado varias consultas seguidas a RENACER IA. Tómate una pausa breve (puedes usar Respiración 4-7-8 o "Necesito ayuda ahora") e intenta de nuevo en unos minutos.',
        });
        return;
      }
      const dailyWindow = checkUidRateLimit(`ai_24h:${uid}`, 80, 24 * 60 * 60 * 1000);
      if (!dailyWindow.allowed) {
        res.setHeader('Retry-After', String(dailyWindow.retryAfterSec));
        res.status(429).json({
          error:
            'Se alcanzó el límite diario de consultas automatizadas para tu cuenta. Si necesitas apoyo inmediato hoy, utiliza tus contactos de confianza o las líneas oficiales en "Necesito ayuda ahora".',
        });
        return;
      }

      const { messages, userContext } = req.body ?? {};
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Se requiere al menos un mensaje.' });
        return;
      }

      const sanitizedMessages = messages
        .slice(-16)
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content.trim().slice(0, 2000),
        }))
        .filter((m) => m.content.length > 0);

      if (sanitizedMessages.length === 0) {
        res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
        return;
      }

      const lastUserMessage = [...sanitizedMessages].reverse().find((m) => m.role === 'user');
      if (!lastUserMessage) {
        res.status(400).json({ error: 'Falta el mensaje del usuario.' });
        return;
      }

      // 1. Immediate Crisis Safeguard
      const crisisType = detectCrisis(lastUserMessage.content);
      if (crisisType) {
        res.json({
          reply: buildCrisisResponse(crisisType),
          crisisDetected: true,
          crisisType,
          clinicalDisclaimer: 'Atención de emergencia prioritaria: RENACER IA no sustituye servicios médicos ni líneas de crisis.',
        });
        return;
      }

      // 2. Build Safe Non-PII Context
      const safeContext = {
        alias: typeof userContext?.alias === 'string' ? userContext.alias.slice(0, 40) : 'persona en recuperación',
        focus: typeof userContext?.focus === 'string' ? userContext.focus.slice(0, 80) : 'recuperación personal',
        daysInRecovery: typeof userContext?.daysInRecovery === 'number' ? Math.max(0, Math.floor(userContext.daysInRecovery)) : 0,
        recentMood: typeof userContext?.recentMood === 'string' ? userContext.recentMood.slice(0, 60) : 'sin registro reciente',
        goals: Array.isArray(userContext?.goals)
          ? userContext.goals.slice(0, 6).map((g: unknown) => String(g).slice(0, 100))
          : [],
        reasonsToChange: Array.isArray(userContext?.reasonsToChange)
          ? userContext.reasonsToChange.slice(0, 5).map((r: unknown) => String(r).slice(0, 100))
          : [],
      };

      const systemInstruction = `Eres RENACER IA, un acompañante conversacional automatizado disponible 24/7 (sin supervisión humana en tiempo real) dentro de la aplicación RENACER ("Un día a la vez"), especializado en apoyo emocional y acompañamiento práctico para la recuperación de adicciones (sustancias, alcohol, apuestas, conductas compulsivas) y reconstrucción personal.

PERFIL ACTUAL DEL USUARIO (NO incluyas datos sensibles innecesarios):
- Nombre o alias: ${safeContext.alias}
- Enfoque de recuperación: ${safeContext.focus}
- Días en esta etapa de recuperación: ${safeContext.daysInRecovery}
- Estado emocional reciente: ${safeContext.recentMood}
- Metas personales activas: ${safeContext.goals.length ? safeContext.goals.join('; ') : 'En construcción'}
- Motivos personales de cambio: ${safeContext.reasonsToChange.length ? safeContext.reasonsToChange.join('; ') : 'Bienestar y reconstrucción'}

REGLAS CLÍNICAS Y DE SEGURIDAD INQUEBRANTABLES:
1. Tono humano, empático, directo, claro y sin juzgar jamás. Habla en español natural y cercano. Promueve el enfoque práctico de "Un día a la vez".
2. DISTINCIÓN CLARA: Aclara cuando corresponda que tu rol es de acompañamiento y herramientas prácticas de bienestar general, y que NO sustituyes atención médica, psiquiátrica ni psicoterapia clínica profesional.
3. PROHIBIDO DIAGNOSTICAR: Nunca emitas diagnósticos médicos o psiquiátricos (no digas "tienes trastorno X", "sufres depresión clínica", etc.).
4. PROHIBIDO PRESCRIBIR MEDICAMENTOS: Nunca recomiendes, doses, ajustes o sugieras suspender fármacos o psicofármacos.
5. PROHIBIDO INDICAR DESINTOXICACIONES CASERAS: Si el usuario pregunta cómo desintoxicarse en casa de alcohol, benzodiacepinas, opioides u otras sustancias con síndrome de abstinencia física, advierte con claridad que la desintoxicación sin supervisión médica puede ser peligrosa y recomienda acudir a un profesional de la salud o centro médico.
6. CRISIS Y EMERGENCIAS: Ante cualquier señal de sobredosis, abstinencia peligrosa (convulsiones, alucinaciones, delirio, dolor torácico) o riesgo suicida/autolesión, prioriza de inmediato orientar a servicios de emergencias locales (911 / 112 / líneas de crisis como 024, 988, 800 911 2000) y atención médica presencial.
7. Si el usuario reporta una recaída o impulso intenso, responde con total compasión (cero culpa, cero castigo), ayúdale a bajar la intensidad del impulso en los próximos 10 minutos (respiración 4-7-8, técnica HALT, contactar a su red de apoyo) y recuérdale sus metas y motivos reales.
8. Mantén respuestas estructuradas, concretas y accionables (máximo 220 palabras salvo que el usuario pida profundizar).`;

      const ai = getGeminiClient();
      const conversationPrompt = sanitizedMessages
        .map((m) => `${m.role === 'user' ? 'Usuario' : 'RENACER IA'}: ${m.content}`)
        .join('\n\n');

      let response;
      let lastErr: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: conversationPrompt,
            config: {
              systemInstruction,
            },
          });
          break;
        } catch (err) {
          lastErr = err;
          const st = (err as { status?: number })?.status;
          if ((st === 503 || st === 500) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
      if (!response) {
        throw lastErr ?? new Error('EMPTY_GEMINI_RESPONSE');
      }

      const replyText = (response.text ?? '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'El asistente no pudo generar una respuesta en este momento.' });
        return;
      }

      res.json({
        reply: replyText,
        crisisDetected: false,
        crisisType: null,
        clinicalDisclaimer:
          'Asistente automatizado sin supervisión humana en tiempo real. Apoyo general y psicoeducativo; no sustituye diagnóstico ni tratamiento médico o psicológico profesional.',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === 'GEMINI_API_KEY_NOT_CONFIGURED') {
        res.status(503).json({
          error: 'RENACER IA requiere configurar GEMINI_API_KEY en Settings > Secrets para responder.',
        });
        return;
      }
      const status = (error as { status?: number })?.status;
      console.error('Error en /api/ai/chat:', status ?? '', msg);
      if (status === 403 || status === 400 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
        res.status(502).json({
          error: 'La clave GEMINI_API_KEY configurada no es válida o no tiene permisos. Verifícala en Settings > Secrets.',
        });
        return;
      }
      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Se alcanzó el límite temporal de consultas a Gemini. Intenta de nuevo en unos momentos.',
        });
        return;
      }
      if (status === 404 || msg.includes('NOT_FOUND')) {
        res.status(502).json({
          error: 'El modelo de Gemini solicitado no está disponible en este entorno (404). Verifica la configuración del modelo.',
        });
        return;
      }
      res.status(502).json({
        error: `No pudimos conectar con RENACER IA en este momento${status ? ` (código ${status})` : ''}. Si estás en crisis, usa el botón "Necesito ayuda ahora".`,
      });
    }
  });

  // --- Community Moderation Endpoint (ID Token Required; Storage in Cloud Firestore) ---
  app.post('/api/community/moderate', requireVerifiedFirebaseUser, async (req: AuthenticatedRequest, res: Response) => {
    const uid = req.authUser?.uid ?? 'anonymous';
    const modLimit = checkUidRateLimit(`mod_10m:${uid}`, 20, 10 * 60 * 1000);
    if (!modLimit.allowed) {
      res.setHeader('Retry-After', String(modLimit.retryAfterSec));
      res.status(429).json({
        allowed: false,
        error: 'Demasiados envíos seguidos en la comunidad. Espera unos minutos antes de publicar de nuevo.',
      });
      return;
    }

    const { type, authorAlias, content } = req.body ?? {};
    const modType = type === 'reply' ? 'reply' : 'post';
    const cleanAlias = typeof authorAlias === 'string' ? authorAlias.trim().slice(0, 40) : '';
    const maxContentLen = modType === 'reply' ? 500 : 800;
    const minContentLen = modType === 'reply' ? 3 : 8;
    const cleanContent = typeof content === 'string' ? content.trim().slice(0, maxContentLen) : '';

    if (cleanAlias.length < 2 || cleanContent.length < minContentLen) {
      res.status(400).json({
        error: modType === 'reply'
          ? 'Escribe un alias válido y una respuesta de al menos 3 caracteres.'
          : 'Escribe un alias (mínimo 2 caracteres) y un mensaje de al menos 8 caracteres.',
      });
      return;
    }

    for (const rule of PII_OR_UNSAFE_PATTERNS) {
      if (rule.pattern.test(cleanAlias)) {
        res.status(422).json({ allowed: false, error: rule.reason });
        return;
      }
    }

    const mod = await moderateCommunityText(cleanContent);
    if (!mod.allowed) {
      res.status(422).json({ allowed: false, error: mod.reason });
      return;
    }

    res.json({
      allowed: true,
      uid: req.authUser?.uid ?? null,
    });
  });

  // --- Frontend Serving (Vite dev middleware or Production dist) ---
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');

    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          const baseName = path.basename(filePath);
          if (
            baseName === 'index.html' ||
            baseName === 'sw.js' ||
            baseName === 'registerSW.js' ||
            baseName === 'manifest.webmanifest'
          ) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    // Never return index.html (text/html) for missing JS/CSS/image/asset requests — avoids Safari MIME module abort.
    app.get('*', (req: Request, res: Response) => {
      if (
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/src/') ||
        /\.(js|mjs|css|map|png|jpg|jpeg|svg|ico|webp|woff2?|json|webmanifest)$/i.test(req.path)
      ) {
        res.status(404).type('text/plain').send('Recurso estático no encontrado.');
        return;
      }

      if (!fs.existsSync(indexHtmlPath)) {
        res
          .status(503)
          .type('text/plain')
          .send('La compilación de producción (dist/index.html) aún no está disponible.');
        return;
      }

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(indexHtmlPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RENACER server listening on http://0.0.0.0:${PORT} (${IS_PROD ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start RENACER server:', err);
  process.exit(1);
});
