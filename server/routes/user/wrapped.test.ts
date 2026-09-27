import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';

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
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import SeasonRequest from '@server/entity/SeasonRequest';
import { User } from '@server/entity/User';
import type { WrappedResponse } from '@server/interfaces/api/wrappedInterfaces';
import { getSettings } from '@server/lib/settings';
import { checkUser } from '@server/middleware/auth';
import authRoutes from '@server/routes/auth';
import userRoutes from '@server/routes/user';
import { setupTestDb } from '@server/test/db';
import type { Express } from 'express';
import express from 'express';
import session from 'express-session';
import request from 'supertest';

mock.method(MediaRequest, 'sendNotification', async () => undefined);

const actor = (id: number, name: string) => ({
  id,
  name,
  cast_id: id,
  character: 'Someone',
  credit_id: `c${id}`,
  order: 0,
});

const movies: Record<number, Partial<TmdbMovieDetails>> = {
  101: {
    id: 101,
    title: 'Space Heist',
    release_date: '1984-06-01',
    runtime: 120,
    popularity: 900,
    vote_average: 7.9,
    vote_count: 5000,
    poster_path: '/space.jpg',
    genres: [
      { id: 878, name: 'Science Fiction' },
      { id: 28, name: 'Action' },
    ],
    credits: {
      cast: [actor(1, 'Ada Star'), actor(2, 'Bo Lead')],
      crew: [
        {
          id: 50,
          name: 'Dee Rector',
          job: 'Director',
          department: 'Directing',
          credit_id: 'd50',
        },
      ],
    },
  },
  102: {
    id: 102,
    title: 'Quiet Little Film',
    release_date: '2021-02-01',
    runtime: 95,
    popularity: 3,
    vote_average: 8.1,
    vote_count: 80,
    poster_path: '/quiet.jpg',
    genres: [{ id: 878, name: 'Science Fiction' }],
    credits: {
      cast: [actor(1, 'Ada Star')],
      crew: [
        {
          id: 50,
          name: 'Dee Rector',
          job: 'Director',
          department: 'Directing',
          credit_id: 'd51',
        },
      ],
    },
  },
};

const shows: Record<number, Partial<TmdbTvDetails>> = {
  201: {
    id: 201,
    name: 'Long Show',
    first_air_date: '2019-09-01',
    popularity: 50,
    vote_average: 8.4,
    vote_count: 1200,
    poster_path: '/long.jpg',
    episode_run_time: [30],
    genres: [{ id: 18, name: 'Drama' }],
    networks: [{ id: 7, name: 'Streamy', origin_country: 'US' }],
    seasons: [
      { id: 1, season_number: 1, episode_count: 10 },
      { id: 2, season_number: 2, episode_count: 8 },
      { id: 3, season_number: 3, episode_count: 12 },
    ] as TmdbTvDetails['seasons'],
    aggregate_credits: {
      cast: [{ ...actor(1, 'Ada Star'), roles: [] }],
    },
    created_by: [],
  },
};

Object.defineProperty(TheMovieDb.prototype, 'getMovie', {
  get() {
    return async ({ movieId }: { movieId: number }) =>
      movies[movieId] as TmdbMovieDetails;
  },
  set() {},
  configurable: true,
});

Object.defineProperty(TheMovieDb.prototype, 'getTvShow', {
  get() {
    return async ({ tvId }: { tvId: number }) => shows[tvId] as TmdbTvDetails;
  },
  set() {},
  configurable: true,
});

let app: Express;

before(() => {
  app = express();
  app.use(express.json());
  app.use(
    session({ secret: 'test-secret', resave: false, saveUninitialized: false })
  );
  app.use(checkUser);
  app.use('/auth', authRoutes);
  app.use('/user', userRoutes);
  app.use(
    (
      err: { status?: number; message?: string },
      _req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction
    ) => {
      res.status(err.status ?? 500).json({ message: err.message });
    }
  );
});

setupTestDb();

async function loginAs(email: string) {
  const settings = getSettings();
  const priorLocalLogin = settings.main.localLogin;
  settings.main.localLogin = true;

  try {
    const agent = request.agent(app);
    const res = await agent
      .post('/auth/local')
      .send({ email, password: 'test1234' });
    assert.strictEqual(res.status, 200);
    return agent;
  } finally {
    settings.main.localLogin = priorLocalLogin;
  }
}

async function seedRequest(
  email: string,
  type: MediaType,
  tmdbId: number,
  createdAt: Date,
  options: {
    status?: MediaRequestStatus;
    is4k?: boolean;
    seasons?: number[];
    mediaStatus?: MediaStatus;
  } = {}
) {
  const requestedBy = await getRepository(User).findOneOrFail({
    where: { email },
  });
  const mediaRepo = getRepository(Media);

  const media =
    (await mediaRepo.findOne({ where: { tmdbId, mediaType: type } })) ??
    (await mediaRepo.save(
      new Media({
        mediaType: type,
        tmdbId,
        status: options.mediaStatus ?? MediaStatus.UNKNOWN,
        status4k: MediaStatus.UNKNOWN,
      })
    ));

  await getRepository(MediaRequest).save(
    new MediaRequest({
      type,
      status: options.status ?? MediaRequestStatus.COMPLETED,
      media,
      requestedBy,
      is4k: options.is4k ?? false,
      createdAt,
      seasons: (options.seasons ?? []).map(
        (seasonNumber) =>
          new SeasonRequest({
            seasonNumber,
            status: options.status ?? MediaRequestStatus.COMPLETED,
          })
      ),
    })
  );
}

async function seedYear() {
  const friend = 'friend@seerr.dev';
  await seedRequest(friend, MediaType.MOVIE, 101, new Date(2025, 0, 5, 23), {
    mediaStatus: MediaStatus.AVAILABLE,
  });
  await seedRequest(friend, MediaType.MOVIE, 101, new Date(2025, 0, 6, 23), {
    is4k: true,
    status: MediaRequestStatus.DECLINED,
  });
  await seedRequest(friend, MediaType.MOVIE, 102, new Date(2025, 5, 1, 12), {
    status: MediaRequestStatus.PENDING,
  });
  await seedRequest(friend, MediaType.TV, 201, new Date(2025, 10, 20, 1), {
    seasons: [1, 3],
  });
  // Outside the year being summarised
  await seedRequest(friend, MediaType.MOVIE, 102, new Date(2024, 11, 31, 12));
  // Admin makes fewer requests, so friend ranks first
  await seedRequest(
    'admin@seerr.dev',
    MediaType.MOVIE,
    102,
    new Date(2025, 3, 1)
  );
}

describe('GET /user/:id/wrapped', () => {
  it("summarises the user's requests for the year", async () => {
    await seedYear();
    const friend = await getRepository(User).findOneOrFail({
      where: { email: 'friend@seerr.dev' },
    });

    const agent = await loginAs('friend@seerr.dev');
    const res = await agent.get(`/user/${friend.id}/wrapped?year=2025`);
    assert.strictEqual(res.status, 200);

    const wrapped: WrappedResponse = res.body;

    assert.deepStrictEqual(wrapped.availableYears, [2025, 2024]);
    assert.strictEqual(wrapped.timestamps.length, 4);
    assert.deepStrictEqual(wrapped.totals, {
      requests: 4,
      movies: 3,
      series: 1,
      seasons: 2,
      episodes: 22,
      fourK: 1,
      approved: 2,
      declined: 1,
      pending: 1,
      available: 1,
    });
    // 120 + 95 minutes of film, plus 22 episodes × 30 minutes
    assert.strictEqual(wrapped.runtimeMinutes, 120 + 95 + 22 * 30);

    assert.strictEqual(wrapped.topGenres[0].name, 'Science Fiction');
    assert.strictEqual(wrapped.topGenres[0].count, 2);
    assert.strictEqual(wrapped.topActors[0].name, 'Ada Star');
    assert.strictEqual(wrapped.topActors[0].count, 3);
    assert.strictEqual(wrapped.topDirector?.name, 'Dee Rector');
    assert.strictEqual(wrapped.topNetworks[0].name, 'Streamy');

    assert.strictEqual(wrapped.firstRequest?.title, 'Space Heist');
    assert.strictEqual(wrapped.latestRequest?.title, 'Long Show');
    assert.strictEqual(wrapped.blockbuster?.title, 'Space Heist');
    assert.strictEqual(wrapped.hiddenGem?.title, 'Quiet Little Film');
    assert.strictEqual(wrapped.highestRated?.title, 'Long Show');
    assert.strictEqual(wrapped.oldest?.releaseYear, 1984);
    assert.deepStrictEqual(
      wrapped.decades.map((d) => d.decade),
      [1980, 2010, 2020]
    );

    assert.deepStrictEqual(wrapped.rank, {
      position: 1,
      totalUsers: 2,
      percentile: 50,
    });
    assert.deepStrictEqual(wrapped.server, { requests: 5, activeUsers: 2 });
  });

  it('returns an empty summary for a quiet year', async () => {
    const friend = await getRepository(User).findOneOrFail({
      where: { email: 'friend@seerr.dev' },
    });

    const agent = await loginAs('friend@seerr.dev');
    const res = await agent.get(`/user/${friend.id}/wrapped?year=2023`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totals.requests, 0);
    assert.strictEqual(res.body.rank, undefined);
    assert.deepStrictEqual(res.body.topActors, []);
  });

  it("prevents a regular user from viewing someone else's Wrapped", async () => {
    const admin = await getRepository(User).findOneOrFail({
      where: { email: 'admin@seerr.dev' },
    });

    const agent = await loginAs('friend@seerr.dev');
    const res = await agent.get(`/user/${admin.id}/wrapped?year=2025`);

    assert.strictEqual(res.status, 403);
  });

  it("lets an admin view another user's Wrapped", async () => {
    const friend = await getRepository(User).findOneOrFail({
      where: { email: 'friend@seerr.dev' },
    });

    const agent = await loginAs('admin@seerr.dev');
    const res = await agent.get(`/user/${friend.id}/wrapped?year=2025`);

    assert.strictEqual(res.status, 200);
  });

  it('rejects an invalid year', async () => {
    const friend = await getRepository(User).findOneOrFail({
      where: { email: 'friend@seerr.dev' },
    });

    const agent = await loginAs('friend@seerr.dev');
    const res = await agent.get(`/user/${friend.id}/wrapped?year=1850`);

    assert.strictEqual(res.status, 400);
  });
});
