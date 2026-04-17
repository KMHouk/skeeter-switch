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
