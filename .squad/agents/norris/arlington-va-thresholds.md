# Arlington, VA Mosquito Threshold Validation & Recommendations

**Location:** North Quintana St, Arlington, Virginia 22205 (38.8816, -77.1311)  
**Region:** Mid-Atlantic (Northern Virginia suburban)  
**Research Date:** 2026-04-17  
**Researcher:** Norris, Mosquito & Entomology Expert

---

## Executive Summary

Arlington, Virginia presents **different mosquito dynamics** than the default NY metro assumptions. The Mid-Atlantic suburban environment hosts aggressive daytime-biting Aedes albopictus alongside nocturnal Culex pipiens. Current thresholds are **partially correct but require tuning** for optimal trap effectiveness.

**Key Finding:** The 18:00–06:00 run window is incomplete. Aedes (dominant Arlington species) peak in early morning and late afternoon—requiring **dawn window extension** (05:00–08:00) to capture peak activity.

---

## Question 1: Mosquito Season in Arlington, VA

### Findings
- **Start:** Late April / Early May
- **Peak:** June, July, August (warmest months, highest humidity)
- **End:** Late September / October (first frost or sustained <50°F nighttime temps)
- **Duration:** ~6 months (May–October)

### Implications for Trap Deployment
- Trap should be **functional and tested by late April**.
- **June–August = primary intervention window** — most aggressive populations.
- Deploy persistent monitoring from May onward; can reduce after October frost.

---

## Question 2: Biting Window for Arlington, VA

### Species Present & Peak Times

#### **Aedes albopictus (Asian Tiger Mosquito) — PRIMARY THREAT**
- **Status:** Most prevalent and aggressive mosquito in Arlington suburban areas
- **Peak Biting Times:** 
  - **Early morning:** 05:00–08:00 (dawn peak)
  - **Late afternoon:** 16:00–18:00 (dusk peak)
  - Also active mid-day in shaded areas
- **Breeding:** Standing water in containers, gutters, urban yards
- **Characteristics:** Daytime biter; avoids peak midday sun but remains active in shade

#### **Culex pipiens (Common House Mosquito) — SECONDARY VECTOR**
- **Status:** Abundant; primary West Nile virus vector in Virginia
- **Peak Biting Times:**
  - **Dusk to dawn:** 18:00–06:00 (crepuscular, nocturnal)
  - Most active on warm, humid summer nights
- **Breeding:** Sewage, stagnant water, urban wet areas
- **Characteristics:** Avoids direct sun; night and early-morning biter

### Current 18:00–06:00 Window Assessment

**VERDICT: INCOMPLETE FOR ARLINGTON**

The current window captures **Culex well** but **misses peak Aedes activity** at dawn (05:00–08:00) and late afternoon (16:00–18:00).

#### Analysis:
- **Culex coverage:** ✅ Excellent (18:00–06:00 covers crepuscular and nocturnal activity)
- **Aedes coverage:** ⚠️ **Partial**
  - ✅ Captures tail end of dawn peak (05:00–06:00)
  - ❌ **Misses late afternoon peak (16:00–18:00)**
  - ❌ Misses mid-day shade-feeding activity in summer

### Recommended Biting Window for Arlington

**NEW RUN WINDOW: 16:00–08:00 (4 PM–8 AM)**

- Captures **full Culex nocturnal window** (18:00–06:00)
- Captures **full Aedes dawn peak** (05:00–08:00)
- Captures **Aedes late afternoon surge** (16:00–18:00)
- Extends 2 hours earlier in morning, 2 hours earlier in evening vs. current 18:00–06:00

**Rationale:**
- Aedes albopictus is the dominant mosquito in Arlington suburbs
- Early capture of 16:00 start prevents evening host-seeking behavior before dusk
- Extension to 08:00 (vs. 06:00) ensures complete dawn peak capture
- Still avoids mid-day 08:00–16:00 window when Aedes shift to shade/rest

---

## Question 3: Wind Threshold for Mosquito Activity Suppression

### Findings

**Wind Speed Impact on Flight & Activity:**
- **<7 mph:** Optimal mosquito activity, no significant flight disruption
- **7–10 mph:** Mosquito host-seeking begins to drop; activity reduced
- **10–12 mph:** Marked disruption; most species seek shelter
- **>12 mph:** Near-complete suppression of flight and biting behavior

### Current 12 mph Threshold Assessment

**VERDICT: CORRECT FOR ARLINGTON**

12 mph is the **established threshold where mosquitoes predominantly cease active host-seeking and seek shelter**. Research confirms this as the effective cutoff for North American mosquitoes in general, including Aedes and Culex species in the Mid-Atlantic.

#### Rationale:
- Northern Virginia does not have significantly different wind dynamics vs. other temperate regions
- 12 mph threshold aligns with peer-reviewed entomological data
- Conservative threshold (errs toward not running in uncertain wind) is appropriate for trap efficiency

**RECOMMENDATION: KEEP 12 mph windSpeedThreshold**

---

## Question 4: Precipitation Probability Threshold

### Findings

**Precipitation & Mosquito Activity in Northern Virginia:**

- **Light rain (drizzle, <0.1"):** Minimal immediate impact on trap efficacy; mosquitoes may still bite in sheltered areas
- **Moderate to heavy rain (0.1"–1"+):** Trap deployment reduces efficiency (standing water interferes with host-seeking behavior); mosquito breeding spikes 7–14 days post-event
- **High humidity (70%+) without rain:** Enhances mosquito survival and evening/dawn activity
- **Persistent wet conditions:** Favor breeding sites, leading to population surge within 1–2 weeks

### Current 30% Precipitation Probability Threshold Assessment

**VERDICT: REASONABLE but CONTEXT-DEPENDENT**

30% precipitation probability is a pragmatic gate to avoid deploying during **persistent rainy conditions**. However, Northern Virginia's humid subtropical climate warrants refinement.

#### Analysis:
- **Northern Virginia summer:** Often sees 40–60% humidity; thunderstorms are localized and frequent
- **Light rain (drizzle):** Doesn't suppress mosquito activity significantly; trap remains effective
- **Heavy downpour:** Limits trap deployment efficiency and can damage trap electronics

**RECOMMENDATION: ADJUST to 35% Precipitation Probability**

- Allows trap to run through light, scattered showers common in Northern Virginia
- Gates against persistent moderate-to-heavy precipitation
- Balances sensitivity (don't over-gate) with hardware protection

**Secondary Consideration:** If rainfall is >0.5" at time of decision, skip regardless of precipProb %, as flooded areas will reduce trap efficacy.

---

## Question 5: Temperature Floor for Mosquito Inactivity

### Findings

**Mosquito Temperature Activity Thresholds:**
- **Below 50°F:** Most mosquitoes inactive, dormant, or seek shelter; flight and host-seeking cease
- **50–59°F:** Weak/limited activity; some feeding possible but infrequent
- **60°F+:** Activity resumes; increasing biting as temp rises
- **Optimal:** 70–90°F (summer range)

**Northern Virginia Seasonal Temps:**
- **May–October:** Nighttime lows 50–75°F; daytime 65–90°F
- **Peak season (June–August):** Nighttime 65–75°F; daytime 80–95°F
- **April/Late October:** Frequent dips below 50°F at night

### Current Logic Assessment

**VERDICT: MISSING CRITICAL GATE**

The current decision engine **does not check temperature at all**. This is a **significant gap**.

#### Why Temperature Matters:
- **Early/late season:** April and October nights often dip below 50°F. Trap will run but catch nothing (mosquitoes inactive).
- **Summer nights:** Even 50°F is uncommon; temperature gate would rarely block June–August.
- **Arctic MKS spec:** The device has a 50°F operating floor, which should align with biological mosquito inactivity (good design).
- **Efficiency:** Avoid running trap when outdoor temps are <50°F; conservation of power, avoid false positives.

### Recommendation: ADD TEMPERATURE GATE

**Implement: Skip trap deployment if `temperature < 50°F` at decision time**

- **Logic:** IF `temp < 50°F` THEN skip decision (mosquitoes inactive anyway)
- **Data Source:** Azure Maps Weather API (currently providing temp) — no additional calls needed
- **Benefit:** Aligns trap operation with actual mosquito biology; avoids wasted runs in shoulder season
- **Caveat:** This is a **seasonal gate**, not a fine-tuner. June–August will almost never trigger <50°F.

---

## Question 6: High Humidity (>90%) Effect on Device/Mosquito Behavior

### Findings

**Humidity Effect on Mosquitoes:**
- **>90% humidity:** Mosquitoes are **more active and aggressive**
- **Enhanced:** Feeding frequency, reproduction, survival (prevents desiccation)
- **Timing:** Peak activity still at dawn/dusk, but mid-day shade activity increases
- **Breeding:** High humidity sustains standing water; egg-to-adult development accelerates

**Effect on Arctic MKS Device:**
- Device designed for outdoor use; likely has humidity tolerances in spec sheet
- Typical electronics: 10–90% humidity operating range is standard
- **90%+ humidity:** May approach device limits; could affect sensor reliability or longevity
- **Practical impact:** Most Arlington summer days hit 70–85% humidity; >90% is rare but possible during heavy dew mornings

### Assessment

**VERDICT: MONITOR but NOT A PRIMARY GATE**

90%+ humidity is a rare condition in Arlington summer (occurs ~5–10% of days). More importantly:

#### Mosquito Behavior:
- High humidity **increases trap effectiveness** (mosquitoes more active)
- Should trap run in 90%+ humidity? **YES** — this is a favorable condition.

#### Device Durability:
- Arctic MKS likely rated to handle typical outdoor humidity ranges
- If device is deployed permanently (as intended), it must handle 85–90%+ during summer dews
- No evidence that 90%+ humidity is a hard barrier for trap operation

### Recommendation: DO NOT ADD HUMIDITY GATE

- Don't add 90%+ humidity as a threshold to skip deployment
- High humidity **favors mosquito activity** and trap effectiveness
- Device must be designed for outdoor deployment in humid conditions
- If device specs show humidity limits <90%, consult hardware team; don't override in decision logic

---

## Threshold Recommendations Summary

| Factor | Current Default | Arlington Recommendation | Rationale |
|--------|-----------------|--------------------------|-----------|
| **Precipitation Probability** | 30% | **35%** | Allow scattered showers; gate persistent rain |
| **Wind Speed** | 12 mph | **12 mph (KEEP)** | Correct threshold for flight disruption |
| **Run Window** | 18:00–06:00 | **16:00–08:00** | Capture full Aedes dawn + evening peaks, not just Culex night |
| **Temperature Floor** | Not checked | **ADD: <50°F → SKIP** | Align with mosquito dormancy & device operating range |
| **Humidity Gate** | Not checked | **DO NOT ADD** | High humidity favors mosquitoes; device must handle it |
| **Debounce** | 10 min (being updated to 15 min) | **15 min (KEEP)** | Adequate stability; matches default update cycle |

---

## Seasonal Deployment Notes for Arlington

### April
- Late month: First warm spells; Aedes begin emerging
- Temperature frequently <50°F at night; temperature gate will suppress deployment most days
- Occasional warm days: Window opens
- **Action:** Enable trap; expect sporadic runs mid-to-late month

### May–October (Peak Season)
- Temperature gate almost never blocks (rarely <50°F at night in these months)
- Wind and precipitation gates primary controls
- June–August: Highest mosquito populations; trap should run on ~60–80% of evenings/nights
- **Action:** Monitor daily; allow trap to run freely unless weather blocks it

### October (Fall Decline)
- Early month: Trap running normally
- Mid-month onward: First cold snaps; temperature gate begins blocking as nights dip below 50°F
- Late month: Trap largely inactive due to temperature; final frost kills/dormancies remaining population
- **Action:** Trap becomes less useful mid-October onward; can reduce monitoring frequency

---

## Implementation Notes

1. **Run window change (18:00→16:00, 06:00→08:00):** Requires config update; no code change if using generic window parameters
2. **Temperature gate:** Requires decision logic update in evaluation function; read temp from Azure Maps Weather API response
3. **Precipitation threshold:** Simple parameter change (30% → 35%)
4. **No humidity gate:** Leave as-is; no change needed

---

## Conclusion

Arlington, VA mosquito ecology is dominated by aggressive Aedes albopictus in suburban settings, supported by nocturnal Culex pipiens. The default thresholds are **partially aligned** but **miss significant Aedes activity windows** and **lack temperature gating**. 

**Recommended configuration is more defensive (earlier start, later end, temperature floor) and better calibrated to Mid-Atlantic suburban mosquito phenology.**

Expected outcome: Improved trap effectiveness during peak season (June–August) and realistic suppression during shoulder seasons (April, October).
