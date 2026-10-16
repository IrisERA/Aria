import { Film, Library, ListChecks, Popcorn, Star, Tv, type LucideIcon } from 'lucide-react';

// One consistent set of line icons (Lucide) for ARIA, so it looks the same on every device.
export const TAB_ICONS: Record<'all' | 'movie' | 'series' | 'favorites' | 'want' | 'lists', LucideIcon> = {
  all: Library,
  movie: Film,
  series: Tv,
  favorites: Star,
  want: Popcorn,
  lists: ListChecks,
};

export const ICON = { size: 16, strokeWidth: 1.9 } as const;
