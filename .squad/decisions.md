# Squad Decisions

## Architecture & Storage (MacReady, 2026-04-17)

**Storage:** Azure Table Storage (not Cosmos DB) — simpler, cheaper, sufficient for workload.
- Tables: SwitchState, Overrides, Config, EventLog
- Schema: SwitchState (PartitionKey="state", RowKey="current")
- Overrides (PartitionKey="override", RowKey="active")
- Config (PartitionKey="config", RowKey="current")
- EventLog (PartitionKey=YYYY-MM-DD, RowKey=ISO-timestamp-uuid)

**Weather Provider:** Azure Maps Weather API — native Azure integration, 10-minute cache.

**Decision Engine:** Pure function `evaluateDecision(config, weather, currentState, now): DecisionResult` — testable without Azure dependencies.

**Auth Pattern:** Static Web Apps built-in auth (/.auth/login/aad). All routes require authenticated role. Config editor requires admin role.

**Dry Run:** dryRun flag in AppConfig. When true: decision runs, webhook call SKIPPED, logged with dryRun: true. Default true in dev, false in prod.

**Shared Types:** src/functions/src/shared/types.ts — single source of truth for backend and frontend TypeScript.

**App Insights:** Use @azure/monitor-opentelemetry for automatic instrumentation.

## Backend Functions (Bennings, 2026-04-17)

**Table Persistence:** Persist lastDecision and systemHealth timestamps (lastEvaluationAt, lastWeatherFetchAt, alertStatus) as extra columns in SwitchStateTable to stay within four-table schema.

**Runtime Entrypoint:** src/functions/index.ts as runtime entrypoint; package.json main (dist/functions/index.js) loads src/index.ts registrations.

**Plan Generation:** Uses current weather snapshot and base state with no override/debounce to produce schedule blocks.

**Manual Commands:** Forces state changes even inside debounce window when requested state differs. Identical-state requests are no-ops.

**IFTTT Resilience:** 3 retries with exponential backoff starting at 1s, jitter ±20%, timeout per attempt 10s, record all attempt details.

## Infrastructure (Blair, 2026-04-17)

**Resource Naming:** `${appName}-${environment}-${uniqueSuffix}` pattern where uniqueSuffix = uniqueString(resourceGroup().id, appName, environment).
- Ensures globally unique names for Storage Account and Key Vault
- Environment separation baked into names
- Deterministic (safe for re-deployments)

**SKU Choices:**
- Storage: Standard_LRS
- Function App: Y1 Consumption plan
- Key Vault: Standard tier
- Static Web App: Standard tier
- Log Analytics: PerGB2018

**RBAC for Key Vault:** Use enableRbacAuthorization: true (RBAC model, not legacy access policies).
- Modern Azure best practice
- Consistent with Managed Identity usage
- All permissions auditable in Azure RBAC

**Managed Identity:** User-assigned Managed Identity for Function App auth to Key Vault and Storage.
- Zero secrets to manage
- Automatic credential rotation by Azure
- RBAC: Key Vault Secrets User + Storage Table Data Contributor

**Alert Thresholds:**
- Errors >0 in 15 minutes (severity 2)
- Webhook failures >=2 in 30 minutes (severity 1)
- Heartbeat missing <1 evaluation_cycle event in 15 minutes (severity 1)

## CI/CD & Security (Childs, 2026-04-17)

**OIDC Federation:** Use OpenID Connect federated credentials for all GitHub Actions workflows.
- Zero standing credentials; short-lived tokens on-demand
- App registration: skeeter-switch-github-actions
- Three federated credentials:
  1. repo:KMHouk/skeeter-switch:ref:refs/heads/main (auto-deploy from main)
  2. repo:KMHouk/skeeter-switch:environment:dev (dev environment)
  3. repo:KMHouk/skeeter-switch:environment:prod (prod environment)
- Minimum workflow permissions: id-token: write, contents: read

**Environment Separation:** Use GitHub Environments (dev, prod) with environment-specific secrets.
- Protection rules: Prod can require approvals
- Secret isolation: Each environment has own AZURE_CLIENT_ID, AZURE_RESOURCE_GROUP, etc.
- Auto-deploy to dev on main; prod requires manual trigger

**Validate-Before-Deploy:** Separate validate and deploy jobs in infra-deploy.yml.
- Validate with `az deployment group validate` first
- Deploy only runs if validate succeeds
- Fail fast, cost control, clear audit log

**Build-Once, Deploy-Many:** Single build job creates artifact; separate deploy-dev and deploy-prod consume it.
- Consistency: Same artifact deploys to both
- Efficiency: Build once, reuse
- Promotion pattern ready for approval flows

**GitHub Actions SHA Pinning Policy:** All `uses:` references in GitHub Actions workflows must be pinned to immutable SHA hashes rather than floating version tags (e.g., `@v4`). Version tags must appear as inline comments for human readability.
- Rationale: Floating tags are supply chain attack vectors — a compromised action repo can silently push malicious code to a tag
- SHAs are immutable: exact bytes that ran in review run in prod
- Verified SHAs (as of 2026-04-17):
  - `actions/checkout` → `11bd71901bbe5b1630ceea73d27597364c9af683` (v4.2.2)
  - `actions/setup-node` → `39370e3970a6d050c480ffad4ff0ed4d3fdee5af` (v4.1.0)
  - `azure/login` → `6c251865b4e6290e7b78be643ea2d005702d2035` (v2.1.0)
  - `Azure/static-web-apps-deploy` → `1a947af9992250f3bc2e68ad0754c0b0c11566c9` (v1.5.0)
- Outstanding: `upload-artifact@v4` and `download-artifact@v4` pending SHA verification

## Security Hardening (Copper, 2026-04-17)

**Function-Level Auth Middleware:** All HTTP handlers must validate `x-ms-client-principal` header via shared `requireAuth()` / `requireAdmin()` in `src/shared/auth.ts`.
- Pattern: Every handler imports middleware, validates auth after OPTIONS check, returns 401 if unauthenticated or insufficient role
- Applied to all 7 handlers: evaluator, config-read, config-write, scheduler, forecast, check-health, manual-command
- Critical security fix: prevents direct Function App access from bypassing SWA auth layer

**CORS Restriction to Environment Variable:** CORS `Access-Control-Allow-Origin` changed from `*` to env-var-driven origin via `src/shared/cors.ts`.
- Reads `AZURE_ALLOWED_ORIGINS` environment variable
- Defaults to `http://localhost:4280` (dev only)
- Production deployment requires setting `AZURE_ALLOWED_ORIGINS` to match SWA hostname (e.g., `https://<name>.azurestaticapps.net`)

**Azure Maps Key Sanitization:** Added `redactKey()` sanitizer in `src/shared/weather.ts` to prevent plaintext key logging.
- Immediate fix prevents key leakage through infrastructure logs
- Deferred: Full fix (migrate to HTTP `Subscription-Key` header instead of query string)

## Frontend (Windows, 2026-04-17)

**CSS Approach:** Plain global CSS in src/web/src/index.css with utility-style classes and component-specific class names (no Tailwind or CSS modules).

**Auth Integration:** Azure Static Web Apps built-in auth.
- Login: /.auth/login/aad?post_login_redirect_uri=/
- Logout: /.auth/logout
- Claims: /.auth/me in dedicated useAuth hook
- Derive: isAuthenticated and isAdmin (userRoles includes "admin")

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
