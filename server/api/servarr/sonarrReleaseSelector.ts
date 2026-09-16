export interface SonarrReleaseResource {
  guid: string;
  title: string;
  indexerId: number;
  indexer?: string;
  qualityWeight: number;
  customFormatScore: number;
  protocol: string;
  fullSeason: boolean;
  mappedSeasonNumber?: number | null;
  mappedEpisodeNumbers?: number[] | null;
  mappedAbsoluteEpisodeNumbers?: number[] | null;
  approved: boolean;
  temporarilyRejected: boolean;
  rejected: boolean;
  downloadAllowed: boolean;
  seeders?: number | null;
  releaseWeight?: number;
  [key: string]: unknown;
}

export type SeededReleaseSelection =
  | {
      action: 'grab';
      release: SonarrReleaseResource;
    }
  | {
      action: 'fallback';
      reason: 'preferred-protocol-not-torrent';
    }
  | {
      action: 'defer';
      reason: 'no-approved-release' | 'no-seeded-preferred-release';
    };

const episodeShape = (release: SonarrReleaseResource): string =>
  JSON.stringify({
    fullSeason: release.fullSeason,
    mappedSeasonNumber: release.mappedSeasonNumber ?? null,
    mappedEpisodeNumbers: [...(release.mappedEpisodeNumbers ?? [])].sort(
      (a, b) => a - b
    ),
    mappedAbsoluteEpisodeNumbers: [
      ...(release.mappedAbsoluteEpisodeNumbers ?? []),
    ].sort((a, b) => a - b),
  });

const isUsable = (release: SonarrReleaseResource): boolean =>
  release.approved &&
  !release.temporarilyRejected &&
  !release.rejected &&
  release.downloadAllowed;

/**
 * Sonarr returns interactive-search results in its preferred order. Keep the
 * first approved result's quality, custom-format score, protocol, and episode
 * shape, then deliberately move torrent seed count ahead of Sonarr's later
 * tie-breakers (such as indexer priority and size).
 *
 * A torrent must report at least one seeder before we force-grab it. If the
 * best preferred group has no healthy torrent, leave the episode monitored so
 * RSS can satisfy it later instead of knowingly enqueueing a dead torrent.
 */
export const selectSeededEpisodeRelease = (
  releases: SonarrReleaseResource[]
): SeededReleaseSelection => {
  const usable = releases.filter(isUsable);
  const preferred = usable[0];

  if (!preferred) {
    return { action: 'defer', reason: 'no-approved-release' };
  }

  if (preferred.protocol.toLowerCase() !== 'torrent') {
    return {
      action: 'fallback',
      reason: 'preferred-protocol-not-torrent',
    };
  }

  const preferredShape = episodeShape(preferred);
  const preferredGroup = usable.filter(
    (release) =>
      release.protocol.toLowerCase() === 'torrent' &&
      release.qualityWeight === preferred.qualityWeight &&
      release.customFormatScore === preferred.customFormatScore &&
      episodeShape(release) === preferredShape
  );

  const seeded = preferredGroup
    .filter((release) => (release.seeders ?? 0) > 0)
    .sort((left, right) => {
      const seedDifference = (right.seeders ?? 0) - (left.seeders ?? 0);

      if (seedDifference !== 0) {
        return seedDifference;
      }

      return (
        (left.releaseWeight ?? Number.MAX_SAFE_INTEGER) -
        (right.releaseWeight ?? Number.MAX_SAFE_INTEGER)
      );
    });

  if (!seeded[0]) {
    return { action: 'defer', reason: 'no-seeded-preferred-release' };
  }

  return { action: 'grab', release: seeded[0] };
};
