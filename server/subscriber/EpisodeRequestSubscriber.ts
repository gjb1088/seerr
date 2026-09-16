import { MediaRequestStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import EpisodeRequest from '@server/entity/EpisodeRequest';
import { MediaRequest } from '@server/entity/MediaRequest';
import logger from '@server/logger';
import type {
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { EventSubscriber } from 'typeorm';

@EventSubscriber()
export class EpisodeRequestSubscriber
  implements EntitySubscriberInterface<MediaRequest>
{
  public listenTo(): typeof MediaRequest {
    return MediaRequest;
  }

  private async syncStatus(entity: MediaRequest): Promise<void> {
    if (
      entity.type !== MediaType.TV ||
      !entity.episodes?.length ||
      ![
        MediaRequestStatus.APPROVED,
        MediaRequestStatus.DECLINED,
        MediaRequestStatus.COMPLETED,
        MediaRequestStatus.FAILED,
      ].includes(entity.status)
    ) {
      return;
    }

    const childStatus = entity.status;
    const changedEpisodes = entity.episodes.filter((episode) => {
      if (episode.status === childStatus) {
        return false;
      }

      episode.status = childStatus;
      return true;
    });

    if (changedEpisodes.length > 0) {
      await getRepository(EpisodeRequest).save(changedEpisodes);
    }
  }

  public async afterInsert(event: InsertEvent<MediaRequest>): Promise<void> {
    if (!event.entity) {
      return;
    }

    try {
      await this.syncStatus(event.entity);
    } catch (e) {
      logger.error('Failed to synchronize episode request status after insert', {
        label: 'Episode Request',
        requestId: event.entity.id,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
  }

  public async afterUpdate(event: UpdateEvent<MediaRequest>): Promise<void> {
    if (!event.entity) {
      return;
    }

    try {
      await this.syncStatus(event.entity);
    } catch (e) {
      logger.error('Failed to synchronize episode request status after update', {
        label: 'Episode Request',
        requestId: event.entity.id,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
