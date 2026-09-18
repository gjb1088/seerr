import ServarrBase from '@server/api/servarr/base';
import type Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import axios from 'axios';

const episodeKey = (seasonNumber: number, episodeNumber: number) =>
  `${seasonNumber}:${episodeNumber}`;

export const getTodayIsoDate = (): string => {
  const timeZone = process.env.TZ || 'UTC';

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    logger.warn(
      'Failed to resolve configured timezone for episode air dates.',
      {
        label: 'Episode Availability',
        timeZone,
        errorMessage: e.message,
      }
    );
  }

  return new Date().toISOString().slice(0, 10);
};

export const isEpisodeAired = (
  airDate: string | null,
  today = getTodayIsoDate()
): boolean => !!airDate && airDate <= today;

export const getSonarrEpisodeFileKeys = async ({
  media,
  is4k,
}: {
  media?: Media;
  is4k: boolean;
}): Promise<Set<string>> => {
  if (!media) {
    return new Set();
  }

  const serviceId = is4k ? media.serviceId4k : media.serviceId;
  const externalServiceId = is4k
    ? media.externalServiceId4k
    : media.externalServiceId;

  if (serviceId == null || externalServiceId == null) {
    return new Set();
  }

  const server = getSettings().sonarr.find((sonarr) => sonarr.id === serviceId);
  if (!server) {
    return new Set();
  }

  try {
    const response = await axios.get<
      {
        seasonNumber: number;
        episodeNumber: number;
        hasFile: boolean;
      }[]
    >(`${ServarrBase.buildUrl(server, '/api/v3')}/episode`, {
      params: {
        apikey: server.apiKey,
        seriesId: externalServiceId,
      },
      timeout: getSettings().network.apiRequestTimeout,
    });

    return new Set(
      response.data
        .filter((episode) => episode.hasFile)
        .map((episode) =>
          episodeKey(episode.seasonNumber, episode.episodeNumber)
        )
    );
  } catch (e) {
    logger.warn('Unable to retrieve Sonarr episode availability.', {
      label: 'Episode Availability',
      mediaId: media.id,
      is4k,
      errorMessage: e.message,
    });

    return new Set();
  }
};

export const getEpisodeKey = episodeKey;
