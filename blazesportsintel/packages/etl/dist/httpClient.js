import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fetch, Headers } from "undici";
const USER_AGENT = process.env.BLAZE_USER_AGENT ?? "BlazeSportsIntelBot/1.0";
const CACHE_DIR = path.resolve(process.cwd(), ".cache");
const DEFAULT_THROTTLE_MS = Number.parseInt(process.env.ETL_THROTTLE_MS ?? "1000", 10);
const DEFAULT_CACHE_TTL = Number.parseInt(process.env.ETL_CACHE_TTL_MS ?? String(24 * 60 * 60 * 1000), 10);
const hostLastCall = new Map();
const robotsCache = new Map();
function cacheKey(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
async function ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
}
async function readCache(filePath, ttlMs) {
    try {
        const stat = await fsp.stat(filePath);
        if (Date.now() - stat.mtimeMs <= ttlMs) {
            return fsp.readFile(filePath, "utf8");
        }
    }
    catch (error) {
        if (error.code !== "ENOENT") {
            console.warn(`[httpClient] cache read error for ${filePath}:`, error);
        }
    }
    return null;
}
async function writeCache(filePath, body) {
    try {
        await ensureDir(path.dirname(filePath));
        await fsp.writeFile(filePath, body, "utf8");
    }
    catch (error) {
        console.warn(`[httpClient] cache write error for ${filePath}:`, error);
    }
}
async function fetchRobots(url) {
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    if (robotsCache.has(robotsUrl)) {
        return robotsCache.get(robotsUrl) ?? "";
    }
    const robotsPath = path.join(CACHE_DIR, "robots", cacheKey(robotsUrl));
    const cached = await readCache(robotsPath, DEFAULT_CACHE_TTL);
    if (cached) {
        robotsCache.set(robotsUrl, cached);
        return cached;
    }
    try {
        const response = await fetch(robotsUrl, {
            headers: {
                "User-Agent": USER_AGENT
            }
        });
        if (response.ok) {
            const text = await response.text();
            robotsCache.set(robotsUrl, text);
            await writeCache(robotsPath, text);
            return text;
        }
    }
    catch (error) {
        console.warn(`[httpClient] robots fetch error for ${robotsUrl}:`, error);
    }
    robotsCache.set(robotsUrl, "");
    return "";
}
function isPathAllowed(robotsText, url) {
    if (!robotsText)
        return true;
    const lines = robotsText.split(/\r?\n/);
    let applies = false;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#"))
            continue;
        const [directive, valueRaw] = line.split(":", 2);
        if (!directive || valueRaw === undefined)
            continue;
        const value = valueRaw.trim();
        if (/^user-agent$/i.test(directive)) {
            applies = value === "*" || value.toLowerCase() === USER_AGENT.toLowerCase();
        }
        else if (applies && /^disallow$/i.test(directive)) {
            if (!value)
                continue;
            if (url.pathname.startsWith(value)) {
                return false;
            }
        }
    }
    return true;
}
async function throttle(url) {
    const host = url.host;
    const last = hostLastCall.get(host) ?? 0;
    const now = Date.now();
    const delta = now - last;
    if (delta < DEFAULT_THROTTLE_MS) {
        await delay(DEFAULT_THROTTLE_MS - delta);
    }
    hostLastCall.set(host, Date.now());
}
export async function fetchWithRespect(url, options = {}) {
    const targetUrl = new URL(url);
    const method = (options.method ?? "GET").toUpperCase();
    const cacheTtl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL;
    const respectRobots = options.respectRobots ?? true;
    const cacheFile = path.join(CACHE_DIR, "responses", cacheKey(`${method}:${url}`));
    if (method === "GET" && !options.forceRefresh) {
        const cached = await readCache(cacheFile, cacheTtl);
        if (cached !== null) {
            return cached;
        }
    }
    if (respectRobots) {
        const robotsText = await fetchRobots(targetUrl);
        if (!isPathAllowed(robotsText, targetUrl)) {
            throw new Error(`Robots.txt disallows access to ${targetUrl.href}`);
        }
    }
    await throttle(targetUrl);
    const headers = new Headers(options.headers ?? {});
    if (!headers.has("User-Agent")) {
        headers.set("User-Agent", USER_AGENT);
    }
    const requestOptions = {
        ...options,
        headers,
        method
    };
    for (;;) {
        const response = await fetch(targetUrl, requestOptions);
        if (response.status === 429 || response.status === 503) {
            const retryAfter = response.headers.get("retry-after");
            const retryDelay = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 2000;
            await delay(Number.isNaN(retryDelay) ? 2000 : retryDelay);
            continue;
        }
        const bodyText = await response.text();
        if (!response.ok) {
            throw new Error(`Request failed for ${targetUrl.href} with status ${response.status}`);
        }
        if (method === "GET") {
            await writeCache(cacheFile, bodyText);
        }
        return bodyText;
    }
}
export async function clearCache() {
    if (!fs.existsSync(CACHE_DIR))
        return;
    await fsp.rm(CACHE_DIR, { recursive: true, force: true });
}
//# sourceMappingURL=httpClient.js.map