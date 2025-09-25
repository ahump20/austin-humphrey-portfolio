import test from "node:test";
import assert from "node:assert/strict";
import worker from "../dist/index.js";

const origin = "https://example.com";

async function readJson(response) {
  const text = await response.text();
  return JSON.parse(text);
}

test("returns 404 for unknown resource", async () => {
  const res = await worker.fetch(new Request(`${origin}/v1/unknown/2025/teams`));
  assert.equal(res.status, 404);
});

test("lists teams for a valid league and season", async () => {
  const res = await worker.fetch(new Request(`${origin}/v1/mlb/2025/teams`));
  assert.equal(res.status, 200);
  const payload = await readJson(res);
  assert.ok(Array.isArray(payload.data));
  assert.ok(payload.data.length > 0);
  assert.equal(payload.meta.league, "mlb");
});

test("filters roster by teamId when provided", async () => {
  const res = await worker.fetch(
    new Request(`${origin}/v1/mlb/2025/roster?teamId=mlb-houston-astros`)
  );
  assert.equal(res.status, 200);
  const payload = await readJson(res);
  assert.ok(payload.data.every((player) => player.teamId === "mlb-houston-astros"));
});

test("returns a single player when id is provided", async () => {
  const res = await worker.fetch(new Request(`${origin}/v1/mlb/2025/players/mlb-houston-astros-player-1`));
  assert.equal(res.status, 200);
  const payload = await readJson(res);
  assert.equal(payload.data.id, "mlb-houston-astros-player-1");
});
