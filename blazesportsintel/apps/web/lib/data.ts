import fs from "node:fs";
import path from "node:path";
import {
  TeamSchema,
  PlayerSchema,
  StaffSchema,
  MetadataSchema
} from "../../../packages/schema/dist/index.js";
import type { z } from "zod";

const DATA_ROOT = path.resolve(process.cwd(), "../..", "data");

type Team = z.infer<typeof TeamSchema>;
type Player = z.infer<typeof PlayerSchema>;
type Staff = z.infer<typeof StaffSchema>;
type Metadata = z.infer<typeof MetadataSchema>;

type LeagueSnapshot = {
  metadata: Metadata;
  teams: Team[];
  players: Player[];
  staff: Staff[];
};

function readJsonl<T extends z.ZodTypeAny>(schema: T, filePath: string): z.infer<T>[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  return lines.map((line) => schema.parse(JSON.parse(line)));
}

function readMetadata(league: string, season: string): Metadata {
  const metadataPath = path.join(DATA_ROOT, league, season, "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return MetadataSchema.parse({ league, season: Number.parseInt(season, 10), asOf: new Date().toISOString() });
  }
  return MetadataSchema.parse(JSON.parse(fs.readFileSync(metadataPath, "utf8")));
}

export function listLeagues(): string[] {
  if (!fs.existsSync(DATA_ROOT)) return [];
  return fs.readdirSync(DATA_ROOT).filter((entry) => fs.statSync(path.join(DATA_ROOT, entry)).isDirectory());
}

export function listSeasons(league: string): string[] {
  const leagueDir = path.join(DATA_ROOT, league);
  if (!fs.existsSync(leagueDir)) return [];
  return fs.readdirSync(leagueDir).filter((entry) => fs.statSync(path.join(leagueDir, entry)).isDirectory());
}

export function loadLeague(league: string, season: string): LeagueSnapshot {
  const base = path.join(DATA_ROOT, league, season);
  const metadata = readMetadata(league, season);
  const teams = readJsonl(TeamSchema, path.join(base, "teams.jsonl"));
  const players = readJsonl(PlayerSchema, path.join(base, "players.jsonl"));
  const staff = readJsonl(StaffSchema, path.join(base, "staff.jsonl"));
  const snapshot: LeagueSnapshot = { metadata, teams, players, staff };
  return snapshot;
}

export function loadTeam(league: string, season: string, teamId: string) {
  const snapshot = loadLeague(league, season);
  const team = snapshot.teams.find((entry) => entry.id === teamId);
  if (!team) return null;
  const roster = snapshot.players.filter((player) => player.teamId === teamId);
  const coaches = snapshot.staff.filter((member) => member.teamId === teamId);
  return { team, roster, staff: coaches, metadata: snapshot.metadata };
}

export function loadPlayer(league: string, season: string, playerId: string) {
  const snapshot = loadLeague(league, season);
  const player = snapshot.players.find((entry) => entry.id === playerId);
  if (!player) return null;
  return { player, metadata: snapshot.metadata };
}
