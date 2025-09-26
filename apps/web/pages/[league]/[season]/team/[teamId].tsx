import Link from "next/link";
import Head from "next/head";
import { listLeagues, listSeasons, loadLeague, loadTeam } from "lib/data";
import { deriveTeamInsights, type TeamInsights } from "lib/insights";

type TeamSnapshot = NonNullable<ReturnType<typeof loadTeam>>;

type Props = {
  league: string;
  season: string;
  teamData: TeamSnapshot;
  teamInsights: TeamInsights;
};

export default function TeamPage({ league, season, teamData, teamInsights }: Props) {
  const { team, roster, staff, metadata } = teamData;
  const numberFormatter = new Intl.NumberFormat("en-US");
  const percentFormatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0
  });
  return (
    <>
      <Head>
        <title>{`${team.name} | ${league.toUpperCase()} ${season}`}</title>
      </Head>
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <header>
          <Link href={`/${league}/${season}`}>← Back to teams</Link>
          <h1>{team.name}</h1>
          <p>{team.city ? `${team.city}, ${team.state ?? ""}` : team.state}</p>
          <p>Snapshot as of {new Date(metadata.asOf).toLocaleString()}</p>
        </header>
        <section>
          <h2>Intelligence Snapshot</h2>
          <dl>
            <dt>Roster size</dt>
            <dd>{numberFormatter.format(teamInsights.rosterSize)} players</dd>
            <dt>Staff size</dt>
            <dd>{numberFormatter.format(teamInsights.staffSize)} staff</dd>
            <dt>Verified link coverage</dt>
            <dd>
              {teamInsights.totalLinkCount > 0
                ? `${percentFormatter.format(teamInsights.verificationRate)} (${numberFormatter.format(teamInsights.verifiedLinkCount)} of ${numberFormatter.format(teamInsights.totalLinkCount)} links)`
                : "No verified link coverage yet."}
            </dd>
          </dl>
          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem" }}>Source Mix</h3>
              {teamInsights.sourceMix.length === 0 ? (
                <p>No external sources linked.</p>
              ) : (
                <ul>
                  {teamInsights.sourceMix.map((entry) => (
                    <li key={entry.sourceType}>{`${entry.sourceType}: ${numberFormatter.format(entry.count)} links`}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: "1rem" }}>Talent Composition</h3>
              {teamInsights.classBreakdown.length === 0 ? (
                <p>No roster classification data yet.</p>
              ) : (
                <ul>
                  {teamInsights.classBreakdown.map((entry) => (
                    <li key={entry.label}>{`${entry.label}: ${numberFormatter.format(entry.count)} players`}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
        <section>
          <h2>External Links</h2>
          <ul>
            {(team.externalRefs ?? []).map((ref) => (
              <li key={ref.url}>
                <a href={ref.url} target="_blank" rel="noreferrer">
                  {ref.label} ({ref.sourceType})
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Roster</h2>
          <ul>
            {roster.map((player) => (
              <li key={player.id}>
                <Link href={`/player/${player.id}`}>{player.name}</Link>
                {player.position ? ` — ${player.position}` : null}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Staff</h2>
          <ul>
            {staff.map((member) => (
              <li key={member.id}>
                {member.name} — {member.role}
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
    listSeasons(league).flatMap((season) => {
      const teams = loadLeague(league, season).teams;
      return teams.map((team) => ({ params: { league, season, teamId: team.id } }));
    })
  );
  return { paths, fallback: false };
}

export function getStaticProps({
  params
}: {
  params: { league: string; season: string; teamId: string };
}): { props: Props } {
  const { league, season, teamId } = params;
  const teamData = loadTeam(league, season, teamId);
  if (!teamData) {
    throw new Error(`Team not found: ${league}/${season}/${teamId}`);
  }
  return {
    props: {
      league,
      season,
      teamData,
      teamInsights: deriveTeamInsights(teamData)
    }
  };
}
