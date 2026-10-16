import { useEffect, useState } from 'react';

// A text box that only saves when you press Enter. Esc or leaving the box puts the old value back.
export default function EnterInput({ value, onSave, allowEmpty = false, ...rest }: {
  value: string;
  onSave: (v: string) => void;
  allowEmpty?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const changed = draft.trim() !== value.trim();

  return (
    <span className="enterinput">
      <input
        {...rest}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = draft.trim();
            if (v || allowEmpty) onSave(v);
            else setDraft(value);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setDraft(value);
          }
        }}
        onBlur={() => setDraft(value)}
      />
      {changed && <span className="enterhint">Press Enter to save</span>}
    </span>
  );
}
