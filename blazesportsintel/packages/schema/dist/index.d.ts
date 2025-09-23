import { z } from "zod";
export declare const LeagueSchema: z.ZodObject<{
    key: z.ZodEnum<["nfl", "mlb", "ncaa_fb", "college_bb", "tx_hs_fb", "pg_tx"]>;
    level: z.ZodString;
    governingBody: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key: "nfl" | "mlb" | "ncaa_fb" | "college_bb" | "tx_hs_fb" | "pg_tx";
    level: string;
    governingBody?: string | undefined;
}, {
    key: "nfl" | "mlb" | "ncaa_fb" | "college_bb" | "tx_hs_fb" | "pg_tx";
    level: string;
    governingBody?: string | undefined;
}>;
export type League = z.infer<typeof LeagueSchema>;
export declare const SeasonSchema: z.ZodObject<{
    leagueKey: z.ZodString;
    year: z.ZodNumber;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pre", "in_progress", "completed"]>>;
}, "strip", z.ZodTypeAny, {
    leagueKey: string;
    year: number;
    status?: "pre" | "in_progress" | "completed" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    leagueKey: string;
    year: number;
    status?: "pre" | "in_progress" | "completed" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type Season = z.infer<typeof SeasonSchema>;
export declare const ExternalRefSchema: z.ZodObject<{
    label: z.ZodString;
    url: z.ZodString;
    sourceType: z.ZodEnum<["official", "reference", "recruiting"]>;
    verified: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    label: string;
    url: string;
    sourceType: "official" | "reference" | "recruiting";
    verified: boolean;
}, {
    label: string;
    url: string;
    sourceType: "official" | "reference" | "recruiting";
    verified?: boolean | undefined;
}>;
export type ExternalRef = z.infer<typeof ExternalRefSchema>;
export declare const TeamSchema: z.ZodObject<{
    id: z.ZodString;
    leagueKey: z.ZodString;
    season: z.ZodNumber;
    name: z.ZodString;
    nickname: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    conference: z.ZodOptional<z.ZodString>;
    division: z.ZodOptional<z.ZodString>;
    district: z.ZodOptional<z.ZodString>;
    siteUrl: z.ZodOptional<z.ZodString>;
    social: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    externalRefs: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        url: z.ZodString;
        sourceType: z.ZodEnum<["official", "reference", "recruiting"]>;
        verified: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified: boolean;
    }, {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    leagueKey: string;
    id: string;
    season: number;
    name: string;
    nickname?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    conference?: string | undefined;
    division?: string | undefined;
    district?: string | undefined;
    siteUrl?: string | undefined;
    social?: Record<string, string> | undefined;
    externalRefs?: {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified: boolean;
    }[] | undefined;
}, {
    leagueKey: string;
    id: string;
    season: number;
    name: string;
    nickname?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    conference?: string | undefined;
    division?: string | undefined;
    district?: string | undefined;
    siteUrl?: string | undefined;
    social?: Record<string, string> | undefined;
    externalRefs?: {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified?: boolean | undefined;
    }[] | undefined;
}>;
export type Team = z.infer<typeof TeamSchema>;
export declare const StaffSchema: z.ZodObject<{
    id: z.ZodString;
    teamId: z.ZodString;
    role: z.ZodString;
    name: z.ZodString;
    headCoach: z.ZodOptional<z.ZodBoolean>;
    hireDate: z.ZodOptional<z.ZodString>;
    externalRefs: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        url: z.ZodString;
        sourceType: z.ZodEnum<["official", "reference", "recruiting"]>;
        verified: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified: boolean;
    }, {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    teamId: string;
    role: string;
    externalRefs?: {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified: boolean;
    }[] | undefined;
    headCoach?: boolean | undefined;
    hireDate?: string | undefined;
}, {
    id: string;
    name: string;
    teamId: string;
    role: string;
    externalRefs?: {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified?: boolean | undefined;
    }[] | undefined;
    headCoach?: boolean | undefined;
    hireDate?: string | undefined;
}>;
export type Staff = z.infer<typeof StaffSchema>;
export declare const PlayerSchema: z.ZodObject<{
    id: z.ZodString;
    teamId: z.ZodString;
    name: z.ZodString;
    position: z.ZodOptional<z.ZodString>;
    classOrLevel: z.ZodOptional<z.ZodString>;
    bats: z.ZodOptional<z.ZodEnum<["L", "R", "S"]>>;
    throws: z.ZodOptional<z.ZodEnum<["L", "R"]>>;
    height: z.ZodOptional<z.ZodString>;
    weight: z.ZodOptional<z.ZodNumber>;
    dob: z.ZodOptional<z.ZodString>;
    hometown: z.ZodOptional<z.ZodString>;
    externalRefs: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        url: z.ZodString;
        sourceType: z.ZodEnum<["official", "reference", "recruiting"]>;
        verified: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified: boolean;
    }, {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    teamId: string;
    externalRefs?: {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified: boolean;
    }[] | undefined;
    position?: string | undefined;
    classOrLevel?: string | undefined;
    bats?: "L" | "R" | "S" | undefined;
    throws?: "L" | "R" | undefined;
    height?: string | undefined;
    weight?: number | undefined;
    dob?: string | undefined;
    hometown?: string | undefined;
}, {
    id: string;
    name: string;
    teamId: string;
    externalRefs?: {
        label: string;
        url: string;
        sourceType: "official" | "reference" | "recruiting";
        verified?: boolean | undefined;
    }[] | undefined;
    position?: string | undefined;
    classOrLevel?: string | undefined;
    bats?: "L" | "R" | "S" | undefined;
    throws?: "L" | "R" | undefined;
    height?: string | undefined;
    weight?: number | undefined;
    dob?: string | undefined;
    hometown?: string | undefined;
}>;
export type Player = z.infer<typeof PlayerSchema>;
export declare const ScheduleGameSchema: z.ZodObject<{
    id: z.ZodString;
    leagueKey: z.ZodString;
    season: z.ZodNumber;
    homeTeamId: z.ZodString;
    awayTeamId: z.ZodString;
    startTime: z.ZodOptional<z.ZodString>;
    venue: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["scheduled", "in_progress", "final", "cancelled"]>>;
    externalIds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    leagueKey: string;
    id: string;
    season: number;
    homeTeamId: string;
    awayTeamId: string;
    status?: "in_progress" | "scheduled" | "final" | "cancelled" | undefined;
    startTime?: string | undefined;
    venue?: string | undefined;
    externalIds?: Record<string, string> | undefined;
}, {
    leagueKey: string;
    id: string;
    season: number;
    homeTeamId: string;
    awayTeamId: string;
    status?: "in_progress" | "scheduled" | "final" | "cancelled" | undefined;
    startTime?: string | undefined;
    venue?: string | undefined;
    externalIds?: Record<string, string> | undefined;
}>;
export type ScheduleGame = z.infer<typeof ScheduleGameSchema>;
export declare const StandingRowSchema: z.ZodObject<{
    teamId: z.ZodString;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    ties: z.ZodOptional<z.ZodNumber>;
    pct: z.ZodOptional<z.ZodNumber>;
    gb: z.ZodOptional<z.ZodNumber>;
    confRecord: z.ZodOptional<z.ZodString>;
    divisionRank: z.ZodOptional<z.ZodNumber>;
    last10: z.ZodOptional<z.ZodString>;
    streak: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    teamId: string;
    wins: number;
    losses: number;
    ties?: number | undefined;
    pct?: number | undefined;
    gb?: number | undefined;
    confRecord?: string | undefined;
    divisionRank?: number | undefined;
    last10?: string | undefined;
    streak?: string | undefined;
}, {
    teamId: string;
    wins: number;
    losses: number;
    ties?: number | undefined;
    pct?: number | undefined;
    gb?: number | undefined;
    confRecord?: string | undefined;
    divisionRank?: number | undefined;
    last10?: string | undefined;
    streak?: string | undefined;
}>;
export type StandingRow = z.infer<typeof StandingRowSchema>;
export declare const StatlineSchema: z.ZodObject<{
    entityType: z.ZodEnum<["player", "team"]>;
    scope: z.ZodEnum<["game", "season"]>;
    stats: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    source: z.ZodString;
    sourceUrl: z.ZodOptional<z.ZodString>;
    asOf: z.ZodString;
}, "strip", z.ZodTypeAny, {
    entityType: "player" | "team";
    scope: "season" | "game";
    stats: Record<string, string | number | boolean>;
    source: string;
    asOf: string;
    sourceUrl?: string | undefined;
}, {
    entityType: "player" | "team";
    scope: "season" | "game";
    stats: Record<string, string | number | boolean>;
    source: string;
    asOf: string;
    sourceUrl?: string | undefined;
}>;
export type Statline = z.infer<typeof StatlineSchema>;
export declare const LinkoutSchema: z.ZodObject<{
    entityId: z.ZodString;
    label: z.ZodString;
    url: z.ZodString;
    sourceType: z.ZodEnum<["official", "reference", "recruiting"]>;
    verified: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    label: string;
    url: string;
    sourceType: "official" | "reference" | "recruiting";
    verified: boolean;
    entityId: string;
}, {
    label: string;
    url: string;
    sourceType: "official" | "reference" | "recruiting";
    verified: boolean;
    entityId: string;
}>;
export type Linkout = z.infer<typeof LinkoutSchema>;
export declare const MetadataSchema: z.ZodObject<{
    league: z.ZodString;
    season: z.ZodNumber;
    asOf: z.ZodString;
    sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    season: number;
    asOf: string;
    league: string;
    sources?: string[] | undefined;
}, {
    season: number;
    asOf: string;
    league: string;
    sources?: string[] | undefined;
}>;
export type Metadata = z.infer<typeof MetadataSchema>;
//# sourceMappingURL=index.d.ts.map