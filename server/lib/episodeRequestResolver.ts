import { MediaRequestStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import { MediaRequest } from '@server/entity/MediaRequest';
import type { EpisodeRequestSelection } from '@server/interfaces/api/requestInterfaces';

export const getApprovedEpisodeSelections = async ({
  tvdbId,
  is4k,
}: {
  tvdbId: number;
  is4k: boolean;
}): Promise<EpisodeRequestSelection[]> => {
  const requests = await getRepository(MediaRequest)
    .createQueryBuilder('request')
    .leftJoinAndSelect('request.media', 'media')
    .leftJoinAndSelect('request.episodes', 'episodes')
    .where('request.type = :type', { type: MediaType.TV })
    .andWhere('request.status = :status', {
      status: MediaRequestStatus.APPROVED,
    })
    .andWhere('request.is4k = :is4k', { is4k })
    .andWhere('media.tvdbId = :tvdbId', { tvdbId })
    .getMany();

  const unique = new Map<string, EpisodeRequestSelection>();
  for (const request of requests) {
    for (const episode of request.episodes ?? []) {
      if (episode.status === MediaRequestStatus.APPROVED) {
        unique.set(`${episode.seasonNumber}:${episode.episodeNumber}`, {
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
        });
      }
    }
  }

  return [...unique.values()];
};
