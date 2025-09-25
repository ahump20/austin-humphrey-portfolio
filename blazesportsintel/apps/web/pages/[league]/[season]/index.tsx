import Link from "next/link";
import Head from "next/head";
import { listLeagues, listSeasons, loadLeague } from "lib/data";
import { deriveLeagueInsights, type LeagueInsights } from "lib/insights";

type LeagueSnapshot = ReturnType<typeof loadLeague>;
type Team = LeagueSnapshot["teams"][number];

type Props = {
  league: string;
  season: string;
  teams: Team[];
  asOf: string;
  insights: LeagueInsights;
};

export default function LeagueSeasonPage({ league, season, teams, asOf, insights }: Props) {
  const numberFormatter = new Intl.NumberFormat("en-US");
  const percentFormatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0
  });
  const oneDecimalFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  return (
    <>
      <Head>
        <title>{`${league.toUpperCase()} ${season} Teams`}</title>
      </Head>
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <header>
          <Link href="/">← Back</Link>
          <h1>{`${league.toUpperCase()} ${season}`}</h1>
          <p>Snapshot as of {new Date(asOf).toLocaleString()}</p>
        </header>
        <section>
          <h2>League Intelligence</h2>
          <dl>
            <dt>Teams tracked</dt>
            <dd>{numberFormatter.format(insights.summary.teamCount)}</dd>
            <dt>Players covered</dt>
            <dd>{numberFormatter.format(insights.summary.playerCount)}</dd>
            <dt>Staff mapped</dt>
            <dd>{numberFormatter.format(insights.summary.staffCount)}</dd>
            <dt>Average roster size</dt>
            <dd>{oneDecimalFormatter.format(insights.summary.averageRosterSize)}</dd>
            <dt>States covered</dt>
            <dd>{numberFormatter.format(insights.summary.statesCovered)}</dd>
            <dt>Verified link coverage</dt>
            <dd>
              {insights.summary.totalLinkCount > 0
                ? `${percentFormatter.format(insights.summary.verifiedLinkRate)} (${numberFormatter.format(insights.summary.verifiedLinkCount)} of ${numberFormatter.format(insights.summary.totalLinkCount)} links)`
                : "No external link coverage recorded."}
            </dd>
          </dl>
          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem" }}>Top Markets</h3>
              {insights.topMarkets.length === 0 ? (
                <p>No market insights captured yet.</p>
              ) : (
                <ul>
                  {insights.topMarkets.map((market) => (
                    <li key={market.state}>{`${market.state}: ${numberFormatter.format(market.teamCount)} teams`}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: "1rem" }}>Roster Depth Leaders</h3>
              {insights.rosterDepthLeaders.length === 0 ? (
                <p>No roster depth insights yet.</p>
              ) : (
                <ul>
                  {insights.rosterDepthLeaders.map((entry) => (
                    <li key={entry.teamId}>
                      <Link href={`/${league}/${season}/team/${entry.teamId}`}>
                        {entry.teamName}
                      </Link>
                      {`: ${numberFormatter.format(entry.rosterSize)} players`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: "1rem" }}>Staff Continuity Leaders</h3>
              {insights.staffContinuityLeaders.length === 0 ? (
                <p>No staff insights yet.</p>
              ) : (
                <ul>
                  {insights.staffContinuityLeaders.map((entry) => (
                    <li key={`${entry.teamId}-staff`}>
                      <Link href={`/${league}/${season}/team/${entry.teamId}`}>
                        {entry.teamName}
                      </Link>
                      {`: ${numberFormatter.format(entry.staffCount)} staff`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: "1rem" }}>Talent Composition</h3>
              {insights.talentBreakdown.length === 0 ? (
                <p>No talent composition signals yet.</p>
              ) : (
                <ul>
                  {insights.talentBreakdown.map((entry) => (
                    <li key={`${entry.label}-talent`}>{`${entry.label}: ${numberFormatter.format(entry.count)} players`}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: "1rem" }}>Source Mix</h3>
              {insights.sourceMix.length === 0 ? (
                <p>No external sources linked.</p>
              ) : (
                <ul>
                  {insights.sourceMix.map((source) => (
                    <li key={source.sourceType}>{`${source.sourceType}: ${numberFormatter.format(source.count)} links`}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
        <section>
          <h2>Teams</h2>
          <ul>
            {teams.map((team) => (
              <li key={team.id}>
                <Link href={`/${league}/${season}/team/${team.id}`}>{team.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

export function getStaticPaths() {
  const paths = listLeagues().flatMap((league) =>
    listSeasons(league).map((season) => ({ params: { league, season } }))
  );
  return { paths, fallback: false };
}

export function getStaticProps({ params }: { params: { league: string; season: string } }): { props: Props } {
  const { league, season } = params;
  const snapshot = loadLeague(league, season);
  return {
    props: {
      league,
      season,
      teams: snapshot.teams,
      asOf: snapshot.metadata.asOf,
      insights: deriveLeagueInsights(snapshot)
    }
  };
}
