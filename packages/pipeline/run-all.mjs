#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sources = ["mlb", "nfl", "ncaa_fb", "college_bb", "tx_hs_fb", "pg_tx"];
const baseDir = path.resolve(process.cwd(), "packages", "sources");

for (const source of sources) {
  const modulePath = resolveModulePath(source);
  console.log(`[pipeline] Running adapter: ${source}`);
  try {
    const mod = await import(modulePath);
    if (typeof mod.run === "function") {
      await mod.run();
    } else {
      console.warn(`[pipeline] Adapter ${source} missing run()`);
    }
  } catch (error) {
    console.error(`[pipeline] Adapter ${source} failed`, error);
  }
}

function resolveModulePath(source) {
  const distPath = path.join(baseDir, source, "dist", "index.js");
  if (fs.existsSync(distPath)) {
    return pathToFileURL(distPath).href;
  }
  const jsPath = path.join(baseDir, source, "index.js");
  if (fs.existsSync(jsPath)) {
    return pathToFileURL(jsPath).href;
  }
  const tsPath = path.join(baseDir, source, "index.ts");
  if (fs.existsSync(tsPath)) {
    return pathToFileURL(tsPath).href;
  }
  throw new Error(`Adapter module not found for ${source}`);
}
