import type { Title } from './types';

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// Consecutive days (ending today or yesterday) with at least one watch.
export function streak(titles: Title[]): number {
  const days = new Set(titles.flatMap((t) => t.watches.map((w) => w.at.slice(0, 10))));
  let d = new Date();
  if (!days.has(dayKey(d))) d = new Date(d.getTime() - DAY);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = new Date(d.getTime() - DAY);
  }
  return n;
}

export function stats(titles: Title[]) {
  titles = titles.filter((t) => t.status !== 'want');
  const all = titles.flatMap((t) => t.watches);
  const weekAgo = Date.now() - 7 * DAY;
  return {
    total: all.length,
    thisWeek: all.filter((w) => Date.parse(w.at) >= weekAgo).length,
    titles: titles.length,
    top: [...titles].sort((a, b) => b.watches.length - a.watches.length)[0],
  };
}

// A favorite you haven't watched for the longest time (at least `days` days).
export function rewatchPick(titles: Title[], days = 14): Title | undefined {
  const last = (t: Title) => Date.parse(t.watches[t.watches.length - 1]?.at ?? '0');
  return titles
    .filter((t) => t.favorite && t.watches.length > 0 && Date.now() - last(t) >= days * DAY)
    .sort((a, b) => last(a) - last(b))[0];
}

export interface Badge { icon: string; name: string; earned: boolean }

export function badges(titles: Title[]): Badge[] {
  const s = stats(titles);
  const maxRewatch = s.top?.watches.length ?? 0;
  return [
    { icon: '🎬', name: 'First watch', earned: s.total >= 1 },
    { icon: '📚', name: '10 titles', earned: s.titles >= 10 },
    { icon: '🔁', name: 'Rewatched 3×', earned: maxRewatch >= 3 },
    { icon: '🔥', name: '7-day streak', earned: streak(titles) >= 7 },
    { icon: '🏆', name: '50 watches', earned: s.total >= 50 },
  ];
}
