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
- ActivityLog now fetches 150 logs (`fetchLogs(150)`) and paginates at 30 rows per page. `currentPage` and `expandedId` both reset to default on every `loadLogs` call. Pagination controls only render when `totalPages > 1`; active page button is visually distinguished via inline `borderColor`/`color`/`fontWeight` using the existing `.button` class.
- Built full frontend in src/web: package.json, tsconfig.json, vite.config.ts, index.html, staticwebapp.config.json, src/main.tsx, src/App.tsx, src/index.css, src/types, src/api/client.ts, hooks (useAuth/useStatus/useCalendar), components (StatusCard, DecisionPanel, WeatherPanel, CalendarView, ManualControls, DryRunBanner, ActivityLog, SystemHealth, ConfigEditor). Component hierarchy: App → DryRunBanner + (StatusCard/DecisionPanel) + (WeatherPanel/SystemHealth) + CalendarView + ManualControls + ActivityLog + ConfigEditor.
- CalendarView was rewritten from a 7-column tall time-scroll weekly view to a monthly grid (Sun–Sat, 4–6 rows). useCalendar hook now defaults to startOfMonth/endOfMonth instead of startOfWeek/endOfWeek. CSS classes .calendar-grid/.calendar-hours/.calendar-day/.calendar-now replaced with .cal-month-grid/.cal-day-cell/.cal-block/.cal-no-run etc.
- ManualControls redesigned into two explicit sections: "Temporary Override" (Force ON/OFF + Clear Override + TTL selector) and "Direct Command" (Command ON/OFF + Return to AUTO with permanent badge). Confirmation dialogs and toasts now carry distinct wording — temp shows TTL, permanent notes indefinite duration.
