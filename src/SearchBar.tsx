import { useEffect, useRef, useState } from 'react';
import { searchTitles } from './search';
import { Film, Search } from 'lucide-react';
import type { Kind, TitleInfo } from './types';

const keyOf = (t: TitleInfo) => `${t.kind}:${t.name.toLowerCase()}:${t.year ?? ''}`;

// `mine` are titles the user already has; matches are shown first.
// Results stay open after adding, so you can add several; they close when the
// search is cleared, on Esc, or when you click somewhere else.
// `owned` marks results that are already added (e.g. "In your list") so nobody adds them twice.
export type Owned = { label: string; done: boolean } | null;

export default function SearchBar({ onPick, mine = [], owned }: {
  onPick: (t: TitleInfo) => void;
  mine?: TitleInfo[];
  owned?: (t: TitleInfo) => Owned;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<TitleInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<Kind>('movie');
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    setLoading(true);
    const timer = setTimeout(() => {
      searchTitles(q)
        .then((r) => { setResults(r); setFailed(false); })
        .catch(() => { setResults([]); setFailed(true); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Close on a click outside the search.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const query = q.trim().toLowerCase();
  const same = (a: TitleInfo, b: TitleInfo) => a.name.toLowerCase() === b.name.toLowerCase() && a.kind === b.kind;
  const mineHits = query.length >= 2 ? mine.filter((t) => t.name.toLowerCase().includes(query)) : [];
  const rows = [
    ...mineHits.map((t) => ({ t, mine: true })),
    ...results.filter((r) => !mineHits.some((m) => same(m, r))).map((t) => ({ t, mine: false })),
  ];

  function pick(t: TitleInfo) {
    if (added.has(keyOf(t)) || owned?.(t)?.done) return;
    onPick(t);
    setAdded((s) => new Set(s).add(keyOf(t)));
  }

  function change(value: string) {
    setQ(value);
    setOpen(true);
    if (!value.trim()) setAdded(new Set());
  }

  return (
    <div className="search" ref={box}>
      <span className="search-icon" aria-hidden="true"><Search size={18} strokeWidth={1.9} /></span>
      <input
        value={q}
        onChange={(e) => change(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        id="search"
        type="search"
        autoComplete="off"
        placeholder="Search a movie or series…"
      />
      {open && q.trim().length >= 2 && (
        <ul className="results">
          {loading && rows.length === 0 && <li className="hint">Searching…</li>}
          {!loading && rows.length === 0 && (
            <li className="hint">{failed ? "Can't reach the movie database. Check your internet connection." : 'No matches found.'}</li>
          )}
          {rows.map(({ t: r, mine }, i) => {
            const have = owned?.(r) ?? null;
            const justAdded = added.has(keyOf(r));
            const done = justAdded || !!have?.done;
            return (
              <li key={i} className={[mine && 'mine', done && 'added'].filter(Boolean).join(' ') || undefined} onClick={() => pick(r)} aria-disabled={done}>
                {r.poster ? <img src={r.poster} alt="" /> : <div className="noposter"><Film size={20} strokeWidth={1.5} /></div>}
                <div className="info">
                  <strong>{r.name}</strong>
                  <span className="hint">
                    {!justAdded && have && !have.done && <span className="tag">{have.label}</span>}
                    {mine && !have && <span className="tag">In All</span>}
                    {r.kind === 'movie' ? 'Movie' : 'Series'}{r.year && ` · ${r.year}`}
                  </span>
                  {r.description && <span className="desc">{r.description}</span>}
                </div>
                {justAdded ? (
                  <span className="added-badge" role="status"><span className="tick">✓</span> Added</span>
                ) : have?.done ? (
                  <span className="owned-badge"><span className="tick">✓</span> {have.label}</span>
                ) : (
                  <span className="add-btn">+ Add</span>
                )}
              </li>
            );
          })}
          {!loading && (
            <li className="manual">
              <span>Not listed? Add “{q.trim()}” as</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} onClick={(e) => e.stopPropagation()}>
                <option value="movie">Movie</option>
                <option value="series">Series</option>
              </select>
              {added.has(keyOf({ name: q.trim(), kind }))
                ? <span className="added-badge"><span className="tick">✓</span> Added</span>
                : <button className="primary" onClick={() => pick({ name: q.trim(), kind })}>Add</button>}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
