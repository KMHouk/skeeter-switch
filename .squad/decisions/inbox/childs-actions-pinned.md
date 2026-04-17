# Decision: GitHub Actions SHA Pinning Policy

**Author:** Childs (DevOps & Security)  
**Date:** 2026-04-17  
**Status:** Implemented

## Decision

All `uses:` references in GitHub Actions workflows must be pinned to immutable SHA hashes rather than floating version tags (e.g., `@v4`). Version tags must appear as inline comments for human readability.

## Rationale

Floating tags are a supply chain attack vector — a compromised action repo can silently push malicious code to a tag like `@v4` and it runs in our CI with OIDC credentials. SHA pins are immutable: the exact bytes that ran in review are the exact bytes that run in prod.

## SHAs in Use (as of 2026-04-17)

| Action | SHA | Version |
|--------|-----|---------|
| `actions/checkout` | `11bd71901bbe5b1630ceea73d27597364c9af683` | v4.2.2 |
| `actions/setup-node` | `39370e3970a6d050c480ffad4ff0ed4d3fdee5af` | v4.1.0 |
| `azure/login` | `6c251865b4e6290e7b78be643ea2d005702d2035` | v2.1.0 |
| `Azure/static-web-apps-deploy` | `1a947af9992250f3bc2e68ad0754c0b0c11566c9` | v1.5.0 |

## Outstanding TODOs

The following actions still use floating tags pending SHA verification:
- `actions/upload-artifact@v4` — verify at https://github.com/actions/upload-artifact/releases
- `actions/download-artifact@v4` — verify at https://github.com/actions/download-artifact/releases

## Enforcement

When adding new actions to any workflow, Childs must supply a verified SHA. PRs with floating tags must be blocked by code review. Consider adding a linting step (e.g., `zizmor` or `actionlint`) to enforce this automatically.
