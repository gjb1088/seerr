import type { MediaType } from '@server/constants/media';

export interface WrappedTitle {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath?: string;
  backdropPath?: string;
  releaseYear?: number;
  voteAverage?: number;
  popularity?: number;
  requestedAt: string;
}

export interface WrappedPerson {
  id: number;
  name: string;
  profilePath?: string;
  count: number;
  titles: string[];
}

export interface WrappedCount {
  id: number;
  name: string;
  count: number;
}

export interface WrappedResponse {
  year: number;
  availableYears: number[];
  generatedAt: string;
  user: {
    id: number;
    displayName: string;
    avatar: string;
  };
  totals: {
    requests: number;
    movies: number;
    series: number;
    seasons: number;
    episodes: number;
    fourK: number;
    approved: number;
    declined: number;
    pending: number;
    available: number;
  };
  /** Minutes of content: movie runtimes + requested episodes × episode runtime */
  runtimeMinutes: number;
  /** Raw request timestamps, so the client can bucket them in its own time zone */
  timestamps: string[];
  topGenres: WrappedCount[];
  decades: { decade: number; count: number }[];
  topNetworks: WrappedCount[];
  topActors: WrappedPerson[];
  topDirector?: WrappedPerson;
  averageRating?: number;
  firstRequest?: WrappedTitle;
  latestRequest?: WrappedTitle;
  highestRated?: WrappedTitle;
  hiddenGem?: WrappedTitle;
  blockbuster?: WrappedTitle;
  oldest?: WrappedTitle;
  posters: string[];
  rank?: {
    position: number;
    totalUsers: number;
    percentile: number;
  };
  /** Server-wide totals for the same year, for context */
  server: {
    requests: number;
    activeUsers: number;
  };
}
