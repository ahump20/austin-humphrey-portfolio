## Summary
- bootstrap Blaze Sports Intelligence monorepo with data schema, ETL utilities, and pipeline runners
- scaffold league adapters (MLB, NFL, NCAA FB, College BB, TX HS FB, Perfect Game TX) with validation + persistence
- add Cloudflare Worker API, Next.js web frontend, automation scripts, and CI workflows

## Seed snapshot
- seeded 6 leagues with example team/player/staff records (2025 season)

## Verification
- `pnpm run seed`
- `pnpm run validate`
- `pnpm run linkcheck`
- `pnpm run refresh:all`
- `pnpm run build`

## Secrets to configure
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- optional data sources: `CFBD_API_KEY`, `PERFECTGAME_COOKIE`, `DCTF_COOKIE`
