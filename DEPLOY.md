# skeeter-switch — Deployment Runbook

> One-time setup + ongoing deploy instructions for the skeeter-switch Azure production system.
> Location: North Quintana St, Arlington VA 22205 | Time zone: America/New_York

## Prerequisites

- [ ] Azure CLI installed and authenticated (`az login`)
- [ ] GitHub CLI installed and authenticated (`gh auth login`)
- [ ] Node.js 18+ installed
- [ ] Access to the skeeter-switch GitHub repo with **Admin** rights
- [ ] An Azure subscription with **Owner** access (Owner required for subscription-level RBAC; Contributor alone is insufficient — see Phase 2)
- [ ] A TP-Link Kasa account (dedicated service account recommended) with the EP40 smart plug added and named/aliased

---

## Phase 1: Azure Prerequisites (one-time)

### 1.1 Create Resource Groups

```bash
az group create --name skeeter-switch-dev-rg  --location centralus
az group create --name skeeter-switch-prod-rg --location centralus
```

### 1.2 Register Required Resource Providers

These are usually already registered in active subscriptions. Verify with:

```bash
az provider show --namespace Microsoft.Web                  --query "registrationState"
az provider show --namespace Microsoft.Storage              --query "registrationState"
az provider show --namespace Microsoft.KeyVault             --query "registrationState"
az provider show --namespace Microsoft.Insights             --query "registrationState"
az provider show --namespace Microsoft.OperationalInsights  --query "registrationState"
az provider show --namespace Microsoft.ManagedIdentity      --query "registrationState"
az provider show --namespace Microsoft.Maps                 --query "registrationState"
```

If any returns `"NotRegistered"`, register it:

```bash
az provider register --namespace Microsoft.Maps   # example
```

---

## Phase 2: GitHub OIDC Setup (one-time)

> Full reference: `.github/OIDC-SETUP.md`. The steps below are the authoritative version with corrections.

### 2.1 Create Entra App Registration

```bash
APP_NAME="skeeter-switch-github-actions"
az ad app create --display-name "$APP_NAME"

APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
echo "App ID: $APP_ID"

az ad sp create --id "$APP_ID"
SP_OBJECT_ID=$(az ad sp show --id "$APP_ID" --query "id" -o tsv)
echo "SP Object ID: $SP_OBJECT_ID"
```

Save `$APP_ID` and `$SP_OBJECT_ID` — you'll use them throughout this phase.

### 2.2 Add Federated Credentials for GitHub Actions

Three credentials are required — one for the main branch (auto-deploys) and one per environment:

```bash
# Main branch credential
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "skeeter-switch-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:KMHouk/skeeter-switch:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Dev environment credential
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "skeeter-switch-dev",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:KMHouk/skeeter-switch:environment:dev",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Prod environment credential
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "skeeter-switch-prod",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:KMHouk/skeeter-switch:environment:prod",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

> **Subject strings must match exactly.** `environment:dev` means the workflow job uses `environment: dev` in its YAML.

### 2.3 Assign Azure RBAC to the App Registration

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Subscription: $SUBSCRIPTION_ID | Tenant: $TENANT_ID"
```

Assign **Contributor** and **User Access Administrator** on each resource group:

```bash
for ENV in dev prod; do
  RG="skeeter-switch-${ENV}-rg"

  az role assignment create \
    --role "Contributor" \
    --assignee "$SP_OBJECT_ID" \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG"

  az role assignment create \
    --role "User Access Administrator" \
    --assignee "$SP_OBJECT_ID" \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG"
done
```

> ⚠️ **Why User Access Administrator is required:** `infra/modules/rbac.bicep` runs at subscription scope to assign the Managed Identity the `Key Vault Secrets User` and `Storage Table Data Contributor` roles. The deploying principal must be able to create role assignments on the Key Vault and Storage resources. User Access Administrator at the resource group level grants this.
>
> If the Bicep deploy fails with a permission error related to role assignments, escalate to subscription-scope User Access Administrator as a fallback.

### 2.4 Create GitHub Environments

```bash
# Using GitHub CLI to create environments (or do this in the portal: Settings → Environments → New environment)
gh api --method PUT repos/KMHouk/skeeter-switch/environments/dev
gh api --method PUT repos/KMHouk/skeeter-switch/environments/prod
```

**Configure the `prod` environment with a required reviewer:**

GitHub.com → Repository → **Settings** → **Environments** → **prod** → **Required reviewers** → add your GitHub username → **Save protection rules**

### 2.5 Add GitHub Environment Secrets

Set the following secrets for **both** `dev` and `prod` environments. The values are the same except for `AZURE_RESOURCE_GROUP`:

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
APP_ID=$(az ad app list --display-name "skeeter-switch-github-actions" --query "[0].appId" -o tsv)

# Dev environment secrets
gh secret set AZURE_CLIENT_ID        --env dev --body "$APP_ID"
gh secret set AZURE_TENANT_ID        --env dev --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID  --env dev --body "$SUBSCRIPTION_ID"
gh secret set AZURE_RESOURCE_GROUP   --env dev --body "skeeter-switch-dev-rg"

# Prod environment secrets
gh secret set AZURE_CLIENT_ID        --env prod --body "$APP_ID"
gh secret set AZURE_TENANT_ID        --env prod --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID  --env prod --body "$SUBSCRIPTION_ID"
gh secret set AZURE_RESOURCE_GROUP   --env prod --body "skeeter-switch-prod-rg"
```

> `AZURE_FUNCTION_APP_NAME` and `AZURE_STATIC_WEB_APPS_API_TOKEN` are added in Phase 3 after infra deploys.

---

## Phase 3: Deploy Infrastructure (Bicep)

### 3.1 Run the infra-deploy Workflow

Deploy **dev first**. Fix any issues before deploying prod.

```bash
# Trigger via GitHub CLI
gh workflow run infra-deploy.yml --field environment=dev

# Watch it
gh run watch
```

Or via portal: GitHub.com → **Actions** → **Deploy Infrastructure** → **Run workflow** → select `dev` → **Run workflow**

Once dev is confirmed working, deploy prod:

```bash
gh workflow run infra-deploy.yml --field environment=prod
```

> ⚠️ **Confirm `dryRun` before deploying prod:** `infra/parameters/prod.bicepparam` sets `dryRun = false`. This means live TP-Link Kasa API calls will fire in production. This is **intentional and correct** — verify it is what you want before clicking Run.

**CLI equivalent (bypasses workflow, useful for debugging):**

```bash
# Dev — validate first
az deployment group validate \
  --resource-group skeeter-switch-dev-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam

# Dev — deploy
az deployment group create \
  --resource-group skeeter-switch-dev-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam \
  --query "properties.outputs" \
  --output json
```

### 3.2 Capture Deployment Outputs

```bash
ENV=dev   # or prod

az deployment group show \
  --resource-group "skeeter-switch-${ENV}-rg" \
  --name "main" \
  --query "properties.outputs" \
  --output json
```

Note the following output values for later steps:

| Output key | What it is | Used in |
|---|---|---|
| `functionAppName.value` | Function App resource name | Phase 3.3, Phase 6 |
| `functionAppHostName.value` | `*.azurewebsites.net` hostname | Phase 6.3 (AZURE_ALLOWED_ORIGINS) |
| `staticWebAppName.value` | SWA resource name | Phase 5 |
| `staticWebAppDefaultHostname.value` | `*.azurestaticapps.net` hostname | Phase 5, 6.3 |
| `keyVaultName.value` | Key Vault name (no dashes) | Phase 4 |
| `keyVaultUri.value` | `https://*.vault.azure.net/` | Reference only |

**Resource name patterns** (useful for predicting before deploy):

- Function App: `skeeter-switch-{env}-func-{uniqueSuffix}`
- Key Vault: `skeeterswitch{env}{uniqueSuffix}` (dashes stripped — stays ≤24 chars)
- Static Web App: `skeeter-switch-{env}-swa`

Where `uniqueSuffix = uniqueString(resourceGroup().id, "skeeter-switch", "{env}")` — a deterministic 13-char hex string.

### 3.3 Add Remaining GitHub Environment Secrets

After infra deploys, add the Function App name secret to each environment:

```bash
# Get function app names from outputs
DEV_FA=$(az deployment group show -g skeeter-switch-dev-rg --name main \
  --query "properties.outputs.functionAppName.value" -o tsv)
PROD_FA=$(az deployment group show -g skeeter-switch-prod-rg --name main \
  --query "properties.outputs.functionAppName.value" -o tsv)

gh secret set AZURE_FUNCTION_APP_NAME --env dev  --body "$DEV_FA"
gh secret set AZURE_FUNCTION_APP_NAME --env prod --body "$PROD_FA"
```

`AZURE_STATIC_WEB_APPS_API_TOKEN` is added in Phase 5 after SWA authentication is configured.

---

## Phase 4: Configure Key Vault Secrets

The Bicep templates create the Key Vault with **placeholder values**. You must replace them with real secrets.

### 4.1 Add TP-Link Credentials

1. Get your TP-Link service account email and password.

```bash
KEYVAULT_NAME=$(az deployment group show -g skeeter-switch-dev-rg --name main \
  --query "properties.outputs.keyVaultName.value" -o tsv)

az keyvault secret set \
  --vault-name "$KEYVAULT_NAME" \
  --name "tplink-username" \
  --value "<your-tplink-service-account-email>"

az keyvault secret set \
  --vault-name "$KEYVAULT_NAME" \
  --name "tplink-password" \
  --value "<your-tplink-service-account-password>"
```

Repeat for prod:

```bash
KEYVAULT_NAME=$(az deployment group show -g skeeter-switch-prod-rg --name main \
  --query "properties.outputs.keyVaultName.value" -o tsv)

az keyvault secret set \
  --vault-name "$KEYVAULT_NAME" \
  --name "tplink-username" \
  --value "<your-tplink-service-account-email>"

az keyvault secret set \
  --vault-name "$KEYVAULT_NAME" \
  --name "tplink-password" \
  --value "<your-tplink-service-account-password>"
```

### 4.2 Add Azure Maps Subscription Key

1. **Azure Portal** → **Azure Maps accounts** → create an account (if you don't have one) in the same subscription → **Settings** → **Authentication** → copy the **Primary Key**.

```bash
az keyvault secret set \
  --vault-name "$KEYVAULT_NAME" \
  --name "azure-maps-subscription-key" \
  --value "<your-azure-maps-primary-key>"
```

> **Secret names are case-sensitive.** The Function App's app settings reference these exact names:
> - `tplink-username` → read via `TPLINK_USERNAME` app setting
> - `tplink-password` → read via `TPLINK_PASSWORD` app setting
> - `azure-maps-subscription-key` → read via `AZURE_MAPS_SUBSCRIPTION_KEY` app setting

### 4.3 Verify Managed Identity Can Read Secrets

After the Function App is deployed (Phase 6), verify Key Vault references resolve:

**Azure Portal** → **App Services** → `skeeter-switch-{env}-func-{suffix}` → **Configuration** → **Application settings**

Check that `TPLINK_USERNAME`, `TPLINK_PASSWORD`, and `AZURE_MAPS_SUBSCRIPTION_KEY` show a green checkmark (Key Vault reference resolved), not `Key Vault reference is not set correctly`.

If they show an error:
1. Verify the Managed Identity has the `Key Vault Secrets User` role: **Azure Portal** → Key Vault → **Access control (IAM)** → **Role assignments** → confirm the identity `skeeter-switch-{env}-identity` appears with role `Key Vault Secrets User`
2. Verify the secret names match exactly (no extra spaces/caps)

---

## Phase 5: Configure Static Web App Authentication

The `staticwebapp.config.json` configures Entra ID auth with two placeholders (`{TENANT_ID}` and `AZURE_CLIENT_ID` app setting). These must be set before auth will work.

### 5.1 Register the SWA App in Entra ID

This is a **separate** app registration from `skeeter-switch-github-actions`. This one represents the web app itself.

**Azure Portal** → **Microsoft Entra ID** → **App registrations** → **New registration**

| Field | Value |
|---|---|
| Name | `skeeter-switch` |
| Supported account types | Accounts in this organizational directory only (Single tenant) |
| Redirect URI — Platform | **Web** |
| Redirect URI — Value | `https://<your-swa-hostname>/.auth/login/aad/callback` |

Where `<your-swa-hostname>` is `staticWebAppDefaultHostname.value` from Phase 3.2 (e.g., `lively-wave-0abc1234.azurestaticapps.net`).

Click **Register**. Note:
- **Application (client) ID** → this is `SWA_CLIENT_ID`
- **Directory (tenant) ID** → this is `TENANT_ID`

Create a client secret:
**Certificates & secrets** → **New client secret** → Description: `swa-auth` → Expires: 24 months → **Add**

Copy the **Value** immediately (shown only once) → this is `SWA_CLIENT_SECRET`

### 5.2 Patch the `{TENANT_ID}` Placeholder

The file `src/web/staticwebapp.config.json` contains a literal `{TENANT_ID}` placeholder in the `openIdIssuer` URL that Azure does **not** auto-substitute. You must replace it before the SWA deploy:

```bash
# On Windows (PowerShell):
$tenantId = az account show --query tenantId -o tsv
(Get-Content src\web\staticwebapp.config.json) `
  -replace '\{TENANT_ID\}', $tenantId `
  | Set-Content src\web\staticwebapp.config.json
```

```bash
# On Linux/macOS:
TENANT_ID=$(az account show --query tenantId -o tsv)
sed -i "s/{TENANT_ID}/$TENANT_ID/g" src/web/staticwebapp.config.json
```

> ⚠️ **Do not commit the modified file with a real tenant ID** unless you are comfortable with it being public. Consider using a CI/CD substitution step or the SWA portal configuration instead (see note below).
>
> **Alternative (portal-only):** Skip the file edit and configure Entra auth entirely via:
> **Azure Portal** → **Static Web Apps** → `skeeter-switch-{env}-swa` → **Settings** → **Authentication** → **Add** → **Azure Active Directory** → provide Client ID and Tenant ID → **Save**. This portal configuration takes precedence over `staticwebapp.config.json`.

### 5.3 Set SWA Application Settings

The `staticwebapp.config.json` references two application settings by name. Set them on the SWA resource:

```bash
SWA_NAME=$(az deployment group show -g skeeter-switch-dev-rg --name main \
  --query "properties.outputs.staticWebAppName.value" -o tsv)

az staticwebapp appsettings set \
  --name "$SWA_NAME" \
  --resource-group skeeter-switch-dev-rg \
  --setting-names \
    AZURE_CLIENT_ID="<SWA_CLIENT_ID from 5.1>" \
    AZURE_CLIENT_SECRET="<SWA_CLIENT_SECRET from 5.1>"
```

> These are **SWA application settings** — separate from the GitHub Actions secrets with the same names. The SWA's `AZURE_CLIENT_ID` is the skeeter-switch Entra app; the GitHub secret is the skeeter-switch-github-actions service principal.

### 5.4 Get the SWA Deployment Token

```bash
az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group skeeter-switch-dev-rg \
  --query "properties.apiKey" -o tsv
```

Add to GitHub:

```bash
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --env dev  --body "<token>"
# repeat for prod SWA
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --env prod --body "<prod-token>"
```

### 5.5 Verify `/.auth/login/aad` Works

After SWA is deployed (Phase 6), navigate to `https://<swa-hostname>/.auth/login/aad` — you should be redirected to the Microsoft login page and land back at the app after sign-in.

If it redirects to an error page: check that the redirect URI in the app registration exactly matches `https://<swa-hostname>/.auth/login/aad/callback`.

---

## Phase 6: Deploy Functions + SWA

### 6.1 Run functions-deploy Workflow

```bash
gh workflow run functions-deploy.yml --field environment=dev
gh run watch
```

For prod (after dev succeeds):

```bash
gh workflow run functions-deploy.yml --field environment=prod
```

> The workflow runs `deploy-dev` first, then `deploy-prod` — prod waits for dev to succeed and requires the GitHub Environment approval.

### 6.2 Run swa-deploy Workflow

```bash
gh workflow run swa-deploy.yml --field environment=dev
gh run watch
```

For prod:

```bash
gh workflow run swa-deploy.yml --field environment=prod
```

### 6.3 Set `AZURE_ALLOWED_ORIGINS` in Function App Settings

The Function App's CORS middleware (`src/shared/cors.ts`) reads the `AZURE_ALLOWED_ORIGINS` environment variable. Without this setting, the Function App defaults to `http://localhost:4280` and will reject requests from the SWA in production.

Get the SWA hostname, then set the app setting:

```bash
ENV=dev  # repeat for prod

SWA_HOSTNAME=$(az deployment group show -g "skeeter-switch-${ENV}-rg" --name main \
  --query "properties.outputs.staticWebAppDefaultHostname.value" -o tsv)
FA_NAME=$(az deployment group show -g "skeeter-switch-${ENV}-rg" --name main \
  --query "properties.outputs.functionAppName.value" -o tsv)

az functionapp config appsettings set \
  --resource-group "skeeter-switch-${ENV}-rg" \
  --name "$FA_NAME" \
  --settings "AZURE_ALLOWED_ORIGINS=https://${SWA_HOSTNAME}"
```

**Portal path:** **Azure Portal** → **App Services** → `skeeter-switch-{env}-func-{suffix}` → **Configuration** → **Application settings** → **New application setting** → Name: `AZURE_ALLOWED_ORIGINS` / Value: `https://<swa-hostname>.azurestaticapps.net` → **Save** → **Continue**

> The Function App restarts automatically after saving. Wait ~30 seconds before testing.

---

## Phase 7: Post-Deploy Verification

### 7.1 Smoke Test Checklist

Run these after each full deploy (dev first, then prod):

```bash
ENV=dev
FA_HOST=$(az deployment group show -g "skeeter-switch-${ENV}-rg" --name main \
  --query "properties.outputs.functionAppHostName.value" -o tsv)

# Health check (unauthenticated — expects 401 from Function App auth middleware)
curl -I "https://${FA_HOST}/api/status"
# Expected: 401 Unauthorized (auth middleware is working)

# Verify Function App is running
az functionapp show \
  --resource-group "skeeter-switch-${ENV}-rg" \
  --name "<function-app-name>" \
  --query "state" -o tsv
# Expected: Running
```

### 7.2 Verify Auth Flow

1. Open `https://<swa-hostname>.azurestaticapps.net` in a browser
2. You should be redirected to `/login` → then Microsoft login page
3. Sign in with your Microsoft account
4. You should land on the dashboard (not a 401/403 page)
5. Visit `https://<swa-hostname>/.auth/me` — confirm your claims are present and `userRoles` includes `"authenticated"`

### 7.3 Trigger a Manual Evaluation and Verify Device Toggle

After auth is working, use the dashboard UI's **Force Evaluate** button or call the API:

```bash
# Via dashboard: click the "Force Evaluate" button, which calls POST /api/evaluate

# Or via API (requires auth token from SWA)
# The backend will attempt to toggle the Kasa device if decision logic says to do so
```

**Verify TP-Link API communication:**

Use `POST /api/command` with a manual override to test the device toggle (requires auth):

```bash
# Request body: { "state": "on" }
# This calls toggleDevice('on', 'skeeter-switch', false) directly

# Check Application Insights logs for the TP-Link API response
```

**Azure Portal** → **Application Insights** → `skeeter-switch-{env}-appinsights` → **Logs** → run:

```kusto
traces
| where timestamp > ago(5m)
| where message contains "kasa" or message contains "toggleDevice"
| order by timestamp desc
```

You should see TP-Link API call results (success or error details).

### 7.4 Verify TP-Link Device Response

1. Manual test: Use `POST /api/command` with `{ "state": "on" }` to turn the device on (dryRun is false in prod)
2. Watch the physical EP40 plug — it should switch on within 5–10 seconds
3. Check Application Insights for the TP-Link API response log (status code, response body)
4. Use `POST /api/command` with `{ "state": "off" }` to verify OFF command also works

### 7.4 Check Application Insights for Telemetry

- **Live Metrics**: Should show incoming requests when you interact with the app
- **Failures**: Should show 0 failures
- **Availability**: Not configured (timer-based app; not needed)

Check that the three alert rules are visible:

**Azure Portal** → **Monitor** → **Alerts** → **Alert rules** → filter by resource group `skeeter-switch-{env}-rg`

You should see:
- `skeeter-switch-{env}-func-{suffix}-error-alert` (severity 2)
- `skeeter-switch-{env}-func-{suffix}-webhook-failure-alert` (severity 1)
- `skeeter-switch-{env}-func-{suffix}-heartbeat-alert` (severity 1)

## Phase 8: TP-Link Kasa Device Verification

### 8.1 Verify Device Alias

Confirm that the device alias in the Kasa app matches the `KASA_DEVICE_ALIAS` environment variable (default: `'skeeter-switch'`):

1. Open the Kasa app and navigate to **Devices**
2. Select your EP40 smart plug
3. Tap **Edit** → check the device **Name/Alias** field
4. If it differs from `'skeeter-switch'`, either rename it in the app or update `KASA_DEVICE_ALIAS` in Function App settings (Phase 6.3 / Portal)

### 8.2 Test TP-Link API Connectivity

Use the dashboard or API to force a device toggle:

```bash
# Dashboard: Click "Force Evaluate" button, which triggers the timer logic
# Or use POST /api/command: { "state": "on" } to force device ON

# The Function App uses tplink-cloud-api to find the device by alias and toggle it
```

Monitor Application Insights for:
- `toggleDevice` trace logs — should show "kasa:on" or "kasa:off" on success
- Any error logs — TP-Link API failures, device not found, authentication failures

### 8.3 Troubleshooting TP-Link Device Connection

If the device doesn't toggle:

1. **Device not found error:** Verify the device alias in the Kasa app matches `KASA_DEVICE_ALIAS` exactly (case-sensitive)
2. **Authentication error:** Verify `tplink-username` and `tplink-password` secrets in Key Vault are correct
3. **Kasa app offline:** Open the Kasa app and confirm the EP40 is online and responsive
4. **TP-Link Cloud API unavailable:** This is an unofficial API (tplink-cloud-api npm package). Monitor the package repo for breaking changes. Fallback: deploy a local Raspberry Pi bridge (see architectural decisions)

### 8.4 Manual Test via API (Production Ready)

```bash
# Get SWA URL and auth token
SWA_HOST="<your-swa-hostname>"

# Test ON
curl -X POST "https://${SWA_HOST}/api/command" \
  -H "Content-Type: application/json" \
  -d '{"state":"on"}' \
  # Auth header added by SWA; if testing locally, use dryRun=true in dev

# Test OFF
curl -X POST "https://${SWA_HOST}/api/command" \
  -H "Content-Type: application/json" \
  -d '{"state":"off"}'
```

The EP40 should toggle on/off within ~5 seconds. Check Application Insights for the TP-Link API response.

## Phase 9: Entra Conditional Access MFA (one-time)

### 9.1 Create the Conditional Access Policy

**Azure Portal** → **Microsoft Entra ID** → **Security** → **Conditional Access** → **New policy**

Set **Name:** `skeeter-switch MFA Required`

### 9.2 Configure the Policy

**Users:**
- Include: **All users** (or a specific security group if you want to scope narrowly)
- Exclude: Your break-glass emergency account if you have one

**Target resources:**
- **Select resources** → search for `skeeter-switch` → select the **Enterprise application** object (this is the service principal for your `skeeter-switch` app registration created in Phase 5.1)
- If it doesn't appear in search: **Azure Portal** → **Enterprise applications** → search `skeeter-switch` → copy the **Object ID**, then use **Select** → paste the object ID

**Conditions:** Leave defaults (any platform, any location)

**Grant:**
- Select **Grant access**
- Check **Require multi-factor authentication**
- (Optional) Check **Require authentication strength** → select **Multifactor authentication** to enforce Authenticator app specifically
- Require: **All of the selected controls**

**Session (optional):**
- **Sign-in frequency** → Periodic reauthentication → 12 hours

### 9.3 Enable and Save

Set **Enable policy:** **On**

Click **Create**

> ⚠️ **Test first:** Before setting to **On**, set to **Report-only** and sign in once to confirm the policy targets the correct app and your account is not accidentally locked out. Switch to **On** after confirming.
>
> **Note:** MFA is enforced by Entra Conditional Access at the identity layer — the application code does not implement MFA. The SWA auth redirect handles the login; Conditional Access intercepts and requires MFA before issuing the token.

---

## Ongoing: Re-deploying After Code Changes

After initial setup is complete, subsequent deploys are automated:

### Auto-deploys (push to main)

| Changed files | Workflow triggered | Environment |
|---|---|---|
| `src/functions/**`, `src/shared/**`, `host.json`, `package.json`, `tsconfig.json` | `functions-deploy.yml` | dev |
| `src/web/**` | `swa-deploy.yml` | dev |

### Manual prod deploy

```bash
# Deploy functions to prod
gh workflow run functions-deploy.yml --field environment=prod

# Deploy SWA to prod
gh workflow run swa-deploy.yml --field environment=prod
```

### Infrastructure changes

Only run `infra-deploy.yml` when Bicep files change:

```bash
gh workflow run infra-deploy.yml --field environment=dev
# verify dev, then:
gh workflow run infra-deploy.yml --field environment=prod
```

### Monitor

GitHub.com → **Actions** tab → watch workflow runs. Failures send GitHub notifications.

---

## Troubleshooting

### OIDC token exchange fails (`AADSTS70021`)

The federated credential subject doesn't match. Verify the exact string:

- For branch-triggered workflows: `repo:KMHouk/skeeter-switch:ref:refs/heads/main`
- For environment-scoped jobs: `repo:KMHouk/skeeter-switch:environment:dev`

Check with: `az ad app federated-credential list --id <APP_ID>`

### Bicep deployment fails: "The scope 'subscription' is not valid"

The GitHub Actions SP may lack permission to create the subscription-level nested deployment (from `rbac.bicep`). Escalate to subscription scope:

```bash
az role assignment create \
  --role "User Access Administrator" \
  --assignee "$SP_OBJECT_ID" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"
```

### Key Vault references not resolving (yellow/red exclamation in App Settings)

1. Confirm Managed Identity has `Key Vault Secrets User` role: **Portal** → Key Vault → **Access control (IAM)** → **Role assignments**
2. Confirm `keyVaultReferenceIdentity` is set: **Portal** → Function App → **Identity** → **User assigned** tab — your identity should be listed
3. Confirm secret names are exactly `tplink-username`, `tplink-password`, and `azure-maps-subscription-key`
4. Confirm `AZURE_CLIENT_ID` app setting in the Function App matches the Managed Identity's client ID (not the GitHub Actions app)

### SWA auth redirect loop

Usually caused by incorrect redirect URI. Verify:

1. The app registration redirect URI is `https://<swa-hostname>/.auth/login/aad/callback`
2. The `AZURE_CLIENT_ID` SWA app setting is the `skeeter-switch` app registration client ID (not the GitHub Actions one)
3. The `openIdIssuer` in `staticwebapp.config.json` has the real tenant GUID (not the literal `{TENANT_ID}` string)

### Function App returns CORS errors in browser

`AZURE_ALLOWED_ORIGINS` is not set or set to the wrong hostname. Fix per Phase 6.3. Exact value must be `https://<swa-hostname>` with no trailing slash.

### `dryRun` is true in production

**Portal** → **App Services** → Function App → **Configuration** → **Application settings** → find `DRY_RUN` → value should be `false`. If it says `true`, your prod deployment used the wrong parameter file. Re-run `infra-deploy.yml` with `environment=prod` which uses `prod.bicepparam` (`dryRun = false`).

### TP-Link Kasa device doesn't toggle

- Check Application Insights logs for `toggleDevice` or `kasa` traces — was the API call made?
- Verify the device alias in the Kasa app matches `KASA_DEVICE_ALIAS` exactly (case-sensitive)
- Verify `tplink-username` and `tplink-password` secrets are set and correct
- Confirm the EP40 is online in the Kasa app
- Test manually via `POST /api/command` with dryRun=false to see the exact TP-Link API response
- Check if the `tplink-cloud-api` npm package has breaking changes (unofficial API)

### Static Web App deployment token invalid

```bash
# Get a fresh token
az staticwebapp secrets list \
  --name "<swa-name>" \
  --resource-group "skeeter-switch-<env>-rg" \
  --query "properties.apiKey" -o tsv

# Update GitHub secret
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --env <env> --body "<new-token>"
```
