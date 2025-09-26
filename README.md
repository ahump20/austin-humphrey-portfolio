# Blaze Sports Intelligence Monorepo

Bootstrap implementation for Blaze Intelligence data, API, and web surfaces.

## Repo layout

```
apps/
  api/         # Cloudflare Worker (data API)
  web/         # Next.js static site
packages/
  schema/      # Shared Zod schemas
  etl/         # HTTP client utilities
  pipeline/    # Adapter runner scripts
  sources/     # League adapters (Baseball → Football → Basketball → Track & Field)
data/          # Seeded snapshots
scripts/       # Seed, validate, link-check
```

## Prerequisites
- Node.js 20+
- pnpm 9 (use `corepack enable`)
- Cloudflare account (Pages + Workers)

## Setup
```bash
pnpm install
pnpm run seed
pnpm run validate
pnpm run linkcheck
```

## Refreshing data
Run the orchestrator for all leagues or a single adapter:
```bash
pnpm run refresh:all
pnpm run refresh:mlb
```

Adapters respect `robots.txt`, user agent settings, and throttle/ cache policies. Secrets (CFBD, Perfect Game, DCTF) are optional; without them adapters fall back to public linkouts.

## API
Cloudflare Worker serves read-only JSON endpoints:
- `GET /v1/{league}/{season}/teams`
- `GET /v1/{league}/{season}/roster?teamId=...`
- `GET /v1/{league}/{season}/standings`
- `GET /v1/{league}/{season}/schedules`
- `GET /v1/{league}/{season}/players/{playerId}`

## Web
Next.js app renders static pages using the seeded data and displays an as-of watermark from metadata.

## Deployment
1. Configure secrets in GitHub Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `R2_*`, `CFBD_API_KEY`, `PERFECTGAME_COOKIE`, `DCTF_COOKIE`.
2. Cloudflare Pages project `blazesportsintel` publishes `apps/web/dist`.
3. Wrangler deploys Worker API using `wrangler.toml`.

## Compliance & Safety
- Never bypass paywalls or violate `robots.txt`.
- Do not log credentials or tokens.
- Respect rate limits with built-in throttling.

## Takedown / contact
For corrections or takedown requests, email security@blazeintelligence.com.

