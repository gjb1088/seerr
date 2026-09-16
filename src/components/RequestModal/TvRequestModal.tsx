import Modal from '@app/components/Common/Modal';
import TvEpisodeRequestModal from '@app/components/RequestModal/TvEpisodeRequestModal';
import TvSeasonRequestModal from '@app/components/RequestModal/TvSeasonRequestModal';
import defineMessages from '@app/utils/defineMessages';
import type { MediaStatus } from '@server/constants/media';
import type { MediaRequest } from '@server/entity/MediaRequest';
import type { NonFunctionProperties } from '@server/interfaces/api/common';
import type { TvDetails } from '@server/models/Tv';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages('components.RequestModal.TvRequestMode', {
  title: 'Request Series',
  choose: 'What would you like to request?',
  seasons: 'Request Season(s)',
  episodes: 'Request Individual Episode(s)',
  episodeEditUnsupported:
    'Individual episode requests cannot be modified yet. Delete the request and create a new one instead.',
  close: 'Close',
});

interface TvRequestModalProps {
  tmdbId: number;
  onCancel?: () => void;
  onComplete?: (newStatus: MediaStatus) => void;
  onUpdating?: (isUpdating: boolean) => void;
  is4k?: boolean;
  editRequest?: NonFunctionProperties<MediaRequest>;
}

type RequestMode = 'choose' | 'seasons' | 'episodes';

const TvRequestModal = ({
  tmdbId,
  onCancel,
  onComplete,
  onUpdating,
  is4k,
  editRequest,
}: TvRequestModalProps) => {
  const intl = useIntl();
  const { data } = useSWR<TvDetails>(`/api/v1/tv/${tmdbId}`);
  const [mode, setMode] = useState<RequestMode>(
    editRequest ? (editRequest.episodes?.length ? 'episodes' : 'seasons') : 'choose'
  );

  if (editRequest?.episodes?.length) {
    return (
      <Modal
        title={intl.formatMessage(messages.title)}
        subTitle={data?.name}
        onCancel={onCancel}
        cancelText={intl.formatMessage(messages.close)}
        backdrop={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/${data?.backdropPath}`}
      >
        <p>{intl.formatMessage(messages.episodeEditUnsupported)}</p>
      </Modal>
    );
  }

  if (mode === 'seasons') {
    return (
      <TvSeasonRequestModal
        tmdbId={tmdbId}
        onCancel={editRequest ? onCancel : () => setMode('choose')}
        onComplete={onComplete}
        onUpdating={onUpdating}
        is4k={is4k}
        editRequest={editRequest}
      />
    );
  }

  if (mode === 'episodes') {
    return (
      <TvEpisodeRequestModal
        tmdbId={tmdbId}
        onCancel={() => setMode('choose')}
        onComplete={onComplete}
        onUpdating={onUpdating}
        is4k={is4k}
      />
    );
  }

  return (
    <Modal
      title={intl.formatMessage(messages.title)}
      subTitle={data?.name}
      onCancel={onCancel}
      onOk={() => setMode('seasons')}
      okText={intl.formatMessage(messages.seasons)}
      onSecondary={() => setMode('episodes')}
      secondaryText={intl.formatMessage(messages.episodes)}
      secondaryButtonType="primary"
      backdrop={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/${data?.backdropPath}`}
    >
      <p>{intl.formatMessage(messages.choose)}</p>
    </Modal>
  );
};

export default TvRequestModal;
