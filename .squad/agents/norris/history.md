# Norris — History & Learnings

## Project Context
- **Project:** skeeter-switch — Arctic Mosquito Killing System cloud controller
- **Owner:** Kevin
- **Purpose:** Cloud controller for TP-Link Kasa EP40 via IFTTT, making ON/OFF decisions based on weather, time windows, manual overrides, and debounce rules
- **Stack:** Azure Functions (TypeScript), Azure Static Web Apps (React), Azure Table Storage, Azure Maps Weather, IFTTT Webhooks
- **Defaults:** precipProb < 30%, wind < 12 mph, run window 18:00–06:00, debounce 10 min, location: New York metro
- **Joined:** 2026-04-17

## Learnings

### Arlington, VA Mosquito Biology & Threshold Validation (2026-04-17)

**Location:** North Quintana St, Arlington, Virginia (Mid-Atlantic, Northern Virginia)

**Species Composition:**
- **Aedes albopictus (dominant):** Aggressive daytime biter in urban/suburban areas. Peak activity windows: dawn (05:00–08:00) and late afternoon (16:00–18:00). Most prevalent in Arlington.
- **Culex pipiens (secondary):** Common house mosquito; nocturnal. Peak 18:00–06:00. Primary West Nile vector in Virginia but less aggressive than Aedes.

**Season & Temperature:**
- **Mosquito season:** Late April / Early May through October (6 months)
- **Peak:** June–August (warmest, most humid)
- **Temperature floor:** 50°F. Below this, mosquitoes dormant. Critical for early April and late October: nighttime temperatures often dip <50°F, making trap deployment ineffective.
- **Humidity:** >90% enhances mosquito activity (not a suppression factor); should not gate trap deployment

**Wind & Precipitation:**
- **Wind threshold 12 mph:** Correct. Confirmed as flight disruption threshold for North American mosquitoes.
- **Precipitation:** Light rain doesn't suppress activity. 30% threshold too conservative for humid subtropical Northern Virginia; adjusted to 35%.

**Run Window Validation:**
- **Current 18:00–06:00:** Captures Culex nocturnal but **misses Aedes evening peak (16:00–18:00) and partial dawn peak (only 05:00–06:00 of 05:00–08:00)**.
- **Recommended 16:00–08:00:** Captures both species' peak activity comprehensively. More aggressive but biologically justified for Arlington.

**Missing Gate:**
- Current logic lacks **temperature floor**. Trap runs spring/fall nights when mosquitoes inactive. Added recommendation: skip if temp <50°F.

**Implementation Priorities:**
1. Extend run window to 16:00–08:00 (config change, HIGH)
2. Add temperature gate <50°F (code change, HIGH)
3. Adjust precipProbThreshold to 35% (config change, MEDIUM)
4. Keep windSpeedThreshold at 12 mph (no change)
5. Do NOT add humidity gate (no change)
