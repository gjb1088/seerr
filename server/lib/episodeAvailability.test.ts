import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getEpisodeKey, isEpisodeAired } from '@server/lib/episodeAvailability';

describe('episodeAvailability', () => {
  it('builds stable season and episode keys', () => {
    assert.strictEqual(getEpisodeKey(1, 3), '1:3');
    assert.strictEqual(getEpisodeKey(0, 12), '0:12');
  });

  it('treats episodes before or on today as aired', () => {
    assert.strictEqual(isEpisodeAired('2026-09-16', '2026-09-17'), true);
    assert.strictEqual(isEpisodeAired('2026-09-17', '2026-09-17'), true);
  });

  it('treats future or undated episodes as unaired', () => {
    assert.strictEqual(isEpisodeAired('2026-09-18', '2026-09-17'), false);
    assert.strictEqual(isEpisodeAired(null, '2026-09-17'), false);
  });
});
