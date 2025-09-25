import Link from "next/link";
import Head from "next/head";
import { listLeagues, listSeasons, loadLeague } from "lib/data";
import { deriveLeagueInsights, type LeagueInsights } from "lib/insights";

type LeagueSummary = {
  key: string;
  seasons: {
    season: string;
    asOf: string;
    teamCount: number;
  }[];
  latestSeason?: string;
  latestInsights?: LeagueInsights;
};

type Props = {
  leagues: LeagueSummary[];
};

export default function Home({ leagues }: Props) {
  const numberFormatter = new Intl.NumberFormat("en-US");
  const percentFormatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0
  });
  return (
    <>
      <Head>
        <title>Blaze Sports Intelligence</title>
      </Head>
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <header>
          <h1>Blaze Sports Intelligence</h1>
          <p>Data snapshots spanning baseball, football, basketball, and recruiting.</p>
        </header>
        <section>
          <h2>Leagues</h2>
          <ul>
            {leagues.map((league) => (
              <li key={league.key}>
                <strong>{league.key}</strong>
                <ul>
                  {league.seasons.map((season) => (
                    <li key={season.season}>
                      <Link href={`/${league.key}/${season.season}`}>{`Season ${season.season}`}</Link>
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                        {`As of ${new Date(season.asOf).toLocaleString()}`} · {season.teamCount} teams
                      </span>
                    </li>
                  ))}
                </ul>
                {league.latestInsights ? (
                  <aside style={{ marginTop: "0.75rem" }}>
                    <h3 style={{ fontSize: "1rem" }}>Latest Intelligence</h3>
                    <p style={{ marginBottom: "0.5rem" }}>
                      {league.latestSeason
                        ? `${league.latestSeason} snapshot: `
                        : "Most recent snapshot: "}
                      {numberFormatter.format(league.latestInsights.summary.playerCount)} players and {numberFormatter.format(league.latestInsights.summary.staffCount)}
                      {" "}
                      staff across {numberFormatter.format(league.latestInsights.summary.statesCovered)} states.
                      {league.latestInsights.summary.totalLinkCount > 0
                        ? ` Verified coverage on ${percentFormatter.format(league.latestInsights.summary.verifiedLinkRate)} of ${numberFormatter.format(league.latestInsights.summary.totalLinkCount)} tracked links.`
                        : " No external link coverage recorded yet."}
                    </p>
                    <ul>
                      {league.latestInsights.topMarkets.slice(0, 2).map((market) => (
                        <li key={`${league.key}-${market.state}`}>{`${market.state}: ${numberFormatter.format(market.teamCount)} teams`}</li>
                      ))}
                      {league.latestInsights.rosterDepthLeaders.slice(0, 1).map((entry) => (
                        <li key={entry.teamId}>{`Deepest roster: ${entry.teamName} (${numberFormatter.format(entry.rosterSize)} players)`}</li>
                      ))}
                      {league.latestInsights.talentBreakdown[0] ? (
                        <li key={`${league.key}-talent-top`}>{`Top level: ${league.latestInsights.talentBreakdown[0].label} (${numberFormatter.format(league.latestInsights.talentBreakdown[0].count)} players)`}</li>
                      ) : null}
                    </ul>
                  </aside>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

export function getStaticProps(): { props: Props } {
  const leagues = listLeagues().map<LeagueSummary>((leagueKey) => {
    const seasonEntries = listSeasons(leagueKey)
      .map((season) => {
        const snapshot = loadLeague(leagueKey, season);
        return {
          season,
          asOf: snapshot.metadata.asOf,
          teamCount: snapshot.teams.length,
          snapshot
        };
      })
      .sort((a, b) => Number.parseInt(b.season, 10) - Number.parseInt(a.season, 10));

    const latest = seasonEntries[0];
    const seasons = seasonEntries.map(({ snapshot, ...rest }) => rest);
    const latestInsights = latest ? deriveLeagueInsights(latest.snapshot) : undefined;

    return {
      key: leagueKey,
      seasons,
      latestSeason: latest?.season,
      latestInsights
    };
  });
  return { props: { leagues } };
}
