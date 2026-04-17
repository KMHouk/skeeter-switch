# Copper — History & Learnings

## Project Context
- **Project:** skeeter-switch — Arctic Mosquito Killing System cloud controller
- **Owner:** Kevin
- **Purpose:** Cloud controller for TP-Link Kasa EP40 via IFTTT, making ON/OFF decisions based on weather, time windows, manual overrides, and debounce rules
- **Stack:** Azure Functions (TypeScript), Azure Static Web Apps (React), Azure Table Storage, Key Vault, Bicep IaC, Entra ID + Conditional Access MFA, GitHub Actions OIDC
- **Auth:** SWA built-in auth with Entra ID, admin role via x-ms-client-principal header, all routes require authenticated
- **Secrets:** IFTTT key + Azure Maps key in Key Vault, accessed via Managed Identity
- **Joined:** 2026-04-17

## Learnings
<!-- Append entries here as work progresses -->
