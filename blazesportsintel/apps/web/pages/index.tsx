import Link from "next/link";
import Head from "next/head";
import { listLeagues, listSeasons, loadLeague } from "lib/data";

type LeagueSummary = {
  key: string;
  seasons: {
    season: string;
    asOf: string;
    teamCount: number;
  }[];
};

type Props = {
  leagues: LeagueSummary[];
};

export default function Home({ leagues }: Props) {
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
    const seasons = listSeasons(leagueKey)
      .map((season) => {
        const snapshot = loadLeague(leagueKey, season);
        return {
          season,
          asOf: snapshot.metadata.asOf,
          teamCount: snapshot.teams.length
        };
      })
      .sort((a, b) => Number.parseInt(b.season, 10) - Number.parseInt(a.season, 10));
    return { key: leagueKey, seasons };
  });
  return { props: { leagues } };
}
