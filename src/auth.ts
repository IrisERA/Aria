import { useEffect, useState } from 'react';
import { createClient, type User } from '@supabase/supabase-js';

/*
 * Sign-in with Google or GitHub through Supabase Auth.
 * Needs a free Supabase project: put its Project URL and anon/publishable key in `.env`
 * (see .env.example). Without them, the sign-in buttons show as "needs setup".
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const authReady = Boolean(url && key);
export const supabase = authReady ? createClient(url!, key!) : null;

export type Provider = 'google' | 'github';

/*
 * Google uses its own "Sign in with Google" button (Google Identity Services) when
 * VITE_GOOGLE_CLIENT_ID is set, so Google's popup names this site instead of the
 * Supabase address. The Client ID's "Authorised JavaScript origins" must list this site.
 */
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const googleButtonReady = authReady && Boolean(googleClientId);

declare global {
  interface Window { google?: any }
}

let gsiScript: Promise<void> | null = null;
function loadGsi() {
  gsiScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => { gsiScript = null; reject(); };
    document.head.appendChild(s);
  });
  return gsiScript;
}

async function sha256Hex(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Draws Google's button into `el`; signing in there logs into Supabase with Google's ID token.
export async function renderGoogleButton(el: HTMLElement, onError: (msg: string) => void) {
  if (!supabase || !googleClientId) return;
  try {
    await loadGsi();
  } catch {
    return onError("Can't reach Google. Check your internet connection.");
  }
  const nonce = crypto.randomUUID();
  window.google.accounts.id.initialize({
    client_id: googleClientId,
    nonce: await sha256Hex(nonce),
    callback: async ({ credential }: { credential: string }) => {
      const { error } = await supabase!.auth.signInWithIdToken({ provider: 'google', token: credential, nonce });
      if (error) onError("Couldn't sign in with Google. Please try again.");
    },
  });
  const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light'
    || document.documentElement.dataset.theme === 'dark';
  window.google.accounts.id.renderButton(el, {
    theme: dark ? 'filled_black' : 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: el.clientWidth || 260,
  });
}

export interface Profile {
  id: string;
  name: string;
  email?: string;
  photo?: string;
}

function toProfile(u: User | null | undefined): Profile | null {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  return { id: u.id, name: m.full_name || m.name || m.user_name || '', email: u.email, photo: m.avatar_url || m.picture };
}

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  // False until the saved sign-in has been checked, so ARIA doesn't ask a signed-in person to sign in.
  const [loaded, setLoaded] = useState(!supabase);
  const [error, setError] = useState('');
  // Which providers are switched on in the Supabase dashboard (null = not checked yet).
  const [enabled, setEnabled] = useState<Record<Provider, boolean> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key! } })
      .then((r) => r.json())
      .then((s) => setEnabled({ google: !!s.external?.google, github: !!s.external?.github }))
      .catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      setUser(toProfile(data.session?.user));
      setLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(toProfile(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  // Leaves the page for Google/GitHub and comes back signed in.
  async function signIn(provider: Provider) {
    if (!supabase) return;
    setError('');
    if (enabled && !enabled[provider]) {
      return setError(`${provider === 'google' ? 'Google' : 'GitHub'} sign-in isn't switched on yet in Supabase.`);
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) setError("Couldn't sign in. Please try again.");
  }

  return { user, loaded, error, setError, enabled, signIn, signOut: async () => { await supabase?.auth.signOut(); } };
}
