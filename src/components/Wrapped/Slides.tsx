import CachedImage from '@app/components/Common/CachedImage';
import type { Theme } from '@app/components/Wrapped/Common';
import {
  AnimatedNumber,
  Bar,
  Center,
  Confetti,
  Pop,
  Poster,
  PosterWall,
  Rise,
  THEMES,
} from '@app/components/Wrapped/Common';
import styles from '@app/components/Wrapped/Wrapped.module.css';
import type {
  Archetype,
  TimeOfDay,
  TimeStats,
} from '@app/components/Wrapped/utils';
import { archetypeFor, tmdbImage } from '@app/components/Wrapped/utils';
import defineMessages from '@app/utils/defineMessages';
import type {
  WrappedResponse,
  WrappedTitle,
} from '@server/interfaces/api/wrappedInterfaces';
import type { ReactNode } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Wrapped.Slides', {
  wrapped: 'Wrapped',
  introSubtitle: 'Your year in requests',
  introHint: 'Tap anywhere to begin',
  totalLead: 'This year you asked for',
  totalUnit: '{count, plural, one {request} other {requests}}',
  movieCount: '{count, plural, one {# movie} other {# movies}}',
  seriesCount: '{count, plural, one {# series} other {# series}}',
  serverShare: "That's {share}% of every request made on this server.",
  runtimeLead: 'Stacked end to end, that adds up to',
  runtimeUnit: 'hours of movies and TV',
  runtimeDays:
    "That's {days, plural, one {# full day} other {# full days}} straight. Snacks not included.",
  runtimeEpisodes:
    'Including {episodes, plural, one {# episode} other {# episodes}} across {seasons, plural, one {# season} other {# seasons}}.',
  firstLead: 'It all started on {date}',
  firstCaption: 'Your first request of {year}',
  latestCaption: 'Most recently: {title}',
  clockLead: 'Most of your requests landed around {hour}',
  clockWeekday: '{weekday} was your busiest day of the week.',
  timeOfDay_night: 'Night Owl',
  timeOfDay_morning: 'Early Bird',
  timeOfDay_afternoon: 'Matinee Regular',
  timeOfDay_evening: 'Prime-Time Planner',
  youAreA: 'You are a',
  monthsTitle: 'Your year, month by month',
  monthsBusiest:
    '{month} was your busiest month with {count, plural, one {# request} other {# requests}}.',
  busiestDay:
    'On {date} you went all in: {count, plural, one {# request} other {# requests}} in a single day.',
  streak: 'Longest streak: {days} days in a row.',
  genresTitle: 'Your top genres',
  genresLead: "You couldn't get enough of",
  titlesCount: '{count, plural, one {# title} other {# titles}}',
  decadesTitle:
    'Your taste spans {count, plural, one {# decade} other {# decades}}',
  decade: '{decade}s',
  oldestCaption: 'Oldest pick: {title} ({year})',
  actorsTitle: 'The face of your year',
  actorsLead:
    '{name} showed up in {count, plural, one {# of your requests} other {# of your requests}}',
  actorsRunnersUp: 'Also on repeat',
  directorTitle: 'Your go-to storyteller',
  directorLead:
    'You kept coming back to {name}, with {count, plural, one {# title} other {# titles}} this year',
  standoutsTitle: 'Standouts',
  blockbuster: 'Biggest crowd-pleaser',
  hiddenGem: 'Hidden gem',
  highestRated: 'Critical darling',
  rating: '{rating} / 10',
  outcomesTitle: 'How did it all turn out?',
  approved: 'Approved',
  pending: 'Pending',
  declined: 'Declined',
  available:
    '{count, plural, one {# of your requests is} other {# of your requests are}} ready to watch.',
  fourK: '{count, plural, one {# request} other {# requests}} in glorious 4K.',
  rankLead:
    'Out of {total, plural, one {# requester} other {# requesters}} on this server, you ranked',
  rankTop: 'Top {percentile}%',
  rankFirst: 'Nobody requested more than you. Legend.',
  personaLead: 'Your {year} persona',
  personaLine: 'A {timeOfDay} with a soft spot for {genre}.',
  personaLineNoGenre: 'A {timeOfDay} with wonderfully varied taste.',
  ratingPicky:
    'Picky, too: your picks average {rating} on TMDB. Only the good stuff.',
  ratingAverage: 'Your picks average {rating} on TMDB.',
  archetype_adrenaline: 'The Adrenaline Junkie',
  archetype_explorer: 'The Explorer',
  archetype_animation: 'The Animation Aficionado',
  archetype_comedy: 'The Comedy Connoisseur',
  archetype_crime: 'The Case Cracker',
  archetype_truth: 'The Truth Seeker',
  archetype_drama: 'The Drama Devotee',
  archetype_family: 'The Family Night Host',
  archetype_fantasy: 'The Realm Walker',
  archetype_history: 'The Time Traveller',
  archetype_horror: 'The Scream Collector',
  archetype_music: 'The Soundtrack Chaser',
  archetype_mystery: 'The Puzzle Solver',
  archetype_romance: 'The Hopeless Romantic',
  archetype_scifi: 'The Star Gazer',
  archetype_thriller: 'The Edge-of-Seat Addict',
  archetype_war: 'The Strategist',
  archetype_western: 'The Frontier Rider',
  archetype_reality: 'The Reality Addict',
  archetype_talk: 'The Late Show Regular',
  archetype_eclectic: 'The Eclectic Curator',
});

export const ARCHETYPE_EMOJI: Record<Archetype, string> = {
  adrenaline: '💥',
  explorer: '🧭',
  animation: '✏️',
  comedy: '😂',
  crime: '🕵️',
  truth: '🔎',
  drama: '🎭',
  family: '🍿',
  fantasy: '🐉',
  history: '⏳',
  horror: '👻',
  music: '🎧',
  mystery: '🧩',
  romance: '💘',
  scifi: '🚀',
  thriller: '😱',
  war: '♟️',
  western: '🤠',
  reality: '📺',
  talk: '🎙️',
  eclectic: '🎨',
};

export const useWrappedLabels = () => {
  const intl = useIntl();
  return {
    archetype: (archetype: Archetype) =>
      intl.formatMessage(messages[`archetype_${archetype}`]),
    timeOfDay: (timeOfDay: TimeOfDay) =>
      intl.formatMessage(messages[`timeOfDay_${timeOfDay}`]),
  };
};

export interface SlideProps {
  data: WrappedResponse;
  stats: TimeStats;
}

export interface SlideDefinition {
  key: string;
  theme: Theme;
  /** Seconds before auto-advancing */
  duration?: number;
  render: (props: SlideProps) => ReactNode;
}

const Heading = ({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) => (
  <Rise
    as="h2"
    delay={delay}
    className="text-balance text-2xl font-extrabold leading-tight text-white sm:text-3xl"
  >
    {children}
  </Rise>
);

const Lead = ({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) => (
  <Rise
    as="p"
    delay={delay}
    className="text-balance text-lg font-semibold text-white/70 sm:text-xl"
  >
    {children}
  </Rise>
);

const Giant = ({
  children,
  delay = 150,
  gradient = 'from-white via-indigo-100 to-purple-300',
}: {
  children: ReactNode;
  delay?: number;
  gradient?: string;
}) => (
  <Pop delay={delay}>
    <div
      className={`bg-gradient-to-br ${gradient} bg-clip-text py-2 text-7xl font-black leading-none tracking-tighter text-transparent sm:text-8xl`}
    >
      {children}
    </div>
  </Pop>
);

const TitleCaption = ({ title }: { title: WrappedTitle }) => (
  <div className="text-center">
    <div className="text-xl font-bold text-white">{title.title}</div>
    {title.releaseYear && (
      <div className="text-sm font-medium text-white/60">
        {title.releaseYear}
      </div>
    )}
  </div>
);

const IntroSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  return (
    <>
      <PosterWall
        posters={data.posters}
        seed={data.user.id * 31 + data.year}
        className="opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-gray-950/40 to-gray-950/90" />
      <div className="relative">
        <Center>
          <Pop delay={100}>
            <div className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-white/20">
              <CachedImage
                type="avatar"
                src={data.user.avatar}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          </Pop>
          <Rise delay={300} className="text-xl font-bold text-white/80">
            {data.user.displayName}
          </Rise>
          <Giant
            delay={450}
            gradient="from-indigo-300 via-fuchsia-300 to-amber-200"
          >
            {data.year}
          </Giant>
          <Rise
            delay={650}
            className="text-4xl font-black uppercase tracking-[0.3em] text-white"
          >
            {intl.formatMessage(messages.wrapped)}
          </Rise>
          <Lead delay={900}>{intl.formatMessage(messages.introSubtitle)}</Lead>
          <Rise
            delay={1600}
            className="mt-8 animate-pulse text-sm font-medium uppercase tracking-widest text-white/50"
          >
            {intl.formatMessage(messages.introHint)}
          </Rise>
        </Center>
      </div>
    </>
  );
};

const TotalSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const { requests, movies, series } = data.totals;
  const share =
    data.server.requests > 0
      ? Math.round((requests / data.server.requests) * 100)
      : 0;

  return (
    <Center>
      <Lead>{intl.formatMessage(messages.totalLead)}</Lead>
      <Giant gradient="from-amber-200 via-rose-300 to-fuchsia-400">
        <AnimatedNumber
          value={requests}
          format={(v) => intl.formatNumber(Math.round(v))}
        />
      </Giant>
      <Rise delay={300} className="text-3xl font-extrabold text-white">
        {intl.formatMessage(messages.totalUnit, { count: requests })}
      </Rise>
      <Rise delay={900} className="mt-6 w-full max-w-sm">
        <div className="flex h-4 overflow-hidden rounded-full bg-white/10">
          <div
            className={`${styles.grow} bg-gradient-to-r from-amber-400 to-rose-500`}
            style={{
              width: `${(movies / Math.max(requests, 1)) * 100}%`,
              animationDelay: '1s',
            }}
          />
          <div
            className={`${styles.grow} bg-gradient-to-r from-fuchsia-500 to-indigo-500`}
            style={{
              width: `${(series / Math.max(requests, 1)) * 100}%`,
              animationDelay: '1.4s',
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-sm font-semibold">
          <span className="text-amber-300">
            {intl.formatMessage(messages.movieCount, { count: movies })}
          </span>
          <span className="text-fuchsia-300">
            {intl.formatMessage(messages.seriesCount, { count: series })}
          </span>
        </div>
      </Rise>
      {data.server.activeUsers > 1 && share > 0 && (
        <Lead delay={1800}>
          {intl.formatMessage(messages.serverShare, { share })}
        </Lead>
      )}
    </Center>
  );
};

const RuntimeSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const hours = Math.round(data.runtimeMinutes / 60);
  const days = Math.floor(data.runtimeMinutes / 60 / 24);

  return (
    <Center>
      <Lead>{intl.formatMessage(messages.runtimeLead)}</Lead>
      <Giant gradient="from-cyan-200 via-sky-300 to-blue-500">
        <AnimatedNumber
          value={hours}
          format={(v) => intl.formatNumber(Math.round(v))}
        />
      </Giant>
      <Rise delay={300} className="text-2xl font-extrabold text-white">
        {intl.formatMessage(messages.runtimeUnit)}
      </Rise>
      {days > 0 && (
        <Lead delay={1200}>
          {intl.formatMessage(messages.runtimeDays, { days })}
        </Lead>
      )}
      {data.totals.episodes > 0 && (
        <Lead delay={1800}>
          {intl.formatMessage(messages.runtimeEpisodes, {
            episodes: data.totals.episodes,
            seasons: data.totals.seasons,
          })}
        </Lead>
      )}
    </Center>
  );
};

const FirstSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const first = data.firstRequest as WrappedTitle;
  const latest = data.latestRequest;

  return (
    <Center>
      <Heading>
        {intl.formatMessage(messages.firstLead, {
          date: intl.formatDate(first.requestedAt, {
            month: 'long',
            day: 'numeric',
          }),
        })}
      </Heading>
      <Pop delay={400} className="w-44 sm:w-52">
        <Poster
          path={first.posterPath}
          alt={first.title}
          size="w500"
          priority
        />
      </Pop>
      <Rise delay={800}>
        <TitleCaption title={first} />
      </Rise>
      <Lead delay={1100}>
        {intl.formatMessage(messages.firstCaption, { year: data.year })}
      </Lead>
      {latest && latest.tmdbId !== first.tmdbId && (
        <Rise
          delay={2200}
          className="flex items-center gap-3 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white/80"
        >
          <Poster path={latest.posterPath} size="w185" className="w-7" />
          {intl.formatMessage(messages.latestCaption, { title: latest.title })}
        </Rise>
      )}
    </Center>
  );
};

const ClockSlide = ({ stats }: SlideProps) => {
  const intl = useIntl();
  const labels = useWrappedLabels();
  const max = Math.max(...stats.byHour, 1);
  const inner = 62;
  const reach = 70;

  const hourLabel = (hour: number) =>
    intl.formatTime(new Date(2000, 0, 1, hour), { hour: 'numeric' });
  const weekday = intl.formatDate(
    // 2023-01-01 was a Sunday, so offset by getDay() index
    new Date(2023, 0, 1 + stats.busiestWeekday),
    { weekday: 'long' }
  );

  return (
    <Center>
      <Lead>{intl.formatMessage(messages.youAreA)}</Lead>
      <Heading delay={150}>
        <span className="text-4xl sm:text-5xl">
          {labels.timeOfDay(stats.timeOfDay)}
        </span>
      </Heading>
      <Pop delay={300} className="w-64 sm:w-72">
        <svg viewBox="-150 -150 300 300" className="overflow-visible">
          <circle r={inner - 6} className="fill-white/5" />
          <g className={styles.spin} style={{ animationDuration: '120s' }}>
            <circle
              r={inner + reach + 8}
              className="fill-none stroke-white/10"
              strokeDasharray="2 6"
            />
          </g>
          {stats.byHour.map((count, hour) => {
            const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
            const length = 4 + (count / max) * reach;
            const isPeak = hour === stats.peakHour;
            return (
              <line
                key={hour}
                x1={Math.cos(angle) * inner}
                y1={Math.sin(angle) * inner}
                x2={Math.cos(angle) * (inner + length)}
                y2={Math.sin(angle) * (inner + length)}
                strokeWidth={10}
                strokeLinecap="round"
                className={`${styles.pop} ${
                  isPeak ? 'stroke-pink-400' : 'stroke-violet-300/70'
                }`}
                style={{
                  animationDelay: `${400 + hour * 40}ms`,
                  transformOrigin: 'center',
                  transformBox: 'view-box',
                }}
              />
            );
          })}
          {[0, 6, 12, 18].map((hour) => {
            const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
            return (
              <text
                key={hour}
                x={Math.cos(angle) * (inner - 22)}
                y={Math.sin(angle) * (inner - 22)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white/50 text-[11px] font-semibold"
              >
                {hourLabel(hour)}
              </text>
            );
          })}
        </svg>
      </Pop>
      <Lead delay={1400}>
        {intl.formatMessage(messages.clockLead, {
          hour: hourLabel(stats.peakHour),
        })}
      </Lead>
      <Lead delay={2000}>
        {intl.formatMessage(messages.clockWeekday, { weekday })}
      </Lead>
    </Center>
  );
};

const MonthsSlide = ({ data, stats }: SlideProps) => {
  const intl = useIntl();
  const max = Math.max(...stats.byMonth, 1);
  const monthName = (month: number, style: 'narrow' | 'long') =>
    intl.formatDate(new Date(data.year, month, 1), { month: style });

  return (
    <Center>
      <Heading>{intl.formatMessage(messages.monthsTitle)}</Heading>
      <div className="flex h-48 w-full max-w-md items-end gap-1.5 sm:gap-2">
        {stats.byMonth.map((count, month) => (
          <div
            key={month}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            {count > 0 && (
              <Rise
                delay={500 + month * 70}
                className="text-[10px] font-bold text-white/70"
              >
                {count}
              </Rise>
            )}
            <div
              className={`${styles.growUp} w-full rounded-t-md ${
                month === stats.busiestMonth
                  ? 'bg-gradient-to-t from-emerald-500 to-lime-300'
                  : 'bg-white/25'
              }`}
              style={{
                height: `${Math.max(3, (count / max) * 100)}%`,
                animationDelay: `${300 + month * 70}ms`,
              }}
            />
            <span className="text-xs font-bold text-white/60">
              {monthName(month, 'narrow')}
            </span>
          </div>
        ))}
      </div>
      <Lead delay={1400}>
        {intl.formatMessage(messages.monthsBusiest, {
          month: monthName(stats.busiestMonth, 'long'),
          count: stats.byMonth[stats.busiestMonth],
        })}
      </Lead>
      {stats.busiestDay && stats.busiestDay.count > 1 && (
        <Lead delay={2000}>
          {intl.formatMessage(messages.busiestDay, {
            date: intl.formatDate(stats.busiestDay.date, {
              month: 'long',
              day: 'numeric',
            }),
            count: stats.busiestDay.count,
          })}
        </Lead>
      )}
      {stats.longestStreak > 1 && (
        <Rise
          delay={2600}
          className="rounded-full bg-emerald-400/20 px-4 py-1.5 text-sm font-bold text-emerald-200 ring-1 ring-emerald-300/30"
        >
          🔥{' '}
          {intl.formatMessage(messages.streak, { days: stats.longestStreak })}
        </Rise>
      )}
    </Center>
  );
};

const GenresSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const [top, ...rest] = data.topGenres;
  const max = top.count;

  return (
    <Center>
      <Lead>{intl.formatMessage(messages.genresLead)}</Lead>
      <Pop delay={200}>
        <div className="bg-gradient-to-br from-yellow-200 via-amber-300 to-orange-500 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
          {top.name}
        </div>
      </Pop>
      <Rise delay={400} className="text-sm font-bold text-white/60">
        {intl.formatMessage(messages.titlesCount, { count: top.count })}
      </Rise>
      <ol className="mt-4 w-full max-w-sm space-y-3 text-left">
        {rest.map((genre, index) => (
          <Rise as="li" key={genre.id} delay={900 + index * 250}>
            <div className="mb-1 flex items-baseline justify-between text-white">
              <span className="font-bold">
                <span className="mr-2 text-white/40">{index + 2}</span>
                {genre.name}
              </span>
              <span className="text-sm text-white/60">{genre.count}</span>
            </div>
            <div className="h-2">
              <Bar
                percent={(genre.count / max) * 100}
                delay={1000 + index * 250}
                className="bg-gradient-to-r from-amber-300 to-orange-500"
              />
            </div>
          </Rise>
        ))}
      </ol>
    </Center>
  );
};

const DecadesSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const max = Math.max(...data.decades.map((d) => d.count), 1);
  const oldest = data.oldest;

  return (
    <Center>
      <Heading>
        {intl.formatMessage(messages.decadesTitle, {
          count: data.decades.length,
        })}
      </Heading>
      <div className="w-full max-w-sm space-y-2">
        {data.decades.map((decade, index) => (
          <Rise
            key={decade.decade}
            delay={300 + index * 150}
            className="flex items-center gap-3"
          >
            <span className="w-14 text-right text-sm font-bold text-white/70">
              {intl.formatMessage(messages.decade, { decade: decade.decade })}
            </span>
            <div className="h-5 flex-1">
              <Bar
                percent={(decade.count / max) * 100}
                delay={400 + index * 150}
                className="bg-gradient-to-r from-cyan-300 to-blue-500"
              />
            </div>
            <span className="w-6 text-sm font-semibold text-white/60">
              {decade.count}
            </span>
          </Rise>
        ))}
      </div>
      {oldest?.releaseYear && (
        <Rise
          delay={600 + data.decades.length * 150}
          className="mt-4 flex items-center gap-4 rounded-2xl bg-white/10 p-3 pr-5 text-left"
        >
          <Poster path={oldest.posterPath} size="w185" className="w-14" />
          <span className="font-semibold text-white">
            {intl.formatMessage(messages.oldestCaption, {
              title: oldest.title,
              year: oldest.releaseYear,
            })}
          </span>
        </Rise>
      )}
    </Center>
  );
};

const PersonPhoto = ({
  path,
  className = '',
}: {
  path?: string;
  className?: string;
}) => {
  const src = tmdbImage(path, 'w342');
  return (
    <div
      className={`relative overflow-hidden rounded-full bg-gray-700 ring-4 ring-white/20 ${className}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      {src && (
        <CachedImage
          type="tmdb"
          src={src}
          alt=""
          fill
          sizes="200px"
          className="object-cover"
        />
      )}
    </div>
  );
};

const ActorsSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const [top, ...rest] = data.topActors;

  return (
    <Center>
      <Heading>{intl.formatMessage(messages.actorsTitle)}</Heading>
      <Pop delay={300}>
        <PersonPhoto path={top.profilePath} className="w-40 sm:w-48" />
      </Pop>
      <Rise delay={600} className="text-3xl font-black text-white">
        {top.name}
      </Rise>
      <Lead delay={900}>
        {intl.formatMessage(messages.actorsLead, {
          name: top.name,
          count: top.count,
        })}
      </Lead>
      <Rise delay={1200} className="text-sm italic text-white/50">
        {top.titles.join(' · ')}
      </Rise>
      {rest.length > 0 && (
        <Rise delay={2000} className="mt-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
            {intl.formatMessage(messages.actorsRunnersUp)}
          </div>
          <div className="flex justify-center gap-4">
            {rest.map((person) => (
              <div key={person.id} className="w-16 text-center">
                <PersonPhoto path={person.profilePath} className="w-16" />
                <div className="mt-1 line-clamp-2 text-xs font-semibold text-white/80">
                  {person.name}
                </div>
              </div>
            ))}
          </div>
        </Rise>
      )}
    </Center>
  );
};

const DirectorSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const director = data.topDirector!;

  return (
    <Center>
      <Heading>{intl.formatMessage(messages.directorTitle)}</Heading>
      <Pop delay={300}>
        <PersonPhoto path={director.profilePath} className="w-40 sm:w-48" />
      </Pop>
      <Rise delay={600} className="text-3xl font-black text-white">
        {director.name}
      </Rise>
      <Lead delay={900}>
        {intl.formatMessage(messages.directorLead, {
          name: director.name,
          count: director.count,
        })}
      </Lead>
      <Rise delay={1300} className="text-sm italic text-white/50">
        {director.titles.join(' · ')}
      </Rise>
    </Center>
  );
};

const StandoutsSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const picks = [
    { label: messages.blockbuster, title: data.blockbuster, emoji: '🍿' },
    { label: messages.hiddenGem, title: data.hiddenGem, emoji: '💎' },
    { label: messages.highestRated, title: data.highestRated, emoji: '🏆' },
  ].filter(
    (pick, index, all): pick is typeof pick & { title: WrappedTitle } =>
      !!pick.title &&
      // Don't show the same title twice
      all.findIndex(
        (other) =>
          other.title?.tmdbId === pick.title?.tmdbId &&
          other.title?.mediaType === pick.title?.mediaType
      ) === index
  );

  return (
    <Center>
      <Heading>{intl.formatMessage(messages.standoutsTitle)}</Heading>
      <div className="flex w-full max-w-lg justify-center gap-3 sm:gap-5">
        {picks.map((pick, index) => (
          <Pop
            key={pick.label.id}
            delay={400 + index * 450}
            className="flex w-1/3 max-w-[10rem] flex-col items-center gap-2"
          >
            <div className="text-xs font-bold uppercase tracking-wide text-amber-200">
              {pick.emoji} {intl.formatMessage(pick.label)}
            </div>
            <Poster
              path={pick.title.posterPath}
              alt={pick.title.title}
              className="w-full"
            />
            <div className="line-clamp-2 text-sm font-bold text-white">
              {pick.title.title}
            </div>
            {pick.title.voteAverage ? (
              <div className="text-xs font-semibold text-white/60">
                ★{' '}
                {intl.formatMessage(messages.rating, {
                  rating: intl.formatNumber(pick.title.voteAverage, {
                    maximumFractionDigits: 1,
                  }),
                })}
              </div>
            ) : null}
          </Pop>
        ))}
      </div>
    </Center>
  );
};

const OutcomesSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const { approved, pending, declined, available, fourK } = data.totals;
  const total = Math.max(approved + pending + declined, 1);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    {
      label: messages.approved,
      value: approved,
      className: 'stroke-emerald-400',
      dot: 'bg-emerald-400',
    },
    {
      label: messages.pending,
      value: pending,
      className: 'stroke-amber-300',
      dot: 'bg-amber-300',
    },
    {
      label: messages.declined,
      value: declined,
      className: 'stroke-rose-400',
      dot: 'bg-rose-400',
    },
  ];

  let offset = 0;

  return (
    <Center>
      <Heading>{intl.formatMessage(messages.outcomesTitle)}</Heading>
      <Pop delay={300} className="relative w-56">
        <svg viewBox="-100 -100 200 200" className="-rotate-90">
          <circle
            r={radius}
            className="fill-none stroke-white/10"
            strokeWidth={22}
          />
          {segments.map((segment) => {
            const length = (segment.value / total) * circumference;
            const dashOffset = -offset;
            offset += length;
            return (
              <circle
                key={segment.label.id}
                r={radius}
                className={`fill-none ${segment.className}`}
                strokeWidth={22}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-black text-white">
            <AnimatedNumber value={Math.round((approved / total) * 100)} />%
          </div>
          <div className="text-xs font-bold uppercase text-white/60">
            {intl.formatMessage(messages.approved)}
          </div>
        </div>
      </Pop>
      <Rise
        delay={800}
        className="flex gap-5 text-sm font-semibold text-white/80"
      >
        {segments.map((segment) => (
          <span key={segment.label.id} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${segment.dot}`} />
            {intl.formatMessage(segment.label)} {segment.value}
          </span>
        ))}
      </Rise>
      {available > 0 && (
        <Lead delay={1400}>
          {intl.formatMessage(messages.available, { count: available })}
        </Lead>
      )}
      {fourK > 0 && (
        <Lead delay={2000}>
          ✨ {intl.formatMessage(messages.fourK, { count: fourK })}
        </Lead>
      )}
    </Center>
  );
};

const RankSlide = ({ data }: SlideProps) => {
  const intl = useIntl();
  const rank = data.rank!;

  return (
    <>
      {rank.position <= 3 && <Confetti />}
      <Center>
        <Lead>
          {intl.formatMessage(messages.rankLead, { total: rank.totalUsers })}
        </Lead>
        <Giant gradient="from-yellow-100 via-yellow-300 to-amber-500">
          #{intl.formatNumber(rank.position)}
        </Giant>
        {rank.position === 1 ? (
          <Rise delay={700} className="text-2xl font-extrabold text-white">
            👑 {intl.formatMessage(messages.rankFirst)}
          </Rise>
        ) : (
          <Rise
            delay={700}
            className="rounded-full bg-amber-300 px-5 py-2 text-xl font-black text-gray-900"
          >
            {intl.formatMessage(messages.rankTop, {
              percentile: rank.percentile,
            })}
          </Rise>
        )}
      </Center>
    </>
  );
};

const PersonaSlide = ({ data, stats }: SlideProps) => {
  const intl = useIntl();
  const labels = useWrappedLabels();
  const archetype = archetypeFor(data);
  const genre = data.topGenres[0]?.name;
  const timeOfDay = labels.timeOfDay(stats.timeOfDay);

  return (
    <Center>
      <Lead>
        {intl.formatMessage(messages.personaLead, { year: data.year })}
      </Lead>
      <Pop delay={300} className="text-8xl">
        {ARCHETYPE_EMOJI[archetype]}
      </Pop>
      <Pop delay={700}>
        <div className="bg-gradient-to-br from-pink-200 via-fuchsia-300 to-violet-400 bg-clip-text text-4xl font-black leading-tight tracking-tight text-transparent sm:text-5xl">
          {labels.archetype(archetype)}
        </div>
      </Pop>
      <Lead delay={1200}>
        {genre && archetype !== 'eclectic'
          ? intl.formatMessage(messages.personaLine, { timeOfDay, genre })
          : intl.formatMessage(messages.personaLineNoGenre, { timeOfDay })}
      </Lead>
      {data.averageRating !== undefined && (
        <Lead delay={1900}>
          {intl.formatMessage(
            data.averageRating >= 7.5
              ? messages.ratingPicky
              : messages.ratingAverage,
            {
              rating: intl.formatNumber(data.averageRating, {
                maximumFractionDigits: 1,
              }),
            }
          )}
        </Lead>
      )}
    </Center>
  );
};

/**
 * The story, in order. Slides without enough data to say something
 * interesting are left out rather than shown half empty.
 */
export const buildSlides = (data: WrappedResponse): SlideDefinition[] => {
  const slides: (SlideDefinition | false)[] = [
    { key: 'intro', theme: THEMES.indigo, duration: 6, render: IntroSlide },
    { key: 'total', theme: THEMES.sunset, render: TotalSlide },
    data.runtimeMinutes >= 60 && {
      key: 'runtime',
      theme: THEMES.ocean,
      render: RuntimeSlide,
    },
    !!data.firstRequest && {
      key: 'first',
      theme: THEMES.midnight,
      render: FirstSlide,
    },
    data.totals.requests >= 3 && {
      key: 'clock',
      theme: THEMES.neon,
      duration: 9,
      render: ClockSlide,
    },
    data.totals.requests >= 3 && {
      key: 'months',
      theme: THEMES.forest,
      duration: 9,
      render: MonthsSlide,
    },
    data.topGenres.length > 0 && {
      key: 'genres',
      theme: THEMES.gold,
      render: GenresSlide,
    },
    data.decades.length > 1 && {
      key: 'decades',
      theme: THEMES.ocean,
      render: DecadesSlide,
    },
    data.topActors.length > 0 && {
      key: 'actors',
      theme: THEMES.neon,
      duration: 9,
      render: ActorsSlide,
    },
    !!data.topDirector && {
      key: 'director',
      theme: THEMES.midnight,
      render: DirectorSlide,
    },
    !!(data.blockbuster || data.hiddenGem || data.highestRated) && {
      key: 'standouts',
      theme: THEMES.gold,
      duration: 9,
      render: StandoutsSlide,
    },
    {
      key: 'outcomes',
      theme: THEMES.forest,
      render: OutcomesSlide,
    },
    !!data.rank &&
      data.rank.totalUsers > 1 && {
        key: 'rank',
        theme: THEMES.gold,
        render: RankSlide,
      },
    { key: 'persona', theme: THEMES.neon, duration: 9, render: PersonaSlide },
  ];

  return slides.filter((slide): slide is SlideDefinition => !!slide);
};
