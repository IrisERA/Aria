import { useEffect, useState } from 'react';
import SearchBar from './SearchBar';
import EnterInput from './EnterInput';
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

export default function Lists({ store, mine, openId, setOpenId }: {
  store: ReturnType<typeof useLists>;
  mine: TitleInfo[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const { lists, edit, create, addItem, updateItem, removeItem, moveItem, remove } = store;
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const open = lists.find((l) => l.id === openId);

  function openList(id: string) {
    setOpenId(id);
    setFrom(1);
    setTo(null);
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
        {lists.length === 0 && <p className="hint">No lists yet. Give your first list a name above.</p>}
        <ul className="list">
          {lists.map((l) => (
            <li key={l.id} className="listrow" onClick={() => openList(l.id)}>
              <div className="noposter">📝</div>
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
  const end = Math.min(to ?? last, last);
  const start = Math.max(1, Math.min(from, end || 1));
  const shown = open.items.map((item, i) => ({ item, n: i + 1 })).filter(({ n }) => n >= start && n <= end);
  const filtered = last > 0 && (start > 1 || end < last);

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
      </div>

      <label className="notes">
        Notepad
        <textarea
          value={open.notes}
          onChange={(e) => edit(open.id, (l) => ({ ...l, notes: e.target.value }))}
          placeholder="Write anything about this list…"
          rows={4}
        />
      </label>

      {adding ? (
        <div className="row addrow">
          <div className="grow"><SearchBar mine={mine} onPick={(t) => addItem(open.id, t)} /></div>
          <button onClick={() => setAdding(false)}>Done</button>
        </div>
      ) : (
        <button className="primary addbtn" onClick={() => setAdding(true)}>+ Add</button>
      )}

      {last > 0 && (
        <div className="row range">
          <span>Show #</span>
          <input type="number" min={1} max={last} value={start} onChange={(e) => setFrom(Number(e.target.value) || 1)} aria-label="From number" />
          <span>to #</span>
          <input type="number" min={1} max={last} value={end} onChange={(e) => setTo(Number(e.target.value) || last)} aria-label="To number" />
          {filtered && <button onClick={() => { setFrom(1); setTo(null); }}>Show all</button>}
        </div>
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
              {item.poster ? <img src={item.poster} alt="" /> : <div className="noposter">🎬</div>}
              <div className="info">
                <strong>{item.name}</strong>
                <span className="hint">{item.kind === 'movie' ? 'Movie' : 'Series'}{item.year && ` · ${item.year}`}{item.comment && ' · 💬'}</span>
                <button className="more" onClick={() => setExpanded(expanded === item.id ? null : item.id)} aria-expanded={expanded === item.id}>
                  {expanded === item.id ? '▲ Less' : '▼ More'}
                </button>
              </div>
              <button className="del" onClick={() => removeItem(open.id, item.id)} aria-label="Remove">✕</button>
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
