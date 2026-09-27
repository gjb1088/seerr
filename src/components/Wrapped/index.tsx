import CachedImage from '@app/components/Common/CachedImage';
import PageTitle from '@app/components/Common/PageTitle';
import {
  Center,
  Rise,
  SlideBackground,
  THEMES,
} from '@app/components/Wrapped/Common';
import type { SlideDefinition } from '@app/components/Wrapped/Slides';
import { buildSlides } from '@app/components/Wrapped/Slides';
import SummarySlide from '@app/components/Wrapped/Summary';
import styles from '@app/components/Wrapped/Wrapped.module.css';
import { computeTimeStats } from '@app/components/Wrapped/utils';
import { useLockBodyScroll } from '@app/hooks/useLockBodyScroll';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import type { WrappedResponse } from '@server/interfaces/api/wrappedInterfaces';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages('components.Wrapped', {
  wrapped: 'Wrapped',
  pageTitle: '{year} Wrapped',
  loading: 'Rewinding your year…',
  loadingHint: 'Counting posters, tallying genres, judging your taste.',
  error: "We couldn't put your Wrapped together.",
  forbidden: "You don't have permission to view this Wrapped.",
  emptyTitle: 'Nothing to unwrap for {year}… yet',
  emptyHint: 'Request a few movies or shows and check back.',
  otherYears: 'Or look back at another year:',
  close: 'Close',
  previous: 'Previous',
  next: 'Next',
  pause: 'Pause',
  play: 'Play',
  year: 'Year',
});

const DEFAULT_DURATION = 7;
const HOLD_TO_PAUSE_MS = 220;

const Wrapped = () => {
  const intl = useIntl();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const userId = router.query.userId
    ? Number(router.query.userId)
    : currentUser?.id;
  const currentYear = new Date().getFullYear();
  const year = router.query.year ? Number(router.query.year) : currentYear;

  const { data, error } = useSWR<WrappedResponse>(
    userId ? `/api/v1/user/${userId}/wrapped?year=${year}` : null,
    { revalidateOnFocus: false }
  );

  const stats = useMemo(
    () => (data ? computeTimeStats(data.timestamps) : undefined),
    [data]
  );

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const heldLongEnough = useRef(false);

  const slides: SlideDefinition[] = useMemo(
    () => (data && stats && data.totals.requests > 0 ? buildSlides(data) : []),
    [data, stats]
  );
  // The summary card closes the story and never auto-advances
  const slideCount = slides.length + 1;
  const isSummary = index === slides.length;

  useEffect(() => {
    setIndex(0);
    setPaused(false);
  }, [data?.year, data?.user.id]);

  useEffect(() => setMounted(true), []);
  useLockBodyScroll(true);

  const exitHref = router.query.userId ? `/users/${userId}` : '/profile';

  const close = useCallback(() => {
    router.push(exitHref);
  }, [router, exitHref]);

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, slideCount - 1)),
    [slideCount]
  );
  const previous = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const replay = useCallback(() => {
    setIndex(0);
    setPaused(false);
    setReplayKey((key) => key + 1);
  }, []);

  const selectYear = (selected: number) => {
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, year: selected },
      },
      undefined,
      { shallow: true }
    );
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === 'SELECT') {
        return;
      }
      switch (event.key) {
        case 'ArrowRight':
          next();
          break;
        case 'ArrowLeft':
          previous();
          break;
        case ' ':
          event.preventDefault();
          setPaused((p) => !p);
          break;
        case 'Escape':
          close();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, close]);

  // Pause while the tab is hidden so nobody misses a slide
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Hold to pause, tap the left third to go back, anywhere else to go forward
  const onPointerDown = () => {
    heldLongEnough.current = false;
    holdTimer.current = window.setTimeout(() => {
      heldLongEnough.current = true;
      setHolding(true);
    }, HOLD_TO_PAUSE_MS);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    window.clearTimeout(holdTimer.current);
    setHolding(false);
    if (heldLongEnough.current) {
      return;
    }
    // Buttons on the slide (like the summary's save button) handle themselves
    if ((event.target as HTMLElement).closest('a, button, select')) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX - bounds.left < bounds.width / 3) {
      previous();
    } else if (!isSummary) {
      next();
    }
  };

  const onPointerCancel = () => {
    window.clearTimeout(holdTimer.current);
    setHolding(false);
  };

  const isPaused = paused || holding;
  const slide = slides[index];
  const theme = isSummary ? THEMES.indigo : (slide?.theme ?? THEMES.indigo);
  const years = data
    ? [...new Set([currentYear, ...data.availableYears])].sort((a, b) => b - a)
    : [year];

  const renderBody = () => {
    if (error) {
      return (
        <Center>
          <div className="text-6xl">🎞️</div>
          <p className="text-xl font-bold text-white">
            {intl.formatMessage(
              error.response?.status === 403
                ? messages.forbidden
                : messages.error
            )}
          </p>
        </Center>
      );
    }

    if (!data || !stats) {
      return (
        <Center>
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/10 border-t-fuchsia-400" />
            <div
              className="absolute inset-3 animate-spin rounded-full border-4 border-white/10 border-b-indigo-400"
              style={{
                animationDirection: 'reverse',
                animationDuration: '1.4s',
              }}
            />
          </div>
          <p className="text-xl font-bold text-white">
            {intl.formatMessage(messages.loading)}
          </p>
          <p className="text-sm text-white/60">
            {intl.formatMessage(messages.loadingHint)}
          </p>
        </Center>
      );
    }

    if (data.totals.requests === 0) {
      const otherYears = data.availableYears.filter((y) => y !== data.year);
      return (
        <Center>
          <div className="text-7xl">🍿</div>
          <Rise as="h2" className="text-3xl font-black text-white">
            {intl.formatMessage(messages.emptyTitle, { year: data.year })}
          </Rise>
          <Rise as="p" delay={200} className="text-lg text-white/70">
            {intl.formatMessage(messages.emptyHint)}
          </Rise>
          {otherYears.length > 0 && (
            <Rise delay={400} className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-white/60">
                {intl.formatMessage(messages.otherYears)}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {otherYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => selectYear(y)}
                    className="rounded-full bg-white/15 px-4 py-1.5 font-bold text-white transition hover:bg-white/25"
                  >
                    {y}
                  </button>
                ))}
              </div>
            </Rise>
          )}
        </Center>
      );
    }

    return (
      <div
        className="absolute inset-0 touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-live="polite"
      >
        <div
          key={`${replayKey}-${index}`}
          className={`${styles.enter} relative h-full pb-6 pt-20`}
        >
          {isSummary ? (
            <SummarySlide data={data} stats={stats} onReplay={replay} />
          ) : (
            slide.render({ data, stats })
          )}
        </div>
      </div>
    );
  };

  const showStory = !!data && data.totals.requests > 0;

  if (!mounted) {
    return null;
  }

  // Portalled to <body> so the story sits above the app's own header and nav
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950"
      role="dialog"
      aria-modal="true"
      aria-label={intl.formatMessage(messages.pageTitle, { year })}
    >
      <PageTitle title={intl.formatMessage(messages.pageTitle, { year })} />
      {/* Blurred echo of the current slide behind the frame on wide screens */}
      <div className="absolute inset-0 hidden opacity-40 blur-3xl sm:block">
        <SlideBackground theme={theme} />
      </div>

      {showStory && (
        <button
          onClick={previous}
          disabled={index === 0}
          className="relative z-10 mr-6 hidden rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 disabled:opacity-0 md:block"
          aria-label={intl.formatMessage(messages.previous)}
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      )}

      <div
        className={`relative h-full w-full overflow-hidden bg-gray-950 ${styles.frame} sm:rounded-3xl sm:shadow-2xl sm:ring-1 sm:ring-white/10 ${
          isPaused ? styles.paused : ''
        }`}
      >
        <div key={`${index}-bg`} className={`${styles.enter} absolute inset-0`}>
          <SlideBackground theme={theme} />
        </div>

        {renderBody()}

        {/* Chrome: progress, title, controls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/50 to-transparent px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {showStory && (
            <div className="flex gap-1">
              {Array.from({ length: slideCount }, (_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
                >
                  {i < index || (i === index && isSummary) ? (
                    <div className="h-full w-full bg-white" />
                  ) : i === index ? (
                    <div
                      key={`${replayKey}-${index}`}
                      className={`${styles.progress} h-full w-full bg-white`}
                      style={{
                        animationDuration: `${slide?.duration ?? DEFAULT_DURATION}s`,
                      }}
                      onAnimationEnd={next}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            {data && (
              <div className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-white/30">
                <CachedImage
                  type="avatar"
                  src={data.user.avatar}
                  alt=""
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="text-sm font-bold text-white">
              {intl.formatMessage(messages.wrapped)}
            </div>
            <label className="pointer-events-auto">
              <span className="sr-only">
                {intl.formatMessage(messages.year)}
              </span>
              <select
                value={year}
                onChange={(e) => selectYear(Number(e.target.value))}
                className="rounded-full border-0 bg-white/15 py-0.5 pl-3 pr-8 text-sm font-bold text-white focus:ring-2 focus:ring-white/40"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="text-gray-900">
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex-1" />
            {showStory && !isSummary && (
              <button
                onClick={() => setPaused((p) => !p)}
                className="pointer-events-auto rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label={intl.formatMessage(
                  paused ? messages.play : messages.pause
                )}
              >
                {paused ? (
                  <PlayIcon className="h-5 w-5" />
                ) : (
                  <PauseIcon className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              onClick={close}
              className="pointer-events-auto rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label={intl.formatMessage(messages.close)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {showStory && (
        <button
          onClick={next}
          disabled={isSummary}
          className="relative z-10 ml-6 hidden rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 disabled:opacity-0 md:block"
          aria-label={intl.formatMessage(messages.next)}
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      )}
    </div>,
    document.body
  );
};

export default Wrapped;
