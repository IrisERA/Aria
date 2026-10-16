import type { TitleInfo } from './types';
import { cleanGenres } from './genres';

/*
 * Real movie/series search.
 * - With a free TMDB key (https://www.themoviedb.org/settings/api) in `.env` as
 *   VITE_TMDB_KEY=..., searches TMDB for movies and series with posters.
 * - Without a key, uses IMDb suggestions + iTunes (movies) and TVmaze (series), no key needed.
 * Nothing is stored in the app: titles, posters and descriptions load over the internet.
 */
const TMDB_KEY = import.meta.env.VITE_TMDB_KEY as string | undefined;

async function tmdb(q: string): Promise<TitleInfo[]> {
  const r = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`);
  const data = await r.json();
  return (data.results ?? [])
    .filter((x: any) => x.media_type === 'movie' || x.media_type === 'tv')
    .map((x: any) => ({
      name: x.title ?? x.name,
      kind: x.media_type === 'movie' ? 'movie' : 'series',
      year: (x.release_date ?? x.first_air_date ?? '').slice(0, 4) || undefined,
      poster: x.poster_path ? `https://image.tmdb.org/t/p/w185${x.poster_path}` : undefined,
      description: x.overview || undefined,
    }));
}

// IMDb's public suggestion feed: good at matching titles ("dune part 2", "toy story 3"), no key needed.
async function imdbMovies(q: string): Promise<TitleInfo[]> {
  const r = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(q.toLowerCase())}.json`);
  const data = await r.json();
  return (data.d ?? [])
    .filter((x: any) => x.qid === 'movie' || x.qid === 'tvMovie')
    .slice(0, 8)
    .map((x: any) => ({
      name: x.l,
      kind: 'movie',
      year: x.y ? String(x.y) : undefined,
      poster: x.i?.imageUrl?.replace(/\._V1_.*\.jpg$/, '._V1_SX300.jpg'),
    }));
}

// iTunes, used for movie descriptions. Its movie-only filter returns nothing now, so filter here.
async function itunesMovies(q: string): Promise<TitleInfo[]> {
  const r = await fetch(`https://itunes.apple.com/search?limit=50&term=${encodeURIComponent(q)}`);
  const data = await r.json();
  return (data.results ?? [])
    .filter((x: any) => x.kind === 'feature-movie')
    .map((x: any) => ({
      name: x.trackName,
      kind: 'movie',
      year: x.releaseDate?.slice(0, 4),
      poster: x.artworkUrl100?.replace('100x100', '300x300'),
      description: x.longDescription ?? x.shortDescription,
      genres: cleanGenres([x.primaryGenreName]),
    }));
}

async function tvmazeShows(q: string): Promise<TitleInfo[]> {
  const r = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
  const data = await r.json();
  return data.slice(0, 8).map((x: any) => ({
    name: x.show.name,
    kind: 'series',
    year: x.show.premiered?.slice(0, 4),
    poster: x.show.image?.medium,
    description: x.show.summary?.replace(/<[^>]+>/g, ''),
    genres: cleanGenres(x.show.genres ?? []),
  }));
}

/*
 * Number matching: "dune part 2", "dune part two" and "Dune: Part II" all mean the same,
 * so titles and queries are compared in one normal form (lowercase, no punctuation, digits).
 */
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const ROMAN: Record<string, string> = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .map((w) => (WORDS.includes(w) ? String(WORDS.indexOf(w)) : ROMAN[w] ?? w))
    .join(' ');
}

// The same query with numbers written the other way ("part 2" <-> "part two").
function variant(q: string): string {
  return q.replace(/\b(\d{1,2})\b/g, (d) => WORDS[Number(d)] ?? d).replace(
    new RegExp(`\b(${WORDS.join('|')})\b`, 'gi'),
    (w) => String(WORDS.indexOf(w.toLowerCase())),
  );
}

// How well a title matches the query: share of query words found, plus a bonus for exact matches.
function score(title: TitleInfo, query: string): number {
  const q = normalize(query).split(' ');
  const t = normalize(title.name);
  const words = t.split(' ');
  // "Dune: Part One" is listed as just "Dune": treat "part 1" as optional.
  const needed = q.filter((w, i) => !(w === 'part' && q[i + 1] === '1') && !(w === '1' && q[i - 1] === 'part'));
  const found = needed.filter((w) => words.includes(w)).length / Math.max(needed.length, 1);
  return found + (t === needed.join(' ') ? 1 : 0) + (t.startsWith(needed.join(' ')) ? 0.5 : 0) + (title.description ? 0.1 : 0);
}

const sameTitle = (a: TitleInfo, b: TitleInfo) =>
  a.kind === b.kind && normalize(a.name) === normalize(b.name) && (!a.year || !b.year || a.year === b.year);

async function online(q: string): Promise<TitleInfo[]> {
  if (TMDB_KEY) return tmdb(q);
  const queries = [...new Set([q, variant(q)])];
  const settled = await Promise.allSettled(queries.flatMap((x) => [imdbMovies(x), itunesMovies(x), tvmazeShows(x)]));
  if (settled.every((r) => r.status === 'rejected')) throw (settled[0] as PromiseRejectedResult).reason;
  const all = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // Merge duplicates, keeping whichever copy has a description / poster.
  const merged: TitleInfo[] = [];
  for (const t of all) {
    const i = merged.findIndex((m) => sameTitle(m, t));
    if (i < 0) merged.push(t);
    else merged[i] = { ...t, ...merged[i], description: merged[i].description ?? t.description, genres: merged[i].genres?.length ? merged[i].genres : t.genres, poster: merged[i].poster ?? t.poster, year: merged[i].year ?? t.year };
  }
  return merged
    .map((t, i) => ({ t, s: score(t, q), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, 12)
    .map(({ t }) => t);
}

export async function searchTitles(q: string): Promise<TitleInfo[]> {
  return online(q);
}
