import { readFile, writeFile } from 'node:fs/promises';

const path = 'server/api/servarr/sonarr.ts';
let source = await readFile(path, 'utf8');

const importNeedle = "import logger from '@server/logger';\n";
const importLine =
  "import { selectSeededEpisodeRelease, type SonarrReleaseResource } from './sonarrReleaseSelector';\n";

if (!source.includes(importLine)) {
  if (!source.includes(importNeedle)) {
    throw new Error('Could not find Sonarr logger import anchor');
  }
  source = source.replace(importNeedle, importNeedle + importLine);
}

const oldCall = '        await this.searchEpisodes(missingEpisodeIds);';
const newCall =
  '        await this.searchEpisodesWithSeedPreference(missingEpisodeIds);';

if (source.includes(oldCall)) {
  source = source.replace(oldCall, newCall);
} else if (!source.includes(newCall)) {
  throw new Error('Could not find exact episode search call anchor');
}

const methodAnchor =
  '  public async searchEpisodes(episodeIds: number[]): Promise<void> {';
const methodMarker = '  private async searchEpisodesWithSeedPreference(';

if (!source.includes(methodMarker)) {
  if (!source.includes(methodAnchor)) {
    throw new Error('Could not find searchEpisodes method anchor');
  }

  const method = `  private async searchEpisodesWithSeedPreference(\n    episodeIds: number[]\n  ): Promise<void> {\n    if (episodeIds.length === 0) {\n      return;\n    }\n\n    for (const episodeId of episodeIds) {\n      try {\n        logger.info('Searching Sonarr releases for seed-aware episode grab.', {\n          label: 'Sonarr API',\n          episodeId,\n        });\n\n        const response = await this.axios.get<SonarrReleaseResource[]>(\n          '/release',\n          { params: { episodeId } }\n        );\n        const selection = selectSeededEpisodeRelease(response.data);\n\n        if (selection.action === 'grab') {\n          await this.axios.post('/release', selection.release);\n          logger.info('Grabbed highest-seeded preferred episode release.', {\n            label: 'Sonarr API',\n            episodeId,\n            title: selection.release.title,\n            indexer: selection.release.indexer,\n            seeders: selection.release.seeders,\n            qualityWeight: selection.release.qualityWeight,\n            customFormatScore: selection.release.customFormatScore,\n          });\n          continue;\n        }\n\n        if (selection.action === 'fallback') {\n          logger.info(\n            'Preferred episode release is not a torrent; using Sonarr search.',\n            {\n              label: 'Sonarr API',\n              episodeId,\n            }\n          );\n          await this.searchEpisodes([episodeId]);\n          continue;\n        }\n\n        logger.warn(\n          'No healthy seeded torrent in Sonarr preferred release group; leaving episode monitored for RSS.',\n          {\n            label: 'Sonarr API',\n            episodeId,\n            reason: selection.reason,\n          }\n        );\n      } catch (e) {\n        logger.warn(\n          'Seed-aware episode search failed; falling back to Sonarr episode search.',\n          {\n            label: 'Sonarr API',\n            episodeId,\n            errorMessage: e.message,\n          }\n        );\n        await this.searchEpisodes([episodeId]);\n      }\n    }\n  }\n\n`;

  source = source.replace(methodAnchor, method + methodAnchor);
}

await writeFile(path, source);
console.log('Seed-aware episode search codemod applied successfully.');
