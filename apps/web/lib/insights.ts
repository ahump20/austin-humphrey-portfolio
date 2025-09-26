import type { LeagueSnapshot, TeamSnapshot } from "./data";

type CountEntry = { label: string; count: number };

type SourceEntry = { sourceType: string; count: number };

type RosterEntry = { teamId: string; teamName: string; rosterSize: number };

type StaffEntry = { teamId: string; teamName: string; staffCount: number };

function formatCountMap(entries: Map<string, number>): CountEntry[] {
  return Array.from(entries.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.label.localeCompare(b.label);
      }
      return b.count - a.count;
    });
}

function buildSourceMix<T extends { sourceType?: string | null }>(items: T[]): SourceEntry[] {
  const mix = new Map<string, number>();
  for (const item of items) {
    const key = item.sourceType?.trim() ?? "other";
    mix.set(key, (mix.get(key) ?? 0) + 1);
  }
  return formatCountMap(mix).map(({ label, count }) => ({ sourceType: label, count }));
}

function calculateRate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

export type LeagueInsights = {
  summary: {
    teamCount: number;
    playerCount: number;
    staffCount: number;
    averageRosterSize: number;
    statesCovered: number;
    verifiedLinkRate: number;
    verifiedLinkCount: number;
    totalLinkCount: number;
  };
  topMarkets: { state: string; teamCount: number }[];
  rosterDepthLeaders: RosterEntry[];
  staffContinuityLeaders: StaffEntry[];
  sourceMix: SourceEntry[];
  talentBreakdown: CountEntry[];
};

export function deriveLeagueInsights(snapshot: LeagueSnapshot): LeagueInsights {
  const teamCount = snapshot.teams.length;
  const playerCount = snapshot.players.length;
  const staffCount = snapshot.staff.length;

  const states = new Map<string, number>();
  for (const team of snapshot.teams) {
    if (team.state) {
      const key = team.state.trim();
      if (key.length > 0) {
        states.set(key, (states.get(key) ?? 0) + 1);
      }
    }
  }

  const rosterCounts = new Map<string, number>();
  const staffCounts = new Map<string, number>();
  const talentBreakdownMap = new Map<string, number>();
  for (const player of snapshot.players) {
    rosterCounts.set(player.teamId, (rosterCounts.get(player.teamId) ?? 0) + 1);
    const key = player.classOrLevel?.trim() ?? "Unspecified";
    talentBreakdownMap.set(key, (talentBreakdownMap.get(key) ?? 0) + 1);
  }

  for (const staffMember of snapshot.staff) {
    staffCounts.set(staffMember.teamId, (staffCounts.get(staffMember.teamId) ?? 0) + 1);
  }

  const rosterDepthLeaders: RosterEntry[] = snapshot.teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      rosterSize: rosterCounts.get(team.id) ?? 0
    }))
    .filter((entry) => entry.rosterSize > 0)
    .sort((a, b) => {
      if (b.rosterSize === a.rosterSize) {
        return a.teamName.localeCompare(b.teamName);
      }
      return b.rosterSize - a.rosterSize;
    })
    .slice(0, 3);

  const staffContinuityLeaders: StaffEntry[] = snapshot.teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      staffCount: staffCounts.get(team.id) ?? 0
    }))
    .filter((entry) => entry.staffCount > 0)
    .sort((a, b) => {
      if (b.staffCount === a.staffCount) {
        return a.teamName.localeCompare(b.teamName);
      }
      return b.staffCount - a.staffCount;
    })
    .slice(0, 3);

  const teamRefs = snapshot.teams.flatMap((team) => team.externalRefs ?? []);
  const playerRefs = snapshot.players.flatMap((player) => player.externalRefs ?? []);
  const allRefs = [...teamRefs, ...playerRefs];
  const verifiedLinkCount = allRefs.filter((ref) => ref.verified === true).length;
  const totalLinkCount = allRefs.length;
  const sourceMix = buildSourceMix(allRefs);

  return {
    summary: {
      teamCount,
      playerCount,
      staffCount,
      averageRosterSize: calculateRate(playerCount, teamCount),
      statesCovered: states.size,
      verifiedLinkRate: calculateRate(verifiedLinkCount, totalLinkCount),
      verifiedLinkCount,
      totalLinkCount
    },
    topMarkets: formatCountMap(states)
      .map(({ label, count }) => ({ state: label, teamCount: count }))
      .slice(0, 5),
    rosterDepthLeaders,
    staffContinuityLeaders,
    sourceMix,
    talentBreakdown: formatCountMap(talentBreakdownMap)
  };
}

export type TeamInsights = {
  rosterSize: number;
  staffSize: number;
  verifiedLinkCount: number;
  totalLinkCount: number;
  verificationRate: number;
  sourceMix: SourceEntry[];
  classBreakdown: CountEntry[];
};

export function deriveTeamInsights(teamData: TeamSnapshot): TeamInsights {
  const rosterSize = teamData.roster.length;
  const staffSize = teamData.staff.length;

  const externalRefs = teamData.team.externalRefs ?? [];
  const verifiedLinkCount = externalRefs.filter((ref) => ref.verified === true).length;
  const totalLinkCount = externalRefs.length;
  const sourceMix = buildSourceMix(externalRefs);

  const classCounts = new Map<string, number>();
  for (const player of teamData.roster) {
    const key = player.classOrLevel?.trim() ?? "Unspecified";
    classCounts.set(key, (classCounts.get(key) ?? 0) + 1);
  }

  return {
    rosterSize,
    staffSize,
    verifiedLinkCount,
    totalLinkCount,
    verificationRate: calculateRate(verifiedLinkCount, totalLinkCount),
    sourceMix,
    classBreakdown: formatCountMap(classCounts)
  };
}
