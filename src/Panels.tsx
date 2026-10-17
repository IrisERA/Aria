import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, LifeBuoy, Palette, Shield, SlidersHorizontal, Smartphone, User, X, type LucideIcon } from 'lucide-react';
import Feedback from './Feedback';
import { ACCENTS, defaults, SIZE_LABELS, type Settings, type StartTab, type Theme } from './settings';
import { authReady, googleButtonReady, renderGoogleButton, type useAuth } from './auth';
import type { SyncState } from './sync';
import type { Deleted } from './store';
import EnterInput from './EnterInput';
import InstallButton, { desktopAppVersion, isInstalled } from './InstallButton';

export type Section = 'account' | 'customise' | 'lists' | 'app' | 'data' | 'about';

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'customise', label: 'Appearance', icon: Palette },
  { id: 'lists', label: 'Lists', icon: SlidersHorizontal },
  { id: 'app', label: 'Get the app', icon: Smartphone },
  { id: 'data', label: 'Privacy & data', icon: Shield },
  { id: 'about', label: 'Help & feedback', icon: LifeBuoy },
];

type Update = (p: Partial<Settings>) => void;
type Trash = { deleted: Deleted[]; restore: (ids: string[]) => void; purge: (ids?: string[]) => void };

const SYNC_LABEL: Record<SyncState, string> = {
  off: 'Off', syncing: 'Saving…', synced: '✓ On', offline: 'Offline', 'needs-setup': 'Setup needed',
};
const SYNC_HINT: Record<SyncState, string> = {
  off: 'Sign in and your titles, lists and settings follow you to every device.',
  syncing: 'Saving your titles, lists and settings to your account.',
  synced: 'Your titles, lists and settings are saved to your account.',
  offline: "Can't reach the cloud right now. Changes are kept on this device and saved later.",
  'needs-setup': 'The cloud storage table hasn\'t been created in Supabase yet.',
};

// A switch row.
function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="setting">
      <span className="setting-text">
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="setting">
      <span className="setting-text">
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

function Account({ settings, update, stats, auth, sync }: {
  settings: Settings; update: Update; stats: { total: number; titles: number }; auth: ReturnType<typeof useAuth>; sync: SyncState;
}) {
  const { user, error, setError, enabled, signIn, signOut } = auth;
  const googleBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user && googleButtonReady && googleBox.current) renderGoogleButton(googleBox.current, setError);
  }, [user]);

  const name = settings.name || user?.name || '';
  return (<>
    <div className="profile">
      {user?.photo
        ? <img className="avatar big" src={user.photo} alt="" referrerPolicy="no-referrer" />
        : <div className="avatar big">{(name || '?')[0].toUpperCase()}</div>}
      <div>
        <b>{name || 'Guest'}</b>
        <p className="hint">{user ? (user.email || 'Signed in') : 'Not signed in'} · {stats.titles} titles · {stats.total} watches</p>
      </div>
    </div>
    <Row label="Display name" hint={user ? 'Press Enter to save. Leave empty to use your sign-in name.' : 'Press Enter to save.'}>
      <EnterInput id="acct-name" value={settings.name} allowEmpty onSave={(name) => update({ name })} placeholder={user?.name || 'Your name'} />
    </Row>
    {user ? (
      <Row label="Signed in" hint={`${user.email ?? ''} · Signing out removes your list from this device. It stays safe in your account.`}>
        <button onClick={signOut}>Sign out</button>
      </Row>
    ) : (
      <div className="signins">
        {googleButtonReady ? (
          <div className="gsi" ref={googleBox} />
        ) : (
          <button className="signin google" disabled={!authReady} onClick={() => signIn('google')}>
            <span className="logo">G</span> Continue with Google
          </button>
        )}
        <button className="signin github" disabled={!authReady} onClick={() => signIn('github')}>
          <svg className="logo" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Continue with GitHub
        </button>
        {!authReady && <p className="hint">Sign-in needs a one-time setup before these buttons work.</p>}
        {enabled && !enabled.google && !enabled.github && <p className="hint">Google and GitHub still need to be switched on in Supabase.</p>}
      </div>
    )}
    {error && <p className="hint error">{error}</p>}
    <Row label="Sync across devices" hint={SYNC_HINT[sync]}>
      <span className={`syncdot ${sync}`}>{SYNC_LABEL[sync]}</span>
    </Row>
  </>);
}

function Customise({ settings, update }: { settings: Settings; update: Update }) {
  const [showGroupColours, setShowGroupColours] = useState(false);
  return (<>
    <Row label="Theme">
      <select id="set-theme" value={settings.theme} onChange={(e) => update({ theme: e.target.value as Theme })}>
        <option value="system">Match device</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </Row>
    <div className="setting column">
      <span>App colour</span>
      <div className="swatches">
        <button className={!settings.accent ? 'swatch auto on' : 'swatch auto'} onClick={() => update({ accent: '' })} aria-label="Default colour" title="Default">A</button>
        {ACCENTS.map((c) => (
          <button key={c} className={settings.accent === c ? 'swatch on' : 'swatch'} style={{ background: c }} onClick={() => update({ accent: c })} aria-label={`Colour ${c}`} />
        ))}
        <input type="color" value={settings.accent || '#8a7cf0'} onChange={(e) => update({ accent: e.target.value })} aria-label="Pick any colour" title="Pick any colour" />
      </div>
    </div>
    <Row label="Text size">
      <select value={settings.textSize} onChange={(e) => update({ textSize: e.target.value as Settings['textSize'] })}>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>
    </Row>
    <Toggle checked={settings.showPosters} onChange={(v) => update({ showPosters: v })} label="Show posters" />
    <Toggle checked={settings.compact} onChange={(v) => update({ compact: v })} label="Compact list" hint="Hide descriptions so more titles fit." />
    <Toggle checked={settings.showStats} onChange={(v) => update({ showStats: v })} label="Show stats" />
    <Toggle checked={settings.groupColors} onChange={(v) => update({ groupColors: v })} label="Colour series groups" hint="Used by the A–Z sort." />
    {settings.groupColors && (
      <button className="linkbtn disclose" onClick={() => setShowGroupColours(!showGroupColours)} aria-expanded={showGroupColours}>
        {showGroupColours ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Choose group colours
      </button>
    )}
    {settings.groupColors && showGroupColours && (
      <div className="colorgrid">
        {SIZE_LABELS.map((label, i) => (
          <label key={label} className="row">
            <input
              type="color"
              value={settings.sizeColors[i]}
              onChange={(e) => update({ sizeColors: settings.sizeColors.map((c, j) => (j === i ? e.target.value : c)) })}
            />
            {label}
          </label>
        ))}
        <button className="linkbtn" onClick={() => update({ sizeColors: defaults.sizeColors, customColors: {} })}>Reset group colours</button>
        <p className="hint">Tap a group's name in your list to give just that group its own colour.</p>
      </div>
    )}
  </>);
}

function ListSettings({ settings, update }: { settings: Settings; update: Update }) {
  return (<>
    <Row label="Open ARIA on">
      <select value={settings.startTab} onChange={(e) => update({ startTab: e.target.value as StartTab })}>
        <option value="all">All</option>
        <option value="movie">Movies</option>
        <option value="series">Series</option>
        <option value="favorites">Favorites</option>
        <option value="want">Watchlist</option>
        <option value="lists">My lists</option>
      </select>
    </Row>
    <Row label="Sort All by">
      <select value={settings.sort} onChange={(e) => update({ sort: e.target.value as Settings['sort'] })}>
        <option value="mine">My order</option>
        <option value="az">A–Z, series together</option>
        <option value="genre">By genre</option>
      </select>
    </Row>
    <Row label="Suggest a rewatch after" hint="For favourites you haven't watched in a while.">
      <select id="set-rewatch" value={settings.rewatchDays} onChange={(e) => update({ rewatchDays: Number(e.target.value) })}>
        {[7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
      </select>
    </Row>
  </>);
}

function GetApp() {
  const desktop = desktopAppVersion();
  if (desktop) {
    return (<>
      <p className="hint">You're using the ARIA desktop app{desktop !== '?' ? ` (version ${desktop})` : ''}.</p>
      <p className="hint">Updates arrive by themselves: when a new version is released, ARIA asks you whether to update.</p>
      <p className="hint">On your phone, open <b>aria-fawn-seven.vercel.app</b> and tap "Install ARIA". Sign in with the same account and your lists come with you.</p>
    </>);
  }
  if (isInstalled()) {
    return (<>
      <p className="hint">✓ ARIA is installed on this device, and it updates by itself.</p>
      <p className="hint">On another device, open <b>aria-fawn-seven.vercel.app</b> and tap "Install ARIA". Sign in with the same account and your lists come with you.</p>
    </>);
  }
  return (<>
    <p className="hint">Install ARIA so it opens in its own window with its own icon, like any other app. It's free, takes a few seconds, and always stays up to date.</p>
    <div className="setting column">
      <span className="setting-text">
        <span>This device</span>
        <span className="hint">On Windows this downloads the ARIA desktop app. On other computers, phones and tablets it installs ARIA from your browser.</span>
      </span>
      <InstallButton big />
    </div>
    <div className="setting column">
      <span className="setting-text">
        <span>Other devices</span>
        <span className="hint">Open <b>aria-fawn-seven.vercel.app</b> on your phone or another computer and tap "Install ARIA". Sign in with the same account and your lists come with you.</span>
      </span>
    </div>
  </>);
}

// Downloads everything ARIA keeps in this browser as one backup file.
function exportData() {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (!key.startsWith('aria.')) continue;
    try {
      data[key] = JSON.parse(localStorage.getItem(key)!);
    } catch {
      data[key] = localStorage.getItem(key);
    }
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `aria-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function Data({ onClear, trash }: { onClear: () => void; trash: Trash }) {
  const [confirm, setConfirm] = useState(false);
  const [emptying, setEmptying] = useState(false);
  return (<>
    <p className="hint">ARIA is free with zero ads. Your data is never sold or shared. Signed in, it's stored in your private account; otherwise only in this browser. <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a></p>
    <Row label="Download my data" hint="A backup file of all your titles, lists and settings.">
      <button onClick={exportData}>Download</button>
    </Row>
    <div className="setting column">
      <span className="setting-text">
        <span>Recently deleted</span>
        <span className="hint">Titles you remove stay here for 30 days, so you can get them back.</span>
      </span>
      {trash.deleted.length === 0 ? (
        <p className="hint">Nothing here.</p>
      ) : (<>
        <ul className="trash">
          {trash.deleted.map((d) => (
            <li key={d.title.id}>
              <span className="trash-name">
                <b>{d.title.name}</b>
                <span className="hint">{d.title.kind === 'movie' ? 'Movie' : 'Series'}{d.title.year && ` · ${d.title.year}`} · removed {new Date(d.at).toLocaleDateString()}</span>
              </span>
              <button onClick={() => trash.restore([d.title.id])}>Restore</button>
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="primary" onClick={() => trash.restore(trash.deleted.map((d) => d.title.id))}>Restore all</button>
          {emptying ? (<>
            <button className="danger" onClick={() => { trash.purge(); setEmptying(false); }}>Delete forever</button>
            <button onClick={() => setEmptying(false)}>Cancel</button>
          </>) : (
            <button className="danger-outline" onClick={() => setEmptying(true)}>Empty</button>
          )}
        </div>
      </>)}
    </div>
    {confirm ? (
      <div className="setting column danger-zone">
        <span>Move every title in All to Recently deleted?</span>
        <div className="row">
          <button className="danger" onClick={() => { onClear(); setConfirm(false); }}>Delete</button>
          <button onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      </div>
    ) : (
      <Row label="Clear my list" hint="Moves every title to Recently deleted. You can restore them for 30 days.">
        <button className="danger-outline" onClick={() => setConfirm(true)}>Clear</button>
      </Row>
    )}
  </>);
}

function About({ onShowWelcome }: { onShowWelcome: () => void }) {
  return (<>
    <div className="setting column">
      <span className="setting-text">
        <span>Send feedback</span>
        <span className="hint">Found a bug or have an idea? Tell us here.</span>
      </span>
      <Feedback />
    </div>
    <Row label="Welcome tour" hint="The quick intro from your first visit.">
      <button onClick={onShowWelcome}>Show again</button>
    </Row>
    <Row label="Email us" hint="aria.app.help@protonmail.com">
      <a className="linkbtn" href="mailto:aria.app.help@protonmail.com?subject=ARIA">Write ›</a>
    </Row>
    <p className="hint aboutline">
      ARIA {__APP_VERSION__} · free, with zero ads · <a href="/terms.html" target="_blank" rel="noopener">Terms</a> · <a href="/privacy.html" target="_blank" rel="noopener">Privacy</a>
    </p>
    <p className="hint credits">
      Movie and series information comes from IMDb, iTunes (Apple) and <a href="https://www.tvmaze.com" target="_blank" rel="noopener">TVmaze</a> (CC BY-SA).
      ARIA isn't affiliated with or endorsed by them. Titles, posters and descriptions belong to their respective owners.
    </p>
  </>);
}

export function SettingsSheet({ section, setSection, onClose, settings, update, stats, auth, sync, onClear, trash, onShowWelcome }: {
  section: Section;
  setSection: (s: Section) => void;
  onClose: () => void;
  settings: Settings;
  update: Update;
  stats: { total: number; titles: number };
  auth: ReturnType<typeof useAuth>;
  sync: SyncState;
  onClear: () => void;
  trash: Trash;
  onShowWelcome: () => void;
}) {
  // Drawn straight into <body> so nothing on the page can show through it.
  return createPortal(
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Settings">
        <header className="sheet-head">
          <h2>Settings</h2>
          <button className="icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <nav className="sheet-nav">
          {SECTIONS.map((s) => (
            <button key={s.id} className={section === s.id ? 'navbtn on' : 'navbtn'} onClick={() => setSection(s.id)}>
              <s.icon size={16} strokeWidth={1.9} aria-hidden="true" /> {s.label}
            </button>
          ))}
        </nav>
        <div className="sheet-body">
          <h3>{SECTIONS.find((s) => s.id === section)!.label}</h3>
          {section === 'account' && <Account settings={settings} update={update} stats={stats} auth={auth} sync={sync} />}
          {section === 'customise' && <Customise settings={settings} update={update} />}
          {section === 'lists' && <ListSettings settings={settings} update={update} />}
          {section === 'app' && <GetApp />}
          {section === 'data' && <Data onClear={onClear} trash={trash} />}
          {section === 'about' && <About onShowWelcome={onShowWelcome} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}
