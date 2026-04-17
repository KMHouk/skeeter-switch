# Project Context

- **Owner:** Kevin
- **Project:** skeeter-switch — Arctic Mosquito Killing System controller
- **Stack:** Azure Functions (TypeScript), Azure Table Storage, Key Vault (Managed Identity), Azure Maps Weather, IFTTT Webhooks, Application Insights
- **Created:** 2026-04-17

## What I'm Responsible For

Timer-triggered evaluation function (5-min), HTTP APIs (/api/status, /api/override, /api/evaluate, /api/command, /api/plan, /api/config, /api/logs), IFTTT webhook client with 3 retries + exponential backoff + jitter, weather provider integration with caching, decision logic engine, Table Storage data access layer.

Key patterns: dryRun flag (default true in dev), all secrets via Key Vault + Managed Identity, Application Insights telemetry on every evaluation and webhook call.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
### 2026-04-17
- Created Azure Functions TypeScript backend files: package.json, tsconfig.json, host.json, local.settings.json.template, src/index.ts, src/functions/index.ts, src/shared/*, and all src/functions/* HTTP/timer handlers.
- Stored lastDecision and systemHealth metadata as extra columns in SwitchStateTable to keep within the four-table schema.
- Plan generation uses current weather snapshot and a base state with no debounce/override to produce schedule blocks.
- TypeScript build verified clean (npm run build). All 8 function handlers compile correctly with @azure/functions v4 API. Timer trigger uses correct cron expression "0 */5 * * * *" (every 5 minutes). No hardcoded secrets detected in source code. All secrets properly fetched via Key Vault + Managed Identity pattern.
