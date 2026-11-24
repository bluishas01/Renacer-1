export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function localDateTimeInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${min}`;
}

export function calculateDaysInRecovery(startIso: string): { days: number; hours: number } {
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return { days: 0, hours: 0 };
  const diffMs = Math.max(0, Date.now() - start);
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days, hours };
}

export function getNextMilestone(days: number): { target: number; label: string } {
  const milestones = [
    { target: 1, label: 'Primeras 24 horas' },
    { target: 3, label: '72 horas de claridad' },
    { target: 7, label: 'Primera semana' },
    { target: 14, label: 'Dos semanas firmes' },
    { target: 30, label: 'Primer mes' },
    { target: 60, label: '60 días' },
    { target: 90, label: '90 días' },
    { target: 180, label: '6 meses' },
    { target: 365, label: '1 año' },
  ];
  for (const m of milestones) {
    if (days < m.target) return m;
  }
  const nextYear = Math.ceil((days + 1) / 365) * 365;
  return { target: nextYear, label: `${nextYear} días` };
}

export function formatShortDate(iso: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getLast7DateKeys(): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    keys.push(`${y}-${m}-${day}`);
  }
  return keys;
}
