import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchLiveGames, fetchPlayerStats, GatewayError, LiveGame, PlayerStatLine } from '../services/liveDataGateway';

interface GameScore {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'final' | 'scheduled' | 'delayed';
  period?: string;
  timeRemaining?: string;
  startTime?: string;
  sport: string;
  league?: string;
  venue?: string;
  quarter?: string;
}

interface PlayerStats {
  playerId: string;
  name: string;
  team: string;
  position: string;
  sport: string;
  stats: Record<string, number>;
  metrics: Record<string, number | string>;
  performance: {
    rating: number;
    trend: 'up' | 'down' | 'stable';
  };
  lastUpdated: string;
}

interface SportsDataContextType {
  liveGames: GameScore[];
  playerStats: PlayerStats[];
  isConnected: boolean;
  isLoading: boolean;
  lastUpdated: number | null;
  errors: string[];
  subscribeToGame: (gameId: string) => void;
  unsubscribeFromGame: (gameId: string) => void;
  getGamePrediction: (gameId: string) => Promise<null>;
  searchPlayers: (query: string) => Promise<PlayerStats[]>;
  refreshData: () => Promise<void>;
}

const SportsDataContext = createContext<SportsDataContextType | undefined>(undefined);

export const SportsDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [liveGames, setLiveGames] = useState<GameScore[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const normalizeStatus = useCallback((status: LiveGame['status']): GameScore['status'] => {
    switch (status) {
      case 'in_progress':
        return 'live';
      case 'final':
        return 'final';
      case 'scheduled':
        return 'scheduled';
      case 'delayed':
      default:
        return 'delayed';
    }
  }, []);

  const mapGame = useCallback(
    (game: LiveGame): GameScore => ({
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      status: normalizeStatus(game.status),
      period: game.period,
      quarter: game.period,
      timeRemaining: game.timeRemaining,
      startTime: game.startTime,
      sport: game.sport === 'all' ? game.league ?? 'multi-sport' : game.sport,
      league: game.league,
      venue: game.venue,
    }),
    [normalizeStatus],
  );

  const mapPlayer = useCallback((player: PlayerStatLine): PlayerStats => {
    const numericMetrics = Object.entries(player.metrics).reduce<Record<string, number>>((acc, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});

    const ratingMetric = player.metrics.rating;
    const rating = typeof ratingMetric === 'number' && Number.isFinite(ratingMetric) ? ratingMetric : 0;

    return {
      playerId: player.id,
      name: player.athlete,
      team: player.team,
      position: player.position,
      sport: player.sport,
      stats: numericMetrics,
      metrics: player.metrics,
      performance: {
        rating,
        trend: 'stable',
      },
      lastUpdated: player.lastUpdated,
    };
  }, []);

  const loadInitialData = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const [liveGameResponse, playerStatResponse] = await Promise.all([
          fetchLiveGames('all', signal),
          fetchPlayerStats('all', signal),
        ]);

        setLiveGames(liveGameResponse.data.map(mapGame));
        setPlayerStats(playerStatResponse.data.map(mapPlayer));
        setIsConnected(true);
        setErrors([]);
        setLastUpdated(Math.min(liveGameResponse.receivedAt, playerStatResponse.receivedAt));
      } catch (error) {
        console.error('Failed to load sports data', error);
        setLiveGames([]);
        setPlayerStats([]);
        setIsConnected(false);
        if (error instanceof GatewayError) {
          setErrors([error.message]);
        } else if (error instanceof Error) {
          setErrors([error.message]);
        } else {
          setErrors(['Unknown error loading sports data']);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [mapGame, mapPlayer],
  );

  useEffect(() => {
    const abortController = new AbortController();
    void loadInitialData(abortController.signal);

    const interval = window.setInterval(() => {
      void loadInitialData();
    }, 60_000);

    return () => {
      abortController.abort();
      window.clearInterval(interval);
    };
  }, [loadInitialData]);

  const subscribeToGame = useCallback((gameId: string) => {
    console.warn('Real-time subscriptions require a configured WebSocket gateway', gameId);
  }, []);

  const unsubscribeFromGame = useCallback((gameId: string) => {
    console.warn('Unsubscribing requires a configured WebSocket gateway', gameId);
  }, []);

  const getGamePrediction = useCallback(async (gameId: string) => {
    console.warn('Prediction endpoint not configured for game', gameId);
    return null;
  }, []);

  const searchPlayers = useCallback(async (query: string): Promise<PlayerStats[]> => {
    console.warn('Player search requires backend integration', query);
    return [];
  }, []);

  const refreshData = useCallback(async () => {
    await loadInitialData();
  }, [loadInitialData]);

  const value = useMemo<SportsDataContextType>(
    () => ({
      liveGames,
      playerStats,
      isConnected,
      isLoading,
      lastUpdated,
      errors,
      subscribeToGame,
      unsubscribeFromGame,
      getGamePrediction,
      searchPlayers,
      refreshData,
    }),
    [
      liveGames,
      playerStats,
      isConnected,
      isLoading,
      lastUpdated,
      errors,
      subscribeToGame,
      unsubscribeFromGame,
      getGamePrediction,
      searchPlayers,
      refreshData,
    ],
  );

  return (
    <SportsDataContext.Provider value={value}>
      {children}
    </SportsDataContext.Provider>
  );
};

export const useSportsData = () => {
  const context = useContext(SportsDataContext);
  if (context === undefined) {
    throw new Error('useSportsData must be used within a SportsDataProvider');
  }
  return context;
};

export default SportsDataContext;