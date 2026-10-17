import { useEffect, useState } from 'react';

// True on phone-sized screens, where ARIA uses its phone layout (bottom tabs, sheets).
const QUERY = '(max-width: 640px)';

export function useIsPhone() {
  const [phone, setPhone] = useState(() => matchMedia(QUERY).matches);
  useEffect(() => {
    const m = matchMedia(QUERY);
    const on = () => setPhone(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}
