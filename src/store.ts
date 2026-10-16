import { useEffect, useState } from 'react';
import { onWatchlist, type Source, type Title, type TitleInfo } from './types';

const KEY = 'aria.list';
const TRASH_KEY = 'aria.deleted';
const KEEP_DAYS = 30;

export interface Deleted {
  title: Title;
  at: string; // when it was removed
}

function loadTrash(): Deleted[] {
  try {
    const saved: Deleted[] = JSON.parse(localStorage.getItem(TRASH_KEY) ?? '[]');
    const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
    return saved.filter((d) => Date.parse(d.at) >= cutoff);
  } catch {
    return [];
  }
}

// Only the title's own info, not extra fields from wherever it came from.
const pick = ({ name, kind, year, poster, description, genres }: TitleInfo): TitleInfo => ({ name, kind, year, poster, description, genres });

function load(): Title[] {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function useTitles() {
  const [titles, setTitles] = useState<Title[]>(load);
  const [deleted, setDeleted] = useState<Deleted[]>(loadTrash);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(titles));
    } catch {}
  }, [titles]);

  useEffect(() => {
    try {
      localStorage.setItem(TRASH_KEY, JSON.stringify(deleted));
    } catch {}
  }, [deleted]);

  // Logs a watch; creates the title if it's new. Used by both the UI and detectors.
  // A title on the watchlist stays there unless `leaveWatchlist` (the watchlist's own "✓ Watched").
  function logWatch(info: TitleInfo, source: Source = 'manual', leaveWatchlist = false) {
    const watch = { at: new Date().toISOString(), source };
    const name = info.name.trim();
    setTitles((prev) => {
      const match = prev.find((t) => t.name.toLowerCase() === name.toLowerCase() && t.kind === info.kind);
      if (match) {
        return prev.map((t) => (t === match
          ? { ...t, status: undefined, watchlist: !leaveWatchlist && onWatchlist(t) ? true : undefined, watches: [...t.watches, watch] }
          : t));
      }
      return [{ ...pick(info), name, id: crypto.randomUUID(), favorite: false, watches: [watch] }, ...prev];
    });
  }

  // Adds a title to the watchlist ("want to watch"). Already-watched titles are kept on it too.
  function addWant(info: TitleInfo) {
    const name = info.name.trim();
    setTitles((prev) => {
      const match = prev.find((t) => t.name.toLowerCase() === name.toLowerCase() && t.kind === info.kind);
      if (match) return onWatchlist(match) ? prev : prev.map((t) => (t === match ? { ...t, watchlist: true } : t));
      return [{ ...pick(info), name, id: crypto.randomUUID(), favorite: false, watches: [], status: 'want' }, ...prev];
    });
  }

  // Takes a title off the watchlist; one that was never watched is removed (to Recently deleted).
  function removeFromWatchlist(id: string) {
    const t = titles.find((x) => x.id === id);
    if (!t) return;
    if (t.status === 'want') return remove(id);
    setTitles((prev) => prev.map((x) => (x.id === id ? { ...x, watchlist: undefined } : x)));
  }

  // Removes a title from your watched list. If it's also on the watchlist it stays there.
  function removeWatched(id: string) {
    const t = titles.find((x) => x.id === id);
    if (!t) return;
    if (!onWatchlist(t)) return remove(id);
    setTitles((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'want', watchlist: undefined, watches: [] } : x)));
  }

  // Puts a title back exactly as it was (for Undo).
  function putBack(title: Title) {
    setTitles((prev) => (prev.some((t) => t.id === title.id) ? prev.map((t) => (t.id === title.id ? title : t)) : [title, ...prev]));
  }

  function setGenres(id: string, genres: string[]) {
    setTitles((prev) => prev.map((t) => (t.id === id ? { ...t, genres } : t)));
  }

  function setRating(id: string, rating: number | undefined) {
    setTitles((prev) => prev.map((t) => (t.id === id ? { ...t, rating } : t)));
  }

  // Watchlist on/off for a title (watched titles keep their history either way).
  function setWant(id: string, want: boolean) {
    setTitles((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      if (want) return t.watches.length ? { ...t, watchlist: true } : { ...t, status: 'want' };
      return { ...t, watchlist: undefined };
    }));
  }

  // Moves a title to where another one sits (drag and drop).
  function move(fromId: string, toId: string) {
    setTitles((prev) => {
      const from = prev.findIndex((t) => t.id === fromId);
      const to = prev.findIndex((t) => t.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function undoWatch(id: string) {
    setTitles((prev) => prev.map((t) => (t.id === id ? { ...t, watches: t.watches.slice(0, -1) } : t)));
  }

  function toggleFavorite(id: string) {
    setTitles((prev) => prev.map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t)));
  }

  // Removing keeps a copy in "Recently deleted" so it can be restored.
  function trash(gone: Title[]) {
    const at = new Date().toISOString();
    setDeleted((prev) => [...gone.map((title) => ({ title, at })), ...prev.filter((d) => !gone.some((t) => t.id === d.title.id))]);
  }

  function remove(id: string) {
    const gone = titles.find((t) => t.id === id);
    if (gone) trash([gone]);
    setTitles((prev) => prev.filter((t) => t.id !== id));
  }

  function clearAll() {
    trash(titles);
    setTitles([]);
  }

  // Puts deleted titles back (skipping any that were added again since).
  function restore(ids: string[]) {
    const back = deleted.filter((d) => ids.includes(d.title.id)).map((d) => d.title);
    setTitles((prev) => [...back.filter((b) => !prev.some((t) => t.id === b.id || (t.name === b.name && t.kind === b.kind))), ...prev]);
    setDeleted((prev) => prev.filter((d) => !ids.includes(d.title.id)));
  }

  function purge(ids?: string[]) {
    setDeleted((prev) => (ids ? prev.filter((d) => !ids.includes(d.title.id)) : []));
  }

  return { titles, setTitles, setGenres, deleted, restore, purge, logWatch, addWant, removeFromWatchlist, removeWatched, putBack, setRating, setWant, undoWatch, toggleFavorite, remove, move, clearAll };
}
