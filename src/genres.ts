import { useEffect, useRef } from 'react';
import { normalize } from './search';
import type { Title, TitleInfo } from './types';

/*
 * Genres come from the search sources (TVmaze for series, iTunes for movies)
 * and are mapped to one shared set of names, so "Sci-Fi & Fantasy" and
 * "Science-Fiction" both become "Sci-Fi".
 */
const MAP: Record<string, string[]> = {
  'action & adventure': ['Action', 'Adventure'],
  'sci-fi & fantasy': ['Sci-Fi', 'Fantasy'],
  'science-fiction': ['Sci-Fi'],
  'kids & family': ['Family'],
  children: ['Family'],
  musicals: ['Music'],
  'music': ['Music'],
  classics: ['Classic'],
  foreign: ['World cinema'],
  'independent': ['Indie'],
  'romance': ['Romance'],
  'espionage': ['Thriller'],
  'legal': ['Crime'],
  'medical': ['Drama'],
  'food': ['Lifestyle'],
  'travel': ['Lifestyle'],
  'nature': ['Documentary'],
};

export function cleanGenres(raw: (string | undefined)[]): string[] {
  const out = raw.flatMap((g) => (g ? MAP[g.toLowerCase()] ?? [g.trim()] : []));
  return [...new Set(out.filter(Boolean))];
}

// Looks up genres for a title saved before genres existed.
async function lookup(t: Title): Promise<string[]> {
  if (t.kind === 'series') {
    const r = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(t.name)}`);
    if (!r.ok) return [];
    const show = await r.json();
    return normalize(show.name ?? '') === normalize(t.name) ? cleanGenres(show.genres ?? []) : [];
  }
  const r = await fetch(`https://itunes.apple.com/search?limit=50&term=${encodeURIComponent(t.name)}`);
  const data = await r.json();
  const movie = (data.results ?? []).find(
    (x: any) => x.kind === 'feature-movie' && normalize(x.trackName) === normalize(t.name) && (!t.year || x.releaseDate?.startsWith(t.year)),
  ) ?? (data.results ?? []).find((x: any) => x.kind === 'feature-movie' && normalize(x.trackName) === normalize(t.name));
  return movie ? cleanGenres([movie.primaryGenreName]) : [];
}

// Fills in genres for older titles, one at a time so the free services aren't flooded.
export function useGenreBackfill(titles: Title[], setGenres: (id: string, genres: string[]) => void) {
  const busy = useRef(false);
  useEffect(() => {
    const todo = titles.filter((t) => !t.genres);
    if (busy.current || todo.length === 0) return;
    busy.current = true;
    (async () => {
      for (const t of todo) {
        try {
          setGenres(t.id, await lookup(t));
        } catch {
          // Offline or rate-limited: try again next time ARIA opens.
          break;
        }
        await new Promise((r) => setTimeout(r, 700));
      }
      busy.current = false;
    })();
  }, [titles.length]);
}

export const hasGenre = (t: TitleInfo, genre: string) => !!t.genres?.includes(genre);
