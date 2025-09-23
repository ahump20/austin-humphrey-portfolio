#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const leagues = ["mlb", "nfl", "ncaa_fb", "college_bb", "tx_hs_fb", "pg_tx"];
const refs = {
  mlb: {
    site: "https://www.mlb.com",
    official: "https://www.mlb.com",
    reference: "https://www.baseball-reference.com",
    player: "https://www.mlb.com/players"
  },
  nfl: {
    site: "https://www.nfl.com",
    official: "https://www.nfl.com/teams",
    reference: "https://www.pro-football-reference.com",
    player: "https://www.nfl.com/players"
  },
  ncaa_fb: {
    site: "https://www.ncaa.com/sports/football/fbs",
    official: "https://www.ncaa.com/sports/football/fbs",
    reference: "https://www.espn.com/college-football",
    player: "https://www.espn.com/college-football/players"
  },
  college_bb: {
    site: "https://www.ncaa.com/sports/basketball-men/d1",
    official: "https://www.ncaa.com/sports/basketball-men/d1",
    reference: "https://www.espn.com/mens-college-basketball",
    player: "https://www.espn.com/mens-college-basketball/player"
  },
  tx_hs_fb: {
    site: "https://www.texasfootball.com",
    official: "https://www.texasfootball.com",
    reference: "https://www.maxpreps.com",
    player: "https://www.maxpreps.com/tx/football"
  },
  pg_tx: {
    site: "https://www.perfectgame.org",
    official: "https://www.perfectgame.org",
    reference: "https://www.prepbaseballreport.com",
    player: "https://www.perfectgame.org/Players/Default.aspx"
  }
};
const AS_OF = "2025-09-22T00:00:00Z";
const ROOT = path.resolve(process.cwd(), "data");

function seedLeague(league) {
  const season = "2025";
  const dir = path.join(ROOT, league, season);
  fs.mkdirSync(dir, { recursive: true });
  const ref = refs[league];
  const team = {
    id: `${league}-seed-team`,
    leagueKey: league,
    season: Number.parseInt(season, 10),
    name: `${league.toUpperCase()} Seed Team`,
    nickname: "Seed",
    city: "Austin",
    state: "TX",
    siteUrl: ref.site,
    externalRefs: [
      { label: "Official", url: ref.official, sourceType: "official", verified: false },
      { label: "Reference", url: ref.reference, sourceType: "reference", verified: false }
    ]
  };
  const player = {
    id: `${league}-seed-player`,
    teamId: team.id,
    name: "Sample Player",
    position: "Utility",
    classOrLevel: "Seed",
    externalRefs: [{ label: "Reference", url: ref.player, sourceType: "reference", verified: false }]
  };
  const staff = {
    id: `${league}-seed-staff`,
    teamId: team.id,
    role: "Head Coach",
    name: "Sample Coach",
    headCoach: true
  };
  const metadata = {
    league,
    season: Number.parseInt(season, 10),
    asOf: AS_OF,
    sources: ["seed-script"]
  };

  fs.writeFileSync(path.join(dir, "teams.jsonl"), JSON.stringify(team) + "\n");
  fs.writeFileSync(path.join(dir, "players.jsonl"), JSON.stringify(player) + "\n");
  fs.writeFileSync(path.join(dir, "staff.jsonl"), JSON.stringify(staff) + "\n");
  fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2));

  const emptyFiles = [
    "schedules.jsonl",
    "standings.jsonl",
    "stats_game.jsonl",
    "stats_season.jsonl",
    "depthcharts.jsonl"
  ];
  for (const file of emptyFiles) {
    fs.writeFileSync(path.join(dir, file), "");
  }
  console.log(`Seeded ${league} -> ${dir}`);
}

for (const league of leagues) {
  seedLeague(league);
}
