import { useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { publishShare, shareOrCopy, shareUrl, stopShare, type SharedItem } from './share';

// "Share" button for a list. Once shared, the public copy updates itself as the list changes.
export default function SharePanel({ shareId, onShareId, title, ownerName, items, signedIn, onSignIn }: {
  shareId?: string;
  onShareId: (id: string | undefined) => void;
  title: string;
  ownerName: string;
  items: SharedItem[];
  signedIn: boolean;
  onSignIn: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const body = JSON.stringify([title, ownerName, items]);
  const lastSent = useRef('');

  // Keep the public copy up to date (a moment after changes).
  useEffect(() => {
    if (!shareId || !signedIn || body === lastSent.current) return;
    const timer = setTimeout(() => {
      publishShare(shareId, title, ownerName, items)
        .then((id) => {
          lastSent.current = body;
          if (id !== shareId) onShareId(id);
        })
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [body, shareId, signedIn]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  async function start() {
    setBusy(true);
    setNote('');
    try {
      const id = await publishShare(shareId, title, ownerName, items);
      lastSent.current = body;
      onShareId(id);
    } catch (e: any) {
      setNote(/shared_lists|get_shared_list|PGRST205|42P01/.test(`${e?.code} ${e?.message}`)
        ? 'Sharing needs a one-time setup in Supabase first.'
        : "Couldn't create the link. Check your internet and try again.");
    }
    setBusy(false);
  }

  async function send() {
    if (!shareId) return;
    const r = await shareOrCopy(shareUrl(shareId), title);
    setNote(r === 'copied' ? 'Link copied! Paste it anywhere.' : r === 'failed' ? "Couldn't copy. Select the link and copy it." : '');
  }

  async function stop() {
    if (!shareId) return;
    await stopShare(shareId);
    onShareId(undefined);
    setNote('Stopped sharing. The old link no longer works.');
  }

  return (
    <div className="sharebox" ref={box}>
      <button className={shareId ? 'tab active sharebtn' : 'tab sharebtn'} onClick={() => setOpen(!open)} aria-expanded={open}>
        <Link2 size={15} strokeWidth={1.9} /> {shareId ? 'Shared' : 'Share'}
      </button>
      {open && (
        <div className="sharepop" role="dialog" aria-label="Share this list">
          <b>Share “{title}”</b>
          {!signedIn ? (<>
            <p className="hint">Sign in to share your list with a link.</p>
            <button className="primary" onClick={() => { setOpen(false); onSignIn(); }}>Sign in</button>
          </>) : !shareId ? (<>
            <p className="hint">Anyone with the link can see this list's titles, posters and your ratings. Your comments and notes stay private.</p>
            <button className="primary" disabled={busy || items.length === 0} onClick={start}>{busy ? 'Creating link…' : 'Create link'}</button>
            {items.length === 0 && <p className="hint">Add some titles first.</p>}
          </>) : (<>
            <input className="sharelink" readOnly value={shareUrl(shareId)} onFocus={(e) => e.target.select()} aria-label="Share link" />
            <div className="row">
              <button className="primary" onClick={send}>Copy / share link</button>
              <a className="linkbtn" href={shareUrl(shareId)} target="_blank" rel="noopener">Preview ›</a>
            </div>
            <p className="hint">The link updates by itself when you change this list.</p>
            <button className="linkbtn danger-text" onClick={stop}>Stop sharing</button>
          </>)}
          {note && <p className="hint sharenote">{note}</p>}
        </div>
      )}
    </div>
  );
}
