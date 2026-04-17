# Azure OIDC Federation Setup for GitHub Actions

This guide sets up federated credentials so GitHub Actions can authenticate to Azure without storing long-lived secrets.

## Prerequisites
- Azure CLI installed and logged in
- Appropriate permissions (Owner or Contributor + User Access Administrator on subscription)

## Step 1: Create Azure AD App Registration

```bash
# Create app registration
APP_NAME="skeeter-switch-github-actions"
az ad app create --display-name "$APP_NAME"

# Get the app ID
APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
echo "App ID: $APP_ID"

# Create service principal
az ad sp create --id $APP_ID
SP_OBJECT_ID=$(az ad sp show --id $APP_ID --query "id" -o tsv)
echo "SP Object ID: $SP_OBJECT_ID"
```

## Step 2: Add Federated Credentials

Add separate credentials for each environment (dev + prod) and for the main branch.

```bash
# For main branch (used by auto-deploy on push)
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "skeeter-switch-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:KMHouk/skeeter-switch:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# For dev environment
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "skeeter-switch-dev",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:KMHouk/skeeter-switch:environment:dev",
  "audiences": ["api://AzureADTokenExchange"]
}'

# For prod environment
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "skeeter-switch-prod",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:KMHouk/skeeter-switch:environment:prod",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

## Step 3: Assign Azure Roles

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

# Contributor on the resource group (for Bicep deployment)
az role assignment create \
  --role Contributor \
  --assignee $SP_OBJECT_ID \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/skeeter-switch-dev-rg

# Repeat for prod resource group
az role assignment create \
  --role Contributor \
  --assignee $SP_OBJECT_ID \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/skeeter-switch-prod-rg

# User Access Administrator for RBAC assignments in Bicep
az role assignment create \
  --role "User Access Administrator" \
  --assignee $SP_OBJECT_ID \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/skeeter-switch-dev-rg

az role assignment create \
  --role "User Access Administrator" \
  --assignee $SP_OBJECT_ID \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/skeeter-switch-prod-rg
```

## Step 4: Set GitHub Secrets

Go to your repo → Settings → Environments → Create "dev" and "prod" environments.

For each environment, add these secrets:
- `AZURE_CLIENT_ID` = $APP_ID
- `AZURE_TENANT_ID` = $TENANT_ID  
- `AZURE_SUBSCRIPTION_ID` = $SUBSCRIPTION_ID
- `AZURE_RESOURCE_GROUP` = skeeter-switch-{env}-rg

After first infra deploy, add:
- `AZURE_FUNCTION_APP_NAME` = (from deployment output)
- `AZURE_STATIC_WEB_APPS_API_TOKEN` = (from SWA portal → Manage deployment token)

## Step 5: Create Resource Groups

```bash
az group create --name skeeter-switch-dev-rg --location eastus
az group create --name skeeter-switch-prod-rg --location eastus
```

## Verification

After setup, run the infra-deploy.yml workflow manually for dev. Check the Actions tab for authentication success.

## Security Notes

- **No secrets stored in code or repo**: OIDC tokens are short-lived and requested at runtime
- **Federated credentials scoped to environment and branch**: Prevents cross-environment contamination
- **Minimum permissions on workflows**: id-token: write, contents: read
- **Validate-before-deploy**: Bicep validation runs before deployment to catch errors early
- **GitHub Environments**: Enforce approval gates and protection rules before prod deployments

## Troubleshooting

### OIDC token exchange fails
- Verify federated credential subject matches exactly: `repo:OWNER/REPO:environment:ENV`
- Check that the app registration has the correct issuer: `https://token.actions.githubusercontent.com`
- Ensure audience is `api://AzureADTokenExchange`

### Deployment fails with permissions error
- Verify service principal has Contributor role on resource group
- Verify service principal has User Access Administrator role (needed for managed identity RBAC in Bicep)

### Static Web App deployment token not found
- Get token from Azure Portal → Static Web App → Manage deployment token
- Add to GitHub Environment secret as `AZURE_STATIC_WEB_APPS_API_TOKEN`
