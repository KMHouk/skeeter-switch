# Project Context

- **Owner:** Kevin
- **Project:** skeeter-switch — Arctic Mosquito Killing System controller
- **Stack:** GitHub Actions, OIDC federation, Azure Bicep deploy, Azure Functions deploy, Static Web Apps deploy, Entra ID, Conditional Access
- **Created:** 2026-04-17

## What I'm Responsible For

GitHub Actions workflows under /.github/workflows: infra-deploy.yml (Bicep), functions-deploy.yml, swa-deploy.yml. OIDC federation (no long-lived credentials). Dev/prod environment separation. Entra app registration and Conditional Access MFA setup docs in README. staticwebapp.config.json: route auth restrictions, admin role, custom Entra provider config.

Key: OIDC only, minimum `permissions` on every workflow, validate-before-deploy pattern for Bicep.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-17: GitHub Actions Workflows Created

**Files created:**
- `.github/workflows/infra-deploy.yml` - Bicep infrastructure deployment with validate-then-deploy pattern
- `.github/workflows/functions-deploy.yml` - Azure Functions build and deploy, auto-deploy on push to main, prod requires manual trigger
- `.github/workflows/swa-deploy.yml` - Static Web App build and deploy
- `.github/OIDC-SETUP.md` - Complete OIDC federation setup guide with Azure CLI commands

**OIDC Federation Pattern:**
- Three federated credentials: main branch (auto-deploy), dev environment, prod environment
- Subject format: `repo:KMHouk/skeeter-switch:environment:dev` for environments, `repo:KMHouk/skeeter-switch:ref:refs/heads/main` for branch
- Issuer: `https://token.actions.githubusercontent.com`
- Audience: `api://AzureADTokenExchange`

**Secrets per GitHub Environment:**
- AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP (set before first deploy)
- AZURE_FUNCTION_APP_NAME (after infra deploy)
- AZURE_STATIC_WEB_APPS_API_TOKEN (from SWA portal)

**Security Controls:**
- All workflows use `permissions: id-token: write, contents: read` (minimum required for OIDC)
- Bicep validation runs before deployment to catch errors
- Separate dev/prod environments with GitHub Environment protection rules
- No long-lived credentials stored anywhere
