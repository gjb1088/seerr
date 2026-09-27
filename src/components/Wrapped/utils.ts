import type { WrappedResponse } from '@server/interfaces/api/wrappedInterfaces';

export type TimeOfDay = 'night' | 'morning' | 'afternoon' | 'evening';

export type Archetype =
  | 'adrenaline'
  | 'explorer'
  | 'animation'
  | 'comedy'
  | 'crime'
  | 'truth'
  | 'drama'
  | 'family'
  | 'fantasy'
  | 'history'
  | 'horror'
  | 'music'
  | 'mystery'
  | 'romance'
  | 'scifi'
  | 'thriller'
  | 'war'
  | 'western'
  | 'reality'
  | 'talk'
  | 'eclectic';

/** TMDB genre ids (movie and TV) mapped to a persona archetype */
const GENRE_ARCHETYPES: Record<number, Archetype> = {
  28: 'adrenaline',
  10759: 'adrenaline',
  12: 'explorer',
  16: 'animation',
  35: 'comedy',
  80: 'crime',
  99: 'truth',
  10763: 'truth',
  18: 'drama',
  10766: 'drama',
  10751: 'family',
  10762: 'family',
  14: 'fantasy',
  36: 'history',
  27: 'horror',
  10402: 'music',
  9648: 'mystery',
  10749: 'romance',
  878: 'scifi',
  10765: 'scifi',
  53: 'thriller',
  10752: 'war',
  10768: 'war',
  37: 'western',
  10764: 'reality',
  10767: 'talk',
};

export interface TimeStats {
  byHour: number[];
  byWeekday: number[];
  byMonth: number[];
  busiestMonth: number;
  busiestWeekday: number;
  peakHour: number;
  timeOfDay: TimeOfDay;
  busiestDay?: { date: Date; count: number };
  longestStreak: number;
  activeDays: number;
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const indexOfMax = (values: number[]) =>
  values.reduce(
    (best, value, index) => (value > values[best] ? index : best),
    0
  );

export const timeOfDayForHour = (hour: number): TimeOfDay => {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

/**
 * Bucket request timestamps in the viewer's own time zone, so a request made
 * at 1am local time counts as a night-owl request wherever the server lives.
 */
export const computeTimeStats = (timestamps: string[]): TimeStats => {
  const byHour = new Array(24).fill(0);
  const byWeekday = new Array(7).fill(0);
  const byMonth = new Array(12).fill(0);
  const byDay = new Map<string, { date: Date; count: number }>();

  for (const timestamp of timestamps) {
    const date = new Date(timestamp);
    byHour[date.getHours()]++;
    byWeekday[date.getDay()]++;
    byMonth[date.getMonth()]++;

    const key = dayKey(date);
    const entry = byDay.get(key) ?? { date, count: 0 };
    entry.count++;
    byDay.set(key, entry);
  }

  // Longest run of consecutive days with at least one request
  const days = [...byDay.values()]
    .map((entry) =>
      new Date(
        entry.date.getFullYear(),
        entry.date.getMonth(),
        entry.date.getDate()
      ).getTime()
    )
    .sort((a, b) => a - b);
  let longestStreak = days.length ? 1 : 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    // Round to absorb daylight saving shifts
    const gap = Math.round((days[i] - days[i - 1]) / 86_400_000);
    streak = gap === 1 ? streak + 1 : 1;
    longestStreak = Math.max(longestStreak, streak);
  }

  // Peak hour is smoothed over a three hour window so a single outlier
  // request doesn't decide someone's persona
  const smoothed = byHour.map(
    (_, hour) =>
      byHour[(hour + 23) % 24] + byHour[hour] * 2 + byHour[(hour + 1) % 24]
  );
  const peakHour = indexOfMax(smoothed);

  const busiestDay = [...byDay.values()].reduce<
    { date: Date; count: number } | undefined
  >(
    (best, entry) => (!best || entry.count > best.count ? entry : best),
    undefined
  );

  return {
    byHour,
    byWeekday,
    byMonth,
    busiestMonth: indexOfMax(byMonth),
    busiestWeekday: indexOfMax(byWeekday),
    peakHour,
    timeOfDay: timeOfDayForHour(peakHour),
    busiestDay,
    longestStreak,
    activeDays: byDay.size,
  };
};

export const archetypeFor = (wrapped: WrappedResponse): Archetype => {
  const [top, second] = wrapped.topGenres;
  if (!top) {
    return 'eclectic';
  }
  // No clear favourite across a varied list → eclectic
  if (
    wrapped.topGenres.length >= 4 &&
    second &&
    top.count === second.count &&
    wrapped.totals.requests >= 10
  ) {
    return 'eclectic';
  }
  return GENRE_ARCHETYPES[top.id] ?? 'eclectic';
};

export const tmdbImage = (
  path: string | undefined,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w342'
) => (path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined);

/** Deterministic shuffle so the poster wall looks the same on every replay */
export const seededShuffle = <T>(items: T[], seed: number): T[] => {
  const result = [...items];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 16807) % 2147483647;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
