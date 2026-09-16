import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  selectSeededEpisodeRelease,
  type SonarrReleaseResource,
} from './sonarrReleaseSelector';

const release = (
  overrides: Partial<SonarrReleaseResource> = {}
): SonarrReleaseResource => ({
  guid: 'base',
  title: 'Episode Release',
  indexerId: 1,
  indexer: 'Test Indexer',
  qualityWeight: 1200,
  customFormatScore: 100,
  protocol: 'torrent',
  fullSeason: false,
  mappedSeasonNumber: 4,
  mappedEpisodeNumbers: [1],
  mappedAbsoluteEpisodeNumbers: [],
  approved: true,
  temporarilyRejected: false,
  rejected: false,
  downloadAllowed: true,
  seeders: 10,
  releaseWeight: 0,
  ...overrides,
});

describe('selectSeededEpisodeRelease', () => {
  it('chooses the most seeded release inside Sonarr preferred group', () => {
    const result = selectSeededEpisodeRelease([
      release({ guid: 'sonarr-first', seeders: 8, releaseWeight: 0 }),
      release({ guid: 'more-seeds', seeders: 84, releaseWeight: 4 }),
      release({ guid: 'middle', seeders: 30, releaseWeight: 2 }),
    ]);

    assert.equal(result.action, 'grab');
    if (result.action === 'grab') {
      assert.equal(result.release.guid, 'more-seeds');
      assert.equal(result.release.seeders, 84);
    }
  });

  it('does not trade preferred quality for a larger swarm', () => {
    const result = selectSeededEpisodeRelease([
      release({ guid: 'preferred', seeders: 5, qualityWeight: 1200 }),
      release({ guid: 'lower-quality', seeders: 500, qualityWeight: 1100 }),
    ]);

    assert.equal(result.action, 'grab');
    if (result.action === 'grab') {
      assert.equal(result.release.guid, 'preferred');
    }
  });

  it('does not trade custom-format score for a larger swarm', () => {
    const result = selectSeededEpisodeRelease([
      release({ guid: 'preferred', seeders: 4, customFormatScore: 100 }),
      release({ guid: 'lower-cf', seeders: 400, customFormatScore: 50 }),
    ]);

    assert.equal(result.action, 'grab');
    if (result.action === 'grab') {
      assert.equal(result.release.guid, 'preferred');
    }
  });

  it('preserves Sonarr episode shape instead of preferring a season pack', () => {
    const result = selectSeededEpisodeRelease([
      release({ guid: 'single', seeders: 6 }),
      release({
        guid: 'season-pack',
        seeders: 600,
        fullSeason: true,
        mappedEpisodeNumbers: [1, 2, 3, 4, 5],
      }),
    ]);

    assert.equal(result.action, 'grab');
    if (result.action === 'grab') {
      assert.equal(result.release.guid, 'single');
    }
  });

  it('falls back to Sonarr when its preferred protocol is not torrent', () => {
    const result = selectSeededEpisodeRelease([
      release({ guid: 'usenet-first', protocol: 'usenet', seeders: null }),
      release({ guid: 'torrent', protocol: 'torrent', seeders: 1000 }),
    ]);

    assert.deepEqual(result, {
      action: 'fallback',
      reason: 'preferred-protocol-not-torrent',
    });
  });

  it('defers instead of force-grabbing a torrent with no seeders', () => {
    const result = selectSeededEpisodeRelease([
      release({ guid: 'zero', seeders: 0 }),
      release({ guid: 'unknown', seeders: null }),
    ]);

    assert.deepEqual(result, {
      action: 'defer',
      reason: 'no-seeded-preferred-release',
    });
  });

  it('ignores releases Sonarr does not allow', () => {
    const result = selectSeededEpisodeRelease([
      release({ guid: 'rejected', seeders: 999, rejected: true }),
      release({ guid: 'blocked', seeders: 888, downloadAllowed: false }),
      release({ guid: 'approved', seeders: 7, releaseWeight: 3 }),
    ]);

    assert.equal(result.action, 'grab');
    if (result.action === 'grab') {
      assert.equal(result.release.guid, 'approved');
    }
  });
});
