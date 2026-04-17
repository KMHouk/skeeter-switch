# Fuchs — History & Learnings

## Project Context
- **Project:** skeeter-switch — Arctic Mosquito Killing System cloud controller
- **Owner:** Kevin
- **Purpose:** Cloud controller for TP-Link Kasa EP40 smart plug → IFTTT Webhooks → power control of ARCTIC® MKS
- **Stack:** Azure Functions (TypeScript), Azure Static Web Apps (React), Azure Maps Weather, IFTTT Webhooks
- **Joined:** 2026-04-17

## ARCTIC® MKS Research Findings

### Product Overview
The ARCTIC® Mosquito Killing System (model MKS-1) is a commercial-grade outdoor mosquito trap developed with NASA-derived technology. It is sold as a chemical-free, pesticide-free, propane-free alternative to traditional mosquito traps. The device works by simultaneously deploying three host-mimicry attractants — thermal cycling, periodic CO2 release, and a textured surface that mimics skin — to draw mosquitoes toward a vacuum suction chamber where they are captured and killed.

Field testing documented capture rates exceeding 7,000 mosquitoes per hour, which the manufacturer positions as significantly higher than competing products. The unit covers approximately 1 acre effective range.

### Technical Specifications
| Spec | Value |
|------|-------|
| Model | MKS-1 |
| Voltage | 120V AC, 60 Hz |
| Current draw | 4 amps |
| Max wattage | ~480W |
| Monthly electricity cost | ~$6–$8 USD |
| Coverage area | Up to 1 acre |
| Body material | High-grade aluminum |
| CO2 tank size | 9 kg (20 lb), not included |
| CO2 release rate | 750 cc/min |
| CO2 cycle pattern | On 2 min / Off 1.5 min, every 5 hours |
| Heat range | 85°F–110°F |
| Heat cycle | Every 6–9 minutes |
| Built-in photocell | Yes — dusk-on, dawn-off |
| Safety certification | UL Listed |

### Operating Environment
- **Optimal temperature:** 50°F–104°F (10°C–40°C)
- **Rain:** NOT safe to operate in rain. Unit is not waterproofed. Must be sheltered under patio, awning, or canopy
- **Wind:** High wind degrades effectiveness by dispersing CO2 and heat plume. Project default of 12 mph cap is well-supported
- **Artificial light near unit:** Interferes with photocell triggering — avoid placement near outdoor lighting
- **Cord management:** Cord must not rest on ground — UL safety requirement
- **Freezing temps:** Do not operate — risk of condensation damage

### Power Control Notes
The MKS-1 uses a **mechanical photocell switch architecture**, not a soft-touch electronic button. This is critical: when external power is restored, the photocell re-evaluates ambient light and determines whether to activate. There is no "memory" button that needs to be re-pressed.

**Conclusion:** Power switching via TP-Link Kasa EP40 is appropriate and safe for this device.

**EP40 compatibility:**
- EP40 is rated 15A outdoor — MKS draws only 4A, so margin is comfortable
- EP40 is weatherproof (IP64) — suitable for outdoor deployment
- EP40 supports IFTTT Webhooks via TP-Link Kasa cloud — already in use for skeeter_switch_on / skeeter_switch_off events

**Power cycling concerns:**
- The thermal cycling system (85°F–110°F) requires 10–15 minutes to stabilize after power-on
- Rapid power cycling stresses the heating element
- The project's 10-minute debounce is at the minimum acceptable boundary; 15 minutes would be safer for hardware longevity
- Cycling power every 5–10 minutes repeatedly would be harmful; the 10-min debounce prevents this

**Startup warm-up:**
- Approximately 10–15 minutes after power-on for thermal system to reach operating range
- CO2 release is immediate but effectiveness builds as the heat signature establishes
- Decision logic should account for this: turning the device on 15–20 minutes before peak mosquito activity (true dusk) is ideal — the 18:00 run window start handles this

### Manufacturer Recommendations
- Run the device dusk to dawn during mosquito season
- Place away from competing light sources and human foot traffic (CO2 plume should not compete with human presence)
- Keep CO2 tank filled — it is the primary attractant vector
- Do not run in rain or when temperatures are below 50°F
- Maintain trap chamber weekly during peak season
- Store indoors in winter

### Sources
- ARCTIC® MKS product data sheet via ChemRobotics: https://www.chemrobotics.com/agropat/pdf/gsda/docs/28494.pdf
- Liberty Pest Control MKS product listing: https://libertypestcontrol.tripod.com/mks.htm
- How the MKS System Works: http://www.shveika73.ru/products-ranch/uss/mks/mks-main.htm
- eBay product listing with specs: https://www.ebay.com/itm/135697961239
- IndiaMART product listing (international specs): https://www.indiamart.com/proddetail/arctic-mosquito-killing-system-22065925897.html
- TradeIndia product listing: https://www.tradeindia.com/products/mosquito-killing-system-3714174.html

## Learnings
<!-- Append entries here as work progresses -->

### 2026-04-17 — Onboarding research complete
Completed initial deep-dive on ARCTIC® MKS hardware. Key findings for skeeter-switch:
1. Power switching approach is validated — photocell-driven mechanical architecture is fully compatible with external power control
2. Debounce floor should be 10–15 min; current 10-min default is acceptable but 15 min is hardware-safer
3. Rain exclusion is non-negotiable — the device has no weatherproofing beyond its aluminum shell
4. CO2 tank is the most important maintenance item — empty tank = trap running at ~30–40% effectiveness at best
5. The 18:00–06:00 run window is excellent — provides warm-up time before photocell triggers at dusk, and covers full dawn window
