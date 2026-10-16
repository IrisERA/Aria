// Time-of-day greeting with a short, movie-flavoured follow-up picked at random.
const LINES: Record<string, string[]> = {
  morning: [
    'What are we watching today?',
    'Anything on the list for later?',
    'Coffee first, then pick tonight’s film.',
    'Plenty of day left to plan a good watch.',
    'Something new or an old favourite today?',
  ],
  afternoon: [
    'What’s on the agenda today?',
    'Got a film lined up for tonight?',
    'Good time to sort out the watchlist.',
    'Movie or a few episodes later?',
    'Anything you finished worth logging?',
  ],
  evening: [
    'What’s playing tonight?',
    'Film night or one more episode?',
    'Pick something good and settle in.',
    'What did you end up watching today?',
    'Popcorn optional. Picking a film isn’t.',
  ],
  night: [
    'One more episode, or call it a night?',
    'Late one. What’s on?',
    'Something short, or a long one?',
    'Anything worth logging before bed?',
    'Quiet hours, good films.',
  ],
};

export function greeting(name: string, now = new Date()): { hello: string; line: string } {
  const h = now.getHours();
  const part = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 23 ? 'evening' : 'night';
  const hello = part === 'night' ? 'Still up' : `Good ${part}`;
  const raw = name.trim().split(' ')[0] ?? '';
  const first = raw.charAt(0).toUpperCase() + raw.slice(1);
  const lines = LINES[part];
  return { hello: first ? `${hello}, ${first}` : hello, line: lines[Math.floor(Math.random() * lines.length)] };
}
