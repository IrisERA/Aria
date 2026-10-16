import { useEffect, useState } from 'react';

// "Install ARIA": installs the website as an app (Chrome/Edge/Android), or shows how on iPhone/iPad.
// Hidden when ARIA is already running as an installed app or inside the desktop app.

const installed = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true || /Electron/.test(navigator.userAgent);
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let deferred: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    window.dispatchEvent(new Event('aria-installable'));
  });
}

export default function InstallButton() {
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  const [done, setDone] = useState(installed());
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const ready = () => setCanPrompt(true);
    const finished = () => setDone(true);
    window.addEventListener('aria-installable', ready);
    window.addEventListener('appinstalled', finished);
    return () => {
      window.removeEventListener('aria-installable', ready);
      window.removeEventListener('appinstalled', finished);
    };
  }, []);

  if (done || (!canPrompt && !isIOS())) return null;

  async function install() {
    if (!deferred) return setHelp(!help);
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    setCanPrompt(false);
    if (outcome === 'accepted') setDone(true);
  }

  return (
    <div className="installbox">
      <button className="installbtn" onClick={install}>⬇ Install ARIA</button>
      {help && (
        <p className="hint installhelp">
          On iPhone or iPad: tap the Share button <b>⎋</b> at the bottom of Safari, then <b>Add to Home Screen</b>.
        </p>
      )}
    </div>
  );
}
