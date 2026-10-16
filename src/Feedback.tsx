import { useState } from 'react';
import { Bug, Lightbulb, MessageCircle, Send } from 'lucide-react';
import { supabase } from './auth';

type Kind = 'bug' | 'idea' | 'other';
const KINDS: { id: Kind; label: string; icon: typeof Bug }[] = [
  { id: 'idea', label: 'Idea', icon: Lightbulb },
  { id: 'bug', label: 'Something broke', icon: Bug },
  { id: 'other', label: 'Other', icon: MessageCircle },
];
const HELP_EMAIL = 'aria.app.help@protonmail.com';

const device = () => {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Other';
  const app = /Electron/.test(ua) ? 'desktop app' : matchMedia('(display-mode: standalone)').matches ? 'installed' : 'browser';
  return `${os}, ${app}`;
};

// "Send feedback": saved to the feedback table in Supabase (see supabase/feedback.sql).
export default function Feedback({ email: accountEmail }: { email?: string }) {
  const [kind, setKind] = useState<Kind>('idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(accountEmail ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  async function send() {
    const text = message.trim();
    if (!text || !supabase) return;
    setState('sending');
    const { error } = await supabase.from('feedback').insert({
      kind,
      message: text.slice(0, 2000),
      email: email.trim().slice(0, 200) || null,
      app_version: __APP_VERSION__,
      device: device(),
    });
    setState(error ? 'failed' : 'sent');
    if (!error) setMessage('');
  }

  if (state === 'sent') {
    return (
      <div className="feedback sent">
        <b>Thank you! 💜</b>
        <p className="hint">Your feedback was sent. Every message gets read.</p>
        <button className="linkbtn" onClick={() => setState('idle')}>Send more</button>
      </div>
    );
  }

  return (
    <div className="feedback">
      <div className="row kinds" role="radiogroup" aria-label="Type of feedback">
        {KINDS.map((k) => (
          <button key={k.id} role="radio" aria-checked={kind === k.id} className={kind === k.id ? 'tab active' : 'tab'} onClick={() => setKind(k.id)}>
            <k.icon size={15} strokeWidth={1.9} /> {k.label}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder={kind === 'bug' ? 'What happened, and what did you expect?' : kind === 'idea' ? 'What would make ARIA better for you?' : 'Tell us anything…'}
        aria-label="Your feedback"
      />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (optional, if you'd like a reply)" aria-label="Your email" />
      <div className="row">
        <button className="primary" disabled={!message.trim() || state === 'sending'} onClick={send}>
          <Send size={14} /> {state === 'sending' ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
      {state === 'failed' && (
        <p className="hint error">
          Couldn't send it right now. You can email it instead:{' '}
          <a href={`mailto:${HELP_EMAIL}?subject=ARIA%20feedback&body=${encodeURIComponent(message)}`}>{HELP_EMAIL}</a>
        </p>
      )}
    </div>
  );
}
