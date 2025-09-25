import type {
  Metadata,
  Player,
  ScheduleGame,
  Staff,
  StandingRow,
  Team
} from "../../../packages/schema/dist/index.js";
import { dataset } from "./generated/dataset.js";

type SeasonSnapshot = {
  metadata: Metadata;
  teams: Team[];
  players: Player[];
  staff: Staff[];
  schedules: ScheduleGame[];
  standings: StandingRow[];
};

type Dataset = Record<string, Record<string, SeasonSnapshot>>;

const data: Dataset = dataset as unknown as Dataset;

function getSeasonSnapshot(league: string, season: string): SeasonSnapshot | null {
  const leagueEntry = data[league];
  if (!leagueEntry) return null;
  const snapshot = leagueEntry[season];
  if (!snapshot) return null;
  return snapshot;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 3 || segments[0] !== "v1") {
      return new Response("Not found", { status: 404 });
    }

    const [, league, season, resource, entityId] = segments;
    const snapshot = getSeasonSnapshot(league, season);
    if (!snapshot) {
      return new Response("Not found", { status: 404 });
    }

    const { metadata } = snapshot;

    switch (resource) {
      case "teams": {
        return json({ meta: metadata, data: snapshot.teams });
      }
      case "roster": {
        const teamId = url.searchParams.get("teamId");
        const players = teamId
          ? snapshot.players.filter((player) => player.teamId === teamId)
          : snapshot.players;
        return json({ meta: metadata, data: players });
      }
      case "standings": {
        return json({ meta: metadata, data: snapshot.standings });
      }
      case "schedules": {
        return json({ meta: metadata, data: snapshot.schedules });
      }
      case "players": {
        if (!entityId) {
          return json({ meta: metadata, data: snapshot.players });
        }
        const player = snapshot.players.find((entry) => entry.id === entityId);
        if (!player) {
          return new Response("Not found", { status: 404 });
        }
        return json({ meta: metadata, data: player });
      }
      default:
        return new Response("Not found", { status: 404 });
    }
  }
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60"
    },
    ...init
  });
}
