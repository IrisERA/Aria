import { groupTitles } from './grouping';
import type { Title } from './types';

const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

// Little facts about your own watching, built only from what's in your list.
export function funFacts(titles: Title[]): string[] {
  const watched = titles.filter((t) => t.status !== 'want');
  const wants = titles.filter((t) => t.status === 'want' || t.watchlist).length;
  const watches = watched.flatMap((t) => t.watches);
  const withYear = watched.filter((t) => t.year && /^\d{4}$/.test(t.year));
  const facts: string[] = [];

  const top = [...watched].sort((a, b) => b.watches.length - a.watches.length)[0];
  if (top && top.watches.length > 1) facts.push(`Your most rewatched is ${top.name}, ${top.watches.length} times.`);

  const movies = watched.filter((t) => t.kind === 'movie').length;
  if (watched.length >= 4) {
    const pct = Math.round((movies / watched.length) * 100);
    facts.push(pct >= 50 ? `${pct}% of your list is movies.` : `${100 - pct}% of your list is series.`);
  }

  if (withYear.length >= 2) {
    const byYear = [...withYear].sort((a, b) => Number(a.year) - Number(b.year));
    const oldest = byYear[0];
    const newest = byYear[byYear.length - 1];
    facts.push(`The oldest thing on your list is ${oldest.name} from ${oldest.year}.`);
    if (newest.year !== oldest.year) facts.push(`The newest thing on your list is ${newest.name} from ${newest.year}.`);
    const decades = new Map<number, number>();
    for (const t of withYear) {
      const d = Math.floor(Number(t.year) / 10) * 10;
      decades.set(d, (decades.get(d) ?? 0) + 1);
    }
    const [decade, n] = [...decades.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n >= 2) facts.push(`Most of what you watch is from the ${decade}s.`);
  }

  if (watches.length >= 5) {
    const perDay = new Array(7).fill(0);
    for (const w of watches) perDay[new Date(w.at).getDay()]++;
    const best = perDay.indexOf(Math.max(...perDay));
    facts.push(`You log the most on ${DAYS[best]}.`);
  }

  const rated = watched.filter((t) => t.rating);
  if (rated.length) {
    const best = [...rated].sort((a, b) => b.rating! - a.rating!)[0];
    facts.push(`Your highest rated is ${best.name} at ${best.rating} ★.`);
  }
  if (rated.length >= 3) {
    const avg = rated.reduce((s, t) => s + t.rating!, 0) / rated.length;
    facts.push(`You rate things ${avg.toFixed(1)} ★ on average.`);
  }

  const biggest = groupTitles(watched).sort((a, b) => b.items.length - a.items.length)[0];
  if (biggest && biggest.items.length >= 2) facts.push(`${biggest.label} is your biggest series, with ${biggest.items.length} titles.`);

  const genreCounts = new Map<string, number>();
  for (const t of watched) for (const g of t.genres ?? []) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topGenre && topGenre[1] >= 2) facts.push(`Your top genre is ${topGenre[0]}, with ${topGenre[1]} titles.`);

  const favs = watched.filter((t) => t.favorite).length;
  if (favs >= 2) facts.push(`You've starred ${favs} favourites.`);
  if (wants >= 1) facts.push(`${wants} ${wants === 1 ? 'title is' : 'titles are'} waiting on your watchlist.`);

  return facts;
}
