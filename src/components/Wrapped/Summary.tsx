import Button from '@app/components/Common/Button';
import { Pop, Poster, Rise } from '@app/components/Wrapped/Common';
import type { SlideProps } from '@app/components/Wrapped/Slides';
import {
  ARCHETYPE_EMOJI,
  useWrappedLabels,
} from '@app/components/Wrapped/Slides';
import { archetypeFor, tmdbImage } from '@app/components/Wrapped/utils';
import useSettings from '@app/hooks/useSettings';
import defineMessages from '@app/utils/defineMessages';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ShareIcon,
} from '@heroicons/react/24/solid';
import type { WrappedResponse } from '@server/interfaces/api/wrappedInterfaces';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Wrapped.Summary', {
  title: '{year} Wrapped',
  requests: 'Requests',
  hours: 'Hours',
  topGenre: 'Top Genre',
  topStar: 'Top Star',
  save: 'Save Image',
  share: 'Share',
  replay: 'Replay',
  saving: 'Rendering…',
  shareText: 'My {year} on {applicationTitle}',
});

const WIDTH = 1080;
const HEIGHT = 1920;
const COLLAGE_HEIGHT = 900;

interface SummaryCard {
  year: number;
  displayName: string;
  applicationTitle: string;
  heading: string;
  personaEmoji: string;
  persona: string;
  stats: { label: string; value: string }[];
  posters: string[];
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | undefined>((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(undefined), 5000);
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(undefined);
    };
    image.src = src;
  });

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
};

/** Shrink `text` until it fits in `maxWidth`, then ellipsise if needed */
const fitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  size: number,
  minSize: number
) => {
  let current = size;
  ctx.font = `${weight} ${current}px Inter, system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && current > minSize) {
    current -= 2;
    ctx.font = `${weight} ${current}px Inter, system-ui, sans-serif`;
  }
  let output = text;
  while (ctx.measureText(output).width > maxWidth && output.length > 1) {
    output = output.slice(0, -2) + '…';
  }
  return output;
};

const renderSummaryCard = async (
  card: SummaryCard,
  posterUrl: (path: string) => string
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  // Background
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#1e1b4b');
  background.addColorStop(0.5, '#030712');
  background.addColorStop(1, '#3b0764');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = (x: number, y: number, r: number, colour: string) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  };
  glow(150, 300, 700, 'rgba(99, 102, 241, 0.45)');
  glow(950, 1650, 700, 'rgba(217, 70, 239, 0.35)');

  // Poster collage, tilted and fading into the background
  const images = (
    await Promise.all(
      card.posters.slice(0, 15).map((p) => loadImage(posterUrl(p)))
    )
  ).filter((image): image is HTMLImageElement => !!image);

  if (images.length) {
    // Draw the collage on its own layer so it can fade out into the
    // background instead of ending on a hard edge
    const layer = document.createElement('canvas');
    layer.width = WIDTH;
    layer.height = COLLAGE_HEIGHT;
    const lctx = layer.getContext('2d');

    if (lctx) {
      const columns = 5;
      const posterWidth = 230;
      const posterHeight = posterWidth * 1.5;
      const gap = 22;
      lctx.translate(WIDTH / 2, 380);
      lctx.rotate(-0.12);
      for (let i = 0; i < 15; i++) {
        const image = images[i % images.length];
        const column = i % columns;
        const row = Math.floor(i / columns);
        const x =
          (column - columns / 2) * (posterWidth + gap) +
          (row % 2 ? posterWidth / 2 : 0) -
          posterWidth / 4;
        const y = (row - 1.5) * (posterHeight + gap) + (column % 2 ? 40 : 0);
        lctx.save();
        roundedRect(lctx, x, y, posterWidth, posterHeight, 18);
        lctx.clip();
        lctx.drawImage(image, x, y, posterWidth, posterHeight);
        lctx.restore();
      }
      lctx.setTransform(1, 0, 0, 1, 0, 0);

      const mask = lctx.createLinearGradient(0, 0, 0, COLLAGE_HEIGHT);
      mask.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      mask.addColorStop(0.45, 'rgba(0, 0, 0, 0.8)');
      mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lctx.globalCompositeOperation = 'destination-in';
      lctx.fillStyle = mask;
      lctx.fillRect(0, 0, WIDTH, COLLAGE_HEIGHT);

      ctx.drawImage(layer, 0, 0);
    }
  }

  const brand = ctx.createLinearGradient(90, 0, WIDTH - 90, 0);
  brand.addColorStop(0, '#a5b4fc');
  brand.addColorStop(0.5, '#f0abfc');
  brand.addColorStop(1, '#fde68a');

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  ctx.fillStyle = brand;
  ctx.font = '900 64px Inter, system-ui, sans-serif';
  ctx.fillText(card.heading.toUpperCase(), 90, 890);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    fitText(ctx, card.displayName, WIDTH - 180, 900, 110, 60),
    90,
    1010
  );

  // Persona
  ctx.font =
    '120px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.fillText(card.personaEmoji, 90, 1180);
  ctx.fillStyle = brand;
  ctx.fillText(fitText(ctx, card.persona, WIDTH - 360, 800, 64, 36), 260, 1150);

  // Stats grid
  const cellWidth = (WIDTH - 180 - 30) / 2;
  const cellHeight = 200;
  card.stats.slice(0, 4).forEach((stat, index) => {
    const x = 90 + (index % 2) * (cellWidth + 30);
    const y = 1250 + Math.floor(index / 2) * (cellHeight + 30);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundedRect(ctx, x, y, cellWidth, cellHeight, 32);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '700 32px Inter, system-ui, sans-serif';
    ctx.fillText(stat.label.toUpperCase(), x + 36, y + 64);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      fitText(ctx, stat.value, cellWidth - 72, 900, 72, 34),
      x + 36,
      y + 150
    );
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.applicationTitle, WIDTH / 2, HEIGHT - 90);

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      // A poster without CORS headers taints the canvas; bail out quietly
      resolve(null);
    }
  });
};

const useSummaryCard = (data: WrappedResponse, hours: number) => {
  const intl = useIntl();
  const labels = useWrappedLabels();
  const { currentSettings } = useSettings();
  const archetype = archetypeFor(data);

  const stats = [
    {
      label: intl.formatMessage(messages.requests),
      value: intl.formatNumber(data.totals.requests),
    },
    {
      label: intl.formatMessage(messages.hours),
      value: intl.formatNumber(hours),
    },
    data.topGenres[0] && {
      label: intl.formatMessage(messages.topGenre),
      value: data.topGenres[0].name,
    },
    data.topActors[0] && {
      label: intl.formatMessage(messages.topStar),
      value: data.topActors[0].name,
    },
  ].filter((stat): stat is { label: string; value: string } => !!stat);

  const card: SummaryCard = {
    year: data.year,
    displayName: data.user.displayName,
    applicationTitle: currentSettings.applicationTitle,
    heading: intl.formatMessage(messages.title, { year: data.year }),
    personaEmoji: ARCHETYPE_EMOJI[archetype],
    persona: labels.archetype(archetype),
    stats,
    posters: data.posters,
  };

  const posterUrl = (path: string) => {
    const url = tmdbImage(path, 'w342') as string;
    return currentSettings.cacheImages
      ? url.replace(/^https:\/\/image\.tmdb\.org\//, '/imageproxy/tmdb/')
      : url;
  };

  return { card, posterUrl };
};

interface SummarySlideProps extends SlideProps {
  onReplay: () => void;
}

const SummarySlide = ({ data, onReplay }: SummarySlideProps) => {
  const intl = useIntl();
  const hours = Math.round(data.runtimeMinutes / 60);
  const { card, posterUrl } = useSummaryCard(data, hours);
  const [busy, setBusy] = useState(false);
  const fileName = `${card.applicationTitle}-wrapped-${data.year}.png`
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-');
  const shareFile = (blob: Blob) =>
    new File([blob], fileName, { type: 'image/png' });
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    !!navigator.canShare &&
    navigator.canShare({
      files: [new File([], fileName, { type: 'image/png' })],
    });

  const withImage = async (action: (blob: Blob) => Promise<void> | void) => {
    setBusy(true);
    try {
      const blob = await renderSummaryCard(card, posterUrl);
      if (blob) {
        await action(blob);
      }
    } catch {
      // User cancelled the share sheet
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    withImage((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

  const share = () =>
    withImage((blob) =>
      navigator.share({
        files: [shareFile(blob)],
        title: intl.formatMessage(messages.shareText, {
          year: data.year,
          applicationTitle: card.applicationTitle,
        }),
      })
    );

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <Pop className="w-full max-w-sm">
        <div className="relative overflow-hidden rounded-3xl bg-gray-950/70 p-6 shadow-2xl ring-1 ring-white/15 backdrop-blur">
          <div className="-mx-6 -mt-6 mb-5 grid grid-cols-5 gap-1.5 opacity-90 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]">
            {data.posters.slice(0, 10).map((path) => (
              <Poster
                key={path}
                path={path}
                size="w185"
                className="rounded-md"
              />
            ))}
          </div>
          <div className="relative -mt-16">
            <div className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-lg font-black uppercase tracking-wider text-transparent">
              {card.heading}
            </div>
            <div className="truncate text-3xl font-black text-white">
              {card.displayName}
            </div>
            <div className="mt-2 flex items-center gap-2 text-lg font-bold text-fuchsia-200">
              <span className="text-3xl">{card.personaEmoji}</span>
              {card.persona}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              {card.stats.map((stat, index) => (
                <Rise
                  key={stat.label}
                  delay={300 + index * 150}
                  className="rounded-xl bg-white/10 p-3"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {stat.label}
                  </dt>
                  <dd className="line-clamp-2 text-lg font-black leading-tight text-white">
                    {stat.value}
                  </dd>
                </Rise>
              ))}
            </dl>
          </div>
        </div>
      </Pop>
      <Rise delay={700} className="flex flex-wrap justify-center gap-3">
        <Button buttonType="primary" onClick={save} disabled={busy}>
          <ArrowDownTrayIcon />
          <span>
            {intl.formatMessage(busy ? messages.saving : messages.save)}
          </span>
        </Button>
        {canShareFiles && (
          <Button buttonType="default" onClick={share} disabled={busy}>
            <ShareIcon />
            <span>{intl.formatMessage(messages.share)}</span>
          </Button>
        )}
        <Button buttonType="ghost" onClick={onReplay}>
          <ArrowPathIcon />
          <span>{intl.formatMessage(messages.replay)}</span>
        </Button>
      </Rise>
    </div>
  );
};

export default SummarySlide;
