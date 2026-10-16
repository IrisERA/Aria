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
}

export type TitleInfo = Pick<Title, 'name' | 'kind' | 'year' | 'poster' | 'description' | 'genres'>;
