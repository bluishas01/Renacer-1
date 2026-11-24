import React, { useState } from 'react';
import { BookOpen, CheckCircle2, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import type { EmotionalLog, JournalEntry, MoodState, UserVaultData } from '../types/renacer';
import { formatDateTime, formatShortDate, todayISO } from '../utils/recoveryMath';

interface JournalViewProps {
  vault: UserVaultData;
  onUpdateVault: (updater: (prev: UserVaultData) => UserVaultData) => Promise<void>;
}

const MOODS: MoodState[] = ['Tranquilo', 'Esperanzado', 'Cansado', 'Ansioso', 'Vulnerable', 'Abrumado'];

export const JournalView: React.FC<JournalViewProps> = ({ vault, onUpdateVault }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState<MoodState>('Tranquilo');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(2);
  const [content, setContent] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [triggersNoticed, setTriggersNoticed] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<'Todos' | MoodState>('Todos');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setDate(todayISO());
    setTitle('');
    setMood('Tranquilo');
    setEnergyLevel(3);
    setStressLevel(2);
    setContent('');
    setGratitude('');
    setTriggersNoticed('');
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setTitle(entry.title);
    setMood(entry.mood);
    setEnergyLevel(entry.energyLevel);
    setStressLevel(entry.stressLevel);
    setContent(entry.content);
    setGratitude(entry.gratitude);
    setTriggersNoticed(entry.triggersNoticed);
    setSavedNotice(null);
    setError(null);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(null);

    const cleanTitle = title.trim().slice(0, 100);
    const cleanContent = content.trim().slice(0, 2000);
    if (!cleanTitle || !cleanContent) {
      setError('Escribe un título y una reflexión para guardar tu entrada en el diario.');
      return;
    }

    setSaving(true);
    const nowIso = new Date().toISOString();

    try {
      await onUpdateVault((prev) => {
        let nextJournal: JournalEntry[];
        if (editingId) {
          nextJournal = prev.journalEntries.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  date,
                  title: cleanTitle,
                  mood,
                  energyLevel,
                  stressLevel,
                  content: cleanContent,
                  gratitude: gratitude.trim().slice(0, 400),
                  triggersNoticed: triggersNoticed.trim().slice(0, 240),
                  updatedAt: nowIso,
                }
              : item
          );
        } else {
          const newEntry: JournalEntry = {
            id: `jrn_${Date.now()}`,
            date,
            title: cleanTitle,
            mood,
            energyLevel,
            stressLevel,
            content: cleanContent,
            gratitude: gratitude.trim().slice(0, 400),
            triggersNoticed: triggersNoticed.trim().slice(0, 240),
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          nextJournal = [newEntry, ...prev.journalEntries];
        }

        // Also update the matching date emotional check-in so dashboard stays coherent
        const existingEmo = prev.emotionalLogs.find((el) => el.date === date);
        const syncedEmo: EmotionalLog = {
          id: existingEmo?.id ?? `emo_${Date.now()}`,
          date,
          createdAt: existingEmo?.createdAt ?? nowIso,
          mood,
          energyLevel,
          stressLevel,
          note: existingEmo?.note || cleanTitle.slice(0, 400),
        };
        const nextEmotional = [
          syncedEmo,
          ...prev.emotionalLogs.filter((el) => el.date !== date),
        ].slice(0, 90);

        return {
          ...prev,
          journalEntries: nextJournal,
          emotionalLogs: nextEmotional,
        };
      });

      setSavedNotice(
        editingId
          ? 'Entrada actualizada en Cloud Firestore.'
          : 'Entrada guardada en tu diario personal en Cloud Firestore.'
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la entrada.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await onUpdateVault((prev) => ({
        ...prev,
        journalEntries: prev.journalEntries.filter((e) => e.id !== id),
      }));
      if (editingId === id) {
        resetForm();
      }
    } catch {
      // Handled via App persistError banner
    }
  };

  const filteredEntries = vault.journalEntries.filter((entry) => {
    const matchesMood = moodFilter === 'Todos' || entry.mood === moodFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      entry.title.toLowerCase().includes(q) ||
      entry.content.toLowerCase().includes(q) ||
      entry.triggersNoticed.toLowerCase().includes(q) ||
      entry.gratitude.toLowerCase().includes(q);
    return matchesMood && matchesQuery;
  });

  const avgStress =
    vault.emotionalLogs.length > 0
      ? (
          vault.emotionalLogs.slice(0, 7).reduce((acc, e) => acc + e.stressLevel, 0) /
          Math.min(7, vault.emotionalLogs.length)
        ).toFixed(1)
      : '—';

  const avgEnergy =
    vault.emotionalLogs.length > 0
      ? (
          vault.emotionalLogs.slice(0, 7).reduce((acc, e) => acc + e.energyLevel, 0) /
          Math.min(7, vault.emotionalLogs.length)
        ).toFixed(1)
      : '—';

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <section className="rounded-2xl border border-[#E3DDD0] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF3EE] text-[#1B4332]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#1B4332]">Diario personal y estado emocional</p>
              <h1 className="mt-0.5 font-display text-2xl font-semibold text-[#14241C]">
                Tu espacio privado de reflexión diaria
              </h1>
              <p className="mt-1 text-sm text-[#4C5E54]">
                Poner en palabras lo que sientes ayuda a descargar tensión y a identificar qué te fortalece cada día.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-4 border-t border-[#E3DDD0] pt-3 text-left sm:w-auto sm:border-t-0 sm:pt-0 sm:text-right">
            <div>
              <p className="text-xs text-[#4C5E54]">Entradas</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-[#14241C]">
                {vault.journalEntries.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#4C5E54]">Energía (7d)</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-[#1B4332]">
                {avgEnergy}/5
              </p>
            </div>
            <div>
              <p className="text-xs text-[#4C5E54]">Estrés (7d)</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-[#14241C]">
                {avgStress}/5
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Write / Edit Journal Entry */}
        <form
          onSubmit={handleSaveEntry}
          className="space-y-4 rounded-2xl border border-[#E3DDD0] bg-white p-6 lg:col-span-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-[#14241C]">
              {editingId ? 'Editar reflexión' : 'Nueva entrada de diario'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-medium text-[#4C5E54] hover:text-[#14241C]"
              >
                Cancelar edición
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-[#991B1B]/25 bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
              {error}
            </div>
          )}

          {savedNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-[#1B4332]/25 bg-[#EBF3EE] p-3 text-xs text-[#1B4332]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Fecha</label>
              <input
                type="date"
                max={todayISO()}
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Estado emocional</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value as MoodState)}
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
              >
                {MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#4C5E54]">Título breve</label>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Cómo atravesé la tarde sin ceder"
              className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3">
              <div className="flex justify-between text-xs font-medium text-[#14241C]">
                <span>Energía</span>
                <span className="font-mono tabular-nums">{energyLevel}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="mt-1.5 w-full accent-[#1B4332]"
              />
            </div>
            <div className="rounded-xl border border-[#E3DDD0] bg-[#FAF8F3] p-3">
              <div className="flex justify-between text-xs font-medium text-[#14241C]">
                <span>Estrés</span>
                <span className="font-mono tabular-nums">{stressLevel}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={stressLevel}
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="mt-1.5 w-full accent-[#1B4332]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#4C5E54]">
              Lo que viví y sentí hoy
            </label>
            <textarea
              rows={5}
              required
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe con honestidad y sin juzgarte: pensamientos, avances, momentos difíciles..."
              className="w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] p-3.5 text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#4C5E54]">
              Detonantes o señales notadas (opcional)
            </label>
            <input
              type="text"
              maxLength={240}
              value={triggersNoticed}
              onChange={(e) => setTriggersNoticed(e.target.value)}
              placeholder="Ej. Cansancio después de las 19:00"
              className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#4C5E54]">
              Algo que agradezco o valoro hoy (opcional)
            </label>
            <input
              type="text"
              maxLength={400}
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="Ej. Haber pedido ayuda a tiempo"
              className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-2.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#143326] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            <span>
              {saving
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Guardar en mi diario'}
            </span>
          </button>
        </form>

        {/* Right: Journal History & Filters */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#E3DDD0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4C5E54]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por palabra, detonante o gratitud..."
                className="min-h-[44px] w-full rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] pl-9 pr-3 text-sm"
              />
            </div>

            <select
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value as 'Todos' | MoodState)}
              aria-label="Filtrar por estado emocional"
              className="min-h-[44px] rounded-xl border border-[#D5CEBF] bg-[#FAF8F3] px-3 text-sm"
            >
              <option value="Todos">Todos los estados</option>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-[#E3DDD0] bg-white p-8 text-center">
              <p className="font-display text-lg font-medium text-[#14241C]">
                {vault.journalEntries.length === 0
                  ? 'Tu diario personal está listo para tu primera página'
                  : 'No hay entradas que coincidan con ese filtro'}
              </p>
              <p className="mt-1 text-sm text-[#4C5E54]">
                Cada reflexión escrita queda guardada solo para tu usuario en Cloud Firestore.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-[#E3DDD0] bg-white p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#4C5E54]">
                        <span className="font-semibold text-[#1B4332]">{entry.mood}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatShortDate(entry.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Energía {entry.energyLevel}/5 · Estrés {entry.stressLevel}/5
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold text-[#14241C]">
                        {entry.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Editar entrada"
                        onClick={() => startEdit(entry)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4C5E54] hover:bg-[#FAF8F3] hover:text-[#1B4332]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar entrada"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4C5E54] hover:bg-[#FEF2F2] hover:text-[#991B1B]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#14241C]">
                    {entry.content}
                  </p>

                  {(entry.triggersNoticed || entry.gratitude) && (
                    <div className="space-y-1 border-t border-[#E3DDD0] pt-3 text-xs text-[#4C5E54]">
                      {entry.triggersNoticed && (
                        <p>
                          <strong className="text-[#14241C]">Detonantes:</strong> {entry.triggersNoticed}
                        </p>
                      )}
                      {entry.gratitude && (
                        <p>
                          <strong className="text-[#1B4332]">Gratitud:</strong> {entry.gratitude}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-[#4C5E54]">
                    Guardado el {formatDateTime(entry.updatedAt || entry.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
