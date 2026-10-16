import { useEffect, useState } from 'react';
import Stars from './Stars';
import { Film, Link2 } from 'lucide-react';
import { loadShare, type SharedList } from './share';
import type { TitleInfo } from './types';

// The public page someone sees when they open a shared list link (/s/<code>).
export default function SharedView({ id, onWant, alreadyHave }: {
  id: string;
  onWant: (t: TitleInfo) => void;
  alreadyHave: (t: TitleInfo) => boolean;
}) {
  const [list, setList] = useState<SharedList | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadShare(id).then(setList).catch(() => setFailed(true));
  }, [id]);

  useEffect(() => {
    if (list) document.title = `${list.title} · ARIA`;
  }, [list]);

  const home = () => {
    window.history.replaceState(null, '', '/');
    window.location.reload();
  };

  return (
    <main className="card shared">
      <header className="sharedhead">
        <a href="/" className="brand brandlink" onClick={(e) => { e.preventDefault(); home(); }}>
          <img src="/aria-logo.png" alt="" className="logo-mark" />ARIA
        </a>
        <button className="primary" onClick={home}>Make your own list</button>
      </header>

      {list === undefined && !failed && <p className="hint">Loading the list…</p>}
      {(failed || list === null) && (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true"><Link2 size={34} strokeWidth={1.5} /></span>
          <p>{failed ? "Couldn't load this list. Check your internet and try again." : 'This list is no longer shared, or the link is wrong.'}</p>
        </div>
      )}

      {list && (<>
        <h1 className="sharedtitle">{list.title}</h1>
        <p className="hint">
          {list.owner_name ? `Shared by ${list.owner_name}` : 'A shared list'} · {list.items.length} {list.items.length === 1 ? 'title' : 'titles'} · updated {new Date(list.updated_at).toLocaleDateString()}
        </p>
        <ul className="list sharedlist">
          {list.items.map((t, i) => {
            const have = added.has(i) || alreadyHave(t);
            return (
              <li key={i} className="item">
                <div className="itemrow">
                  <span className="num">#{i + 1}</span>
                  {t.poster && /^https:\/\//.test(t.poster) ? <img src={t.poster} alt="" referrerPolicy="no-referrer" /> : <div className="noposter"><Film size={20} strokeWidth={1.5} /></div>}
                  <div className="info">
                    <strong>{t.name}</strong>
                    <span className="hint">
                      {t.kind === 'movie' ? 'Movie' : 'Series'}{t.year && ` · ${t.year}`}{!!t.genres?.length && ` · ${t.genres.slice(0, 2).join(', ')}`}
                    </span>
                    {t.rating && <Stars value={t.rating} size={14} />}
                  </div>
                  {have ? (
                    <span className="added-badge"><span className="tick">✓</span> Saved</span>
                  ) : (
                    <button className="quick" onClick={() => { onWant(t); setAdded((s) => new Set(s).add(i)); }}>+ Watchlist</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="cta">
          <b>Keep track of what you watch</b>
          <p className="hint">ARIA is free, with zero ads. Make your own lists and share them with friends.</p>
          <button className="primary" onClick={home}>Start my ARIA</button>
        </div>
      </>)}
    </main>
  );
}
