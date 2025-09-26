import { z } from "zod";
export const LeagueSchema = z.object({
    key: z.enum(["nfl", "mlb", "ncaa_fb", "college_bb", "tx_hs_fb", "pg_tx"]),
    level: z.string(),
    governingBody: z.string().optional()
});
export const SeasonSchema = z.object({
    leagueKey: z.string(),
    year: z.number(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(["pre", "in_progress", "completed"]).optional()
});
export const ExternalRefSchema = z.object({
    label: z.string(),
    url: z.string().url(),
    sourceType: z.enum(["official", "reference", "recruiting"]),
    verified: z.boolean().default(false)
});
export const TeamSchema = z.object({
    id: z.string(),
    leagueKey: z.string(),
    season: z.number(),
    name: z.string(),
    nickname: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    conference: z.string().optional(),
    division: z.string().optional(),
    district: z.string().optional(),
    siteUrl: z.string().url().optional(),
    social: z.record(z.string()).optional(),
    externalRefs: z.array(ExternalRefSchema).optional()
});
export const StaffSchema = z.object({
    id: z.string(),
    teamId: z.string(),
    role: z.string(),
    name: z.string(),
    headCoach: z.boolean().optional(),
    hireDate: z.string().optional(),
    externalRefs: z.array(ExternalRefSchema).optional()
});
export const PlayerSchema = z.object({
    id: z.string(),
    teamId: z.string(),
    name: z.string(),
    position: z.string().optional(),
    classOrLevel: z.string().optional(),
    bats: z.enum(["L", "R", "S"]).optional(),
    throws: z.enum(["L", "R"]).optional(),
    height: z.string().optional(),
    weight: z.number().optional(),
    dob: z.string().optional(),
    hometown: z.string().optional(),
    externalRefs: z.array(ExternalRefSchema).optional()
});
export const ScheduleGameSchema = z.object({
    id: z.string(),
    leagueKey: z.string(),
    season: z.number(),
    homeTeamId: z.string(),
    awayTeamId: z.string(),
    startTime: z.string().optional(),
    venue: z.string().optional(),
    status: z.enum(["scheduled", "in_progress", "final", "cancelled"]).optional(),
    externalIds: z.record(z.string()).optional()
});
export const StandingRowSchema = z.object({
    teamId: z.string(),
    wins: z.number().int(),
    losses: z.number().int(),
    ties: z.number().int().optional(),
    pct: z.number().optional(),
    gb: z.number().optional(),
    confRecord: z.string().optional(),
    divisionRank: z.number().optional(),
    last10: z.string().optional(),
    streak: z.string().optional()
});
export const StatlineSchema = z.object({
    entityType: z.enum(["player", "team"]),
    scope: z.enum(["game", "season"]),
    stats: z.record(z.union([z.string(), z.number(), z.boolean()])),
    source: z.string(),
    sourceUrl: z.string().url().optional(),
    asOf: z.string()
});
export const LinkoutSchema = z.object({
    entityId: z.string(),
    label: z.string(),
    url: z.string().url(),
    sourceType: z.enum(["official", "reference", "recruiting"]),
    verified: z.boolean()
});
export const MetadataSchema = z.object({
    league: z.string(),
    season: z.number(),
    asOf: z.string(),
    sources: z.array(z.string()).optional()
});
//# sourceMappingURL=index.js.map