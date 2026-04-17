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
