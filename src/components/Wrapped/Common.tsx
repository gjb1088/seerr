import CachedImage from '@app/components/Common/CachedImage';
import styles from '@app/components/Wrapped/Wrapped.module.css';
import { seededShuffle, tmdbImage } from '@app/components/Wrapped/utils';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

export const easeOutExpo = (t: number) =>
  t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  format?: (value: number) => string;
}

/** Counts up from zero to `value` when mounted */
export const AnimatedNumber = ({
  value,
  duration = 1800,
  delay = 200,
  format = (v) => Math.round(v).toString(),
}: AnimatedNumberProps) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setCurrent(value);
      return;
    }

    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now + delay;
      const progress = Math.max(0, (now - start) / duration);
      setCurrent(value * easeOutExpo(progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, delay]);

  return <span className="tabular-nums">{format(current)}</span>;
};

export const Rise = ({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'p' | 'h1' | 'h2' | 'span' | 'li';
}) => (
  <Tag
    className={`${styles.rise} ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </Tag>
);

export const Pop = ({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <div
    className={`${styles.pop} ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

export interface Theme {
  /** Tailwind gradient classes for the slide background */
  background: string;
  /** Two blob colours floating behind the content */
  blobs: [string, string];
}

export const THEMES = {
  indigo: {
    background: 'bg-gradient-to-br from-indigo-950 via-gray-950 to-purple-950',
    blobs: ['bg-indigo-500', 'bg-fuchsia-500'],
  },
  sunset: {
    background: 'bg-gradient-to-br from-rose-950 via-gray-950 to-orange-950',
    blobs: ['bg-rose-500', 'bg-amber-500'],
  },
  ocean: {
    background: 'bg-gradient-to-br from-cyan-950 via-gray-950 to-blue-950',
    blobs: ['bg-cyan-400', 'bg-blue-600'],
  },
  forest: {
    background: 'bg-gradient-to-br from-emerald-950 via-gray-950 to-teal-950',
    blobs: ['bg-emerald-500', 'bg-lime-400'],
  },
  neon: {
    background: 'bg-gradient-to-br from-fuchsia-950 via-gray-950 to-violet-950',
    blobs: ['bg-pink-500', 'bg-violet-500'],
  },
  gold: {
    background: 'bg-gradient-to-br from-amber-950 via-gray-950 to-yellow-950',
    blobs: ['bg-yellow-400', 'bg-orange-500'],
  },
  midnight: {
    background: 'bg-gradient-to-br from-slate-950 via-gray-950 to-indigo-950',
    blobs: ['bg-sky-500', 'bg-indigo-600'],
  },
} satisfies Record<string, Theme>;

export const SlideBackground = ({ theme }: { theme: Theme }) => (
  <div
    className={`absolute inset-0 overflow-hidden ${theme.background}`}
    aria-hidden="true"
  >
    <div
      className={`${styles.blob} ${styles.float} absolute -left-1/4 -top-1/4 h-3/4 w-3/4 rounded-full ${theme.blobs[0]}`}
    />
    <div
      className={`${styles.blob} ${styles.float} absolute -bottom-1/4 -right-1/4 h-3/4 w-3/4 rounded-full ${theme.blobs[1]}`}
      style={{ animationDelay: '-3s', animationDuration: '9s' }}
    />
    <div className={`${styles.grain} absolute inset-0`} />
  </div>
);

interface PosterProps {
  path?: string;
  alt?: string;
  className?: string;
  size?: 'w185' | 'w342' | 'w500';
  priority?: boolean;
}

export const Poster = ({
  path,
  alt = '',
  className = '',
  size = 'w342',
  priority,
}: PosterProps) => {
  const src = tmdbImage(path, size);
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-800 shadow-2xl ring-1 ring-white/10 ${className}`}
      style={{ aspectRatio: '2 / 3' }}
    >
      {src && (
        <CachedImage
          type="tmdb"
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, 300px"
          className="object-cover"
          priority={priority}
        />
      )}
    </div>
  );
};

/** Endless columns of posters drifting in opposite directions */
export const PosterWall = ({
  posters,
  seed,
  columns = 5,
  className = '',
}: {
  posters: string[];
  seed: number;
  columns?: number;
  className?: string;
}) => {
  const columnPosters = useMemo(() => {
    if (!posters.length) {
      return [];
    }
    // Repeat short lists so every column is tall enough to loop seamlessly
    let pool = seededShuffle(posters, seed);
    while (pool.length < columns * 6) {
      pool = pool.concat(seededShuffle(posters, seed + pool.length));
    }
    return Array.from({ length: columns }, (_, column) =>
      pool.filter((_, index) => index % columns === column)
    );
  }, [posters, seed, columns]);

  return (
    <div
      className={`absolute inset-0 flex gap-3 overflow-hidden px-3 ${className}`}
      aria-hidden="true"
    >
      {columnPosters.map((column, index) => (
        <div
          key={index}
          className={`flex flex-1 flex-col gap-3 ${
            index % 2 ? styles.scrollDown : styles.scrollUp
          }`}
          style={{ animationDuration: `${50 + index * 7}s` }}
        >
          {/* Doubled so the translate(-50%) loop is seamless */}
          {[...column, ...column].map((path, i) => (
            <Poster
              key={`${path}-${i}`}
              path={path}
              size="w185"
              className="shrink-0"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const CONFETTI_COLOURS = [
  '#818cf8',
  '#c084fc',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#38bdf8',
];

export const Confetti = ({ pieces = 80 }: { pieces?: number }) => {
  const confetti = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin(i * 9301 + n * 49297) * 233280;
          return x - Math.floor(x);
        };
        return {
          left: `${r(1) * 100}%`,
          width: 6 + r(2) * 8,
          height: 8 + r(3) * 10,
          background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
          animationDuration: `${2.8 + r(4) * 2.5}s`,
          animationDelay: `${r(5) * 1.2}s`,
          borderRadius: r(6) > 0.6 ? '9999px' : '2px',
          '--drift': `${(r(7) - 0.5) * 30}vw`,
          '--turn': `${(r(8) - 0.5) * 1440}deg`,
        } as CSSProperties;
      }),
    [pieces]
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {confetti.map((style, i) => (
        <span
          key={i}
          className={`${styles.confetti} absolute top-0`}
          style={style}
        />
      ))}
    </div>
  );
};

/** A horizontal bar that grows to `percent` of its track */
export const Bar = ({
  percent,
  delay = 0,
  className = 'bg-white',
}: {
  percent: number;
  delay?: number;
  className?: string;
}) => (
  <div className="h-full w-full overflow-hidden rounded-full bg-white/10">
    <div
      className={`${styles.grow} h-full rounded-full ${className}`}
      style={{
        width: `${Math.max(2, Math.min(100, percent))}%`,
        animationDelay: `${delay}ms`,
      }}
    />
  </div>
);

export const Center = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
    {children}
  </div>
);
