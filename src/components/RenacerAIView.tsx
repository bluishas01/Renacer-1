import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Trash2,
} from 'lucide-react';
import { auth } from '../firebase';
import type { ChatMessage, UserVaultData } from '../types/renacer';
import { calculateDaysInRecovery, formatDateTime } from '../utils/recoveryMath';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface RenacerAIViewProps {
  vault: UserVaultData;
  onUpdateVault: (updater: (prev: UserVaultData) => UserVaultData) => Promise<void>;
  onOpenHelp: () => void;
}

const STARTER_PROMPTS = [
  'Siento un impulso fuerte ahora mismo, ayúdame a atravesar estos 10 minutos.',
  'Ayúdame a hacer un chequeo honesto de cómo estoy hoy.',
  'Tuve una recaída o tropiezo y me cuesta no culparme.',
  '¿Cómo organizo mi rutina de hoy para proteger mi recuperación?',
];

export const RenacerAIView: React.FC<RenacerAIViewProps> = ({
  vault,
  onUpdateVault,
  onOpenHelp,
}) => {
  const isOnline = useOnlineStatus();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [vault.aiChatHistory.length, sending]);

  const sendMessage = async (textToSend?: string) => {
    const clean = (textToSend ?? input).trim();
    if (!clean || sending) return;

    setError(null);
    if (!isOnline) {
      setError('Estás sin conexión. RENACER IA necesita internet; usa las herramientas locales en "Necesito ayuda ahora".');
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: clean.slice(0, 2000),
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...vault.aiChatHistory, userMsg].slice(-40);
    setSending(true);
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        aiChatHistory: nextHistory,
      }));
      if (!textToSend) setInput('');

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Tu sesión expiró. Vuelve a iniciar sesión para usar RENACER IA.');
      }
      const idToken = await currentUser.getIdToken();

      const { days } = calculateDaysInRecovery(vault.profile.recoveryStartDate);
      const latestEmotion = vault.emotionalLogs[0];

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: nextHistory.slice(-14).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userContext: {
            alias: vault.profile.alias,
            focus: vault.profile.focus,
            daysInRecovery: days,
            recentMood: latestEmotion
              ? `${latestEmotion.mood} (energía ${latestEmotion.energyLevel}/5, estrés ${latestEmotion.stressLevel}/5)`
              : 'sin registro reciente',
            goals: vault.lifeGoals.filter((g) => !g.completed).map((g) => g.title),
            reasonsToChange: vault.recoveryPlan.reasonsToChange,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo obtener respuesta de RENACER IA.');
      }

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        createdAt: new Date().toISOString(),
        crisisDetected: Boolean(data.crisisDetected),
        crisisType: data.crisisType ?? null,
      };

      await onUpdateVault((prev) => ({
        ...prev,
        aiChatHistory: [...prev.aiChatHistory, assistantMsg].slice(-40),
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al conectar con RENACER IA.'
      );
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        aiChatHistory: [],
      }));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo limpiar el historial en Firestore.'
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#E3DDD0] bg-white lg:h-[calc(100vh-7.5rem)]">
      {/* Header with clinical boundary notice */}
      <div className="border-b border-[#E3DDD0] bg-[#FAF8F3] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B4332] text-[#F7F4EC]">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-[#14241C]">
                RENACER IA · Asistente automatizado
              </h1>
              <p className="text-xs text-[#4C5E54]">
                Personalizado según tus metas y etapa actual ({vault.profile.focus})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {vault.aiChatHistory.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#D5CEBF] bg-white px-3 py-1.5 text-xs font-medium text-[#4C5E54] hover:text-[#991B1B]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Limpiar chat</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenHelp}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#991B1B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7F1D1D]"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Urgencias</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#1B4332]/15 bg-[#EBF3EE] px-3.5 py-2.5 text-xs text-[#1B4332]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Alcance y límites:</strong> RENACER IA es una herramienta automatizada disponible 24/7{' '}
            <strong>sin supervisión humana ni monitoreo clínico en tiempo real</strong>. No diagnostica,
            no prescribe medicamentos ni indica desintoxicaciones caseras. Ante emergencia o crisis, llama
            al 911 o en México al 800 911 2000 (Línea de la Vida).
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {vault.aiChatHistory.length === 0 ? (
          <div className="mx-auto max-w-xl py-6 text-center">
            <h2 className="font-display text-xl font-semibold text-[#14241C]">
              Hola, {vault.profile.alias}. Estoy aquí contigo.
            </h2>
            <p className="mt-2 text-sm text-[#4C5E54]">
              Puedes contarme cómo va tu día, si apareció un impulso o qué objetivo quieres cuidar hoy.
              Hablamos sin juicios, un día a la vez.
            </p>
            <div className="mt-6 grid gap-2.5 text-left sm:grid-cols-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="min-h-[52px] rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3.5 text-xs font-medium text-[#14241C] transition hover:border-[#1B4332] hover:bg-[#EBF3EE]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          vault.aiChatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#1B4332] text-[#F7F4EC]'
                    : msg.crisisDetected
                      ? 'border border-[#991B1B]/30 bg-[#FEF2F2] text-[#14241C]'
                      : 'border border-[#E3DDD0] bg-[#FAF8F3] text-[#14241C]'
                }`}
              >
                {msg.crisisDetected && (
                  <div className="mb-2 flex items-center gap-2 border-b border-[#991B1B]/20 pb-2 text-xs font-semibold text-[#991B1B]">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Orientación prioritaria de emergencia y atención médica</span>
                  </div>
                )}
                {msg.content}
                {msg.crisisDetected && (
                  <button
                    type="button"
                    onClick={onOpenHelp}
                    className="mt-3 flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#991B1B] px-3.5 py-2 text-xs font-medium text-white"
                  >
                    Ver líneas de emergencia y contactos de apoyo
                  </button>
                )}
              </div>
              <span className="mt-1 px-1 text-[11px] text-[#4C5E54]">
                {msg.role === 'user' ? 'Tú' : 'RENACER IA'} · {formatDateTime(msg.createdAt)}
              </span>
            </div>
          ))
        )}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-[#4C5E54]">
            <Loader2 className="h-4 w-4 animate-spin text-[#1B4332]" />
            <span>RENACER IA está preparando una respuesta cuidadosa...</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3.5 text-sm text-[#991B1B]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="border-t border-[#E3DDD0] bg-[#FAF8F3] p-3 sm:p-4"
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escribe cómo te sientes o qué necesitas hoy..."
            className="min-h-[46px] max-h-32 flex-1 resize-none rounded-xl border border-[#D5CEBF] bg-white px-4 py-3 text-sm text-[#14241C] focus:border-[#1B4332] focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Enviar mensaje"
            className="flex min-h-[46px] min-w-[46px] items-center justify-center rounded-xl bg-[#1B4332] px-4 text-[#F7F4EC] transition hover:bg-[#143326] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[#4C5E54]">
          Solo se envía al servidor tu alias, enfoque, días, estado emocional reciente y metas (nunca tu
          correo electrónico ni teléfonos de contacto).
        </p>
      </form>
    </div>
  );
};
