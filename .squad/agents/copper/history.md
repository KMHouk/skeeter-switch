# Copper — History & Learnings

## Project Context
- **Project:** skeeter-switch — Arctic Mosquito Killing System cloud controller
- **Owner:** Kevin
- **Purpose:** Cloud controller for TP-Link Kasa EP40 via IFTTT, making ON/OFF decisions based on weather, time windows, manual overrides, and debounce rules
- **Stack:** Azure Functions (TypeScript), Azure Static Web Apps (React), Azure Table Storage, Key Vault, Bicep IaC, Entra ID + Conditional Access MFA, GitHub Actions OIDC
- **Auth:** SWA built-in auth with Entra ID, admin role via x-ms-client-principal header, all routes require authenticated
- **Secrets:** IFTTT key + Azure Maps key in Key Vault, accessed via Managed Identity
- **Joined:** 2026-04-17

## Learnings

### 2026-04-17 — Full Security Audit (post-commit c43d88b)
- **Audit scope:** All 7 HTTP function handlers, 5 shared modules, SWA config, 3 GitHub Actions workflows, package.json
- **Finding count:** 1 critical, 3 high, 5 medium, 4 low, 3 info
- **Critical finding:** No function-level auth on any handler except config PUT. All rely on SWA proxy for auth gating. If Function App is directly accessible, all endpoints are unauthenticated — including POST /api/command which controls a physical switch.
- **Key patterns to watch in future reviews:**
  - Any new HTTP handler MUST include auth check — never rely solely on SWA proxy
  - API keys should go in HTTP headers, not URL query strings
  - CORS `*` wildcard is present on all handlers — must be fixed before adding any credential-bearing auth
  - GitHub Actions must be pinned to SHA, not floating tags
  - Secret cache in keyvault.ts has no TTL — monitor for rotation issues
- **Report location:** `.squad/agents/copper/security-report.md`
- **Decision inbox entry:** `.squad/decisions/inbox/copper-security-findings.md`

### 2026-04-17 — Hardening Fixes Applied (commit a875ed6)
- **Scope:** CRITICAL-1, HIGH-1, HIGH-2 (partial — redaction added, header migration deferred)
- **Files created:** `src/shared/auth.ts`, `src/shared/cors.ts`
- **Files modified:** All 7 HTTP handlers (status, override, command, config, evaluate-http, logs, plan), `src/shared/weather.ts`
- **Auth pattern:** `requireAuth(req, corsHeaders)` / `requireAdmin(req, corsHeaders)` return `ClientPrincipal | HttpResponseInit`. Use `isAuthError()` type guard to discriminate. Auth gate placed after OPTIONS check, before any business logic.
- **CORS pattern:** `getCorsHeaders(methods)` reads `AZURE_ALLOWED_ORIGINS` env var (default `http://localhost:4280`). All handlers import from `src/shared/cors.ts`.
- **Key redaction:** `redactKey(url)` in weather.ts replaces `subscription-key=...` with `[REDACTED]` in error logs. IFTTT URL is not logged (confirmed safe — no change needed).
- **Config handler:** Removed inline `hasAdminRole()`, replaced with shared `requireAdmin()` for PUT and `requireAuth()` for GET.
- **Remaining findings:** HIGH-3 (action SHA pinning), MEDIUM-1–5, LOW-1–4, INFO-1 still open.
