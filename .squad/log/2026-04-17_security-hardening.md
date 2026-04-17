# Session Log: Security Hardening Sprint (2026-04-17)

**Session ID:** 2026-04-17_1522  
**Team:** Copper (Security), Childs (DevOps), Scribe (Documentation)  
**Sprint:** Security Hardening & Supply Chain Risk Mitigation

---

## Sprint Summary

Three parallel workstreams completed comprehensive security audit and initial remediation:

1. **copper-security-review** — Identified 16 findings (1 critical, 3 high, 5 medium, 4 low, 3 info)
2. **copper-hardening** — Fixed Critical-1 and 2 of 3 High findings
3. **childs-actions-pins** — Eliminated supply chain risk by pinning GitHub Actions to SHAs

---

## Work Completed

### Copper Security Audit
- Full threat assessment of HTTP handlers, CORS, auth, logging, dependencies
- **Critical Finding:** All 7 function handlers set `authLevel: 'anonymous'` with no `x-ms-client-principal` validation
- **High Findings:** CORS wildcard (`*`), Azure Maps key in query strings, GitHub Actions floating tags
- Generated detailed remediation guidance for all 16 findings
- Output: `security-report.md` + decision inbox

### Copper Hardening (Commit a875ed6)
- ✅ **CRITICAL-1 Fixed:** Shared `requireAuth()` / `requireAdmin()` middleware in `src/shared/auth.ts`
- ✅ **HIGH-1 Fixed:** CORS restricted to env var (`AZURE_ALLOWED_ORIGINS`) in `src/shared/cors.ts`
- ⚠️ **HIGH-2 Partial:** Added `redactKey()` sanitizer in `src/shared/weather.ts` (header refactor deferred)
- Applied auth middleware to all 7 HTTP handlers
- Build verified: clean compilation

### Childs Actions Pinning (Commits 090cd2f, 7122f98)
- **4 primary actions pinned** to commit SHAs:
  - `actions/checkout` → `11bd71901bbe5b1630ceea73d27597364c9af683` (v4.2.2)
  - `actions/setup-node` → `39370e3970a6d050c480ffad4ff0ed4d3fdee5af` (v4.1.0)
  - `azure/login` → `6c251865b4e6290e7b78be643ea2d005702d2035` (v2.1.0)
  - `Azure/static-web-apps-deploy` → `1a947af9992250f3bc2e68ad0754c0b0c11566c9` (v1.5.0)
- Updated 3 workflows: `build.yml`, `infra-deploy.yml`, `deploy.yml`
- Permissions audit passed
- 2 artifact actions flagged for follow-up (SHA verification pending)

---

## Decisions Recorded

### Decision: GitHub Actions SHA Pinning Policy (Childs)
- **Status:** Implemented
- **Rationale:** Floating tags (`@v4`) are supply chain attack vectors; SHAs are immutable
- **Enforcement:** Future PRs with floating tags must be blocked by code review
- **Outstanding:** Artifact actions still pending SHA verification

### Decision: Hardening Fixes Implementation (Copper)
- **Status:** Implemented
- **Pattern:** All HTTP handlers must follow auth middleware pattern
- **Production Note:** Set `AZURE_ALLOWED_ORIGINS` env var on Function App
- **Deferred:** Full HIGH-2 fix (HTTP header for Azure Maps key)

---

## Risks & Blocking Items

### Blocking Next Sprint
- **CRITICAL-1:** Mitigated but network restrictions in Bicep still needed (Blair action)
- **HIGH-3:** GitHub Actions artifact actions still floating (Childs follow-up)

### Deferred to Later
- MEDIUM-1..5 findings (logging, error handling, config management, dependency scanning, input validation)
- LOW-1..4 findings (documentation, version management, rate limiting, container security)

---

## Team Actions (Open)

| Item | Owner | Deadline | Status |
|------|-------|----------|--------|
| Add network restrictions to Function App in Bicep | Blair | Sprint 2 | ⏳ Not started |
| Verify & pin `upload-artifact@v4` and `download-artifact@v4` | Childs | Sprint 2 | ⏳ Not started |
| Refactor Azure Maps key to HTTP `Subscription-Key` header | Bennings | Sprint 2 | ⏳ Deferred |
| Add `actionlint` or `zizmor` linter to CI | Childs | Sprint 2 | ⏳ Not started |

---

## Files Created

**Orchestration Logs:**
- `.squad/orchestration-log/2026-04-17_copper-audit.md`
- `.squad/orchestration-log/2026-04-17_copper-hardening.md`
- `.squad/orchestration-log/2026-04-17_childs-pins.md`

**Session Log:**
- `.squad/log/2026-04-17_security-hardening.md` (this file)

**Code Artifacts:**
- `src/shared/auth.ts` (shared auth middleware)
- `src/shared/cors.ts` (CORS origin handler)
- Updated: `src/shared/weather.ts` (redactKey sanitizer)

---

## Next Steps

1. **Immediate (this week):** Deploy hardening fixes to dev; test auth middleware against all 7 handlers
2. **Short-term (Sprint 2):** Blair adds network restrictions; Childs completes artifact action pinning
3. **Medium-term:** Address MEDIUM and LOW findings; add linting to enforce SHA pinning
4. **Ongoing:** Document security patterns in team wiki; train all developers on hardening requirements

---

**Scribed by:** Scribe  
**Date:** 2026-04-17 15:22 UTC
