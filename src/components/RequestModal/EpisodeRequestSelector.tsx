import Badge from '@app/components/Common/Badge';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import type { SeasonWithEpisodes, TvDetails } from '@server/models/Tv';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

export type SelectedEpisode = {
  seasonNumber: number;
  episodeNumber: number;
};

const messages = defineMessages(
  'components.RequestModal.EpisodeRequestSelector',
  {
    season: 'Season',
    episode: 'Episode',
    title: 'Title',
    airdate: 'Air Date',
    loading: 'Loading episodes…',
    loaderror: 'Unable to load episodes for this season.',
    noepisodes: 'No episodes are available for this season.',
    requestedseason: 'Season already requested',
    requestedepisode: 'Already requested',
    unaired: 'Not Yet Aired',
    selected: 'Selected',
  }
);

interface EpisodeRequestSelectorProps {
  tmdbId: number;
  seasons: TvDetails['seasons'];
  enableSpecialEpisodes: boolean;
  is4k: boolean;
  selectedEpisodes: SelectedEpisode[];
  onChange: (episodes: SelectedEpisode[]) => void;
  requestedEpisodeKeys?: Set<string>;
  requestedSeasonNumbers?: Set<number>;
}

const EpisodeRequestSelector = ({
  tmdbId,
  seasons,
  enableSpecialEpisodes,
  is4k,
  selectedEpisodes,
  onChange,
  requestedEpisodeKeys = new Set<string>(),
  requestedSeasonNumbers = new Set<number>(),
}: EpisodeRequestSelectorProps) => {
  const intl = useIntl();
  const selectableSeasons = useMemo(
    () =>
      seasons.filter(
        (season) =>
          season.episodeCount > 0 &&
          (enableSpecialEpisodes || season.seasonNumber !== 0)
      ),
    [enableSpecialEpisodes, seasons]
  );
  const [seasonNumber, setSeasonNumber] = useState<number | undefined>(
    selectableSeasons[0]?.seasonNumber
  );

  useEffect(() => {
    if (
      seasonNumber === undefined ||
      !selectableSeasons.some((season) => season.seasonNumber === seasonNumber)
    ) {
      setSeasonNumber(selectableSeasons[0]?.seasonNumber);
    }
  }, [seasonNumber, selectableSeasons]);

  const { data, error } = useSWR<SeasonWithEpisodes>(
    seasonNumber === undefined
      ? null
      : `/api/v1/tv/${tmdbId}/season/${seasonNumber}?is4k=${is4k}`
  );

  const isSelected = (episode: SelectedEpisode) =>
    selectedEpisodes.some(
      (selected) =>
        selected.seasonNumber === episode.seasonNumber &&
        selected.episodeNumber === episode.episodeNumber
    );

  const toggleEpisode = (episode: SelectedEpisode) => {
    const key = `${episode.seasonNumber}:${episode.episodeNumber}`;
    if (
      requestedSeasonNumbers.has(episode.seasonNumber) ||
      requestedEpisodeKeys.has(key)
    ) {
      return;
    }

    if (isSelected(episode)) {
      onChange(
        selectedEpisodes.filter(
          (selected) =>
            !(
              selected.seasonNumber === episode.seasonNumber &&
              selected.episodeNumber === episode.episodeNumber
            )
        )
      );
    } else {
      onChange([...selectedEpisodes, episode]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label
          htmlFor="episode-request-season"
          className="mb-1 block text-sm font-medium text-gray-200"
        >
          {intl.formatMessage(messages.season)}
        </label>
        <select
          id="episode-request-season"
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={seasonNumber ?? ''}
          onChange={(event) => setSeasonNumber(Number(event.target.value))}
        >
          {selectableSeasons.map((season) => (
            <option key={season.id} value={season.seasonNumber}>
              {season.seasonNumber === 0
                ? intl.formatMessage(globalMessages.specials)
                : `${intl.formatMessage(messages.season)} ${season.seasonNumber}`}
            </option>
          ))}
        </select>
      </div>

      {!data && !error && (
        <div className="py-6 text-center text-sm text-gray-300">
          {intl.formatMessage(messages.loading)}
        </div>
      )}
      {error && (
        <div className="py-6 text-center text-sm text-red-300">
          {intl.formatMessage(messages.loaderror)}
        </div>
      )}
      {data && data.episodes.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-300">
          {intl.formatMessage(messages.noepisodes)}
        </div>
      )}

      {data && data.episodes.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-700 shadow backdrop-blur">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="w-16 bg-gray-700/80 px-4 py-3" />
                <th className="bg-gray-700/80 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-200">
                  {intl.formatMessage(messages.episode)}
                </th>
                <th className="bg-gray-700/80 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-200">
                  {intl.formatMessage(messages.title)}
                </th>
                <th className="hidden bg-gray-700/80 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-200 sm:table-cell">
                  {intl.formatMessage(messages.airdate)}
                </th>
                <th className="bg-gray-700/80 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-200">
                  {intl.formatMessage(globalMessages.status)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data.episodes.map((episode) => {
                const selection = {
                  seasonNumber: episode.seasonNumber,
                  episodeNumber: episode.episodeNumber,
                };
                const key = `${episode.seasonNumber}:${episode.episodeNumber}`;
                const seasonRequested = requestedSeasonNumbers.has(
                  episode.seasonNumber
                );
                const episodeRequested = requestedEpisodeKeys.has(key);
                const selected = isSelected(selection);
                const available = episode.available === true;
                const aired = episode.aired === true;
                const checked = selected || seasonRequested || episodeRequested;
                const disabled = checked || available || !aired;

                return (
                  <tr key={episode.id}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        disabled={disabled}
                        onClick={() => toggleEpisode(selection)}
                        className={`relative inline-flex h-5 w-10 items-center justify-center focus:outline-none ${
                          disabled
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute mx-auto h-4 w-9 rounded-full transition-colors duration-200 ease-in-out ${
                            checked ? 'bg-indigo-500' : 'bg-gray-700'
                          }`}
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute left-0 inline-block h-5 w-5 rounded-full border border-gray-200 bg-white shadow transition-transform duration-200 ease-in-out ${
                            checked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-100">
                      E{String(episode.episodeNumber).padStart(2, '0')}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-100">
                      {episode.name}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-gray-300 sm:table-cell">
                      {episode.airDate ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-200">
                      {available ? (
                        <Badge badgeType="success">
                          {intl.formatMessage(globalMessages.available)}
                        </Badge>
                      ) : seasonRequested ? (
                        <Badge badgeType="warning">
                          {intl.formatMessage(messages.requestedseason)}
                        </Badge>
                      ) : episodeRequested ? (
                        <Badge badgeType="warning">
                          {intl.formatMessage(messages.requestedepisode)}
                        </Badge>
                      ) : !aired ? (
                        <Badge>{intl.formatMessage(messages.unaired)}</Badge>
                      ) : selected ? (
                        <Badge badgeType="primary">
                          {intl.formatMessage(messages.selected)}
                        </Badge>
                      ) : (
                        <Badge>
                          {intl.formatMessage(globalMessages.notrequested)}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EpisodeRequestSelector;
