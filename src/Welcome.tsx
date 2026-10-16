import { useState } from 'react';
import { createPortal } from 'react-dom';

const CARDS = [
  { icon: '🔍', title: 'Find anything', text: 'Search any movie or series and tap it to add it to your list.' },
  { icon: '⭐', title: 'Make it yours', text: 'Rate it, favourite it, or save it to your Watchlist for later. Tap ▼ More on any title for the details.' },
  { icon: '📝', title: 'Keep it safe', text: 'Build your own lists, and sign in so your list follows you to every device.' },
];

const KEY = 'aria.welcomed';

export function hasSeenWelcome() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

// A short, skippable welcome shown the first time ARIA opens (and from Settings → About).
export default function Welcome({ onClose, onSignIn, signedIn }: { onClose: () => void; onSignIn: () => void; signedIn: boolean }) {
  const [step, setStep] = useState(0);
  const last = step === CARDS.length - 1;
  const card = CARDS[step];

  function done(signIn = false) {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    onClose();
    if (signIn) onSignIn();
  }

  return createPortal(
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && done()}>
      <div className="welcome" role="dialog" aria-modal="true" aria-label="Welcome to ARIA">
        <button className="linkbtn skip" onClick={() => done()}>Skip</button>
        {step === 0 && <img src="/icon-192.png" alt="" className="welcome-logo" />}
        <div className="welcome-icon" aria-hidden="true">{card.icon}</div>
        <h2>{step === 0 ? 'Welcome to ARIA' : card.title}</h2>
        <p>{step === 0 ? `${card.title}. ${card.text}` : card.text}</p>
        <div className="dots" aria-hidden="true">
          {CARDS.map((_, i) => <span key={i} className={i === step ? 'dot on' : 'dot'} />)}
        </div>
        <div className="welcome-actions">
          {step > 0 && <button onClick={() => setStep(step - 1)}>Back</button>}
          {!last && <button className="primary" onClick={() => setStep(step + 1)}>Next</button>}
          {last && !signedIn && (<>
            <button onClick={() => done()}>Start as guest</button>
            <button className="primary" onClick={() => done(true)}>Sign in</button>
          </>)}
          {last && signedIn && <button className="primary" onClick={() => done()}>Let's go</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
