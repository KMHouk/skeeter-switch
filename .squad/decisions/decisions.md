# Decisions — skeeter-switch

**Last Updated:** 2026-04-17  
**Scope:** Arlington VA deployment, hardware safety, infrastructure validation

---

## 1. Arlington, VA Mosquito Thresholds — Norris Recommendations

**Date:** 2026-04-17  
**Author:** Norris, Mosquito & Entomology Expert  
**Reviewer:** Kevin (Project Owner)  
**Status:** IMPLEMENTED (Bennings)

### Problem
Skeeter-switch trap located at North Quintana St, Arlington, Virginia 22205. Default thresholds tuned for New York metro conditions misaligned with Arlington's Mid-Atlantic mosquito species composition and seasonal timing.

### Key Findings
- **Dominant species:** Aedes albopictus (Asian Tiger Mosquito) — daytime/shade biter; dawn (05:00–08:00) and late afternoon (16:00–18:00) peaks. Culex pipiens (Common House Mosquito) — nocturnal (18:00–06:00).
- **Current window gap:** 18:00–06:00 window misses Aedes late afternoon peak (16:00–18:00) and partial dawn peak (only captures 05:00–06:00 of the 05:00–08:00 window).
- **Missing temperature gate:** No temperature check; mosquitoes inactive below 50°F. Device runs spring/fall nights when mosquitoes dormant.

### Recommendations (ALL IMPLEMENTED)
1. **Extend Run Window to 16:00–08:00** — Captures full Aedes evening surge and dawn peak; maintains Culex nocturnal coverage.
2. **Add Temperature Gate (50°F)** — Aligns with mosquito biology and ARCTIC MKS hardware operating floor.
3. **Adjust Precipitation Threshold to 35%** — Better calibrated for Arlington's humid subtropical climate (from 30%).
4. **Keep Wind Threshold at 12 mph** — Established threshold for North American mosquitoes.
5. **Do NOT Add Humidity Gate** — High humidity increases activity; device must handle outdoor deployment.

### Implementation Checklist
- ✅ Config updated: precipProbThreshold 30 → 35, runWindowStart 18:00 → 16:00, runWindowEnd 06:00 → 08:00
- ✅ Code updated: Temperature gate added to `evaluateDecision()` function
- ✅ Testing: Validated decision logic with config changes
- ✅ Deployment: Released with new Arlington config (Bennings, commit c43d88b)

### References
Full technical analysis: `.squad/agents/norris/arlington-va-thresholds.md`

---

## 2. Threshold Fixes — Debounce, Rain Hard Stop, Location

**Author:** Bennings  
**Date:** 2026-04-17  
**Status:** IMPLEMENTED

### 2.1 Debounce 10 → 15 Minutes (Hardware Safety)
**Rationale:** ARCTIC® MKS thermal system cycles every 6–9 minutes. After power-on, requires 10–15 minutes to stabilize heat signature. Rapid cycling stresses heating element.  
**Decision:** `debounceMinutes` default changed from 10 to 15 in `src/shared/config.ts`.  
**Status:** ✅ DONE

### 2.2 Rain = Hard Stop (Device Not Weatherproof)
**Rationale:** MKS-1 not rated for wet conditions. Existing `precipProb < 30%` insufficient — if raining now, device must not run.  
**Decision:** `currentlyRaining === true` short-circuits `weatherOk` to `false` with dedicated hard-stop reason: "Currently raining — device is not weatherproof (hard stop)."  
**Status:** ✅ DONE

### 2.3 Location Updated to Arlington, VA 22205
**Rationale:** Trap physically located at North Quintana St, Arlington, Virginia 22205. Prior NYC coordinates (40.7128, -74.0060) produced incorrect weather data.  
**Decision:** Default coordinates updated to lat=38.8816, lon=-77.1311 in:
- `src/shared/config.ts` (fallback)
- `infra/parameters/dev.bicepparam`
- `infra/parameters/prod.bicepparam`  
Env-var override path (`LOCATION_LAT` / `LOCATION_LON`) preserved for portability.  
**Status:** ✅ DONE

---

## 3. ARCTIC® MKS Hardware Findings

**From:** Fuchs (ARCTIC® MKS Hardware & Systems Expert)  
**To:** Team (MacReady, Bennings, Norris)  
**Date:** 2026-04-17  
**Status:** Findings finalized; decisions integrated above

### Finding 1: Power Switching via Kasa EP40 is Validated ✅
The MKS-1 uses **mechanical photocell** architecture. When external power restored, photocell re-evaluates ambient light and activates if dark. TP-Link Kasa EP40 → IFTTT Webhooks approach is appropriate.

### Finding 2: Debounce Minimum — 10 Min Borderline, 15 Min Hardware-Safe ✅
Thermal system requires 10–15 minutes to stabilize. Current 10-minute debounce at minimum boundary; 15 minutes is safer. **IMPLEMENTED** (see Threshold Fixes 2.1).

### Finding 3: Rain Exclusion is Non-Negotiable 🚫 ✅
MKS-1 not weatherproof. Aluminum body provides minimal water protection. Current `precipProb < 30%` insufficient — real rule: don't run if actively raining. **IMPLEMENTED** (see Threshold Fixes 2.2).

### Finding 4: Wind Threshold is Correct ✅
High wind disperses CO2 plume and heat signature. Current `wind < 12 mph` default well-supported by device physics. No change needed.

### Finding 5: CO2 Tank is Hidden Failure Mode 🔋
MKS-1 requires 9 kg (20 lb) CO2 tank (not included). Tank lasts ~3 weeks under continuous nightly operation during peak season. CO2 accounts for bulk of effectiveness. Empty tank = ~30–40% effectiveness (heat only). **Note:** No CO2 level sensor integration possible; Kevin tracks manually. Team should consider maintenance reminder feature.

### Finding 6: Run Window (18:00–06:00) is Correct ✅
Device's photocell triggers dusk-on, dawn-off. 18:00 start provides 30–60 min warm-up before true dusk. 06:00 end clears dawn in all seasons. **Note:** EXTENDED to 16:00–08:00 per Norris Arlington analysis (see Decision 1).

### Team Questions Addressed
1. ✅ **Current precipitation:** Bennings confirmed `currentlyRaining` field now part of weather evaluation (hard stop, not probability gate).
2. ✅ **Debounce configurable:** Yes, via environment variable without redeploy (now 15 min default).
3. ✅ **50°F alignment:** Confirmed — temperature floor aligns with both mosquito biology and ARCTIC MKS hardware operating floor.

---

## 4. Bicep Infrastructure Validation Complete

**Owner:** Blair  
**Date:** 2026-04-17  
**Status:** ✅ RESOLVED

### Issues Resolved

#### 1. RBAC Scope Assignment Error (CRITICAL) ✅
**Error:** BCP036 — "scope" expected resource | tenant but got string  
**Location:** functionapp.bicep lines 157, 168  
**Resolution:** Created `infra/modules/rbac.bicep` with `targetScope = 'subscription'`. Moved RBAC role assignments there. Updated main.bicep to invoke at subscription scope.

#### 2. Output Security Warning ✅
**Warning:** outputs-should-not-contain-secrets in storage.bicep line 57  
**Resolution:** Added `@secure()` decorator to `storageConnectionString` output.

#### 3. Unused Parameters ✅
**Removed:** appInsightsName (alerts.bicep), storageAccountName & keyVaultId (functionapp.bicep). Updated main.bicep calls.

### Validation Results
**Exit Code:** 0 (SUCCESS)

**Remaining Warnings (Expected/Acceptable):**
- BCP073 in rbac.bicep: Read-only property quirk; ARM template generates correctly
- use-resource-symbol-reference in storage.bicep: Must use listKeys() for connection string

### Infrastructure Architecture
```
Resource Group (main.bicep scope)
├── Managed Identity (identity.bicep)
├── Storage Account + Tables (storage.bicep)
├── Log Analytics Workspace (loganalytics.bicep)
├── Application Insights (appinsights.bicep)
├── Key Vault (keyvault.bicep)
├── Function App + App Service Plan (functionapp.bicep)
├── Static Web App (staticwebapp.bicep)
├── Alert Rules (alerts.bicep)
└── RBAC Assignments (rbac.bicep — subscription scope)
```

**RBAC Assignments:**
- Key Vault Secrets User: Function App Managed Identity → Key Vault
- Storage Table Data Contributor: Function App Managed Identity → Storage Account

---

## 5. User Directive — Trap Location

**By:** Kevin (via Copilot)  
**Date:** 2026-04-17T18:54:39Z  
**What:** ARCTIC® MKS located at North Quintana St, Arlington, Virginia 22205. Coordinates: lat=38.8816, lon=-77.1311.  
**Why:** User provided exact physical location of device.  
**Action:** ✅ All location-sensitive logic (weather, mosquito thresholds, run windows) calibrated for Northern Virginia (implemented by Bennings; see Decision 2.3).

---

## 6. Integration Review — Critical & Warning Findings

**Author:** MacReady (Lead & Architect)  
**Date:** 2026-04-17  
**Scope:** Full cross-domain integration review

### 🔴 Critical Issues (will break at runtime)

#### 1. Frontend SystemHealth type mismatch
**Files:** `src/web/src/types/index.ts`, `src/shared/types.ts`  
**Issue:** Field names don't match between backend and frontend. System health timestamps will always show "—".  
**Status:** Pending frontend fix (not in scope of current implementation phase)

#### 2. functions-deploy.yml operates in wrong directory
**File:** `.github/workflows/functions-deploy.yml`  
**Issue:** Uses `working-directory: src/functions` but no package.json there; actual package.json at repo root.  
**Status:** Pending workflow fix (not in scope of current implementation phase)

#### 3. Missing keyVaultReferenceIdentity
**File:** `infra/modules/functionapp.bicep`  
**Issue:** Key Vault references won't resolve; env vars contain literal strings.  
**Status:** Pending Bicep fix (not in scope of current implementation phase)

#### 4. No SWA → Function App linked backend
**Files:** `infra/modules/staticwebapp.bicep`, `src/web/src/api/client.ts`  
**Issue:** API calls to `/api/*` will return 404.  
**Status:** Pending backend link configuration (not in scope of current implementation phase)

#### 5. Heartbeat alert queries wrong telemetry type
**Files:** `infra/modules/alerts.bicep`, `src/shared/evaluation.ts`  
**Issue:** Alert queries `customEvents` but code logs via `console.log()` → `traces`. Alert perpetually fires.  
**Status:** Pending alert query or instrumentation fix (not in scope of current implementation phase)

### 🟡 Warnings
(7 warnings documented; see MacReady review for priorities)

**Note:** Critical and warning findings are tracked separately for triage and remediation scheduling. Arlington threshold implementation above does not address these systemic issues but is compatible with their eventual resolution.

---

## 7. Deployment Runbook & Gotchas — Blair

**Author:** Blair  
**Date:** 2026-04-17  
**Deliverable:** `DEPLOY.md` (repo root)  
**Status:** ✅ COMPLETE

### Phase Summary

9-phase deployment procedure:
1. Pre-Deploy Validation & Checklist
2. Azure Infrastructure (Bicep) Provisioning
3. GitHub Secrets & OIDC Configuration
4. Key Vault Post-Deploy Secret Setup
5. Function App Deployment
6. SWA Frontend Deployment
7. SWA Entra/CORS Configuration
8. Post-Deploy Smoke Tests
9. Cutover & Monitoring Setup

### Critical Gotchas

#### 1. TENANT_ID Placeholder Not Auto-Resolved ⚠️
**File:** `src/web/staticwebapp.config.json`  
**Issue:** Contains literal string `{TENANT_ID}` in Entra issuer URL. SWA does not auto-substitute via environment variables.  
**Solution:** Add CI substitution step (sed/PowerShell) in `swa-deploy.yml` to replace `{TENANT_ID}` using `AZURE_TENANT_ID` secret before deployment. Avoids storing tenant ID in source control.

#### 2. AZURE_CLIENT_ID Name Collision ⚠️
**Context Mismatch:**
- **GitHub Secret `AZURE_CLIENT_ID`** = `skeeter-switch-github-actions` SP App ID (for OIDC token exchange)
- **SWA App Setting `AZURE_CLIENT_ID`** = `skeeter-switch` Entra app registration client ID (for end-user browser auth)

These are **different values**. Runbook explicitly maps both to prevent configuration errors.

#### 3. AZURE_ALLOWED_ORIGINS Not Managed by Bicep ⚠️
**File:** `src/shared/cors.ts` (reads setting) vs. `infra/modules/functionapp.bicep` (does not define)  
**Issue:** CORS allowed origins set based on SWA hostname, which only exists after infrastructure is deployed. Cannot be hardcoded pre-deploy.  
**Solution:** Manual post-deploy step OR extend `functionapp.bicep` in future iteration to accept origin parameter.

#### 4. rbac.bicep Subscription-Scope May Require SP Escalation ⚠️
**File:** `infra/modules/rbac.bicep` (uses `targetScope = 'subscription'`)  
**Issue:** Deploying subscription-scoped module from resource-group template requires SP permission to create `Microsoft.Resources/deployments` at subscription scope. Current OIDC-SETUP permissions (User Access Administrator at RG) may be insufficient.  
**Mitigation:** Runbook includes escalation command; validate SP permissions before Phase 2 production run.

#### 5. Key Vault Placeholder Secrets ⚠️
**Files:** `infra/modules/keyvault.bicep`  
**Issue:** `ifttt-key` and `azure-maps-subscription-key` initialized with value `PLACEHOLDER-UPDATE-AFTER-DEPLOYMENT`. Function App starts but webhooks and weather API calls fail until updated.  
**Handling:** Explicit Phase 4 step with manual update commands provided.

#### 6. dryRun=false in Prod Intentional ✓
`infra/parameters/prod.bicepparam` sets `dryRun = false`. This is correct — production should fire real IFTTT webhooks. Runbook explicitly flags for Kevin confirmation.

#### 7. SWA Deployment Token Sequencing ✓
`AZURE_STATIC_WEB_APPS_API_TOKEN` only exists after SWA resource created by Bicep. Runbook correctly sequences Phase 3 (infra) → Phase 5.4 (SWA deploy) to obtain token from infra outputs.

