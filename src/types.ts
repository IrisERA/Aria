export type Kind = 'movie' | 'series';
export type Source = 'manual' | 'audio';

export interface Watch {
  at: string; // ISO date
  source: Source;
}

export interface Title {
  id: string;
  name: string;
  kind: Kind;
  year?: string;
  poster?: string;
  description?: string;
  genres?: string[]; // e.g. Drama, Sci-Fi (missing = not looked up yet)
  favorite: boolean;
  watches: Watch[];
  rating?: number; // ½ to 5 stars
  status?: 'want'; // on the watchlist, not watched yet (absent = watched)
  watchlist?: boolean; // watched, and also kept on the watchlist
}

// On the watchlist: either not watched yet, or watched and kept there.
export const onWatchlist = (t: Pick<Title, 'status' | 'watchlist'>) => t.status === 'want' || !!t.watchlist;


export type TitleInfo = Pick<Title, 'name' | 'kind' | 'year' | 'poster' | 'description' | 'genres'>;
