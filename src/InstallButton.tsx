import { useEffect, useState } from 'react';

// "Install ARIA": installs the website as an app where the browser allows it (Chrome, Edge, Android),
// and otherwise explains how for that browser. Hidden once ARIA runs as an installed app.

export const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true || /Electron/.test(navigator.userAgent);

// How to install in browsers that don't offer a one-tap install.
function howTo(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'On iPhone or iPad: open this page in Safari, tap the Share button at the bottom, then "Add to Home Screen".';
  }
  if (/OPR\/|Opera|OPX/.test(ua)) return 'Opera can\'t install websites as apps. Open aria-fawn-seven.vercel.app in Chrome or Edge, then tap Install ARIA there.';
  if (/Firefox\//.test(ua)) {
    return /Android/.test(ua)
      ? 'In Firefox: tap the ⋮ menu, then "Install" or "Add to Home screen".'
      : 'Firefox on computers can\'t install websites as apps. Open aria-fawn-seven.vercel.app in Chrome or Edge, then tap Install ARIA there.';
  }
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'In Safari on a Mac: File menu → "Add to Dock".';
  if (/Android/.test(ua)) return 'Tap the ⋮ menu in your browser, then "Install app" or "Add to Home screen".';
  return 'In Chrome or Edge: click the install icon at the right end of the address bar (or the ⋮ menu → "Install ARIA").';
}

let deferred: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    window.dispatchEvent(new Event('aria-installable'));
  });
}

export default function InstallButton({ big = false }: { big?: boolean }) {
  const [, setReady] = useState(!!deferred);
  const [done, setDone] = useState(isInstalled());
  const [help, setHelp] = useState(false);

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

  if (done) return big ? <p className="hint">✓ ARIA is installed on this device.</p> : null;

  async function install() {
    if (!deferred) return setHelp(!help);
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    setReady(false);
    if (outcome === 'accepted') setDone(true);
  }

  return (
    <div className="installbox">
      <button className={big ? 'primary' : 'installbtn'} onClick={install}>⬇ Install ARIA</button>
      {help && <p className="hint installhelp">{howTo()}</p>}
    </div>
  );
}
