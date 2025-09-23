#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  TeamSchema,
  PlayerSchema,
  StaffSchema,
  MetadataSchema
} from "../packages/schema/dist/index.js";

const ROOT = path.resolve(process.cwd(), "data");
const errors = [];

function validateJsonl(filePath, schema) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  lines.forEach((line, index) => {
    try {
      schema.parse(JSON.parse(line));
    } catch (error) {
      errors.push({ file: filePath, line: index + 1, message: error.message });
    }
  });
}

if (fs.existsSync(ROOT)) {
  for (const league of fs.readdirSync(ROOT)) {
    const leagueDir = path.join(ROOT, league);
    if (!fs.statSync(leagueDir).isDirectory()) continue;
    for (const season of fs.readdirSync(leagueDir)) {
      const seasonDir = path.join(leagueDir, season);
      if (!fs.statSync(seasonDir).isDirectory()) continue;
      validateJsonl(path.join(seasonDir, "teams.jsonl"), TeamSchema);
      validateJsonl(path.join(seasonDir, "players.jsonl"), PlayerSchema);
      validateJsonl(path.join(seasonDir, "staff.jsonl"), StaffSchema);
      if (fs.existsSync(path.join(seasonDir, "metadata.json"))) {
        try {
          MetadataSchema.parse(JSON.parse(fs.readFileSync(path.join(seasonDir, "metadata.json"), "utf8")));
        } catch (error) {
          errors.push({ file: path.join(seasonDir, "metadata.json"), message: error.message });
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Validation failed:", JSON.stringify(errors, null, 2));
  process.exit(1);
}

console.log("All data validated.");
