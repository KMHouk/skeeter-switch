# Project Context

- **Owner:** Kevin
- **Project:** skeeter-switch — Arctic Mosquito Killing System controller
- **Stack:** Azure Bicep, Managed Identity, RBAC, Key Vault, Application Insights, Static Web Apps, Function App, Table Storage
- **Created:** 2026-04-17

## What I'm Responsible For

All Bicep templates under /infra: Resource Group, Storage Account (Table Storage), Function App (Consumption plan), Key Vault, Application Insights, Static Web App. Managed Identity + RBAC (Key Vault Secrets User). App settings wiring. Alert rules: error count > 0/15min, webhook failures > 2/30min, heartbeat missing/15min. Dev/prod parameter separation.

Key principle: principle of least privilege on every RBAC assignment. No access keys when Managed Identity is available.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-17: Bicep Infrastructure Created

**Files created:**
- `infra/main.bicep` - Main orchestration template with module composition
- `infra/modules/identity.bicep` - User-assigned Managed Identity
- `infra/modules/storage.bicep` - Storage Account (Standard_LRS) with Tables: SwitchState, Overrides, Config, EventLog
- `infra/modules/loganalytics.bicep` - Log Analytics Workspace (PerGB2018, 30-day retention)
- `infra/modules/appinsights.bicep` - Application Insights (workspace-based)
- `infra/modules/keyvault.bicep` - Key Vault (RBAC model, soft-delete, purge protection enabled)
- `infra/modules/functionapp.bicep` - Function App (Y1 Consumption, Node.js 20, Linux) + App Service Plan + RBAC assignments
- `infra/modules/staticwebapp.bicep` - Static Web App (Standard tier for custom auth)
- `infra/modules/alerts.bicep` - Three alert rules: error count, webhook failures, heartbeat missing
- `infra/parameters/dev.bicepparam` - Dev environment parameters (dryRun=true)
- `infra/parameters/prod.bicepparam` - Prod environment parameters (dryRun=false)

**Resource naming convention:** `${appName}-${environment}-${resourceType}-${uniqueSuffix}` where uniqueSuffix = uniqueString(resourceGroup().id, appName, environment). For globally unique names (Storage, Key Vault), dashes removed from prefix.

**RBAC role GUIDs used:**
- Key Vault Secrets User: `4633458b-17de-408a-b874-0445c86b69e6`
- Storage Table Data Contributor: `0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3`

**Key Vault secret references in app settings:** `@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/{secret-name}/)`

**API versions:** Microsoft.ManagedIdentity@2023-01-31, Microsoft.Storage@2023-01-01, Microsoft.OperationalInsights@2023-09-01, Microsoft.Insights/components@2020-02-02, Microsoft.KeyVault@2023-07-01, Microsoft.Web@2023-01-01, Microsoft.Authorization@2022-04-01

### 2026-04-17: Deployment Runbook Written (DEPLOY.md)

**File created:** `DEPLOY.md` — 9-phase sequential deployment runbook for Kevin

**Phases covered:**
1. Azure Prerequisites (resource groups, provider registration)
2. GitHub OIDC Setup (app registration, federated credentials, RBAC, environments, secrets)
3. Bicep infrastructure deploy via `infra-deploy.yml` + output capture
4. Key Vault secret injection (`ifttt-key`, `azure-maps-subscription-key`)
5. SWA Entra auth setup (separate app registration + `{TENANT_ID}` placeholder fix + SWA app settings)
6. Function + SWA code deploy + `AZURE_ALLOWED_ORIGINS` configuration
7. Post-deploy verification (smoke tests, auth flow, App Insights)
8. IFTTT applet creation (`skeeter_switch_on`, `skeeter_switch_off`)
9. Conditional Access MFA policy

**Gotchas documented:**
- `rbac.bicep` runs at subscription scope — deploying SP needs User Access Administrator (escalate to subscription scope if RG scope isn't enough)
- `{TENANT_ID}` in `staticwebapp.config.json` is a literal placeholder — NOT auto-substituted by Azure; must be replaced before SWA deploy or configured via portal
- `AZURE_CLIENT_ID` means different things in two contexts: GitHub env secret (= skeeter-switch-github-actions SP) vs SWA app setting (= skeeter-switch Entra app for auth)
- `AZURE_ALLOWED_ORIGINS` is not in Bicep — must be set manually post-deploy to the SWA hostname
- `dryRun=false` in prod.bicepparam is correct and intentional
- `AZURE_FUNCTION_APP_NAME` and `AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub secrets can only be set AFTER infra deploys

### 2026-04-17: Bicep Validation & Fixes

**Validation Status:** ✅ PASSING (exit code 0)

**Issues Found & Fixed:**
1. ❌ **CRITICAL BCP036** - RBAC scope assignment errors in functionapp.bicep (lines 157, 168)
   - **Root cause:** Trying to assign resource IDs as strings to `scope` property at resourceGroup scope
   - **Fix:** Created new `infra/modules/rbac.bicep` module with `targetScope = 'subscription'` to handle RBAC assignments. Moved Key Vault Secrets User and Storage Table Data Contributor role assignments there. Updated main.bicep to call rbac module.

2. ⚠️ **Output Security Warning** - storage.bicep output containing secrets (listKeys)
   - **Fix:** Added `@secure()` decorator to storageConnectionString output

3. ⚠️ **Unused Parameter** - alerts.bicep had unused `appInsightsName` parameter
   - **Fix:** Removed unused parameter from alerts.bicep and updated main.bicep call site

4. ⚠️ **Unused Parameters** - functionapp.bicep had `storageAccountName` and `keyVaultId` (no longer needed after RBAC move)
   - **Fix:** Removed from module params and updated main.bicep call site

**Files Created:**
- `infra/modules/rbac.bicep` - Subscription-scoped RBAC assignments for Key Vault Secrets User and Storage Table Data Contributor

**Remaining Warnings (Expected):**
- BCP073 in rbac.bicep: "scope" property read-only warning for roleAssignments (this is a Bicep type definition issue; ARM template is correct)
- use-resource-symbol-reference in storage.bicep: Must use listKeys() for connection string generation

**Manual Review Checklist (PASSED):**
- ✅ main.bicep imports all modules with correct relative paths (identity, storage, loganalytics, appinsights, keyvault, functionapp, staticwebapp, alerts, rbac)
- ✅ Module parameter names match what main.bicep passes (all validated after fixes)
- ✅ All module outputs referenced correctly in main.bicep
- ✅ Parameter files reference `using '../main.bicep'` correctly (dev.bicepparam, prod.bicepparam)
- ✅ API versions current (2023-* for most, 2022-04-01 for RBAC, 2020-02-02 for App Insights)
- ✅ Key Vault reference syntax correct: `@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/{secret-name}/)`
- ✅ Function App wires Managed Identity correctly with UserAssigned type
- ✅ RBAC assignments use least privilege: only Key Vault Secrets User + Storage Table Data Contributor (no higher roles)

### 2026-04-19: IFTTT → TP-Link Kasa Credential Migration

**Context:** Replaced IFTTT webhook integration with direct TP-Link Kasa cloud API for switch control. Infrastructure changes to support new authentication model.

**Files Modified:**
- `infra/modules/keyvault.bicep` — Removed `ifttt-key` secret; added `tplink-username` and `tplink-password` secrets (both with PLACEHOLDER values)
- `infra/modules/functionapp.bicep` — Removed params: `iftttEventOn`, `iftttEventOff`; added param: `kasaDeviceAlias` (default: 'skeeter-switch')
- `infra/modules/functionapp.bicep` — Removed app settings: `IFTTT_KEY`, `IFTTT_EVENT_ON`, `IFTTT_EVENT_OFF`; added: `TPLINK_USERNAME`, `TPLINK_PASSWORD` (Key Vault refs), `KASA_DEVICE_ALIAS` (plain value)
- `infra/main.bicep` — Removed params: `iftttEventOn`, `iftttEventOff`; added param: `kasaDeviceAlias`
- `infra/parameters/dev.bicepparam` — Replaced IFTTT params with `kasaDeviceAlias = 'skeeter-switch'`
- `infra/parameters/prod.bicepparam` — Replaced IFTTT params with `kasaDeviceAlias = 'skeeter-switch'`

**Validation Status:** ✅ PASSING (`az bicep build --file infra/main.bicep` exit code 0)
- Expected warnings unchanged: BCP073 (rbac.bicep scope), BCP334 (storage.bicep), use-resource-symbol-reference (storage.bicep)

**Post-Deployment Action Required:**
- Run `az keyvault secret set --vault-name <vault> --name tplink-username --value <email>` to populate TP-Link account email
- Run `az keyvault secret set --vault-name <vault> --name tplink-password --value <password>` to populate TP-Link account password
- Device alias can be overridden at deploy time via parameter file or `--parameters kasaDeviceAlias='<name>'`

**Key Vault Secret Migration:**
- REMOVED: `ifttt-key` (single webhook key)
- ADDED: `tplink-username`, `tplink-password` (account credentials for TP-Link Kasa cloud API)

**App Settings Pattern:**
- All credentials remain Key Vault references: `@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/{secret-name}/)`
- Device alias is plain value (not sensitive), configurable via parameter with secure default
- Follows principle of least privilege: only secrets that need rotation live in Key Vault

**Git Commit:** e38cf79 "infra: replace IFTTT secrets with TP-Link Kasa credentials in Bicep"
