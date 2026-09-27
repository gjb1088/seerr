import TheMovieDb from '@server/api/themoviedb';
import type {
  TmdbMovieDetails,
  TmdbTvDetails,
} from '@server/api/themoviedb/interfaces';
import {
  MediaRequestStatus,
  MediaStatus,
  MediaType,
} from '@server/constants/media';
import { getRepository } from '@server/datasource';
import { MediaRequest } from '@server/entity/MediaRequest';
import type { User } from '@server/entity/User';
import type {
  WrappedCount,
  WrappedPerson,
  WrappedResponse,
  WrappedTitle,
} from '@server/interfaces/api/wrappedInterfaces';
import logger from '@server/logger';

/** Upper bound on TMDB lookups for a single Wrapped, newest requests first */
const MAX_TITLE_LOOKUPS = 250;
const LOOKUP_CONCURRENCY = 8;
const DEFAULT_EPISODE_RUNTIME = 42;
const TOP_BILLED_CAST = 6;

type TitleDetails =
  | { type: MediaType.MOVIE; details: TmdbMovieDetails }
  | { type: MediaType.TV; details: TmdbTvDetails };

interface PersonTally {
  id: number;
  name: string;
  profilePath?: string;
  titles: Set<string>;
}

const yearBounds = (year: number) => ({
  start: new Date(year, 0, 1),
  end: new Date(year + 1, 0, 1),
});

const releaseYear = (date?: string): number | undefined => {
  const year = date ? parseInt(date.slice(0, 4), 10) : NaN;
  return Number.isNaN(year) ? undefined : year;
};

/**
 * Run `fn` over `items` with at most `limit` promises in flight, so a
 * prolific requester doesn't fire hundreds of TMDB calls at once.
 */
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );

  return results;
};

const tallyPerson = (
  tally: Map<number, PersonTally>,
  person: { id: number; name: string; profile_path?: string },
  title: string
) => {
  const entry = tally.get(person.id) ?? {
    id: person.id,
    name: person.name,
    profilePath: person.profile_path,
    titles: new Set<string>(),
  };
  entry.titles.add(title);
  tally.set(person.id, entry);
};

const rankPeople = (
  tally: Map<number, PersonTally>,
  take: number
): WrappedPerson[] =>
  [...tally.values()]
    .filter((person) => person.titles.size > 1)
    .sort((a, b) => b.titles.size - a.titles.size)
    .slice(0, take)
    .map((person) => ({
      id: person.id,
      name: person.name,
      profilePath: person.profilePath,
      count: person.titles.size,
      titles: [...person.titles].slice(0, 5),
    }));

const rankCounts = (tally: Map<number, WrappedCount>, take: number) =>
  [...tally.values()].sort((a, b) => b.count - a.count).slice(0, take);

const bump = (tally: Map<number, WrappedCount>, id: number, name: string) => {
  const entry = tally.get(id) ?? { id, name, count: 0 };
  entry.count++;
  tally.set(id, entry);
};

export const getWrappedYears = async (user: User): Promise<number[]> => {
  const requests = await getRepository(MediaRequest).find({
    select: { id: true, createdAt: true },
    where: { requestedBy: { id: user.id } },
  });

  return [
    ...new Set(requests.map((request) => request.createdAt.getFullYear())),
  ].sort((a, b) => b - a);
};

const getServerRanking = async (user: User, year: number) => {
  const { start, end } = yearBounds(year);

  const rows: { userId: number | string; count: number | string }[] =
    await getRepository(MediaRequest)
      .createQueryBuilder('request')
      .leftJoin('request.requestedBy', 'requestedBy')
      .select('requestedBy.id', 'userId')
      .addSelect('COUNT(request.id)', 'count')
      .where('request.createdAt >= :start', { start })
      .andWhere('request.createdAt < :end', { end })
      .groupBy('requestedBy.id')
      .getRawMany();

  const counts = rows
    .map((row) => ({ userId: Number(row.userId), count: Number(row.count) }))
    .sort((a, b) => b.count - a.count);

  const serverRequests = counts.reduce((sum, row) => sum + row.count, 0);
  const own = counts.find((row) => row.userId === user.id);

  if (!own) {
    return { serverRequests, activeUsers: counts.length };
  }

  // Ties share the better position
  const position = counts.filter((row) => row.count > own.count).length + 1;

  return {
    serverRequests,
    activeUsers: counts.length,
    rank: {
      position,
      totalUsers: counts.length,
      percentile: Math.max(
        1,
        Math.round((position / Math.max(counts.length, 1)) * 100)
      ),
    },
  };
};

const fetchDetails = async (
  tmdb: TheMovieDb,
  type: MediaType,
  tmdbId: number,
  language?: string
): Promise<TitleDetails | undefined> => {
  try {
    if (type === MediaType.MOVIE) {
      return {
        type,
        details: await tmdb.getMovie({ movieId: tmdbId, language }),
      };
    }
    return {
      type: MediaType.TV,
      details: await tmdb.getTvShow({ tvId: tmdbId, language }),
    };
  } catch (e) {
    logger.debug('Skipping title in Wrapped, TMDB lookup failed', {
      label: 'Wrapped',
      tmdbId,
      type,
      errorMessage: e.message,
    });
    return undefined;
  }
};

export const generateWrapped = async (
  user: User,
  year: number,
  language?: string
): Promise<WrappedResponse> => {
  const { start, end } = yearBounds(year);

  const requests = await getRepository(MediaRequest)
    .createQueryBuilder('request')
    .leftJoinAndSelect('request.media', 'media')
    .leftJoinAndSelect('request.seasons', 'seasons')
    .leftJoin('request.requestedBy', 'requestedBy')
    .where('requestedBy.id = :id', { id: user.id })
    .andWhere('request.createdAt >= :start', { start })
    .andWhere('request.createdAt < :end', { end })
    .orderBy('request.createdAt', 'ASC')
    .getMany();

  const [availableYears, ranking] = await Promise.all([
    getWrappedYears(user),
    getServerRanking(user, year),
  ]);

  const totals: WrappedResponse['totals'] = {
    requests: requests.length,
    movies: 0,
    series: 0,
    seasons: 0,
    episodes: 0,
    fourK: 0,
    approved: 0,
    declined: 0,
    pending: 0,
    available: 0,
  };

  for (const request of requests) {
    if (request.type === MediaType.MOVIE) {
      totals.movies++;
    } else {
      totals.series++;
      totals.seasons += request.seasons?.length ?? 0;
    }
    if (request.is4k) {
      totals.fourK++;
    }

    switch (request.status) {
      case MediaRequestStatus.APPROVED:
      case MediaRequestStatus.COMPLETED:
        totals.approved++;
        break;
      case MediaRequestStatus.DECLINED:
        totals.declined++;
        break;
      case MediaRequestStatus.PENDING:
        totals.pending++;
        break;
    }

    const mediaStatus = request.is4k
      ? request.media?.status4k
      : request.media?.status;
    if (
      mediaStatus === MediaStatus.AVAILABLE ||
      mediaStatus === MediaStatus.PARTIALLY_AVAILABLE
    ) {
      totals.available++;
    }
  }

  // One lookup per title, even if it was requested in both HD and 4K
  const uniqueRequests = [
    ...new Map(
      requests
        .filter((request) => request.media)
        .map((request) => [`${request.type}-${request.media.tmdbId}`, request])
    ).values(),
  ];
  const lookupRequests = uniqueRequests.slice(-MAX_TITLE_LOOKUPS);

  const tmdb = new TheMovieDb();
  const lookups = await mapWithConcurrency(
    lookupRequests,
    LOOKUP_CONCURRENCY,
    (request) =>
      fetchDetails(tmdb, request.type, request.media.tmdbId, language)
  );

  const genres = new Map<number, WrappedCount>();
  const networks = new Map<number, WrappedCount>();
  const decades = new Map<number, number>();
  const actors = new Map<number, PersonTally>();
  const directors = new Map<number, PersonTally>();
  const titles: (WrappedTitle & { voteCount: number })[] = [];
  let runtimeMinutes = 0;

  lookupRequests.forEach((request, index) => {
    const lookup = lookups[index];
    if (!lookup) {
      return;
    }

    const requestedAt = request.createdAt.toISOString();

    if (lookup.type === MediaType.MOVIE) {
      const movie = lookup.details;
      const title = movie.title;

      runtimeMinutes += movie.runtime ?? 0;
      movie.genres?.forEach((genre) => bump(genres, genre.id, genre.name));
      movie.credits?.cast
        ?.slice(0, TOP_BILLED_CAST)
        .forEach((person) => tallyPerson(actors, person, title));
      movie.credits?.crew
        ?.filter((person) => person.job === 'Director')
        .forEach((person) => tallyPerson(directors, person, title));

      titles.push({
        tmdbId: movie.id,
        mediaType: MediaType.MOVIE,
        title,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseYear: releaseYear(movie.release_date),
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count ?? 0,
        popularity: movie.popularity,
        requestedAt,
      });
    } else {
      const show = lookup.details;
      const title = show.name;

      const requestedSeasons = new Set(
        (request.seasons ?? []).map((season) => season.seasonNumber)
      );
      const episodes = (show.seasons ?? [])
        .filter((season) => requestedSeasons.has(season.season_number))
        .reduce((sum, season) => sum + (season.episode_count ?? 0), 0);
      const episodeRuntime =
        show.episode_run_time?.find((runtime) => runtime > 0) ??
        DEFAULT_EPISODE_RUNTIME;

      totals.episodes += episodes;
      runtimeMinutes += episodes * episodeRuntime;
      show.genres?.forEach((genre) => bump(genres, genre.id, genre.name));
      show.networks?.forEach((network) =>
        bump(networks, network.id, network.name)
      );
      show.aggregate_credits?.cast
        ?.slice(0, TOP_BILLED_CAST)
        .forEach((person) => tallyPerson(actors, person, title));
      show.created_by?.forEach((person) =>
        tallyPerson(directors, person, title)
      );

      titles.push({
        tmdbId: show.id,
        mediaType: MediaType.TV,
        title,
        posterPath: show.poster_path,
        backdropPath: show.backdrop_path,
        releaseYear: releaseYear(show.first_air_date),
        voteAverage: show.vote_average,
        voteCount: show.vote_count ?? 0,
        popularity: show.popularity,
        requestedAt,
      });
    }

    const released = titles[titles.length - 1].releaseYear;
    if (released) {
      const decade = Math.floor(released / 10) * 10;
      decades.set(decade, (decades.get(decade) ?? 0) + 1);
    }
  });

  const strip = (
    title?: WrappedTitle & { voteCount: number }
  ): WrappedTitle | undefined => {
    if (!title) {
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { voteCount, ...rest } = title;
    return rest;
  };

  const pick = (
    candidates: (WrappedTitle & { voteCount: number })[],
    better: (
      a: WrappedTitle & { voteCount: number },
      b: WrappedTitle & { voteCount: number }
    ) => boolean
  ) =>
    candidates.reduce<(WrappedTitle & { voteCount: number }) | undefined>(
      (best, title) => (!best || better(title, best) ? title : best),
      undefined
    );

  const wellReviewed = titles.filter((title) => title.voteCount >= 100);
  const rated = titles.filter(
    (title) => title.voteCount > 0 && title.voteAverage
  );

  const highestRated = pick(
    wellReviewed,
    (a, b) => (a.voteAverage ?? 0) > (b.voteAverage ?? 0)
  );
  const blockbuster = pick(
    titles,
    (a, b) => (a.popularity ?? 0) > (b.popularity ?? 0)
  );
  const hiddenGem = pick(
    titles.filter(
      (title) =>
        title.voteCount >= 25 &&
        (title.voteAverage ?? 0) >= 7 &&
        title.tmdbId !== blockbuster?.tmdbId
    ),
    (a, b) => (a.popularity ?? 0) < (b.popularity ?? 0)
  );
  const oldest = pick(
    titles.filter((title) => title.releaseYear),
    (a, b) => (a.releaseYear ?? 0) < (b.releaseYear ?? 0)
  );

  const byRequestTime = [...titles].sort((a, b) =>
    a.requestedAt.localeCompare(b.requestedAt)
  );

  const averageRating = rated.length
    ? Math.round(
        (rated.reduce((sum, title) => sum + (title.voteAverage ?? 0), 0) /
          rated.length) *
          10
      ) / 10
    : undefined;

  return {
    year,
    availableYears,
    generatedAt: new Date().toISOString(),
    user: {
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar,
    },
    totals,
    runtimeMinutes,
    timestamps: requests.map((request) => request.createdAt.toISOString()),
    topGenres: rankCounts(genres, 5),
    topNetworks: rankCounts(networks, 3),
    decades: [...decades.entries()]
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => a.decade - b.decade),
    topActors: rankPeople(actors, 5),
    topDirector: rankPeople(directors, 1)[0],
    averageRating,
    firstRequest: strip(byRequestTime[0]),
    latestRequest: strip(byRequestTime[byRequestTime.length - 1]),
    highestRated: strip(highestRated),
    hiddenGem: strip(hiddenGem),
    blockbuster: strip(blockbuster),
    oldest: strip(oldest),
    posters: [
      ...new Set(
        byRequestTime
          .map((title) => title.posterPath)
          .filter((path): path is string => !!path)
      ),
    ].slice(0, 48),
    rank: ranking.rank,
    server: {
      requests: ranking.serverRequests,
      activeUsers: ranking.activeUsers,
    },
  };
};
