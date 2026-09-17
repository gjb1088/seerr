import { readFile, writeFile } from 'node:fs/promises';

const path = 'server/api/servarr/sonarr.ts';
let source = await readFile(path, 'utf8');

const oldSearch = `        const response = await this.axios.get<SonarrReleaseResource[]>(\n          '/release',\n          { params: { episodeId } }\n        );\n        const selection = selectSeededEpisodeRelease(response.data);`;

const newSearch = `        const searchStartedAt = Date.now();\n        const seedAwareSearchTimeoutMs = 90_000;\n        const response = await this.axios.get<SonarrReleaseResource[]>(\n          '/release',\n          {\n            params: { episodeId },\n            timeout: seedAwareSearchTimeoutMs,\n          }\n        );\n\n        logger.info('Received Sonarr release candidates for seed-aware episode grab.', {\n          label: 'Sonarr API',\n          episodeId,\n          releaseCount: response.data.length,\n          elapsedMs: Date.now() - searchStartedAt,\n        });\n\n        const selection = selectSeededEpisodeRelease(response.data);`;

if (!source.includes(oldSearch)) {
  throw new Error('Could not find seed-aware Sonarr release search block');
}
source = source.replace(oldSearch, newSearch);

const oldCatch = `      } catch (e) {\n        logger.warn(\n          'Seed-aware episode search failed; falling back to Sonarr episode search.',\n          {\n            label: 'Sonarr API',\n            episodeId,\n            errorMessage: e.message,\n          }\n        );\n        await this.searchEpisodes([episodeId]);\n      }`;

const newCatch = `      } catch (e) {\n        const timedOut =\n          e?.code === 'ECONNABORTED' ||\n          String(e?.message ?? '')\n            .toLowerCase()\n            .includes('timeout');\n\n        if (timedOut) {\n          logger.warn(\n            'Seed-aware episode search timed out; leaving episode monitored for RSS to avoid launching a duplicate Sonarr search.',\n            {\n              label: 'Sonarr API',\n              episodeId,\n              timeoutMs: 90_000,\n              errorMessage: e.message,\n            }\n          );\n          continue;\n        }\n\n        logger.warn(\n          'Seed-aware episode search failed; falling back to Sonarr episode search.',\n          {\n            label: 'Sonarr API',\n            episodeId,\n            errorMessage: e.message,\n          }\n        );\n        await this.searchEpisodes([episodeId]);\n      }`;

if (!source.includes(oldCatch)) {
  throw new Error('Could not find seed-aware Sonarr search catch block');
}
source = source.replace(oldCatch, newCatch);

await writeFile(path, source);
console.log('Seed-aware timeout codemod applied successfully.');
