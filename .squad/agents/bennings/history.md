# Project Context

- **Owner:** Kevin
- **Project:** skeeter-switch — Arctic Mosquito Killing System controller
- **Stack:** Azure Functions (TypeScript), Azure Table Storage, Key Vault (Managed Identity), Azure Maps Weather, IFTTT Webhooks, Application Insights
- **Created:** 2026-04-17

## What I'm Responsible For

Timer-triggered evaluation function (5-min), HTTP APIs (/api/status, /api/override, /api/evaluate, /api/command, /api/plan, /api/config, /api/logs), IFTTT webhook client with 3 retries + exponential backoff + jitter, weather provider integration with caching, decision logic engine, Table Storage data access layer.

Key patterns: dryRun flag (default true in dev), all secrets via Key Vault + Managed Identity, Application Insights telemetry on every evaluation and webhook call.

## Learnings

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
