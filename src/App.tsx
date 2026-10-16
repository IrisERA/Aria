import { useEffect, useState } from 'react';
import { useTitles } from './store';
import { noopDetector } from './detection';
import { rewatchPick, stats, streak } from './insights';
import SearchBar from './SearchBar';
import Stars from './Stars';
import Lists, { useLists } from './Lists';
import { groupColor, useSettings } from './settings';
import { authReady, useAuth } from './auth';
import { useCloudSync } from './sync';
import { greeting } from './greeting';
import { funFacts } from './facts';
import Welcome, { hasSeenWelcome } from './Welcome';
import { hasGenre, useGenreBackfill } from './genres';
import { groupByGenre, groupTitles } from './grouping';
import { SettingsSheet, type Section } from './Panels';
import type { Kind } from './types';

const SYNC_TEXT = {
  off: 'Not signed in',
  syncing: 'Saving…',
  synced: 'Saved to your account',
  offline: "Can't reach the cloud. Saved on this device.",
  'needs-setup': 'Cloud sync needs a one-time setup',
};

type Filter = 'all' | Kind | 'favorites' | 'want' | 'lists';

export default function App() {
  const { titles, setTitles, setGenres, deleted, restore, purge, logWatch, addWant, setRating, setWant, undoWatch, toggleFavorite, remove, move, clearAll } = useTitles();
  const { settings, update, replace: replaceSettings } = useSettings();
  const auth = useAuth();
  const name = settings.name || auth.user?.name || '';
  const [panel, setPanel] = useState<Section | null>(null);
  const [lastSection, setLastSection] = useState<Section>('customise');
  const [filter, setFilter] = useState<Filter>(settings.startTab);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pickKey, setPickKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // The greeting's line is picked once per visit so it doesn't change while you use ARIA.
  const [hello] = useState(() => greeting(''));
  const greet = greeting(name);
  const [genre, setGenre] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(() => !hasSeenWelcome());
  const [guestNoteHidden, setGuestNoteHidden] = useState(() => {
    try { return localStorage.getItem('aria.guestNoteHidden') === '1'; } catch { return false; }
  });
  function hideGuestNote() {
    setGuestNoteHidden(true);
    try { localStorage.setItem('aria.guestNoteHidden', '1'); } catch {}
  }
  const [factSeed] = useState(() => Math.random());
  const [undo, setUndo] = useState<{ ids: string[]; text: string } | null>(null);
  const [dropListId, setDropListId] = useState<string | null>(null);
  const [openListId, setOpenListId] = useState<string | null>(null);
  const lists = useLists();
  useGenreBackfill(titles, setGenres);
  const { state: sync, flush } = useCloudSync(auth.user?.id, { titles, lists: lists.lists, settings }, (s) => {
    setTitles(s.titles);
    lists.setLists(s.lists);
    replaceSettings(s.settings);
  });

  // Closes settings on Escape (clicking outside is handled by the sheet's backdrop).
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panel]);

  function openSettings(section: Section) {
    setPanel(section);
    setLastSection(section);
  }

  // Signing out saves your data to your account, then clears it from this device,
  // so the next person on this browser starts with an empty ARIA.
  async function signOut() {
    const saved = await flush();
    await auth.signOut();
    setPanel(null);
    // If the latest changes couldn't be saved (offline), keep them here rather than lose them.
    if (!saved) return;
    setTitles([]);
    lists.setLists([]);
    purge();
    replaceSettings({});
  }

  function removeTitle(id: string, title: string) {
    remove(id);
    setUndo({ ids: [id], text: `Removed ${title}` });
  }

  function clearList() {
    setUndo({ ids: titles.map((t) => t.id), text: `Cleared ${titles.length} titles` });
    clearAll();
  }

  // The Undo bar disappears after a few seconds.
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(timer);
  }, [undo]);

  useEffect(() => {
    noopDetector.start((d) => logWatch(d, 'audio'));
    return () => noopDetector.stop();
  }, []);

  const st = stats(titles);
  const days = streak(titles);
  const pick = rewatchPick(titles, settings.rewatchDays);
  const facts = funFacts(titles);

  // Drops the dragged title into a custom list ('new' makes a list first).
  function dropInto(listId: string) {
    const title = titles.find((t) => t.id === dragId);
    if (title) lists.addItem(listId === 'new' ? lists.create('My list') : listId, title);
    setDragId(null);
    setOverId(null);
    setDropListId(null);
  }

  // Shown in the user's own order (drag to rearrange).
  const watched = titles.filter((t) => t.status !== 'want');
  const wants = titles.filter((t) => t.status === 'want');
  const inTab = filter === 'want'
    ? wants
    : watched.filter((t) => filter === 'all' || (filter === 'favorites' ? t.favorite : t.kind === filter));
  // Genres found in this tab, most common first.
  const genreCounts = new Map<string, number>();
  for (const t of inTab) for (const g of t.genres ?? []) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  const tabGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
  const shown = genre && tabGenres.includes(genre) ? inTab.filter((t) => hasGenre(t, genre)) : inTab;

  return (
    <main className="card app">
      <aside className="side">
      <header className="top">
        <div>
          <h1 className="brand"><img src="/aria-logo.png" alt="" className="logo-mark" />ARIA</h1>
          <p className="greeting">
            <span className="hello">{greet.hello}</span>
            <span className="line">{hello.line}</span>
          </p>
        </div>
        <div className="corner">
          <button className="icon" aria-label="Settings" onClick={() => openSettings(lastSection)}>⚙</button>
          <button className="avatar" aria-label="Account" title={SYNC_TEXT[sync]} onClick={() => openSettings('account')}>
            {auth.user?.photo
              ? <img src={auth.user.photo} alt="" referrerPolicy="no-referrer" />
              : (name || '?')[0].toUpperCase()}
          </button>
        </div>
        {welcome && !panel && (
          <Welcome signedIn={!!auth.user} onClose={() => setWelcome(false)} onSignIn={() => openSettings('account')} />
        )}
        {panel && (
          <SettingsSheet section={panel} setSection={openSettings} onClose={() => setPanel(null)}
            settings={settings} update={update} stats={st} auth={{ ...auth, signOut }} sync={sync} onClear={clearList} trash={{ deleted, restore, purge }}
            onShowWelcome={() => { setPanel(null); setWelcome(true); }} />
        )}
      </header>

      {filter !== 'lists' && filter !== 'want' && settings.showStats && watched.length > 0 && (<>
      <section className="stats">
        <div><b>{days}🔥</b><span>day streak</span></div>
        <div><b>{st.thisWeek}</b><span>this week</span></div>
        <div><b>{st.total}</b><span>total watches</span></div>
      </section>
      {facts.length > 0 && (
        <p className="fact">
          <span>💡 {facts[Math.floor(factSeed * facts.length)]}</span>
        </p>
      )}

      {pick && (
        <div className="pick">
          <span>It's been a while since <b>{pick.name}</b>. Watch it again?</span>
          <button className="primary" onClick={() => logWatch(pick)}>Watched it</button>
        </div>
      )}

      </>)}

      {authReady && !auth.user && !guestNoteHidden && titles.length > 0 && (
        <div className="guestnote" role="note">
          <span>You're using ARIA without an account. Your list is only saved on this device.</span>
          <div className="row">
            <button className="primary" onClick={() => openSettings('account')}>Sign in to keep it safe</button>
            <button className="linkbtn" onClick={hideGuestNote}>Not now</button>
          </div>
        </div>
      )}

      <div className="tabs">
        {(['all', 'movie', 'series', 'favorites', 'want', 'lists'] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? 'tab active' : 'tab'} onClick={() => setFilter(f)}>
            {{ all: 'All', movie: 'Movies', series: 'Series', favorites: '★ Favorites', want: `🍿 Watchlist${wants.length ? ` (${wants.length})` : ''}`, lists: '📝 My lists' }[f]}
          </button>
        ))}
      </div>
      </aside>

      <section className="content">
      {filter !== 'lists' && <SearchBar mine={filter === 'want' ? [] : undefined} onPick={(t) => (filter === 'want' ? addWant(t) : logWatch(t))} />}
      {filter === 'want' && wants.length > 0 && <p className="hint">Search above to add something you want to watch.</p>}

      {filter === 'lists' ? <Lists store={lists} mine={watched} openId={openListId} setOpenId={setOpenListId} /> : (<>
      {shown.length === 0 && (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">{{ all: '🎬', movie: '🎥', series: '📺', favorites: '★', want: '🍿', lists: '📝' }[filter]}</span>
          <p>{{
            all: 'Nothing here yet. Search above for a movie or series you\'ve watched and tap it to add it.',
            movie: 'No movies yet. Search above to add one.',
            series: 'No series yet. Search above to add one.',
            favorites: 'No favourites yet. Tap the ☆ next to any title to make it a favourite.',
            want: 'Nothing here yet. Search above to save something for later.',
            lists: '',
          }[filter]}</p>
        </div>
      )}
      {inTab.length > 0 && (
        <div className="row sortrow">
          <span className="hint">Sort:</span>
          <button className={settings.sort === 'mine' ? 'tab active' : 'tab'} onClick={() => update({ sort: 'mine' })}>My order</button>
          <button className={settings.sort === 'az' ? 'tab active' : 'tab'} onClick={() => update({ sort: 'az' })}>A–Z, series together</button>
          <button className={settings.sort === 'genre' ? 'tab active' : 'tab'} onClick={() => update({ sort: 'genre' })}>By genre</button>
          {tabGenres.length > 0 && (
            <select
              className={genre && tabGenres.includes(genre) ? 'tab genreselect active' : 'tab genreselect'}
              value={genre && tabGenres.includes(genre) ? genre : ''}
              onChange={(e) => setGenre(e.target.value || null)}
              aria-label="Filter by genre"
            >
              <option value="">All genres</option>
              {tabGenres.map((g) => <option key={g} value={g}>{g} ({genreCounts.get(g)})</option>)}
            </select>
          )}
        </div>
      )}
      {shown.length > 0 && (
        <p className="hint draghint">
          {settings.sort === 'mine'
            ? 'Drag ⠿ to put them in your order, or drag onto a list at the bottom to add it there.'
            : 'Drag ⠿ onto a list at the bottom to add it there.'}
        </p>
      )}
      <ul className="list">
        {(settings.sort !== 'mine'
          ? (settings.sort === 'genre' ? groupByGenre(shown) : groupTitles(shown)).flatMap((g) => {
              const color = settings.groupColors ? groupColor(settings, g.key, g.items.length) : undefined;
              return [{ header: g, color }, ...g.items.map((t) => ({ t, color }))];
            })
          : shown.map((t) => ({ t, color: undefined as string | undefined }))
        ).map((row) => {
          if ('header' in row) {
            const g = row.header;
            const picking = pickKey === g.key;
            const choices = [...new Set([...settings.sizeColors, '#ec4899', '#14b8a6', '#a3a3a3'])];
            return (
              <li key={`g-${g.key}`} className="grouphead">
                {row.color ? (
                  <button className="bubble" style={{ background: row.color }} onClick={() => setPickKey(picking ? null : g.key)} title="Change this group's colour">
                    {g.label}{g.items.length > 1 && <span> · {g.items.length}</span>}
                  </button>
                ) : (
                  <>{g.label}{g.items.length > 1 && <span className="hint"> · {g.items.length}</span>}</>
                )}
                {picking && row.color && (
                  <div className="swatches">
                    {choices.map((c) => (
                      <button key={c} className="swatch" style={{ background: c }} aria-label={`Colour ${c}`}
                        onClick={() => { update({ customColors: { ...settings.customColors, [g.key]: c } }); setPickKey(null); }} />
                    ))}
                    <button className="linkbtn" onClick={() => {
                      const { [g.key]: _, ...rest } = settings.customColors;
                      update({ customColors: rest });
                      setPickKey(null);
                    }}>Auto</button>
                  </div>
                )}
              </li>
            );
          }
          const t = row.t;
          const color = row.color;
          const last = t.watches[t.watches.length - 1];
          const open = expanded === t.id;
          return (
            <li
              key={t.id}
              draggable={!open}
              className={['item', open && 'open', dragId === t.id && 'dragging', settings.sort === 'mine' && overId === t.id && dragId !== t.id && 'over'].filter(Boolean).join(' ')}
              style={color ? { borderLeft: `4px solid ${color}` } : undefined}
              onDragStart={() => setDragId(t.id)}
              onDragOver={(e) => { e.preventDefault(); setOverId(t.id); }}
              onDrop={() => { if (dragId && settings.sort === 'mine') move(dragId, t.id); setDragId(null); setOverId(null); }}
              onDragEnd={() => { setDragId(null); setOverId(null); setDropListId(null); }}
            >
              <div className="itemrow">
              <span className="handle">⠿</span>
              {settings.showPosters && (t.poster ? <img src={t.poster} alt="" /> : <div className="noposter">🎬</div>)}
              <div className="info">
                <strong>
                  <button className="star" onClick={() => toggleFavorite(t.id)} aria-label="Favorite">
                    {t.favorite ? '★' : '☆'}
                  </button>
                  {t.name}
                </strong>
                <span className="hint">
                  {t.kind === 'movie' ? 'Movie' : 'Series'}
                  {t.year && ` · ${t.year}`}
                  {!!t.genres?.length && ` · ${t.genres.slice(0, 2).join(', ')}`}
                  {t.watches.length > 1 && ` · ${t.watches.length}×`}
                  {last && ` · last ${new Date(last.at).toLocaleDateString()}`}
                </span>
                {t.rating && <Stars value={t.rating} size={14} />}
                {t.description && !settings.compact && !open && <span className="desc">{t.description}</span>}
                <button className="more" onClick={() => setExpanded(open ? null : t.id)} aria-expanded={open}>
                  {open ? '▲ Less' : '▼ More'}
                </button>
              </div>
              {t.status === 'want' && <button className="primary quick" onClick={() => logWatch(t)}>✓ Watched</button>}
              <button className="del" onClick={() => removeTitle(t.id, t.name)} aria-label="Remove">✕</button>
              </div>
              {open && (
                <div className="details">
                  <h4>About</h4>
                  {!!t.genres?.length && <div className="genres">{t.genres.map((g) => <span key={g} className="genre">{g}</span>)}</div>}
                  <p className="fulldesc">{t.description || 'No description yet.'}</p>
                  <h4>Your rating</h4>
                  <Stars value={t.rating} onChange={(r) => setRating(t.id, r)} />
                  <h4>Status</h4>
                  <div className="row">
                    <button className={t.status !== 'want' ? 'tab active' : 'tab'} onClick={() => (t.watches.length ? setWant(t.id, false) : logWatch(t))}>✓ Watched</button>
                    <button className={t.status === 'want' ? 'tab active' : 'tab'} onClick={() => setWant(t.id, true)}>🍿 Want to watch</button>
                  </div>
                  {t.status !== 'want' && (<>
                    <h4>Times watched</h4>
                    <div className="count">
                      <button onClick={() => undoWatch(t.id)} disabled={t.watches.length === 0} aria-label="One less">−</button>
                      <span>{t.watches.length}×</span>
                      <button onClick={() => logWatch(t)} aria-label="Watched again">+</button>
                    </div>
                  </>)}
                  <h4>Where to watch</h4>
                  {/* Reserved for streaming / Amazon referral links, added later. */}
                  <div className="watchlinks">Watch links coming soon</div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {deleted.length > 0 && filter !== 'want' && (
        <button className="linkbtn trashlink" onClick={() => openSettings('data')}>🗑 Recently deleted ({deleted.length})</button>
      )}
      {undo && !dragId && (
        <div className="toast" role="status">
          <span>{undo.text}</span>
          <button className="linkbtn" onClick={() => { restore(undo.ids); setUndo(null); }}>Undo</button>
        </div>
      )}
      {dragId && (
        <div className="dropbar">
          <span>Drop into a list:</span>
          {[...lists.lists.map((l) => ({ id: l.id, name: `📝 ${l.name}` })), { id: 'new', name: '+ New list' }].map((l) => (
            <span
              key={l.id}
              className={dropListId === l.id ? 'droptarget over' : 'droptarget'}
              onDragOver={(e) => { e.preventDefault(); setDropListId(l.id); }}
              onDragLeave={() => setDropListId(null)}
              onDrop={(e) => { e.preventDefault(); dropInto(l.id); }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}
      </>)}
      </section>
    </main>
  );
}
