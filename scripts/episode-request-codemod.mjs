import fs from 'node:fs';

const replaceOrThrow = (path, from, to) => {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) {
    throw new Error(`Expected text not found in ${path}: ${from.slice(0, 100)}`);
  }
  fs.writeFileSync(path, source.replace(from, to));
};

// Keep episode selections on the in-memory request so auto-approved requests do
// not depend on child rows being queryable during TypeORM's parent afterInsert.
replaceOrThrow(
  'server/subscriber/MediaRequestSubscriber.ts',
  `          seasons: entity.seasons.map((season) => season.seasonNumber),\n          seasonFolder: sonarrSettings.enableSeasonFolders,`,
  `          seasons: entity.seasons.map((season) => season.seasonNumber),\n          episodes: entity.episodes?.map((episode) => ({\n            seasonNumber: episode.seasonNumber,\n            episodeNumber: episode.episodeNumber,\n          })),\n          seasonFolder: sonarrSettings.enableSeasonFolders,`
);

replaceOrThrow(
  'server/api/servarr/sonarr.ts',
  `  searchNow?: boolean;\n}`,
  `  searchNow?: boolean;\n  episodes?: EpisodeSelection[];\n}`
);
replaceOrThrow(
  'server/api/servarr/sonarr.ts',
  `    if (options.seasons.length === 0) {\n      const approvedEpisodes = await getApprovedEpisodeSelections({\n        tvdbId: options.tvdbid,\n        is4k: this.is4k,\n      });`,
  `    if (options.seasons.length === 0) {\n      const approvedEpisodes =\n        options.episodes?.length\n          ? options.episodes\n          : await getApprovedEpisodeSelections({\n              tvdbId: options.tvdbid,\n              is4k: this.is4k,\n            });`
);

// Use the already joined request set for episode duplicate checks. This avoids
// relying on nested eager-loading through Media.requests.
replaceOrThrow(
  'server/entity/MediaRequest.ts',
  `        const activeRequests = (media.requests ?? []).filter(\n          (request) =>`,
  `        const activeRequests = existing.filter(\n          (request) =>`
);

// Request API: return episode children and map the episode-specific empty
// selection outcome to the same non-error response used for seasons.
replaceOrThrow(
  'server/routes/request.ts',
  `  MediaRequest,\n  NoSeasonsAvailableError,`,
  `  MediaRequest,\n  NoEpisodesAvailableError,\n  NoSeasonsAvailableError,`
);
replaceOrThrow(
  'server/routes/request.ts',
  `        .leftJoinAndSelect('request.seasons', 'seasons')\n        .leftJoinAndSelect('request.modifiedBy', 'modifiedBy')`,
  `        .leftJoinAndSelect('request.seasons', 'seasons')\n        .leftJoinAndSelect('request.episodes', 'episodes')\n        .leftJoinAndSelect('request.modifiedBy', 'modifiedBy')`
);
replaceOrThrow(
  'server/routes/request.ts',
  `        case NoSeasonsAvailableError:\n          return next({ status: 202, message: error.message });`,
  `        case NoSeasonsAvailableError:\n        case NoEpisodesAvailableError:\n          return next({ status: 202, message: error.message });`
);
replaceOrThrow(
  'server/routes/request.ts',
  `      relations: { requestedBy: true, modifiedBy: true },\n    });\n\n    if (\n      request.requestedBy.id !== req.user?.id`,
  `      relations: {\n        requestedBy: true,\n        modifiedBy: true,\n        seasons: true,\n        episodes: true,\n      },\n    });\n\n    if (\n      request.requestedBy.id !== req.user?.id`
);
replaceOrThrow(
  'server/routes/request.ts',
  `        const requestedSeasons = req.body.seasons as number[] | undefined;\n\n        if (!requestedSeasons || requestedSeasons.length === 0) {`,
  `        if (request.episodes?.length) {\n          return next({\n            status: 400,\n            message:\n              'Individual episode requests cannot be edited. Delete the request and create a new one instead.',\n          });\n        }\n\n        const requestedSeasons = req.body.seasons as number[] | undefined;\n\n        if (!requestedSeasons || requestedSeasons.length === 0) {`
);

// TV quota remains expressed in request units; individual episodes consume one
// unit each so they cannot bypass an existing TV quota.
replaceOrThrow(
  'server/entity/User.ts',
  `import Issue from './Issue';\nimport { MediaRequest } from './MediaRequest';`,
  `import EpisodeRequest from './EpisodeRequest';\nimport Issue from './Issue';\nimport { MediaRequest } from './MediaRequest';`
);
replaceOrThrow(
  'server/entity/User.ts',
  `            }, 'seasonCount')\n            .getMany()\n        ).reduce((sum: number, req: MediaRequest) => sum + req.seasonCount, 0)`,
  `            }, 'seasonCount')\n            .addSelect((subQuery) => {\n              return subQuery\n                .select('COUNT(episode.id)', 'episodeCount')\n                .from(EpisodeRequest, 'episode')\n                .leftJoin('episode.request', 'parentRequest')\n                .where('parentRequest.id = request.id');\n            }, 'episodeCount')\n            .getMany()\n        ).reduce(\n          (sum: number, req: MediaRequest) =>\n            sum + req.seasonCount + req.episodeCount,\n          0\n        )`
);

// Requests page: show exact requested episodes and don't offer the unsupported
// edit action for an episode request.
replaceOrThrow(
  'src/components/RequestList/RequestItem/index.tsx',
  `  seasons: '{seasonCount, plural, one {Season} other {Seasons}}',`,
  `  seasons: '{seasonCount, plural, one {Season} other {Seasons}}',\n  episodes: '{episodeCount, plural, one {Episode} other {Episodes}}',`
);
replaceOrThrow(
  'src/components/RequestList/RequestItem/index.tsx',
  `              {!isMovie(title) && request.seasons.length > 0 && (\n                <div className="card-field">\n                  <span className="card-field-name">\n                    {intl.formatMessage(messages.seasons, {\n                      seasonCount: request.seasons.length,\n                    })}\n                  </span>\n                  <div className="hide-scrollbar flex flex-nowrap overflow-x-scroll">\n                    {request.seasons.map((season) => (\n                      <span key={\`season-\${season.id}\`} className="mr-2">\n                        <Badge>\n                          {season.seasonNumber === 0\n                            ? intl.formatMessage(globalMessages.specials)\n                            : season.seasonNumber}\n                        </Badge>\n                      </span>\n                    ))}\n                  </div>\n                </div>\n              )}`,
  `              {!isMovie(title) && request.seasons.length > 0 && (\n                <div className="card-field">\n                  <span className="card-field-name">\n                    {intl.formatMessage(messages.seasons, {\n                      seasonCount: request.seasons.length,\n                    })}\n                  </span>\n                  <div className="hide-scrollbar flex flex-nowrap overflow-x-scroll">\n                    {request.seasons.map((season) => (\n                      <span key={\`season-\${season.id}\`} className="mr-2">\n                        <Badge>\n                          {season.seasonNumber === 0\n                            ? intl.formatMessage(globalMessages.specials)\n                            : season.seasonNumber}\n                        </Badge>\n                      </span>\n                    ))}\n                  </div>\n                </div>\n              )}\n              {!isMovie(title) && request.episodes?.length > 0 && (\n                <div className="card-field">\n                  <span className="card-field-name">\n                    {intl.formatMessage(messages.episodes, {\n                      episodeCount: request.episodes.length,\n                    })}\n                  </span>\n                  <div className="hide-scrollbar flex flex-nowrap overflow-x-scroll">\n                    {request.episodes.map((episode) => (\n                      <span key={\`episode-\${episode.id}\`} className="mr-2">\n                        <Badge>\n                          {\`S\${String(episode.seasonNumber).padStart(\n                            2,\n                            '0'\n                          )}E\${String(episode.episodeNumber).padStart(2, '0')}\`}\n                        </Badge>\n                      </span>\n                    ))}\n                  </div>\n                </div>\n              )}`
);
replaceOrThrow(
  'src/components/RequestList/RequestItem/index.tsx',
  `          {requestData.status === MediaRequestStatus.PENDING &&\n            (hasPermission(Permission.MANAGE_REQUESTS) ||`,
  `          {requestData.status === MediaRequestStatus.PENDING &&\n            !requestData.episodes?.length &&\n            (hasPermission(Permission.MANAGE_REQUESTS) ||`
);
