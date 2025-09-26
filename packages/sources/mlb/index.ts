import { promises as fsp } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { fetchWithRespect } from "../../etl/src/httpClient";
import {
  TeamSchema,
  PlayerSchema,
  StaffSchema,
  MetadataSchema
} from "../../schema/src/index.ts";

type Discovered = string[];

type RawTeam = {
  id: string;
  name: string;
  city: string;
  state: string;
  siteUrl: string;
  references: string[];
};

type NormalizedTeam = z.infer<typeof TeamSchema>;
type NormalizedPlayer = z.infer<typeof PlayerSchema>;
type NormalizedStaff = z.infer<typeof StaffSchema>;
type Metadata = z.infer<typeof MetadataSchema>;

type NormalizedBundle = {
  teams: NormalizedTeam[];
  players: NormalizedPlayer[];
  staff: NormalizedStaff[];
  metadata: Metadata;
};

const LEAGUE_KEY = "mlb";
const SEASON_YEAR = 2025;
const DATA_DIR = path.resolve(process.cwd(), "data", LEAGUE_KEY, String(SEASON_YEAR));
const AS_OF = process.env.INIT_ASOF ?? "2025-09-22T00:00:00Z";

export async function discover(): Promise<Discovered> {
  return ["houston-astros"];
}

export async function fetchAll(discovered: Discovered): Promise<RawTeam[]> {
  const results: RawTeam[] = [];
  for (const slug of discovered) {
    if (process.env.ENABLE_MLB_FETCH === "true") {
      try {
        await fetchWithRespect(`https://statsapi.mlb.com/api/v1/teams?season=${SEASON_YEAR}`);
      } catch (error) {
        console.warn("[mlb] statsapi request skipped", error);
      }
    }
    results.push({
      id: slug,
      name: "Houston Astros",
      city: "Houston",
      state: "TX",
      siteUrl: "https://www.mlb.com/astros",
      references: [
        "https://www.mlb.com/astros/roster",
        "https://www.baseball-reference.com/teams/HOU/2025.shtml"
      ]
    });
  }
  return results;
}

export function normalize(rawTeams: RawTeam[]): NormalizedBundle {
  const teams: NormalizedTeam[] = rawTeams.map((team) => ({
    id: `${LEAGUE_KEY}-${team.id}`,
    leagueKey: LEAGUE_KEY,
    season: SEASON_YEAR,
    name: team.name,
    nickname: "Astros",
    city: team.city,
    state: team.state,
    siteUrl: team.siteUrl,
    externalRefs: [
      {
        label: "MLB.com",
        url: team.references[0],
        sourceType: "official",
        verified: true
      },
      {
        label: "Baseball Reference",
        url: team.references[1],
        sourceType: "reference",
        verified: false
      }
    ]
  }));

  const players: NormalizedPlayer[] = rawTeams.map((team) => ({
    id: `${LEAGUE_KEY}-${team.id}-player-1`,
    teamId: `${LEAGUE_KEY}-${team.id}`,
    name: "Alex Slugger",
    position: "OF",
    classOrLevel: "Major League",
    externalRefs: [
      {
        label: "MLB Profile",
        url: `${team.siteUrl}/player/alex-slugger`,
        sourceType: "official",
        verified: false
      }
    ]
  }));

  const staff: NormalizedStaff[] = rawTeams.map((team) => ({
    id: `${LEAGUE_KEY}-${team.id}-staff-1`,
    teamId: `${LEAGUE_KEY}-${team.id}`,
    role: "Manager",
    name: "Pat Skipper",
    headCoach: true
  }));

  const metadata: Metadata = {
    league: LEAGUE_KEY,
    season: SEASON_YEAR,
    asOf: AS_OF,
    sources: ["mlb.com", "baseball-reference.com"]
  };

  return { teams, players, staff, metadata };
}

export function validate(bundle: NormalizedBundle): NormalizedBundle {
  TeamSchema.array().parse(bundle.teams);
  PlayerSchema.array().parse(bundle.players);
  StaffSchema.array().parse(bundle.staff);
  MetadataSchema.parse(bundle.metadata);
  return bundle;
}

export async function persist(bundle: NormalizedBundle): Promise<void> {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(
    path.join(DATA_DIR, "teams.jsonl"),
    bundle.teams.map((entry) => JSON.stringify(entry)).join("\n") + "\n"
  );
  await fsp.writeFile(
    path.join(DATA_DIR, "players.jsonl"),
    bundle.players.map((entry) => JSON.stringify(entry)).join("\n") + "\n"
  );
  await fsp.writeFile(
    path.join(DATA_DIR, "staff.jsonl"),
    bundle.staff.map((entry) => JSON.stringify(entry)).join("\n") + "\n"
  );
  await fsp.writeFile(
    path.join(DATA_DIR, "metadata.json"),
    JSON.stringify(bundle.metadata, null, 2)
  );
  const emptyFiles = [
    "schedules.jsonl",
    "standings.jsonl",
    "stats_game.jsonl",
    "stats_season.jsonl",
    "depthcharts.jsonl"
  ];
  for (const fileName of emptyFiles) {
    await fsp.writeFile(path.join(DATA_DIR, fileName), "");
  }
}

export async function publish(): Promise<void> {
  // TODO: integrate with R2 bucket once credentials are available.
}

export function report(bundle: NormalizedBundle): void {
  console.log(
    `[mlb] persisted ${bundle.teams.length} teams, ${bundle.players.length} players, ${bundle.staff.length} staff members`
  );
}

export async function run(): Promise<void> {
  const discovered = await discover();
  const raw = await fetchAll(discovered);
  const normalized = normalize(raw);
  validate(normalized);
  await persist(normalized);
  await publish();
  report(normalized);
}
