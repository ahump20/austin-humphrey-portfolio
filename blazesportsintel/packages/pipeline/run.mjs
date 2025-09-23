#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [, , league] = process.argv;
if (!league) {
  console.error("Usage: node run.mjs <league>");
  process.exit(1);
}

const modulePath = resolveModulePath(league);
const mod = await import(modulePath);
if (typeof mod.run !== "function") {
  console.error(`Adapter ${league} missing run()`);
  process.exit(1);
}
await mod.run();

function resolveModulePath(source) {
  const baseDir = path.resolve(process.cwd(), "packages", "sources");
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
