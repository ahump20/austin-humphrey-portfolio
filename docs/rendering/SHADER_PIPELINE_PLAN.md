# Blaze Intelligence Advanced Rendering Architecture

## Objective
Deliver the Blaze Intelligence "Blaze Intelligence - Next-Level Graphics Enhancement Plan" through a secure, testable, and performant WebGL/Three.js pipeline that integrates cleanly with the existing React application.

## Guiding Principles
1. **Safety first** – sandbox shader inputs, validate assets, and enforce content security policies to block XSS/DoS.
2. **Deterministic performance** – budget 16ms/frame (60fps) on mid-tier mobile GPU; monitor with Stats.js + custom metrics.
3. **Incremental delivery** – ship behind feature flags; every phase must be deployable and reversible.
4. **Cross-team reuse** – isolate rendering code in `/src/visuals` package with typed APIs and Storybook fixtures.
5. **Observability** – emit structured logs + WebGL debug markers for all pipeline stages.

## Architecture Overview
```
React Shell ─▶ Visualization Host (Canvas + Overlay)
              │
              └─▶ Render Orchestrator (Three.js renderer, effect composer, asset loader)
                         │
                         ├─▶ Shader Library (GLSL modules, validated manifests)
                         ├─▶ Post-Processing Stack (bloom, tone mapping, motion blur)
                         ├─▶ Particle Engine (GPU instancing, flow fields)
                         ├─▶ Lighting System (PBR materials, shadows, probes)
                         └─▶ Data Scene Graph (nodes, links, holograms)
```

### Module boundaries
- `src/visuals/core`: renderer bootstrap, device capability detection, feature flags.
- `src/visuals/shaders`: GLSL files + JSON manifests (uniform schema, validation via Zod).
- `src/visuals/postprocessing`: reusable passes built on `postprocessing` npm package.
- `src/visuals/particles`: GPU instanced particle controllers, physics adapters (Cannon.js optional).
- `src/visuals/lighting`: PBR materials, light rigs, shadow management.
- `src/visuals/data`: adapters that transform analytics payloads into scene graph nodes.

## Phase Plan
### Phase 1 – Core Shader & Post Processing (4 sprints)
- Integrate Three.js r158 + EffectComposer with typed wrapper.
- Implement HDR render target pipeline with ACES tone mapping.
- Build bloom, film grain, chromatic aberration passes; expose toggles via feature flags.
- Add unit tests for shader manifest parser; add Playwright visual regression baseline (golden images).
- Security: validate shader manifests against schema, reject remote imports.

### Phase 2 – Particle System Revolution (3 sprints)
- Introduce GPU instanced particle system (transforms via transform feedback).
- Implement turbulence/flow fields (precomputed 3D noise textures).
- Particle interaction bridge (pointer events -> WebGL uniform buffer updates).
- Performance budgets: 10k particles @ 1.5ms CPU, 4ms GPU; capture metrics in Storybook scenarios.

### Phase 3 – Lighting & Materials (3 sprints)
- Ship PBR material library (metal/roughness maps) with environment probes.
- Real-time shadow mapping (cascaded for directional lights, PCF filtering).
- Volumetric fog/light shafts via froxel grid (toggleable on mobile).
- Add automated regression: render fixtures under varying exposure and compare histograms.

### Phase 4 – Data Visualization (3 sprints)
- Create data scene graph abstraction (nodes/edges, animation state machines via Tween.js).
- Implement holographic charts, animated data streams, volumetric heatmaps (3D textures).
- Accessibility: provide synchronized 2D textual summaries for screen readers.
- Security: sanitize data labels before injecting into shaders to prevent shader-based XSS.

### Phase 5 – Performance & Polish (2 sprints)
- Level-of-detail system with impostors + frustum/occlusion culling.
- Progressive asset streaming via `navigator.connection.effectiveType` heuristics.
- Mobile fallback path (reduced passes, particle budgets) with runtime detection.
- Final QA: cross-device smoke tests, GPU memory profiling, soak tests.

## Risk Register & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Shader compilation failures in production | Blank canvas | Precompile shaders in CI, embed binary caches, surface user-friendly fallback. |
| Asset poisoning / RCE via shader fetch | Security breach | Host shaders locally, validate manifests, disable dynamic eval, enforce CSP `script-src 'self'`. |
| Performance regression on low-end devices | Dropped frames | Capability detection + dynamic quality tiers + telemetry to monitor fps. |
| Memory leaks from render targets | Crashes | Use WebGL inspector in CI, add jest tests for disposal hooks, integrate `renderer.info` metrics. |

## Testing Strategy
- **Unit**: schema validation, renderer bootstrap, uniform buffer packing.
- **Integration**: Jest + `@testing-library/react` harness with `WebGLRenderingContext` mock.
- **Visual**: Playwright screenshot diffs for key scenes (particles, lighting, data).
- **Performance**: headless puppeteer script capturing FPS + memory over 60s; fail build if <55fps median on reference hardware.

## Observability
- Structured logs (`logger.info({ event: 'render_frame', fps })`).
- OpenTelemetry spans around render loop + asset load.
- Stats overlay toggled via keyboard shortcut for QA.

## Deployment & Feature Flags
- Use LaunchDarkly (or internal equivalent) keys: `viz.shader_pipeline`, `viz.particles_v2`, `viz.dynamic_lighting`, `viz.data_holograms`.
- Rollout ladder: internal QA → pilot teams → 10% prod → 50% → 100%.
- Provide rollback script to disable feature flags + revert assets.

## Dependencies & Tooling
- `three@0.158`, `postprocessing`, `troika-three-text` (for crisp text), `zustand` for render state.
- Build pipeline: add GLSL loader via craco, ensure tree-shake friendly structure.
- Security scanning: enable `npm audit` high severity gate + custom shader linting (regex for forbidden tokens like `textureLod` on mobile).

## Next Steps
1. Formal sign-off on architecture.
2. Spin up proof-of-concept branch with core renderer skeleton.
3. Establish CI jobs (lint, unit, visual regression, perf budget check).
4. Draft detailed implementation tickets per module.

