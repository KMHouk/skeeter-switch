# Security Report — skeeter-switch
**Date:** 2026-04-17T00:00:00Z
**Reviewed by:** Copper
**Build:** post-commit c43d88b

## Summary

The skeeter-switch project has a solid auth-at-the-edge design via SWA and good secrets-via-KeyVault hygiene, but has **one critical gap**: Azure Function handlers perform no function-level authentication, meaning if the Function App is directly reachable (bypassing SWA), all endpoints — including POST /api/command which controls a physical switch — are completely unauthenticated. Secondary concerns include wildcard CORS headers, API keys in URL query strings, unpinned GitHub Actions, and missing input range validation.

---

## Findings

### [CRITICAL-1] No function-level authentication on any endpoint (except config PUT)
**Files:** `src/functions/status/index.ts:13`, `src/functions/override/index.ts:15`, `src/functions/command/index.ts:30`, `src/functions/evaluate-http/index.ts:10`, `src/functions/logs/index.ts:10`, `src/functions/plan/index.ts:27`
**Issue:** Every HTTP function handler sets `authLevel: 'anonymous'` and performs zero authentication checks. The only exception is `config` PUT, which checks `x-ms-client-principal` for the `admin` role. All other endpoints — including `POST /api/command` (controls a physical power switch) and `POST /api/override` — trust that SWA has already authenticated the caller by virtue of being behind SWA's proxy. If the Function App hostname (`*.azurewebsites.net`) is reachable directly (not restricted to SWA-only traffic), **all auth is bypassed**.
**Risk:** An attacker who discovers the Function App URL can:
- Turn the physical switch on/off at will (`POST /api/command`)
- Set indefinite overrides (`POST /api/override`)
- Trigger evaluation cycles (`POST /api/evaluate`)
- Read all system state, config (including location coordinates), and logs
**Fix:**
1. **Immediate:** Add a shared `requireAuth(req)` middleware that parses and validates `x-ms-client-principal` at the top of every handler. Return 401 if missing/malformed.
2. **Network layer:** In Bicep, restrict the Function App's inbound traffic to only the SWA's outbound IPs or use Azure Private Endpoints / VNET integration so the Function App is not publicly routable.
3. **Defense in depth:** Both (1) and (2) should be implemented — never rely solely on network controls.

---

### [HIGH-1] Wildcard CORS `Access-Control-Allow-Origin: *` on all endpoints
**Files:** `src/functions/status/index.ts:6`, `src/functions/override/index.ts:6`, `src/functions/command/index.ts:8`, `src/functions/config/index.ts:6`, `src/functions/evaluate-http/index.ts:5`, `src/functions/logs/index.ts:4`, `src/functions/plan/index.ts:9`
**Issue:** Every handler returns `'Access-Control-Allow-Origin': '*'`. This allows any website on the internet to make credentialed cross-origin requests to the API. Combined with `anonymous` authLevel, a malicious page could silently issue commands if a user visits it while the Function App is accessible.
**Risk:** Cross-origin request forgery from any website; credential-bearing cookies (if any) are sent automatically.
**Fix:** Replace `'*'` with the specific SWA hostname (e.g., `https://<swa-name>.azurestaticapps.net`). Ideally, read from an environment variable so dev/prod can differ. Also consider removing function-level CORS headers entirely if SWA handles CORS at the proxy layer.

---

### [HIGH-2] API keys embedded in URL query strings (Azure Maps)
**File:** `src/shared/weather.ts:76-81`
**Issue:** The Azure Maps subscription key is placed directly in the URL query string:
```
https://atlas.microsoft.com/weather/...&subscription-key=${key}
```
URL query parameters are logged by:
- Azure Application Gateway / Front Door access logs
- Azure Functions runtime diagnostics (request URLs)
- Any intermediate proxy or CDN
- Browser history (not applicable here, but a pattern issue)
**Risk:** Key leakage through infrastructure logs, leading to unauthorized Azure Maps API usage and potential billing abuse.
**Fix:** Azure Maps supports passing the key via the `Subscription-Key` HTTP header instead of the query string. Refactor to:
```typescript
const response = await fetch(url, {
  headers: { 'Subscription-Key': key }
});
```

---

### [HIGH-3] GitHub Actions use floating version tags — supply chain risk
**Files:** `.github/workflows/infra-deploy.yml`, `.github/workflows/functions-deploy.yml`, `.github/workflows/swa-deploy.yml`
**Issue:** All workflow actions reference floating tags:
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `azure/login@v2`
- `actions/upload-artifact@v4`
- `actions/download-artifact@v4`
- `Azure/static-web-apps-deploy@v1`

A compromised or hijacked action tag can inject malicious code into CI/CD pipelines with full access to OIDC tokens, secrets, and deployment credentials.
**Risk:** Supply chain attack: attacker who compromises any upstream action can exfiltrate AZURE_CLIENT_ID/TENANT_ID secrets and deploy malicious code to production.
**Fix:** Pin all actions to their full commit SHA. Example:
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```
Use Dependabot or Renovate to keep SHA pins updated.

---

### [MEDIUM-1] No role-based access control on POST /api/command and POST /api/override
**Files:** `src/functions/command/index.ts:30`, `src/functions/override/index.ts:15`
**Issue:** Even when accessed through SWA (with valid authentication), any user with the `authenticated` role can execute commands and set overrides. Only `config` PUT checks for the `admin` role. For a system that controls a physical device, command and override should arguably require elevated privileges.
**Risk:** Any authenticated user (if multiple users are added in the future) can control the physical switch without admin approval.
**Fix:** Add `hasAdminRole(req)` check to `command` and `override` handlers, or create a dedicated `operator` role in SWA auth config. Extract the existing `hasAdminRole` from `config/index.ts` into a shared auth utility.

---

### [MEDIUM-2] Override ttlMinutes has no upper bound
**File:** `src/functions/override/index.ts:40-43`
**Issue:** The `ttlMinutes` field is validated as `> 0` but has no maximum cap. A caller can set `ttlMinutes: 999999999` (≈1,900 years), creating an effectively permanent override that could be forgotten.
**Risk:** Accidental or malicious permanent override of automated decision logic. System appears "stuck" and operators may not realize an ancient override is active.
**Fix:** Add a maximum cap (e.g., `10080` = 7 days):
```typescript
if (typeof ttlMinutes !== 'number' || ttlMinutes <= 0 || ttlMinutes > 10080) {
  return { status: 400, jsonBody: { error: 'ttlMinutes must be 1-10080' }, headers: corsHeaders };
}
```

---

### [MEDIUM-3] Secret cache never expires
**File:** `src/shared/keyvault.ts:4-5`
**Issue:** `secretCache` is a module-level `Map` with no TTL or expiration logic. Once a secret is fetched from Key Vault, it is cached for the lifetime of the Function App process. If a secret is rotated in Key Vault (e.g., IFTTT key is compromised and replaced), the Function App will continue using the old value until it is restarted.
**Risk:** Stale secrets persist after rotation, extending the exposure window of a compromised key.
**Fix:** Add a TTL to the cache (e.g., 1 hour):
```typescript
const secretCache = new Map<string, { value: string; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
```

---

### [MEDIUM-4] Config numeric fields lack range validation
**File:** `src/functions/config/index.ts:32-87`
**Issue:** The `parseConfigUpdate` function validates that numeric fields are numbers (not NaN), but does not enforce reasonable ranges. Examples:
- `debounceMinutes: -5` — negative debounce breaks timing logic
- `pollIntervalMinutes: 0` — zero poll interval creates infinite loop potential
- `precipProbThreshold: 999` — threshold above 100% is meaningless
- `windSpeedThreshold: -1` — negative threshold disables wind checks entirely
- `location.lat: 999` — invalid coordinate
**Risk:** Misconfiguration leading to unexpected decision engine behavior, potential tight-loop resource consumption, or effectively disabling safety checks.
**Fix:** Add range checks:
```typescript
if (body.debounceMinutes < 1 || body.debounceMinutes > 120) return 'debounceMinutes out of range';
if (body.pollIntervalMinutes < 1 || body.pollIntervalMinutes > 60) return 'pollIntervalMinutes out of range';
if (body.precipProbThreshold < 0 || body.precipProbThreshold > 100) return 'precipProbThreshold out of range';
if (body.location.lat < -90 || body.location.lat > 90) return 'Invalid latitude';
if (body.location.lon < -180 || body.location.lon > 180) return 'Invalid longitude';
```

---

### [MEDIUM-5] Timezone field not validated against known timezone database
**File:** `src/functions/config/index.ts:45-46`
**Issue:** The `timezone` field only validates `typeof === 'string'`. An invalid timezone string (e.g., `"HACKED"`) passed to `date-fns-tz`'s `toZonedTime()` may cause silent failures or fall back to UTC without warning, leading to the switch running outside intended hours.
**Risk:** Incorrect time window evaluation; switch could run during unintended hours.
**Fix:** Validate against `Intl.supportedValuesOf('timeZone')` (available in Node 18+):
```typescript
const validTimezones = new Set(Intl.supportedValuesOf('timeZone'));
if (!validTimezones.has(body.timezone)) return 'Invalid timezone';
```

---

### [LOW-1] Content-Security-Policy uses `unsafe-inline`
**File:** `src/web/staticwebapp.config.json:46`
**Issue:** The CSP header includes `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'`. While this is common for React/Vite apps that inject inline styles, `unsafe-inline` in `script-src` significantly weakens XSS protection.
**Risk:** If an XSS vulnerability is found in the frontend, `unsafe-inline` allows injected scripts to execute.
**Fix:** If possible, remove `'unsafe-inline'` from `script-src` and use nonce-based CSP or hash-based CSP. Keep `'unsafe-inline'` for `style-src` only if needed by the CSS framework. This may require Vite CSP plugin support.

---

### [LOW-2] getRecentLogs fetches all events into memory before sorting
**File:** `src/shared/storage.ts:335-364`
**Issue:** `getRecentLogs` iterates over all entities from the last 30 days, loads them all into memory, sorts, then slices. If the EventLog table grows large (events every 5 minutes = ~8,640/month), this becomes increasingly expensive.
**Risk:** Memory pressure on Function App consumption plan (1.5 GB limit); potential timeout on cold starts. An attacker who can trigger many events could amplify this.
**Fix:** Use Azure Table Storage's `$top` OData parameter or reverse the RowKey design to enable natural reverse-chronological queries. Alternatively, paginate with a server-side limit.

---

### [LOW-3] SWA deployment uses static API token, not OIDC
**File:** `.github/workflows/swa-deploy.yml:45`
**Issue:** The SWA deploy workflow uses `${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}` — a long-lived static deployment token — while the other two workflows properly use OIDC federated credentials. This is inconsistent with the zero-standing-credentials strategy.
**Risk:** If the SWA API token is leaked or the secret is compromised, an attacker can deploy arbitrary frontend code.
**Fix:** The `Azure/static-web-apps-deploy` action supports OIDC auth. Migrate to match the pattern used by infra-deploy and functions-deploy.

---

### [LOW-4] Secret name included in error messages
**File:** `src/shared/keyvault.ts:25`
**Issue:** `throw new Error(`Secret ${name} returned no value`)` includes the secret name (e.g., `IFTTT_KEY`) in the error message. This is caught and logged by error handlers. While not exposing the secret value, it reveals secret naming conventions to log readers.
**Risk:** Information disclosure; an attacker with log access learns which secrets exist and their names in Key Vault.
**Fix:** Use a generic error: `throw new Error('Required secret returned no value')` and log the secret name only at debug level.

---

### [INFO-1] No rate limiting on any endpoint
**Files:** All function handlers
**Issue:** No rate limiting, throttling, or request quotas are implemented. The Azure Functions consumption plan provides some inherent protection via scaling limits.
**Note:** Acceptable for a single-user personal project. If multi-user access is added, consider Azure API Management or a rate-limiting middleware.

---

### [INFO-2] Error responses are properly sanitized
**Files:** All function handlers
**Issue:** N/A — this is a positive finding. All error handlers return generic messages (e.g., `"Failed to load status"`, `"Failed to set override"`) and do not leak stack traces, internal paths, or configuration details to callers. Error details are logged server-side only.

---

### [INFO-3] IFTTT webhook URL contains key but is not logged directly
**File:** `src/shared/ifttt.ts:22-24`
**Issue:** The IFTTT webhook URL embeds the key in the path. However, the URL itself is never logged — only error messages and status codes are logged. The `evaluation.ts:75` log line includes `webhookResult` but that object contains only `statusCode`, `latencyMs`, `retries`, `responseBody`, and optionally `error` — not the URL.
**Note:** If the Node.js runtime or Azure infrastructure logs outbound HTTP request URLs at the diagnostic level, the key could still appear. Consider using a request header for the key if IFTTT supports it (it does not — IFTTT requires the key in the URL path). Accept this as a known limitation of the IFTTT API design.

---

## Remediation Priority

| Priority | ID | Severity | Fix |
|----------|----|----------|-----|
| 1 | CRITICAL-1 | Critical | Add `requireAuth()` to all handlers + network-restrict Function App |
| 2 | HIGH-1 | High | Replace CORS `*` with SWA hostname |
| 3 | HIGH-2 | High | Move Azure Maps key to HTTP header |
| 4 | HIGH-3 | High | Pin GitHub Actions to commit SHAs |
| 5 | MEDIUM-1 | Medium | Add admin/operator role check to command & override |
| 6 | MEDIUM-2 | Medium | Cap override ttlMinutes |
| 7 | MEDIUM-4 | Medium | Add range validation to config numerics |
| 8 | MEDIUM-5 | Medium | Validate timezone against IANA database |
| 9 | MEDIUM-3 | Medium | Add TTL to secret cache |
| 10 | LOW-3 | Low | Migrate SWA deploy to OIDC |
| 11 | LOW-1 | Low | Tighten CSP (remove unsafe-inline from script-src) |
| 12 | LOW-2 | Low | Optimize getRecentLogs query |
| 13 | LOW-4 | Low | Remove secret name from error messages |

---

## What's Good

- **Secrets management:** Keys are sourced from Key Vault via Managed Identity — no hardcoded secrets anywhere in the codebase.
- **Structured logging:** All log output is JSON-structured with event types, making it audit-friendly and parseable by Azure Monitor.
- **Error sanitization:** Error responses never leak stack traces or internal details to callers.
- **SWA route-level auth:** `staticwebapp.config.json` properly requires `authenticated` role on all routes including `/api/*`, with a 401→login redirect.
- **Security headers:** SWA config includes `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and a CSP header.
- **Input validation present:** Override state, command state, config fields, and log limit all have type validation. Config PUT properly checks admin role.
- **IFTTT webhook resilience:** Retry with exponential backoff, jitter, and per-attempt timeout. Well-implemented.
- **OIDC for CI/CD:** Two of three workflows use OIDC federated credentials with minimal permissions (`id-token: write`, `contents: read`).
- **Environment separation:** GitHub Environments isolate dev/prod secrets and support approval gates.
- **Defense in depth on dry run:** The `dryRun` flag prevents accidental webhook calls during development.
