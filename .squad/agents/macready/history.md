# Project Context

- **Owner:** Kevin
- **Project:** skeeter-switch — Arctic Mosquito Killing System controller
- **Stack:** Azure Static Web Apps, Azure Functions (TypeScript), Azure Table Storage, Bicep IaC, GitHub Actions, Azure Maps Weather, IFTTT Webhooks, Entra ID auth
- **Created:** 2026-04-17

## What We're Building

Cloud-hosted controller for a TP-Link Kasa EP40 smart plug controlled via IFTTT Webhooks. Decides ON/OFF based on weather, time window, and manual overrides. Full web dashboard with Entra ID auth, calendar view, decision reasoning, and activity log.

Key defaults: time zone America/New_York, run window 18:00–06:00, precipProb < 30%, wind < 12 mph, debounce 10 min, poll 5 min.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
- **2026-04-17:** Architecture locked. Shared types defined in `src/functions/src/shared/types.ts` — single source of truth for all TypeScript. README complete with IFTTT setup, Entra ID registration, Conditional Access MFA, local dev, deployment, and security checklist. Repo skeleton directories created. Key architecture decisions written to decisions inbox (Table Storage schema, decision engine as pure function, IFTTT retry strategy, auth pattern, dry-run semantics).
- **2026-04-17:** Full integration review completed. Found 5 critical issues blocking deployment: (1) Frontend SystemHealth type fields don't match backend response field names. (2) functions-deploy.yml builds from wrong directory — no package.json at src/functions/. (3) Missing keyVaultReferenceIdentity in functionapp.bicep — user-assigned MI won't resolve KV refs. (4) No SWA linkedBackend resource — /api/* calls will 404 in prod. (5) Heartbeat alert queries customEvents but code logs to traces. Also found 8 warnings including table name mismatch, config GET requiring admin breaks non-admin dashboard, IFTTT retry count semantics, and storage using connection strings instead of managed identity RBAC. Actual source layout differs from original spec paths: shared code is at src/shared/ not src/functions/src/shared/, and orphan duplicates exist at old paths. Full findings written to decisions inbox.
