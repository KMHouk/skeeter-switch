# Project Context

- **Owner:** Kevin
- **Project:** skeeter-switch — Arctic Mosquito Killing System controller
- **Stack:** React + TypeScript, Azure Static Web Apps, staticwebapp.config.json, Entra ID auth (/.auth/login/aad)
- **Created:** 2026-04-17

## What I'm Responsible For

React TypeScript app under /src/web. Dashboard: status cards, decision reasoning panel, weather snapshot, weekly calendar view (/api/plan), manual controls (Force ON/OFF/AUTO with TTL), dry run toggle, activity log (last 50), config editor (admin-only), system health panel. Auth: /login → /.auth/login/aad, role checks from /.auth/me, admin-gated sections.

Key: no `any` types, all API calls through typed client, calendar recomputes when thresholds change, handle loading/error states everywhere.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
- Built full frontend in src/web: package.json, tsconfig.json, vite.config.ts, index.html, staticwebapp.config.json, src/main.tsx, src/App.tsx, src/index.css, src/types, src/api/client.ts, hooks (useAuth/useStatus/useCalendar), components (StatusCard, DecisionPanel, WeatherPanel, CalendarView, ManualControls, DryRunBanner, ActivityLog, SystemHealth, ConfigEditor). Component hierarchy: App → DryRunBanner + (StatusCard/DecisionPanel) + (WeatherPanel/SystemHealth) + CalendarView + ManualControls + ActivityLog + ConfigEditor.
