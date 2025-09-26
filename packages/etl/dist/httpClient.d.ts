import type { RequestInit } from "undici";
interface FetchWithRespectOptions extends RequestInit {
    cacheTtlMs?: number;
    forceRefresh?: boolean;
    respectRobots?: boolean;
}
export declare function fetchWithRespect(url: string, options?: FetchWithRespectOptions): Promise<string>;
export declare function clearCache(): Promise<void>;
export {};
//# sourceMappingURL=httpClient.d.ts.map