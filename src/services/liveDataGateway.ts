import { z } from 'zod';

export type SupportedSport = 'baseball' | 'football' | 'basketball' | 'track_and_field' | 'all';

export interface LiveGame {
  id: string;
  sport: SupportedSport;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'in_progress' | 'final' | 'delayed';
  period?: string;
  timeRemaining?: string;
  startTime?: string;
  venue?: string;
}

export interface PlayerStatLine {
  id: string;
  sport: SupportedSport;
  athlete: string;
  team: string;
  position: string;
  metrics: Record<string, number | string>;
  lastUpdated: string;
}

export interface GatewayResult<T> {
  data: T;
  receivedAt: number;
}

const liveGameSchema = z.object({
  id: z.string(),
  sport: z.enum(['baseball', 'football', 'basketball', 'track_and_field', 'all']),
  league: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeScore: z.number().nonnegative(),
  awayScore: z.number().nonnegative(),
  status: z.enum(['scheduled', 'in_progress', 'final', 'delayed']),
  period: z.string().optional(),
  timeRemaining: z.string().optional(),
  startTime: z.string().optional(),
  venue: z.string().optional(),
});

const playerStatSchema = z.object({
  id: z.string(),
  sport: z.enum(['baseball', 'football', 'basketball', 'track_and_field', 'all']),
  athlete: z.string(),
  team: z.string(),
  position: z.string(),
  metrics: z.record(z.union([z.number(), z.string()])),
  lastUpdated: z.string(),
});

const liveGameListSchema = z.array(liveGameSchema);
const playerListSchema = z.array(playerStatSchema);

const REQUEST_TIMEOUT_MS = 10_000;

class GatewayError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'GatewayError';
  }
}

const getBaseUrl = (): string => {
  const baseUrl = process.env.REACT_APP_SPORTS_API_BASE_URL;
  if (!baseUrl) {
    throw new GatewayError('Missing REACT_APP_SPORTS_API_BASE_URL');
  }
  return baseUrl.replace(/\/$/, '');
};

const buildUrl = (path: string, params?: Record<string, string | undefined>): string => {
  const base = getBaseUrl();
  const url = new URL(path, `${base}/`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

const fetchWithTimeout = async (url: string, signal?: AbortSignal): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: signal ? mergeSignals(signal, controller.signal) : controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeout);
    if (!response.ok) {
      throw new GatewayError(`Request failed with status ${response.status}`, response.status);
    }
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GatewayError('Request timed out');
    }
    if (error instanceof GatewayError) {
      throw error;
    }
    throw new GatewayError(error instanceof Error ? error.message : 'Unknown error');
  }
};

const mergeSignals = (primary: AbortSignal, secondary: AbortSignal): AbortSignal => {
  if (primary.aborted) {
    return primary;
  }

  const controller = new AbortController();

  const abort = () => {
    controller.abort();
  };

  primary.addEventListener('abort', abort, { once: true });
  secondary.addEventListener('abort', abort, { once: true });
  controller.signal.addEventListener(
    'abort',
    () => {
      primary.removeEventListener('abort', abort);
      secondary.removeEventListener('abort', abort);
    },
    { once: true },
  );

  return controller.signal;
};

export const fetchLiveGames = async (
  sport: SupportedSport = 'all',
  signal?: AbortSignal,
): Promise<GatewayResult<LiveGame[]>> => {
  const response = await fetchWithTimeout(buildUrl('/v1/games/live', { sport }), signal);
  const payload = await response.json();
  const parsed = liveGameListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new GatewayError('Invalid live game payload shape');
  }
  return { data: parsed.data, receivedAt: Date.now() };
};

export const fetchPlayerStats = async (
  sport: SupportedSport = 'all',
  signal?: AbortSignal,
): Promise<GatewayResult<PlayerStatLine[]>> => {
  const response = await fetchWithTimeout(buildUrl('/v1/players/featured', { sport }), signal);
  const payload = await response.json();
  const parsed = playerListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new GatewayError('Invalid player stats payload shape');
  }
  return { data: parsed.data, receivedAt: Date.now() };
};

export const fetchBeliefScores = async (
  sport: SupportedSport,
  signal?: AbortSignal,
): Promise<GatewayResult<PlayerStatLine[]>> => {
  const response = await fetchWithTimeout(buildUrl('/v1/belief-scores', { sport }), signal);
  const payload = await response.json();
  const parsed = playerListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new GatewayError('Invalid Belief Score payload shape');
  }
  return { data: parsed.data, receivedAt: Date.now() };
};

export { GatewayError };
