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
