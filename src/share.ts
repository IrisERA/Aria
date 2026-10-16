import { supabase } from './auth';
import type { Kind } from './types';

/*
 * "Share my list": a read-only public copy of a list, opened at /s/<code>.
 * Shares only titles, years, posters, genres and ratings — never comments or notes.
 * Tables and access rules: supabase/share.sql.
 */

export interface SharedItem {
  name: string;
  kind: Kind;
  year?: string;
  poster?: string;
  genres?: string[];
  rating?: number;
}

export interface SharedList {
  title: string;
  owner_name: string | null;
  items: SharedItem[];
  updated_at: string;
}

// Links always point at the website, even when shared from the desktop app or a local copy.
const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? 'https://aria-fawn-seven.vercel.app';

export const shareUrl = (id: string) => `${PUBLIC_URL}/s/${id}`;

// The link code in the current address, if this is a shared-list page.
export function sharedIdFromPath(path = window.location.pathname): string | null {
  const m = path.match(/^\/s\/([A-Za-z0-9]{6,32})\/?$/);
  return m ? m[1] : null;
}

function newId() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((b) => chars[b % chars.length]).join('');
}

const clean = (items: SharedItem[]): SharedItem[] =>
  items.map(({ name, kind, year, poster, genres, rating }) => ({ name, kind, year, poster, genres, rating }));

// Creates the share (or updates it if `id` is given) and returns its link code.
export async function publishShare(id: string | undefined, title: string, ownerName: string, items: SharedItem[]): Promise<string> {
  if (!supabase) throw new Error('Sign-in is not set up');
  const row = { title, owner_name: ownerName || null, items: clean(items), updated_at: new Date().toISOString() };
  if (id) {
    const { data, error } = await supabase.from('shared_lists').update(row).eq('id', id).select('id');
    if (error) throw error;
    if (data?.length) return id;
  }
  const fresh = newId();
  const { error } = await supabase.from('shared_lists').insert({ id: fresh, ...row });
  if (error) throw error;
  return fresh;
}

export async function stopShare(id: string) {
  if (!supabase) return;
  await supabase.from('shared_lists').delete().eq('id', id);
}

export async function loadShare(id: string): Promise<SharedList | null> {
  if (!supabase) throw new Error('Sign-in is not set up');
  const { data, error } = await supabase.rpc('get_shared_list', { share_id: id });
  if (error) throw error;
  return (data as SharedList[])?.[0] ?? null;
}

// Opens the phone/computer share sheet where available, otherwise copies the link.
export async function shareOrCopy(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title, text: `${title} on ARIA`, url });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
