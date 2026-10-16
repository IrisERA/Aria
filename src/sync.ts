import { useEffect, useRef, useState } from 'react';
import { supabase } from './auth';
import type { CustomList } from './Lists';
import type { Settings } from './settings';
import type { Title } from './types';

/*
 * Cloud sync: while signed in, titles, lists and settings are saved to the
 * `user_data` table in Supabase (one row per user, see supabase/setup.sql),
 * so they follow the account to other devices. Signed out, everything stays local.
 */

export type SyncState = 'off' | 'syncing' | 'synced' | 'offline' | 'needs-setup';

interface Snapshot {
  titles: Title[];
  lists: CustomList[];
  settings: Settings;
}

const key = (t: { name: string; kind?: string }) => `${t.kind ?? ''}:${t.name.trim().toLowerCase()}`;

// Combines two copies of the same title, keeping the fuller one and anything only one copy has.
function mergeTitle(a: Title, b: Title): Title {
  const [main, other] = a.watches.length >= b.watches.length ? [a, b] : [b, a];
  return {
    ...other,
    ...main,
    favorite: a.favorite || b.favorite,
    rating: main.rating ?? other.rating,
    description: main.description ?? other.description,
    poster: main.poster ?? other.poster,
    status: main.watches.length || other.watches.length ? undefined : main.status ?? other.status,
  };
}

// Merges this device's data with the account's, so nothing is lost on first sign-in.
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  const titles = [...remote.titles];
  for (const t of local.titles) {
    const i = titles.findIndex((r) => r.id === t.id || key(r) === key(t));
    if (i < 0) titles.push(t);
    else titles[i] = mergeTitle(titles[i], t);
  }
  const lists = [...remote.lists];
  for (const l of local.lists) {
    const i = lists.findIndex((r) => r.id === l.id);
    if (i < 0) {
      lists.push(l);
      continue;
    }
    const items = [...lists[i].items];
    for (const item of l.items) if (!items.some((x) => x.id === item.id || key(x) === key(item))) items.push(item);
    lists[i] = { ...lists[i], notes: lists[i].notes || l.notes, items };
  }
  return { titles, lists, settings: { ...local.settings, ...remote.settings } };
}

const isMissingTable = (e: { code?: string; message?: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' || /user_data/.test(e.message ?? '');

export function useCloudSync(userId: string | undefined, data: Snapshot, replace: (s: Snapshot) => void) {
  const [state, setState] = useState<SyncState>('off');
  const ready = useRef(false); // true once this device has merged with the account
  const lastPush = useRef('');
  const latest = useRef(data);
  latest.current = data;

  async function push(snapshot: Snapshot) {
    if (!supabase || !userId) return;
    const body = JSON.stringify(snapshot);
    if (body === lastPush.current) return;
    setState('syncing');
    const { error } = await supabase.from('user_data').upsert({ user_id: userId, ...snapshot, updated_at: new Date().toISOString() });
    if (error) return setState(isMissingTable(error) ? 'needs-setup' : 'offline');
    lastPush.current = body;
    setState('synced');
  }

  // Loads the account's copy. On first load it's merged with this device; later it replaces it.
  async function pull(first: boolean) {
    if (!supabase || !userId) return;
    setState('syncing');
    const { data: row, error } = await supabase.from('user_data').select('titles, lists, settings').eq('user_id', userId).maybeSingle();
    if (error) return setState(isMissingTable(error) ? 'needs-setup' : 'offline');
    const remote: Snapshot | null = row ? { titles: row.titles ?? [], lists: row.lists ?? [], settings: row.settings ?? {} } : null;
    const next = !remote ? latest.current : first ? mergeSnapshots(latest.current, remote) : remote;
    if (remote) {
      lastPush.current = JSON.stringify(remote);
      replace(next);
    }
    ready.current = true;
    await push(next);
    setState('synced');
  }

  // Sign-in / sign-out.
  useEffect(() => {
    ready.current = false;
    lastPush.current = '';
    if (!userId || !supabase) return setState('off');
    pull(true);
  }, [userId]);

  // Saves changes a moment after they happen.
  useEffect(() => {
    if (!ready.current || !userId) return;
    const timer = setTimeout(() => push(data), 1200);
    return () => clearTimeout(timer);
  }, [data.titles, data.lists, data.settings, userId]);

  // Picks up changes made on another device when you come back to this one.
  useEffect(() => {
    if (!userId) return;
    const onFocus = async () => {
      if (!ready.current) return;
      await push(latest.current);
      pull(false);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [userId]);

  // Saves anything not saved yet (used right before signing out). Resolves true if it's all saved.
  async function flush(): Promise<boolean> {
    if (!ready.current) return false;
    await push(latest.current);
    return lastPush.current === JSON.stringify(latest.current);
  }

  return { state, flush };
}
