import Link from "next/link";
import Head from "next/head";
import { listLeagues, listSeasons, loadLeague } from "lib/data";

type LeagueSnapshot = ReturnType<typeof loadLeague>;
type Team = LeagueSnapshot["teams"][number];

type Props = {
  league: string;
  season: string;
  teams: Team[];
  asOf: string;
};

export default function LeagueSeasonPage({ league, season, teams, asOf }: Props) {
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
      asOf: snapshot.metadata.asOf
    }
  };
}
