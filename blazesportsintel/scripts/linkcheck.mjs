#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fetch } from "undici";

const ROOT = path.resolve(process.cwd(), "data");
const failures = [];
const userAgent = process.env.BLAZE_USER_AGENT ?? "BlazeSportsIntelBot/1.0";

async function checkUrl(url, entityId) {
  if (url.includes("perfectgame.org") && !process.env.PERFECTGAME_COOKIE) {
    console.log(`Skipping Perfect Game link (cookie missing): ${url}`);
    return;
  }
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": userAgent }
    });
    if (response.status >= 400 || (response.status >= 300 && response.status < 400)) {
      failures.push({ url, status: response.status, entityId });
    }
  } catch (error) {
    console.warn(`Linkcheck warning for ${url}: ${error.message}`);
  }
}

async function main() {
  const tasks = [];
  if (fs.existsSync(ROOT)) {
    for (const league of fs.readdirSync(ROOT)) {
      const leagueDir = path.join(ROOT, league);
      if (!fs.statSync(leagueDir).isDirectory()) continue;
      for (const season of fs.readdirSync(leagueDir)) {
        const seasonDir = path.join(leagueDir, season);
        if (!fs.statSync(seasonDir).isDirectory()) continue;
        for (const file of ["teams.jsonl", "players.jsonl"]) {
          const filePath = path.join(seasonDir, file);
          if (!fs.existsSync(filePath)) continue;
          const lines = fs
            .readFileSync(filePath, "utf8")
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0);
          for (const line of lines) {
            const data = JSON.parse(line);
            for (const ref of data.externalRefs ?? []) {
              tasks.push(checkUrl(ref.url, data.id ?? data.name ?? "unknown"));
            }
          }
        }
      }
    }
  }

  await Promise.all(tasks);

  if (failures.length > 0) {
    console.error("Linkcheck failures:", JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log("Linkcheck passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
