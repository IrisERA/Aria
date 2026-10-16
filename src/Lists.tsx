import { useEffect, useState } from 'react';
import SearchBar from './SearchBar';
import EnterInput from './EnterInput';
import SharePanel from './SharePanel';
import { ChevronDown, ChevronUp, Film, ListChecks, MessageSquare, NotebookPen, X } from 'lucide-react';
import type { TitleInfo } from './types';

interface ListItem extends TitleInfo {
  id: string;
  comment?: string; // how the user felt about it
}

export interface CustomList {
  id: string;
  name: string;
  notes: string;
  items: ListItem[];
  shareId?: string; // link code if this list is shared
}

const KEY = 'aria.customLists';

function load(): CustomList[] {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function useLists() {
  const [lists, setLists] = useState<CustomList[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lists));
    } catch {}
  }, [lists]);

  const edit = (id: string, fn: (l: CustomList) => CustomList) =>
    setLists((prev) => prev.map((l) => (l.id === id ? fn(l) : l)));

  function create(name: string) {
    const list = { id: crypto.randomUUID(), name, notes: '', items: [] };
    setLists((prev) => [...prev, list]);
    return list.id;
  }

  // Skips titles already in the list.
  function addItem(id: string, info: TitleInfo) {
    const { name, kind, year, poster, description, genres } = info;
    edit(id, (l) => l.items.some((i) => i.name.toLowerCase() === name.toLowerCase() && i.kind === kind)
      ? l
      : { ...l, items: [...l.items, { name, kind, year, poster, description, genres, id: crypto.randomUUID() }] });
  }

  function updateItem(id: string, itemId: string, patch: Partial<ListItem>) {
    edit(id, (l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));
  }

  function removeItem(id: string, itemId: string) {
    edit(id, (l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) }));
  }

  // Moves an item to where another one sits (drag and drop).
  function moveItem(id: string, fromId: string, toId: string) {
    edit(id, (l) => {
      const from = l.items.findIndex((i) => i.id === fromId);
      const to = l.items.findIndex((i) => i.id === toId);
      if (from < 0 || to < 0 || from === to) return l;
      const items = [...l.items];
      const [item] = items.splice(from, 1);
      items.splice(to, 0, item);
      return { ...l, items };
    });
  }

  function remove(id: string) {
    setLists((prev) => prev.filter((l) => l.id !== id));
  }

  return { lists, setLists, edit, create, addItem, updateItem, removeItem, moveItem, remove };
}

export default function Lists({ store, mine, openId, setOpenId, inWatchlist, share }: {
  store: ReturnType<typeof useLists>;
  mine: TitleInfo[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
  inWatchlist: (t: TitleInfo) => boolean;
  share: { ownerName: string; signedIn: boolean; onSignIn: () => void };
}) {
  const { lists, edit, create, addItem, updateItem, removeItem, moveItem, remove } = store;
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const open = lists.find((l) => l.id === openId);

  function openList(id: string) {
    setOpenId(id);
    setNotesOpen(false);
    setAdding(false);
  }

  function makeList() {
    const name = newName.trim();
    if (!name) return;
    openList(create(name));
    setNewName('');
  }

  if (!open) {
    return (
      <section>
        <div className="add">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && makeList()}
            placeholder="New list name, e.g. Top horror"
          />
          <button className="primary" onClick={makeList} disabled={!newName.trim()}>Create list</button>
        </div>
        {lists.length === 0 && <div className="empty"><span className="empty-icon" aria-hidden="true"><ListChecks size={34} strokeWidth={1.5} /></span><p>No lists yet. Name your first one above, like "Top horror" or "Comfort films".</p></div>}
        <ul className="list">
          {lists.map((l) => (
            <li key={l.id} className="listrow" onClick={() => openList(l.id)}>
              <div className="noposter"><ListChecks size={20} strokeWidth={1.5} /></div>
              <div className="info">
                <strong>{l.name}</strong>
                <span className="hint">{l.items.length} {l.items.length === 1 ? 'title' : 'titles'}</span>
              </div>
              <span className="hint">Open ›</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const last = open.items.length;
  const shown = open.items.map((item, i) => ({ item, n: i + 1 }));

  return (
    <section>
      <div className="row listhead">
        <button onClick={() => setOpenId(null)}>‹ All lists</button>
        <EnterInput
          className="listname"
          value={open.name}
          onSave={(name) => edit(open.id, (l) => ({ ...l, name }))}
          aria-label="List name"
        />
        <button className={notesOpen ? 'tab active notesbtn' : 'tab notesbtn'} onClick={() => setNotesOpen(!notesOpen)} aria-expanded={notesOpen} title="Notepad">
          <NotebookPen size={15} strokeWidth={1.9} /> Notes{open.notes.trim() && !notesOpen && <span className="notesdot" aria-label="has notes" />}
        </button>
        <SharePanel
          {...share}
          shareId={open.shareId}
          onShareId={(shareId) => edit(open.id, (l) => ({ ...l, shareId }))}
          title={open.name}
          items={open.items}
        />
      </div>

      <div className={notesOpen ? 'listbody withnotes' : 'listbody'}>
      {notesOpen && (
        <aside className="notespanel">
          <div className="row notestop">
            <b>Notepad</b>
            <button className="linkbtn" onClick={() => setNotesOpen(false)} aria-label="Close notepad"><X size={16} /></button>
          </div>
          <textarea
            value={open.notes}
            onChange={(e) => edit(open.id, (l) => ({ ...l, notes: e.target.value }))}
            placeholder="Write anything about this list…"
            autoFocus
          />
        </aside>
      )}
      <div className="listmain">

      {adding ? (
        <div className="row addrow">
          <div className="grow"><SearchBar mine={mine} onPick={(t) => addItem(open.id, t)} /></div>
          <button onClick={() => setAdding(false)}>Done</button>
        </div>
      ) : (
        <button className="primary addbtn" onClick={() => setAdding(true)}>+ Add</button>
      )}

      {last === 0 && <p className="hint">This list is empty. Tap + Add, or drag titles here from All.</p>}
      {last > 1 && <p className="hint">Drag ⠿ to change the order. Numbers update on their own.</p>}
      <ul className="list">
        {shown.map(({ item, n }) => (
          <li
            key={item.id}
            draggable={expanded !== item.id}
            className={['item', dragId === item.id && 'dragging', overId === item.id && dragId !== item.id && 'over'].filter(Boolean).join(' ')}
            onDragStart={() => setDragId(item.id)}
            onDragOver={(e) => { e.preventDefault(); setOverId(item.id); }}
            onDrop={() => { if (dragId) moveItem(open.id, dragId, item.id); setDragId(null); setOverId(null); }}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
          >
            <div className="itemrow">
              <span className="handle">⠿</span>
              <span className="num">#{n}</span>
              {item.poster ? <img src={item.poster} alt="" /> : <div className="noposter"><Film size={20} strokeWidth={1.5} /></div>}
              <div className="info">
                <strong>{item.name}</strong>
                <span className="hint">{inWatchlist(item) && <span className="wltag">In watchlist</span>}{item.kind === 'movie' ? 'Movie' : 'Series'}{item.year && ` · ${item.year}`}{item.comment && <> · <MessageSquare size={12} className="inlineicon" aria-label="has a comment" /></>}</span>
                <button className="more" onClick={() => setExpanded(expanded === item.id ? null : item.id)} aria-expanded={expanded === item.id}>
                  {expanded === item.id ? <><ChevronUp size={14} /> Less</> : <><ChevronDown size={14} /> More</>}
                </button>
              </div>
              <button className="del" onClick={() => removeItem(open.id, item.id)} aria-label="Remove"><X size={16} /></button>
            </div>
            {expanded === item.id && (
              <div className="details">
                <h4>About</h4>
                {!!item.genres?.length && <div className="genres">{item.genres.map((g) => <span key={g} className="genre">{g}</span>)}</div>}
                <p className="fulldesc">{item.description || 'No description yet.'}</p>
                <label>
                  <h4>How did it make you feel?</h4>
                  <textarea
                    value={item.comment ?? ''}
                    onChange={(e) => updateItem(open.id, item.id, { comment: e.target.value })}
                    placeholder="Loved it, cried at the end, too slow…"
                    rows={3}
                  />
                </label>
                <h4>Where to watch</h4>
                {/* Reserved for streaming / Amazon referral links, added later. */}
                <div className="watchlinks">Watch links coming soon</div>
              </div>
            )}
          </li>
        ))}
      </ul>

      </div>
      </div>

      {deleting ? (
        <div className="row deletelist">
          <span>Delete "{open.name}"?</span>
          <button className="danger" onClick={() => { remove(open.id); setOpenId(null); setDeleting(false); }}>Delete</button>
          <button onClick={() => setDeleting(false)}>Cancel</button>
        </div>
      ) : (
        <button className="danger-outline deletelist" onClick={() => setDeleting(true)}>Delete this list</button>
      )}
    </section>
  );
}
