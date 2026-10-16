import { normalize } from './search';
import type { Title } from './types';

/*
 * Smart grouping: films and shows from the same series stick together
 * ("Dune", "Dune: Part Two" → Dune; "Toy Story 3" → Toy Story), groups in A–Z order.
 */

// The series a title belongs to: its name before any subtitle, without "The" or a part number.
export function seriesKey(name: string): string {
  const main = name.split(/:| - | – /)[0];
  return normalize(main)
    .replace(/^(the|a|an) /, '')
    .replace(/( part)? \d+$/, '')
    .trim() || normalize(name);
}

// Sort name for A–Z: ignores a leading "The" / "A" / "An".
const sortName = (name: string) => normalize(name).replace(/^(the|a|an) /, '');

export interface Group {
  key: string;
  label: string;
  items: Title[];
}

// Groups by each title's main (first) genre, genres A–Z, titles A–Z inside; no genre goes last.
export function groupByGenre(titles: Title[]): Group[] {
  const groups = new Map<string, Title[]>();
  for (const t of titles) {
    const g = t.genres?.[0] ?? 'Other';
    groups.set(g, [...(groups.get(g) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([g, items]) => ({
      key: `genre:${g}`,
      label: g,
      items: [...items].sort((a, b) => sortName(a.name).localeCompare(sortName(b.name)) || (a.year ?? '').localeCompare(b.year ?? '')),
    }))
    .sort((a, b) => (a.label === 'Other' ? 1 : b.label === 'Other' ? -1 : a.label.localeCompare(b.label)));
}

export function groupTitles(titles: Title[]): Group[] {
  const groups = new Map<string, Title[]>();
  for (const t of titles) {
    const key = seriesKey(t.name);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([key, items]) => {
      // Inside a group: oldest first, so parts come in order.
      const sorted = [...items].sort((a, b) => (a.year ?? '9999').localeCompare(b.year ?? '9999') || sortName(a.name).localeCompare(sortName(b.name)));
      return { key, label: sorted[0].name.split(/:| - | – /)[0].trim(), items: sorted };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}
