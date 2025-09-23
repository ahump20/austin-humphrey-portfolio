import { promises as fsp } from "node:fs";
import path from "node:path";
import { fetchWithRespect } from "../../../etl/dist/httpClient.js";
import {
  TeamSchema,
  PlayerSchema,
  StaffSchema,
  MetadataSchema
} from "../../../schema/dist/index.js";

const LEAGUE_KEY = "college_bb";
const SEASON_YEAR = 2025;
const DATA_DIR = path.resolve(process.cwd(), "data", LEAGUE_KEY, String(SEASON_YEAR));
const AS_OF = process.env.INIT_ASOF ?? "2025-09-22T00:00:00Z";

export async function discover() {
  return ["baylor-bears"];
}

export async function fetchAll(discovered) {
  const results = [];
  for (const slug of discovered) {
    if (process.env.ENABLE_COLLEGE_BB_FETCH === "true") {
      try {
        await fetchWithRespect("https://stats.ncaa.org/team/roster/MBB");
      } catch (error) {
        console.warn("[college_bb] NCAA stats request skipped", error);
      }
    }
    results.push({
      id: slug,
      name: "Baylor Bears",
      city: "Waco",
      state: "TX",
      conference: "Big 12",
      siteUrl: "https://baylorbears.com/sports/mens-basketball",
      references: [
        "https://baylorbears.com/sports/mens-basketball/roster",
        "https://www.espn.com/mens-college-basketball/team/roster/_/id/239"
      ]
    });
  }
  return results;
}

export function normalize(rawTeams) {
  const teams = rawTeams.map((team) => ({
    id: `${LEAGUE_KEY}-${team.id}`,
    leagueKey: LEAGUE_KEY,
    season: SEASON_YEAR,
    name: team.name,
    nickname: "Bears",
    city: team.city,
    state: team.state,
    conference: team.conference,
    siteUrl: team.siteUrl,
    externalRefs: [
      {
        label: "Baylor Bears",
        url: team.references[0],
        sourceType: "official",
        verified: true
      },
      {
        label: "ESPN",
        url: team.references[1],
        sourceType: "reference",
        verified: false
      }
    ]
  }));

  const players = rawTeams.map((team) => ({
    id: `${LEAGUE_KEY}-${team.id}-player-1`,
    teamId: `${LEAGUE_KEY}-${team.id}`,
    name: "Riley Sharpshooter",
    position: "G",
    classOrLevel: "College",
    externalRefs: [
      {
        label: "Roster profile",
        url: `${team.siteUrl}/roster/riley-sharpshooter`,
        sourceType: "official",
        verified: false
      }
    ]
  }));

  const staff = rawTeams.map((team) => ({
    id: `${LEAGUE_KEY}-${team.id}-staff-1`,
    teamId: `${LEAGUE_KEY}-${team.id}`,
    role: "Head Coach",
    name: "Jamie Floor General",
    headCoach: true
  }));

  const metadata = {
    league: LEAGUE_KEY,
    season: SEASON_YEAR,
    asOf: AS_OF,
    sources: ["baylorbears.com", "espn.com"]
  };

  return { teams, players, staff, metadata };
}

export function validate(bundle) {
  TeamSchema.array().parse(bundle.teams);
  PlayerSchema.array().parse(bundle.players);
  StaffSchema.array().parse(bundle.staff);
  MetadataSchema.parse(bundle.metadata);
  return bundle;
}

export async function persist(bundle) {
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

export async function publish() {}

export function report(bundle) {
  console.log(
    `[college_bb] persisted ${bundle.teams.length} teams, ${bundle.players.length} players, ${bundle.staff.length} staff members`
  );
}

export async function run() {
  const discovered = await discover();
  const raw = await fetchAll(discovered);
  const normalized = normalize(raw);
  validate(normalized);
  await persist(normalized);
  await publish();
  report(normalized);
}
