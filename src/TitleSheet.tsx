import { ArrowDown, ArrowUp, Check, Film, ListPlus, Minus, Plus, Popcorn, Star, Trash2 } from 'lucide-react';
import Sheet from './Sheet';
import Stars from './Stars';
import { onWatchlist, type Title } from './types';

// Everything you can do with one title, in a bottom sheet (phone layout).
export default function TitleSheet({ t, onClose, canMove, onMove, lists, onAddToList, onFavorite, onRate, onWatched, onUndoWatch, onWatchlist: setWatchlist, onRemove, removeLabel }: {
  t: Title;
  onClose: () => void;
  canMove: { up: boolean; down: boolean } | null;
  onMove: (dir: -1 | 1) => void;
  lists: { id: string; name: string; has: boolean }[];
  onAddToList: (id: string) => void;
  onFavorite: () => void;
  onRate: (r: number | undefined) => void;
  onWatched: () => void;
  onUndoWatch: () => void;
  onWatchlist: (on: boolean) => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  const wl = onWatchlist(t);
  return (
    <Sheet title={t.name} onClose={onClose}>
      <div className="ts-top">
        {t.poster ? <img src={t.poster} alt="" className="ts-poster" /> : <div className="ts-poster noposter"><Film size={28} strokeWidth={1.5} /></div>}
        <div className="ts-meta">
          <span className="hint">{t.kind === 'movie' ? 'Movie' : 'Series'}{t.year && ` · ${t.year}`}</span>
          {!!t.genres?.length && <div className="genres">{t.genres.map((g) => <span key={g} className="genre">{g}</span>)}</div>}
          <button className={t.favorite ? 'pill on' : 'pill'} onClick={onFavorite} aria-pressed={t.favorite}>
            <Star size={16} fill={t.favorite ? 'currentColor' : 'none'} /> {t.favorite ? 'Favourite' : 'Add to favourites'}
          </button>
        </div>
      </div>

      {t.description && <p className="fulldesc ts-desc">{t.description}</p>}

      <h4>Your rating</h4>
      <Stars value={t.rating} onChange={onRate} size={30} />

      <div className="ts-actions">
        <button className={t.watches.length ? 'bigbtn on' : 'bigbtn'} onClick={() => !t.watches.length && onWatched()}>
          <Check size={18} /> {t.watches.length ? 'Watched' : 'Mark watched'}
        </button>
        <button className={wl ? 'bigbtn on' : 'bigbtn'} onClick={() => setWatchlist(!wl)}>
          <Popcorn size={18} /> {wl ? 'On watchlist' : 'Watchlist'}
        </button>
      </div>

      {t.status !== 'want' && (
        <div className="setting">
          <span className="setting-text"><span>Times watched</span></span>
          <div className="count big">
            <button onClick={onUndoWatch} disabled={t.watches.length === 0} aria-label="One less"><Minus size={18} /></button>
            <span>{t.watches.length}×</span>
            <button onClick={onWatched} aria-label="Watched again"><Plus size={18} /></button>
          </div>
        </div>
      )}

      {canMove && (
        <div className="setting">
          <span className="setting-text"><span>Order in your list</span></span>
          <div className="row">
            <button className="iconbtn" disabled={!canMove.up} onClick={() => onMove(-1)} aria-label="Move up"><ArrowUp size={18} /></button>
            <button className="iconbtn" disabled={!canMove.down} onClick={() => onMove(1)} aria-label="Move down"><ArrowDown size={18} /></button>
          </div>
        </div>
      )}

      {lists.length > 0 && (
        <div className="setting column">
          <span className="setting-text"><span>Add to a list</span></span>
          <div className="row wrap">
            {lists.map((l) => (
              <button key={l.id} className={l.has ? 'pill on' : 'pill'} disabled={l.has} onClick={() => onAddToList(l.id)}>
                {l.has ? <Check size={14} /> : <ListPlus size={14} />} {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <h4>Where to watch</h4>
      <div className="watchlinks">Watch links coming soon</div>

      <button className="danger-outline ts-remove" onClick={onRemove}><Trash2 size={16} /> {removeLabel}</button>
    </Sheet>
  );
}
