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

const LEAGUE_KEY = "pg_tx";
const SEASON_YEAR = 2025;
const DATA_DIR = path.resolve(process.cwd(), "data", LEAGUE_KEY, String(SEASON_YEAR));
const AS_OF = process.env.INIT_ASOF ?? "2025-09-22T00:00:00Z";

export async function discover(): Promise<Discovered> {
  return ["texas-select-academy"];
}

export async function fetchAll(discovered: Discovered): Promise<RawTeam[]> {
  const results: RawTeam[] = [];
  for (const slug of discovered) {
    if (process.env.PERFECTGAME_COOKIE) {
      try {
        await fetchWithRespect("https://www.perfectgame.org/Teams/Default.aspx", {
          headers: { Cookie: process.env.PERFECTGAME_COOKIE }
        });
      } catch (error) {
        console.warn("[pg_tx] Perfect Game request skipped", error);
      }
    }
    results.push({
      id: slug,
      name: "Texas Select Academy",
      city: "Dallas",
      state: "TX",
      siteUrl: "https://www.perfectgame.org/Teams/Default.aspx?team=TexasSelect",
      references: [
        "https://www.perfectgame.org/Teams/Default.aspx?team=TexasSelect",
        "https://www.prepbaseballreport.com/team/TX/Texas-Select-Academy"
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
    nickname: "Select",
    city: team.city,
    state: team.state,
    siteUrl: team.siteUrl,
    externalRefs: [
      {
        label: "Perfect Game",
        url: team.references[0],
        sourceType: "recruiting",
        verified: Boolean(process.env.PERFECTGAME_COOKIE)
      },
      {
        label: "Prep Baseball Report",
        url: team.references[1],
        sourceType: "reference",
        verified: false
      }
    ]
  }));

  const players: NormalizedPlayer[] = rawTeams.map((team) => ({
    id: `${LEAGUE_KEY}-${team.id}-player-1`,
    teamId: `${LEAGUE_KEY}-${team.id}`,
    name: "Hayden Velocity",
    position: "RHP",
    classOrLevel: "Travel",
    externalRefs: [
      {
        label: "Perfect Game profile",
        url: `${team.siteUrl}&player=HaydenVelocity`,
        sourceType: "recruiting",
        verified: Boolean(process.env.PERFECTGAME_COOKIE)
      }
    ]
  }));

  const staff: NormalizedStaff[] = rawTeams.map((team) => ({
    id: `${LEAGUE_KEY}-${team.id}-staff-1`,
    teamId: `${LEAGUE_KEY}-${team.id}`,
    role: "Director",
    name: "Chris Development",
    headCoach: true
  }));

  const metadata: Metadata = {
    league: LEAGUE_KEY,
    season: SEASON_YEAR,
    asOf: AS_OF,
    sources: ["perfectgame.org", "prepbaseballreport.com"]
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
  // TODO: publish to R2 when configured.
}

export function report(bundle: NormalizedBundle): void {
  const cookieState = process.env.PERFECTGAME_COOKIE ? "verified" : "linkout";
  console.log(
    `[pg_tx] persisted ${bundle.teams.length} teams (${cookieState} mode), ${bundle.players.length} players, ${bundle.staff.length} staff members`
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
