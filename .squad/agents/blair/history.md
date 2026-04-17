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
