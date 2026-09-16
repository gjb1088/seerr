import Alert from '@app/components/Common/Alert';
import Modal from '@app/components/Common/Modal';
import type { RequestOverrides } from '@app/components/RequestModal/AdvancedRequester';
import AdvancedRequester from '@app/components/RequestModal/AdvancedRequester';
import EpisodeRequestSelector, {
  type SelectedEpisode,
} from '@app/components/RequestModal/EpisodeRequestSelector';
import QuotaDisplay from '@app/components/RequestModal/QuotaDisplay';
import SearchByNameModal from '@app/components/RequestModal/SearchByNameModal';
import useSettings from '@app/hooks/useSettings';
import useToasts from '@app/hooks/useToasts';
import { useUser } from '@app/hooks/useUser';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { ANIME_KEYWORD_ID } from '@server/api/themoviedb/constants';
import { MediaRequestStatus, MediaStatus } from '@server/constants/media';
import type { MediaRequest } from '@server/entity/MediaRequest';
import type { QuotaResponse } from '@server/interfaces/api/userInterfaces';
import { Permission } from '@server/lib/permissions';
import type { TvDetails } from '@server/models/Tv';
import axios from 'axios';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR, { mutate } from 'swr';

const messages = defineMessages('components.RequestModal.TvEpisodeRequestModal', {
  title: 'Request Episodes',
  title4k: 'Request Episodes in 4K',
  selectepisodes: 'Select Episode(s)',
  requestepisodes:
    'Request {episodeCount} {episodeCount, plural, one {Episode} other {Episodes}}',
  requestepisodes4k:
    'Request {episodeCount} {episodeCount, plural, one {Episode} other {Episodes}} in 4K',
  requestSuccess:
    '<strong>{title}</strong> episode request submitted successfully!',
  requesterror: 'Something went wrong while submitting the episode request.',
  requestadmin: 'This request will be approved automatically.',
});

interface TvEpisodeRequestModalProps {
  tmdbId: number;
  onCancel?: () => void;
  onComplete?: (newStatus: MediaStatus) => void;
  onUpdating?: (isUpdating: boolean) => void;
  is4k?: boolean;
}

const TvEpisodeRequestModal = ({
  onCancel,
  onComplete,
  tmdbId,
  onUpdating,
  is4k = false,
}: TvEpisodeRequestModalProps) => {
  const settings = useSettings();
  const { addToast } = useToasts();
  const intl = useIntl();
  const { user, hasPermission } = useUser();
  const { data, error } = useSWR<TvDetails>(`/api/v1/tv/${tmdbId}`);
  const [selectedEpisodes, setSelectedEpisodes] = useState<SelectedEpisode[]>([]);
  const [requestOverrides, setRequestOverrides] =
    useState<RequestOverrides | null>(null);
  const [searchModal, setSearchModal] = useState({ show: true });
  const [tvdbId, setTvdbId] = useState<number | undefined>(undefined);

  const { data: quota } = useSWR<QuotaResponse>(
    user &&
      (!requestOverrides?.user?.id || hasPermission(Permission.MANAGE_USERS))
      ? `/api/v1/user/${requestOverrides?.user?.id ?? user.id}/quota`
      : null
  );

  const activeRequests = useMemo(
    () =>
      (data?.mediaInfo?.requests ?? []).filter(
        (request) =>
          request.is4k === is4k &&
          request.status !== MediaRequestStatus.DECLINED &&
          request.status !== MediaRequestStatus.COMPLETED
      ),
    [data?.mediaInfo?.requests, is4k]
  );

  const requestedEpisodeKeys = useMemo(
    () =>
      new Set(
        activeRequests.flatMap((request) =>
          (request.episodes ?? []).map(
            (episode) => `${episode.seasonNumber}:${episode.episodeNumber}`
          )
        )
      ),
    [activeRequests]
  );

  const requestedSeasonNumbers = useMemo(() => {
    const seasonNumbers = new Set(
      activeRequests.flatMap((request) =>
        (request.seasons ?? []).map((season) => season.seasonNumber)
      )
    );

    for (const season of data?.mediaInfo?.seasons ?? []) {
      if (
        season[is4k ? 'status4k' : 'status'] === MediaStatus.AVAILABLE
      ) {
        seasonNumbers.add(season.seasonNumber);
      }
    }

    return seasonNumbers;
  }, [activeRequests, data?.mediaInfo?.seasons, is4k]);

  const currentlyRemaining = Math.max(
    0,
    (quota?.tv.remaining ?? selectedEpisodes.length) - selectedEpisodes.length
  );

  const sendRequest = async () => {
    if (selectedEpisodes.length === 0) {
      return;
    }

    if (onUpdating) {
      onUpdating(true);
      mutate('/api/v1/request/count');
    }

    try {
      let overrideParams = {};
      if (requestOverrides) {
        overrideParams = {
          serverId: requestOverrides.server,
          profileId: requestOverrides.profile,
          rootFolder: requestOverrides.folder,
          languageProfileId: requestOverrides.language,
          userId: requestOverrides.user?.id,
          tags: requestOverrides.tags,
        };
      }

      const response = await axios.post<MediaRequest>('/api/v1/request', {
        mediaId: data?.id,
        tvdbId: tvdbId ?? data?.externalIds.tvdbId,
        mediaType: 'tv',
        is4k,
        ignoreQuota: requestOverrides?.ignoreQuota,
        episodes: [...selectedEpisodes].sort(
          (a, b) =>
            a.seasonNumber - b.seasonNumber ||
            a.episodeNumber - b.episodeNumber
        ),
        ...overrideParams,
      });

      mutate('/api/v1/request?filter=all&take=10&sort=modified&skip=0');
      mutate('/api/v1/request/count');
      mutate(`/api/v1/tv/${tmdbId}`);

      if (response.data?.media) {
        onComplete?.(response.data.media.status);
      } else {
        onComplete?.(MediaStatus.PENDING);
      }

      addToast(
        <span>
          {intl.formatMessage(messages.requestSuccess, {
            title: data?.name,
            strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
          })}
        </span>,
        { appearance: 'success', autoDismiss: true }
      );
    } catch {
      addToast(intl.formatMessage(messages.requesterror), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      onUpdating?.(false);
    }
  };

  if (data && !error && !data.externalIds.tvdbId && searchModal.show) {
    return (
      <SearchByNameModal
        tvdbId={tvdbId}
        setTvdbId={setTvdbId}
        closeModal={() => setSearchModal({ show: false })}
        onCancel={onCancel}
        modalTitle={intl.formatMessage(is4k ? messages.title4k : messages.title)}
        modalSubTitle={data.name}
        tmdbId={tmdbId}
        backdrop={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/${data.backdropPath}`}
      />
    );
  }

  return (
    <Modal
      loading={!data && !error}
      backgroundClickable
      onCancel={tvdbId ? () => setSearchModal({ show: true }) : onCancel}
      onOk={sendRequest}
      title={intl.formatMessage(is4k ? messages.title4k : messages.title)}
      subTitle={data?.name}
      okText={
        selectedEpisodes.length === 0
          ? intl.formatMessage(messages.selectepisodes)
          : intl.formatMessage(
              is4k ? messages.requestepisodes4k : messages.requestepisodes,
              { episodeCount: selectedEpisodes.length }
            )
      }
      okDisabled={
        selectedEpisodes.length === 0 ||
        (!!quota?.tv.limit &&
          selectedEpisodes.length > (quota.tv.remaining ?? 0) &&
          !requestOverrides?.ignoreQuota)
      }
      cancelText={
        tvdbId
          ? intl.formatMessage(globalMessages.back)
          : intl.formatMessage(globalMessages.cancel)
      }
      backdrop={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/${data?.backdropPath}`}
    >
      {hasPermission(
        [
          Permission.MANAGE_REQUESTS,
          is4k ? Permission.AUTO_APPROVE_4K : Permission.AUTO_APPROVE,
          is4k ? Permission.AUTO_APPROVE_4K_TV : Permission.AUTO_APPROVE_TV,
        ],
        { type: 'or' }
      ) && (
        <div className="mb-4">
          <Alert
            title={intl.formatMessage(messages.requestadmin)}
            type="info"
          />
        </div>
      )}

      {(quota?.tv.limit ?? 0) > 0 && (
        <QuotaDisplay
          mediaType="tv"
          quota={quota?.tv}
          remaining={currentlyRemaining}
          userOverride={
            requestOverrides?.user && requestOverrides.user.id !== user?.id
              ? requestOverrides.user.id
              : undefined
          }
          overLimit={
            selectedEpisodes.length > (quota?.tv.remaining ?? 0)
              ? selectedEpisodes.length
              : undefined
          }
        />
      )}

      {data && (
        <EpisodeRequestSelector
          tmdbId={tmdbId}
          seasons={data.seasons}
          enableSpecialEpisodes={settings.currentSettings.enableSpecialEpisodes}
          selectedEpisodes={selectedEpisodes}
          onChange={setSelectedEpisodes}
          requestedEpisodeKeys={requestedEpisodeKeys}
          requestedSeasonNumbers={requestedSeasonNumbers}
        />
      )}

      {(hasPermission(Permission.REQUEST_ADVANCED) ||
        hasPermission(Permission.MANAGE_REQUESTS)) && (
        <AdvancedRequester
          type="tv"
          is4k={is4k}
          isAnime={data?.keywords.some(
            (keyword) => keyword.id === ANIME_KEYWORD_ID
          )}
          quota={quota}
          onChange={(overrides) => setRequestOverrides(overrides)}
        />
      )}
    </Modal>
  );
};

export default TvEpisodeRequestModal;
