import Link from "next/link";
import Head from "next/head";
import { listLeagues, listSeasons, loadLeague, loadPlayer } from "lib/data";

type PlayerSnapshot = NonNullable<ReturnType<typeof loadPlayer>>;

type Props = {
  league: string;
  season: string;
  teamId: string;
  data: PlayerSnapshot;
};

export default function PlayerPage({ league, season, teamId, data }: Props) {
  const { player, metadata } = data;
  return (
    <>
      <Head>
        <title>{`${player.name} | ${league.toUpperCase()} ${season}`}</title>
      </Head>
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <header>
          <Link href={`/${league}/${season}/team/${teamId}`}>← Back to team</Link>
          <h1>{player.name}</h1>
          <p>Snapshot as of {new Date(metadata.asOf).toLocaleString()}</p>
        </header>
        <dl>
          {player.position ? (
            <>
              <dt>Position</dt>
              <dd>{player.position}</dd>
            </>
          ) : null}
          {player.classOrLevel ? (
            <>
              <dt>Level</dt>
              <dd>{player.classOrLevel}</dd>
            </>
          ) : null}
        </dl>
        <section>
          <h2>External Links</h2>
          <ul>
            {(player.externalRefs ?? []).map((ref) => (
              <li key={ref.url}>
                <a href={ref.url} target="_blank" rel="noreferrer">
                  {ref.label} ({ref.sourceType})
                </a>
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
    listSeasons(league).flatMap((season) =>
      loadLeague(league, season).players.map((player) => ({
        params: { playerId: player.id }
      }))
    )
  );
  return { paths, fallback: false };
}

export function getStaticProps({ params }: { params: { playerId: string } }): { props: Props } {
  const { playerId } = params;
  for (const league of listLeagues()) {
    for (const season of listSeasons(league)) {
      const snapshot = loadLeague(league, season);
      const player = snapshot.players.find((entry) => entry.id === playerId);
      if (player) {
        const data = loadPlayer(league, season, playerId);
        if (!data) break;
        return {
          props: {
            league,
            season,
            teamId: player.teamId,
            data
          }
        };
      }
    }
  }
  throw new Error(`Player not found: ${playerId}`);
}
