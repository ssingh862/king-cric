import { format, isToday, isTomorrow } from 'date-fns';

export function matchDayKey(value?: string | null) {
  if (!value) return 'unscheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unscheduled';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function matchDayParts(key: string): { prefix?: string; date: string } {
  if (key === 'unscheduled') return { date: 'Date not set' };
  const date = new Date(`${key}T12:00:00`);
  const written = format(date, 'EEE, d MMM yyyy');
  if (isToday(date)) return { prefix: 'Today', date: written };
  if (isTomorrow(date)) return { prefix: 'Tomorrow', date: written };
  return { date: written };
}

export function matchDayLabel(key: string) {
  const parts = matchDayParts(key);
  return parts.prefix ? `${parts.prefix} · ${parts.date}` : parts.date;
}

export function formatMatchDate(value?: string | null) {
  return matchDayLabel(matchDayKey(value));
}

export function groupMatchesByDate<T extends { scheduled_at?: string | null }>(matches: T[], order: 'asc' | 'desc') {
  const sorted = [...matches].sort((a, b) => {
    const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    const bt = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
    return order === 'asc' ? at - bt : bt - at;
  });
  const groups = new Map<string, T[]>();
  for (const match of sorted) {
    const key = matchDayKey(match.scheduled_at);
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  return [...groups.entries()];
}
