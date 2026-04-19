# skeeter-switch 🦟⚡

**Arctic Mosquito Killing System** — Cloud controller for a TP-Link Kasa EP40 smart plug that runs a bug zapper on a smart schedule based on weather, time of day, and manual overrides.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│   React SPA         │  REST   │  Azure Functions      │
│   (Static Web Apps) │◄───────►│  (TypeScript)         │
│   Entra ID Auth     │         │                       │
└─────────────────────┘         │  ┌─────────────────┐  │
                                │  │ Decision Engine  │  │
                                │  │ (pure function)  │  │
                                │  └────────┬────────┘  │
                                │           │           │
                                │  ┌────────▼────────┐  │
                                │  │ TP-Link Cloud    │  │
                                │  │ API Client       │  │
                                │  └────────┬────────┘  │
                                └───────────┼───────────┘
                                            │
                    ┌───────────────────────┬┴──────────────────────┐
                    │                       │                       │
           ┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
           │ Azure Table     │    │ Azure Maps      │    │ TP-Link Kasa    │
           │ Storage         │    │ Weather API     │    │ EP40 Smart Plug │
           │ (state, config, │    │ (conditions &   │    │ (ON / OFF)      │
           │  logs, overrides)│    │  forecast)      │    │                 │
           └─────────────────┘    └─────────────────┘    └─────────────────┘
                    │
           ┌────────▼────────┐
           │ Azure Key Vault │
           │ (secrets via    │
           │  Managed ID)    │
           └─────────────────┘
```

### How It Works

1. **Timer trigger** fires every 5 minutes
2. **Decision Engine** evaluates: time window (18:00–06:00 ET), weather (no rain, precip < 30%, wind < 12 mph), debounce (15 min), and any active override
3. If desired state differs from last commanded state → **TP-Link Cloud API** fires
4. TP-Link Cloud API toggles **Kasa EP40** ON or OFF
5. Everything is logged to **Azure Table Storage** with full decision reasoning

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Current switch state, last decision, system health |
| `POST` | `/api/override` | Set override: `{ state: "on"\|"off"\|"auto", ttlMinutes?: number }` |
| `POST` | `/api/evaluate` | Force an immediate evaluation cycle |
| `POST` | `/api/command` | Direct command: `{ state: "on"\|"off" }` |
| `GET` | `/api/plan` | Forecast schedule: `?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| `GET/PUT` | `/api/config` | Read/update config (admin only) |
| `GET` | `/api/logs` | Event log: `?limit=50` |

---

## TP-Link Kasa Setup

The system controls the Kasa EP40 directly via the TP-Link Cloud API. You need a TP-Link account and the device added to the Kasa app.

### 1. Create a Dedicated TP-Link Service Account

1. Go to [tplink.com](https://tplink.com) and sign up for a new account (recommended: use a service account email, not your personal account)
2. Verify your email

### 2. Add the EP40 to Kasa and Set the Device Alias

1. Download the Kasa app (iOS or Android) or use the web portal [tplink.com/iot](https://tplink.com/iot)
2. Sign in with your service account credentials
3. Add your TP-Link Kasa EP40 smart plug to your account
4. Name/alias the device—this name becomes the `KASA_DEVICE_ALIAS` config value. Example: `skeeter-switch`
5. Verify the device is online and responding in the Kasa app

### 3. Store Credentials in Azure Key Vault

Store your TP-Link service account credentials as secrets in Key Vault (these are referenced by the Function App via Managed Identity):

- **Secret name:** `tplink-username` → **Value:** your TP-Link service account email
- **Secret name:** `tplink-password` → **Value:** your TP-Link service account password

Do **not** use personal credentials; the service account isolates this application's access.

---

## Entra ID App Registration

Authentication is handled by Azure Static Web Apps built-in Entra ID integration.

### Create the App Registration

1. **Azure Portal** → **Microsoft Entra ID** → **App registrations** → **New registration**
2. **Name:** `skeeter-switch`
3. **Supported account types:** Accounts in this organizational directory only (Single tenant)
4. **Redirect URI:**
   - Platform: **Web**
   - URI: `https://{your-swa-hostname}/.auth/login/aad/callback`
5. Click **Register**
6. Note the **Application (client) ID** and **Directory (tenant) ID**
7. Under **Certificates & secrets** → **New client secret** (if needed by SWA config)
8. Under **API permissions**, ensure `User.Read` (Microsoft Graph) is granted

### Configure Static Web Apps Auth

Add the Entra provider in the SWA portal under **Settings → Authentication** or in `staticwebapp.config.json`:
- Provider: Azure Active Directory
- Client ID: from step 6 above
- Tenant ID: from step 6 above

---

## Conditional Access MFA

Enforce multi-factor authentication for all users accessing this application.

### Step-by-Step Portal Configuration

1. **Azure Portal** → **Microsoft Entra ID** → **Security** → **Conditional Access** → **New Policy**
2. **Name:** `skeeter-switch MFA Required`
3. **Users:** All users (or assign a specific security group)
4. **Target resources** → **Select apps** → Search and select the `skeeter-switch` Enterprise Application
5. **Conditions** → **Locations:** Any location
6. **Grant** → **Require multi-factor authentication** → Select **Microsoft Authenticator** as a valid method
7. **Session** (optional): Set **Sign-in frequency** to your preference (e.g., 12 hours)
8. **Enable policy:** On
9. Click **Create**

> **Note:** MFA is enforced by Entra Conditional Access, NOT by application code. The app itself does not need to implement MFA logic.

---

## Local Development

### Prerequisites

- **Node.js 18+** ([nodejs.org](https://nodejs.org/))
- **Azure Functions Core Tools v4** (`npm install -g azure-functions-core-tools@4`)
- **Azurite** for local Azure Table Storage (`npm install -g azurite`)
- **Azure CLI** (`az`) ([Install guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli))

### Setup

```bash
# Clone the repo
git clone https://github.com/KMHouk/skeeter-switch.git
cd skeeter-switch

# Install function dependencies
cd src/functions
npm install

# Copy the settings template and fill in dev values
cp local.settings.json.template local.settings.json
# Edit local.settings.json with your TP-Link credentials, weather API key, etc.
```

**local.settings.json values:**

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_MAPS_SUBSCRIPTION_KEY": "<your-azure-maps-key>",
    "TPLINK_USERNAME": "<your-tplink-service-account-email>",
    "TPLINK_PASSWORD": "<your-tplink-service-account-password>",
    "KASA_DEVICE_ALIAS": "skeeter-switch",
    "DRY_RUN": "true"
  }
}
```

### Run the Backend

```bash
# Start Azurite (in a separate terminal)
azurite --silent --location .azurite --debug .azurite/debug.log

# Start Azure Functions
cd src/functions
func start
```

### Run the Frontend

```bash
cd src/web
npm install
npm run dev
```

Set the environment variable so the frontend hits the local function host:

```bash
VITE_API_BASE_URL=http://localhost:7071
```

---

## Deployment

### Prerequisites

- **Azure CLI** (`az`) — logged in to your subscription
- **GitHub CLI** (`gh`) — authenticated
- An existing **Azure subscription**

### Step 1: Create OIDC Federation

```bash
# Create an Entra ID app for GitHub Actions
az ad app create --display-name "skeeter-switch-github-actions"

# Note the appId from the output, then create a service principal
az ad sp create --id <appId>

# Create federated credential for GitHub Actions
az ad app federated-credential create --id <appId> --parameters '{
  "name": "github-actions-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:KMHouk/skeeter-switch:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Assign Contributor role on the subscription (or resource group)
az role assignment create \
  --assignee <appId> \
  --role Contributor \
  --scope /subscriptions/<subscription-id>
```

### Step 2: Set GitHub Secrets

```bash
gh secret set AZURE_CLIENT_ID --body "<appId>"
gh secret set AZURE_TENANT_ID --body "<tenantId>"
gh secret set AZURE_SUBSCRIPTION_ID --body "<subscriptionId>"
```

### Step 3: Deploy Infrastructure

```bash
gh workflow run infra-deploy.yml -f environment=prod
```

### Step 4: Add Key Vault Secrets

```bash
az keyvault secret set --vault-name <vault-name> --name "IFTTT-WEBHOOK-KEY" --value "<your-ifttt-key>"
az keyvault secret set --vault-name <vault-name> --name "WEATHER-API-KEY" --value "<your-weather-key>"
```

### Step 5: Deploy Functions

```bash
gh workflow run functions-deploy.yml
```

### Step 6: Deploy Static Web App

```bash
gh workflow run swa-deploy.yml
```

### Step 7: Configure Entra Auth in SWA

1. Azure Portal → Static Web Apps → your app → **Settings → Authentication**
2. Add **Azure Active Directory** provider
3. Enter the Client ID and Tenant ID from your App Registration
4. Save

---

## Security Hardening Checklist

- [ ] No secrets in source control (verified by `.gitignore`)
- [ ] All secrets in Key Vault, referenced by URI in App Settings
- [ ] Managed Identity used for Key Vault access (no access keys)
- [ ] OIDC used for GitHub Actions (no service principal secrets)
- [ ] All routes require authentication (`staticwebapp.config.json`)
- [ ] Admin routes require `admin` role
- [ ] Conditional Access MFA policy enabled for this app
- [ ] Function App requires HTTPS
- [ ] CORS configured to allow only SWA hostname
- [ ] `dryRun=false` verified in production App Settings
- [ ] Application Insights alerts configured and enabled
- [ ] Key Vault soft-delete enabled
- [ ] Review App Registration "Who can access" — restrict to your tenant
- [ ] TP-Link service account credentials never committed to source control
- [ ] TP-Link Kasa device alias matches the device name in the Kasa app
- [ ] Monitor TP-Link Cloud API availability (unofficial API — may change)

---

## Repo Layout

```
/skeeter-switch
├── infra/                    # Bicep IaC
│   ├── modules/              # Reusable Bicep modules
│   └── parameters/           # Environment parameter files
├── src/
│   ├── functions/            # Azure Functions app
│   │   └── src/
│   │       ├── functions/    # Individual function handlers
│   │       │   ├── evaluate/       # Timer-triggered (every 5 min)
│   │       │   ├── status/         # GET /api/status
│   │       │   ├── override/       # POST /api/override
│   │       │   ├── evaluate-http/  # POST /api/evaluate
│   │       │   ├── command/        # POST /api/command
│   │       │   ├── plan/           # GET /api/plan
│   │       │   ├── config/         # GET/PUT /api/config
│   │       │   └── logs/           # GET /api/logs
│   │       └── shared/       # Decision engine, clients, types
│   └── web/                  # React SPA (Static Web Apps)
│       └── src/
│           ├── components/   # React components
│           ├── hooks/        # Custom React hooks
│           └── api/          # API client layer
├── .github/workflows/        # CI/CD pipelines
└── README.md
```

---

## License

Private project. All rights reserved.
