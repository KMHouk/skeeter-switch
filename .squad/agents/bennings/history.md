# Project Context

- **Owner:** Kevin
- **Project:** skeeter-switch — Arctic Mosquito Killing System controller
- **Stack:** Azure Functions (TypeScript), Azure Table Storage, Key Vault (Managed Identity), Azure Maps Weather, IFTTT Webhooks, Application Insights
- **Created:** 2026-04-17

## What I'm Responsible For

Timer-triggered evaluation function (5-min), HTTP APIs (/api/status, /api/override, /api/evaluate, /api/command, /api/plan, /api/config, /api/logs), IFTTT webhook client with 3 retries + exponential backoff + jitter, weather provider integration with caching, decision logic engine, Table Storage data access layer.

Key patterns: dryRun flag (default true in dev), all secrets via Key Vault + Managed Identity, Application Insights telemetry on every evaluation and webhook call.

## Learnings

### 2026-04-17 (session 4 — unit tests for decision engine)

- **Framework:** Jest 29 + ts-jest 29 (Jest 30 was the default npm install but is not yet compatible with ts-jest 29; pinned to Jest 29).
- **Config:** `jest.config.js` at repo root using `preset: 'ts-jest'`; `tsconfig.json` include extended with `src/__tests__/**/*`.
- **Test file:** `src/__tests__/decision.test.ts` — 34 tests, all passing.
- **Fixture helpers:** `makeConfig(overrides?)`, `makeWeather(overrides?)`, `makeState(overrides?)` defined at top of test file. `makeConfig` wraps `getDefaultConfig()` (exported from config.ts) and forces `dryRun: false`.
- **Timezone tests:** January 15 2025 (EST = UTC-5) used as base date. UTC strings computed manually (`ET+5h → UTC`) so tests are deterministic and DST-free.
- **Key boundary findings (no bugs, all correct in decision.ts):**
  - Time window `endMinutes` is **exclusive** (`nowMinutes < endMinutes`), so 08:00 ET is outside the window.
  - `precipProbability` check is `< threshold` (strict less-than), so 35% blocks the device.
  - `windSpeedMph` check is `< threshold` (strict less-than), so 12 mph blocks the device.
  - `debounceMinutes` check is `>= debounceMinutes`, so exactly 15 min ago passes.
  - Override `expiresAt === now` is **not** active (`> now` is strict).
- **No bugs found** in `decision.ts` — all logic matched expected semantics.
- **Test coverage groups:** override (4), rain (2), temperature (3), time window (7), precip (3), wind (3), debounce (4), compound/happy path (5), reasons[] (3).

### 2026-04-17 (session 3 — Norris threshold implementation)
- Run window expanded to 16:00–08:00 to capture both Aedes albopictus (dawn/dusk biter, peaks 16:00–18:00 and 05:00–08:00) and Culex pipiens (nocturnal, active 18:00–06:00).
- Temperature floor (50°F) added to WeatherConditions type as `temperatureF: number`. Azure Maps currentConditions returns temperature in Celsius by default (metric); convert to °F with `(c * 9/5) + 32`. Graceful fallback: if `temperature.value` is absent, default to 60°F and `console.warn` — never hard-fail on missing weather data.
- Temperature floor is part of the `weatherOk` compound boolean alongside rain, precip probability, and wind speed. Dedicated reason message pushed to `reasons` array for observability.
- Precip probability threshold raised 30% → 35% per Norris calibration for Arlington VA humid subtropical climate.
- All four config fields (`runWindowStart`, `runWindowEnd`, `precipProbThreshold`, `temperatureFloorF`) live in `AppConfig` interface and `DEFAULT_CONFIG`. Downstream storage (Table Storage config row) will pick up changes on next deploy.

### 2026-04-17 (session 2)
- debounceMinutes raised from 10 → 15: ARCTIC® MKS thermal system requires a full 15-minute stabilization window after power-on; 10 minutes is borderline unsafe per hardware team (Fuchs).
- `currentlyRaining` was already present in the `weatherOk` short-circuit but lacked an explicit hard-stop reason in the reasons array. Added a dedicated `reasons.push` so logs and API responses clearly surface the weatherproof constraint.
- Location defaults updated from NYC (40.7128, -74.0060) to Arlington VA 22205 (38.8816, -77.1311) across config.ts and both bicepparam files.

- Created Azure Functions TypeScript backend files: package.json, tsconfig.json, host.json, local.settings.json.template, src/index.ts, src/functions/index.ts, src/shared/*, and all src/functions/* HTTP/timer handlers.
- Stored lastDecision and systemHealth metadata as extra columns in SwitchStateTable to keep within the four-table schema.
- Plan generation uses current weather snapshot and a base state with no debounce/override to produce schedule blocks.
- TypeScript build verified clean (npm run build). All 8 function handlers compile correctly with @azure/functions v4 API. Timer trigger uses correct cron expression "0 */5 * * * *" (every 5 minutes). No hardcoded secrets detected in source code. All secrets properly fetched via Key Vault + Managed Identity pattern.

### 2026-04-19 (IFTTT → TP-Link Kasa cloud API swap)
- **Context:** IFTTT Pro subscription (~$12.99/mo) required just to receive webhooks. Replaced with direct device control via `tplink-cloud-api` npm package (v1.1.6).
- **New module:** `src/shared/kasa.ts` replaces `src/shared/ifttt.ts`. Function signature: `toggleDevice(state: 'on' | 'off', deviceAlias: string, dryRun: boolean): Promise<WebhookResult>`. Same retry/backoff pattern (4 retries, exponential backoff with jitter, 1s base delay).
- **Credentials:** `getTpLinkCredentials()` in keyvault.ts pulls `tplink-username` and `tplink-password` from Key Vault (or env vars TPLINK_USERNAME / TPLINK_PASSWORD in dev). Removed `getIftttKey()` entirely.
- **Config changes:** AppConfig now has `kasaDeviceAlias` instead of `iftttEventOn`/`iftttEventOff`. Default: `'skeeter-switch'` (env var: KASA_DEVICE_ALIAS).
- **Ambient types:** `tplink-cloud-api` lacks TypeScript definitions. Used local interface declarations (`TpLinkDevice`, `TpLinkCloud`) with `require()` + type cast to maintain type safety.
- **Status codes:** Kasa API doesn't expose HTTP status codes. Return 200 on success, 500 on all failures. Keep `responseBody` as `'device_on'` or `'device_off'` for observability.
- **Event log:** `webhookEvent` field now logs `'kasa:on'` or `'kasa:off'` instead of IFTTT event names. Preserves log structure for metrics/queries.
- **Testing pattern:** dryRun mode returns same mock result as before — no API calls, same WebhookResult interface. Keeps callers (evaluation.ts, command/index.ts) unchanged except for import swap.
- **Device discovery:** `cloud.getDeviceByAlias(alias)` used to locate EP40 by friendly name. If not found, throws descriptive error caught by retry loop.
- **Rollout:** Code changes complete, committed. Infrastructure update required: Add Key Vault secrets `tplink-username` and `tplink-password`, remove `ifttt-key`. Run `npm install` to pull `tplink-cloud-api@^1.1.6`.
