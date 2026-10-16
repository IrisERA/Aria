import { useEffect, useState } from 'react';

/*
 * Getting ARIA as an app:
 * - Windows computers: downloads the desktop app installer from the latest GitHub release.
 * - Other computers and phones: installs the website as an app (one tap where the browser
 *   allows it, otherwise a short picture guide), or the Play Store once ARIA is there.
 * - Inside the desktop app or an installed copy: nothing to show (updates come by themselves).
 */

// Fill this in once ARIA is on Google Play; Android's button then opens the Store.
const PLAY_STORE_URL = '';
const RELEASES_URL = 'https://github.com/IrisERA/Aria/releases/latest';

const ua = () => navigator.userAgent;
export const desktopAppVersion = () => ua().match(/\baria\/(\d+\.\d+\.\d+)/i)?.[1] ?? (/Electron/.test(ua()) ? '?' : null);
const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isIOS = () => /iPhone|iPad|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/.test(ua());
const isWindowsDesktop = () => /Windows/.test(ua()) && !isMobile();

export const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true || desktopAppVersion() !== null;

let deferred: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    window.dispatchEvent(new Event('aria-installable'));
  });
}

// Finds the installer in the latest release (its name includes the version number).
async function latestInstallerUrl(): Promise<string> {
  try {
    const r = await fetch('https://api.github.com/repos/IrisERA/Aria/releases/latest');
    const release = await r.json();
    const exe = (release.assets ?? []).find((a: any) => /\.exe$/i.test(a.name));
    if (exe) return exe.browser_download_url;
  } catch {}
  return RELEASES_URL;
}

// A small picture of a browser address bar pointing at its install icon.
function AddressBarGuide() {
  return (
    <div className="installguide" aria-label="Click the install icon at the right end of the address bar">
      <div className="fakebar">
        <span className="fakeurl">🔒 aria-fawn-seven.vercel.app</span>
        <span className="fakeicon" aria-hidden="true">⊞<span className="arrow">↓</span></span>
      </div>
      <span className="hint">Click this icon in the address bar, then <b>Install</b>.</span>
    </div>
  );
}

export default function InstallButton({ big = false }: { big?: boolean }) {
  const [, setReady] = useState(!!deferred);
  const [done, setDone] = useState(isInstalled());
  const [help, setHelp] = useState<'' | 'guide' | 'ios' | 'downloaded' | 'other'>('');

  useEffect(() => {
    const ready = () => setReady(true);
    const finished = () => setDone(true);
    window.addEventListener('aria-installable', ready);
    window.addEventListener('appinstalled', finished);
    return () => {
      window.removeEventListener('aria-installable', ready);
      window.removeEventListener('appinstalled', finished);
    };
  }, []);

  if (done) return null;

  const windows = isWindowsDesktop();
  const label = windows ? '⬇ Download ARIA for Windows' : PLAY_STORE_URL && isAndroid() ? '▶ Get it on Google Play' : '⬇ Install ARIA';

  async function go() {
    if (windows) {
      window.location.href = await latestInstallerUrl();
      return setHelp('downloaded');
    }
    if (PLAY_STORE_URL && isAndroid()) return void window.open(PLAY_STORE_URL, '_blank', 'noopener');
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      setReady(false);
      if (outcome === 'accepted') setDone(true);
      return;
    }
    if (isIOS()) return setHelp(help ? '' : 'ios');
    if (!isMobile() && /OPR\/|Firefox\//.test(ua())) return setHelp(help ? '' : 'other');
    setHelp(help ? '' : 'guide');
  }

  return (
    <div className="installbox">
      <button className={big ? 'primary' : 'installbtn'} onClick={go}>{label}</button>
      {help === 'downloaded' && (
        <p className="hint installhelp">
          Open the downloaded file to install ARIA. If Windows says "Windows protected your PC", click <b>More info</b> → <b>Run anyway</b>.
        </p>
      )}
      {help === 'guide' && <AddressBarGuide />}
      {help === 'ios' && <p className="hint installhelp">In Safari, tap <b>Share</b> at the bottom, then <b>Add to Home Screen</b>.</p>}
      {help === 'other' && <p className="hint installhelp">This browser can't install apps. Open <b>aria-fawn-seven.vercel.app</b> in Chrome or Edge.</p>}
    </div>
  );
}
