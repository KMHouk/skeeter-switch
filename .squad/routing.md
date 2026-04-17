# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Architecture, design decisions, API contracts | MacReady | "Design the evaluation flow", "Review this API shape" |
| Code review gate | MacReady | All PRs before merge; rejects route to a different agent |
| Scope & priorities | MacReady | What to build next, trade-offs, deferral decisions |
| Azure Functions, decision logic, webhooks | Bennings | "Implement the timer function", "Build the IFTTT client" |
| Weather integration, storage layer, secrets | Bennings | "Add Azure Maps weather fetch", "Wire Key Vault reads" |
| API handlers (/api/*) | Bennings | "Implement /api/status", "Add /api/plan endpoint" |
| Bicep infrastructure, Azure resources | Blair | "Write the Function App Bicep", "Add Key Vault RBAC" |
| Managed Identity, RBAC, alerts | Blair | "Set up MI for Functions", "Add App Insights alert" |
| React UI, dashboard components | Windows | "Build the calendar view", "Add the manual controls" |
| staticwebapp.config.json, auth routes | Windows | "Protect routes", "Wire admin role gate" |
| GitHub Actions workflows, OIDC | Childs | "Write infra deploy workflow", "Set up OIDC federation" |
| Entra ID setup, Conditional Access docs | Childs | "Document MFA Conditional Access steps", "App registration notes" |
| Security review, secret handling | Childs | "Review for leaked secrets", "Verify RBAC assignments" |
| Mosquito activity thresholds, entomological validation | Norris | "Are these weather thresholds right?", "When do mosquitoes actually bite?", "Review the decision logic" |
| Seasonal/geographic tuning, run window validation | Norris | "Tune for spring emergence", "Is 18:00–06:00 right for NY?" |
| AppSec review, auth flow audit, OWASP | Copper | "Security review the API", "Check for injection vulnerabilities", "Audit the auth flow" |
| Secrets hygiene, CORS policy, dependency CVEs | Copper | "Check for leaked secrets", "Review CORS config", "Run a dependency audit" |
| GitHub Actions security, OIDC token scopes | Copper | "Review CI security", "Check Actions permissions" |
| ARCTIC® MKS hardware questions, device specs, operating constraints | Fuchs | "What are the rain limits?", "Is power cycling safe?", "What coverage does it have?" |
| Device-hardware validation of decision logic | Fuchs | "Is the debounce interval safe for this device?", "Can we power cycle this thing every 10 minutes?" |
| IFTTT/Kasa/hardware integration questions | Fuchs | "Will switching power work for this device type?", "Any startup delay after power-on?" |
| Session logging | Scribe | Automatic — never needs routing |
| Work queue monitoring | Ralph | "Ralph, go", "Ralph, status", "keep working" |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
