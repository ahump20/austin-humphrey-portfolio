import fs from "node:fs";
import path from "node:path";

const DATA_ROOT = path.resolve(process.cwd(), "data");

function readJsonl(filePath: string) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function readMetadata(league: string, season: string) {
  const metadataPath = path.join(DATA_ROOT, league, season, "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return { league, season: Number.parseInt(season, 10), asOf: new Date().toISOString() };
  }
  return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 3 || segments[0] !== "v1") {
      return new Response("Not found", { status: 404 });
    }

    const [, league, season, resource, entityId] = segments;
    const baseDir = path.join(DATA_ROOT, league, season ?? "");
    if (!fs.existsSync(baseDir)) {
      return new Response("Not found", { status: 404 });
    }

    const metadata = readMetadata(league, season);

    switch (resource) {
      case "teams": {
        const teams = readJsonl(path.join(baseDir, "teams.jsonl"));
        return json({ meta: metadata, data: teams });
      }
      case "roster": {
        const teamId = url.searchParams.get("teamId");
        const players = readJsonl(path.join(baseDir, "players.jsonl"));
        const filtered = teamId ? players.filter((player) => player.teamId === teamId) : players;
        return json({ meta: metadata, data: filtered });
      }
      case "standings": {
        const standings = readJsonl(path.join(baseDir, "standings.jsonl"));
        return json({ meta: metadata, data: standings });
      }
      case "schedules": {
        const schedules = readJsonl(path.join(baseDir, "schedules.jsonl"));
        return json({ meta: metadata, data: schedules });
      }
      case "players": {
        if (!entityId) {
          const players = readJsonl(path.join(baseDir, "players.jsonl"));
          return json({ meta: metadata, data: players });
        }
        const players = readJsonl(path.join(baseDir, "players.jsonl"));
        const player = players.find((entry) => entry.id === entityId);
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
