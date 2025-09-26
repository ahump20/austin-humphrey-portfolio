# BlazeSportsIntel — Developer Mode (Implementation Pack)

This pack ships a minimal, production-oriented scaffold:

- **Cloudflare Worker** for `/dev/ue` reverse proxy (to UE Pixel Streaming Frontend) and `/api/flags` backed by KV.
- **Next.js app** with `/dev`, `/dev/ue`, and `/dev/labs` (WebGPU demo) routes.
- **Feature flags**: `engine.mode`, `codec`, `bitrate`, `resolution`, `region` read from KV.
- **OTel web traces** baseline.

## Structure
```
worker/
  src/index.ts
  wrangler.toml
  package.json
  tsconfig.json
app/
  next.config.js
  package.json
  .env.example
  pages/_app.tsx
  pages/dev/index.tsx
  pages/dev/ue/index.tsx
  pages/dev/labs.tsx
  components/DeveloperModePanel.tsx
```

## Deploy (Worker)
1. `cd worker`
2. Set KV namespace in `wrangler.toml` and bind `UE_UPSTREAM` (tunnel/public).
3. `npm install`
4. `npm run deploy`

Seed KV (examples):

```
wrangler kv key put --namespace-id <KV_ID> "engine.mode" "webgpu"
wrangler kv key put --namespace-id <KV_ID> "codec" "h264"
wrangler kv key put --namespace-id <KV_ID> "bitrate" "12"
wrangler kv key put --namespace-id <KV_ID> "resolution" "1920x1080"
wrangler kv key put --namespace-id <KV_ID> "region" "us-central"
```

## Run (App)

```
cd app
npm install
npm run dev
```

Place behind Cloudflare Access for `blazesportsintel.com/dev/*`. Point `/dev/ue/*` through the Worker. WebGPU demo auto-falls back to WebGL.

## Notes
- CSP enforced via Worker and Next headers (`frame-ancestors 'self'`).
- UE player is **not** iframed; it is served as a top-level route.
- Replace `/otlp/v1/traces` with your collector ingress; or disable OTel if not needed.
